import { useState, type FormEvent } from "react";
import type { Customer } from "../data/mock";
import { haptic } from "../lib/haptics";

export type ContactPatch = Pick<Customer, "phone" | "email" | "address" | "note">;

/** Bir kişinin iletişim bilgilerini düzenleme penceresi; Kişiler sayfasında ve işlem sayfasında kullanılır */
export default function ContactSheet({
  party,
  groupName,
  onSave,
  onOpenAccount,
  onClose,
}: {
  party: Customer;
  groupName?: string;
  onSave: (patch: ContactPatch) => void;
  /** Verilirse "Hesabı aç" düğmesi gösterilir */
  onOpenAccount?: () => void;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState(party.phone ?? "");
  const [email, setEmail] = useState(party.email ?? "");
  const [address, setAddress] = useState(party.address ?? "");
  const [note, setNote] = useState(party.note ?? "");

  function submit(event: FormEvent) {
    event.preventDefault();
    haptic("success");
    onSave({
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      note: note.trim() || undefined,
    });
    onClose();
  }

  return (
    <div className="action-backdrop" onClick={onClose}>
      <form
        className="action-sheet"
        role="dialog"
        aria-label={`${party.name} iletişim bilgileri`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
      >
        <div className="action-handle" aria-hidden="true" />
        <h2 className="sheet-title">{party.name}</h2>
        {groupName && <p className="sheet-note">{groupName}</p>}

        <div className="field">
          <label htmlFor="ct-phone">Telefon</label>
          <input id="ct-phone" type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ct-email">E-posta</label>
          <input id="ct-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ct-address">Adres</label>
          <textarea id="ct-address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ct-note">Not</label>
          <textarea id="ct-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <button className="primary-btn" type="submit">KAYDET</button>
        {onOpenAccount && (
          <button className="action-btn" type="button" onClick={onOpenAccount}>Hesabı aç</button>
        )}
        <button className="action-btn is-cancel" type="button" onClick={onClose}>Vazgeç</button>
      </form>
    </div>
  );
}
