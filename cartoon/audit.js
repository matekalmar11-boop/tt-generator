const { chromium } = require('playwright'); const { start } = require('./server.js');
(async () => {
  const srv = await start(8301);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8301/index.html'); await p.waitForFunction('window.READY===true'); await p.evaluate(() => { window.NORENDER = true; });
  const T = await p.evaluate(() => window.TOTAL); const step = +(process.argv[2] || 0.1); const res = {};
  for (let t = 0; t < T; t += step) { const iss = await p.evaluate(t => window.audit(t), t); for (const i of iss) { const k = i.replace(/ [0-9.]+$/, ''); (res[k] = res[k] || []).push(+t.toFixed(2)); } }
  for (const [k, v] of Object.entries(res)) console.log(k.padEnd(34), 'x' + v.length, v[0] + '..' + v[v.length - 1]);
  console.log('TOTAL issue types:', Object.keys(res).length);
  await b.close(); srv.close();
})();
