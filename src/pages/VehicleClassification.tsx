import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, AlertCircle, ArrowLeft, Car, Edit, Trash2, History, FileDown, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import vehicleDatabase from "@/data/vehicle_db.json";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { savePDFToArchive } from "@/lib/pdfArchive";

import { getSupabaseCustomers } from "@/lib/supa-data";
import { normalizeVehicleType } from "@/lib/pricingHelpers";

type ClassificationType = "Compact/Sedan" | "Mid-Size/SUV" | "Truck/Van/Large SUV" | "Luxury/High-End";

const CLASSIFICATION_OPTIONS: ClassificationType[] = [
    "Compact/Sedan",
    "Mid-Size/SUV",
    "Truck/Van/Large SUV",
    "Luxury/High-End"
];

// Stable data structure that handles both old and new formats
interface SavedClassification {
    id: string;
    make: string;
    model: string;
    category: string; // Changed from 'classification' to match user's spec
    timestamp: string;
    customer?: {
        id?: string;
        name?: string;
        phone?: string;
        email?: string;
    };
}

interface Customer {
    id: string;
    name: string;
    email?: string;
    phone?: string;
}

// Safe type for vehicle database
type VehicleDB = Record<string, Record<string, string>>;

export default function VehicleClassification() {
    const { toast } = useToast();
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [selectedMake, setSelectedMake] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [category, setCategory] = useState<string>("");
    const [overrideModalOpen, setOverrideModalOpen] = useState(false);
    const [makeSearchQuery, setMakeSearchQuery] = useState("");
    const [history, setHistory] = useState<SavedClassification[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

    // Load history and customers on mount
    useEffect(() => {
        loadHistory();
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        try {
            const custs = await getSupabaseCustomers();
            setCustomers(Array.isArray(custs) ? custs : []);
        } catch (error) {
            console.error("Failed to load customers:", error);
            setCustomers([]);
        }
    };

    const loadHistory = () => {
        try {
            const stored = localStorage.getItem("vehicle_classification_history");
            if (!stored) {
                setHistory([]);
                return;
            }

            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) {
                setHistory([]);
                return;
            }

            // Normalize old and new formats
            const normalized: SavedClassification[] = parsed.map((item: any) => {
                // Handle old format without customer field
                const base: SavedClassification = {
                    id: String(item.id || Date.now()),
                    make: String(item.make || ""),
                    model: String(item.model || ""),
                    category: String(item.category || item.classification || ""),
                    timestamp: String(item.timestamp || new Date().toISOString())
                };

                // Only add customer if it exists and has data
                if (item.customer && typeof item.customer === 'object') {
                    base.customer = {
                        id: item.customer.id || undefined,
                        name: item.customer.name || undefined,
                        phone: item.customer.phone || undefined,
                        email: item.customer.email || undefined
                    };
                } else if (item.customer_id || item.customer_name) {
                    // Handle legacy format
                    base.customer = {
                        id: item.customer_id || undefined,
                        name: item.customer_name || undefined
                    };
                }

                return base;
            });

            setHistory(normalized);
        } catch (error) {
            console.error("Failed to load history:", error);
            setHistory([]);
        }
    };

    // Safely access vehicle database
    const safeDB = useMemo((): VehicleDB => {
        if (!vehicleDatabase || typeof vehicleDatabase !== 'object') {
            console.error("Vehicle database is invalid");
            return {};
        }
        return vehicleDatabase as VehicleDB;
    }, []);

    // Get all makes
    const allMakes = useMemo(() => {
        try {
            const makes = Object.keys(safeDB);
            return makes.filter(m => m && typeof m === 'string').sort();
        } catch (e) {
            console.error("Error loading makes:", e);
            return [];
        }
    }, [safeDB]);

    // Filter makes based on search
    const filteredMakes = useMemo(() => {
        if (!makeSearchQuery || !makeSearchQuery.trim()) return allMakes;
        const query = makeSearchQuery.toLowerCase().trim();
        return allMakes.filter(make => make.toLowerCase().includes(query));
    }, [allMakes, makeSearchQuery]);

    // Get models for selected make
    const availableModels = useMemo(() => {
        if (!selectedMake) return [];
        try {
            const makeData = safeDB[selectedMake];
            if (!makeData || typeof makeData !== 'object') return [];
            const models = Object.keys(makeData);
            return models.filter(m => m && typeof m === 'string').sort();
        } catch (e) {
            console.error("Error loading models:", e);
            return [];
        }
    }, [selectedMake, safeDB]);

    const handleMakeSelect = (make: string) => {
        if (!make) return;
        setSelectedMake(make);
        setSelectedModel("");
        setMakeSearchQuery("");
        setStep(2);
    };

    const handleModelSelect = (model: string) => {
        if (!model) return;
        setSelectedModel(model);

        // Determine category with safe access
        let autoCategory = "Manual Classification Required";

        try {
            // 1. Try JSON Database First
            if (selectedMake && safeDB[selectedMake]) {
                const makeData = safeDB[selectedMake];
                if (makeData && typeof makeData === 'object' && model in makeData) {
                    const value = makeData[model];
                    if (value && typeof value === 'string') {
                        // Map legacy/JSON values to new User-Approved Categories
                        if (value === "Compact") autoCategory = "Compact/Sedan";
                        else if (value === "Midsize / Sedan") autoCategory = "Mid-Size/SUV";
                        else if (value === "SUV / Crossover") autoCategory = "Mid-Size/SUV";
                        else if (value === "Truck / Oversized") autoCategory = "Truck/Van/Large SUV";
                        else if (value === "Oversized Specialty") autoCategory = "Luxury/High-End";
                        else autoCategory = "Mid-Size/SUV"; // Default fallback
                    }
                }
            }

            // 2. Apply Robust Overrides from Pricing Engine
            // This fixes issues where JSON DB misclassifies Large SUVs (e.g. Expedition) as small SUVs
            const searchStr = `${selectedMake} ${model}`;
            const pricingType = normalizeVehicleType(searchStr);

            // Force upgrade for Truck/Luxury detected vehicles
            if (pricingType === 'truck') autoCategory = "Truck/Van/Large SUV";
            if (pricingType === 'luxury') autoCategory = "Luxury/High-End";
            if (pricingType === 'midsize') autoCategory = "Mid-Size/SUV";
            if (pricingType === 'compact') autoCategory = "Compact/Sedan";

        } catch (e) {
            console.error("Error determining category:", e);
        }

        setCategory(autoCategory);
        setStep(3);
    };

    const handleConfirm = () => {
        saveToLocalStorage();
        setStep(4);
    };

    const handleOverride = (newCategory: string) => {
        setCategory(newCategory);
        setOverrideModalOpen(false);
        toast({
            title: "Classification Updated",
            description: `Changed to: ${newCategory}`
        });
    };

    const saveToLocalStorage = () => {
        try {
            const data: SavedClassification = {
                id: editingId || Date.now().toString(),
                make: selectedMake,
                model: selectedModel,
                category: category,
                timestamp: new Date().toISOString()
            };

            // Only add customer if one is selected
            if (selectedCustomerId) {
                const customer = customers.find(c => c.id === selectedCustomerId);
                if (customer) {
                    data.customer = {
                        id: customer.id,
                        name: customer.name,
                        phone: customer.phone,
                        email: customer.email
                    };
                }
            }

            // Update or add to history
            let updatedHistory: SavedClassification[];
            if (editingId) {
                updatedHistory = history.map(item => item.id === editingId ? data : item);
            } else {
                updatedHistory = [data, ...history];
            }

            setHistory(updatedHistory);
            localStorage.setItem("vehicle_classification_history", JSON.stringify(updatedHistory));
            localStorage.setItem("vehicle_classification", JSON.stringify(data));

            toast({
                title: editingId ? "Classification Updated" : "Classification Saved",
                description: "Vehicle classification stored successfully."
            });

            setEditingId(null);
        } catch (error) {
            console.error("Failed to save:", error);
            toast({
                title: "Save Failed",
                description: "Could not save classification.",
                variant: "destructive"
            });
        }
    };

    const handleEdit = (item: SavedClassification) => {
        setEditingId(item.id);
        setSelectedMake(item.make);
        setSelectedModel(item.model);
        setCategory(item.category);
        setSelectedCustomerId(item.customer?.id || "");
        setStep(2);
    };

    const handleDelete = (id: string) => {
        if (!confirm("Are you sure you want to delete this classification?")) return;

        try {
            const updatedHistory = history.filter(item => item.id !== id);
            setHistory(updatedHistory);
            localStorage.setItem("vehicle_classification_history", JSON.stringify(updatedHistory));

            toast({
                title: "Classification Deleted",
                description: "Vehicle removed from history."
            });
        } catch (error) {
            console.error("Failed to delete:", error);
        }
    };

    const handleReset = () => {
        setStep(1);
        setSelectedMake("");
        setSelectedModel("");
        setCategory("");
        setMakeSearchQuery("");
        setSelectedCustomerId("");
        setEditingId(null);
    };

    const handleExportPDF = () => {
        if (history.length === 0) {
            toast({ title: "No Data", description: "No vehicle classifications to export.", variant: "destructive" });
            return;
        }

        try {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text("Vehicle Classification History", 14, 20);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

            const tableData = history.map((item) => [
                item.make || "",
                item.model || "",
                item.category || "",
                item.customer?.name || "-",
                new Date(item.timestamp).toLocaleDateString()
            ]);

            autoTable(doc, {
                startY: 35,
                head: [["Make", "Model", "Classification", "Customer", "Date"]],
                body: tableData,
            });

            const pdfBlob = doc.output("blob");
            const reader = new FileReader();
            reader.readAsDataURL(pdfBlob);
            reader.onloadend = () => {
                const base64data = reader.result as string;
                const fileName = `vehicle-classification-${Date.now()}.pdf`;
                savePDFToArchive("Vehicle History", "Admin Export", "export", base64data, { fileName });
                toast({ title: "Export Successful", description: `Saved to File Manager as ${fileName}` });
            };
        } catch (error) {
            console.error("PDF export failed:", error);
            toast({ title: "Export Failed", description: "Could not generate PDF.", variant: "destructive" });
        }
    };

    const getClassificationColor = (classif: string) => {
        switch (classif) {
            case "Compact/Sedan": return "text-emerald-400";
            case "Mid-Size/SUV": return "text-blue-400";
            case "Truck/Van/Large SUV": return "text-amber-400";
            case "Luxury/High-End": return "text-purple-400";
            default: return "text-zinc-400";
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="Vehicle Classification" />
            <div className="p-4 max-w-5xl mx-auto space-y-6">

                {/* Step 1: Select Make */}
                {step === 1 && (
                    <Card className="p-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-blue-500/10 rounded-full border border-blue-500/20">
                                <Car className="w-8 h-8 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Select Vehicle Make</h2>
                                <p className="text-zinc-400 text-sm">Step 1 of 3: Identify the manufacturer</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="relative">
                                <label className="text-xs text-zinc-500 uppercase font-bold mb-2 block">Search Manufacturer</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                    <Input
                                        placeholder="Type to search (e.g. Ford, Toyota)..."
                                        value={makeSearchQuery}
                                        onChange={(e) => setMakeSearchQuery(e.target.value)}
                                        className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-blue-500 focus:ring-blue-500/20 py-6"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-zinc-500 uppercase font-bold mb-2 block">Browse All Makes</label>
                                <Select value={selectedMake} onValueChange={handleMakeSelect}>
                                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200 py-6">
                                        <SelectValue placeholder="Choose a vehicle make..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-h-[300px]">
                                        {filteredMakes.length === 0 ? (
                                            <div className="p-4 text-center text-zinc-500">No makes found</div>
                                        ) : (
                                            filteredMakes.map((make) => (
                                                <SelectItem key={make} value={make} className="text-zinc-200 focus:bg-zinc-800 cursor-pointer">
                                                    {make}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
                                <p className="text-sm text-zinc-500">
                                    <span className="text-zinc-300 font-mono">{allMakes.length}</span> makes available in database
                                </p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Classification History - Only show on Step 1 */}
                {step === 1 && history.length > 0 && (
                    <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
                        <div className="p-6 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <History className="w-5 h-5 text-purple-400" />
                                <h3 className="text-lg font-bold text-zinc-200">Recent Classifications</h3>
                            </div>
                            <Button onClick={handleExportPDF} variant="outline" size="sm" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                                <FileDown className="mr-2 h-4 w-4" /> Export PDF
                            </Button>
                        </div>

                        <Accordion type="single" collapsible className="w-full">
                            {history.slice(0, 10).map((item) => (
                                <AccordionItem key={item.id} value={item.id} className="border-b border-zinc-800 last:border-0">
                                    <AccordionTrigger className="px-6 hover:no-underline hover:bg-zinc-800/50 transition-colors py-4">
                                        <div className="flex items-center justify-between w-full pr-4">
                                            <span className="font-semibold text-zinc-200">{item.make} {item.model}</span>
                                            <span className={`text-sm font-medium ${getClassificationColor(item.category)}`}>
                                                {item.category}
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-6 pb-6 bg-zinc-900/30">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                            <div className="p-4 rounded bg-zinc-950 border border-zinc-800 space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500">Make</span>
                                                    <span className="text-zinc-300">{item.make}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500">Model</span>
                                                    <span className="text-zinc-300">{item.model}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500">Class</span>
                                                    <span className={getClassificationColor(item.category)}>{item.category}</span>
                                                </div>
                                            </div>
                                            <div className="p-4 rounded bg-zinc-950 border border-zinc-800 space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500">Customer</span>
                                                    <span className="text-zinc-300">{item.customer?.name || '—'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500">Date</span>
                                                    <span className="text-zinc-300">{new Date(item.timestamp).toLocaleDateString()}</span>
                                                </div>
                                                <div className="pt-2 flex gap-2">
                                                    <Button size="sm" variant="ghost" className="h-8 flex-1 text-zinc-400 hover:text-white" onClick={() => handleEdit(item)}>
                                                        <Edit className="h-3 w-3 mr-1" /> Edit
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="h-8 flex-1 text-red-500 hover:text-red-400 hover:bg-red-950" onClick={() => handleDelete(item.id)}>
                                                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                        {history.length > 10 && (
                            <div className="p-3 text-center text-xs text-zinc-600 bg-zinc-950 border-t border-zinc-800">
                                Showing recent 10 of {history.length} records
                            </div>
                        )}
                    </Card>
                )}

                {/* Step 2: Select Model */}
                {step === 2 && (
                    <Card className="p-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-blue-500/10 rounded-full border border-blue-500/20">
                                <Car className="w-8 h-8 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Select Vehicle Model</h2>
                                <p className="text-zinc-400 text-sm">Step 2 of 3: Identify the specific model</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-between">
                                <div className="text-sm text-zinc-400">Selected Make</div>
                                <div className="text-xl font-bold text-white">{selectedMake}</div>
                            </div>

                            <div>
                                <label className="text-xs text-zinc-500 uppercase font-bold mb-2 block">Choose Model</label>
                                <Select value={selectedModel} onValueChange={handleModelSelect}>
                                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200 py-6">
                                        <SelectValue placeholder="Choose a model..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-h-[300px]">
                                        {availableModels.length === 0 ? (
                                            <div className="p-4 text-center text-zinc-500">No models found</div>
                                        ) : (
                                            availableModels.map((model) => (
                                                <SelectItem key={model} value={model} className="text-zinc-200 focus:bg-zinc-800 cursor-pointer">
                                                    {model}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    onClick={() => setStep(1)}
                                    className="text-zinc-400 hover:text-white pl-0"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Make Selection
                                </Button>
                                <div className="text-sm text-zinc-500">
                                    {availableModels.length} models found
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Step 3: Result & Confirmation */}
                {step === 3 && (
                    <Card className="p-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Review & Confirm</h2>
                                <p className="text-zinc-400 text-sm">Step 3 of 3: Verify classification and save</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Vehicle Selected</div>
                                        <div className="text-3xl font-bold text-white">
                                            {selectedMake} <span className="text-zinc-400 font-light">{selectedModel}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-zinc-500 uppercase font-bold mb-1">System Classification</div>
                                        <div className={`text-3xl font-bold ${getClassificationColor(category)}`}>
                                            {category}
                                        </div>
                                    </div>
                                </div>

                                {category === "Manual Classification Required" && (
                                    <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                                        <div className="text-sm text-amber-200">
                                            <strong>Action Required:</strong> This vehicle was not found in our database. Please manually select the correct classification below before confirming.
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Customer Field (Optional) */}
                            <div>
                                <label className="text-xs text-zinc-500 uppercase font-bold mb-2 block">Link to Customer (Optional)</label>
                                <Select value={selectedCustomerId || "none"} onValueChange={(val) => setSelectedCustomerId(val === "none" ? "" : val)}>
                                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200 py-6">
                                        <SelectValue placeholder="Associate with a customer..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 h-[300px]">
                                        <SelectItem value="none" className="text-zinc-400 italic">No Customer Link</SelectItem>
                                        {customers.map(c => (
                                            <SelectItem key={c.id} value={c.id} className="text-zinc-200">
                                                {c.name} <span className="text-zinc-500 ml-2 text-xs">{c.email}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Button
                                    onClick={handleConfirm}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg font-bold shadow-lg shadow-emerald-900/20"
                                >
                                    <CheckCircle2 className="mr-2 h-5 w-5" /> Confirm & Save
                                </Button>
                                <Button
                                    onClick={() => setOverrideModalOpen(true)}
                                    variant="outline"
                                    className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-12"
                                >
                                    Override Classification
                                </Button>
                            </div>

                            <div className="text-center">
                                <Button
                                    variant="ghost"
                                    onClick={() => setStep(2)}
                                    className="text-zinc-500 hover:text-white"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Model Selection
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Step 4: Saved Confirmation */}
                {step === 4 && (
                    <Card className="p-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl text-center py-16">
                        <div className="mb-6 inline-flex items-center justify-center p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 animate-in zoom-in-50 duration-300">
                            <CheckCircle2 className="w-16 h-16 text-emerald-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Classification Saved</h2>
                        <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                            The vehicle has been successfully classified and stored in your history database.
                        </p>

                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 max-w-lg mx-auto p-6 mb-8 text-left">
                            <div className="flex justify-between border-b border-zinc-800 pb-2 mb-2">
                                <span className="text-zinc-500">Vehicle</span>
                                <span className="text-zinc-200 font-bold">{selectedMake} {selectedModel}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-800 pb-2 mb-2">
                                <span className="text-zinc-500">Class</span>
                                <span className={`font-bold ${getClassificationColor(category)}`}>{category}</span>
                            </div>
                            {selectedCustomerId && (
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500">Customer</span>
                                    <span className="text-zinc-200">{customers.find(c => c.id === selectedCustomerId)?.name}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                onClick={handleReset}
                                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]"
                            >
                                Classify Another Vehicle
                            </Button>
                            <Button
                                onClick={() => window.location.href = "/dashboard"}
                                variant="outline"
                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 min-w-[200px]"
                            >
                                Return to Dashboard
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Override Classification Modal */}
                <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
                    <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
                        <DialogHeader>
                            <DialogTitle>Manual Classification</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 pt-2">
                            <p className="text-sm text-zinc-400 mb-4">
                                Select the correct size category for the <strong>{selectedMake} {selectedModel}</strong>:
                            </p>
                            {CLASSIFICATION_OPTIONS.map((option) => (
                                <Button
                                    key={option}
                                    onClick={() => handleOverride(option)}
                                    variant="outline"
                                    className={`w-full justify-between border-zinc-800 hover:bg-zinc-900 h-14 ${category === option ? 'bg-zinc-900 border-emerald-500 ring-1 ring-emerald-500' : 'bg-zinc-900/50'}`}
                                >
                                    <span className={`font-semibold ${getClassificationColor(option)}`}>{option}</span>
                                    {category === option && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                </Button>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
