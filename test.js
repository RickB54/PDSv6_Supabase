const data = { note: 'Letter Generated: "Thank You for Choosing Prime Auto Detail!"' };
const out = data.body || data.note?.replace(/^Letter Generated: ".*?"\n\n/, '') || 'No letter body found.';
console.log(out);
