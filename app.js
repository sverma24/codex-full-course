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
  return d.toISOString().slice(0, 10);
}

function load(saved = localStorage.getItem(STORAGE_KEY)) {
  return saved ? JSON.parse(saved) : SAMPLE_BOOKS;
}

function save(books) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function statusText(book, now) {
  const left = daysLeft(book.due, now);
  if (left < 0) return 'Overdue by ' + -left + (left === -1 ? ' day' : ' days');
  if (left === 0) return 'Due today';
  if (left === 1) return 'Due tomorrow';
  return 'Due in ' + left + ' days';
}

function returnBook(button, books, saved) {
  if (button.tagName !== 'BUTTON') return;

  const index = Number(button.dataset.index);
  if (!Number.isInteger(index) || index < 0 || index >= books.length) return;

  const current = localStorage.getItem(STORAGE_KEY);
  if (current === saved) {
    save(books.filter((_, position) => position !== index));
  }
  render();
}

function render() {
  const now = new Date();
  const saved = localStorage.getItem(STORAGE_KEY);
  const books = load(saved);
  const storageIndices = new Map(books.map((book, index) => [book, index]));
  const list = document.getElementById('books');
  list.innerHTML = '';
  list.onclick = (event) => returnBook(event.target, books, saved);
  let total = 0;

  sortByDue(books).forEach((book) => {
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
    returned.textContent = 'Returned';

    li.appendChild(details);
    li.appendChild(status);
    li.appendChild(returned);
    list.appendChild(li);
  });

  document.getElementById('total').textContent = '$' + total.toFixed(2);
}

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
