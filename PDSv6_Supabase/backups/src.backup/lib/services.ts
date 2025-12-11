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

export const servicePackages: ServicePackage[] = [
  {
    id: 'basic-exterior',
    name: 'Basic Exterior Wash',
    description: 'Essential exterior cleaning',
    basePrice: 40,
    pricing: overrides["basic-exterior"] || { compact: 40, midsize: 50, truck: 60, luxury: 75 },
    steps: [
      { id: 'pre-rinse-foam', name: 'Pre-rinse & foam', category: 'exterior' },
      { id: 'two-bucket-wash', name: 'Two-bucket wash', category: 'exterior' },
      { id: 'hand-dry', name: 'Hand dry', category: 'exterior' },
      { id: 'final-inspection', name: 'Final inspection', category: 'final' }
    ]
  },
  {
    id: 'express-wax',
    name: 'Express Wash & Wax',
    description: 'Quick wash with protective wax',
    basePrice: 60,
    pricing: overrides["express-wax"] || { compact: 60, midsize: 75, truck: 90, luxury: 110 },
    steps: [
      { id: 'quick-wash', name: 'Quick wash', category: 'exterior' },
      { id: 'spray-wax', name: 'Spray wax', category: 'exterior' },
      { id: 'tire-shine', name: 'Tire shine', category: 'exterior' },
      { id: 'final-inspection-express', name: 'Final inspection', category: 'final' }
    ]
  },
  {
    id: 'full-exterior',
    name: 'Full Exterior Detail',
    description: 'Complete exterior restoration',
    basePrice: 120,
    pricing: overrides["full-exterior"] || { compact: 120, midsize: 150, truck: 180, luxury: 210 },
    steps: [
      { id: 'pre-rinse-vehicle', name: 'Pre-rinse vehicle', category: 'exterior' },
      { id: 'apply-foam-cannon', name: 'Apply foam cannon', category: 'exterior' },
      { id: 'two-bucket-wash-full', name: 'Two-bucket wash', category: 'exterior' },
      { id: 'clay-bar-treatment', name: 'Clay bar treatment', category: 'exterior' },
      { id: 'iron-remover', name: 'Iron remover application', category: 'exterior' },
      { id: 'dry-vehicle', name: 'Dry vehicle', category: 'exterior' },
      { id: 'apply-sealant-wax', name: 'Apply sealant/wax', category: 'exterior' },
      { id: 'tire-dressing', name: 'Tire dressing', category: 'exterior' },
      { id: 'clean-windows-ext', name: 'Clean windows', category: 'final' },
      { id: 'final-inspection-full', name: 'Final inspection', category: 'final' }
    ]
  },
  {
    id: 'interior-cleaning',
    name: 'Interior Cleaning',
    description: 'Deep interior detailing',
    basePrice: 80,
    pricing: overrides["interior-cleaning"] || { compact: 80, midsize: 100, truck: 120, luxury: 150 },
    steps: [
      { id: 'vacuum-interior', name: 'Vacuum all surfaces', category: 'interior' },
      { id: 'clean-dashboard', name: 'Clean dashboard', category: 'interior' },
      { id: 'clean-door-panels', name: 'Clean door panels', category: 'interior' },
      { id: 'clean-seats', name: 'Clean seats', category: 'interior' },
      { id: 'clean-carpets', name: 'Clean carpets/mats', category: 'interior' },
      { id: 'apply-uv-protectant', name: 'Apply UV protectant', category: 'interior' },
      { id: 'clean-windows-int', name: 'Clean windows', category: 'final' },
      { id: 'final-inspection-int', name: 'Final inspection', category: 'final' }
    ]
  },
  {
    id: 'full-detail',
    name: 'Full Detail (BEST VALUE)',
    description: 'Complete interior and exterior',
    basePrice: 180,
    pricing: overrides["full-detail"] || { compact: 180, midsize: 225, truck: 270, luxury: 320 },
    steps: [
      // Exterior
      { id: 'pre-rinse-full', name: 'Pre-rinse vehicle', category: 'exterior' },
      { id: 'foam-cannon-full', name: 'Apply foam cannon', category: 'exterior' },
      { id: 'two-bucket-full', name: 'Two-bucket wash', category: 'exterior' },
      { id: 'clay-bar-full', name: 'Clay bar treatment', category: 'exterior' },
      { id: 'iron-remover-full', name: 'Iron remover application', category: 'exterior' },
      { id: 'dry-full', name: 'Dry vehicle', category: 'exterior' },
      { id: 'sealant-full', name: 'Apply sealant', category: 'exterior' },
      { id: 'tire-dressing-full', name: 'Tire dressing', category: 'exterior' },
      // Interior
      { id: 'vacuum-full', name: 'Vacuum all surfaces', category: 'interior' },
      { id: 'dashboard-full', name: 'Clean dashboard', category: 'interior' },
      { id: 'door-panels-full', name: 'Clean door panels', category: 'interior' },
      { id: 'seats-full', name: 'Clean seats', category: 'interior' },
      { id: 'carpets-full', name: 'Clean carpets/mats', category: 'interior' },
      { id: 'uv-full', name: 'Apply UV protectant', category: 'interior' },
      // Final
      { id: 'windows-full', name: 'Clean windows', category: 'final' },
      { id: 'final-inspection-detail', name: 'Final inspection', category: 'final' }
    ]
  },
  {
    id: 'premium-detail',
    name: 'Premium Detail',
    description: 'Ultimate detailing experience',
    basePrice: 280,
    pricing: overrides["premium-detail"] || { compact: 280, midsize: 350, truck: 420, luxury: 500 },
    steps: [
      // Exterior
      { id: 'pre-rinse-premium', name: 'Pre-rinse vehicle', category: 'exterior' },
      { id: 'foam-cannon-premium', name: 'Apply foam cannon', category: 'exterior' },
      { id: 'two-bucket-premium', name: 'Two-bucket wash', category: 'exterior' },
      { id: 'clay-bar-premium', name: 'Clay bar treatment', category: 'exterior' },
      { id: 'iron-remover-premium', name: 'Iron remover application', category: 'exterior' },
      { id: 'dry-premium', name: 'Dry vehicle', category: 'exterior' },
      { id: 'ceramic-coating', name: 'Apply ceramic coating', category: 'exterior' },
      { id: 'tire-dressing-premium', name: 'Tire dressing', category: 'exterior' },
      // Interior
      { id: 'vacuum-premium', name: 'Vacuum all surfaces', category: 'interior' },
      { id: 'dashboard-premium', name: 'Clean dashboard', category: 'interior' },
      { id: 'door-panels-premium', name: 'Clean door panels', category: 'interior' },
      { id: 'seats-premium', name: 'Clean seats', category: 'interior' },
      { id: 'carpets-premium', name: 'Clean carpets/mats', category: 'interior' },
      { id: 'uv-premium', name: 'Apply UV protectant', category: 'interior' },
      // Final
      { id: 'windows-premium', name: 'Clean windows', category: 'final' },
      { id: 'final-inspection-premium', name: 'Final inspection', category: 'final' }
    ]
  }
];

export const addOns: AddOn[] = [
  { id: 'wheel-cleaning', name: 'Wheel Cleaning', description: 'Thorough cleaning of wheels and brake dust using safe, non-acidic products; includes lug areas and wheel faces.', basePrice: 20, pricing: { compact: 20, midsize: 25, truck: 30, luxury: 40 } },
  { id: 'leather-conditioning', name: 'Leather Conditioning', description: 'Nourishing treatment for leather surfaces to restore suppleness and protect against UV and wear.', basePrice: 25, pricing: { compact: 25, midsize: 30, truck: 35, luxury: 45 } },
  { id: 'odor-eliminator', name: 'Odor Eliminator', description: 'Targeted odor neutralization (food, smoke, pet) using professional-grade products; does not mask—neutralizes.', basePrice: 15, pricing: { compact: 15, midsize: 20, truck: 25, luxury: 35 } },
  { id: 'headlight-restoration', name: 'Headlight Restoration', description: 'Multi-step refinement of plastic lenses to remove oxidation and haze, restoring clarity and brightness.', basePrice: 35, pricing: { compact: 35, midsize: 40, truck: 50, luxury: 65 } },
  { id: 'ceramic-trim-coat', name: 'Ceramic Trim Coat Restoration', description: 'Restores faded exterior plastics and applies a ceramic coating for long-lasting color and UV protection.', basePrice: 60, pricing: { compact: 60, midsize: 75, truck: 95, luxury: 125 } },
  { id: 'engine-bay', name: 'Engine Bay Cleaning', description: 'Careful degreasing and dressing of the engine bay; safe processes to improve appearance without high-pressure intrusion.', basePrice: 70, pricing: { compact: 70, midsize: 85, truck: 100, luxury: 120 } },
  { id: 'wheel-rim-detailing', name: 'Wheel & Rim Detailing', description: 'Detailed cleaning and polishing of wheel faces and rims, including intricate spokes and inner barrels where accessible.', basePrice: 50, pricing: { compact: 50, midsize: 60, truck: 75, luxury: 90 } },
  { id: 'clay-bar-decon', name: 'Clay Bar Decontamination', description: 'Full-body clay treatment to remove bonded contaminants (rail dust, overspray, fallout) for a smooth paint surface.', basePrice: 65, pricing: { compact: 65, midsize: 80, truck: 95, luxury: 120 } },
  { id: 'paint-sealant', name: 'Paint Sealant Application', description: 'Application of a durable synthetic sealant to enhance gloss and protect paint against environmental elements.', basePrice: 90, pricing: { compact: 90, midsize: 110, truck: 130, luxury: 160 } },
  { id: 'pet-hair-removal', name: 'Pet Hair Removal', description: 'Specialized removal of embedded pet hair from fabrics and carpets using dedicated tools and methods.', basePrice: 55, pricing: { compact: 55, midsize: 70, truck: 85, luxury: 100 } },
  { id: 'paint-touch-up', name: 'Minor Paint Touch-Up', description: 'Spot touch-ups for small chips and scratches using compatible paint; not a full panel respray.', basePrice: 75, pricing: { compact: 75, midsize: 90, truck: 110, luxury: 140 } }
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
