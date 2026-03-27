
import fs from 'fs';
const filepath = "c:/Users/rberu/PDSv6_Supabase/src/pages/InventoryControl.tsx";
const content = fs.readFileSync(filepath, 'utf-8');

function countTags(tagName) {
    const opening = (content.match(new RegExp('<' + tagName + '[^>]*>', 'g')) || []).length;
    const closing = (content.match(new RegExp('</' + tagName + '>', 'g')) || []).length;
    const selfClosing = (content.match(new RegExp('<' + tagName + '[^>]*/>', 'g')) || []).length;
    return { opening, closing, selfClosing, balanced: opening === closing };
}

console.log("Tag Check for InventoryControl.tsx:");
console.log("Dialog:", countTags('Dialog'));
console.log("DialogContent:", countTags('DialogContent'));
console.log("DialogHeader:", countTags('DialogHeader'));
console.log("DialogTitle:", countTags('DialogTitle'));
console.log("div:", countTags('div'));
