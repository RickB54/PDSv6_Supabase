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
  if (n.includes('wheels & tires first')) return "Chemical: Dark Fury 4:1 or 7:1 (Alternative: Meguiar's APC 4:1). Application: Agitate with brush. Dwell Time: No dwell needed.";

  // 3. Pre-Treat
  if (n.includes('pre-treat bugs')) return "Chemical: Road Warrior 4:1 (Alternative: Pink Perfection 4:1). Dwell Time: 3–5 minutes. Application Tip: Spray on dry surface before rinsing.";

  // 4. Foam Bath
  if (n.includes('foam bath')) return "Chemical: Cherry Foam 5:1 or McGuire’s Gold Class 5:1. Dwell Time: 3–5 minutes. Application Tip: Apply thick layer of foam and let it dwell to loosen grime.";

  // 5. Drying
  if (n.includes('drying')) return "Chemical: Formula 4 20:1 sprayed on wet paint. Application Tip: Use a clean microfiber drying towel or air blower.";

  // 6. Paint Protection
  if (n.includes('paint protection')) return "Chemical: Formula 4 20:1. Application Tip: Formula 4 is used as a drying aid AND minimal protection (lasts 2 - 5 or 6 weeks).";

  // 7. Interior Plastics / Trim
  if (n.includes('plastics / vinyl / trim')) return "Chemical: Pink Perfection 10:1, final pass with P&S Xpress 3:1 or Cover All 4:1. Application Tip: Use a soft brush for crevices and wipe with clean microfiber.";

  // 8. Fabric / Carpet
  if (n.includes('fabric / carpet')) return "Chemical: Carpet Bomber 7:1 (standard) or 5:1 (heavy). Application Tip: Agitate with brush and pull out dirt with extractor if needed.";

  // 9. Odor & Stain
  if (n.includes('odor & stain treatment')) return "Chemical: Terminator RTU. Application Tip: Targeted odor neutralization (food, smoke, pet). Do not mask—neutralize.";

  // 10. General Interior
  if (n.includes('vacuum')) return "Remove floor mats first. Vacuum all carpets, seats, and crevices from top to bottom. Use stiff brush to agitate embedded debris.";
  if (n.includes('dashboard') || n.includes('steering wheel')) return "Use a soft brush and microfiber to clean the instrument cluster, steering wheel buttons, and dashboard seams.";
  if (n.includes('mats')) return "Remove mats from vehicle. Pressure wash rubber mats or vacuum and detail carpet mats. Dry completely before reinstalling.";
  if (n.includes('glass')) return "Use distinct glass towel. Spray cleaner on towel, not glass (to avoid overspray). Wipe in box pattern for streak-free finish.";
  if (n.includes('jamb')) return "Degrease and wipe all door, trunk, and hood jambs. Ensure no cleaner residue remains on weather stripping.";
  if (n.includes('inspection')) return "Final walkthrough of the interior to ensure all standards are met and no spots were missed.";

  return "Perform this step with care. Ensure quality standards are met before proceeding.";
}

export type VehicleType = 'compact' | 'midsize' | 'truck' | 'luxury';

export interface ServicePackage {
  id: string;
  name: string;
  description: string;
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
    description: 'A professional exterior cleaning restoration.',
    basePrice: 90,
    pricing: { compact: 90, midsize: 110, truck: 120, luxury: 130 },
    steps: [
      { id: 'ext-wheels', name: 'Wheels & Tires First', category: 'exterior' },
      { id: 'ext-rinse', name: 'Pre-Rinse whole vehicle', category: 'exterior' },
      { id: 'ext-bugs', name: 'Pre-Treat bugs / heavy grime', category: 'exterior' },
      { id: 'ext-foam', name: 'Foam Bath', category: 'exterior' },
      { id: 'ext-wash', name: 'Two-Bucket Hand Wash (Top to Bottom)', category: 'exterior' },
      { id: 'ext-final-rinse', name: 'Final Rinse', category: 'exterior' },
      { id: 'ext-drying', name: 'Drying', category: 'exterior' },
      { id: 'ext-protection', name: 'Paint Protection', category: 'exterior' }
    ]
  },
  {
    id: 'prime-essential-interior',
    name: 'Prime Essential Interior',
    description: 'Quickly freshen up your car’s interior.',
    basePrice: 180,
    pricing: { compact: 180, midsize: 200, truck: 210, luxury: 240 },
    steps: [
      { id: 'int-vac', name: 'Thorough Vacuum (Top to Bottom)', category: 'interior' },
      { id: 'int-mats', name: 'Clean Floor Mats & Area Rugs', category: 'interior' },
      { id: 'int-dash', name: 'Clean Dashboard, Steering Wheel & Console', category: 'interior' },
      { id: 'int-plastics', name: 'Clean All Interior Plastics / Vinyl / Trim', category: 'interior' },
      { id: 'int-fabric', name: 'Clean Fabric / Carpet / Seats', category: 'interior' },
      { id: 'int-glass', name: 'Windows & Glass (streak-free)', category: 'interior' },
      { id: 'int-jambs', name: 'Clean Door Jambs & Trunk Jambs', category: 'interior' },
      { id: 'int-inspection', name: 'Final Interior Inspection', category: 'interior' }
    ]
  },
  {
    id: 'prime-essential-full',
    name: 'Prime Essential Full Detail',
    description: 'Includes everything in the Essential Interior & Essential Exterior combined.',
    basePrice: 260,
    pricing: { compact: 260, midsize: 270, truck: 290, luxury: 320 },
    steps: [
      { id: 'ext-wheels', name: 'Wheels & Tires First', category: 'exterior' },
      { id: 'ext-rinse', name: 'Pre-Rinse whole vehicle', category: 'exterior' },
      { id: 'ext-bugs', name: 'Pre-Treat bugs / heavy grime', category: 'exterior' },
      { id: 'ext-foam', name: 'Foam Bath', category: 'exterior' },
      { id: 'ext-wash', name: 'Two-Bucket Hand Wash (Top to Bottom)', category: 'exterior' },
      { id: 'ext-final-rinse', name: 'Final Rinse', category: 'exterior' },
      { id: 'ext-drying', name: 'Drying', category: 'exterior' },
      { id: 'ext-protection', name: 'Paint Protection', category: 'exterior' },
      { id: 'int-vac', name: 'Thorough Vacuum (Top to Bottom)', category: 'interior' },
      { id: 'int-mats', name: 'Clean Floor Mats & Area Rugs', category: 'interior' },
      { id: 'int-dash', name: 'Clean Dashboard, Steering Wheel & Console', category: 'interior' },
      { id: 'int-plastics', name: 'Clean All Interior Plastics / Vinyl / Trim', category: 'interior' },
      { id: 'int-fabric', name: 'Clean Fabric / Carpet / Seats', category: 'interior' },
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
    basePrice: 160,
    pricing: { compact: 160, midsize: 180, truck: 190, luxury: 210 },
    steps: [
      { id: 'elite-ext-wheels', name: 'Wheels & Tires First', category: 'exterior' },
      { id: 'elite-ext-rinse', name: 'Pre-Rinse whole vehicle', category: 'exterior' },
      { id: 'elite-ext-bugs', name: 'Pre-Treat bugs / heavy grime', category: 'exterior' },
      { id: 'elite-ext-foam', name: 'Foam Bath', category: 'exterior' },
      { id: 'elite-well', name: 'Wheel Wells Cleaned', category: 'exterior' },
      { id: 'elite-clay', name: 'Clay Bar Treatment', category: 'exterior' },
      { id: 'elite-decon', name: 'Paint Decontamination', category: 'exterior' },
      { id: 'elite-ext-wash', name: 'Two-Bucket Hand Wash (Top to Bottom)', category: 'exterior' },
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
    basePrice: 390,
    pricing: { compact: 390, midsize: 475, truck: 495, luxury: 590 },
    steps: [
      { id: 'elite-int-vac', name: 'Thorough Vacuum (Top to Bottom)', category: 'interior' },
      { id: 'elite-int-mats', name: 'Clean Floor Mats & Area Rugs', category: 'interior' },
      { id: 'elite-int-dash', name: 'Clean Dashboard, Steering Wheel & Console', category: 'interior' },
      { id: 'elite-int-plastics', name: 'Clean All Interior Plastics / Vinyl / Trim', category: 'interior' },
      { id: 'elite-int-fabric', name: 'Clean Fabric / Carpet / Seats', category: 'interior' },
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
    basePrice: 495,
    pricing: { compact: 495, midsize: 595, truck: 695, luxury: 850 },
    steps: [
      { id: 'elite-full-wheels', name: 'Wheels & Tires First', category: 'exterior' },
      { id: 'elite-full-rinse', name: 'Pre-Rinse whole vehicle', category: 'exterior' },
      { id: 'elite-full-bugs', name: 'Pre-Treat bugs / heavy grime', category: 'exterior' },
      { id: 'elite-full-foam', name: 'Foam Bath', category: 'exterior' },
      { id: 'elite-full-well', name: 'Wheel Wells Cleaned', category: 'exterior' },
      { id: 'elite-full-clay', name: 'Clay Bar Treatment', category: 'exterior' },
      { id: 'elite-full-decon', name: 'Paint Decontamination', category: 'exterior' },
      { id: 'elite-full-wash', name: 'Two-Bucket Hand Wash (Top to Bottom)', category: 'exterior' },
      { id: 'elite-full-final-rinse', name: 'Final Rinse', category: 'exterior' },
      { id: 'elite-full-drying', name: 'Drying', category: 'exterior' },
      { id: 'elite-full-trim', name: 'Black Trim Restore & UV Protection', category: 'exterior' },
      { id: 'elite-full-ceramic', name: 'Premium Ceramic Sealant Protection', category: 'exterior' },
      { id: 'elite-full-ext-protection', name: 'Paint Protection', category: 'exterior' },
      { id: 'elite-full-vac', name: 'Thorough Vacuum (Top to Bottom)', category: 'interior' },
      { id: 'elite-full-mats', name: 'Clean Floor Mats & Area Rugs', category: 'interior' },
      { id: 'elite-full-dash', name: 'Clean Dashboard, Steering Wheel & Console', category: 'interior' },
      { id: 'elite-full-plastics', name: 'Clean All Interior Plastics / Vinyl / Trim', category: 'interior' },
      { id: 'elite-full-fabric', name: 'Clean Fabric / Carpet / Seats', category: 'interior' },
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
  { id: 'wheel-cleaning', name: 'Wheel Cleaning & Tire Detail', category: 'exterior', description: 'A thorough hand cleaning of all four wheels and tires including rim faces, spokes, lug nut areas, and wheel wells. Tires are scrubbed clean of built-up road grime and brake dust, and finished with a professional tire shine dressing for a deep, rich black appearance. This add-on goes well beyond the basic wheel rinse included in a standard exterior wash — it is a dedicated, detail-level treatment that leaves every wheel and tire looking showroom-ready. Ideal for vehicles with heavily soiled wheels, brake dust buildup, or tires that have lost their color and shine.', basePrice: 25, pricing: { compact: 25, midsize: 30, truck: 40, luxury: 50 }, active: true },
  { id: 'large-wheel-cleaning', name: 'Large Sized Wheel Cleaning', category: 'exterior', description: 'A dedicated premium cleaning service for oversized and large-format wheels found on trucks, large SUVs, and luxury vehicles. Includes deep brake dust extraction, inner barrel decontamination, lug nut cleaning, and wheel well treatment. Priced separately due to the additional time and product required for larger wheel surfaces.', basePrice: 35, pricing: { compact: 0, midsize: 35, truck: 50, luxury: 65 }, applicableVehicleTypes: ['midsize', 'truck', 'luxury'], active: true },
  { id: 'leather-conditioning', name: 'Leather Conditioning', category: 'interior', description: 'Deep-cleaning and premium nourishing treatment for all leather surfaces. We use pH-balanced cleaners followed by a rich, non-greasy conditioner that restores natural suppleness and protects against future UV fading and cracking.', basePrice: 30, pricing: { compact: 30, midsize: 40, truck: 50, luxury: 60 }, active: true },
  { id: 'engine-bay', name: 'Engine Bay Cleaning', category: 'exterior', description: 'A meticulous, low-pressure detailing of the engine bay. We safely degrease all surfaces, agitate built-up grime, and apply a specialized high-heat dressing to rubber and plastic components for a clean, factory-fresh appearance.', basePrice: 70, pricing: { compact: 70, midsize: 85, truck: 100, luxury: 120 }, active: true },
  { id: 'pet-hair', name: 'Pet Hair Removal', category: 'interior', description: 'An intensive interior add-on focused on the specialized removal of stubborn, embedded pet hair from carpets, fabric seats, and hard-to-reach crevices using specialized brushes and high-powered extraction.', basePrice: 75, pricing: { compact: 75, midsize: 85, truck: 95, luxury: 105 }, active: true },
  { id: 'stain-treatment', name: 'Stain Treatment', category: 'interior', description: 'Professional-grade spot treatment and deep-extraction for stubborn interior stains (coffee, mud, food, etc.). We use specialized enzymes and spotters tailored to the specific type of stain to lift it without damaging the upholstery.', basePrice: 80, pricing: { compact: 80, midsize: 90, truck: 100, luxury: 110 }, active: true },
  { id: 'odor-eliminator', name: 'Odor Eliminator', category: 'interior', description: 'Targeted application of professional-grade odor neutralizing agents. We don\'t just mask the smell; we use chemical neutralizers to attack and eliminate the source of minor food, smoke, or pet odors.', basePrice: 15, pricing: { compact: 15, midsize: 20, truck: 25, luxury: 35 }, active: true },
  { id: 'ceramic-protection-1yr', name: '1-Year Ceramic Protection', category: 'exterior', description: 'Premium Graphene Ceramic Spray Coating applied after a thorough prep wash. It chemically bonds to the paint to deliver up to 1 year of superior high-gloss shine, extreme water beading, and simplified maintenance washes.', basePrice: 79, pricing: { compact: 79, midsize: 109, truck: 129, luxury: 149 }, active: true },
  { id: '3rd-row-seating', name: '3rd Row Seating', category: 'interior', description: 'An additional interior detail extension required for vehicles equipped with a third row of seating. This covers the extra time and labor needed to thoroughly vacuum, clean, and detail the rear-most passenger area and cargo space.', basePrice: 50, pricing: { compact: 50, midsize: 50, truck: 50, luxury: 50 }, applicableVehicleTypes: ['truck', 'luxury'], active: true },

  // --- INACTIVE (set active: false to hide from customer forms; re-enable by setting active: true) ---
  { id: 'clay-bar', name: 'Clay Bar & Iron Decontamination', category: 'exterior', description: 'A professional deep decontamination process using specialized clay to pull embedded contaminants, industrial fallout, and iron particles from the clear coat, leaving the paint as smooth as glass.', basePrice: 80, pricing: { compact: 80, midsize: 90, truck: 100, luxury: 120 }, active: false },
  { id: 'headlight-restoration', name: 'Headlight Restoration', category: 'exterior', description: 'Multi-stage wet sanding, compounding, and polishing process to completely remove heavy oxidation and yellowing from headlight lenses, followed by a UV-protective sealant to restore factory clarity and nighttime visibility.', basePrice: 35, pricing: { compact: 35, midsize: 40, truck: 50, luxury: 65 }, active: false },
  { id: 'ceramic-trim-coat', name: 'Ceramic Trim Coat Restoration', category: 'exterior', description: 'Advanced restoration and protection for faded exterior plastics. We strip old dressings and apply a true ceramic coating that permanently bonds to the trim, restoring deep, rich color and providing long-lasting UV defense.', basePrice: 60, pricing: { compact: 60, midsize: 75, truck: 95, luxury: 125 }, active: false },
  { id: 'scratch-repair', name: 'Scratch Repair', category: 'exterior', description: 'Targeted correction for minor clear-coat scratches and scuffs. We use machine polishing and careful touch-up techniques to significantly reduce or eliminate the visibility of surface-level defects.', basePrice: 200, pricing: { compact: 200, midsize: 200, truck: 200, luxury: 200 }, active: false },
  { id: 'deep-interior', name: 'Deep Interior Detail', category: 'interior', description: 'The ultimate interior reset. Includes intensive steam cleaning, deep shampooing and hot-water extraction of all carpets and fabric seats, and meticulous detailing of every crevice, vent, and compartment.', basePrice: 165, pricing: { compact: 165, midsize: 185, truck: 215, luxury: 250 }, active: false },
  { id: 'paint-sealant', name: 'Paint Sealant Application', category: 'exterior', description: 'Application of an advanced, durable synthetic polymer sealant. This provides superior gloss enhancement and creates a tough barrier against environmental contaminants, outlasting traditional carnauba waxes.', basePrice: 90, pricing: { compact: 90, midsize: 110, truck: 130, luxury: 160 }, active: false },
  { id: 'paint-touch-up', name: 'Minor Paint Touch-Up', category: 'exterior', description: 'Precision touch-up application for small rock chips and deep scratches. We clean the defect and carefully fill it with color-matched paint to prevent rust and improve the overall visual appearance of the panel.', basePrice: 75, pricing: { compact: 75, midsize: 90, truck: 110, luxury: 140 }, active: false },
  { id: 'ceramic-coating', name: 'Ceramic Coating', category: 'exterior', description: 'A true ceramic coating application that bonds at a molecular level with your clear coat. Delivers intense gloss, extreme hydrophobic water-beading, and robust protection against chemical etching and UV rays.', basePrice: 500, pricing: { compact: 500, midsize: 500, truck: 550, luxury: 600 }, active: false },
  { id: 'paint-correction', name: 'Paint Correction', category: 'exterior', description: 'A highly skilled, multi-stage machine compounding and polishing process designed to level the clear coat, permanently removing swirl marks, holograms, and moderate scratches to restore a flawless, mirror-like finish.', basePrice: 300, pricing: { compact: 300, midsize: 350, truck: 400, luxury: 450 }, active: false },
  { id: 'odor-treatment', name: 'Odor Elimination Treatment', category: 'interior', description: 'An intensive, commercial-grade ozone shock treatment designed to completely eradicate severe, persistent odors (like heavy tobacco smoke or mildew) by destroying odor-causing molecules throughout the entire cabin and HVAC system.', basePrice: 100, pricing: { compact: 100, midsize: 100, truck: 100, luxury: 100 }, active: false },
  { id: 'ceramic-coating-2yr', name: '2-Year Professional Ceramic Coating', category: 'exterior', description: 'Our flagship Professional Nano Ceramic Coating. Following extensive paint prep, this hard-curing quartz coating is applied to deliver 2+ years of maximum gloss, intense hydrophobic protection, and unmatched resistance to environmental damage.', basePrice: 299, pricing: { compact: 299, midsize: 349, truck: 399, luxury: 499 }, active: false },
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
  return miles * 4;
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
