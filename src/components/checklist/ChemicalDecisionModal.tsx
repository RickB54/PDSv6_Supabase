
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Sparkles, Beaker, XCircle, Droplets, ArrowRight } from "lucide-react";
import { Chemical } from "@/types/chemicals";
import { getChemicals } from "@/lib/chemicals";
import {
    VehicleCondition,
    ContaminationType,
    ConditionDefinitions,
    findProductForContamination,
    getRecommendedCategory
} from "@/lib/chemical-decision";

interface ChemicalDecisionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ChemicalDecisionModal({ open, onOpenChange }: ChemicalDecisionModalProps) {
    const [chemicals, setChemicals] = useState<Chemical[]>([]);
    const [loading, setLoading] = useState(true);

    // Decision State
    const [condition, setCondition] = useState<VehicleCondition | "">("");
    const [contamination, setContamination] = useState<ContaminationType | "">("");
    const [selectedProduct, setSelectedProduct] = useState<Chemical | null>(null);

    // Setup List tracking
    const [setupList, setSetupList] = useState<{ chem: Chemical, dilution: string }[]>([]);

    useEffect(() => {
        if (open) {
            (async () => {
                const list = await getChemicals();
                setChemicals(list);
                setLoading(false);
            })();
        }
    }, [open]);

    const matches = contamination ? findProductForContamination(contamination as ContaminationType, chemicals) : [];
    const recommendedCategory = contamination ? getRecommendedCategory(contamination as ContaminationType) : "";

    const addToSetup = (chem: Chemical) => {
        setSetupList(prev => [...prev, {
            chem,
            dilution: chem.dilution_ratios?.[0]?.ratio || "RTU"
        }]);
        setContamination("");
        setSelectedProduct(null);
    };

    const reset = () => {
        setCondition("");
        setContamination("");
        setSelectedProduct(null);
        setSetupList([]);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800 text-white">
                <DialogHeader>
                    <div className="flex justify-between items-center">
                        <DialogTitle className="text-xl font-black flex items-center gap-2">
                            <Beaker className="text-blue-500" /> Chemical Decision Assistant
                        </DialogTitle>
                        {setupList.length > 0 && <Button variant="ghost" size="sm" onClick={reset} className="text-red-400">Reset All</Button>}
                    </div>
                    <DialogDescription>
                        Determine the right chemical and dilution for the vehicle's condition.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid md:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-6">
                        {/* 1. Condition */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">1. Vehicle Condition</label>
                            <Select value={condition} onValueChange={(v) => setCondition(v as VehicleCondition)}>
                                <SelectTrigger className="bg-black border-slate-700 h-10">
                                    <SelectValue placeholder="Select Severity..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    {(Object.keys(ConditionDefinitions) as VehicleCondition[]).map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {condition && (
                                <div className="text-xs text-slate-400 bg-slate-900/50 p-2 rounded border border-slate-800">
                                    <span className="font-bold text-slate-300">Visual:</span> {ConditionDefinitions[condition].visual}
                                </div>
                            )}
                        </div>

                        {/* 2. Contamination */}
                        {condition && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">2. Identify Contamination</label>
                                <Select value={contamination} onValueChange={(v) => { setContamination(v as ContaminationType); setSelectedProduct(null); }}>
                                    <SelectTrigger className="bg-black border-slate-700 h-10">
                                        <SelectValue placeholder="What are you removing?" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        {Object.values(ContaminationType).map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* 3. Recommendation */}
                        {contamination && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <div className="bg-blue-900/10 border border-blue-500/20 p-3 rounded-lg mb-4">
                                    <span className="text-xs uppercase font-bold text-blue-400 block mb-1">System Recommends</span>
                                    <span className="text-lg font-bold text-white">{recommendedCategory}</span>
                                </div>

                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                    {matches.length > 0 ? matches.map(chem => (
                                        <div
                                            key={chem.id}
                                            className="p-3 rounded-lg border border-slate-800 bg-black hover:bg-slate-900 cursor-pointer transition-colors flex justify-between items-center group"
                                            onClick={() => addToSetup(chem)}
                                        >
                                            <div>
                                                <div className="font-bold text-white">{chem.name}</div>
                                                <div className="text-xs text-slate-500">{chem.dilution_ratios?.[0]?.ratio || "RTU"}</div>
                                            </div>
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full bg-slate-800 group-hover:bg-green-600 group-hover:text-white">
                                                <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )) : (
                                        <div className="text-center p-4 border border-dashed border-slate-800 rounded text-slate-500 text-sm">
                                            No explicit inventory match found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Setup Checklist */}
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <Droplets className="w-4 h-4 text-purple-400" /> Prepared Chemicals
                        </h3>

                        {setupList.length === 0 ? (
                            <div className="text-center py-10 text-slate-600 text-sm">
                                Use the tool to identify and select chemicals to build your prep list.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {setupList.map((item, idx) => (
                                    <div key={idx} className="bg-black border border-slate-800 p-3 rounded-lg flex justify-between items-center animate-in fade-in">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.chem.theme_color || '#fff' }} />
                                            <div>
                                                <div className="font-bold text-sm text-white">{item.chem.name}</div>
                                                <div className="text-xs text-slate-400">Mix: <span className="text-green-400 font-mono">{item.dilution}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="mt-6 pt-4 border-t border-slate-800">
                                    <Button className="w-full bg-green-600 hover:bg-green-700 font-bold" onClick={onOpenChange.bind(null, false)}>
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Ready to Work
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
