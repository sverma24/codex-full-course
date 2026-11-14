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

// 25 cents for every day after the due date.
function lateFee(dueDate, today) {
  const daysLate = -daysLeft(dueDate, today);
  if (daysLate <= 0) return 0;
  return daysLate * FEE_PER_DAY;
}

// Soonest due first.
function sortByDue(books) {
  return books.slice().sort((a, b) => a.due > b.due);
}

if (typeof module !== 'undefined') {
  module.exports = { FEE_PER_DAY, FEE_CAP, daysLeft, isOverdue, lateFee, sortByDue };
}
