const fs = require('fs');
let content = fs.readFileSync('src/pages/ServiceChecklist.tsx', 'utf8');
const map = {
  'â ±': '⏳',
  'ðŸš«': '🚫',
  'âœ“': '✓',
  'âœ—': '✗',
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
  'ðŸ—‘ï¸ ': '🗑️ ',
  'â„¹ï¸ ': 'ℹ️ ',
  'ðŸ§ª': '🧪'
};
for (const [bad, good] of Object.entries(map)) {
  content = content.split(bad).join(good);
}
fs.writeFileSync('src/pages/ServiceChecklist.tsx', content, 'utf8');
console.log('ServiceChecklist.tsx fixed');
