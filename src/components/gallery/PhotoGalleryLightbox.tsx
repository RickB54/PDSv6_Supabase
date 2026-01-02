import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from "lucide-react";

interface PhotoGalleryProps {
    photos: {
        url: string;
        label?: string;
    }[];
    initialIndex?: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const PhotoGalleryLightbox = ({ photos, initialIndex = 0, open, onOpenChange }: PhotoGalleryProps) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
        setZoom(1);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
        setZoom(1);
    };

    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = photos[currentIndex].url;
        link.download = `photo-${currentIndex + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));

    if (photos.length === 0) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-zinc-800">
                <div className="relative w-full h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
                        <div className="text-white font-semibold">
                            {photos[currentIndex]?.label || `Photo ${currentIndex + 1} of ${photos.length}`}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleZoomOut}
                                className="text-white hover:bg-white/20"
                                title="Zoom Out"
                            >
                                <ZoomOut className="h-5 w-5" />
                            </Button>
                            <span className="text-white text-sm min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleZoomIn}
                                className="text-white hover:bg-white/20"
                                title="Zoom In"
                            >
                                <ZoomIn className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDownload}
                                className="text-white hover:bg-white/20"
                                title="Download"
                            >
                                <Download className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onOpenChange(false)}
                                className="text-white hover:bg-white/20"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Main Image */}
                    <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
                        <img
                            src={photos[currentIndex].url}
                            alt={photos[currentIndex].label || `Photo ${currentIndex + 1}`}
                            className="max-w-full max-h-full object-contain transition-transform duration-200"
                            style={{ transform: `scale(${zoom})` }}
                        />
                    </div>

                    {/* Navigation Arrows */}
                    {photos.length > 1 && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handlePrevious}
                                className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                            >
                                <ChevronLeft className="h-8 w-8" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleNext}
                                className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                            >
                                <ChevronRight className="h-8 w-8" />
                            </Button>
                        </>
                    )}

                    {/* Thumbnail Strip */}
                    {photos.length > 1 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                            <div className="flex gap-2 justify-center overflow-x-auto pb-2 px-4">
                                {photos.map((photo, index) => (
                                    <button
                                        key={index}
                                        onClick={() => { setCurrentIndex(index); setZoom(1); }}
                                        className={`flex-shrink-0 h-16 w-16 rounded overflow-hidden border-2 transition-all ${index === currentIndex
                                                ? "border-purple-500 scale-110"
                                                : "border-zinc-700 opacity-60 hover:opacity-100"
                                            }`}
                                    >
                                        <img
                                            src={photo.url}
                                            alt={`Thumbnail ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Counter */}
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                        {currentIndex + 1} / {photos.length}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
