/**
 * Dokunsal geri bildirim (titreşim).
 * - Android ve masaüstü Chrome: Titreşim API'si (navigator.vibrate).
 * - iPhone Safari bu API'yi desteklemez; iOS 17.4+ sürümlerinde gizli bir "switch" anahtarı
 *   dokunmayla değiştirilirken telefon hafif bir titreşim verir. Bu yöntem en iyi çabayla denenir ve
 *   yalnızca bir dokunma/tıklama sırasında çalışır.
 * Titreşim desteklenmiyorsa hiçbir şey olmaz, uygulama normal çalışır.
 */
export type Haptic = "light" | "medium" | "success" | "warning";

/** Milisaniye cinsinden titreşim desenleri */
const PATTERNS: Record<Haptic, number | number[]> = {
  light: 8,
  medium: 18,
  success: [12, 40, 12],
  warning: [30, 50, 30],
};

let iosSwitch: HTMLLabelElement | null = null;

/** iOS Safari için: gizli switch anahtarını tıklayarak sistem titreşimini tetikler */
function iosTick() {
  try {
    if (!iosSwitch) {
      const label = document.createElement("label");
      label.setAttribute("aria-hidden", "true");
      label.style.cssText =
        "position:fixed;left:-100px;top:-100px;width:1px;height:1px;opacity:0;pointer-events:none;";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("switch", "");
      input.tabIndex = -1;
      label.appendChild(input);
      // Sahte tıklama sayfadaki "dışarı dokununca kapat" gibi dinleyicilere ulaşmasın
      label.addEventListener("click", (event) => event.stopPropagation());
      document.body.appendChild(label);
      iosSwitch = label;
    }
    iosSwitch.click();
  } catch {
    /* desteklenmiyorsa sessizce geç */
  }
}

export function haptic(kind: Haptic = "light"): void {
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(PATTERNS[kind]);
      return;
    }
  } catch {
    /* tarayıcı titreşimi engelliyorsa sessizce geç */
  }
  iosTick();
}
