import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getLibraryItems, upsertLibraryItem, deleteLibraryItem, LibraryItem, uploadLibraryFile, getComments, deleteComment, updateComment, LibraryComment } from "@/lib/supa-data";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Save, ArrowLeft, Loader2, Newspaper, Calendar, Pin, Search, X, Edit2, Trash2, Archive, Globe, Lock, ImageIcon, MessageSquare, Sparkles, Rocket, Facebook } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { BlogSocialBlast } from "@/components/BlogSocialBlast";
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
    const [isSocialBlastOpen, setIsSocialBlastOpen] = useState(false);
    const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
    const [socialItem, setSocialItem] = useState<LibraryItem | null>(null);
    
    // Comment management state
    const [comments, setComments] = useState<LibraryComment[]>([]);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState("");

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setIsLoading(true);
        try {
            const data = await getLibraryItems();
            // Filter out Chemical Training items as they are in a different section
            // Filter out Chemical Training items as they are in a different section
            const blogItems = data.filter(item => item.category !== 'Chemical Training');

            // PRIORITY SORTING:
            // 1. IS_PINNED
            // 2. NO SORT_ORDER
            // 3. SORT_ORDER
            const sortedItems = [...blogItems].sort((a, b) => {
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;
                if (a.sort_order == null && b.sort_order == null) {
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                }
                if (a.sort_order == null) return -1;
                if (b.sort_order == null) return 1;
                return (a.sort_order || 0) - (b.sort_order || 0);
            });

            setItems(sortedItems);
        } catch (error) {
            console.error("Failed to load blog items:", error);
            toast({ title: "Error loading blog items", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((prevItems) => {
                const oldIndex = prevItems.findIndex((item) => item.id === active.id);
                const newIndex = prevItems.findIndex((item) => item.id === over.id);
                return arrayMove(prevItems, oldIndex, newIndex);
            });
        }
    };

    const handleSaveOrder = async () => {
        setIsSaving(true);
        try {
            // Update each item with its new sort_order
            const results = await Promise.all(items.map((item, index) => {
                return upsertLibraryItem({
                    ...item,
                    sort_order: index + 1 // 1-based index
                });
            }));

            const failures = results.filter(r => !r.success);
            if (failures.length > 0) {
                console.error("Some updates failed:", failures);
                toast({ 
                    title: "Partial Success", 
                    description: `Successfully updated ${results.length - failures.length} posts, but ${failures.length} failed. Check database schema.`,
                    variant: "destructive"
                });
            } else {
                toast({ title: "Order saved successfully", description: "The blog display sequence has been updated." });
            }
            await loadItems(); // Refresh to ensure everything is in sync
        } catch (error) {
            console.error("Failed to save order:", error);
            toast({ title: "Error saving order", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = async (item: LibraryItem) => {
        setEditingItem(item);
        setFormData({ ...item });
        setIsEditModalOpen(true);
        
        // Load comments for this post
        const postComments = await getComments(item.id);
        setComments(postComments);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this post?")) return;
        const success = await deleteLibraryItem(id);
        if (success) {
            toast({ title: "Post Deleted" });
            setItems(prev => prev.filter(i => i.id !== id));
        } else {
            toast({ title: "Delete Failed", variant: "destructive" });
        }
    };

    const handleArchiveToggle = async (item: LibraryItem) => {
        const updatedStatus = !item.is_published;
        const res = await upsertLibraryItem({ ...item, is_published: updatedStatus });
        if (res.success) {
            toast({
                title: updatedStatus ? "Post Published" : "Post Archived/Unpublished",
                description: updatedStatus ? "It is now visible to customers." : "It has been moved to drafts."
            });
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_published: updatedStatus } : i));
        }
    };

    const handlePinToggle = async (item: LibraryItem) => {
        const updatedStatus = !item.is_pinned;
        const res = await upsertLibraryItem({ ...item, is_pinned: updatedStatus });
        if (res.success) {
            toast({ title: updatedStatus ? "Post Pinned" : "Post Unpinned" });
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_pinned: updatedStatus } : i));
        }
    };

    const handleSaveEdit = async () => {
        if (!formData.title) return;
        setIsSaving(true);
        try {
            const res = await upsertLibraryItem(formData as LibraryItem);
            if (res.success) {
                toast({ title: "Post Updated" });
                setIsEditModalOpen(false);
                await loadItems();
            }
        } catch (error) {
            toast({ title: "Update Failed", variant: "destructive" });
        } finally {
            setIsSaving(false);
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
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <Navbar />
            <PageHeader title="BLOG REORDERING" />

            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-6">
                    <div className="space-y-2 text-left w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            className="text-zinc-500 hover:text-white mb-2 p-0 h-auto"
                            onClick={() => navigate('/section/company-blog')}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> BACK TO DASHBOARD
                        </Button>
                        <h2 className="text-4xl font-black tracking-tighter uppercase italic flex items-center gap-3">
                            VISUAL ARCHITECT
                            <span className="text-xl font-black text-indigo-500/50">
                                {items.length}
                            </span>
                        </h2>
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
                            EDIT · REORDER · AI WRITE · SOCIAL BLAST
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <div className="relative group flex-1 min-w-[300px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                            <Input
                                placeholder="Search to reorder specific topics..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-zinc-900/50 border-zinc-800 pl-11 h-14 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm font-bold"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <Button
                            onClick={() => setIsAIAssistantOpen(true)}
                            className="bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-500 text-indigo-400 hover:text-white font-black rounded-2xl h-14 px-5 transition-all w-full sm:w-auto"
                            title="AI Content Strategist"
                        >
                            <Sparkles className="w-5 h-5 mr-2" />
                            AI WRITE
                        </Button>
                        <Button
                            onClick={handleSaveOrder}
                            disabled={isSaving || isLoading}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl h-14 px-8 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all w-full sm:w-auto"
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5 mr-2" />
                            )}
                            SAVE ORDER
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                        <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Accessing Story Archive...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-32 border-2 border-dashed border-zinc-900 rounded-[40px] bg-zinc-950/30">
                        <Newspaper className="w-16 h-16 text-zinc-800 mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-zinc-700 uppercase italic">No posts found</h3>
                        <p className="text-zinc-600 mt-2">Try adjusting your search or publishing a story.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={filteredItems.map(i => i.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-3">
                                    {filteredItems.map((item) => (
                                        <SortableItem
                                            key={item.id}
                                            item={item}
                                            onEdit={() => handleEdit(item)}
                                            onDelete={() => handleDelete(item.id)}
                                            onArchive={() => handleArchiveToggle(item)}
                                            onPin={() => handlePinToggle(item)}
                                            onSocialBlast={() => { setSocialItem(item); setIsSocialBlastOpen(true); }}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                )}
            </main>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-white rounded-[32px] overflow-hidden p-0 shadow-2xl">
                    <DialogHeader className="p-8 bg-zinc-900/50 border-b border-zinc-800 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl">
                                <Edit2 className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Modify Post Content</DialogTitle>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Update story details without leaving the reorder page</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div className="space-y-2">
                            <Label className="uppercase text-[10px] font-black tracking-widest text-zinc-500 ml-1">STORY TITLE</Label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="bg-zinc-900 border-zinc-800 rounded-2xl h-14 font-bold text-white focus:ring-1 focus:ring-indigo-500/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="uppercase text-[10px] font-black tracking-widest text-zinc-500 ml-1">CATEGORY</Label>
                            <Input
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="bg-zinc-900 border-zinc-800 rounded-2xl h-14 font-bold text-white focus:ring-1 focus:ring-indigo-500/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="uppercase text-[10px] font-black tracking-widest text-zinc-500 ml-1">THE STORY / CONTENT</Label>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setIsAIAssistantOpen(true)}
                                    className="h-7 px-3 text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-white hover:bg-indigo-600/20 rounded-lg border border-indigo-500/20"
                                >
                                    <Sparkles className="w-3 h-3 mr-1" /> AI Write
                                </Button>
                            </div>
                            <Textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="bg-zinc-900 border-zinc-800 rounded-2xl min-h-[150px] font-medium text-white focus:ring-1 focus:ring-indigo-500/50"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
                            <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-900">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black uppercase text-indigo-400">PIN TO TOP</p>
                                    <p className="text-[8px] text-zinc-600 font-bold uppercase">Stay at the high feed</p>
                                </div>
                                <Switch checked={formData.is_pinned} onCheckedChange={v => setFormData({ ...formData, is_pinned: v })} />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-900">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black uppercase text-emerald-400">PUBLISHED</p>
                                    <p className="text-[8px] text-zinc-600 font-bold uppercase">Live on website</p>
                                </div>
                                <Switch checked={formData.is_published} onCheckedChange={v => setFormData({ ...formData, is_published: v })} />
                            </div>
                        </div>

                        {/* Comment Management Section */}
                        {comments.length > 0 && (
                            <div className="pt-6 border-t border-zinc-800/50 space-y-4">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                                    <Label className="uppercase text-[10px] font-black tracking-widest text-indigo-400">
                                        COMMENTS ({comments.length})
                                    </Label>
                                </div>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                    {comments.map((comment) => (
                                        <div key={comment.id} className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <p className="text-xs font-black text-zinc-300">{comment.author}</p>
                                                    <p className="text-[10px] text-zinc-600 font-bold">
                                                        {new Date(comment.created_at).toLocaleDateString('en-US', { 
                                                            month: 'short', 
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg"
                                                        onClick={() => {
                                                            setEditingCommentId(comment.id);
                                                            setEditingCommentText(comment.text);
                                                        }}
                                                        title="Edit comment"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                                        onClick={async () => {
                                                            if (window.confirm('Delete this comment permanently?')) {
                                                                const success = await deleteComment(comment.id);
                                                                if (success) {
                                                                    setComments(prev => prev.filter(c => c.id !== comment.id));
                                                                    toast({ title: "Comment Deleted" });
                                                                } else {
                                                                    toast({ title: "Delete Failed", variant: "destructive" });
                                                                }
                                                            }
                                                        }}
                                                        title="Delete comment"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            {editingCommentId === comment.id ? (
                                                <div className="space-y-2 pt-2">
                                                    <Textarea
                                                        value={editingCommentText}
                                                        onChange={e => setEditingCommentText(e.target.value)}
                                                        className="bg-zinc-900 border-zinc-700 text-sm min-h-[60px]"
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={async () => {
                                                                const success = await updateComment(comment.id, editingCommentText);
                                                                if (success) {
                                                                    setComments(prev => prev.map(c => 
                                                                        c.id === comment.id ? { ...c, text: editingCommentText } : c
                                                                    ));
                                                                    setEditingCommentId(null);
                                                                    toast({ title: "Comment Updated" });
                                                                } else {
                                                                    toast({ title: "Update Failed", variant: "destructive" });
                                                                }
                                                            }}
                                                            className="bg-indigo-600 hover:bg-indigo-500 h-8 text-xs"
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setEditingCommentId(null)}
                                                            className="h-8 text-xs"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-zinc-400 leading-relaxed">{comment.text}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-8 bg-zinc-900/30 border-t border-zinc-800 shrink-0 gap-3 flex-wrap">
                        <Button
                            variant="ghost"
                            onClick={() => { if (editingItem) { setSocialItem(editingItem); setIsSocialBlastOpen(true); } }}
                            className="h-14 px-5 rounded-2xl font-black text-[#1877F2] border border-[#1877F2]/30 hover:bg-[#1877F2]/10"
                        >
                            <Facebook className="w-5 h-5 mr-2" /> POST TO SOCIAL
                        </Button>
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="rounded-2xl h-14 px-8 font-bold text-zinc-500 hover:text-white">
                            CANCEL
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl h-14 px-12 shadow-xl shadow-indigo-600/20 transition-all flex-1">
                            {isSaving ? <Loader2 className="animate-spin" /> : 'SAVE CHANGES'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Social Blast Engine */}
            <BlogSocialBlast
                isOpen={isSocialBlastOpen}
                onOpenChange={setIsSocialBlastOpen}
                item={socialItem}
            />

            {/* AI Content Strategist */}
            <BlogAIAssistant
                isOpen={isAIAssistantOpen}
                onOpenChange={setIsAIAssistantOpen}
                onApplySuggestion={(text) => setFormData(prev => ({ ...prev, description: text }))}
                currentTitle={formData.title as string}
                currentDescription={formData.description as string}
            />

            <Footer />
        </div>
    );
}

function SortableItem({ item, onEdit, onDelete, onArchive, onPin, onSocialBlast }: {
    item: LibraryItem,
    onEdit: () => void,
    onDelete: () => void,
    onArchive: () => void,
    onPin: () => void,
    onSocialBlast: () => void,
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
        position: 'relative' as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-4 p-4 rounded-3xl border transition-all duration-300 ${isDragging
                ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_40px_rgba(79,70,229,0.2)] scale-[1.02]'
                : 'bg-zinc-900/30 border-zinc-900 hover:border-zinc-800'
                }`}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-2 hover:bg-white/5 rounded-xl transition-colors"
                title="Drag to reorder"
            >
                <GripVertical className="w-6 h-6 text-zinc-700" />
            </div>

            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black shrink-0 border border-zinc-800">
                {item.type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500 text-xs">VIDEO</div>
                ) : (
                    <img
                        src={item.resource_url}
                        className="w-full h-full object-cover"
                        alt={item.title}
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/logo-3inch.png";
                            target.className = "w-full h-full object-contain p-2 opacity-20 grayscale";
                        }}
                    />
                )}
            </div>

            <div className="flex-1 min-w-0 text-left">
                <h4 className="font-black text-sm text-white truncate uppercase tracking-tighter">{item.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                    {item.is_pinned && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-black border border-indigo-500/20 flex items-center gap-1"><Pin className="w-2.5 h-2.5 fill-indigo-400" /> PINNED</span>}
                    <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{item.category}</span>
                    <span className="text-[10px] text-zinc-600 font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {item.sort_order !== undefined && (
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-black border border-indigo-500/10">
                            ORDER: #{item.sort_order}
                        </span>
                    )}
                </div>
            </div>

            <div className="hidden md:flex items-center gap-2 pr-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onPin}
                    className={`h-9 w-9 rounded-xl transition-all ${item.is_pinned ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-600 hover:text-indigo-400'}`}
                    title={item.is_pinned ? "Unpin Post" : "Pin Post"}
                >
                    <Pin className={`w-4 h-4 ${item.is_pinned ? 'fill-indigo-400' : ''}`} />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onArchive}
                    className={`h-9 w-9 rounded-xl transition-all ${item.is_published ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-amber-500 hover:bg-amber-500/10'}`}
                    title={item.is_published ? "Unpublish (Archive)" : "Publish"}
                >
                    {item.is_published ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </Button>

                <div className="w-px h-6 bg-zinc-800 mx-1" />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSocialBlast}
                    className="h-9 w-9 rounded-xl text-[#1877F2]/60 hover:text-[#1877F2] hover:bg-[#1877F2]/10 transition-all"
                    title="Social Blast"
                >
                    <Rocket className="w-4 h-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onEdit}
                    className="h-9 w-9 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    title="Quick Edit"
                >
                    <Edit2 className="w-4 h-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    className="h-9 w-9 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    title="Delete Post"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
