import { Chemical, ChemicalCategory, DilutionRatio } from "@/types/chemicals";
import { StepChemicalMapping } from "@/lib/chemicals";

// Helper for generating smart templates
export const generateTemplate = (name: string, category: ChemicalCategory): Partial<Chemical> => {
    const normName = name.toLowerCase();
    const isInterior = category === 'Interior' || normName.includes('interior') || normName.includes('carpet') || normName.includes('upholstery') || normName.includes('leather') || normName.includes('fabric');
    
    // 1. PRODUCT SPECIFIC OVERRIDES (Expert Knowledge Base)
    // We keep these for high-accuracy for common products
    if (normName.includes('carpet bomber')) {
        return {
            name: "Carpet Bomber",
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
            name: "Bead Maker",
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

    if (normName.includes('iron remover') || normName.includes('iron x') || normName.includes('iron out') || normName.includes('ferrex')) {
        return {
            description: "Specially formulated pH-balanced iron remover that targets and dissolves embedded iron particles from automotive paint and wheels. Often turns purple as it reacts.",
            used_for: ["Wheels", "Body Panels", "Paint Decontamination"],
            category: "Exterior",
            warnings: { damage_risk: "Medium", risks: ["Do not let dry on surface", "Avoid raw aluminum", "Always use in well ventilated area due to odor"] },
            application_guide: { method: "Spray and Dwell", agitation: "Soft Brush on wheels", rinse: "Pressure wash thoroughly", dwell_time_min: 3, dwell_time_max: 5 },
            dilution_ratios: [{ method: "Direct", ratio: "RTU", soil_level: "Standard", notes: "Standard use" }]
        };
    }

    // 2. DYNAMIC LOOKUP LOGIC (Generic "AI" Reasoning)
    const traits = {
        isCleaner: normName.includes('cleaner') || normName.includes('apc') || normName.includes('wash') || normName.includes('degreaser') || normName.includes('soap'),
        isCoating: normName.includes('coat') || normName.includes('seal') || normName.includes('ceramic') || normName.includes('wax') || normName.includes('protect'),
        isInterior: isInterior,
        isExterior: !isInterior,
        isGlass: normName.includes('glass') || normName.includes('window'),
        isTire: normName.includes('tire') || normName.includes('wheel') || normName.includes('rim'),
        isHeavyDuty: normName.includes('degreaser') || normName.includes('acid') || normName.includes('heavy'),
        isPolish: normName.includes('polish') || normName.includes('compound') || normName.includes('cut'),
    };

    const safeCategory = traits.isInterior ? 'Interior' : 'Exterior';
    
    // Build a smarter description based on traits
    let description = `Professional ${safeCategory.toLowerCase()} Detailing ${traits.isCoating ? 'Protection' : 'Cleaning'} Solution.`;
    if (traits.isGlass) description = "Specialized streak-free formula for automotive glass and mirrors.";
    if (traits.isTire) description = "Heavy duty cleaner and dressing designed for the rigorous environment of wheels and tires.";
    if (traits.isInterior && traits.isCleaner) description = "Gentle yet effective interior cleaner safe for dash, door panels, and upholstery.";
    if (traits.isCoating) description = "Advanced synthetic polymers provide long-lasting protection and enhanced depth of color.";

    const template: Partial<Chemical> = {
        name: name,
        category: safeCategory as any,
        description: description,
        used_for: traits.isInterior ? ["Dashboard", "Vinyl", "Plastic", "Door Panels"] : ["Paint", "Clear Coat", "Wheels"],
        when_to_use: traits.isCleaner ? "During the cleaning / decontamination phase." : "As a final step to protect the surface.",
        why_to_use: traits.isCleaner ? "Safely emulsifies dirt and grime for removal." : "Protects against UV damage and environmental contaminants.",
        warnings: {
            damage_risk: (traits.isCoating || traits.isHeavyDuty) ? "Medium" : "Low",
            risks: traits.isHeavyDuty ? ["Wear gloves and eye protection", "Do not let dry on surface"] : ["Always test on obscure area"]
        },
        application_guide: {
            method: traits.isCoating ? "Applicator Pad" : "Spray and Wipe",
            agitation: traits.isCleaner ? "Soft Brush or Mitt" : "None",
            rinse: (traits.isCleaner && !traits.isInterior) ? "Pressure wash rinse" : "Wipe with clean microfiber",
            dwell_time_min: 1,
            dwell_time_max: 3
        },
        surface_compatibility: {
            safe: traits.isInterior ? ["Plastic", "Vinyl", "Synthetic Textures"] : ["Clear Coat", "Chrome", "Powder Coat"],
            risky: ["Alcantara", "Raw Suede", "Matte Graphics"],
            avoid: ["Raw wood", "Unsealed finishes"]
        },
        dilution_ratios: [],
        pro_tips: ["Work in small sections for even coverage.", "Avoid direct sunlight and ensured surface is cool to touch."],
    };

    // Smart Dilution Logic
    if (traits.isGlass || traits.isCoating) {
        template.dilution_ratios = [{ method: "Direct", ratio: "RTU", soil_level: "Standard", notes: "Do not dilute" }];
    } else if (traits.isHeavyDuty) {
        template.dilution_ratios = [
            { method: "Spray Bottle", ratio: "1:4", soil_level: "Heavy Soil", notes: "Degreasing and engines" },
            { method: "Spray Bottle", ratio: "1:10", soil_level: "Maintenance", notes: "General cleaning" },
        ];
    } else if (traits.isCleaner) {
        template.dilution_ratios = [
            { method: "Spray Bottle", ratio: "1:10", soil_level: "Heavy Soil", notes: "Deep cleaning" },
            { method: "Spray Bottle", ratio: "1:20", soil_level: "Maintenance", notes: "Light dust and grime" },
        ];
    } else {
        template.dilution_ratios = [{ method: "Bucket", ratio: "1:100", soil_level: "Standard", notes: "Wash bucket dilution" }];
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
 * OCR Engine: This simulates the AI reading the label.
 * It will look for keywords in the hypothetical "scanned text"
 * and return structured data.
 */
export const analyzeLabelFromImage = async (imageUrl: string, fileName?: string): Promise<ScannedLabelData> => {
    // Artificial delay to simulate AI processing
    await new Promise(r => setTimeout(r, 2000));

    const nameToAnalyze = (fileName || imageUrl || "").toLowerCase();
    
    // Simulate DIFFERENT results based on the "image" / file name
    // If the user uploads something that looks like "Armor All Multi Purpose", we "detect" it.
    
    if (nameToAnalyze.includes('armor') || nameToAnalyze.includes('all')) {
        return {
            name: "Multi Purpose Cleaner",
            brand: "Armor All",
            description: "Powerful cleaning for all surfaces. Removes tough dirt, grease and grime from interiors and exteriors.",
            safety_warnings: ["Eye irritant", "Keep out of reach of children"],
            ratios: [
                { method: "Spray", ratio: "RTU", soil_level: "Standard", notes: "Use directly on surfaces" }
            ]
        };
    }

    if (nameToAnalyze.includes('turtle') || nameToAnalyze.includes('wax')) {
        return {
            name: "Hybrid Solutions Ceramic",
            brand: "Turtle Wax",
            description: "Advanced ceramic infusion for long-lasting protection and shine.",
            safety_warnings: ["Store in cool place", "Do not ingest"],
            ratios: [
                { method: "Applicator", ratio: "RTU", soil_level: "Standard", notes: "Thin even coat" }
            ]
        };
    }

    // Default "Advanced Detection" fallback
    return {
        name: "Identified Detailing Product",
        brand: "Premium Detailing Co.",
        description: "Surface safe professional cleaner identified from label scan. High concentration formula.",
        dilution_instructions: "Mix 1 part product with 10 parts water for standard cleaning.",
        safety_warnings: ["Eye Irritant", "Wear Gloves"],
        ratios: [
            { method: "Spray Bottle", ratio: "1:10", soil_level: "Medium", notes: "Extracted from label text" },
            { method: "Direct", ratio: "RTU", soil_level: "Heavy", notes: "Aggressive cleaning" }
        ]
    };
};
