// tiny html helpers (we didn't want a template engine)

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function page(title, body, opts) {
  opts = opts || {};
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} - Fernhollow Public Library</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header class="top">
  <a class="brand" href="/">Fernhollow Public Library</a>
  <nav>
    <a href="/">Catalog</a>
    <a href="/rooms">Study rooms</a>
    <a href="/patron">My account</a>
    ${opts.admin ? '<a href="/admin">Desk</a>' : ''}
  </nav>
</header>
<main>
${opts.flash ? `<p class="flash">${esc(opts.flash)}</p>` : ''}
${body}
</main>
<footer>12 Mill Street, Fernhollow, VT &middot; Mon&ndash;Sat 9am&ndash;8pm &middot; (802) 555-0142</footer>
</body>
</html>`;
}

function table(headers, rows) {
  var h = headers.map(x => `<th>${esc(x)}</th>`).join('');
  var r = rows.map(cols => '<tr>' + cols.map(c => `<td>${c}</td>`).join('') + '</tr>').join('\n');
  return `<table><thead><tr>${h}</tr></thead><tbody>${r}</tbody></table>`;
}

module.exports = { esc, page, table };
