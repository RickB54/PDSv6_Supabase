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
import { Plus, Save, Trash2, ArrowUp, ArrowDown, Edit2, Globe, Lock, Pin, Loader2, RefreshCw } from "lucide-react";

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
            const blogOnly = data.filter(i => i.category !== 'Chemical Training');
            setItems(blogOnly.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
        } catch (e) {
            toast({ title: "Load Error", variant: "destructive" });
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
            toast({ title: "Order Saved" });
            loadData();
        } catch (e) {
            toast({ title: "Save Error", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete post?")) return;
        if (await deleteLibraryItem(id)) {
            setItems(items.filter(i => i.id !== id));
            toast({ title: "Deleted" });
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <PageHeader title="Elite Master Hub" />
            
            <main className="flex-1 max-w-4xl mx-auto w-full p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-black italic uppercase">Story Control</h1>
                    <div className="flex gap-2">
                        <Button onClick={loadData} variant="outline" size="icon"><RefreshCw className={isLoading ? "animate-spin" : ""} /></Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 font-bold">
                            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} SAVE ORDER
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-20 opacity-50">Loading archives...</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-zinc-800 rounded-3xl">No stories found.</div>
                ) : (
                    <div className="space-y-2">
                        {items.map((item, i) => (
                            <div key={item.id} className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl group">
                                <div className="flex flex-col gap-1">
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleMove(i, 'up')} disabled={i === 0}><ArrowUp /></Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleMove(i, 'down')} disabled={i === items.length - 1}><ArrowDown /></Button>
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold uppercase tracking-tight">{item.title}</div>
                                    <div className="text-[10px] text-zinc-500 font-bold uppercase">{item.category}</div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)} className="text-zinc-600 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
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
