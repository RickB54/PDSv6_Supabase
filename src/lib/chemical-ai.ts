import { Chemical, ChemicalCategory, DilutionRatio } from "@/types/chemicals";
import { StepChemicalMapping } from "@/lib/chemicals";

// Helper for generating smart templates
export const generateTemplate = (name: string, category: ChemicalCategory): Partial<Chemical> => {
    const normName = name.toLowerCase();
    const isInterior = category === 'Interior' || normName.includes('interior') || normName.includes('carpet') || normName.includes('upholstery') || normName.includes('leather') || normName.includes('fabric');
    
    // 0. TRAIT DETECTION (Used for logic throughout)
    const traits = {
        isCleaner: normName.includes('cleaner') || normName.includes('apc') || normName.includes('wash') || normName.includes('degreaser') || normName.includes('soap') || normName.includes('remove') || normName.includes('decon'),
        isCoating: normName.includes('coat') || normName.includes('seal') || normName.includes('ceramic') || normName.includes('wax') || normName.includes('protect') || normName.includes('bead') || normName.includes('graphene'),
        isInterior: isInterior,
        isExterior: !isInterior,
        isGlass: normName.includes('glass') || normName.includes('window') || normName.includes('mirror') || normName.includes('clarity'),
        isTire: normName.includes('tire') || normName.includes('wheel') || normName.includes('rim') || normName.includes('brake') || normName.includes('rubber'),
        isHeavyDuty: normName.includes('degreaser') || normName.includes('acid') || normName.includes('heavy') || normName.includes('engine') || normName.includes('strip'),
        isPolish: normName.includes('polish') || normName.includes('compound') || normName.includes('cut') || normName.includes('buff') || normName.includes('glaze'),
        isDetailed: normName.includes('detailer') || normName.includes('spray') || normName.includes('gloss') || normName.includes('slick'),
    };

    // 1. PRODUCT SPECIFIC OVERRIDES (Expert Knowledge Base)
    // We keep these for high-accuracy for common products
    if (normName.includes('carpet bomber')) {
        return {
            name: "Carpet Bomber",
            brand: "P & S",
            category: "Interior",
            description: "CITRUS-BASED PROFESSIONAL CLEANER: Engineered specifically for deep cleaning carpets, upholstery, and area rugs. This high-performance formula breaks down stubborn organic contaminants, protein stains, and odors at the molecular level while remaining safe for sensitive interior fabrics and automotive fibers.",
            used_for: ["Vehicle Carpets", "Upholstery", "Floor Mats", "Rugs", "Fabric Seats"],
            when_to_use: "Essential during the interior extraction phase or for heavy stain removal on any fabric surface.",
            why_to_use: "Environmentally safe, non-toxic, and utilizes citrus derivatives to lift deep-set dirt without the harsh fumes of traditional solvent-based cleaners.",
            warnings: { damage_risk: "Low", risks: ["Always test on an inconspicuous area for colorfastness", "Ensure surface is fully dry after cleaning to prevent mildew"] },
            application_guide: { method: "Spray and Agitate", agitation: "Drill Brush or Hand Brush", rinse: "Extract or wipe with damp microfiber", dwell_time_min: 2, dwell_time_max: 5 },
            surface_compatibility: { safe: ["Nylon", "Polyester", "Carpet", "Fabric", "Velour"], risky: ["Alcantara", "Raw Suede"], avoid: ["Unfinished Leather", "Polished Wood"] },
            dilution_ratios: [
                { method: "Spray Bottle", ratio: "1:5", soil_level: "Heavy Soil", notes: "For deep stains, grease, and high traffic rugs" },
                { method: "Spray Bottle", ratio: "1:8", soil_level: "Maintenance", notes: "Standard interior upholstery cleaning" }
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

    if (normName.includes('iron remover') || normName.includes('iron x') || normName.includes('iron out') || normName.includes('ferrex') || normName.includes('decon gel')) {
        return {
            description: "HIGH-CONTRAST pH NEUTRAL DECONTAMINANT: Reactive iron-dissolving solution that chemically targets and liquefies embedded ferrous particles from paintwork and wheels. Transitions from clear to deep purple upon contact with iron, signaling active decontamination.",
            used_for: ["Clear Coated Wheels", "Exterior Paintwork", "Glass Decontamination", "Industrial Fallout Removal"],
            category: "Exterior",
            when_to_use: "Apply during the chemical decontamination stage after the initial wash but before claying.",
            why_to_use: "Safely removes embedded metal particles that regular washing cannot touch, preventing long-term corrosion and ensuring a truly clean surface for protection.",
            warnings: { damage_risk: "Medium", risks: ["Do not allow the product to dry on any surface", "Avoid use on raw, polished aluminum or zinc surfaces", "Always work in a well-ventilated area"] },
            application_guide: { method: "Spray and Dwell", agitation: "Soft wheel brush if needed", rinse: "Aggressive pressure wash rinse", dwell_time_min: 3, dwell_time_max: 5 },
            surface_compatibility: { safe: ["Factory Painted Wheels", "Clear Coat", "Glass", "Chrome"], risky: ["Anodized finishes", "Raw Metal"], avoid: ["Leather", "Interior Plastics"] },
            dilution_ratios: [{ method: "Direct Spray", ratio: "RTU", soil_level: "Standard", notes: "Use as supplied for maximum reactive power" }]
        };
    }

    if (normName.includes('apc') || (normName.includes('all purpose') && normName.includes('cleaner'))) {
        return {
            brand: normName.includes('meguiar') ? "Meguiar's" : "",
            description: "ULTRA-VERSATILE MULTI-SURFACE EMULSIFIER: A high-foaming, professional strength cleaner designed to safely lift dirt, grease, and grime from both interior and exterior surfaces depending on dilution.",
            used_for: ["Engine Bays", "Door Jambs", "Wheel Wells", "Floor Mats", "Interior Plastics", "Vinyl"],
            category: traits.isInterior ? "Interior" : "Exterior",
            when_to_use: "The 'workhorse' cleaner used for heavy-soil areas during the preparation or interior deep-cleaning phases.",
            why_to_use: "Aggressively breaks down organic soils, oils, and general road film without the need for multiple specialized cleaners.",
            warnings: { damage_risk: "Medium", risks: ["Ratios are critical - improper dilution can cause staining", "Do not use on clear plastics or navigation screens"] },
            application_guide: { method: "Spray, Agitate, Wipe", agitation: "Brush or Microfiber", rinse: "Wipe with damp cloth or rinse with water", dwell_time_min: 1, dwell_time_max: 2 },
            dilution_ratios: [
                { method: "Spray Bottle", ratio: "1:4", soil_level: "Heavy Duty", notes: "Engines, tires, and greasy door jambs" },
                { method: "Spray Bottle", ratio: "1:10", soil_level: "Medium Duty", notes: "Interior plastics, vinyl, and pre-spotting fabric" }
            ]
        };
    }

    if (normName.includes('reset') || normName.includes('wash') || normName.includes('shampoo')) {
        return {
            description: "INTENSIVE pH-NEUTRAL LUBRICATION WASH: Specifically engineered to clean surfaces coated with ceramic or quartz protection without leaving behind gloss enhancers or waxes that mask surface properties.",
            used_for: ["Entire Exterior", "Coated Vehicles", "Matte Wraps", "PPF"],
            category: "Exterior",
            when_to_use: "During the contact wash phase of a maintenance or restoration detail.",
            why_to_use: "Provides extreme lubrication to prevent wash-induced marring while thoroughly breaking down traffic film.",
            warnings: { damage_risk: "Low", risks: ["Avoid washing in direct sunlight", "Ensure surface is cool"] },
            application_guide: { method: "Two-Bucket Wash or Foam Cannon", agitation: "Microfiber Wash Mitt", rinse: "Free-flowing water rinse", dwell_time_min: 1, dwell_time_max: 3 },
            dilution_ratios: [
                { method: "Wash Bucket", ratio: "1:500", soil_level: "Standard", notes: "High concentration - small amount goes a long way" },
                { method: "Foam Cannon", ratio: "1:10", soil_level: "Pre-Wash Foam", notes: "For thick, clinging foam" }
            ]
        };
    }

    // 2. DYNAMIC LOOKUP LOGIC (Generic "AI" Reasoning)
    const safeCategory = traits.isInterior ? 'Interior' : 'Exterior';
    
    // Build a smarter description based on traits
    let description = `High-performance professional grade ${safeCategory.toLowerCase()} ${traits.isCoating ? 'surface protection' : 'maintenance'} formula. `;
    let usedFor = traits.isInterior ? ["Dashboard", "Vinyl", "Plastic", "Door Panels"] : ["Paintwork", "Clear Coat", "Exterior Surfaces"];
    let agitation = "None required";
    let method = "Spray and Wipe";
    let proTips = ["Work in a shaded area.", "Ensure surface is cool to the touch."];

    if (traits.isGlass) {
        description = "Advanced streak-free glass cleaner designed to remove oily film, fingerprints, and environmental grime while leaving a crystal clear finish.";
        usedFor = ["Automotive Glass", "Mirrors", "Heads-up Displays", "Window Tint"];
        method = "Two-タオル (Two-towel) method for zero streaks.";
    } else if (traits.isTire) {
        description = "Heavy-duty cleaning and conditioning solution specifically formulated for the high-temperature and high-impact environment of wheels and tires.";
        usedFor = ["Tire Sidewalls", "Alloy Wheels", "Brake Calipers", "Wheel Wells", "Powder Coated Rims"];
        agitation = "Stiff brush for tires, soft brush for rim faces";
    } else if (traits.isInterior && traits.isCleaner) {
        description = "pH-balanced interior cleaner engineered to safely emulsify oils and dirt from delicate surfaces without leaving behind a greasy residue or white chalking.";
        usedFor = ["Steering Wheels", "Dashboards", "Leatherette", "Vinyl Trim", "Textured Plastics", "Cupholders"];
        agitation = "Soft detailing brush or microfiber scrub pad";
    } else if (traits.isHeavyDuty) {
        description = "Industrial-strength degreasing agent designed to break down heavy oils, grease, and stubborn road film on engine components and undercarriages.";
        usedFor = ["Engine Bays", "Wheel Wells", "Exhaust Tips", "Undercarriage", "Heavy Equipment"];
        agitation = "Boar's hair brush or nylon scrub";
        proTips.push("Do not allow to dry on plastic or rubber.");
    } else if (traits.isCoating) {
        description = "Synthetic polymer / ceramic hybrid technology provides an ultra-hydrophobic barrier, extreme gloss, and long-term protection against UV rays and fallout.";
        usedFor = ["Paintwork", "Clear Coat", "Plastic Trim", "Gloss Vinyl Wraps"];
        method = "Applicator pad or cross-hatch spray application";
        proTips.push("Allow 24 hours of cure time for maximum performance.");
    } else if (traits.isPolish) {
        description = "Precision abrasive technology designed to level clear coat imperfections, scratches, and oxidation while refining the surface to a mirror finish.";
        usedFor = ["Clear Coat", "Single Stage Paint", "Gel Coat", "Headlights"];
        method = "Dual Action Polisher or Rotary";
        agitation = "Foam or microfiber polishing pad";
    }

    const template: Partial<Chemical> = {
        name: name,
        category: safeCategory as any,
        description: description,
        used_for: usedFor,
        when_to_use: traits.isCleaner ? "During the initial decontamination or deep-cleaning phase of the detail." : "As a final protection or maintenance step after the surface is completely clean.",
        why_to_use: traits.isCleaner ? "Safely lifts contaminants that regular washing can't reach." : "Enhances visual depth while providing a sacrificial layer against environmental damage.",
        warnings: {
            damage_risk: (traits.isCoating || traits.isHeavyDuty || traits.isPolish) ? "Medium" : "Low",
            risks: traits.isHeavyDuty ? ["Wear gloves and eye protection", "Do not use on raw aluminum without testing", "Rinse thoroughly with water"] : ["Always test on a small inconspicuous area first", "Do not use in direct sunlight"]
        },
        application_guide: {
            method: method,
            agitation: agitation,
            rinse: (traits.isCleaner && !traits.isInterior) ? "Intense pressure wash rinse" : "Wipe clean with a high-GSM microfiber towel",
            dwell_time_min: traits.isHeavyDuty ? 2 : 1,
            dwell_time_max: traits.isHeavyDuty ? 5 : 3
        },
        surface_compatibility: {
            safe: usedFor.slice(0, 3),
            risky: ["Alcantara", "Raw Suede", "Matte Wraps", "Raw Magnesium"],
            avoid: ["Raw wood", "Open cellular foam", "Direct Sunlight"]
        },
        dilution_ratios: [],
        pro_tips: proTips,
    };

    // Smart Dilution Logic
    if (traits.isGlass || traits.isCoating || traits.isPolish || traits.isDetailed) {
        template.dilution_ratios = [{ method: "Direct", ratio: "RTU", soil_level: "Standard", notes: "Ready To Use - Formula is pre-mixed for maximum performance." }];
    } else if (traits.isHeavyDuty) {
        template.dilution_ratios = [
            { method: "Dilution Bottle", ratio: "1:4", soil_level: "Heavy Degreasing", notes: "Engine bays and wheel wells" },
            { method: "Dilution Bottle", ratio: "1:10", soil_level: "General Cleaner", notes: "Normal soil on undercarriage" },
        ];
    } else if (traits.isCleaner) {
        template.dilution_ratios = [
            { method: "Spray Bottle", ratio: "1:10", soil_level: "Deep Cleaning", notes: "Heavy interior stains or floor mats" },
            { method: "Spray Bottle", ratio: "1:20", soil_level: "Light Maintenance", notes: "General dusting and light wiping" },
        ];
    } else {
        template.dilution_ratios = [{ method: "Bucket", ratio: "1:128", soil_level: "Soap Solution", notes: "1oz per Gallon of water" }];
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
