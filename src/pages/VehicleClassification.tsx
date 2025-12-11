import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, AlertCircle, ArrowLeft, Car, Edit, Trash2, History, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import vehicleDatabase from "@/data/vehicle_db.json";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { getCustomers } from "@/lib/db";

type ClassificationType = "Compact" | "Midsize / Sedan" | "SUV / Crossover" | "Truck / Oversized" | "Oversized Specialty";

const CLASSIFICATION_OPTIONS: ClassificationType[] = [
    "Compact",
    "Midsize / Sedan",
    "SUV / Crossover",
    "Truck / Oversized",
    "Oversized Specialty"
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
            const custs = await getCustomers<Customer>();
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
            if (selectedMake && safeDB[selectedMake]) {
                const makeData = safeDB[selectedMake];
                if (makeData && typeof makeData === 'object' && model in makeData) {
                    const value = makeData[model];
                    if (value && typeof value === 'string') {
                        autoCategory = value;
                    }
                }
            }
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
            case "Compact": return "text-green-500";
            case "Midsize / Sedan": return "text-blue-500";
            case "SUV / Crossover": return "text-purple-500";
            case "Truck / Oversized": return "text-orange-500";
            case "Oversized Specialty": return "text-red-500";
            default: return "text-yellow-500";
        }
    };

    return (
        <div>
            <PageHeader title="Vehicle Classification" />
            <div className="p-4 max-w-4xl mx-auto">

                {/* Step 1: Select Make */}
                {step === 1 && (
                    <Card className="p-8 bg-zinc-900 border-zinc-800">
                        <div className="flex items-center gap-3 mb-6">
                            <Car className="w-8 h-8 text-blue-500" />
                            <h2 className="text-2xl font-bold text-white">Step 1: Select Vehicle Make</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Search Make</label>
                                <Input
                                    placeholder="Type to search makes..."
                                    value={makeSearchQuery}
                                    onChange={(e) => setMakeSearchQuery(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white mb-4"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Select Make</label>
                                <Select value={selectedMake} onValueChange={handleMakeSelect}>
                                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                        <SelectValue placeholder="Choose a vehicle make..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-800 border-zinc-700 max-h-[300px]">
                                        {filteredMakes.length === 0 ? (
                                            <div className="p-4 text-center text-zinc-500">No makes found</div>
                                        ) : (
                                            filteredMakes.map((make) => (
                                                <SelectItem key={make} value={make} className="text-white">
                                                    {make}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="text-sm text-zinc-500 mt-4">
                                {allMakes.length} makes available in database
                            </div>
                        </div>
                    </Card>
                )}

                {/* Classification History - Only show on Step 1 */}
                {step === 1 && history.length > 0 && (
                    <Card className="p-6 bg-zinc-900 border-zinc-800 mt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <History className="w-6 h-6 text-purple-500" />
                                <h3 className="text-xl font-bold text-white">Classification History</h3>
                                <span className="text-sm text-zinc-500">({history.length} {history.length === 1 ? 'vehicle' : 'vehicles'})</span>
                            </div>
                            <Button onClick={handleExportPDF} className="bg-purple-600 hover:bg-purple-700 text-white">
                                <FileDown className="mr-2 h-4 w-4" /> Save PDF
                            </Button>
                        </div>

                        <Accordion type="single" collapsible className="space-y-2">
                            {history.map((item) => (
                                <AccordionItem key={item.id} value={item.id} className="border border-zinc-800 rounded-lg bg-zinc-800/50">
                                    <AccordionTrigger className="px-4 hover:no-underline hover:bg-zinc-800/80">
                                        <div className="flex items-center justify-between w-full pr-4">
                                            <div className="flex items-center gap-3">
                                                <Car className="w-5 h-5 text-blue-400" />
                                                <span className="font-semibold text-white">{item.make} {item.model}</span>
                                            </div>
                                            <div className={`text-sm font-medium ${getClassificationColor(item.category)}`}>
                                                {item.category}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <div className="space-y-3 pt-2">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <div className="text-zinc-500">Make</div>
                                                    <div className="text-white font-medium">{item.make}</div>
                                                </div>
                                                <div>
                                                    <div className="text-zinc-500">Model</div>
                                                    <div className="text-white font-medium">{item.model}</div>
                                                </div>
                                                <div>
                                                    <div className="text-zinc-500">Classification</div>
                                                    <div className={`font-medium ${getClassificationColor(item.category)}`}>
                                                        {item.category}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-zinc-500">Date</div>
                                                    <div className="text-white font-medium">
                                                        {new Date(item.timestamp).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                {item.customer?.name && (
                                                    <div className="col-span-2">
                                                        <div className="text-zinc-500">Customer</div>
                                                        <div className="text-white font-medium">{item.customer.name}</div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2 pt-2 border-t border-zinc-700">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEdit(item)}
                                                    className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                                                >
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDelete(item.id)}
                                                    className="flex-1 border-red-700 text-red-500 hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </Card>
                )}

                {/* Step 2: Select Model */}
                {step === 2 && (
                    <Card className="p-8 bg-zinc-900 border-zinc-800">
                        <div className="flex items-center gap-3 mb-6">
                            <Car className="w-8 h-8 text-blue-500" />
                            <h2 className="text-2xl font-bold text-white">Step 2: Select Vehicle Model</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                                <div className="text-sm text-zinc-400">Selected Make</div>
                                <div className="text-xl font-semibold text-white">{selectedMake}</div>
                            </div>

                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Select Model</label>
                                <Select value={selectedModel} onValueChange={handleModelSelect}>
                                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                        <SelectValue placeholder="Choose a model..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-800 border-zinc-700 max-h-[300px]">
                                        {availableModels.length === 0 ? (
                                            <div className="p-4 text-center text-zinc-500">No models found</div>
                                        ) : (
                                            availableModels.map((model) => (
                                                <SelectItem key={model} value={model} className="text-white">
                                                    {model}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="text-sm text-zinc-500 mt-4">
                                {availableModels.length} models available for {selectedMake}
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => setStep(1)}
                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Make Selection
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Step 3: Result & Confirmation */}
                {step === 3 && (
                    <Card className="p-8 bg-zinc-900 border-zinc-800">
                        <div className="flex items-center gap-3 mb-6">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                            <h2 className="text-2xl font-bold text-white">Step 3: Classification Result</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-zinc-800 p-6 rounded-lg border border-zinc-700">
                                <div className="text-sm text-zinc-400 mb-2">Vehicle Selected</div>
                                <div className="text-2xl font-bold text-white mb-4">
                                    {selectedMake} {selectedModel}
                                </div>

                                <div className="border-t border-zinc-700 pt-4 mt-4">
                                    <div className="text-sm text-zinc-400 mb-2">System Classification</div>
                                    <div className={`text-3xl font-bold ${getClassificationColor(category)}`}>
                                        {category}
                                    </div>
                                </div>

                                {category === "Manual Classification Required" && (
                                    <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg flex items-start gap-2">
                                        <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                                        <div className="text-sm text-yellow-200">
                                            This vehicle was not found in our database. Please select a classification manually.
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Customer Field (Optional) */}
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Link to Customer (Optional)</label>
                                <Select value={selectedCustomerId || "none"} onValueChange={(val) => setSelectedCustomerId(val === "none" ? "" : val)}>
                                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                        <SelectValue placeholder="Select a customer (optional)..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-800 border-zinc-700">
                                        <SelectItem value="none" className="text-white">None</SelectItem>
                                        {customers.map(c => (
                                            <SelectItem key={c.id} value={c.id} className="text-white">
                                                {c.name}{c.email ? ` (${c.email})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedCustomerId && (
                                    <div className="mt-2 text-xs text-zinc-500">
                                        This classification will be linked to the selected customer
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    onClick={handleConfirm}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Classification
                                </Button>
                                <Button
                                    onClick={() => setOverrideModalOpen(true)}
                                    variant="outline"
                                    className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                >
                                    Override Classification
                                </Button>
                            </div>

                            <Button
                                variant="ghost"
                                onClick={() => setStep(2)}
                                className="text-zinc-400 hover:text-white"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Model Selection
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Step 4: Saved Confirmation */}
                {step === 4 && (
                    <Card className="p-8 bg-zinc-900 border-zinc-800">
                        <div className="flex items-center gap-3 mb-6">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                            <h2 className="text-2xl font-bold text-white">Vehicle Classification Saved</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-green-900/20 border border-green-700 p-6 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <div className="text-sm text-zinc-400">Make</div>
                                        <div className="text-lg font-semibold text-white">{selectedMake}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-zinc-400">Model</div>
                                        <div className="text-lg font-semibold text-white">{selectedModel}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-zinc-400">Classification</div>
                                        <div className={`text-lg font-semibold ${getClassificationColor(category)}`}>
                                            {category}
                                        </div>
                                    </div>
                                </div>
                                {selectedCustomerId && (
                                    <div className="mt-4 pt-4 border-t border-green-700">
                                        <div className="text-sm text-zinc-400">Linked Customer</div>
                                        <div className="text-lg font-semibold text-white">
                                            {customers.find(c => c.id === selectedCustomerId)?.name || ""}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                                <div className="text-sm text-zinc-400 mb-2">Storage Location</div>
                                <div className="text-white font-mono text-sm">localStorage: vehicle_classification_history</div>
                            </div>

                            <div className="text-xs text-zinc-500 italic p-3 bg-zinc-800/50 rounded border border-zinc-700">
                                Future: Auto-send classification to Package Pricing module.
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    onClick={handleReset}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Classify Another Vehicle
                                </Button>
                                <Button
                                    onClick={() => window.location.href = "/dashboard"}
                                    variant="outline"
                                    className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                >
                                    Back to Client Intake Tools
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Override Classification Modal */}
                <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                        <DialogHeader>
                            <DialogTitle>Manual Classification Override</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                            <p className="text-sm text-zinc-400">
                                Select the correct classification for {selectedMake} {selectedModel}:
                            </p>
                            {CLASSIFICATION_OPTIONS.map((option) => (
                                <Button
                                    key={option}
                                    onClick={() => handleOverride(option)}
                                    variant="outline"
                                    className={`w-full justify-start border-zinc-700 hover:bg-zinc-800 ${category === option ? 'bg-zinc-800 border-blue-500' : ''}`}
                                >
                                    <span className={getClassificationColor(option)}>{option}</span>
                                </Button>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
