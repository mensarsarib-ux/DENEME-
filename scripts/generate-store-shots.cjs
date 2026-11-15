// App Store ekran görüntüleri (6,9 inç: 1320x2868). Uygulamanın kendi örnek (demo) verisi kullanılır; gerçek kişi bilgisi yok.
// Kullanım: npx vite --port 5199 (ayrı terminalde)  →  node scripts/generate-store-shots.cjs
// Çıktı: store/app-store/1-veresiye.png, 2-satis-tahsilat.png, 3-ekip.png
const { chromium } = require("playwright");
// Ekran görüntüsünün sol üst pikselinin rengi (durum çubuğu arka planı için), tarayıcı tuvaliyle okunur
let topColor;
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "store", "app-store");
const base = "http://localhost:5199/";
fs.mkdirSync(out, { recursive: true });

const W = 440; // mantıksal genişlik; 3x ölçekle 1320
const H = 956; // 3x ölçekle 2868

const page = (title, body) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  body{font-family:"Inter","Segoe UI","Helvetica Neue",Arial,sans-serif;color:#f4f8f8;
       background:radial-gradient(120% 70% at 50% 0%,#1d5a5f 0%,#123a3f 45%,#0d1a1f 100%);}
  h1{position:absolute;top:58px;left:28px;right:28px;text-align:center;font-size:40px;line-height:1.12;font-weight:800;letter-spacing:-.5px}
  h1 em{font-style:normal;color:#3DDBB0}
  .phone{position:absolute;left:50%;top:205px;transform:translateX(-50%);width:338px;height:732px;border-radius:54px;
         background:#05080a;padding:11px;box-shadow:0 30px 70px rgba(0,0,0,.55),0 0 0 2px #2b3a40 inset}
  .screen{width:100%;height:100%;border-radius:44px;overflow:hidden;position:relative;background:#11161b}
  .screen img{width:100%;height:calc(100% - 46px);object-fit:cover;object-position:top;display:block}
  .status{height:46px;display:flex;align-items:center;justify-content:space-between;padding:6px 26px 0 34px;font-size:15px;font-weight:700}
  .ic{display:flex;align-items:flex-end;gap:2px}
  .ic i{display:block;width:3px;background:#f4f8f8;border-radius:1px}
  .ic i:nth-child(1){height:4px}.ic i:nth-child(2){height:6px}.ic i:nth-child(3){height:8px}.ic i:nth-child(4){height:10px}
  .ic b{display:block;width:22px;height:11px;margin-left:6px;border:1.5px solid #f4f8f8;border-radius:3px;position:relative}
  .ic b::after{content:"";position:absolute;inset:1.5px 5px 1.5px 1.5px;background:#f4f8f8;border-radius:1px}
  .island{position:absolute;top:22px;left:50%;transform:translateX(-50%);width:92px;height:27px;border-radius:14px;background:#000}
  .team{position:absolute;left:0;right:0;top:330px;display:flex;justify-content:center}
  .lineB{stroke:#4c9cf0;stroke-width:9;fill:none;stroke-linecap:round;stroke-linejoin:round}
  .lineT{stroke:#3DDBB0;stroke-width:9;fill:none;stroke-linecap:round;stroke-linejoin:round}
  .note{position:absolute;left:36px;right:36px;top:660px;text-align:center;font-size:30px;line-height:1.35;font-weight:600;color:#c9dcdc}
</style></head><body><h1>${title}</h1>${body}</body></html>`;

// Durum çubuğu: adanın uygulama başlığını kapatmaması için ekran içeriği çubuğun altından başlar
const phone = (img, bar) => `<div class="phone"><div class="screen" style="background:${bar}">
  <div class="status"><span>9:41</span><span class="ic"><i></i><i></i><i></i><i></i><b></b></span></div>
  <img src="data:image/png;base64,${img}"></div><div class="island"></div></div>`;

const T = 'font-family="Inter, Segoe UI, Arial, sans-serif"';
const member = (x, cls, label, ok) => `
  <circle class="${cls}" cx="${x}" cy="420" r="78"/>
  <circle class="${cls}" cx="${x}" cy="400" r="26"/>
  <path class="${cls}" d="M${x - 50} 470 Q${x - 50} 440 ${x} 440 Q${x + 50} 440 ${x + 50} 470"/>
  <text x="${x}" y="545" text-anchor="middle" font-size="36" font-weight="700" fill="#f4f8f8" ${T}>${label}</text>
  <rect class="${cls}" x="${x - 100}" y="580" width="200" height="66" rx="33"/>
  <text x="${x}" y="625" text-anchor="middle" font-size="32" font-weight="700" fill="${ok ? "#3DDBB0" : "#4c9cf0"}" ${T}>${ok ? "✓ görebilir" : "✕ göremez"}</text>`;
const teamSvg = `<div class="team"><svg viewBox="0 0 1080 680" width="420" height="265">
  <rect class="lineT" x="330" y="30" width="420" height="130" rx="34"/>
  <text x="540" y="108" text-anchor="middle" font-size="46" font-weight="800" fill="#f4f8f8" ${T}>İşletmeniz</text>
  <path class="lineT" d="M540 160 V260"/><path class="lineT" d="M180 260 H900"/>
  <path class="lineT" d="M180 260 V330"/><path class="lineB" d="M540 260 V330"/><path class="lineT" d="M900 260 V330"/>
  ${member(180, "lineT", "Ekip üyesi 1", true)}${member(540, "lineB", "Ekip üyesi 2", false)}${member(900, "lineT", "Ekip üyesi 3", true)}
</svg></div>`;

(async () => {
  const b = await chromium.launch();
  // 1) Uygulama ekranlarını demo veriyle al
  const app = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: "tr-TR" });
  const p = await app.newPage();
  const go = async () => {
    await p.goto(base);
    await p.evaluate(() => localStorage.setItem("hesabim:tanitim", "1"));
    await p.reload();
    await p.waitForTimeout(1200);
  };
  await go();
  const shotList = (await p.screenshot()).toString("base64");
  await p.locator('button:has-text("Ahmet Yılmaz")').first().click();
  await p.waitForTimeout(900);
  const shotEntry = (await p.screenshot()).toString("base64");
  await app.close();

  // 2) Mağaza görsellerini oluştur
  const store = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3 });
  const s = await store.newPage();
  topColor = (b64) =>
    s.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = 20;
      c.height = 20;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      const d = g.getImageData(10, 10, 1, 1).data;
      return `rgb(${d[0]},${d[1]},${d[2]})`;
    }, `data:image/png;base64,${b64}`);
  const render = async (file, html) => {
    await s.setContent(html, { waitUntil: "load" });
    await s.waitForTimeout(300);
    await s.screenshot({ path: path.join(out, file) });
  };
  await render("1-veresiye.png", page("Veresiye defterin <em>cebinde</em>", phone(shotList, await topColor(shotList))));
  await render("2-satis-tahsilat.png", page("Satış ve tahsilat <em>tek dokunuşla</em>", phone(shotEntry, await topColor(shotEntry))));
  await render(
    "3-ekip.png",
    page(
      "Çalışanın da <em>kayıt girsin</em>",
      teamSvg + '<div class="note">Kimin neyi göreceğine<br>sen karar ver</div>'
    )
  );
  await b.close();
  console.log("App Store görselleri:", fs.readdirSync(out).join(", "));
})();
