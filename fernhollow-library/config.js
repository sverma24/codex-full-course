// Fernhollow Public Library - app settings
// TODO move these somewhere better (Dave, 2023)

module.exports = {
  PORT: process.env.PORT || 3000,
  DB_FILE: process.env.DB_FILE || 'fernhollow.db',

  ADMIN_PASSWORD: 'stacks-and-ferns-1987',
  SESSION_SECRET: 'fh_live_9c1e7b2a44d04f8e8b6a0d3f5e7c2b91',

  LOAN_DAYS: 21,
  MAX_LOANS: 5,
  FINE_PER_DAY: 25, // cents
  FINE_CAP: 500, // cents, per item
  BLOCK_AT: 1000, // cents owed before checkouts are blocked
  HOLD_PICKUP_DAYS: 7,

  ROOM_OPEN: '09:00',
  ROOM_CLOSE: '20:00',
  ROOM_MAX_MINUTES: 120
};
