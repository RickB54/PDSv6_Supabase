import { Chemical, ChemicalCategory } from "@/types/chemicals";

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
