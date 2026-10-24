import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// Kök alanı cihazın ekran yüksekliğine (ör. 956) sabitle; görünüm alanı daha kısa kalsa bile alt kısım dolsun
const fitToScreen = () => {
  document.documentElement.style.setProperty("--screen-h", `${window.screen.height}px`);
};
fitToScreen();
window.addEventListener("resize", fitToScreen);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
