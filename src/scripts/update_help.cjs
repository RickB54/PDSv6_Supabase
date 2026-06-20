const fs = require('fs');
const filepath = 'C:/Users/rberu/PDSv6_Supabase/src/components/help/helpData.ts';
let content = fs.readFileSync(filepath, 'utf8');

const newTopic = `
export const stickyNotesHelpTopic: HelpTopic = {
  id: 'sticky-notes',
  title: 'Sticky Notes',
  summary: 'Your dynamic, tag-based virtual sticky note board.',
  content: [
    '**Overview**: The Sticky Notes module is a flexible space for jotting down quick ideas, tasks, or reminders.',
    '',
    '📝 **1. Creating Notes**',
    'Click the "+ New Sticky" button. You can type freely, add checklists using the toolbar, and assign notes to different submenus (Tags).',
    '',
    '⏰ **2. Reminders & Badges**',
    'Click the alarm bell icon on any note to set a reminder. You will get a popup notification when the time arrives, and the Active Reminders badge will track pending items.',
    '',
    '📌 **3. Organization & Filters**',
    'Pin important notes to keep them at the top. Use the left sidebar to filter by "All Stickies", specific Tag Groups, or "Others (Un-pinned)".',
  ],
  route: '/sticky-notes',
  section: 'menu',
};
`;

if (!content.includes('stickyNotesHelpTopic')) {
  content = content + '\n' + newTopic;
  content = content.replace(/export const adminMenuTopics: HelpTopic\[\] = \[/, 'export const adminMenuTopics: HelpTopic[] = [\n  stickyNotesHelpTopic,');
  content = content.replace(/export const employeeMenuTopics: HelpTopic\[\] = \[/, 'export const employeeMenuTopics: HelpTopic[] = [\n  stickyNotesHelpTopic,');
  fs.writeFileSync(filepath, content, 'utf8');
}
console.log('Updated helpData.ts');
