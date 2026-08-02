const fs = require('fs');
let content = fs.readFileSync('src/lib/services.ts', 'utf8');

// Replace instructions
content = content.replace(
  /if \(n\.includes\('wheels & tires first'\)\) return "([^"]+)";/,
  `if (n.includes('wheels & tires first')) return "$1 If Engine Bay Cleaning addon is included, perform engine bay cleaning first before wheels. Use Dirt Buster or Muscle Magic at appropriate dilution. Cover sensitive electronics before applying any chemical or water pressure. Rinse thoroughly and allow to dry before proceeding to wheels.";`
);

content = content.replace(
  /if \(n\.includes\('pre-treat bugs'\)\) return "([^"]+)";/,
  `if (n.includes('pre-treat bugs')) return "$1 Road Warrior works well on bug removal — especially on front grill, hood, and front bumper. SP alternatives: Muscle Magic diluted for heavy grime, or Dirt Buster on concentrated areas. Apply to dry surface before any rinse or foam. Pay extra attention to lower front panels, grille openings, and hood leading edge.";`
);

content = content.replace(
  /if \(n\.includes\('foam bath'\)\) return "([^"]+)";/,
  `if (n.includes('foam bath')) return "$1 Apply thick even layer from top to bottom. Do not let foam dry on paint — work in shade when possible or mist with water if foam starts to dry before dwell time is complete.";`
);

content = content.replace(
  /if \(n\.includes\('drying'\)\) return "([^"]+)";/,
  `if (n.includes('drying')) return "$1 Open all door jambs, trunk, and hood during drying to prevent water dripping after job is complete. Dry jambs as part of this step. Formula 4 at 20:1 acts as drying aid and adds light protection simultaneously.";`
);

content = content.replace(
  /if \(n\.includes\('paint protection'\)\) return "([^"]+)";/,
  `if (n.includes('paint protection')) return "$1 Formula 4 is already applied during drying step and serves dual purpose. This step confirms protection has been applied. No additional product needed unless a separate wax or sealant addon is included.";`
);

content = content.replace(
  /if \(n\.includes\('plastics \/ vinyl \/ trim'\)\) return "([^"]+)";/,
  `if (n.includes('plastics / vinyl / trim')) return "$1 Does It All Enzyme Cleaner for organic stains on vinyl and trim. Green All at appropriate dilution for general plastics. Avoid over-application of dressing near driver's line of sight — glare on dashboard is a safety issue.";`
);

content = content.replace(
  /if \(n\.includes\('fabric \/ carpet'\)\) return "([^"]+)";/,
  `if (n.includes('fabric / carpet')) return "$1 Agitate with stiff carpet brush or drill brush in straight strokes, not circular. Blot with clean microfiber to pull out loosened soil. For organic stains: SP Does It All Enzyme Cleaner — apply, dwell, agitate, blot. Pet hair removal tools (Lilly Brush or 5-pack set) before any chemical application if pet hair is present. Deep Interior Detail or Stain Treatment addon: use extractor at this step.";`
);

content = content.replace(
  /if \(n\.includes\('vacuum'\)\) return "Remove floor mats first\. Vacuum all carpets, seats, and crevices from top to bottom\. Use stiff brush to agitate embedded debris\.";/,
  `if (n.includes('vacuum')) return "Vacuum all carpets, seats, and crevices from top to bottom. Use stiff brush to agitate embedded debris. Blow out interior with compressed air first — vents, seat tracks, under seats, around pedals, rear to front — so vacuum picks up loosened debris. Use crevice tool for seat tracks and tight areas. Work rear to front within each section.";`
);

content = content.replace(
  /if \(n\.includes\('dashboard'\) \|\| n\.includes\('steering wheel'\)\) return "([^"]+)";/,
  `if (n.includes('dashboard') || n.includes('steering wheel')) return "$1 Use Does It All Enzyme Cleaner or Pink Perfection 10:1 for general wipe-down. Detail brush for vent slats, button gaps, and seam areas. Steering wheel gets extra attention — oils and grime build up quickly. Work driver's side front to back, passenger side back to front.";`
);

content = content.replace(
  /if \(n\.includes\('mats'\)\) return "([^"]+)";/,
  `if (n.includes('mats')) return "$1 Use drill brush set — select appropriate brush size and pressure based on mat type and dirtiness. Primary chemicals: Carpet Bomber + Terminator duo at appropriate dilution. Backup when those run low: Zap It at appropriate dilution. For organic stains including urine, blood, food spills, and pet soiling: SP Does It All Enzyme Cleaner — apply, allow to dwell, agitate, and wipe. Rubber mats: rinse thoroughly after agitation. Carpet mats: blot dry, set aside to dry completely before reinstalling.";`
);

content = content.replace(
  /if \(n\.includes\('glass'\)\) return "([^"]+)";/,
  `if (n.includes('glass')) return "$1 Use Invisible Glass — spray on dedicated glass towel only, never directly on glass. Two-pass method: first pass removes product and loosens film, second pass clears streaks. Interior windshield is most difficult — film builds from off-gassing plastics and HVAC. Check from multiple angles in light to confirm no haze.";`
);

content = content.replace(
  /if \(n\.includes\('jamb'\)\) return "([^"]+)";/,
  `if (n.includes('jamb')) return "$1 Use Dirt Buster or APC at appropriate dilution. Detail brush for hinge areas and tight corners. Wipe dry thoroughly. Driver's side front to back, passenger side back to front. Include hood jamb and trunk jamb. Avoid saturating weather stripping — clean and wipe immediately.";`
);

content = content.replace(
  /if \(n\.includes\('inspection'\)\) return "([^"]+)";/,
  `if (n.includes('inspection')) return "$1 Sit in driver's seat and check windshield for haze from multiple angles. Open each door and confirm jambs are clean and dry. Confirm floor mats reinstalled correctly. Interior should smell clean — not chemical. If Deep Interior Detail addon was performed, confirm carpet and seats are dry before returning vehicle.";`
);

// Add missing instructions
const preRinseInstruction = `  if (n.includes('pre-rinse')) return "Skip this step if vehicle is a clean maintenance detail. Rinse top to bottom always. Open doors slightly while rinsing to allow water to flow through jambs without flooding interior.";`;
const handWashInstruction = `  if (n.includes('hand wash')) return "Use multiple clean microfiber towels or wash mitts. Use one side of the towel at a time then flip to the clean side before moving to the next panel. Work top to bottom — roof first, lower rocker panels and bumpers last. Driver's side front to back, passenger side back to front. Never use a towel or mitt that has touched wheels or lower panels on upper paint surfaces.";`;
const finalRinseInstruction = `  if (n.includes('final rinse')) return "Rinse top to bottom. If Clay Bar Decon addon is included, proceed directly to clay bar step while paint is still wet — do not dry first. Use APC as lubricant, work panel by panel, fold clay frequently. Clay is complete when paint feels glass smooth.";`;
const personalItemsInstruction = `  if (n.includes('remove personal items')) return "Remove all personal items, trash, and loose belongings from the vehicle before starting any interior work. Set aside safely for the customer.";`;
const protectantInstruction = `  if (n.includes('interior protectant')) return "Apply P&S Xpress 3:1 or SP Cover All 4:1 to all interior plastics, vinyl, and trim as final protectant and protective coat. Use clean microfiber applicator. Work driver's side front to back, passenger side back to front. Complete this step before cleaning windows so any overspray is caught in the glass step. Note: this step may alternatively be done as the very last step — if so, use extra care not to get any product on windshield, screens, or electronics.";`;

content = content.replace(/(\/\/ 5\. Drying)/, `${preRinseInstruction}\n${handWashInstruction}\n${finalRinseInstruction}\n${personalItemsInstruction}\n${protectantInstruction}\n\n  $1`);

// Package steps modifications
content = content.replace(/Two-Bucket Hand Wash \(Top to Bottom\)/g, 'Hand Wash (Top to Bottom)');

content = content.replace(/{ id: 'int-vac', name: 'Thorough Vacuum \(Top to Bottom\)', category: 'interior' }/g, '{ id: \'int-personal\', name: \'Remove Personal Items & Trash\', category: \'interior\' },\n      { id: \'int-vac\', name: \'Thorough Vacuum (Top to Bottom)\', category: \'interior\' }');

content = content.replace(/{ id: 'int-fabric', name: 'Clean Fabric \/ Carpet \/ Seats', category: 'interior' }/g, '{ id: \'int-fabric\', name: \'Clean Fabric / Carpet / Seats\', category: \'interior\' },\n      { id: \'int-protectant\', name: \'Interior Protectant / Plastics Finisher\', category: \'interior\' }');

content = content.replace(/{ id: 'elite-int-vac', name: 'Thorough Vacuum \(Top to Bottom\)', category: 'interior' }/g, '{ id: \'elite-int-personal\', name: \'Remove Personal Items & Trash\', category: \'interior\' },\n      { id: \'elite-int-vac\', name: \'Thorough Vacuum (Top to Bottom)\', category: \'interior\' }');

content = content.replace(/{ id: 'elite-int-fabric', name: 'Clean Fabric \/ Carpet \/ Seats', category: 'interior' }/g, '{ id: \'elite-int-fabric\', name: \'Clean Fabric / Carpet / Seats\', category: \'interior\' },\n      { id: \'elite-int-protectant\', name: \'Interior Protectant / Plastics Finisher\', category: \'interior\' }');

fs.writeFileSync('src/lib/services.ts', content, 'utf8');
console.log('Done replacing!');
