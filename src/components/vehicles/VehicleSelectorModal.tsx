import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle, ArrowLeft, Car } from "lucide-react";
import vehicleDatabase from "@/data/vehicle_db.json";

// Shared types (could be extracted to a types file, but defined here for self-containment)
type ClassificationType = "Compact" | "Midsize / Sedan" | "SUV / Crossover" | "Truck / Oversized" | "Oversized Specialty";
type VehicleDB = Record<string, Record<string, string>>;

const CLASSIFICATION_OPTIONS: ClassificationType[] = [
    "Compact",
    "Midsize / Sedan",
    "SUV / Crossover",
    "Truck / Oversized",
    "Oversized Specialty"
];

interface VehicleSelectorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (data: { make: string; model: string; category: string }) => void;
}

export default function VehicleSelectorModal({ open, onOpenChange, onSelect }: VehicleSelectorModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedMake, setSelectedMake] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [makeSearchQuery, setMakeSearchQuery] = useState("");

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setStep(1);
            setSelectedMake("");
            setSelectedModel("");
            setMakeSearchQuery("");
        }
    }, [open]);

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

        // Determine category
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

        // Return selection to parent
        onSelect({
            make: selectedMake,
            model: model,
            category: autoCategory
        });

        // Close modal
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Car className="w-5 h-5 text-blue-500" />
                        Select Vehicle
                    </DialogTitle>
                    <DialogDescription>
                        {step === 1 ? "Search and select a vehicle make." : `Select a model for ${selectedMake}.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Search Make</label>
                                <Input
                                    placeholder="Type to search makes..."
                                    value={makeSearchQuery}
                                    onChange={(e) => setMakeSearchQuery(e.target.value)}
                                    className="bg-zinc-900 border-zinc-800 text-white mb-4"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Available Makes</label>
                                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {filteredMakes.length === 0 ? (
                                        <div className="col-span-2 text-center text-zinc-500 py-4">No makes found</div>
                                    ) : (
                                        filteredMakes.map((make) => (
                                            <Button
                                                key={make}
                                                variant="outline"
                                                onClick={() => handleMakeSelect(make)}
                                                className="justify-start bg-zinc-900 text-zinc-100 border-zinc-800 hover:bg-zinc-800 hover:text-white h-auto py-2 px-3 text-left"
                                            >
                                                {make}
                                            </Button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Select Model</label>
                                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {availableModels.length === 0 ? (
                                        <div className="text-center text-zinc-500 py-4">No models found for {selectedMake}</div>
                                    ) : (
                                        availableModels.map((model) => (
                                            <Button
                                                key={model}
                                                variant="outline"
                                                onClick={() => handleModelSelect(model)}
                                                className="justify-between bg-zinc-900 text-zinc-100 border-zinc-800 hover:bg-zinc-800 hover:text-white h-auto py-3 px-4 group"
                                            >
                                                <span>{model}</span>
                                                <span className="text-xs text-zinc-500 group-hover:text-zinc-400">
                                                    {safeDB[selectedMake]?.[model] || "Unknown Class"}
                                                </span>
                                            </Button>
                                        ))
                                    )}
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                onClick={() => setStep(1)}
                                className="w-full text-zinc-400 hover:text-white mt-2"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Make Selection
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
