const fs = require('fs');

const targetFile = 'C:/Users/rberu/PDSv6_Supabase/src/pages/PersonalNotes.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// Replace all instances of __sticky_notes__ with __sticky-notes__
content = content.replace(/__sticky_notes__/g, '__sticky-notes__');

fs.writeFileSync(targetFile, content, 'utf8');
