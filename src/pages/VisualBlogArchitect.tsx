import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
    getLibraryItems, 
    upsertLibraryItem, 
    deleteLibraryItem, 
    LibraryItem, 
    uploadLibraryFile 
} from "@/lib/supa-data";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { 
    Save, 
    Loader2, 
    Search, 
    Edit2, 
    Trash2, 
    Globe, 
    Lock, 
    Pin,
    Sparkles,
    Image as ImageIcon,
    Plus,
    RefreshCw,
    ArrowUp,
    ArrowDown,
    PlusCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BlogAIAssistant } from "@/components/BlogAIAssistant";

export default function VisualBlogArchitect() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
    const [formData, setFormData] = useState<Partial<LibraryItem>>({});
    const [isUploading, setIsUploading] = useState(false);
    const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setIsLoading(true);
        try {
            const data = await getLibraryItems();
            // Filter out non-blog items
            const blogItems = data.filter(item => item.category !== 'Chemical Training');

            // Sort: Pinned first, then by sort_order
            const sortedItems = [...blogItems].sort((a, b) => {
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;
                if (a.sort_order !== undefined && b.sort_order !== undefined) {
                    return a.sort_order - b.sort_order;
                }
                if (a.sort_order !== undefined) return -1;
                if (b.sort_order !== undefined) return 1;
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            });

            setItems(sortedItems);
        } catch (error) {
            console.error("Failed to load blog items:", error);
            toast({ title: "Error loading blog items", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newItems = [...items];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        if (targetIndex < 0 || targetIndex >= newItems.length) return;
        
        const temp = newItems[index];
        newItems[index] = newItems[targetIndex];
        newItems[targetIndex] = temp;
        
        setItems(newItems);
    };

    const handleSaveOrder = async () => {
        setIsSaving(true);
        try {
            const updates = items.map((item, index) => 
                upsertLibraryItem({ ...item, sort_order: index + 1 })
            );
            await Promise.all(updates);
            toast({ title: "Order Saved Successfully" });
            await loadItems();
        } catch (error) {
            toast({ title: "Failed to save order", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateNew = () => {
        setEditingItem(null);
        setFormData({
            title: "New Blog Post",
            description: "",
            category: "General",
            type: "image",
            is_published: false,
            is_pinned: false,
            is_verified: true
        });
        setIsEditModalOpen(true);
    };

    const handleEdit = (item: LibraryItem) => {
        setEditingItem(item);
        setFormData({ ...item });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!formData.title) return;
        setIsSaving(true);
        try {
            const res = await upsertLibraryItem({ ...formData, is_verified: true } as LibraryItem);
            if (res.success) {
                toast({ title: "Post Updated" });
                setIsEditModalOpen(false);
                await loadItems();
            }
        } catch (error) {
            toast({ title: "Save Failed", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to permanently delete this post?")) return;
        const success = await deleteLibraryItem(id);
        if (success) {
            toast({ title: "Post Deleted" });
            setItems(prev => prev.filter(i => i.id !== id));
        } else {
            toast({ title: "Delete Failed", variant: "destructive" });
        }
    };

    const toggleStatus = async (item: LibraryItem, field: 'is_published' | 'is_pinned') => {
        const updated = { ...item, [field]: !item[field] };
        const res = await upsertLibraryItem(updated);
        if (res.success) {
            setItems(prev => prev.map(i => i.id === item.id ? updated : i));
            toast({ title: "Status Updated" });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const { url, error } = await uploadLibraryFile(file);
            if (error) throw new Error(error);
            if (url) {
                setFormData(prev => ({ ...prev, resource_url: url, thumbnail_url: url }));
                toast({ title: "Image Uploaded" });
            }
        } catch (err: any) {
            toast({ title: "Upload Failed", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const filteredItems = items.filter(item =>
        (item.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#020202] text-zinc-100 flex flex-col font-sans">
            <PageHeader title="Blog Layout Architect" />

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black tracking-tighter uppercase italic text-white flex items-center gap-4">
                            Visual Blog Architect
                            <span className="text-xl text-indigo-500/40 not-italic font-medium bg-indigo-500/5 px-4 py-1 rounded-full border border-indigo-500/10">
                                {items.length} Posts
                            </span>
                        </h1>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                            <span className="w-8 h-[1px] bg-indigo-500/50"></span>
                            Refined Storytelling Hub
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            <Input
                                placeholder="Search the archives..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-zinc-900/40 border-zinc-800 pl-12 h-14 w-full sm:w-80 rounded-2xl focus:ring-indigo-500/20 text-sm font-medium"
                            />
                        </div>
                        <Button
                            onClick={handleCreateNew}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl h-14 px-8 shadow-xl shadow-emerald-600/10 active:scale-95 transition-all gap-2"
                        >
                            <PlusCircle className="w-5 h-5" />
                            NEW STORY
                        </Button>
                        <Button
                            onClick={handleSaveOrder}
                            disabled={isSaving || isLoading}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl h-14 px-8 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all gap-2"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            SAVE LAYOUT
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-6">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <RefreshCw className="w-6 h-6 text-indigo-500/40" />
                            </div>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 animate-pulse">Syncing Content Vault</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="py-32 text-center border-2 border-dashed border-zinc-900 rounded-[50px] bg-zinc-950/50 flex flex-col items-center justify-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center">
                            <ImageIcon className="w-10 h-10 text-zinc-700" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-zinc-600 uppercase italic tracking-tight">The Library is Quiet</h3>
                            <p className="text-zinc-700 text-xs font-bold uppercase tracking-widest">No blog posts found in the current view</p>
                        </div>
                        <Button onClick={handleCreateNew} variant="outline" className="mt-4 rounded-2xl border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 h-12 px-10">
                            START YOUR FIRST STORY
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredItems.map((item, index) => (
                            <PostCard 
                                key={item.id} 
                                item={item} 
                                index={index}
                                isFirst={index === 0}
                                isLast={index === filteredItems.length - 1}
                                onMove={(dir) => moveItem(index, dir)}
                                onEdit={() => handleEdit(item)}
                                onDelete={() => handleDelete(item.id)}
                                onToggleStatus={(f) => toggleStatus(item, f)}
                            />
                        ))}
                    </div>
                )}
            </main>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-3xl bg-[#080808] border-zinc-800 text-white rounded-[40px] p-0 overflow-hidden shadow-2xl">
                    <DialogHeader className="p-10 bg-zinc-900/30 border-b border-zinc-800/50">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-indigo-600/10 rounded-3xl flex items-center justify-center border border-indigo-500/20">
                                <Edit2 className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic">Polish Content</DialogTitle>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1">Refining your digital presence</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-10 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-1">STORY TITLE</Label>
                                <Input
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="bg-zinc-900/50 border-zinc-800 rounded-2xl h-16 font-black text-lg text-white focus:ring-indigo-500/20 px-6"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-1">CATEGORY</Label>
                                <Input
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="bg-zinc-900/50 border-zinc-800 rounded-2xl h-16 font-black text-lg text-white focus:ring-indigo-500/20 px-6"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-1">THE NARRATIVE</Label>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setIsAIAssistantOpen(true)}
                                    className="h-8 px-4 text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/5 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/20 transition-all"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" /> AI STRATEGIST
                                </Button>
                            </div>
                            <Textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="bg-zinc-900/50 border-zinc-800 rounded-3xl min-h-[250px] font-medium text-zinc-300 leading-relaxed focus:ring-indigo-500/20 p-8 text-base"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-1">COVER MEDIA</Label>
                            <div className="flex items-center gap-6 p-6 bg-zinc-900/20 rounded-3xl border border-zinc-800/50">
                                {formData.resource_url ? (
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-indigo-500/20 shrink-0 shadow-2xl">
                                        <img src={formData.resource_url} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-24 h-24 rounded-2xl bg-zinc-900 flex items-center justify-center border border-zinc-800 shrink-0">
                                        <ImageIcon className="w-8 h-8 text-zinc-700" />
                                    </div>
                                )}
                                <div className="flex-1 space-y-4">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Select a high-resolution image for your blog feed</p>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                        className="bg-zinc-900 border-zinc-800 rounded-xl h-12 file:bg-zinc-800 file:border-none file:text-[10px] file:font-black file:uppercase file:tracking-widest file:text-white file:px-6 file:h-full cursor-pointer hover:border-indigo-500/30 transition-all"
                                    />
                                    {isUploading && <p className="text-[10px] text-indigo-400 animate-pulse font-black uppercase tracking-[0.2em]">Uploading Media Assets...</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-10 bg-zinc-900/30 border-t border-zinc-800/50 gap-4">
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="rounded-2xl h-14 px-10 font-bold text-zinc-500 hover:text-white hover:bg-zinc-900">
                            DISCARD CHANGES
                        </Button>
                        <Button 
                            onClick={handleSaveEdit} 
                            disabled={isSaving || isUploading} 
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl h-14 px-12 shadow-2xl shadow-indigo-600/30 transition-all flex-1"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'COMMIT UPDATES'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BlogAIAssistant
                isOpen={isAIAssistantOpen}
                onOpenChange={setIsAIAssistantOpen}
                currentTitle={formData.title}
                currentDescription={formData.description}
                onApplySuggestion={(text, imageUrl) => {
                    setFormData(prev => ({ 
                        ...prev, 
                        description: text,
                        resource_url: imageUrl || prev.resource_url,
                        thumbnail_url: imageUrl || prev.thumbnail_url
                    }));
                    setIsAIAssistantOpen(false);
                }}
            />

            <Footer />
        </div>
    );
}

function PostCard({ item, index, isFirst, isLast, onMove, onEdit, onDelete, onToggleStatus }: {
    item: LibraryItem,
    index: number,
    isFirst: boolean,
    isLast: boolean,
    onMove: (dir: 'up' | 'down') => void,
    onEdit: () => void,
    onDelete: () => void,
    onToggleStatus: (field: 'is_published' | 'is_pinned') => void
}) {
    return (
        <div className="group flex items-center gap-6 p-6 rounded-[32px] border border-zinc-900 bg-zinc-900/10 hover:bg-zinc-900/30 hover:border-zinc-800 transition-all duration-500">
            {/* Reorder Controls */}
            <div className="flex flex-col gap-2 shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    disabled={isFirst}
                    onClick={() => onMove('up')}
                    className={cn(
                        "h-10 w-10 rounded-2xl border border-zinc-800/50 bg-zinc-900/50 text-zinc-600 hover:text-indigo-400 transition-all",
                        isFirst && "opacity-0 cursor-default"
                    )}
                >
                    <ArrowUp className="w-5 h-5" />
                </Button>
                <div className="flex items-center justify-center">
                   <span className="text-[10px] font-black text-zinc-800 group-hover:text-zinc-600 transition-colors uppercase italic">{index + 1}</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    disabled={isLast}
                    onClick={() => onMove('down')}
                    className={cn(
                        "h-10 w-10 rounded-2xl border border-zinc-800/50 bg-zinc-900/50 text-zinc-600 hover:text-indigo-400 transition-all",
                        isLast && "opacity-0 cursor-default"
                    )}
                >
                    <ArrowDown className="w-5 h-5" />
                </Button>
            </div>

            {/* Thumbnail */}
            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 shadow-lg group-hover:border-indigo-500/30 transition-colors">
                {item.resource_url ? (
                    <img src={item.resource_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-800">
                        <ImageIcon className="w-8 h-8" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h4 className="font-black text-xl text-zinc-100 truncate uppercase tracking-tighter italic mb-1 group-hover:text-white transition-colors">
                    {item.title}
                </h4>
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/80">{item.category}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                        {new Date(item.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {item.is_pinned && (
                        <span className="flex items-center gap-2 text-[9px] font-black text-amber-500 bg-amber-500/5 px-4 py-1 rounded-full border border-amber-500/20 uppercase tracking-widest animate-in fade-in zoom-in duration-500">
                            <Pin className="w-3 h-3 fill-current" /> PINNED TO TOP
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                <div className="flex items-center bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800 shadow-2xl">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleStatus('is_pinned')}
                        className={cn(
                            "h-12 w-12 rounded-xl transition-all",
                            item.is_pinned ? "text-amber-500 bg-amber-500/10" : "text-zinc-600 hover:text-amber-500 hover:bg-amber-500/10"
                        )}
                        title="Pin Post"
                    >
                        <Pin className={cn("w-5 h-5", item.is_pinned && "fill-current")} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleStatus('is_published')}
                        className={cn(
                            "h-12 w-12 rounded-xl transition-all",
                            item.is_published ? "text-emerald-500 bg-emerald-500/10" : "text-amber-500 bg-amber-500/10"
                        )}
                        title={item.is_published ? "Publicly Visible" : "Private Draft"}
                    >
                        {item.is_published ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    </Button>
                    <div className="w-px h-8 bg-zinc-800 mx-2" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onEdit}
                        className="h-12 w-12 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        title="Edit Content"
                    >
                        <Edit2 className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onDelete}
                        className="h-12 w-12 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Permanently Delete"
                    >
                        <Trash2 className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
