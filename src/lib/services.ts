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
    description: 'A professional exterior cleaning restoration.',
    basePrice: 90,
    pricing: { compact: 90, midsize: 110, truck: 120, luxury: 130 },
    steps: [
      { id: 'foam-bath', name: 'Exterior Foam Bath', category: 'exterior' },
      { id: 'btn-wash', name: 'Two-Bucket Hand Wash with Grit Guards', category: 'exterior' },
      { id: 'tire-shine', name: 'Tire Scrub & Shine', category: 'exterior' },
      { id: 'rim-clean', name: 'Rims Cleaned & Shined', category: 'exterior' },
      { id: 'gas-cap', name: 'Clean Gas Cap Area', category: 'exterior' },
      { id: 'blow-dry', name: 'Blow Dry – Followed by Microfiber Towel Hand Dry', category: 'exterior' },
      { id: 'spray-wax', name: 'Premium Spray Wax / Paint Sealant', category: 'final' }
    ]
  },
  {
    id: 'prime-essential-interior',
    name: 'Prime Essential Interior',
    description: 'Quickly freshen up your car’s interior.',
    basePrice: 180,
    pricing: { compact: 180, midsize: 200, truck: 210, luxury: 240 },
    steps: [
      { id: 'vac-interior', name: 'Thorough vacuuming of all interior surfaces', category: 'interior' },
      { id: 'wipe-interior', name: 'Detailed wipe-down of all plastics, leather, and vinyl', category: 'interior' },
      { id: 'window-clean', name: 'Window cleaning', category: 'final' }
    ]
  },
  {
    id: 'prime-essential-full',
    name: 'Prime Essential Full Detail',
    description: 'Includes everything in the Essential Interior & Essential Exterior combined.',
    basePrice: 230,
    pricing: { compact: 230, midsize: 270, truck: 290, luxury: 320 },
    steps: [
      { id: 'ext-foam', name: 'Exterior Foam Bath', category: 'exterior' },
      { id: 'ext-wash', name: 'Two-Bucket Hand Wash with Grit Guards', category: 'exterior' },
      { id: 'ext-tire', name: 'Tire Scrub & Shine', category: 'exterior' },
      { id: 'ext-rim', name: 'Rims Cleaned & Shined', category: 'exterior' },
      { id: 'ext-gas', name: 'Clean Gas Cap Area', category: 'exterior' },
      { id: 'ext-dry', name: 'Blow Dry + Microfiber Hand Dry', category: 'exterior' },
      { id: 'ext-wax', name: 'Premium Spray Wax / Paint Sealant', category: 'exterior' },
      { id: 'int-win', name: 'Windows Cleaned Streak Free', category: 'interior' },
      { id: 'int-jamb', name: 'Clean Door & Trunk Jambs', category: 'interior' },
      { id: 'int-mat', name: 'Clean Floor Mats', category: 'interior' },
      { id: 'int-vac', name: 'Thorough Vacuum of Interior', category: 'interior' },
      { id: 'int-wipe', name: 'Thorough Wipe Down of All Interior Surfaces (cracks and crevices)', category: 'final' }
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
      { id: 'elite-foam', name: 'Exterior Foam Bath', category: 'exterior' },
      { id: 'elite-wash', name: 'Two-Bucket Hand Wash with Grit Guards', category: 'exterior' },
      { id: 'elite-tire', name: 'Tire Scrub & Shine', category: 'exterior' },
      { id: 'elite-rim', name: 'Rims Cleaned & Shined', category: 'exterior' },
      { id: 'elite-gas', name: 'Clean Gas Cap Area', category: 'exterior' },
      { id: 'elite-dry', name: 'Blow Dry – Followed by Microfiber Towel Hand Dry', category: 'exterior' },
      { id: 'elite-wax', name: 'Premium Spray Wax / Paint Sealant', category: 'exterior' },
      { id: 'elite-well', name: 'Wheel Wells Cleaned', category: 'exterior' },
      { id: 'elite-clay', name: 'Clay & Paint Decontamination (as needed)', category: 'exterior' },
      { id: 'elite-trim', name: 'Black Trim Restore & UV Protection', category: 'exterior' },
      { id: 'elite-win', name: 'Windows Cleaned Streak Free', category: 'final' },
      { id: 'elite-jamb', name: 'Clean Door & Trunk Jambs', category: 'final' }
    ]
  },
  {
    id: 'prime-elite-interior',
    name: 'Prime Elite Interior',
    description: 'A deep interior cleaning restoration.',
    basePrice: 390,
    pricing: { compact: 390, midsize: 475, truck: 495, luxury: 590 },
    steps: [
      { id: 'elite-int-win', name: 'Windows Cleaned Streak Free', category: 'interior' },
      { id: 'elite-int-jamb', name: 'Clean Door & Trunk Jambs', category: 'interior' },
      { id: 'elite-int-mat', name: 'Clean Floor Mats', category: 'interior' },
      { id: 'elite-int-vac', name: 'Thorough Vacuum of Interior', category: 'interior' },
      { id: 'elite-int-wipe', name: 'Thorough Wipe Down of All Interior Surfaces (cracks and crevices)', category: 'interior' },
      { id: 'elite-int-trunk', name: 'Vacuum Trunk Space', category: 'interior' },
      { id: 'elite-int-vent', name: 'Steam Clean All Panels & Vents', category: 'interior' },
      { id: 'elite-int-carpet', name: 'Steam Clean & Extraction on Carpets', category: 'interior' },
      { id: 'elite-int-seat', name: 'Steam Clean & Extraction on Seats & Upholstery', category: 'interior' },
      { id: 'elite-int-cond', name: 'Condition & Protect Leather Seats', category: 'final' }
    ]
  },
  {
    id: 'prime-elite-full',
    name: 'Prime Elite Full Detail',
    description: 'The ultimate restoration and protection package.',
    basePrice: 495,
    pricing: { compact: 495, midsize: 595, truck: 695, luxury: 850 },
    steps: [
      { id: 'full-foam', name: 'Exterior Foam Bath', category: 'exterior' },
      { id: 'full-wash', name: 'Two-Bucket Hand Wash with Grit Guards', category: 'exterior' },
      { id: 'full-tire', name: 'Tire Scrub & Shine', category: 'exterior' },
      { id: 'full-rim', name: 'Rims Cleaned & Shined', category: 'exterior' },
      { id: 'full-gas', name: 'Clean Gas Cap Area', category: 'exterior' },
      { id: 'full-dry', name: 'Blow Dry – Followed by Microfiber Towel Hand Dry', category: 'exterior' },
      { id: 'full-wax', name: 'Premium Spray Wax / Paint Sealant', category: 'exterior' },
      { id: 'full-well', name: 'Wheel Wells Cleaned', category: 'exterior' },
      { id: 'full-clay', name: 'Clay & Paint Decontamination (as needed)', category: 'exterior' },
      { id: 'full-trim', name: 'Black Trim Restore & UV Protection', category: 'exterior' },
      { id: 'full-ceramic', name: 'Premium Ceramic Sealant Protection', category: 'exterior' },
      { id: 'full-win', name: 'Windows Cleaned Streak Free', category: 'final' },
      { id: 'full-jamb', name: 'Clean Door & Trunk Jambs', category: 'final' },
      { id: 'full-mat', name: 'Clean Floor Mats', category: 'final' },
      { id: 'full-vac', name: 'Thorough Vacuum of Interior', category: 'interior' },
      { id: 'full-wipe', name: 'Thorough Wipe Down of All Interior Surfaces (cracks and crevices)', category: 'interior' },
      { id: 'full-trunk', name: 'Vacuum Trunk Space', category: 'interior' },
      { id: 'full-vent', name: 'Steam Clean All Panels & Vents', category: 'interior' },
      { id: 'full-carpet', name: 'Steam Clean & Extraction on Carpets', category: 'interior' },
      { id: 'full-seats', name: 'Steam Clean & Extraction on Seats & Upholstery', category: 'interior' },
      { id: 'full-leather', name: 'Condition & Protection Leather Seats', category: 'final' }
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
  { id: 'ceramic-coating', name: 'Ceramic Coating', category: 'exterior', description: 'Long-lasting paint protection with hydrophobic properties', basePrice: 500, pricing: { compact: 500, midsize: 500, truck: 550, luxury: 600 } },
  { id: 'paint-correction', name: 'Paint Correction', category: 'exterior', description: 'Remove swirls, scratches, and restore paint clarity', basePrice: 300, pricing: { compact: 300, midsize: 350, truck: 400, luxury: 450 } },
  { id: 'deep-interior', name: 'Deep Interior Detail', category: 'interior', description: 'Thorough cleaning of all interior surfaces, carpets, and upholstery', basePrice: 150, pricing: { compact: 150, midsize: 175, truck: 200, luxury: 225 } },
  { id: 'odor-treatment', name: 'Odor Elimination Treatment', category: 'interior', description: 'Professional ozone treatment to eliminate persistent odors', basePrice: 100, pricing: { compact: 100, midsize: 100, truck: 100, luxury: 100 } },
  { id: 'pet-hair', name: 'Pet Hair Removal', category: 'interior', description: 'Specialized removal of embedded pet hair from all surfaces', basePrice: 75, pricing: { compact: 75, midsize: 85, truck: 95, luxury: 105 } },
  { id: 'stain-treatment', name: 'Stain Treatment', category: 'interior', description: 'Professional stain removal for carpets and upholstery', basePrice: 80, pricing: { compact: 80, midsize: 90, truck: 100, luxury: 110 } },
  { id: 'scratch-repair', name: 'Scratch Repair', category: 'exterior', description: 'Minor scratch repair and touch-up', basePrice: 200, pricing: { compact: 200, midsize: 200, truck: 200, luxury: 200 } },
  { id: 'eco-package', name: 'Eco-Friendly Package', category: 'exterior', description: 'Complete detail using environmentally-safe products', basePrice: 120, pricing: { compact: 120, midsize: 130, truck: 140, luxury: 150 } },
  { id: 'headlight-restoration', name: 'Headlight Restoration', category: 'exterior', description: 'Restore clarity to oxidized and yellowed headlights', basePrice: 90, pricing: { compact: 90, midsize: 90, truck: 90, luxury: 90 } },
  { id: 'engine-detail', name: 'Engine Bay Detailing', category: 'exterior', description: 'Professional cleaning and dressing of engine compartment', basePrice: 110, pricing: { compact: 110, midsize: 110, truck: 110, luxury: 110 } }
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
