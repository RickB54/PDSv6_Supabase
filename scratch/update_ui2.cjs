const fs = require('fs');
let content = fs.readFileSync('src/pages/Invoicing.tsx', 'utf8');

// Replace "Adjusted Price" name with "Adjusted" everywhere if it exists in generating
content = content.replace(/"Adjusted Price"/g, '"Adjusted"');

const total_owed_target = `                    <div className="flex justify-between items-center px-2 mt-2 pt-2 border-t border-zinc-800/50">`;

const ui_new_code = `
                    {editAdjustmentAmount > 0 && (
                      <div className="flex justify-between items-center px-2 text-sm text-red-400 font-medium">
                        <span>Adjusted</span>
                        <span className="font-mono">
                          -\${editAdjustmentAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                      <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Adjustment</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-xs">-$</span>
                        <Input
                          type="number"
                          value={editAdjustmentAmount || ''}
                          onChange={e => setEditAdjustmentAmount(parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-900 border-zinc-800 text-sm h-9 text-right font-mono focus-visible:ring-0 px-2"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center px-2 mt-2 pt-2 border-t border-zinc-800/50">`;

if (content.includes(total_owed_target)) {
    content = content.replace(total_owed_target, ui_new_code);
    console.log("Successfully inserted UI code before Total Owed!");
} else {
    console.log("Failed to find Total Owed target!");
}

fs.writeFileSync('src/pages/Invoicing.tsx', content);
console.log("done");
