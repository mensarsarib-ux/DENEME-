// stage.html içindeki seek(t) fonksiyonunu her kare için çağırır ve kareyi JPEG olarak kaydeder.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const FPS = 30, DURATION = 22;
  const frames = Math.round(DURATION * FPS);
  const dir = path.join(__dirname, 'frames-defter');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.join(__dirname, 'defter.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  for (let i = 0; i < frames; i++) {
    const t = i / FPS;
    await p.evaluate((tt) => seek(tt), t);
    await p.screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 92 });
  }
  await b.close();
  console.log('kare sayısı', frames);
})().catch((e) => { console.error(e.message.split('\n')[0]); process.exit(1); });
