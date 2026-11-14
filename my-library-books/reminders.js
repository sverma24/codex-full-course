// Sends "your book is due tomorrow" emails through the library's mail service.
// TODO: wire this up to the page.

const MAIL_URL = 'https://mail.fernhollow-library.example/send';

async function sendReminder(email, title, due) {
  const apiKey = typeof process !== 'undefined' ? process.env?.MAIL_API_KEY : undefined;
  if (!apiKey) throw new Error('Set MAIL_API_KEY before sending reminders.');

  return fetch(MAIL_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: email, subject: 'Due tomorrow: ' + title, due })
  });
}

if (typeof module !== 'undefined') module.exports = { sendReminder };
