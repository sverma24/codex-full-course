const express = require('express');
const path = require('path');
const config = require('./config');
const { getDb } = require('./db');

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// we only have one cookie so this is fine
app.use(function (req, res, next) {
  req.cookies_parsed = {};
  (req.headers.cookie || '').split(';').forEach(function (part) {
    var i = part.indexOf('=');
    if (i > 0) req.cookies_parsed[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  next();
});

app.use(require('./routes/main'));
app.use(require('./routes/rooms'));

app.use(function (err, req, res, next) {
  console.error(err);
  res.status(500).send('Something went wrong. Please tell the desk.');
});

if (require.main === module) {
  getDb();
  app.listen(config.PORT, function () {
    console.log('Fernhollow library app on http://localhost:' + config.PORT);
  });
}

module.exports = app;
