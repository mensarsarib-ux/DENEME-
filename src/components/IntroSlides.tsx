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
    shot: "/tanitim/kart-1.png",
    title: "Müşterilerinizi tek yerden takip edin",
    text: "Müşteri ve tedarikçilerinizin alacak ve borç bakiyelerini anında görün.",
  },
  {
    icon: "🧾",
    shot: "/tanitim/kart-2.png",
    title: "Satış, alış ve tahsilatı hızlıca kaydedin",
    text: "Her işlem tarih ve açıklamasıyla kayıt altında kalır. Tek dokunuşla ekleyin.",
  },
  {
    icon: "🏦",
    shot: "/tanitim/kart-3.png",
    title: "Kasanızı ve dönemlerinizi görün",
    text: "Nakit ve banka bakiyelerinizi, aylık gelir ve giderlerinizi tek ekranda izleyin.",
  },
  {
    icon: "🤝",
    shot: "/tanitim/kart-4.png",
    title: "Ekibinizle birlikte çalışın",
    text: "İşletmenizi ekip üyelerinizle paylaşın. Verileriniz cihazlarınız arasında eşitlenir.",
  },
];

/**
 * İlk açılışta gösterilen kısa tanıtım. Dört kart yan yana tek bir bant olarak dizilir; geçişte bant
 * bütün olarak kayar (parmağı takip eder), bırakılınca yerine oturur.
 */
export default function IntroSlides({ onDone }: { onDone: (signin?: boolean) => void }) {
  const [index, setIndex] = useState(0);
  // Parmak sürüklemesi sırasındaki yatay kayma (px); bırakılınca 0'a döner
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(0);
  const last = index === SLIDES.length - 1;
  const startX = useRef<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  function go(next: number) {
    if (next < 0 || next >= SLIDES.length) return;
    setIndex(next);
  }

  function finish(signin = false) {
    markIntroDone();
    onDone(signin);
  }

  function onStart(x: number) {
    startX.current = x;
    setDragging(true);
    setWidth(bodyRef.current?.clientWidth ?? 0);
  }
  function onMove(x: number) {
    if (startX.current === null) return;
    let dx = x - startX.current;
    // Baştan ya da sondan dışarı çekilirken direnç hissi
    if ((index === 0 && dx > 0) || (last && dx < 0)) dx = dx / 3;
    setDrag(dx);
  }
  function onEnd() {
    const dx = drag;
    startX.current = null;
    setDragging(false);
    setDrag(0);
    if (dx < -width * 0.2 && !last) go(index + 1);
    else if (dx > width * 0.2 && index > 0) go(index - 1);
  }

  // Kayma kartın kendi genişliğine göre (yüzde); genişlik ölçülmeden de doğru konuma gider
  const offset = `calc(${-index * 100}% + ${drag}px)`;

  return (
    <div className="intro" role="dialog" aria-label={t("Hesabım tanıtımı")}>
      <div className="intro-top">
        <button type="button" className="intro-skip" onClick={() => finish()} disabled={last}>
          {t("Atla")}
        </button>
      </div>
      <div
        className="intro-window"
        ref={bodyRef}
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
        onMouseDown={(e) => onStart(e.clientX)}
        onMouseMove={(e) => dragging && onMove(e.clientX)}
        onMouseUp={onEnd}
        onMouseLeave={() => dragging && onEnd()}
      >
        <div
          className={`intro-track ${dragging ? "is-drag" : ""}`}
          style={{ transform: `translate3d(${offset},0,0)` }}
          aria-live="polite"
        >
          {SLIDES.map((slide, k) => (
            <div className="intro-slide" key={k} aria-hidden={k !== index}>
              {slide.shot ? (
                <img className="intro-shot" src={slide.shot} alt={t("Uygulama ekran görüntüsü")} draggable={false} />
              ) : (
                <div className="intro-icon" aria-hidden="true">{slide.icon}</div>
              )}
              <h1 className="intro-title">{t(slide.title)}</h1>
              <p className="intro-text">{t(slide.text)}</p>
            </div>
          ))}
        </div>
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
      {/* Kayıtlı kullanıcı tanıtımı ve kayıt adımlarını geçip doğrudan giriş yapar */}
      <button type="button" className="help-link intro-signin" onClick={() => finish(true)}>
        {t("Zaten hesabınız var mı? Giriş yap")}
      </button>
    </div>
  );
}
