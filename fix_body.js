
import fs from 'fs';
const filepath = "c:/Users/rberu/PDSv6_Supabase/src/pages/InventoryControl.tsx";
let content = fs.readFileSync(filepath, 'utf-8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    // Standard
    if (lines[i].includes("renderOzCompoundCell(standard, 32") && lines[i].includes("border-r-zinc-400")) {
        lines[i] = lines[i].replace("border-r-2 border-r-zinc-400", "");
        lines.splice(i + 1, 0, lines[i].replace("32, 'standard', 'bg-purple-50/10'", "gallonSize, 'standard', 'bg-amber-500/10 border-r-2 border-r-zinc-400'"));
        i++;
    }
    // Heavy
    else if (lines[i].includes("renderOzCompoundCell(heavy, 32") && lines[i].includes("border-r-zinc-300")) {
        lines[i] = lines[i].replace("border-r-2 border-r-zinc-300", "");
        lines.splice(i + 1, 0, lines[i].replace("32, 'heavy', 'bg-orange-50/10'", "gallonSize, 'heavy', 'bg-amber-500/10 border-r-2 border-r-zinc-300'"));
        i++;
    }
    // Light
    else if (lines[i].includes("renderOzCompoundCell(light, 32") && lines[i].includes("bg-purple-50/10'")) {
        lines.splice(i + 1, 0, lines[i].replace("32, 'maintenance', 'bg-purple-50/10'", "gallonSize, 'maintenance', 'bg-amber-500/10'"));
        i++;
    }
    // Footer
    else if (lines[i].includes("bg-purple-600 shadow-") && lines[i+1] && lines[i+1].includes("32oz")) {
        const nextItem = `                    <div className="flex items-center gap-2 text-amber-600">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" /> \${\(gallonSize/128).toFixed(2)} GAL
                    </div>`;
        // Insert after the parent div of the 32oz marker
        // The 32oz marker parent ends 2 lines later
        lines.splice(i + 3, 0, nextItem);
        i += 4;
    }
}

fs.writeFileSync(filepath, lines.join('\n'));
console.log("Success (Table Body and Footer)");
