// fills fernhollow.db with demo data. dates are relative to today so
// there is always something overdue and something on the hold shelf.
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { getDb } = require('./db');
const { today, addDays } = require('./lib/dates');

const BOOKS = [
  ['Pride and Prejudice', 'Jane Austen', 1813, 'Fiction', 3],
  ['Persuasion', 'Jane Austen', 1817, 'Fiction', 1],
  ['Moby-Dick', 'Herman Melville', 1851, 'Fiction', 2],
  ['Frankenstein', 'Mary Shelley', 1818, 'Fiction', 2],
  ['The Adventures of Sherlock Holmes', 'Arthur Conan Doyle', 1892, 'Mystery', 3],
  ['The Hound of the Baskervilles', 'Arthur Conan Doyle', 1902, 'Mystery', 1],
  ['Little Women', 'Louisa May Alcott', 1868, 'Fiction', 2],
  ['Walden', 'Henry David Thoreau', 1854, 'Nonfiction', 1],
  ['The Scarlet Letter', 'Nathaniel Hawthorne', 1850, 'Fiction', 1],
  ['Great Expectations', 'Charles Dickens', 1861, 'Fiction', 2],
  ['A Tale of Two Cities', 'Charles Dickens', 1859, 'Fiction', 1],
  ['Jane Eyre', 'Charlotte Bronte', 1847, 'Fiction', 2],
  ['Wuthering Heights', 'Emily Bronte', 1847, 'Fiction', 1],
  ['The Time Machine', 'H. G. Wells', 1895, 'Science Fiction', 2],
  ['The War of the Worlds', 'H. G. Wells', 1898, 'Science Fiction', 1],
  ['Treasure Island', 'Robert Louis Stevenson', 1883, 'Adventure', 2],
  ['Twenty Thousand Leagues Under the Seas', 'Jules Verne', 1870, 'Adventure', 1],
  ['Around the World in Eighty Days', 'Jules Verne', 1872, 'Adventure', 1],
  ['The Call of the Wild', 'Jack London', 1903, 'Adventure', 2],
  ['Anne of Green Gables', 'L. M. Montgomery', 1908, 'Children', 2],
  ['The Secret Garden', 'Frances Hodgson Burnett', 1911, 'Children', 2],
  ['The Wonderful Wizard of Oz', 'L. Frank Baum', 1900, 'Children', 1],
  ['Alice\'s Adventures in Wonderland', 'Lewis Carroll', 1865, 'Children', 2],
  ['The Picture of Dorian Gray', 'Oscar Wilde', 1890, 'Fiction', 1],
  ['Dracula', 'Bram Stoker', 1897, 'Horror', 2],
  ['The Count of Monte Cristo', 'Alexandre Dumas', 1844, 'Adventure', 1],
  ['Middlemarch', 'George Eliot', 1871, 'Fiction', 1],
  ['The Federalist Papers', 'Hamilton, Madison and Jay', 1788, 'Nonfiction', 1],
  ['Narrative of the Life of Frederick Douglass', 'Frederick Douglass', 1845, 'Biography', 1],
  ['The Autobiography of Benjamin Franklin', 'Benjamin Franklin', 1791, 'Biography', 1],
  ['Gulliver\'s Travels', 'Jonathan Swift', 1726, 'Fiction', 1],
  ['The Jungle Book', 'Rudyard Kipling', 1894, 'Children', 1],
  ['Kim', 'Rudyard Kipling', 1901, 'Fiction', 1],
  ['O Pioneers!', 'Willa Cather', 1913, 'Fiction', 1],
  ['The Red Badge of Courage', 'Stephen Crane', 1895, 'Fiction', 1],
  ['Heidi', 'Johanna Spyri', 1881, 'Children', 1]
];

const PATRONS = [
  ['21007000101', 'Margaret Ellison', 'margaret.ellison@example.com', '(802) 555-0101', '2014-03-11'],
  ['21007000102', 'Thomas Whitcombe', 'tom.whitcombe@example.com', '(802) 555-0102', '2019-08-02'],
  ['21007000103', 'Hannah Pruitt', 'hpruitt@example.com', '(802) 555-0103', '2021-01-15'],
  ['21007000104', 'Owen O\'Brien', 'owen.obrien@example.com', '(802) 555-0104', '2016-06-30'],
  ['21007000105', 'Clara Haskins', 'clara.h@example.com', '(802) 555-0105', '2023-09-09'],
  ['21007000106', 'Samuel Rourke', 'srourke@example.com', '(802) 555-0106', '2012-11-21'],
  ['21007000107', 'Lucy Abernathy', 'lucy.abernathy@example.com', '(802) 555-0107', '2024-04-04'],
  ['21007000108', 'Nathan Greer', 'ngreer@example.com', '(802) 555-0108', '2018-02-14'],
  ['21007000109', 'Ivy Sterling', 'ivy.sterling@example.com', '(802) 555-0109', '2022-07-19'],
  ['21007000110', 'Walter Pembrook', 'wpembrook@example.com', '(802) 555-0110', '2009-10-01'],
  ['21007000111', 'Rosa Delgado', 'rosa.delgado@example.com', '(802) 555-0111', '2020-05-25'],
  ['21007000112', 'Eli Thornton', 'eli.t@example.com', '(802) 555-0112', '2025-01-03']
];

const ROOMS = [['Birch Room', 4], ['Maple Room', 6], ['Hemlock Room', 2], ['Community Room', 20]];

function seed() {
  var file = path.join(__dirname, config.DB_FILE);
  if (config.DB_FILE !== ':memory:' && fs.existsSync(file)) fs.unlinkSync(file);
  var db = getDb();
  var t = today();

  var insBook = db.prepare('INSERT INTO books (title, author, isbn, year, genre) VALUES (?, ?, ?, ?, ?)');
  var insCopy = db.prepare('INSERT INTO copies (book_id, barcode, status) VALUES (?, ?, ?)');
  var n = 1;
  BOOKS.forEach(function (b, i) {
    var isbn = '978-0-' + String(140000 + i * 37).padStart(6, '0') + '-' + (i % 10);
    var id = Number(insBook.run(b[0], b[1], isbn, b[2], b[3]).lastInsertRowid);
    for (var c = 0; c < b[4]; c++) insCopy.run(id, '3100' + String(n++).padStart(4, '0'), 'available');
  });

  var insPatron = db.prepare('INSERT INTO patrons (card_number, name, email, phone, joined) VALUES (?, ?, ?, ?, ?)');
  PATRONS.forEach(p => insPatron.run(p[0], p[1], p[2], p[3], p[4]));
  ROOMS.forEach(r => db.prepare('INSERT INTO rooms (name, capacity) VALUES (?, ?)').run(r[0], r[1]));

  function copyOf(title, k) {
    return db.prepare('SELECT c.* FROM copies c JOIN books b ON b.id = c.book_id WHERE b.title = ? ORDER BY c.barcode LIMIT 1 OFFSET ?').get(title, k || 0);
  }
  function lend(card, title, k, daysAgo) {
    var copy = copyOf(title, k);
    var p = db.prepare('SELECT id FROM patrons WHERE card_number = ?').get(card);
    var out = addDays(t, -daysAgo);
    db.prepare('INSERT INTO loans (copy_id, patron_id, checked_out, due_date) VALUES (?, ?, ?, ?)')
      .run(copy.id, p.id, out, addDays(out, config.LOAN_DAYS));
    db.prepare("UPDATE copies SET status = 'on_loan' WHERE id = ?").run(copy.id);
  }

  // current loans, some overdue
  lend('21007000101', 'Pride and Prejudice', 0, 3);
  lend('21007000101', 'Walden', 0, 30);
  lend('21007000102', 'Moby-Dick', 0, 45);
  lend('21007000102', 'Moby-Dick', 1, 10);
  lend('21007000103', 'The Hound of the Baskervilles', 0, 21);
  lend('21007000104', 'Persuasion', 0, 12);
  lend('21007000105', 'The Time Machine', 0, 60);
  lend('21007000105', 'The Time Machine', 1, 22);
  lend('21007000106', 'Dracula', 0, 5);
  lend('21007000106', 'Dracula', 1, 25);
  lend('21007000107', 'Anne of Green Gables', 0, 14);
  lend('21007000107', 'Anne of Green Gables', 1, 2);
  lend('21007000108', 'Wuthering Heights', 0, 19);
  lend('21007000109', 'Frankenstein', 0, 33);
  lend('21007000109', 'Frankenstein', 1, 7);
  lend('21007000110', 'Middlemarch', 0, 40);

  // hold queues
  var hold = db.prepare('INSERT INTO holds (book_id, patron_id, placed_on, position, status) VALUES (?, ?, ?, ?, ?)');
  function bookId(title) { return db.prepare('SELECT id FROM books WHERE title = ?').get(title).id; }
  function pid(card) { return db.prepare('SELECT id FROM patrons WHERE card_number = ?').get(card).id; }
  hold.run(bookId('Persuasion'), pid('21007000103'), addDays(t, -9), 1, 'waiting');
  hold.run(bookId('Persuasion'), pid('21007000108'), addDays(t, -6), 2, 'waiting');
  hold.run(bookId('Persuasion'), pid('21007000111'), addDays(t, -4), 3, 'waiting');
  hold.run(bookId('Persuasion'), pid('21007000112'), addDays(t, -1), 4, 'waiting');
  hold.run(bookId('Middlemarch'), pid('21007000101'), addDays(t, -20), 1, 'waiting');
  hold.run(bookId('Walden'), pid('21007000106'), addDays(t, -2), 1, 'waiting');
  hold.run(bookId('Walden'), pid('21007000104'), addDays(t, -2), 2, 'waiting');

  // one copy already waiting on the hold shelf
  var jungle = copyOf('The Jungle Book');
  db.prepare("UPDATE copies SET status = 'on_hold_shelf' WHERE id = ?").run(jungle.id);
  db.prepare("INSERT INTO holds (book_id, patron_id, placed_on, position, status, ready_on, copy_id) VALUES (?, ?, ?, 0, 'ready', ?, ?)")
    .run(jungle.book_id, pid('21007000107'), addDays(t, -11), addDays(t, -3), jungle.id);

  // unpaid fines
  var fine = db.prepare('INSERT INTO fines (patron_id, loan_id, amount_cents, reason, created_on) VALUES (?, NULL, ?, ?, ?)');
  fine.run(pid('21007000105'), 500, 'Late return: 31000041', addDays(t, -50));
  fine.run(pid('21007000105'), 375, 'Late return: 31000017', addDays(t, -15));
  fine.run(pid('21007000102'), 150, 'Late return: 31000009', addDays(t, -8));

  // room bookings
  var book = db.prepare('INSERT INTO bookings (room_id, patron_id, date, start_time, end_time, purpose) VALUES (?, ?, ?, ?, ?, ?)');
  book.run(1, pid('21007000103'), t, '10:00', '12:00', 'Calculus study group');
  book.run(2, pid('21007000110'), t, '13:00', '14:30', 'Genealogy club');
  book.run(3, pid('21007000109'), t, '15:00', '16:00', 'Tutoring');
  book.run(4, pid('21007000106'), addDays(t, 1), '18:00', '20:00', 'Friends of the Library meeting');
  book.run(1, pid('21007000111'), addDays(t, 1), '09:30', '11:00', 'Citizenship test prep');

  console.log('Seeded ' + BOOKS.length + ' titles, ' + PATRONS.length + ' patrons, ' + ROOMS.length + ' rooms.');
}

seed();
