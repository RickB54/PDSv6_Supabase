const fs = require('fs');
let lines = fs.readFileSync('src/pages/SearchCustomer.tsx', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes("const overdueItem = followUpStatus.overdue.find(c => c.customer.id === customer.id);"));
if (startIdx !== -1) {
  const endIdx = startIdx + 9;
  const newCode = `                                const statusItem = followUpStatus.allWithStatus?.find((c: any) => c.customer.id === customer.id);
                                if (statusItem) {
                                  const days = statusItem.daysUntilDue || 0;
                                  if (days < 0) {
                                    const weeks = Math.abs(Math.floor(days / 7));
                                    retLabel = weeks > 0 ? \`\${weeks} WK\${weeks === 1 ? '' : 'S'} OVERDUE\` : 'OVERDUE FOR SERVICE';
                                    retColor = 'bg-red-500/10 text-red-500 border-red-500/30 animate-pulse cursor-pointer hover:bg-red-500/20';
                                  } else {
                                    const weeks = Math.floor(days / 7);
                                    if (weeks === 0) {
                                      retLabel = \`DUE IN \${days} DAY\${days === 1 ? '' : 'S'}\`;
                                      retColor = 'bg-amber-500/10 text-amber-500 border-amber-500/30 cursor-pointer hover:bg-amber-500/20';
                                    } else {
                                      const months = Math.floor(days / 30);
                                      if (months > 0) {
                                        retLabel = \`DUE IN \${months} MO\${months === 1 ? '' : 'S'}\`;
                                      } else {
                                        retLabel = \`DUE IN \${weeks} WK\${weeks === 1 ? '' : 'S'}\`;
                                      }
                                      retColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 cursor-pointer hover:bg-emerald-500/20';
                                    }
                                  }
                                } else {
                                  retColor += ' cursor-pointer hover:bg-emerald-500/20';
                                }`;
  lines.splice(startIdx, 10, newCode);
  fs.writeFileSync('src/pages/SearchCustomer.tsx', lines.join('\n'));
  console.log("SUCCESS");
} else {
  console.log("NOT FOUND");
}
