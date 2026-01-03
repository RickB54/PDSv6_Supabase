import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Save, Beaker, AlertTriangle, Info, BookOpen, ExternalLink, ShieldAlert, Sparkles, Check, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Chemical } from "@/types/chemicals";
import { StepChemicalMapping, getStepChemicalMappings, upsertStepChemicalMapping, deleteStepChemicalMapping, getChemicals } from "@/lib/chemicals";
import { ChemicalDetail } from "@/components/chemicals/ChemicalDetail";
import { suggestChemicalsForStep, ChemicalSuggestionResults, SuggestionItem } from "@/lib/chemical-ai";

interface ChemicalStepModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stepId: string;
    stepName: string;
    isAdmin: boolean;
}

// Sub-component for a single editable row/card extracted outside to prevent re-renders losing focus
interface EditableMappingCardProps {
    mapping: StepChemicalMapping;
    allChemicals: Chemical[];
    onSave: (mapping: Partial<StepChemicalMapping>) => Promise<void>;
    onDelete: (id: string, isTemp: boolean) => void;
}

const EditableMappingCard = ({ mapping, allChemicals, onSave, onDelete }: EditableMappingCardProps) => {
    const { toast } = useToast();
    const [localMap, setLocalMap] = useState(mapping);
    const [isDirty, setIsDirty] = useState(false);
    const isTemp = mapping.id.startsWith('temp_');
    const isSuggestion = mapping.id.startsWith('suggest_');

    const handleChange = (field: keyof StepChemicalMapping, value: any) => {
        setLocalMap(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const save = async () => {
        if (!localMap.chemical_id) return toast({ title: "Select a chemical", variant: "destructive" });
        await onSave(localMap);
        setIsDirty(false);
    };

    return (
        <div className={`border rounded-lg p-4 mb-4 space-y-4 ${isSuggestion ? 'bg-purple-900/10 border-purple-500/50' : 'bg-zinc-900/50 border-zinc-800'}`}>
            <div className="flex justify-between items-start">
                <div className="flex-1 mr-4">
                    <Label className="text-xs text-zinc-500 uppercase flex items-center gap-2">
                        Chemical {isSuggestion && <Badge className="bg-purple-600 text-white text-[10px] h-4 px-1">Suggestion</Badge>}
                    </Label>
                    <Select
                        value={localMap.chemical_id}
                        onValueChange={(val) => handleChange('chemical_id', val)}
                        disabled={!isTemp && !isSuggestion}
                    >
                        <SelectTrigger className="bg-black border-zinc-700 mt-1">
                            <SelectValue placeholder="Select Chemical..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] bg-zinc-900 border-zinc-800 text-white">
                            {allChemicals.map(c => (
                                <SelectItem key={c.id} value={c.id} className="focus:bg-zinc-800 focus:text-white">
                                    <span className={c.is_on_hand === false ? "text-zinc-500" : "text-white"}>
                                        {c.name} {c.is_on_hand === false && "(Not In Stock)"}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-900/20" onClick={() => onDelete(mapping.id, isTemp || isSuggestion)}>
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-xs text-zinc-500 uppercase">Dilution Override</Label>
                    <Input
                        value={localMap.dilution_override || ''}
                        onChange={e => handleChange('dilution_override', e.target.value)}
                        className="bg-black border-zinc-700 h-8 text-sm"
                        placeholder="e.g. 10:1"
                    />
                </div>
                <div>
                    <Label className="text-xs text-zinc-500 uppercase">Tool Override</Label>

                    <Select
                        value={localMap.tool_override || ''}
                        onValueChange={(val) => handleChange('tool_override', val)}
                    >
                        <SelectTrigger className="bg-black border-zinc-700 h-8 text-sm">
                            <SelectValue placeholder="Default..." />
                        </SelectTrigger>
                        <SelectContent>
                            {['Spray Bottle', 'Foam Cannon', 'Pump Sprayer', 'Bucket', 'Microfiber', 'Brush', 'Pressure Washer', 'Applicator Pad', 'Tornador'].map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Label className="text-xs text-zinc-500 uppercase">Application Override (Short)</Label>
                <Textarea
                    value={localMap.application_override || ''}
                    onChange={e => handleChange('application_override', e.target.value)}
                    className="bg-black border-zinc-700 min-h-[60px] text-sm"
                    placeholder="Specific instructions for this step..."
                />
            </div>

            <div>
                <Label className="text-xs text-zinc-500 uppercase text-amber-500">Warnings Override</Label>
                <Input
                    value={localMap.warnings_override || ''}
                    onChange={e => handleChange('warnings_override', e.target.value)}
                    className="bg-black border-zinc-700 h-8 text-sm"
                    placeholder="Step-specific warnings..."
                />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <div className="flex items-center space-x-2">
                    <Switch
                        id={`prep-${mapping.id}`}
                        checked={localMap.include_in_prep}
                        onCheckedChange={(c) => handleChange('include_in_prep', c)}
                    />
                    <Label htmlFor={`prep-${mapping.id}`} className="text-xs text-zinc-400">Include in Prep Summary</Label>
                </div>
                {isDirty && (
                    <Button size="sm" onClick={save} className="bg-green-600 hover:bg-green-700 text-white h-7">
                        <Save className="w-3 h-3 mr-2" /> Save Changes
                    </Button>
                )}
            </div>
        </div>
    );
};

export function ChemicalStepModal({ open, onOpenChange, stepId, stepName, isAdmin }: ChemicalStepModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [mappings, setMappings] = useState<StepChemicalMapping[]>([]);
    const [allChemicals, setAllChemicals] = useState<Chemical[]>([]);
    const [isEditing, setIsEditing] = useState(false);

    // AI Suggestions State
    const [suggestions, setSuggestions] = useState<ChemicalSuggestionResults | null>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);

    // State for viewing full card details
    const [selectedDetailChem, setSelectedDetailChem] = useState<Chemical | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // Initial load
    useEffect(() => {
        if (open && stepId) {
            loadData();
            setSuggestions(null); // Reset suggestions on open
        }
    }, [open, stepId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [maps, chems] = await Promise.all([
                getStepChemicalMappings(stepId),
                isAdmin ? getChemicals() : Promise.resolve([])
            ]);
            setMappings(maps);
            if (isAdmin) {
                setAllChemicals(chems);

                // Auto-Trigger Suggestions if empty
                if (maps.length === 0) {
                    const results = suggestChemicalsForStep(stepName, chems, stepId);
                    if (results.onHand.length > 0 || results.alternatives.length > 0) {
                        setSuggestions(results);
                        setIsEditing(true); // Enter edit mode to show suggestions
                        toast({ title: "AI Suggestions Ready", description: "Review suggested chemicals for this step." });
                    }
                }
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Error loading data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMapping = async (mapping: Partial<StepChemicalMapping>) => {
        try {
            const payload = {
                ...mapping,
                step_id: stepId,
                updated_at: new Date().toISOString(),
                updated_by: 'Admin'
            };

            // Clean up temp ID if it's a suggestion/new
            if (payload.id && (payload.id.startsWith('temp_') || payload.id.startsWith('suggest_'))) {
                delete payload.id;
            }

            await upsertStepChemicalMapping(payload);
            toast({ title: "Saved", description: "Chemical mapping updated." });

            // If it was a suggestion, remove it from the suggestion list
            if (suggestions && mapping.chemical_id) {
                // We rely on refresh to clear it from "suggestions" visually, strictly speaking we should just reload data
            }

            loadData();
        } catch (e) {
            console.error(e);
            toast({ title: "Save failed", variant: "destructive" });
        }
    };

    const handleDeleteMapping = async (id: string, isTemp: boolean) => {
        if (isTemp) {
            setMappings(prev => prev.filter(m => m.id !== id));
            return;
        }

        if (!confirm("Remove this chemical from the step?")) return;
        try {
            await deleteStepChemicalMapping(id);
            toast({ title: "Removed", description: "Chemical removed from step." });
            setMappings(prev => prev.filter(m => m.id !== id));
        } catch (e) {
            console.error(e);
            toast({ title: "Delete failed", variant: "destructive" });
        }
    };

    const addNewMapping = () => {
        const newMap: StepChemicalMapping = {
            id: `temp_${Date.now()}`,
            step_id: stepId,
            chemical_id: '',
            include_in_prep: true,
            updated_at: new Date().toISOString()
        };
        setMappings([...mappings, newMap]);
    };

    const handleAutoSuggest = () => {
        setIsSuggesting(true);
        setTimeout(() => {
            const results = suggestChemicalsForStep(stepName, allChemicals, stepId);
            setSuggestions(results);
            setIsSuggesting(false);
            if (results.onHand.length === 0 && results.alternatives.length === 0) {
                toast({ title: "No suggestions found", description: "Try adding manually." });
            }
        }, 800);
    };

    const acceptSuggestion = async (item: SuggestionItem) => {
        // Optimistically add to list so user can edit before saving?
        // Prompt says "Accept suggestion (saves mapping - wait 'Accept suggestion (saves mapping to Supabase)')"
        // But also "Edit before saving".
        // Requirement 5: "Admin review & save workflow... Accept suggestion... OR Edit before saving"
        // So clicking "Accept" immediately saves? Or adds to the editable list?
        // If "Accept suggestion (saves mapping...)", it implies immediate save.
        // But "Edit before saving" implies a "Prepare" action.

        // Let's treat "Accept" as "Add to my editable list". Then user clicks "Save" on the card.
        // Actually, existing flow requires clicking "Save" on each card.
        // So "Accept" just Moves it into the mappings state.

        setMappings(prev => [...prev, item.suggestedMapping]);

        // Remove from suggestions UI to avoid duplicates
        if (suggestions) {
            const filterOut = (list: SuggestionItem[]) => list.filter(s => s.chem.id !== item.chem.id);
            setSuggestions({
                onHand: filterOut(suggestions.onHand),
                alternatives: filterOut(suggestions.alternatives)
            });
        }
    };

    // View Component for read-only
    const ReadOnlyView = () => {
        if (mappings.length === 0) {
            return (
                <div className="text-center py-10 text-zinc-500 italic">
                    <Beaker className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    No specific chemical instructions for this step.
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {mappings.map(m => {
                    const chem = m.chemical;
                    if (!chem) return null;

                    const defaultDilution = chem.dilution_ratios?.[0];
                    const displayDilution = m.dilution_override || (defaultDilution ? defaultDilution.ratio : 'RTU');
                    const displayTool = m.tool_override || (defaultDilution ? defaultDilution.method : (chem.application_guide?.method || 'Standard'));
                    const displayApp = m.application_override || (chem.application_guide?.notes || 'Follow standard application procedures.');
                    const displayWarning = m.warnings_override || (chem.warnings?.damage_risk === 'High' ? chem.warnings?.risks?.[0] : null);

                    return (
                        <div key={m.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                            {/* Header */}
                            <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-1 rounded-full" style={{ backgroundColor: chem.theme_color || '#3b82f6' }} />
                                    <div>
                                        <h3 className="font-bold text-white leading-tight">{chem.name}</h3>
                                        {chem.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-zinc-700 text-zinc-500">{chem.category}</Badge>}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-blue-400 hover:text-white"
                                    onClick={() => {
                                        setSelectedDetailChem(chem);
                                        setDetailOpen(true);
                                    }}
                                >
                                    View Full Card <ExternalLink className="w-3 h-3 ml-1" />
                                </Button>
                            </div>

                            <div className="p-4 space-y-4">
                                <div className="text-sm text-zinc-400 italic">
                                    Used for: <span className="text-zinc-300">{chem.used_for?.[0] || 'General Cleaning'}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/40 p-2 rounded border border-zinc-800/50">
                                        <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Dilution</span>
                                        <span className="text-purple-400 font-mono font-bold text-sm">{displayDilution}</span>
                                    </div>
                                    <div className="bg-black/40 p-2 rounded border border-zinc-800/50">
                                        <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Tool</span>
                                        <span className="text-zinc-300 text-sm">{displayTool}</span>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Application</span>
                                    <p className="text-sm text-zinc-300 leading-snug">{displayApp}</p>
                                </div>

                                {displayWarning && (
                                    <div className="flex items-start gap-2 bg-red-950/30 border border-red-900/30 p-2 rounded text-red-300 text-sm">
                                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span><strong className="uppercase text-[10px] block text-red-500">Warning</strong>{displayWarning}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center">
                            <span>Step Chemicals</span>
                            {isAdmin && (
                                <Button
                                    size="sm"
                                    variant={isEditing ? "secondary" : "ghost"}
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="h-7 text-xs"
                                >
                                    {isEditing ? "Done Editing" : "Edit Step"}
                                </Button>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Chemicals for: <span className="font-bold text-white">{stepName}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4">
                        {loading ? (
                            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>
                        ) : isEditing ? (
                            <div className="space-y-6">
                                {/* Regular Mappings */}
                                <div className="space-y-4">
                                    {mappings.map(m => (
                                        <EditableMappingCard
                                            key={m.id}
                                            mapping={m}
                                            allChemicals={allChemicals}
                                            onSave={handleSaveMapping}
                                            onDelete={handleDeleteMapping}
                                        />
                                    ))}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button onClick={addNewMapping} variant="outline" className="flex-1 border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800">
                                        <Plus className="w-4 h-4 mr-2" /> Add Chemical
                                    </Button>
                                    <Button
                                        onClick={handleAutoSuggest}
                                        disabled={isSuggesting}
                                        className="bg-purple-900/30 text-purple-400 border border-purple-500/50 hover:bg-purple-900/50"
                                    >
                                        {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                        Auto-Suggest
                                    </Button>
                                </div>

                                {/* Suggestions UI */}
                                {suggestions && (suggestions.onHand.length > 0 || suggestions.alternatives.length > 0) && (
                                    <div className="mt-6 pt-6 border-t border-purple-900/30 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" /> AI Suggestions
                                            </h4>
                                            <Button variant="ghost" size="sm" onClick={() => setSuggestions(null)} className="h-6 text-xs text-zinc-500 hover:text-white">Clear</Button>
                                        </div>

                                        {/* On Hand Group */}
                                        {suggestions.onHand.length > 0 && (
                                            <div className="space-y-2">
                                                <h5 className="text-xs uppercase font-bold text-green-500 pl-1">In Stock (Recommended)</h5>
                                                {suggestions.onHand.map(item => (
                                                    <div key={item.chem.id} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 hover:border-green-500/30 rounded-lg group">
                                                        <div>
                                                            <div className="font-bold text-white text-sm">{item.chem.name}</div>
                                                            <div className="text-xs text-zinc-400">{item.reason}</div>
                                                        </div>
                                                        <Button size="sm" onClick={() => acceptSuggestion(item)} className="h-7 text-xs bg-green-900/50 text-green-300 hover:bg-green-800 border border-green-700/50">
                                                            <Check className="w-3 h-3 mr-1" /> Use
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Alternatives Group */}
                                        {suggestions.alternatives.length > 0 && (
                                            <div className="space-y-2">
                                                <h5 className="text-xs uppercase font-bold text-zinc-500 pl-1">Alternatives (Not In Stock)</h5>
                                                {suggestions.alternatives.map(item => (
                                                    <div key={item.chem.id} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 border-dashed opacity-75 hover:opacity-100 rounded-lg">
                                                        <div>
                                                            <div className="font-bold text-zinc-300 text-sm">{item.chem.name}</div>
                                                            <div className="text-xs text-zinc-100 italic">{item.reason}</div>
                                                        </div>
                                                        <Button size="sm" variant="ghost" onClick={() => acceptSuggestion(item)} className="h-7 text-xs text-zinc-400 hover:text-white">
                                                            <Plus className="w-3 h-3 mr-1" /> Add
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <ReadOnlyView />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <ChemicalDetail
                chemical={selectedDetailChem}
                open={detailOpen}
                onOpenChange={setDetailOpen}
                isAdmin={false}
            />
        </>
    );
}
