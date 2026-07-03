const fs = require('fs');
let c = fs.readFileSync('c:/Users/rberu/PDSv6_Supabase/src/components/help/helpData.ts', 'utf8');
c = c.replace(/system's/g, "system\\'s").replace(/Prospect's/g, "Prospect\\'s").replace(/customer's/g, "customer\\'s");
fs.writeFileSync('c:/Users/rberu/PDSv6_Supabase/src/components/help/helpData.ts', c);
