// My Library Books: the rules for due dates and late fees.

const FEE_PER_DAY = 0.25; // dollars
const FEE_CAP = 5.0; // never charge more than this per book
const DAY = 24 * 60 * 60 * 1000;

// Whole days from today until the due date. Negative means late.
function daysLeft(dueDate, today) {
  return Math.floor((new Date(dueDate) - new Date(today)) / DAY);
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
