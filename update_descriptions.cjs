const fs = require('fs');
let content = fs.readFileSync('src/lib/services.ts', 'utf8');

// Add longDescription to ServicePackage interface
content = content.replace(
  /description: string;/,
  `description: string;\n  longDescription?: string;`
);

const extDesc = `A professional exterior cleaning and protection service. Includes wheel and tire cleaning, foam bath hand wash, paint protection, and streak-free glass.`;

const intDesc = `A thorough interior refresh. Includes complete vacuum, floor mat cleaning, full surface wipe-down, fabric and carpet cleaning, and streak-free glass.`;

const fullDesc = `Everything in Prime Essential Exterior AND Prime Essential Interior combined — a complete inside and out professional detail in one visit.`;

const extLong = `✓ Thorough wheel and tire cleaning including barrel and face
✓ Tire dressing for a clean, finished look
✓ Full vehicle pre-rinse and decontamination treatment
✓ Professional hand wash using premium foam cannon and quality microfiber — safe for all paint finishes
✓ Paint protection coating lasting 2-5 weeks — shields against UV, water spots, and light contamination
✓ Streak-free exterior glass`;

const intLong = `✓ Complete vacuum of all carpets, seats, and crevices — floor mats removed and cleaned separately
✓ Dashboard, steering wheel, center console, and all interior plastics cleaned and detailed
✓ All vinyl and trim surfaces cleaned and protected
✓ Fabric and carpet cleaned and refreshed
✓ Door jamb and trunk jamb cleaning
✓ Streak-free interior and exterior glass
✓ Final walkthrough inspection to ensure nothing is missed`;

const fullLong = `✓ Everything in Prime Essential Exterior
✓ Everything in Prime Essential Interior
✓ Complete inside and out professional detail in one visit`;

// I am going to replace the current long descriptions that have new lines, etc.
// Wait, the current ones have newlines, so we need to be careful with the regex.

// Replace for Exterior
content = content.replace(
  /id: 'prime-essential-exterior',\s+name: 'Prime Essential Exterior',\s+description: `[\s\S]*?`,\s+basePrice:/,
  `id: 'prime-essential-exterior',\n    name: 'Prime Essential Exterior',\n    description: \`${extDesc}\`,\n    longDescription: \`${extLong}\`,\n    basePrice:`
);

// Replace for Interior
content = content.replace(
  /id: 'prime-essential-interior',\s+name: 'Prime Essential Interior',\s+description: `[\s\S]*?`,\s+basePrice:/,
  `id: 'prime-essential-interior',\n    name: 'Prime Essential Interior',\n    description: \`${intDesc}\`,\n    longDescription: \`${intLong}\`,\n    basePrice:`
);

// Replace for Full Detail
content = content.replace(
  /id: 'prime-essential-full',\s+name: 'Prime Essential Full Detail',\s+description: `[\s\S]*?`,\s+basePrice:/,
  `id: 'prime-essential-full',\n    name: 'Prime Essential Full Detail',\n    description: \`${fullDesc}\`,\n    longDescription: \`${fullLong}\`,\n    basePrice:`
);

// And wait, the user said: "Also dlete the last line in the Interior: "✓ Pet hair removal (excessive hair requires add-on)". Should be deleted since this is not true! I do NOT do ANY pet hair removal without the addon!"
// But they already provided the exact checklist they want.
// "Prime Essential Interior — Learn More What's Included (exact order, single column):" and they DID NOT include pet hair. I already used their exact list above. So that handles the pet hair part automatically for the description!

fs.writeFileSync('src/lib/services.ts', content, 'utf8');
console.log('Done services.ts');
