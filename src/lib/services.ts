// Complete service definitions with pricing and steps

export interface ServiceStep {
  id: string;
  name: string;
  category: 'exterior' | 'interior' | 'final';
}

export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  pricing: {
    compact: number;
    midsize: number;
    truck: number;
    luxury: number;
  };
  steps: ServiceStep[];
}

export interface AddOn {
  id: string;
  name: string;
  category?: 'exterior' | 'interior' | 'final';
  description?: string;
  basePrice: number;
  pricing: {
    compact: number;
    midsize: number;
    truck: number;
    luxury: number;
  };
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
    description: 'A high-quality exterior refresh designed to safely remove surface dirt and road grime while enhancing shine and protection. Ideal for regularly maintained vehicles.',
    basePrice: 90,
    pricing: { compact: 90, midsize: 110, truck: 120, luxury: 130 },
    steps: [
      { id: 'foam-pre-soak', name: 'Exterior foam pre-soak', category: 'exterior' },
      { id: 'hand-wash', name: 'Two-bucket hand wash with grit guards', category: 'exterior' },
      { id: 'wheel-rim-shine', name: 'Wheel and rim cleaning with tire shine', category: 'exterior' },
      { id: 'gas-cap-clean', name: 'Gas cap area cleaning', category: 'exterior' },
      { id: 'blow-dry', name: 'Air blow-dry followed by microfiber hand drying', category: 'exterior' },
      { id: 'sealant', name: 'Premium spray wax / paint sealant', category: 'final' }
    ]
  },
  {
    id: 'prime-essential-interior',
    name: 'Prime Essential Interior',
    description: 'A maintenance-level interior service designed to refresh vehicles in decent condition. Focuses on cleaning and tidying without deep extraction.',
    basePrice: 180,
    pricing: { compact: 180, midsize: 200, truck: 210, luxury: 240 },
    steps: [
      { id: 'vac-interior', name: 'Thorough interior vacuum', category: 'interior' },
      { id: 'wipe-plastics', name: 'Wipe-down of all plastics, vinyl, and leather', category: 'interior' },
      { id: 'window-clean', name: 'Interior window cleaning', category: 'interior' },
      { id: 'mat-clean', name: 'Floor mat cleaning', category: 'interior' },
      { id: 'jamb-clean', name: 'Door jamb cleaning', category: 'final' }
    ]
  },
  {
    id: 'prime-essential-full',
    name: 'Prime Essential Full Detail',
    description: 'A comprehensive refresh for both exterior and interior, ensuring your vehicle is clean, fresh, and well-maintained.',
    basePrice: 230,
    pricing: { compact: 230, midsize: 270, truck: 290, luxury: 320 },
    steps: [
      { id: 'ext-hand-wash', name: 'Safe hand wash to remove surface dirt', category: 'exterior' },
      { id: 'wheel-faces', name: 'Wheel and tire cleaning (faces only)', category: 'exterior' },
      { id: 'bug-removal', name: 'Bug splatter and light road residue removal', category: 'exterior' },
      { id: 'interior-vac-full', name: 'Full interior vacuum (seats, carpets, trunk)', category: 'interior' },
      { id: 'dash-wipe', name: 'Wipe-down of dashboard, console, and door panels', category: 'interior' },
      { id: 'spot-clean', name: 'Spot cleaning of minor spills (non-set stains)', category: 'interior' },
      { id: 'windows-in-out', name: 'Interior & Exterior glass cleaned', category: 'final' }
    ]
  },
  // --- PRIME ELITE ---
  {
    id: 'prime-elite-exterior',
    name: 'Prime Elite Exterior',
    description: 'Designed to restore and protect paint by removing bonded contaminants and enhancing gloss with ceramic-infused protection.',
    basePrice: 160,
    pricing: { compact: 160, midsize: 180, truck: 190, luxury: 210 },
    steps: [
      { id: 'foam-wash-elite', name: 'Foam bath and two-bucket wash', category: 'exterior' },
      { id: 'wheel-detail-elite', name: 'Wheel, rim, and tire detailing', category: 'exterior' },
      { id: 'well-clean', name: 'Wheel well cleaning', category: 'exterior' },
      { id: 'clay-decon', name: 'Clay bar decontamination', category: 'exterior' },
      { id: 'trim-uv', name: 'Trim restoration with UV protection', category: 'exterior' },
      { id: 'ceramic-sealant', name: 'Premium ceramic-based sealant', category: 'final' }
    ]
  },
  {
    id: 'prime-elite-interior',
    name: 'Prime Elite Interior',
    description: 'A deep-clean service built for heavily used or neglected interiors. Includes steam cleaning and full extraction.',
    basePrice: 390,
    pricing: { compact: 390, midsize: 475, truck: 495, luxury: 590 },
    steps: [
      { id: 'deep-vac', name: 'Deep vacuum of all interior areas and trunk', category: 'interior' },
      { id: 'steam-clean', name: 'Steam cleaning of panels, vents, and surfaces', category: 'interior' },
      { id: 'upholstery-extract', name: 'Carpet and upholstery steam extraction', category: 'interior' },
      { id: 'seat-extract', name: 'Seat and fabric extraction', category: 'interior' },
      { id: 'leather-cond', name: 'Leather conditioning and protection', category: 'interior' },
      { id: 'elite-final', name: 'Windows, door jambs, and floor mats cleaned', category: 'final' }
    ]
  },
  {
    id: 'prime-elite-full',
    name: 'Prime Elite Full Detail',
    description: 'The ultimate restoration and protection package. Showroom-ready results for every inch of your vehicle.',
    basePrice: 495,
    pricing: { compact: 495, midsize: 595, truck: 695, luxury: 850 },
    steps: [
      { id: 'paint-safe-wash', name: 'Premium paint-safe hand wash', category: 'exterior' },
      { id: 'deep-wheel', name: 'Deep wheel cleaning (barrels & lug areas)', category: 'exterior' },
      { id: 'full-decon', name: 'Full exterior decontamination (clay & iron)', category: 'exterior' },
      { id: 'gloss-enhance', name: 'Paint enhancement step (gloss improvement)', category: 'exterior' },
      { id: 'elite-sealant', name: 'High-quality protective sealant application', category: 'exterior' },
      { id: 'restorative-vac', name: 'Complete restorative interior vacuum', category: 'interior' },
      { id: 'surface-detail', name: 'Deep cleaning of all interior surfaces & vents', category: 'interior' },
      { id: 'shampoo-extract', name: 'Shampooing of carpets and floor mats', category: 'interior' },
      { id: 'leather-elite', name: 'Seat cleaning and conditioning (Premium)', category: 'interior' },
      { id: 'odor-neutral', name: 'Light odor neutralization & final detail', category: 'final' }
    ]
  },
];

/* REFERENCE: 2025 Archived Packages (Refer to Supabase for full history)
{ id: 'basic-exterior', name: 'Basic Exterior Wash', ... },
{ id: 'express-wax', name: 'Express Wash & Wax', ... },
{ id: 'full-exterior', name: 'Full Exterior Detail', ... },
{ id: 'interior-cleaning', name: 'Interior Cleaning', ... },
{ id: 'full-detail', name: 'Full Detail (BEST VALUE)', ... },
{ id: 'premium-detail', name: 'Premium Detail', ... }
*/

export const addOns: AddOn[] = [
  { id: 'wheel-cleaning', name: 'Wheel Cleaning', category: 'exterior', description: 'Thorough cleaning of wheels and brake dust using safe, non-acidic products; includes lug areas and wheel faces.', basePrice: 20, pricing: { compact: 20, midsize: 25, truck: 30, luxury: 40 } },
  { id: 'leather-conditioning', name: 'Leather Conditioning', category: 'interior', description: 'Nourishing treatment for leather surfaces to restore suppleness and protect against UV and wear.', basePrice: 25, pricing: { compact: 25, midsize: 30, truck: 35, luxury: 45 } },
  { id: 'odor-eliminator', name: 'Odor Eliminator', category: 'interior', description: 'Targeted odor neutralization (food, smoke, pet) using professional-grade products; does not mask—neutralizes.', basePrice: 15, pricing: { compact: 15, midsize: 20, truck: 25, luxury: 35 } },
  { id: 'headlight-restoration', name: 'Headlight Restoration', category: 'exterior', description: 'Multi-step refinement of plastic lenses to remove oxidation and haze, restoring clarity and brightness.', basePrice: 35, pricing: { compact: 35, midsize: 40, truck: 50, luxury: 65 } },
  { id: 'ceramic-trim-coat', name: 'Ceramic Trim Coat Restoration', category: 'exterior', description: 'Restores faded exterior plastics and applies a ceramic coating for long-lasting color and UV protection.', basePrice: 60, pricing: { compact: 60, midsize: 75, truck: 95, luxury: 125 } },
  { id: 'engine-bay', name: 'Engine Bay Cleaning', category: 'exterior', description: 'Careful degreasing and dressing of the engine bay; safe processes to improve appearance without high-pressure intrusion.', basePrice: 70, pricing: { compact: 70, midsize: 85, truck: 100, luxury: 120 } },
  { id: 'wheel-rim-detailing', name: 'Wheel & Rim Detailing', category: 'exterior', description: 'Detailed cleaning and polishing of wheel faces and rims, including intricate spokes and inner barrels where accessible.', basePrice: 50, pricing: { compact: 50, midsize: 60, truck: 75, luxury: 90 } },
  { id: 'clay-bar-decon', name: 'Clay Bar Decontamination', category: 'exterior', description: 'Full-body clay treatment to remove bonded contaminants (rail dust, overspray, fallout) for a smooth paint surface.', basePrice: 65, pricing: { compact: 65, midsize: 80, truck: 95, luxury: 120 } },
  { id: 'paint-sealant', name: 'Paint Sealant Application', category: 'exterior', description: 'Application of a durable synthetic sealant to enhance gloss and protect paint against environmental elements.', basePrice: 90, pricing: { compact: 90, midsize: 110, truck: 130, luxury: 160 } },
  { id: 'pet-hair-removal', name: 'Pet Hair Removal', category: 'interior', description: 'Specialized removal of embedded pet hair from fabrics and carpets using dedicated tools and methods.', basePrice: 55, pricing: { compact: 55, midsize: 70, truck: 85, luxury: 100 } },
  { id: 'paint-touch-up', name: 'Minor Paint Touch-Up', category: 'exterior', description: 'Spot touch-ups for small chips and scratches using compatible paint; not a full panel respray.', basePrice: 75, pricing: { compact: 75, midsize: 90, truck: 110, luxury: 140 } }
];

export type VehicleType = 'compact' | 'midsize' | 'truck' | 'luxury';

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
  if (miles <= 5) return 0;
  if (miles <= 10) return 10;
  if (miles <= 20) return 15 + (miles - 10);
  if (miles <= 30) return 30 + ((miles - 20) * 1.5);
  if (miles <= 50) return 50 + ((miles - 30) * 1.25);
  return 75;
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
  if (id.includes('prime-elite-full')) return 6;
  if (id.includes('prime-elite-interior')) return 4;
  if (id.includes('prime-elite-exterior')) return 3;
  if (id.includes('prime-essential-full')) return 4;
  if (id.includes('prime-essential-interior')) return 2.5;
  if (id.includes('prime-essential-exterior')) return 2;
  return 3;
}
