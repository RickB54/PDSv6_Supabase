import { supabase } from "./supabase";

/**
 * Professional Detailing Communication Engine
 * Converts rough shop notes into polished, customer-ready explanations.
 */

const DETIALING_VOCABULARY: Record<string, string> = {
    "can't fix": "has reached a level of surface depletion where safe correction is no longer viable",
    "cannot fix": "has exceeded the threshold for safe paint correction and requires specialized intervention",
    "dirty": "heavily soiled with organic and inorganic contaminants",
    "filthy": "severely compromised by deep-set debris and oxidation",
    "smell": "persistent odor contamination requiring specialized neutralization",
    "stink": "embedded odor profile that has permeated the interior surfaces",
    "i don't do": "our professional service protocol currently does not include",
    "we don't do": "this specific task falls outside our current standardized service menu",
    "bad": "severely compromised",
    "worst": "critically degraded",
    "cheap": "maintenance-grade",
    "expensive": "premium investment-grade",
    "scratches": "surface abrasions and clear-coat marring",
    "swirls": "holographic marring and micro-swirling",
    "rust": "oxidation and surface corrosion",
    "mold": "biological contamination",
    "gross": "heavily neglected",
    "messy": "disorganized and soiled",
    "i'll try": "we will apply our professional best-effort protocols",
    "no guarantee": "due to the nature of the substrate, results may vary and perfection cannot be professionally assured",
    "broken": "mechanically or structurally compromised",
    "ugly": "visually distressed",
    "old": "aged and weathered",
    "fix it": "perform comprehensive restoration and correction",
    "cleaning": "sanitizing and decontaminating",
    "wash": "contact-less or specialized contact decontamination",
};

/**
 * Refines a piece of text to be more professional and clear.
 * Uses a combination of real AI generation via Gemini Proxy and local vocabulary fallback.
 */
export async function refineTextWithAI(text: string): Promise<string> {
    if (!text) return "";

    try {
        const prompt = `Act as an elite, ultra-professional customer relationships manager and copywriter for "Prime Auto Detail", a luxury automotive detailing business.
Your goal is to rewrite the draft below into a highly polished, elegant, and corporate-standard correspondence/letter.
It should be welcoming, professional, clear, and possess an excellent tone that leaves a stunning impression on a client.
Fix any spelling or grammar mistakes. Maintain a highly professional service tone.

Draft text to refine:
"${text}"

Provide ONLY the refined letter body. Do not include subject lines, header details, addresses, placeholders (like [Date], [Company Name]), or greetings like "Dear Customer" or sign-offs like "Sincerely, Rick Berube" in the output since those are added automatically. Just output the refined paragraph(s) of the body text.`;

        const { data, error } = await supabase.functions.invoke('gemini-proxy', {
            body: { prompt }
        });
        
        if (error) throw error;
        
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (aiText) {
            // Clean up any markdown code block wrappers or extra surrounding quotes
            return aiText.replace(/```[a-z]*|```/gi, '').trim().replace(/^"(.*)"$/, '$1');
        }
    } catch (e) {
        console.warn("[refineTextWithAI] Real AI invocation failed, falling back to heuristics:", e);
    }

    // Simulate AI thinking time if falling back
    await new Promise(resolve => setTimeout(resolve, 800));

    let refined = text;

    // 1. Vocabulary Replacement
    Object.entries(DETIALING_VOCABULARY).forEach(([rough, polished]) => {
        const regex = new RegExp(`\\b${rough}\\b`, 'gi');
        refined = refined.replace(regex, polished);
    });

    // 2. Structural Smoothing (Basic AI Rules)
    
    // Capitalize first letter of sentences
    refined = refined.replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());

    // Add professional context if it's too short
    if (refined.split(' ').length < 10 && !refined.includes('.')) {
        refined = `Professional Assessment: ${refined}.`;
    }

    // Specific rule for review requests
    if (refined.toLowerCase().includes("review") && refined.toLowerCase().includes("hope")) {
        refined = "We hope you were completely satisfied with your recent detailing service. If you have a moment, we would greatly appreciate it if you could share your experience by leaving us a review. Your feedback is invaluable to our team.";
    }

    // Replace "I" with "We" or "The team" for professional weight
    refined = refined.replace(/\b(I am|I'm)\b/gi, "We are");
    refined = refined.replace(/\b(I have)\b/gi, "Our team has");
    refined = refined.replace(/\b(I will)\b/gi, "We will");

    // Ensure it ends with a period
    if (refined && !refined.endsWith('.') && !refined.endsWith('!') && !refined.endsWith('?')) {
        refined += '.';
    }

    return refined;
}
