const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('c:/Users/XIAOMI/tail-circle/frontend/node_modules/ws');

async function main() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--remote-allow-origins=*',
    '--disable-gpu',
    '--window-size=393,852',
    'http://localhost:5174'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const list = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9222/json/list', (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => resolve(JSON.parse(raw)));
      }).on('error', reject);
    });

    console.log('Open targets:', list.map(t => ({ url: t.url, type: t.type })));
    const target = list.find(t => t.url.includes('localhost:5174')) || list[0];
    const ws = new WebSocket(target.webSocketDebuggerUrl);

    await new Promise(r => ws.on('open', r));
    console.log('Connected to target:', target.url);

    let id = 1;
    const call = (method, params = {}) => new Promise((resolve) => {
      const curId = id++;
      const h = (d) => {
        const m = JSON.parse(d);
        if (m.id === curId) {
          ws.off('message', h);
          resolve(m.result);
        }
      };
      ws.on('message', h);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    ws.on('message', (d) => {
      const m = JSON.parse(d);
      if (m.method === 'Runtime.consoleAPICalled') {
        console.log('[Browser Console]', m.params.type, m.params.args.map(a => a.value || a.description));
      }
      if (m.method === 'Runtime.exceptionThrown') {
        console.error('[Browser Exception]', m.params.exceptionDetails);
      }
    });

    await call('Runtime.enable');
    await call('Page.enable');

    await new Promise(r => setTimeout(r, 3000));

    const check = await call('Runtime.evaluate', {
      expression: `
        JSON.stringify({
          title: document.title,
          appExists: !!document.getElementById('app'),
          appRect: document.getElementById('app') ? document.getElementById('app').getBoundingClientRect() : null,
          whyRect: document.getElementById('why') ? document.getElementById('why').getBoundingClientRect() : null,
          bodyHeight: document.body.scrollHeight,
          scrollY: window.scrollY
        })
      `
    });

    console.log('Status Report:', check.result.value);

    // Scroll directly to app
    await call('Runtime.evaluate', {
      expression: `
        const app = document.getElementById('app');
        if (app) {
          app.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    const shot = await call('Page.captureScreenshot', { format: 'png' });
    const fs = require('fs');
    fs.writeFileSync('C:/Users/XIAOMI/.gemini/antigravity-ide/brain/527f7f53-898d-4d32-9e57-6872f8c83c6f/inspected_app_mobile.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved inspected_app_mobile.png successfully!');

    // Also scroll slightly up to capture transition between why and app
    await call('Runtime.evaluate', {
      expression: `
        window.scrollBy(0, -220);
      `
    });
    await new Promise(r => setTimeout(r, 500));
    const shotGap = await call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/Users/XIAOMI/.gemini/antigravity-ide/brain/527f7f53-898d-4d32-9e57-6872f8c83c6f/inspected_gap_mobile.png', Buffer.from(shotGap.data, 'base64'));
    console.log('Saved inspected_gap_mobile.png successfully!');

    // Also scroll to closing section
    await call('Runtime.evaluate', {
      expression: `
        const closing = document.querySelector('.tc-closing-section-root');
        if (closing) {
          closing.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      `
    });
    await new Promise(r => setTimeout(r, 500));
    const shotClosing = await call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/Users/XIAOMI/.gemini/antigravity-ide/brain/527f7f53-898d-4d32-9e57-6872f8c83c6f/inspected_closing_mobile.png', Buffer.from(shotClosing.data, 'base64'));
    console.log('Saved inspected_closing_mobile.png successfully!');

    ws.close();
  } catch (e) {
    console.error('Error:', e);
  } finally {
    chrome.kill();
  }
}

main();
