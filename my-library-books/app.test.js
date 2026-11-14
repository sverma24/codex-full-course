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
    addEventListener(type, listener) {
      assert.equal(type, 'click');
      this.click = listener;
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
      const button = row.innerHTML.match(/<button data-title="([^"]+)">Returned<\/button>/);
      assert.ok(button, 'row has a Returned button');
      list.click({ target: { tagName: 'BUTTON', dataset: { title: button[1] } } });
    },
  };
}

const statuses = [
  ['one day late (current plural wording)', '2026-11-13', 'Overdue by 1 days', '<b>$0.25</b>'],
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

test('clicking Returned removes both books with the same title', () => {
  const first = { title: 'Collected Poems', author: 'First Author', due: '2026-11-14' };
  const second = { title: 'Collected Poems', author: 'Second Author', due: '2026-11-15' };
  const other = { title: 'Walden', author: 'Henry David Thoreau', due: '2026-11-19' };
  const page = openPage([first, second, other]);

  assert.equal(page.rows.length, 3);
  const clickedRow = page.rows.find((row) => row.innerHTML.includes('<span>Second Author</span>'));
  assert.ok(clickedRow);
  page.clickReturned(clickedRow);

  assert.deepEqual(page.savedBooks(), [other]);
  assert.equal(page.rows.length, 1);
  assert.ok(page.rows[0].innerHTML.includes('<strong>Walden</strong>'));
});
