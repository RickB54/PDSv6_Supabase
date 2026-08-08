// Complete service definitions with pricing and steps

export interface ServiceStep {
  id: string;
  name: string;
  category: 'exterior' | 'interior' | 'final';
  instructions?: string;
}

export function getServiceInstructions(name: string, id?: string): string {
  const n = name.toLowerCase();
  const sid = id?.toLowerCase() || "";

  // 0. Check for user-defined overrides in localStorage (Admin edits)
  try {
    const overrides = JSON.parse(localStorage.getItem('stepInstructionOverrides') || '{}');
    const key = sid || n;
    if (overrides[key]) return overrides[key];
  } catch (e) { console.error('Failed to parse instruction overrides:', e); }

  // 1. Precise Prep/Setup steps (by ID)
  if (sid === 'prep-inspect') return "Inspect vehicle (exterior & interior). Walk around the vehicle and note existing damage (dents, scratches) on the diagram. Confirm vehicle condition with customer if present.";
  if (sid === 'prep-tools') return "Gather tools & chemicals. Ensure pressure washer, foam cannon, buckets, mitts, and brushes are ready. Check water tank and generator fuel levels.";
  if (sid === 'prep-walkaround') return "Customer walkaround & expectations. Review the service package with the client. Confirm any special requests or areas of concern.";

  // 2. Wheels & Tires
  if (n.includes('wheels & tires first')) return "Chemical: Dark Fury 4:1 or 7:1 (Alternative: Meguiar's APC 4:1). Application: Agitate with brush. Dwell Time: No dwell needed. If Engine Bay Cleaning addon is included, perform engine bay cleaning first before wheels. Use Dirt Buster or Muscle Magic at appropriate dilution. Cover sensitive electronics before applying any chemical or water pressure. Rinse thoroughly and allow to dry before proceeding to wheels.";

  // 3. Pre-Treat
  if (n.includes('pre-treat bugs')) return "Chemical: Road Warrior 4:1 (Alternative: Pink Perfection 4:1). Dwell Time: 3–5 minutes. Application Tip: Spray on dry surface before rinsing. Road Warrior works well on bug removal — especially on front grill, hood, and front bumper. SP alternatives: Muscle Magic diluted for heavy grime, or Dirt Buster on concentrated areas. Apply to dry surface before any rinse or foam. Pay extra attention to lower front panels, grille openings, and hood leading edge.";

  // 4. Foam Bath
  if (n.includes('foam bath')) return "Chemical: Cherry Foam 5:1 or McGuire’s Gold Class 5:1. Dwell Time: 3–5 minutes. Application Tip: Apply thick layer of foam and let it dwell to loosen grime. Apply thick even layer from top to bottom. Do not let foam dry on paint — work in shade when possible or mist with water if foam starts to dry before dwell time is complete.";

    if (n.includes('pre-rinse')) return "Skip this step if vehicle is a clean maintenance detail. Rinse top to bottom always. Open doors slightly while rinsing to allow water to flow through jambs without flooding interior.";
  if (n.includes('hand wash')) return "Use multiple clean microfiber towels or wash mitts. Use one side of the towel at a time then flip to the clean side before moving to the next panel. Work top to bottom — roof first, lower rocker panels and bumpers last. Driver's side front to back, passenger side back to front. Never use a towel or mitt that has touched wheels or lower panels on upper paint surfaces.";
  if (n.includes('final rinse')) return "Rinse top to bottom. If Clay Bar Decon addon is included, proceed directly to clay bar step while paint is still wet — do not dry first. Use APC as lubricant, work panel by panel, fold clay frequently. Clay is complete when paint feels glass smooth.";
  if (n.includes('remove personal items')) return "Remove all personal items, trash, and loose belongings from the vehicle before starting any interior work. Set aside safely for the customer.";
  if (n.includes('interior protectant')) return "Apply P&S Xpress 3:1 or SP Cover All 4:1 to all interior plastics, vinyl, and trim as final protectant and protective coat. Use clean microfiber applicator. Work driver's side front to back, passenger side back to front. Complete this step before cleaning windows so any overspray is caught in the glass step. Note: this step may alternatively be done as the very last step — if so, use extra care not to get any product on windshield, screens, or electronics.";

  // 5. Drying
  if (n.includes('drying')) return "Chemical: Formula 4 20:1 sprayed on wet paint. Application Tip: Use a clean microfiber drying towel or air blower. Open all door jambs, trunk, and hood during drying to prevent water dripping after job is complete. Dry jambs as part of this step. Formula 4 at 20:1 acts as drying aid and adds light protection simultaneously.";

  // 6. Paint Protection
  if (n.includes('paint protection')) return "Chemical: Formula 4 20:1. Application Tip: Formula 4 is used as a drying aid AND minimal protection (lasts 2 - 5 or 6 weeks). Formula 4 is already applied during drying step and serves dual purpose. This step confirms protection has been applied. No additional product needed unless a separate wax or sealant addon is included.";

  // 7. Interior Plastics / Trim
  if (n.includes('plastics / vinyl / trim')) return "Chemical: Pink Perfection 10:1, final pass with P&S Xpress 3:1 or Cover All 4:1. Application Tip: Use a soft brush for crevices and wipe with clean microfiber. Does It All Enzyme Cleaner for organic stains on vinyl and trim. Green All at appropriate dilution for general plastics. Avoid over-application of dressing near driver's line of sight — glare on dashboard is a safety issue.";

  // 8. Fabric / Carpet
  if (n.includes('fabric / carpet')) return "Chemical: Carpet Bomber 7:1 (standard) or 5:1 (heavy). Application Tip: Agitate with brush and pull out dirt with extractor if needed. Agitate with stiff carpet brush or drill brush in straight strokes, not circular. Blot with clean microfiber to pull out loosened soil. For organic stains: SP Does It All Enzyme Cleaner — apply, dwell, agitate, blot. Pet hair removal tools (Lilly Brush or 5-pack set) before any chemical application if pet hair is present. Deep Interior Detail or Stain Treatment addon: use extractor at this step.";

  // 9. Odor & Stain
  if (n.includes('odor & stain treatment')) return "Chemical: Terminator RTU. Application Tip: Targeted odor neutralization (food, smoke, pet). Do not mask—neutralize.";

  // 10. General Interior
  if (n.includes('vacuum')) return "Vacuum all carpets, seats, and crevices from top to bottom. Use stiff brush to agitate embedded debris. Blow out interior with compressed air first — vents, seat tracks, under seats, around pedals, rear to front — so vacuum picks up loosened debris. Use crevice tool for seat tracks and tight areas. Work rear to front within each section.";
  if (n.includes('dashboard') || n.includes('steering wheel')) return "Use a soft brush and microfiber to clean the instrument cluster, steering wheel buttons, and dashboard seams. Use Does It All Enzyme Cleaner or Pink Perfection 10:1 for general wipe-down. Detail brush for vent slats, button gaps, and seam areas. Steering wheel gets extra attention — oils and grime build up quickly. Work driver's side front to back, passenger side back to front.";
  if (n.includes('mats')) return "Remove mats from vehicle. Pressure wash rubber mats or vacuum and detail carpet mats. Dry completely before reinstalling. Use drill brush set — select appropriate brush size and pressure based on mat type and dirtiness. Primary chemicals: Carpet Bomber + Terminator duo at appropriate dilution. Backup when those run low: Zap It at appropriate dilution. For organic stains including urine, blood, food spills, and pet soiling: SP Does It All Enzyme Cleaner — apply, allow to dwell, agitate, and wipe. Rubber mats: rinse thoroughly after agitation. Carpet mats: blot dry, set aside to dry completely before reinstalling.";
  if (n.includes('glass')) return "Use distinct glass towel. Spray cleaner on towel, not glass (to avoid overspray). Wipe in box pattern for streak-free finish. Use Invisible Glass — spray on dedicated glass towel only, never directly on glass. Two-pass method: first pass removes product and loosens film, second pass clears streaks. Interior windshield is most difficult — film builds from off-gassing plastics and HVAC. Check from multiple angles in light to confirm no haze.";
  if (n.includes('jamb')) return "Degrease and wipe all door, trunk, and hood jambs. Ensure no cleaner residue remains on weather stripping. Use Dirt Buster or APC at appropriate dilution. Detail brush for hinge areas and tight corners. Wipe dry thoroughly. Driver's side front to back, passenger side back to front. Include hood jamb and trunk jamb. Avoid saturating weather stripping — clean and wipe immediately.";
  if (n.includes('inspection')) return "Final walkthrough of the interior to ensure all standards are met and no spots were missed. Sit in driver's seat and check windshield for haze from multiple angles. Open each door and confirm jambs are clean and dry. Confirm floor mats reinstalled correctly. Interior should smell clean — not chemical. If Deep Interior Detail addon was performed, confirm carpet and seats are dry before returning vehicle.";

  return "Perform this step with care. Ensure quality standards are met before proceeding.";
}

export type VehicleType = 'compact' | 'midsize' | 'truck' | 'luxury';

export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  basePrice: number;
  pricing: Record<VehicleType, number>;
  steps: ServiceStep[];
}

export interface AddOn {
  id: string;
  name: string;
  category?: 'exterior' | 'interior' | 'final';
  description?: string;
  basePrice: number;
  pricing: Record<VehicleType, number>;
  applicableVehicleTypes?: VehicleType[];
  /** Set to false to hide this add-on from all customer-facing forms without deleting it */
  active?: boolean;
}

// Pricing overrides (persisted) allow admin to update package pricing globally
function getPricingOverrides(): Record<string, Partial<ServicePackage["pricing"]>> {
  try {
    return JSON.parse(localStorage.getItem("servicePricingOverrides") || "{}");
  } catch { return {}; }
}

const overrides = getPricingOverrides();

/** 
 * 2026 PRICING PACKAGES (ACTIVE)
 * Consolidated into Prime Essential and Prime Elite tiers.
 */
export const servicePackages: ServicePackage[] = [
  // --- PRIME ESSENTIAL ---
  {
    id: 'prime-essential-exterior',
    name: 'Prime Essential Exterior',
    description: `A professional exterior cleaning and protection service. Includes wheel and tire cleaning, foam bath hand wash, paint protection, and streak-free glass.`,
    longDescription: `✓ Thorough wheel and tire cleaning including barrel and face
✓ Tire dressing for a clean, finished look
✓ Full vehicle pre-rinse and decontamination treatment
✓ Professional hand wash using premium foam cannon and quality microfiber — safe for all paint finishes
✓ Paint protection coating lasting 2-5 weeks — shields against UV, water spots, and light contamination
✓ Streak-free exterior glass`,
    basePrice: 99,
    pricing: { compact: 99, midsize: 121, truck: 132, luxury: 143 },
    steps: [
      { id: 'ext-wheels', name: 'Wheels & Tires First', category: 'exterior' },
      { id: 'ext-rinse', name: 'Pre-Rinse whole vehicle', category: 'exterior' },
      { id: 'ext-bugs', name: 'Pre-Treat bugs / heavy grime', category: 'exterior' },
      { id: 'ext-foam', name: 'Foam Bath', category: 'exterior' },
      { id: 'ext-wash', name: 'Hand Wash (Top to Bottom)', category: 'exterior' },
      { id: 'ext-final-rinse', name: 'Final Rinse', category: 'exterior' },
      { id: 'ext-drying', name: 'Drying', category: 'exterior' },
      { id: 'ext-protection', name: 'Paint Protection', category: 'exterior' }
    ]
  },
  {
    id: 'prime-essential-interior',
    name: 'Prime Essential Interior',
    description: `A thorough interior refresh. Includes complete vacuum, floor mat cleaning, full surface wipe-down, fabric and carpet cleaning, and streak-free glass.`,
    longDescription: `✓ Complete vacuum of all carpets, seats, and crevices — floor mats removed and cleaned separately
✓ Dashboard, steering wheel, center console, and all interior plastics cleaned and detailed
✓ All vinyl and trim surfaces cleaned and protected
✓ Fabric and carpet cleaned and refreshed
✓ Door jamb and trunk jamb cleaning
✓ Streak-free interior and exterior glass
✓ Final walkthrough inspection to ensure nothing is missed`,
    basePrice: 198,
    pricing: { compact: 198, midsize: 220, truck: 231, luxury: 264 },
    steps: [
      { id: 'int-personal', name: 'Remove Personal Items & Trash', category: 'interior' },
      { id: 'int-vac', name: 'Thorough Vacuum (Top to Bottom)', category: 'interior' },
      { id: 'int-mats', name: 'Clean Floor Mats & Area Rugs', category: 'interior' },
      { id: 'int-dash', name: 'Clean Dashboard, Steering Wheel & Console', category: 'interior' },
      { id: 'int-plastics', name: 'Clean All Interior Plastics / Vinyl / Trim', category: 'interior' },
      { id: 'int-fabric', name: 'Clean Fabric / Carpet / Seats', category: 'interior' },
      { id: 'int-protectant', name: 'Interior Protectant / Plastics Finisher', category: 'interior' },
      { id: 'int-glass', name: 'Windows & Glass (streak-free)', category: 'interior' },
      { id: 'int-jambs', name: 'Clean Door Jambs & Trunk Jambs', category: 'interior' },
      { id: 'int-inspection', name: 'Final Interior Inspection', category: 'interior' }
    ]
  },
  {
    id: 'prime-essential-full',
    name: 'Prime Essential Full Detail',
    description: `Everything in Prime Essential Exterior AND Prime Essential Interior combined — a complete inside and out professional detail in one visit.`,
    longDescription: `✓ Everything in Prime Essential Exterior
✓ Everything in Prime Essential Interior
✓ Complete inside and out professional detail in one visit`,
    basePrice: 286,
    pricing: { compact: 286, midsize: 327, truck: 351, luxury: 388 },
    steps: [
      { id: 'ext-wheels', name: 'Wheels & Tires First', category: 'exterior' },
      { id: 'ext-rinse', name: 'Pre-Rinse whole vehicle', category: 'exterior' },
      { id: 'ext-bugs', name: 'Pre-Treat bugs / heavy grime', category: 'exterior' },
      { id: 'ext-foam', name: 'Foam Bath', category: 'exterior' },
      { id: 'ext-wash', name: 'Hand Wash (Top to Bottom)', category: 'exterior' },
      { id: 'ext-final-rinse', name: 'Final Rinse', category: 'exterior' },
      { id: 'ext-drying', name: 'Drying', category: 'exterior' },
      { id: 'ext-protection', name: 'Paint Protection', category: 'exterior' },
      { id: 'int-personal', name: 'Remove Personal Items & Trash', category: 'interior' },
      { id: 'int-vac', name: 'Thorough Vacuum (Top to Bottom)', category: 'interior' },
      { id: 'int-mats', name: 'Clean Floor Mats & Area Rugs', category: 'interior' },
      { id: 'int-dash', name: 'Clean Dashboard, Steering Wheel & Console', category: 'interior' },
      { id: 'int-plastics', name: 'Clean All Interior Plastics / Vinyl / Trim', category: 'interior' },
      { id: 'int-fabric', name: 'Clean Fabric / Carpet / Seats', category: 'interior' },
      { id: 'int-protectant', name: 'Interior Protectant / Plastics Finisher', category: 'interior' },
      { id: 'int-glass', name: 'Windows & Glass (streak-free)', category: 'interior' },
      { id: 'int-jambs', name: 'Clean Door Jambs & Trunk Jambs', category: 'interior' },
      { id: 'int-inspection', name: 'Final Interior Inspection', category: 'interior' }
    ]
  },
  // --- PRIME ELITE ---
  {
    id: 'prime-elite-exterior',
    name: 'Prime Elite Exterior',
    description: 'Advanced exterior restoration and protection.',
    basePrice: 176,
    pricing: { compact: 176, midsize: 198, truck: 209, luxury: 231 },
    steps: [
      { id: 'elite-ext-wheels', name: 'Wheels & Tires First', category: 'exterior' },
      { id: 'elite-ext-rinse', name: 'Pre-Rinse whole vehicle', category: 'exterior' },
      { id: 'elite-ext-bugs', name: 'Pre-Treat bugs / heavy grime', category: 'exterior' },
      { id: 'elite-ext-foam', name: 'Foam Bath', category: 'exterior' },
      { id: 'elite-well', name: 'Wheel Wells Cleaned', category: 'exterior' },
      { id: 'elite-clay', name: 'Clay Bar Treatment', category: 'exterior' },
      { id: 'elite-decon', name: 'Paint Decontamination', category: 'exterior' },
      { id: 'elite-ext-wash', name: 'Hand Wash (Top to Bottom)', category: 'exterior' },
      { id: 'elite-ext-final-rinse', name: 'Final Rinse', category: 'exterior' },
      { id: 'elite-ext-drying', name: 'Drying', category: 'exterior' },
      { id: 'elite-trim', name: 'Black Trim Restore & UV Protection', category: 'exterior' },
      { id: 'elite-ext-protection', name: 'Paint Protection', category: 'exterior' },
      { id: 'elite-ext-win', name: 'Windows & Glass (streak-free)', category: 'exterior' },
      { id: 'elite-ext-jambs', name: 'Clean Door Jambs & Trunk Jambs', category: 'exterior' }
    ]
  },
  {
    id: 'prime-elite-interior',
    name: 'Prime Elite Interior',
    description: 'A deep interior cleaning restoration.',
    basePrice: 429,
    pricing: { compact: 429, midsize: 523, truck: 545, luxury: 649 },
    steps: [
      { id: 'elite-int-personal', name: 'Remove Personal Items & Trash', category: 'interior' },
      { id: 'elite-int-vac', name: 'Thorough Vacuum (Top to Bottom)', category: 'interior' },
      { id: 'elite-int-mats', name: 'Clean Floor Mats & Area Rugs', category: 'interior' },
      { id: 'elite-int-dash', name: 'Clean Dashboard, Steering Wheel & Console', category: 'interior' },
      { id: 'elite-int-plastics', name: 'Clean All Interior Plastics / Vinyl / Trim', category: 'interior' },
      { id: 'elite-int-fabric', name: 'Clean Fabric / Carpet / Seats', category: 'interior' },
      { id: 'elite-int-protectant', name: 'Interior Protectant / Plastics Finisher', category: 'interior' },
      { id: 'elite-int-odor', name: 'Odor & Stain Treatment', category: 'interior' },
      { id: 'elite-int-trunk', name: 'Vacuum Trunk Space', category: 'interior' },
      { id: 'elite-int-panels', name: 'Steam Clean All Panels', category: 'interior' },
      { id: 'elite-int-vents', name: 'Steam Clean All Vents', category: 'interior' },
      { id: 'elite-int-carpet', name: 'Steam Clean & Extraction on Carpets', category: 'interior' },
      { id: 'elite-int-seat-steam', name: 'Steam Clean & Extraction on Seats', category: 'interior' },
      { id: 'elite-int-upholstery-steam', name: 'Steam Clean & Extraction on Upholstery', category: 'interior' },
      { id: 'elite-int-cond', name: 'Condition & Protect Leather Seats', category: 'interior' },
      { id: 'elite-int-win', name: 'Windows & Glass (streak-free)', category: 'interior' },
      { id: 'elite-int-jambs', name: 'Clean Door Jambs & Trunk Jambs', category: 'interior' },
      { id: 'elite-int-inspection', name: 'Final Interior Inspection', category: 'interior' }
    ]
  },
  {
    id: 'prime-elite-full',
    name: 'Prime Elite Full Detail',
    description: 'The ultimate restoration and protection package.',
    basePrice: 545,
    pricing: { compact: 545, midsize: 655, truck: 765, luxury: 935 },
    steps: [
      { id: 'elite-full-wheels', name: 'Wheels & Tires First', category: 'exterior' },
      { id: 'elite-full-rinse', name: 'Pre-Rinse whole vehicle', category: 'exterior' },
      { id: 'elite-full-bugs', name: 'Pre-Treat bugs / heavy grime', category: 'exterior' },
      { id: 'elite-full-foam', name: 'Foam Bath', category: 'exterior' },
      { id: 'elite-full-well', name: 'Wheel Wells Cleaned', category: 'exterior' },
      { id: 'elite-full-clay', name: 'Clay Bar Treatment', category: 'exterior' },
      { id: 'elite-full-decon', name: 'Paint Decontamination', category: 'exterior' },
      { id: 'elite-full-wash', name: 'Hand Wash (Top to Bottom)', category: 'exterior' },
      { id: 'elite-full-final-rinse', name: 'Final Rinse', category: 'exterior' },
      { id: 'elite-full-drying', name: 'Drying', category: 'exterior' },
      { id: 'elite-full-trim', name: 'Black Trim Restore & UV Protection', category: 'exterior' },
      { id: 'elite-full-ceramic', name: 'Premium Ceramic Sealant Protection', category: 'exterior' },
      { id: 'elite-full-ext-protection', name: 'Paint Protection', category: 'exterior' },
      { id: 'elite-full-personal', name: 'Remove Personal Items & Trash', category: 'interior' },
      { id: 'elite-full-vac', name: 'Thorough Vacuum (Top to Bottom)', category: 'interior' },
      { id: 'elite-full-mats', name: 'Clean Floor Mats & Area Rugs', category: 'interior' },
      { id: 'elite-full-dash', name: 'Clean Dashboard, Steering Wheel & Console', category: 'interior' },
      { id: 'elite-full-plastics', name: 'Clean All Interior Plastics / Vinyl / Trim', category: 'interior' },
      { id: 'elite-full-fabric', name: 'Clean Fabric / Carpet / Seats', category: 'interior' },
      { id: 'elite-full-protectant', name: 'Interior Protectant / Plastics Finisher', category: 'interior' },
      { id: 'elite-full-odor', name: 'Odor & Stain Treatment', category: 'interior' },
      { id: 'elite-full-trunk', name: 'Vacuum Trunk Space', category: 'interior' },
      { id: 'elite-full-panels', name: 'Steam Clean All Panels', category: 'interior' },
      { id: 'elite-full-vents', name: 'Steam Clean All Vents', category: 'interior' },
      { id: 'elite-full-carpet', name: 'Steam Clean & Extraction on Carpets', category: 'interior' },
      { id: 'elite-full-seats', name: 'Steam Clean & Extraction on Seats', category: 'interior' },
      { id: 'elite-full-upholstery', name: 'Steam Clean & Extraction on Upholstery', category: 'interior' },
      { id: 'elite-full-leather', name: 'Condition & Protect Leather Seats', category: 'interior' },
      { id: 'elite-full-win', name: 'Windows & Glass (streak-free)', category: 'interior' },
      { id: 'elite-full-jambs', name: 'Clean Door Jambs & Trunk Jambs', category: 'interior' },
      { id: 'elite-full-inspection', name: 'Final Interior Inspection', category: 'interior' }
    ]
  },
];

/* REFERENCE: 2025 Archived Packages (Refer to Supabase for full history)
{ id: 'basic-exterior', name: 'Basic Exterior Wash', ... },
{ id: 'express-wax', name: 'Express Wash & Wax', ... },
{ id: 'full-exterior', name: 'Full Exterior Detail', ... },
{ id: 'interior-cleaning', name: 'Interior Cleaning', ... },
{ id: 'premium-detail', name: 'Premium Detail', ... }
*/

export const addOns: AddOn[] = [
  // --- ACTIVE (shown on customer-facing forms) ---
  { id: 'wheel-cleaning', name: 'Wheel Cleaning & Tire Detail', category: 'exterior', description: 'A thorough hand cleaning of all four wheels and tires including rim faces, spokes, lug nut areas, and wheel wells. Tires are scrubbed clean of built-up road grime and brake dust, and finished with a professional tire shine dressing for a deep, rich black appearance. This add-on goes well beyond the basic wheel rinse included in a standard exterior wash — it is a dedicated, detail-level treatment that leaves every wheel and tire looking showroom-ready. Ideal for vehicles with heavily soiled wheels, brake dust buildup, or tires that have lost their color and shine.', basePrice: 25, pricing: { compact: 25, midsize: 30, truck: 40, luxury: 44 }, active: true },
  { id: 'large-wheel-cleaning', name: 'Large Sized Wheel Cleaning', category: 'exterior', description: 'A dedicated premium cleaning service for oversized and large-format wheels found on trucks, large SUVs, and luxury vehicles. Includes deep brake dust extraction, inner barrel decontamination, lug nut cleaning, and wheel well treatment. Priced separately due to the additional time and product required for larger wheel surfaces.', basePrice: 35, pricing: { compact: 0, midsize: 35, truck: 50, luxury: 65 }, applicableVehicleTypes: ['midsize', 'truck', 'luxury'], active: true },
  { id: 'leather-conditioning', name: 'Leather Conditioning', category: 'interior', description: 'Deep-cleaning and premium nourishing treatment for all leather surfaces. We use pH-balanced cleaners followed by a rich, non-greasy conditioner that restores natural suppleness and protects against future UV fading and cracking.', basePrice: 28, pricing: { compact: 28, midsize: 33, truck: 39, luxury: 50 }, active: true },
  { id: 'engine-bay', name: 'Engine Bay Cleaning', category: 'exterior', description: 'A meticulous, low-pressure detailing of the engine bay. We safely degrease all surfaces, agitate built-up grime, and apply a specialized high-heat dressing to rubber and plastic components for a clean, factory-fresh appearance.', basePrice: 77, pricing: { compact: 77, midsize: 94, truck: 110, luxury: 132 }, active: true },
  { id: 'pet-hair', name: 'Pet Hair Removal', category: 'interior', description: 'An intensive interior add-on focused on the specialized removal of stubborn, embedded pet hair from carpets, fabric seats, and hard-to-reach crevices using specialized brushes and high-powered extraction.', basePrice: 83, pricing: { compact: 83, midsize: 94, truck: 105, luxury: 116 }, active: true },
  { id: 'stain-treatment', name: 'Stain Treatment', category: 'interior', description: 'Professional-grade spot treatment and deep-extraction for stubborn interior stains (coffee, mud, food, etc.). We use specialized enzymes and spotters tailored to the specific type of stain to lift it without damaging the upholstery.', basePrice: 88, pricing: { compact: 88, midsize: 99, truck: 110, luxury: 121 }, active: true },
  { id: 'odor-eliminator', name: 'Odor Eliminator', category: 'interior', description: 'Targeted application of professional-grade odor neutralizing agents. We don\'t just mask the smell; we use chemical neutralizers to attack and eliminate the source of minor food, smoke, or pet odors.', basePrice: 17, pricing: { compact: 17, midsize: 22, truck: 28, luxury: 39 }, active: true },
  { id: 'ceramic-protection-1yr', name: '1-Year Ceramic Protection', category: 'exterior', description: 'Premium Graphene Ceramic Spray Coating applied after a thorough prep wash. It chemically bonds to the paint to deliver up to 1 year of superior high-gloss shine, extreme water beading, and simplified maintenance washes.', basePrice: 87, pricing: { compact: 87, midsize: 120, truck: 142, luxury: 164 }, active: true },
  { id: '3rd-row-seating', name: '3rd Row Seating', category: 'interior', description: 'An additional interior detail extension required for vehicles equipped with a third row of seating. This covers the extra time and labor needed to thoroughly vacuum, clean, and detail the rear-most passenger area and cargo space.', basePrice: 55, pricing: { compact: 55, midsize: 55, truck: 55, luxury: 55 }, applicableVehicleTypes: ['truck', 'luxury'], active: true },
  { 
    id: 'water-spot-removal', 
    name: 'Water Spot Removal', 
    category: 'exterior', 
    description: `Removes stubborn mineral/water deposits from paint, glass, chrome, and trim using specialized acid-safe cleaners and careful hand labor — an intensive process, priced accordingly. Best done before any wax, sealant, or ceramic coating for a clean, defect-free finish.

Benefits:
✓ Restores flawless clarity to paint and exterior glass
✓ Eliminates etched-in calcium and hard water mineral deposits
✓ Prepares surfaces perfectly for waxes, sealants, or ceramic coatings
✓ Prevents permanent clear-coat damage caused by untreated mineral etching

Process & Precautions:
We utilize specialized, professional-grade acid-based mineral descalers designed specifically for automotive clear coats. These chemicals dissolve calcium deposits safely without abrasive damage. The process is performed panel-by-panel entirely by hand in a controlled environment to ensure the acid is neutralized immediately, guaranteeing zero harm to your vehicle's paint, plastics, or trim.

Estimated Time & Pricing:
• Compact/Sedan: ~1.25 hrs | $125
• Mid-Size/SUV: ~1.75 hrs | $175
• Truck/Van/Large SUV: ~2.5 hrs | $250
• Luxury/High-End: ~2.75 hrs | $275`, 
    basePrice: 125, 
    pricing: { compact: 125, midsize: 175, truck: 250, luxury: 275 }, 
    active: true 
  },

  // --- INACTIVE (set active: false to hide from customer forms; re-enable by setting active: true) ---
  { id: 'clay-bar', name: 'Clay Bar & Iron Decontamination', category: 'exterior', description: 'A professional deep decontamination process using specialized clay to pull embedded contaminants, industrial fallout, and iron particles from the clear coat, leaving the paint as smooth as glass.', basePrice: 88, pricing: { compact: 88, midsize: 99, truck: 110, luxury: 132 }, active: false },
  { id: 'headlight-restoration', name: 'Headlight Restoration', category: 'exterior', description: 'Multi-stage wet sanding, compounding, and polishing process to completely remove heavy oxidation and yellowing from headlight lenses, followed by a UV-protective sealant to restore factory clarity and nighttime visibility.', basePrice: 39, pricing: { compact: 39, midsize: 44, truck: 55, luxury: 72 }, active: false },
  { id: 'ceramic-trim-coat', name: 'Ceramic Trim Coat Restoration', category: 'exterior', description: 'Advanced restoration and protection for faded exterior plastics. We strip old dressings and apply a true ceramic coating that permanently bonds to the trim, restoring deep, rich color and providing long-lasting UV defense.', basePrice: 66, pricing: { compact: 66, midsize: 83, truck: 105, luxury: 138 }, active: false },
  { id: 'scratch-repair', name: 'Scratch Repair', category: 'exterior', description: 'Targeted correction for minor clear-coat scratches and scuffs. We use machine polishing and careful touch-up techniques to significantly reduce or eliminate the visibility of surface-level defects.', basePrice: 220, pricing: { compact: 220, midsize: 220, truck: 220, luxury: 220 }, active: false },
  { id: 'deep-interior', name: 'Deep Interior Detail', category: 'interior', description: 'The ultimate interior reset. Includes intensive steam cleaning, deep shampooing and hot-water extraction of all carpets and fabric seats, and meticulous detailing of every crevice, vent, and compartment.', basePrice: 165, pricing: { compact: 165, midsize: 193, truck: 220, luxury: 248 }, active: false },
  { id: 'paint-sealant', name: 'Paint Sealant Application', category: 'exterior', description: 'Application of an advanced, durable synthetic polymer sealant. This provides superior gloss enhancement and creates a tough barrier against environmental contaminants, outlasting traditional carnauba waxes.', basePrice: 99, pricing: { compact: 99, midsize: 121, truck: 143, luxury: 176 }, active: false },
  { id: 'paint-touch-up', name: 'Minor Paint Touch-Up', category: 'exterior', description: 'Precision touch-up application for small rock chips and deep scratches. We clean the defect and carefully fill it with color-matched paint to prevent rust and improve the overall visual appearance of the panel.', basePrice: 83, pricing: { compact: 83, midsize: 99, truck: 121, luxury: 154 }, active: false },
  { id: 'ceramic-coating', name: 'Ceramic Coating', category: 'exterior', description: 'A true ceramic coating application that bonds at a molecular level with your clear coat. Delivers intense gloss, extreme hydrophobic water-beading, and robust protection against chemical etching and UV rays.', basePrice: 550, pricing: { compact: 550, midsize: 550, truck: 605, luxury: 660 }, active: false },
  { id: 'paint-correction', name: 'Paint Correction', category: 'exterior', description: 'A highly skilled, multi-stage machine compounding and polishing process designed to level the clear coat, permanently removing swirl marks, holograms, and moderate scratches to restore a flawless, mirror-like finish.', basePrice: 330, pricing: { compact: 330, midsize: 385, truck: 440, luxury: 495 }, active: false },
  { id: 'odor-treatment', name: 'Odor Elimination Treatment', category: 'interior', description: 'An intensive, commercial-grade ozone shock treatment designed to completely eradicate severe, persistent odors (like heavy tobacco smoke or mildew) by destroying odor-causing molecules throughout the entire cabin and HVAC system.', basePrice: 110, pricing: { compact: 110, midsize: 110, truck: 110, luxury: 110 }, active: false },
  { id: 'ceramic-coating-2yr', name: '2-Year Professional Ceramic Coating', category: 'exterior', description: 'Our flagship Professional Nano Ceramic Coating. Following extensive paint prep, this hard-curing quartz coating is applied to deliver 2+ years of maximum gloss, intense hydrophobic protection, and unmatched resistance to environmental damage.', basePrice: 296, pricing: { compact: 296, midsize: 329, truck: 384, luxury: 494 }, active: false },
];

// Read latest overrides on each getter to ensure immediate reflection without reload
export function getServicePrice(serviceId: string, vehicleType: VehicleType): number {
  const service = servicePackages.find(s => s.id === serviceId);
  if (!service) return 0;
  const currentOverrides = getPricingOverrides();
  const merged = { ...service.pricing, ...(currentOverrides[serviceId] || {}) } as ServicePackage["pricing"];
  return merged[vehicleType] || 0;
}

function getAddOnOverrides(): Record<string, Partial<AddOn["pricing"]>> {
  try {
    return JSON.parse(localStorage.getItem("addOnPricingOverrides") || "{}");
  } catch { return {}; }
}

export function getAddOnPrice(addOnId: string, vehicleType: VehicleType): number {
  const addOn = addOns.find(a => a.id === addOnId);
  if (!addOn) return 0;
  const overrides = getAddOnOverrides();
  const merged = { ...addOn.pricing, ...(overrides[addOnId] || {}) } as AddOn["pricing"];
  return merged[vehicleType] || 0;
}

export function calculateDestinationFee(miles: number): number {
  if (miles <= 1) return 0;
  return Math.round(miles * 4);
}

// Admin API: update pricing overrides and refresh consumers without reloading
export function setServicePricingOverride(serviceId: string, pricing: ServicePackage["pricing"]) {
  const current = getPricingOverrides();
  current[serviceId] = pricing;
  localStorage.setItem("servicePricingOverrides", JSON.stringify(current));
}

// Admin API: update add-on pricing overrides
export function setAddOnPricingOverride(addOnId: string, pricing: AddOn["pricing"]) {
  const current = getAddOnOverrides();
  current[addOnId] = pricing;
  localStorage.setItem("addOnPricingOverrides", JSON.stringify(current));
}
// Helper for estimated duration based on package ID
export function getServiceDuration(id: string = ''): number {
  const nid = id.toLowerCase();
  if (nid.includes('full')) return 2.5;
  if (nid.includes('interior')) return 1.5;
  if (nid.includes('exterior')) return 1.0;
  if (nid.includes('elite')) return 4.0;
  return 2.0;
}

/**
 * Normalizes an add-on identifier (ID or Name) to its canonical Registry Name.
 * Handles IDs like 'pet-hair' and common variations.
 */
export function getCanonicalAddonName(input: string): string {
  if (!input) return "";
  const lowerInput = input.toLowerCase().trim();
  
  // 1. Try match against built-in registry IDs
  const byId = addOns.find(a => a.id.toLowerCase() === lowerInput);
  if (byId) return byId.name;
  
  // 2. Try match against built-in registry Names
  const byName = addOns.find(a => a.name.toLowerCase() === lowerInput);
  if (byName) return byName.name;

  // 3. Robust mapping for known aliases and common variations
  if (lowerInput === 'pet hair' || lowerInput.includes('pet hair')) return 'Pet Hair Removal';
  if (lowerInput === 'clay bar' || lowerInput.includes('clay bar')) return 'Clay Bar & Iron Decontamination';
  if (lowerInput.includes('wheel clean')) return 'Wheel Cleaning';
  if (lowerInput.includes('headlight')) return 'Headlight Restoration';
  if (lowerInput.includes('leather')) return 'Leather Conditioning';
  if (lowerInput.includes('stain')) return 'Stain Treatment';
  if (lowerInput.includes('ceramic trim')) return 'Ceramic Trim Coat Restoration';
  if (lowerInput.includes('engine')) return 'Engine Bay Cleaning';
  if (lowerInput.includes('odor')) return 'Odor Eliminator';
  if (lowerInput.includes('ceramic protection')) return '1-Year Ceramic Protection';
  if (lowerInput.includes('scratch')) return 'Scratch Repair';
  
  // Fallback: If we can't find a canonical match, return the input properly capitalized
  return input.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
