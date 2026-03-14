import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RotateCcw, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChecklistItem {
    id: string;
    label: string;
    sublabel?: string;
    hint?: string;
    section: string;
    subsection?: string;
}

const CHECKLIST_DATA: ChecklistItem[] = [
    // Section 1: Pre-Mixed Spray Bottles
    { id: 'apc-heavy', section: 'Pre-Mixed Spray Bottles', label: "Meguiar’s APC Heavy Pre-Wash Spray – 4:1", sublabel: "(4 parts water : 1 part APC)", hint: "For heavy road grime and bugs on very dirty exteriors" },
    { id: 'apc-light', section: 'Pre-Mixed Spray Bottles', label: "Meguiar’s APC Light Interior Spray – 10:1", sublabel: "(10 parts water : 1 part APC)", hint: "Safe for plastics, doors, and light stains inside" },
    { id: 'diablo', section: 'Pre-Mixed Spray Bottles', label: "Chemical Guys Diablo Wheel & Tire Spray – 3:1", sublabel: "(3 parts water : 1 part Diablo)", hint: "Agitate wheels/tires then rinse" },
    { id: 'dark-fury', section: 'Pre-Mixed Spray Bottles', label: "Superior Dark Fury Wheel Spray (backup) – 4:1", hint: "If Diablo runs low" },
    { id: 'carpet-bomber', section: 'Pre-Mixed Spray Bottles', label: "P&S Carpet Bomber Spray – 5:1", sublabel: "(5 parts water : 1 part Carpet Bomber)", hint: "Must be used AFTER Terminator on carpets & upholstery" },
    { id: 'terminator', section: 'Pre-Mixed Spray Bottles', label: "P&S Terminator Enzyme Spray – RTU", sublabel: "(straight / undiluted)", hint: "Step 1 of 2-part system – apply first directly to spots, stains, odors" },
    { id: 'total-interior', section: 'Pre-Mixed Spray Bottles', label: "Chemical Guys Total Interior Spray – RTU", hint: "All-in-one clean + protect for dash, vinyl, leather, plastics" },
    { id: 'amor-all', section: 'Pre-Mixed Spray Bottles', label: "Amor All Multi Purpose Cleaner Spray – 128:1", sublabel: "(1 oz per gallon water)", hint: "Light backup for interior plastics" },
    { id: 'quick-detailer', section: 'Pre-Mixed Spray Bottles', label: "Meguiar’s Quick Detailer Spray – RTU", hint: "Quick spot cleaning exterior or interior glass" },
    { id: 'invisible-glass', section: 'Pre-Mixed Spray Bottles', label: "Invisible Glass Spray – RTU", hint: "Streak-free windows & mirrors" },
    { id: 'spray-wax', section: 'Pre-Mixed Spray Bottles', label: "Superior Products Spray Wax – RTU", hint: "Final exterior shine & protection" },
    { id: 'wax-dry', section: 'Pre-Mixed Spray Bottles', label: "Turtle Wax Wax & Dry (backup shine) – RTU" },

    // Section 2: Grab Chemicals by Scenario
    // Exterior – Slightly Dirty
    { id: 'ext-slight-onr', section: 'Grab Chemicals by Scenario', subsection: 'Exterior – Slightly Dirty Vehicle (Basic Wash & Wax)', label: "ONR 1:256", sublabel: "(1 oz in 2-gal bucket)" },
    { id: 'ext-slight-qd', section: 'Grab Chemicals by Scenario', subsection: 'Exterior – Slightly Dirty Vehicle (Basic Wash & Wax)', label: "Meguiar’s Quick Detailer RTU" },
    { id: 'ext-slight-wax', section: 'Grab Chemicals by Scenario', subsection: 'Exterior – Slightly Dirty Vehicle (Basic Wash & Wax)', label: "Superior Products Spray Wax RTU", hint: "Add Invisible Glass RTU if windows dirty" },

    // Exterior – Very Dirty
    { id: 'ext-heavy-apc', section: 'Grab Chemicals by Scenario', subsection: 'Exterior – Very Dirty Vehicle (Heavy Wash & Wax)', label: "Meguiar’s APC Heavy 4:1" },
    { id: 'ext-heavy-onr', section: 'Grab Chemicals by Scenario', subsection: 'Exterior – Very Dirty Vehicle (Heavy Wash & Wax)', label: "ONR 1:256" },
    { id: 'ext-heavy-wheel', section: 'Grab Chemicals by Scenario', subsection: 'Exterior – Very Dirty Vehicle (Heavy Wash & Wax)', label: "Chemical Guys Diablo 3:1 (or Superior Dark Fury 4:1)" },
    { id: 'ext-heavy-qd', section: 'Grab Chemicals by Scenario', subsection: 'Exterior – Very Dirty Vehicle (Heavy Wash & Wax)', label: "Meguiar’s Quick Detailer RTU" },
    { id: 'ext-heavy-wax', section: 'Grab Chemicals by Scenario', subsection: 'Exterior – Very Dirty Vehicle (Heavy Wash & Wax)', label: "Superior Products Spray Wax RTU" },

    // Interior – Slightly Dirty
    { id: 'int-slight-total', section: 'Grab Chemicals by Scenario', subsection: 'Interior – Slightly Dirty Vehicle (Quick Interior Refresh)', label: "Chemical Guys Total Interior RTU" },
    { id: 'int-slight-qd', section: 'Grab Chemicals by Scenario', subsection: 'Interior – Slightly Dirty Vehicle (Quick Interior Refresh)', label: "Meguiar’s Quick Detailer RTU (or Invisible Glass RTU)" },

    // Interior – Very Dirty
    { id: 'int-heavy-term', section: 'Grab Chemicals by Scenario', subsection: 'Interior – Very Dirty Vehicle (Deep Interior Detail)', label: "P&S Terminator RTU", hint: "apply FIRST – 2-part system" },
    { id: 'int-heavy-carpet', section: 'Grab Chemicals by Scenario', subsection: 'Interior – Very Dirty Vehicle (Deep Interior Detail)', label: "P&S Carpet Bomber 5:1", hint: "apply SECOND after Terminator" },
    { id: 'int-heavy-apc', section: 'Grab Chemicals by Scenario', subsection: 'Interior – Very Dirty Vehicle (Deep Interior Detail)', label: "Meguiar’s APC Light 10:1 (or Amor All MPC)" },
    { id: 'int-heavy-total', section: 'Grab Chemicals by Scenario', subsection: 'Interior – Very Dirty Vehicle (Deep Interior Detail)', label: "Chemical Guys Total Interior RTU" },
    { id: 'int-heavy-invisible', section: 'Grab Chemicals by Scenario', subsection: 'Interior – Very Dirty Vehicle (Deep Interior Detail)', label: "Invisible Glass RTU", hint: "Always use Terminator + Carpet Bomber together for any rugs or upholstery – enzymes first, then cleaner" },
];

export function JobPrepChecklist() {
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const saved = localStorage.getItem('chemical-job-prep-checklist');
        if (saved) {
            try {
                setCheckedItems(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load checklist state", e);
            }
        }
    }, []);

    const toggleItem = (id: string, e?: React.MouseEvent) => {
        // Prevent event from triggering twice or bubbling
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        setCheckedItems(prev => {
            const newState = { ...prev, [id]: !prev[id] };
            localStorage.setItem('chemical-job-prep-checklist', JSON.stringify(newState));
            return newState;
        });
    };

    const resetChecklist = () => {
        setCheckedItems({});
        localStorage.removeItem('chemical-job-prep-checklist');
        toast.success("Checklist reset successfully");
    };

    const sections = Array.from(new Set(CHECKLIST_DATA.map(item => item.section)));

    return (
        <div className="flex flex-col h-full bg-zinc-950/50 rounded-2xl border border-zinc-800 overflow-hidden min-h-[600px]">
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-purple-400" />
                    <div>
                        <h2 className="text-xl font-bold text-white">Job Prep Checklist</h2>
                        <p className="text-xs text-zinc-500">Prime Auto Detail – Mobile Prep System</p>
                    </div>
                </div>
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); resetChecklist(); }}
                    className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10 border-zinc-800 h-9 relative z-10"
                >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Progress
                </Button>
            </div>

            <ScrollArea className="flex-1 p-6">
                <div className="space-y-12 pb-8">
                    {sections.map(section => (
                        <div key={section} className="space-y-6">
                            <h2 className="text-xl font-bold text-purple-400 border-b border-purple-900/50 pb-2">
                                {section}
                            </h2>
                            
                            {section === 'Pre-Mixed Spray Bottles' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {CHECKLIST_DATA.filter(i => i.section === section).map(item => (
                                        <div 
                                            key={item.id}
                                            className={cn(
                                                "flex items-start space-x-3 p-4 rounded-xl border transition-all cursor-pointer",
                                                checkedItems[item.id] 
                                                    ? "bg-purple-900/20 border-purple-500/50" 
                                                    : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                                            )}
                                            onClick={(e) => toggleItem(item.id, e)}
                                        >
                                            <div className="mt-1 pointer-events-none">
                                                <Checkbox 
                                                    checked={!!checkedItems[item.id]} 
                                                    onCheckedChange={() => {}} 
                                                    className="border-zinc-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <span 
                                                    className={cn(
                                                        "text-sm font-medium leading-none",
                                                        checkedItems[item.id] ? "text-purple-200 line-through opacity-70" : "text-zinc-200"
                                                    )}
                                                >
                                                    {item.label}
                                                </span>
                                                {item.sublabel && (
                                                    <p className="text-xs text-zinc-500">{item.sublabel}</p>
                                                )}
                                                {item.hint && (
                                                    <p className="text-xs italic text-zinc-400 mt-2 flex items-start gap-1">
                                                        <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                                        {item.hint}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {Array.from(new Set(CHECKLIST_DATA.filter(i => i.section === section).map(i => i.subsection))).map(subsection => (
                                        <div key={subsection} className="space-y-4">
                                            <h3 className="text-lg font-semibold text-zinc-300 pl-2 border-l-4 border-zinc-800">
                                                {subsection}
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {CHECKLIST_DATA.filter(i => i.subsection === subsection).map(item => (
                                                    <div 
                                                        key={item.id}
                                                        className={cn(
                                                            "flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer",
                                                            checkedItems[item.id] 
                                                                ? "bg-purple-900/10 border-purple-500/30" 
                                                                : "bg-zinc-900/30 border-zinc-800/50 hover:border-zinc-700"
                                                        )}
                                                        onClick={(e) => toggleItem(item.id, e)}
                                                    >
                                                        <div className="mt-0.5 pointer-events-none">
                                                            <Checkbox 
                                                                checked={!!checkedItems[item.id]} 
                                                                onCheckedChange={() => {}} 
                                                                className="border-zinc-700"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className={cn(
                                                                "text-sm",
                                                                checkedItems[item.id] ? "text-zinc-500 line-through" : "text-zinc-300"
                                                            )}>
                                                                {item.label} {item.sublabel && <span className="text-zinc-500 text-xs">{item.sublabel}</span>}
                                                            </p>
                                                            {item.hint && (
                                                                <p className="text-xs italic text-zinc-500 mt-1">
                                                                    {item.hint}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {section === 'Pre-Mixed Spray Bottles' && (
                                <div className="mt-8 p-4 rounded-lg bg-blue-900/20 border border-blue-800/50 flex items-start gap-3">
                                    <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                                    <p className="text-sm italic text-blue-200">
                                        Label every spray bottle clearly with name + dilution + “Exterior Only” or “Interior Only”. Store in a dark crate to protect from sunlight.
                                    </p>
                                </div>
                            )}
                            
                            {section === 'Grab Chemicals by Scenario' && (
                                <div className="mt-8 p-4 rounded-lg bg-amber-900/20 border border-amber-800/50 flex items-start gap-3">
                                    <Info className="w-5 h-5 text-amber-400 mt-0.5" />
                                    <p className="text-sm italic text-amber-200">
                                        For carpet/upholstery jobs always grab the P&S pair together – they are designed as a 2-step system. Never use Carpet Bomber alone on heavy stains.
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
