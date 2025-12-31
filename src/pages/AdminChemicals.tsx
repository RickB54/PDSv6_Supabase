import { PageHeader } from "@/components/PageHeader";
import { ChemicalCard } from "@/components/chemicals/ChemicalCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getChemicals, upsertChemical, deleteChemical } from "@/lib/chemicals";
import { Chemical, ChemicalCategory, DamageRisk, DilutionRatio } from "@/types/chemicals";
import { Loader2, Plus, Sparkles, Trash2, Save, ArrowLeft, X, Video, Beaker } from "lucide-react";
import { ChemicalEditForm } from "@/components/chemicals/ChemicalEditForm";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { generateTemplate } from "@/lib/chemical-ai";

export default function AdminChemicals() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [chemicals, setChemicals] = useState<Chemical[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Partial<Chemical> | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await getChemicals();
        setChemicals(data);
        setLoading(false);
    };

    const handleEdit = (c: Chemical) => {
        setEditing({ ...c });
        setDialogOpen(true);
    };

    const handleCreate = () => {
        setEditing({
            name: "",
            brand: "",
            category: "Exterior",
            theme_color: "#3b82f6",
            used_for: [],
            dilution_ratios: [],
            warnings: { damage_risk: "Low", risks: [] },
            interactions: { do_not_mix: [], sequencing: [] },
            surface_compatibility: { safe: [], risky: [], avoid: [] },
            application_guide: { method: "Spray", agitation: "None", rinse: "Can rinse" },
            video_urls: [],
            gallery_image_urls: []
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!editing?.name) return toast({ title: "Name is required", variant: "destructive" });
        if (!editing?.brand) return toast({ title: "Brand is required", variant: "destructive" });

        const { error } = await upsertChemical(editing);
        if (error) {
            toast({ title: "Error saving", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Chemical saved." });
            setDialogOpen(false);
            loadData();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this chemical?")) return;
        await deleteChemical(id);
        toast({ title: "Deleted", description: "Chemical removed." });
        loadData();
    };

    // Enhanced Auto-Fill
    const handleAiGenerate = async () => {
        if (!editing?.name || !editing?.category) {
            return toast({ title: "Enter Name & Category", description: "We need a name to generate a template.", variant: "destructive" });
        }
        setAiLoading(true);

        setTimeout(() => {
            const template = generateTemplate(editing.name!, editing.category as ChemicalCategory);
            setEditing(prev => ({
                ...prev,
                ...template,
                // Preserve specific user inputs if they exist and aren't empty?
                // For "Auto-Fill" typically we overwrite empty fields
                name: prev?.name,
                category: prev?.category,
                theme_color: prev?.theme_color || "#3b82f6",
            }));
            setAiLoading(false);
            toast({ title: "Auto-Fill Complete", description: "Template data applied based on category and name.", className: "bg-green-900 border-green-800" });
        }, 1500);
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
        <div className="min-h-screen bg-black pb-20">
            <PageHeader title="Chemical Admin" />
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <Button variant="ghost" className="mb-6 text-zinc-400" onClick={() => navigate('/chemicals')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Library
                </Button>

                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Manage Chemicals</h1>
                    <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="w-4 h-4 mr-2" /> Add New Chemical
                    </Button>
                </div>

                {loading ? <div className="text-zinc-500">Loading...</div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {chemicals.map(c => (
                            <div key={c.id} className="relative group">
                                <ChemicalCard chemical={c} onClick={() => handleEdit(c)} />
                                <Button
                                    size="icon"
                                    variant="destructive"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-w-4xl h-[90vh] flex flex-col bg-zinc-950 border-zinc-800 text-white p-6">
                        {editing && (
                            <ChemicalEditForm
                                initialData={editing}
                                onSave={() => {
                                    setDialogOpen(false);
                                    loadData();
                                }}
                                onCancel={() => setDialogOpen(false)}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
