// public/logo.svg'den Android ve iOS'un yerel görsellerini üretir:
//  - Android simge: uyarlanabilir simgenin ön yüzü (H + onay, saydam), eski tip kare ve yuvarlak simgeler
//  - Android ve iOS açılış ekranı (splash): beyaz zemin, ortada yuvarlatılmış logo
// Arka plan degradesi ayrıca res/drawable/ic_launcher_background.xml içindedir.
// Logo değişirse: node scripts/generate-native-icons.cjs (Playwright ve Chromium gerekir)
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const logo = fs.readFileSync(path.join(root, "public", "logo.svg"), "utf8");
const inner = logo.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
// Degrade tanımı ve logo içeriği (arka plan dikdörtgeni dahil)
const defs = inner.match(/<defs>[\s\S]*?<\/defs>/)[0];
const glyphs = inner.replace(/<defs>[\s\S]*?<\/defs>/, "").replace(/<rect[^>]*\/>/, "");

const res = path.join(root, "android", "app", "src", "main", "res");
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

/** Uyarlanabilir simge ön yüzü: 108 birimlik tuval; 1024'lük logo görünür 72 birimlik alana oturur */
const foreground = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><g transform="translate(18 18) scale(${72 / 1024})">${glyphs}</g></svg>`;

/** Logonun tamamı: kare (yuvarlatılmış köşe) ya da daire */
const fullLogo = (shape) => {
  const clip =
    shape === "circle"
      ? `<clipPath id="c"><circle cx="512" cy="512" r="512"/></clipPath>`
      : `<clipPath id="c"><rect width="1024" height="1024" rx="${shape === "rounded" ? 225 : 0}"/></clipPath>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}<defs>${clip}</defs><g clip-path="url(#c)"><rect width="1024" height="1024" fill="url(#bg)"/>${glyphs}</g></svg>`;
};

/** Açılış ekranı: beyaz zemin, ortada kısa kenarın %28'i boyutunda yuvarlatılmış logo */
const splash = (w, h) => {
  const s = Math.round(Math.min(w, h) * 0.28);
  const x = Math.round((w - s) / 2);
  const y = Math.round((h - s) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#ffffff"/><svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 1024 1024">${fullLogo("rounded").replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</svg></svg>`;
};

async function render(page, svg, w, h, file, transparent) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${w}" height="${h}" `)}</body></html>`,
  );
  await page.locator("svg").first().screenshot({ path: file, omitBackground: transparent });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const done = [];
  for (const [name, k] of Object.entries(DENSITIES)) {
    const dir = path.join(res, `mipmap-${name}`);
    await render(page, foreground(), 108 * k, 108 * k, path.join(dir, "ic_launcher_foreground.png"), true);
    await render(page, fullLogo("rounded"), 48 * k, 48 * k, path.join(dir, "ic_launcher.png"), true);
    await render(page, fullLogo("circle"), 48 * k, 48 * k, path.join(dir, "ic_launcher_round.png"), true);
    done.push(`mipmap-${name}`);
  }
  // Açılış ekranları: mevcut dosyaların boyutları korunur
  const splashFiles = fs
    .readdirSync(res)
    .filter((d) => d.startsWith("drawable"))
    .map((d) => path.join(res, d, "splash.png"))
    .filter((f) => fs.existsSync(f));
  const iosSplash = path.join(root, "ios", "App", "App", "Assets.xcassets", "Splash.imageset");
  if (fs.existsSync(iosSplash)) {
    for (const f of fs.readdirSync(iosSplash)) if (f.endsWith(".png")) splashFiles.push(path.join(iosSplash, f));
  }
  for (const f of splashFiles) {
    const buf = fs.readFileSync(f);
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    await render(page, splash(w, h), w, h, f, false);
    done.push(path.relative(root, f));
  }
  await browser.close();
  console.log(`${done.length} görsel üretildi`);
})();
