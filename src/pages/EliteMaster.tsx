import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
    getLibraryItems, 
    upsertLibraryItem, 
    deleteLibraryItem, 
    LibraryItem
} from "@/lib/supa-data";
import { Save, RefreshCw, Loader2, Trash2 } from "lucide-react";

export default function EliteMaster() {
    const { toast } = useToast();
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await getLibraryItems();
            const list = Array.isArray(data) ? data : [];
            const blogOnly = list.filter(i => i && i.category !== 'Chemical Training');
            setItems(blogOnly.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
        } catch (e) {
            toast({ title: "Sync Error", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleMove = (idx: number, dir: 'up' | 'down') => {
        const nextIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (nextIdx < 0 || nextIdx >= items.length) return;
        const newItems = [...items];
        [newItems[idx], newItems[nextIdx]] = [newItems[nextIdx], newItems[idx]];
        setItems(newItems);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await Promise.all(items.map((it, i) => upsertLibraryItem({ ...it, sort_order: i + 1 })));
            toast({ title: "Layout Saved" });
            await loadData();
        } catch (e) {
            toast({ title: "Save Error", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this story?")) return;
        if (await deleteLibraryItem(id)) {
            setItems(prev => prev.filter(i => i.id !== id));
            toast({ title: "Deleted" });
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans">
            <PageHeader title="Elite Story Master" />
            
            <main className="flex-1 w-full max-w-4xl mx-auto p-6 md:p-12">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Story Control</h1>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Manage Blog Archives</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={loadData} variant="outline" size="icon" className="bg-zinc-900 border-zinc-800">
                            <RefreshCw className={isLoading ? "animate-spin" : ""} size={16} />
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 font-bold uppercase italic text-xs px-6">
                            {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save className="mr-2" size={14} />} 
                            SAVE ORDER
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-20 text-center text-zinc-600 font-bold uppercase tracking-widest text-xs animate-pulse">
                        Synchronizing Database...
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-zinc-900 rounded-3xl text-zinc-500">
                        No stories found in the library.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl group hover:border-blue-500/50 transition-colors">
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => handleMove(idx, 'up')} disabled={idx === 0} className="p-1 hover:text-blue-400 disabled:opacity-0">▲</button>
                                    <button onClick={() => handleMove(idx, 'down')} disabled={idx === items.length - 1} className="p-1 hover:text-blue-400 disabled:opacity-0">▼</button>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-0.5">{item.category || 'General'}</div>
                                    <div className="text-lg font-black italic uppercase tracking-tight truncate">{item.title}</div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-zinc-600 hover:text-red-500">
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
