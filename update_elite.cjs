const fs = require('fs');
let content = fs.readFileSync('src/lib/services.ts', 'utf8');

content = content.replace(/{ id: 'elite-full-vac', name: 'Thorough Vacuum \(Top to Bottom\)', category: 'interior' }/g, '{ id: \'elite-full-personal\', name: \'Remove Personal Items & Trash\', category: \'interior\' },\n      { id: \'elite-full-vac\', name: \'Thorough Vacuum (Top to Bottom)\', category: \'interior\' }');

content = content.replace(/{ id: 'elite-full-fabric', name: 'Clean Fabric \/ Carpet \/ Seats', category: 'interior' }/g, '{ id: \'elite-full-fabric\', name: \'Clean Fabric / Carpet / Seats\', category: \'interior\' },\n      { id: \'elite-full-protectant\', name: \'Interior Protectant / Plastics Finisher\', category: \'interior\' }');

fs.writeFileSync('src/lib/services.ts', content, 'utf8');
console.log('Done replacing elite-full!');
