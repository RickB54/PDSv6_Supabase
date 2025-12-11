import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DETAILING_CHEMICALS, DetailingChemical } from "@/data/detailingChemicals";
import { DETAILING_TOOLS, DetailingTool } from "@/data/detailingTools";
import { DETAILING_MATERIALS, DetailingMaterial } from "@/data/detailingMaterials";
import localforage from "localforage";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImportWizardModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: "chemicals" | "tools" | "materials";
    onImportComplete?: () => void;
}

export default function ImportWizardModal({
    open,
    onOpenChange,
    defaultTab = "chemicals",
    onImportComplete,
}: ImportWizardModalProps) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [selectedChemicals, setSelectedChemicals] = useState<Set<string>>(new Set());
    const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
    const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());

    const [standardChemicals, setStandardChemicals] = useState<DetailingChemical[]>([]);
    const [standardTools, setStandardTools] = useState<DetailingTool[]>([]);
    const [standardMaterials, setStandardMaterials] = useState<DetailingMaterial[]>([]);

    const [editItem, setEditItem] = useState<any>(null);
    const [editType, setEditType] = useState<'chemical' | 'tool' | 'material' | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'chemical' | 'tool' | 'material' } | null>(null);

    useEffect(() => {
        setActiveTab(defaultTab);
    }, [defaultTab]);

    useEffect(() => {
        const loadStandardInventory = async () => {
            const savedChems = await localforage.getItem<DetailingChemical[]>("standard_chemicals");
            if (savedChems) {
                setStandardChemicals(savedChems);
            } else {
                setStandardChemicals(DETAILING_CHEMICALS);
                await localforage.setItem("standard_chemicals", DETAILING_CHEMICALS);
            }

            const savedTools = await localforage.getItem<DetailingTool[]>("standard_tools");
            if (savedTools) {
                setStandardTools(savedTools);
            } else {
                setStandardTools(DETAILING_TOOLS);
                await localforage.setItem("standard_tools", DETAILING_TOOLS);
            }

            const savedMats = await localforage.getItem<DetailingMaterial[]>("standard_materials");
            if (savedMats) {
                setStandardMaterials(savedMats);
            } else {
                setStandardMaterials(DETAILING_MATERIALS);
                await localforage.setItem("standard_materials", DETAILING_MATERIALS);
            }
        };
        loadStandardInventory();
    }, []);

    const toggleChemical = (id: string) => {
        const newSet = new Set(selectedChemicals);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedChemicals(newSet);
    };

    const toggleTool = (id: string) => {
        const newSet = new Set(selectedTools);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedTools(newSet);
    };

    const toggleMaterial = (id: string) => {
        const newSet = new Set(selectedMaterials);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedMaterials(newSet);
    };

    const selectAllChemicals = () => {
        setSelectedChemicals(new Set(standardChemicals.map((c) => c.id)));
    };

    const deselectAllChemicals = () => {
        setSelectedChemicals(new Set());
    };

    const selectAllTools = () => {
        setSelectedTools(new Set(standardTools.map((t) => t.id)));
    };

    const deselectAllTools = () => {
        setSelectedTools(new Set());
    };

    const selectAllMaterials = () => {
        setSelectedMaterials(new Set(standardMaterials.map((m) => m.id)));
    };

    const deselectAllMaterials = () => {
        setSelectedMaterials(new Set());
    };

    const calculateChemicalsCost = () => {
        return standardChemicals.filter((c) => selectedChemicals.has(c.id)).reduce(
            (sum, c) => sum + c.suggestedPrice,
            0
        );
    };

    const calculateToolsCost = () => {
        return standardTools.filter((t) => selectedTools.has(t.id)).reduce(
            (sum, t) => sum + t.suggestedPrice,
            0
        );
    };

    const calculateMaterialsCost = () => {
        return standardMaterials.filter((m) => selectedMaterials.has(m.id)).reduce(
            (sum, m) => sum + m.suggestedPrice,
            0
        );
    };

    const handleImport = async () => {
        try {
            let importedCount = 0;

            if (activeTab === "chemicals" && selectedChemicals.size > 0) {
                const existingChemicals = (await localforage.getItem<any[]>("chemicals")) || [];
                const existingIds = new Set(existingChemicals.map((c) => c.id));

                const chemicalsToImport = standardChemicals.filter(
                    (c) => selectedChemicals.has(c.id) && !existingIds.has(c.id)
                ).map((c) => ({
                    id: c.id,
                    name: c.name,
                    bottleSize: c.bottleSize || c.unitOfMeasure,
                    costPerBottle: c.suggestedPrice,
                    threshold: c.threshold,
                    currentStock: 0,
                    unitOfMeasure: c.unitOfMeasure,
                    consumptionRate: c.consumptionRatePerJob,
                    category: c.category,
                    subcategory: c.subcategory,
                    description: c.description,
                }));

                if (chemicalsToImport.length > 0) {
                    await localforage.setItem("chemicals", [...existingChemicals, ...chemicalsToImport]);
                    importedCount = chemicalsToImport.length;
                }
            }

            if (activeTab === "tools" && selectedTools.size > 0) {
                const existingTools = (await localforage.getItem<any[]>("tools")) || [];
                const existingIds = new Set(existingTools.map((t) => t.id));

                const toolsToImport = standardTools.filter(
                    (t) => selectedTools.has(t.id) && !existingIds.has(t.id)
                ).map((t) => ({
                    id: t.id,
                    name: t.name,
                    warranty: t.warranty || "N/A",
                    purchaseDate: new Date().toISOString().split("T")[0],
                    price: t.suggestedPrice,
                    lifeExpectancy: t.lifeExpectancy || "N/A",
                    notes: t.description,
                    category: t.category,
                    subcategory: t.subcategory,
                    unitOfMeasure: "unit",
                }));

                if (toolsToImport.length > 0) {
                    await localforage.setItem("tools", [...existingTools, ...toolsToImport]);
                    importedCount = toolsToImport.length;
                }
            }

            if (activeTab === "materials" && selectedMaterials.size > 0) {
                const existingMaterials = (await localforage.getItem<any[]>("materials")) || [];
                const existingIds = new Set(existingMaterials.map((m) => m.id));

                const materialsToImport = standardMaterials.filter(
                    (m) => selectedMaterials.has(m.id) && !existingIds.has(m.id)
                ).map((m) => ({
                    id: m.id,
                    name: m.name,
                    type: m.type,
                    subtype: m.subtype,
                    costPerItem: m.suggestedPrice,
                    quantity: m.quantity,
                    threshold: m.threshold,
                    description: m.description,
                    unitOfMeasure: "unit",
                }));

                if (materialsToImport.length > 0) {
                    await localforage.setItem("materials", [...existingMaterials, ...materialsToImport]);
                    importedCount = materialsToImport.length;
                }
            }

            if (importedCount > 0) {
                toast.success(`Successfully imported ${importedCount} ${activeTab}`);
                setSelectedChemicals(new Set());
                setSelectedTools(new Set());
                setSelectedMaterials(new Set());
                onOpenChange(false);
                if (onImportComplete) {
                    onImportComplete();
                }
            } else {
                toast.info("No new items to import (items may already exist)");
            }
        } catch (error) {
            console.error("Import error:", error);
            toast.error("Failed to import items");
        }
    };

    const handleDeleteStandardItem = (id: string, type: 'chemical' | 'tool' | 'material') => {
        setItemToDelete({ id, type });
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        const { id, type } = itemToDelete;

        if (type === 'chemical') {
            const updated = standardChemicals.filter(c => c.id !== id);
            setStandardChemicals(updated);
            await localforage.setItem("standard_chemicals", updated);
            if (selectedChemicals.has(id)) toggleChemical(id);
        } else if (type === 'tool') {
            const updated = standardTools.filter(t => t.id !== id);
            setStandardTools(updated);
            await localforage.setItem("standard_tools", updated);
            if (selectedTools.has(id)) toggleTool(id);
        } else if (type === 'material') {
            const updated = standardMaterials.filter(m => m.id !== id);
            setStandardMaterials(updated);
            await localforage.setItem("standard_materials", updated);
            if (selectedMaterials.has(id)) toggleMaterial(id);
        }
        toast.success("Item deleted from standard list");
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
    };

    const handleEditStandardItem = (item: any, type: 'chemical' | 'tool' | 'material') => {
        setEditItem({ ...item });
        setEditType(type);
        setEditOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editItem || !editType) return;

        if (editType === 'chemical') {
            const updated = standardChemicals.map(c => c.id === editItem.id ? editItem : c);
            setStandardChemicals(updated);
            await localforage.setItem("standard_chemicals", updated);
        } else if (editType === 'tool') {
            const updated = standardTools.map(t => t.id === editItem.id ? editItem : t);
            setStandardTools(updated);
            await localforage.setItem("standard_tools", updated);
        } else if (editType === 'material') {
            const updated = standardMaterials.map(m => m.id === editItem.id ? editItem : m);
            setStandardMaterials(updated);
            await localforage.setItem("standard_materials", updated);
        }
        setEditOpen(false);
        setEditItem(null);
        setEditType(null);
        toast.success("Item updated");
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Import Standard Inventory</DialogTitle>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="chemicals">Chemicals ({standardChemicals.length})</TabsTrigger>
                            <TabsTrigger value="materials">Materials ({standardMaterials.length})</TabsTrigger>
                            <TabsTrigger value="tools">Tools ({standardTools.length})</TabsTrigger>
                        </TabsList>

                        {/* Chemicals Tab */}
                        <TabsContent value="chemicals" className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="space-x-2">
                                    <Button variant="outline" size="sm" onClick={selectAllChemicals}>
                                        Select All
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={deselectAllChemicals}>
                                        Deselect All
                                    </Button>
                                </div>
                                <div className="text-sm font-semibold">
                                    Total Cost: ${calculateChemicalsCost().toFixed(2)}
                                </div>
                            </div>

                            <ScrollArea className="h-[400px] border rounded-md p-4">
                                <div className="space-y-2">
                                    {standardChemicals.map((chemical) => (
                                        <div
                                            key={chemical.id}
                                            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                                        >
                                            <Checkbox
                                                id={chemical.id}
                                                checked={selectedChemicals.has(chemical.id)}
                                                onCheckedChange={() => toggleChemical(chemical.id)}
                                            />
                                            <div className="flex-1 space-y-1">
                                                <label
                                                    htmlFor={chemical.id}
                                                    className="text-sm font-medium leading-none cursor-pointer"
                                                >
                                                    {chemical.name}
                                                </label>
                                                <p className="text-xs text-muted-foreground">
                                                    {chemical.subcategory} • {chemical.bottleSize || chemical.unitOfMeasure} •{" "}
                                                    ${chemical.suggestedPrice.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{chemical.description}</p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditStandardItem(chemical, 'chemical')}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteStandardItem(chemical.id, 'chemical')}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>

                            <div className="text-sm text-muted-foreground">
                                Selected: {selectedChemicals.size} / {standardChemicals.length}
                            </div>
                        </TabsContent>

                        {/* Materials Tab */}
                        <TabsContent value="materials" className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="space-x-2">
                                    <Button variant="outline" size="sm" onClick={selectAllMaterials}>
                                        Select All
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={deselectAllMaterials}>
                                        Deselect All
                                    </Button>
                                </div>
                                <div className="text-sm font-semibold">
                                    Total Cost: ${calculateMaterialsCost().toFixed(2)}
                                </div>
                            </div>

                            <ScrollArea className="h-[400px] border rounded-md p-4">
                                <div className="space-y-2">
                                    {standardMaterials.map((material) => (
                                        <div
                                            key={material.id}
                                            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                                        >
                                            <Checkbox
                                                id={material.id}
                                                checked={selectedMaterials.has(material.id)}
                                                onCheckedChange={() => toggleMaterial(material.id)}
                                            />
                                            <div className="flex-1 space-y-1">
                                                <label
                                                    htmlFor={material.id}
                                                    className="text-sm font-medium leading-none cursor-pointer"
                                                >
                                                    {material.name}
                                                </label>
                                                <p className="text-xs text-muted-foreground">
                                                    {material.type} • {material.subtype} •{" "}
                                                    ${material.suggestedPrice.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{material.description}</p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditStandardItem(material, 'material')}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteStandardItem(material.id, 'material')}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>

                            <div className="text-sm text-muted-foreground">
                                Selected: {selectedMaterials.size} / {standardMaterials.length}
                            </div>
                        </TabsContent>

                        {/* Tools Tab */}
                        <TabsContent value="tools" className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="space-x-2">
                                    <Button variant="outline" size="sm" onClick={selectAllTools}>
                                        Select All
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={deselectAllTools}>
                                        Deselect All
                                    </Button>
                                </div>
                                <div className="text-sm font-semibold">
                                    Total Cost: ${calculateToolsCost().toFixed(2)}
                                </div>
                            </div>

                            <ScrollArea className="h-[400px] border rounded-md p-4">
                                <div className="space-y-2">
                                    {standardTools.map((tool) => (
                                        <div
                                            key={tool.id}
                                            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                                        >
                                            <Checkbox
                                                id={tool.id}
                                                checked={selectedTools.has(tool.id)}
                                                onCheckedChange={() => toggleTool(tool.id)}
                                            />
                                            <div className="flex-1 space-y-1">
                                                <label
                                                    htmlFor={tool.id}
                                                    className="text-sm font-medium leading-none cursor-pointer"
                                                >
                                                    {tool.name}
                                                    {tool.essential && (
                                                        <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                                                            Essential
                                                        </span>
                                                    )}
                                                </label>
                                                <p className="text-xs text-muted-foreground">
                                                    {tool.subcategory} • ${tool.suggestedPrice.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{tool.description}</p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditStandardItem(tool, 'tool')}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteStandardItem(tool.id, 'tool')}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>

                            <div className="text-sm text-muted-foreground">
                                Selected: {selectedTools.size} / {standardTools.length}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={
                                (activeTab === "chemicals" && selectedChemicals.size === 0) ||
                                (activeTab === "tools" && selectedTools.size === 0) ||
                                (activeTab === "materials" && selectedMaterials.size === 0)
                            }
                            className="bg-gradient-hero"
                        >
                            Import Selected
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Item</DialogTitle>
                    </DialogHeader>
                    {editItem && (
                        <div className="space-y-4">
                            <div>
                                <Label>Name</Label>
                                <Input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} />
                            </div>
                            <div>
                                <Label>Price</Label>
                                <Input type="number" value={editItem.suggestedPrice} onChange={e => setEditItem({ ...editItem, suggestedPrice: parseFloat(e.target.value) })} />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Input value={editItem.description} onChange={e => setEditItem({ ...editItem, description: e.target.value })} />
                            </div>
                            {editType === 'chemical' && (
                                <div>
                                    <Label>Bottle Size / Unit</Label>
                                    <Input value={editItem.bottleSize || editItem.unitOfMeasure} onChange={e => setEditItem({ ...editItem, bottleSize: e.target.value, unitOfMeasure: e.target.value })} />
                                </div>
                            )}
                            {editType === 'material' && (
                                <div>
                                    <Label>Quantity</Label>
                                    <Input type="number" value={editItem.quantity} onChange={e => setEditItem({ ...editItem, quantity: parseFloat(e.target.value) })} />
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={handleSaveEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the item from your standard inventory list.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
