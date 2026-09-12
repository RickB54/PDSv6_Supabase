import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('scratch/inventory_dump.json', 'utf8'));
const tools = dump.tools;

console.log(`Total tools in DB: ${tools.length}`);

// Let's list all 79 current tools and see what each one is
let out = `Total tools in DB: ${tools.length}\n`;
tools.forEach((t: any, idx: number) => {
  out += `${idx + 1}. [${t.category}] ${t.name} (qty: ${t.qty}) id: ${t.id}\n`;
});
fs.writeFileSync('scratch/tools_list_detailed.txt', out, 'utf8');
console.log('Saved scratch/tools_list_detailed.txt');
