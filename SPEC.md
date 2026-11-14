# Renewals and Due soon

Both features use calendar dates in the reader's local time zone. Due dates are stored as `YYYY-MM-DD`. A valid due date must represent a real calendar date in that format. Calendar-day arithmetic crosses month and year boundaries, leap days, and daylight-saving transitions without shifting the intended date.

## Renewed button

- Show a **Renewed** button on every active book row. Enable it when the due date is valid, adding 21 days produces a valid date in the supported format, and the book has used fewer than two renewals. For a disabled button, show the reason on the row.
- Each new or sample book starts with zero renewals. Saved books that predate this feature also start with zero. The limit applies to each borrowed copy individually, including copies with identical titles, authors, and due dates.
- A successful click adds exactly 21 calendar days to the book's current due date and increments its renewal count by one. Save both changes together so they survive reload. A second renewal adds another 21 days, for 42 days total from the original due date.
- A book can be renewed before, on, or after its due date. An overdue book can remain overdue after renewal if its new due date is still in the past. Recalculate status and fees from the new due date using the existing fee rules.
- After two renewals, disable the button. An invalid or unrepresentable date, an exhausted limit, or a stale row whose saved list changed before the click must leave the saved date and count untouched. Refresh stale rows from the current saved list.
- After a successful renewal, refresh the row status, due-date order, fees, overdue count, and Due soon banner. CSV exports use the updated due date and fee.

## Due soon banner

- Show a **Due soon** banner at the top of the page when at least one active book is due today or within the next three calendar days. Hide it when there are no matches. Exclude overdue books, books due four or more days away, and books with invalid due dates.
- List each qualifying copy with its title and due-date status, using the existing wording **Due today**, **Due tomorrow**, **Due in 2 days**, or **Due in 3 days**. Sort by earliest due date so books due today appear first, keeping the saved order for ties. Display titles as plain text.
- Use the entire active list regardless of the search query. Compute the banner at initial load and on each render, including after adding, renewing, or returning a book. A page left open past midnight refreshes the window on its next render.
