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

  // 1. Precise Prep/Setup steps (by ID)
  if (sid === 'prep-inspect') return "Walk around the vehicle and note existing damage (dents, scratches) on the diagram. Confirm vehicle condition with customer if present.";
  if (sid === 'prep-tools') return "Ensure pressure washer, foam cannon, buckets, mitts, and brushes are ready. Check water tank and generator fuel levels.";
  if (sid === 'prep-walkaround') return "Review the service package with the client. Confirm any special requests or areas of concern.";

  // 2. Interior Specifics (Highest precedence to avoid "wheel" vs "steering wheel" overlap)
  if (n.includes('steering wheel') || n.includes('dash')) return "Use a soft brush and microfiber to clean the instrument cluster, steering wheel buttons, and dashboard seams. UV protect handles/plastics.";
  if (n.includes('console') || n.includes('accessories')) return "Clean cup holders, shift boot, and center storage areas. Use steam for sticky residue if needed.";
  if (n.includes('mats')) return "Remove mats from vehicle. Pressure wash rubber mats or vacuum and detail carpet mats. Dry completely before reinstalling.";
  if (n.includes('rugs')) return "Clean large area rugs or custom floor coverings separately to ensure deep grit removal.";
  if (n.includes('vacuum')) return "Remove floor mats first. Vacuum all carpets, seats, and crevices. Use stiff brush to agitate embedded debris.";
  if (n.includes('steam clean all panels')) return "Use dry steam to sanitize and deep clean plastic/vinyl panels. Wipe immediately with clean microfiber.";
  if (n.includes('steam clean all vents')) return "Direct steam into HVAC vents to kill bacteria and remove dust. Follow with compressed air.";
  if (n.includes('extraction')) return "Apply fabric cleaner/shampoo. Agitate with brush. Use heated extractor to pull out dirt and moisture. Don't over-saturate.";
  if (n.includes('condition & protect leather')) return "Apply pH-balanced leather conditioner with applicator. Let dwell for 5 mins then buff off excess for a matte finish.";
  if (n.includes('wipe down') || n.includes('wipe-down')) return "Wipe down dashboard, console, and door panels with APC and a microfiber towel. Use a brush for vents.";

  // 3. Exterior Details & Specialty
  if (n.includes('jamb')) return "Degrease and wipe all door, trunk, and hood jambs. Ensure no cleaner residue remains on weather stripping.";
  if (n.includes('gas cap')) return "Open gas cap door, degrease the inner area, and rinse. Wipe dry to prevent water streaks.";
  if (n.includes('wheel wells') || n.includes('well cleaned')) return "Degrease and pressure wash the wheel wells to remove mud, salt, and road grime.";
  if (n.includes('rim') || (n.includes('wheel') && !n.includes('steering'))) return "Clean face and barrel of wheels. Use iron remover if brake dust is heavy. Rinse thoroughly.";
  if (n.includes('tire')) return "Apply tire dressing evenly with an applicator pad. Wipe off excess to prevent sling.";
  if (n.includes('clay')) return "Spray clay lubricant liberally. Gently glide clay bar over paint until smooth. Fold clay often to expose clean surface.";
  if (n.includes('wax') || n.includes('sealant')) return "Apply thin, even layer using a soft foam applicator. Allow to haze (if required) then buff off with a clean plush towel.";

  // 4. General Exterior Wash
  if (n.includes('foam')) return "Apply a thick layer of foam. Let it dwell for 3-5 minutes to loosen grime. Do not let it dry on paint.";
  if (n.includes('wash')) return "Use the two-bucket method. Wash from top to bottom. Use a separate mitt for lower panels/wheels if possible.";
  if (n.includes('rinse')) return "Thoroughly rinse the vehicle from top to bottom to remove loose dirt and debris. Don't forget wheel wells.";
  if (n.includes('dry')) return "Use a clean microfiber drying towel or air blower. Ensure no standing water remains in mirrors, door jambs, or grilles.";

  // 5. Final / Shared
  if (n.includes('glass') || n.includes('windows cleaned')) return "Use distinct glass towel. Spray cleaner on towel, not glass (to avoid overspray). Wipe in box pattern.";

  return "Perform this step with care. Ensure quality standards are met before proceeding.";
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
      { id: 'foam-bath', name: 'Exterior Foam Bath', category: 'exterior', instructions: getServiceInstructions('Exterior Foam Bath') },
      { id: 'btn-wash', name: 'Two-Bucket Hand Wash with Grit Guards', category: 'exterior', instructions: getServiceInstructions('Two-Bucket Hand Wash with Grit Guards') },
      { id: 'tire-shine', name: 'Tire Scrub & Shine', category: 'exterior', instructions: getServiceInstructions('Tire Scrub & Shine') },
      { id: 'rim-clean', name: 'Rims Cleaned & Shined', category: 'exterior', instructions: getServiceInstructions('Rims Cleaned & Shined') },
      { id: 'gas-cap', name: 'Clean Gas Cap Area', category: 'exterior', instructions: getServiceInstructions('Clean Gas Cap Area') },
      { id: 'blow-dry', name: 'Blow Dry – Followed by Microfiber Towel Hand Dry', category: 'exterior', instructions: getServiceInstructions('Blow Dry – Followed by Microfiber Towel Hand Dry') },
      { id: 'spray-wax', name: 'Premium Spray Wax / Paint Sealant', category: 'final', instructions: getServiceInstructions('Premium Spray Wax / Paint Sealant') }
    ]
  },
  {
    id: 'prime-essential-interior',
    name: 'Prime Essential Interior',
    description: 'Quickly freshen up your car’s interior.',
    basePrice: 180,
    pricing: { compact: 180, midsize: 200, truck: 210, luxury: 240 },
    steps: [
      { id: 'int-vac', name: 'Thorough Vacuum of Interior', category: 'interior', instructions: getServiceInstructions('Thorough Vacuum of Interior') },
      { id: 'int-mats', name: 'Clean All Floor Mats', category: 'interior', instructions: getServiceInstructions('Clean All Floor Mats') },
      { id: 'int-rugs', name: 'Clean All Area Rugs', category: 'interior', instructions: getServiceInstructions('Clean All Area Rugs') },
      { id: 'int-dash', name: 'Clean Dashboard & Steering Wheel', category: 'interior', instructions: getServiceInstructions('Clean Dashboard & Steering Wheel') },
      { id: 'int-console', name: 'Clean Center Console & Accessories', category: 'interior', instructions: getServiceInstructions('Clean Center Console & Accessories') },
      { id: 'int-wipe', name: 'Thorough Wipe Down of All Interior Surfaces', category: 'interior', instructions: getServiceInstructions('Thorough Wipe Down of All Interior Surfaces') },
      { id: 'int-win', name: 'Windows Cleaned Streak Free', category: 'final', instructions: getServiceInstructions('Windows Cleaned Streak Free') }
    ]
  },
  {
    id: 'prime-essential-full',
    name: 'Prime Essential Full Detail',
    description: 'Includes everything in the Essential Interior & Essential Exterior combined.',
    basePrice: 230,
    pricing: { compact: 230, midsize: 270, truck: 290, luxury: 320 },
    steps: [
      { id: 'ext-foam', name: 'Exterior Foam Bath', category: 'exterior', instructions: getServiceInstructions('Exterior Foam Bath') },
      { id: 'ext-wash', name: 'Two-Bucket Hand Wash with Grit Guards', category: 'exterior', instructions: getServiceInstructions('Two-Bucket Hand Wash with Grit Guards') },
      { id: 'ext-tire', name: 'Tire Scrub & Shine', category: 'exterior', instructions: getServiceInstructions('Tire Scrub & Shine') },
      { id: 'ext-rim', name: 'Rims Cleaned & Shined', category: 'exterior', instructions: getServiceInstructions('Rims Cleaned & Shined') },
      { id: 'ext-gas', name: 'Clean Gas Cap Area', category: 'exterior', instructions: getServiceInstructions('Clean Gas Cap Area') },
      { id: 'ext-dry', name: 'Blow Dry – Followed by Microfiber Towel Hand Dry', category: 'exterior', instructions: getServiceInstructions('Blow Dry – Followed by Microfiber Towel Hand Dry') },
      { id: 'ext-wax', name: 'Premium Spray Wax / Paint Sealant', category: 'exterior', instructions: getServiceInstructions('Premium Spray Wax / Paint Sealant') },
      { id: 'int-vac', name: 'Thorough Vacuum of Interior', category: 'interior', instructions: getServiceInstructions('Thorough Vacuum of Interior') },
      { id: 'int-mats', name: 'Clean All Floor Mats', category: 'interior', instructions: getServiceInstructions('Clean All Floor Mats') },
      { id: 'int-rugs', name: 'Clean All Area Rugs', category: 'interior', instructions: getServiceInstructions('Clean All Area Rugs') },
      { id: 'int-dash', name: 'Clean Dashboard & Steering Wheel', category: 'interior', instructions: getServiceInstructions('Clean Dashboard & Steering Wheel') },
      { id: 'int-console', name: 'Clean Center Console & Accessories', category: 'interior', instructions: getServiceInstructions('Clean Center Console & Accessories') },
      { id: 'int-wipe', name: 'Thorough Wipe Down of All Interior Surfaces', category: 'interior', instructions: getServiceInstructions('Thorough Wipe Down of All Interior Surfaces') },
      { id: 'int-win', name: 'Windows Cleaned Streak Free', category: 'final', instructions: getServiceInstructions('Windows Cleaned Streak Free') },
      { id: 'int-jamb', name: 'Clean Door & Trunk Jambs', category: 'final', instructions: getServiceInstructions('Clean Door & Trunk Jambs') }
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
      { id: 'elite-foam', name: 'Exterior Foam Bath', category: 'exterior', instructions: getServiceInstructions('Exterior Foam Bath') },
      { id: 'elite-wash', name: 'Two-Bucket Hand Wash with Grit Guards', category: 'exterior', instructions: getServiceInstructions('Two-Bucket Hand Wash with Grit Guards') },
      { id: 'elite-tire', name: 'Tire Scrub & Shine', category: 'exterior', instructions: getServiceInstructions('Tire Scrub & Shine') },
      { id: 'elite-rim', name: 'Rims Cleaned & Shined', category: 'exterior', instructions: getServiceInstructions('Rims Cleaned & Shined') },
      { id: 'elite-gas', name: 'Clean Gas Cap Area', category: 'exterior', instructions: getServiceInstructions('Clean Gas Cap Area') },
      { id: 'elite-dry', name: 'Blow Dry – Followed by Microfiber Towel Hand Dry', category: 'exterior', instructions: getServiceInstructions('Blow Dry – Followed by Microfiber Towel Hand Dry') },
      { id: 'elite-wax', name: 'Premium Spray Wax / Paint Sealant', category: 'exterior', instructions: getServiceInstructions('Premium Spray Wax / Paint Sealant') },
      { id: 'elite-well', name: 'Wheel Wells Cleaned', category: 'exterior', instructions: getServiceInstructions('Wheel Wells Cleaned') },
      { id: 'elite-clay', name: 'Clay Bar Treatment', category: 'exterior', instructions: getServiceInstructions('Clay Bar Treatment') },
      { id: 'elite-decon', name: 'Paint Decontamination', category: 'exterior', instructions: getServiceInstructions('Paint Decontamination') },
      { id: 'elite-trim', name: 'Black Trim Restore & UV Protection', category: 'exterior', instructions: getServiceInstructions('Black Trim Restore & UV Protection') },
      { id: 'elite-win', name: 'Windows Cleaned Streak Free', category: 'final', instructions: getServiceInstructions('Windows Cleaned Streak Free') },
      { id: 'elite-jamb', name: 'Clean Door & Trunk Jambs', category: 'final', instructions: getServiceInstructions('Clean Door & Trunk Jambs') }
    ]
  },
  {
    id: 'prime-elite-interior',
    name: 'Prime Elite Interior',
    description: 'A deep interior cleaning restoration.',
    basePrice: 390,
    pricing: { compact: 390, midsize: 475, truck: 495, luxury: 590 },
    steps: [
      { id: 'elite-int-vac', name: 'Thorough Vacuum of Interior', category: 'interior', instructions: getServiceInstructions('Thorough Vacuum of Interior') },
      { id: 'elite-int-mats', name: 'Clean All Floor Mats', category: 'interior', instructions: getServiceInstructions('Clean All Floor Mats') },
      { id: 'elite-int-rugs', name: 'Clean All Area Rugs', category: 'interior', instructions: getServiceInstructions('Clean All Area Rugs') },
      { id: 'elite-int-dash', name: 'Clean Dashboard & Steering Wheel', category: 'interior', instructions: getServiceInstructions('Clean Dashboard & Steering Wheel') },
      { id: 'elite-int-console', name: 'Clean Center Console & Accessories', category: 'interior', instructions: getServiceInstructions('Clean Center Console & Accessories') },
      { id: 'elite-int-wipe', name: 'Thorough Wipe Down of All Interior Surfaces', category: 'interior', instructions: getServiceInstructions('Thorough Wipe Down of All Interior Surfaces') },
      { id: 'elite-int-win', name: 'Windows Cleaned Streak Free', category: 'interior', instructions: getServiceInstructions('Windows Cleaned Streak Free') },
      { id: 'elite-int-jamb', name: 'Clean Door & Trunk Jambs', category: 'interior', instructions: getServiceInstructions('Clean Door & Trunk Jambs') },
      { id: 'elite-int-trunk', name: 'Vacuum Trunk Space', category: 'interior', instructions: getServiceInstructions('Vacuum Trunk Space') },
      { id: 'elite-int-panels', name: 'Steam Clean All Panels', category: 'interior', instructions: getServiceInstructions('Steam Clean All Panels') },
      { id: 'elite-int-vents', name: 'Steam Clean All Vents', category: 'interior', instructions: getServiceInstructions('Steam Clean All Vents') },
      { id: 'elite-int-carpet', name: 'Steam Clean & Extraction on Carpets', category: 'interior', instructions: getServiceInstructions('Steam Clean & Extraction on Carpets') },
      { id: 'elite-int-seat-steam', name: 'Steam Clean & Extraction on Seats', category: 'interior', instructions: getServiceInstructions('Steam Clean & Extraction on Seats') },
      { id: 'elite-int-upholstery-steam', name: 'Steam Clean & Extraction on Upholstery', category: 'interior', instructions: getServiceInstructions('Steam Clean & Extraction on Upholstery') },
      { id: 'elite-int-cond', name: 'Condition & Protect Leather Seats', category: 'final', instructions: getServiceInstructions('Condition & Protect Leather Seats') }
    ]
  },
  {
    id: 'prime-elite-full',
    name: 'Prime Elite Full Detail',
    description: 'The ultimate restoration and protection package.',
    basePrice: 495,
    pricing: { compact: 495, midsize: 595, truck: 695, luxury: 850 },
    steps: [
      { id: 'full-foam', name: 'Exterior Foam Bath', category: 'exterior', instructions: getServiceInstructions('Exterior Foam Bath') },
      { id: 'full-wash', name: 'Two-Bucket Hand Wash with Grit Guards', category: 'exterior', instructions: getServiceInstructions('Two-Bucket Hand Wash with Grit Guards') },
      { id: 'full-tire', name: 'Tire Scrub & Shine', category: 'exterior', instructions: getServiceInstructions('Tire Scrub & Shine') },
      { id: 'full-rim', name: 'Rims Cleaned & Shined', category: 'exterior', instructions: getServiceInstructions('Rims Cleaned & Shined') },
      { id: 'full-gas', name: 'Clean Gas Cap Area', category: 'exterior', instructions: getServiceInstructions('Clean Gas Cap Area') },
      { id: 'full-dry', name: 'Blow Dry – Followed by Microfiber Towel Hand Dry', category: 'exterior', instructions: getServiceInstructions('Blow Dry – Followed by Microfiber Towel Hand Dry') },
      { id: 'full-wax', name: 'Premium Spray Wax / Paint Sealant', category: 'exterior', instructions: getServiceInstructions('Premium Spray Wax / Paint Sealant') },
      { id: 'full-well', name: 'Wheel Wells Cleaned', category: 'exterior', instructions: getServiceInstructions('Wheel Wells Cleaned') },
      { id: 'full-clay', name: 'Clay Bar Treatment', category: 'exterior', instructions: getServiceInstructions('Clay Bar Treatment') },
      { id: 'full-decon', name: 'Paint Decontamination', category: 'exterior', instructions: getServiceInstructions('Paint Decontamination') },
      { id: 'full-trim', name: 'Black Trim Restore & UV Protection', category: 'exterior', instructions: getServiceInstructions('Black Trim Restore & UV Protection') },
      { id: 'full-ceramic', name: 'Premium Ceramic Sealant Protection', category: 'exterior', instructions: getServiceInstructions('Premium Ceramic Sealant Protection') },
      { id: 'full-vac', name: 'Thorough Vacuum of Interior', category: 'interior', instructions: getServiceInstructions('Thorough Vacuum of Interior') },
      { id: 'full-mats', name: 'Clean All Floor Mats', category: 'interior', instructions: getServiceInstructions('Clean All Floor Mats') },
      { id: 'full-rugs', name: 'Clean All Area Rugs', category: 'interior', instructions: getServiceInstructions('Clean All Area Rugs') },
      { id: 'full-dash', name: 'Clean Dashboard & Steering Wheel', category: 'interior', instructions: getServiceInstructions('Clean Dashboard & Steering Wheel') },
      { id: 'full-console', name: 'Clean Center Console & Accessories', category: 'interior', instructions: getServiceInstructions('Clean Center Console & Accessories') },
      { id: 'full-wipe', name: 'Thorough Wipe Down of All Interior Surfaces', category: 'interior', instructions: getServiceInstructions('Thorough Wipe Down of All Interior Surfaces') },
      { id: 'full-win', name: 'Windows Cleaned Streak Free', category: 'final', instructions: getServiceInstructions('Windows Cleaned Streak Free') },
      { id: 'full-jamb', name: 'Clean Door & Trunk Jambs', category: 'final', instructions: getServiceInstructions('Clean Door & Trunk Jambs') },
      { id: 'full-trunk', name: 'Vacuum Trunk Space', category: 'interior', instructions: getServiceInstructions('Vacuum Trunk Space') },
      { id: 'full-panels', name: 'Steam Clean All Panels', category: 'interior', instructions: getServiceInstructions('Steam Clean All Panels') },
      { id: 'full-vents', name: 'Steam Clean All Vents', category: 'interior', instructions: getServiceInstructions('Steam Clean All Vents') },
      { id: 'full-carpet', name: 'Steam Clean & Extraction on Carpets', category: 'interior', instructions: getServiceInstructions('Steam Clean & Extraction on Carpets') },
      { id: 'full-seats', name: 'Steam Clean & Extraction on Seats', category: 'interior', instructions: getServiceInstructions('Steam Clean & Extraction on Seats') },
      { id: 'full-upholstery', name: 'Steam Clean & Extraction on Upholstery', category: 'interior', instructions: getServiceInstructions('Steam Clean & Extraction on Upholstery') },
      { id: 'full-leather', name: 'Condition & Protect Leather Seats', category: 'final', instructions: getServiceInstructions('Condition & Protect Leather Seats') }
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
  { id: 'clay-bar', name: 'Clay Bar & Iron Decontamination', category: 'exterior', description: 'Deep removal of embedded surface contaminants and iron particles', basePrice: 80, pricing: { compact: 80, midsize: 90, truck: 100, luxury: 120 } },
  { id: 'headlight-restoration', name: 'Headlight Restoration', category: 'exterior', description: 'Restore clarity to oxidized and yellowed headlights', basePrice: 35, pricing: { compact: 35, midsize: 40, truck: 50, luxury: 65 } },
  { id: 'leather-conditioning', name: 'Leather Conditioning', category: 'interior', description: 'Nourishing treatment for leather surfaces to restore suppleness and protect against UV and wear.', basePrice: 25, pricing: { compact: 25, midsize: 30, truck: 35, luxury: 45 } },
  { id: 'ceramic-trim-coat', name: 'Ceramic Trim Coat Restoration', category: 'exterior', description: 'Restores faded exterior plastics and applies a ceramic coating for long-lasting color and UV protection.', basePrice: 60, pricing: { compact: 60, midsize: 75, truck: 95, luxury: 125 } },
  { id: 'engine-bay', name: 'Engine Bay Cleaning', category: 'exterior', description: 'Careful degreasing and dressing of the engine bay; safe processes to improve appearance without high-pressure intrusion.', basePrice: 70, pricing: { compact: 70, midsize: 85, truck: 100, luxury: 120 } },
  { id: 'pet-hair', name: 'Pet Hair Removal', category: 'interior', description: 'Specialized removal of embedded pet hair from all surfaces', basePrice: 75, pricing: { compact: 75, midsize: 85, truck: 95, luxury: 105 } },
  { id: 'stain-treatment', name: 'Stain Treatment', category: 'interior', description: 'Professional stain removal for carpets and upholstery', basePrice: 80, pricing: { compact: 80, midsize: 90, truck: 100, luxury: 110 } },
  { id: 'scratch-repair', name: 'Scratch Repair', category: 'exterior', description: 'Minor scratch repair and touch-up', basePrice: 200, pricing: { compact: 200, midsize: 200, truck: 200, luxury: 200 } },
  { id: 'deep-interior', name: 'Deep Interior Detail', category: 'interior', description: 'Thorough cleaning of all interior surfaces, carpets, and upholstery', basePrice: 150, pricing: { compact: 150, midsize: 175, truck: 200, luxury: 225 } },
  { id: 'paint-sealant', name: 'Paint Sealant Application', category: 'exterior', description: 'Application of a durable synthetic sealant to enhance gloss and protect paint against environmental elements.', basePrice: 90, pricing: { compact: 90, midsize: 110, truck: 130, luxury: 160 } },
  { id: 'odor-eliminator', name: 'Odor Eliminator', category: 'interior', description: 'Targeted odor neutralization (food, smoke, pet) using professional-grade products; does not mask—neutralizes.', basePrice: 15, pricing: { compact: 15, midsize: 20, truck: 25, luxury: 35 } },
  { id: 'paint-touch-up', name: 'Minor Paint Touch-Up', category: 'exterior', description: 'Spot touch-ups for small chips and scratches using compatible paint; not a full panel respray.', basePrice: 75, pricing: { compact: 75, midsize: 90, truck: 110, luxury: 140 } },
  { id: 'ceramic-coating', name: 'Ceramic Coating', category: 'exterior', description: 'Long-lasting paint protection with hydrophobic properties', basePrice: 500, pricing: { compact: 500, midsize: 500, truck: 550, luxury: 600 } },
  { id: 'paint-correction', name: 'Paint Correction', category: 'exterior', description: 'Remove swirls, scratches, and restore paint clarity', basePrice: 300, pricing: { compact: 300, midsize: 350, truck: 400, luxury: 450 } },
  { id: 'odor-treatment', name: 'Odor Elimination Treatment', category: 'interior', description: 'Professional ozone treatment to eliminate persistent odors', basePrice: 100, pricing: { compact: 100, midsize: 100, truck: 100, luxury: 100 } }
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
  const nid = id.toLowerCase();
  if (nid.includes('full')) return 2.5;
  if (nid.includes('interior')) return 1.5;
  if (nid.includes('exterior')) return 1.0;
  return 2.0;
}
