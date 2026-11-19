import assert from 'node:assert/strict';
import { test } from 'node:test';

const origin = 'https://buildthepulse.onrender.com';
const growth = 'buildthepulse-growth';
const endpoints = [
  ['buildpulse-waitlist', 8192, {
    email: 'fixture@example.test', trade: 'All trades', requested_plan: 'not_sure', consent_to_contact: true,
  }, 'buildpulse_waitlist'],
  [growth, 4096, { kind: 'event', event_type: 'page_view', market: 'dc', path: '/' }, 'buildthepulse_analytics_events'],
  ['buildthepulse-privacy', 4000, {
    email: 'fixture@example.test', request_type: 'access',
  }, 'buildthepulse_privacy_requests'],
];

for (const [name, limit, input, table] of endpoints) {
  test(name, async t => {
    let handler;
    const writes = [];
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      writes.push({ url, body: JSON.parse(options.body) });
      return new Response(null, { status: 201 });
    });
    globalThis.Deno = {
      serve: callback => { handler = callback; },
      env: { get: key => ({ SUPABASE_URL: 'https://db.example.test', SUPABASE_SERVICE_ROLE_KEY: 'fake' })[key] },
    };
    t.after(() => { delete globalThis.Deno; });
    await import(`../supabase/functions/${name}/index.ts`);
    function submit(body, headers = {}) {
      return handler(new Request('https://api.example.test', {
        method: 'POST', headers: { origin, 'content-type': 'application/json', ...headers }, body, duplex: 'half',
      }));
    }

    assert.equal((await submit('{}', { origin: 'http://localhost:8000' })).status, 403);
    assert.equal((await submit('{}', { 'content-type': 'text/plain' })).status, 415);
    assert.equal((await submit('[]')).status, 400);
    assert.equal((await submit('{}')).status, 400);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(limit));
        controller.enqueue(new Uint8Array(1));
        controller.close();
      },
    });
    assert.equal((await submit(stream)).status, 413);
    if (name === growth) {
      assert.equal((await submit(JSON.stringify({ ...input, placement: 'fixture@example.test' }))).status, 400);
    }
    assert.equal(writes.length, 0);
    assert.equal((await submit(JSON.stringify(input))).status, 200);
    assert.equal(writes.length, 1);
    assert.equal(new URL(writes[0].url).pathname, '/rest/v1/' + table);
  });
}
