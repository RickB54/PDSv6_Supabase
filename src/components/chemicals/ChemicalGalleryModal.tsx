import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Chemical } from "@/types/chemicals";
import { Upload, Trash2, Star, Loader2, X, Plus, Images, AlertTriangle, Download } from "lucide-react";
import { supabase } from "@/lib/supa-data";
import { updateChemicalPartial } from "@/lib/chemicals";
import { toast } from "@/hooks/use-toast";
import { PhotoGalleryLightbox } from "../gallery/PhotoGalleryLightbox";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChemicalGalleryModalProps {
    chemical: Chemical;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
    isAdmin?: boolean;
}

export function ChemicalGalleryModal({ chemical, open, onOpenChange, onUpdate, isAdmin = false }: ChemicalGalleryModalProps) {
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [initialPhotoIndex, setInitialPhotoIndex] = useState(0);
    const [confirmDelete, setConfirmDelete] = useState<{ url: string, isPrimary: boolean } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Ensure primary image is not duplicated in the gallery array
    const filteredGallery = (chemical.gallery_image_urls || []).filter(url => url !== chemical.primary_image_url);
    const allImages = [
        ...(chemical.primary_image_url ? [{ url: chemical.primary_image_url, isPrimary: true }] : []),
        ...filteredGallery.map(url => ({ url, isPrimary: false }))
    ];

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isAdmin || !e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const files = Array.from(e.target.files);
        const newUrls: string[] = [];

        try {
            for (const file of files) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('chemicals')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('chemicals')
                    .getPublicUrl(filePath);
                
                newUrls.push(data.publicUrl);
            }

            const updatedGallery = [...filteredGallery, ...newUrls];
            
            // If there's no primary image, set the first uploaded one as primary
            let updates: Partial<Chemical> = { gallery_image_urls: updatedGallery };
            if (!chemical.primary_image_url && newUrls.length > 0) {
                updates.primary_image_url = newUrls[0];
                updates.gallery_image_urls = updatedGallery.filter(url => url !== newUrls[0]);
            }

            const { error } = await updateChemicalPartial(chemical.id, updates);
            if (error) throw error;

            toast({ title: "Success", description: `${files.length} image(s) uploaded.` });
            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error("Upload Error:", error);
            toast({ title: "Upload Failed", description: error.message || "Failed to upload image.", variant: "destructive" });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async () => {
        if (!isAdmin || !confirmDelete) return;
        
        const { url: imageUrl, isPrimary } = confirmDelete;
        setSaving(true);
        try {
            let updates: Partial<Chemical> = {};
            if (isPrimary) {
                // If primary is deleted, take first from gallery if exists
                if (filteredGallery.length > 0) {
                    updates.primary_image_url = filteredGallery[0];
                    updates.gallery_image_urls = filteredGallery.slice(1);
                } else {
                    updates.primary_image_url = "";
                }
            } else {
                updates.gallery_image_urls = filteredGallery.filter(url => url !== imageUrl);
            }

            const { error } = await updateChemicalPartial(chemical.id, updates);
            if (error) throw error;

            toast({ title: "Image Deleted" });
            if (onUpdate) onUpdate();
        } catch (error: any) {
            toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
            setConfirmDelete(null);
        }
    };

    const handleSetPrimary = async (imageUrl: string) => {
        if (!isAdmin || !imageUrl) return;

        setSaving(true);
        try {
            const oldPrimary = chemical.primary_image_url;
            const newGallery = filteredGallery.filter(url => url !== imageUrl);
            if (oldPrimary) newGallery.push(oldPrimary);

            const { error } = await updateChemicalPartial(chemical.id, {
                primary_image_url: imageUrl,
                gallery_image_urls: newGallery
            });
            if (error) throw error;

            toast({ title: "Primary Image Updated" });
            if (onUpdate) onUpdate();
        } catch (error: any) {
            toast({ title: "Failed to set primary", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] bg-zinc-950 border-zinc-800 text-white flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b border-zinc-900 bg-zinc-900/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <Images className="w-5 h-5 text-purple-400" />
                                {chemical.name} Gallery
                            </DialogTitle>
                            <DialogDescription className="text-zinc-500">
                                Manage photos for this chemical card.
                            </DialogDescription>
                        </div>
                        {isAdmin && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleUpload}
                                    className="hidden"
                                    accept="image/*"
                                    multiple
                                />
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading || saving}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                    Upload Photos
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    {allImages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-600 border-2 border-dashed border-zinc-800 rounded-xl">
                            <Images className="w-12 h-12 mb-4 opacity-20" />
                            <p>No photos in gallery yet.</p>
                            {isAdmin && <p className="text-sm">Click upload to add some.</p>}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {allImages.map((img, idx) => (
                                <div 
                                    key={img.url} 
                                    className="relative group aspect-square bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-purple-500/50 transition-all cursor-pointer"
                                    onClick={() => {
                                        setInitialPhotoIndex(idx);
                                        setLightboxOpen(true);
                                    }}
                                >
                                    <img
                                        src={img.url}
                                        alt={`Gallery ${idx}`}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    
                                    {img.isPrimary && (
                                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-purple-600 text-[10px] font-bold uppercase rounded shadow-lg z-10">
                                            Primary
                                        </div>
                                    )}

                                    {isAdmin && (
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2 z-30">
                                            {!img.isPrimary && (
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    className="h-9 w-9 bg-zinc-900/90 hover:bg-purple-600 text-white border-zinc-700 shadow-xl"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSetPrimary(img.url);
                                                    }}
                                                    title="Set as Primary"
                                                    disabled={saving}
                                                >
                                                    <Star className="w-5 h-5" />
                                                </Button>
                                            )}
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    className="h-9 w-9 bg-zinc-900/90 hover:bg-blue-600 text-white border-zinc-700 shadow-xl"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            const response = await fetch(img.url);
                                                            const blob = await response.blob();
                                                            const url = window.URL.createObjectURL(blob);
                                                            const link = document.createElement("a");
                                                            link.href = url;
                                                            link.download = `chemical-${idx}.jpg`;
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                            window.URL.revokeObjectURL(url);
                                                        } catch (err) {
                                                            window.open(img.url, "_blank");
                                                        }
                                                    }}
                                                    title="Download"
                                                    disabled={saving}
                                                >
                                                    <Download className="w-5 h-5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    className="h-9 w-9 bg-zinc-900/90 hover:bg-red-600 text-white border-zinc-700 shadow-xl"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmDelete({ url: img.url, isPrimary: img.isPrimary });
                                                    }}
                                                    title="Delete Image"
                                                    disabled={saving}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-zinc-900 bg-zinc-900/30 flex justify-end">
                    <Button 
                        onClick={() => onOpenChange(false)} 
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        Close Gallery
                    </Button>
                </div>
            </DialogContent>

            <PhotoGalleryLightbox
                photos={allImages.map(img => ({ url: img.url, label: img.isPrimary ? "Primary" : undefined }))}
                initialIndex={initialPhotoIndex}
                open={lightboxOpen}
                onOpenChange={setLightboxOpen}
                isAdmin={isAdmin}
                onSetPrimary={(index) => {
                    const img = allImages[index];
                    if (img) handleSetPrimary(img.url);
                }}
                onDelete={(index) => {
                    const img = allImages[index];
                    if (img) {
                        setConfirmDelete({ url: img.url, isPrimary: img.isPrimary });
                        setLightboxOpen(false); // Close lightbox to show confirmation
                    }
                }}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-500 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Delete Image?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            Are you sure you want to remove this image from the gallery? {confirmDelete?.isPrimary && "This is the PRIMARY image."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 text-white border-0"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
