const { test } = require('node:test');
const assert = require('node:assert/strict');
const { lateFee, sortByDue, renewalDetails } = require('./books.js');

const cases = [
  ['on the due date', 1, 0],
  ['one day late', 2, 0.25],
  ['19 days late', 20, 4.75],
  ['20 days late', 21, 5],
  ['21 days late', 22, 5],
  ['40 days late', 41, 5],
];

for (const [description, returnDay, expectedFee] of cases) {
  test(`late fee for a book returned ${description}`, () => {
    const returnedAt = new Date(2026, 0, returnDay, 15);
    assert.equal(lateFee('2026-01-01', returnedAt), expectedFee);
  });
}

test('sorts books by earliest due date, including overdue books', () => {
  const upcoming = { title: 'Frankenstein', due: '2026-02-11' };
  const oldest = { title: 'Walden', due: '2026-01-01' };
  const overdue = { title: 'Moby-Dick', due: '2026-01-29' };
  const books = [upcoming, oldest, overdue];

  assert.deepEqual(sortByDue(books), [oldest, overdue, upcoming]);
  assert.deepEqual(books, [upcoming, oldest, overdue]);
});

test('puts books with invalid due dates last in their original order', () => {
  const blank = { due: '' };
  const broken = { due: 'not a date' };
  const impossible = { due: '2026-02-30' };
  const missing = {};
  const later = { due: '2026-03-10' };
  const earlier = { due: '2026-01-01' };

  assert.deepEqual(
    sortByDue([blank, later, broken, impossible, earlier, missing]),
    [earlier, later, blank, broken, impossible, missing]
  );
});

test('treats invalid saved renewal counts as zero', () => {
  for (const renewalCount of [1.5, '1', -1, NaN, Infinity]) {
    assert.deepEqual(
      renewalDetails({ due: '2026-01-01', renewalCount }),
      { due: '2026-01-22', renewalCount: 1 }
    );
  }
});

test('never permits more than two renewals', () => {
  const once = renewalDetails({ due: '2026-01-01', renewalCount: 1 });
  assert.deepEqual(once, { due: '2026-01-22', renewalCount: 2 });
  assert.deepEqual(
    renewalDetails({ due: once.due, renewalCount: once.renewalCount }),
    { reason: 'Renewal limit reached.' }
  );
});
