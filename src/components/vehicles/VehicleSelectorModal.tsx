import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ArrowLeft, Car, Plus, Search, HelpCircle, Save, X } from "lucide-react";
import vehicleDatabase from "@/data/vehicle_db.json";
import { normalizeVehicleType } from "@/lib/pricingHelpers";
import { getSupabaseCustomers, Customer } from "@/lib/supa-data";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    const [step, setStep] = useState<1 | 2>(1);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Selection state
    const [selectedMake, setSelectedMake] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [category, setCategory] = useState<string>("");
    
    // Level 1 state
    const [selectedLevel1Make, setSelectedLevel1Make] = useState<string | null>(null);

    // Custom Vehicle state
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customMake, setCustomMake] = useState("");
    const [customModel, setCustomModel] = useState("");

    // Customer linking
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || "");

    useEffect(() => {
        if (open) {
            setStep(1);
            setSearchQuery("");
            setSelectedMake("");
            setSelectedModel("");
            setCategory("");
            setSelectedLevel1Make(null);
            setIsCustomMode(false);
            setCustomMake("");
            setCustomModel("");
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

    const safeDB = useMemo((): VehicleDB => {
        return (vehicleDatabase as VehicleDB) || {};
    }, []);

    // Flatten the database for bidirectional searching
    const flattenedVehicles = useMemo(() => {
        const flat: { make: string; model: string; category: string; searchString: string }[] = [];
        for (const [make, models] of Object.entries(safeDB)) {
            for (const [model, category] of Object.entries(models)) {
                flat.push({
                    make,
                    model,
                    category,
                    searchString: `${make} ${model}`.toLowerCase()
                });
            }
        }
        return flat.sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model));
    }, [safeDB]);

    // Group makes with model counts
    const makesWithCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const v of flattenedVehicles) {
            counts[v.make] = (counts[v.make] || 0) + 1;
        }
        return Object.entries(counts)
            .map(([make, count]) => ({ make, count }))
            .sort((a, b) => a.make.localeCompare(b.make));
    }, [flattenedVehicles]);

    // Apply fuzzy search
    const filteredVehicles = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) {
            return [];
        }
        const terms = q.split(/\s+/);
        return flattenedVehicles.filter(v => {
            return terms.every(term => v.searchString.includes(term));
        }).slice(0, 50);
    }, [flattenedVehicles, searchQuery]);

    const autoClassify = (make: string, model: string, knownCategory?: string) => {
        let autoCategory = "Mid-Size/SUV"; // Default fallback
        try {
            // 1. Check Pricing Helpers/Overrides FIRST for strict brand/model mapping
            const pricingType = normalizeVehicleType(`${make} ${model}`);
            if (pricingType) {
                if (pricingType === 'truck') return "Truck/Van/Large SUV";
                if (pricingType === 'luxury') return "Luxury/High-End";
                if (pricingType === 'midsize') return "Mid-Size/SUV";
                if (pricingType === 'compact') return "Compact/Sedan";
            }

            // 2. Fallback to direct match from JSON DB
            if (knownCategory) {
                const k = knownCategory.toLowerCase();
                if (k === 'compact/sedan') autoCategory = "Compact/Sedan";
                else if (k === 'truck/van/large suv') autoCategory = "Truck/Van/Large SUV";
                else if (k === 'mid-size/suv') autoCategory = "Mid-Size/SUV";
                else if (k === 'luxury/high-end') autoCategory = "Luxury/High-End";
                else if (k.includes('compact') || k.includes('sedan')) autoCategory = "Compact/Sedan";
                else if (k.includes('truck') || k.includes('van') || k.includes('large')) autoCategory = "Truck/Van/Large SUV";
                else if (k.includes('midsize') || k.includes('suv') || k.includes('crossover')) autoCategory = "Mid-Size/SUV";
                else if (k.includes('luxury') || k.includes('exotic') || k.includes('oversized')) autoCategory = "Luxury/High-End";
            }
        } catch (e) {
            console.error("Classification error:", e);
        }
        return autoCategory;
    };

    const handleSelectVehicle = (make: string, model: string, knownCategory?: string) => {
        setSelectedMake(make);
        setSelectedModel(model);
        setCategory(autoClassify(make, model, knownCategory));
        setStep(2);
    };

    const handleConfirm = () => {
        onSelect({
            make: selectedMake,
            model: selectedModel,
            category: category,
            customerId: selectedCustomerId && selectedCustomerId !== "none" ? selectedCustomerId : undefined
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-[#0a0a0b] border-purple-500/30 text-white overflow-hidden p-0">
                <div className="flex flex-col h-[80vh] sm:h-auto sm:max-h-[85vh]">
                    {/* Header */}
                    <div className="p-6 pb-2 border-b border-white/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                                {step === 1 ? "Search Vehicle Classification" : "Confirm Vehicle Classification"}
                            </DialogTitle>
                            <DialogDescription className="text-gray-400">
                                {step === 1 ? "Search by make, model, or both." : "Assign a pricing category for this vehicle."}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 overflow-y-auto p-6 pt-4">
                        {step === 1 && (
                            <div className="space-y-4">
                                {!isCustomMode ? (
                                    <>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <Input
                                                placeholder="e.g. Ford F-150, Honda Civic..."
                                                value={searchQuery}
                                                onChange={(e) => {
                                                    setSearchQuery(e.target.value);
                                                    if (e.target.value.trim().length > 0) {
                                                        setSelectedLevel1Make(null);
                                                    }
                                                }}
                                                className="bg-black/50 border-purple-500/20 pl-10 pr-10 focus:border-purple-500 text-lg py-6"
                                                autoFocus
                                            />
                                            {searchQuery && (
                                                <button 
                                                    onClick={() => {
                                                        setSearchQuery('');
                                                        setSelectedLevel1Make(null);
                                                    }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>

                                        {!searchQuery.trim() && !selectedLevel1Make ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                                                {makesWithCounts
                                                    .filter(m => !searchQuery.trim() || m.make.toLowerCase().includes(searchQuery.toLowerCase().trim()))
                                                    .map(({ make, count }) => (
                                                    <button
                                                        key={make}
                                                        onClick={() => setSelectedLevel1Make(make)}
                                                        className="flex flex-col p-3 text-left rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all group"
                                                    >
                                                        <span className="font-bold text-white group-hover:text-purple-400 transition-colors">{make}</span>
                                                        <span className="text-[10px] text-gray-500 uppercase font-black mt-0.5">{count} Models</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-4 mt-4">
                                                {!searchQuery.trim() && selectedLevel1Make && (
                                                    <Button 
                                                        variant="ghost" 
                                                        onClick={() => setSelectedLevel1Make(null)}
                                                        className="text-gray-400 hover:text-white -ml-2 h-8"
                                                    >
                                                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Makes
                                                    </Button>
                                                )}
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {(searchQuery.trim() ? filteredVehicles : flattenedVehicles.filter(v => v.make === selectedLevel1Make)).map((v, i) => (
                                                        <button
                                                            key={`${v.make}-${v.model}-${i}`}
                                                            onClick={() => handleSelectVehicle(v.make, v.model, v.category)}
                                                            className="flex flex-col p-3 text-left rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all group"
                                                        >
                                                            <span className="font-bold text-white group-hover:text-purple-400 transition-colors">{v.make} {v.model}</span>
                                                            <span className="text-[10px] text-gray-500 uppercase font-black mt-0.5">{v.category}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {searchQuery.trim() && filteredVehicles.length === 0 && (
                                                    <div className="text-center py-8 text-gray-500">
                                                        No exact matches found for "{searchQuery}".
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-white/10 flex justify-center">
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsCustomMode(true)}
                                                className="bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 w-full"
                                            >
                                                <Plus className="w-4 h-4 mr-2" /> Add Custom Vehicle
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-4 bg-purple-500/5 p-4 rounded-xl border border-purple-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Button variant="ghost" size="icon" onClick={() => setIsCustomMode(false)} className="h-8 w-8 -ml-2 hover:bg-transparent text-gray-400 hover:text-white">
                                                <ArrowLeft className="h-4 w-4" />
                                            </Button>
                                            <h3 className="text-sm font-bold text-white">Custom Vehicle Entry</h3>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-purple-300 uppercase">Make / Brand</label>
                                            <Input
                                                placeholder="e.g. Rivian"
                                                value={customMake}
                                                onChange={(e) => setCustomMake(e.target.value)}
                                                className="bg-black/50 border-purple-500/30"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-purple-300 uppercase">Model</label>
                                            <Input
                                                placeholder="e.g. R1T"
                                                value={customModel}
                                                onChange={(e) => setCustomModel(e.target.value)}
                                                className="bg-black/50 border-purple-500/30"
                                            />
                                        </div>
                                        <Button 
                                            className="w-full bg-purple-600 hover:bg-purple-500 mt-2"
                                            onClick={() => handleSelectVehicle(customMake, customModel)}
                                            disabled={!customMake.trim() || !customModel.trim()}
                                        >
                                            Continue
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 2 && (
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
                                                onClick={() => setCategory(opt.value)}
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
                                    <label className="text-sm font-medium text-gray-300">Link to Customer Profile (Optional)</label>
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
                    {step === 2 && (
                        <div className="p-6 bg-white/5 border-t border-white/10 flex gap-3">
                            <Button 
                                variant="outline" 
                                onClick={() => setStep(1)}
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
