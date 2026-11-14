const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');
const { createContext, runInContext } = require('node:vm');

const rulesScript = readFileSync(require.resolve('./books.js'), 'utf8');
const pageScript = readFileSync(require.resolve('./app.js'), 'utf8');

function openPage(books) {
  const storage = new Map([['my-library-books', JSON.stringify(books)]]);
  const rows = [];
  const list = {
    set innerHTML(value) {
      assert.equal(value, '');
      rows.length = 0;
    },
    appendChild(row) {
      rows.push(row);
    },
  };
  const elements = {
    books: list,
    total: {},
    add: { after() {}, addEventListener() {} },
  };
  const context = createContext({
    Date: class extends Date {
      constructor(...args) {
        super(...(args.length ? args : [2026, 10, 14, 15]));
      }
    },
    document: {
      getElementById: (id) => elements[id],
      createElement: () => ({ setAttribute() {} }),
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
  });

  runInContext(rulesScript, context, { filename: 'books.js' });
  runInContext(pageScript, context, { filename: 'app.js' });

  return {
    rows,
    savedBooks: () => JSON.parse(storage.get('my-library-books')),
    clickReturned(row) {
      const button = row.innerHTML.match(/<button data-index="([0-9]+)">Returned<\/button>/);
      assert.ok(button, 'row has a Returned button');
      list.onclick({ target: { tagName: 'BUTTON', dataset: { index: button[1] } } });
    },
  };
}

const statuses = [
  ['one day late', '2026-11-13', 'Overdue by 1 day', '<b>$0.25</b>'],
  ['due today', '2026-11-14', 'Due today', ''],
  ['due tomorrow', '2026-11-15', 'Due tomorrow', ''],
  ['due later', '2026-11-19', 'Due in 5 days', ''],
];

for (const [label, due, status, feeMarkup] of statuses) {
  test('renders status for a book ' + label, () => {
    const page = openPage([{ title: 'Walden', author: 'Henry David Thoreau', due }]);
    const renderedStatus = page.rows[0].innerHTML.match(/<div class="status">(.*?)<\/div>/);
    assert.equal(renderedStatus?.[1], status + feeMarkup);
  });
}

test('clicking Returned removes only the selected copy from legacy saved books', () => {
  const first = { title: 'Dracula', author: 'Bram Stoker', due: '2026-11-15' };
  const second = { ...first, due: '2026-11-14' };
  const other = { title: 'Walden', author: 'Henry David Thoreau', due: '2026-11-19' };
  const page = openPage([first, second, other]);

  assert.equal(page.rows.length, 3);
  assert.ok(page.rows[0].innerHTML.includes('Due today'));
  page.clickReturned(page.rows[0]);

  assert.deepEqual(page.savedBooks(), [first, other]);
  assert.equal(page.rows.length, 2);
  assert.ok(page.rows[0].innerHTML.includes('<strong>Dracula</strong>'));
  assert.ok(page.rows[0].innerHTML.includes('Due tomorrow'));
  assert.ok(page.rows[1].innerHTML.includes('<strong>Walden</strong>'));

  const reopened = openPage(page.savedBooks());
  reopened.clickReturned(reopened.rows[0]);
  assert.deepEqual(reopened.savedBooks(), [other]);
});
