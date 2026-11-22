import { useEffect, useState, type ReactNode } from "react";
import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";

/**
 * İlk müşteri rehberi: kayıt olmadan (misafir olarak) açılan kişiye ilk müşteriyi, bir satışı ve bir tahsilatı
 * adım adım gösterir. Ekran kararır, yalnızca dokunulacak yer aydınlık kalır.
 *
 * Uygulamanın ekranlarına dokunmaz: hangi sayfada olunduğunu ekrandaki öğelerden, ne girildiğini cihazda saklanan
 * kayıtlardan okur ve sıradaki adımı gösterir. Yalnızca misafir modunda (<html data-guest="1">) ve rehber
 * başlatıldıysa çalışır. Atlanınca ya da bitince bir daha gösterilmez.
 */

/** Rehberin durumu: aktif → bakiye (İLERİ'ye basıldı) → bitti */
export const GUIDE_KEY = "hesabim:rehber";
type GuideState = "aktif" | "bakiye" | "bitti";

function readState(): GuideState | null {
  try {
    return localStorage.getItem(GUIDE_KEY) as GuideState | null;
  } catch {
    return null;
  }
}
function writeState(s: GuideState) {
  try {
    localStorage.setItem(GUIDE_KEY, s);
  } catch {
    /* depolama yoksa rehber bu oturumda kapanır */
  }
}

/** Misafir ilk kez açtığında rehberi başlatır (daha önce başlatıldı ya da atlandıysa dokunmaz) */
export function startGuideOnce() {
  if (readState() === null) writeState("aktif");
}
/** Hesapla kullanan kişi rehberi görmez (çıkış yapıp misafire düşse bile) */
export function finishGuide() {
  if (readState() !== "bitti") writeState("bitti");
}

interface Party { id: string; name: string; kind: string; archived?: boolean }
interface Tx { customerId: string; type: string; sub?: string }

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(`hesabim:v1:${key}`);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

type Target = string | (() => Element | null | undefined);

interface Step {
  id: string;
  stage: 1 | 2 | 3 | 4;
  title: string;
  text: ReactNode;
  targets: Target[];
  /** Balonun yeri; verilmezse sığan tarafa konur */
  place?: "above" | "below";
  /** Balonun üstünde kalacağı öğe (açıklama kutusu gibi; balon onu örtmesin) */
  lift?: string;
  /** Balonun örtmemesi gereken öğe (yazılan ad gibi); çakışırsa balon bu öğenin altına geçer, ok gizlenir */
  avoid?: string;
  /** Dokunma işareti gösterilmez (yazı alanı ya da bilgi adımı) */
  noTap?: boolean;
  /** Bilgi adımı: balonda düğme vardır, aydınlık alana dokunmak gerekmez */
  action?: { label: string; run: () => void };
  pad?: number;
  radius?: number;
  /** Aydınlık alanın içinde ayrıca vurgulanan öğe (tutar yazılırken EKLE gibi) */
  focus?: Target;
}

const q = (sel: string) => document.querySelector(sel);
const visible = (el: Element | null | undefined) => !!el && (el as HTMLElement).getClientRects().length > 0;
const byText = (sel: string, text: string) =>
  [...document.querySelectorAll(sel)].find((e) => e.textContent?.trim() === text && visible(e));
const b = (s: string) => <b className="guide-em">{s}</b>;

/** Rehberin ilk satışında açıklama hazır gelir; React'in duyacağı şekilde yazılır (bir kez) */
function prefillDescription(text: string) {
  const area = q('textarea[placeholder]') as HTMLTextAreaElement | null;
  if (!area || area.value || area.dataset.guideFilled) return;
  area.dataset.guideFilled = "1";
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(area, text);
  area.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Ekranın ve kayıtların şu anki durumuna göre gösterilecek adım (yoksa rehber gizlenir) */
function currentStep(state: GuideState, setState: (s: GuideState) => void, finish: () => void): Step | null {
  // Menü ya da başka bir pencere açıkken rehber bekler (nakit/banka sorusu hariç: o rehberin adımı)
  const sheets = [...document.querySelectorAll(".action-backdrop")];
  if (q(".drawer") || sheets.some((el) => !el.querySelector(".account-btn"))) return null;
  const parties = readList<Party>("parties");
  const txs = readList<Tx>("transactions");
  const cust = parties.find((p) => p.kind === "customer" && !p.archived);
  const mine = cust ? txs.filter((x) => x.customerId === cust.id) : [];
  const hasSale = mine.some((x) => x.type === "SATIŞ" && !x.sub);
  const hasCollection = mine.some((x) => x.type === "TAHSİLAT");

  const home = visible(q(".topbar-menu"));
  const newPage = visible(q(".header-add"));
  const partyPage = visible(q(".entry-dock"));
  const partyName = (q(".cust-name strong") as HTMLElement | null)?.textContent?.trim();

  if (newPage && !cust && q("#customer-name")) {
    const input = q("#customer-name") as HTMLInputElement | null;
    if (!input?.value.trim()) {
      return {
        id: "ad", stage: 1, noTap: true, pad: 8,
        title: t("Müşterinizin adını yazın"),
        text: t("Örneğin bir firma ya da kişi adı. Telefon ve adres sonra da eklenebilir."),
        targets: [() => input?.closest(".field") ?? input],
      };
    }
    return {
      id: "ekle-musteri", stage: 1, pad: 4, radius: 22, avoid: "#customer-name",
      title: t("Kaydetmek için EKLE'ye dokunun"),
      text: t("Müşteriniz ana sayfadaki listeye eklenecek."),
      targets: [".header-add"],
    };
  }

  if (home && !cust) {
    return {
      id: "arti", stage: 1, pad: 4, radius: 22,
      title: t("İlk müşterinizi ekleyin"),
      text: <>{t("Sağ üstteki")} {b("+")} {t("düğmesine dokunun.")}</>,
      targets: ['button[aria-label="' + t("Yeni müşteri ekle") + '"]'],
    };
  }
  if (!cust) return null;

  if (home && hasCollection) {
    return {
      id: "bitis", stage: 4, pad: 6, radius: 18, noTap: true, place: "below",
      title: t("Hazırsınız"),
      text: <>{t("Verileriniz şimdilik yalnızca bu telefonda. Kaybolmasın diye hesabınızı istediğiniz zaman")} {b(t("Menü"))}{t("'den açabilirsiniz.")}</>,
      targets: [".topbar-menu"],
      action: { label: t("TAMAM"), run: finish },
    };
  }

  if (home && !hasSale) {
    return {
      id: "satir", stage: 1, pad: 2, radius: 10,
      title: t("Müşterinize dokunun"),
      text: t("Hesap sayfası açılır. Satış ve tahsilatları buradan girersiniz."),
      targets: [() => [...document.querySelectorAll("button.row")].find((r) => r.textContent?.includes(cust.name))],
    };
  }

  if (!partyPage || (partyName && partyName !== cust.name)) return null;

  const amountEmpty = !!q(".amount-field.is-empty");
  const activeTab = (q(".entry-tabs .is-active") as HTMLElement | null)?.textContent?.trim();
  const sheetOpen = visible(q(".account-btn"));
  const desc = 'textarea[placeholder="' + t("Açıklama") + '"]';

  if (!hasSale) {
    if (activeTab === "SATIŞ" || activeTab === t("SATIŞ")) prefillDescription(t("Ürün satışı"));
    if (amountEmpty) {
      return {
        id: "satis-tutar", stage: 2, noTap: true, place: "above", pad: 6,
        title: t("İlk satışınızı girin"),
        text: <>{b(t("SATIŞ"))} {t("seçili. Tutarı tuş takımıyla yazın. Açıklama hazır geldi, isterseniz değiştirin.")}</>,
        targets: [desc, ".amount-field", () => byText("button", t("SATIŞ")), ".keypad-inner"],
      };
    }
    return {
      id: "satis-ekle", stage: 2, pad: 6, place: "above",
      title: t("EKLE'ye dokunun"),
      text: t("Satış kaydedilir ve müşterinizin borcu bu tutar kadar artar."),
      targets: [desc, ".amount-field", () => byText("button", t("SATIŞ")), ".keypad-inner"],
      focus: ".save-btn",
    };
  }

  if (!hasCollection) {
    if (sheetOpen) {
      return {
        id: "nakit-banka", stage: 3, noTap: true, place: "above", pad: 10,
        title: t("Para nereye girdi?"),
        text: t("Nakit mi, banka mı? Seçiminiz Kasa'daki bakiyeye yansır."),
        targets: [() => q(".account-btn")?.closest(".action-sheet")],
      };
    }
    if (activeTab !== "TAHSİLAT" && activeTab !== t("TAHSİLAT")) {
      return {
        id: "tahsilat-sec", stage: 3, pad: 6, place: "above",
        title: t("Şimdi bir tahsilat girin"),
        text: <>{t("Müşteriniz ödeme yaptığında")} {b(t("TAHSİLAT"))} {t("seçilir. Ona dokunun.")}</>,
        targets: [() => byText("button", t("TAHSİLAT"))],
      };
    }
    if (amountEmpty) {
      return {
        id: "tahsilat-tutar", stage: 3, noTap: true, place: "above", pad: 6,
        title: t("Tahsil edilen tutarı yazın"),
        text: t("Müşterinizin ödediği tutarı tuş takımıyla girin."),
        targets: [".amount-field", () => byText("button", t("TAHSİLAT")), ".keypad-inner"],
      };
    }
    return {
      id: "tahsilat-ekle", stage: 3, pad: 6, place: "above",
      title: t("EKLE'ye dokunun"),
      text: t("Tahsilat kaydedilir ve borç bu tutar kadar azalır."),
      targets: [".amount-field", () => byText("button", t("TAHSİLAT")), ".keypad-inner"],
      focus: ".save-btn",
    };
  }

  if (state === "aktif") {
    return {
      id: "bakiye", stage: 4, noTap: true, place: "above", pad: 2, radius: 8,
      title: t("Kalan borcu burada görürsünüz"),
      text: t("Satış borcu artırdı, tahsilat düşürdü. Uygulamanın temeli bu kadar."),
      targets: [() => byText("span", t("TOPLAM"))?.parentElement],
      action: { label: t("İLERİ"), run: () => setState("bakiye") },
    };
  }
  return {
    id: "geri", stage: 4, pad: 4, radius: 24,
    title: t("Ana sayfaya dönün"),
    text: t("Müşterinizin bakiyesi listede görünür."),
    targets: ['button[aria-label="' + t("Geri") + '"]'],
  };
}

interface Rect { x: number; y: number; w: number; h: number }

function measure(targets: Target[]): Rect | null {
  let r: { l: number; t: number; r: number; b: number } | null = null;
  for (const tg of targets) {
    const el = typeof tg === "string" ? q(tg) : tg();
    if (!el || !visible(el)) continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) continue;
    r = r
      ? { l: Math.min(r.l, box.left), t: Math.min(r.t, box.top), r: Math.max(r.r, box.right), b: Math.max(r.b, box.bottom) }
      : { l: box.left, t: box.top, r: box.right, b: box.bottom };
  }
  return r ? { x: r.l, y: r.t, w: r.r - r.l, h: r.b - r.t } : null;
}

export default function Guide() {
  const [state, setStateRaw] = useState<GuideState | null>(readState);
  const [, setTick] = useState(0);
  const [balloonH, setBalloonH] = useState(150);

  const setState = (s: GuideState) => {
    writeState(s);
    setStateRaw(s);
  };
  const finish = () => {
    haptic("light");
    setState("bitti");
  };

  const active = (state === "aktif" || state === "bakiye") && document.documentElement.dataset.guest === "1";

  // Ekran ve kayıtlar değiştikçe adım yeniden hesaplanır (yalnızca rehber açıkken)
  useEffect(() => {
    // Rehber bittiyse (ya da atlandıysa) hiçbir şey izlenmez
    if (state === "bitti") return;
    const timer = window.setInterval(() => {
      const s = readState();
      if (s !== state) setStateRaw(s);
      setTick((n) => n + 1);
    }, 160);
    return () => window.clearInterval(timer);
  }, [state]);

  if (!active || !state) return null;
  const step = currentStep(state, setState, finish);
  if (!step) return null;
  const rect = measure(step.targets);
  if (!rect) return null;

  const W = window.innerWidth;
  const H = window.visualViewport?.height ?? window.innerHeight;
  const pad = step.pad ?? 6;
  const x = Math.max(4, rect.x - pad);
  const y = Math.max(4, rect.y - pad);
  const w = Math.min(W - 4, rect.x + rect.w + pad) - x;
  const h = Math.min(H - 4, rect.y + rect.h + pad) - y;
  const radius = step.radius ?? Math.min(16, h / 2);

  const bw = Math.min(W - 32, 340);
  const cx = x + w / 2;
  const left = Math.min(Math.max(16, cx - bw / 2), W - 16 - bw);
  const below = step.place ? step.place === "below" : y + h + balloonH + 30 < H;
  let top = below ? y + h + 18 : y - balloonH - 18;
  if (!below && step.lift) {
    const lift = q(step.lift);
    if (visible(lift)) top = Math.min(top, lift!.getBoundingClientRect().top - balloonH - 14);
  }
  // Balon, yazılan adı (ya da başka bir önemli alanı) örtüyorsa altına geçer; ok artık hedefi göstermez
  let noArrow = false;
  if (step.avoid) {
    const av = q(step.avoid);
    if (visible(av)) {
      const ar = av!.getBoundingClientRect();
      const overlaps = top < ar.bottom + 8 && top + balloonH > ar.top - 8;
      if (overlaps) {
        top = ar.bottom + 14;
        noArrow = true;
      }
    }
  }
  top = Math.max(12, top);
  const arrowX = Math.min(Math.max(left + 22, cx), left + bw - 22) - left;

  const stages = [t("Müşteri"), t("Satış"), t("Tahsilat"), t("Bitiş")];
  const focus = step.focus ? measure([step.focus]) : null;
  const tapAt = focus ?? { x, y, w, h };
  const tapX = tapAt.x + tapAt.w * (tapAt.w > 120 ? 0.75 : 0.82);
  const tapY = tapAt.y + tapAt.h * 0.86;

  // Karartma dört parçadır: aydınlık alanın dışına dokunulamaz, içine dokunulabilir
  return (
    <div className="guide" aria-live="polite">
      <div className="guide-dim" style={{ left: 0, top: 0, width: "100%", height: y }} />
      <div className="guide-dim" style={{ left: 0, top: y + h, width: "100%", bottom: 0 }} />
      <div className="guide-dim" style={{ left: 0, top: y, width: x, height: h }} />
      <div className="guide-dim" style={{ left: x + w, top: y, right: 0, height: h }} />
      <div className="guide-hole" style={{ left: x, top: y, width: w, height: h, borderRadius: radius }} />
      <div className="guide-ring" style={{ left: x - 4, top: y - 4, width: w + 8, height: h + 8, borderRadius: radius + 4 }} />
      {focus && (
        <div
          className="guide-ring"
          style={{ left: focus.x - 4, top: focus.y - 4, width: focus.w + 8, height: focus.h + 8, borderRadius: 14 }}
        />
      )}
      {!step.noTap && !step.action && <div className="guide-tap" style={{ left: tapX - 10, top: tapY - 10 }} />}
      <div
        key={step.id}
        className={`guide-card ${below ? "is-below" : "is-above"} ${noArrow ? "no-arrow" : ""}`}
        style={{ left, top, width: bw, ["--arrow-x" as string]: `${arrowX}px` }}
        ref={(el) => {
          if (el && Math.abs(el.offsetHeight - balloonH) > 2) setBalloonH(el.offsetHeight);
        }}
        role="dialog"
        aria-label={step.title}
      >
        <div className="guide-steps" aria-hidden="true">
          {stages.map((s, i) => (
            <i key={s} className={i + 1 === step.stage ? "is-now" : i + 1 < step.stage ? "is-done" : ""} />
          ))}
          <span>
            {step.stage}/4 · {stages[step.stage - 1]}
          </span>
        </div>
        <h3 className="guide-title">{step.title}</h3>
        <p className="guide-text">{step.text}</p>
        <div className="guide-foot">
          <button type="button" className="guide-skip" onClick={finish}>
            {t("Rehberi atla")}
          </button>
          {step.action && (
            <button
              type="button"
              className="guide-next"
              onClick={() => {
                haptic("light");
                step.action!.run();
              }}
            >
              {step.action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
