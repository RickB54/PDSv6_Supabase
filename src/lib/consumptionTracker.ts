import localforage from "localforage";
import { upsertExpense } from "@/lib/db";
import { pushAdminAlert } from "@/lib/adminAlerts";

localforage.config({ name: "prime-detail-db" });

export interface ConsumptionRecord {
    id: string;
    itemId: string;
    itemName: string;
    itemCategory: string;
    jobId: string;
    jobType: string;
    quantityUsed: number;
    costPerUnit: number;
    totalCost: number;
    unitOfMeasure: string;
    date: string;
    createdAt: string;
}

export interface InventoryItem {
    id: string;
    name: string;
    category?: string;
    cost?: number;
    costPerBottle?: number;
    costPerItem?: number;
    price?: number;
    currentStock?: number;
    quantity?: number;
    threshold?: number;
    lowThreshold?: number;
    unitOfMeasure?: string;
    consumptionRatePerJob?: number;
}

/**
 * Record consumption for a completed job
 * @param jobId - Unique job identifier
 * @param jobType - Type of job (e.g., "Full Detail", "Express Wash")
 * @param items - Array of inventory items to consume
 */
export async function recordJobConsumption(
    jobId: string,
    jobType: string,
    items: InventoryItem[]
): Promise<ConsumptionRecord[]> {
    const records: ConsumptionRecord[] = [];
    const now = new Date().toISOString();

    for (const item of items) {
        if (!item.consumptionRatePerJob || item.consumptionRatePerJob <= 0) {
            continue; // Skip items without consumption rate
        }

        const quantityUsed = item.consumptionRatePerJob;
        const costPerUnit = item.cost || item.costPerBottle || item.costPerItem || item.price || 0;
        const totalCost = costPerUnit * quantityUsed;

        // Create consumption record
        const record: ConsumptionRecord = {
            id: `consumption-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            itemId: item.id,
            itemName: item.name,
            itemCategory: item.category || "Uncategorized",
            jobId,
            jobType,
            quantityUsed,
            costPerUnit,
            totalCost,
            unitOfMeasure: item.unitOfMeasure || "units",
            date: now,
            createdAt: now,
        };

        records.push(record);

        // Update inventory stock
        await updateInventoryStock(item, quantityUsed);

        // Create budget expense
        await createBudgetExpense(record);
    }

    // Save consumption history
    await saveConsumptionHistory(records);

    return records;
}

/**
 * Update inventory stock after consumption
 */
async function updateInventoryStock(item: InventoryItem, quantityUsed: number): Promise<void> {
    try {
        // Determine which storage key to use based on item properties
        let storageKey: string;
        let stockField: string;

        if (item.costPerBottle !== undefined) {
            storageKey = "chemicals";
            stockField = "currentStock";
        } else if (item.price !== undefined && item.category && ["Power Tool", "Hand Tool", "Equipment"].includes(item.category)) {
            storageKey = "tools";
            stockField = "quantity";
        } else {
            storageKey = "materials";
            stockField = "quantity";
        }

        // Get current inventory
        const inventory = (await localforage.getItem<InventoryItem[]>(storageKey)) || [];
        const itemIndex = inventory.findIndex((i) => i.id === item.id);

        if (itemIndex === -1) {
            console.warn(`Item ${item.id} not found in ${storageKey}`);
            return;
        }

        // Update stock
        const currentItem = inventory[itemIndex];
        const currentStock = (currentItem as any)[stockField] || 0;
        const newStock = Math.max(0, currentStock - quantityUsed);
        (currentItem as any)[stockField] = newStock;

        // Check if below threshold and send alert
        const threshold = currentItem.threshold || currentItem.lowThreshold || 0;
        if (newStock <= threshold && newStock > 0) {
            pushAdminAlert(
                "low_inventory",
                `Low stock: ${item.name} (${newStock} ${item.unitOfMeasure || "units"} remaining)`,
                "system",
                { itemId: item.id, itemName: item.name, stock: newStock, threshold }
            );
        } else if (newStock === 0) {
            pushAdminAlert(
                "low_inventory",
                `Out of stock: ${item.name}`,
                "system",
                { itemId: item.id, itemName: item.name, stock: 0 }
            );
        }

        // Save updated inventory
        inventory[itemIndex] = currentItem;
        await localforage.setItem(storageKey, inventory);

        // Also try to update via API
        try {
            const endpoint = storageKey === "chemicals" ? "/api/inventory/chemicals" : "/api/inventory/materials";
            await fetch(`http://localhost:6061${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(currentItem),
            });
        } catch {
            // API update failed, but localforage update succeeded
        }
    } catch (error) {
        console.error("Error updating inventory stock:", error);
    }
}

/**
 * Create a budget expense entry from consumption
 */
async function createBudgetExpense(record: ConsumptionRecord): Promise<void> {
    try {
        const expense: any = {
            amount: record.totalCost,
            category: record.itemCategory,
            description: `${record.itemName} - ${record.jobType} (${record.quantityUsed} ${record.unitOfMeasure})`,
            createdAt: record.date,
        };

        await upsertExpense(expense);
    } catch (error) {
        console.error("Error creating budget expense:", error);
    }
}

/**
 * Save consumption records to history
 */
async function saveConsumptionHistory(records: ConsumptionRecord[]): Promise<void> {
    try {
        const history = (await localforage.getItem<ConsumptionRecord[]>("consumption-history")) || [];
        history.push(...records);

        // Keep last 1000 records
        const trimmed = history.slice(Math.max(0, history.length - 1000));
        await localforage.setItem("consumption-history", trimmed);
    } catch (error) {
        console.error("Error saving consumption history:", error);
    }
}

/**
 * Get consumption history with optional filters
 */
export async function getConsumptionHistory(filters?: {
    startDate?: string;
    endDate?: string;
    jobId?: string;
    itemId?: string;
    category?: string;
}): Promise<ConsumptionRecord[]> {
    try {
        let history = (await localforage.getItem<ConsumptionRecord[]>("consumption-history")) || [];

        if (filters) {
            if (filters.startDate) {
                history = history.filter((r) => r.date >= filters.startDate!);
            }
            if (filters.endDate) {
                history = history.filter((r) => r.date <= filters.endDate!);
            }
            if (filters.jobId) {
                history = history.filter((r) => r.jobId === filters.jobId);
            }
            if (filters.itemId) {
                history = history.filter((r) => r.itemId === filters.itemId);
            }
            if (filters.category) {
                history = history.filter((r) => r.itemCategory === filters.category);
            }
        }

        return history;
    } catch (error) {
        console.error("Error getting consumption history:", error);
        return [];
    }
}

/**
 * Calculate total consumption cost for a period
 */
export async function getConsumptionTotals(startDate?: string, endDate?: string): Promise<{
    totalCost: number;
    byCategory: Record<string, number>;
    byItem: Record<string, { cost: number; quantity: number }>;
}> {
    const history = await getConsumptionHistory({ startDate, endDate });

    const totals = {
        totalCost: 0,
        byCategory: {} as Record<string, number>,
        byItem: {} as Record<string, { cost: number; quantity: number }>,
    };

    for (const record of history) {
        totals.totalCost += record.totalCost;

        // By category
        if (!totals.byCategory[record.itemCategory]) {
            totals.byCategory[record.itemCategory] = 0;
        }
        totals.byCategory[record.itemCategory] += record.totalCost;

        // By item
        if (!totals.byItem[record.itemName]) {
            totals.byItem[record.itemName] = { cost: 0, quantity: 0 };
        }
        totals.byItem[record.itemName].cost += record.totalCost;
        totals.byItem[record.itemName].quantity += record.quantityUsed;
    }

    return totals;
}

/**
 * Get top N most costly items
 */
export async function getTopCostlyItems(
    limit: number = 5,
    days: number = 30
): Promise<Array<{ name: string; cost: number; quantity: number; category: string }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await getConsumptionHistory({ startDate: startDate.toISOString() });

    const itemMap = new Map<string, { name: string; cost: number; quantity: number; category: string }>();

    for (const record of history) {
        if (!itemMap.has(record.itemId)) {
            itemMap.set(record.itemId, {
                name: record.itemName,
                cost: 0,
                quantity: 0,
                category: record.itemCategory,
            });
        }

        const item = itemMap.get(record.itemId)!;
        item.cost += record.totalCost;
        item.quantity += record.quantityUsed;
    }

    return Array.from(itemMap.values())
        .sort((a, b) => b.cost - a.cost)
        .slice(0, limit);
}
