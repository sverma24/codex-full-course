const config = require('../config');
const { DAY } = require('./dates');

// how much is owed for a late return, in cents
function calcFine(dueDate, returnedOn) {
  var due = new Date(dueDate);
  var returned = new Date(returnedOn);
  if (returned < due) return 0;
  var days = Math.floor((returned - due) / DAY) + 1;
  return days * config.FINE_PER_DAY;
}

function formatCents(cents) {
  return '$' + (cents / 100).toFixed(2);
}

function balanceFor(db, patronId) {
  var row = db.prepare(
    'SELECT COALESCE(SUM(amount_cents), 0) AS owed FROM fines WHERE patron_id = ? AND paid = 0'
  ).get(patronId);
  return row.owed;
}

module.exports = { calcFine, formatCents, balanceFor };
