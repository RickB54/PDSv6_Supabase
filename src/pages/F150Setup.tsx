import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, ZoomIn, Truck, Wrench, Info, Plus, Edit2, Trash2, Upload, Loader2, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { getLibraryItems, upsertLibraryItem, deleteLibraryItem, uploadLibraryFile, LibraryItem } from "@/lib/supa-data";

export default function F150Setup() {
    const { toast } = useToast();
    const user = getCurrentUser();
    const isAdmin = user?.role === 'admin';

    const [items, setItems] = useState<LibraryItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null); // For Lightbox/Player
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [visibleCount, setVisibleCount] = useState(12); // Pagination limit
    const [uploadStatus, setUploadStatus] = useState<string>("");
    const [formData, setFormData] = useState<Partial<LibraryItem>>({
        category: 'F150 Setup',
        type: 'image'
    });

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        const allItems = await getLibraryItems();
        // Filter for F150 Setup items
        setItems(allItems.filter(i => i.category === 'F150 Setup'));
    };

    const handleAddNew = (type: 'image' | 'video') => {
        setEditingItem(null);
        setUploadStatus("");
        setFormData({
            category: 'F150 Setup',
            type: type,
            title: '',
            description: '',
            resource_url: ''
        });
        setIsEditModalOpen(true);
    };

    const handleEdit = (item: LibraryItem) => {
        setEditingItem(item);
        setUploadStatus("");
        setFormData({ ...item });
        setIsEditModalOpen(true);
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        if (confirm("Are you sure you want to delete this item?")) {
            const success = await deleteLibraryItem(editingItem.id);
            if (success) {
                toast({ title: "Deleted", description: "Item removed." });
                await loadItems();
                setIsEditModalOpen(false);
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadStatus("Compressing & Uploading...");

        const { url, error } = await uploadLibraryFile(file);

        setIsUploading(false);

        if (url) {
            setFormData(prev => ({ ...prev, resource_url: url }));
            setUploadStatus("✅ Success!");
            toast({ title: "Uploaded", description: "Image uploaded successfully." });
        } else {
            console.error(error);
            setUploadStatus(`❌ Error: ${error}`);
            toast({ title: "Error", description: error || "Upload failed", variant: "destructive" });
        }
    };

    const handleSave = async () => {
        if (!formData.title || !formData.resource_url) {
            toast({ title: "Error", description: "Title and URL are required.", variant: "destructive" });
            return;
        }

        const newItem: LibraryItem = {
            id: editingItem?.id || `f150_${Date.now()}`,
            title: formData.title,
            description: formData.description || '',
            type: formData.type as any,
            category: 'F150 Setup',
            resource_url: formData.resource_url,
            created_at: editingItem?.created_at || new Date().toISOString()
        };

        const result = await upsertLibraryItem(newItem);
        if (result) {
            toast({ title: "Saved", description: "Item saved successfully." });
            await loadItems();
            setIsEditModalOpen(false);
        } else {
            toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
        }
    };

    const galleryImages = items.filter(i => i.type === 'image');
    const videos = items.filter(i => i.type === 'video');

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="Rick's F150 Detailing Setup" subtitle="The Ultimate Mobile Detailing Rig Configuration">
                {isAdmin && (
                    <div className="flex gap-2">
                        <Button onClick={() => handleAddNew('image')} size="sm" className="gap-2">
                            <Plus className="w-4 h-4" /> Add Photo
                        </Button>
                        <Button onClick={() => handleAddNew('video')} size="sm" variant="secondary" className="gap-2">
                            <Plus className="w-4 h-4" /> Add Video
                        </Button>
                    </div>
                )}
            </PageHeader>

            <main className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-500">
                <div className="mb-8 p-6 bg-secondary/20 rounded-xl border border-border/50 backdrop-blur-sm">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Truck className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold mb-2">About The Build</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                This reference gallery showcases the custom configuration of the F150 Mobile Detailing Unit.
                                Designed for efficiency and ergonomics, every tool has its place.
                            </p>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="gallery" className="space-y-8">
                    <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
                        <TabsTrigger value="gallery">Photo Gallery ({galleryImages.length})</TabsTrigger>
                        <TabsTrigger value="videos">Video Tours ({videos.length})</TabsTrigger>
                    </TabsList>

                    {/* Gallery Tab */}
                    <TabsContent value="gallery" className="space-y-6">
                        {galleryImages.length === 0 && <div className="text-center py-12 text-muted-foreground">No photos yet. Click "Add Photo" to start.</div>}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {galleryImages.slice(0, visibleCount).map((img) => (
                                <Card
                                    key={img.id}
                                    className="group overflow-hidden border-zinc-800 bg-zinc-900/50 cursor-pointer hover:border-primary/50 transition-all duration-300 relative"
                                    onClick={() => setSelectedItem(img)}
                                >
                                    {isAdmin && (
                                        <div className="absolute top-2 right-2 z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <Button variant="secondary" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(img); }}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                    <div className="relative aspect-[4/3] overflow-hidden">
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors z-10" />
                                        <img
                                            src={img.resource_url}
                                            alt={img.title}
                                            loading="lazy"
                                            className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                            <div className="bg-black/60 p-3 rounded-full backdrop-blur-md border border-white/10">
                                                <ZoomIn className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-lg text-white mb-1 group-hover:text-primary transition-colors">{img.title}</h3>
                                        <p className="text-sm text-zinc-400 line-clamp-2">{img.description}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {galleryImages.length > visibleCount && (
                            <div className="flex justify-center py-8">
                                <Button
                                    variant="outline"
                                    onClick={() => setVisibleCount(prev => prev + 12)}
                                    className="min-w-[200px]"
                                >
                                    Load More Photos ({galleryImages.length - visibleCount} remaining)
                                </Button>
                            </div>
                        )}
                    </TabsContent>

                    {/* Videos Tab */}
                    <TabsContent value="videos" className="space-y-6">
                        {videos.length === 0 && <div className="text-center py-12 text-muted-foreground">No videos yet. Click "Add Video" to start.</div>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {videos.map((vid) => (
                                <Card key={vid.id} className="bg-zinc-900 border-zinc-800 overflow-hidden relative group">
                                    {isAdmin && (
                                        <div className="absolute top-2 right-2 z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <Button variant="secondary" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(vid); }}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                    <div className="aspect-video w-full bg-black relative">
                                        <iframe
                                            src={vid.resource_url} // Ensure URL is embeddable or use helper
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            title={vid.title}
                                        />
                                    </div>
                                    <CardContent className="p-4">
                                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                            <Play className="w-4 h-4 text-primary fill-primary" />
                                            {vid.title}
                                        </h3>
                                        <p className="text-zinc-400 text-sm whitespace-pre-wrap">{vid.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Lightbox / Edit Modal */}
            <Dialog open={!!selectedItem && !isEditModalOpen} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <DialogContent className="max-w-6xl bg-black/95 border-zinc-800 p-0 text-white overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
                    {selectedItem && (
                        <>
                            <div className="flex-1 relative bg-black flex items-center justify-center min-h-[40vh] md:h-auto">
                                <img
                                    src={selectedItem.resource_url}
                                    alt={selectedItem.title}
                                    className="max-w-full max-h-[85vh] object-contain"
                                />
                            </div>
                            <div className="w-full md:w-[400px] border-l border-zinc-800 bg-zinc-950 p-6 overflow-y-auto">
                                <h2 className="text-2xl font-bold mb-4">{selectedItem.title}</h2>
                                <div className="prose prose-invert max-w-none">
                                    <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">{selectedItem.description}</p>
                                </div>
                                {isAdmin && (
                                    <Button variant="outline" className="mt-8 w-full" onClick={() => { setSelectedItem(null); handleEdit(selectedItem); }}>
                                        Edit Details
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Add/Edit Dialog */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="bg-zinc-900 border-zinc-800"
                            />
                        </div>

                        {formData.type === 'image' && (
                            <div className="space-y-2">
                                <Label>Upload Image (or Take Photo)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        /* capture="environment" removed to allow Gallery access */
                                        onChange={handleFileUpload}
                                        className="bg-zinc-900 border-zinc-800"
                                        disabled={isUploading}
                                    />
                                    {isUploading && <Loader2 className="animate-spin w-5 h-5 text-primary mt-2" />}
                                </div>
                                {uploadStatus && (
                                    <p className={`text-sm mt-1 font-medium ${uploadStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
                                        {uploadStatus}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">Select a file or use your camera.</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Image/Video URL</Label>
                            <Input
                                value={formData.resource_url || ''}
                                onChange={e => setFormData({ ...formData, resource_url: e.target.value })}
                                placeholder="https://..."
                                className="bg-zinc-900 border-zinc-800"
                            />
                            {formData.type === 'video' && <p className="text-xs text-muted-foreground">Use YouTube Embed URL (e.g. https://www.youtube.com/embed/xyz)</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Description / Detailed Notes</Label>
                            <Textarea
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="bg-zinc-900 border-zinc-800 min-h-[200px]"
                                placeholder="Enter detailed explanation here..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        {editingItem && (
                            <Button variant="destructive" onClick={handleDelete} className="mr-auto">Delete</Button>
                        )}
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isUploading}>
                            {isUploading ? 'Uploading...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
