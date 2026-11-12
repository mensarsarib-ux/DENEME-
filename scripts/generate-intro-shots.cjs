// Tanıtım slaytlarındaki ekran görüntülerini (public/tanitim) yerel geliştirme sunucusundan alır.
// Kullanım: npx vite --port 5199 (ayrı terminalde)  →  node scripts/generate-intro-shots.cjs
// Veriler uygulamanın kendi örnek (demo) verisidir; gerçek müşteri bilgisi içermez.
const { chromium } = require("playwright");
const path = require("path");
const out = path.join(__dirname, "..", "public", "tanitim");
const base = "http://localhost:5199/";
const shrink = async (file) => {
  // 2x çekilen görüntü 585x1266 boyutuna indirilir (Playwright'ın kendi ekranında yazılmış PNG)
  const sharp = require("sharp");
  await sharp(file).resize(585, 1266).png({ compressionLevel: 9 }).toFile(file + ".tmp");
  require("fs").renameSync(file + ".tmp", file);
};
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "tr-TR" });
  const p = await ctx.newPage();
  const go = async () => { await p.goto(base); await p.evaluate(() => localStorage.setItem("hesabim:tanitim", "1")); await p.reload(); await p.waitForTimeout(1000); };
  await go();
  await p.screenshot({ path: `${out}/1-ana.png` });
  await p.locator('button:has-text("Ahmet Yılmaz")').first().click(); await p.waitForTimeout(800);
  await p.locator('button[aria-label="Tuş takımını aç"]').first().click({ timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/2-satis.png` });
  await go();
  await p.locator('button[aria-label*="Kasa"]').click(); await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/3-kasa.png` });
  await b.close();
  for (const f of ["1-ana.png", "2-satis.png", "3-kasa.png"]) await shrink(path.join(out, f));
  console.log("tanıtım görüntüleri güncellendi");
})();
