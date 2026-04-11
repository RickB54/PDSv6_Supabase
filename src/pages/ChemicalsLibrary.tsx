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
import { Plus, Search, Tag, HelpCircle, Beaker, Calculator, Printer, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { cleanupInventoryDuplicates } from "@/lib/inventory-data";
import { Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChemicalEditForm } from "@/components/chemicals/ChemicalEditForm";
import { Badge } from "@/components/ui/badge";
import { useDemoMode } from "@/contexts/DemoContext";
import { MOCK_CHEMICAL_LIBRARY } from "@/lib/demoMockData";
import RicksTipsModal from "@/components/chemicals/RicksTipsModal";

export default function ChemicalsLibrary() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
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
    const [sort, setSort] = useState<string>("brand");
    const [showRicksTips, setShowRicksTips] = useState(false);

    const [isAdmin, setIsAdmin] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const { isDemoMode } = useDemoMode();

    useEffect(() => {
        const user = getCurrentUser();
        setIsAdmin(user?.role === 'admin' || user?.role === 'owner' || isDemoMode);
        loadChemicals();
    }, [isDemoMode]);

    // Handle URL param-triggered modals (from sidebar Label System links)
    useEffect(() => {
        const labels = searchParams.get('labels');
        const mixed = searchParams.get('mixed');
        const pdf = searchParams.get('pdf');
        if (labels === 'open') {
            setLabelMakerOpen(true);
            searchParams.delete('labels');
            setSearchParams(searchParams, { replace: true });
        }
        if (mixed === 'open') {
            setMixedLabelMakerOpen(true);
            searchParams.delete('mixed');
            setSearchParams(searchParams, { replace: true });
        }
        if (pdf === 'all' && !loading) {
            handlePdfAll();
            searchParams.delete('pdf');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, loading]);

    const loadChemicals = async () => {
        setLoading(true);
        if (isDemoMode) {
            setChemicals(MOCK_CHEMICAL_LIBRARY as any);
            setLoading(false);
            return MOCK_CHEMICAL_LIBRARY;
        }
        const data = await getCombinedSelectableProducts();
        setChemicals(data);
        setLoading(false);
        return data;
    };

    const handleChemicalUpdate = async () => {
        const data = await loadChemicals();
        if (selectedChemical) {
            const fresh = data.find(c => c.id === selectedChemical.id);
            if (fresh) setSelectedChemical(fresh as Chemical);
        }
    };

    const categories = ["All", "Exterior", "Interior", "Dual-Use"];

    const sortedAndFiltered = [...chemicals]
        .filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                (c.brand && c.brand.toLowerCase().includes(search.toLowerCase())) ||
                c.used_for.some(u => u.toLowerCase().includes(search.toLowerCase()));

            // Show Dual-Use chemicals in both Exterior and Interior views
            const matchesCat = filter === "All" ||
                c.category === filter ||
                (c.category === "Dual-Use" && (filter === "Exterior" || filter === "Interior"));

            // BRAND FILTERING
            if (sort.startsWith('brand:')) {
                const targetBrand = sort.split(':')[1];
                if ((c.brand || "Other / No Brand") !== targetBrand) return false;
            }

            return matchesSearch && matchesCat;
        })
        .sort((a, b) => {
            if (sort === "brand" || sort.startsWith('brand:')) {
                const brandA = (a.brand || "Z").toLowerCase();
                const brandB = (b.brand || "Z").toLowerCase();
                if (brandA !== brandB) return brandA.localeCompare(brandB);
                return a.name.localeCompare(b.name);
            }
            return a.name.localeCompare(b.name);
        });

    // Extract unique brands for jump-to
    const handleCleanup = async () => {
        if (!isAdmin) return;
        if (!window.confirm("This will merge duplicate inventory items and prioritize cards with AI data/ratios. Proceed?")) return;
        
        setIsCleaning(true);
        try {
            const { deleted, linked } = await cleanupInventoryDuplicates();
            toast({ 
                title: "Deduplication Complete", 
                description: `Merged ${deleted} duplicates and linked ${linked} products.`,
                className: "bg-green-600 text-white"
            });
            handleChemicalUpdate(); // Re-fetch cards
        } catch (err) {
            console.error("Cleanup failed", err);
            toast({ title: "Cleanup Failed", variant: "destructive" });
        } finally {
            setIsCleaning(false);
        }
    };

    const uniqueBrands = Array.from(new Set(chemicals.map(c => c.brand || "Other / No Brand"))).sort();

    const handlePdfAll = () => {
        if (sortedAndFiltered.length === 0) {
            toast({ title: "No Chemicals", description: "There are no chemicals in the current view to print.", variant: "destructive" });
            return;
        }
        import('jspdf').then(({ default: jsPDF }) => {
            import('@/lib/print-chemical').then(({ printChemicalCard }) => {
                const doc = new jsPDF();
                sortedAndFiltered.forEach((c, idx) => {
                    if (idx > 0) doc.addPage();
                    printChemicalCard(c, doc, 20);
                });
                doc.save(`Prime_Chemical_Cards_Batch_${new Date().toLocaleDateString()}.pdf`);
                toast({ title: "Print Generated", description: `Prepared ${sortedAndFiltered.length} chemical cards.`, className: "bg-indigo-900 border-indigo-800 text-white" });
            });
        });
    };

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
                            onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { role: 'admin', topicId: 'chemical-cards-guide' } }))}
                            className="text-zinc-600 hover:text-blue-400 h-10 w-10 shrink-0"
                            title="Help Guide"
                        >
                            <HelpCircle className="w-6 h-6" />
                        </Button>
                    </div>
                    <div className="flex flex-col gap-2 w-full lg:w-auto">
                        {/* Row 1: Navigation Tools */}
                        <div className="grid grid-cols-3 gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => navigate('/dilution-calculator')} 
                                className="h-9 px-2 sm:px-3 sm:h-10 border-green-500/30 bg-green-500/5 hover:bg-green-500/10 text-green-400 font-bold text-[11px] sm:text-xs"
                            >
                                <Calculator className="w-3.5 h-3.5 mr-1 sm:mr-2 shrink-0" /> <span className="truncate">Calc</span>
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={() => navigate('/chemical-training')} 
                                className="h-9 px-2 sm:px-3 sm:h-10 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 font-bold text-[11px] sm:text-xs"
                            >
                                <Beaker className="w-3.5 h-3.5 mr-1 sm:mr-2 shrink-0" /> <span className="truncate">Decision</span>
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={() => navigate('/inventory-control?chart=modal')} 
                                className="h-9 px-2 sm:px-3 sm:h-10 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-600 hover:text-white text-emerald-400 font-bold text-[11px] sm:text-xs"
                            >
                                <Printer className="w-3.5 h-3.5 mr-1 sm:mr-2 shrink-0" /> <span className="truncate">Ref Chart</span>
                            </Button>
                        </div>
                        {isAdmin && (
                            /* Row 2: Admin Actions */
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCleanup}
                                        disabled={isCleaning}
                                        className="flex-1 h-9 px-2 sm:px-3 sm:h-10 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 font-bold text-[11px] sm:text-xs"
                                        title="Cleanup Duplicate Inventory Items"
                                    >
                                        {isCleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                                        Fix Duplicates
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => window.alert("Smart Sync: Fix Duplicates\n\nThis tool merges duplicate records and auto-links unlinked items to their Knowledge Base cards.")}
                                        className="h-9 w-6 text-amber-500/50 hover:text-amber-400 shrink-0"
                                    >
                                        <HelpCircle className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Button 
                                    variant="outline"
                                    onClick={() => setShowRicksTips(true)} 
                                    className="h-9 px-2 sm:px-3 sm:h-10 border-purple-500/30 bg-purple-500/5 hover:bg-purple-600 hover:text-white text-purple-400 font-bold text-[11px] sm:text-xs"
                                >
                                    <Zap className="w-3.5 h-3.5 mr-1 sm:mr-2 shrink-0" /> <span className="truncate">Rick's Tips</span>
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={handlePdfAll}
                                    className="h-9 px-2 sm:px-3 sm:h-10 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 font-bold text-[11px] sm:text-xs"
                                >
                                    <Printer className="w-3.5 h-3.5 mr-1 sm:mr-2 shrink-0" /> <span className="truncate">PDF All</span>
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
                                    className="h-9 px-2 sm:px-3 sm:h-10 bg-zinc-100 hover:bg-white text-black font-black uppercase tracking-widest text-[11px] sm:text-[10px]"
                                >
                                    <Plus className="w-4 h-4 mr-1 sm:mr-2 shrink-0" /> <span className="truncate">Add Product</span>
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
                    
                    {/* NEW: Sort Controls (Matches Inventory Style) */}
                    <div className="flex items-center gap-3 no-print">
                        <div className="bg-zinc-900 border border-zinc-800 h-10 px-3 rounded-lg flex items-center gap-2">
                             <Select value={sort} onValueChange={(val: string) => setSort(val)}>
                                <SelectTrigger className="w-[120px] sm:w-[160px] border-none bg-transparent hover:bg-transparent text-zinc-400 font-bold uppercase text-[9px] tracking-widest h-auto p-0 shadow-none focus-visible:ring-0">
                                   <div className="flex items-center gap-1.5">
                                        <TrendingUp className="h-3 w-3 text-indigo-400" />
                                        <span className="truncate uppercase">{sort === 'brand' ? 'By Brand' : (sort === 'name' ? 'A-Z Name' : sort.split(':')[1])}</span>
                                   </div>
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-950 border-zinc-900 text-white max-h-[300px]">
                                    <SelectItem value="brand" className="group text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                                        By Brand (All) <span className="ml-1 text-zinc-500 group-data-[highlighted]:text-white transition-colors">({chemicals.length})</span>
                                    </SelectItem>
                                    <SelectItem value="name" className="text-[10px] font-bold uppercase tracking-widest">A-Z List</SelectItem>
                                    <div className="px-2 py-1.5 text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] border-t border-zinc-900 mt-1 italic">Jump to Brand</div>
                                    {uniqueBrands.map(b => {
                                        const count = chemicals.filter(c => (c.brand || "Other / No Brand") === b).length;
                                        return (
                                            <SelectItem key={b} value={`brand:${b}`} className="group text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:text-white">
                                                {b} <span className="ml-1 text-zinc-500 group-data-[highlighted]:text-zinc-200 font-normal transition-colors">({count})</span>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                             </Select>
                        </div>
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
                        {sortedAndFiltered.map(c => (
                            <ChemicalCard
                                key={c.id}
                                chemical={c}
                                onClick={() => handleCardClick(c)}
                                isAdmin={isAdmin}
                                onDelete={handleDeleteChemical}
                                onUpdate={handleChemicalUpdate}
                            />
                        ))}
                        {sortedAndFiltered.length === 0 && (
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

            <RicksTipsModal
                open={showRicksTips}
                onOpenChange={setShowRicksTips}
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
