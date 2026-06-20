const fs = require('fs');
let p = 'C:/Users/rberu/PDSv6_Supabase/src/pages/StickyNotes.tsx';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace(
  /}, \[orderedAllNotes, prefs\.isolate, searchQuery, selectedSection, selectedNotebook, notesStore\.sections,/g,
  "}, [orderedAllNotes, prefs.isolate, searchQuery, selectedSection, selectedNotebook, notesStore.sections, pinFilter,"
);

fs.writeFileSync(p, txt, 'utf8');
