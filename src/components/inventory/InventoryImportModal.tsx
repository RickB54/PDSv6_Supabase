import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Download, Upload, AlertCircle, Check, ArrowLeft, BookOpen, Plus, Trash2, Save, FileSpreadsheet, Clipboard, Copy, Camera, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { saveChemical, saveTool, saveMaterial, getChemicals, getTools, getMaterials, uploadInventoryImage } from "@/lib/inventory-data";
import { DETAILING_CHEMICALS } from "@/data/detailingChemicals";
import { DETAILING_TOOLS } from "@/data/detailingTools";
import { DETAILING_MATERIALS } from "@/data/detailingMaterials";
import { searchAI, SearchResult } from "@/lib/inventory-ai";
import { Sparkles, Search, FileText } from "lucide-react";
import { compressImageForUpload } from "@/lib/image-compression";

interface InventoryImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved?: () => void;
    defaultTab?: "chemicals" | "supplies" | "equipment" | "tools" | "materials"; 
}

export function InventoryImportModal({ open, onOpenChange, onSaved, defaultTab = "chemicals" }: InventoryImportModalProps) {
    // Normalize legacy tab names
    const normalizeTab = (tab: string): "chemicals" | "supplies" | "equipment" => {
        if (tab === 'materials') return 'supplies';
        if (tab === 'tools') return 'equipment';
        return tab as "chemicals" | "supplies" | "equipment";
    };

    const [activeTab, setActiveTab] = useState<"chemicals" | "supplies" | "equipment">(() => {
        const saved = localStorage.getItem('inventory_import_active_tab');
        return (saved as any) || normalizeTab(defaultTab);
    });
    const [step, setStep] = useState<"upload" | "preview" | "ai_results" | "manual_entry">(() => {
        const saved = localStorage.getItem('inventory_import_step');
        return (saved as any) || "upload";
    });

    // Auto-persist modal state to survive mobile memory crashes
    useEffect(() => {
        if (open) {
            localStorage.setItem('inventory_import_modal_open', 'true');
            localStorage.setItem('inventory_import_active_tab', activeTab);
            localStorage.setItem('inventory_import_step', step);
        } else {
            localStorage.removeItem('inventory_import_modal_open');
            localStorage.removeItem('inventory_import_active_tab');
            localStorage.removeItem('inventory_import_step');
            localStorage.removeItem('ultra_v6_manual_rows');
        }
    }, [open, activeTab, step]);

    // Handle initial mount check for recovery
    useEffect(() => {
        const shouldBeOpen = localStorage.getItem('inventory_import_modal_open') === 'true';
        if (shouldBeOpen && !open) {
            onOpenChange(true);
            toast.info("Resuming your inventory import...", { duration: 3000 });
        }
    }, []);

    const [isImporting, setIsImporting] = useState(false);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [parsedItems, setParsedItems] = useState<any[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
    const [aiQuery, setAiQuery] = useState("");
    const [aiResults, setAiResults] = useState<SearchResult[]>([]);
    const [isAiSearching, setIsAiSearching] = useState(false);
    const [quickPasteText, setQuickPasteText] = useState("");
    
    // Unified row shape for all tabs:
    //   Chemicals  → brand, productName (=name), bottleSize, price, quantity
    //   Supplies   → name, category, notes, price, quantity
    //   Equipment  → name, category, notes, price
    const emptyRow = () => ({ name: "", brand: "", productName: "", category: "", bottleSize: "", notes: "", price: "", quantity: "", imageFile: null, imageUrl: null });

    const [manualRows, setManualRows] = useState<any[]>(() => {
        // Only restore from localStorage if we crashed while the modal was open
        // This prevents stale old-format rows from poisoning a fresh session
        const modalWasOpen = localStorage.getItem('inventory_import_modal_open') === 'true';
        if (modalWasOpen) {
            const saved = localStorage.getItem('ultra_v6_manual_rows');
            if (saved) {
                try {
                    const rows = JSON.parse(saved);
                    // Restoring EXACTLY what was saved, allowing imageUrl to persist
                    return rows.map((r: any) => ({ ...emptyRow(), ...r, imageFile: null }));
                } catch (e) {
                    console.error("Restore failed", e);
                }
            }
        }
        return [emptyRow()];
    });

    // Always-fresh ref so handleManualSubmit never reads a stale closure snapshot
    const manualRowsRef = useRef(manualRows);
    useEffect(() => {
        manualRowsRef.current = manualRows;
    }, [manualRows]);

    useEffect(() => {
        if (step === "manual_entry") {
            // Keep imageUrl (cloud URLs) so sessions survive reloads
            const serializable = manualRows.map(r => ({ ...r, imageFile: null }));
            localStorage.setItem('ultra_v6_manual_rows', JSON.stringify(serializable));
        }
    }, [manualRows, step]);

    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const [activeRowIdx, setActiveRowIdx] = useState<number | null>(null);

    const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || activeRowIdx === null) return;
        
        setIsProcessingImage(true);
        try {
            // Using the central high-performance compressor
            const compressed = await compressImageForUpload(file);
            
            // CLOUD-FIRST STRATEGY: Upload IMMEDIATELY to avoid memory issues with Blobs/Base64
            const publicUrl = await uploadInventoryImage(compressed);
            
            if (publicUrl) {
                const newRows = [...manualRows];
                newRows[activeRowIdx] = { 
                    ...newRows[activeRowIdx], 
                    imageUrl: publicUrl,
                    imageFile: null // No longer need the file in memory since it's on the cloud
                };
                setManualRows(newRows);
                toast.success("Photo secured to cloud.");
            }
        } catch (err) {
            console.error("Instant upload failed", err);
            toast.error("Cloud stabilization failed. Trying local only.");
            // Fallback to local URL if upload fails (less stable but works)
            const url = URL.createObjectURL(file);
            const newRows = [...manualRows];
            newRows[activeRowIdx] = { ...newRows[activeRowIdx], imageFile: file, imageUrl: url };
            setManualRows(newRows);
        } finally {
            setIsProcessingImage(false);
            setActiveRowIdx(null);
            // Clear input so same file can be selected again
            if (cameraInputRef.current) cameraInputRef.current.value = '';
            if (galleryInputRef.current) galleryInputRef.current.value = '';
        }
    };

    const triggerCamera = (idx: number) => {
        setActiveRowIdx(idx);
        cameraInputRef.current?.click();
    };

    const triggerGallery = (idx: number) => {
        setActiveRowIdx(idx);
        galleryInputRef.current?.click();
    };

    const addManualRow = () => {
        setManualRows([...manualRows, emptyRow()]);
    };

    const updateManualRow = (index: number, field: string, value: string) => {
        const newRows = [...manualRows];
        newRows[index] = { ...newRows[index], [field]: value };
        setManualRows(newRows);
    };

    const removeManualRow = (index: number) => {
        if (manualRows.length <= 1) {
            setManualRows([emptyRow()]);
            return;
        }
        setManualRows(manualRows.filter((_, i) => i !== index));
    };

    const handleManualSubmit = async () => {
        // Always read from the ref to get the absolute latest state from ALL rows,
        // including those that have scrolled out of the visible viewport
        const currentRows = manualRowsRef.current;

        // Filter by tab — all items with a name (or brand/productName for chemicals)
        const validRows = currentRows.filter(r => {
            if (activeTab === "chemicals") return r.productName?.trim() || r.brand?.trim();
            return r.name?.trim();
        });

        if (validRows.length === 0) {
            toast.error("Please enter at least one item name.");
            return;
        }

        // Price is now OPTIONAL — warn but don't block
        const rowsMissingPrice = validRows.filter(r => !r.price || r.price.toString().trim() === '');
        if (rowsMissingPrice.length > 0) {
            const names = rowsMissingPrice.map(r => r.name || r.productName || "(unnamed)").join(", ");
            toast.warning(`No price entered for: ${names}. Saving as $0.00 — you can update later.`);
        }

        setIsImporting(true);
        setIsUploadingPhotos(true);
        const failedItems: string[] = [];
        let importedCount = 0;

        // Parallel Save for maximum speed and reliability
        const savePromises = validRows.map(async (row) => {
            try {
                let finalImageUrl = row.imageUrl || "";

                // Upload photo ONLY if it hasn't been uploaded yet
                if (row.imageFile && !finalImageUrl.startsWith('http')) {
                    try {
                        const uploadedUrl = await uploadInventoryImage(row.imageFile);
                        if (uploadedUrl) finalImageUrl = uploadedUrl;
                    } catch (uploadErr) {
                        console.error("Photo upload failed for row", row.name || row.productName, uploadErr);
                    }
                }

                const priceValue = Number(row.price.toString().replace(/[$,]/g, '')) || 0;
                const qtyValue = Number(row.quantity || "0") || 0;

                if (activeTab === "chemicals") {
                    const chemName = row.productName?.trim() || row.brand?.trim() || "Unnamed Chemical";
                    await saveChemical({
                        name: chemName,
                        brand: row.brand || "",
                        bottleSize: row.bottleSize || "16 oz",
                        costPerBottle: priceValue,
                        threshold: 1,
                        currentStock: qtyValue,
                        imageUrl: finalImageUrl
                    }, true);

                } else if (activeTab === "equipment") {
                    await saveTool({
                        name: row.name?.trim() || "Unnamed Equipment",
                        price: priceValue,
                        category: row.category || "General",
                        purchaseDate: new Date().toISOString().split('T')[0],
                        warranty: "",
                        lifeExpectancy: "",
                        notes: row.notes || "",
                        imageUrl: finalImageUrl
                    }, true);

                } else if (activeTab === "supplies") {
                    await saveMaterial({
                        name: row.name?.trim() || "Unnamed Supply",
                        category: row.category || "General",
                        costPerItem: priceValue,
                        quantity: qtyValue,
                        lowThreshold: 1,
                        notes: row.notes || "",
                        imageUrl: finalImageUrl
                    }, true);
                }
                
                importedCount++;
            } catch (itemError: any) {
                const name = row.name || row.productName || "(unnamed)";
                const errMsg = itemError?.message || String(itemError);
                console.error(`Failed to save ${name}:`, itemError);
                failedItems.push(`${name} (${errMsg})`);
            }
        });

        await Promise.all(savePromises);

        setIsImporting(false);
        setIsUploadingPhotos(false);

        // Filter out successfully imported items from the manualRows
        // We'll keep the ones that appeared in failedItems
        const stillInList = manualRowsRef.current.filter(row => {
            const name = row.productName || row.name || "";
            return failedItems.some(f => f.startsWith(name));
        });

        if (importedCount > 0) {
            toast.success(`Successfully imported ${importedCount} items.`);
            setManualRows(stillInList.length > 0 ? stillInList : [emptyRow()]);
            
            // If everything is done or successfully removed, clean storage
            if (stillInList.length === 0) {
                localStorage.removeItem('ultra_v6_manual_rows');
                localStorage.removeItem('inventory_import_modal_open');
                onOpenChange(false);
                setStep("upload");
            }
        }

        if (failedItems.length > 0) {
            toast.error(`Some items failed to save. They remain in the list for review.`);
        }
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
                        subtype: row.brand || "",
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

    // Reset tab when reopening with a new default
    useEffect(() => {
        if (open && defaultTab) {
            setActiveTab(normalizeTab(defaultTab));
        }
    }, [open, defaultTab]);

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
                // Improved CSV Parsing
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
                    headers.forEach((header, i) => {
                        let val = values[i] || "";
                        const numFields = ['costperbottle', 'threshold', 'currentstock', 'price', 'costperitem', 'quantity', 'lowthreshold'];
                        if (numFields.includes(header)) {
                            const numericVal = Number(val.replace(/[$,]/g, ''));
                            row[header === 'costperbottle' ? 'costPerBottle' : 
                                header === 'currentstock' ? 'currentStock' : 
                                header === 'costperitem' ? 'costPerItem' : 
                                header === 'lowthreshold' ? 'lowThreshold' : header] = isNaN(numericVal) ? 0 : numericVal;
                        } else {
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

            const newSelection = new Set<number>();
            itemsWithSource.forEach((item, index) => {
                const name = item.name?.toLowerCase().trim();
                if (name && !existingNames.has(name)) newSelection.add(index);
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
        const data: any[] = lines.map(line => {
            let parts = line.split(',').map(p => p.trim());
            if (parts.length === 1) {
                const cleanLine = line.replace(/^[•\-\*\d\.]+\s*/, "").trim();
                const altParts = cleanLine.split(/[:\-]/).map(p => p.trim());
                if (altParts.length > 1) parts = altParts;
                else parts = [cleanLine];
            }

            const row: any = {};
            if (activeTab === "chemicals") {
                row.name = parts[0] || "New Chemical";
                row.bottleSize = parts[1] || "16 oz";
                const p2 = parts[2] || "";
                if (p2 && !isNaN(Number(p2.replace(/[$,]/g, '')))) row.currentStock = Number(p2.replace(/[$,]/g, ''));
                else if (p2) row.description = p2;
            } else if (activeTab === "equipment") {
                row.name = parts[0] || "New Equipment";
                const priceMatch = (parts[1] || "").replace(/[$,]/g, '');
                row.price = isNaN(Number(priceMatch)) ? 0 : Number(priceMatch);
                row.notes = parts[2] || "";
            } else if (activeTab === "supplies") {
                row.name = parts[0] || "New Supply";
                row.category = parts[1] || "General";
                const qtyMatch = (parts[2] || "").replace(/[$,]/g, '');
                row.quantity = isNaN(Number(qtyMatch)) ? 0 : Number(qtyMatch);
            }
            return { ...row, importSource: 'Quick Paste' };
        });

        setParsedItems(data);
        const newSelection = new Set<number>();
        data.forEach((_, i) => newSelection.add(i));
        setSelectedIndices(newSelection);
        setStep("preview");
        setQuickPasteText("");
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

    const isDuplicate = (name: string) => existingNames.has((name || "").toLowerCase().trim());

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full sm:max-w-[1100px] h-[95vh] sm:h-[90vh] sm:max-h-[900px] flex flex-col p-2 sm:p-6 bg-zinc-950 border-zinc-800 overflow-hidden shadow-2xl">
                <DialogHeader className="shrink-0 mb-2 px-2">
                    <DialogTitle className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter uppercase whitespace-normal leading-tight">
                        <Plus className="w-8 h-8 text-indigo-500 shrink-0" />
                        {activeTab} Documentation Suite
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <TabsList className="grid grid-cols-3 bg-zinc-900 border border-zinc-800 p-1 shrink-0 mb-4 h-12">
                        <TabsTrigger value="chemicals" className="font-bold uppercase text-[10px] sm:text-xs">Chemicals</TabsTrigger>
                        <TabsTrigger value="supplies" className="font-bold uppercase text-[10px] sm:text-xs">Supplies</TabsTrigger>
                        <TabsTrigger value="equipment" className="font-bold uppercase text-[10px] sm:text-xs">Equipment</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 min-h-0 flex flex-col">
                        {step === "upload" ? (
                            <ScrollArea className="flex-1">
                                <div className="space-y-6 pb-6 pr-4 pl-1">
                                    <div className="bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 p-6 rounded-xl shadow-xl">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div className="space-y-1">
                                                <h3 className="font-bold flex items-center gap-2 text-xl text-white uppercase tracking-tighter">
                                                    <Plus className="w-6 h-6 text-indigo-400" /> Ultra-V6 Entry
                                                </h3>
                                                <p className="text-sm text-indigo-200/70">
                                                    Rapid manual entry for mobile cameras.
                                                </p>
                                            </div>
                                            <Button 
                                                onClick={() => setStep("manual_entry")} 
                                                className="w-full sm:w-auto bg-white text-indigo-900 hover:bg-indigo-50 font-black px-8 py-6 rounded-lg text-lg shadow-lg"
                                            >
                                                START ENTRY
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl space-y-4">
                                        <h3 className="font-bold flex items-center gap-2 text-lg text-white uppercase tracking-tight">
                                            <BookOpen className="w-5 h-5 text-blue-400" /> Load Catalog
                                        </h3>
                                        <p className="text-sm text-zinc-400">
                                            Import pre-configured {activeTab} lists.
                                        </p>
                                        <Button onClick={loadStandardCatalog} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold">
                                            Browse Catalog
                                        </Button>
                                    </div>

                                    <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-xl space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <h3 className="font-bold flex items-center gap-2 text-lg text-purple-400 uppercase tracking-tight">
                                                    <Clipboard className="w-5 h-5" /> Quick Paste
                                                </h3>
                                                <p className="text-xs text-zinc-500">
                                                    Paste inventory from notes.
                                                </p>
                                            </div>
                                            <Button variant="secondary" size="sm" onClick={pasteFromClipboard} className="bg-zinc-800 font-bold">
                                                <Copy className="w-4 h-4 mr-2" /> Paste
                                            </Button>
                                        </div>
                                        <div className="space-y-3">
                                            <Textarea
                                                value={quickPasteText}
                                                onChange={(e) => setQuickPasteText(e.target.value)}
                                                placeholder="e.g. Iron Decon, 16oz"
                                                className="min-h-[100px] bg-black border-zinc-800 focus:border-indigo-500"
                                            />
                                            <Button onClick={() => handleQuickPaste()} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black h-12">
                                                PROCESS PASTE
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                        <form onSubmit={(e) => { e.preventDefault(); handleAISearch(e); }} className="space-y-3">
                                            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block">AI Search Bar</span>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                                <Input
                                                    value={aiQuery}
                                                    onChange={(e) => setAiQuery(e.target.value)}
                                                    placeholder="Search catalog..."
                                                    className="pl-10 bg-black border-zinc-800 h-12 font-bold"
                                                />
                                            </div>
                                            <Button type="submit" disabled={isAiSearching} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black h-12 uppercase tracking-wide">
                                                {isAiSearching ? "Thinking..." : "Find suggested items"}
                                            </Button>
                                        </form>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                         <div className="p-4 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
                                            <h4 className="text-[10px] font-black text-zinc-500 uppercase mb-2">JSON FILE</h4>
                                            <Input type="file" accept=".json" onChange={(e) => handleFileChange(e, 'json')} className="h-10 text-[10px] bg-black border-zinc-900" />
                                         </div>
                                         <div className="p-4 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
                                            <h4 className="text-[10px] font-black text-zinc-500 uppercase mb-2">CSV FILE</h4>
                                            <Input type="file" accept=".csv" onChange={(e) => handleFileChange(e, 'csv')} className="h-10 text-[10px] bg-black border-zinc-900" />
                                         </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        ) : step === "manual_entry" ? (
                            <div className="flex flex-col flex-1 min-h-0">
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800 shrink-0">
                                    <Button variant="ghost" size="sm" onClick={() => setStep("upload")} className="text-zinc-400 font-bold">
                                        <ArrowLeft className="w-4 h-4 mr-2" /> BACK
                                    </Button>
                                    <h3 className="font-black text-white uppercase text-xl truncate">ULTRA-V6 DIRECT ENTRY</h3>
                                    <Button onClick={addManualRow} className="bg-indigo-600 hover:bg-indigo-500 font-bold h-9">
                                        <Plus className="w-4 h-4 mr-1" /> ADD
                                    </Button>
                                </div>

                                <ScrollArea className="flex-1 px-1">
                                    <div className="space-y-4 pb-12">
                                        <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handlePhotoCapture} />
                                        <input type="file" accept="image/*" ref={galleryInputRef} className="hidden" onChange={handlePhotoCapture} />
                                        {manualRows.map((row, idx) => (
                                            <div key={idx} className="group relative bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 shadow-inner">
                                                <div className="grid grid-cols-12 gap-3 items-start">
                                                    <div className="col-span-12 md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">

                                                        {/* ── CHEMICALS: Brand + Product Name + Bottle Size ── */}
                                                        {activeTab === "chemicals" && (
                                                            <>
                                                                <div className="space-y-1">
                                                                    <Label className="text-[8px] font-black uppercase text-zinc-600 ml-1">Brand Name</Label>
                                                                    <Input value={row.brand} onChange={(e) => updateManualRow(idx, 'brand', e.target.value)} placeholder="e.g. Meguiar's" className="h-10 bg-black border-zinc-800 text-white font-bold" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-[8px] font-black uppercase text-zinc-600 ml-1">Product Name <span className="text-red-500">*</span></Label>
                                                                    <Input value={row.productName} onChange={(e) => updateManualRow(idx, 'productName', e.target.value)} placeholder="e.g. Hyper Dressing" className="h-10 bg-black border-zinc-800 text-white font-bold" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-[8px] font-black uppercase text-zinc-600 ml-1">Price / Cost ($) <span className="text-red-500">*</span></Label>
                                                                    <Input type="number" value={row.price} onChange={(e) => updateManualRow(idx, 'price', e.target.value)} placeholder="0.00" className="h-10 bg-black border-zinc-800 text-indigo-400 font-black text-lg focus:ring-2 ring-indigo-500/50" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-[8px] font-black uppercase text-zinc-600 ml-1">Bottle Size</Label>
                                                                    <Input value={row.bottleSize} onChange={(e) => updateManualRow(idx, 'bottleSize', e.target.value)} placeholder="e.g. 32 oz, 1 gal" className="h-10 bg-black border-zinc-800 text-zinc-400" />
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* ── SUPPLIES: Item Name + Category + Notes ── */}
                                                        {activeTab === "supplies" && (
                                                            <>
                                                                <div className="space-y-1 sm:col-span-2">
                                                                    <Label className="text-[8px] font-black uppercase text-zinc-600 ml-1">Item Name <span className="text-red-500">*</span></Label>
                                                                    <Input value={row.name} onChange={(e) => updateManualRow(idx, 'name', e.target.value)} placeholder="e.g. Microfiber Towel" className="h-10 bg-black border-zinc-800 text-white font-bold" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-[8px] font-black uppercase text-zinc-600 ml-1">Category</Label>
                                                                    <Input value={row.category} onChange={(e) => updateManualRow(idx, 'category', e.target.value)} placeholder="e.g. Microfiber, PPE" className="h-10 bg-black border-zinc-800 text-zinc-400" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-[8px] font-black uppercase text-zinc-600 ml-1">Price / Cost ($) <span className="text-red-500">*</span></Label>
                                                                    <Input type="number" value={row.price} onChange={(e) => updateManualRow(idx, 'price', e.target.value)} placeholder="0.00" className="h-10 bg-black border-zinc-800 text-indigo-400 font-black text-lg focus:ring-2 ring-indigo-500/50" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-[8px] font-black uppercase text-zinc-600 ml-1">Notes (optional)</Label>
                                                                    <Input value={row.notes} onChange={(e) => updateManualRow(idx, 'notes', e.target.value)} placeholder="Additional info..." className="h-10 bg-black border-zinc-800 text-zinc-400" />
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* ── EQUIPMENT: Item Name + Category + Notes ── */}
                                                        {activeTab === "equipment" && (
                                                            <>
                                                                <div className="space-y-1 sm:col-span-2">
                                                                    <Label className="text-[8px] font-black uppercase text-zinc-600 ml-1">Item Name <span className="text-red-500">*</span></Label>
                                                                    <Input value={row.name} onChange={(e) => updateManualRow(idx, 'name', e.target.value)} placeholder="e.g. Dual Action Polisher" className="h-10 bg-black border-zinc-800 text-white font-bold" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-[8px] font-black uppercase text-zinc-600 ml-1">Category</Label>
                                                                    <Input value={row.category} onChange={(e) => updateManualRow(idx, 'category', e.target.value)} placeholder="e.g. Power Tool, Vehicle" className="h-10 bg-black border-zinc-800 text-zinc-400" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-[8px] font-black uppercase text-zinc-600 ml-1">Price / Cost ($) <span className="text-red-500">*</span></Label>
                                                                    <Input type="number" value={row.price} onChange={(e) => updateManualRow(idx, 'price', e.target.value)} placeholder="0.00" className="h-10 bg-black border-zinc-800 text-indigo-400 font-black text-lg focus:ring-2 ring-indigo-500/50" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-[8px] font-black uppercase text-zinc-600 ml-1">Notes (optional)</Label>
                                                                    <Input value={row.notes} onChange={(e) => updateManualRow(idx, 'notes', e.target.value)} placeholder="Warranty, condition..." className="h-10 bg-black border-zinc-800 text-zinc-400" />
                                                                </div>
                                                            </>
                                                        )}

                                                    </div>
                                                    <div className="col-span-12 md:col-span-4 flex items-center gap-3 h-full pt-1">
                                                        <div className="flex-1 h-full flex flex-col gap-1">
                                                            <div
                                                                onClick={() => triggerCamera(idx)}
                                                                className="flex-1 min-h-[60px] aspect-video rounded-xl border-2 border-dashed border-zinc-800 bg-black flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-indigo-500/50 transition-all"
                                                            >
                                                                {row.imageUrl ? (
                                                                    <img src={row.imageUrl} alt="Stock" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        {isProcessingImage && activeRowIdx === idx ? <Loader2 className="w-6 h-6 animate-spin text-indigo-400" /> : <Camera className="w-8 h-8 text-zinc-700 group-hover:text-indigo-400 transition-colors" />}
                                                                        <span className="text-[7px] font-black text-zinc-800 uppercase group-hover:text-zinc-600">Snap Photo</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Button 
                                                                onClick={(e) => { e.stopPropagation(); triggerGallery(idx); }}
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="h-7 text-[8px] border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-white uppercase font-black"
                                                            >
                                                                <Upload className="w-3 h-3 mr-1" /> From Library
                                                            </Button>
                                                        </div>
                                                        <Button variant="ghost" size="icon" onClick={() => removeManualRow(idx)} className="h-12 w-12 text-zinc-800 hover:text-red-500 hover:bg-red-500/10 shrink-0">
                                                            <Trash2 className="w-6 h-6" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <Button onClick={addManualRow} variant="outline" className="w-full h-16 border-2 border-dashed border-zinc-800 font-bold text-zinc-500 hover:text-white hover:border-indigo-500 transition-all uppercase tracking-widest text-xs">
                                            <Plus className="w-5 h-5 mr-2" /> ADD ROW
                                        </Button>
                                        <div className="h-24" />
                                    </div>
                                </ScrollArea>

                                <div className="shrink-0 p-4 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex flex-col sm:flex-row gap-3">
                                    <Button onClick={() => setStep("upload")} variant="outline" className="flex-1 font-bold h-16 text-lg">CANCEL</Button>
                                    <Button onClick={handleManualSubmit} disabled={isImporting || isUploadingPhotos} className="flex-[2] bg-green-600 hover:bg-green-500 text-white font-black h-16 text-2xl shadow-[0_0_30px_rgba(22,163,74,0.3)] border-2 border-green-500/50 transition-all active:scale-[0.98]">
                                        {isImporting ? (
                                            <div className="flex items-center gap-3">
                                                <Loader2 className="w-8 h-8 animate-spin" />
                                                <span className="uppercase">{isUploadingPhotos ? "Uploading Photos..." : "Importing..."}</span>
                                            </div>
                                        ) : "SAVE & UPLOAD NOW"}
                                    </Button>
                                </div>
                            </div>
                        ) : step === "ai_results" ? (
                            <div className="flex flex-col flex-1 min-h-0">
                                <div className="flex items-center gap-3 mb-4 shrink-0">
                                    <Button variant="ghost" size="sm" onClick={() => setStep("upload")} className="font-bold bg-zinc-900 border border-zinc-800">
                                        <ArrowLeft className="w-4 h-4 mr-2" /> BACK
                                    </Button>
                                    <h3 className="text-sm font-black text-purple-400 uppercase tracking-widest border-l pl-4 border-zinc-800">AI RESULTS ({aiResults.length})</h3>
                                </div>
                                <ScrollArea className="flex-1 bg-black/40 rounded-xl border border-zinc-900">
                                    <div className="p-4 space-y-3">
                                        {aiResults.map((result) => (
                                            <div key={result.id} className="p-4 border border-zinc-800 bg-zinc-900/40 rounded-xl flex items-center gap-4 hover:border-indigo-500/30 transition-all group">
                                                <div className="p-3 rounded-lg bg-zinc-900 text-indigo-400 font-bold border border-zinc-800">
                                                    {result.type === 'chemicals' ? <BookOpen className="w-6 h-6"/> : <FileText className="w-6 h-6"/>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-white text-lg truncate uppercase tracking-tighter">{result.name}</h4>
                                                    <p className="text-xs text-zinc-500 line-clamp-1 italic">{result.description}</p>
                                                </div>
                                                <Button size="lg" onClick={() => addAiItem(result)} className="bg-indigo-600 hover:bg-indigo-500 font-black h-12 px-8 shadow-lg shadow-indigo-950/20 active:scale-95 transition-transform">
                                                    ADD
                                                </Button>
                                            </div>
                                        ))}
                                        {aiResults.length === 0 && (
                                            <div className="text-center py-20 text-zinc-600 flex flex-col items-center gap-4">
                                                <Search className="w-12 h-12 opacity-20" />
                                                <p className="font-bold uppercase tracking-widest text-sm">No items found.</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        ) : (
                            <div className="flex flex-col flex-1 min-h-0">
                                <div className="flex items-center justify-between gap-4 mb-4 pb-2 border-b border-zinc-800 px-2 shrink-0">
                                    <Button variant="ghost" size="sm" onClick={() => { setStep("upload"); setFile(null); }} className="text-zinc-500 font-bold">
                                        <ArrowLeft className="w-4 h-4 mr-2" /> RESET
                                    </Button>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" className="h-8 text-[10px] font-black border-zinc-800 uppercase" onClick={() => toggleAll(true)}>ALL</Button>
                                        <Button variant="outline" className="h-8 text-[10px] font-black border-zinc-800 uppercase" onClick={() => toggleAll(false)}>NONE</Button>
                                        <span className="text-xs font-black text-indigo-400 ml-2 uppercase tracking-widest bg-indigo-500/10 px-3 py-1.5 rounded-full">
                                            {selectedIndices.size} Items Ready
                                        </span>
                                    </div>
                                </div>

                                <ScrollArea className="flex-1 bg-zinc-950 rounded-2xl border-2 border-zinc-900 shadow-inner">
                                    <div className="p-4 space-y-10">
                                        {(() => {
                                            const sources = Array.from(new Set(parsedItems.map(i => i.importSource || 'Other')));
                                            return sources.map(source => {
                                                const groupItems = parsedItems
                                                    .map((item, index) => ({ item, index }))
                                                    .filter(obj => (obj.item.importSource || 'Other') === source);
                                                
                                                if (groupItems.length === 0) return null;

                                                return (
                                                    <div key={source} className="space-y-4">
                                                        <div className="flex items-center gap-4 px-2">
                                                            <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent to-zinc-900" />
                                                            <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">{source} ({groupItems.length})</span>
                                                            <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent to-zinc-900" />
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-3">
                                                            {groupItems.map(({ item, index }) => {
                                                                const duplicate = isDuplicate(item.name || "");
                                                                const isSelected = selectedIndices.has(index);
                                                                return (
                                                                    <div key={index} className={`flex items-start gap-4 p-5 rounded-2xl border-2 transition-all group ${isSelected ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-800'}`}>
                                                                        <Checkbox 
                                                                            checked={isSelected} 
                                                                            onCheckedChange={() => toggleSelection(index)}
                                                                            className="mt-2 w-5 h-5"
                                                                        />
                                                                        <div className="flex-1 min-w-0 space-y-4">
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-[8px] font-black text-zinc-600 uppercase ml-1">Item Name</Label>
                                                                                    <Input value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} className={`h-11 font-black bg-black border-zinc-800 focus:ring-2 ${duplicate ? 'ring-orange-500/30 border-orange-500/50' : 'ring-indigo-500/30'}`} />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-[8px] font-black text-zinc-600 uppercase ml-1">Brand / Subtype</Label>
                                                                                    <Input value={item.brand} onChange={(e) => updateItem(index, 'brand', e.target.value)} placeholder="Brand" className="h-11 bg-black border-zinc-800 font-bold italic text-zinc-400" />
                                                                                </div>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-[8px] font-black text-zinc-600 uppercase ml-1">Price ($)</Label>
                                                                                    <Input type="number" value={item.price || item.costPerBottle || item.costPerItem} onChange={(e) => updateItem(index, activeTab === 'chemicals' ? 'costPerBottle' : activeTab === 'supplies' ? 'costPerItem' : 'price', e.target.value)} className="h-9 bg-zinc-900 border-none text-indigo-400 font-black" />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-[8px] font-black text-zinc-600 uppercase ml-1">Stock / Qty</Label>
                                                                                    <Input type="number" value={item.currentStock || item.quantity} onChange={(e) => updateItem(index, activeTab === 'supplies' ? 'quantity' : 'currentStock', e.target.value)} className="h-9 bg-zinc-900 border-none font-bold" />
                                                                                </div>
                                                                                <div className="space-y-1 col-span-2">
                                                                                    <Label className="text-[8px] font-black text-zinc-600 uppercase ml-1">Category / Size</Label>
                                                                                    <Input value={item.category || item.bottleSize} onChange={(e) => updateItem(index, activeTab === 'chemicals' ? 'bottleSize' : 'category', e.target.value)} className="h-9 bg-zinc-900 border-none text-zinc-500" />
                                                                                </div>
                                                                            </div>
                                                                            {duplicate && (
                                                                                <div className="flex items-center gap-2 text-[9px] font-black text-orange-500 uppercase bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20 w-fit">
                                                                                    <AlertCircle className="w-3 h-3" /> Item already exists in catalog
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="opacity-40 group-hover:opacity-100 text-zinc-700 hover:text-red-500 transition-opacity">
                                                                            <Trash2 className="w-5 h-5" />
                                                                        </Button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                        <div id="imports-end-anchor" className="h-20" />
                                    </div>
                                </ScrollArea>

                                <div className="shrink-0 pt-6 flex flex-col sm:flex-row gap-4 mt-4 border-t-2 border-zinc-900 bg-zinc-950">
                                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 font-black h-16 text-lg uppercase tracking-widest border-2 border-zinc-800">Cancel</Button>
                                    <Button 
                                        onClick={handleImport}
                                        disabled={isImporting || selectedIndices.size === 0}
                                        className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white font-black h-16 text-2xl shadow-[0_0_40px_rgba(79,70,229,0.3)] uppercase tracking-tighter transition-all active:scale-[0.98]"
                                    >
                                        {isImporting ? <Loader2 className="w-8 h-8 animate-spin" /> : <div className="flex items-center gap-3"><Save className="w-7 h-7" /> IMPORT {selectedIndices.size} ITEMS</div>}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
