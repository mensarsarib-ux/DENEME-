import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

/**
 * ?sifirla bağlantısı: bu cihazdaki tüm Hesabım verisini (oturum, işletmeler, kayıtlar) siler
 * ve uygulamayı ilk kez indirilmiş gibi açar. Sunucudaki hesap silinmez.
 */
function resetLocalData() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("sifirla")) return;
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("hesabim"))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    /* depolama erişilemiyorsa sessizce geç */
  }
  window.location.replace(url.origin + url.pathname);
}
resetLocalData();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
