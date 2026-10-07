const { spawn, execSync } = require('child_process');
const fs = require('fs');
const WebSocket = require('e:/Appzeto Projects/TailCircle/frontend/node_modules/ws');

async function testScreenshot() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--remote-allow-origins=*',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=e:\\Appzeto Projects\\TailCircle\\scratch\\chrome-test-profile',
    '--window-size=1080,1920',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9224/json/list');
    const list = await listRes.json();
    const wsUrl = list[0].webSocketDebuggerUrl;
    console.log('Connected to WS:', wsUrl);

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

    await new Promise((resolve) => ws.on('open', resolve));

    await call('Page.enable');
    await call('DOM.enable');
    await call('Emulation.setDeviceMetricsOverride', {
      width: 1080,
      height: 1920,
      deviceScaleFactor: 1,
      mobile: true
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; width: 1080px; height: 1920px; background: linear-gradient(135deg, #FAF7F2 0%, #FFCCBC 100%); display: flex; align-items: center; justify-content: center; font-family: sans-serif; }
          h1 { color: #F87B68; font-size: 64px; }
        </style>
      </head>
      <body>
        <h1>TailCircle Play Store Preview Test</h1>
      </body>
      </html>
    `;

    await call('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) });
    await new Promise(r => setTimeout(r, 1000));

    const shot = await call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('e:/Appzeto Projects/TailCircle/scratch/test_out.png', Buffer.from(shot.data, 'base64'));
    console.log('SUCCESS! Screenshot written.');
    ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    try {
      require('child_process').execSync(`taskkill /pid ${chrome.pid} /f /t`);
    } catch (e) {}
    process.exit(0);
  }
}

testScreenshot();
