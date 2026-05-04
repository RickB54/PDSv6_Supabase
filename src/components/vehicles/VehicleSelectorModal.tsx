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
type ClassificationType = "Compact/Sedan" | "Mid-Size/SUV" | "Truck/Van/Large SUV" | "Luxury/High-End";
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
        let autoCategory = "Mid-Size/SUV"; // Default
        try {
            // 1. Check JSON DB (now includes custom vehicles)
            if (selectedMake && safeDB[selectedMake]) {
                const value = safeDB[selectedMake][model];
                if (value) {
                    if (value === "Compact" || value.includes("Compact")) autoCategory = "Compact/Sedan";
                    else if (value.includes("Midsize")) autoCategory = "Mid-Size/SUV";
                    else if (value.includes("SUV")) autoCategory = "Mid-Size/SUV";
                    else if (value.includes("Truck")) autoCategory = "Truck/Van/Large SUV";
                    else if (value.includes("Oversized")) autoCategory = "Luxury/High-End";
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

        // Return the classification to the parent modal
        onSelect({
            make: selectedMake,
            model: selectedModel,
            category: category,
            customerId: selectedCustomerId || initialCustomerId
        });
        
        onOpenChange(false);
    };

    const handleManualSelect = (val: string) => {
        setCategory(val);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-[#0a0a0b] border-purple-500/30 text-white overflow-hidden p-0">
                <div className="flex flex-col h-[80vh] sm:h-auto sm:max-h-[85vh]">
                    {/* Header */}
                    <div className="p-6 pb-2 border-b border-white/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                                {step === 1 ? "Select Vehicle Make" : 
                                 step === 2 ? `Select ${selectedMake} Model` : 
                                 "Classify Vehicle"}
                            </DialogTitle>
                            <DialogDescription className="text-gray-400">
                                {step === 1 ? "Find the vehicle manufacturer to begin." : 
                                 step === 2 ? `Choose the specific model for your ${selectedMake}.` : 
                                 "Assign a pricing category for this vehicle."}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 overflow-y-auto p-6 pt-4">
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <Input
                                        placeholder="Search makes (e.g. Ford, Toyota)..."
                                        value={makeSearchQuery}
                                        onChange={(e) => setMakeSearchQuery(e.target.value)}
                                        className="bg-black/50 border-purple-500/20 pl-10 focus:border-purple-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {filteredMakes.map((make) => (
                                        <button
                                            key={make}
                                            onClick={() => handleMakeSelect(make)}
                                            className="p-3 text-sm text-left rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all group"
                                        >
                                            <span className="group-hover:text-purple-400 font-medium">{make}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <Button 
                                    variant="ghost" 
                                    onClick={() => setStep(1)}
                                    className="text-gray-400 hover:text-white -ml-2"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Makes
                                </Button>
                                
                                {!isCustomModel ? (
                                    <>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {availableModels.map((model) => (
                                                <button
                                                    key={model}
                                                    onClick={() => handleModelSelect(model)}
                                                    className="p-3 text-sm text-left rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all group"
                                                >
                                                    <span className="group-hover:text-purple-400">{model}</span>
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setIsCustomModel(true)}
                                                className="p-3 text-sm text-left rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" /> Custom Model
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-4 bg-purple-500/5 p-4 rounded-xl border border-purple-500/20">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-purple-300">Custom Model Name</label>
                                            <Input
                                                placeholder="Enter model name..."
                                                value={selectedModel}
                                                onChange={(e) => setSelectedModel(e.target.value)}
                                                className="bg-black/50 border-purple-500/30"
                                            />
                                        </div>
                                        <Button 
                                            className="w-full bg-purple-600 hover:bg-purple-500"
                                            onClick={() => handleModelSelect(selectedModel)}
                                            disabled={!selectedModel.trim()}
                                        >
                                            Continue
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            className="w-full text-xs text-gray-500"
                                            onClick={() => setIsCustomModel(false)}
                                        >
                                            Cancel Custom Entry
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                                        <Car className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-purple-300 font-medium uppercase tracking-wider">Selected Vehicle</div>
                                        <div className="text-lg font-bold text-white">{selectedMake} {selectedModel}</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-300">Pricing Category</label>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <HelpCircle className="w-4 h-4 text-gray-500" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Select the category that best matches this vehicle for pricing.
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    
                                    <div className="grid gap-2">
                                        {CLASSIFICATION_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => handleManualSelect(opt.value)}
                                                className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                                                    category === opt.value 
                                                        ? "bg-purple-500/20 border-purple-500 text-white ring-1 ring-purple-500/50" 
                                                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20"
                                                }`}
                                            >
                                                <span className="font-medium">{opt.label}</span>
                                                {category === opt.value && <CheckCircle2 className="w-5 h-5 text-purple-400" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <label className="text-sm font-medium text-gray-300">Link to Customer (Optional)</label>
                                    <Select 
                                        value={selectedCustomerId} 
                                        onValueChange={setSelectedCustomerId}
                                    >
                                        <SelectTrigger className="bg-black/50 border-white/10">
                                            <SelectValue placeholder="Select a customer to link..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#0a0a0b] border-white/10 text-white">
                                            <SelectItem value="none">No Link (One-time Classification)</SelectItem>
                                            {customers.map(c => (
                                                <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {step === 3 && (
                        <div className="p-6 bg-white/5 border-t border-white/10 flex gap-3">
                            <Button 
                                variant="outline" 
                                onClick={() => setStep(2)}
                                className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5"
                            >
                                Back
                            </Button>
                            <Button 
                                onClick={handleConfirm}
                                className="flex-[2] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 shadow-lg shadow-purple-500/20"
                            >
                                <Save className="w-4 h-4 mr-2" /> Confirm Classification
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
