import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AppLock from "./components/AppLock";
import "./styles.css";
import { applyTheme } from "./lib/theme";
import { initLanguage } from "./lib/i18n";

// Tema ilk çizimden önce uygulanır ki ekran bir an yanlış renkte görünmesin
applyTheme();

// Seçili dilin sözlüğü yüklenince çizilir (Türkçe ve İngilizce beklemeden hazırdır)
void initLanguage().then(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
      <AppLock />
    </StrictMode>,
  ),
);
