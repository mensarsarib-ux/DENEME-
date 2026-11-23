import { useRef, useState } from "react";
import { t } from "../lib/i18n";

/** Tanıtım tamamlandı işareti (cihaz başına; ilk açılışta bir kez gösterilir) */
const INTRO_KEY = "hesabim:tanitim";

/** Hesap ve veri anahtarları: bunlardan biri varsa cihazda uygulama daha önce kullanılmış demektir */
const USED_KEYS = ["hesabim:auth", "hesabim:workspace", "hesabim:workspaces", "hesabim:plan", "hesabim:data-owner", "hesabim:pending-transaction"];
const USED_PREFIXES = ["hesabim:v1:", "hesabim:base:", "hesabim:dirty:"];

/**
 * Tanıtım yalnızca uygulama yeni yüklendiğinde gösterilir. Uygulamayı kapatıp açmak ya da hesap silmek
 * tanıtımı tekrar açmaz. Güncelleme ile gelen mevcut kullanıcılar (veri var) tanıtımı görmez.
 */
export function introDone(): boolean {
  try {
    if (localStorage.getItem(INTRO_KEY) === "1") return true;
    const used = Object.keys(localStorage).some(
      (k) => USED_KEYS.includes(k) || USED_PREFIXES.some((pre) => k.startsWith(pre)),
    );
    if (used) {
      markIntroDone();
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

function markIntroDone() {
  try {
    localStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* depolama erişilemiyorsa bir sonraki açılışta tekrar gösterilir */
  }
}

const SLIDES: { title: string; text: string; icon: string; shot?: string }[] = [
  {
    icon: "👥",
    shot: "/tanitim/1-ana.png",
    title: "Müşterilerinizi tek yerden takip edin",
    text: "Müşteri ve tedarikçilerinizin alacak ve borç bakiyelerini anında görün.",
  },
  {
    icon: "🧾",
    shot: "/tanitim/2-satis.png",
    title: "Satış, alış ve tahsilatı hızlıca kaydedin",
    text: "Her işlem tarih ve açıklamasıyla kayıt altında kalır. Tek dokunuşla ekleyin.",
  },
  {
    icon: "🏦",
    shot: "/tanitim/3-kasa.png",
    title: "Kasanızı ve dönemlerinizi görün",
    text: "Nakit ve banka bakiyelerinizi, aylık gelir ve giderlerinizi tek ekranda izleyin.",
  },
  {
    icon: "🤝",
    title: "Ekibinizle birlikte çalışın",
    text: "İşletmenizi ekip üyelerinizle paylaşın. Verileriniz cihazlarınız arasında eşitlenir.",
  },
];

/** İlk açılışta gösterilen kısa tanıtım: slaytlar, ileri düğmesi ve atla */
export default function IntroSlides({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  // Geçiş yönü: ileri (1) ya da geri (-1); animasyon bu yöne göre kayar
  const [dir, setDir] = useState<1 | -1>(1);
  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];
  const touchX = useRef<number | null>(null);

  function go(next: number) {
    if (next < 0 || next >= SLIDES.length) return;
    setDir(next > index ? 1 : -1);
    setIndex(next);
  }

  function finish() {
    markIntroDone();
    onDone();
  }

  // Parmakla sağa/sola kaydırma (yatay hareket 50px'i geçerse geçiş yapılır)
  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchX.current;
    touchX.current = null;
    const end = e.changedTouches[0]?.clientX;
    if (start === null || end === undefined) return;
    const dx = end - start;
    if (dx < -50) {
      if (last) return;
      go(index + 1);
    } else if (dx > 50) {
      go(index - 1);
    }
  }

  return (
    <div
      className="intro"
      role="dialog"
      aria-label={t("Hesabım tanıtımı")}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ "--dir": dir } as React.CSSProperties}
    >
      <div className="intro-top">
        <button type="button" className="intro-skip" onClick={finish} disabled={last}>
          {t("Atla")}
        </button>
      </div>
      {/* key: her slayt değişince içerik yeniden çizilir ve giriş animasyonu baştan oynar */}
      <div className="intro-body" aria-live="polite" key={index}>
        {slide.shot ? (
          <img className="intro-shot" src={slide.shot} alt={t("Uygulama ekran görüntüsü")} />
        ) : (
          <div className="intro-icon" aria-hidden="true">{slide.icon}</div>
        )}
        <h1 className="intro-title">{t(slide.title)}</h1>
        <p className="intro-text">{t(slide.text)}</p>
      </div>
      <div className="intro-dots" aria-hidden="true">
        {SLIDES.map((_, i) => (
          <span key={i} className={`intro-dot ${i === index ? "is-on" : ""}`} />
        ))}
      </div>
      <div className="intro-actions">
        {index > 0 && (
          <button type="button" className="intro-back" onClick={() => go(index - 1)}>
            {t("Geri")}
          </button>
        )}
        <button
          type="button"
          className="primary-btn intro-next"
          onClick={() => (last ? finish() : go(index + 1))}
        >
          {last ? t("Başla") : t("İleri")}
        </button>
      </div>
    </div>
  );
}
