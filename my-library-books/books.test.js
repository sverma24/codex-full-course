const { test } = require('node:test');
const assert = require('node:assert/strict');
const { lateFee } = require('./books.js');

const cases = [
  ['on the due date', 1, 0],
  ['one day late', 2, 0.25],
  ['19 days late', 20, 4.75],
  ['20 days late', 21, 5],
  ['40 days late', 41, 5],
];

for (const [description, returnDay, expectedFee] of cases) {
  test(`late fee for a book returned ${description}`, () => {
    const returnedAt = new Date(2026, 0, returnDay, 15);
    assert.equal(lateFee('2026-01-01', returnedAt), expectedFee);
  });
}
