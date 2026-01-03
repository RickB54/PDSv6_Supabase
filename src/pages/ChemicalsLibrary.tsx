import { PageHeader } from "@/components/PageHeader";
import { ChemicalCard } from "@/components/chemicals/ChemicalCard";
import { ChemicalDetail } from "@/components/chemicals/ChemicalDetail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getChemicals, deleteChemical } from "@/lib/chemicals";
import { Chemical } from "@/types/chemicals";
import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

export default function ChemicalsLibrary() {
    const navigate = useNavigate();
    const [chemicals, setChemicals] = useState<Chemical[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChemical, setSelectedChemical] = useState<Chemical | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");

    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const user = getCurrentUser();
        setIsAdmin(user?.role === 'admin' || user?.role === 'owner');

        // Seed/Fetch data
        loadChemicals();
    }, []);

    const loadChemicals = async () => {
        setLoading(true);
        const data = await getChemicals();
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Chemical Knowledge Base</h1>
                        <p className="text-zinc-400">Master every product in our arsenal.</p>
                    </div>
                    {isAdmin && (
                        <Button onClick={() => navigate('/admin/chemicals')} className="bg-purple-600 hover:bg-purple-700">
                            <Plus className="w-4 h-4 mr-2" /> Add Chemical
                        </Button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
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
                            <div className="col-span-full text-center py-20 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                                <p>No chemicals found matching your search.</p>
                                {isAdmin && <Button variant="link" onClick={() => navigate('/admin/chemicals')}>Add New Chemical</Button>}
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
        </div>
    );
}
