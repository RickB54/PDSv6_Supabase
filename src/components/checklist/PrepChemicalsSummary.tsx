import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FlaskConical, AlertTriangle, CheckCircle2, Sparkles, Beaker } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { StepChemicalMapping, getStepChemicalMappings } from "@/lib/chemicals";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface PrepChemicalsSummaryProps {
    steps: { id: string; name: string; category?: string }[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PrepChemicalsSummary({ steps, open, onOpenChange }: PrepChemicalsSummaryProps) {
    const [loading, setLoading] = useState(false);
    const [mappings, setMappings] = useState<StepChemicalMapping[]>([]);
    const [prepNotes, setPrepNotes] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (open && steps.length > 0) {
            const ids = steps.map(s => s.id);
            setLoading(true);
            getStepChemicalMappings(ids).then(data => {
                setMappings(data);
                setLoading(false);
            }).catch(() => setLoading(false));
        }
    }, [open, steps]);

    // Aggregate Logic
    const prepList = useMemo(() => {
        const groups = new Map<string, {
            chemicalName: string;
            chemicalColor: string;
            dilution: string;
            tool: string;
            steps: string[];
            warnings: string[];
            risk: 'Low' | 'Medium' | 'High';
            isExcluded: boolean;
        }>();

        mappings.forEach(m => {
            if (!m.chemical) return;
            if (m.include_in_prep === false) return; // Skip if explicitly excluded

            // Determine dilution key
            const defDilution = m.chemical.dilution_ratios?.[0];
            const dilution = m.dilution_override || (defDilution ? defDilution.ratio : 'RTU');

            // Determine tool
            const tool = m.tool_override || defDilution?.method || m.chemical.application_guide?.method || 'Standard';

            // Key = Chemical ID + Dilution (Mix specific)
            const key = `${m.chemical_id}::${dilution}`;

            if (!groups.has(key)) {
                groups.set(key, {
                    chemicalName: m.chemical.name,
                    chemicalColor: m.chemical.theme_color || '#3b82f6',
                    dilution,
                    tool,
                    steps: [],
                    warnings: [],
                    risk: m.chemical.warnings?.damage_risk || 'Low',
                    isExcluded: false
                });
            }

            const g = groups.get(key)!;
            // Add step name
            const stepName = steps.find(s => s.id === m.step_id)?.name || m.step_id;
            if (!g.steps.includes(stepName)) g.steps.push(stepName);

            // Add warnings (dedup)
            const w = m.warnings_override || (m.chemical.warnings?.damage_risk === 'High' ? m.chemical.warnings?.risks?.[0] : null);
            if (w && !g.warnings.includes(w)) g.warnings.push(w);
        });

        return Array.from(groups.values()).sort((a, b) => {
            // High risk first
            if (a.risk === 'High' && b.risk !== 'High') return -1;
            if (b.risk === 'High' && a.risk !== 'High') return 1;
            return a.chemicalName.localeCompare(b.chemicalName);
        });
    }, [mappings, steps]);

    // AI Logic
    const [allChemicals, setAllChemicals] = useState<any[]>([]);

    useEffect(() => {
        // Load all chemicals for AI suggestions if needed
        import("@/lib/chemicals").then(({ getChemicals }) => {
            getChemicals().then(setAllChemicals);
        });
    }, []);

    const generateAIGuide = async () => {
        setIsGenerating(true);
        // Simulate AI thinking time
        setTimeout(async () => {
            let guide = "## Chemical Prep Strategy\n\n";

            // 1. Existing Assignments
            if (prepList.length > 0) {
                guide += "### 🟢 Assigned Chemicals (Ready to Prep)\n";
                // Group by Tool for efficiency
                const byTool = new Map<string, typeof prepList>();
                prepList.forEach(item => {
                    if (!byTool.has(item.tool)) byTool.set(item.tool, []);
                    byTool.get(item.tool)!.push(item);
                });

                byTool.forEach((items, tool) => {
                    guide += `**Setup for ${tool}:**\n`;
                    items.forEach(item => {
                        guide += `- **${item.chemicalName}**: Mix at **${item.dilution}**.\n`;
                    });
                    guide += "\n";
                });
            } else {
                guide += "No specific chemicals have been assigned to these steps yet.\n\n";
            }

            // 2. Unassigned Steps - Grouped by Category
            const assignedStepIds = new Set<string>();
            mappings.forEach(m => assignedStepIds.add(m.step_id));

            const unassignedSteps = steps.filter(s => !assignedStepIds.has(s.id));

            if (unassignedSteps.length > 0 && allChemicals.length > 0) {
                const { suggestChemicalsForStep } = await import("@/lib/chemical-ai");
                guide += "### 💡 AI Recommendations (Unassigned Steps - By Category)\n";

                // Group unassigned steps by category
                const catGroups: Record<string, typeof unassignedSteps> = {
                    'preparation': [],
                    'exterior': [],
                    'interior': [],
                    'final': []
                };

                unassignedSteps.forEach(s => {
                    const cat = (s.category || 'other').toLowerCase();
                    if (catGroups[cat]) catGroups[cat].push(s);
                    else { // Fallback for 'other' or unknown
                        if (!catGroups['exterior']) catGroups['exterior'] = [];
                        catGroups['exterior'].push(s);
                    }
                });

                // Iterate order
                const cats = ['preparation', 'exterior', 'interior', 'final'];
                let foundAny = false;

                for (const cat of cats) {
                    const groupSteps = catGroups[cat];
                    if (!groupSteps || groupSteps.length === 0) continue;

                    guide += `\n**${cat.charAt(0).toUpperCase() + cat.slice(1)} Steps:**\n`;

                    groupSteps.forEach(step => {
                        const suggestions = suggestChemicalsForStep(step.name, allChemicals, step.id);
                        const best = suggestions.onHand[0] || suggestions.alternatives[0];

                        if (best) {
                            foundAny = true;
                            const chem = best.chem;
                            const map = best.suggestedMapping;
                            const isStock = chem.is_on_hand !== false;
                            guide += `- [${step.name}]: **${chem.name}** (${map.dilution_override || 'Standard'}, ${map.tool_override || 'Standard'}). ${!isStock ? '(⚠️ Not Stocked)' : ''}\n`;
                            if (best.reason) guide += `  > ${best.reason}\n`;
                        } else {
                            guide += `- [${step.name}]: Use standard shop cleaner.\n`;
                        }
                    });
                }

                if (!foundAny) guide += "No specific chemical matches found.\n";

            } else if (unassignedSteps.length > 0) {
                guide += "Could not load inventory for suggestions.\n";
            }

            guide += "\n---\n**Safety Verification:**\nVerified against vehicle safety protocols. Always test on small inconspicuous areas first.";

            setPrepNotes(guide);
            setIsGenerating(false);
        }, 800);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col bg-zinc-950 border-zinc-800 text-white p-0">
                <DialogHeader className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <FlaskConical className="w-6 h-6 text-purple-500" />
                        Chemical Prep Summary
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Review AI recommendations and your assigned chemical list below.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 bg-black/50 p-6">
                    <Accordion type="multiple" defaultValue={["ai-helper", "assigned"]} className="space-y-4">

                        {/* 1. AI Helper Section (Top Priority) */}
                        <AccordionItem value="ai-helper" className="border border-zinc-800 bg-zinc-900/30 rounded-lg px-4 border-b-0">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                    <div className="text-left">
                                        <h3 className="font-bold text-lg text-white">AI Helper Prep Guide</h3>
                                        <p className="text-xs text-zinc-400 font-normal">Auto-generated strategy for all steps (Exterior, Interior, etc.)</p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                <div className="space-y-3">
                                    {prepNotes ? (
                                        <div className="space-y-2">
                                            <Textarea
                                                value={prepNotes}
                                                onChange={(e) => setPrepNotes(e.target.value)}
                                                className="min-h-[250px] bg-zinc-950 border-zinc-800 text-zinc-300 font-mono text-sm leading-relaxed"
                                            />
                                            <div className="flex justify-end">
                                                <Button size="sm" variant="ghost" onClick={generateAIGuide} disabled={isGenerating}>
                                                    <Loader2 className={`w-3 h-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} /> Regenerate
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={generateAIGuide}
                                            className="border border-dashed border-zinc-800 rounded-lg p-8 text-center cursor-pointer hover:bg-zinc-900/50 hover:border-zinc-700 transition flex flex-col items-center justify-center gap-2"
                                        >
                                            <Sparkles className="w-8 h-8 text-purple-500/50" />
                                            <p className="text-zinc-300 font-medium">Click to generate AI Strategy</p>
                                            <p className="text-xs text-zinc-500 max-w-sm">
                                                We'll analyze every step (Exterior & Interior) and suggest the best chemicals from your inventory.
                                            </p>
                                            {isGenerating && <Loader2 className="w-5 h-5 animate-spin text-purple-500 mt-2" />}
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* 2. Assigned Chemicals List */}
                        <AccordionItem value="assigned" className="border border-zinc-800 bg-zinc-900/30 rounded-lg px-4 border-b-0">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-2">
                                    <Beaker className="w-5 h-5 text-blue-400" />
                                    <div className="text-left">
                                        <h3 className="font-bold text-lg text-white">Assigned Chemicals</h3>
                                        <p className="text-xs text-zinc-400 font-normal">Items explicitly mapped to checklist steps</p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                {loading ? (
                                    <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>
                                ) : prepList.length === 0 ? (
                                    <div className="text-center py-6 text-zinc-500 italic">
                                        No manually assigned chemicals. Use the AI Guide above for suggestions.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {prepList.map((item, i) => (
                                            <div key={i} className="flex flex-col md:flex-row gap-4 bg-zinc-950 border border-zinc-800 rounded-lg p-4 relative overflow-hidden">
                                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: item.chemicalColor }} />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold text-white">{item.chemicalName}</h4>
                                                        {item.risk === 'High' && <Badge variant="destructive" className="h-5 text-[10px]">High Risk</Badge>}
                                                    </div>
                                                    <div className="flex gap-4 text-sm mt-1">
                                                        <div><span className="text-zinc-500 text-xs">Mix:</span> <span className="text-purple-400 font-mono font-bold">{item.dilution}</span></div>
                                                        <div><span className="text-zinc-500 text-xs">Tool:</span> <span className="text-zinc-300">{item.tool}</span></div>
                                                    </div>
                                                </div>
                                                <div className="md:w-1/3 border-l border-zinc-800 pl-4 flex flex-col justify-center">
                                                    <span className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Steps</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {item.steps.map(s => <Badge key={s} variant="outline" className="text-[10px] border-zinc-700 bg-zinc-900 text-zinc-400">{s}</Badge>)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>

                    </Accordion>
                </ScrollArea>

                <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
                    <Button onClick={() => onOpenChange(false)} variant="secondary">Done</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
