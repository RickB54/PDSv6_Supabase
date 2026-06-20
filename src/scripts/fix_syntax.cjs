const fs = require('fs');
let p = 'C:/Users/rberu/PDSv6_Supabase/src/components/help/helpData.ts';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace(/any notes that don't explicitly/, "any notes that do not explicitly");

fs.writeFileSync(p, txt, 'utf8');
