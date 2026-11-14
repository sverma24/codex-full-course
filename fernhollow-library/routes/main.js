// catalog, holds, loans, fines, desk
// NOTE: most of the library runs through this file. be careful.

const express = require('express');
const router = express.Router();
const config = require('../config');
const { getDb } = require('../db');
const { today, addDays, prettyDate, DAY } = require('../lib/dates');
const { calcFine, formatCents, balanceFor } = require('../lib/fines');
const { esc, page, table } = require('../lib/render');

function isAdmin(req) {
  return req.cookies_parsed && req.cookies_parsed.fh_desk === config.SESSION_SECRET;
}

function findPatron(db, card) {
  return db.prepare('SELECT * FROM patrons WHERE card_number = ?').get(String(card || '').trim());
}

// ---------------------------------------------------------------- catalog

function searchBooks(db, q) {
  if (!q) {
    return db.prepare('SELECT * FROM books ORDER BY title LIMIT 50').all();
  }
  // search title or author
  var sql = "SELECT * FROM books WHERE title LIKE '%" + q + "%' OR author LIKE '%" + q + "%' ORDER BY title LIMIT 50";
  return db.prepare(sql).all();
}

function availability(db, bookId) {
  var copies = db.prepare('SELECT status, COUNT(*) AS n FROM copies WHERE book_id = ? GROUP BY status').all(bookId);
  var out = { available: 0, total: 0 };
  copies.forEach(function (c) {
    out.total += c.n;
    if (c.status === 'available') out.available += c.n;
  });
  out.waiting = db.prepare("SELECT COUNT(*) AS n FROM holds WHERE book_id = ? AND status = 'waiting'").get(bookId).n;
  return out;
}

router.get('/', function (req, res) {
  var db = getDb();
  var q = req.query.q || '';
  var books = searchBooks(db, q);
  var rows = books.map(function (b) {
    var a = availability(db, b.id);
    var avail = a.available > 0
      ? `<span class="ok">${a.available} of ${a.total} on shelf</span>`
      : `<span class="no">All ${a.total} out</span>` + (a.waiting ? ` &middot; ${a.waiting} waiting` : '');
    return [`<a href="/books/${b.id}">${esc(b.title)}</a>`, esc(b.author), esc(b.year), avail];
  });
  var body = `
<h1>Catalog</h1>
<form class="search" action="/" method="get">
  <input name="q" value="${esc(q)}" placeholder="Search by title or author">
  <button>Search</button>
</form>
${books.length ? table(['Title', 'Author', 'Year', 'Availability'], rows) : '<p>No books matched.</p>'}`;
  res.send(page('Catalog', body, { admin: isAdmin(req) }));
});

router.get('/api/books', function (req, res) {
  var db = getDb();
  var books = searchBooks(db, req.query.q || '');
  res.json(books.map(function (b) { return Object.assign({}, b, availability(db, b.id)); }));
});

router.get('/books/:id', function (req, res) {
  var db = getDb();
  var b = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!b) return res.status(404).send(page('Not found', '<h1>Book not found</h1>'));
  var a = availability(db, b.id);
  var copies = db.prepare('SELECT * FROM copies WHERE book_id = ? ORDER BY barcode').all(b.id);
  var copyRows = copies.map(c => [esc(c.barcode), esc(c.status.replace(/_/g, ' '))]);
  var body = `
<h1>${esc(b.title)}</h1>
<p class="byline">${esc(b.author)} &middot; ${esc(b.year)} &middot; ${esc(b.genre)} &middot; ISBN ${esc(b.isbn)}</p>
<p>${a.available} of ${a.total} copies on the shelf. ${a.waiting} ${a.waiting === 1 ? 'person is' : 'people are'} waiting.</p>
${table(['Barcode', 'Status'], copyRows)}
<h2>Place a hold</h2>
<form method="post" action="/holds">
  <input type="hidden" name="book_id" value="${b.id}">
  <label>Library card number <input name="card" required></label>
  <button>Place hold</button>
</form>`;
  res.send(page(b.title, body, { flash: req.query.msg, admin: isAdmin(req) }));
});

// ---------------------------------------------------------------- holds

function placeHold(db, bookId, card) {
  var patron = findPatron(db, card);
  if (!patron) return { error: 'We could not find that library card.' };
  var existing = db.prepare("SELECT * FROM holds WHERE book_id = ? AND patron_id = ? AND status IN ('waiting','ready')").get(bookId, patron.id);
  if (existing) return { error: 'You already have a hold on this book.' };
  var last = db.prepare("SELECT MAX(position) AS p FROM holds WHERE book_id = ? AND status = 'waiting'").get(bookId);
  var position = (last.p || 0) + 1;
  var info = db.prepare('INSERT INTO holds (book_id, patron_id, placed_on, position, status) VALUES (?, ?, ?, ?, ?)')
    .run(bookId, patron.id, today(), position, 'waiting');
  return { id: Number(info.lastInsertRowid), position: position };
}

function cancelHold(db, holdId) {
  var hold = db.prepare('SELECT * FROM holds WHERE id = ?').get(holdId);
  if (!hold) return { error: 'No such hold.' };
  if (hold.status === 'ready' && hold.copy_id) {
    // give the copy to the next person, or put it back
    db.prepare("UPDATE copies SET status = 'available' WHERE id = ?").run(hold.copy_id);
  }
  db.prepare("UPDATE holds SET status = 'cancelled', position = 0 WHERE id = ?").run(holdId);
  return { ok: true };
}

// called when a copy comes back. returns the hold that got filled, if any
function fillNextHold(db, copy) {
  var next = db.prepare("SELECT * FROM holds WHERE book_id = ? AND status = 'waiting' ORDER BY placed_on LIMIT 1").get(copy.book_id);
  if (!next) return null;
  db.prepare("UPDATE holds SET status = 'ready', ready_on = ?, copy_id = ?, position = 0 WHERE id = ?").run(today(), copy.id, next.id);
  db.prepare("UPDATE holds SET position = position - 1 WHERE book_id = ? AND status = 'waiting'").run(copy.book_id);
  db.prepare("UPDATE copies SET status = 'on_hold_shelf' WHERE id = ?").run(copy.id);
  return next;
}

router.post('/holds', function (req, res) {
  var db = getDb();
  var result = placeHold(db, req.body.book_id, req.body.card);
  var msg = result.error ? result.error : `Hold placed. You are number ${result.position} in line.`;
  res.redirect(`/books/${encodeURIComponent(req.body.book_id)}?msg=${encodeURIComponent(msg)}`);
});

router.post('/api/holds', function (req, res) {
  var db = getDb();
  var result = placeHold(db, req.body.book_id, req.body.card);
  if (result.error) return res.status(400).json(result);
  res.status(201).json(result);
});

router.post('/holds/:id/cancel', function (req, res) {
  var db = getDb();
  var hold = db.prepare('SELECT h.*, p.card_number FROM holds h JOIN patrons p ON p.id = h.patron_id WHERE h.id = ?').get(req.params.id);
  var result = cancelHold(db, req.params.id);
  var msg = result.error || 'Hold cancelled.';
  res.redirect('/patron?card=' + encodeURIComponent(hold ? hold.card_number : '') + '&msg=' + encodeURIComponent(msg));
});

// ---------------------------------------------------------------- patron account

router.get('/patron', function (req, res) {
  var db = getDb();
  var card = req.query.card;
  if (!card) {
    var form = `
<h1>My account</h1>
<form method="get" action="/patron">
  <label>Library card number <input name="card" required></label>
  <button>Look up</button>
</form>`;
    return res.send(page('My account', form));
  }
  var p = findPatron(db, card);
  if (!p) return res.send(page('My account', '<h1>My account</h1><p>We could not find that library card.</p>'));

  var loans = db.prepare(`SELECT l.*, b.title, c.barcode FROM loans l
    JOIN copies c ON c.id = l.copy_id JOIN books b ON b.id = c.book_id
    WHERE l.patron_id = ? AND l.returned_on IS NULL ORDER BY l.due_date`).all(p.id);
  var holds = db.prepare(`SELECT h.*, b.title FROM holds h JOIN books b ON b.id = h.book_id
    WHERE h.patron_id = ? AND h.status IN ('waiting','ready') ORDER BY h.placed_on`).all(p.id);
  var fines = db.prepare('SELECT * FROM fines WHERE patron_id = ? AND paid = 0 ORDER BY created_on').all(p.id);
  var owed = balanceFor(db, p.id);

  var loanRows = loans.map(function (l) {
    var late = l.due_date < today();
    return [esc(l.title), esc(l.barcode), `<span class="${late ? 'no' : ''}">${prettyDate(l.due_date)}${late ? ' (overdue)' : ''}</span>`, String(l.renewals)];
  });
  var holdRows = holds.map(function (h) {
    var where = h.status === 'ready'
      ? `<span class="ok">Ready! Pick up by ${prettyDate(addDays(h.ready_on, config.HOLD_PICKUP_DAYS))}</span>`
      : `Number ${h.position} in line`;
    return [esc(h.title), where, `<form method="post" action="/holds/${h.id}/cancel"><button class="small">Cancel</button></form>`];
  });
  var fineRows = fines.map(f => [prettyDate(f.created_on), esc(f.reason), formatCents(f.amount_cents)]);

  var body = `
<h1>Hello, ${esc(p.name.split(' ')[0])}</h1>
<p>Card ${esc(p.card_number)} &middot; member since ${prettyDate(p.joined)}</p>
<h2>Checked out (${loans.length})</h2>
${loans.length ? table(['Title', 'Barcode', 'Due', 'Renewals'], loanRows) : '<p>Nothing checked out.</p>'}
<h2>Holds (${holds.length})</h2>
${holds.length ? table(['Title', 'Status', ''], holdRows) : '<p>No holds.</p>'}
<h2>Fines</h2>
${fines.length ? table(['Date', 'Reason', 'Amount'], fineRows) : ''}
<p class="${owed >= config.BLOCK_AT ? 'no' : ''}">You owe ${formatCents(owed)}.${owed >= config.BLOCK_AT ? ' Please pay at the desk before checking out more items.' : ''}</p>`;
  res.send(page('My account', body, { flash: req.query.msg }));
});

// ---------------------------------------------------------------- desk (staff)

router.get('/admin', function (req, res) {
  if (!isAdmin(req)) {
    var login = `
<h1>Desk login</h1>
<form method="post" action="/admin/login">
  <label>Staff password <input type="password" name="password"></label>
  <button>Log in</button>
</form>`;
    return res.send(page('Desk', login, { flash: req.query.msg }));
  }
  var db = getDb();
  var overdue = db.prepare(`SELECT l.*, b.title, c.barcode, p.name, p.card_number, p.phone FROM loans l
    JOIN copies c ON c.id = l.copy_id JOIN books b ON b.id = c.book_id JOIN patrons p ON p.id = l.patron_id
    WHERE l.returned_on IS NULL AND l.due_date < ? ORDER BY l.due_date`).all(today());
  var rows = overdue.map(function (l) {
    var owedSoFar = calcFine(l.due_date, today());
    return [esc(l.title), esc(l.barcode), esc(l.name) + ' (' + esc(l.card_number) + ')', esc(l.phone), prettyDate(l.due_date), formatCents(owedSoFar)];
  });
  var shelf = db.prepare(`SELECT h.*, b.title, p.name, c.barcode FROM holds h JOIN books b ON b.id = h.book_id
    JOIN patrons p ON p.id = h.patron_id LEFT JOIN copies c ON c.id = h.copy_id WHERE h.status = 'ready' ORDER BY h.ready_on`).all();
  var shelfRows = shelf.map(h => [esc(h.title), esc(h.barcode), esc(h.name), prettyDate(addDays(h.ready_on, config.HOLD_PICKUP_DAYS))]);
  var body = `
<h1>Circulation desk</h1>
<div class="cols">
<form method="post" action="/admin/checkout" class="card">
  <h2>Check out</h2>
  <label>Card number <input name="card" required></label>
  <label>Copy barcode <input name="barcode" required></label>
  <button>Check out</button>
</form>
<form method="post" action="/admin/return" class="card">
  <h2>Return</h2>
  <label>Copy barcode <input name="barcode" required></label>
  <button>Return</button>
</form>
<form method="post" action="/admin/renew" class="card">
  <h2>Renew</h2>
  <label>Copy barcode <input name="barcode" required></label>
  <button>Renew</button>
</form>
<form method="post" action="/admin/pay" class="card">
  <h2>Take payment</h2>
  <label>Card number <input name="card" required></label>
  <button>Mark all fines paid</button>
</form>
</div>
<h2>Overdue (${overdue.length})</h2>
${overdue.length ? table(['Title', 'Barcode', 'Patron', 'Phone', 'Was due', 'Fine so far'], rows) : '<p>Nothing overdue.</p>'}
<h2>Hold shelf (${shelf.length})</h2>
${shelf.length ? table(['Title', 'Barcode', 'For', 'Pick up by'], shelfRows) : '<p>Hold shelf is empty.</p>'}`;
  res.send(page('Desk', body, { flash: req.query.msg, admin: true }));
});

router.post('/admin/login', function (req, res) {
  if (req.body.password === config.ADMIN_PASSWORD) {
    res.setHeader('Set-Cookie', 'fh_desk=' + config.SESSION_SECRET + '; Path=/; HttpOnly');
    return res.redirect('/admin');
  }
  res.redirect('/admin?msg=' + encodeURIComponent('Wrong password.'));
});

function checkout(db, card, barcode) {
  var p = findPatron(db, card);
  if (!p) return { error: 'Unknown card.' };
  var copy = db.prepare('SELECT * FROM copies WHERE barcode = ?').get(String(barcode).trim());
  if (!copy) return { error: 'Unknown barcode.' };
  if (balanceFor(db, p.id) >= config.BLOCK_AT) return { error: 'Patron owes ' + formatCents(balanceFor(db, p.id)) + '. Take payment first.' };
  var count = db.prepare('SELECT COUNT(*) AS n FROM loans WHERE patron_id = ? AND returned_on IS NULL').get(p.id).n;
  if (count >= config.MAX_LOANS) return { error: 'Patron already has ' + count + ' items out.' };

  if (copy.status === 'on_hold_shelf') {
    var hold = db.prepare("SELECT * FROM holds WHERE copy_id = ? AND status = 'ready'").get(copy.id);
    if (hold && hold.patron_id !== p.id) return { error: 'That copy is on the hold shelf for someone else.' };
    if (hold) db.prepare("UPDATE holds SET status = 'collected' WHERE id = ?").run(hold.id);
  } else if (copy.status !== 'available') {
    return { error: 'That copy is ' + copy.status.replace(/_/g, ' ') + '.' };
  }
  var due = addDays(today(), config.LOAN_DAYS);
  db.prepare('INSERT INTO loans (copy_id, patron_id, checked_out, due_date) VALUES (?, ?, ?, ?)').run(copy.id, p.id, today(), due);
  db.prepare("UPDATE copies SET status = 'on_loan' WHERE id = ?").run(copy.id);
  return { ok: true, due: due };
}

function returnCopy(db, barcode, returnedOn) {
  returnedOn = returnedOn || today();
  var copy = db.prepare('SELECT * FROM copies WHERE barcode = ?').get(String(barcode).trim());
  if (!copy) return { error: 'Unknown barcode.' };
  var loan = db.prepare('SELECT * FROM loans WHERE copy_id = ? AND returned_on IS NULL').get(copy.id);
  if (!loan) return { error: 'That copy is not checked out.' };
  db.prepare('UPDATE loans SET returned_on = ? WHERE id = ?').run(returnedOn, loan.id);
  var fine = calcFine(loan.due_date, returnedOn);
  if (fine > 0) {
    db.prepare('INSERT INTO fines (patron_id, loan_id, amount_cents, reason, created_on) VALUES (?, ?, ?, ?, ?)')
      .run(loan.patron_id, loan.id, fine, 'Late return: ' + barcode, returnedOn);
  }
  db.prepare("UPDATE copies SET status = 'available' WHERE id = ?").run(copy.id);
  var filled = fillNextHold(db, copy);
  return { ok: true, fine: fine, holdFilled: !!filled };
}

// renewing a late item charges what's owed so far, then extends
function renew(db, barcode) {
  var copy = db.prepare('SELECT * FROM copies WHERE barcode = ?').get(String(barcode).trim());
  if (!copy) return { error: 'Unknown barcode.' };
  var loan = db.prepare('SELECT * FROM loans WHERE copy_id = ? AND returned_on IS NULL').get(copy.id);
  if (!loan) return { error: 'That copy is not checked out.' };
  if (loan.renewals >= 2) return { error: 'Already renewed twice.' };
  var waiting = db.prepare("SELECT COUNT(*) AS n FROM holds WHERE book_id = ? AND status = 'waiting'").get(copy.book_id).n;
  if (waiting > 0) return { error: 'Someone is waiting for this book, so it cannot be renewed.' };
  var t = today();
  var fine = 0;
  if (loan.due_date < t) {
    var daysLate = Math.round((new Date(t) - new Date(loan.due_date)) / DAY);
    fine = Math.min(daysLate * config.FINE_PER_DAY, config.FINE_CAP);
    db.prepare('INSERT INTO fines (patron_id, loan_id, amount_cents, reason, created_on) VALUES (?, ?, ?, ?, ?)')
      .run(loan.patron_id, loan.id, fine, 'Late (renewed): ' + barcode, t);
  }
  var newDue = addDays(t, config.LOAN_DAYS);
  db.prepare('UPDATE loans SET due_date = ?, renewals = renewals + 1 WHERE id = ?').run(newDue, loan.id);
  return { ok: true, due: newDue, fine: fine };
}

router.post('/admin/checkout', function (req, res) {
  if (!isAdmin(req)) return res.redirect('/admin');
  var r = checkout(getDb(), req.body.card, req.body.barcode);
  res.redirect('/admin?msg=' + encodeURIComponent(r.error || 'Checked out. Due ' + prettyDate(r.due) + '.'));
});

router.post('/admin/return', function (req, res) {
  if (!isAdmin(req)) return res.redirect('/admin');
  var r = returnCopy(getDb(), req.body.barcode);
  var msg = r.error || ('Returned.' + (r.fine ? ' Late fine ' + formatCents(r.fine) + '.' : '') + (r.holdFilled ? ' Put it on the hold shelf!' : ''));
  res.redirect('/admin?msg=' + encodeURIComponent(msg));
});

router.post('/admin/renew', function (req, res) {
  if (!isAdmin(req)) return res.redirect('/admin');
  var r = renew(getDb(), req.body.barcode);
  res.redirect('/admin?msg=' + encodeURIComponent(r.error || 'Renewed. Now due ' + prettyDate(r.due) + '.'));
});

router.post('/admin/pay', function (req, res) {
  if (!isAdmin(req)) return res.redirect('/admin');
  var db = getDb();
  var p = findPatron(db, req.body.card);
  if (!p) return res.redirect('/admin?msg=' + encodeURIComponent('Unknown card.'));
  var owed = balanceFor(db, p.id);
  db.prepare('UPDATE fines SET paid = 1 WHERE patron_id = ?').run(p.id);
  res.redirect('/admin?msg=' + encodeURIComponent('Took ' + formatCents(owed) + ' from ' + p.name + '.'));
});

// json versions for the self-checkout kiosk
router.post('/api/checkout', function (req, res) {
  var r = checkout(getDb(), req.body.card, req.body.barcode);
  res.status(r.error ? 400 : 200).json(r);
});

router.post('/api/return', function (req, res) {
  var r = returnCopy(getDb(), req.body.barcode, req.body.returned_on);
  res.status(r.error ? 400 : 200).json(r);
});

module.exports = router;
module.exports.searchBooks = searchBooks;
module.exports.placeHold = placeHold;
module.exports.cancelHold = cancelHold;
module.exports.checkout = checkout;
module.exports.returnCopy = returnCopy;
module.exports.renew = renew;
