// Capture real app screens from the local Vite dev server (no backend).
// Usage: node capture.cjs <shots.json> <outDir>
// shots.json: [{ name, path, wait?, scrollY?, eval?, fullPage?, storage? }]
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('E:/Appzeto Projects/TailCircle/frontend/node_modules/ws');

const ORIGIN = 'http://localhost:5174';
const PORT = 9237;
const [, , shotsFile, outDir] = process.argv;
const shots = JSON.parse(fs.readFileSync(shotsFile, 'utf8'));
const W = Number(process.env.VW || 393), H = Number(process.env.VH || 852), DPR = Number(process.env.DPR || 3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const profile = path.join(__dirname, 'chrome-profile-' + Date.now());
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*',
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    '--force-color-profile=srgb', '--font-render-hinting=none',
    `--user-data-dir=${profile}`, 'about:blank',
  ]);
  let list;
  for (let i = 0; i < 40; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (list.length) break; } catch {}
    await sleep(250);
  }
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.on('message', (d) => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
  const call = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await new Promise((r) => ws.on('open', r));
  await call('Page.enable'); await call('Network.enable'); await call('Runtime.enable');
  ws.on('message', (d) => { const m = JSON.parse(d); if (process.env.LOG && m.method === 'Runtime.exceptionThrown') console.log('EXC', m.params.exceptionDetails.exception?.description?.slice(0, 300)); if (process.env.LOG && m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.log('ERR', JSON.stringify(m.params.args.map(a => a.value || a.description)).slice(0, 300)); });
  // Backend is intentionally offline: fail its calls instantly so screens fall back to shipped content.
  await call('Network.setBlockedURLs', { urls: ['*localhost:5000*', '*127.0.0.1:5000*', '*google-analytics.com*', '*googletagmanager.com*', '*firebaseio.com*', '*googleapis.com/identitytoolkit*', '*fcmregistrations*'] });
  await call('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: process.env.MOBILE !== '0' });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true });
  const ev = async (expression) => (await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })).result?.value;

  // Hide the connectivity toast (the backend is offline on purpose) and any extra page CSS for a shot.
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `setInterval(() => { document.querySelectorAll('span').forEach((sp) => { if (/^(You're offline|Back online)$/.test(sp.textContent.trim())) { let n = sp; while (n && !(n.getAttribute && (n.getAttribute('class') || '').includes('z-[60]'))) n = n.parentElement; if (n) n.style.display = 'none'; } }); const css = localStorage.getItem('__shot_css'); if (css && !document.getElementById('__shot_css')) { const st = document.createElement('style'); st.id = '__shot_css'; st.textContent = css; document.head.appendChild(st); } }, 100);` });
  await call('Page.navigate', { url: ORIGIN + '/landing' });
  await sleep(2500);
  for (const s of shots) {
    const storage = Object.assign({ __shot_css: s.css || '' }, { tc_access_token: 'store-preview', tc_cookie_consent: JSON.stringify({ analytics: false, decidedAt: new Date().toISOString() }) }, s.storage || {});
    await ev(`(() => { localStorage.clear(); ${Object.entries(storage).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join('')} })()`);
    await call('Page.navigate', { url: ORIGIN + s.path });
    await sleep(s.wait || 3500);
    if (s.eval) { await ev(s.eval); await sleep(s.evalWait || 1200); }
    if (s.scrollY) { await ev(`(() => { const els=[document.scrollingElement, ...document.querySelectorAll('*')].filter(e=>e && e.scrollHeight>e.clientHeight+20 && getComputedStyle(e).overflowY!=='visible' || e===document.scrollingElement); els.forEach(e=>e.scrollTop=${s.scrollY}); })()`); await sleep(900); }
    const url = await ev('location.pathname');
    let clip;
    if (s.clip) {
      const r = await ev(`(() => { const b = document.querySelector(${JSON.stringify(s.clip)}).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; })()`);
      clip = { ...r, scale: 1 };
    }
    await call('Emulation.setDefaultBackgroundColorOverride', s.transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!s.fullPage || !!clip, ...(clip ? { clip } : {}) });
    fs.writeFileSync(path.join(outDir, s.name + '.png'), Buffer.from(shot.data, 'base64'));
    console.log('saved', s.name, '->', url);
  }
  ws.close(); chrome.kill();
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(0); }, 800);
})().catch((e) => { console.error(e); process.exit(1); });
