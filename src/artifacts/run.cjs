const fs = require('fs');
let c = fs.readFileSync('c:/Users/rberu/PDSv6_Supabase/src/components/help/helpData.ts', 'utf8');
let r = fs.readFileSync('c:/Users/rberu/PDSv6_Supabase/src/artifacts/replace.ts', 'utf8');
const regex = /export const intakeWorkflowsTopic: HelpTopic = \{[\s\S]*?relatedTopicIds: \['prospect-vs-customer', 'booking-flow'\],\r?\n\};/;
c = c.replace(regex, r);
fs.writeFileSync('c:/Users/rberu/PDSv6_Supabase/src/components/help/helpData.ts', c);
console.log('done');
