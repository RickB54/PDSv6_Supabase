// Centralized category color management for Accounting and Budget
import localforage from 'localforage';

// Extended color palette for categories (30 unique colors)
export const CATEGORY_COLORS = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
    "#6366f1", // indigo
    "#84cc16", // lime
    "#06b6d4", // cyan
    "#f43f5e", // rose
    "#a855f7", // violet
    "#22c55e", // emerald
    "#eab308", // yellow
    "#dc2626", // bright red
    "#0ea5e9", // sky
    "#14b8a6", // teal-500
    "#f97316", // orange-500
    "#8b5cf6", // purple-500
    "#ec4899", // pink-500
    "#6366f1", // indigo-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#64748b", // slate
    "#78716c", // stone
    "#71717a", // zinc
    "#737373", // neutral
    "#a3a3a3", // light gray
    "#525252", // dark gray
];

const CATEGORY_TO_COLOR_KEY = 'category-colors-map';

interface CategoryColorMap {
    [category: string]: string;
}

/**
 * Get the color for a specific category
 * If the category doesn't have a color yet, assign one
 */
export async function getCategoryColor(category: string): Promise<string> {
    try {
        const colorMap: CategoryColorMap = await localforage.getItem(CATEGORY_TO_COLOR_KEY) || {};

        if (colorMap[category]) {
            return colorMap[category];
        }

        // Assign a new color
        const usedColors = new Set(Object.values(colorMap));
        let newColor = CATEGORY_COLORS[0];

        // Try to find an unused color
        for (const color of CATEGORY_COLORS) {
            if (!usedColors.has(color)) {
                newColor = color;
                break;
            }
        }

        // If all colors are used, cycle through again
        if (usedColors.size >= CATEGORY_COLORS.length) {
            const existingCount = Object.keys(colorMap).length;
            newColor = CATEGORY_COLORS[existingCount % CATEGORY_COLORS.length];
        }

        // Save the new mapping
        colorMap[category] = newColor;
        await localforage.setItem(CATEGORY_TO_COLOR_KEY, colorMap);

        return newColor;
    } catch (error) {
        console.error('Error getting category color:', error);
        return CATEGORY_COLORS[0]; // fallback to first color
    }
}

/**
 * Get colors for multiple categories at once
 */
export async function getCategoryColors(categories: string[]): Promise<Record<string, string>> {
    try {
        const colorMap: CategoryColorMap = await localforage.getItem(CATEGORY_TO_COLOR_KEY) || {};
        const result: Record<string, string> = {};
        const usedColors = new Set(Object.values(colorMap));

        for (const category of categories) {
            if (colorMap[category]) {
                result[category] = colorMap[category];
            } else {
                // Find an unused color
                let newColor = CATEGORY_COLORS[0];
                for (const color of CATEGORY_COLORS) {
                    if (!usedColors.has(color)) {
                        newColor = color;
                        usedColors.add(color);
                        break;
                    }
                }

                // If all colors used, cycle through
                if (usedColors.size >= CATEGORY_COLORS.length) {
                    const existingCount = Object.keys(colorMap).length + Object.keys(result).length;
                    newColor = CATEGORY_COLORS[existingCount % CATEGORY_COLORS.length];
                }

                result[category] = newColor;
                colorMap[category] = newColor;
            }
        }

        // Save all new mappings
        await localforage.setItem(CATEGORY_TO_COLOR_KEY, colorMap);

        return result;
    } catch (error) {
        console.error('Error getting category colors:', error);
        return {};
    }
}

/**
 * Reset all category colors (use with caution)
 */
export async function resetCategoryColors(): Promise<void> {
    try {
        await localforage.removeItem(CATEGORY_TO_COLOR_KEY);
    } catch (error) {
        console.error('Error resetting category colors:', error);
    }
}

/**
 * Get all saved category color mappings
 */
export async function getAllCategoryColors(): Promise<CategoryColorMap> {
    try {
        return await localforage.getItem(CATEGORY_TO_COLOR_KEY) || {};
    } catch (error) {
        console.error('Error getting all category colors:', error);
        return {};
    }
}
