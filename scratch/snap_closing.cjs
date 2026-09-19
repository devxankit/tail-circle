const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('c:/Users/XIAOMI/tail-circle/frontend/node_modules/ws');

async function snap(viewport, filename) {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--remote-allow-origins=*',
    '--disable-gpu',
    `--window-size=${viewport.width},${viewport.height}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  try {
    const list = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9222/json/list', (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => resolve(JSON.parse(raw)));
      }).on('error', reject);
    });

    const wsUrl = list[0].webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);

    let msgId = 1;
    const pending = new Map();

    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    });

    const call = (method, params = {}) => new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

    await new Promise(r => ws.on('open', r));

    await call('Page.enable');
    await call('DOM.enable');

    await new Promise((resolve) => {
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.method === 'Page.loadEventFired') {
          ws.off('message', handler);
          resolve();
        }
      };
      ws.on('message', handler);
      call('Page.navigate', { url: 'http://localhost:5173' });
    });

    await new Promise(r => setTimeout(r, 2000));

    // Scroll to .tc-closing-section-root
    await call('Runtime.evaluate', {
      expression: `
        const el = document.querySelector('.tc-closing-section-root');
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    const shot = await call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filename, Buffer.from(shot.data, 'base64'));
    console.log('Saved:', filename);

    ws.close();
  } finally {
    chrome.kill();
  }
}

async function run() {
  await snap({ width: 390, height: 844 }, 'c:/Users/XIAOMI/tail-circle/scratch/closing_mobile_before.png');
  await snap({ width: 1200, height: 800 }, 'c:/Users/XIAOMI/tail-circle/scratch/closing_desktop_before.png');
}

run().catch(console.error);
