// My Library Books: the page.

const STORAGE_KEY = 'my-library-books';

const SAMPLE_BOOKS = [
  { title: 'Pride and Prejudice', author: 'Jane Austen', due: offset(9) },
  { title: 'Moby-Dick', author: 'Herman Melville', due: offset(-12) },
  { title: 'Frankenstein', author: 'Mary Shelley', due: offset(1) },
  { title: 'Walden', author: 'Henry David Thoreau', due: offset(-40) },
  { title: 'Little Women', author: 'Louisa May Alcott', due: offset(20) },
  { title: 'The Call of the Wild', author: 'Jack London', due: '2026-11-28' },
  { title: 'Heidi', author: 'Johanna Spyri', due: '2026-12-03' },
  { title: 'Around the World in Eighty Days', author: 'Jules Verne', due: '2026-11-22' },
  { title: 'The Secret Garden', author: 'Frances Hodgson Burnett', due: '2026-12-10' }
];

// a date n days from today, as YYYY-MM-DD
function offset(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const year = String(d.getFullYear()).padStart(4, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function load(saved = localStorage.getItem(STORAGE_KEY)) {
  return saved ? JSON.parse(saved) : SAMPLE_BOOKS;
}

function save(books) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function csvField(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
}

function exportBooks() {
  const now = new Date();
  const rows = ['title,author,due_date,late_fee'];
  for (const book of sortByDue(load())) {
    const fee = lateFee(book.due, now);
    const amount = Number.isFinite(fee) ? fee.toFixed(2) : '';
    rows.push([book.title, book.author, book.due, amount].map(csvField).join(','));
  }

  const csv = new Blob([rows.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(csv);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'books.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function handleBookAction(button, books, saved) {
  if (button.tagName !== 'BUTTON' || button.disabled) return;

  const index = Number(button.dataset.index);
  if (!Number.isInteger(index) || index < 0 || index >= books.length) return;

  if (localStorage.getItem(STORAGE_KEY) !== saved) {
    render();
    return;
  }

  if (button.dataset.action === 'renew') {
    const renewal = renewalDetails(books[index]);
    if (renewal.reason) return;
    save(books.map((book, position) => position === index ? { ...book, ...renewal } : book));
  } else if (button.dataset.action === 'return') {
    save(books.filter((_, position) => position !== index));
  }
  render();
}

function renderDueSoon(books, now) {
  const banner = document.getElementById('due-soon');
  const list = document.getElementById('due-soon-books');
  const upcoming = dueSoonBooks(books, now);
  list.innerHTML = '';
  for (const book of upcoming) {
    const entry = document.createElement('li');
    entry.textContent = String(book.title) + ' (' + statusText(book, now) + ')';
    list.appendChild(entry);
  }
  banner.hidden = upcoming.length === 0;
}

function render() {
  const now = new Date();
  const saved = localStorage.getItem(STORAGE_KEY);
  const books = load(saved);
  renderDueSoon(books, now);
  const query = document.getElementById('search').value.trim().toLocaleLowerCase();
  const storageIndices = new Map(books.map((book, index) => [book, index]));
  const list = document.getElementById('books');
  const overdueCount = books.filter((book) => isOverdue(book.due, now)).length;
  document.getElementById('overdue-count').textContent = overdueCount ? overdueCount + ' overdue' : '';
  list.innerHTML = '';
  list.onclick = (event) => handleBookAction(event.target, books, saved);
  let total = 0;

  sortByDue(books).filter((book) =>
    String(book.title).toLocaleLowerCase().includes(query) || String(book.author).toLocaleLowerCase().includes(query)
  ).forEach((book) => {
    const fee = lateFee(book.due, now);
    total += fee;
    const li = document.createElement('li');
    li.className = isOverdue(book.due, now) ? 'book late' : 'book';
    const details = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = String(book.title);
    const author = document.createElement('span');
    author.textContent = String(book.author);
    details.appendChild(title);
    details.appendChild(author);

    const status = document.createElement('div');
    status.className = 'status';
    status.textContent = statusText(book, now);
    if (fee > 0) {
      const amount = document.createElement('b');
      amount.textContent = '$' + fee.toFixed(2);
      status.appendChild(amount);
    }

    const returned = document.createElement('button');
    returned.dataset.index = String(storageIndices.get(book));
    returned.dataset.action = 'return';
    returned.textContent = 'Returned';

    const renewed = document.createElement('button');
    renewed.dataset.index = returned.dataset.index;
    renewed.dataset.action = 'renew';
    renewed.textContent = 'Renewed';
    const renewal = renewalDetails(book);
    renewed.disabled = Boolean(renewal.reason);

    li.appendChild(details);
    li.appendChild(status);
    li.appendChild(returned);
    li.appendChild(renewed);
    if (renewal.reason) {
      const reason = document.createElement('span');
      reason.className = 'renewal-reason';
      reason.textContent = renewal.reason;
      li.appendChild(reason);
    }
    list.appendChild(li);
  });

  const totalAmount = document.getElementById('total');
  totalAmount.textContent = '$' + total.toFixed(2);
  totalAmount.className = total > 0 ? 'owed' : '';
}

document.getElementById('export').addEventListener('click', exportBooks);
document.getElementById('search').addEventListener('input', render);

const addForm = document.getElementById('add');
const addMessage = document.createElement('div');
addMessage.setAttribute('role', 'status');
addForm.after(addMessage);

addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  if (!form.title.value.trim() || !form.due.value) {
    addMessage.textContent = 'Please add a title and a due date.';
    return;
  }

  addMessage.textContent = '';
  const books = load();
  books.push({ title: form.title.value, author: form.author.value, due: form.due.value });
  save(books);
  form.reset();
  render();
});

render();
