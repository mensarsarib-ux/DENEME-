/**
 * App Store uygulama önizlemesi için uygulamanın GERÇEK ekran kaydı (Apple 2.3.4'e uygun).
 * Telefon çerçevesi, cihaz görseli ya da tanıtım kartı yoktur; yalnızca uygulamanın kendisi tam ekran kaydedilir.
 * Veriler uygulamanın demo verisidir (Örnek Ticaret A.Ş.); gerçek müşteri bilgisi içermez.
 *
 * Önce yerel sunucu: npx vite --port 5198
 * Kullanım: node scripts/record-app-preview.cjs
 * Çıktı: store/app-preview/kayit/ham.webm (886x1920); sonra scripts/render-app-preview-real.sh ile mp4'e çevrilir.
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const OUT_DIR = path.join(__dirname, "..", "store", "app-preview", "kayit");
const URL = process.env.PREVIEW_URL || "http://localhost:5198/";

const wait = (p, ms) => p.waitForTimeout(ms);

/** Dokunulan yerde kısa bir halka gösterir (izleyen nereye basıldığını görsün) */
const TOUCH_CSS = `
.pv-touch{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;
background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.85);pointer-events:none;z-index:99999;
animation:pvt .5s ease-out forwards}
@keyframes pvt{0%{transform:scale(.6);opacity:1}100%{transform:scale(1.4);opacity:0}}`;

async function tapAt(p, x, y) {
  await p.evaluate(
    ([x, y]) => {
      const d = document.createElement("div");
      d.className = "pv-touch";
      d.style.left = `${x}px`;
      d.style.top = `${y}px`;
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 600);
    },
    [x, y],
  );
  await p.touchscreen.tap(x, y);
}

async function tap(p, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("öğe bulunamadı");
  await tapAt(p, box.x + box.width / 2, box.y + box.height / 2);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  // 443x960 nokta, 2x ölçek = 886x1920 piksel (App Store 6.5"/6.9" önizleme boyutu)
  const setup = await browser.newContext({ viewport: { width: 443, height: 960 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "tr-TR" });
  const sp = await setup.newPage();
  await sp.goto(URL, { waitUntil: "networkidle" });
  const storage = await sp.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("hesabim:language", "tr");
    localStorage.setItem("hesabim:onboarded", "1");
    return JSON.stringify(localStorage);
  });
  await setup.close();

  const ctx = await browser.newContext({
    viewport: { width: 443, height: 960 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    locale: "tr-TR",
    colorScheme: "dark",
    recordVideo: { dir: OUT_DIR, size: { width: 886, height: 1920 } },
  });
  await ctx.addInitScript((s) => {
    const data = JSON.parse(s);
    if (!sessionStorage.getItem("pv-init")) {
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
      sessionStorage.setItem("pv-init", "1");
    }
  }, storage);
  const p = await ctx.newPage();
  const start = Date.now();
  const mark = (name) => console.log(`${((Date.now() - start) / 1000).toFixed(2)}s ${name}`);
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: TOUCH_CSS });
  const skip = p.getByText("Atla");
  if (await skip.count()) await skip.first().click();
  await wait(p, 1200);
  mark("ana-ekran");

  // 1) Ana ekran: özet kartları kaydırılır
  await wait(p, 1500);
  const track = p.locator(".stats-track");
  const tw = await track.evaluate((el) => el.clientWidth);
  for (let i = 1; i <= 2; i++) {
    const box = await track.boundingBox();
    await tapAt(p, box.x + box.width * 0.8, box.y + box.height * 0.5);
    await track.evaluate((el, x) => el.scrollTo({ left: x, behavior: "smooth" }), tw * i);
    await wait(p, 1500);
  }
  await track.evaluate((el) => el.scrollTo({ left: 0, behavior: "smooth" }));
  await wait(p, 900);
  mark("kartlar");

  // 2) Müşteri hesabı açılır
  await tap(p, p.getByText("Ahmet Yılmaz Ticaret", { exact: true }).last());
  await wait(p, 1300);
  mark("cari");

  // 3) Satış eklenir: tutar tuş takımıyla, açıklama yazılır, EKLE
  await tap(p, p.locator(".amount-field"));
  await wait(p, 700);
  for (const k of ["4", "5", "0", "0"]) {
    await tap(p, p.locator(".keypad button", { hasText: new RegExp(`^${k}$`) }).first());
    await wait(p, 320);
  }
  await wait(p, 300);
  const desc = p.locator('textarea[aria-label="Açıklama"]');
  await tap(p, desc);
  await p.keyboard.type("Kumaş satışı", { delay: 70 });
  await wait(p, 500);
  await tap(p, p.locator(".save-btn"));
  await wait(p, 1600);
  mark("satis");

  // 4) Tahsilat eklenir (önce klavye kapanır: yazarken işlem türü sekmeleri gizlidir)
  await p.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
  await wait(p, 700);
  const tahsilat = p.locator(".entry-tabs [role=tab]", { hasText: /^TAHSİLAT$/ });
  if (await tahsilat.count()) {
    await tap(p, tahsilat.first());
    await wait(p, 600);
    await tap(p, p.locator(".amount-field"));
    await wait(p, 500);
    for (const k of ["2", "0", "0", "0"]) {
      await tap(p, p.locator(".keypad button", { hasText: new RegExp(`^${k}$`) }).first());
      await wait(p, 300);
    }
    await wait(p, 300);
    await tap(p, p.locator(".save-btn"));
    await wait(p, 1100);
    // Tahsilat nereye girsin: Nakit
    const cash = p.getByText("Nakit", { exact: true });
    if (await cash.count()) await tap(p, cash.last());
    await wait(p, 1700);
    mark("tahsilat");
  }

  // 5) Geri: ana ekrana dönülür, Tedarikçiler sekmesi
  await tap(p, p.locator("[data-back]").first());
  await wait(p, 1000);
  await tap(p, p.getByText("Tedarikçiler", { exact: true }).first());
  await wait(p, 1700);
  mark("tedarikci");

  // 6) Kasa: ilk dokunuş tutarı gösterir, ikincisi kasa sayfasını açar
  const kasa = p.locator('[aria-label="Kasa: nakit ve banka"]');
  await tap(p, kasa);
  await wait(p, 900);
  await tap(p, kasa);
  await wait(p, 2800);
  mark("kasa");

  await wait(p, 600);
  const video = p.video();
  await ctx.close();
  await browser.close();
  const raw = await video.path();
  const dest = path.join(OUT_DIR, "ham.webm");
  fs.renameSync(raw, dest);
  console.log("kayıt:", dest);
})().catch((e) => {
  console.error("HATA", e.message.split("\n")[0]);
  process.exit(1);
});
