import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
    X, 
    ChevronLeft, 
    ChevronRight, 
    ZoomIn, 
    ZoomOut, 
    Download, 
    Star, 
    Trash2, 
    Maximize, 
    Minimize,
    Play
} from "lucide-react";
import { VideoEmbed } from "@/components/video/VideoEmbed";

interface PhotoGalleryProps {
        url: string;
        label?: string;
        type?: "image" | "video";
        description?: string;
    }[];
    initialIndex?: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isAdmin?: boolean;
    onSetPrimary?: (index: number) => void;
    onDelete?: (index: number) => void;
}

export const PhotoGalleryLightbox = ({ 
    photos, 
    initialIndex = 0, 
    open, 
    onOpenChange,
    isAdmin = false,
    onSetPrimary,
    onDelete
}: PhotoGalleryProps) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const lightboxRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number | null>(null);

    // Sync current index when opened with a specific photo
    useEffect(() => {
        if (open) {
            setCurrentIndex(initialIndex);
            setZoom(1);
        }
    }, [open, initialIndex]);

    const handlePrevious = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
        e?.stopPropagation();
        if (photos.length === 0) return;
        setCurrentIndex((prev) => (prev <= 0 ? photos.length - 1 : prev - 1));
        setZoom(1);
    }, [photos.length]);

    const handleNext = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
        e?.stopPropagation();
        if (photos.length === 0) return;
        setCurrentIndex((prev) => (prev >= photos.length - 1 ? 0 : prev + 1));
        setZoom(1);
    }, [photos.length]);

    // Keyboard Navigation
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") handlePrevious(e);
            else if (e.key === "ArrowRight") handleNext(e);
            else if (e.key === "Escape") onOpenChange(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, handlePrevious, handleNext, onOpenChange]);

    // Touch Support
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX.current - touchEndX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) handleNext();
            else handlePrevious();
        }
        touchStartX.current = null;
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            lightboxRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handleFsChange);
        return () => document.removeEventListener("fullscreenchange", handleFsChange);
    }, []);

    const handleDownload = async () => {
        const photo = photos[currentIndex];
        if (!photo?.url) return;
        try {
            const response = await fetch(photo.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `media-${currentIndex + 1}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            window.open(photo.url, "_blank");
        }
    };

    if (photos.length === 0) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="bg-black/98 backdrop-blur-2xl z-[9999]" />
                <DialogContent 
                    ref={lightboxRef}
                    className="fixed inset-0 w-screen h-screen max-w-none m-0 p-0 bg-black border-none shadow-none z-[10000] overflow-hidden outline-none flex flex-col translate-x-0 translate-y-0 left-0 top-0"
                >
                    {/* Header Controls - Premium Glassmorphism */}
                    <div className="absolute top-0 left-0 right-0 z-[10001] p-4 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none">
                        <div className="pointer-events-auto pl-2">
                            <h2 className="text-white font-black italic uppercase tracking-tighter text-sm md:text-xl drop-shadow-lg">
                                {photos[currentIndex]?.label || `View ${currentIndex + 1} / ${photos.length}`}
                            </h2>
                        </div>
                        
                        <div className="flex items-center gap-1.5 md:gap-3 pointer-events-auto pr-2">
                            <div className="hidden sm:flex items-center bg-white/10 rounded-full px-2 py-1 backdrop-blur-md border border-white/10 mr-2">
                                <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="h-8 w-8 text-white hover:bg-white/10 rounded-full"><ZoomOut className="h-4 w-4" /></Button>
                                <span className="text-[10px] font-black text-white w-10 text-center">{Math.round(zoom * 100)}%</span>
                                <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(z + 0.25, 3))} className="h-8 w-8 text-white hover:bg-white/10 rounded-full"><ZoomIn className="h-4 w-4" /></Button>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleFullscreen}
                                className="text-white hover:bg-white/10 bg-white/5 backdrop-blur-md rounded-full h-9 w-9 border border-white/10"
                            >
                                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                            </Button>

                            {isAdmin && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onSetPrimary?.(currentIndex)}
                                    className={`text-white hover:bg-indigo-500/50 bg-white/5 backdrop-blur-md rounded-full h-9 w-9 border border-white/10 ${photos[currentIndex]?.label === "Primary" ? "text-indigo-400 bg-indigo-500/20" : ""}`}
                                >
                                    <Star className={`h-4 w-4 ${photos[currentIndex]?.label === "Primary" ? "fill-indigo-400" : ""}`} />
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDownload}
                                className="text-white hover:bg-white/10 bg-white/5 backdrop-blur-md rounded-full h-9 w-9 border border-white/10"
                            >
                                <Download className="h-4 w-4" />
                            </Button>

                            {isAdmin && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onDelete?.(currentIndex)}
                                    className="text-red-400 hover:bg-red-500/20 bg-red-500/5 backdrop-blur-md rounded-full h-9 w-9 border border-red-500/20"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onOpenChange(false)}
                                className="text-white hover:bg-white/20 bg-black/40 backdrop-blur-md rounded-full h-9 w-9 border border-white/20 ml-2"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Main Stage */}
                    <div 
                        className="flex-1 relative flex items-center justify-center select-none touch-none bg-black overflow-hidden"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) onOpenChange(false);
                        }}
                    >
                        {photos.length > 1 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handlePrevious}
                                className="absolute left-6 z-[10002] h-12 w-12 rounded-full bg-black/40 text-white hover:bg-indigo-600/60 backdrop-blur-md border border-white/10 hidden md:flex items-center justify-center"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        )}

                        <div 
                            className="w-full h-full flex items-center justify-center p-2 md:p-12"
                        >
                            <div 
                                className="max-w-full max-h-full transition-transform duration-300 ease-out"
                                style={{ transform: `scale(${zoom})` }}
                            >
                                {photos[currentIndex]?.type === "video" || photos[currentIndex]?.url.match(/\.(mp4|webm|ogg|mov)$/i) || photos[currentIndex]?.url.includes('youtube.com') || photos[currentIndex]?.url.includes('youtu.be') || photos[currentIndex]?.url.includes('drive.google.com') ? (
                                    <div className="w-full max-w-4xl flex flex-col items-center">
                                        <VideoEmbed 
                                            url={photos[currentIndex].url} 
                                            title={photos[currentIndex].label || "Video"} 
                                        />
                                        {photos[currentIndex].description && (
                                            <div className="mt-4 p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl w-full">
                                                <p className="text-zinc-300 text-sm italic leading-relaxed text-center">
                                                    "{photos[currentIndex].description}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="relative group">
                                        <img
                                            src={photos[currentIndex].url}
                                            alt={photos[currentIndex].label || "Gallery Image"}
                                            className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl pointer-events-none"
                                        />
                                        {photos[currentIndex].description && (
                                            <div className="mt-4 p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl w-full">
                                                <p className="text-zinc-300 text-sm italic leading-relaxed text-center">
                                                    "{photos[currentIndex].description}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {photos.length > 1 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleNext}
                                className="absolute right-6 z-[10002] h-12 w-12 rounded-full bg-black/40 text-white hover:bg-indigo-600/60 backdrop-blur-md border border-white/10 hidden md:flex items-center justify-center"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </Button>
                        )}
                    </div>

                    {/* Thumbnail Strip - Horizontal Scroll */}
                    <div className="bg-gradient-to-t from-black via-black/80 to-transparent p-4 md:p-6 pb-8 z-[10001]">
                        <div className="flex gap-2 md:gap-3 justify-center items-center overflow-x-auto custom-scrollbar px-4 max-w-5xl mx-auto py-2">
                            {photos.map((photo, index) => (
                                <button
                                    key={index}
                                    onClick={() => { setCurrentIndex(index); setZoom(1); }}
                                    className={`flex-shrink-0 h-12 w-16 md:h-20 md:w-28 rounded-lg overflow-hidden border-2 transition-all duration-300 ${index === currentIndex
                                            ? "border-indigo-500 scale-110 shadow-lg shadow-indigo-500/20"
                                            : "border-white/5 opacity-40 hover:opacity-100 scale-95"
                                        }`}
                                >
                                    {photo.type === "video" || photo.url.match(/\.(mp4|webm|ogg|mov)$/i) || photo.url.includes('youtube.com') || photo.url.includes('youtu.be') || photo.url.includes('drive.google.com') ? (
                                        <div className="w-full h-full relative bg-zinc-900 flex items-center justify-center">
                                            <Play className="h-4 w-4 text-white fill-white opacity-60" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20"></div>
                                        </div>
                                    ) : (
                                        <img src={photo.url} className="w-full h-full object-cover" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </DialogPortal>
        </Dialog>
    );
};
