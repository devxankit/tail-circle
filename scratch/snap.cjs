const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('c:/Users/XIAOMI/tail-circle/frontend/node_modules/ws');

async function main() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--remote-allow-origins=*',
    '--disable-gpu',
    '--window-size=393,852',
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
    console.log('WS URL:', wsUrl);
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
    console.log('WS connected!');

    await call('Page.enable');
    await call('DOM.enable');

    console.log('Navigating to http://localhost:5174...');
    await new Promise((resolve) => {
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.method === 'Page.loadEventFired') {
          ws.off('message', handler);
          resolve();
        }
      };
      ws.on('message', handler);
      call('Page.navigate', { url: 'http://localhost:5174' });
    });
    console.log('Page loadEventFired received!');
    await new Promise(r => setTimeout(r, 2000));

    // Wait up to 10s for #app to exist
    let found = false;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const res = await call('Runtime.evaluate', { expression: `!!document.getElementById('app')` });
      if (res && res.result && res.result.value) {
        found = true;
        break;
      }
    }
    console.log('Found #app:', found);

    if (!found) {
      console.log('DOM check:', await call('Runtime.evaluate', { expression: `document.body.innerHTML.slice(0, 500)` }));
    }

    // Scroll to #app element
    await call('Runtime.evaluate', {
      expression: `
        const app = document.getElementById('app');
        if (app) {
          app.scrollIntoView({ behavior: 'instant', block: 'start' });
          window.scrollBy(0, -20);
        }
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    const shotApp = await call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/Users/XIAOMI/.gemini/antigravity-ide/brain/527f7f53-898d-4d32-9e57-6872f8c83c6f/actual_mobile_app.png', Buffer.from(shotApp.data, 'base64'));
    console.log('Captured actual_mobile_app.png!');

    // Also scroll to transition between Why and App section
    await call('Runtime.evaluate', {
      expression: `
        const app = document.getElementById('app');
        if (app) {
          const rect = app.getBoundingClientRect();
          window.scrollBy(0, -260);
        }
      `
    });
    await new Promise(r => setTimeout(r, 800));
    const shotGap = await call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/Users/XIAOMI/.gemini/antigravity-ide/brain/527f7f53-898d-4d32-9e57-6872f8c83c6f/actual_mobile_gap.png', Buffer.from(shotGap.data, 'base64'));
    console.log('Captured actual_mobile_gap.png!');

    // Also scroll to closing section
    await call('Runtime.evaluate', {
      expression: `
        const closing = document.querySelector('.tc-closing-section-root');
        if (closing) {
          closing.scrollIntoView({ behavior: 'instant', block: 'start' });
          window.scrollBy(0, -30);
        }
      `
    });
    await new Promise(r => setTimeout(r, 800));
    const shotClosing = await call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/Users/XIAOMI/.gemini/antigravity-ide/brain/527f7f53-898d-4d32-9e57-6872f8c83c6f/actual_mobile_closing.png', Buffer.from(shotClosing.data, 'base64'));
    console.log('Captured actual_mobile_closing.png!');

    ws.close();
  } catch (err) {
    console.error('Run error:', err);
  } finally {
    chrome.kill();
  }
}

main();
