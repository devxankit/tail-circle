const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  // wait 1.5s for chrome to start
  await new Promise(r => setTimeout(r, 1500));

  try {
    // get webSocketDebuggerUrl
    const listRes = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9222/json/list', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const page = listRes[0];
    const wsUrl = page.webSocketDebuggerUrl;
    console.log('Connecting to', wsUrl);

    // Simple WebSocket client using built-in or basic socket
    const WebSocket = require('c:/Users/XIAOMI/tail-circle/frontend/node_modules/ws');
    const ws = new WebSocket(wsUrl);

    let id = 1;
    const send = (method, params = {}) => new Promise((resolve) => {
      const curId = id++;
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === curId) {
          ws.off('message', handler);
          resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await new Promise(r => ws.on('open', r));

    // Emulate iPhone 14 (393 x 852)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 2,
      mobile: true
    });

    // Navigate to local site
    await send('Page.navigate', { url: 'http://localhost:5173' });
    await new Promise(r => setTimeout(r, 2000));

    // Scroll to #app element
    await send('Runtime.evaluate', {
      expression: `
        const el = document.getElementById('app');
        if (el) {
          el.scrollIntoView({ block: 'center' });
        }
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    // Take screenshot
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.data, 'base64');
    fs.writeFileSync('C:\\Users\\XIAOMI\\.gemini\\antigravity-ide\\brain\\527f7f53-898d-4d32-9e57-6872f8c83c6f\\mobile_app_section.png', buffer);
    console.log('Saved mobile_app_section.png');

    // Also scroll slightly up to see transition from WhySection to AppSection
    await send('Runtime.evaluate', {
      expression: `
        const el = document.getElementById('app');
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 180;
          window.scrollTo(0, top);
        }
      `
    });
    await new Promise(r => setTimeout(r, 800));
    const shotTransition = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\XIAOMI\\.gemini\\antigravity-ide\\brain\\527f7f53-898d-4d32-9e57-6872f8c83c6f\\mobile_transition.png', Buffer.from(shotTransition.data, 'base64'));
    console.log('Saved mobile_transition.png');

    // Also capture closing section
    await send('Runtime.evaluate', {
      expression: `
        const el = document.querySelector('.tc-closing-section-root');
        if (el) {
          el.scrollIntoView({ block: 'center' });
        }
      `
    });
    await new Promise(r => setTimeout(r, 800));
    const shotClosing = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\XIAOMI\\.gemini\\antigravity-ide\\brain\\527f7f53-898d-4d32-9e57-6872f8c83c6f\\mobile_closing.png', Buffer.from(shotClosing.data, 'base64'));
    console.log('Saved mobile_closing.png');

    ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    chrome.kill();
  }
}

run();
