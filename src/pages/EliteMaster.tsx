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
import { 
    Plus, 
    Save, 
    Trash2, 
    ArrowUp, 
    ArrowDown, 
    Edit2, 
    Loader2, 
    RefreshCw, 
    ChevronUp, 
    ChevronDown,
    Layout
} from "lucide-react";
import { cn } from "@/lib/utils";

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
            // Filter out internal training content, only show blog-ready content
            const blogOnly = (data || []).filter(i => i.category !== 'Chemical Training');
            // Sort by current sort_order
            setItems(blogOnly.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
        } catch (e) {
            toast({ 
                title: "Database Sync Interrupted", 
                description: "We couldn't reach your story archives. Please check your connection.",
                variant: "destructive" 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleMove = (idx: number, dir: 'up' | 'down') => {
        const nextIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (nextIdx < 0 || nextIdx >= items.length) return;
        
        const newItems = [...items];
        const temp = newItems[idx];
        newItems[idx] = newItems[nextIdx];
        newItems[nextIdx] = temp;
        
        setItems(newItems);
        
        // Visual feedback
        toast({
            title: "Order Updated",
            description: `Moved "${temp.title}" ${dir}. Remember to Save Layout.`,
            duration: 1500
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update all sort_order values to match current array position
            const updates = items.map((it, i) => upsertLibraryItem({ ...it, sort_order: i + 1 }));
            await Promise.all(updates);
            
            toast({ 
                title: "Layout Secured", 
                description: "Your blog order has been permanently synchronized to the database.",
                variant: "default" 
            });
            await loadData();
        } catch (e) {
            toast({ 
                title: "Save Failed", 
                description: "Failed to persist changes. Please try again.",
                variant: "destructive" 
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Are you absolutely sure you want to delete "${title}"? This cannot be undone.`)) return;
        
        try {
            if (await deleteLibraryItem(id)) {
                setItems(prev => prev.filter(i => i.id !== id));
                toast({ title: "Story Erased", description: "The post has been removed from your archives." });
            }
        } catch (e) {
            toast({ title: "Delete Error", variant: "destructive" });
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-zinc-100 flex flex-col font-sans">
            <PageHeader title="Elite Story Master" />
            
            <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div className="space-y-1">
                        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white flex items-center gap-4">
                            Story Control
                            {items.length > 0 && (
                                <span className="text-sm not-italic font-bold bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20">
                                    {items.length} ARCHIVES
                                </span>
                            )}
                        </h1>
                        <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px]">Prime Auto Detail // Master Blog Architect</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button 
                            onClick={loadData} 
                            variant="outline" 
                            size="icon" 
                            className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 transition-colors"
                        >
                            <RefreshCw className={cn("w-4 h-4 text-zinc-400", isLoading && "animate-spin")} />
                        </Button>
                        <Button 
                            onClick={handleSave} 
                            disabled={isSaving || items.length === 0} 
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black italic uppercase tracking-wider px-6 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                        >
                            {isSaving ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> SECURING...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" /> SAVE LAYOUT</>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Content Grid */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                        <p className="text-zinc-500 font-black uppercase tracking-widest text-xs animate-pulse">Synchronizing Archives...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-zinc-900 rounded-[2.5rem] bg-zinc-950/20">
                        <Layout className="w-16 h-16 text-zinc-800 mb-6" />
                        <h3 className="text-xl font-bold text-zinc-400 mb-2">No Stories Detected</h3>
                        <p className="text-zinc-600 max-w-xs text-center text-sm mb-8 italic">Your blog library is currently empty. Add content from the Prime Blog page to get started.</p>
                        <Button onClick={() => window.location.href='/blog'} variant="outline" className="border-zinc-800 text-zinc-400">Go to Blog Page</Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div 
                                key={item.id} 
                                className="group flex items-center gap-6 p-5 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl hover:bg-zinc-900/80 hover:border-indigo-500/30 transition-all duration-300"
                            >
                                {/* Order Controls */}
                                <div className="flex flex-col gap-1">
                                    <button 
                                        onClick={() => handleMove(index, 'up')}
                                        disabled={index === 0}
                                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-white disabled:opacity-0 transition-all"
                                        title="Move Up"
                                    >
                                        <ChevronUp className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => handleMove(index, 'down')}
                                        disabled={index === items.length - 1}
                                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-white disabled:opacity-0 transition-all"
                                        title="Move Down"
                                    >
                                        <ChevronDown className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Content Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-[9px] font-black bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded tracking-widest uppercase">
                                            #{index + 1}
                                        </span>
                                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                                            {item.category || 'General'}
                                        </span>
                                    </div>
                                    <h4 className="text-xl font-black text-zinc-100 uppercase italic tracking-tighter truncate group-hover:text-white transition-colors">
                                        {item.title}
                                    </h4>
                                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-[0.1em] truncate opacity-60">
                                        Last Updated: {new Date(item.created_at || '').toLocaleDateString()}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleDelete(item.id, item.title || '')}
                                        className="h-10 w-10 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Bottom Stats */}
                <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-700">
                    <div>Prime Systems v6 // Supabase Powered</div>
                    <div className="flex items-center gap-4">
                        <span>Total Items: {items.length}</span>
                        <span>Sort Order: Active</span>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
