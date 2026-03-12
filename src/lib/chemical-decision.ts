
import { Chemical } from "@/types/chemicals";

// --- Types ---

export type VehicleCondition = 'Light' | 'Moderate' | 'Heavy' | 'Severe';

export enum ContaminationType {
    // Exterior
    Organic = "Organic (Bugs, Bird Droppings, Pollen)",
    RoadFilm = "Road Film / Traffic Film",
    Petroleum = "Petroleum (Tar, Grease, Asphalt)",
    Ferrous = "Ferrous (Iron Fallout, Brake Dust)",
    Mineral = "Mineral (Water Spots)",
    Oxidation = "Oxidation / Dull Paint",
    ExteriorPlastic = "Exterior Plastic (Fading, Oxidation)",
    GlassContam = "Glass (Water Spots, Wiper Trails)",
    // Interior
    BodyOils = "Body Oils / Grease (Seat, Steering Wheel)",
    FoodResidue = "Food / Organic Stains",
    BeverageStains = "Liquid Stains (Coffee, Soda)",
    UpholsteryStains = "Upholstery Stains (Fabric/Suede)",
    RugStains = "Rug / Carpet Stains",
    FloorMats = "Rubber / Carpet Floor Mats",
    InteriorPlastics = "Dash, Vents, & Plastics",
    LeatherGrim = "Leather Grime / Dye Transfer",
    Odors = "Odors (Smoke, Mold, Pet)",
    Biological = "Biological (Vomit, Blood, Mold)"
}

export type SurfaceType = 'Paint' | 'Glass' | 'Wheels' | 'Interior Plastic' | 'Leather' | 'Fabric' | 'Engine';

// --- mappings ---

export const ConditionDefinitions: Record<VehicleCondition, { visual: string; feel: string; risks: string }> = {
    Light: {
        visual: "Dust, light pollen, minor fingerprints. No stuck debris.",
        feel: "Smooth to the touch.",
        risks: "Inducing swirls if washed without lubrication."
    },
    Moderate: {
        visual: "Visible road grime on lower panels, bug splatter on bumper, brake dust on wheels.",
        feel: "Slightly gritty lower panels.",
        risks: "Scratching paint if pre-rinse is skipped."
    },
    Heavy: {
        visual: "Thick mud, caked brake dust, tar spots, visible bird droppings, salt crust.",
        feel: "Rough, sandpaper-like texture (contamination).",
        risks: "High risk of marring. Chemical burns if products dry on dirt."
    },
    Severe: {
        visual: "Neglected finish, moss/mold in crevices, heavy oxidation, baked-on sap/tar.",
        feel: "Extremely rough, catchy service.",
        risks: "Permanent damage requires aggressive correction. Paint may be soft/compromised."
    }
};

// Maps Contamination -> Keywords to look for in Chemical "used_for", "description", or "name"
export const ContaminationToChemistry: Record<ContaminationType, { keywords: string[]; category: string; type: 'interior' | 'exterior' }> = {
    // Exterior
    [ContaminationType.Organic]: { keywords: ['enzyme', 'bug', 'citrus', 'alkaline'], category: 'Alkaline Cleaner', type: 'exterior' },
    [ContaminationType.RoadFilm]: { keywords: ['pre-wash', 'traffic film', 'road film', 'degreaser', 'tfr'], category: 'Traffic Film Remover (TFR)', type: 'exterior' },
    [ContaminationType.Petroleum]: { keywords: ['tar', 'glue', 'sap', 'solvent', 'adhesive'], category: 'Solvent / Tar Remover', type: 'exterior' },
    [ContaminationType.Ferrous]: { keywords: ['iron', 'fallout', 'brake dust', 'purple', 'wheel cleaner'], category: 'Iron Remover', type: 'exterior' },
    [ContaminationType.Mineral]: { keywords: ['water spot', 'mineral', 'acid', 'descaler'], category: 'Acidic Cleaner / Water Spot Remover', type: 'exterior' },
    [ContaminationType.Oxidation]: { keywords: ['polish', 'compound', 'cut', 'abrasive', 'correction'], category: 'Compound / Polish', type: 'exterior' },
    [ContaminationType.ExteriorPlastic]: { keywords: ['trim', 'plastic', 'restore', 'ceramic', 'dressing'], category: 'Trim Restorer', type: 'exterior' },
    [ContaminationType.GlassContam]: { keywords: ['glass', 'clarity', 'streak', 'cleaner'], category: 'Glass Cleaner', type: 'exterior' },

    // Interior
    [ContaminationType.BodyOils]: { keywords: ['interior cleaner', 'apc', 'degreaser', 'leather cleaner'], category: 'Interior APC / Leather Cleaner', type: 'interior' },
    [ContaminationType.FoodResidue]: { keywords: ['interior', 'crumb', 'all purpose', 'organic'], category: 'Interior Detailer', type: 'interior' },
    [ContaminationType.BeverageStains]: { keywords: ['fabric', 'carpet', 'stain', 'shampoo', 'enzyme', 'bomber', 'liquid'], category: 'Fabric Cleaner / Extractor Solution', type: 'interior' },
    [ContaminationType.UpholsteryStains]: { keywords: ['fabric', 'stain', 'shampoo', 'upholstery', 'extraction', 'seat'], category: 'Stain Remover', type: 'interior' },
    [ContaminationType.RugStains]: { keywords: ['carpet', 'rug', 'spotter', 'bomber', 'shampoo', 'extractor'], category: 'Carpet Specialist', type: 'interior' },
    [ContaminationType.FloorMats]: { keywords: ['mat', 'rubber', 'apc', 'degreaser'], category: 'Heavy Duty Cleaner', type: 'interior' },
    [ContaminationType.InteriorPlastics]: { keywords: ['dash', 'vent', 'plastic', 'matte', 'satin', 'uv'], category: 'Interior Utility Cleaner', type: 'interior' },
    [ContaminationType.LeatherGrim]: { keywords: ['leather', 'conditioner', 'dye', 'ph-neutral'], category: 'Leather Treatment', type: 'interior' },
    [ContaminationType.Odors]: { keywords: ['odor', 'ozone', 'neutralizer', 'enzyme', 'scent'], category: 'Odor Neutralizer', type: 'interior' },
    [ContaminationType.Biological]: { keywords: ['enzyme', 'sanitizer', 'disinfectant', 'bio'], category: 'Enzyme Cleaner / Disinfectant', type: 'interior' }
};

export const PurchaseLinks: Record<string, { product: string; links: { store: string; url: string }[] }[]> = {
    'Alkaline Cleaner': [
        { product: 'Superior Products Road Warrior', links: [{ store: 'O-Reilly', url: 'https://www.oreillyauto.com/detail/c/superior-products/superior-products-1-gallon-degreaser/spr0/c601' }, { store: 'Amazon', url: 'https://amazon.com/s?k=Superior+Products+Road+Warrior' }] },
        { product: 'P&S Bug Off', links: [{ store: 'The Rag Company', url: 'https://theragcompany.com/products/ps-detail-products-bug-off-insect-remover' }] }
    ],
    'Traffic Film Remover (TFR)': [
        { product: 'Superior Products Dark Fury', links: [{ store: 'O-Reilly', url: 'https://www.oreillyauto.com/detail/c/superior-products/superior-products-dark-fury-cleaner/spr0/f131' }] },
        { product: 'Bilt Hamber Auto Foam', links: [{ store: 'Amazon', url: 'https://amazon.com/s?k=Bilt+Hamber+Auto+Foam' }] }
    ],
    'Solvent / Tar Remover': [
        { product: 'Gtechniq W7 Tar Remover', links: [{ store: 'The Rag Company', url: 'https://theragcompany.com/products/gtechniq-w7-tar-and-glue-remover' }] },
        { product: 'TarX', links: [{ store: 'Amazon', url: 'https://amazon.com/s?k=CarPro+TarX' }] }
    ],
    'Iron Remover': [
        { product: 'P&S Iron Buster', links: [{ store: 'The Rag Company', url: 'https://theragcompany.com/products/ps-detail-products-iron-buster-iron-remover' }] },
        { product: 'CarPro IronX', links: [{ store: 'Amazon', url: 'https://amazon.com/s?k=CarPro+IronX' }] }
    ],
    'Acidic Cleaner / Water Spot Remover': [
        { product: 'Labocosmetica Purifica', links: [{ store: 'The Rag Company', url: 'https://theragcompany.com/products/labocosmetica-purifica' }] },
        { product: 'Wheel Brightener', links: [{ store: 'Amazon', url: 'https://amazon.com/s?k=Meguiars+Wheel+Brightener' }] }
    ],
    'Interior APC / Leather Cleaner': [
        { product: 'P&S Xpress Interior Cleaner', links: [{ store: 'The Rag Company', url: 'https://theragcompany.com/products/ps-detail-products-xpress-interior-cleaner' }] },
        { product: 'Superior Products Pink Perfection', links: [{ store: 'O-Reilly', url: 'https://www.oreillyauto.com/detail/c/superior-products/superior-products-1-gallon-cleaner/spr0/c671' }] }
    ],
    'Fabric Cleaner / Extractor Solution': [
        { product: 'P&S Carpet Bomber', links: [{ store: 'The Rag Company', url: 'https://theragcompany.com/products/ps-detail-products-carpet-bomber-carpet-and-upholstery-cleaner' }] },
        { product: 'Superior Products Zap It', links: [{ store: 'O-Reilly', url: 'https://www.oreillyauto.com/detail/c/superior-products/superior-products-1-gallon-stain-remover/spr0/c281' }] }
    ],
    'Carpet Specialist': [
        { product: 'P&S Carpet Bomber', links: [{ store: 'The Rag Company', url: 'https://theragcompany.com/products/ps-detail-products-carpet-bomber-carpet-and-upholstery-cleaner' }] }
    ],
    'Trim Restorer': [
        { product: 'Solution Finish', links: [{ store: 'The Rag Company', url: 'https://theragcompany.com/products/solution-finish-black-plastic-trim-restorer' }] }
    ]
};

/**
 * Filters the ENTIRE chemical inventory to find best matches for a specific contamination type.
 * ONLY returns chemicals marked as "is_on_hand" (In Inventory).
 */
export function findProductForContamination(
    contamination: ContaminationType,
    inventory: Chemical[]
): Chemical[] {
    const matchCriteria = ContaminationToChemistry[contamination];
    if (!matchCriteria) return [];

    // Filter for IN-STOCK items only
    const inStock = inventory.filter(c => c.is_on_hand !== false);

    return inStock.filter(chem => {
        const usedForStr = Array.isArray(chem.used_for) 
            ? chem.used_for.join(' ') 
            : (typeof chem.used_for === 'string' ? chem.used_for : '');

        const textToSearch = [
            chem.name,
            chem.description,
            usedForStr,
            chem.primary_uses,
            chem.why_to_use
        ].join(' ').toLowerCase();

        // Check if ANY keyword matches
        return matchCriteria.keywords.some(keyword => textToSearch.includes(keyword.toLowerCase()));
    }).sort((a, b) => {
        return a.name.localeCompare(b.name);
    });
}

/**
 * Finds matching products that are NOT currently in stock.
 */
export function findSuggestedProducts(
    contamination: ContaminationType,
    allChemicals: Chemical[]
): Chemical[] {
    const matchCriteria = ContaminationToChemistry[contamination];
    if (!matchCriteria) return [];

    // Filter for OUT-OF-STOCK items only
    const outOfStock = allChemicals.filter(c => c.is_on_hand === false);

    return outOfStock.filter(chem => {
        const usedForStr = Array.isArray(chem.used_for) 
            ? chem.used_for.join(' ') 
            : (typeof chem.used_for === 'string' ? chem.used_for : '');

        const textToSearch = [
            chem.name,
            chem.description,
            usedForStr,
            chem.primary_uses,
            chem.why_to_use
        ].join(' ').toLowerCase();

        return matchCriteria.keywords.some(keyword => textToSearch.includes(keyword.toLowerCase()));
    }).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Returns the recommended chemistry category name for display
 */
export function getRecommendedCategory(contamination: ContaminationType): string {
    return ContaminationToChemistry[contamination]?.category || "General Cleaner";
}

/**
 * Calculates a dynamic dilution ratio based on the base ratio and vehicle severity.
 * e.g. If base is 1:10 (Light), it might become 1:4 (Heavy).
 */
export function getDynamicRatio(baseRatio: string, condition: VehicleCondition): string {
    if (!baseRatio || baseRatio === 'RTU') return baseRatio;
    
    // Parse ratio (e.g. "1:10" or "10:1")
    const parts = baseRatio.split(':');
    if (parts.length !== 2) return baseRatio;
    
    let part1 = parseFloat(parts[0]);
    let part2 = parseFloat(parts[1]);
    
    // Safety check
    if (isNaN(part1) || isNaN(part2)) return baseRatio;

    // Logic: "1:X" where X is the water part. 
    // For Heavy/Severe, we want LESS water (smaller X).
    
    // We assume the baseRatio provided in the chemical data is for "Standard/Moderate" use
    // If it's 1:10 (Moderate):
    // Light -> 1:15 (More water)
    // Heavy -> 1:5 (Less water)
    // Severe -> 1:2 (Much less water)
    
    const multipliers: Record<VehicleCondition, number> = {
        'Light': 1.5,
        'Moderate': 1.0,
        'Heavy': 0.5,
        'Severe': 0.25
    };

    const multiplier = multipliers[condition] || 1.0;
    
    // Round to nearest integer for clean display
    const newWaterPart = Math.max(1, Math.round(part2 * multiplier));
    
    return `${part1}:${newWaterPart}`;
}
