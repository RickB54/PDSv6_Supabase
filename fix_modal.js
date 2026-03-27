
import fs from 'fs';
const filepath = "c:/Users/rberu/PDSv6_Supabase/src/pages/InventoryControl.tsx";
let content = fs.readFileSync(filepath, 'utf-8');

const target1 = `       if (chemicals.length > 0) setIsDilutionModalOpen(true);`;
const replace1 = `      setIsDilutionModalOpen(true);`;

const target2 = `       if (chemicals.length > 0) setIsRatiosOnlyModalOpen(true);`;
const replace2 = `      setIsRatiosOnlyModalOpen(true);`;

const target3 = `  }, [location.search, chemicals.length]);`;
const replace3 = `  }, [location.search]);`;

content = content.replace(target1, replace1);
content = content.replace(target2, replace2);
content = content.replace(target3, replace3);

fs.writeFileSync(filepath, content);
console.log("Replaced modal trigger logic successfully.");
