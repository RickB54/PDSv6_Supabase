
import fs from 'fs';
const filepath = "c:/Users/rberu/PDSv6_Supabase/src/pages/InventoryControl.tsx";
let content = fs.readFileSync(filepath, 'utf-8');
const lines = content.split('\n');

const cleanedLines = [];

for (let i = 0; i < lines.length; i++) {
    // Standard cleanup
    if (lines[i].includes("renderOzCompoundCell(standard, 32") && lines[i+1] && lines[i+1].includes("renderOzCompoundCell(standard, 32")) {
        cleanedLines.push(lines[i].replace("bg-purple-50/10 '", "bg-purple-50/10'"));
        cleanedLines.push(lines[i].replace("32, 'standard', 'bg-purple-50/10 '", "gallonSize, 'standard', 'bg-amber-500/10 border-r-2 border-r-zinc-400'"));
        i++; // skip next duplicate
    }
    // Heavy cleanup
    else if (lines[i].includes("renderOzCompoundCell(heavy, 32") && lines[i+1] && lines[i+1].includes("renderOzCompoundCell(heavy, 32")) {
        cleanedLines.push(lines[i].replace("bg-orange-50/10 '", "bg-orange-50/10'"));
        cleanedLines.push(lines[i].replace("32, 'heavy', 'bg-orange-50/10 '", "gallonSize, 'heavy', 'bg-amber-500/10 border-r-2 border-r-zinc-300'"));
        i++; // skip next duplicate
    }
    else {
        cleanedLines.push(lines[i]);
    }
}

fs.writeFileSync(filepath, cleanedLines.join('\n'));
console.log("Success (Cleanup)");
