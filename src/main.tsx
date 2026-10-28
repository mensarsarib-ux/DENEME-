import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { syncPlanFromServer } from "./lib/entitlement";

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
  // Diğer parametreler (ör. ?plan=pro) korunur
  url.searchParams.delete("sifirla");
  window.location.replace(url.toString());
}
resetLocalData();

// Plan, uygulama modülleri yüklenmeden önce sunucudan okunur; böylece her hesap kendi planıyla açılır
void (async () => {
  await syncPlanFromServer();
  const { default: App } = await import("./App");
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
})();
