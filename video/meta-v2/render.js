const path = require('path'); const fs = require('fs');
const { chromium } = require('playwright');
const page_dir = process.argv[2]; const out = process.argv[3]; const dur = parseFloat(process.argv[4] || '19');
const FPS = 30; const off = parseFloat(process.env.VOFF || "0"); fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(page_dir, 'index.html'));
  const total = Math.round(dur * FPS);
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.render(t), i / FPS + off);
    await page.screenshot({ path: path.join(out, `f_${String(i).padStart(4,'0')}.png`), clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  }
  await browser.close(); console.log('frames', total);
})().catch(e => { console.error(e); process.exit(1); });
