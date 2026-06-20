const fs = require('fs');

// 1. Fix helpData.ts
let helpPath = 'C:/Users/rberu/PDSv6_Supabase/src/components/help/helpData.ts';
let helpContent = fs.readFileSync(helpPath, 'utf8');
if (helpContent.includes('export const stickyNotesHelpTopic')) {
  // Extract it
  const match = helpContent.match(/export const stickyNotesHelpTopic: HelpTopic = \{[\s\S]*?\};\n/);
  if (match) {
    const topicText = match[0];
    helpContent = helpContent.replace(topicText, ''); // remove from bottom
    // insert right before adminMenuTopics
    helpContent = helpContent.replace('export const adminMenuTopics: HelpTopic[] = [', topicText + '\nexport const adminMenuTopics: HelpTopic[] = [');
    fs.writeFileSync(helpPath, helpContent, 'utf8');
  }
}

// 2. Fix StickyNotes.tsx
let stickyPath = 'C:/Users/rberu/PDSv6_Supabase/src/pages/StickyNotes.tsx';
let stickyContent = fs.readFileSync(stickyPath, 'utf8');

// Change default line height
stickyContent = stickyContent.replace(/lineHeight: parseFloat\(localStorage\.getItem\('sticky_notes_lineheight'\) \|\| '1\.5'\)/, "lineHeight: parseFloat(localStorage.getItem('sticky_notes_lineheight') || '1.625')");
stickyContent = stickyContent.replace(/\[1\.0, 1\.5, 2\.0\]/, '[1.0, 1.625, 2.0]');

// Add Sidebar icon to toolbars
// Add Un-Pinned icon to toolbars
const unpinnedBtn = `\n              <Button variant="ghost" size="icon" onClick={() => { setSelectedSection('__unpinned__'); setSelectedNotebook(null); setExpandedNotebook(null); }} className={"text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8" + (selectedSection === '__unpinned__' ? ' text-yellow-500' : '')} title="Un-Pinned Notes"><PinOff className="w-3.5 h-3.5" /></Button>`;
const unpinnedBtnDesktop = `\n              <Button variant="ghost" size="icon" onClick={() => { setSelectedSection('__unpinned__'); setSelectedNotebook(null); setExpandedNotebook(null); }} className={"text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8 sm:h-10 sm:w-10" + (selectedSection === '__unpinned__' ? ' text-yellow-500' : '')} title="Un-Pinned Notes"><PinOff className="w-4 h-4" /></Button>`;

// Find the Sliders buttons and inject next to it
stickyContent = stickyContent.replace(/(<Button variant="ghost" size="icon" onClick=\{[^}]+\} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8" title="Sticky Notes Visibility">\s*<Sliders className="w-3\.5 h-3\.5 text-blue-400" \/>\s*<\/Button>)/, '$1' + unpinnedBtn);
stickyContent = stickyContent.replace(/(<Button variant="ghost" size="icon" onClick=\{[^}]+\} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8 sm:h-10 sm:w-10" title="Sticky Notes Visibility">\s*<Sliders className="w-4 h-4 text-blue-400" \/>\s*<\/Button>)/, '$1' + unpinnedBtnDesktop);

// Also the user wanted the Sidebar menu icon "on the menu" (toolbar)
const sidebarBtnMobile = `\n              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={"text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8" + (isSidebarOpen ? ' text-emerald-400' : '')} title="Toggle Tags Menu"><PanelLeft className="w-3.5 h-3.5" /></Button>`;
const sidebarBtnDesktop = `\n              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={"text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8 sm:h-10 sm:w-10" + (isSidebarOpen ? ' text-emerald-400' : '')} title="Toggle Tags Menu"><PanelLeft className="w-4 h-4" /></Button>`;

stickyContent = stickyContent.replace(/(<Button variant="ghost" size="icon" onClick=\{handleSync\} disabled=\{isSyncing\} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8" title="Sync Stickies">[\s\S]*?<\/Button>)/, sidebarBtnMobile + '\n$1');
stickyContent = stickyContent.replace(/(<Button variant="ghost" size="icon" onClick=\{handleSync\} disabled=\{isSyncing\} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8 sm:h-10 sm:w-10" title="Sync Stickies">[\s\S]*?<\/Button>)/, sidebarBtnDesktop + '\n$1');

// Make sure PinOff and PanelLeft are imported
if(!stickyContent.includes('PinOff')) {
  stickyContent = stickyContent.replace('import {', 'import { PinOff,');
}

fs.writeFileSync(stickyPath, stickyContent, 'utf8');
console.log('Fixed updates!');
