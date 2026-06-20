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

    content = content.replace(/\/corkboard/g, '/sticky-notes');
    content = content.replace(/Corkboard\.tsx/g, 'StickyNotes.tsx');
    content = content.replace(/\.\/pages\/Corkboard/g, './pages/StickyNotes');
    content = content.replace(/import Corkboard from/g, 'import StickyNotes from');
    content = content.replace(/<Corkboard \/>/g, '<StickyNotes />');
    
    content = content.replace(/Corkboard/g, 'Sticky Notes');
    content = content.replace(/corkboard/g, 'sticky_notes');
    
    content = content.replace(/import Sticky Notes from/g, 'import StickyNotes from');
    content = content.replace(/<Sticky Notes \/>/g, '<StickyNotes />');
    
    content = content.replace(/setSticky NotesFilterOpen/g, 'setStickyNotesFilterOpen');
    
    fs.writeFileSync(filepath, content, 'utf8');
}

const stickyPath = 'C:/Users/rberu/PDSv6_Supabase/src/pages/StickyNotes.tsx';
if (fs.existsSync(stickyPath)) {
    let sContent = fs.readFileSync(stickyPath, 'utf8');

    // Remove onSendToNotes props
    sContent = sContent.replace(/onSendToNotes:\s*\([^)]*\)\s*=>\s*void,?\s*/g, '');
    sContent = sContent.replace(/onSendToNotes=\{[^}]+\}\s*/g, '');
    sContent = sContent.replace(/onSendToNotes,\s*/g, '');

    // Remove buttons for sending to notes
    sContent = sContent.replace(/<Button[^>]*title="Send to Personal Notes"[^>]*>.*?<\/Button>/gs, '');
    sContent = sContent.replace(/<DropdownMenuItem[^>]*onClick=\{[^}]*onSendToNotes[^}]*\}[^>]*>.*?<\/DropdownMenuItem>/gs, '');

    // Add useNavigate
    if (!sContent.includes('useNavigate')) {
        sContent = sContent.replace('import React', 'import { useNavigate } from "react-router-dom";\nimport React');
    }

    // Fix component declaration
    sContent = sContent.replace(/export default function StickyNotes\(\{\s*setActivePage\s*\}\s*:\s*\{\s*setActivePage\s*:\s*\([^)]*\)\s*=>\s*void\s*\}\)\s*\{/, 'export default function StickyNotes() {\n  const navigate = useNavigate();');

    // Replace setActivePage calls
    sContent = sContent.replace(/setActivePage\([^)]+\);/g, 'navigate(-1);');
    
    // Make sure we remove the prop if it was just setActivePage: (page: string) => void
    sContent = sContent.replace(/setActivePage,/g, '');

    fs.writeFileSync(stickyPath, sContent, 'utf8');
    console.log('Successfully updated StickyNotes.tsx');
} else {
    console.log('StickyNotes.tsx not found!');
}
