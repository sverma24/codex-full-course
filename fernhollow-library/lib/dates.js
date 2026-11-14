// date helpers. dates are stored as 'YYYY-MM-DD' strings

const DAY = 24 * 60 * 60 * 1000;

function today() {
  var d = new Date();
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  var d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// used on patron pages. library is in Vermont so show Eastern time
function prettyDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });
}

function toMinutes(hhmm) {
  var parts = hhmm.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

module.exports = { DAY, today, addDays, prettyDate, toMinutes };
