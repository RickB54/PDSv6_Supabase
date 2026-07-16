import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search, Image as ImageIcon, Video, X, Car, Loader2,
    ChevronDown, ChevronUp, User, Maximize2, ChevronLeft, ChevronRight, Trash2, Download
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
    getSupabaseCustomers, Customer, getSupabaseBookings
} from "@/lib/supa-data";
import { useToast } from "@/hooks/use-toast";
import { useDemoMode } from "@/contexts/DemoContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { VideoEmbed } from "@/components/video/VideoEmbed";
import CustomerModal from "@/components/customers/CustomerModal";
import { upsertSupabaseCustomer } from "@/lib/supa-data";
import { Plus, ExternalLink } from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────
interface MediaItem {
    url: string;
    type: "image" | "video";
    category: "general" | "before" | "after" | "video";
    customerName: string;
    vehicleLabel: string;
    customerId?: string;
    source?: {
        type: 'customer' | 'vehicle';
        field: string;
        vehicleIndex?: number;
        arrayIndex: number;
    };
    description?: string;
}

function buildMediaForCustomer(customer: Customer): MediaItem[] {
    const items: MediaItem[] = [];
    const customerName = customer.name || "Unknown";
    const customerId = customer.id;

    // Customer-level photos (no specific vehicle)
    (customer.generalPhotos || []).forEach((url, idx) =>
        items.push({ url, type: "image", category: "general", customerName, vehicleLabel: "Profile", customerId, source: { type: 'customer', field: 'generalPhotos', arrayIndex: idx } })
    );
    (customer.beforePhotos || []).forEach((url, idx) =>
        items.push({ url, type: "image", category: "before", customerName, vehicleLabel: "Profile", customerId, source: { type: 'customer', field: 'beforePhotos', arrayIndex: idx } })
    );
    (customer.afterPhotos || []).forEach((url, idx) =>
        items.push({ url, type: "image", category: "after", customerName, vehicleLabel: "Profile", customerId, source: { type: 'customer', field: 'afterPhotos', arrayIndex: idx } })
    );
    if ((customer as any).videoUrl) {
        const parts = ((customer as any).videoUrl).split(':::');
        items.push({ 
            url: parts[0], 
            type: "video", 
            category: "video", 
            customerName, 
            vehicleLabel: "Profile", 
            customerId,
            description: parts[1] || (customer as any).videoNote,
            source: { type: 'customer', field: 'videoUrl', arrayIndex: 0 }
        });
    }

    // Per-vehicle photos
    (customer.vehicles || []).forEach((v, vIdx) => {
        const vehicleLabel = [v.year, v.make, v.model].filter(Boolean).join(" ") || "Unknown Vehicle";
        (v.generalPhotos || []).forEach((url, idx) =>
            items.push({ url, type: "image", category: "general", customerName, vehicleLabel, customerId, source: { type: 'vehicle', field: 'generalPhotos', vehicleIndex: vIdx, arrayIndex: idx } })
        );
        (v.beforePhotos || []).forEach((url, idx) =>
            items.push({ url, type: "image", category: "before", customerName, vehicleLabel, customerId, source: { type: 'vehicle', field: 'beforePhotos', vehicleIndex: vIdx, arrayIndex: idx } })
        );
        (v.afterPhotos || []).forEach((url, idx) =>
            items.push({ url, type: "image", category: "after", customerName, vehicleLabel, customerId, source: { type: 'vehicle', field: 'afterPhotos', vehicleIndex: vIdx, arrayIndex: idx } })
        );
        (v.videoUrls || []).forEach((url, idx) => {
            const parts = url.split(':::');
            items.push({ 
                url: parts[0], 
                type: "video", 
                category: "video", 
                customerName, 
                vehicleLabel, 
                customerId,
                description: parts[1],
                source: { type: 'vehicle', field: 'videoUrls', vehicleIndex: vIdx, arrayIndex: idx }
            });
        });
    });

    return items;
}

const categoryColors: Record<string, string> = {
    general: "bg-blue-600",
    before: "bg-orange-500",
    after: "bg-emerald-600",
    video: "bg-pink-600",
};

// ─── lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ 
    items, 
    startIndex, 
    onClose, 
    isAdmin = false,
    onDelete 
}: { 
    items: MediaItem[]; 
    startIndex: number; 
    onClose: () => void;
    isAdmin?: boolean;
    onDelete?: (idx: number) => void;
}) {
    const [idx, setIdx] = useState(startIndex);

    useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") setIdx(p => Math.max(0, p - 1));
            if (e.key === "ArrowRight") setIdx(p => Math.min(items.length - 1, p + 1));
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handle);
        return () => window.removeEventListener("keydown", handle);
    }, [items.length, onClose]);

    const current = items[idx];

    return (
        <Dialog open onOpenChange={() => onClose()}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-zinc-800 overflow-hidden">
                <div className="relative flex flex-col h-[90vh]">
                    {/* Header */}
                    <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge className={`${categoryColors[current.category]} text-white text-[9px] uppercase font-black`}>
                                {current.category}
                            </Badge>
                            <span className="text-white text-sm font-semibold">{current.vehicleLabel}</span>
                            <span className="text-zinc-400 text-xs">— {current.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-400 text-xs">{idx + 1} / {items.length}</span>
                            
                            {isAdmin && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={async () => {
                                            try {
                                                const res = await fetch(current.url);
                                                const blob = await res.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = current.url.split('/').pop() || 'prime-media';
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                                window.URL.revokeObjectURL(url);
                                            } catch (e) {
                                                window.open(current.url, '_blank');
                                            }
                                        }}
                                        className="text-white hover:bg-blue-600/50 h-8 w-8"
                                        title="Download Media"
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDelete?.(idx)}
                                        className="text-white hover:bg-red-600/50 h-8 w-8"
                                        title="Delete Image"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 h-8 w-8">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Media */}
                    <div className="flex-1 flex items-center justify-center p-4 pt-16 pb-20">
                        {current.type === "image" ? (
                            <img src={current.url} alt={current.vehicleLabel} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                        ) : (
                            <div className="w-full max-w-3xl flex flex-col items-center">
                                <VideoEmbed url={current.url} title={current.vehicleLabel} />
                                {current.description && (
                                    <div className="mt-4 p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl w-full">
                                        <p className="text-zinc-300 text-sm italic leading-relaxed text-center">
                                            "{current.description}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    {items.length > 1 && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIdx(p => Math.max(0, p - 1))}
                                disabled={idx === 0}
                                className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-20 z-20"
                            >
                                <ChevronLeft className="h-8 w-8" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIdx(p => Math.min(items.length - 1, p + 1))}
                                disabled={idx === items.length - 1}
                                className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-20 z-20"
                            >
                                <ChevronRight className="h-8 w-8" />
                            </Button>
                        </>
                    )}

                    {/* Thumbnail strip */}
                    {items.length > 1 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 flex gap-2 overflow-x-auto justify-center">
                            {items.map((item, i) => (
                                <button
                                    key={i}
                                    onClick={() => setIdx(i)}
                                    className={`flex-shrink-0 h-14 w-14 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? "border-blue-500 scale-110" : "border-zinc-700 opacity-50 hover:opacity-100"}`}
                                >
                                    {item.type === "image" ? (
                                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                            <Video className="h-4 w-4 text-pink-400" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── media tile ───────────────────────────────────────────────────────────────
function MediaTile({ item, onClick, small = false, onDelete, isAdmin = false }: { 
    item: MediaItem; 
    onClick: () => void; 
    small?: boolean; 
    onDelete?: (e: React.MouseEvent) => void;
    isAdmin?: boolean;
}) {
    return (
        <div
            onClick={onClick}
            className={`group relative aspect-square rounded-xl bg-zinc-950 border border-zinc-900 overflow-hidden hover:border-blue-500/60 hover:shadow-xl hover:shadow-blue-900/20 transition-all cursor-pointer ${small ? 'h-20 w-20' : ''}`}
        >
            {item.type === "image" ? (
                <img src={item.url} alt={item.vehicleLabel} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
                <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center gap-1">
                    <div className="relative">
                        <Video className="h-6 w-6 text-pink-400" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center">
                                <div className="w-0 h-0 border-t-[2px] border-t-transparent border-l-[4px] border-l-black border-b-[2px] border-b-transparent ml-0.5" />
                            </div>
                        </div>
                    </div>
                    <p className="text-[7px] text-zinc-500 font-black uppercase px-1 text-center truncate max-w-full">
                        {item.url.includes('youtube.com') || item.url.includes('youtu.be') ? 'YouTube' : 
                         item.url.includes('vimeo.com') ? 'Vimeo' : 'Video'}
                    </p>
                </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1.5">
                <p className="text-[8px] font-black uppercase text-white truncate text-center px-1">{item.vehicleLabel}</p>
                
                {isAdmin && onDelete && (
                    <button 
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/80 text-white hover:bg-red-500 shadow-lg z-10 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(e);
                        }}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Category badge */}
            <div className="absolute top-1.5 left-1.5 z-10">
                <span className={`${categoryColors[item.category]} text-white text-[6px] font-black uppercase tracking-widest px-1 py-0.5 rounded-sm`}>
                    {item.category}
                </span>
            </div>

            {/* Zoom icon */}
            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Maximize2 className="h-2.5 w-2.5 text-white drop-shadow-lg" />
            </div>
        </div>
    );
}

// ─── customer card ────────────────────────────────────────────────────────────
function CustomerCard({ 
    customer, 
    onOpen, 
    onAddMedia, 
    onDelete,
    showBackLink = false,
    returnTarget = "",
    canAddMedia = false
}: { 
    customer: Customer; 
    onOpen: (items: MediaItem[], idx: number) => void; 
    onAddMedia: (customer: Customer) => void; 
    isAdmin?: boolean; 
    onDelete: (item: MediaItem) => void;
    showBackLink?: boolean;
    returnTarget?: string;
    canAddMedia?: boolean;
}) {
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
    const [videoUrl, setVideoUrl] = useState("");
    const [videoDescription, setVideoDescription] = useState("");
    const [showVideoInput, setShowVideoInput] = useState(false);
    const { toast } = useToast();

    const allMedia = useMemo(() => buildMediaForCustomer(customer), [customer]);

    if (allMedia.length === 0) return null;

    const vehicleTypes = (customer.vehicles || []).map(v => v.type).filter(Boolean);
    const vehicleLabel = vehicleTypes.length > 0 ? Array.from(new Set(vehicleTypes)).join(", ") : "No Vehicles";

    const handleAddVideo = async () => {
        if (!videoUrl) return;
        try {
            const updated = { ...customer };
            const finalVideoString = videoDescription ? `${videoUrl}:::${videoDescription}` : videoUrl;
            
            if (!updated.vehicles || updated.vehicles.length === 0) {
                // Add to customer level if no vehicles
                (updated as any).videoUrl = videoUrl;
                (updated as any).videoNote = videoDescription;
            } else {
                // Add to first vehicle as default
                const v = { ...updated.vehicles[0] };
                v.videoUrls = [...(v.videoUrls || []), finalVideoString];
                updated.vehicles = [v, ...updated.vehicles.slice(1)];
            }
            await upsertSupabaseCustomer(updated);
            toast({ title: "Video Added", description: "The video link has been saved to the gallery." });
            setVideoUrl("");
            setVideoDescription("");
            setShowVideoInput(false);
            window.location.reload(); // Refresh to show new media
        } catch (err) {
            toast({ title: "Error", description: "Failed to save video link.", variant: "destructive" });
        }
    };

    return (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden shadow-lg w-full max-w-full">
            {/* Header (Two-Line Layout) */}
            <div className="w-full p-3 sm:p-4 hover:bg-zinc-800/30 transition-colors cursor-pointer" onClick={() => setExpanded(p => !p)}>
                {/* Line 1: Name & Actions */}
                <div className="flex items-center justify-between gap-1 overflow-hidden w-full">
                    <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                        {showBackLink && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 shrink-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(returnTarget);
                                            }}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-zinc-900 border-zinc-800 text-[10px] font-black uppercase">
                                        Back to {returnTarget.includes('prospects') ? 'Prospect' : 'Customer'}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <div className="h-7 w-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                            <User className="h-3 w-3 text-blue-400" />
                        </div>
                        <p className="font-bold text-white text-xs sm:text-base truncate min-w-0">{customer.name}</p>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                        {/* Action Buttons (Restored to top) */}
                        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                            {canAddMedia && (
                                <>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-pink-400 hover:bg-pink-500/10"
                                        onClick={() => setShowVideoInput(p => !p)}
                                        title="Add Video"
                                    >
                                        <Video className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/10"
                                        onClick={() => onAddMedia(customer)}
                                        title="Add Photos"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                </>
                            )}
                        </div>

                        <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-[8px] px-1 py-0.5 min-w-[1.2rem] justify-center">
                            {allMedia.length}
                        </Badge>
                        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-zinc-600" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />}
                    </div>
                </div>

                {/* Line 2: Vehicle Description (Full Wrap) */}
                <div className="pl-11 mt-0.5 w-full overflow-hidden">
                    <p className="text-[9px] sm:text-[10px] text-zinc-500 font-medium uppercase tracking-wider whitespace-normal break-words leading-tight">
                        {vehicleLabel}
                    </p>
                </div>
            </div>

            {/* Video Link Input (Collapseable) */}
            {showVideoInput && (
                <div className="px-4 pb-4 pl-11 flex flex-col gap-2 animate-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Paste Video URL (YouTube, Drive, or direct .mp4)"
                            className="h-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-400 text-xs flex-1"
                            value={videoUrl}
                            onChange={e => setVideoUrl(e.target.value)}
                        />
                        <Button 
                            size="sm" 
                            className="h-9 bg-pink-600 hover:bg-pink-500 text-white text-[10px] font-bold px-4"
                            onClick={handleAddVideo}
                        >
                            SAVE
                        </Button>
                    </div>
                    <Input 
                        placeholder="Video Description (Optional)"
                        className="h-8 bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-400 text-[10px]"
                        value={videoDescription}
                        onChange={e => setVideoDescription(e.target.value)}
                    />
                </div>
            )}

            {/* Full grid (expanded) */}
            {expanded && (
                <div className="px-4 pb-4 space-y-4 pt-2 border-t border-zinc-800/50">
                    {/* Group by vehicle */}
                    {(() => {
                        const groups: { label: string; items: MediaItem[] }[] = [];
                        const seenUrls = new Set<string>();

                        // 1. Per vehicle (Process these first as they are more specific)
                        const vehicles = customer.vehicles || [];
                        for (let i = 0; i < vehicles.length; i++) {
                            const v = vehicles[i];
                            const vLabel = [v.year, v.make, v.model].filter(Boolean).join(" ") || "Unknown Vehicle";
                            let vItems = allMedia.filter(m => m.vehicleLabel === vLabel);
                            
                            // If this is the only vehicle, also pull in Profile items to unify the gallery
                            if (vehicles.length === 1) {
                                const pItems = allMedia.filter(m => m.vehicleLabel === "Profile");
                                vItems = [...vItems, ...pItems];
                            }

                            const uniqueVItems = vItems.filter(item => {
                                if (!item.url || seenUrls.has(item.url)) return false;
                                seenUrls.add(item.url);
                                return true;
                            });
                            if (uniqueVItems.length > 0) groups.push({ label: vLabel, items: uniqueVItems });
                        }

                        // 2. Profile-level fallback (Show remaining items if not already merged into a single vehicle)
                        const profileItems = allMedia.filter(m => m.vehicleLabel === "Profile");
                        const uniqueProfileItems = profileItems.filter(item => {
                            if (!item.url || seenUrls.has(item.url)) return false;
                            seenUrls.add(item.url);
                            return true;
                        });
                        if (uniqueProfileItems.length > 0) groups.push({ label: "Profile / Misc", items: uniqueProfileItems });

                        return groups.map((group, gi) => (
                            <div key={gi} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Car className="h-3 w-3 text-zinc-500" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{group.label}</p>
                                </div>
                                <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                                    {group.items.map((item, i) => (
                                        <MediaTile
                                            key={i}
                                            item={item}
                                            small
                                            isAdmin={isAdmin}
                                            onDelete={() => onDelete(item)}
                                            onClick={() => onOpen(allMedia, allMedia.indexOf(item))}
                                        />
                                    ))}
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            )}
        </div>
    );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function VehicleGallery() {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const user = getCurrentUser();
    const { isDemoMode } = useDemoMode();

    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [allBookings, setAllBookings] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"customers" | "general">("customers");

    // lightbox
    const [lightboxItems, setLightboxItems] = useState<MediaItem[] | null>(null);
    const [lightboxIdx, setLightboxIdx] = useState(0);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [modalTab, setModalTab] = useState("media");
    const [photoToDelete, setPhotoToDelete] = useState<{ item: MediaItem } | null>(null);

    const isAdmin = user?.role === 'admin' || isDemoMode;

    const refreshData = async () => {
        setLoading(true);
        try {
            const [custData, bookingsData] = await Promise.all([
                getSupabaseCustomers(),
                getSupabaseBookings(false)
            ]);
            setCustomers(custData);
            setAllBookings(bookingsData);
        } catch (err) {
            toast({ title: "Error", description: "Failed to reload media.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const confirmDeletePhoto = async () => {
        if (!photoToDelete) return;
        const { item } = photoToDelete;
        if (!item.customerId || !item.source) return;

        try {
            const customer = customers.find(c => c.id === item.customerId);
            if (!customer) return;

            const updatedCustomer = { ...customer };
            const m = item.source;

            if (m.type === 'customer') {
                const field = updatedCustomer[m.field as keyof Customer];
                if (Array.isArray(field)) {
                    const arr = [...field];
                    arr.splice(m.arrayIndex, 1);
                    (updatedCustomer as any)[m.field] = arr;
                } else {
                    // Singular field (like videoUrl)
                    (updatedCustomer as any)[m.field] = null;
                    if (m.field === 'videoUrl') {
                        (updatedCustomer as any).videoNote = null;
                    }
                }
            } else if (m.type === 'vehicle') {
                const vehicles = [...(updatedCustomer.vehicles || [])];
                const vIdx = m.vehicleIndex!;
                const v = { ...vehicles[vIdx] };
                const field = v[m.field as keyof typeof v];
                
                if (Array.isArray(field)) {
                    const arr = [...field];
                    arr.splice(m.arrayIndex, 1);
                    (v as any)[m.field] = arr;
                    vehicles[vIdx] = v;
                    updatedCustomer.vehicles = vehicles;
                } else {
                    // Singular vehicle field (if any added in future)
                    (v as any)[m.field] = null;
                    vehicles[vIdx] = v;
                    updatedCustomer.vehicles = vehicles;
                }
            }

            await upsertSupabaseCustomer(updatedCustomer);
            toast({ title: "Deleted", description: "Photo removed from gallery." });
            setLightboxItems(null);
            await refreshData();
        } catch (err) {
            toast({ title: "Error", description: "Failed to delete photo.", variant: "destructive" });
        } finally {
            setPhotoToDelete(null);
        }
    };

    const openLightbox = (items: MediaItem[], idx: number) => {
        setLightboxItems(items);
        setLightboxIdx(idx);
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const q = params.get('search');
        if (q) setSearchQuery(q);
    }, [location.search]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [custData, bookingsData] = await Promise.all([
                    getSupabaseCustomers(),
                    getSupabaseBookings(false)
                ]);
                setCustomers(custData);
                setAllBookings(bookingsData);
            } catch (err) {
                toast({ title: "Error", description: "Failed to load customer media.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Customers that have at least 1 media item
    const customersWithMedia = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return customers.filter(c => {
            const hasMedia = buildMediaForCustomer(c).length > 0;
            if (!hasMedia) return false;
            if (!q) return true;
            return (
                c.name.toLowerCase().includes(q) ||
                (c.vehicles || []).some(v =>
                    [v.make, v.model, v.year].some(f => f?.toLowerCase().includes(q))
                )
            );
        });
    }, [customers, searchQuery]);

    // All media across all customers (for General Gallery)
    const allMedia = useMemo(() => {
        const q = searchQuery.toLowerCase();
        const items: MediaItem[] = [];
        for (const c of customers) {
            const cItems = buildMediaForCustomer(c);
            if (!q) items.push(...cItems);
            else if (
                c.name.toLowerCase().includes(q) ||
                (c.vehicles || []).some(v =>
                    [v.make, v.model, v.year].some(f => f?.toLowerCase().includes(q))
                )
            ) {
                items.push(...cItems);
            }
        }
        return items;
    }, [customers, searchQuery]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Loading Media Library...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />
            <main className="container mx-auto px-2 sm:px-4 pt-4 sm:pt-10 pb-16 overflow-x-hidden w-full max-w-[100vw]">
                {/* Title */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 sm:mb-10">
                    <div className="flex items-center gap-4">
                        {(() => {
                            const params = new URLSearchParams(location.search);
                            const from = params.get('from');
                            const search = params.get('search');
                            if (from) {
                                const customerId = params.get('customerId');
                                const target = from === 'prospects' ? '/prospects' : '/search-customer';
                                const returnUrl = `${target}?search=${encodeURIComponent(search || '')}${customerId ? `&customerId=${customerId}` : ''}`;
                                return (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-10 w-10 p-0 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                                                    onClick={() => navigate(returnUrl)}
                                                >
                                                    <ChevronLeft className="h-6 w-6" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-zinc-900 border-zinc-800 text-[10px] font-black uppercase">
                                                Return to {from === 'prospects' ? 'Prospects' : 'Customers'}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            }
                            return null;
                        })()}
                        <div>
                            <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tighter">
                                Media <span className="text-blue-500">Library</span>
                            </h1>
                            <p className="text-zinc-500 text-[10px] sm:text-sm">Vehicle photos and videos.</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Search by customer or vehicle..."
                            className="pl-10 pr-10 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-400"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-2.5 text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
                    <TabsList className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl mb-4 sm:mb-8">
                        <TabsTrigger
                            value="customers"
                            className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg uppercase font-bold tracking-tighter text-xs h-9"
                        >
                            <Car className="h-3.5 w-3.5 mr-2" />
                            Customers &amp; Vehicles
                            <Badge className="ml-2 bg-zinc-800 text-zinc-300 data-[state=active]:bg-blue-700 text-[9px]">
                                {customersWithMedia.length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="general"
                            className="px-6 data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg uppercase font-bold tracking-tighter text-xs h-9"
                        >
                            <ImageIcon className="h-3.5 w-3.5 mr-2" />
                            General Gallery
                            <Badge className="ml-2 bg-zinc-800 text-zinc-300 text-[9px]">
                                {allMedia.length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                    {/* CUSTOMERS & VEHICLES */}
                    <TabsContent value="customers">
                        {customersWithMedia.length === 0 ? (
                            <div className="text-center py-24 border border-dashed border-zinc-800 rounded-2xl">
                                <ImageIcon className="h-12 w-12 mx-auto text-zinc-700 mb-4" />
                                <h3 className="text-lg font-bold text-zinc-400">No media found</h3>
                                <p className="text-zinc-600 text-sm mt-1">Upload photos to a customer record using the edit modal.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {customersWithMedia.map(c => {
                                    const params = new URLSearchParams(location.search);
                                    const from = params.get('from');
                                    const search = params.get('search');
                                    const showBack = from && c.name.toLowerCase().includes((search || '').toLowerCase());
                                    const target = from === 'prospects' ? '/prospects' : '/search-customer';

                                    return (
                                        <CustomerCard
                                            key={c.id}
                                            customer={c}
                                            onOpen={openLightbox}
                                            onAddMedia={(customer) => {
                                              setEditingCustomer(customer);
                                              setModalTab("media");
                                              setModalOpen(true);
                                            }}
                                            isAdmin={isAdmin}
                                            onDelete={(item) => setPhotoToDelete({ item })}
                                            canAddMedia={isAdmin || allBookings.some(b => (b.customerEmail === c.email || b.customerId === c.id) && b.assignedEmployee === user?.id)}
                                            showBackLink={!!showBack}
                                            returnTarget={showBack ? `${target}?search=${encodeURIComponent(search || '')}` : ""}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* GENERAL GALLERY */}
                    <TabsContent value="general">
                        {allMedia.length === 0 ? (
                            <div className="text-center py-24 border border-dashed border-zinc-800 rounded-2xl">
                                <ImageIcon className="h-12 w-12 mx-auto text-zinc-700 mb-4" />
                                <h3 className="text-lg font-bold text-zinc-400">No media found</h3>
                                <p className="text-zinc-600 text-sm mt-1">Photos and videos from all customers will appear here.</p>
                            </div>
                        ) : (
                            <div>
                                {/* Stats bar */}
                                <div className="flex flex-wrap gap-3 mb-6">
                                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
                                        <ImageIcon className="h-3.5 w-3.5 text-blue-400" />
                                        <span className="text-xs font-bold text-zinc-300">{allMedia.filter(m => m.type === "image").length} Photos</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
                                        <Video className="h-3.5 w-3.5 text-pink-400" />
                                        <span className="text-xs font-bold text-zinc-300">{allMedia.filter(m => m.type === "video").length} Videos</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
                                        <User className="h-3.5 w-3.5 text-emerald-400" />
                                        <span className="text-xs font-bold text-zinc-300">{customersWithMedia.length} Customers</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                    {allMedia.map((item, i) => (
                                        <div key={i} className="space-y-1">
                                            <MediaTile 
                                                item={item} 
                                                onClick={() => openLightbox(allMedia, i)} 
                                                isAdmin={isAdmin}
                                                onDelete={() => setPhotoToDelete({ item })}
                                            />
                                            <p className="text-[9px] text-zinc-600 truncate pl-1">{item.customerName}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </main>

            {/* Lightbox */}
            {lightboxItems && (
                <Lightbox
                    items={lightboxItems}
                    startIndex={lightboxIdx}
                    onClose={() => setLightboxItems(null)}
                    isAdmin={isAdmin}
                    onDelete={(idx) => {
                        const item = lightboxItems[idx];
                        if (item) setPhotoToDelete({ item });
                    }}
                />
            )}

            <AlertDialog open={photoToDelete !== null} onOpenChange={() => setPhotoToDelete(null)}>
                <AlertDialogContent className="z-[200]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this photo? This will delete it from both the customer profile and this gallery.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeletePhoto} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete Photo
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <CustomerModal 
                open={modalOpen} 
                onOpenChange={(open) => { setModalOpen(open); if (!open && new URLSearchParams(location.search).has("add")) navigate(location.pathname, { replace: true }); }} 
                initial={editingCustomer} 
                initialTab={modalTab}
                onSave={async (data) => {
                    await upsertSupabaseCustomer(data);
                    await refreshData();
                    if (new URLSearchParams(location.search).has("add")) navigate(location.pathname, { replace: true });
                    setModalOpen(false);
                }}
            />
        </div>
    );
}
