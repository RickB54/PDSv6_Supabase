import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Chemical, DilutionRatio } from "@/types/chemicals";
import { Loader2, Sparkles, Plus, X, Save, Beaker } from "lucide-react";
import { upsertChemical } from "@/lib/chemicals";
import { generateTemplate } from "@/lib/chemical-ai";
import { toast } from "@/hooks/use-toast";

interface ChemicalEditFormProps {
    initialData: Partial<Chemical>;
    onSave: () => void;
    onCancel: () => void;
}

export function ChemicalEditForm({ initialData, onSave, onCancel }: ChemicalEditFormProps) {
    const [editing, setEditing] = useState<Partial<Chemical>>(initialData);
    const [aiLoading, setAiLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Enhanced Auto-Fill
    const handleAiGenerate = async () => {
        if (!editing?.name) {
            return toast({ title: "Enter Name", description: "We need a name to generate a template.", variant: "destructive" });
        }
        setAiLoading(true);

        setTimeout(() => {
            const category = editing.category || "Exterior";
            const template = generateTemplate(editing.name!, category as any);
            setEditing(prev => ({
                ...prev,
                ...template,
                // Preserve user-defined identity
                name: prev?.name,
                brand: prev?.brand,
                category: prev?.category,
                theme_color: prev?.theme_color || "#3b82f6",
            }));
            setAiLoading(false);
            toast({ title: "Auto-Fill Complete", description: "Template data applied.", className: "bg-green-900 border-green-800" });
        }, 1000);
    };

    const handleSaveInternal = async () => {
        if (!editing?.name) return toast({ title: "Name is required", variant: "destructive" });
        if (!editing?.brand) return toast({ title: "Brand is required", variant: "destructive" });

        setSaving(true);
        try {
            const { error } = await upsertChemical(editing);
            if (error) throw error;
            toast({ title: "Success", description: "Chemical saved." });
            onSave();
        } catch (e: any) {
            toast({ title: "Error saving", description: e.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
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
                                            <Input value={ratio.notes || ''} onChange={e => updateDilution(idx, 'notes', e.target.value)} className="h-8 text-sm bg-zinc-800 border-zinc-600" />
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
                </div>

                {/* SECTION 4: MULTIMEDIA */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">Media & Content</h3>
                    <div className="space-y-2">
                        <Label>Primary Image URL</Label>
                        <Input value={editing?.primary_image_url || ''} onChange={e => setEditing({ ...editing, primary_image_url: e.target.value })} className="bg-zinc-900 border-zinc-700" placeholder="https://..." />
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
                <Button variant="ghost" onClick={onCancel} className="text-zinc-400 hover:text-white">Cancel</Button>
                <Button
                    onClick={handleSaveInternal}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 min-w-[200px]"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}
