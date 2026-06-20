const fs = require('fs');

// 1. Update StickyNotes.tsx pinFilter logic
let stickyPath = 'C:/Users/rberu/PDSv6_Supabase/src/pages/StickyNotes.tsx';
let stickyContent = fs.readFileSync(stickyPath, 'utf8');

if (!stickyContent.includes('pinFilter === \'pinned\' && !n.is_pinned')) {
  stickyContent = stickyContent.replace(
    /const activeNotes = useMemo\(\(\) => \{\s*let filtered = orderedAllNotes\.filter\(n => \{/,
    `const activeNotes = useMemo(() => {
      let filtered = orderedAllNotes.filter(n => {
        if (pinFilter === 'pinned' && !n.is_pinned) return false;
        if (pinFilter === 'unpinned' && n.is_pinned) return false;`
  );
  fs.writeFileSync(stickyPath, stickyContent, 'utf8');
}

// 2. Update helpData.ts with detailed content
let helpPath = 'C:/Users/rberu/PDSv6_Supabase/src/components/help/helpData.ts';
let helpContent = fs.readFileSync(helpPath, 'utf8');

const detailedHelpContent = `
export const stickyNotesHelpTopic: HelpTopic = {
  id: 'sticky-notes',
  title: 'Sticky Notes',
  summary: 'Your dynamic, tag-based virtual sticky note board.',
  content: [
    '**Overview**: The Sticky Notes module is an advanced, flexible space for jotting down ideas, managing quick tasks, and setting reminders.',
    '',
    '📝 **1. Creating Notes & Formatting**',
    'Click the "+ New Sticky" button. As you type, the system automatically detects special formatting:',
    '• **Numbering System**: If you type \`1.\`, \`a.\`, \`- \`, or \`* \` at the start of a line, it will automatically indent the text appropriately to create clean, readable lists.',
    '• **Checkboxes / Status Boxes**: The system has built-in task tracking! Type the following at the beginning of any line:',
    '  - \`[]\` creates a blank "To Do" box.',
    '  - \`[x]\` creates a completed "Done" box (and crosses out the text).',
    '  - \`[w]\` creates a "Waiting" box (highlights text in yellow).',
    '  - \`[n]\` creates a "Not Done / Cancelled" box (highlights text in red).',
    '  *(You can also use the toolbar while editing to insert these automatically!)*',
    '',
    '⏰ **2. Reminders & Badges**',
    'Click the alarm bell icon on any note to set a custom date/time reminder. When the time arrives, you will get a popup notification. The Active Reminders badge in the menu tracks all your pending items.',
    '',
    '📌 **3. Organization & Filters**',
    'Pin important notes to keep them at the top. Use the Pin icon in the top right toolbar to quickly toggle your view between "Showing All", "Showing Pinned", and "Showing Un-pinned" notes.',
    'You can also use the left sidebar to filter by "All Stickies", specific Tag Groups, or "Others (Un-pinned)".',
    '',
    '⚙️ **4. Sticky Note Settings (Visibility Menu)**',
    'Click the Sliders icon in the top right to customize how your board looks and feels:',
    '• **Animations**: Choose how notes appear when you open/close them (Smooth, Pop, Bounce, Slide, Flip).',
    '• **Tags Visibility**: Toggle whether the colored tag labels are visible at the bottom of each note.',
    '• **Masonry vs Grid Layout**: Choose between a structured Grid layout or a dynamic Masonry layout (where notes stack tightly together like a real corkboard).',
    '• **Isolate Mode**: When enabled, this completely hides any notes that don\'t explicitly have the "__sticky-notes__" system tag, allowing you to hide clutter.',
    '• **Line Spacing**: Set the default spacing between lines of text (the 1.625 Custom setting is perfectly calibrated to align with the Status Boxes!).'
  ],
  route: '/sticky-notes',
  section: 'menu',
};
`;

// Replace the existing stickyNotesHelpTopic
helpContent = helpContent.replace(/export const stickyNotesHelpTopic: HelpTopic = \{[\s\S]*?\};\n/, detailedHelpContent);
fs.writeFileSync(helpPath, helpContent, 'utf8');
