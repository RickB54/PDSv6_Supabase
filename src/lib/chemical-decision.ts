
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
    // Interior
    BodyOils = "Body Oils / Grease",
    FoodResidue = "Food Residue",
    BeverageStains = "Beverage Stains",
    PetHair = "Pet Hair",
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
export const ContaminationToChemistry: Record<ContaminationType, { keywords: string[]; category: string }> = {
    // Exterior
    [ContaminationType.Organic]: { keywords: ['enzyme', 'bug', 'citrus', 'alkaline'], category: 'Alkaline Cleaner' },
    [ContaminationType.RoadFilm]: { keywords: ['pre-wash', 'traffic film', 'road film', 'degreaser', 'tfr'], category: 'Traffic Film Remover (TFR)' },
    [ContaminationType.Petroleum]: { keywords: ['tar', 'glue', 'sap', 'solvent', 'adhesive'], category: 'Solvent / Tar Remover' },
    [ContaminationType.Ferrous]: { keywords: ['iron', 'fallout', 'brake dust', 'purple', 'wheel cleaner'], category: 'Iron Remover' },
    [ContaminationType.Mineral]: { keywords: ['water spot', 'mineral', 'acid', 'descaler'], category: 'Acidic Cleaner / Water Spot Remover' },
    [ContaminationType.Oxidation]: { keywords: ['polish', 'compound', 'cut', 'abrasive', 'correction'], category: 'Compound / Polish' },

    // Interior
    [ContaminationType.BodyOils]: { keywords: ['interior cleaner', 'apc', 'degreaser', 'leather cleaner'], category: 'Interior APC / Leather Cleaner' },
    [ContaminationType.FoodResidue]: { keywords: ['interior', 'crumb', 'all purpose'], category: 'Interior Detailer' },
    [ContaminationType.BeverageStains]: { keywords: ['fabric', 'carpet', 'stain', 'shampoo', 'enzyme'], category: 'Fabric Cleaner / Extractor Solution' },
    [ContaminationType.PetHair]: { keywords: ['static', 'rubber', 'brush'], category: 'Physical Tool (Not Chemical)' }, // Special handling likely needed
    [ContaminationType.Odors]: { keywords: ['odor', 'ozone', 'neutralizer', 'enzyme', 'scent'], category: 'Odor Neutralizer / Chlorine Dioxide' },
    [ContaminationType.Biological]: { keywords: ['enzyme', 'sanitizer', 'disinfectant', 'bio'], category: 'Enzyme Cleaner / Disinfectant' }
};

// --- Logic ---

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
    const inStock = inventory.filter(c => c.is_on_hand !== false); // Default to true if undefined

    return inStock.filter(chem => {
        const textToSearch = [
            chem.name,
            chem.description,
            ...(chem.used_for || []),
            chem.primary_uses,
            chem.why_to_use
        ].join(' ').toLowerCase();

        // Check if ANY keyword matches
        return matchCriteria.keywords.some(keyword => textToSearch.includes(keyword.toLowerCase()));
    }).sort((a, b) => {
        // Optional: Sort logic could go here (e.g. prioritize "Specialty" over "APC" if more specific match?)
        return a.name.localeCompare(b.name);
    });
}

/**
 * Returns the recommended chemistry category name for display
 */
export function getRecommendedCategory(contamination: ContaminationType): string {
    return ContaminationToChemistry[contamination]?.category || "General Cleaner";
}
