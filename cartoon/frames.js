// node frames.js <outDir> <fps> <start> <end> <port> [stride]  -> rendert Frames start..end-1 (Index*stride+start)
const { chromium } = require('playwright'); const { start } = require('./server.js'); const fs = require('fs');
(async () => {
  const [outDir, fps, f0, f1, port, offs] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6], process.argv[7]];
  const times = process.argv.slice(8).map(Number);
  const srv = await start(port);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('PAGEERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await p.goto(`http://localhost:${port}/index.html`); await p.waitForFunction('window.READY===true', null, { timeout: 120000 });
  fs.mkdirSync(outDir, { recursive: true });
  const list = times.length ? times.map((t, i) => [`still_${t.toFixed(2)}`, t]) : Array.from({ length: f1 - f0 }, (_, i) => { const f = f0 + i; return [String(f).padStart(5, '0'), f / fps]; });
  for (const [name, t] of list) {
    await p.evaluate(t => window.renderAt(t), t);
    await p.screenshot({ path: `${outDir}/${name}.jpg`, type: 'jpeg', quality: 93 });
    if (!times.length && (name.endsWith('0'))) console.log('frame', name, new Date().toISOString());
  }
  await b.close(); srv.close();
})();
