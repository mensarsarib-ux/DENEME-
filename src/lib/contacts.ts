import { Capacitor } from "@capacitor/core";
import { Contacts } from "@capacitor-community/contacts";

/** Rehberden seçilen kişi: görünen ad, telefon ve e-posta (yoksa boş) */
export interface PickedContact {
  name: string;
  phone: string;
  email: string;
}

/** Rehberden seçme yalnızca yerel uygulamada çalışır; tarayıcıda düğme gösterilmez */
export const contactPickerAvailable = () => Capacitor.isNativePlatform();

/**
 * Apple'ın kişi seçicisini açar. Rehber izni istenmez: seçici yalnızca seçilen kişiyi uygulamaya verir
 * (scripts/patch-contacts.cjs). Vazgeçilirse null döner.
 */
export async function pickContact(): Promise<PickedContact | null> {
  try {
    const { contact } = await Contacts.pickContact({ projection: { name: true, organization: true, phones: true, emails: true } });
    const person = [contact.name?.given, contact.name?.family].filter(Boolean).join(" ").trim();
    const company = contact.organization?.company?.trim() ?? "";
    return {
      // Şirket adı varsa kayıt adı olarak o kullanılır (müşteri ve tedarikçiler çoğunlukla firmadır)
      name: company || person,
      phone: contact.phones?.[0]?.number?.trim() ?? "",
      email: contact.emails?.[0]?.address?.trim() ?? "",
    };
  } catch {
    return null;
  }
}
