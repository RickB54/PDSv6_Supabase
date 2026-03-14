import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Download, Upload, AlertCircle, Check, ArrowLeft, BookOpen, Plus, Trash2, Save, FileSpreadsheet, Clipboard, Copy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { saveChemical, saveTool, saveMaterial, getChemicals, getTools, getMaterials } from "@/lib/inventory-data";
import { DETAILING_CHEMICALS } from "@/data/detailingChemicals";
import { DETAILING_TOOLS } from "@/data/detailingTools";
import { DETAILING_MATERIALS } from "@/data/detailingMaterials";
import { searchAI, SearchResult } from "@/lib/inventory-ai";
import { Sparkles, Search, FileText } from "lucide-react";

interface InventoryImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: "chemicals" | "supplies" | "equipment" | "tools" | "materials"; // Legacy names supported
}

export function InventoryImportModal({ open, onOpenChange, defaultTab = "chemicals" }: InventoryImportModalProps) {
    // Normalize legacy tab names
    const normalizeTab = (tab: string): "chemicals" | "supplies" | "equipment" => {
        if (tab === 'materials') return 'supplies';
        if (tab === 'tools') return 'equipment';
        return tab as "chemicals" | "supplies" | "equipment";
    };

    const [activeTab, setActiveTab] = useState<"chemicals" | "supplies" | "equipment">(normalizeTab(defaultTab));

    // Reset tab when reopening with a new default
    useEffect(() => {
        if (open && defaultTab) {
            setActiveTab(normalizeTab(defaultTab));
        }
    }, [open, defaultTab]);
    const [isImporting, setIsImporting] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [parsedItems, setParsedItems] = useState<any[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
    const [step, setStep] = useState<"upload" | "preview" | "ai_results" | "manual_entry">("upload");
    const [manualRows, setManualRows] = useState<any[]>([{ name: "", field2: "", field3: "", field4: "" }]);
    const [aiQuery, setAiQuery] = useState("");
    const [aiResults, setAiResults] = useState<SearchResult[]>([]);
    const [isAiSearching, setIsAiSearching] = useState(false);
    const [quickPasteText, setQuickPasteText] = useState("");

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
                else if (activeTab === "equipment") items = await getTools(); // DB still uses tools table
                else if (activeTab === "supplies") items = await getMaterials(); // DB still uses materials table

                setExistingNames(new Set(items.map(i => i.name.toLowerCase().trim())));
            } catch (e) {
                console.error("Failed to load existing inventory", e);
            }
        };
        loadExisting();
    }, [activeTab, open]);

    const validateClassification = (item: any, type: 'chemicals' | 'supplies' | 'equipment'): string | null => {
        const name = (item.name || "").toLowerCase();
        const desc = (item.description || item.notes || "").toLowerCase();
        const combined = name + " " + desc;

        const equipmentKeywords = ["pressure washer", "generator", "inverter", "compressor", "vacuum", "extractor", "steam", "machine", "polisher", "buffer", "hose reel", "tank", "pump", "drill", "sander", "heater", "fan", "blower"];
        const supplyKeywords = ["towel", "microfiber", "mitt", "wash mitt", "brush", "pad", "applicator", "sponge", "glove", "tape", "paper", "rag", "wipe", "bottle", "trigger", "clay bar"];
        const powerKeywords = ["electric", "volt", "amp", "battery", "cordless", "gasoline", "engine", "motor", "watts"];

        if (type === 'supplies') {
            if (equipmentKeywords.some(k => combined.includes(k))) return "Warning: This appears to be Equipment (Durable). Move to Equipment.";
            if (powerKeywords.some(k => combined.includes(k))) return "Warning: Powered equipment must be classified as Equipment.";
        }

        if (type === 'equipment') {
            if (supplyKeywords.some(k => combined.includes(k))) return "Warning: This appears to be a Supply (Consumable). Move to Supplies.";
        }

        return null;
    };

    const downloadTemplate = (format: 'json' | 'csv' = 'json') => {
        let data: any[] = [];
        let filename = "";
        let headers: string[] = [];

        if (activeTab === "chemicals") {
            const item = {
                name: "Example Chemical Name",
                brand: "Best Brand",
                bottleSize: "16 oz",
                costPerBottle: 19.99,
                threshold: 5,
                currentStock: 10,
                description: "Optional notes about this chemical"
            };
            data = [item];
            headers = Object.keys(item);
            filename = `chemicals_template.${format}`;
        } else if (activeTab === "equipment") {
            const item = {
                name: "Example Equipment Name",
                price: 150.00,
                purchaseDate: "2024-01-01",
                warranty: "2 Years",
                lifeExpectancy: "5 Years",
                notes: "Optional notes about this equipment"
            };
            data = [item];
            headers = Object.keys(item);
            filename = `equipment_template.${format}`;
        } else if (activeTab === "supplies") {
            const item = {
                name: "Example Supply Name",
                category: "Microfiber",
                subtype: "Towels",
                costPerItem: 2.50,
                quantity: 50,
                lowThreshold: 1,
                notes: "Optional notes"
            };
            data = [item];
            headers = Object.keys(item);
            filename = `supplies_template.${format}`;
        }

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            // CSV Format
            const csvRows = [];
            csvRows.push(headers.join(","));
            for (const row of data) {
                const values = headers.map(h => {
                    const val = row[h];
                    const escaped = ('' + val).replace(/"/g, '""');
                    return `"${escaped}"`;
                });
                csvRows.push(values.join(","));
            }
            const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
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
                category: item.category
            }));
        } else if (activeTab === "equipment") {
            items = DETAILING_TOOLS.map(item => ({
                name: item.name,
                price: item.suggestedPrice,
                purchaseDate: new Date().toISOString().split('T')[0],
                warranty: item.warranty || "",
                lifeExpectancy: item.lifeExpectancy || "",
                notes: item.description,
                category: item.category
            }));
        } else if (activeTab === "supplies") {
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

        const catalogItems = items.map(i => ({ ...i, importSource: 'Catalog' }));
        setParsedItems(catalogItems);

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, format: 'json' | 'csv' = 'json') => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);

        try {
            const text = await selectedFile.text();
            let data: any[] = [];

            if (format === 'json') {
                data = JSON.parse(text);
                if (!Array.isArray(data)) {
                    if (typeof data === 'object' && data !== null) data = [data];
                    else throw new Error("Invalid Format");
                }
            } else {
                // Improved CSV Parsing for LibreOffice/Excel compatibility
                const parseLine = (line: string) => {
                    const result = [];
                    let curVal = "";
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') {
                            if (inQuotes && line[i + 1] === '"') {
                                curVal += '"';
                                i++;
                            } else {
                                inQuotes = !inQuotes;
                            }
                        } else if (char === ',' && !inQuotes) {
                            result.push(curVal.trim());
                            curVal = "";
                        } else {
                            curVal += char;
                        }
                    }
                    result.push(curVal.trim());
                    return result;
                };

                const lines = text.split(/\r?\n/).filter(l => l.trim());
                if (lines.length < 2) {
                    toast.error("CSV file is empty or missing data.");
                    return;
                }
                
                const rawHeaders = parseLine(lines[0]);
                const headers = rawHeaders.map(h => h.toLowerCase().trim());
                
                data = lines.slice(1).map(line => {
                    const values = parseLine(line);
                    const row: any = {};
                    
                    // Map by header name instead of index to be robust
                    headers.forEach((header, i) => {
                        let val = values[i] || "";
                        
                        // Clean numeric fields
                        const numFields = ['costperbottle', 'threshold', 'currentstock', 'price', 'costperitem', 'quantity', 'lowthreshold'];
                        if (numFields.includes(header)) {
                             // Handle currency symbols if present
                            const numericVal = Number(val.replace(/[$,]/g, ''));
                            row[header === 'costperbottle' ? 'costPerBottle' : 
                                header === 'currentstock' ? 'currentStock' : 
                                header === 'costperitem' ? 'costPerItem' : 
                                header === 'lowthreshold' ? 'lowThreshold' : header] = isNaN(numericVal) ? 0 : numericVal;
                        } else {
                            // Map case-sensitive property names back for consistency with component state
                            const propertyMap: Record<string, string> = {
                                'name': 'name',
                                'brand': 'brand',
                                'bottlesize': 'bottleSize',
                                'purchasedate': 'purchaseDate',
                                'lifeexpectancy': 'lifeExpectancy',
                                'category': 'category',
                                'subtype': 'subtype',
                                'description': 'description',
                                'notes': 'notes'
                            };
                            row[propertyMap[header] || header] = val;
                        }
                    });
                    return row;
                });
            }

            if (data.length === 0) {
                toast.error("No items found in file.");
                return;
            }

            const itemsWithSource = data.map(i => ({ ...i, importSource: format === 'csv' ? 'Manual Import' : 'JSON Import' }));
            setParsedItems(itemsWithSource);

            // Auto-select items that are NOT duplicates
            const newSelection = new Set<number>();
            itemsWithSource.forEach((item, index) => {
                const name = item.name?.toLowerCase().trim();
                if (name && !existingNames.has(name)) {
                    newSelection.add(index);
                }
            });
            setSelectedIndices(newSelection);
            setStep("preview");
        } catch (error) {
            console.error("Parse Error", error);
            toast.error(`Failed to parse ${format.toUpperCase()} file.`);
        }
    };

    const handleQuickPaste = (textToParse?: string) => {
        const text = textToParse || quickPasteText;
        if (!text.trim()) {
            toast.error("Please paste some text first.");
            return;
        }

        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length === 0) {
            toast.error("No valid lines found.");
            return;
        }

        const data: any[] = lines.map(line => {
            // Split by comma first, then try to handle bullet points or other separators
            let parts = line.split(',').map(p => p.trim());
            
            // If comma split didn't work (just one part), try to handle common bullet formats
            if (parts.length === 1) {
                // Remove leading bullets/dashes/numbers
                const cleanLine = line.replace(/^[•\-\*\d\.]+\s*/, "").trim();
                // Try splitting by common separators if no comma
                const altParts = cleanLine.split(/[:\-]/).map(p => p.trim());
                if (altParts.length > 1) parts = altParts;
                else parts = [cleanLine];
            }

            const row: any = {};
            if (activeTab === "chemicals") {
                // Name, Size, Stock/Notes
                row.name = parts[0] || "New Chemical";
                row.bottleSize = parts[1] || "16 oz";
                // If part 2 is a number, treat as stock, otherwise treat as notes
                const p2 = parts[2] || "";
                if (p2 && !isNaN(Number(p2.replace(/[$,]/g, '')))) {
                    row.currentStock = Number(p2.replace(/[$,]/g, ''));
                } else if (p2) {
                    row.description = p2;
                }
                if (parts[3]) row.description = (row.description ? row.description + " - " : "") + parts[3];
                row.brand = "";
                row.costPerBottle = 0;
                row.threshold = 1;
            } else if (activeTab === "equipment") {
                // Name, Price, Notes
                row.name = parts[0] || "New Equipment";
                const priceMatch = (parts[1] || "").replace(/[$,]/g, '');
                row.price = isNaN(Number(priceMatch)) ? 0 : Number(priceMatch);
                row.notes = parts[2] || "";
                row.purchaseDate = new Date().toISOString().split('T')[0];
            } else if (activeTab === "supplies") {
                // Name, Category, Quantity
                row.name = parts[0] || "New Supply";
                row.category = parts[1] || "General";
                const qtyMatch = (parts[2] || "").replace(/[$,]/g, '');
                row.quantity = isNaN(Number(qtyMatch)) ? 0 : Number(qtyMatch);
                row.lowThreshold = 1;
                row.costPerItem = 0;
            }

            return { ...row, importSource: 'Quick Paste' };
        });

        setParsedItems(data);
        const newSelection = new Set<number>();
        data.forEach((_, i) => newSelection.add(i));
        setSelectedIndices(newSelection);
        setStep("preview");
        setQuickPasteText(""); // Clear for next time
        toast.success(`Parsed ${data.length} items from text.`);
    };

    const pasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setQuickPasteText(text);
                toast.success("Text pasted from clipboard");
            } else {
                toast.info("Clipboard is empty");
            }
        } catch (err) {
            toast.error("Could not access clipboard. Please paste manually.");
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
            newItem = { name: "", brand: "", bottleSize: "", costPerBottle: 0, currentStock: 0, threshold: 1, description: "", importSource: 'Manual Entry' };
        } else if (activeTab === "equipment") {
            newItem = { name: "", price: 0, purchaseDate: "", notes: "", importSource: 'Manual Entry' };
        } else if (activeTab === "supplies") {
            newItem = { name: "", category: "", costPerItem: 0, quantity: 0, lowThreshold: 1, notes: "", importSource: 'Manual Entry' };
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
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
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

    const addManualRow = () => {
        setManualRows([...manualRows, { name: "", field2: "", field3: "", field4: "" }]);
    };

    const updateManualRow = (index: number, field: string, value: string) => {
        const newRows = [...manualRows];
        newRows[index] = { ...newRows[index], [field]: value };
        setManualRows(newRows);
    };

    const removeManualRow = (index: number) => {
        if (manualRows.length <= 1) return;
        setManualRows(manualRows.filter((_, i) => i !== index));
    };

    const handleManualSubmit = () => {
        const validRows = manualRows.filter(r => r.name.trim());
        if (validRows.length === 0) {
            toast.error("Please enter at least one product name.");
            return;
        }

        const data: any[] = validRows.map(row => {
            const item: any = { name: row.name, importSource: 'Manual Entry' };
            if (activeTab === "chemicals") {
                item.bottleSize = row.field2 || "16 oz";
                item.currentStock = Number(row.field3.replace(/[$,]/g, '')) || 0;
                item.description = row.field4;
                item.brand = "";
                item.costPerBottle = 0;
            } else if (activeTab === "equipment") {
                item.price = Number(row.field2.replace(/[$,]/g, '')) || 0;
                item.notes = row.field3;
                item.purchaseDate = new Date().toISOString().split('T')[0];
            } else if (activeTab === "supplies") {
                item.category = row.field2 || "General";
                item.quantity = Number(row.field3.replace(/[$,]/g, '')) || 0;
                item.notes = row.field4;
            }
            return item;
        });

        setParsedItems(data);
        const newSelection = new Set<number>();
        data.forEach((_, i) => newSelection.add(i));
        setSelectedIndices(newSelection);
        setStep("preview");
        setManualRows([{ name: "", field2: "", field3: "", field4: "" }]);
        toast.success(`Converted ${data.length} manual entries to import list.`);
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
                category: item.category,
                importSource: 'AI Suggestion'
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
                category: item.category,
                importSource: 'AI Suggestion'
            };
            if (activeTab !== 'equipment') setActiveTab('equipment');
        } else if (result.type === 'materials') {
            const item = result.originalItem;
            newItem = {
                name: item.name,
                category: item.type || "General",
                subtype: item.subtype || "",
                costPerItem: item.suggestedPrice || 0,
                quantity: 0,
                lowThreshold: item.threshold || 5,
                notes: item.description,
                importSource: 'AI Suggestion'
            };
            if (activeTab !== 'supplies') setActiveTab('supplies');
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
                        brand: row.brand || "",
                        bottleSize: row.bottleSize || "16 oz",
                        costPerBottle: Number(row.costPerBottle) || 0,
                        threshold: Number(row.threshold) || 1,
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
            } else if (activeTab === "equipment") {
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
            } else if (activeTab === "supplies") {
                for (const row of itemsToImport) {
                    if (!row.name) continue;
                    await saveMaterial({
                        name: row.name,
                        category: row.category || "General",
                        subtype: row.subtype || "",
                        costPerItem: Number(row.costPerItem) || 0,
                        quantity: Number(row.quantity) || 0,
                        lowThreshold: Number(row.lowThreshold) || 1,
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
                            <TabsTrigger value="supplies" disabled={step === "preview" || step === "ai_results"} className="flex flex-col items-center leading-none py-1">
                                <span>Supplies</span>
                                <span className="text-[9px] opacity-70">(Consumable)</span>
                            </TabsTrigger>
                            <TabsTrigger value="equipment" disabled={step === "preview" || step === "ai_results"} className="flex flex-col items-center leading-none py-1">
                                <span>Equipment</span>
                                <span className="text-[9px] opacity-70">(Durable)</span>
                            </TabsTrigger>
                        </TabsList>
                        {step === "preview" && (
                            <Button size="sm" onClick={addItem} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                                <Plus className="w-4 h-4" /> Add Item
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto p-1">
                        {step === "upload" ? (
                        <div className="py-6 space-y-6 flex-1">
                            {/* NEW: Quick Manual Entry Button */}
                            <div className="bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 p-6 rounded-xl shadow-xl shadow-indigo-950/20">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="space-y-1">
                                        <h3 className="font-bold flex items-center gap-2 text-xl text-white">
                                            <Plus className="w-6 h-6 text-indigo-400" /> Enter Stock Directly
                                        </h3>
                                        <p className="text-sm text-indigo-200/70">
                                            Super fast for truck inventory! Tap and type items one-by-one.
                                        </p>
                                    </div>
                                    <Button 
                                        onClick={() => setStep("manual_entry")} 
                                        className="w-full sm:w-auto bg-white text-indigo-900 hover:bg-indigo-50 font-bold px-8 py-6 rounded-lg text-lg transition-transform active:scale-95"
                                    >
                                        Start Quick Entry
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-zinc-900/80 border border-zinc-700 p-6 rounded-xl space-y-4">
                                <h3 className="font-bold flex items-center gap-2 text-lg text-white">
                                    <BookOpen className="w-5 h-5 text-blue-400" /> Use Standard Catalog
                                </h3>
                                <p className="text-sm text-zinc-400">
                                    Load our pre-filled list of common {activeTab} with recommended prices.
                                </p>
                                <Button onClick={loadStandardCatalog} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                                    Browse Standard Catalog
                                </Button>
                            </div>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-zinc-800" />
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                                    <span className="bg-zinc-900 px-3 text-zinc-500">Other Import Methods</span>
                                </div>
                            </div>

                            <div className="bg-zinc-950/60 border border-zinc-800 p-6 rounded-xl space-y-4 shadow-inner">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h3 className="font-bold flex items-center gap-2 text-lg text-purple-400">
                                            <Clipboard className="w-5 h-5 text-purple-400" /> Quick Import from Google Keep
                                        </h3>
                                        <p className="text-xs text-zinc-400 font-medium">
                                            Paste your notes directly from your phone!
                                        </p>
                                    </div>
                                    <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        onClick={pasteFromClipboard} 
                                        className="h-9 text-xs bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700 font-bold shadow-md"
                                    >
                                        <Copy className="w-4 h-4 mr-2" /> Paste Text
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    <Textarea
                                        value={quickPasteText}
                                        onChange={(e) => setQuickPasteText(e.target.value)}
                                        placeholder="One item per line (e.g. ONR, 32 oz, half full)"
                                        className="min-h-[100px] bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-purple-500/50"
                                    />
                                    <Button 
                                        onClick={() => handleQuickPaste()} 
                                        disabled={!quickPasteText.trim()}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12"
                                    >
                                        Parse & Import
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 border border-dashed rounded-xl border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors">
                                    <h3 className="font-bold flex items-center gap-2 text-white mb-4">
                                        <Upload className="w-5 h-5 text-green-500" /> JSON File
                                    </h3>
                                    <Input
                                        type="file"
                                        accept=".json"
                                        onChange={(e) => handleFileChange(e, 'json')}
                                        className="cursor-pointer bg-zinc-950 border-zinc-800 text-white mb-4"
                                    />
                                    <Button variant="ghost" size="sm" onClick={() => downloadTemplate('json')} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                                        <Download className="w-4 h-4 mr-2" /> Template
                                    </Button>
                                </div>

                                <div className="p-6 border border-dashed rounded-xl border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors">
                                    <h3 className="font-bold flex items-center gap-2 text-white mb-4">
                                        <FileSpreadsheet className="w-5 h-5 text-blue-500" /> CSV File
                                    </h3>
                                    <Input
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => handleFileChange(e, 'csv')}
                                        className="cursor-pointer bg-zinc-950 border-zinc-800 text-white mb-4"
                                    />
                                    <Button variant="ghost" size="sm" onClick={() => downloadTemplate('csv')} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                                        <Download className="w-4 h-4 mr-2" /> Template
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : step === "manual_entry" ? (
                        <div className="flex flex-col flex-1 min-h-0">
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
                                <Button variant="ghost" size="sm" onClick={() => setStep("upload")} className="text-zinc-100 hover:text-white font-bold bg-zinc-800 px-4">
                                    <ArrowLeft className="w-5 h-5 mr-2" /> EXIT & BACK
                                </Button>
                                <h3 className="font-black text-white uppercase tracking-tighter text-2xl">Stock Entry</h3>
                                <div className="w-[80px]" /> {/* Spacer */}
                            </div>

                            <div className="bg-indigo-600 border-2 border-indigo-400 p-4 rounded-xl mb-6 shadow-lg shadow-indigo-900/40">
                                <p className="text-sm font-bold text-white flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    TAP FIELDS BELOW TO ENTER STOCK — SUPER FAST FOR MOBILE!
                                </p>
                            </div>

                            <ScrollArea className="flex-1 -mx-2 px-2">
                                <div className="space-y-6 pb-20">
                                    <div className="grid grid-cols-12 gap-2 text-[12px] font-black uppercase tracking-widest text-white px-1">
                                        <div className="col-span-12 md:col-span-5 mb-1 px-1">Item Name / Brand</div>
                                        <div className="hidden md:block md:col-span-3 mb-1 px-1">{activeTab === 'chemicals' ? 'Unit Size' : activeTab === 'equipment' ? 'Price Tag' : 'Category'}</div>
                                        <div className="hidden md:block md:col-span-2 mb-1 px-1">Current Stock</div>
                                    </div>
                                    
                                    {manualRows.map((row, idx) => (
                                        <div key={idx} className="space-y-2 bg-zinc-950 p-4 rounded-xl border-2 border-zinc-800 shadow-xl">
                                            <div className="grid grid-cols-12 gap-2 items-center">
                                                <div className="col-span-10 md:col-span-5">
                                                    <Label className="md:hidden text-[10px] text-zinc-500 font-bold mb-1 block uppercase">Name</Label>
                                                    <Input 
                                                        value={row.name}
                                                        onChange={(e) => updateManualRow(idx, 'name', e.target.value)}
                                                        placeholder="ENTER NAME HERE"
                                                        className="bg-black border-zinc-700 h-14 text-white text-lg font-black placeholder:text-zinc-300 focus:border-indigo-400 ring-2 ring-zinc-800"
                                                    />
                                                </div>
                                                <div className="col-span-6 md:col-span-3">
                                                    <Label className="md:hidden text-[10px] text-zinc-500 font-bold mb-1 block uppercase">{activeTab === 'chemicals' ? 'Size' : activeTab === 'equipment' ? 'Price' : 'Category'}</Label>
                                                    <Input 
                                                        value={row.field2}
                                                        onChange={(e) => updateManualRow(idx, 'field2', e.target.value)}
                                                        placeholder={activeTab === 'chemicals' ? 'Size' : activeTab === 'equipment' ? 'Price' : 'Cat'}
                                                        className="bg-zinc-900 border-zinc-700 h-12 text-white text-base font-medium placeholder:text-zinc-600 focus:border-indigo-500"
                                                    />
                                                </div>
                                                <div className="col-span-4 md:col-span-2">
                                                    <Label className="md:hidden text-[10px] text-zinc-500 font-bold mb-1 block uppercase">Stock</Label>
                                                    <Input 
                                                        type="text"
                                                        value={row.field3}
                                                        onChange={(e) => updateManualRow(idx, 'field3', e.target.value)}
                                                        placeholder="0"
                                                        className="bg-zinc-900 border-zinc-700 h-12 text-white text-lg font-bold placeholder:text-zinc-600 text-center focus:border-indigo-500"
                                                    />
                                                </div>
                                                <div className="col-span-2 md:col-span-2 flex justify-end">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => removeManualRow(idx)}
                                                        className="h-12 w-12 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 pt-1 border-t border-zinc-900 mt-1">
                                                <Input 
                                                    value={row.field4}
                                                    onChange={(e) => updateManualRow(idx, 'field4', e.target.value)}
                                                    placeholder="Notes (Status, location, etc...)"
                                                    className="bg-zinc-900/50 border-none h-9 text-xs text-white placeholder:text-zinc-500 italic"
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    <Button 
                                        onClick={addManualRow} 
                                        variant="outline" 
                                        className="w-full h-16 border-2 border-dashed border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-900/50 font-black text-lg bg-zinc-950"
                                    >
                                        <Plus className="w-6 h-6 mr-3" /> ADD ANOTHER ITEM
                                    </Button>
                                </div>
                            </ScrollArea>

                            <div className="pt-6 border-t border-zinc-800 flex flex-col md:flex-row gap-3">
                                <Button 
                                    onClick={() => setStep("upload")} 
                                    variant="outline" 
                                    className="w-full md:w-1/3 bg-zinc-900 border-zinc-700 text-white font-bold h-14 text-lg"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleManualSubmit} 
                                    className="w-full md:flex-1 bg-green-600 hover:bg-green-500 text-white font-black h-14 text-xl shadow-lg shadow-green-900/20"
                                >
                                    SAVE & IMPORT ALL
                                </Button>
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
                            <div className="flex-1 min-h-0 border rounded-md bg-background pr-2">
                                <div className="divide-y">
                                    {(() => {
                                        const sources = Array.from(new Set(parsedItems.map(i => i.importSource || 'Other')));
                                        return sources.map(source => {
                                            const groupItems = parsedItems
                                                .map((item, index) => ({ item, index }))
                                                .filter(obj => (obj.item.importSource || 'Other') === source);
                                            
                                            if (groupItems.length === 0) return null;

                                            return (
                                                <div key={source} className="flex flex-col">
                                                    <div className="bg-zinc-100 dark:bg-zinc-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-between sticky top-0 z-10 border-b">
                                                        <div className="flex items-center gap-2">
                                                            {source === 'Manual Import' ? <FileSpreadsheet className="w-3 h-3 text-blue-500" /> : 
                                                             source === 'Catalog' ? <BookOpen className="w-3 h-3 text-purple-500" /> :
                                                             source === 'AI Suggestion' ? <Sparkles className="w-3 h-3 text-emerald-500" /> :
                                                             source === 'Quick Paste' ? <Clipboard className="w-3 h-3 text-purple-400" /> :
                                                             <FileText className="w-3 h-3 text-zinc-500" />}
                                                            {source} Section
                                                        </div>
                                                        <span className="opacity-50">{groupItems.length} items</span>
                                                    </div>
                                                    
                                                    {groupItems.map(({ item, index }) => {
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
                                                                                    <Label className="text-[10px]">Brand</Label>
                                                                                    <Input value={item.brand || ""} onChange={(e) => updateItem(index, 'brand', e.target.value)} className="h-7 text-xs" />
                                                                                </div>
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
                                                                        {activeTab === "equipment" && (
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
                                                                        {activeTab === "supplies" && (
                                                                            <>
                                                                                <div className="space-y-0.5">
                                                                                    <Label className="text-[10px]">Cost/Item ($)</Label>
                                                                                    <Input type="number" value={item.costPerItem} onChange={(e) => updateItem(index, 'costPerItem', e.target.value)} className="h-7 text-xs" />
                                                                                </div>
                                                                                <div className="space-y-0.5">
                                                                                    <Label className="text-[10px]">Qty</Label>
                                                                                    <Input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="h-7 text-xs" />
                                                                                </div>
                                                                                <div className="space-y-0.5">
                                                                                    <Label className="text-[10px]">Low Threshold</Label>
                                                                                    <Input type="number" value={item.lowThreshold} onChange={(e) => updateItem(index, 'lowThreshold', e.target.value)} className="h-7 text-xs" />
                                                                                </div>
                                                                                <div className="space-y-0.5">
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
                                                                            value={activeTab === 'equipment' ? item.notes : item.description || item.notes || ""}
                                                                            onChange={(e) => updateItem(index, activeTab === 'equipment' ? 'notes' : 'description', e.target.value)}
                                                                            className="h-7 text-xs text-muted-foreground"
                                                                            placeholder="Details..."
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        });
                                    })()}
                                    <div id="imports-end-anchor" />
                                </div>
                            </div>
                        </div>
                    )}
                    </div>
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
                <div className="mt-4 pt-4 border-t-2 border-zinc-800 flex flex-col gap-2">
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        handleAISearch(e);
                    }} className="flex flex-col sm:flex-row items-stretch gap-2">
                        <div className="relative flex-1">
                            <Sparkles className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isAiSearching ? 'text-purple-400 animate-pulse' : 'text-purple-500'}`} />
                            <Input
                                value={aiQuery}
                                onChange={(e) => setAiQuery(e.target.value)}
                                placeholder={isAiSearching ? "AI IS THINKING..." : "TYPE: 'leather cleaners'"}
                                className="h-14 pl-10 pr-4 bg-black border-2 border-indigo-500 text-white text-lg font-black placeholder:text-zinc-400 focus:ring-indigo-500/50 shadow-2xl w-full"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="lg"
                            className="h-14 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg border-2 border-indigo-400 shrink-0 uppercase tracking-widest text-lg"
                            disabled={isAiSearching || !aiQuery.trim()}
                        >
                            <Search className="w-6 h-6 mr-2" /> Find Items
                        </Button>
                    </form>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center">
                        AI-Powered Inventory Search
                    </p>
                </div>
            </DialogContent>
        </Dialog >
    );
}
