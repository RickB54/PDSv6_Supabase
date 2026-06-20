const fs = require('fs');

const file = 'C:/Users/rberu/PDSv6_Supabase/src/pages/PersonalNotes.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const isStickyNotesSection = store\.activeSectionId === 'sticky_notes-stickies';\s*let list = store\.notes\.filter\(n => \{\s*const hasStickyNotesTag = n\.tags\?\.includes\('__sticky-notes__'\);\s*return isStickyNotesSection \? hasStickyNotesTag : !hasStickyNotesTag;\s*\}\);/m,
  "const isStickyNotesSection = store.activeSectionId === 'sticky_notes-stickies';\n          let list = store.notes;"
);

// We need to ensure that the Hierarchy filter actually uses isStickyNotesSection to filter down.
// Let's check what the hierarchy filter looks like right now.
fs.writeFileSync(file, content, 'utf8');
