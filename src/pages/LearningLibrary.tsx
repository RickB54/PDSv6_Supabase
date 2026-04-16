import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Navbar } from "@/components/Navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Play, FileText, Video, Plus, Edit2, Trash2, Truck, Loader2, Upload, CheckCircle2, Newspaper } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { getLibraryItems, upsertLibraryItem, deleteLibraryItem, renameLibraryCategory, deleteLibraryCategory, LibraryItem, supabase, copyLibraryItem } from "@/lib/supa-data";
import { SelectSeparator } from "@/components/ui/select";
import { compressImage } from "@/lib/imageUtils";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { useWalkthrough } from "@/contexts/WalkthroughContext";

export default function LearningLibrary() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { startWalkthrough } = useWalkthrough();
    const user = getCurrentUser();
    const isAdmin = user?.role === 'admin' || (user?.role as string) === 'owner';
    const isActualAdmin = user?.role === 'admin';
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [items, setItems] = useState<LibraryItem[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>("All");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ step: string; message: string }>({ step: 'idle', message: '' });
    const [placeholderCategories, setPlaceholderCategories] = useState<string[]>([]);

    // Video player state
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [playingItem, setPlayingItem] = useState<LibraryItem | null>(null);
    
    // Content viewer state (for articles/posts)
    const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);

    const [formData, setFormData] = useState<Partial<LibraryItem>>({
        type: 'video',
        category: 'General'
    });

    // Category Management State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [categoryModalType, setCategoryModalType] = useState<'create' | 'rename' | 'delete'>('create');
    const [targetCategory, setTargetCategory] = useState<string>("");
    const [newCategoryName, setNewCategoryName] = useState<string>("");

    const categories = useMemo(() => {
        const allCats = new Set<string>();
        items.forEach(i => {
            const parts = (i.category || 'General').split(',').map(s => s.trim()).filter(Boolean);
            parts.forEach(p => allCats.add(p));
        });
        placeholderCategories.forEach(c => allCats.add(c));
        
        // Return unique categories, preserving original case for display but sorted consistently
        return ["All", ...Array.from(allCats).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))];
    }, [items, placeholderCategories]);

    const filteredItems = useMemo(() => {
        if (activeCategory === "All") return items;
        const target = activeCategory.toLowerCase();
        return items.filter(i => {
            const cats = (i.category || 'General').split(',').map(s => s.trim().toLowerCase());
            return cats.includes(target);
        });
    }, [items, activeCategory]);

    useEffect(() => {
        loadItems();
        
        // Handle Interactive Demo trigger
        const params = new URLSearchParams(window.location.search);
        if (params.get('tab') === 'demo') {
            startWalkthrough();
            // Clear the param
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, []);

    const loadItems = async () => {
        const data = await getLibraryItems();
        setItems(data);

        // Check for deep link
        const params = new URLSearchParams(window.location.search);
        const videoUrl = params.get('videoUrl');
        const videoId = params.get('videoId');

        if (videoId) {
            const item = data.find(i => i.id === videoId);
            if (item) {
                setPlayingItem(item);
                setIsPlayerOpen(true);
            }
        } else if (videoUrl) {
            // Find item by URL or create temporary wrapper
            const item = data.find(i => i.resource_url === videoUrl);
            if (item) {
                setPlayingItem(item);
            } else {
                // Formatting fallback for raw URL viewing
                setPlayingItem({
                    id: 'temp',
                    title: 'Instructional Video',
                    description: 'Direct link from customer card',
                    type: 'video',
                    category: 'General',
                    resource_url: videoUrl
                });
            }
            setIsPlayerOpen(true);
        }
    };

    const handleAddNew = () => {
        setEditingItem(null);
        setUploadStatus({ step: 'idle', message: '' });
        setFormData({
            type: 'video',
            category: 'General',
            title: '',
            description: ''
        });
        setIsModalOpen(true);
    };

    const handleSendToBlog = async (item: LibraryItem) => {
        if (!isAdmin) return;

        try {
            // Check for duplicates in the blog section (non 'Chemical Training' categories)
            const { data: existing, error: checkError } = await supabase
                .from('learning_library_items')
                .select('id')
                .eq('title', item.title)
                .neq('category', 'Chemical Training');

            if (checkError) throw checkError;

            if (existing && existing.length > 0) {
                toast({
                    title: "Duplicate Found",
                    description: "This story already exists on the Prime Blog.",
                    variant: "destructive"
                });
                return;
            }

            // Copy to blog (defaulting to 'General' category)
            const res = await copyLibraryItem({
                ...item,
                is_published: isActualAdmin,
                is_verified: isActualAdmin
            }, 'General');

            if (res.success) {
                // If not ACTUAL admin, trigger notification workflow
                if (!isActualAdmin) {
                    try {
                        const doc = new jsPDF();
                        doc.setFontSize(22);
                        doc.setTextColor(63, 81, 181);
                        doc.text("PRIME BLOG SUBMISSION (CLONED)", 105, 20, { align: "center" });

                        doc.setFontSize(12);
                        doc.setTextColor(40, 40, 40);
                        doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 30, { align: "center" });

                        doc.setDrawColor(200, 200, 200);
                        doc.line(20, 35, 190, 35);

                        doc.setFontSize(14);
                        doc.text("AUTHOR DETAILS", 20, 45);
                        doc.setFontSize(11);
                        doc.text(`Email: ${user?.email || 'N/A'}`, 25, 52);
                        doc.text(`Role: ${user?.role || 'Customer'}`, 25, 58);

                        doc.setFontSize(14);
                        doc.text("POST CONTENT (TRANSFERRED FROM LIBRARY)", 20, 70);
                        doc.setFontSize(11);
                        doc.text(`Title: ${item.title}`, 25, 77);
                        doc.text(`Original Category: ${item.category}`, 25, 83);
                        doc.text(`Media Type: ${item.type}`, 25, 89);

                        doc.setFontSize(14);
                        doc.text("STORY / DESCRIPTION", 20, 100);
                        doc.setFontSize(10);
                        const lines = doc.splitTextToSize(item.description || 'No description provided.', 160);
                        doc.text(lines, 25, 107);

                        const pdfDataUrl = doc.output('dataurlstring');

                        savePDFToArchive("Admin Updates", user?.email || 'User', `blog_clone_${res.data?.id}`, pdfDataUrl, {
                            fileName: `Blog_Clone_${item.title.replace(/\s/g, '_')}_${Date.now()}.pdf`
                        });

                        const subject = `[ACTION REQUIRED] New Blog Submission (Cloned): ${item.title}`;
                        const body = `Hello Rick,\n\nA story has been cloned from the Learning Library to the Blog for your approval.\n\n` +
                            `AUTHOR: ${user?.email || 'Anonymous'}\n` +
                            `TITLE: ${item.title}\n` +
                            `ORIGINAL CATEGORY: ${item.category}\n\n` +
                            `STORY PREVIEW:\n${item.description}\n\n` +
                            `VIEW & APPROVE HERE:\n${window.location.origin}/blog\n\n` +
                            `A PDF record is archived in File Manager under 'Admin Updates'.`;

                        const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=Rick.PrimeAutoDetail@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                        window.open(gmailLink, "_blank");
                    } catch (err) {
                        console.error("Auto-notification failed:", err);
                    }
                }

                toast({
                    title: "Sent to Blog",
                    description: isActualAdmin ? "Cloned to Public Blog successfully." : "Post submitted for admin review."
                });
            } else {
                throw res.error;
            }
        } catch (err: any) {
            console.error("Failed to send to blog:", err);
            toast({
                title: "Operation Failed",
                description: err.message || "Cloud synchronization error.",
                variant: "destructive"
            });
        }
    };

    const handleEdit = (item: LibraryItem) => {
        setEditingItem(item);
        setUploadStatus({ step: 'idle', message: '' });
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!editingItem) return;

        const success = await deleteLibraryItem(editingItem.id);
        if (success) {
            await loadItems();
            setIsModalOpen(false);
            setEditingItem(null);
            toast({ title: "Resource Deleted", description: "Library item removed successfully." });
        } else {
            toast({ title: "Delete Failed", description: "Could not delete the resource.", variant: "destructive" });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadStatus({ step: 'uploading', message: 'Preparing upload...' });

        // Optimistic Preview
        if (file.type.startsWith('image/')) {
            const previewUrl = URL.createObjectURL(file);
            setFormData(prev => ({
                ...prev,
                resource_url: previewUrl,
                thumbnail_url: previewUrl,
                type: 'article'
            }));
        }

        try {
            // If image, compress it. If video/pdf, use as is (for now)
            let fileToUpload = file;
            if (file.type.startsWith('image')) {
                fileToUpload = await compressImage(file);
            }

            setUploadStatus({ step: 'uploading', message: 'Uploading to cloud...' });

            // Generate unique path
            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
            const filePath = `learning-library/${fileName}`; // Subfolder for organization

            // Upload to Supabase 'blog-media' bucket (reusing bucket)
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('blog-media')
                .upload(filePath, fileToUpload);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('blog-media')
                .getPublicUrl(filePath);

            setFormData(prev => ({
                ...prev,
                resource_url: publicUrl,
                thumbnail_url: file.type.startsWith('image') ? publicUrl : prev.thumbnail_url,
                type: file.type.startsWith('image') ? 'article' : prev.type // Auto-set type to article for images
            }));

            setUploadStatus({ step: 'done', message: 'Ready to save!' });
            setIsUploading(false);

        } catch (err: any) {
            console.error(err);
            toast({ title: "Upload Failed", description: err.message || "Failed to upload file.", variant: "destructive" });
            setIsUploading(false);
            setUploadStatus({ step: 'error', message: 'Upload failed' });
        }
    };

    const handleSave = async () => {
        if (!formData.title || !formData.description) {
            toast({ title: "Missing Fields", description: "Title and description are required.", variant: "destructive" });
            return;
        }

        const newItem: LibraryItem = {
            id: editingItem?.id || `item_${Date.now()}`,
            title: formData.title,
            description: formData.description,
            type: formData.type || 'video',
            duration: formData.duration,
            category: formData.category || 'General',
            thumbnail_url: formData.thumbnail_url,
            resource_url: formData.resource_url,
            created_at: editingItem?.created_at || new Date().toISOString()
        };

        setSaving(true);
        // Save to Supabase
        const result = await upsertLibraryItem(newItem);
        if (result.success) {
            toast({ title: editingItem ? "Resource Updated" : "Resource Added", description: "Library updated successfully." });
            setIsModalOpen(false);
            setEditingItem(null);
            setFormData({ type: 'video', category: 'General' });
            await loadItems();
        } else {
            toast({ title: "Save Failed", description: result.error?.message || "Changes may not persist.", variant: "destructive" });
        }
        setSaving(false);
    };

    const handleCategoryAction = async () => {
        if (categoryModalType === 'create') {
            if (!newCategoryName.trim()) return;
            
            // Check if it already exists in items or placeholders
            if (categories.includes(newCategoryName)) {
                toast({ title: "Category Exists", description: "This category name is already in use." });
                setActiveCategory(newCategoryName);
                setIsCategoryModalOpen(false);
                return;
            }

            setPlaceholderCategories(prev => [...prev, newCategoryName]);
            toast({ title: "Category Created", description: "You can now add resources to this category." });
            setActiveCategory(newCategoryName);
        } else if (categoryModalType === 'rename') {
            if (!newCategoryName.trim()) return;
            const res = await renameLibraryCategory(targetCategory, newCategoryName);
            if (res.success) {
                toast({ title: "Category Renamed", description: `Updated ${res.count} resources.` });
                if (activeCategory === targetCategory) setActiveCategory(newCategoryName);
                await loadItems();
            }
        } else if (categoryModalType === 'delete') {
            const isPlaceholder = placeholderCategories.includes(targetCategory);
            if (isPlaceholder) {
                setPlaceholderCategories(prev => prev.filter(c => c !== targetCategory));
                toast({ title: "Category Removed", description: "The empty category was removed." });
                if (activeCategory === targetCategory) setActiveCategory("All");
            } else {
                const res = await deleteLibraryCategory(targetCategory);
                if (res.success) {
                    toast({ title: "Category Deleted", description: `Unassigned ${res.count} resources back to General.` });
                    if (activeCategory === targetCategory) setActiveCategory("All");
                    await loadItems();
                }
            }
        }
        setIsCategoryModalOpen(false);
        setNewCategoryName("");
    };

    const [saving, setSaving] = useState(false);

    const getIcon = (type: string) => {
        switch (type) {
            case 'video': return Video;
            case 'image': return FileText; // or Lucide Image icon if imported
            case 'pdf': return FileText;
            case 'article': return FileText;
            default: return FileText;
        }
    };

    const handleViewResource = (item: LibraryItem) => {
        // For articles and general posts, show in the modal viewer
        if (item.type === 'article' || !item.resource_url || item.resource_url.startsWith('#')) {
            setSelectedItem(item);
            return;
        }

        if (item.type === 'video') {
            setPlayingItem(item);
            setIsPlayerOpen(true);
        } else if (item.type === 'pdf') {
            window.open(item.resource_url, '_blank');
        } else {
            // For images and other content with descriptions, show in viewer
            setSelectedItem(item);
        }
    };

    const getEmbedUrl = (url: string): string => {
        // Convert YouTube URLs to embed format
        if (url.includes('youtube.com/watch')) {
            const videoId = new URL(url).searchParams.get('v');
            return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }
        if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1].split('?')[0];
            return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }
        // Return direct video URL as-is
        return url;
    };

    const getYouTubeThumbnail = (url: string): string | null => {
        try {
            if (url.includes('youtube.com/watch')) {
                const videoId = new URL(url).searchParams.get('v');
                return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
            if (url.includes('youtu.be/')) {
                const videoId = url.split('youtu.be/')[1].split('?')[0];
                return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
        } catch (e) {
            console.error('Error extracting YouTube thumbnail:', e);
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="Learning Library" />

            <main className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Learning Library</h1>
                    <p className="text-zinc-400">Educational resources and reference materials</p>
                </div>
                {/* Help / Info Section */}
                <div className="flex items-start gap-4 p-4 bg-blue-900/20 border border-blue-900/50 rounded-lg mb-8">
                    <HelpCircle className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-bold text-blue-400 mb-1">About the Learning Library</h3>
                        <p className="text-blue-200 text-sm">
                            The Learning Library is a standalone resource center for continuous education.
                            <strong> It is NOT related to the Employee Certification program.</strong>
                            Certification videos and exams are located in the "Employee Certification" section.
                            Use this library for optional learning, reference materials, and advanced tips.
                        </p>
                    </div>
                    {isAdmin && (
                        <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 shrink-0">
                            <Plus className="w-4 h-4 mr-2" /> Add New Resource
                        </Button>
                    )}
                </div>

                {/* Content Layout */}
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar / Categories */}
                    <aside className="w-full lg:w-64 shrink-0">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg sticky top-24">
                            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/30">
                                <h3 className="font-bold text-zinc-200">Categories</h3>
                                {isAdmin && (
                                    <Button
                                        size="icon" variant="ghost" className="h-7 w-7 text-blue-400 hover:bg-blue-900/20"
                                        onClick={() => { setCategoryModalType('create'); setIsCategoryModalOpen(true); }}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <div className="p-2 flex flex-col gap-1 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                {categories.map(cat => (
                                    <div key={cat} className="group flex items-center gap-1">
                                        <button
                                            onClick={() => setActiveCategory(cat)}
                                            className={`flex-1 text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeCategory === cat
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                                                : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                        {isAdmin && cat !== 'All' && cat !== 'General' && (
                                            <div className="flex opacity-100 group-hover:opacity-100 transition-opacity pr-1">
                                                <Button
                                                    size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-blue-400"
                                                    onClick={(e) => { e.stopPropagation(); setTargetCategory(cat); setNewCategoryName(cat); setCategoryModalType('rename'); setIsCategoryModalOpen(true); }}
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-red-400"
                                                    onClick={(e) => { e.stopPropagation(); setTargetCategory(cat); setCategoryModalType('delete'); setIsCategoryModalOpen(true); }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Grid of library items */}
                    <div className="flex-1">
                        {filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/30 border border-zinc-800 border-dashed rounded-xl">
                                <Video className="h-12 w-12 text-zinc-700 mb-4" />
                                <h3 className="text-zinc-400 font-medium">No resources found in this category</h3>
                                <p className="text-zinc-600 text-sm mt-1">Try switching categories or add a new resource.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredItems.map(item => {
                                    const Icon = getIcon(item.type);
                                    return (
                                        <Card
                                            key={item.id}
                                            className="bg-zinc-900 border-zinc-800 hover:border-zinc-500 transition-all hover:translate-y-[-4px] group cursor-pointer relative shadow-lg"
                                            onClick={() => handleViewResource(item)}
                                        >
                                            {isAdmin && (
                                                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        size="icon"
                                                        variant="secondary"
                                                        className="h-8 w-8 bg-zinc-950/80 border border-zinc-800 hover:bg-zinc-800 backdrop-blur"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEdit(item);
                                                        }}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="secondary"
                                                        title="Send to Public Blog"
                                                        className="h-8 w-8 bg-indigo-600/90 border border-indigo-400/50 hover:bg-indigo-500 text-white backdrop-blur transition-all"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSendToBlog(item);
                                                        }}
                                                    >
                                                        <Newspaper className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                            <div className="aspect-video bg-zinc-950 relative flex items-center justify-center overflow-hidden rounded-t-xl">
                                                {/* Priority: 1. thumbnail_url, 2. YouTube thumbnail, 3. Image resource_url, 4. Icon fallback */}
                                                {item.thumbnail_url ? (
                                                    <img
                                                        src={item.thumbnail_url}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
                                                    />
                                                ) : ((item.type === 'video' || item.type === 'image') && item.resource_url && (item.type === 'image' || getYouTubeThumbnail(item.resource_url))) ? (
                                                    <img
                                                        src={item.type === 'image' ? item.resource_url : getYouTubeThumbnail(item.resource_url)!}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
                                                    />
                                                ) : (
                                                    <Icon className="w-12 h-12 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                                                )}
                                                {item.type === 'video' && (
                                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                        <div className="h-14 w-14 rounded-full bg-blue-600/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                                                            <Play className="w-6 h-6 text-white fill-white ml-1" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-white text-lg line-clamp-1">{item.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-zinc-400 text-sm line-clamp-2 h-10 mb-4">{item.description}</p>
                                                <div className="flex gap-2 flex-wrap">
                                                    {item.duration && (
                                                        <span className="text-[10px] uppercase font-bold tracking-wider bg-zinc-800 text-zinc-400 px-2 py-1 rounded border border-zinc-700/50">{item.duration}</span>
                                                    )}
                                                    {(item.category || 'General').split(',').map(c => c.trim()).filter(Boolean).map(cat => (
                                                        <span key={cat} className="text-[10px] uppercase font-bold tracking-wider bg-blue-900/30 text-blue-400 px-2 py-1 rounded border border-blue-900/50">{cat}</span>
                                                    ))}
                                                    <span className="text-[10px] uppercase font-bold tracking-wider bg-zinc-800 text-zinc-400 px-2 py-1 rounded border border-zinc-700/50">{item.type}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main >

            {/* Add/Edit Modal */}
            < Dialog open={isModalOpen} onOpenChange={setIsModalOpen} >
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Resource' : 'Add New Resource'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Resource Type</Label>
                                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val as any })}>
                                    <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                        <SelectItem value="video">Video</SelectItem>
                                        <SelectItem value="article">Image/Asset</SelectItem>
                                        <SelectItem value="pdf">PDF Document</SelectItem>
                                        <SelectItem value="article">Article</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-4">
                                <Label>Categories (Select all that apply)</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-zinc-950 border border-zinc-800 rounded-lg max-h-[150px] overflow-y-auto custom-scrollbar">
                                    {categories.filter(c => c !== "All").map(cat => {
                                        const currentCats = (formData.category || '').split(',').map(s => s.trim()).filter(Boolean);
                                        const isChecked = currentCats.includes(cat);
                                        
                                        return (
                                            <div key={cat} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`cat-${cat}`}
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const isChecked = e.target.checked;
                                                        // Get current tags from the most up-to-date formData
                                                        const latestCats = (formData.category || '').split(',').map(s => s.trim()).filter(Boolean);
                                                        
                                                        let nextCats: string[];
                                                        if (isChecked) {
                                                            nextCats = Array.from(new Set([...latestCats, cat]));
                                                        } else {
                                                            nextCats = latestCats.filter(c => c.toLowerCase() !== cat.toLowerCase());
                                                        }
                                                        
                                                        setFormData(prev => ({ 
                                                            ...prev, 
                                                            category: nextCats.length > 0 ? nextCats.join(', ') : 'General' 
                                                        }));
                                                    }}
                                                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
                                                />
                                                <label htmlFor={`cat-${cat}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    {cat}
                                                </label>
                                            </div>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newCat = prompt("Enter new category name:");
                                            if (newCat && newCat.trim()) {
                                                const trimmed = newCat.trim();
                                                if (!placeholderCategories.includes(trimmed)) {
                                                    setPlaceholderCategories(prev => [...prev, trimmed]);
                                                }
                                                // Also auto-select it
                                                const currentCats = (formData.category || '').split(',').map(s => s.trim()).filter(Boolean);
                                                if (!currentCats.includes(trimmed)) {
                                                    setFormData({ ...formData, category: [...currentCats, trimmed].join(', ') });
                                                }
                                            }
                                        }}
                                        className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-xs font-bold py-1"
                                    >
                                        <Plus className="w-3 h-3" /> <span>Add New</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Title *</Label>
                            <Input
                                value={formData.title || ''}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Resource title"
                                className="bg-zinc-950 border-zinc-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description *</Label>
                            <Textarea
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of the resource"
                                className="bg-zinc-950 border-zinc-700 min-h-[80px]"
                            />
                        </div>

                        <div className="space-y-2 w-1/2 pr-2">
                            <Label>Duration (optional)</Label>
                            <Input
                                value={formData.duration || ''}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                placeholder="e.g., 25 mins"
                                className="bg-zinc-950 border-zinc-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Resource Content</Label>
                            <Tabs defaultValue="url" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 bg-zinc-950 border border-zinc-800">
                                    <TabsTrigger value="url">External Link / Video URL</TabsTrigger>
                                    <TabsTrigger value="upload">Upload File</TabsTrigger>
                                </TabsList>
                                <TabsContent value="url" className="space-y-2 mt-2">
                                    <Input
                                        value={formData.resource_url || ''}
                                        onChange={(e) => setFormData({ ...formData, resource_url: e.target.value })}
                                        placeholder="Paste YouTube, Vimeo, or Website URL..."
                                        className="bg-zinc-950 border-zinc-700"
                                    />
                                    <p className="text-xs text-zinc-500">Best for YouTube videos or external articles.</p>
                                </TabsContent>
                                <TabsContent value="upload" className="space-y-4 mt-2">
                                    <div className="flex gap-2">
                                        <Input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*,video/*,application/pdf"
                                            onChange={handleFileUpload}
                                            className="bg-zinc-950 border-zinc-700"
                                            disabled={isUploading}
                                        />
                                        {isUploading && <Loader2 className="animate-spin w-5 h-5 text-blue-500 mt-2" />}
                                    </div>
                                    {uploadStatus.message && (
                                        <p className={`text-xs ${uploadStatus.step === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                                            {uploadStatus.message}
                                        </p>
                                    )}
                                    {formData.resource_url && formData.resource_url.includes('supabase') && (
                                        <div className="p-2 bg-zinc-950 border border-green-900/30 rounded text-xs text-green-400 flex items-center gap-2">
                                            <CheckCircle2 className="w-3 h-3" /> File uploaded successfully
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between w-full">
                        {editingItem && (
                            <Button variant="destructive" onClick={handleDelete}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </Button>
                        )}
                        <div className="flex gap-2 ml-auto">
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isUploading || saving} className="bg-blue-600 hover:bg-blue-700 min-w-[100px]">
                                {saving ? <Loader2 className="animate-spin h-4 w-4" /> : (editingItem ? 'Update' : 'Add') + ' Resource'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Category Management Modal */}
            <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="capitalize">{categoryModalType} Category</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {categoryModalType === 'delete' ? (
                            <p className="text-zinc-400 text-sm">
                                Are you sure you want to delete <strong className="text-white">"{targetCategory}"</strong>?
                                Resources will be moved to "General".
                            </p>
                        ) : (
                            <div className="space-y-2">
                                <Label>Category Name</Label>
                                <Input
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="e.g. Chemicals"
                                    className="bg-zinc-900 border-zinc-800"
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
                        <Button
                            variant={categoryModalType === 'delete' ? 'destructive' : 'default'}
                            onClick={handleCategoryAction}
                            className={categoryModalType !== 'delete' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                        >
                            {categoryModalType === 'delete' ? 'Delete Permanently' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Video Player Modal */}
            < Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen} >
                <DialogContent className="bg-black border-zinc-800 text-white max-w-5xl p-0">
                    <div className="relative">
                        {playingItem && (
                            <>
                                <div className="p-4 bg-zinc-900 border-b border-zinc-800">
                                    <DialogTitle className="text-xl">{playingItem.title}</DialogTitle>
                                    {playingItem.description && (
                                        <p className="text-sm text-zinc-400 mt-1">{playingItem.description}</p>
                                    )}
                                </div>
                                <div className="aspect-video bg-black w-full">
                                    {playingItem.resource_url && (
                                        <iframe
                                            src={getEmbedUrl(playingItem.resource_url)}
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                            allowFullScreen
                                            title={playingItem.title}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog >

            {/* Content Viewer Modal */}
            <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <DialogContent className="max-w-4xl w-full max-h-[90vh] bg-zinc-950 border-zinc-800/50 p-0 overflow-hidden flex flex-col rounded-3xl">
                    {selectedItem && (
                        <>
                            {/* Header */}
                            <div className="p-6 md:p-8 bg-zinc-900/50 border-b border-zinc-800/50 shrink-0">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-xs font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                                                {selectedItem.category}
                                            </span>
                                            <span className="text-xs font-black uppercase tracking-wider text-zinc-500 bg-zinc-800/50 px-3 py-1 rounded-lg">
                                                {selectedItem.type}
                                            </span>
                                        </div>
                                        <DialogTitle className="text-2xl md:text-3xl font-black text-white leading-tight">
                                            {selectedItem.title}
                                        </DialogTitle>
                                        {selectedItem.created_at && (
                                            <p className="text-xs text-zinc-500 font-bold mt-2 uppercase tracking-widest">
                                                {new Date(selectedItem.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="overflow-y-auto flex-1 p-6 md:p-8 space-y-6">
                                {/* Thumbnail/Image */}
                                {(selectedItem.thumbnail_url || selectedItem.resource_url) && selectedItem.type !== 'article' && (
                                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
                                        <img
                                            src={selectedItem.thumbnail_url || selectedItem.resource_url}
                                            alt={selectedItem.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = "/logo-3inch.png";
                                                target.className = "w-full h-full object-contain p-8 opacity-40 grayscale";
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Description/Content */}
                                {selectedItem.description && (
                                    <div className="prose prose-invert max-w-none">
                                        <p className="text-zinc-300 text-base leading-relaxed whitespace-pre-wrap">
                                            {selectedItem.description}
                                        </p>
                                    </div>
                                )}

                                {/* Resource Link if available */}
                                {selectedItem.resource_url && !selectedItem.resource_url.startsWith('#') && selectedItem.type !== 'image' && (
                                    <div className="pt-4 border-t border-zinc-800">
                                        <Button
                                            onClick={() => window.open(selectedItem.resource_url, '_blank')}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 rounded-xl"
                                        >
                                            Open Full Resource
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-zinc-800/50 bg-zinc-900/30 shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                                        {selectedItem.duration && (
                                            <span className="font-bold">{selectedItem.duration}</span>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        onClick={() => setSelectedItem(null)}
                                        className="text-zinc-400 hover:text-white"
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    );
}
