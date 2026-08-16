const fs = require('fs');
let content = fs.readFileSync('src/pages/BookingsPage.tsx', 'utf8');
const map = {
  'â ±': '⏳',
  'ðŸš«': '🚫',
  'âœ“': '✓',
  'â ³': '⏳',
  'ðŸ”„': '🔄',
  'âœ…': '✅',
  'â€”': '-',
  'â€¢': '•',
  'âš ï¸ ': '⚠️ ',
  'ðŸ”µ': '🔵',
  'ðŸ“…': '📅',
  'ðŸ“§': '📧',
  'ðŸ“ž': '📞',
  'ðŸ‘¤': '👤',
  'ðŸš—': '🚗',
  'â–¼': '▼',
  'âžœ': '➜',
  'ðŸ—‘ï¸ ': '🗑️ '
};
for (const [bad, good] of Object.entries(map)) {
  content = content.split(bad).join(good);
}
fs.writeFileSync('src/pages/BookingsPage.tsx', content, 'utf8');
console.log('BookingsPage.tsx fixed');

let destContent = fs.readFileSync('src/components/distance/DestinationFeeInline.tsx', 'utf8');
destContent = destContent.replace(/You\\\\u2019re/g, `You\\'re`);
destContent = destContent.replace(/\\\\u2014/g, '-');
// also fix any real garbled characters just in case
for (const [bad, good] of Object.entries(map)) {
  destContent = destContent.split(bad).join(good);
}
fs.writeFileSync('src/components/distance/DestinationFeeInline.tsx', destContent, 'utf8');
console.log('DestinationFeeInline.tsx fixed');
