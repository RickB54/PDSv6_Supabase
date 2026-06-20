const fs = require('fs');
const filepath = 'C:/Users/rberu/PDSv6_Supabase/src/pages/StickyNotes.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Change Sync Toast Message
content = content.replace(/toast\(\{ title: "Corkboard Synced!" \}\);/g, 'toast({ title: "Personal Notes Synced!" });');

// 2. Add 'Help' button to both Mobile and Desktop toolbars (next to Sync)
const helpMobileStr = `
              <Button variant="ghost" size="icon" onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'sticky-notes' } }))} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8" title="Help Center">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              </Button>`;

const helpDesktopStr = `
              <Button variant="ghost" size="icon" onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'sticky-notes' } }))} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8 sm:h-10 sm:w-10" title="Help Center">
                <HelpCircle className="w-4 h-4 text-blue-400" />
              </Button>`;

content = content.replace(/<Button variant="ghost" size="icon" onClick=\{handleSync\} disabled=\{isSyncing\} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8" title="Sync Stickies">\s*<RefreshCw className=\{`w-3\.5 h-3\.5 \$\{isSyncing \? 'animate-spin text-emerald-500' : ''\}`\} \/>\s*<\/Button>/g, 
  '<Button variant="ghost" size="icon" onClick={handleSync} disabled={isSyncing} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8" title="Sync Stickies">\n                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? \'animate-spin text-emerald-500\' : \'\'}`} />\n              </Button>' + helpMobileStr);

content = content.replace(/<Button variant="ghost" size="icon" onClick=\{handleSync\} disabled=\{isSyncing\} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8 sm:h-10 sm:w-10" title="Sync Stickies">\s*<RefreshCw className=\{`w-4 h-4 \$\{isSyncing \? 'animate-spin text-emerald-500' : ''\}`\} \/>\s*<\/Button>/g, 
  '<Button variant="ghost" size="icon" onClick={handleSync} disabled={isSyncing} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8 sm:h-10 sm:w-10" title="Sync Stickies">\n                <RefreshCw className={`w-4 h-4 ${isSyncing ? \'animate-spin text-emerald-500\' : \'\'}`} />\n              </Button>' + helpDesktopStr);

// 3. Add HelpCircle to imports if missing
if (!content.includes('HelpCircle')) {
  content = content.replace('import {', 'import { HelpCircle,');
}

// 4. Add "Others" to Sidebar
const othersBtnStr = `
                <button 
                  onClick={() => handleCategorySelect(() => { setSelectedSection('__unpinned__'); setSelectedNotebook(null); setExpandedNotebook(null); })}
                  className={\`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors \${selectedSection === '__unpinned__' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}\`}
                >
                  <div className="flex items-center gap-3"><LayoutDashboard className="w-4 h-4 shrink-0" /> Others (Un-pinned)</div>
                  <span className="text-xs opacity-50 ml-2">{visibleNotes.filter(n => !n.is_pinned).length}</span>
                </button>`;

content = content.replace(/<div className="flex items-center gap-3"><LayoutDashboard className="w-4 h-4 shrink-0" \/> All Stickies<\/div>\s*<span className="text-xs opacity-50 ml-2">\{visibleNotes\.filter\(n => !prefs\.isolate \|\| n\.tags\?\.includes\('__sticky-notes__'\)\)\.length\}<\/span>\s*<\/button>/, 
  '$&\n                ' + othersBtnStr);

// 5. Update filter logic for Others
content = content.replace(/if \(selectedSection\) \{\s*return n\.section_id === selectedSection \|\| n\.tags\?\.includes\(\`__section:\$\{selectedSection\}\`\);\s*\}/, 
  `if (selectedSection) {
          if (selectedSection === '__unpinned__') return !n.is_pinned;
          return n.section_id === selectedSection || n.tags?.includes(\`__section:\${selectedSection}\`);
        }`);

fs.writeFileSync(filepath, content, 'utf8');
console.log('Finished updating StickyNotes.tsx');
