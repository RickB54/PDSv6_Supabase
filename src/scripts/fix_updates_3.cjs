const fs = require('fs');

// 1. Fix helpData.ts Hoisting
let helpPath = 'C:/Users/rberu/PDSv6_Supabase/src/components/help/helpData.ts';
let helpContent = fs.readFileSync(helpPath, 'utf8');

if (helpContent.includes('export const stickyNotesHelpTopic')) {
  const match = helpContent.match(/export const stickyNotesHelpTopic: HelpTopic = \{[\s\S]*?\};\n/);
  if (match) {
    const topicText = match[0];
    helpContent = helpContent.replace(topicText, ''); // Remove it from the bottom
    // Insert it before adminMenuTopics
    helpContent = helpContent.replace('export const adminMenuTopics: HelpTopic[] = [', topicText + '\nexport const adminMenuTopics: HelpTopic[] = [');
    fs.writeFileSync(helpPath, helpContent, 'utf8');
    console.log('Fixed helpData.ts');
  }
}

// 2. Fix StickyNotes.tsx
let stickyPath = 'C:/Users/rberu/PDSv6_Supabase/src/pages/StickyNotes.tsx';
let stickyContent = fs.readFileSync(stickyPath, 'utf8');

// Add the state for pinFilter right after isSidebarOpen
if (!stickyContent.includes('const [pinFilter,')) {
  stickyContent = stickyContent.replace(/const \[isSidebarOpen, setIsSidebarOpen\] = useState\(false\);/, 
    "const [isSidebarOpen, setIsSidebarOpen] = useState(false);\n    const [pinFilter, setPinFilter] = useState<'all'|'pinned'|'unpinned'>('all');");
}

// Add Eye and Pin icons to imports
if (!stickyContent.includes('import { Eye')) {
  stickyContent = stickyContent.replace('import {', 'import { Eye, Pin, PinOff,');
}

// Update activeNotes logic for pinFilter
if (!stickyContent.includes('if (pinFilter === \'pinned\')')) {
  stickyContent = stickyContent.replace(/const activeNotes = useMemo\(\(\) => \{\n\s*let filtered = orderedAllNotes\.filter\(n => \{/, 
    `const activeNotes = useMemo(() => {
      let filtered = orderedAllNotes.filter(n => {
        if (pinFilter === 'pinned' && !n.is_pinned) return false;
        if (pinFilter === 'unpinned' && n.is_pinned) return false;`);
}

// Change default line height and array options
stickyContent = stickyContent.replace(/lineHeight: parseFloat\(localStorage\.getItem\('sticky_notes_lineheight'\) \|\| '1\.5'\)/, "lineHeight: parseFloat(localStorage.getItem('sticky_notes_lineheight') || '1.625')");
stickyContent = stickyContent.replace(/\[1\.0, 1\.5, 2\.0\]/, '[1.0, 1.625, 2.0]');

// Construct Toolbar Buttons: PanelLeft (Sidebar Toggle) and Pin Filter Cycle
const cycleFilterJs = `() => setPinFilter(prev => prev === 'all' ? 'pinned' : prev === 'pinned' ? 'unpinned' : 'all')`;
const cycleIconMobile = `{pinFilter === 'all' ? <Eye className="w-3.5 h-3.5" /> : pinFilter === 'pinned' ? <Pin className="w-3.5 h-3.5 fill-current" /> : <Pin className="w-3.5 h-3.5" />}`;
const cycleIconDesktop = `{pinFilter === 'all' ? <Eye className="w-4 h-4" /> : pinFilter === 'pinned' ? <Pin className="w-4 h-4 fill-current" /> : <Pin className="w-4 h-4" />}`;
const cycleColorClass = `+ (pinFilter === 'all' ? ' text-zinc-400' : ' text-yellow-500')`;
const cycleTitle = `pinFilter === 'all' ? "Showing All Notes" : pinFilter === 'pinned' ? "Showing Pinned Notes" : "Showing Un-pinned Notes"`;

const pinCycleBtnMobile = `\n              <Button variant="ghost" size="icon" onClick={${cycleFilterJs}} className={"hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8" ${cycleColorClass}} title={${cycleTitle}}>\n                ${cycleIconMobile}\n              </Button>`;
const pinCycleBtnDesktop = `\n              <Button variant="ghost" size="icon" onClick={${cycleFilterJs}} className={"hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8 sm:h-10 sm:w-10" ${cycleColorClass}} title={${cycleTitle}}>\n                ${cycleIconDesktop}\n              </Button>`;

const sidebarBtnMobile = `\n              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={"hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8" + (isSidebarOpen ? ' text-emerald-400' : ' text-zinc-400')} title="Toggle Tags Menu"><PanelLeft className="w-3.5 h-3.5" /></Button>`;
const sidebarBtnDesktop = `\n              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={"hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8 sm:h-10 sm:w-10" + (isSidebarOpen ? ' text-emerald-400' : ' text-zinc-400')} title="Toggle Tags Menu"><PanelLeft className="w-4 h-4" /></Button>`;

// Inject next to Sync Stickies
if (!stickyContent.includes('Toggle Tags Menu')) {
  stickyContent = stickyContent.replace(/(<Button variant="ghost" size="icon" onClick=\{handleSync\} disabled=\{isSyncing\} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8" title="Sync Stickies">[\s\S]*?<\/Button>)/, 
    sidebarBtnMobile + pinCycleBtnMobile + '\n$1');
    
  stickyContent = stickyContent.replace(/(<Button variant="ghost" size="icon" onClick=\{handleSync\} disabled=\{isSyncing\} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8 sm:h-10 sm:w-10" title="Sync Stickies">[\s\S]*?<\/Button>)/, 
    sidebarBtnDesktop + pinCycleBtnDesktop + '\n$1');
}

fs.writeFileSync(stickyPath, stickyContent, 'utf8');
console.log('Fixed StickyNotes.tsx');
