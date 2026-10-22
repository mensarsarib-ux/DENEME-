/**
 * Dokunma geri bildirimi: kısa bir ses ve titreşim. Görsel kısım (basılan düğmenin parlaması
 * ve küçülmesi) stil dosyasındaki :active kurallarıyla verilir.
 * - Ses: Web Audio ile üretilen çok kısa tıklama sesleri. Tarayıcılar sesi ilk dokunuştan sonra açar.
 * - Titreşim: Android ve masaüstü Chrome'da Titreşim API'si. iPhone Safari bu API'yi desteklemez;
 *   iOS 17.4+ için gizli bir "switch" anahtarı en iyi çabayla denenir ve çerçeve ya da uygulama
 *   içi tarayıcıda çalışmayabilir.
 * Hiçbiri desteklenmiyorsa hiçbir şey olmaz, uygulama normal çalışır.
 */
export type Haptic = "light" | "medium" | "success" | "warning";

/** Her tür için [frekans Hz, başlangıç sn, süre sn] notaları */
const SOUNDS: Record<Haptic, [number, number, number][]> = {
  light: [[1400, 0, 0.03]],
  medium: [[800, 0, 0.05]],
  success: [
    [660, 0, 0.07],
    [990, 0.08, 0.09],
  ],
  warning: [
    [300, 0, 0.08],
    [220, 0.09, 0.12],
  ],
};

const VOLUME = 0.07;

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

function playSound(kind: Haptic) {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const [frequency, offset, duration] of SOUNDS[kind]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const at = now + offset;
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(VOLUME, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }
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
