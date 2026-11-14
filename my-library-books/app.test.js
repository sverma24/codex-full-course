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
    add: {
      after() {},
      addEventListener(event, handler) {
        this['on' + event] = handler;
      },
    },
  };
  const bannerMarkup = pageMarkup.match(/<section\b[^>]*\bid="due-soon"[^>]*>([\s\S]*?)<\/section>/i);
  if (bannerMarkup) {
    elements['due-soon'] = createElement('section');
    if (/<ul\b[^>]*\bid="due-soon-books"/i.test(bannerMarkup[1])) {
      elements['due-soon-books'] = createElement('ul');
      Object.defineProperty(elements['due-soon-books'], 'innerHTML', {
        set(value) {
          assert.equal(value, '');
          this.children.length = 0;
        },
      });
    }
  }
  const button = {
    addEventListener(event, handler) {
      this['on' + event] = handler;
    },
  };
  if (exportButton) elements[exportButton[1]] = button;
  const searchInput = pageMarkup.match(/<input\b[^>]*\bid=["']search["'][^>]*>/i);
  if (searchInput) elements.search = { value: '', addEventListener(event, handler) { this['on' + event] = handler; } };
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
    total: elements.total,
    overdueCount: elements['overdue-count'],
    banner: elements['due-soon'],
    bannerEntries: () => elements['due-soon-books'].children.map((entry) => entry.textContent),
    addBook({ title, author, due }) {
      const form = { title: { value: title }, author: { value: author }, due: { value: due }, reset() {} };
      elements.add.onsubmit({ target: form, preventDefault() {} });
    },
    search(value) {
      assert.ok(searchInput, 'the page has a search input');
      elements.search.value = value;
      elements.search.oninput();
    },
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
    overwriteSavedBooks(books) {
      storage.set('my-library-books', JSON.stringify(books));
    },
    renewalButton(row) {
      const button = row.children.find((child) => child.tagName === 'BUTTON' && child.textContent === 'Renewed');
      assert.ok(button, 'the row has a Renewed button');
      return button;
    },
    clickRenewed(row) {
      list.onclick({ target: this.renewalButton(row) });
    },
    clickReturned(row) {
      const button = row.children.find((child) => child.tagName === 'BUTTON');
      assert.equal(button?.textContent, 'Returned');
      list.onclick({ target: button });
    },
  };
}

test('Due soon lists today first, then the next three local calendar days', () => {
  const page = openPage([
    { title: 'Day three', due: '2026-11-17' },
    { title: '<b>Today</b>', due: '2026-11-14' },
    { title: 'Day four', due: '2026-11-18' },
    { title: 'Overdue', due: '2026-11-13' },
    { title: 'Tomorrow', due: '2026-11-15' },
    { title: 'Second today', due: '2026-11-14' },
    { title: 'Day two', due: '2026-11-16' },
    { title: 'Invalid', due: '' },
  ], [2026, 10, 14, 0, 5]);

  assert.ok(page.banner, 'the page has a Due soon section');
  assert.equal(page.banner.hidden, false);
  const entries = [
    '<b>Today</b> (Due today)',
    'Second today (Due today)',
    'Tomorrow (Due tomorrow)',
    'Day two (Due in 2 days)',
    'Day three (Due in 3 days)',
  ];
  assert.deepEqual(page.bannerEntries(), entries);
  page.search('day three');
  assert.equal(page.rows.length, 1);
  assert.deepEqual(page.bannerEntries(), entries);
});

test('Due soon appears after adding a qualifying book and hides after returning it', () => {
  const page = openPage([]);
  assert.ok(page.banner, 'the page has a Due soon section');
  assert.equal(page.banner.hidden, true);
  page.addBook({ title: 'Dracula', author: 'Bram Stoker', due: '2026-11-14' });
  assert.equal(page.banner.hidden, false);
  assert.deepEqual(page.bannerEntries(), ['Dracula (Due today)']);
  page.clickReturned(page.rows[0]);
  assert.equal(page.banner.hidden, true);
  assert.deepEqual(page.bannerEntries(), []);
});

test('Due soon updates when renewal moves a due date into or out of its window', () => {
  const page = openPage([
    { title: 'Overdue', due: '2026-10-25' },
    { title: 'Today', due: '2026-11-14' },
  ]);

  assert.deepEqual(page.bannerEntries(), ['Today (Due today)']);
  page.clickRenewed(page.rows[0]);
  assert.deepEqual(page.bannerEntries(), ['Today (Due today)', 'Overdue (Due tomorrow)']);
  page.clickRenewed(page.rows[0]);
  assert.deepEqual(page.bannerEntries(), ['Overdue (Due tomorrow)']);
});

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

test('search filters books by title or author as the query changes', () => {
  const page = openPage([
    { title: 'Pride and Prejudice', author: 'Jane Austen', due: '2026-11-15' },
    { title: 'Moby-Dick', author: 'Herman Melville', due: '2026-11-16' },
    { title: 'Emma', author: 'Jane Austen', due: '2026-11-17' },
  ]);

  page.search('moby');
  assert.equal(page.rows.length, 1);
  assert.ok(page.rows[0].innerHTML.includes('Moby-Dick'));

  page.search('aUsTeN');
  assert.equal(page.rows.length, 2);
  assert.ok(page.rows.every((row) => row.innerHTML.includes('Jane Austen')));
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

test('renewing one legacy copy twice persists its date and limit after reload', () => {
  const copy = { title: 'Dracula', author: 'Bram Stoker', due: '2026-12-20' };
  const page = openPage([copy, { ...copy }]);
  page.clickRenewed(page.rows[1]);

  const saved = page.savedBooks();
  assert.deepEqual(saved[0], copy);
  assert.equal(saved[1].due, '2027-01-10');
  const reopened = openPage(saved);
  assert.equal(reopened.renewalButton(reopened.rows[1]).disabled, false);
  reopened.clickRenewed(reopened.rows[1]);

  const reopenedAgain = openPage(reopened.savedBooks());
  assert.equal(reopenedAgain.savedBooks()[1].due, '2027-01-31');
  assert.equal(reopenedAgain.renewalButton(reopenedAgain.rows[1]).disabled, true);
  assert.match(reopenedAgain.rows[1].innerHTML, /renewal limit/i);
  reopenedAgain.clickRenewed(reopenedAgain.rows[1]);
  assert.deepEqual(reopenedAgain.savedBooks(), reopened.savedBooks());
});

test('renewing an overdue book refreshes order, fees, status, count and CSV', async () => {
  const late = { title: 'Late book', author: 'Author', due: '2026-11-13' };
  const today = { ...late, title: 'Today', due: '2026-11-14' };
  const page = openPage([late, today]);
  assert.equal(page.total.textContent, '$0.25');
  page.clickRenewed(page.rows[0]);
  assert.equal(page.overdueCount.textContent, '');
  assert.equal(page.total.textContent, '$0.00');
  assert.match(page.rows[0].innerHTML, /<strong>Today<\/strong>/);
  assert.match(page.rows[1].innerHTML, /Due in 20 days/);
  assert.match(await page.exportCsv(), /Late book,Author,2026-12-04,0\.00/);
});

test('invalid dates and dates that cannot be extended have disabled renewal controls', () => {
  const books = ['2026-02-30', '', '9999-12-31'].map((due) => ({ title: due, due }));
  const page = openPage(books);
  for (const row of page.rows.slice()) {
    assert.equal(page.renewalButton(row).disabled, true);
    page.clickRenewed(row);
  }
  assert.deepEqual(page.savedBooks(), books);
});

test('a stale renewal control refreshes the list without modifying saved books', () => {
  const original = { title: 'Original', due: '2026-11-15' };
  const replacement = { title: 'Replacement', due: '2026-11-16' };
  const page = openPage([original]);
  page.overwriteSavedBooks([replacement]);
  page.clickRenewed(page.rows[0]);
  assert.deepEqual(page.savedBooks(), [replacement]);
  assert.match(page.rows[0].innerHTML, /Replacement/);
});
