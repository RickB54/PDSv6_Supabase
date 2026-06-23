import { servicePackages, addOns } from "@/lib/services";
import { getPackageMeta, getAddOnMeta } from "@/lib/servicesMeta";

export type VehicleType = "compact" | "midsize" | "truck" | "luxury";

export interface PricingInfo {
    basePrice: number;
    minPrice?: number;
    maxPrice?: number;
    priceRange?: string;
}

/**
 * Get accurate pricing from your Package/Addon system
 * @param serviceId - The package or addon ID
 * @param vehicleType - Optional vehicle type. If not provided, returns price range
 * @returns Pricing information with either exact price or range
 */
export function getServicePrice(serviceId: string, vehicleType?: VehicleType): PricingInfo {
    // Check packages first
    const pkg = servicePackages.find(p => p.id === serviceId);
    if (pkg) {
        if (vehicleType) {
            return {
                basePrice: pkg.pricing[vehicleType]
            };
        } else {
            //No vehicle type - return range
            const prices = [
                pkg.pricing.compact,
                pkg.pricing.midsize,
                pkg.pricing.truck,
                pkg.pricing.luxury
            ];
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            return {
                basePrice: min,
                minPrice: min,
                maxPrice: max,
                priceRange: min === max ? `$${min}` : `$${min}-$${max}`
            };
        }
    }

    // Check addons
    const addon = addOns.find(a => a.id === serviceId);
    if (addon) {
        if (vehicleType) {
            return {
                basePrice: addon.pricing[vehicleType]
            };
        } else {
            const prices = [
                addon.pricing.compact,
                addon.pricing.midsize,
                addon.pricing.truck,
                addon.pricing.luxury
            ];
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            return {
                basePrice: min,
                minPrice: min,
                maxPrice: max,
                priceRange: min === max ? `$${min}` : `$${min}-$${max}`
            };
        }
    }

    // Service not found - return 0
    return {
        basePrice: 0,
        priceRange: "$0"
    };
}

/**
 * Map service names to your actual package/addon IDs
 * This connects the evaluation services to your real pricing
 */
export const SERVICE_ID_MAP: Record<string, string> = {
    // Map evaluation service IDs to your actual package/addon IDs
    "full-interior-detail": "interior-cleaning", // Package ID
    "express-interior": "basic-exterior", // Closest match
    "carpet-extraction": "carpet-shampoo", // Addon ID
    "ozone-treatment": "ozone-treatment", // Addon ID
    "pet-hair-removal": "pet-hair-removal", // Addon ID
    "paint-correction": "paint-correction", // Addon ID
    "polish-wax": "express-wax", // Package ID
    "ceramic-coating": "ceramic-coating", // Addon ID
    "leather-conditioning": "leather-conditioning", // Addon ID
    "headlight-restoration": "headlight-restoration", // Addon ID
    "engine-bay-detail": "engine-detail", // Addon ID
    "clay-bar-treatment": "clay-bar", // Addon ID
};

/**
 * Map a vehicle type string from customer data to pricing vehicle type
 */
export function normalizeVehicleType(vehicleType?: string): VehicleType | undefined {
    if (!vehicleType) return undefined;
    const lower = vehicleType.toLowerCase().trim();

    // 1. LUXURY / OVERSIZED
    if (matchAny(lower, [
        "escalade", "esv", "ext", "lyriq", "navigator", "aviator",
        "g-wagon", "gls", "sprinter", "metris", "maybach", "s-class",
        "x7", "xm", "7 series", "q7", "q8", "a8", "range rover", "defender 130",
        "lx", "ls", "lm", "wagoneer", "grand wagoneer", "cybertruck", "model x",
        "transit", "promaster", "express", "savana", "sienna", "odyssey", "pacifica", "carnival", "quest",
        "cadillac", "porsche", "maserati", "bentley", "rolls royce", "aston martin", "ferrari", "lamborghini", "mclaren"
    ])) return "luxury";

    // 2. TRUCK / LARGE SUV
    if (matchAny(lower, [
        "2500", "3500", "ram trx", "raptor", "dually",
        "passport", "pilot", "ridgeline", "highlander", "grand highlander", "sequoia", "tundra", "tacoma", "4runner", "land cruiser",
        "expedition", "excursion", "f-250", "f-350", "f-450", "explorer", "f-150", "ranger", "maverick", "bronco", "mustang mach-e",
        "suburban", "yukon xl", "tahoe", "yukon", "hummer", "traverse", "blazer", "silverado", "colorado", "sierra", "canyon", "acadia",
        "wrangler", "gladiator", "grand cherokee", "durango", "ram 1500", "pathfinder", "armada", "titan", "frontier", "ascent",
        "palisade", "santa fe", "telluride", "sorento", "mohave", "cx-9", "cx-90", "atlas", "id.buzz", "xc90", "q5", "e-tron", "x5", "x6",
        "gle", "g-class", "gx", "rx", "tx", "mdx", "zdx", "qx60", "qx80", "model y"
    ])) return "truck";

    // 3. MIDSIZE
    if (matchAny(lower, [
        "cr-v", "crv", "hr-v", "prologue", "accord", "rav4", "venza", "corolla cross", "bz4x", "camry", "crown",
        "escape", "edge", "bronco sport", "fusion", "equinox", "trailblazer", "trax", "malibu", "bolt",
        "rogue", "murano", "kicks", "altima", "maxima", "outback", "forester", "crosstrek", "solterra", "legacy",
        "tucson", "kona", "santa cruz", "ioniq 5", "sportage", "seltos", "niro", "ev6", "k5", "sonata", "stinger",
        "cx-5", "cx-50", "cx-30", "mazda6", "tiguan", "taos", "id.4", "passat", "xc60", "xc40", "c40", "s90", "v90", "v60",
        "q3", "q4", "a4", "a5", "a6", "allroad", "x1", "x2", "x3", "x4", "3 series", "4 series", "5 series", "i4", "i5",
        "glc", "glb", "gla", "eqb", "eqe", "c-class", "e-class", "nx", "ux", "rz", "es", "is", "rdx", "tlx", "integra", "qx50", "qx55", "q50",
        "model 3", "model s"
    ])) return "midsize";

    // 4. COMPACT
    if (matchAny(lower, [
        "prius", "corolla", "civic", "fit", "insight", "sentra", "versa", "leaf", "z", "elantra", "venue", "forte", "rio", "soul",
        "mazda3", "mx-5", "miata", "jetta", "golf", "gti", "r", "beetle", "impreza", "wrx", "brz", "cooper", "countryman", "clubman", "500",
        "911", "718", "cayman", "boxster", "taycan", "macan", "cayenne", "2 series", "z4", "a-class", "cla", "sl", "a3", "tt"
    ])) return "compact";

    if (lower.includes("xl") || lower.includes("esv") || lower.includes("long") || lower.includes("dually") || lower.includes("van") || lower.includes("minivan")) return "luxury";
    if (lower.includes("f150") || lower.includes("1500") || lower.includes("truck") || lower.includes("pickup") || lower.includes("large suv")) return "truck";
    if (lower.includes("suv") || lower.includes("crossover") || lower.includes("mid") || lower.includes("jeep")) return "midsize";
    if (lower.includes("sedan") || lower.includes("coupe") || lower.includes("convertible") || lower.includes("compact") || lower.includes("small") || lower.includes("hatchback")) return "compact";

    return undefined;
}

// Helper for matching
function matchAny(text: string, phrases: string[]): boolean {
    return phrases.some(p => text.includes(p));
}
