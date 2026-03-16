import { Chemical, DilutionRatio } from "@/types/chemicals";

/**
 * Enhanced Chemical Template Generator
 * Provides expert-level descriptions and instructions for detailing chemicals.
 */
export function generateTemplate(name: string, category: 'Interior' | 'Exterior'): Partial<Chemical> {
    const normName = name.toLowerCase();
    const isInterior = category === 'Interior' || normName.includes('interior') || normName.includes('carpet') || normName.includes('upholstery') || normName.includes('leather') || normName.includes('fabric');
    
    // 0. TRAIT DETECTION (Used for logic throughout)
    const traits = {
        isCleaner: normName.includes('cleaner') || normName.includes('apc') || normName.includes('wash') || normName.includes('degreaser') || normName.includes('soap') || normName.includes('remove') || normName.includes('decon'),
        isCoating: normName.includes('coat') || normName.includes('seal') || normName.includes('ceramic') || normName.includes('wax') || normName.includes('protect') || normName.includes('bead') || normName.includes('graphene') || normName.includes('sealant'),
        isInterior: isInterior,
        isExterior: !isInterior,
        isGlass: normName.includes('glass') || normName.includes('window') || normName.includes('mirror') || normName.includes('clarity'),
        isTire: normName.includes('tire') || normName.includes('wheel') || normName.includes('rim') || normName.includes('brake') || normName.includes('rubber'),
        isHeavyDuty: normName.includes('degreaser') || normName.includes('acid') || normName.includes('heavy') || normName.includes('engine') || normName.includes('strip'),
        isPolish: normName.includes('polish') || normName.includes('compound') || normName.includes('cut') || normName.includes('buff') || normName.includes('glaze'),
        isDetailed: normName.includes('detailer') || normName.includes('spray') || normName.includes('gloss') || normName.includes('slick'),
    };

    // 1. PRODUCT SPECIFIC OVERRIDES (Expert Knowledge Base)
    if (normName.includes('carpet bomber')) {
        return {
            description: "ULTRA-PREMIUM CARPET & UPHOLSTERY CLEANER: A non-toxic, citrus-based formula specifically engineered to deep clean rugs, carpets, and upholstery fibers. Safely breaks down organic stains, grease, and odors without leaving a sticky residue.",
            used_for: ["Vehicle Carpets", "Floor Mats", "Cloth Seats", "Headliners", "Rug Fibers", "Home Upholstery"],
            category: "Interior",
            when_to_use: "Apply during the deep-cleaning phase after thorough vacuuming. Perfect for spot cleaning or full extractor use.",
            why_to_use: "Encapsulates dirt particles for easy removal, brightening fibers and leaving a fresh citrus scent without harsh chemicals.",
            warnings: { damage_risk: "Low", risks: ["Test for colorfastness on small area", "Do not soak headliners"] },
            application_guide: { method: "Spray, Agitate, Extract/Wipe", agitation: "Upholstery Brush", rinse: "Vacuum or extraction", dwell_time_min: 1, dwell_time_max: 3 },
            dilution_ratios: [
                { method: "Spray Bottle", ratio: "1:5", soil_level: "Heavy Duty", notes: "For deep stains and floor mats" },
                { method: "Extractor", ratio: "1:10", soil_level: "Maintenance", notes: "General upholstery refreshing" }
            ]
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
    let description = "";
    let usedFor: string[] = [];
    let method = "Spray and Wipe";
    let agitation = "Brush or Microfiber";
    let proTips = ["Work in a shaded area.", "Ensure surface is cool to the touch."];

    if (traits.isCoating) {
        description = `ADVANCED SURFACE PROTECTION: A cutting-edge ${safeCategory.toLowerCase()} formulation engineered to create a durable, high-gloss sacrificial layer. Utilizes molecular bonding technology to provide superior hydrophobics and environmental resistance.`;
        usedFor = traits.isInterior ? ["Vinyl", "Plastic", "Dashboard"] : ["Paintwork", "Clear Coat", "Exterior Trim"];
        method = "Hand Applicator or Spray";
        agitation = "Leveling with fresh microfiber";
        proTips.push("Allow 24 hours of cure time for maximum performance.");
    } else if (traits.isCleaner) {
        description = `PROFESSIONAL GRADE EMULSIFIER: High-performance ${safeCategory.toLowerCase()} cleaning solution designed to safely lift and encapsulate surface contaminants. Optimized for efficient soil removal while maintaining surface integrity.`;
        usedFor = traits.isInterior ? ["Upholstery", "Carpets", "Rug Fibers", "Door Panels", "Vinyl & Plastic"] : ["Paintwork", "Wheels", "Exhaust Tips", "Modern Clear Coats"];
        agitation = "Soft detailing brush or microfiber scrub pad";
    } else if (traits.isPolish) {
        description = `MICRO-ABRASIVE REFINING COMPOUND: Precision-engineered formula designed to remove surface imperfections, oxidation, and light swirling. Restores optical clarity and gloss to ${traits.isExterior ? 'paintwork' : 'trim'} surfaces.`;
        usedFor = traits.isExterior ? ["Clear Coat", "Single stage paint"] : ["Piano Black Trim"];
        method = "Machine Polisher or Hand Bloom";
        agitation = "Buffing with foam or wool pad";
    } else if (traits.isDetailed) {
        description = `ULTRA-SLICK GLOSS ENHANCER: Versatile detail spray designed to remove light dust and fingerprints while adding an immediate pop of gloss and surface slickness. Perfect for "just-detailed" maintenance.`;
        usedFor = ["All Polished Surfaces", "Emblems", "Door Jambs"];
    } else {
        description = `HIGH-PERFORMANCE ${safeCategory.toUpperCase()} FORMULA: Professional-grade detailing solution optimized for ${safeCategory.toLowerCase()} maintenance tasks. Delivers consistent, high-quality results for demanding detailing environments.`;
        usedFor = traits.isInterior ? ["Upholstery", "Carpets", "Rug Fibers"] : ["Modern Clear Coats", "Single-Stage Paint"];
    }

    // Sub-refinement for specific surfaces
    if (traits.isGlass) {
        usedFor = traits.isInterior ? ["Tinted Windows", "Interior Glass", "Screens"] : ["Exterior Windows", "Windshields", "Mirrors"];
        agitation = "Waffle-weave glass towel";
        method = "Two-Towel method for zero streaks.";
    } else if (traits.isTire) {
        usedFor = ["Tire Sidewalls", "Wheel Barrels", "Alloy Rims", "Wheel Wells"];
        method = "Spray, Dwell, Rinse";
        agitation = "Stiff tire brush for sidewalls";
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

    // Smart Dilution Logic - Standardized to 3 major Detailing Tiers
    if (traits.isGlass) {
        template.dilution_ratios = [
            { method: "Spray Bottle", ratio: "RTU", soil_level: "Standard", notes: "Streak-free clarity" },
            { method: "Spray Bottle", ratio: "1:4", soil_level: "Heavy Soil", notes: "Smoker film or heavy grime" },
            { method: "Spray Bottle", ratio: "1:10", soil_level: "Light Dust", notes: "Fingerprints and light dusting" }
        ];
    } else if (traits.isCoating || traits.isDetailed || traits.isPolish) {
        template.dilution_ratios = [
            { method: "Hand Direct", ratio: "RTU", soil_level: "Standard", notes: "Use as supplied for maximum protection" }
        ];
    } else if (traits.isHeavyDuty) {
        template.dilution_ratios = [
            { method: "Spray Bottle", ratio: "1:4", soil_level: "Standard / Degreasing", notes: "Engines and filthy wheel wells" },
            { method: "Spray Bottle", ratio: "1:1", soil_level: "Heavy Concentrated", notes: "Stripping old wax or heavy grease" },
            { method: "Spray Bottle", ratio: "1:10", soil_level: "Maintenance", notes: "Normal exterior cleaning" },
        ];
    } else if (traits.isCleaner) {
        template.dilution_ratios = [
            { method: "Spray Bottle", ratio: "1:10", soil_level: "Standard / Interior", notes: "Upholstery and floor mats" },
            { method: "Spray Bottle", ratio: "1:5", soil_level: "Heavy / Strong", notes: "Stubborn stains and spills" },
            { method: "Spray Bottle", ratio: "1:20", soil_level: "Maintenance / Light", notes: "Dashboard and general dusting" },
        ];
    } else if (normName.includes('shampoo') || normName.includes('wash') || normName.includes('soap')) {
        template.dilution_ratios = [
            { method: "Wash Bucket", ratio: "1:128", soil_level: "Standard Wash", notes: "1oz per Gallon of water" },
            { method: "Wash Bucket", ratio: "1:64", soil_level: "Tough Grime", notes: "2oz per Gallon for extra lubrication" },
            { method: "Foam Cannon", ratio: "1:10", soil_level: "Snow Foam", notes: "Pre-soak for safe washing" }
        ];
    } else {
        template.dilution_ratios = [
            { method: "Spray Bottle", ratio: "RTU", soil_level: "Standard", notes: "General Use" },
            { method: "Spray Bottle", ratio: "1:4", soil_level: "Heavy", notes: "Tougher areas" },
            { method: "Spray Bottle", ratio: "1:10", soil_level: "Light", notes: "Frequent maintenance" }
        ];
    }

    return template;
}

// --- AUTO-SUGGESTION AI LOGIC ---

export interface ChemicalSuggestionResults {
    onHand: SuggestionItem[];
    alternatives: SuggestionItem[];
}

export interface SuggestionItem {
    chem: Chemical;
    score: number;
    reason: string;
    suggestedMapping: any; 
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
            reasons.push("Category matches interior task");
        } else if ((normalizedStep.includes('wheel') || normalizedStep.includes('paint') || normalizedStep.includes('wash')) && chem.category === 'Exterior') {
            score += 5;
            reasons.push("Category matches exterior task");
        }

        return { score, reason: reasons.join(', ') };
    };

    const results: SuggestionItem[] = [];

    allChemicals.forEach(chem => {
        const { score, reason } = scoreChemical(chem);
        if (score > 5) {
            results.push({
                chem,
                score,
                reason,
                suggestedMapping: {
                    id: crypto.randomUUID(),
                    step_id: stepId,
                    chemical_id: chem.id,
                    dilution_ratio_id: chem.dilution_ratios?.[0]?.ratio || 'RTU',
                    notes: reason
                }
            });
        }
    });

    return {
        onHand: results.sort((a, b) => b.score - a.score),
        alternatives: [] 
    };
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
