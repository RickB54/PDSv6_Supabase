const fs = require('fs');

const filesToUpdate = [
    'C:/Users/rberu/PDSv6_Supabase/src/App.tsx',
    'C:/Users/rberu/PDSv6_Supabase/src/components/AppSidebar.tsx',
    'C:/Users/rberu/PDSv6_Supabase/src/components/GlobalRightSidebar.tsx',
    'C:/Users/rberu/PDSv6_Supabase/src/components/admin/PrimeCentralHub.tsx',
    'C:/Users/rberu/PDSv6_Supabase/src/pages/PersonalNotes.tsx',
    'C:/Users/rberu/PDSv6_Supabase/src/pages/Settings.tsx',
];

for (const filepath of filesToUpdate) {
    if (!fs.existsSync(filepath)) continue;
    let content = fs.readFileSync(filepath, 'utf8');

    content = content.replace(/([a-z])Sticky Notes/g, '$1StickyNotes');
    content = content.replace(/Sticky Notes([A-Z])/g, 'StickyNotes$1');
    content = content.replace(/Sticky Notes([0-9])/g, 'StickyNotes$1');
    content = content.replace(/hasSticky NotesTag/g, 'hasStickyNotesTag');
    content = content.replace(/isSticky NotesSection/g, 'isStickyNotesSection');
    content = content.replace(/__sticky_notes__/g, '__sticky_notes__'); // Just verifying
    
    fs.writeFileSync(filepath, content, 'utf8');
}
