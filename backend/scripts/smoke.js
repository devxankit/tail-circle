/* Boots the Express app WITHOUT MongoDB and checks a couple of routes. */
import app from '../src/app.js';

const server = app.listen(0, async () => {
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  let failed = false;

  const check = async (path, expect) => {
    const res = await fetch(base + path);
    const ok = res.status === expect;
    console.log(`${ok ? 'PASS' : 'FAIL'}  GET ${path} -> ${res.status} (want ${expect})`);
    if (!ok) failed = true;
    return res;
  };

  try {
    await check('/health', 200);
    await check('/api', 200);
    await check('/api/nope', 404);
    // Validation should reject an empty body with 400.
    const r = await fetch(base + '/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const okv = r.status === 400;
    console.log(`${okv ? 'PASS' : 'FAIL'}  POST /api/auth/request-otp (empty) -> ${r.status} (want 400)`);
    if (!okv) failed = true;

    // Uploads must require auth.
    const u = await fetch(base + '/api/uploads/image', { method: 'POST' });
    const oku = u.status === 401;
    console.log(`${oku ? 'PASS' : 'FAIL'}  POST /api/uploads/image (no auth) -> ${u.status} (want 401)`);
    if (!oku) failed = true;
  } catch (e) {
    console.error('ERROR', e);
    failed = true;
  } finally {
    server.close();
    process.exit(failed ? 1 : 0);
  }
});
