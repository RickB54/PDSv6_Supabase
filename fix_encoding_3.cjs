const fs = require('fs');
let content = fs.readFileSync('src/lib/bookingsSync.ts', 'utf8');
// This regex matches any weird character sequences starting with Ã
content = content.replace(/Ã[^\x00-\x7F]+/g, '');
fs.writeFileSync('src/lib/bookingsSync.ts', content, 'utf8');
console.log('bookingsSync.ts fixed');
