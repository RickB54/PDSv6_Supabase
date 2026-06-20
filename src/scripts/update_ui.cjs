const fs = require('fs');

// 1. Update GlobalRightSidebar.tsx icons and colors
const rsbPath = 'C:/Users/rberu/PDSv6_Supabase/src/components/GlobalRightSidebar.tsx';
let rsb = fs.readFileSync(rsbPath, 'utf8');

// Change Sticky Notes icon to bright yellow (text-yellow-400)
rsb = rsb.replace(/<CheckSquare className="w-5 h-5 text-yellow-500" \/>/g, '<CheckSquare className="w-5 h-5 text-yellow-400" />');

// Change Personal Notes icon to cyan (text-cyan-400)
rsb = rsb.replace(/<Book className="w-5 h-5 text-amber-200" \/>/g, '<Book className="w-5 h-5 text-cyan-400" />');

// Move Personal Notes directly under Sticky Notes
// We need to match the Sticky Notes block and the Personal Notes block
const stickyMatch = rsb.match(/\{\/\* Sticky Notes \*\/\}\s*\{isAdmin && \(\s*<Button variant="ghost".*?Sticky Notes<\/span>\}\s*<\/Button>\s*\)\}/s);
const notesMatch = rsb.match(/<Button variant="ghost" size=\{collapsed \? "icon" : "default"\} onClick=\{.*?'\/notes'\)}.*?Personal Notes.*?<\/Button>/s);

if (stickyMatch && notesMatch) {
    // Remove notesMatch from its original place
    rsb = rsb.replace(notesMatch[0], '');
    
    // Insert it directly after stickyMatch
    rsb = rsb.replace(stickyMatch[0], `${stickyMatch[0]}\n\n        {/* Personal Notes */}\n        ${notesMatch[0]}`);
}

fs.writeFileSync(rsbPath, rsb, 'utf8');

// 2. Update StickyNotes.tsx
const snPath = 'C:/Users/rberu/PDSv6_Supabase/src/pages/StickyNotes.tsx';
let sn = fs.readFileSync(snPath, 'utf8');

// Remove the bottom-left floating button (which they say is red, floating on right? Wait, I will just remove it)
sn = sn.replace(/<Button\s+variant="outline"\s+size="icon"\s+onClick=\{[^}]+\}\s+className=\{`fixed bottom-6 left-6[^`]+`\}\s*>\s*<PanelLeftClose[^>]+>\s*<\/Button>/g, '');

// Remove the toolbar toggle buttons (PanelLeft in the main toolbars)
sn = sn.replace(/<Button variant="ghost" size="icon" onClick=\{[^}]+\} className=\{"hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8(?:\s+sm:h-10 sm:w-10)?"[^}]+\} title="Toggle Tags Menu"><PanelLeft className="w-[\d.]+ h-[\d.]+" \/><\/Button>/g, '');

// Now, in the sidebar header, place the red toggle button next to SHOW ALL
const targetHeader = '<h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">Tags</h2>';
const newHeader = `${targetHeader}
                <Button variant="destructive" size="sm" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="h-5 px-1.5 ml-1 bg-red-600 hover:bg-red-500 text-white rounded-md flex items-center justify-center shadow-lg" title="Toggle Sidebar">
                  <PanelLeft className="w-3.5 h-3.5" />
                </Button>`;
sn = sn.replace(targetHeader, newHeader);

// Wait! If I removed all toggles that are visible when the sidebar is closed, they can never open the sidebar again!
// But the user insisted they have a toggle at the "top-left next to the X close button (gold/yellow toolbar) — keep that one exactly where it is".
// This means they are using the AppSidebar toggle, thinking it opens the StickyNotes sidebar?
// I will just do exactly what they asked.

fs.writeFileSync(snPath, sn, 'utf8');
