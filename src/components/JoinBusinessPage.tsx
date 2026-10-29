import { useState, type FormEvent } from "react";
import { CloudError, findBusinessByOwnerEmail, loadSession, normalizePhone, requestJoin, type FoundBusiness } from "../lib/cloud";
import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";
import { SUPPORT_ICON } from "../lib/menu";
import PageHeader from "./PageHeader";

/**
 * Var olan bir işletmeye katılma: yetkilinin e-postası girilir, işletme bulunur ve katılma isteği gönderilir.
 * Şifre istenmez; istek yetkiliye onay bildirimi olarak gider.
 */
export default function JoinBusinessPage({ onBack }: { onBack: () => void }) {
  const session = loadSession();
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<FoundBusiness[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [sentTo, setSentTo] = useState<string[]>([]);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!session) {
      setMessage({ ok: false, text: t("Katılmak için giriş yapmanız gerekir.") });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      // Yetkili e-postasıyla ya da telefon numarasıyla aranır
      const res = await findBusinessByOwnerEmail(session, email.includes("@") ? email : normalizePhone(email) ?? email);
      if (res === "expired") {
        setMessage({ ok: false, text: t("Oturumunuz sona ermiş; yeniden giriş yapın.") });
        return;
      }
      setFound(res);
      if (res.length === 0) setMessage({ ok: false, text: t("Bu e-posta ya da telefona ait bir işletme bulunamadı.") });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof CloudError ? t("Sunucuya ulaşılamadı.") : t("Bir sorun oluştu.") });
    } finally {
      setBusy(false);
    }
  }

  async function join(business: FoundBusiness) {
    if (!session) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await requestJoin(session, business.id);
      if (res === "expired") {
        setMessage({ ok: false, text: t("Oturumunuz sona ermiş; yeniden giriş yapın.") });
        return;
      }
      haptic("success");
      setSentTo((list) => [...list, business.id]);
      setMessage({ ok: true, text: t("İstek gönderildi. Yetkili onaylayınca işletmeye erişebilirsiniz.") });
    } catch {
      setMessage({ ok: false, text: t("İstek gönderilemedi; tekrar deneyin.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cust-page">
      <PageHeader title={t("Var olan işletmeye katıl")} subtitle={t("Yetkilinin e-postasını girin")} icon={SUPPORT_ICON} onBack={onBack} />
      <form className="form" onSubmit={search} noValidate>
        <div className="field">
          <label htmlFor="jb-email">{t("Yetkilinin e-postası veya telefonu")}</label>
          <input
            id="jb-email"
            type="text"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFound(null);
            }}
          />
        </div>
        <button className="primary-btn" type="submit" disabled={busy || !email.trim()}>
          {busy ? t("Bekleyin…") : t("İŞLETMEYİ BUL")}
        </button>
      </form>

      {found && found.length > 0 && (
        <section className="card" aria-label={t("Bulunan işletmeler")}>
          {found.map((b) => (
            <div key={b.id} className="join-row">
              <span className="join-name">{b.name}</span>
              <button
                type="button"
                className="action-btn"
                disabled={busy || sentTo.includes(b.id)}
                onClick={() => join(b)}
              >
                {sentTo.includes(b.id) ? t("İstek gönderildi") : t("Katılma isteği gönder")}
              </button>
            </div>
          ))}
        </section>
      )}

      {message && (
        <p className={message.ok ? "form-success" : "form-error"} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}
