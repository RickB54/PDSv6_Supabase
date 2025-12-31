import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getChemicals as getLibraryChemicals, upsertChemical } from "@/lib/chemicals";
import { Chemical } from "@/types/chemicals";
import { saveChemical, getChemicals as getInventoryChemicals } from "@/lib/inventory-data";
import { generateTemplate } from "@/lib/chemical-ai";
import { Plus, Sparkles, AlertCircle } from "lucide-react";

interface LinkChemicalModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    inventoryItem: any | null; // Inventory item to link
    onLinked: (libraryId: string) => void; // Callback to trigger card view
}

export function LinkChemicalModal({ open, onOpenChange, inventoryItem, onLinked }: LinkChemicalModalProps) {
    const [libraryOptions, setLibraryOptions] = useState<Chemical[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);

    useEffect(() => {
        if (open) {
            getLibraryChemicals().then(setLibraryOptions).catch(console.error);
            setSelectedId("");
        }
    }, [open]);

    // Auto-select if name matches exactly?
    useEffect(() => {
        if (open && inventoryItem && libraryOptions.length > 0) {
            const match = libraryOptions.find(opt => opt.name.toLowerCase() === inventoryItem.name.toLowerCase());
            if (match) setSelectedId(match.id);
        }
    }, [open, inventoryItem, libraryOptions]);

    const handleLink = async () => {
        if (!inventoryItem || !selectedId) return;
        setLoading(true);
        try {
            // Update inventory item with new chemicalLibraryId
            const updated = {
                ...inventoryItem,
                chemicalLibraryId: selectedId
            };

            // We need to save this. using saveChemical from inventory-data.
            // Note: saveChemical expects full object.
            await saveChemical(updated, false); // isNew = false

            toast.success("Linked successfully");
            onOpenChange(false);
            onLinked(selectedId);
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to link");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAndLink = async () => {
        if (!inventoryItem) return;
        setCreateLoading(true);
        try {
            // 1. Generate Template
            const category = inventoryItem.category || "Exterior"; // Fallback
            const template = generateTemplate(inventoryItem.name, category as any);

            // 2. Ensure critical fields
            const newChemical: Partial<Chemical> = {
                ...template,
                name: inventoryItem.name, // Ensure exact match
                brand: "Unknown", // User can edit later
                theme_color: "#3b82f6"
            };

            // 3. Upsert to Library
            const { data, error } = await upsertChemical(newChemical);
            if (error || !data) throw error || new Error("Failed to create chemical card");

            // 4. Update Inventory Item
            const updated = {
                ...inventoryItem,
                chemicalLibraryId: data.id
            };
            await saveChemical(updated, false);

            toast.success("Created new Card & Linked!");
            onOpenChange(false);
            onLinked(data.id); // Open the new card

        } catch (e: any) {
            console.error(e);
            toast.error("Failed to create card: " + e.message);
        } finally {
            setCreateLoading(false);
        }
    };

    const noMatchFound = !selectedId && inventoryItem && libraryOptions.length > 0 &&
        !libraryOptions.some(opt => opt.name.toLowerCase() === inventoryItem.name.toLowerCase());

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
                <DialogHeader>
                    <DialogTitle>Link to Chemical Card</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p className="text-sm text-zinc-400">
                        Select the Chemical Card that matches
                        <span className="text-white font-bold mx-1">{inventoryItem?.name}</span>
                    </p>

                    <div className="space-y-2">
                        <Label>Chemical Library</Label>
                        <select
                            className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                        >
                            <option value="">Select a card...</option>
                            {libraryOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.name} {opt.brand ? `(${opt.brand})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Option to Create New (Always available) */}
                    <div className="pt-2 border-t border-zinc-800 mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-zinc-500 font-medium">Card missing or incorrect?</span>
                        </div>
                        <Button
                            onClick={handleCreateAndLink}
                            disabled={createLoading}
                            variant="outline"
                            className="w-full h-8 text-xs border-purple-500/30 hover:bg-purple-500/10 text-purple-400 hover:text-purple-300"
                        >
                            <Sparkles className="w-3 h-3 mr-1" />
                            {createLoading ? "Creating..." : `Create New Card for "${inventoryItem?.name}"`}
                        </Button>
                    </div>

                    <div className="bg-blue-900/20 p-3 rounded border border-blue-900/50">
                        <p className="text-xs text-blue-200">
                            Linking enables "View Card" popups directly from inventory.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleLink}
                        disabled={!selectedId || loading}
                        className="bg-yellow-600 hover:bg-yellow-500 text-white"
                    >
                        {loading ? "Linking..." : "Link & View Card"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
