// My Library Books: the page.

const STORAGE_KEY = 'my-library-books';

const SAMPLE_BOOKS = [
  { title: 'Pride and Prejudice', author: 'Jane Austen', due: offset(9) },
  { title: 'Moby-Dick', author: 'Herman Melville', due: offset(-12) },
  { title: 'Frankenstein', author: 'Mary Shelley', due: offset(1) },
  { title: 'Walden', author: 'Henry David Thoreau', due: offset(-40) },
  { title: 'Little Women', author: 'Louisa May Alcott', due: offset(20) }
];

// a date n days from today, as YYYY-MM-DD
function offset(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function load() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : SAMPLE_BOOKS;
}

function save(books) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function statusText(book, now) {
  const left = daysLeft(book.due, now);
  if (left < 0) return 'Overdue by ' + -left + ' days';
  if (left === 0) return 'Due today';
  if (left === 1) return 'Due tomorrow';
  return 'Due in ' + left + ' days';
}

function render() {
  const now = new Date();
  const books = sortByDue(load());
  const list = document.getElementById('books');
  list.innerHTML = '';
  let total = 0;

  books.forEach((book) => {
    const fee = lateFee(book.due, now);
    total += fee;
    const li = document.createElement('li');
    li.className = isOverdue(book.due, now) ? 'book late' : 'book';
    li.innerHTML =
      '<div><strong>' + book.title + '</strong><span>' + book.author + '</span></div>' +
      '<div class="status">' + statusText(book, now) +
      (fee > 0 ? '<b>$' + fee.toFixed(2) + '</b>' : '') + '</div>' +
      '<button data-title="' + book.title + '">Returned</button>';
    list.appendChild(li);
  });

  document.getElementById('total').textContent = '$' + total.toFixed(2);
}

document.getElementById('add').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const books = load();
  books.push({ title: form.title.value, author: form.author.value, due: form.due.value });
  save(books);
  form.reset();
  render();
});

document.getElementById('books').addEventListener('click', (e) => {
  if (e.target.tagName !== 'BUTTON') return;
  save(load().filter((b) => b.title !== e.target.dataset.title));
  render();
});

render();
