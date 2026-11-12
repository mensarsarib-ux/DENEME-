import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

/**
 * iPhone'da yazı klavyesi açılınca WebKit, odaklanılan alanı görünür kılmak için kapsayıcıyı kendiliğinden
 * kaydırır; üst çubuk ve başlık yukarı kayar. Uygulama tek ekran tasarlandığı için kapsayıcı her klavye
 * olayında başa alınır. İç listeler (overflow-y: auto) etkilenmez.
 */
export function keepAppFixedWhileKeyboard(): void {
  if (!Capacitor.isNativePlatform()) return;
  const reset = () => {
    const app = document.querySelector<HTMLElement>(".app");
    if (app && app.scrollTop !== 0) app.scrollTop = 0;
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  };
  void Keyboard.addListener("keyboardWillShow", () => {
    reset();
    // WebKit odağı kaydırmayı klavye animasyonu boyunca sürdürebilir
    window.setTimeout(reset, 250);
    window.setTimeout(reset, 600);
  });
  void Keyboard.addListener("keyboardDidShow", reset);
  void Keyboard.addListener("keyboardWillHide", reset);
}
