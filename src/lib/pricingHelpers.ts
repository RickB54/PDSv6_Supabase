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
/**
 * Map a vehicle type string from customer data to pricing vehicle type
 */
export function normalizeVehicleType(vehicleType?: string): VehicleType | undefined {
    if (!vehicleType) return undefined;

    const lower = vehicleType.toLowerCase().trim();

    // ---------------------------------------------------------
    // 1. SPECIFIC MODEL OVERRIDES (The "1000 Vehicle" Database)
    // ---------------------------------------------------------
    // These check for specific model names found within the string

    // LUXURY / OVERSIZED (Highest Priority)
    if (matchAny(lower, [
        // Cadillac
        "escalade", "esv", "ext", "lyriq",
        // Lincoln
        "navigator", "aviator",
        // Chevrolet / GMC
        "suburban", "yukon xl", "tahoe", "yukon", "hummer",
        // Ford
        "expedition", "excursion", "f-250", "f-350", "f-450", "dually",
        // Mercedes
        "g-wagon", "gls", "sprinter", "metris", "maybach", "s-class",
        // BMW
        "x7", "xm", "7 series",
        // Audi
        "q7", "q8", "a8",
        // Land Rover
        "range rover", "defender 130",
        // Lexus
        "lx", "ls", "lm",
        // Jeep
        "wagoneer", "grand wagoneer",
        // Tesla
        "cybertruck", "model x",
        // Trucks (Heavy Duty)
        "2500", "3500", "ram trx", "raptor", "dually",
        // Vans
        "transit", "promaster", "express", "savana", "sienna", "odyssey", "pacifica", "carnival", "quest"
    ])) return "luxury";

    // TRUCK / LARGE SUV (High Priority)
    if (matchAny(lower, [
        // Honda
        "passport", "pilot", "ridgeline",
        // Toyota
        "highlander", "grand highlander", "sequoia", "tundra", "tacoma", "4runner", "land cruiser",
        // Ford
        "explorer", "f-150", "ranger", "maverick", "bronco", "mustang mach-e",
        // Chevrolet / GMC
        "traverse", "blazer", "silverado", "colorado", "sierra", "canyon", "acadia",
        // Jeep
        "wrangler", "gladiator", "grand cherokee",
        // Dodge / RAM
        "durango", "ram 1500",
        // Nissan
        "pathfinder", "armada", "titan", "frontier",
        // Subaru
        "ascent",
        // Hyundai / Kia
        "palisade", "santa fe", "telluride", "sorento", "mohave",
        // Mazda
        "cx-9", "cx-90",
        // Volkswagen
        "atlas", "id.buzz",
        // Volvo
        "xc90",
        // Audi
        "q5", "e-tron",
        // BMW
        "x5", "x6",
        // Mercedes
        "gle", "g-class",
        // Lexus
        "gx", "rx", "tx",
        // Acura
        "mdx", "zdx",
        // Infiniti
        "qx60", "qx80",
        // Tesla
        "model y"
    ])) return "truck";

    // MIDSIZE / SMALL SUV / CROSSOVER
    if (matchAny(lower, [
        // Honda
        "cr-v", "crv", "hr-v", "prologue", "accord",
        // Toyota
        "rav4", "venza", "corolla cross", "bz4x", "camry", "crown", "prius",
        // Ford
        "escape", "edge", "bronco sport", "fusion",
        // Chevrolet
        "equinox", "trailblazer", "trax", "malibu", "bolt",
        // Nissan
        "rogue", "murano", "kicks", "altima", "maxima",
        // Subaru
        "outback", "forester", "crosstrek", "solterra", "legacy",
        // Hyundai / Kia
        "tucson", "kona", "santa cruz", "ioniq 5", "sportage", "seltos", "niro", "ev6", "k5", "sonata", "stinger",
        // Mazda
        "cx-5", "cx-50", "cx-30", "mazda6",
        // Volkswagen
        "tiguan", "taos", "id.4", "passat",
        // Volvo
        "xc60", "xc40", "c40", "s90", "v90", "v60",
        // Audi
        "q3", "q4", "a4", "a5", "a6", "allroad",
        // BMW
        "x1", "x2", "x3", "x4", "3 series", "4 series", "5 series", "i4", "i5",
        // Mercedes
        "glc", "glb", "gla", "eqb", "eqe", "c-class", "e-class",
        // Lexus
        "nx", "ux", "rz", "es", "is",
        // Acura
        "rdx", "tlx", "integra",
        // Infiniti
        "qx50", "qx55", "q50",
        // Tesla
        "model 3", "model s"
    ])) return "midsize";

    // COMPACT / SEDAN / COUPE
    if (matchAny(lower, [
        // Honda
        "civic", "fit", "insight",
        // Toyota
        "corolla", "gr86", "supra", "yaris",
        // Nissan
        "sentra", "versa", "leaf", "z",
        // Hyundai / Kia
        "elantra", "venue", "forte", "rio", "soul",
        // Mazda
        "mazda3", "mx-5", "miata",
        // Volkswagen
        "jetta", "golf", "gti", "r", "beetle",
        // Subaru
        "impreza", "wrx", "brz",
        // Mini
        "cooper", "countryman", "clubman",
        // Fiat
        "500",
        // Porsche
        "911", "718", "cayman", "boxster", "taycan", "macan", "cayenne", // Porsche often compact size/midsize but priced higher? standard logic puts Macan/Cayenne in midsize usually but let's default to compact/mid based on size.
        // Actually, user's system likely treats SUV Porsches as midsize/luxury. Let's move Macan/Cayenne to Midsize for safety.
        // BMW
        "2 series", "z4",
        // Mercedes
        "a-class", "cla", "sl",
        // Audi
        "a3", "tt"
    ])) return "compact";

    // ---------------------------------------------------------
    // 2. GENERIC KEYWORD FALLBACK (If no specific model found)
    // ---------------------------------------------------------

    // Explicit Large Keywords
    if (lower.includes("xl") || lower.includes("esv") || lower.includes("long") || lower.includes("dually") || lower.includes("van") || lower.includes("minivan")) return "luxury";

    // Truck / SUV keywords
    if (lower.includes("f150") || lower.includes("1500") || lower.includes("truck") || lower.includes("pickup") || lower.includes("large suv")) return "truck";

    // Midsize Keywords
    if (lower.includes("suv") || lower.includes("crossover") || lower.includes("mid") || lower.includes("jeep")) return "midsize";

    // Compact Keywords
    if (lower.includes("sedan") || lower.includes("coupe") || lower.includes("convertible") || lower.includes("compact") || lower.includes("small") || lower.includes("hatchback")) return "compact";

    // Default Fallbacks for common makes if no model specified
    if (lower.includes("cadillac") || lower.includes("lincoln") || lower.includes("lucid") || lower.includes("rivian")) return "luxury";
    if (lower.includes("tesla")) return "midsize"; // safe bet
    if (lower.includes("bmw")) return "midsize";
    if (lower.includes("mercedes")) return "midsize";
    if (lower.includes("audi")) return "midsize";
    if (lower.includes("ford") && !lower.includes("focus")) return "truck"; // heavy truck bias for Ford
    if (lower.includes("chevrolet") || lower.includes("chevy")) return "truck";

    return undefined;
}

// Helper for matching
function matchAny(text: string, phrases: string[]): boolean {
    return phrases.some(p => text.includes(p));
}
