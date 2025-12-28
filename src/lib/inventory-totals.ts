// Helper function to get inventory totals for accounting and budget
import * as inventoryData from './inventory-data';

export interface InventoryTotals {
    chemicals: number;
    materials: number;
    tools: number;
    total: number;
    itemCount: {
        chemicals: number;
        materials: number;
        tools: number;
        total: number;
    };
}

export async function getInventoryTotals(): Promise<InventoryTotals> {
    try {
        const [chemicals, materials, tools] = await Promise.all([
            inventoryData.getChemicals(),
            inventoryData.getMaterials(),
            inventoryData.getTools()
        ]);

        const chemicalsTotal = chemicals.reduce(
            (sum, item) => sum + (item.costPerBottle || 0) * (item.currentStock || 0),
            0
        );

        const materialsTotal = materials.reduce(
            (sum, item) => sum + (item.costPerItem || 0) * (item.quantity || 0),
            0
        );

        const toolsTotal = tools.reduce(
            (sum, item) => sum + (item.price || 0),
            0
        );

        return {
            chemicals: chemicalsTotal,
            materials: materialsTotal,
            tools: toolsTotal,
            total: chemicalsTotal + materialsTotal + toolsTotal,
            itemCount: {
                chemicals: chemicals.length,
                materials: materials.length,
                tools: tools.length,
                total: chemicals.length + materials.length + tools.length
            }
        };
    } catch (error) {
        console.error('Error calculating inventory totals:', error);
        return {
            chemicals: 0,
            materials: 0,
            tools: 0,
            total: 0,
            itemCount: {
                chemicals: 0,
                materials: 0,
                tools: 0,
                total: 0
            }
        };
    }
}
