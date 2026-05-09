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
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
    GripVertical, 
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
    RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BlogAIAssistant } from "@/components/BlogAIAssistant";

export default function BlogReorder() {
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

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setIsLoading(true);
        console.log("BlogReorder: Loading items...");
        try {
            const data = await getLibraryItems();
            console.log("BlogReorder: Data received", data?.length);
            
            // We only manage blog-related items here, filtering out Chemical Training
            const blogItems = data.filter(item => item.category !== 'Chemical Training');

            // Sort logic: Pinned first, then by sort_order, then by date
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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setItems((prev) => {
                const oldIndex = prev.findIndex((i) => i.id === active.id);
                const newIndex = prev.findIndex((i) => i.id === over.id);
                return arrayMove(prev, oldIndex, newIndex);
            });
        }
    };

    const handleSaveOrder = async () => {
        setIsSaving(true);
        try {
            // Update sort_order based on current list position
            const updates = items.map((item, index) => 
                upsertLibraryItem({ ...item, sort_order: index + 1 })
            );
            const results = await Promise.all(updates);
            
            const failed = results.filter(r => !r.success);
            if (failed.length > 0) {
                toast({ 
                    title: "Partial Save", 
                    description: `${failed.length} items failed to update.`, 
                    variant: "destructive" 
                });
            } else {
                toast({ title: "Layout Saved Successfully" });
            }
            await loadItems();
        } catch (error) {
            console.error("Save order error:", error);
            toast({ title: "Failed to save layout", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
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
            } else {
                throw new Error("Update failed");
            }
        } catch (error) {
            toast({ title: "Save Failed", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to permanently delete this post?")) return;
        try {
            const success = await deleteLibraryItem(id);
            if (success) {
                toast({ title: "Post Deleted" });
                setItems(prev => prev.filter(i => i.id !== id));
            } else {
                toast({ title: "Delete Failed", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error deleting post", variant: "destructive" });
        }
    };

    const toggleStatus = async (item: LibraryItem, field: 'is_published' | 'is_pinned') => {
        try {
            const updated = { ...item, [field]: !item[field] };
            const res = await upsertLibraryItem(updated);
            if (res.success) {
                setItems(prev => prev.map(i => i.id === item.id ? updated : i));
                toast({ title: "Status Updated" });
            }
        } catch (error) {
            toast({ title: "Update failed", variant: "destructive" });
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
            toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const filteredItems = items.filter(item =>
        (item.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col">
            <PageHeader title="Blog Layout Architect" />

            <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tighter uppercase italic text-white flex items-center gap-3">
                            Visual Architect
                            <span className="text-lg text-indigo-500/40 not-italic font-medium">[{items.length}]</span>
                        </h1>
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                            Manage · Reorder · Polish · Publish
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            <Input
                                placeholder="Search stories..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-zinc-900/50 border-zinc-800 pl-10 h-11 w-64 rounded-xl focus:ring-indigo-500/20"
                            />
                        </div>
                        <Button
                            onClick={handleCreateNew}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl h-11 px-6 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                        >
                            <Plus className="w-4 h-4 mr-2" /> NEW POST
                        </Button>
                        <Button
                            onClick={handleSaveOrder}
                            disabled={isSaving || isLoading}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl h-11 px-6 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            SAVE LAYOUT
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={loadItems}
                            className="h-11 w-11 rounded-xl bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white"
                        >
                            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4 opacity-50">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Synchronizing Vault...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="py-24 text-center border border-dashed border-zinc-800 rounded-[40px] bg-zinc-900/10 flex flex-col items-center justify-center gap-4">
                        <ImageIcon className="w-12 h-12 text-zinc-800 mx-auto" />
                        <div className="space-y-1">
                            <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">The story archive is currently empty</p>
                            <p className="text-zinc-700 text-[10px] font-bold uppercase">Click "NEW POST" above to start building your blog</p>
                        </div>
                        <Button onClick={handleCreateNew} variant="outline" className="mt-4 rounded-xl border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
                            Create Your First Post
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={filteredItems.map(i => i.id).filter(id => !!id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {filteredItems.map((item) => item.id ? (
                                    <SortablePostItem 
                                        key={item.id} 
                                        item={item} 
                                        onEdit={() => handleEdit(item)}
                                        onDelete={() => handleDelete(item.id)}
                                        onToggleStatus={(f) => toggleStatus(item, f)}
                                    />
                                ) : null)}
                            </SortableContext>
                        </DndContext>
                    </div>
                )}
            </main>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-white rounded-[32px] p-0 overflow-hidden shadow-2xl">
                    <DialogHeader className="p-8 bg-zinc-900/50 border-b border-zinc-800">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-600/10 rounded-2xl">
                                <Edit2 className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Modify Content</DialogTitle>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Update story details for the live blog</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">TITLE</Label>
                                <Input
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="bg-zinc-900 border-zinc-800 rounded-xl h-12 font-bold text-white focus:ring-indigo-500/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">CATEGORY</Label>
                                <Input
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="bg-zinc-900 border-zinc-800 rounded-xl h-12 font-bold text-white focus:ring-indigo-500/20"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">CONTENT</Label>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setIsAIAssistantOpen(true)}
                                    className="h-7 px-3 text-[9px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/10"
                                >
                                    <Sparkles className="w-3 h-3 mr-1" /> AI WRITER
                                </Button>
                            </div>
                            <Textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="bg-zinc-900 border-zinc-800 rounded-xl min-h-[200px] font-medium text-zinc-300 leading-relaxed focus:ring-indigo-500/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">COVER IMAGE</Label>
                            <div className="flex items-center gap-4">
                                {formData.resource_url && (
                                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-zinc-800 shrink-0">
                                        <img src={formData.resource_url} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                        className="bg-zinc-900 border-zinc-800 rounded-xl h-12 file:bg-zinc-800 file:border-none file:text-[10px] file:font-black file:uppercase file:tracking-widest file:text-white file:px-4 file:h-full cursor-pointer"
                                    />
                                    {isUploading && <p className="text-[10px] text-indigo-400 mt-2 animate-pulse font-black uppercase tracking-widest">Uploading Media...</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-zinc-900/30 border-t border-zinc-800 gap-3">
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="rounded-xl h-12 px-6 font-bold text-zinc-500 hover:text-white">
                            DISCARD
                        </Button>
                        <Button 
                            onClick={handleSaveEdit} 
                            disabled={isSaving || isUploading} 
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl h-12 px-10 shadow-xl shadow-indigo-600/20 transition-all"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SAVE CHANGES'}
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

function SortablePostItem({ item, onEdit, onDelete, onToggleStatus }: {
    item: LibraryItem,
    onEdit: () => void,
    onDelete: () => void,
    onToggleStatus: (field: 'is_published' | 'is_pinned') => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300",
                isDragging 
                    ? "bg-indigo-600/10 border-indigo-500/50 shadow-2xl scale-[1.02] z-50" 
                    : "bg-zinc-900/20 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/40"
            )}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-2 hover:bg-white/5 rounded-lg transition-colors shrink-0"
            >
                <GripVertical className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500" />
            </div>

            <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
                {item.resource_url ? (
                    <img src={item.resource_url} className="w-full h-full object-cover" alt="" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-800">
                        <ImageIcon className="w-5 h-5" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-zinc-100 truncate uppercase tracking-tight">{item.title}</h4>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500/60">{item.category}</span>
                    <span className="text-[9px] font-bold text-zinc-600 uppercase">
                        {new Date(item.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {item.is_pinned && (
                        <span className="flex items-center gap-1 text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-widest">
                            <Pin className="w-2.5 h-2.5 fill-current" /> Pinned
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleStatus('is_pinned')}
                    className={cn(
                        "h-9 w-9 rounded-xl transition-all",
                        item.is_pinned ? "text-amber-500 bg-amber-500/10" : "text-zinc-600 hover:text-amber-500"
                    )}
                >
                    <Pin className={cn("w-4 h-4", item.is_pinned && "fill-current")} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleStatus('is_published')}
                    className={cn(
                        "h-9 w-9 rounded-xl transition-all",
                        item.is_published ? "text-emerald-500 bg-emerald-500/10" : "text-zinc-600 hover:text-emerald-500"
                    )}
                >
                    {item.is_published ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </Button>
                <div className="w-px h-6 bg-zinc-800 mx-1" />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onEdit}
                    className="h-9 w-9 text-zinc-600 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                    <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    className="h-9 w-9 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
