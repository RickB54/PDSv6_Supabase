import { Chemical, DilutionRatio } from "@/types/chemicals";
import { supabase } from "./supabase";

/**
 * Helper to call the secure Gemini proxy
 */
async function callGeminiProxy(prompt: string) {
    try {
        const { data, error } = await supabase.functions.invoke('gemini-proxy', {
            body: { prompt }
        });
        if (error) throw error;
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (e) {
        console.error("[GeminiProxy] Error:", e);
        return null;
    }
}

/**
 * Enhanced Chemical Template Generator
 * Provides expert-level descriptions and instructions for detailing chemicals.
 */
export async function generateTemplate(name: string, category: 'Interior' | 'Exterior'): Promise<Partial<Chemical>> {
    const normName = name.toLowerCase();

    // 1. Try REAL AI first
    const prompt = `Act as a professional automotive detailing chemical expert. 
    Provide structured data for a chemical named "${name}" in the category "${category}".
    IMPORTANT: If the chemical is typically "Ready To Use" (like Bead Maker, quick detailers, etc.) or if you are unsure of the dilution, you MUST still provide an entry in dilution_ratios where ratio is "RTU". Never return an empty dilution_ratios array.
    Respond ONLY with a JSON object following this interface:
    {
        description: string (marketing-style),
        used_for: string[] (max 5),
        when_to_use: string,
        why_to_use: string,
        warnings: { damage_risk: "Low"|"Medium"|"High", risks: string[] },
        application_guide: { method: string, agitation: string, rinse: string, dwell_time_min: number, dwell_time_max: number },
        dilution_ratios: Array<{ method: string, ratio: string, soil_level: string, notes: string }>
    }`;

    const aiResult = await callGeminiProxy(prompt);
    if (aiResult) {
        try {
            // Clean up the response if Gemini wraps it in markdown blocks
            const jsonStr = aiResult.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(jsonStr);
            return {
                ...parsed,
                name,
                category: category as any,
                ai_generated: true
            };
        } catch (e) {
            console.warn("[Gemini] Failed to parse JSON, falling back to heuristics.");
        }
    }

    // 2. FALLBACK TO HEURISTICS (Original Logic)
    const isInterior = category === 'Interior' || normName.includes('interior') || normName.includes('carpet') || normName.includes('upholstery') || normName.includes('leather') || normName.includes('fabric');
    
    // ... (rest of traits logic)
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

    // Generic fallback construction
    const safeCategory = traits.isInterior ? 'Interior' : 'Exterior';
    let description = `Professional grade detailing solution optimized for ${safeCategory.toLowerCase()} maintenance tasks.`;
    let usedFor = traits.isInterior ? ["Upholstery", "Carpets"] : ["Paintwork", "Clear Coat"];

    if (traits.isTire) {
        description = "Professional grade tire, wheel, and rubber detailing solution.";
        usedFor = ["Tires", "Wheels", "Rubber", "Trim"];
    } else if (traits.isGlass) {
        description = "Professional grade glass and window detailing solution for streak-free clarity.";
        usedFor = ["Windows", "Mirrors", "Glass"];
    } else if (traits.isCoating) {
        description = "Professional grade protective coating and sealant.";
        usedFor = ["Paint Protection", "Clear Coat", "Exterior Plastics"];
    } else if (traits.isPolish) {
        description = "Professional grade abrasive polish and compound for paint correction.";
        usedFor = ["Paint Correction", "Clear Coat", "Scratch Removal"];
    }

    return {
        name,
        category: safeCategory as any,
        description,
        used_for: usedFor,
        ai_generated: false,
        dilution_ratios: [{ method: "Spray Bottle", ratio: "RTU", soil_level: "Any", notes: "Ready To Use" }]
    };
}

// ... (keep suggestChemicalsForStep as is, it's a fast local lookup)

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
 */
export const analyzeLabelFromImage = async (imageUrl: string, fileName?: string): Promise<ScannedLabelData> => {
    // 1. Try REAL AI Vision via the proxy
    const prompt = `Analyze this detailing product image (FileName: ${fileName}). 
    Extract the product Name, Brand, Description, Dilution Instructions, and Safety Warnings.
    Respond ONLY with a JSON object: 
    { name: string, brand: string, description: string, dilution_instructions: string, safety_warnings: string[], ratios: Array<{method, ratio, soil_level, notes}> }`;

    const aiResult = await callGeminiProxy(prompt);
    if (aiResult) {
        try {
            const jsonStr = aiResult.replace(/```json|```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {}
    }

    // Default fallback
    return {
        name: "Identified Product",
        brand: "Premium Detailing Co.",
        description: "Surface safe professional cleaner identified from scan.",
        safety_warnings: ["Eye Irritant", "Wear Gloves"],
        ratios: [
            { method: "Spray Bottle", ratio: "1:10", soil_level: "Medium", notes: "Standard dilution" }
        ]
    };
};

export const suggestChemicalsForStep = (stepName: string, allChemicals: Chemical[], stepId: string): any => {
    // Keep this local for performance
    const normalizedStep = stepName.toLowerCase();
    const keywords: Record<string, string[]> = {
        'wheel': ['wheel', 'rim', 'tire', 'iron', 'brake', 'fallout'],
        'glass': ['glass', 'window', 'mirror'],
        'wash': ['shampoo', 'soap', 'wash', 'foam'],
        'interior': ['interior', 'leather', 'fabric', 'carpet', 'apc'],
    };

    const results = allChemicals.filter(chem => {
        const normName = chem.name.toLowerCase();
        return Object.values(keywords).flat().some(k => normName.includes(k));
    });

    return { onHand: results.slice(0, 3) };
};
