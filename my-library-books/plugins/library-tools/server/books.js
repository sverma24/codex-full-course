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

// Soonest due first, with invalid dates last in their original order.
function sortByDue(books) {
  return books.slice().sort((a, b) => {
    const first = dueSortKey(a.due);
    const second = dueSortKey(b.due);
    return first === second ? 0 : first - second;
  });
}

if (typeof module !== 'undefined') {
  module.exports = { FEE_PER_DAY, FEE_CAP, daysLeft, isOverdue, lateFee, statusText, sortByDue };
}
