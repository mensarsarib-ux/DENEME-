import { useState, type FormEvent } from "react";
import type { Customer } from "../data/mock";
import { Svg } from "./Icon";

export default function NewCustomerPage({
  existingNames,
  onSave,
  onBack,
}: {
  existingNames: string[];
  onSave: (customer: Customer) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Müşteri adını yazın.");
      return;
    }
    const lower = trimmed.toLocaleLowerCase("tr-TR");
    if (existingNames.some((n) => n.toLocaleLowerCase("tr-TR") === lower)) {
      setError("Bu isimde bir müşteri zaten var.");
      return;
    }
    onSave({
      id: `c${Date.now()}`,
      name: trimmed,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      note: note.trim() || undefined,
    });
  }

  return (
    <div className="cust-page">
      <header className="cust-header">
        <button className="round-btn" aria-label="Geri" onClick={onBack}>
          <Svg d="M15 5l-7 7 7 7" />
        </button>
        <div className="cust-title">
          <span className="cust-avatar" aria-hidden="true">
            <Svg d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0M19 8v6M16 11h6" />
          </span>
          <div className="cust-name">
            <strong>Yeni müşteri</strong>
            <small>Cari hesap oluştur</small>
          </div>
        </div>
      </header>

      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="customer-name">Müşteri adı / unvanı *</label>
          <input
            id="customer-name"
            autoFocus
            autoComplete="off"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "customer-error" : undefined}
          />
          {error && (
            <p className="form-error" id="customer-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="customer-phone">Telefon</label>
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
          <label htmlFor="customer-email">E-posta</label>
          <input
            id="customer-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="customer-note">Not</label>
          <textarea
            id="customer-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button className="primary-btn" type="submit">
            MÜŞTERİYİ KAYDET
          </button>
        </div>
      </form>
    </div>
  );
}
