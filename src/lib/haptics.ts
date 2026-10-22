import { createBus, scheduleSound, type SoundKind } from "./sounds";

/**
 * Dokunma geri bildirimi: kısa bir ses ve titreşim. Görsel kısım (basılan düğmenin parlaması
 * ve küçülmesi) stil dosyasındaki :active kurallarıyla verilir.
 * - Ses: Web Audio ile üretilen tok tuş sesleri ve kaydetme çanı (bkz. sounds.ts). Tarayıcılar sesi ilk dokunuştan sonra açar.
 * - Titreşim: Android ve masaüstü Chrome'da Titreşim API'si. iPhone Safari bu API'yi desteklemez;
 *   iOS 17.4+ için gizli bir "switch" anahtarı en iyi çabayla denenir ve çerçeve ya da uygulama
 *   içi tarayıcıda çalışmayabilir.
 * Hiçbiri desteklenmiyorsa hiçbir şey olmaz, uygulama normal çalışır.
 */
export type Haptic = SoundKind;

let audio: AudioContext | null = null;

function getAudio(): AudioContext | null {
  try {
    if (!audio) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      audio = new Ctor();
    }
    if (audio.state === "suspended") void audio.resume();
    return audio;
  } catch {
    return null;
  }
}

// Tarayıcılar sesi yalnızca bir dokunuştan sonra açar; ilk dokunuşta ses motoru hazırlanır
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", () => getAudio(), {
    capture: true,
    passive: true,
  });
}

/** Ses hattı (yankı + sıkıştırıcı), ses motoru oluşturulunca bir kez kurulur */
let bus: AudioNode | null = null;

function playSound(kind: Haptic) {
  const ctx = getAudio();
  if (!ctx) return;
  if (!bus) bus = createBus(ctx);
  scheduleSound(ctx, bus, kind, ctx.currentTime);
}

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
  playSound(kind);
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
