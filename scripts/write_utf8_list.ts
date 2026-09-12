import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scratch/inventory_dump.json', 'utf8'));

let out = `=== CURRENT MATERIALS (${data.materials.length}) ===\n`;
data.materials.forEach((m: any, i: number) => {
  out += `M${i + 1}: "${m.name}" | Current Cat: "${m.category}" | id: ${m.id}\n`;
});

out += `\n=== CURRENT TOOLS (${data.tools.length}) ===\n`;
data.tools.forEach((t: any, i: number) => {
  out += `T${i + 1}: "${t.name}" | Current Cat: "${t.category}" | id: ${t.id}\n`;
});

fs.writeFileSync('scratch/current_items_utf8.txt', out, 'utf8');
console.log('Written utf8 text file');
