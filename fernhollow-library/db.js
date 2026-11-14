const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const config = require('./config');

var db = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  year INTEGER,
  genre TEXT
);
CREATE TABLE IF NOT EXISTS copies (
  id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id),
  barcode TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
);
CREATE TABLE IF NOT EXISTS patrons (
  id INTEGER PRIMARY KEY,
  card_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  joined TEXT
);
CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY,
  copy_id INTEGER NOT NULL REFERENCES copies(id),
  patron_id INTEGER NOT NULL REFERENCES patrons(id),
  checked_out TEXT NOT NULL,
  due_date TEXT NOT NULL,
  returned_on TEXT,
  renewals INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS holds (
  id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id),
  patron_id INTEGER NOT NULL REFERENCES patrons(id),
  placed_on TEXT NOT NULL,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  ready_on TEXT,
  copy_id INTEGER
);
CREATE TABLE IF NOT EXISTS fines (
  id INTEGER PRIMARY KEY,
  patron_id INTEGER NOT NULL REFERENCES patrons(id),
  loan_id INTEGER,
  amount_cents INTEGER NOT NULL,
  reason TEXT,
  paid INTEGER NOT NULL DEFAULT 0,
  created_on TEXT
);
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  patron_id INTEGER NOT NULL REFERENCES patrons(id),
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  purpose TEXT
);
`;

function getDb() {
  if (db) return db;
  var file = config.DB_FILE === ':memory:' ? ':memory:' : path.join(__dirname, config.DB_FILE);
  db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}

function resetDb() {
  if (db) { db.close(); db = null; }
}

module.exports = { getDb, resetDb, SCHEMA };
