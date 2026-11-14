const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');
const { createContext, runInContext } = require('node:vm');

const rulesScript = readFileSync(require.resolve('./books.js'), 'utf8');
const pageMarkup = readFileSync(require.resolve('./index.html'), 'utf8');
const pageScript = readFileSync(require.resolve('./app.js'), 'utf8');

function createElement(tag) {
  return {
    tagName: tag.toUpperCase(),
    className: '',
    dataset: {},
    textContent: '',
    children: [],
    setAttribute() {},
    appendChild(child) {
      this.children.push(child);
    },
    get innerHTML() {
      const text = this.textContent.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      return text + this.children.map((child) => child.outerHTML).join('');
    },
    get outerHTML() {
      const classAttribute = this.className ? ' class="' + this.className + '"' : '';
      const indexAttribute = this.dataset.index === undefined ? '' : ' data-index="' + this.dataset.index + '"';
      return '<' + tag + classAttribute + indexAttribute + '>' + this.innerHTML + '</' + tag + '>';
    },
  };
}

function openPage(books, now = [2026, 10, 14, 15]) {
  const storage = new Map();
  if (books !== undefined) storage.set('my-library-books', JSON.stringify(books));
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
  const downloads = [];
  const blobs = new Map();
  const exportButton = pageMarkup.match(/<button\b[^>]*\bid=["']([^"']+)["'][^>]*>\s*Export CSV\s*<\/button>/i);
  const elements = {
    books: list,
    total: {},
    'overdue-count': {},
    add: { after() {}, addEventListener() {} },
  };
  const button = {
    addEventListener(event, handler) {
      this['on' + event] = handler;
    },
  };
  if (exportButton) elements[exportButton[1]] = button;
  const context = createContext({
    Blob,
    setTimeout(callback) { callback(); },
    URL: {
      createObjectURL(blob) {
        const url = 'blob:books-' + blobs.size;
        blobs.set(url, blob);
        return url;
      },
      revokeObjectURL(url) {
        blobs.delete(url);
      },
    },
    Date: class extends Date {
      constructor(...args) {
        super(...(args.length ? args : now));
      }
    },
    document: {
      getElementById: (id) => elements[id],
      createElement(tag) {
        if (tag !== 'a') return createElement(tag);
        return {
          click() {
            downloads.push({ filename: this.download, blob: blobs.get(this.href) });
          },
        };
      },
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
    overdueCount: elements['overdue-count'],
    async exportCsv() {
      assert.ok(exportButton, 'the page has an Export CSV button');
      button.onclick({ target: button, preventDefault() {} });
      assert.equal(downloads.length, 1);
      const [{ filename, blob }] = downloads.splice(0);
      assert.equal(filename, 'books.csv');
      assert.match(blob.type, /^text\/csv\b/i);
      return (await blob.text()).replaceAll('\r\n', '\n').trimEnd();
    },
    savedBooks: () => JSON.parse(storage.get('my-library-books')),
    clickReturned(row) {
      const button = row.children.find((child) => child.tagName === 'BUTTON');
      assert.equal(button?.textContent, 'Returned');
      list.onclick({ target: button });
    },
  };
}

test('shows the number of overdue books in the header', () => {
  const page = openPage([
    { title: 'Late one', author: 'Author', due: '2026-11-13' },
    { title: 'Late two', author: 'Author', due: '2026-11-01' },
    { title: 'Due today', author: 'Author', due: '2026-11-14' },
  ]);
  assert.equal(page.overdueCount.textContent, '2 overdue');
});

test('shows nothing in the header when no books are overdue', () => {
  const page = openPage([{ title: 'On time', author: 'Author', due: '2026-11-14' }]);
  assert.equal(page.overdueCount.textContent, '');
});

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

test('renders angle brackets in a book title as literal text', () => {
  const page = openPage([{ title: '<b>Bold</b>', author: 'Bram Stoker', due: '2026-11-15' }]);
  assert.ok(page.rows[0].innerHTML.includes('<strong>&lt;b&gt;Bold&lt;/b&gt;</strong>'));
});

test('Frankenstein is due tomorrow on first open just after midnight in India', () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'Asia/Kolkata';
  try {
    const page = openPage(undefined, [2026, 10, 14, 0, 5]);
    const row = page.rows.find((row) => row.children[0].children[0].textContent === 'Frankenstein');
    assert.equal(row?.children[1].textContent, 'Due tomorrow');
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

test('Export CSV downloads the current books with escaped fields and calculated fees', async () => {
  const overdue = { title: 'A "quoted", title', author: 'First\nLast', due: '2026-10-01' };
  const current = { title: 'Today', author: 'An Author', due: '2026-11-14' };
  const removed = { title: 'Returned Book', author: 'Another Author', due: '2026-11-13' };
  const page = openPage([overdue, removed, current]);
  const returnedRow = page.rows.find((row) => row.innerHTML.includes('Returned Book'));
  page.clickReturned(returnedRow);

  const csv = await page.exportCsv();
  const header = csv.slice(0, csv.indexOf('\n')).replaceAll('"', '').toLowerCase();
  assert.match(header, /^title,author,due[ _]date,late[ _]fee$/);
  assert.match(csv, /(?:^|\n)"A ""quoted"", title","First\nLast","?2026-10-01"?,"?\$?5\.00"?(?:\n|$)/);
  assert.match(csv, /(?:^|\n)"?Today"?,"?An Author"?,"?2026-11-14"?,"?\$?0\.00"?(?:\n|$)/);
  assert.doesNotMatch(csv, /Returned Book/);
  assert.deepEqual(page.savedBooks(), [overdue, current]);
});

test('Export CSV downloads a header for an empty list', async () => {
  const page = openPage([]);
  const csv = await page.exportCsv();
  assert.match(csv.replaceAll('"', '').toLowerCase(), /^title,author,due[ _]date,late[ _]fee$/);
});
