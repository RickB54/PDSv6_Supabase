const fs = require('fs');
let content = fs.readFileSync('src/pages/Invoicing.tsx', 'utf8');

const regex = /([ \t]*)\{editDiscountValue > 0 && \([\s\S]*?<\/div>\n[ \t]*\)\}/;

const match = content.match(regex);

if (match) {
    const indent = match[1];
    
    const ui_new_code = match[0] + `
${indent}
${indent}{editAdjustmentAmount > 0 && (
${indent}  <div className="flex justify-between items-center px-2 text-sm text-red-400 font-medium">
${indent}    <span>Adjusted</span>
${indent}    <span className="font-mono">
${indent}      -\${editAdjustmentAmount.toFixed(2)}
${indent}    </span>
${indent}  </div>
${indent})}
${indent}
${indent}<div className="space-y-4 pt-4 border-t border-zinc-800">
${indent}  <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Adjustment</Label>
${indent}  <div className="flex items-center gap-2">
${indent}    <span className="text-zinc-500 text-xs">-$</span>
${indent}    <Input
${indent}      type="number"
${indent}      value={editAdjustmentAmount || ''}
${indent}      onChange={e => setEditAdjustmentAmount(parseFloat(e.target.value) || 0)}
${indent}      className="w-full bg-zinc-900 border-zinc-800 text-sm h-9 text-right font-mono focus-visible:ring-0 px-2"
${indent}      placeholder="0.00"
${indent}    />
${indent}  </div>
${indent}</div>`;

    content = content.replace(regex, ui_new_code);
    console.log("Successfully inserted UI code!");
} else {
    console.log("Failed to find UI insert target!");
}

fs.writeFileSync('src/pages/Invoicing.tsx', content);
console.log("done");
