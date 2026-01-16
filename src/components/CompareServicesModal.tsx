import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Minus, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ServiceStep {
    id: string;
    name: string;
    category?: 'exterior' | 'interior' | 'final';
}

interface Package {
    id: string;
    name: string;
    description: string;
    steps: ServiceStep[];
}

interface CompareServicesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    allPackages: Package[];
    initialPackageId: string;
    onSelect: (pkgId: string) => void;
}

export const CompareServicesModal: React.FC<CompareServicesModalProps> = ({
    open,
    onOpenChange,
    allPackages,
    initialPackageId,
    onSelect
}) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        if (open) {
            setSelectedIds([initialPackageId]);
        }
    }, [open, initialPackageId]);

    const togglePackage = (id: string) => {
        if (id === initialPackageId) return; // Cannot uncheck initial
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectedPackages = allPackages.filter(p => selectedIds.includes(p.id));

    // Dynamically aggregate all unique steps from the selected packages
    const allPossibleStepsMap = new Map<string, ServiceStep>();
    selectedPackages.forEach(pkg => {
        (pkg.steps || []).forEach(step => {
            if (!allPossibleStepsMap.has(step.name)) {
                allPossibleStepsMap.set(step.name, step);
            }
        });
    });

    // Sort steps by category: exterior -> interior -> final
    const categoryOrder = { 'exterior': 0, 'interior': 1, 'final': 2 };
    const sortedSteps = Array.from(allPossibleStepsMap.values()).sort((a, b) => {
        const catA = a.category || 'final';
        const catB = b.category || 'final';
        if (catA !== catB) {
            return (categoryOrder[catA] ?? 3) - (categoryOrder[catB] ?? 3);
        }
        return a.name.localeCompare(b.name);
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl w-[95vw] h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-white border-zinc-200">
                <DialogHeader className="p-6 border-b border-zinc-100 flex-shrink-0">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <DialogTitle className="text-3xl font-black text-blue-900 uppercase tracking-tight">
                                Compare Detailing Packages
                            </DialogTitle>
                            <p className="text-zinc-500 text-sm">Review specific services included in each package side-by-side.</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-6 space-y-8">
                    {/* Selector */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Select Services to Compare</h4>
                        <div className="flex flex-wrap gap-4">
                            {allPackages.map(pkg => (
                                <div
                                    key={pkg.id}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all cursor-pointer
                    ${selectedIds.includes(pkg.id) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-blue-400'}
                  `}
                                    onClick={() => togglePackage(pkg.id)}
                                >
                                    <Checkbox
                                        checked={selectedIds.includes(pkg.id)}
                                        className={`border-zinc-300 pointer-events-none ${selectedIds.includes(pkg.id) ? 'border-white text-white' : ''}`}
                                        disabled={pkg.id === initialPackageId}
                                    />
                                    <span className="text-sm font-bold uppercase tracking-tight leading-none">{pkg.name.replace(' (BEST VALUE)', '')}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-xl border border-zinc-100 shadow-sm relative">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50">
                                    <th className="p-4 border-b border-zinc-100 w-72 bg-zinc-50 sticky left-0 z-20">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Service Feature / Step</span>
                                    </th>
                                    {selectedPackages.map(pkg => (
                                        <th key={pkg.id} className="p-4 border-b border-zinc-100 min-w-[200px]">
                                            <div className="space-y-1 text-center">
                                                <span className="text-sm font-black text-blue-900 uppercase tracking-tighter block leading-tight">{pkg.name.replace(' (BEST VALUE)', '')}</span>
                                                {pkg.id === initialPackageId && (
                                                    <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-[9px] font-black text-blue-700 uppercase rounded">Current Viewing</span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {sortedSteps.map(stepMeta => (
                                    <tr key={stepMeta.name} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="p-4 text-zinc-700 text-xs bg-white sticky left-0 z-10 backdrop-blur-sm border-r border-zinc-50 leading-snug">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold">{stepMeta.name}</span>
                                                <span className="text-[9px] uppercase tracking-widest font-black text-zinc-400">{stepMeta.category || 'General'}</span>
                                            </div>
                                        </td>
                                        {selectedPackages.map(pkg => {
                                            const included = (pkg.steps || []).some(s => s.name === stepMeta.name);
                                            return (
                                                <td key={pkg.id} className="p-4 text-center">
                                                    {included ? (
                                                        <div className="bg-emerald-50 text-emerald-600 w-7 h-7 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/5">
                                                            <Check className="w-4 h-4 font-black stroke-[3]" />
                                                        </div>
                                                    ) : (
                                                        <Minus className="w-4 h-4 text-zinc-200 mx-auto" />
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-zinc-50 border-t border-zinc-200 flex justify-between items-center flex-shrink-0">
                    <Button variant="ghost" className="text-zinc-500 font-bold uppercase tracking-widest text-xs" onClick={() => onOpenChange(false)}>
                        <X className="w-4 h-4 mr-2" /> Return to Packages
                    </Button>
                    <Button
                        className="bg-blue-700 hover:bg-blue-800 text-white font-black uppercase tracking-widest px-8 shadow-xl h-12"
                        onClick={() => {
                            onSelect(initialPackageId);
                            onOpenChange(false);
                        }}
                    >
                        Select Current Service
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
