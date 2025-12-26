import { useState, useEffect, useRef, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Play, ZoomIn, Truck, Wrench, Info, Plus, Edit2, Trash2, Upload, Loader2, Camera, Image as ImageIcon, Video, FolderPlus, Newspaper, User, CheckCircle2, RotateCcw, Settings, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { getLibraryItems, upsertLibraryItem, deleteLibraryItem, LibraryItem, getComments, addComment, getAllCommentCounts, renameLibraryCategory, deleteLibraryCategory, supabase } from '@/lib/supa-data';
import { compressImage } from "@/lib/imageUtils";
import localforage from "localforage";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function F150Setup() {
    const { toast } = useToast();
    const user = getCurrentUser();
    const isAdmin = user?.role === 'admin' || (user?.role as string) === 'owner';
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [items, setItems] = useState<LibraryItem[]>([]);
    const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
    const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [visibleCount, setVisibleCount] = useState(9);
    const [uploadStatus, setUploadStatus] = useState<{ step: string; message: string }>({ step: 'idle', message: '' });

    // Blog Categories
    const [activeCategory, setActiveCategory] = useState<string>("All");
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [isCustomCategory, setIsCustomCategory] = useState(false);

    const [formData, setFormData] = useState<Partial<LibraryItem>>({
        category: 'General',
        type: 'image'
    });

    useEffect(() => {
        loadItems();

        // Poll for comment counts every 15 seconds to keep numbers in sync across users
        const interval = setInterval(async () => {
            const counts = await getAllCommentCounts();
            setCommentCounts(counts);
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    const loadItems = async () => {
        try {
            const data = await getLibraryItems();
            setItems(data);

            // Extract unique categories (dynamic)
            const dynamicCats = Array.from(new Set(data.map(i => i.category))).filter(c => c && c !== 'General');
            setCustomCategories(dynamicCats);

            // Load Global Comment Counts immediately
            const counts = await getAllCommentCounts();
            setCommentCounts(counts);

        } catch (error) {
            console.error("Failed to load blog items:", error);
            toast({ title: "Error loading blog", variant: "destructive" });
        }
    };

    // Permission Check: Admin can edit all, User can edit own
    const canEdit = (item: LibraryItem) => {
        if (isAdmin) return true;
        // If item has no creator, assume Admin only
        if (!item.created_by) return false;
        return item.created_by === user?.email;
    };

    const handleOpenDialog = () => {
        handleAddNew('image');
    };

    const handleAddNew = (type: 'image' | 'video', category = 'General') => {
        setEditingItem(null);
        setIsCustomCategory(false);
        setUploadStatus({ step: 'idle', message: '' });
        setFormData({
            category: category,
            type: type,
            title: '',
            description: '',
            resource_url: ''
        });
        setIsEditModalOpen(true);
    };

    const handleEdit = (item: LibraryItem) => {
        if (!canEdit(item)) {
            toast({ title: "Access Denied", description: "You can only edit your own posts.", variant: "destructive" });
            return;
        }
        setEditingItem(item);
        setIsCustomCategory(false); // Default to false, user can switch to new if they want
        setUploadStatus({ step: 'idle', message: '' });
        setFormData({ ...item });
        setIsEditModalOpen(true);
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        if (!canEdit(editingItem)) return;

        if (confirm("Are you sure you want to delete this post?")) {
            const success = await deleteLibraryItem(editingItem.id);
            if (success) {
                toast({ title: "Deleted", description: "Post removed." });
                await loadItems();
                setIsEditModalOpen(false);
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset inputs
        setIsUploading(true);
        setUploadStatus({ step: 'compressing', message: 'Preparing image...' });

        // Optimistic Preview: Show image immediately
        if (file.type.startsWith('image/')) {
            const previewUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, resource_url: previewUrl, thumbnail_url: previewUrl, type: 'image' }));
        }

        try {
            // Compress
            const compressed = await compressImage(file);

            setUploadStatus({ step: 'uploading', message: 'Uploading to cloud...' });

            // Generate unique path
            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
            const filePath = `uploads/${fileName}`;

            // Upload to Supabase 'blog-media' bucket
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('blog-media')
                .upload(filePath, compressed);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('blog-media')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, resource_url: publicUrl, thumbnail_url: publicUrl }));
            setUploadStatus({ step: 'done', message: 'Ready to save!' });
            setIsUploading(false);

        } catch (err: any) {
            console.error(err);
            toast({ title: "Upload Failed", description: err.message || "Failed to upload image.", variant: "destructive" });
            setIsUploading(false);
            setUploadStatus({ step: 'error', message: 'Upload failed' });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.resource_url) {
            toast({ title: "Missing Info", description: "Title and Image are required.", variant: "destructive" });
            return;
        }

        setIsUploading(true);
        setUploadStatus({ step: 'uploading', message: 'Saving post...' });

        // If 'Other' category was selected or typed
        // For simplicity, we trust the dropdown or input.

        const itemToSave: LibraryItem = {
            ...formData,
            // Ensure ID exists if new
            id: formData.id || crypto.randomUUID(),
            created_by: (!formData.created_by && user?.email) ? user.email : formData.created_by,
            title: formData.title || '', // Ensure title is not undefined
            description: formData.description || '', // Ensure description is not undefined
            type: formData.type as 'image' | 'video', // Ensure type is correct
            category: formData.category || 'General', // Ensure category is not undefined
            resource_url: formData.resource_url || '', // Ensure resource_url is not undefined
            thumbnail_url: formData.thumbnail_url || formData.resource_url || '', // Ensure thumbnail_url is not undefined
            created_at: formData.created_at || new Date().toISOString() // Ensure created_at is set
        } as LibraryItem; // Cast to LibraryItem to satisfy type checker

        try {
            const result = await upsertLibraryItem(itemToSave);

            if (result.success) {
                toast({ title: 'Success', description: 'Post saved successfully!' });
                setIsEditModalOpen(false);
                setFormData({ id: '', title: '', description: '', type: 'image', category: 'General', thumbnail_url: '', resource_url: '' });
                // Check if category is new and add to list if so
                if (!customCategories.includes(itemToSave.category)) {
                    setCustomCategories(prev => [...prev, itemToSave.category]);
                }
                loadItems();
            } else {
                console.error("Save failure details:", result.error);
                toast({
                    title: 'Failed to save post',
                    description: result.error?.message || JSON.stringify(result.error) || 'Unknown error',
                    variant: 'destructive',
                    duration: 10000
                });
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsUploading(false);
            setUploadStatus({ step: 'idle', message: '' });
        }
    };

    // Category Manager Handlers
    const [isManageCatsOpen, setIsManageCatsOpen] = useState(false);

    const handleRenameCategory = async (oldName: string, newName: string) => {
        const res = await renameLibraryCategory(oldName, newName);
        if (res.success) {
            toast({ title: "Renamed", description: `Updated ${res.count} posts.` });
            loadItems();
        } else {
            toast({ title: "Error", description: "Failed to rename category.", variant: "destructive" });
        }
    };

    const handleDeleteCategory = async (cat: string) => {
        const res = await deleteLibraryCategory(cat);
        if (res.success) {
            toast({ title: "Deleted", description: `Moved ${res.count} posts to General.` });
            loadItems();
        } else {
            toast({ title: "Error", description: "Failed to delete category.", variant: "destructive" });
        }
    };



    // Filtering Blog Display
    const displayedBlogItems = activeCategory === 'All'
        ? items
        : items.filter(i => i.category === activeCategory);

    // ----------------------------------------------------------------------
    // Video Helpers (Ported from LearningLibrary.tsx)
    // ----------------------------------------------------------------------
    const getEmbedUrl = (url: string): string => {
        if (!url) return '';
        try {
            // Convert YouTube URLs to embed format
            if (url.includes('youtube.com/watch')) {
                const videoId = new URL(url).searchParams.get('v');
                return `https://www.youtube.com/embed/${videoId}?autoplay=0`;
            }
            if (url.includes('youtu.be/')) {
                const videoId = url.split('youtu.be/')[1]?.split('?')[0];
                return `https://www.youtube.com/embed/${videoId}?autoplay=0`;
            }
            // Handle already correct embed URLs (remove autoplay to prevent grid chaos)
            if (url.includes('youtube.com/embed/')) {
                return url.replace('?autoplay=1', '?autoplay=0');
            }
        } catch (e) {
            console.error('Error extracting video URL:', e);
        }
        return url;
    };

    const getYouTubeThumbnail = (url: string): string | null => {
        try {
            if (url.includes('youtube.com/watch')) {
                const videoId = new URL(url).searchParams.get('v');
                return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
            if (url.includes('youtu.be/')) {
                const videoId = url.split('youtu.be/')[1]?.split('?')[0];
                return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
        } catch (e) {
            console.error('Error extracting YouTube thumbnail:', e);
        }
        return null;
    };


    return (
        <div className="min-h-screen bg-background pb-20">
            {/* New Pictures & Videos Blog Header */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 border-b border-indigo-500/30">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <SidebarTrigger className="md:hidden text-white" />
                                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                    <Newspaper className="w-8 h-8 text-cyan-400" />
                                    Prime Blog
                                </h1>
                            </div>
                            <p className="text-indigo-200 mt-2">
                                Share your best work, detailing tips, and creative setups.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => handleOpenDialog()} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-900/20">
                                <Plus className="w-5 h-5 mr-2" />
                                New Post
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 max-w-7xl space-y-12">

                {/* FEATURED SECTION REMOVED PER USER REQUEST */}
                {/* Regular Blog Feed follows */}

                {/* GENERAL BLOG FEED */}
                <section id="blog-feed" className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full md:w-auto">
                                <TabsList className="bg-zinc-900 border border-zinc-800">
                                    <TabsTrigger value="All">All Updates</TabsTrigger>
                                    {customCategories.map(cat => (
                                        <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>

                            {isAdmin && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                                    onClick={() => setIsManageCatsOpen(true)}
                                    title="Manage Categories"
                                >
                                    <Settings className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayedBlogItems.slice(0, visibleCount).map(item => (
                            <Card key={item.id} className="bg-zinc-950/50 border-zinc-800/50 overflow-hidden flex flex-col hover:border-indigo-500/30 transition-all hover:shadow-lg hover:shadow-indigo-500/10">
                                <div
                                    className="relative aspect-video cursor-pointer bg-zinc-900"
                                    onClick={() => setSelectedItem(item)}
                                >
                                    {item.type === 'video' ? (
                                        <div className="w-full h-full bg-black relative">
                                            {/* Try to show thumbnail first if available, otherwise iframe */}
                                            {getYouTubeThumbnail(item.resource_url) ? (
                                                <>
                                                    <img
                                                        src={getYouTubeThumbnail(item.resource_url)!}
                                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Play className="w-12 h-12 text-white fill-white/20 drop-shadow-xl group-hover:scale-110 transition-transform" />
                                                    </div>
                                                </>
                                            ) : (
                                                <iframe
                                                    src={getEmbedUrl(item.resource_url)}
                                                    className="w-full h-full pointer-events-none"
                                                    title={item.title}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <img src={item.resource_url} className="w-full h-full object-cover" loading="lazy" />
                                    )}

                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-xs border-white/10 uppercase tracking-widest">
                                            {item.category}
                                        </Badge>
                                    </div>
                                    <div className="absolute top-2 left-2">
                                        {item.type === 'video' ? <Video className="w-4 h-4 text-white drop-shadow-md" /> : <ImageIcon className="w-4 h-4 text-white drop-shadow-md" />}
                                    </div>
                                </div>
                                <div className="p-4 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-white line-clamp-1" title={item.title}>{item.title}</h3>
                                        {canEdit(item) && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-muted-foreground hover:text-white" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
                                                <Edit2 className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-zinc-400 text-sm line-clamp-2 mb-4 flex-1">{item.description}</p>

                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                                <User className="w-3 h-3 text-indigo-400" />
                                            </div>
                                            <span className="text-xs text-zinc-500 truncate max-w-[120px]">
                                                {item.created_by ? item.created_by.split('@')[0] : 'Admin'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-zinc-400" title={`${commentCounts[item.id] || 0} Comments`}>
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">{commentCounts[item.id] || 0}</span>
                                            </div>
                                            <span>{new Date(item.created_at || '').toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {displayedBlogItems.length === 0 && (
                        <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                            <Newspaper className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                            <h3 className="text-xl font-medium text-white mb-2">No posts yet</h3>
                            <p className="text-zinc-500">Be the first to share something in this category!</p>
                        </div>
                    )}

                    {displayedBlogItems.length > visibleCount && (
                        <div className="flex justify-center mt-12">
                            <Button variant="outline" onClick={() => setVisibleCount(p => p + 9)}>
                                Load More Posts
                            </Button>
                        </div>
                    )}
                </section>
            </main>

            {/* Lightbox Modal with Accordion */}
            {
                selectedItem && (
                    <Dialog open={!!selectedItem && !isEditModalOpen} onOpenChange={(open) => !open && setSelectedItem(null)}>
                        <DialogContent className="max-w-4xl w-full max-h-[90vh] bg-zinc-950 border-zinc-800 text-white p-0 overflow-hidden flex flex-col">

                            {/* Top: Media Player */}
                            <div className="bg-black relative w-full shrink-0 flex items-center justify-center border-b border-zinc-800/50" style={{ height: '50vh', minHeight: '300px' }}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 z-50 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 w-10 h-10 backdrop-blur-md"
                                    onClick={() => setSelectedItem(null)}
                                >
                                    <X className="w-6 h-6" />
                                </Button>
                                {selectedItem.type === 'video' || (selectedItem.resource_url && selectedItem.resource_url.includes('youtube')) ? (
                                    <iframe
                                        src={getEmbedUrl(selectedItem.resource_url)}
                                        title={selectedItem.title}
                                        className="w-full h-full"
                                        allowFullScreen
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    />
                                ) : (
                                    <img
                                        src={selectedItem.resource_url}
                                        alt={selectedItem.title}
                                        className="h-full w-full object-contain"
                                        loading="lazy"
                                    />
                                )}
                            </div>

                            {/* Bottom: Content & Comments */}
                            <div className="flex-1 overflow-y-auto p-6 bg-zinc-950 text-left">
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge className="bg-cyan-900/50 text-cyan-300 border-cyan-700/50 hover:bg-cyan-900/70">
                                            {selectedItem.category}
                                        </Badge>
                                        <span className="text-xs text-zinc-500">
                                            {new Date(selectedItem.created_at || Date.now()).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2 leading-tight">{selectedItem.title}</h2>
                                    <div className="flex items-center gap-2 text-xs text-zinc-400 mb-4">
                                        <span>Posted by {selectedItem.created_by ? selectedItem.created_by.split('@')[0] : 'Admin'}</span>
                                    </div>
                                    <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-base border-l-2 border-cyan-500/30 pl-4 py-1">
                                        {selectedItem.description}
                                    </div>
                                </div>

                                <Separator className="bg-zinc-800 my-4" />

                                <Accordion type="single" collapsible defaultValue="comments" className="w-full">
                                    <AccordionItem value="comments" className="border-none">
                                        <AccordionTrigger className="hover:no-underline py-2">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                                                <MessageSquare className="w-4 h-4 text-cyan-400" />
                                                Comments & Discussion
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <CommentsSection
                                                postId={selectedItem.id}
                                                currentUser={user}
                                                onCommentAdded={() => {
                                                    // Optimistic update of the count in the parent grid
                                                    setCommentCounts(prev => ({
                                                        ...prev,
                                                        [selectedItem.id]: (prev[selectedItem.id] || 0) + 1
                                                    }));
                                                }}
                                            />
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            }

            {/* Add/Edit Post Dialog */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{editingItem ? 'Edit Blog Post' : 'Create New Post'}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* Category Selection */}
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <div className="flex gap-2">
                                <Select
                                    value={isCustomCategory ? 'new' : formData.category}
                                    onValueChange={(val) => {
                                        if (val === 'new') {
                                            setIsCustomCategory(true);
                                            setFormData({ ...formData, category: '' });
                                        } else {
                                            setIsCustomCategory(false);
                                            setFormData({ ...formData, category: val });
                                        }
                                    }}
                                >
                                    <SelectTrigger className="bg-zinc-900 border-zinc-800">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="General">General</SelectItem>
                                        <SelectItem value="Before & After">Before & After</SelectItem>
                                        <SelectItem value="Tips & Tricks">Tips & Tricks</SelectItem>
                                        {/* Dynamic Custom Categories */}
                                        {customCategories.filter(c => !['General', 'Before & After', 'Tips & Tricks'].includes(c)).map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                        <SelectItem value="new">+ Create New Category</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* If user selects "New Category", show input */}
                            {isCustomCategory && (
                                <Input
                                    placeholder="Enter new category name..."
                                    className="bg-zinc-900 border-indigo-500/50 mt-2"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                />
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Post Title</Label>
                            <Input
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="bg-zinc-900 border-zinc-800 font-medium"
                                placeholder="Give your post a catchy title"
                            />
                        </div>

                        {/* Media Upload Section */}
                        <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 border-dashed">
                            <Label className="mb-2 block">Media Content</Label>

                            <Tabs
                                defaultValue={formData.type}
                                onValueChange={(v) => {
                                    // Clear resource URL when switching types to prevent accidental large payload uploads
                                    setFormData({ ...formData, type: v as any, resource_url: '', thumbnail_url: '' });
                                    setUploadStatus({ step: 'idle', message: '' });
                                }}
                                className="w-full"
                            >
                                <TabsList className="w-full grid grid-cols-2 mb-4 bg-black">
                                    <TabsTrigger value="image">Image Upload</TabsTrigger>
                                    <TabsTrigger value="video">Video URL</TabsTrigger>
                                </TabsList>
                                <TabsContent value="image" className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="bg-zinc-900 border-zinc-800"
                                            disabled={isUploading}
                                        />
                                        {isUploading && <Loader2 className="animate-spin w-5 h-5 text-indigo-500 mt-2" />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground text-xs uppercase">OR</span>
                                        <Input
                                            placeholder="Paste Google Drive Link..."
                                            value={formData.resource_url?.includes('drive') ? formData.resource_url : ''}
                                            className="bg-zinc-900 border-zinc-800 text-xs h-8"
                                            onChange={(e) => {
                                                let val = e.target.value;
                                                if (val.includes('drive.google.com') && val.includes('/file/d/')) {
                                                    const match = val.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                                                    if (match && match[1]) {
                                                        const directLink = `https://drive.google.com/uc?export=view&id=${match[1]}`;
                                                        setFormData({ ...formData, resource_url: directLink });
                                                        toast({ title: "Link Converted", description: "Google Drive link ready." });
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                    {/* Preview */}
                                    {formData.type === 'image' && formData.resource_url && (
                                        <div className="relative aspect-video rounded-md overflow-hidden bg-black mt-2">
                                            <img src={formData.resource_url} className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="video" className="space-y-4">
                                    <Input
                                        placeholder="Paste YouTube Embed URL..."
                                        value={formData.resource_url || ''}
                                        onChange={e => setFormData({ ...formData, resource_url: e.target.value })}
                                        className="bg-zinc-900 border-zinc-800"
                                    />
                                    <p className="text-xs text-muted-foreground">Example: https://www.youtube.com/embed/dQw4w9WgXcQ</p>

                                    {/* Video Preview */}
                                    {formData.type === 'video' && formData.resource_url && (
                                        <div className="relative aspect-video rounded-md overflow-hidden bg-black mt-2 border border-zinc-800">
                                            <iframe
                                                src={getEmbedUrl(formData.resource_url)}
                                                className="w-full h-full"
                                                allowFullScreen
                                                title="Preview"
                                            />
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>

                        <div className="space-y-2">
                            <Label>Description / Story</Label>
                            <Textarea
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="bg-zinc-900 border-zinc-800 min-h-[150px]"
                                placeholder="Tell us about this setup or tip..."
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between items-center sm:justify-between">
                        {editingItem && (
                            <Button variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={handleDelete}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Post
                            </Button>
                        )}
                        <div className="flex gap-2 ml-auto">
                            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isUploading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {isUploading ? 'Processing...' : 'Publish Post'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CategoryManager
                open={isManageCatsOpen}
                onOpenChange={setIsManageCatsOpen}
                categories={customCategories}
                onRename={handleRenameCategory}
                onDelete={handleDeleteCategory}
            />
        </div >
    );
}

// ----------------------------------------------------------------------
// Sub-component for Comments
// ----------------------------------------------------------------------
function CommentsSection({ postId, currentUser, onCommentAdded }: { postId: string, currentUser: any, onCommentAdded?: () => void }) {
    const { toast } = useToast();
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(false);

    const loadComments = useCallback(async () => {
        const data = await getComments(postId);
        setComments(data);
    }, [postId]);

    useEffect(() => {
        loadComments();

        // Optional: Simple polling for real-time-ish updates (every 10s)
        const interval = setInterval(loadComments, 10000);
        return () => clearInterval(interval);
    }, [loadComments]);

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        setLoading(true);

        const commentPayload = {
            post_id: postId,
            text: newComment.trim(),
            author: currentUser?.name || currentUser?.email || 'Guest',
            avatar_url: currentUser?.avatar_url || null
        };

        const result = await addComment(commentPayload);

        if (result) {
            setComments(prev => [...prev, result]);
            setNewComment("");
            if (onCommentAdded) onCommentAdded();
        } else {
            toast({ title: "Failed to post comment", variant: "destructive" });
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col gap-4 pt-2">

            {/* Comment List */}
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {comments.length === 0 ? (
                    <div className="text-center text-zinc-600 italic text-sm py-4 bg-zinc-900/30 rounded-lg">
                        No comments yet. Be the first to start the discussion!
                    </div>
                ) : (
                    comments.map(c => (
                        <div key={c.id} className="flex gap-3 text-sm animate-fade-in group">
                            <div className="w-8 h-8 rounded-full bg-cyan-900/40 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0 border border-cyan-800/30">
                                {c.author ? c.author.substring(0, 2).toUpperCase() : 'GU'}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-semibold text-zinc-200">{c.author}</span>
                                    <span className="text-[10px] text-zinc-500">{new Date(c.date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-zinc-300 leading-snug bg-zinc-900/50 p-2 rounded-lg rounded-tl-none border border-transparent group-hover:border-zinc-800 transition-colors">
                                    {c.text}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <div className="mt-2 space-y-2">
                <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    className="min-h-[100px] p-3 bg-zinc-900 border-zinc-700 focus:border-cyan-500 text-white placeholder:text-zinc-500 resize-none text-sm rounded-lg"
                />
                <Button
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                    disabled={loading || !newComment.trim()}
                    onClick={handleAddComment}
                >
                    {loading ? 'Posting...' : 'Add Comment'}
                </Button>
            </div>
        </div>
    );
}


// ----------------------------------------------------------------------
// Sub-component for Category Management
// ----------------------------------------------------------------------
function CategoryManager({
    open,
    onOpenChange,
    categories,
    onRename,
    onDelete
}: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    categories: string[],
    onRename: (oldName: string, newName: string) => Promise<void>,
    onDelete: (name: string) => Promise<void>
}) {
    const [editingCat, setEditingCat] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const handleStartEdit = (cat: string) => {
        setEditingCat(cat);
        setEditValue(cat);
    };

    const handleSaveEdit = async () => {
        if (!editingCat || !editValue.trim() || editingCat === editValue.trim()) {
            setEditingCat(null);
            return;
        }
        setIsProcessing(true);
        await onRename(editingCat, editValue.trim());
        setIsProcessing(false);
        setEditingCat(null);
    };

    const handleDelete = async (cat: string) => {
        if (confirm(`Are you sure you want to delete category "${cat}"?\n\nPosts in this category will be moved to "General".`)) {
            setIsProcessing(true);
            await onDelete(cat);
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage Categories</DialogTitle>
                    <CardDescription>Rename categories or delete them (posts merge to General).</CardDescription>
                </DialogHeader>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {categories.length === 0 ? (
                        <p className="text-zinc-500 text-sm italic text-center py-4">No custom categories found.</p>
                    ) : (
                        categories.map(cat => (
                            <div key={cat} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                                {editingCat === cat ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <Input
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            className="h-8 bg-zinc-950 border-indigo-500/50"
                                            autoFocus
                                        />
                                        <Button size="sm" onClick={handleSaveEdit} disabled={isProcessing} className="bg-green-600 hover:bg-green-500 h-8 w-8 p-0">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingCat(null)} className="h-8 w-8 p-0">
                                            <RotateCcw className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="font-medium text-sm text-zinc-300">{cat}</span>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => handleStartEdit(cat)} className="h-8 w-8 p-0 hover:text-cyan-400">
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => handleDelete(cat)} disabled={isProcessing} className="h-8 w-8 p-0 hover:text-red-400 hover:bg-red-900/20">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
