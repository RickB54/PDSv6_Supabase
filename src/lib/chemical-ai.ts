import { Chemical, ChemicalCategory } from "@/types/chemicals";
import { StepChemicalMapping } from "@/lib/chemicals";

// Helper for generating smart templates
export const generateTemplate = (name: string, category: ChemicalCategory): Partial<Chemical> => {
    const isInterior = category === 'Interior';
    const isCleaner = name.toLowerCase().includes('cleaner') || name.toLowerCase().includes('apc') || name.toLowerCase().includes('wash');
    const isCoating = name.toLowerCase().includes('coat') || name.toLowerCase().includes('seal') || name.toLowerCase().includes('ceramic');

    // Safety Fallbacks
    const safeCategory = category || 'Exterior';

    // Base Template
    const template: Partial<Chemical> = {
        name: name,
        category: safeCategory as any,
        description: `Premium ${safeCategory.toLowerCase()} detailing solution designed for professional results.`,
        used_for: isInterior ? ["Leather", "Plastic", "Vinyl"] : ["Paint", "Glass", "Wheels"],
        when_to_use: isCleaner ? "During the prep or wash stage." : "As a final protection step.",
        why_to_use: isCleaner ? "Removes stubborn contaminants tailored for safe cleaning." : "Provides long-lasting protection and gloss.",
        warnings: {
            damage_risk: isCoating ? "Medium" : "Low",
            risks: isCoating ? ["High spots if not leveled", "Do not apply in direct sun"] : ["Do not let dry on surface"]
        },
        application_guide: {
            method: isCoating ? "Applicator Pad" : "Spray and Wipe",
            agitation: isCleaner ? "Soft Brush" : "None",
            rinse: isCleaner ? "Wipe off with damp towel" : "Buff off haze",
            dwell_time_min: 1,
            dwell_time_max: 3
        },
        surface_compatibility: {
            safe: isInterior ? ["Leather", "Vinyl", "Plastic"] : ["Clear Coat", "Chrome", "Glass"],
            risky: isInterior ? ["Alcantara (if not diluted)"] : ["Matte Finishes"],
            avoid: isInterior ? ["Unsealed Wood"] : ["Wraps", "PPF (unless specified)"]
        },
        interactions: {
            do_not_mix: ["Bleach", "Ammonia"],
            sequencing: []
        },
        dilution_ratios: [],
        pro_tips: ["Always test on an inconspicuous area first."],
        video_urls: []
    };

    // Dilution Logic
    if (isCleaner) {
        template.dilution_ratios = [
            { method: "Spray Bottle", ratio: "1:10", soil_level: "Heavy Soil", notes: "For deep cleaning" },
            { method: "Spray Bottle", ratio: "1:20", soil_level: "Maintenance", notes: "For regular upkeep" },
        ];
    } else if (isCoating) {
        template.dilution_ratios = [
            { method: "Direct", ratio: "Ready to Use", soil_level: "Standard", notes: "Do not dilute" }
        ];
    } else {
        template.dilution_ratios = [
            { method: "Bucket", ratio: "1oz per Gallon", soil_level: "Standard", notes: "Standard wash mix" }
        ];
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
