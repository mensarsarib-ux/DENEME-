import { useState, type FormEvent } from "react";
import type { Customer, PartyKind } from "../data/mock";
import { t } from "../lib/i18n";
import { Svg } from "./Icon";

interface FormText {
  title: string;
  subtitle: string;
  duplicate: string;
  hint: string;
  submit: string;
  idPrefix: string;
}

/** Müşteri, tedarikçi ve kullanıcının açtığı sekmelerde değişen metinler */
function textFor(kind: PartyKind, groupName: string): FormText {
  if (kind === "customer") {
    return {
      title: t("Yeni müşteri"),
      subtitle: t("Cari hesap oluştur"),
      duplicate: t("Bu isimde bir müşteri zaten var."),
      hint: t("Müşteriyi eklemek için firma adını yazın."),
      submit: t("MÜŞTERİ EKLE"),
      idPrefix: "c",
    };
  }
  if (kind === "supplier") {
    return {
      title: t("Yeni tedarikçi"),
      subtitle: t("Tedarikçi hesabı oluştur"),
      duplicate: t("Bu isimde bir tedarikçi zaten var."),
      hint: t("Tedarikçiyi eklemek için firma adını yazın."),
      submit: t("TEDARİKÇİ EKLE"),
      idPrefix: "s",
    };
  }
  return {
    title: t("Yeni kayıt"),
    subtitle: t(groupName),
    duplicate: t("Bu isimde bir kayıt zaten var."),
    hint: t("Kaydı eklemek için firma adını yazın."),
    submit: t("KAYIT EKLE"),
    idPrefix: "p",
  };
}

export default function NewCustomerPage({
  kind,
  groupName,
  existingNames,
  initial,
  onSave,
  onBack,
}: {
  kind: PartyKind;
  /** Verilirse sayfa düzenleme modunda açılır: alanlar bu kaydın bilgileriyle dolar */
  initial?: Customer;
  /** Kayıt eklenen sekmenin adı */
  groupName: string;
  /** Aynı türdeki mevcut kayıtların isimleri (tekrar kontrolü için) */
  existingNames: string[];
  onSave: (customer: Customer) => void;
  onBack: () => void;
}) {
  const base = textFor(kind, groupName);
  const text: FormText = initial
    ? {
        ...base,
        title: t("Bilgileri düzenle"),
        subtitle: initial.name,
        hint: t("Firma adı boş bırakılamaz."),
        submit: t("KAYDET"),
      }
    : base;
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  const trimmed = name.trim();
  const lower = trimmed.toLocaleLowerCase("tr-TR");
  const duplicate =
    trimmed !== "" &&
    existingNames.some((n) => n.toLocaleLowerCase("tr-TR") === lower);
  // Firma adı yazılmadan ve aynı isim varken ekleme yapılamaz
  const changed =
    !initial ||
    trimmed !== initial.name ||
    phone.trim() !== (initial.phone ?? "") ||
    address.trim() !== (initial.address ?? "") ||
    email.trim() !== (initial.email ?? "") ||
    note.trim() !== (initial.note ?? "");
  const canSave = trimmed !== "" && !duplicate && changed;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    onSave({
      id: initial?.id ?? `${text.idPrefix}${Date.now()}`,
      kind,
      name: trimmed,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      email: email.trim() || undefined,
      note: note.trim() || undefined,
    });
  }

  return (
    <div className="cust-page">
      <header className="cust-header">
        <button className="round-btn" aria-label={t("Geri")} onClick={onBack}>
          <Svg d="M15 5l-7 7 7 7" />
        </button>
        <div className="cust-title">
          <span className="cust-avatar" aria-hidden="true">
            <Svg d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0M19 8v6M16 11h6" />
          </span>
          <div className="cust-name">
            <strong>{text.title}</strong>
            <small>{text.subtitle}</small>
          </div>
        </div>
        {/* Sağ üstte: firma adı yazılınca aktifleşir; form dışında olduğu için "form" ile bağlanır */}
        <button
          className="header-add"
          type="submit"
          form="party-form"
          aria-label={text.submit}
          disabled={!canSave}
        >
          {initial ? t("KAYDET") : t("EKLE")}
        </button>
      </header>

      <form id="party-form" className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="customer-name">{t("Firma adı *")}</label>
          <input
            id="customer-name"
            autoFocus={!initial}
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={duplicate ? true : undefined}
            aria-describedby={duplicate ? "customer-error" : undefined}
          />
          {duplicate && (
            <p className="form-error" id="customer-error" role="alert">
              {text.duplicate}
            </p>
          )}
          {!trimmed && <p className="field-hint">{text.hint}</p>}
        </div>

        <h2 className="form-section-title">{t("EK BİLGİLER (İSTEĞE BAĞLI)")}</h2>

        <div className="field">
          <label htmlFor="customer-phone">{t("Telefon numarası")}</label>
          <input
            id="customer-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="customer-address">{t("Adres")}</label>
          <textarea
            id="customer-address"
            rows={2}
            autoComplete="off"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="customer-email">{t("E-posta")}</label>
          <input
            id="customer-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="customer-note">{t("Not")}</label>
          <textarea
            id="customer-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

      </form>
    </div>
  );
}
