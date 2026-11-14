// My Library Books: the rules for due dates and late fees.

const FEE_PER_DAY = 0.25; // dollars
const FEE_CAP = 5.0; // never charge more than this per book
const DAY = 24 * 60 * 60 * 1000;

// Use UTC midnight to count calendar days without daylight-saving shifts.
function calendarDay(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return Date.parse(value);
  }

  const local = new Date(value);
  const midnight = new Date(0);
  return midnight.setUTCFullYear(local.getFullYear(), local.getMonth(), local.getDate());
}

// Calendar days from today until the due date. Negative means late.
function daysLeft(dueDate, today) {
  return (calendarDay(dueDate) - calendarDay(today)) / DAY;
}

function isOverdue(dueDate, today) {
  return daysLeft(dueDate, today) < 0;
}

// 25 cents for every day after the due date, up to the fee cap.
function lateFee(dueDate, today) {
  const daysLate = -daysLeft(dueDate, today);
  if (daysLate <= 0) return 0;
  return Math.min(daysLate * FEE_PER_DAY, FEE_CAP);
}

function statusText(book, now) {
  const left = daysLeft(book.due, now);
  if (left < 0) return 'Overdue by ' + -left + (left === -1 ? ' day' : ' days');
  if (left === 0) return 'Due today';
  if (left === 1) return 'Due tomorrow';
  return 'Due in ' + left + ' days';
}

function dueSortKey(due) {
  if (typeof due !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(due)) return Infinity;

  const day = calendarDay(due);
  if (!Number.isFinite(day) || new Date(day).toISOString().slice(0, 10) !== due) {
    return Infinity;
  }
  return day;
}

function renewalDetails(book) {
  const renewalCount = book.renewalCount ?? 0;
  if (renewalCount >= 2) return { reason: 'Renewal limit reached.' };

  const day = dueSortKey(book.due);
  if (day === Infinity) return { reason: 'A valid due date is required.' };

  const extended = new Date(day + 21 * DAY).toISOString();
  if (!/^\d{4}-/.test(extended)) return { reason: 'The new due date is out of range.' };

  return { due: extended.slice(0, 10), renewalCount: renewalCount + 1 };
}

// Soonest due first, with invalid dates last in their original order.
function sortByDue(books) {
  return books.slice().sort((a, b) => {
    const first = dueSortKey(a.due);
    const second = dueSortKey(b.due);
    return first === second ? 0 : first - second;
  });
}

function dueSoonBooks(books, now) {
  const today = calendarDay(now);
  return sortByDue(books).filter((book) => {
    const left = (dueSortKey(book.due) - today) / DAY;
    return left >= 0 && left <= 3;
  });
}

if (typeof module !== 'undefined') {
  module.exports = { FEE_PER_DAY, FEE_CAP, daysLeft, isOverdue, lateFee, statusText, sortByDue, dueSoonBooks, renewalDetails };
}
