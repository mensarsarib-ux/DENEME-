import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// iOS ana ekran uygulamasında görünüm alanı (innerHeight) ekranın altındaki güvenli alan kadar kısa olabiliyor.
// Farkı ölçüp kök alanı o kadar uzatıyoruz; böylece arka plan ekranın dibine kadar iner.
const fitToScreen = () => {
  const extra = Math.max(0, window.screen.height - window.innerHeight);
  document.documentElement.style.setProperty("--extra-bottom", `${extra}px`);
};
fitToScreen();
window.addEventListener("resize", fitToScreen);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
