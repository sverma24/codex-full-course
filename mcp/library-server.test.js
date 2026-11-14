const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { join } = require('node:path');
const { createInterface } = require('node:readline');
const test = require('node:test');

test('MCP client discovers check_book and checks dates over stdio', { timeout: 5000 }, async (t) => {
  const server = spawn(process.execPath, [join(__dirname, 'library-server.js')]);
  t.after(() => server.kill());
  const exited = once(server, 'close');
  const lines = createInterface({ input: server.stdout })[Symbol.asyncIterator]();
  let id = 0;

  function send(message) {
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n');
  }

  async function request(method, params) {
    send({ id: ++id, method, params });
    const reply = JSON.parse((await lines.next()).value);
    assert.equal(reply.jsonrpc, '2.0');
    assert.equal(reply.id, id);
    assert.equal(reply.error, undefined);
    return reply.result;
  }

  const protocolVersion = '2025-11-25';
  const initialized = await request('initialize', {
    protocolVersion,
    capabilities: {},
    clientInfo: { name: 'library-test', version: '1.0.0' }
  });
  assert.equal(initialized.protocolVersion, protocolVersion);
  assert.deepEqual(initialized.capabilities.tools, {});
  send({ method: 'notifications/initialized' });

  const { tools } = await request('tools/list');
  assert.deepEqual(tools.map(({ name }) => name), ['check_book']);
  assert.deepEqual(tools[0].inputSchema.required, ['dueDate']);

  async function check(args) {
    return request('tools/call', { name: 'check_book', arguments: args });
  }

  for (const [returnDate, statusText, lateFee] of [
    ['2026-11-14', 'Due tomorrow', 0],
    ['2026-11-15', 'Due today', 0],
    ['2026-11-16', 'Overdue by 1 day', 0.25],
    ['2026-12-25', 'Overdue by 40 days', 5]
  ]) {
    const result = await check({ dueDate: '2026-11-15', returnDate });
    assert.deepEqual(JSON.parse(result.content[0].text), { statusText, lateFee });
  }

  const current = await check({ dueDate: '2000-01-01' });
  assert.equal(JSON.parse(current.content[0].text).lateFee, 5);
  assert.equal((await check({ dueDate: '2026-02-30' })).isError, true);

  server.stdin.end();
  assert.deepEqual(await exited, [0, null]);
});
