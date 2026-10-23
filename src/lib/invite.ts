/**
 * Davet: uygulamanın adresini telefonun paylaşım penceresiyle gönderir (iPhone ve Android).
 * Mağaza bağlantısı (App Store / Google Play) yayınlanınca STORE_LINKS'e eklenir.
 */
export const STORE_LINKS: { label: string; url: string }[] = [];

export function appAddress(): string {
  return window.location.origin + window.location.pathname;
}

export async function inviteFriends(message: string): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const url = appAddress();
  const links = STORE_LINKS.map((s) => `${s.label}: ${s.url}`).join("\n");
  const text = [message, links, url].filter(Boolean).join("\n");
  if (navigator.share) {
    try {
      await navigator.share({ title: "Hesabım", text, url });
      return "shared";
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

/** Android Chrome'un rehber erişimi (iPhone'da yoktur) */
export interface ContactPickerApi {
  select: (
    properties: string[],
    options?: { multiple?: boolean },
  ) => Promise<{ name?: string[]; tel?: string[]; email?: string[] }[]>;
}

export function contactPicker(): ContactPickerApi | null {
  const nav = navigator as unknown as { contacts?: ContactPickerApi };
  return nav.contacts && "select" in nav.contacts ? nav.contacts : null;
}
