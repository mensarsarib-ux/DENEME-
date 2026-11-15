// Uygulamanın ham ekran görüntülerini (başlık ve çerçeve olmadan) alır: store/app-preview/raw/*.png
// Kullanım: npx vite --port 5199 (ayrı terminalde)  →  node scripts/capture-app-screens.cjs
// Veriler uygulamanın demo verisidir; gerçek müşteri bilgisi içermez.
const { chromium } = require("playwright");
const path = require("path");
const out = path.join(__dirname, "..", "store", "app-preview", "raw");
const base = "http://localhost:5199/";
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: "tr-TR" });
  const p = await ctx.newPage();
  const go = async () => {
    await p.goto(base);
    await p.evaluate(() => localStorage.setItem("hesabim:tanitim", "1"));
    await p.reload();
    await p.waitForTimeout(1200);
  };
  const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: path.join(out, name) }); };
  const slide = async (n) => p.evaluate((i) => { const t = document.querySelector(".stats-track"); t.scrollLeft = t.clientWidth * i; }, n);
  await go(); await shot("1-veresiye.png");
  await go(); await p.locator('button:has-text("Ahmet Yılmaz")').first().click(); await p.waitForTimeout(800); await shot("2-satis-tahsilat.png");
  await go(); await p.locator('button:has-text("Ahmet Yılmaz")').first().click(); await p.waitForTimeout(800);
  await p.locator('button[aria-label="Paylaş"]').first().click(); await p.waitForTimeout(500);
  await p.locator('button:has-text("PDF oluştur")').click(); await p.waitForTimeout(800);
  await p.locator("button:has-text(\"PDF'i oluştur\")").click(); await p.waitForTimeout(3500); await shot("3-ekstre.png");
  await go(); await slide(2); await shot("4-alacak.png");
  await go(); await p.locator('button[aria-label*="Kasa"]').click(); await p.waitForTimeout(400); await p.locator('button[aria-label*="Kasa"]').click(); await shot("5-kasa.png");
  await go(); await slide(1); await shot("6-gelir-gider.png");
  await go(); await p.locator('button:has-text("Tedarikçiler")').first().click(); await shot("7-tedarikci.png");
  await b.close();
  console.log("ham ekranlar alındı");
})();
