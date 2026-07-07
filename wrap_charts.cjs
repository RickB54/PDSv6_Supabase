const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

// 1. Wrap in container
content = content.replace(
  /\{\/\* Dynamic Operational Snapshot \*\/\}/,
  '<div className="border border-zinc-700 rounded-xl p-6 bg-zinc-900/20 shadow-2xl">\n            {/* Dynamic Operational Snapshot */}'
);

content = content.replace(
  /\{\/\* Service Performance Detail Log - COMPLETED ONLY \*\/\}/,
  '</div>\n\n            {/* Service Performance Detail Log - COMPLETED ONLY */}'
);

// 2. Remove the Global Charts Filter block
const filterRegex = /\{\/\* Global Charts Filter \*\/\}[\s\S]*?<h3 className="text-lg font-bold text-white uppercase tracking-tighter">Performance Graphs<\/h3>[\s\S]*?<\/Popover>\s*<\/div>/;
content = content.replace(filterRegex, '<h3 className="text-lg font-bold text-zinc-400 uppercase tracking-widest mt-8 mb-4 border-b border-zinc-800 pb-2">Performance Graphs</h3>');

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
console.log('Fixed wrapper');
