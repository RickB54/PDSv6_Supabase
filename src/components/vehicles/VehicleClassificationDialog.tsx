import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Search, ArrowLeft, CheckCircle2, AlertCircle, HelpCircle, X } from "lucide-react";
import vehicleDatabase from "@/data/vehicle_db.json";
import { normalizeVehicleType } from "@/lib/pricingHelpers";
import { useToast } from "@/hooks/use-toast";

interface VehicleClassificationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (category: string, details?: { make: string, model: string }) => void;
}

type VehicleDB = Record<string, Record<string, string>>;

export function VehicleClassificationDialog({ open, onOpenChange, onSelect }: VehicleClassificationDialogProps) {
    const { toast } = useToast();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedMake, setSelectedMake] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [category, setCategory] = useState<string>("");
    const [makeSearchQuery, setMakeSearchQuery] = useState("");
    const [isCustomModel, setIsCustomModel] = useState(false);

    // Reset state when opening
    useEffect(() => {
        if (open) {
            setStep(1);
            setSelectedMake("");
            setSelectedModel("");
            setCategory("");
            setMakeSearchQuery("");
            setIsCustomModel(false);
        }
    }, [open]);

    // Safely access vehicle database
    const safeDB = useMemo((): VehicleDB => {
        if (!vehicleDatabase || typeof vehicleDatabase !== 'object') return {};
        return vehicleDatabase as VehicleDB;
    }, []);

    const allMakes = useMemo(() => {
        try {
            return Object.keys(safeDB).sort();
        } catch { return []; }
    }, [safeDB]);

    const filteredMakes = useMemo(() => {
        if (!makeSearchQuery) return allMakes;
        const q = makeSearchQuery.toLowerCase().trim();
        return allMakes.filter(m => m.toLowerCase().includes(q));
    }, [allMakes, makeSearchQuery]);

    const availableModels = useMemo(() => {
        if (!selectedMake) return [];
        try {
            return Object.keys(safeDB[selectedMake] || {}).sort();
        } catch { return []; }
    }, [selectedMake, safeDB]);

    const handleMakeSelect = (make: string) => {
        setSelectedMake(make);
        setStep(2);
    };

    const handleModelSelect = (model: string) => {
        setSelectedModel(model);

        // Standardized mapping logic
        let autoCategory = "Mid-Size/SUV"; // Default

        try {
            // 1. JSON DB Check
            if (selectedMake && safeDB[selectedMake]) {
                const value = safeDB[selectedMake][model];
                if (value) {
                    if (value === "Compact" || value.includes("Compact")) autoCategory = "Compact/Sedan";
                    else if (value.includes("Midsize")) autoCategory = "Mid-Size/SUV";
                    else if (value.includes("SUV")) autoCategory = "Mid-Size/SUV";
                    else if (value.includes("Truck")) autoCategory = "Truck/Van/Large SUV";
                    else if (value.includes("Oversized")) autoCategory = "Luxury/High-End";
                }
            }

            // 2. Pricing Engine Robust Overrides
            const pricingType = normalizeVehicleType(`${selectedMake} ${model}`);
            if (pricingType === 'truck') autoCategory = "Truck/Van/Large SUV";
            if (pricingType === 'luxury') autoCategory = "Luxury/High-End";
            if (pricingType === 'midsize') autoCategory = "Mid-Size/SUV";
            if (pricingType === 'compact') autoCategory = "Compact/Sedan";
        } catch (e) {
            console.error("Classification error:", e);
        }

        setCategory(autoCategory);
        setStep(3);
    };

    const handleConfirm = () => {
        // Map descriptive category back to simple key for pricing engine
        let simpleKey = "midsize"; // Fallback
        const lower = category.toLowerCase();

        if (lower.includes("compact")) simpleKey = "compact";
        else if (lower.includes("truck") || lower.includes("large suv")) simpleKey = "truck";
        else if (lower.includes("luxury")) simpleKey = "luxury";
        else simpleKey = "midsize";

        onSelect(simpleKey, { make: selectedMake, model: selectedModel });
        onOpenChange(false);
        toast({
            title: "Vehicle Set",
            description: `Size set to: ${category}`
        });
    };

    const getClassificationColor = (c: string) => {
        const lower = c.toLowerCase();
        if (lower.includes("compact")) return "text-emerald-400";
        if (lower.includes("mid-size") || lower.includes("midsize")) return "text-blue-400";
        if (lower.includes("truck") || lower.includes("large suv")) return "text-amber-400";
        if (lower.includes("luxury")) return "text-purple-400";
        return "text-zinc-200";
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl bg-zinc-950 border-zinc-800 text-white p-0 overflow-hidden">
                <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-white">
                            <Car className="w-5 h-5 text-primary" />
                            Vehicle Classification Tool
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Identify your vehicle size for accurate detailing pricing.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="relative">
                                <label className="text-xs text-zinc-500 uppercase font-black mb-2 block">1. Search Manufacturer</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                    <Input
                                        placeholder="e.g. Ford, Toyota, Honda..."
                                        value={makeSearchQuery}
                                        onChange={(e) => setMakeSearchQuery(e.target.value)}
                                        className="pl-9 pr-10 bg-zinc-900 border-zinc-800 py-6"
                                        autoFocus
                                    />
                                    {makeSearchQuery && (
                                        <button 
                                            onClick={() => setMakeSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {filteredMakes.slice(0, 12).map(make => (
                                    <Button
                                        key={make}
                                        variant="outline"
                                        onClick={() => handleMakeSelect(make)}
                                        className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-white justify-start"
                                    >
                                        {make}
                                    </Button>
                                ))}
                                {filteredMakes.length === 0 && (
                                    <Button
                                        onClick={() => handleMakeSelect(makeSearchQuery)}
                                        className="col-span-full py-6 bg-primary/20 border-primary/40 text-primary hover:bg-primary/30"
                                    >
                                        Use "{makeSearchQuery}" as Make
                                    </Button>
                                )}
                            </div>
                            {filteredMakes.length > 12 && (
                                <p className="text-center text-[10px] text-zinc-600 uppercase font-bold">Keep typing to narrow down {filteredMakes.length} results</p>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <Button variant="ghost" onClick={() => setStep(1)} className="p-0 h-auto text-zinc-500 hover:text-white mb-2">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Makes
                            </Button>

                            <div>
                                <label className="text-xs text-zinc-500 uppercase font-black mb-2 block">2. Select {selectedMake} Model</label>
                                {isCustomModel ? (
                                    <div className="space-y-3">
                                        <Input
                                            placeholder="Type model name..."
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="bg-zinc-900 border-zinc-800 py-6"
                                        />
                                        <Button onClick={() => handleModelSelect(selectedModel)} className="w-full bg-primary py-6 font-bold">Confirm Model</Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {availableModels.map(model => (
                                            <Button
                                                key={model}
                                                variant="outline"
                                                onClick={() => handleModelSelect(model)}
                                                className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-white justify-between px-4 py-3 h-auto"
                                            >
                                                <span>{model}</span>
                                            </Button>
                                        ))}
                                        <Button
                                            variant="ghost"
                                            onClick={() => setIsCustomModel(true)}
                                            className="col-span-full text-primary hover:bg-primary/5 text-xs font-bold uppercase mt-4"
                                        >
                                            Model not listed? Type manually
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 py-4">
                            <div className="text-center">
                                <div className="mb-4 inline-flex p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Vehicle Identified</h3>
                                <p className="text-zinc-500 text-sm mt-1">Recommended size for {selectedMake} {selectedModel}</p>
                            </div>

                            <div className="p-8 bg-zinc-900 rounded-2xl border-2 border-primary/20 flex flex-col items-center justify-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="text-xs text-zinc-500 font-black uppercase tracking-widest mb-2 relative z-10">Calculated Size</span>
                                <span className={`text-2xl md:text-3xl font-black uppercase tracking-tighter text-center relative z-10 ${getClassificationColor(category)}`}>
                                    {category}
                                </span>
                            </div>

                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 py-6 border-zinc-800 text-zinc-400 hover:bg-zinc-900">
                                    Change Model
                                </Button>
                                <Button onClick={handleConfirm} className="flex-1 py-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-tight shadow-lg shadow-emerald-900/20">
                                    Set This Size
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex items-center justify-center gap-2">
                    <AlertCircle className="w-3 h-3 text-zinc-600" />
                    <span className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Powered by Prime Auto Detail Intelligent Classification Database</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
