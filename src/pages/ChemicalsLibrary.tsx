import { PageHeader } from "@/components/PageHeader";
import { ChemicalCard } from "@/components/chemicals/ChemicalCard";
import { ChemicalDetail } from "@/components/chemicals/ChemicalDetail";
import { ChemicalLabelMaker } from "@/components/chemicals/ChemicalLabelMaker";
import { MixedLabelMaker } from "@/components/chemicals/MixedLabelMaker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCombinedSelectableProducts, deleteChemical } from "@/lib/chemicals";
import { Chemical, ChemicalCategory } from "@/types/chemicals";
import { Plus, Search, Tag, HelpCircle, Beaker, Calculator, Printer, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChemicalEditForm } from "@/components/chemicals/ChemicalEditForm";
import { Badge } from "@/components/ui/badge";

export default function ChemicalsLibrary() {
    const navigate = useNavigate();
    const [chemicals, setChemicals] = useState<Chemical[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChemical, setSelectedChemical] = useState<Chemical | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
    const [labelMakerOpen, setLabelMakerOpen] = useState(false);
    const [mixedLabelMakerOpen, setMixedLabelMakerOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingChemical, setEditingChemical] = useState<Partial<Chemical> | null>(null);

    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const user = getCurrentUser();
        setIsAdmin(user?.role === 'admin' || user?.role === 'owner');

        // Seed/Fetch data
        loadChemicals();
    }, []);

    const loadChemicals = async () => {
        setLoading(true);
        const data = await getCombinedSelectableProducts();
        setChemicals(data);
        setLoading(false);
        return data;
    };

    const handleChemicalUpdate = async () => {
        const data = await loadChemicals();
        if (selectedChemical) {
            const fresh = data.find(c => c.id === selectedChemical.id);
            if (fresh) setSelectedChemical(fresh);
        }
    };

    const categories = ["All", "Exterior", "Interior", "Dual-Use"];

    const filtered = chemicals.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.used_for.some(u => u.toLowerCase().includes(search.toLowerCase()));

        // Show Dual-Use chemicals in both Exterior and Interior views
        const matchesCat = filter === "All" ||
            c.category === filter ||
            (c.category === "Dual-Use" && (filter === "Exterior" || filter === "Interior"));

        return matchesSearch && matchesCat;
    });

    const handleCardClick = (c: Chemical) => {
        // If this is a new "Inventory Only" product, go straight to Edit modal
        // instead of opening the detail view with empty info.
        if ((c as any).is_inventory_only) {
            setEditingChemical({
                ...c,
                id: undefined, // Ensure it treats as a new library entry
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
            setEditDialogOpen(true);
            return;
        }
        setSelectedChemical(c);
        setDetailOpen(true);
    };

    const handleDeleteChemical = async (id: string) => {
        const success = await deleteChemical(id);
        if (!success) {
            toast({ title: "Error", description: "Failed to delete chemical.", variant: "destructive" });
        } else {
            toast({ title: "Deleted", description: "Chemical removed from library.", className: "bg-red-900 border-red-800 text-white" });
            setChemicals(prev => prev.filter(c => c.id !== id));
        }
    };

    return (
        <div className="min-h-screen bg-black pb-20">
            <PageHeader title="Chemical Cards" />

            <main className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Header Actions */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 uppercase tracking-tight">Chemical Knowledge Base</h1>
                            <p className="text-zinc-500 text-sm font-medium">Master every product in our arsenal.</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { role: 'admin', topicId: 'chemical-workflow' } }))}
                            className="text-zinc-600 hover:text-blue-400 h-10 w-10 shrink-0"
                            title="Help Guide"
                        >
                            <HelpCircle className="w-6 h-6" />
                        </Button>
                    </div>
                    <div className="flex flex-col gap-2 w-full lg:w-auto">
                        <div className="grid grid-cols-3 sm:flex sm:w-auto gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => navigate('/dilution-calculator')} 
                                className="h-9 px-1 sm:px-3 sm:h-10 border-green-500/30 bg-green-500/5 hover:bg-green-500/10 text-green-400 border font-bold text-[11px] sm:text-xs"
                            >
                                <Calculator className="w-3.5 h-3.5 mr-1 sm:mr-2" /> <span>Calc</span>
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={() => navigate('/chemical-training')} 
                                className="h-9 px-1 sm:px-3 sm:h-10 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 border font-bold text-[11px] sm:text-xs"
                            >
                                <Beaker className="w-3.5 h-3.5 mr-1 sm:mr-2" /> <span>Decision</span>
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={() => navigate('/inventory-control?chart=modal')} 
                                className="h-9 px-1 sm:px-3 sm:h-10 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-600 hover:text-white text-emerald-400 border font-bold text-[11px] sm:text-xs"
                            >
                                <Printer className="w-3.5 h-3.5 mr-1 sm:mr-2" /> <span className="truncate">Ref Chart</span>
                            </Button>
                        </div>
                        {isAdmin && (
                            <div className="grid grid-cols-3 sm:flex sm:w-auto gap-2">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setLabelMakerOpen(true)} 
                                    className="h-9 px-1 sm:px-3 sm:h-10 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400 border font-bold text-[11px] sm:text-xs"
                                >
                                    <Tag className="w-3.5 h-3.5 mr-1 sm:mr-2" /> Labels
                                </Button>
                                <Button 
                                    onClick={() => setMixedLabelMakerOpen(true)} 
                                    className="h-9 px-1 sm:px-3 sm:h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[11px] sm:text-[10px] shadow-lg shadow-indigo-600/20"
                                >
                                    <Printer className="w-3.5 h-3.5 mr-1" /> Mixed
                                </Button>
                                <Button 
                                    onClick={() => {
                                        setEditingChemical({
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
                                        setEditDialogOpen(true);
                                    }} 
                                    className="h-9 px-1 sm:px-3 sm:h-10 bg-zinc-100 hover:bg-white text-black font-black uppercase tracking-widest text-[11px] sm:text-[10px]"
                                >
                                    <Plus className="w-4 h-4 mr-0 sm:mr-2" /> <span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="relative flex-1 z-10">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                            placeholder="Search chemicals, uses, or brands..."
                            className="pl-10 bg-zinc-900 border-zinc-800 text-white"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Tabs value={filter} onValueChange={setFilter} className="w-full md:w-auto">
                        <TabsList className="bg-zinc-900 border border-zinc-800">
                            {categories.map(cat => (
                                <TabsTrigger key={cat} value={cat} className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                                    {cat}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="text-center py-20 text-zinc-500">Loading chemicals...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filtered.map(c => (
                            <ChemicalCard
                                key={c.id}
                                chemical={c}
                                onClick={() => handleCardClick(c)}
                                isAdmin={isAdmin}
                                onDelete={handleDeleteChemical}
                                onUpdate={handleChemicalUpdate}
                            />
                        ))}
                        {filtered.length === 0 && (
                            <div className="col-span-full text-center py-20 text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20 backdrop-blur-sm">
                                <Search className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                                <p className="text-zinc-400 font-bold">No results found matching "{search}"</p>
                                <p className="text-xs text-zinc-600 mt-1 mb-6">Try searching for a different term or add a new chemical.</p>
                                {isAdmin && (
                                    <Button 
                                        variant="outline" 
                                        className="border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300"
                                        onClick={() => {
                                            setEditingChemical({
                                                name: search, // Carry search term over
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
                                            setEditDialogOpen(true);
                                        }}
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Add New Chemical
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            <ChemicalDetail
                chemical={selectedChemical}
                open={detailOpen}
                onOpenChange={setDetailOpen}
                isAdmin={isAdmin}
                onUpdate={handleChemicalUpdate}
            />

            <ChemicalLabelMaker
                open={labelMakerOpen}
                onOpenChange={setLabelMakerOpen}
                initialChemical={selectedChemical}
            />

            <MixedLabelMaker 
                open={mixedLabelMakerOpen}
                onOpenChange={setMixedLabelMakerOpen}
            />

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent 
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                    className="max-w-4xl h-[90vh] flex flex-col bg-zinc-950 border-zinc-800 text-white p-6"
                >
                    {editingChemical && (
                        <ChemicalEditForm
                            initialData={editingChemical}
                            onSave={() => {
                                setEditDialogOpen(false);
                                loadChemicals();
                            }}
                            onCancel={() => setEditDialogOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
