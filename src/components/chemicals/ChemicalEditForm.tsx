import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Chemical, DilutionRatio } from "@/types/chemicals";
import { Sparkles, Save, Loader2, Upload, Trash2, Plus, Info, X, Beaker, AlertTriangle } from 'lucide-react';
import { upsertChemical } from "@/lib/chemicals";
import { generateTemplate } from "@/lib/chemical-ai";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supa-data";
import { ensureAllStorageBuckets } from "@/lib/storage-utils";

interface ChemicalEditFormProps {
    initialData: Partial<Chemical>;
    onSave: () => void;
    onCancel: () => void;
}

export function ChemicalEditForm({ initialData, onSave, onCancel }: ChemicalEditFormProps) {
    const [editing, setEditing] = useState<Partial<Chemical>>(initialData);
    const [aiLoading, setAiLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [aiSnapshot, setAiSnapshot] = useState<Partial<Chemical> | null>(null);
    const [viewingDilutionNote, setViewingDilutionNote] = useState<{ method: string; note: string } | null>(null);

    // Ensure buckets exist on mount
    useEffect(() => {
        ensureAllStorageBuckets().catch(console.error);
    }, []);

    // Image Upload Logic
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        setUploading(true);
        try {
            const { error: uploadError } = await supabase.storage
                .from('chemicals')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('chemicals')
                .getPublicUrl(filePath);

            setEditing(prev => ({ ...prev, primary_image_url: data.publicUrl }));
            toast({ title: "Image Uploaded", description: "Primary image updated." });
        } catch (error: any) {
            console.error("Upload Error:", error);
            toast({ title: "Upload Failed", description: error.message || "Failed to upload image.", variant: "destructive" });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Enhanced Auto-Fill
    const handleAiGenerate = async () => {
        if (!editing?.name) {
            return toast({ title: "Enter Name", description: "We need a name to generate a template.", variant: "destructive" });
        }
        setAiLoading(true);

        setTimeout(() => {
            const category = editing.category || "Exterior";
            const template = generateTemplate(editing.name!, category as any);

            // Calculate new state
            const newState = {
                ...editing,
                ...template,
                // Preserve user-defined identity
                name: editing?.name,
                brand: editing?.brand,
                category: editing?.category,
                theme_color: editing?.theme_color || "#3b82f6",
                // Mark as AI-generated
                ai_generated: true,
                manually_modified: false,
            };

            setEditing(newState);
            // Take snapshot of AI-generated content for comparison
            setAiSnapshot(newState);
            setAiLoading(false);
            toast({ title: "Auto-Fill Complete", description: "Template data applied.", className: "bg-green-900 border-green-800" });
        }, 1000);
    };

    const handleSaveInternal = async () => {
        if (!editing?.name) return toast({ title: "Name is required", variant: "destructive" });
        if (!editing?.brand) return toast({ title: "Brand is required", variant: "destructive" });

        // Detect manual modifications if this was AI-generated
        let dataToSave = { ...editing };
        if (editing.ai_generated) {
            // Compare current state with initial data OR snapshot to detect changes
            const baseline = aiSnapshot || initialData;
            const wasManuallyEdited = hasContentChanged(baseline, editing);
            if (wasManuallyEdited) {
                dataToSave.manually_modified = true;
            }
        }

        setSaving(true);
        try {
            const { error } = await upsertChemical(dataToSave);
            if (error) throw error;
            toast({ title: "Success", description: "Chemical saved." });
            onSave();
        } catch (e: any) {
            toast({ title: "Error saving", description: e.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    // Helper: Check if content fields changed (excluding images/videos)
    const hasContentChanged = (snapshot: Partial<Chemical>, current: Partial<Chemical>): boolean => {
        const contentFields = ['description', 'used_for', 'dilution_ratios', 'application_guide',
            'surface_compatibility', 'warnings', 'pro_tips', 'user_notes'];

        return contentFields.some(field => {
            const snapVal = JSON.stringify((snapshot as any)[field]);
            const currVal = JSON.stringify((current as any)[field]);
            return snapVal !== currVal;
        });
    };

    // Sub-component for Dilution Editing
    const addDilution = () => {
        const newD: DilutionRatio = { method: "Spray", ratio: "1:10", soil_level: "General", notes: "" };
        setEditing({ ...editing, dilution_ratios: [...(editing?.dilution_ratios || []), newD] });
    };

    const updateDilution = (index: number, field: keyof DilutionRatio, val: string) => {
        const arr = [...(editing?.dilution_ratios || [])];
        arr[index] = { ...arr[index], [field]: val };
        setEditing({ ...editing, dilution_ratios: arr });
    };

    const removeDilution = (index: number) => {
        const arr = [...(editing?.dilution_ratios || [])];
        arr.splice(index, 1);
        setEditing({ ...editing, dilution_ratios: arr });
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-white">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{editing?.id ? 'Edit Chemical' : 'New Chemical'}</span>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="border-purple-500/50 text-purple-400 hover:bg-purple-900/20"
                    onClick={handleAiGenerate}
                    disabled={aiLoading}
                >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    AI Auto-Fill
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-8">
                {/* SECTION 1: CORE IDENTITY */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">Core Identity</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Chemical Name *</Label>
                            <Input value={editing?.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="bg-zinc-900 border-zinc-700" placeholder="e.g. Green Star" />
                        </div>
                        <div className="space-y-2">
                            <Label>Brand *</Label>
                            <Input value={editing?.brand || ''} onChange={e => setEditing({ ...editing, brand: e.target.value })} className="bg-zinc-900 border-zinc-700" placeholder="e.g. Koch Chemie" />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={editing?.category} onValueChange={(v: any) => setEditing({ ...editing, category: v })}>
                                <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                    <SelectItem value="Exterior">Exterior</SelectItem>
                                    <SelectItem value="Interior">Interior</SelectItem>
                                    <SelectItem value="Dual-Use">Dual-Use</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Theme Color</Label>
                            <div className="flex gap-2">
                                <Input type="color" value={editing?.theme_color} onChange={e => setEditing({ ...editing, theme_color: e.target.value })} className="w-12 h-10 p-1 bg-zinc-900 border-zinc-700" />
                                <Input value={editing?.theme_color} onChange={e => setEditing({ ...editing, theme_color: e.target.value })} className="flex-1 bg-zinc-900 border-zinc-700" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={editing?.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className="bg-zinc-900 border-zinc-700" rows={3} placeholder="Brief marketing description..." />
                    </div>

                    {/* USED FOR (Array) */}
                    <div className="space-y-2">
                        <Label>Used For (Primary Applications)</Label>
                        <div className="space-y-2">
                            {editing?.used_for?.map((use, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Input
                                        value={use}
                                        onChange={e => {
                                            const newUsedFor = [...(editing.used_for || [])];
                                            newUsedFor[idx] = e.target.value;
                                            setEditing({ ...editing, used_for: newUsedFor });
                                        }}
                                        className="bg-zinc-900 border-zinc-700 flex-1"
                                        placeholder="e.g., Paint, Wheels, Glass"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                            const newUsedFor = [...(editing.used_for || [])];
                                            newUsedFor.splice(idx, 1);
                                            setEditing({ ...editing, used_for: newUsedFor });
                                        }}
                                        className="hover:text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditing({ ...editing, used_for: [...(editing.used_for || []), ""] })}
                                className="border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
                            >
                                <Plus className="w-3 h-3 mr-2" /> Add Application
                            </Button>
                        </div>
                    </div>

                    {/* WHEN TO USE / WHY TO USE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>When to Use</Label>
                            <Textarea
                                value={editing?.when_to_use || ''}
                                onChange={e => setEditing({ ...editing, when_to_use: e.target.value })}
                                className="bg-zinc-900 border-zinc-700"
                                rows={3}
                                placeholder="Describe when this chemical should be used..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Why to Use It</Label>
                            <Textarea
                                value={editing?.why_to_use || ''}
                                onChange={e => setEditing({ ...editing, why_to_use: e.target.value })}
                                className="bg-zinc-900 border-zinc-700"
                                rows={3}
                                placeholder="Explain the benefits and reasons to use this chemical..."
                            />
                        </div>
                    </div>
                </div>

                {/* SECTION 2: DILUTION */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider border-b border-blue-900/30 pb-2 flex items-center gap-2">
                        <Beaker className="w-4 h-4" /> Dilution Ratios (Water Percents)
                    </h3>
                    <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                        {editing?.dilution_ratios?.length === 0 && <p className="text-sm text-zinc-500 italic mb-2">No dilution ratios added.</p>}

                        <div className="space-y-3">
                            {editing?.dilution_ratios?.map((ratio, idx) => (
                                <div key={idx} className="flex gap-2 items-start bg-zinc-900 p-2 rounded border border-zinc-700/50">
                                    <div className="flex-1 grid grid-cols-4 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-zinc-400">Method</Label>
                                            <Input value={ratio.method} onChange={e => updateDilution(idx, 'method', e.target.value)} className="h-8 text-sm bg-zinc-800 border-zinc-600" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-zinc-400">Ratio</Label>
                                            <Input value={ratio.ratio} onChange={e => updateDilution(idx, 'ratio', e.target.value)} className="h-8 text-sm bg-zinc-800 border-zinc-600 font-bold text-blue-300" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-zinc-400">Soil Level</Label>
                                            <Input value={ratio.soil_level} onChange={e => updateDilution(idx, 'soil_level', e.target.value)} className="h-8 text-sm bg-zinc-800 border-zinc-600" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-zinc-400">Notes</Label>
                                            <div
                                                className="h-8 px-3 py-2 rounded-md border border-zinc-600 bg-zinc-800 text-sm text-zinc-300 cursor-pointer hover:border-blue-500 hover:bg-zinc-750 transition-colors flex items-center"
                                                onClick={() => ratio.notes && setViewingDilutionNote({ method: ratio.method, note: ratio.notes || '' })}
                                                title="Click to view full notes"
                                            >
                                                <span className="truncate">{ratio.notes || <span className="text-zinc-600 italic">Click to view</span>}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button size="icon" variant="ghost" onClick={() => removeDilution(idx)} className="mt-6 hover:text-red-500 h-8 w-8">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button size="sm" variant="secondary" onClick={addDilution} className="mt-3">
                            <Plus className="w-3 h-3 mr-2" /> Add Ratio
                        </Button>
                    </div>
                </div>

                {/* SECTION 3: USAGE & SAFETY */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">Application Guide</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Application Method</Label>
                            <Input value={editing?.application_guide?.method || ''} onChange={e => setEditing({ ...editing, application_guide: { ...editing?.application_guide!, method: e.target.value } })} className="bg-zinc-900 border-zinc-700" />
                        </div>
                        <div className="space-y-2">
                            <Label>Agitation</Label>
                            <Input value={editing?.application_guide?.agitation || ''} onChange={e => setEditing({ ...editing, application_guide: { ...editing?.application_guide!, agitation: e.target.value } })} className="bg-zinc-900 border-zinc-700" />
                        </div>
                        <div className="space-y-2">
                            <Label>Rinse Instructions</Label>
                            <Input value={editing?.application_guide?.rinse || ''} onChange={e => setEditing({ ...editing, application_guide: { ...editing?.application_guide!, rinse: e.target.value } })} className="bg-zinc-900 border-zinc-700" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label>Min Dwell (Min)</Label>
                                <Input type="number" value={editing?.application_guide?.dwell_time_min || 0} onChange={e => setEditing({ ...editing, application_guide: { ...editing?.application_guide!, dwell_time_min: parseInt(e.target.value) } })} className="bg-zinc-900 border-zinc-700" />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Dwell (Min)</Label>
                                <Input type="number" value={editing?.application_guide?.dwell_time_max || 0} onChange={e => setEditing({ ...editing, application_guide: { ...editing?.application_guide!, dwell_time_max: parseInt(e.target.value) } })} className="bg-zinc-900 border-zinc-700" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Application Notes</Label>
                        <Textarea
                            value={editing?.application_guide?.notes || ''}
                            onChange={e => setEditing({ ...editing, application_guide: { ...editing?.application_guide!, notes: e.target.value } })}
                            className="bg-zinc-900 border-zinc-700"
                            rows={2}
                            placeholder="Additional application instructions..."
                        />
                    </div>
                </div>

                {/* SECTION 4: SURFACE COMPATIBILITY & WARNINGS */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider border-b border-yellow-900/30 pb-2">Surface Compatibility & Safety</h3>

                    {/* Surface Compatibility */}
                    <div className="space-y-3">
                        <Label className="text-green-400">Safe On (Green)</Label>
                        <div className="space-y-2">
                            {editing?.surface_compatibility?.safe?.map((surface, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Input
                                        value={surface}
                                        onChange={e => {
                                            const newSafe = [...(editing.surface_compatibility?.safe || [])];
                                            newSafe[idx] = e.target.value;
                                            setEditing({ ...editing, surface_compatibility: { ...editing.surface_compatibility!, safe: newSafe } });
                                        }}
                                        className="bg-green-900/20 border-green-700 flex-1"
                                        placeholder="e.g., Paint, Glass, Plastic"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                            const newSafe = [...(editing.surface_compatibility?.safe || [])];
                                            newSafe.splice(idx, 1);
                                            setEditing({ ...editing, surface_compatibility: { ...editing.surface_compatibility!, safe: newSafe } });
                                        }}
                                        className="hover:text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditing({ ...editing, surface_compatibility: { ...editing.surface_compatibility!, safe: [...(editing.surface_compatibility?.safe || []), ""] } })}
                                className="border-dashed border-green-700 text-green-400 hover:text-green-300"
                            >
                                <Plus className="w-3 h-3 mr-2" /> Add Safe Surface
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-yellow-400">Use Caution On (Yellow)</Label>
                        <div className="space-y-2">
                            {editing?.surface_compatibility?.risky?.map((surface, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Input
                                        value={surface}
                                        onChange={e => {
                                            const newRisky = [...(editing.surface_compatibility?.risky || [])];
                                            newRisky[idx] = e.target.value;
                                            setEditing({ ...editing, surface_compatibility: { ...editing.surface_compatibility!, risky: newRisky } });
                                        }}
                                        className="bg-yellow-900/20 border-yellow-700 flex-1"
                                        placeholder="e.g., Chrome, Aluminum"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                            const newRisky = [...(editing.surface_compatibility?.risky || [])];
                                            newRisky.splice(idx, 1);
                                            setEditing({ ...editing, surface_compatibility: { ...editing.surface_compatibility!, risky: newRisky } });
                                        }}
                                        className="hover:text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditing({ ...editing, surface_compatibility: { ...editing.surface_compatibility!, risky: [...(editing.surface_compatibility?.risky || []), ""] } })}
                                className="border-dashed border-yellow-700 text-yellow-400 hover:text-yellow-300"
                            >
                                <Plus className="w-3 h-3 mr-2" /> Add Caution Surface
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-red-400">Avoid / Do Not Use On (Red)</Label>
                        <div className="space-y-2">
                            {editing?.surface_compatibility?.avoid?.map((surface, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Input
                                        value={surface}
                                        onChange={e => {
                                            const newAvoid = [...(editing.surface_compatibility?.avoid || [])];
                                            newAvoid[idx] = e.target.value;
                                            setEditing({ ...editing, surface_compatibility: { ...editing.surface_compatibility!, avoid: newAvoid } });
                                        }}
                                        className="bg-red-900/20 border-red-700 flex-1"
                                        placeholder="e.g., Matte Paint, Vinyl Wraps"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                            const newAvoid = [...(editing.surface_compatibility?.avoid || [])];
                                            newAvoid.splice(idx, 1);
                                            setEditing({ ...editing, surface_compatibility: { ...editing.surface_compatibility!, avoid: newAvoid } });
                                        }}
                                        className="hover:text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditing({ ...editing, surface_compatibility: { ...editing.surface_compatibility!, avoid: [...(editing.surface_compatibility?.avoid || []), ""] } })}
                                className="border-dashed border-red-700 text-red-400 hover:text-red-300"
                            >
                                <Plus className="w-3 h-3 mr-2" /> Add Unsafe Surface
                            </Button>
                        </div>
                    </div>
                </div>

                {/* SECTION 5: WARNINGS & RISKS */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider border-b border-red-900/30 pb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Warnings & Risks
                    </h3>

                    <div className="space-y-2">
                        <Label>Damage Risk Level</Label>
                        <Select
                            value={editing?.warnings?.damage_risk}
                            onValueChange={(v: any) => setEditing({ ...editing, warnings: { ...editing?.warnings!, damage_risk: v } })}
                        >
                            <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Potential Risks</Label>
                        <div className="space-y-2">
                            {editing?.warnings?.risks?.map((risk, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Input
                                        value={risk}
                                        onChange={e => {
                                            const newRisks = [...(editing.warnings?.risks || [])];
                                            newRisks[idx] = e.target.value;
                                            setEditing({ ...editing, warnings: { ...editing.warnings!, risks: newRisks } });
                                        }}
                                        className="bg-zinc-900 border-zinc-700 flex-1"
                                        placeholder="e.g., May etch if left to dry"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                            const newRisks = [...(editing.warnings?.risks || [])];
                                            newRisks.splice(idx, 1);
                                            setEditing({ ...editing, warnings: { ...editing.warnings!, risks: newRisks } });
                                        }}
                                        className="hover:text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditing({ ...editing, warnings: { ...editing.warnings!, risks: [...(editing.warnings?.risks || []), ""] } })}
                                className="border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
                            >
                                <Plus className="w-3 h-3 mr-2" /> Add Risk
                            </Button>
                        </div>
                    </div>
                </div>

                {/* SECTION 6: CHEMICAL INTERACTIONS */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">Chemical Interactions</h3>

                    <div className="space-y-2">
                        <Label>Do Not Mix With</Label>
                        <div className="space-y-2">
                            {editing?.interactions?.do_not_mix?.map((chemical, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Input
                                        value={chemical}
                                        onChange={e => {
                                            const newMix = [...(editing.interactions?.do_not_mix || [])];
                                            newMix[idx] = e.target.value;
                                            setEditing({ ...editing, interactions: { ...editing.interactions!, do_not_mix: newMix } });
                                        }}
                                        className="bg-zinc-900 border-zinc-700 flex-1"
                                        placeholder="e.g., Acids, Bleach"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                            const newMix = [...(editing.interactions?.do_not_mix || [])];
                                            newMix.splice(idx, 1);
                                            setEditing({ ...editing, interactions: { ...editing.interactions!, do_not_mix: newMix } });
                                        }}
                                        className="hover:text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditing({ ...editing, interactions: { ...editing.interactions!, do_not_mix: [...(editing.interactions?.do_not_mix || []), ""] } })}
                                className="border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
                            >
                                <Plus className="w-3 h-3 mr-2" /> Add Incompatible Chemical
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Application Sequencing</Label>
                        <div className="space-y-2">
                            {editing?.interactions?.sequencing?.map((seq, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Input
                                        value={seq}
                                        onChange={e => {
                                            const newSeq = [...(editing.interactions?.sequencing || [])];
                                            newSeq[idx] = e.target.value;
                                            setEditing({ ...editing, interactions: { ...editing.interactions!, sequencing: newSeq } });
                                        }}
                                        className="bg-zinc-900 border-zinc-700 flex-1"
                                        placeholder="e.g., Use before wax, Apply after decontamination"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                            const newSeq = [...(editing.interactions?.sequencing || [])];
                                            newSeq.splice(idx, 1);
                                            setEditing({ ...editing, interactions: { ...editing.interactions!, sequencing: newSeq } });
                                        }}
                                        className="hover:text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditing({ ...editing, interactions: { ...editing.interactions!, sequencing: [...(editing.interactions?.sequencing || []), ""] } })}
                                className="border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
                            >
                                <Plus className="w-3 h-3 mr-2" /> Add Sequencing Note
                            </Button>
                        </div>
                    </div>
                </div>

                {/* SECTION 7: MULTIMEDIA */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">Media & Content</h3>
                    <div className="space-y-2">
                        <Label>Primary Image URL</Label>
                        <div className="flex gap-2">
                            <Input
                                value={editing?.primary_image_url || ''}
                                onChange={e => setEditing({ ...editing, primary_image_url: e.target.value })}
                                className="bg-zinc-900 border-zinc-700 flex-1"
                                placeholder="https://..."
                            />
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                                accept="image/*"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                className="border-zinc-700 hover:bg-zinc-800"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                title="Upload from Device"
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Video Links (YouTube)</Label>
                        {(!editing?.video_urls || editing.video_urls.length === 0) && (
                            <p className="text-xs text-zinc-500 italic">No videos added.</p>
                        )}
                        <div className="space-y-2">
                            {editing?.video_urls?.map((url, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Input
                                        value={url}
                                        onChange={e => {
                                            const newUrls = [...(editing.video_urls || [])];
                                            newUrls[idx] = e.target.value;
                                            setEditing({ ...editing, video_urls: newUrls });
                                        }}
                                        className="bg-zinc-900 border-zinc-700 flex-1"
                                        placeholder="https://youtube.com/..."
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                            const newUrls = [...(editing.video_urls || [])];
                                            newUrls.splice(idx, 1);
                                            setEditing({ ...editing, video_urls: newUrls });
                                        }}
                                        className="hover:text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditing({ ...editing, video_urls: [...(editing.video_urls || []), ""] })}
                                className="border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
                            >
                                <Plus className="w-3 h-3 mr-2" /> Add Video Link
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Gallery URLs (Comma separated)</Label>
                        <Input
                            value={editing?.gallery_image_urls?.join(", ") || ''}
                            onChange={e => setEditing({ ...editing, gallery_image_urls: e.target.value.split(",").map(s => s.trim()) })}
                            className="bg-zinc-900 border-zinc-700"
                            placeholder="https://..., https://..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Pro Tips (Comma separated)</Label>
                        <Textarea
                            value={editing?.pro_tips?.join("\n") || ''}
                            onChange={e => setEditing({ ...editing, pro_tips: e.target.value.split("\n").filter(Boolean) })}
                            className="bg-zinc-900 border-zinc-700 font-mono text-sm"
                            rows={3}
                            placeholder="Enter each tip on a new line..."
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800 mt-4">
                <Button
                    onClick={handleSaveInternal}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 min-w-[200px]"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>

            {/* Dilution Notes Viewer/Editor Modal */}
            <Dialog open={!!viewingDilutionNote} onOpenChange={(open) => !open && setViewingDilutionNote(null)}>
                <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Beaker className="w-5 h-5 text-purple-400" />
                            Dilution Notes: {viewingDilutionNote?.method}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-4">
                        <Textarea
                            value={viewingDilutionNote?.note || ''}
                            onChange={(e) => setViewingDilutionNote(prev => prev ? { ...prev, note: e.target.value } : null)}
                            className="min-h-[140px] bg-zinc-900 border-zinc-800 text-zinc-300 resize-none"
                            placeholder="Enter notes for this dilution ratio..."
                        />
                    </div>
                    <div className="flex justify-end gap-2 px-4 pb-4">
                        <Button variant="outline" onClick={() => setViewingDilutionNote(null)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                                if (viewingDilutionNote) {
                                    // Find and update the dilution ratio
                                    const ratios = [...(editing?.dilution_ratios || [])];
                                    const idx = ratios.findIndex(r => r.method === viewingDilutionNote.method);
                                    if (idx !== -1) {
                                        ratios[idx].notes = viewingDilutionNote.note;
                                        setEditing({ ...editing, dilution_ratios: ratios });
                                    }
                                    setViewingDilutionNote(null);
                                    toast({ title: "Notes Updated", description: "Dilution notes have been updated." });
                                }
                            }}
                        >
                            Save Notes
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
