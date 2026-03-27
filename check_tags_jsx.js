
import fs from 'fs';
const filepath = "c:/Users/rberu/PDSv6_Supabase/src/pages/InventoryControl.tsx";
const content = fs.readFileSync(filepath, 'utf-8');

// Simple regex to remove everything inside backticks
const cleanContent = content.replace(/`[\s\S]*?`/g, '""');

function countTags(tagName) {
    const opening = (cleanContent.match(new RegExp('<' + tagName + '[^>]*>', 'g')) || []).length;
    const closing = (cleanContent.match(new RegExp('</' + tagName + '>', 'g')) || []).length;
    return { opening, closing, balanced: opening === closing };
}

console.log("JSX-Only Tag Check for InventoryControl.tsx:");
console.log("div:", countTags('div'));
console.log("Dialog:", countTags('Dialog'));
console.log("DialogContent:", countTags('DialogContent'));
console.log("DialogHeader:", countTags('DialogHeader'));
console.log("DialogTitle:", countTags('DialogTitle'));
