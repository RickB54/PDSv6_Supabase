import { Chemical, ChemicalCategory, DilutionRatio } from "@/types/chemicals";
import { StepChemicalMapping } from "@/lib/chemicals";

// Helper for generating smart templates
export const generateTemplate = (name: string, category: ChemicalCategory): Partial<Chemical> => {
    const normName = name.toLowerCase();
    const isInterior = category === 'Interior' || normName.includes('interior') || normName.includes('carpet') || normName.includes('upholstery') || normName.includes('leather');
    
    // 1. PRODUCT SPECIFIC OVERRIDES (Expert Knowledge Base)
    if (normName.includes('carpet bomber')) {
        return {
            name: name,
            brand: "P & S",
            category: "Interior",
            description: "A citrus-based high-performance cleaner specifically formulated for carpets, upholstery, and rugs. It breaks down stubborn contaminants and odors while remaining safe for most interior surfaces and fabrics.",
            used_for: ["Carpets", "Upholstery", "Floor Mats", "Rugs"],
            when_to_use: "During the interior detailing phase for deep cleaning fabric and fibers.",
            why_to_use: "Non-toxic, citrus-scented, and highly effective at lifting deep-set dirt without harsh fuming.",
            warnings: { damage_risk: "Low", risks: ["Always test on an inconspicuous area for colorfastness", "Ensure surface is fully dry after cleaning"] },
            application_guide: { method: "Spray and Agitate", agitation: "Drill Brush or Hand Brush", rinse: "Extract or wipe with damp microfiber", dwell_time_min: 2, dwell_time_max: 5 },
            surface_compatibility: { safe: ["Nylon", "Polyester", "Carpet", "Fabric"], risky: ["Alcantara", "Raw Suede"], avoid: ["Leather", "Polished Wood"] },
            dilution_ratios: [
                { method: "Spray Bottle", ratio: "1:5", soil_level: "Heavy Soil", notes: "For deep stains and high traffic areas" },
                { method: "Spray Bottle", ratio: "1:8", soil_level: "Maintenance", notes: "Standard interior cleaning" }
            ]
        };
    }

    if (normName.includes('bead maker')) {
        return {
            name: name,
            brand: "P & S",
            category: "Exterior",
            description: "A high-gloss paint protectant that provides incredible slickness and water beading. It is easy to apply and works as a stand-alone sealant or a booster for existing coatings.",
            used_for: ["Paint", "Glass", "Chrome", "Plastic Trim"],
            when_to_use: "Apply after washing as a drying aid or on a clean dry surface for maximum gloss.",
            why_to_use: "Creates an extremely slick surface that repels water and prevents dirt from bonding.",
            warnings: { damage_risk: "Low", risks: ["Avoid application in direct sunlight for best results"] },
            application_guide: { method: "Spray and Wipe", agitation: "Microfiber Towel", rinse: "Buff to a high gloss", dwell_time_min: 0, dwell_time_max: 1 },
            dilution_ratios: [{ method: "Direct", ratio: "RTU", soil_level: "Standard", notes: "Ready to Use - Do not dilute" }]
        };
    }

    if (normName.includes('iron remover') || normName.includes('iron x') || normName.includes('iron out')) {
        return {
            description: "Specially formulated pH-balanced iron remover that targets and dissolves embedded iron particles from automotive paint and wheels.",
            used_for: ["Wheels", "Body Panels", "Glass"],
            warnings: { damage_risk: "Medium", risks: ["Do not let dry on surface", "Avoid raw aluminum", "Smells like sulfur"] },
            application_guide: { method: "Spray and Dwell", agitation: "Soft Brush on wheels", rinse: "Pressure wash thoroughly", dwell_time_min: 3, dwell_time_max: 5 },
            dilution_ratios: [{ method: "Direct", ratio: "RTU", soil_level: "Standard", notes: "Standard use" }]
        };
    }

    // 2. KEYWORD BASED LOGIC (Fallback)
    const isCleaner = normName.includes('cleaner') || normName.includes('apc') || normName.includes('wash') || normName.includes('degreaser');
    const isCoating = normName.includes('coat') || normName.includes('seal') || normName.includes('ceramic') || normName.includes('wax');

    const safeCategory = isInterior ? 'Interior' : (category || 'Exterior');

    const template: Partial<Chemical> = {
        name: name,
        category: safeCategory as any,
        description: `Professional-grade ${safeCategory.toLowerCase()} solution for ${isCleaner ? 'deep cleaning' : 'protection and finishing'}.`,
        used_for: isInterior ? ["Plastic", "Vinyl", "Dashboard"] : ["Paint", "Glass", "Wheels"],
        when_to_use: isCleaner ? "During the cleaning or decontamination phase." : "As a final protection or maintenance step.",
        why_to_use: isCleaner ? "Efficiently breaks down surface contaminants." : "Enhances visual appearance and provides protection.",
        warnings: {
            damage_risk: isCoating ? "Medium" : "Low",
            risks: isCoating ? ["Ensure surface is decontaminated", "Do not apply in direct sun"] : ["Keep surface cool during use"]
        },
        application_guide: {
            method: isCoating ? "Applicator Pad" : "Spray and Wipe",
            agitation: isCleaner ? "Brush or Mitt" : "None",
            rinse: isCleaner ? "Thoroughly rinse or wipe clean" : "Buff off residue",
            dwell_time_min: 1,
            dwell_time_max: 3
        },
        surface_compatibility: {
            safe: isInterior ? ["Vinyl", "Plastic", "Synthetic Fibers"] : ["Clear Coat", "Glass", "Powder Coat"],
            risky: isInterior ? ["Alcantara"] : ["Matte Finishes"],
            avoid: ["Raw wood", "Unsealed surfaces"]
        },
        interactions: { do_not_mix: ["Strong acids", "Bleach"], sequencing: [] },
        dilution_ratios: [],
        pro_tips: ["Always test on an inconspicuous area first.", "For best results, avoid direct sunlight and hot surfaces."],
        video_urls: []
    };

    if (isCleaner) {
        template.dilution_ratios = [
            { method: "Spray Bottle", ratio: "1:4", soil_level: "Heavy Soil", notes: "Tough grime" },
            { method: "Spray Bottle", ratio: "1:10", soil_level: "Maintenance", notes: "General cleaning" },
        ];
    } else if (isCoating) {
        template.dilution_ratios = [{ method: "Direct", ratio: "RTU", soil_level: "Standard", notes: "Do not dilute" }];
    } else {
        template.dilution_ratios = [{ method: "Bucket", ratio: "1:100", soil_level: "Standard", notes: "Standard wash mix" }];
    }

    return template;
};

// --- AUTO-SUGGESTION AI LOGIC ---

export interface ChemicalSuggestionResults {
    onHand: SuggestionItem[];
    alternatives: SuggestionItem[];
}

export interface SuggestionItem {
    chem: Chemical;
    score: number;
    reason: string;
    suggestedMapping: StepChemicalMapping;
}

export const suggestChemicalsForStep = (stepName: string, allChemicals: Chemical[], stepId: string): ChemicalSuggestionResults => {
    const normalizedStep = stepName.toLowerCase();

    // Keyword Map
    const keywords: Record<string, string[]> = {
        'wheel': ['wheel', 'rim', 'tire', 'iron', 'brake'],
        'tire': ['tire', 'rubber', 'dressing'],
        'glass': ['glass', 'window', 'mirror'],
        'interior': ['interior', 'leather', 'fabric', 'carpet', 'plastic', 'dash'],
        'leather': ['leather', 'conditioner'],
        'wash': ['shampoo', 'soap', 'wash', 'foam'],
        'wax': ['wax', 'sealant', 'ceramic', 'coating'],
        'polish': ['polish', 'compound', 'cut'],
        'clay': ['clay', 'lubricant'],
        'bug': ['bug', 'tar', 'sap'],
        'prep': ['apc', 'cleaner', 'degreaser', 'prep'],
    };

    const scoreChemical = (chem: Chemical): { score: number; reason: string } => {
        let score = 0;
        const reasons: string[] = [];
        const normName = chem.name.toLowerCase();
        const normUsedFor = (chem.used_for || []).map(u => u.toLowerCase());

        // 1. Exact Step Name Match in Chemical Name
        if (normName.includes(normalizedStep)) {
            score += 15;
            reasons.push("Name matches step");
        }

        // 2. Keyword Matching
        for (const [key, terms] of Object.entries(keywords)) {
            if (normalizedStep.includes(key)) {
                // Step has key, does Chem have terms?
                const hasTerm = terms.some(t => normName.includes(t) || normUsedFor.some(u => u.includes(t)));
                if (hasTerm) {
                    score += 10;
                    reasons.push(`Matches keyword category: ${key}`);
                    break; // Count category once
                }
            }
        }

        // 3. Category Heuristic
        if ((normalizedStep.includes('interior') || normalizedStep.includes('vacuum') || normalizedStep.includes('mat')) && chem.category === 'Interior') {
            score += 5;
        }
        if ((normalizedStep.includes('exterior') || normalizedStep.includes('wash') || normalizedStep.includes('rinse')) && chem.category === 'Exterior') {
            score += 5;
        }

        return { score, reason: reasons.join(', ') };
    };

    const results: SuggestionItem[] = allChemicals.map(chem => {
        const { score, reason } = scoreChemical(chem);
        if (score <= 0) return null;

        // Construct Mapping
        const defaultDilution = chem.dilution_ratios?.[0];
        const mapping: StepChemicalMapping = {
            id: `suggest_${chem.id}_${Date.now()}`,
            step_id: stepId,
            chemical_id: chem.id,
            chemical: chem, // Include joined for display
            dilution_override: defaultDilution?.ratio || 'RTU',
            tool_override: defaultDilution?.method || chem.application_guide?.method || 'Standard',
            application_override: `Use for ${stepName}. ${chem.application_guide?.notes || ''}`.substring(0, 150),
            warnings_override: chem.warnings?.damage_risk === 'High' ? chem.warnings?.risks?.[0] : '',
            include_in_prep: true,
            updated_at: new Date().toISOString()
        };

        return { chem, score, reason, suggestedMapping: mapping };
    })
        .filter((item): item is SuggestionItem => item !== null)
        .sort((a, b) => b.score - a.score);

    // Split groups
    const onHand = results.filter(r => r.chem.is_on_hand !== false); // Default true
    const alternatives = results.filter(r => r.chem.is_on_hand === false);

    return { onHand, alternatives };
};

// --- VISION / OCR SIMULATION ---

export interface ScannedLabelData {
    name?: string;
    brand?: string;
    description?: string;
    dilution_instructions?: string;
    safety_warnings?: string[];
    ratios?: DilutionRatio[];
}

/**
 * MOCK Vision Analysis
 * In a real app, this would send an image URL/base64 to a Vision model (GPT-4o / Claude 3.5 Sonnet)
 * with a prompt to extract specific chemical label details.
 */
export const analyzeLabelFromImage = async (imageUrl: string, chemicalName?: string): Promise<ScannedLabelData> => {
    // Artificial delay to simulate AI processing
    await new Promise(r => setTimeout(r, 2500));

    // Mock extraction logic based on the image name or hypothetical label patterns
    // We'll return localized data that looks like it came from the instructions
    return {
        name: chemicalName || "Identified Product",
        brand: "Extracted Brand",
        description: "Surface safe professional cleaner identified from label scan.",
        dilution_instructions: "Mix 1 part product with 10 parts water for standard cleaning. Use 1:4 for heavy grease.",
        safety_warnings: ["Eye Irritant", "Wear Gloves", "Do not ingest"],
        ratios: [
            { method: "Identified (Scan)", ratio: "1:10", soil_level: "Medium", notes: "Extracted from label text" },
            { method: "Identified (Scan)", ratio: "1:4", soil_level: "Heavy", notes: "Aggressive cleaning" }
        ]
    };
};
