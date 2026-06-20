const fs = require('fs');

const file = 'C:/Users/rberu/PDSv6_Supabase/src/pages/PersonalNotes.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /if \(isStickyNotesSection\) \{\s*\/\/ Show all sticky_notes stickies\s*\}/m,
  "if (isStickyNotesSection) {\n                  list = list.filter(n => n.tags?.includes('__sticky-notes__'));\n              }"
);

fs.writeFileSync(file, content, 'utf8');
