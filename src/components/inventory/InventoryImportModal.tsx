import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Download, Upload, AlertCircle, Check, ArrowLeft, BookOpen, Plus, Trash2, Save } from "lucide-react";
import { saveChemical, saveTool, saveMaterial, getChemicals, getTools, getMaterials } from "@/lib/inventory-data";
import { DETAILING_CHEMICALS } from "@/data/detailingChemicals";
import { DETAILING_TOOLS } from "@/data/detailingTools";
import { DETAILING_MATERIALS } from "@/data/detailingMaterials";
import { searchAI, SearchResult } from "@/lib/inventory-ai";
import { Sparkles, Search } from "lucide-react";

interface InventoryImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: "chemicals" | "tools" | "materials";
}

export function InventoryImportModal({ open, onOpenChange, defaultTab = "chemicals" }: InventoryImportModalProps) {
    const [activeTab, setActiveTab] = useState<"chemicals" | "tools" | "materials">(defaultTab);

    // Reset tab when reopening with a new default
    useEffect(() => {
        if (open && defaultTab) {
            setActiveTab(defaultTab);
        }
    }, [open, defaultTab]);
    const [isImporting, setIsImporting] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [parsedItems, setParsedItems] = useState<any[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
    const [step, setStep] = useState<"upload" | "preview" | "ai_results">("upload");
    const [aiQuery, setAiQuery] = useState("");
    const [aiResults, setAiResults] = useState<SearchResult[]>([]);
    const [isAiSearching, setIsAiSearching] = useState(false);

    // Load existing items when tab changes to check for duplicates
    useEffect(() => {
        const loadExisting = async () => {
            if (!open) return;

            // Reset upload state when tab changes
            setFile(null);
            setParsedItems([]);
            setSelectedIndices(new Set());
            setStep("upload");

            let items: any[] = [];
            try {
                if (activeTab === "chemicals") items = await getChemicals();
                else if (activeTab === "tools") items = await getTools();
                else if (activeTab === "materials") items = await getMaterials();

                setExistingNames(new Set(items.map(i => i.name.toLowerCase().trim())));
            } catch (e) {
                console.error("Failed to load existing inventory", e);
            }
        };
        loadExisting();
    }, [activeTab, open]);

    const validateClassification = (item: any, type: 'chemicals' | 'tools' | 'materials'): string | null => {
        const name = (item.name || "").toLowerCase();
        const desc = (item.description || item.notes || "").toLowerCase();
        const combined = name + " " + desc;

        const toolKeywords = ["pressure washer", "generator", "inverter", "compressor", "vacuum", "extractor", "steam", "machine", "polisher", "buffer", "hose reel", "tank", "pump", "drill", "sander", "heater", "fan", "blower"];
        const materialKeywords = ["towel", "microfiber", "mitt", "wash mitt", "brush", "pad", "applicator", "sponge", "glove", "tape", "paper", "rag", "wipe", "bottle", "trigger", "clay bar"];
        const powerKeywords = ["electric", "volt", "amp", "battery", "cordless", "gasoline", "engine", "motor", "watts"];

        if (type === 'materials') {
            if (toolKeywords.some(k => combined.includes(k))) return "Warning: This appears to be a Tool (Durable Equipment). Move to Tools.";
            if (powerKeywords.some(k => combined.includes(k))) return "Warning: Powered equipment must be classified as Tools.";
        }

        if (type === 'tools') {
            if (materialKeywords.some(k => combined.includes(k))) return "Warning: This appears to be a Material (Consumable). Move to Materials.";
        }

        return null;
    };

    const downloadTemplate = () => {
        let data: any[] = [];
        let filename = "";

        if (activeTab === "chemicals") {
            data = [
                {
                    name: "Example Chemical Name",
                    bottleSize: "16 oz",
                    costPerBottle: 19.99,
                    threshold: 5,
                    currentStock: 10,
                    description: "Optional notes about this chemical"
                }
            ];
            filename = "chemicals_template.json";
        } else if (activeTab === "tools") {
            data = [
                {
                    name: "Example Tool Name",
                    price: 150.00,
                    purchaseDate: "2024-01-01",
                    warranty: "2 Years",
                    lifeExpectancy: "5 Years",
                    notes: "Optional notes about this tool"
                }
            ];
            filename = "tools_template.json";
        } else if (activeTab === "materials") {
            data = [
                {
                    name: "Example Material Name",
                    category: "Microfiber",
                    subtype: "Towels",
                    costPerItem: 2.50,
                    quantity: 50,
                    lowThreshold: 10,
                    notes: "Optional notes"
                }
            ];
            filename = "materials_template.json";
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const loadStandardCatalog = () => {
        let items: any[] = [];

        if (activeTab === "chemicals") {
            items = DETAILING_CHEMICALS.map(item => ({
                name: item.name,
                bottleSize: item.bottleSize || "16 oz",
                costPerBottle: item.suggestedPrice,
                threshold: item.threshold,
                currentStock: 0,
                description: item.description,
                category: item.category // kept for reference in UI, not necessarily saved unless schema supports
            }));
        } else if (activeTab === "tools") {
            items = DETAILING_TOOLS.map(item => ({
                name: item.name,
                price: item.suggestedPrice,
                purchaseDate: new Date().toISOString().split('T')[0],
                warranty: item.warranty || "",
                lifeExpectancy: item.lifeExpectancy || "",
                notes: item.description,
                category: item.category
            }));
        } else if (activeTab === "materials") {
            items = DETAILING_MATERIALS.map(item => ({
                name: item.name,
                category: item.type,
                subtype: item.subtype,
                costPerItem: item.suggestedPrice,
                quantity: 0,
                lowThreshold: item.threshold,
                notes: item.description
            }));
        }

        setParsedItems(items);

        // Auto-select items that are NOT duplicates
        const newSelection = new Set<number>();
        items.forEach((item, index) => {
            const name = item.name?.toLowerCase().trim();
            if (name && !existingNames.has(name)) {
                newSelection.add(index);
            }
        });
        setSelectedIndices(newSelection);
        setStep("preview");
        toast.success(`Loaded ${items.length} items from standard catalog.`);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);

        try {
            const text = await selectedFile.text();
            let data = JSON.parse(text);

            if (!Array.isArray(data)) {
                // Try wrapping in array if single object
                if (typeof data === 'object' && data !== null) {
                    data = [data];
                } else {
                    toast.error("Invalid JSON format. Expected an array of items.");
                    return;
                }
            }

            if (data.length === 0) {
                toast.error("No items found in JSON file.");
                return;
            }

            setParsedItems(data);

            // Auto-select items that are NOT duplicates
            const newSelection = new Set<number>();
            data.forEach((item, index) => {
                const name = item.name?.toLowerCase().trim();
                // If it's not a duplicate, select it by default
                if (name && !existingNames.has(name)) {
                    newSelection.add(index);
                }
            });
            setSelectedIndices(newSelection);
            setStep("preview");
        } catch (error) {
            console.error("Parse Error", error);
            toast.error("Failed to parse JSON file.");
        }
    };

    const toggleSelection = (index: number) => {
        const newSet = new Set(selectedIndices);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        setSelectedIndices(newSet);
    };

    const toggleAll = (select: boolean) => {
        if (select) {
            const newSet = new Set<number>();
            parsedItems.forEach((_, i) => newSet.add(i));
            setSelectedIndices(newSet);
        } else {
            setSelectedIndices(new Set());
        }
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...parsedItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setParsedItems(newItems);
    };

    const addItem = () => {
        let newItem: any = {};
        if (activeTab === "chemicals") {
            newItem = { name: "", bottleSize: "", costPerBottle: 0, currentStock: 0, description: "" };
        } else if (activeTab === "tools") {
            newItem = { name: "", price: 0, purchaseDate: "", notes: "" };
        } else if (activeTab === "materials") {
            newItem = { name: "", category: "", costPerItem: 0, quantity: 0, notes: "" };
        }

        const newItems = [...parsedItems, newItem];
        setParsedItems(newItems);
        const newSelection = new Set(selectedIndices);
        newSelection.add(newItems.length - 1);
        setSelectedIndices(newSelection);

        setTimeout(() => {
            const el = document.getElementById("imports-end-anchor");
            el?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const removeItem = (index: number) => {
        const newItems = parsedItems.filter((_, i) => i !== index);
        setParsedItems(newItems);
        const newSelection = new Set<number>();
        selectedIndices.forEach(i => {
            if (i < index) newSelection.add(i);
            if (i > index) newSelection.add(i - 1);
        });
        setSelectedIndices(newSelection);
    };

    const handleAISearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!aiQuery.trim()) return;

        setIsAiSearching(true);
        // Simulate "thinking" time for AI feel
        setTimeout(() => {
            const results = searchAI(aiQuery, existingNames);
            setAiResults(results);
            setStep("ai_results");
            setIsAiSearching(false);
            if (results.length === 0) {
                toast.info("AI couldn't find any perfectly matching new items. Try broader terms.");
            }
        }, 800);
    };

    const addAiItem = (result: SearchResult) => {
        // Convert SearchResult to parsedItem format based on type
        let newItem: any = {};
        if (result.type === 'chemicals') {
            const item = result.originalItem;
            newItem = {
                name: item.name,
                bottleSize: item.bottleSize || "16 oz",
                costPerBottle: item.suggestedPrice || 0,
                threshold: item.threshold || 5,
                currentStock: 0,
                description: item.description,
                category: item.category
            };
            if (activeTab !== 'chemicals') setActiveTab('chemicals');
        } else if (result.type === 'tools') {
            const item = result.originalItem;
            newItem = {
                name: item.name,
                price: item.suggestedPrice || 0,
                purchaseDate: new Date().toISOString().split('T')[0],
                warranty: item.warranty || "",
                lifeExpectancy: item.lifeExpectancy || "",
                notes: item.description,
                category: item.category
            };
            if (activeTab !== 'tools') setActiveTab('tools');
        } else if (result.type === 'materials') {
            const item = result.originalItem;
            newItem = {
                name: item.name,
                category: item.type || "General",
                subtype: item.subtype || "",
                costPerItem: item.suggestedPrice || 0,
                quantity: 0,
                lowThreshold: item.threshold || 5,
                notes: item.description
            };
            if (activeTab !== 'materials') setActiveTab('materials');
        }

        const newItems = [...parsedItems, newItem];
        setParsedItems(newItems);
        // Select the new item
        const newSelection = new Set(selectedIndices);
        newSelection.add(newItems.length - 1);
        setSelectedIndices(newSelection);

        toast.success(`Added "${newItem.name}" to import list.`);
        setStep("preview"); // Switch back to preview to show it added

        // Scroll to bottom
        setTimeout(() => {
            const el = document.getElementById("imports-end-anchor");
            el?.scrollIntoView({ behavior: "smooth" });
        }, 300);
    };

    const handleImport = async () => {
        if (selectedIndices.size === 0) {
            toast.warning("No items selected for import.");
            return;
        }

        setIsImporting(true);
        try {
            let importedCount = 0;
            const itemsToImport = parsedItems.filter((_, index) => selectedIndices.has(index));

            if (activeTab === "chemicals") {
                for (const row of itemsToImport) {
                    if (!row.name) continue;
                    await saveChemical({
                        name: row.name,
                        bottleSize: row.bottleSize || "16 oz",
                        costPerBottle: Number(row.costPerBottle) || 0,
                        threshold: Number(row.threshold) || 5,
                        currentStock: Number(row.currentStock) || 0,
                        // Note: chemicals table doesn't have notes/description column mapped in saveChemical currently, 
                        // but we can add it if schema supports it or ignore it. 
                        // Based on inventory-data.ts, there is no generic description field exposed in saveChemical args 
                        // aside from maybe mapping to 'bottleSize' or strict fields.
                        // We will stick to strict fields for now.
                        imageUrl: ""
                    }, true);
                    importedCount++;
                }
            } else if (activeTab === "tools") {
                for (const row of itemsToImport) {
                    if (!row.name) continue;
                    await saveTool({
                        name: row.name,
                        price: Number(row.price) || 0,
                        purchaseDate: row.purchaseDate || new Date().toISOString().split('T')[0],
                        warranty: row.warranty || "",
                        lifeExpectancy: row.lifeExpectancy || "",
                        notes: row.notes || "",
                        imageUrl: ""
                    }, true);
                    importedCount++;
                }
            } else if (activeTab === "materials") {
                for (const row of itemsToImport) {
                    if (!row.name) continue;
                    await saveMaterial({
                        name: row.name,
                        category: row.category || "General",
                        subtype: row.subtype || "",
                        costPerItem: Number(row.costPerItem) || 0,
                        quantity: Number(row.quantity) || 0,
                        lowThreshold: Number(row.lowThreshold) || 5,
                        notes: row.notes || "",
                        imageUrl: ""
                    }, true);
                    importedCount++;
                }
            }

            toast.success(`Successfully imported ${importedCount} items.`);
            onOpenChange(false);
            setFile(null);
            setParsedItems([]);
            setStep("upload");

        } catch (error) {
            console.error("Import Error", error);
            toast.error("Failed to import selected items.");
        } finally {
            setIsImporting(false);
        }
    };

    const isDuplicate = (name: string) => existingNames.has((name || "").toLowerCase().trim());

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col p-6">
                <DialogHeader>
                    <DialogTitle>Import {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-4">
                        <TabsList className="grid w-[400px] grid-cols-3">
                            <TabsTrigger value="chemicals" disabled={step === "preview" || step === "ai_results"}>Chemicals</TabsTrigger>
                            <TabsTrigger value="materials" disabled={step === "preview" || step === "ai_results"} className="flex flex-col items-center leading-none py-1">
                                <span>Materials</span>
                                <span className="text-[9px] opacity-70">(Consumable)</span>
                            </TabsTrigger>
                            <TabsTrigger value="tools" disabled={step === "preview" || step === "ai_results"} className="flex flex-col items-center leading-none py-1">
                                <span>Tools</span>
                                <span className="text-[9px] opacity-70">(Durable)</span>
                            </TabsTrigger>
                        </TabsList>
                        {step === "preview" && (
                            <Button size="sm" onClick={addItem} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                                <Plus className="w-4 h-4" /> Add Item
                            </Button>
                        )}
                    </div>

                    {step === "upload" ? (
                        <div className="py-8 space-y-8 flex-1">
                            <div className="bg-blue-50/50 dark:bg-zinc-900 border border-blue-200 dark:border-zinc-800 p-6 rounded-lg space-y-4">
                                <h3 className="font-semibold flex items-center gap-2 text-lg text-blue-700 dark:text-blue-400">
                                    <BookOpen className="w-5 h-5" /> Quick Start: Use Standard Catalog
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Load our pre-filled list of common {activeTab} with recommended prices and descriptions. Perfect for setting up a new inventory.
                                </p>
                                <Button onClick={loadStandardCatalog} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                                    Browse & Select Standard Items
                                </Button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">Or import from file</span>
                                </div>
                            </div>

                            <div className="space-y-4 p-6 border border-dashed rounded-lg border-muted-foreground/25 bg-muted/10 opacity-75 hover:opacity-100 transition-opacity">
                                <h3 className="font-semibold flex items-center gap-2 text-lg">
                                    <Upload className="w-5 h-5 text-green-500" /> Upload JSON File
                                </h3>
                                <div className="space-y-2">
                                    <Label htmlFor="json-file">Select your filled JSON file</Label>
                                    <Input
                                        id="json-file"
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileChange}
                                        className="cursor-pointer file:cursor-pointer"
                                    />
                                </div>
                                <div className="pt-2">
                                    <Button variant="outline" size="sm" onClick={downloadTemplate} className="text-xs">
                                        <Download className="w-3 h-3 mr-2" /> Download JSON Template
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : step === "ai_results" ? (
                        <div className="flex flex-col flex-1 min-h-0">
                            {/* AI Results View */}
                            <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                                <Button variant="ghost" size="sm" onClick={() => setStep("preview")} className="text-muted-foreground hover:text-foreground">
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Import List
                                </Button>
                                <span className="text-sm font-medium text-purple-400 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> AI Found {aiResults.length} Suggestions
                                </span>
                            </div>

                            <ScrollArea className="flex-1 border rounded-md bg-zinc-950/30">
                                {aiResults.map((result) => (
                                    <div key={result.id} className="p-4 border-b flex items-start gap-4 hover:bg-zinc-900/50 transition-colors">
                                        <div className="bg-zinc-900 p-2 rounded-md border border-zinc-800">
                                            {result.type === 'chemicals' && <BookOpen className="w-5 h-5 text-blue-500" />}
                                            {result.type === 'tools' && <BookOpen className="w-5 h-5 text-amber-500" />}
                                            {result.type === 'materials' && <BookOpen className="w-5 h-5 text-purple-500" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-semibold text-sm">{result.name}</h4>
                                                <div className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                                    {result.type}
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.description}</p>
                                        </div>
                                        <Button size="sm" onClick={() => addAiItem(result)} className="h-8 bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300">
                                            <Plus className="w-3 h-3 mr-1" /> Add
                                        </Button>
                                    </div>
                                ))}
                                {aiResults.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No new suggestions found based on your query.
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1 min-h-0">
                            {/* Preview Toolbar */}
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b shrink-0">
                                <Button variant="ghost" size="sm" onClick={() => { setStep("upload"); setFile(null); }} className="text-muted-foreground hover:text-foreground">
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Choice
                                </Button>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => toggleAll(true)}>Select All</Button>
                                    <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => toggleAll(false)}>Deselect All</Button>
                                    <span className="text-sm font-medium ml-2 text-muted-foreground">
                                        {selectedIndices.size} selected
                                    </span>
                                </div>
                            </div>

                            {/* Item List */}
                            <div className="flex-1 overflow-y-auto min-h-0 border rounded-md bg-background pr-2">
                                <div className="divide-y">
                                    {parsedItems.map((item, index) => {
                                        const duplicate = isDuplicate(item.name || "");
                                        const isSelected = selectedIndices.has(index);
                                        return (
                                            <div
                                                key={index}
                                                className={`flex items-start gap-3 p-4 transition-colors ${isSelected ? 'bg-muted/40' : 'hover:bg-muted/20'}`}
                                            >
                                                <Checkbox
                                                    id={`item-${index}`}
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSelection(index)}
                                                    className="mt-3"
                                                />
                                                <div className="flex-1 flex flex-col gap-2">
                                                    {/* Row 1: Name and Metadata */}
                                                    <div className="flex flex-col gap-2 w-full">
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                value={item.name}
                                                                onChange={(e) => updateItem(index, 'name', e.target.value)}
                                                                placeholder="Item Name"
                                                                className={`h-9 font-medium ${duplicate ? 'border-orange-500/50' : ''}`}
                                                            />
                                                            {duplicate ? (
                                                                <div className="shrink-0 text-[10px] uppercase font-bold tracking-wider bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-1 rounded border border-orange-500/20 flex items-center gap-1 h-9">
                                                                    <AlertCircle className="w-3 h-3" /> Exists
                                                                </div>
                                                            ) : (
                                                                <div className="shrink-0 text-[10px] uppercase font-bold tracking-wider bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded border border-green-500/20 flex items-center gap-1 h-9">
                                                                    <Check className="w-3 h-3" /> New
                                                                </div>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeItem(index)}
                                                                className="h-9 w-9 text-muted-foreground hover:text-red-500"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                        {(() => {
                                                            const validationMsg = validateClassification(item, activeTab);
                                                            if (validationMsg) {
                                                                return (
                                                                    <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-md animate-in fade-in slide-in-from-top-1">
                                                                        <AlertCircle className="w-3 h-3 shrink-0" />
                                                                        <span className="font-medium">{validationMsg}</span>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>

                                                    {/* Row 2: Detailed Inputs */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                        {activeTab === "chemicals" && (
                                                            <>
                                                                <div className="space-y-0.5">
                                                                    <Label className="text-[10px]">Bottle Size</Label>
                                                                    <Input value={item.bottleSize} onChange={(e) => updateItem(index, 'bottleSize', e.target.value)} className="h-7 text-xs" />
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <Label className="text-[10px]">Cost ($)</Label>
                                                                    <Input type="number" value={item.costPerBottle} onChange={(e) => updateItem(index, 'costPerBottle', e.target.value)} className="h-7 text-xs" />
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <Label className="text-[10px]">Stock</Label>
                                                                    <Input type="number" value={item.currentStock} onChange={(e) => updateItem(index, 'currentStock', e.target.value)} className="h-7 text-xs" />
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <Label className="text-[10px]">Threshold</Label>
                                                                    <Input type="number" value={item.threshold} onChange={(e) => updateItem(index, 'threshold', e.target.value)} className="h-7 text-xs" />
                                                                </div>
                                                            </>
                                                        )}
                                                        {activeTab === "tools" && (
                                                            <>
                                                                <div className="space-y-0.5">
                                                                    <Label className="text-[10px]">Price ($)</Label>
                                                                    <Input type="number" value={item.price} onChange={(e) => updateItem(index, 'price', e.target.value)} className="h-7 text-xs" />
                                                                </div>
                                                                <div className="space-y-0.5 md:col-span-2">
                                                                    <Label className="text-[10px]">Warranty</Label>
                                                                    <Input value={item.warranty} onChange={(e) => updateItem(index, 'warranty', e.target.value)} className="h-7 text-xs" />
                                                                </div>
                                                            </>
                                                        )}
                                                        {activeTab === "materials" && (
                                                            <>
                                                                <div className="space-y-0.5">
                                                                    <Label className="text-[10px]">Cost/Item ($)</Label>
                                                                    <Input type="number" value={item.costPerItem} onChange={(e) => updateItem(index, 'costPerItem', e.target.value)} className="h-7 text-xs" />
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <Label className="text-[10px]">Qty</Label>
                                                                    <Input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="h-7 text-xs" />
                                                                </div>
                                                                <div className="space-y-0.5 md:col-span-2">
                                                                    <Label className="text-[10px]">Category</Label>
                                                                    <Input value={item.category} onChange={(e) => updateItem(index, 'category', e.target.value)} className="h-7 text-xs" />
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Row 3: Description/Notes */}
                                                    <div className="space-y-0.5">
                                                        <Label className="text-[10px]">Description / Notes</Label>
                                                        <Input
                                                            value={activeTab === 'tools' ? item.notes : item.description || item.notes || ""}
                                                            onChange={(e) => updateItem(index, activeTab === 'tools' ? 'notes' : 'description', e.target.value)}
                                                            className="h-7 text-xs text-muted-foreground"
                                                            placeholder="Details..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div id="imports-end-anchor" />
                                </div>
                            </div>
                        </div>
                    )}
                </Tabs>

                <DialogFooter className="mt-6 sm:justify-between sticky bottom-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    {step === "preview" && (
                        <Button
                            onClick={handleImport}
                            disabled={isImporting || selectedIndices.size === 0}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {isImporting ? "Importing Items..." : `Import ${selectedIndices.size} Items`}
                        </Button>
                    )}
                </DialogFooter>

                {/* AI Search Bar - Persistent Footer */}
                <div className="mt-2 pt-4 border-t border-zinc-700/50 flex flex-col gap-2">
                    <form onSubmit={handleAISearch} className="relative">
                        <Sparkles className={`absolute left-3 top-3 w-4 h-4 ${isAiSearching ? 'text-purple-400 animate-pulse' : 'text-purple-500'}`} />
                        <Input
                            value={aiQuery}
                            onChange={(e) => setAiQuery(e.target.value)}
                            placeholder={isAiSearching ? "AI is thinking..." : "Ask AI to find items (e.g., 'chemicals for leather cleaning')"}
                            className="pl-9 pr-12 bg-zinc-900/50 border-purple-500/30 focus-visible:ring-purple-500/50"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            variant="ghost"
                            className="absolute right-1 top-1 h-8 w-8 hover:bg-purple-500/20 text-purple-400"
                            disabled={isAiSearching || !aiQuery.trim()}
                        >
                            <Search className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog >
    );
}
