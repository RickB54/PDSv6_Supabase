import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle, ArrowLeft, Car, Plus, Search, HelpCircle, Save } from "lucide-react";
import vehicleDatabase from "@/data/vehicle_db.json";
import { normalizeVehicleType } from "@/lib/pricingHelpers";
import { getSupabaseCustomers, Customer, upsertSupabaseVehicle } from "@/lib/supa-data";
import { useToast } from "@/hooks/use-toast";

// Shared types
type ClassificationType = "Compact/Sedan (Small cars and sedans)" | "Mid-Size/SUV (Mid-size cars and SUVs)" | "Truck/Van/Large SUV (Trucks, vans, large SUVs)" | "Luxury/High-End (Luxury and premium vehicles)";
type VehicleDB = Record<string, Record<string, string>>;

const CLASSIFICATION_OPTIONS: { label: string; value: string }[] = [
    { label: "Compact/Sedan (Small cars and sedans)", value: "Compact/Sedan" },
    { label: "Mid-Size/SUV (Mid-size cars and SUVs)", value: "Mid-Size/SUV" },
    { label: "Truck/Van/Large SUV (Trucks, vans, large SUVs)", value: "Truck/Van/Large SUV" },
    { label: "Luxury/High-End (Luxury and premium vehicles)", value: "Luxury/High-End" }
];

interface VehicleSelectorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (data: { make: string; model: string; category: string; customerId?: string }) => void;
    initialCustomerId?: string;
}

export default function VehicleSelectorModal({ open, onOpenChange, onSelect, initialCustomerId }: VehicleSelectorModalProps) {
    const { toast } = useToast();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedMake, setSelectedMake] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [category, setCategory] = useState<string>("");
    const [makeSearchQuery, setMakeSearchQuery] = useState("");
    const [isCustomModel, setIsCustomModel] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || "");
    const [overrideModalOpen, setOverrideModalOpen] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setStep(1);
            setSelectedMake("");
            setSelectedModel("");
            setCategory("");
            setMakeSearchQuery("");
            setIsCustomModel(false);
            setSelectedCustomerId(initialCustomerId || "");
            loadCustomers();
        }
    }, [open, initialCustomerId]);

    const loadCustomers = async () => {
        try {
            const list = await getSupabaseCustomers();
            setCustomers(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("Failed to load customers:", err);
        }
    };

    // Use stock vehicle database directly
    const safeDB = useMemo((): VehicleDB => {
        return (vehicleDatabase as VehicleDB) || {};
    }, []);

    // Get all makes
    const allMakes = useMemo(() => {
        try {
            return Object.keys(safeDB).sort();
        } catch { return []; }
    }, [safeDB]);

    // Filter makes based on search
    const filteredMakes = useMemo(() => {
        if (!makeSearchQuery || !makeSearchQuery.trim()) return allMakes;
        const q = makeSearchQuery.toLowerCase().trim();
        return allMakes.filter(m => m.toLowerCase().includes(q));
    }, [allMakes, makeSearchQuery]);

    // Get models for selected make
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
        if (!model) return;
        setSelectedModel(model);

        // Classification Logic
        let autoCategory = "Mid-Size/SUV (Mid-size cars and SUVs)"; // Default
        try {
            // 1. Check JSON DB (now includes custom vehicles)
            if (selectedMake && safeDB[selectedMake]) {
                const value = safeDB[selectedMake][model];
                if (value) {
                    if (value === "Compact") autoCategory = "Compact/Sedan (Small cars and sedans)";
                    else if (value.includes("Midsize")) autoCategory = "Mid-Size/SUV (Mid-size cars and SUVs)";
                    else if (value.includes("SUV")) autoCategory = "Mid-Size/SUV (Mid-size cars and SUVs)";
                    else if (value.includes("Truck")) autoCategory = "Truck/Van/Large SUV (Trucks, vans, large SUVs)";
                    else if (value.includes("Oversized")) autoCategory = "Luxury/High-End (Luxury and premium vehicles)";
                    // Direct match for already-saved custom classifications
                    else if (value.includes("Compact/Sedan")) autoCategory = "Compact/Sedan";
                    else if (value.includes("Mid-Size/SUV")) autoCategory = "Mid-Size/SUV";
                    else if (value.includes("Truck/Van/Large SUV")) autoCategory = "Truck/Van/Large SUV";
                    else if (value.includes("Luxury/High-End")) autoCategory = "Luxury/High-End";
                }
            }

            // 2. Check Pricing Helpers/Overrides
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

    const handleConfirm = async () => {
        // DO NOT save to Supabase here - only pass data back to the modal
        // The actual save happens when the customer profile is saved
        console.log('🔍 VehicleSelector: Confirming vehicle classification');
        console.log('  Make:', selectedMake);
        console.log('  Model:', selectedModel);
        console.log('  Category:', category);
        console.log('  Selected Customer ID:', selectedCustomerId);
        console.log('  Initial Customer ID:', initialCustomerId);

        // Return the classification to the parent modal
        onSelect({
            make: selectedMake,
            model: selectedModel,
            category: category,
            customerId: selectedCustomerId || initialCustomerId
        });

        onOpenChange(false);
        toast({
            title: "Vehicle Classified",
            description: `${selectedMake} ${selectedModel} will be saved when you save the prospect.`
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
            <DialogContent className="max-w-2xl bg-[#0a0a0a] border-zinc-900 border-2 text-white p-0 overflow-hidden shadow-2xl">
                {/* Step 1: Select Make */}
                {step === 1 && (
                    <div className="flex flex-col h-full">
                        <div className="p-8 border-b border-zinc-900 bg-zinc-950/50">
                            <DialogHeader>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                        <Car className="w-8 h-8 text-blue-500" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-3xl font-black uppercase tracking-tight text-white">Select Vehicle Make</DialogTitle>
                                        <DialogDescription className="text-zinc-500 font-medium">Step 1 of 3: Identify the manufacturer</DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1 block">Quick Search</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-4 h-5 w-5 text-zinc-500" />
                                    <Input
                                        placeholder="Type make name (e.g. Ford, BMW)..."
                                        value={makeSearchQuery}
                                        onChange={(e) => setMakeSearchQuery(e.target.value)}
                                        className="pl-12 bg-zinc-900 border-zinc-800 text-zinc-200 py-7 text-lg focus:border-blue-500 focus:ring-blue-500/10"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredMakes.map(make => (
                                    <Button
                                        key={make}
                                        variant="outline"
                                        onClick={() => handleMakeSelect(make)}
                                        className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-white justify-start py-6 text-base font-semibold transition-all hover:scale-[1.02]"
                                    >
                                        {make}
                                    </Button>
                                ))}
                                {filteredMakes.length === 0 && (
                                    <Button
                                        onClick={() => handleMakeSelect(makeSearchQuery)}
                                        className="col-span-full py-8 bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20 text-lg font-bold border-2 border-dashed"
                                    >
                                        Use "{makeSearchQuery}" as Custom Make
                                    </Button>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="p-6 bg-zinc-950/50 border-t border-zinc-900 flex justify-center items-center">
                            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                                <HelpCircle className="w-3 h-3" />
                                Select a manufacturer to proceed to models
                            </p>
                        </DialogFooter>
                    </div>
                )}

                {/* Step 2: Select Model */}
                {step === 2 && (
                    <div className="flex flex-col h-full">
                        <div className="p-8 border-b border-zinc-900 bg-zinc-950/50">
                            <DialogHeader>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                        <Car className="w-8 h-8 text-blue-500" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-3xl font-black uppercase tracking-tight text-white">Select Vehicle Model</DialogTitle>
                                        <DialogDescription className="text-zinc-500 font-medium">Step 2 of 3: Identify the specific model</DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="p-5 bg-zinc-900/50 rounded-2xl border border-zinc-800 flex items-center justify-between shadow-inner">
                                <div className="text-xs text-zinc-500 uppercase font-black tracking-widest">Selected Make</div>
                                <div className="text-2xl font-black text-white uppercase tracking-tighter">{selectedMake}</div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block">Choose Model</label>
                                {isCustomModel ? (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <Input
                                            placeholder="Type model name (e.g. Venza, Escalade)..."
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="bg-zinc-900 border-zinc-800 text-zinc-200 py-7 text-lg"
                                            autoFocus
                                        />
                                        <Button
                                            onClick={() => handleModelSelect(selectedModel)}
                                            disabled={!selectedModel}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 py-7 text-lg font-black uppercase tracking-tight shadow-lg shadow-emerald-900/20"
                                        >
                                            Confirm Custom Model
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => { setIsCustomModel(false); setSelectedModel(""); }}
                                            className="w-full text-zinc-500 font-bold uppercase text-xs"
                                        >
                                            Back to Selection List
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <Select value={selectedModel} onValueChange={handleModelSelect}>
                                            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200 py-8 text-lg font-bold px-6">
                                                <SelectValue placeholder="Choose a model..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-h-[300px]">
                                                {availableModels.length === 0 ? (
                                                    <div className="p-4 text-center text-zinc-600">No models found for {selectedMake}</div>
                                                ) : (
                                                    availableModels.map((model) => (
                                                        <SelectItem key={model} value={model} className="text-zinc-200 focus:bg-zinc-800 cursor-pointer py-3">
                                                            <div className="flex justify-between w-full items-center gap-8">
                                                                <span className="font-bold">{model}</span>
                                                                <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">{safeDB[selectedMake][model]}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>

                                        <div className="text-center pt-2">
                                            <button
                                                onClick={() => setIsCustomModel(true)}
                                                className="text-blue-500 hover:text-blue-400 font-black uppercase text-xs tracking-widest underline underline-offset-4 decoration-blue-500/30"
                                            >
                                                Model not listed? Type it manually
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="p-6 bg-zinc-950/50 border-t border-zinc-900 flex justify-between items-center sm:justify-between w-full gap-4">
                            <Button
                                variant="ghost"
                                onClick={() => setStep(1)}
                                className="text-zinc-500 hover:text-white p-0 h-auto font-bold uppercase text-xs tracking-widest"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Make Selection
                            </Button>
                            <span className="text-[10px] text-zinc-700 font-black uppercase tracking-widest">
                                {availableModels.length} models found
                            </span>
                        </DialogFooter>
                    </div>
                )}

                {/* Step 3: Review & Confirm */}
                {step === 3 && (
                    <div className="flex flex-col h-full">
                        <div className="p-8 border-b border-zinc-900 bg-zinc-950/50">
                            <DialogHeader>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-3xl font-black uppercase tracking-tight text-white">Review & Confirm</DialogTitle>
                                        <DialogDescription className="text-zinc-500 font-medium">Step 3 of 3: Verify classification and save</DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="p-8 bg-zinc-900 rounded-2xl border-2 border-zinc-800 relative overflow-hidden group shadow-2xl">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                    <div className="space-y-1">
                                        <div className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-1">Vehicle Selected</div>
                                        <div className="text-3xl font-black text-white leading-tight">
                                            {selectedMake} <span className="text-zinc-500 font-light tracking-tighter">{selectedModel}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-1">System Classification</div>
                                        <div className={`text-2xl font-black uppercase tracking-tighter leading-tight ${getClassificationColor(category)}`}>
                                            {category}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block px-1">Link to Customer (Optional)</label>
                                <Select value={selectedCustomerId || "none"} onValueChange={(val) => setSelectedCustomerId(val === "none" ? "" : val)}>
                                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200 py-7 text-base font-bold px-6">
                                        <SelectValue placeholder="Associate with a customer..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-h-[250px] shadow-2xl">
                                        <SelectItem value="none" className="text-zinc-500 italic p-3">No Customer Link</SelectItem>
                                        {customers.map(c => (
                                            <SelectItem key={c.id} value={c.id || "none"} className="text-zinc-200 p-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{c.name}</span>
                                                    <span className="text-[10px] text-zinc-500">{c.email}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                <Button
                                    onClick={handleConfirm}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-[70px] text-xl font-black uppercase tracking-tight shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                                >
                                    <CheckCircle2 className="w-6 h-6" /> Confirm & Save
                                </Button>
                                <Button
                                    onClick={() => setOverrideModalOpen(true)}
                                    variant="outline"
                                    className="border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white h-[70px] text-sm font-black uppercase tracking-widest active:scale-[0.98] transition-all"
                                >
                                    Override Classification
                                </Button>
                            </div>
                        </div>

                        <DialogFooter className="p-6 bg-zinc-950/50 border-t border-zinc-900">
                            <Button
                                variant="ghost"
                                onClick={() => setStep(2)}
                                className="text-zinc-600 hover:text-white p-0 h-auto font-black uppercase text-[10px] tracking-widest w-full"
                            >
                                <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Back to Model Selection
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>

            {/* Override Classification Modal */}
            <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
                <DialogContent className="max-w-md bg-zinc-950 border-zinc-900 text-white p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight mb-2">Override Classification</DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            Select the correct size for the <strong>{selectedMake} {selectedModel}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-3 py-6">
                        {CLASSIFICATION_OPTIONS.map((option) => (
                            <Button
                                key={option.value}
                                onClick={() => {
                                    setCategory(option.value);
                                    setOverrideModalOpen(false);
                                    toast({ title: "Classification Updated", description: `Size set to: ${option.label}` });
                                }}
                                variant="outline"
                                className={`justify-start h-auto py-5 px-6 border-zinc-800 hover:bg-zinc-800 text-left transition-all ${category === option.value ? 'bg-zinc-900 border-primary shadow-[0_0_10px_rgba(var(--primary),0.2)]' : ''}`}
                            >
                                <div className="flex flex-col">
                                    <span className={`text-base font-black uppercase tracking-tight ${category === option.value ? getClassificationColor(option.value) : 'text-zinc-300'}`}>
                                        {option.label.split('(')[0].trim()}
                                    </span>
                                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                                        {option.label.match(/\((.*?)\)/)?.[1] || ''}
                                    </span>
                                </div>
                            </Button>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setOverrideModalOpen(false)} className="w-full bg-zinc-900 border border-zinc-800 font-bold uppercase text-xs tracking-widest py-6">
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
