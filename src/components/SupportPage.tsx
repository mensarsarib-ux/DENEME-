import { useState } from "react";
import { haptic } from "../lib/haptics";
import { SUPPORT_ICON } from "../lib/menu";
import PageHeader from "./PageHeader";

const FAQ: [string, string][] = [
  ["Yeni müşteri veya tedarikçi nasıl eklenir?", "Ana ekranda sağ üstteki + düğmesine dokunun; etkin sekmeye (Müşteriler, Tedarikçiler veya kendi sekmeniz) eklenir."],
  ["İşlem nasıl girilir?", "Kişinin sayfasında alttaki SATIŞ, ALIŞ, TAHSİLAT veya ÖDEME seçeneklerinden birine dokunun, tutarı yazın ve EKLE'ye basın."],
  ["İşlemi düzenlemek veya silmek için ne yapmalıyım?", "Listedeki işleme dokunun; Düzenle ve Sil seçenekleri açılır. Silme işlemi geri alınabilir."],
  ["Dönem nasıl değişir?", "Ana ekrandaki grafiğe basılı tutun; hazır dönemleri seçebilir veya özel tarih aralığı verebilirsiniz."],
  ["Sekmeyi nasıl düzenlerim?", "Sekme adına basılı tutun; Düzenle ve Sil seçenekleri çıkar. Yeni sekme için sağa kaydırıp + düğmesini kullanın."],
  ["Verilerim nerede saklanıyor?", "Yalnızca bu cihazdaki tarayıcıda. Ayarlar > Veriler bölümünden yedek alabilir ve geri yükleyebilirsiniz."],
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

  const text = `Konu: ${subject.trim()}\n\n${message.trim()}\n\n— ${diagnostics}`;
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
      <PageHeader title="Destek al" subtitle="Sık sorulanlar ve sorun bildirme" icon={SUPPORT_ICON} onBack={onBack} />
      <div className="stack">
        <section className="card" aria-label="Sık sorulan sorular">
          <h2 className="card-title">Sık sorulan sorular</h2>
          {FAQ.map(([q, a]) => (
            <details key={q} className="faq" onToggle={() => haptic("light")}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>

        <section className="card" aria-label="Sorun bildir">
          <h2 className="card-title">Sorun bildir</h2>
          <div className="field">
            <label htmlFor="sup-subject">Konu</label>
            <input id="sup-subject" autoComplete="off" value={subject} onChange={(e) => { setSubject(e.target.value); setCopied(null); }} />
          </div>
          <div className="field">
            <label htmlFor="sup-message">Mesajınız</label>
            <textarea id="sup-message" rows={5} value={message} onChange={(e) => { setMessage(e.target.value); setCopied(null); }} />
          </div>
          <p className="field-hint">Mesaja kayıt sayıları gibi teknik bir özet eklenir; tutarlar eklenmez.</p>
          <div className="card-actions">
            <button type="button" className="primary-btn" disabled={!ready} onClick={copy}>MESAJI KOPYALA</button>
            {supportEmail ? (
              <a className={`action-btn ${ready ? "" : "is-disabled"}`} href={ready ? mailto : undefined} aria-disabled={!ready}>
                E-posta ile gönder
              </a>
            ) : (
              <button type="button" className="help-link" onClick={onOpenSettings}>
                E-posta ile göndermek için destek adresi ekleyin
              </button>
            )}
          </div>
          {copied === "ok" && <p className="form-success" role="status">Mesaj kopyalandı.</p>}
          {copied === "fail" && (
            <textarea className="copy-box" readOnly rows={5} value={text} onFocus={(e) => e.currentTarget.select()} />
          )}
        </section>
      </div>
    </div>
  );
}
