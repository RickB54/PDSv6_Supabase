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

    const lower = vehicleType.toLowerCase();
    if (lower.includes("compact") || lower.includes("sedan")) return "compact";
    if (lower.includes("mid") || lower.includes("suv")) return "midsize";
    if (lower.includes("truck") || lower.includes("van") || lower.includes("large")) return "truck";
    if (lower.includes("luxury") || lower.includes("high-end")) return "luxury";

    return undefined;
}
