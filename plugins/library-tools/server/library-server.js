const { createInterface } = require('node:readline');
const { statusText, lateFee } = require('./books.js');

const protocolVersions = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const dateSchema = { type: 'string', format: 'date' };
const tool = {
  name: 'check_book',
  description: 'Check a book’s due status and late fee in dollars. Return date defaults to today in the server’s local time zone.',
  inputSchema: {
    type: 'object',
    properties: { dueDate: dateSchema, returnDate: dateSchema },
    required: ['dueDate'],
    additionalProperties: false
  }
};

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

function checkBook(args) {
  const { dueDate, returnDate } = args ?? {};
  if (!isDate(dueDate) || (returnDate !== undefined && !isDate(returnDate))) {
    return {
      isError: true,
      content: [{ type: 'text', text: 'Provide a valid dueDate and optional returnDate in YYYY-MM-DD format.' }]
    };
  }

  const date = returnDate ?? new Date();
  const result = { statusText: statusText({ due: dueDate }, date), lateFee: lateFee(dueDate, date) };
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
}

function respond(id, body) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, ...body }) + '\n');
}

function error(id, code, message) {
  respond(id, { error: { code, message } });
}

createInterface({ input: process.stdin, crlfDelay: Infinity }).on('line', (line) => {
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    return error(null, -32700, 'Parse error');
  }

  if (request?.jsonrpc !== '2.0' || typeof request.method !== 'string') {
    return error(null, -32600, 'Invalid request');
  }

  const { id, method, params } = request;
  if (id === undefined) return;

  switch (method) {
    case 'initialize':
      return respond(id, {
        result: {
          protocolVersion: protocolVersions.includes(params?.protocolVersion)
            ? params.protocolVersion : protocolVersions[0],
          capabilities: { tools: {} },
          serverInfo: { name: 'my-library-books', version: '1.0.0' }
        }
      });
    case 'ping':
      return respond(id, { result: {} });
    case 'tools/list':
      return respond(id, { result: { tools: [tool] } });
    case 'tools/call':
      if (params?.name !== tool.name) return error(id, -32602, 'Unknown tool');
      return respond(id, { result: checkBook(params.arguments) });
    default:
      return error(id, -32601, 'Method not found');
  }
});
