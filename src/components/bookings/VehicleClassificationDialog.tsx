import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Car, Search, ArrowLeft, CheckCircle2 } from "lucide-react";
import vehicleDatabase from "@/data/vehicle_db.json";
import { normalizeVehicleType } from "@/lib/pricingHelpers";

type VehicleClassificationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (data: { make: string; model: string; category: string }) => void;
};

type VehicleDB = Record<string, Record<string, string>>;

export default function VehicleClassificationDialog({ open, onOpenChange, onSelect }: VehicleClassificationDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedMake, setSelectedMake] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [makeSearchQuery, setMakeSearchQuery] = useState("");
  const [isCustomModel, setIsCustomModel] = useState(false);

  const safeDB = useMemo(() => vehicleDatabase as VehicleDB, []);
  const allMakes = useMemo(() => Object.keys(safeDB).sort(), [safeDB]);
  const filteredMakes = useMemo(() => {
    const q = makeSearchQuery.toLowerCase().trim();
    if (!q) return allMakes;
    return allMakes.filter(m => m.toLowerCase().includes(q));
  }, [allMakes, makeSearchQuery]);

  const availableModels = useMemo(() => {
    if (!selectedMake || !safeDB[selectedMake]) return [];
    return Object.keys(safeDB[selectedMake]).sort();
  }, [selectedMake, safeDB]);

  const handleMakeSelect = (make: string) => {
    setSelectedMake(make);
    setStep(2);
  };

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
    
    let autoCategory = "Mid-Size/SUV";
    const makeData = safeDB[selectedMake];
    if (makeData && model in makeData) {
      const val = makeData[model];
      if (val.includes("Compact")) autoCategory = "Compact/Sedan";
      else if (val.includes("Truck") || val.includes("Van") || val.includes("Large")) autoCategory = "Truck/Van/Large SUV";
      else if (val.includes("Luxury")) autoCategory = "Luxury/High-End";
    }

    const pricingType = normalizeVehicleType(`${selectedMake} ${model}`);
    if (pricingType === 'truck') autoCategory = "Truck/Van/Large SUV";
    if (pricingType === 'luxury') autoCategory = "Luxury/High-End";
    if (pricingType === 'compact') autoCategory = "Compact/Sedan";
    
    setCategory(autoCategory);
    setStep(3);
  };

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedMake("");
      setSelectedModel("");
      setMakeSearchQuery("");
      setIsCustomModel(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#0c1220] border-zinc-800 text-white p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 border-b border-zinc-800/50 bg-zinc-900/30">
          <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-widest text-blue-400">
            <Car className="w-6 h-6" /> Vehicle Selection
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="relative">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2 block">Quick Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input 
                    placeholder="Search makes (e.g. Ford, BMW)..." 
                    value={makeSearchQuery}
                    onChange={(e) => setMakeSearchQuery(e.target.value)}
                    className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredMakes.map(make => (
                  <Button 
                    key={make} 
                    variant="outline" 
                    onClick={() => handleMakeSelect(make)}
                    className="justify-start bg-zinc-900/50 border-zinc-800 hover:bg-blue-600 hover:text-white transition-all text-xs"
                  >
                    {make}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <Button variant="ghost" onClick={() => setStep(1)} className="text-zinc-500 hover:text-white p-0 h-auto">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Makes
              </Button>
              
              <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Selected Make</div>
                <div className="text-xl font-bold text-white uppercase">{selectedMake}</div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Select Model</label>
                {isCustomModel ? (
                  <div className="space-y-2">
                    <Input 
                      placeholder="Type model name..." 
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="bg-zinc-950 border-zinc-800"
                    />
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 font-bold"
                      onClick={() => handleModelSelect(selectedModel)}
                      disabled={!selectedModel}
                    >
                      Continue
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {availableModels.map(model => (
                      <Button 
                        key={model} 
                        variant="outline" 
                        onClick={() => handleModelSelect(model)}
                        className="bg-zinc-900/50 border-zinc-800 hover:bg-blue-600 hover:text-white text-xs"
                      >
                        {model}
                      </Button>
                    ))}
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsCustomModel(true)}
                      className="col-span-2 text-blue-400 hover:text-blue-300 text-xs mt-2"
                    >
                      Model not listed? Type manually
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 py-4 text-center">
              <div className="inline-flex p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Classification Ready</h3>
                <p className="text-zinc-500 text-sm">Review the identified class for your pricing engine</p>
              </div>

              <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-6 space-y-4 max-w-sm mx-auto shadow-xl">
                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-3">
                  <span className="text-zinc-500 text-xs font-bold uppercase">Vehicle</span>
                  <span className="text-white font-black">{selectedMake} {selectedModel}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-zinc-500 text-xs font-bold uppercase">Class</span>
                  <span className="text-blue-400 font-black text-lg">{category}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-zinc-800 text-zinc-400">
                  Change
                </Button>
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20"
                  onClick={() => onSelect({ make: selectedMake, model: selectedModel, category })}
                >
                  Apply Selection
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
