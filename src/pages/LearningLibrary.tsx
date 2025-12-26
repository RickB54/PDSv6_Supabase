import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Play, FileText, Video, Plus, Edit2, Trash2, Truck, Loader2, Upload, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { getLibraryItems, upsertLibraryItem, deleteLibraryItem, LibraryItem, supabase } from "@/lib/supa-data";
import { compressImage } from "@/lib/imageUtils";

export default function LearningLibrary() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const user = getCurrentUser();
    const isAdmin = user?.role === 'admin';
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [items, setItems] = useState<LibraryItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ step: string; message: string }>({ step: 'idle', message: '' });

    const [formData, setFormData] = useState<Partial<LibraryItem>>({
        type: 'video',
        category: 'General'
    });

    // Video player state
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [playingItem, setPlayingItem] = useState<LibraryItem | null>(null);

    useEffect(() => {
        loadItems();
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
        setUploadStatus({ step: 'uploading', message: 'Uploading to cloud...' });

        try {
            // If image, compress it. If video/pdf, use as is (for now)
            let fileToUpload = file;
            if (file.type.startsWith('image')) {
                fileToUpload = await compressImage(file);
            }

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
                type: file.type.startsWith('image') ? 'image' : prev.type // Auto-set type
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

        // Optimistic update - show immediately
        if (editingItem) {
            setItems(items.map(i => i.id === editingItem.id ? newItem : i));
        } else {
            setItems([...items, newItem]);
        }
        setIsModalOpen(false);
        setEditingItem(null);
        setFormData({ type: 'video', category: 'General' });

        // Save to Supabase in background
        const result = await upsertLibraryItem(newItem);
        if (result) {
            toast({ title: editingItem ? "Resource Updated" : "Resource Added", description: "Library updated successfully." });
            // Reload to ensure sync
            await loadItems();
        } else {
            toast({ title: "Save Failed", description: "Changes may not persist.", variant: "destructive" });
            // Reload to revert optimistic update
            await loadItems();
        }
    };

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
        if (!item.resource_url) {
            toast({
                title: "No Resource URL",
                description: "This resource doesn't have a URL set yet. Edit it to add a link.",
                variant: "destructive"
            });
            return;
        }

        if (item.type === 'video') {
            setPlayingItem(item);
            setIsPlayerOpen(true);
        } else {
            window.open(item.resource_url, '_blank');
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

                {/* Featured Section: Rick's F150 Setup */}
                <div onClick={() => navigate('/f150-setup')} className="cursor-pointer group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-zinc-900 to-zinc-950 p-6 mb-8 hover:border-primary/50 transition-all shadow-lg hover:shadow-primary/5">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Truck className="w-32 h-32 text-primary" />
                    </div>
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="p-4 bg-primary/20 rounded-full border border-primary/20 group-hover:bg-primary/30 transition-colors">
                            <Truck className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">Rick's F150 Detailing Setup</h3>
                            <p className="text-zinc-400 max-w-2xl">
                                Explore the ultimate mobile detailing rig. View the professional photo gallery and video tours of the custom build, water systems, and tool organization.
                            </p>
                        </div>
                        <Button className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90 hidden md:flex">
                            View Setup
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map(item => {
                        const Icon = getIcon(item.type);
                        return (
                            <Card
                                key={item.id}
                                className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all group cursor-pointer relative"
                                onClick={() => handleViewResource(item)}
                            >
                                {isAdmin && (
                                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            className="h-8 w-8 bg-zinc-800 hover:bg-zinc-700"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(item);
                                            }}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                                <div className="aspect-video bg-zinc-950 relative flex items-center justify-center overflow-hidden rounded-t-xl">
                                    {((item.type === 'video' || item.type === 'image') && item.resource_url && (item.type === 'image' || getYouTubeThumbnail(item.resource_url))) ? (
                                        <img
                                            src={item.type === 'image' ? item.resource_url : getYouTubeThumbnail(item.resource_url)!}
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Icon className="w-12 h-12 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                                    )}
                                    {item.type === 'video' && (
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Play className="w-12 h-12 text-white fill-white" />
                                        </div>
                                    )}
                                </div>
                                <CardHeader>
                                    <CardTitle className="text-white text-lg">{item.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-zinc-400 text-sm">{item.description}</p>
                                    <div className="mt-4 flex gap-2 flex-wrap">
                                        {item.duration && (
                                            <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">{item.duration}</span>
                                        )}
                                        <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">{item.category}</span>
                                        <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded capitalize">{item.type}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </main>

            {/* Add/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Resource' : 'Add New Resource'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Resource Type</Label>
                                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val as any })}>
                                    <SelectTrigger className="bg-zinc-950 border-zinc-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="video">Video</SelectItem>
                                        <SelectItem value="image">Image</SelectItem>
                                        <SelectItem value="pdf">PDF Document</SelectItem>
                                        <SelectItem value="article">Article</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Input
                                    value={formData.category || ''}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="e.g., Advanced, Maintenance"
                                    className="bg-zinc-950 border-zinc-700"
                                />
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
                                            capture="environment"
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
                            <Button onClick={handleSave} disabled={isUploading} className="bg-blue-600 hover:bg-blue-700">
                                {isUploading ? 'Uploading...' : (editingItem ? 'Update' : 'Add') + ' Resource'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Video Player Modal */}
            <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
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
            </Dialog>
        </div>
    );
}
