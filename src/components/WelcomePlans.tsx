import { useState } from "react";
import { buyPlan, purchasesAvailable } from "../lib/purchases";
import { t } from "../lib/i18n";

/**
 * Yeni hesap açıldıktan sonra bir kez gösterilir: animasyonlu karşılama, Premium kartı (yerel uygulamada satın alma
 * açıktır) ve alttaki "Ücretsiz olarak devam et". Satın almadan geçmek her zaman mümkündür.
 */
export default function WelcomePlans({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canBuy = purchasesAvailable();

  async function premium() {
    setBusy(true);
    setError(null);
    try {
      await buyPlan("premium");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Satın alma tamamlanamadı."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="welcome-plans" role="dialog" aria-modal="true" aria-label={t("Hoş geldiniz")}>
      <div className="welcome-inner">
        <h1 className="welcome-title">
          <span className="welcome-line" style={{ animationDelay: "0ms" }}>{t("Hoş geldiniz")}</span>
          <span className="welcome-line" style={{ animationDelay: "250ms" }}>{t("Hesabım Muhasebe")}</span>
        </h1>
        <p className="welcome-sub welcome-fade">{t("İşletmenizin müşterilerini, borçlarını ve kasasını tek yerde takip edin.")}</p>

        {canBuy && (
          <div className="welcome-card welcome-premium welcome-fade">
            <div className="welcome-badge">{t("Önerilen")}</div>
            <h2>Premium</h2>
            <p>{t("Sınırsız işletme, sınırsız müşteri ve tüm raporlar.")}</p>
            <button type="button" className="welcome-cta" onClick={premium} disabled={busy}>
              {busy ? t("Bekleyin…") : t("Premium olarak devam et")}
            </button>
            {error && <p className="welcome-error" role="alert">{error}</p>}
          </div>
        )}

        <button type="button" className="welcome-free welcome-fade" onClick={onDone} disabled={busy}>
          {t("Ücretsiz olarak devam et")}
        </button>
      </div>
    </div>
  );
}
