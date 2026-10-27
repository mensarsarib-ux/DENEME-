/**
 * Ana ekranın son hâlinin kopyası. Bir alt sayfaya geçerken alınır ve geri kaydırmada
 * arkada, eski ekranla birlikte kaysın diye kullanılır.
 */
let snapshot: HTMLElement | null = null;

/** Ana ekran açıkken çağrılır: kopyayı alır */
export function captureHome() {
  const home = document.querySelector<HTMLElement>(".app");
  snapshot = home ? (home.cloneNode(true) as HTMLElement) : null;
}

/** Arkada gösterilecek ana ekranın yeni bir kopyası; yoksa null */
export function homeUnderlay(): HTMLElement | null {
  return snapshot ? (snapshot.cloneNode(true) as HTMLElement) : null;
}
