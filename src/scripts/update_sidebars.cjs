const fs = require('fs');

function updateFileSafe(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  content = content.replace(/(\{ title: 'Sticky Notes'.*?helpTopicId: ')(personal-notes)(')/g, "$1sticky-notes$3");
  fs.writeFileSync(filepath, content, 'utf8');
}

updateFileSafe('C:/Users/rberu/PDSv6_Supabase/src/components/AppSidebar.tsx');
updateFileSafe('C:/Users/rberu/PDSv6_Supabase/src/components/GlobalRightSidebar.tsx');
console.log('Updated sidebars');
