const fs = require('fs');
let content = fs.readFileSync('src/lib/services.ts', 'utf8');

const extDesc = `(avg. time: 1.5 - 2 hours)
✓ Thorough wheel and tire cleaning
✓ Foam bath and professional hand wash
✓ Paint decontamination (chemical bug and tar removal)
✓ 1-month spray sealant for gloss and protection
✓ Streak-free exterior glass cleaning
✓ Door jambs degreased and wiped down
✓ Tire shine applied`;

const intDesc = `(avg. time: 2 - 2.5 hours)
✓ Thorough vacuuming (seats, floors, and floor mats)
✓ Drill-brush agitation on all carpets and floor mats
✓ Full interior wipe-down with enzyme cleaner
✓ UV protection applied to all plastics, vinyl, and trim
✓ Streak-free interior glass cleaning
✓ Light stain treatment (heavy staining requires add-on)
✓ Pet hair removal (excessive hair requires add-on)`;

const fullDesc = `(avg. time: 3.5 - 4.5 hours)
Includes all Essential Exterior AND Essential Interior services:

✓ Thorough wheel and tire cleaning
✓ Foam bath and professional hand wash
✓ Paint decontamination (chemical bug and tar removal)
✓ 1-month spray sealant for gloss and protection
✓ Streak-free exterior and interior glass cleaning
✓ Door jambs degreased and wiped down
✓ Tire shine applied
✓ Thorough vacuuming (seats, floors, and floor mats)
✓ Drill-brush agitation on all carpets and floor mats
✓ Full interior wipe-down with enzyme cleaner
✓ UV protection applied to all plastics, vinyl, and trim
✓ Light stain treatment (heavy staining requires add-on)
✓ Pet hair removal (excessive hair requires add-on)`;

content = content.replace(
  /id: 'prime-essential-exterior',\s+name: 'Prime Essential Exterior',\s+description: '[^']+',/,
  `id: 'prime-essential-exterior',\n    name: 'Prime Essential Exterior',\n    description: \`${extDesc}\`, `
);

content = content.replace(
  /id: 'prime-essential-interior',\s+name: 'Prime Essential Interior',\s+description: '[^']+',/,
  `id: 'prime-essential-interior',\n    name: 'Prime Essential Interior',\n    description: \`${intDesc}\`, `
);

content = content.replace(
  /id: 'prime-essential-full',\s+name: 'Prime Essential Full Detail',\s+description: '[^']+',/,
  `id: 'prime-essential-full',\n    name: 'Prime Essential Full Detail',\n    description: \`${fullDesc}\`, `
);

fs.writeFileSync('src/lib/services.ts', content, 'utf8');
console.log('Descriptions updated in services.ts');
