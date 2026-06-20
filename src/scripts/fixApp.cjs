const fs = require('fs');
const filepath = 'C:/Users/rberu/PDSv6_Supabase/src/App.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// Fix duplicate imports
content = content.replace(/import \{ StickyNotesReminderEngine \} from "@\/components\/StickyNotesReminderEngine";\r?\nimport \{ StickyNotesReminderEngine \} from "@\/components\/StickyNotesReminderEngine";/g, 'import { StickyNotesReminderEngine } from "@/components/StickyNotesReminderEngine";');

// Fix duplicate components
content = content.replace(/<StickyNotesReminderEngine \/>\s*<StickyNotesReminderEngine \/>/g, '<StickyNotesReminderEngine />');

// Just in case we didn't add the component at all
if (!content.includes('<StickyNotesReminderEngine />')) {
  content = content.replace('<GlobalModals />', '<GlobalModals />\n                    <StickyNotesReminderEngine />');
}

fs.writeFileSync(filepath, content, 'utf8');
console.log('Fixed App.tsx');
