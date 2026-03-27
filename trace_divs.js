
import fs from 'fs';
const filepath = "c:/Users/rberu/PDSv6_Supabase/src/pages/InventoryControl.tsx";
const content = fs.readFileSync(filepath, 'utf-8');

// Remove template strings
const cleanContent = content.replace(/`[\s\S]*?`/g, '""');

const regex = /<\/?div[^>]*>/g;
let match;
let depth = 0;
const stack = [];

console.log("Trace DIV Stack:");
while ((match = regex.exec(cleanContent)) !== null) {
    const tag = match[0];
    const isClosing = tag.startsWith('</');
    const line = content.substring(0, match.index).split('\n').length;
    
    if (isClosing) {
        depth--;
        if (depth < 0) {
            console.log(`ERROR: Extra closing div at line ${line}: ${tag}`);
            depth = 0; // Reset for further check
        }
    } else {
        depth++;
    }
}
console.log("Final depth:", depth);
if (depth > 0) {
    console.log("ERROR: Unclosed div(s) remaining.");
}
