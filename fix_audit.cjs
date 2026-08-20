const fs = require('fs');
const c1 = fs.readFileSync('src/components/inventory/UnifiedInventoryModal.tsx', 'utf8');
const c2 = fs.readFileSync('src/components/inventory/InventoryAuditModal.tsx', 'utf8');

console.log('Detail Cart in UnifiedInventoryModal:', c1.includes('Detail Cart'));
console.log('D1-1 in UnifiedInventoryModal:', c1.includes('D1-1'));
console.log('B-Top in UnifiedInventoryModal:', c1.includes('B-Top'));
console.log('Wall Shelf in UnifiedInventoryModal:', c1.includes('Wall Shelf'));

const lines = c2.split('\n');
const p = lines.findIndex(l => l.includes('loc} ({items'));
console.log('Group header line:', p, lines[p] && lines[p].trim().substring(0, 120));

const p2 = lines.findIndex(l => l.includes("'supplies' && isExpanded"));
console.log('Expand card search result:', p2);

const p3 = lines.findIndex(l => l.includes("isExpanded &&"));
console.log('isExpanded line:', p3, lines[p3] && lines[p3].trim().substring(0, 120));
