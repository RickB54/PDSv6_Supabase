import { DETAILING_CHEMICALS } from "@/data/detailingChemicals";
import { DETAILING_TOOLS } from "@/data/detailingTools";
import { DETAILING_MATERIALS } from "@/data/detailingMaterials";

// Simple "AI" Search that matches keywords/semantic terms against our local catalogs.
// Returns a unified structure for display.

export interface SearchResult {
    id: string; // generated
    name: string;
    description: string;
    type: "chemicals" | "tools" | "materials";
    relevance: number;
    originalItem: any;
}

export const searchAI = (query: string, existingNames: Set<string>): SearchResult[] => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const results: SearchResult[] = [];

    // Helper to score relevance
    const score = (str: string = ""): number => {
        const s = str.toLowerCase();
        if (s === q) return 100;
        if (s.includes(q)) {
            // shorter matches are better (more exact)
            return 50 + (1 - (s.length - q.length) / s.length) * 40;
        }
        // Basic synoynm matching (very manual "AI")
        const synonyms: { [key: string]: string[] } = {
            "cleaner": ["soap", "shampoo", "detergent", "wash", "solvent"],
            "towel": ["microfiber", "cloth", "rag", "dryer"],
            "coating": ["ceramic", "protection", "sealant", "wax"],
            "polisher": ["buffer", "machine", "rupes", "flex"],
        };

        for (const [key, list] of Object.entries(synonyms)) {
            if (q.includes(key) && list.some(l => s.includes(l))) return 30; // Match category
            if (list.some(l => q.includes(l)) && s.includes(key)) return 30; // Match synonym (e.g. search "soap", find "cleaner")
        }

        return 0;
    };

    // 1. Search Chemicals
    DETAILING_CHEMICALS.forEach(item => {
        // Skip if you already have it (exact name match)
        if (existingNames.has(item.name.toLowerCase().trim())) return;

        const maxScore = Math.max(score(item.name), score(item.description), score(item.category));
        if (maxScore > 0) {
            results.push({
                id: `chem-${Math.random()}`,
                name: item.name,
                description: item.description || `Category: ${item.category}`,
                type: "chemicals",
                relevance: maxScore,
                originalItem: item
            });
        }
    });

    // 2. Search Tools
    DETAILING_TOOLS.forEach(item => {
        if (existingNames.has(item.name.toLowerCase().trim())) return;

        const maxScore = Math.max(score(item.name), score(item.description), score(item.category));
        if (maxScore > 0) {
            results.push({
                id: `tool-${Math.random()}`,
                name: item.name,
                description: item.description || `Category: ${item.category}`,
                type: "tools",
                relevance: maxScore,
                originalItem: item
            });
        }
    });

    // 3. Search Materials
    DETAILING_MATERIALS.forEach(item => {
        if (existingNames.has(item.name.toLowerCase().trim())) return;

        const maxScore = Math.max(score(item.name), score(item.description), score(item.type));
        if (maxScore > 0) {
            results.push({
                id: `mat-${Math.random()}`,
                name: item.name,
                description: item.description || `Category: ${item.type}`,
                type: "materials",
                relevance: maxScore,
                originalItem: item
            });
        }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
};
