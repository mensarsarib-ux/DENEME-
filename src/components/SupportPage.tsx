import { useState } from "react";
import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";
import { SUPPORT_ICON } from "../lib/menu";
import PageHeader from "./PageHeader";

/** Sık sorulan sorular; dile göre çizim anında çevrilir */
const faq = (): [string, string][] => [
  [t("Yeni müşteri veya tedarikçi nasıl eklenir?"), t("Ana ekranda sağ üstteki + düğmesine dokunun; etkin sekmeye (Müşteriler, Tedarikçiler veya kendi sekmeniz) eklenir.")],
  [t("İşlem nasıl girilir?"), t("Kişinin sayfasında alttaki SATIŞ, ALIŞ, TAHSİLAT veya ÖDEME seçeneklerinden birine dokunun, tutarı yazın ve EKLE'ye basın.")],
  [t("İşlemi düzenlemek veya silmek için ne yapmalıyım?"), t("Listedeki işleme dokunun; Düzenle ve Sil seçenekleri açılır. Silme işlemi geri alınabilir.")],
  [t("Dönem nasıl değişir?"), t("Ana ekrandaki grafiğe basılı tutun; hazır dönemleri seçebilir veya özel tarih aralığı verebilirsiniz.")],
  [t("Sekmeyi nasıl düzenlerim?"), t("Sekme adına basılı tutun; Düzenle ve Sil seçenekleri çıkar. Yeni sekme için sağa kaydırıp + düğmesini kullanın.")],
  [t("Verilerim nerede saklanıyor?"), t("Hesabınızda, güvenli sunucularda saklanır ve aynı hesapla girdiğiniz telefonlar arasında eşitlenir. Ayarlar > Veriler bölümünden ayrıca yedek alabilir ve geri yükleyebilirsiniz.")],
];

/** Destek: sık sorulan sorular ve sorun bildirme formu */
export default function SupportPage({
  supportEmail,
  diagnostics,
  onOpenSettings,
  onBack,
}: {
  supportEmail: string;
  /** Mesaja eklenen teknik özet (kayıt sayıları vb.) */
  diagnostics: string;
  onOpenSettings: () => void;
  onBack: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);

  const text = `${t("Konu")}: ${subject.trim()}\n\n${message.trim()}\n\n— ${diagnostics}`;
  const ready = subject.trim() !== "" && message.trim() !== "";
  const mailto = `mailto:${supportEmail}?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(`${message.trim()}\n\n— ${diagnostics}`)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("ok");
      haptic("success");
    } catch {
      setCopied("fail");
    }
  }

  return (
    <div className="cust-page">
      <PageHeader title={t("Destek al")} subtitle={t("Sık sorulanlar ve sorun bildirme")} icon={SUPPORT_ICON} onBack={onBack} />
      <div className="stack">
        <section className="card" aria-label={t("Sık sorulan sorular")}>
          <h2 className="card-title">{t("Sık sorulan sorular")}</h2>
          {faq().map(([q, a]) => (
            <details key={q} className="faq" onToggle={() => haptic("light")}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>

        <section className="card" aria-label={t("Sorun bildir")}>
          <h2 className="card-title">{t("Sorun bildir")}</h2>
          <div className="field">
            <label htmlFor="sup-subject">{t("Konu")}</label>
            <input id="sup-subject" autoComplete="off" value={subject} onChange={(e) => { setSubject(e.target.value); setCopied(null); }} />
          </div>
          <div className="field">
            <label htmlFor="sup-message">{t("Mesajınız")}</label>
            <textarea id="sup-message" rows={5} value={message} onChange={(e) => { setMessage(e.target.value); setCopied(null); }} />
          </div>
          <p className="field-hint">{t("Mesaja kayıt sayıları gibi teknik bir özet eklenir; tutarlar eklenmez.")}</p>
          <div className="card-actions">
            <button type="button" className="primary-btn" disabled={!ready} onClick={copy}>{t("MESAJI KOPYALA")}</button>
            {supportEmail ? (
              <a className={`action-btn ${ready ? "" : "is-disabled"}`} href={ready ? mailto : undefined} aria-disabled={!ready}>
                {t("E-posta ile gönder")}
              </a>
            ) : (
              <button type="button" className="help-link" onClick={onOpenSettings}>
                {t("E-posta ile göndermek için destek adresi ekleyin")}
              </button>
            )}
          </div>
          {copied === "ok" && <p className="form-success" role="status">{t("Mesaj kopyalandı.")}</p>}
          {copied === "fail" && (
            <textarea className="copy-box" readOnly rows={5} value={text} onFocus={(e) => e.currentTarget.select()} />
          )}
        </section>
      </div>
    </div>
  );
}
