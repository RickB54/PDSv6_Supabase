import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scratch/inventory_dump.json', 'utf8'));

console.log(`=== CURRENT MATERIALS (${data.materials.length}) ===`);
data.materials.forEach((m: any, i: number) => {
  console.log(`M${i + 1}: "${m.name}" | Current Cat: "${m.category}"`);
});

console.log(`\n=== CURRENT TOOLS (${data.tools.length}) ===`);
data.tools.forEach((t: any, i: number) => {
  console.log(`T${i + 1}: "${t.name}" | Current Cat: "${t.category}"`);
});
