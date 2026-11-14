// study room bookings
const express = require('express');
const router = express.Router();
const config = require('../config');
const { getDb } = require('../db');
const { today, prettyDate, toMinutes } = require('../lib/dates');
const { esc, page, table } = require('../lib/render');

function validateBooking(db, b) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) return 'Pick a date.';
  if (!/^\d{2}:\d{2}$/.test(b.start_time || '') || !/^\d{2}:\d{2}$/.test(b.end_time || '')) return 'Pick a start and end time.';
  var start = toMinutes(b.start_time), end = toMinutes(b.end_time);
  if (end <= start) return 'The end time must be after the start time.';
  if (start % 30 !== 0 || end % 30 !== 0) return 'Bookings start and end on the hour or half hour.';
  if (start < toMinutes(config.ROOM_OPEN) || end > toMinutes(config.ROOM_CLOSE)) return 'Rooms are open 9am to 8pm.';
  if (end - start > config.ROOM_MAX_MINUTES) return 'You can book a room for up to 2 hours.';
  if (b.date < today()) return 'That date has passed.';

  var others = db.prepare('SELECT * FROM bookings WHERE room_id = ? AND date = ?').all(b.room_id, b.date);
  for (var i = 0; i < others.length; i++) {
    var o = others[i];
    var os = toMinutes(o.start_time), oe = toMinutes(o.end_time);
    // clash if the other booking starts inside ours
    if (os >= start && os < end) return 'That room is already booked from ' + o.start_time + ' to ' + o.end_time + '.';
  }
  return null;
}

function createBooking(db, card, b) {
  var p = db.prepare('SELECT * FROM patrons WHERE card_number = ?').get(String(card || '').trim());
  if (!p) return { error: 'We could not find that library card.' };
  var room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(b.room_id);
  if (!room) return { error: 'No such room.' };
  var problem = validateBooking(db, b);
  if (problem) return { error: problem };
  var info = db.prepare('INSERT INTO bookings (room_id, patron_id, date, start_time, end_time, purpose) VALUES (?, ?, ?, ?, ?, ?)')
    .run(room.id, p.id, b.date, b.start_time, b.end_time, b.purpose || '');
  return { ok: true, id: Number(info.lastInsertRowid) };
}

router.get('/rooms', function (req, res) {
  var db = getDb();
  var date = req.query.date || today();
  var rooms = db.prepare('SELECT * FROM rooms ORDER BY id').all();
  var bookings = db.prepare(`SELECT bk.*, r.name AS room FROM bookings bk JOIN rooms r ON r.id = bk.room_id
    WHERE bk.date = ? ORDER BY r.id, bk.start_time`).all(date);
  var rows = bookings.map(b => [esc(b.room), esc(b.start_time) + '&ndash;' + esc(b.end_time), esc(b.purpose)]);
  var options = rooms.map(r => `<option value="${r.id}">${esc(r.name)} (seats ${r.capacity})</option>`).join('');
  var body = `
<h1>Study rooms</h1>
<form method="get" action="/rooms" class="search">
  <input type="date" name="date" value="${esc(date)}"><button>Show</button>
</form>
<h2>Booked on ${prettyDate(date)}</h2>
${bookings.length ? table(['Room', 'Time', 'Purpose'], rows) : '<p>Nothing booked yet.</p>'}
<h2>Book a room</h2>
<form method="post" action="/rooms" class="card">
  <label>Library card number <input name="card" required></label>
  <label>Room <select name="room_id">${options}</select></label>
  <label>Date <input type="date" name="date" value="${esc(date)}" required></label>
  <label>From <input type="time" name="start_time" step="1800" required></label>
  <label>To <input type="time" name="end_time" step="1800" required></label>
  <label>Purpose <input name="purpose" placeholder="Study group, tutoring..."></label>
  <button>Book</button>
</form>`;
  res.send(page('Study rooms', body, { flash: req.query.msg }));
});

router.post('/rooms', function (req, res) {
  var r = createBooking(getDb(), req.body.card, req.body);
  var msg = r.error || 'Booked. See you then!';
  res.redirect('/rooms?date=' + encodeURIComponent(req.body.date || '') + '&msg=' + encodeURIComponent(msg));
});

router.post('/api/bookings', function (req, res) {
  var r = createBooking(getDb(), req.body.card, req.body);
  res.status(r.error ? 400 : 201).json(r);
});

module.exports = router;
module.exports.validateBooking = validateBooking;
module.exports.createBooking = createBooking;
