# Fernhollow Public Library – circulation app

Holds, loans, fines and study-room booking for the Fernhollow Public Library
(12 Mill Street, Fernhollow, VT). Runs on the desk PC and the self-checkout kiosk.

## Running it

    npm install
    npm run seed     # wipes and refills fernhollow.db with demo data
    npm start        # http://localhost:3000

Desk login is under /admin (ask Dave for the password).

## Library policies (what the app is supposed to do)

- Books go out for **21 days**. A patron can have **5 items** out at once.
- Late fines are **25 cents per day**, starting the day **after** the due date,
  and **never more than $5.00 per item**.
- Patrons who owe **$10.00 or more** can't check anything out until they pay.
- An item can be renewed **twice**, unless someone has a hold on it.
- **Holds** form a queue per title. When a copy comes back it goes on the hold
  shelf for the first person in line, who has **7 days** to collect it.
  If someone cancels, everyone behind them moves up one place.
- **Study rooms** are open 9am to 8pm. Bookings run on the hour or half hour,
  last at most 2 hours, and can't overlap (back-to-back is fine).

## Known issues

- Some patrons say due dates on their account page "look a day early".
- Searching for some authors gives "Something went wrong".
- Kiosk team says fines sometimes don't match what the desk quotes.
