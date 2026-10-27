import { useEffect, type RefObject } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

/**
 * Yazı klavyesi açılınca elemanı klavyenin üstüne kaldırır.
 * Yerel uygulamada klavyenin gerçek yüksekliği kullanılır; tarayıcıda görünen alan ölçülür.
 */
export function useKeyboardLift(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const lift = (px: number) => {
      el.style.bottom = `${px}px`;
    };

    if (Capacitor.isNativePlatform()) {
      const show = Keyboard.addListener("keyboardWillShow", (info) => lift(info.keyboardHeight));
      const hide = Keyboard.addListener("keyboardWillHide", () => lift(0));
      return () => {
        void show.then((h) => h.remove());
        void hide.then((h) => h.remove());
        el.style.bottom = "";
      };
    }

    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => lift(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      el.style.bottom = "";
    };
  }, [ref]);
}
