import { useState, useEffect, useRef, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";
import { Footer } from "@/components/Footer";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    Play, Plus, Edit2, Trash2, Loader2, Image as ImageIcon, Video,
    Newspaper, User, RotateCcw, Settings, X, ChevronLeft, MessageSquare,
    Send, CheckCircle2, Globe, EyeOff, ShieldCheck, Download, ExternalLink,
    Lock, Share2, Filter, ArrowLeft, CalendarDays, Pin
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from 'react-router-dom';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import {
    getLibraryItems, upsertLibraryItem, deleteLibraryItem, deleteLibraryItems,
    LibraryItem, LibraryComment, getComments, addComment, getAllCommentCounts,
    renameLibraryCategory, deleteLibraryCategory, supabase, copyLibraryItem,
    uploadLibraryFile
} from '@/lib/supa-data';
import { compressImage } from "@/lib/imageUtils";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";

export default function PrimeBlog() {
    const { toast } = useToast();
    const [user, setUser] = useState(getCurrentUser());
    const navigate = useNavigate();
    const isAdmin = user?.role === 'admin' || (user?.role as string) === 'owner';
    const isActualAdmin = user?.role === 'admin';
    const isEmployee = user?.role === 'employee';
    const isAuth = !!user;

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [items, setItems] = useState<LibraryItem[]>([]);
    const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
    const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [visibleCount, setVisibleCount] = useState(9);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadStatus, setUploadStatus] = useState<{ step: string; message: string }>({ step: 'idle', message: '' });

    // Blog Categories
    const [activeCategory, setActiveCategory] = useState<string>("All");
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [isCustomCategory, setIsCustomCategory] = useState(false);

    const [formData, setFormData] = useState<Partial<LibraryItem>>({
        category: 'General',
        type: 'image',
        is_published: false,
        is_verified: false
    });

    const [newCategory, setNewCategory] = useState("");
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
    const [mgmtSearch, setMgmtSearch] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [dateRange, setDateRange] = useState({ start: "", end: "" });

    useEffect(() => {
        loadItems();
        const interval = setInterval(async () => {
            const counts = await getAllCommentCounts();
            setCommentCounts(counts);
        }, 30000);

        const updateAuth = () => {
            setUser(getCurrentUser());
        };
        window.addEventListener('auth-changed', updateAuth);
        window.addEventListener('storage', updateAuth);

        return () => {
            clearInterval(interval);
            window.removeEventListener('auth-changed', updateAuth);
            window.removeEventListener('storage', updateAuth);
        };
    }, []);

    const loadItems = async () => {
        setIsLoading(true);
        try {
            const data = await getLibraryItems();

            // Filter: Guests ONLY see Verified & Published. Auth users see everything.
            let blogItems = data.filter(item => item.category !== 'Chemical Training');

            // Filter Logic:
            // 1. Guests: Only see Verified & Published.
            // 2. Customers: See (Verified & Published) OR (Their own posts).
            // 3. Admin/Staff: See everything.
            if (!isAuth) {
                blogItems = blogItems.filter(item => item.is_verified && item.is_published);
            } else if (!isAdmin && !isEmployee) {
                // It's a customer
                blogItems = blogItems.filter(item =>
                    (item.is_verified && item.is_published) || (item.created_by === user?.email)
                );
            }

            setItems(blogItems);

            const dynamicCats = Array.from(new Set(blogItems.map(i => i.category))).filter(c => c && c !== 'General');
            setCustomCategories(dynamicCats);

            const counts = await getAllCommentCounts();
            setCommentCounts(counts);

        } catch (error) {
            console.error("Failed to load blog items:", error);
            toast({ title: "Error loading blog", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const canEdit = (item: LibraryItem) => {
        if (isAdmin) return true;
        if (!isAuth) return false;
        if (!item.created_by) return false;
        return item.created_by === user?.email;
    };

    const handleAddNew = (type: 'image' | 'video', category = 'General') => {
        if (!isAuth) {
            toast({ title: "Portal Access Required", description: "Please sign in to share your work.", variant: "destructive" });
            navigate('/login');
            return;
        }
        setEditingItem(null);
        setShowNewCategoryInput(false);
        setNewCategory("");
        setUploadStatus({ step: 'idle', message: '' });
        setFormData({
            category: category,
            type: type,
            title: '',
            description: '',
            resource_url: '',
            is_published: isActualAdmin, // Admin posts are published by default
            is_verified: isActualAdmin,   // Admin posts are verified by default
            created_at: new Date().toISOString()
        });
        setIsEditModalOpen(true);
    };

    const handleEdit = (item: LibraryItem) => {
        if (!canEdit(item)) {
            toast({ title: "Access Denied", description: "Only admins or the author can edit this post.", variant: "destructive" });
            return;
        }
        setEditingItem(item);
        setShowNewCategoryInput(false);
        setNewCategory("");
        setUploadStatus({ step: 'idle', message: '' });
        setFormData({ ...item });
        setIsEditModalOpen(true);
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        if (!canEdit(editingItem)) return;

        if (confirm("Permanently delete this blog post? It will be removed from the server.")) {
            const success = await deleteLibraryItem(editingItem.id);
            if (success) {
                toast({ title: "Post Deleted", description: "Successfully removed from database." });
                await loadItems();
                setIsEditModalOpen(false);
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadStatus({ step: 'compressing', message: 'Optimizing high-res image...' });

        if (file.type.startsWith('image/')) {
            const previewUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, resource_url: previewUrl, thumbnail_url: previewUrl, type: 'image' }));
        }

        try {
            const { url, error } = await uploadLibraryFile(file);
            if (error) throw new Error(error);
            if (!url) throw new Error("No URL returned from upload");

            setFormData(prev => ({ ...prev, resource_url: url, thumbnail_url: url }));
            setUploadStatus({ step: 'done', message: 'Upload Complete' });
            setIsUploading(false);
            toast({ title: "Photo Ready", description: "Image processed successfully." });

        } catch (err: any) {
            console.error('Upload failed:', err);
            toast({ title: "Upload Failed", description: err.message || "Cloud connection error.", variant: "destructive" });
            setIsUploading(false);
            setUploadStatus({ step: 'error', message: 'Upload failed' });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) {
            toast({ title: "Title Required", description: "Please add a story title.", variant: "destructive" });
            return;
        }

        let finalResourceUrl = formData.resource_url;
        // If no URL or it's a temporary blob URL (from failed/incomplete upload), use placeholder
        if (!finalResourceUrl || finalResourceUrl.startsWith('blob:')) {
            const proceed = window.confirm("Are you sure you want to post without a picture? We'll use the Prime Auto Detail logo as a placeholder.");
            if (!proceed) return;
            finalResourceUrl = "/logo-3inch.png";
        }

        setIsUploading(true);
        const itemToSave: LibraryItem = {
            ...formData,
            id: formData.id || crypto.randomUUID(),
            created_by: (!formData.created_by && user?.email) ? user.email : formData.created_by,
            title: formData.title || '',
            description: formData.description || '',
            type: formData.type || 'image',
            category: formData.category || 'General',
            resource_url: finalResourceUrl,
            thumbnail_url: formData.thumbnail_url || finalResourceUrl,
            is_published: formData.is_published ?? false,
            is_verified: formData.is_verified ?? false,
            created_at: formData.created_at || new Date().toISOString()
        } as LibraryItem;

        try {
            const result = await upsertLibraryItem(itemToSave);
            if (result.success) {
                // If not ACTUAL admin, trigger notification workflow
                if (!isActualAdmin) {
                    try {
                        // 1. Generate PDF Report of the submission
                        const doc = new jsPDF();
                        doc.setFontSize(22);
                        doc.setTextColor(63, 81, 181); // Indigo color
                        doc.text("PRIME BLOG SUBMISSION", 105, 20, { align: "center" });

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
                        doc.text("POST CONTENT", 20, 70);
                        doc.setFontSize(11);
                        doc.text(`Title: ${itemToSave.title}`, 25, 77);
                        doc.text(`Category: ${itemToSave.category}`, 25, 83);
                        doc.text(`Media Type: ${itemToSave.type}`, 25, 89);

                        doc.setFontSize(14);
                        doc.text("STORY / DESCRIPTION", 20, 100);
                        doc.setFontSize(10);
                        const lines = doc.splitTextToSize(itemToSave.description || 'No description provided.', 160);
                        doc.text(lines, 25, 107);

                        const pdfDataUrl = doc.output('dataurlstring');

                        // 2. Save to PDF Archive (File Manager)
                        savePDFToArchive("Admin Updates", user?.email || 'User', `blog_${itemToSave.id}`, pdfDataUrl, {
                            fileName: `Blog_Submission_${itemToSave.title.replace(/\s/g, '_')}_${Date.now()}.pdf`
                        });

                        // 3. Prepare Gmail Notification
                        const subject = `[ACTION REQUIRED] New Blog Submission: ${itemToSave.title}`;
                        const body = `Hello Rick,\n\nA new blog story has been submitted for your approval.\n\n` +
                            `AUTHOR: ${user?.email || 'Anonymous'}\n` +
                            `TITLE: ${itemToSave.title}\n` +
                            `CATEGORY: ${itemToSave.category}\n\n` +
                            `STORY PREVIEW:\n${itemToSave.description}\n\n` +
                            `VIEW & APPROVE HERE:\n${window.location.origin}/blog\n\n` +
                            `A complete PDF record has also been archived in your File Manager under 'Admin Updates'.`;

                        const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=Rick.PrimeAutoDetail@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                        window.open(gmailLink, "_blank");
                    } catch (err) {
                        console.error("Auto-notification failed:", err);
                    }
                }

                toast({ title: 'Post Published', description: itemToSave.is_published ? 'Post is now live!' : 'Post submitted for review.' });
                setIsEditModalOpen(false);
                loadItems();
            } else {
                console.error('Upsert failed:', result.error);
                toast({ title: 'Save Failed', description: result.error?.message || 'Database error. Verify your table schema exists.', variant: 'destructive' });
            }
        } catch (error: any) {
            console.error('Save exception:', error);
            toast({ title: 'Critical Error', description: error.message || "An unexpected error occurred during save.", variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownload = (item: LibraryItem) => {
        const link = document.createElement('a');
        link.href = item.resource_url || '';
        link.download = `${item.title.replace(/\s+/g, '_')}_prime_blog`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getEmbedUrl = (url: string): string => {
        if (!url) return '';
        try {
            if (url.includes('youtube.com/watch')) {
                const videoId = new URL(url).searchParams.get('v');
                return `https://www.youtube.com/embed/${videoId}?autoplay=0`;
            }
            if (url.includes('youtu.be/')) {
                const videoId = url.split('youtu.be/')[1]?.split('?')[0];
                return `https://www.youtube.com/embed/${videoId}?autoplay=0`;
            }
        } catch { }
        return url;
    };

    const displayedItems = items.filter(item => {
        // Category filter
        const matchesCategory = activeCategory === 'All'
            ? true
            : activeCategory === 'NEEDS REVIEW'
                ? !item.is_verified
                : item.category === activeCategory;

        // Search filter
        const searchStr = searchTerm.toLowerCase();
        const matchesSearch = item.title.toLowerCase().includes(searchStr) ||
            item.description.toLowerCase().includes(searchStr);

        // Date range filter
        const itemDate = item.created_at ? new Date(item.created_at).getTime() : 0;
        const start = dateRange.start ? new Date(dateRange.start).getTime() : 0;
        // Set end to end of day
        const end = dateRange.end ? new Date(dateRange.end).getTime() + 86400000 : Infinity;
        const matchesDate = itemDate >= start && itemDate <= end;

        return matchesCategory && matchesSearch && matchesDate;
    });

    const filteredMgmtItems = items.filter(item =>
        item.title.toLowerCase().includes(mgmtSearch.toLowerCase()) ||
        item.category.toLowerCase().includes(mgmtSearch.toLowerCase()) ||
        item.description.toLowerCase().includes(mgmtSearch.toLowerCase())
    );

    const handleBatchUpdate = async (ids: string[], updates: Partial<LibraryItem>) => {
        setIsProcessing(true);
        try {
            const promises = ids.map(id => {
                const original = items.find(i => i.id === id);
                if (!original) return null;
                return upsertLibraryItem({ ...original, ...updates });
            }).filter(Boolean);

            await Promise.all(promises);
            toast({ title: "Batch Update Successful", description: `Updated ${ids.length} posts.` });
            await loadItems();
            setSelectedPostIds([]);
        } catch (err) {
            toast({ title: "Batch Update Failed", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleSinglePostState = async (item: LibraryItem, field: 'is_verified' | 'is_published') => {
        const updated = { ...item, [field]: !item[field] };
        const res = await upsertLibraryItem(updated);
        if (res.success) {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, [field]: !i[field] } : i));
            toast({ title: "Status Updated", description: `${field.replace('is_', '').toUpperCase()} is now ${updated[field] ? 'ON' : 'OFF'}` });
        }
    };

    const handleRenameCategory = async (oldName: string) => {
        const newName = prompt(`Enter new name for category "${oldName}":`, oldName);
        if (!newName || newName === oldName) return;

        setIsProcessing(true);
        const res = await renameLibraryCategory(oldName, newName);
        if (res.success) {
            toast({ title: "Category Updated", description: `Renamed ${res.count} posts to "${newName}".` });
            await loadItems();
        }
        setIsProcessing(false);
    };

    const handleDeleteCategory = async (catName: string) => {
        if (!confirm(`Are you sure? This will NOT delete the posts, but will move all posts in "${catName}" to "General".`)) return;

        setIsProcessing(true);
        const res = await deleteLibraryCategory(catName);
        if (res.success) {
            toast({ title: "Category Removed", description: `Moved ${res.count} posts to General.` });
            await loadItems();
        }
        setIsProcessing(false);
    };

    const handleBulkDelete = async (type: 'unverified' | 'all') => {
        const message = type === 'all'
            ? "PERMANENTLY DELETE ALL BLOG POSTS? This cannot be undone."
            : "Delete all unverified/draft posts?";

        if (!confirm(message)) return;

        setIsProcessing(true);
        try {
            if (type === 'all') {
                const res = await deleteLibraryItems('all');
                toast({ title: "Blog Purged", description: `Removed ${res.count} items.` });
            } else {
                // Filter unverified items
                const unverified = items.filter(i => !i.is_verified);
                for (const item of unverified) {
                    await deleteLibraryItem(item.id);
                }
                toast({ title: "Cleanup Complete", description: `Deleted ${unverified.length} unverified posts.` });
            }
            await loadItems();
        } catch (err) {
            toast({ title: "Bulk Action Failed", variant: "destructive" });
        }
        setIsProcessing(false);
    };

    const handleCrossCopy = async (item: LibraryItem, target: 'library' | 'blog') => {
        setIsProcessing(true);
        const targetCategory = target === 'library' ? 'Chemical Training' : 'General';
        try {
            // Force published/verified ONLY if the person doing the copying IS the admin
            const res = await copyLibraryItem({
                ...item,
                is_published: target === 'blog' ? isActualAdmin : item.is_published,
                is_verified: target === 'blog' ? isActualAdmin : item.is_verified
            }, targetCategory);
            if (res.success) {
                toast({
                    title: "Content Cloned",
                    description: `This story is now also available in the ${target === 'library' ? 'Learning Library' : 'Public Blog'}.`
                });
                await loadItems();
            } else {
                throw new Error("Cloning operation failed.");
            }
        } catch (err) {
            toast({ title: "Transfer Failed", variant: "destructive", description: "Cloud synchronization error." });
        }
        setIsProcessing(false);
    };

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
            <Navbar />

            <main className="flex-1">
                {/* Admin Needs Review Banner */}
                {isActualAdmin && items.some(i => !i.is_verified) && (
                    <div className="bg-red-600/10 border-b border-red-500/20 py-3 animate-in slide-in-from-top duration-500">
                        <div className="container mx-auto px-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="w-5 h-5 text-red-500 animate-pulse" />
                                <p className="text-xs font-black uppercase tracking-widest text-red-400">
                                    Attention: {items.filter(i => !i.is_verified).length} blog posts are waiting for your verification.
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveCategory('NEEDS REVIEW')}
                                className="text-[10px] font-black uppercase tracking-tighter hover:bg-red-500 hover:text-white rounded-xl h-8 px-4"
                            >
                                REVIEW NOW
                            </Button>
                        </div>
                    </div>
                )}

                {/* Glossy Header */}
                <div className="relative overflow-hidden bg-zinc-950 pt-24 pb-16 border-b border-zinc-800/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-transparent to-purple-950/20" />
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
                            <div className="space-y-4 max-w-2xl text-left">
                                <div className="flex items-center gap-4">
                                    <Badge variant="outline" className="text-indigo-400 border-indigo-400/30 animate-pulse-subtle bg-indigo-500/5 px-3 py-1 uppercase tracking-widest text-[10px] font-black">
                                        Showcase & Tips
                                    </Badge>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none group flex items-baseline gap-4">
                                    <span>
                                        THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-purple-400">PRIME</span> BLOG
                                    </span>
                                    <span className="text-xl md:text-2xl font-black text-zinc-700 bg-zinc-800/50 px-3 py-1 rounded-2xl border border-zinc-800">
                                        {items.length}
                                    </span>
                                </h1>
                                <p className="text-zinc-400 text-lg font-medium leading-relaxed">
                                    Explore the details behind our finest transformations, technical tips from the pros, and daily operations at Prime Auto Detail.
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={loadItems}
                                        className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-400 rounded-2xl h-12 w-12"
                                        disabled={isLoading}
                                    >
                                        <RotateCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                                    </Button>
                                    <Button
                                        onClick={() => handleAddNew('image')}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-8 h-12 rounded-2xl shadow-xl shadow-indigo-500/10 transition-all hover:scale-105 active:scale-95 group"
                                    >
                                        <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                                        SHARE YOUR WORK
                                    </Button>
                                </div>
                                {!isAuth ? (
                                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] animate-pulse pr-2 flex items-center gap-2">
                                        <Lock className="w-3 h-3" /> Sign in required to share
                                    </p>
                                ) : !isAdmin && (
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] pr-2 flex items-center gap-2">
                                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Member submissions require review
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-12 max-w-7xl">
                    {/* Category & Filters */}
                    <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6 bg-zinc-900/30 p-2 rounded-[28px] border border-zinc-800/50 backdrop-blur-xl">
                        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full md:w-auto">
                            <TabsList className="bg-transparent h-14 p-1 gap-1">
                                <TabsTrigger value="All" className="rounded-2xl px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all text-zinc-400 font-bold">ALL POSTS</TabsTrigger>
                                {isActualAdmin && items.some(i => !i.is_verified) && (
                                    <TabsTrigger value="NEEDS REVIEW" className="rounded-2xl px-6 data-[state=active]:bg-red-600 data-[state=active]:text-white transition-all text-red-400 font-bold flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" />
                                        NEEDS REVIEW
                                        <Badge className="bg-white/20 text-white border-none text-[10px] px-1.5 h-4 ml-1">
                                            {items.filter(i => !i.is_verified).length}
                                        </Badge>
                                    </TabsTrigger>
                                )}
                                <TabsTrigger value="General" className="rounded-2xl px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all text-zinc-400 font-bold">UPDATES</TabsTrigger>
                                {customCategories.map(cat => (
                                    <TabsTrigger key={cat} value={cat} className="rounded-2xl px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all text-zinc-400 font-bold uppercase">{cat}</TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>

                        <div className="flex flex-wrap items-center gap-4 px-4 w-full md:w-auto">
                            <div className="flex items-center gap-2 bg-zinc-950/50 border border-zinc-800 rounded-2xl px-3 h-11">
                                <CalendarDays className="w-4 h-4 text-zinc-500" />
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    className="bg-transparent border-none text-[10px] font-black text-zinc-400 focus:ring-0 w-24 outline-none uppercase"
                                    placeholder="Start"
                                />
                                <span className="text-zinc-700 font-bold">/</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    className="bg-transparent border-none text-[10px] font-black text-zinc-400 focus:ring-0 w-24 outline-none uppercase"
                                    placeholder="End"
                                />
                                {(dateRange.start || dateRange.end) && (
                                    <button
                                        onClick={() => setDateRange({ start: "", end: "" })}
                                        className="p-1 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            <div className="relative group flex-1 md:w-64">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <Input
                                    placeholder="Search stories..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="bg-zinc-950/50 border-zinc-800 pl-10 rounded-2xl h-11 focus:border-indigo-500/50 transition-all text-xs font-medium"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            {isAdmin && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsSettingsModalOpen(true)}
                                    className="h-11 w-11 rounded-2xl bg-zinc-950/50 border border-zinc-800 hover:bg-zinc-800 active:scale-90 transition-all"
                                >
                                    <Settings className="w-4 h-4 text-zinc-400" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="aspect-[4/5] rounded-[32px] bg-zinc-900 animate-pulse border border-zinc-800" />
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {displayedItems.slice(0, visibleCount).map(item => (
                                    <Card
                                        key={item.id}
                                        className="group relative bg-zinc-950 border-none rounded-[32px] overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 border border-zinc-900/50"
                                    >
                                        {/* Verification Badge */}
                                        {isAdmin && (
                                            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                                                {!item.is_verified && <Badge className="bg-red-500/20 text-red-500 border-red-500/30 backdrop-blur-md uppercase tracking-tighter text-[10px]"><EyeOff className="w-3 h-3 mr-1" /> UNVERIFIED</Badge>}
                                                {!item.is_published && <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 backdrop-blur-md uppercase tracking-tighter text-[10px]"><Lock className="w-3 h-3 mr-1" /> DRAFT</Badge>}
                                                {item.is_pinned && <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 backdrop-blur-md uppercase tracking-tighter text-[10px]"><Pin className="w-3 h-3 mr-1 fill-indigo-400" /> PINNED</Badge>}
                                            </div>
                                        )}

                                        {/* Media Section */}
                                        <div
                                            className="relative aspect-square cursor-pointer overflow-hidden"
                                            onClick={() => setSelectedItem(item)}
                                        >
                                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors z-10" />
                                            {item.type === 'video' ? (
                                                <div className="w-full h-full bg-zinc-900 relative flex items-center justify-center">
                                                    <video src={item.resource_url} className="w-full h-full object-cover" />
                                                    <div className="absolute z-20 flex items-center justify-center pointer-events-none group-hover:scale-110 transition-transform">
                                                        <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center">
                                                            <Play className="w-8 h-8 text-white fill-white" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <img
                                                    src={item.resource_url}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = "/logo-3inch.png";
                                                        target.className = "w-full h-full object-contain p-8 opacity-40 grayscale";
                                                    }}
                                                />
                                            )}

                                            {/* Bottom Overlay Info */}
                                            <div className="absolute inset-x-0 bottom-0 p-6 z-20 bg-gradient-to-t from-black via-black/40 to-transparent flex items-end justify-between">
                                                <div className="space-y-1 text-left">
                                                    <Badge className="bg-white/10 backdrop-blur-md text-white border-white/10 uppercase tracking-widest text-[9px] font-black">
                                                        {item.category}
                                                    </Badge>
                                                    <h3 className="text-xl font-black text-white leading-tight line-clamp-2">{item.title}</h3>
                                                </div>
                                                {item.is_verified && <CheckCircle2 className="w-6 h-6 text-indigo-400 drop-shadow-lg animate-pulse-subtle" />}
                                            </div>
                                        </div>

                                        {/* Content Section */}
                                        <div className="p-6 flex flex-col flex-1 space-y-4 text-left">
                                            <p className="text-zinc-500 text-sm font-medium line-clamp-3 leading-relaxed">{item.description}</p>

                                            <div className="flex items-center justify-between mt-auto pt-6 border-t border-zinc-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                                        <User className="w-4 h-4 text-indigo-400" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-zinc-300 uppercase tracking-tighter">
                                                            {item.created_by ? item.created_by.split('@')[0] : 'PRO TEAM'}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                                                            {new Date(item.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1.5 text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded-xl border border-zinc-800">
                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-black">{commentCounts[item.id] || 0}</span>
                                                    </div>
                                                    {canEdit(item) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-500 hover:text-white"
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {displayedItems.length === 0 && (
                                <div className="text-center py-32 space-y-4">
                                    <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto border border-zinc-800 mb-6">
                                        <Newspaper className="w-10 h-10 text-zinc-700" />
                                    </div>
                                    <h3 className="text-3xl font-black text-white">JOURNEY PENDING</h3>
                                    <p className="text-zinc-500 max-w-sm mx-auto font-medium">No verified posts match this criteria yet. Check back soon for new detailing transformations!</p>
                                    {!isAuth && (
                                        <Button asChild variant="outline" className="rounded-2xl border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 h-12 px-8 mt-4">
                                            <Link to="/login">SIGN IN TO SHARE YOUR STORY</Link>
                                        </Button>
                                    )}
                                </div>
                            )}

                            {displayedItems.length > visibleCount && (
                                <div className="flex justify-center mt-16">
                                    <Button
                                        variant="outline"
                                        className="bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-white font-black px-12 h-14 rounded-2xl"
                                        onClick={() => setVisibleCount(p => p + 9)}
                                    >
                                        LOAD MORE STORIES
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Premium Lightbox Modal - Redesigned to Vertical Layout */}
                {
                    selectedItem && (
                        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                            <DialogContent className="max-w-5xl w-full max-h-[95vh] bg-zinc-950 border-zinc-800/50 p-0 overflow-hidden flex flex-col rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.8)] focus:outline-none">

                                {/* 1. Top Title Box - Professional Full Width Header */}
                                <div className="relative p-8 md:p-10 bg-zinc-900/50 border-b border-zinc-800/50 shrink-0 text-left">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSelectedItem(null)}
                                        className="absolute top-6 right-6 z-50 rounded-2xl bg-zinc-800 hover:bg-red-600 text-white border border-white/5 w-12 h-12 transition-all active:scale-90"
                                    >
                                        <X className="w-6 h-6" />
                                    </Button>

                                    <div className="max-w-3xl space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="text-indigo-400 border-indigo-400/30 uppercase tracking-widest px-3 py-1 font-black text-[10px] bg-indigo-500/5">
                                                {selectedItem.category}
                                            </Badge>
                                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                                Published {new Date(selectedItem.created_at || '').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.1] pr-12">
                                            {selectedItem.title}
                                        </h2>
                                        <div className="flex items-center gap-4 pt-2">
                                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                                <User className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-zinc-200 uppercase tracking-tighter">
                                                    {selectedItem.created_by ? selectedItem.created_by.split('@')[0] : 'PRIME STAFF'}
                                                </span>
                                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest italic">Prime Certified Partner</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Scrollable Body Area */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950">

                                    {/* Centered Media Section */}
                                    <div className="bg-black/40 flex items-center justify-center min-h-[300px] md:min-h-[500px] w-full border-b border-zinc-900">
                                        <div className="relative w-full h-full flex items-center justify-center p-4">
                                            {selectedItem.type === 'video' ? (
                                                <div className="w-full max-w-4xl aspect-video rounded-[32px] overflow-hidden shadow-2xl border border-zinc-800">
                                                    <video src={selectedItem.resource_url} className="w-full h-full object-cover" controls autoPlay />
                                                </div>
                                            ) : (
                                                <div className="relative group max-w-4xl">
                                                    <img
                                                        src={selectedItem.resource_url}
                                                        className="max-h-[70vh] w-auto rounded-[32px] shadow-2xl border border-zinc-800 object-contain"
                                                        alt={selectedItem.title}
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.src = "/logo-3inch.png";
                                                            target.className = "max-h-[300px] w-auto opacity-40 grayscale p-12";
                                                        }}
                                                    />
                                                    <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="secondary"
                                                            className="bg-black/60 hover:bg-black/80 text-white backdrop-blur-xl border border-white/10 rounded-2xl h-11 px-6 font-black"
                                                            onClick={() => handleDownload(selectedItem)}
                                                        >
                                                            <Download className="w-4 h-4 mr-2" /> DOWNLOAD ORIGINAL
                                                        </Button>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="secondary"
                                                                className="bg-black/60 hover:bg-black/80 text-white backdrop-blur-xl border border-white/10 rounded-2xl h-11 w-11 p-0 flex items-center justify-center"
                                                                onClick={() => {
                                                                    if (navigator.share) {
                                                                        navigator.share({
                                                                            title: selectedItem.title,
                                                                            text: selectedItem.description,
                                                                            url: window.location.href
                                                                        }).catch(() => { });
                                                                    } else {
                                                                        navigator.clipboard.writeText(window.location.href);
                                                                        toast({ title: "Link Copied", description: "Url saved to clipboard." });
                                                                    }
                                                                }}
                                                            >
                                                                <Share2 className="w-4 h-4" />
                                                            </Button>
                                                            {selectedItem.is_verified && (
                                                                <Badge className="bg-indigo-600 text-white border-white/10 font-black h-11 px-4 rounded-2xl shadow-xl">
                                                                    <ShieldCheck className="w-4 h-4 mr-2" /> VERIFIED
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. Large Description & Content Area */}
                                    <div className="max-w-4xl mx-auto p-8 md:p-12 space-y-12 text-left">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-px bg-zinc-800 flex-1" />
                                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Story & Transformation</span>
                                                <div className="h-px bg-zinc-800 flex-1" />
                                            </div>
                                            <div className="bg-zinc-900/20 p-8 md:p-12 rounded-[40px] border border-zinc-800/50 shadow-inner">
                                                <p className="text-zinc-200 leading-relaxed text-xl md:text-2xl font-medium whitespace-pre-wrap selection:bg-indigo-500/30">
                                                    {selectedItem.description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* 4. Comments Section below everything */}
                                        <div className="space-y-8 pb-12">
                                            <div className="flex items-center gap-4">
                                                <MessageSquare className="w-6 h-6 text-indigo-400" />
                                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Community Discussion</h3>
                                                <div className="h-px bg-zinc-800 flex-1" />
                                            </div>

                                            {!isAuth ? (
                                                <div className="bg-gradient-to-br from-indigo-950/20 to-purple-950/20 border border-indigo-500/20 rounded-[40px] p-10 text-center space-y-6">
                                                    <Lock className="w-12 h-12 text-indigo-400 mx-auto" />
                                                    <div className="space-y-2">
                                                        <h4 className="text-2xl font-black text-white uppercase tracking-tighter">JOIN THE CONVERSATION</h4>
                                                        <p className="text-zinc-400 font-medium px-4">Sign in to your Prime account to share tips, ask questions, or just give a shoutout!</p>
                                                    </div>
                                                    <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl px-10 h-14 shadow-xl shadow-indigo-500/20 transition-all hover:scale-105">
                                                        <Link to="/login">SIGN IN TO PARTICIPATE</Link>
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="p-8 bg-zinc-900/30 rounded-[40px] border border-zinc-800/50">
                                                    <CommentsSection
                                                        postId={selectedItem.id}
                                                        currentUser={user}
                                                        onCommentAdded={() => {
                                                            setCommentCounts(prev => ({ ...prev, [selectedItem.id]: (prev[selectedItem.id] || 0) + 1 }));
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )
                }

                {/* Add/Edit Post Designer Modal */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] rounded-[40px] p-0 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)] flex flex-col max-h-[90vh]">
                        <DialogHeader className="p-8 pb-0 flex flex-row items-center justify-between">
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                                {editingItem ? 'REFINE POST' : 'COMPOSE STORY'}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Use this form to {editingItem ? 'edit' : 'create'} a blog post with title, category, and visual assets.
                            </DialogDescription>
                            <Badge variant="outline" className="text-indigo-400 border-indigo-500/30">Prime Editor v2</Badge>
                        </DialogHeader>

                        <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="uppercase text-[10px] font-black tracking-widest text-zinc-500 ml-1">Title & Theme</Label>
                                            <Input
                                                value={formData.title || ''}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                className="bg-zinc-900 border-zinc-800 rounded-2xl h-14 font-black"
                                                placeholder="Captivating Post Headline"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="uppercase text-[10px] font-black tracking-widest text-zinc-500 ml-1">Classification</Label>
                                            <Select
                                                value={showNewCategoryInput ? "ADD_NEW" : formData.category}
                                                onValueChange={(val) => {
                                                    if (val === "ADD_NEW") {
                                                        setShowNewCategoryInput(true);
                                                        setFormData({ ...formData, category: "" });
                                                    } else {
                                                        setShowNewCategoryInput(false);
                                                        setFormData({ ...formData, category: val });
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-2xl h-14 font-bold">
                                                    <SelectValue placeholder="Select Category" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                                    <SelectItem value="General">General Updates</SelectItem>
                                                    <SelectItem value="Before & After">Elite Transformations</SelectItem>
                                                    <SelectItem value="Tips & Tricks">Pro Tips</SelectItem>
                                                    <SelectItem value="Setup">Equipment Setup</SelectItem>
                                                    {customCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                    <Separator className="my-2 bg-zinc-800" />
                                                    <SelectItem value="ADD_NEW" className="text-indigo-400 font-black">➕ CREATE NEW CATEGORY</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {showNewCategoryInput && (
                                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                                <Label className="uppercase text-[10px] font-black tracking-widest text-indigo-400 ml-1">New Category Name</Label>
                                                <Input
                                                    value={newCategory}
                                                    onChange={e => {
                                                        setNewCategory(e.target.value);
                                                        setFormData({ ...formData, category: e.target.value });
                                                    }}
                                                    className="bg-zinc-900 border-indigo-500/50 rounded-2xl h-14 font-black"
                                                    placeholder="e.g. Inside the Shop"
                                                    autoFocus
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label className="uppercase text-[10px] font-black tracking-widest text-zinc-500 ml-1">Content / Story</Label>
                                            <Textarea
                                                value={formData.description || ''}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                className="bg-zinc-900 border-zinc-800 border rounded-2xl min-h-[160px] font-medium leading-relaxed p-4"
                                                placeholder="What's the story behind this work?"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <Label className="uppercase text-[10px] font-black tracking-widest text-zinc-500 ml-1 block">Visual Assets</Label>
                                        <div
                                            className={`relative aspect-square rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden ${formData.resource_url ? 'border-indigo-500/50 hover:border-indigo-500' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'}`}
                                        >
                                            {formData.resource_url ? (
                                                <>
                                                    <img src={formData.resource_url} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} className="rounded-2xl">REPLACE</Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center p-8 space-y-4" onClick={() => fileInputRef.current?.click()}>
                                                    <ImageIcon className="w-12 h-12 text-zinc-700 mx-auto" />
                                                    <div className="space-y-1">
                                                        <p className="font-black text-sm uppercase tracking-tighter">DRAG OR TAP TO UPLOAD</p>
                                                        <p className="text-[10px] text-zinc-600 font-bold">OPTIMIZED FOR 4:5 ASIA-X RESOLUTION</p>
                                                    </div>
                                                </div>
                                            )}
                                            <input ref={fileInputRef} type="file" hidden onChange={handleFileUpload} accept="image/*" />
                                            {isUploading && (
                                                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex flex-col items-center justify-center space-y-4 text-center p-6">
                                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-indigo-400">{uploadStatus.message}</p>
                                                </div>
                                            )}
                                        </div>

                                        {isAdmin && (
                                            <div className="p-6 rounded-[28px] bg-indigo-500/5 border border-indigo-500/20 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-black text-indigo-400 uppercase tracking-tighter flex items-center gap-2">
                                                            <ShieldCheck className="w-3.5 h-3.5" /> VERIFICATION STATUS
                                                        </p>
                                                        <p className="text-[10px] text-zinc-500 font-medium">Verify this post is accurate and pro-quality.</p>
                                                    </div>
                                                    <Switch
                                                        checked={formData.is_verified}
                                                        onCheckedChange={v => setFormData({ ...formData, is_verified: v })}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-black text-indigo-400 uppercase tracking-tighter flex items-center gap-2">
                                                            <Globe className="w-3.5 h-3.5" /> SEND TO PUBLIC WEBSITE
                                                        </p>
                                                        <p className="text-[10px] text-zinc-500 font-medium">Allow guests to view this on the home portal.</p>
                                                    </div>
                                                    <Switch
                                                        checked={formData.is_published}
                                                        onCheckedChange={v => setFormData({ ...formData, is_published: v })}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-black text-indigo-400 uppercase tracking-tighter flex items-center gap-2">
                                                            <Pin className="w-3.5 h-3.5" /> PIN TO TOP
                                                        </p>
                                                        <p className="text-[10px] text-zinc-500 font-medium">Keep this story at the very peak of the blog feed.</p>
                                                    </div>
                                                    <Switch
                                                        checked={formData.is_pinned}
                                                        onCheckedChange={v => setFormData({ ...formData, is_pinned: v })}
                                                    />
                                                </div>

                                                <div className="space-y-4 pt-4 border-t border-indigo-500/10">
                                                    <div className="flex flex-col gap-2">
                                                        <Label className="uppercase text-[10px] font-black tracking-widest text-indigo-400 ml-1 flex items-center gap-2">
                                                            <CalendarDays className="w-3.5 h-3.5" /> PUBLISH DATE & TIME
                                                        </Label>
                                                        <Input
                                                            type="datetime-local"
                                                            value={formData.created_at ? new Date(new Date(formData.created_at).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                                                            onChange={e => {
                                                                const date = new Date(e.target.value);
                                                                if (!isNaN(date.getTime())) {
                                                                    setFormData({ ...formData, created_at: date.toISOString() });
                                                                }
                                                            }}
                                                            className="bg-zinc-900 border-indigo-500/20 rounded-xl h-12 font-black text-indigo-300"
                                                        />
                                                        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest pl-1">
                                                            Manually adjust the timestamp to reorder chronologically
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="p-8 border-t border-zinc-800/50 bg-zinc-900/20 shrink-0 gap-4">
                                {editingItem && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-2xl px-6 h-14 font-black transition-all"
                                        onClick={handleDelete}
                                    >
                                        <Trash2 className="w-5 h-5 mr-2" /> DISCARD POST
                                    </Button>
                                )}
                                <div className="flex gap-4 ml-auto w-full sm:w-auto">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="rounded-2xl px-8 h-14 font-bold text-zinc-400 hover:text-white"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        disabled={isUploading}
                                        type="submit"
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl px-12 h-14 shadow-xl shadow-indigo-600/20 transition-all flex-1 sm:flex-none"
                                    >
                                        {isUploading ? (
                                            <Loader2 className="animate-spin" />
                                        ) : (
                                            isActualAdmin ?
                                                (editingItem ? 'UPDATE STORY' : 'SAVE & PUBLISH STORY') :
                                                'SUBMIT FOR REVIEW'
                                        )}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Admin Blog Config Modal - Massive Upgrade */}
                <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
                    <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-6xl w-[95vw] h-[90vh] rounded-[40px] p-0 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col">
                        <DialogHeader className="p-8 pb-6 border-b border-zinc-900 bg-zinc-900/20 shrink-0">
                            <div className="flex items-center justify-between w-full">
                                <div className="space-y-1">
                                    <DialogTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                                        <Settings className="w-8 h-8 text-indigo-400 group-hover:rotate-90 transition-transform duration-500" />
                                        Blog Management Suite
                                    </DialogTitle>
                                    <DialogDescription className="sr-only">
                                        Advanced control panel for managing blog posts, categories, and batch operations.
                                    </DialogDescription>
                                    <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.3em]">Precision Control Panel v4.0</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsSettingsModalOpen(false)}
                                    className="rounded-2xl bg-zinc-900 hover:bg-red-600 text-white w-12 h-12"
                                >
                                    <X className="w-6 h-6" />
                                </Button>
                            </div>
                        </DialogHeader>

                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row divide-x divide-zinc-900">
                            {/* LEFT: POST LIST MANAGEMENT (3/5) */}
                            <div className="lg:col-span-3 flex-1 flex flex-col overflow-hidden">
                                {/* Mgmt Toolbar */}
                                <div className="p-6 bg-zinc-950/50 flex flex-col md:flex-row gap-4 border-b border-zinc-900">
                                    <div className="relative flex-1">
                                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                        <Input
                                            placeholder="Quick filter posts by title or tag..."
                                            className="bg-zinc-900 border-zinc-800 pl-10 h-12 rounded-2xl font-bold"
                                            value={mgmtSearch}
                                            onChange={e => setMgmtSearch(e.target.value)}
                                        />
                                    </div>

                                    {selectedPostIds.length > 0 && (
                                        <div className="flex gap-2 animate-in fade-in slide-in-from-right-4">
                                            <Button
                                                size="sm"
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl h-12 px-5"
                                                onClick={() => handleBatchUpdate(selectedPostIds, { is_verified: true, is_published: true })}
                                            >
                                                VERIFY & RELEASE ({selectedPostIds.length})
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-zinc-800 text-zinc-400 hover:text-white rounded-xl h-12 px-5"
                                                onClick={() => handleBatchUpdate(selectedPostIds, { is_published: false })}
                                            >
                                                HIDE ALL
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Post Table List */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                    <div className="space-y-3">
                                        {filteredMgmtItems.map(item => (
                                            <div
                                                key={item.id}
                                                className={`flex items-center gap-4 p-4 rounded-3xl border transition-all duration-300 ${selectedPostIds.includes(item.id) ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-zinc-900/30 border-zinc-900 hover:border-zinc-800'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded-lg border-2 border-zinc-800 bg-transparent checked:bg-indigo-500 checked:border-indigo-500 transition-all cursor-pointer accent-indigo-500"
                                                    checked={selectedPostIds.includes(item.id)}
                                                    onChange={() => {
                                                        setSelectedPostIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                                                    }}
                                                />

                                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black shrink-0 border border-zinc-800">
                                                    {item.type === 'video' ? (
                                                        <div className="w-full h-full flex items-center justify-center bg-zinc-900"><Play className="w-4 h-4 text-zinc-500" /></div>
                                                    ) : (
                                                        <img src={item.resource_url} className="w-full h-full object-cover" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0 text-left">
                                                    <h4 className="font-black text-sm text-white truncate uppercase tracking-tighter">{item.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge className="bg-zinc-800 text-zinc-500 border-none px-2 py-0 h-5 text-[9px] font-black uppercase tracking-widest">{item.category}</Badge>
                                                        <span className="text-[10px] text-zinc-600 font-bold uppercase">{new Date(item.created_at || '').toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                {/* Control States */}
                                                <div className="flex items-center gap-6 px-4">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-[8px] font-black text-zinc-600 uppercase">Verify</span>
                                                        <Switch
                                                            checked={item.is_verified}
                                                            onCheckedChange={() => toggleSinglePostState(item, 'is_verified')}
                                                            className="data-[state=checked]:bg-indigo-500"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-[8px] font-black text-zinc-600 uppercase">Public</span>
                                                        <Switch
                                                            checked={item.is_published}
                                                            onCheckedChange={() => toggleSinglePostState(item, 'is_published')}
                                                            className="data-[state=checked]:bg-emerald-500"
                                                        />
                                                    </div>

                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-[8px] font-black text-indigo-400 uppercase">Transfer</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg hover:bg-indigo-500/20 text-indigo-400"
                                                            onClick={() => handleCrossCopy(item, item.category === 'Chemical Training' ? 'blog' : 'library')}
                                                            title={item.category === 'Chemical Training' ? 'Copy to Blog' : 'Copy to Library'}
                                                        >
                                                            <Share2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 rounded-xl bg-zinc-900 hover:bg-indigo-500/20 text-zinc-500 hover:text-indigo-400"
                                                    onClick={() => {
                                                        setSelectedItem(null); // Close current view
                                                        handleEdit(item);
                                                    }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: ENGINE CONFIG (2/5) */}
                            <div className="w-full lg:w-[380px] bg-zinc-950/80 p-8 space-y-10 overflow-y-auto">
                                {/* Create New Entry Point */}
                                <div className="space-y-4">
                                    <Label className="uppercase text-[10px] font-black tracking-[0.2em] text-indigo-400 ml-1">New Construction</Label>
                                    <Button
                                        className="w-full h-14 rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all text-left"
                                        onClick={() => handleAddNew('image')}
                                    >
                                        <Plus className="w-5 h-5 mr-2" /> COMPOSE NEW STORY
                                    </Button>
                                </div>

                                {/* Category Archive */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="uppercase text-[10px] font-black tracking-[0.2em] text-indigo-400 ml-1">Category Archive</Label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[10px] font-black text-indigo-400 hover:bg-indigo-500/10"
                                            onClick={() => {
                                                const name = prompt("Enter new category name:");
                                                if (name) setCustomCategories(prev => [...prev.includes(name) ? prev : [...prev, name]]);
                                            }}
                                        >
                                            ADD NEW
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {customCategories.map(cat => (
                                            <div key={cat} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-2xl border border-zinc-900/50 group">
                                                <span className="font-black text-xs text-zinc-300 uppercase truncate pr-4">{cat}</span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg hover:bg-indigo-500/10 text-zinc-500 hover:text-indigo-400"
                                                        onClick={() => handleRenameCategory(cat)}
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400"
                                                        onClick={() => handleDeleteCategory(cat)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Advanced Engine Toggles */}
                                <div className="space-y-4 pt-4 border-t border-zinc-900">
                                    <Label className="uppercase text-[10px] font-black tracking-[0.2em] text-red-500 ml-1 text-left">Nuclear Maintenance</Label>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Button
                                            variant="outline"
                                            className="bg-zinc-900 border-zinc-800 hover:bg-red-950/20 hover:text-red-400 rounded-2xl h-12 font-black justify-between px-6 text-[11px]"
                                            onClick={() => handleBulkDelete('unverified')}
                                            disabled={isProcessing}
                                        >
                                            CLEAN UNVERIFIED
                                            <ShieldCheck className="w-3.5 h-3.5 opacity-30" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="bg-zinc-900 border-zinc-800 hover:bg-red-600 hover:text-white rounded-2xl h-12 font-black justify-between px-6 text-[11px]"
                                            onClick={() => handleBulkDelete('all')}
                                            disabled={isProcessing}
                                        >
                                            WIPE ALL BLOGS
                                            <Trash2 className="w-3.5 h-3.5 opacity-30" />
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-black rounded-3xl h-14 mt-auto border border-zinc-800 shadow-xl"
                                    onClick={() => setIsSettingsModalOpen(false)}
                                >
                                    EXIT CONTROL PANEL
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </main >
            <Footer />
        </div >
    );
}

function CommentsSection({ postId, currentUser, onCommentAdded }: { postId: string, currentUser: any, onCommentAdded?: () => void }) {
    const { toast } = useToast();
    const [comments, setComments] = useState<LibraryComment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [replyingTo, setReplyingTo] = useState<LibraryComment | null>(null);

    const loadComments = useCallback(async () => {
        const data = await getComments(postId);
        setComments(data as LibraryComment[]);
    }, [postId]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        setLoading(true);

        const ok = await addComment({
            post_id: postId,
            parent_id: replyingTo?.id || undefined,
            text: newComment.trim(),
            author: currentUser?.name || currentUser?.email || 'Guest',
            avatar_url: currentUser?.avatar_url || null
        } as any);

        if (ok) {
            setComments(prev => [...prev, ok]);
            setNewComment("");
            setReplyingTo(null);
            if (onCommentAdded) onCommentAdded();
            toast({ title: "Comment Posted" });
        } else {
            toast({ title: "Comment Failed", variant: "destructive" });
        }
        setLoading(false);
    };

    // Helper to render comments recursively or grouped
    const rootComments = comments.filter(c => !c.parent_id);
    const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

    return (
        <div className="space-y-6 pt-4 text-left">
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {rootComments.length === 0 ? (
                    <div className="text-center text-zinc-600 bg-zinc-900/20 p-8 rounded-[28px] border border-dashed border-zinc-800">
                        <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium italic">No comments yet. Share your thoughts!</p>
                    </div>
                ) : (
                    rootComments.map(c => (
                        <div key={c.id} className="space-y-4">
                            <div className="flex gap-4 p-4 rounded-[24px] bg-zinc-900/50 border border-zinc-800/50 group hover:border-indigo-500/30 transition-all">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-black text-white text-xs shadow-lg shadow-indigo-500/20 shrink-0">
                                    {c.author ? c.author.charAt(0).toUpperCase() : 'P'}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-zinc-200 text-xs uppercase tracking-tighter">{c.author}</span>
                                            <span className="text-[9px] text-zinc-600 font-bold uppercase">{new Date(c.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setReplyingTo(c);
                                                setNewComment(`@${c.author.split(' ')[0]} `);
                                            }}
                                            className="h-7 px-3 text-[10px] font-black text-indigo-400 hover:bg-indigo-500/10 rounded-xl"
                                        >
                                            REPLY
                                        </Button>
                                    </div>
                                    <p className="text-zinc-400 text-sm leading-relaxed">{c.text}</p>
                                </div>
                            </div>

                            {/* Replies */}
                            {getReplies(c.id).map(reply => (
                                <div key={reply.id} className="ml-12 flex gap-3 p-3 rounded-[20px] bg-indigo-500/5 border border-indigo-500/10">
                                    <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center font-black text-zinc-400 text-[10px] shrink-0">
                                        {reply.author.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-indigo-300 text-[10px] uppercase">{reply.author}</span>
                                            <span className="text-[8px] text-zinc-600 font-bold uppercase">{new Date(reply.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-zinc-400 text-xs leading-relaxed">{reply.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>

            <div className="space-y-3">
                {replyingTo && (
                    <div className="flex items-center justify-between px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                            Replying to {replyingTo.author}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-6 w-6 p-0 hover:bg-red-500/10 text-red-400">
                            <X className="w-3 h-3" />
                        </Button>
                    </div>
                )}
                <div className="relative group p-1 bg-zinc-900 rounded-[28px] border border-zinc-800 focus-within:border-indigo-500/50 transition-all">
                    <Textarea
                        placeholder={replyingTo ? "Write your response..." : "Contribute to the discussion..."}
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        className="bg-transparent border-none focus-visible:ring-0 min-h-[80px] p-4 text-sm font-medium resize-none"
                        disabled={loading}
                    />
                    <div className="flex justify-end p-2 border-t border-zinc-800/50 mt-1">
                        <Button
                            size="sm"
                            onClick={handleAddComment}
                            disabled={loading || !newComment.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl h-10 font-black px-6 gap-2 group"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                            {replyingTo ? 'REPLY' : 'SEND'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

