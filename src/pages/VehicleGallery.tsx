import { useState, useEffect, useMemo, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search, Image as ImageIcon, Video, X, Car, Loader2,
    ChevronDown, ChevronUp, User, Maximize2, ChevronLeft, ChevronRight, Trash2
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
    getSupabaseCustomers, Customer
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
        items.push({ url: (customer as any).videoUrl, type: "video", category: "video", customerName, vehicleLabel: "Profile", customerId });
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
        (v.videoUrls || []).forEach(url =>
            items.push({ url, type: "video", category: "video", customerName, vehicleLabel, customerId })
        );
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
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onDelete?.(idx)}
                                    className="text-white hover:bg-red-600/50 h-8 w-8"
                                    title="Delete Image"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
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
                            <div className="w-full max-w-3xl">
                                <VideoEmbed url={current.url} title={current.vehicleLabel} />
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
function MediaTile({ item, onClick }: { item: MediaItem; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className="group relative aspect-square rounded-2xl bg-zinc-950 border border-zinc-900 overflow-hidden hover:border-blue-500/60 hover:shadow-xl hover:shadow-blue-900/20 transition-all cursor-pointer"
        >
            {item.type === "image" ? (
                <img src={item.url} alt={item.vehicleLabel} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
                <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center gap-2">
                    <Video className="h-8 w-8 text-pink-400" />
                    <p className="text-[9px] text-zinc-500 font-black uppercase px-2 text-center truncate max-w-full">{item.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</p>
                </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <p className="text-[9px] font-black uppercase text-white truncate">{item.vehicleLabel}</p>
            </div>

            {/* Category badge */}
            <div className="absolute top-2 left-2 z-10">
                <span className={`${categoryColors[item.category]} text-white text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded`}>
                    {item.category}
                </span>
            </div>

            {/* Zoom icon */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Maximize2 className="h-3 w-3 text-white drop-shadow-lg" />
            </div>
        </div>
    );
}

// ─── customer card ────────────────────────────────────────────────────────────
function CustomerCard({ customer, onOpen, onAddMedia }: { customer: Customer; onOpen: (items: MediaItem[], idx: number) => void; onAddMedia: (customer: Customer) => void }) {
    const [expanded, setExpanded] = useState(false);
    const allMedia = useMemo(() => buildMediaForCustomer(customer), [customer]);

    if (allMedia.length === 0) return null;

    const preview = allMedia.slice(0, 6);

    return (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(p => !p)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-white text-sm">{customer.name}</p>
                        <p className="text-[10px] text-zinc-500">
                            {allMedia.length} media item{allMedia.length !== 1 ? "s" : ""} ·{" "}
                            {(customer.vehicles || []).length} vehicle{(customer.vehicles || []).length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[9px] font-black border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1.5"
                      onClick={(e) => { e.stopPropagation(); onAddMedia(customer); }}
                    >
                        <Plus className="w-3 h-3" /> ADD MEDIA
                    </Button>
                    <div className="flex items-center gap-2 mr-2">
                        {allMedia.filter(m => m.type === "video").length > 0 && (
                            <Badge className="bg-pink-600/20 text-pink-400 border-pink-600/30 text-[9px]">
                                {allMedia.filter(m => m.type === "video").length} video{allMedia.filter(m => m.type === "video").length !== 1 ? "s" : ""}
                            </Badge>
                        )}
                        <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-[9px]">
                            {allMedia.filter(m => m.type === "image").length} photo{allMedia.filter(m => m.type === "image").length !== 1 ? "s" : ""}
                        </Badge>
                    </div>
                    {expanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                </div>
            </button>

            {/* Preview strip (always visible) */}
            {!expanded && (
                <div className="px-5 pb-4 grid grid-cols-6 gap-2">
                    {preview.map((item, i) => (
                        <MediaTile key={i} item={item} onClick={() => onOpen(allMedia, i)} />
                    ))}
                    {allMedia.length > 6 && (
                        <button
                            onClick={() => setExpanded(true)}
                            className="aspect-square rounded-2xl bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center text-zinc-400 hover:bg-zinc-700 transition-colors text-[10px] font-black uppercase"
                        >
                            +{allMedia.length - 6}
                        </button>
                    )}
                </div>
            )}

            {/* Full grid (expanded) */}
            {expanded && (
                <div className="px-5 pb-5 space-y-4">
                    {/* Group by vehicle */}
                    {(() => {
                        const groups: { label: string; items: MediaItem[] }[] = [];

                        // Profile-level
                        const profileItems = allMedia.filter(m => m.vehicleLabel === "Profile");
                        if (profileItems.length > 0) groups.push({ label: "Profile / General", items: profileItems });

                        // Per vehicle
                        for (const v of customer.vehicles || []) {
                            const vehicleLabel = [v.year, v.make, v.model].filter(Boolean).join(" ") || "Unknown Vehicle";
                            const vItems = allMedia.filter(m => m.vehicleLabel === vehicleLabel);
                            if (vItems.length > 0) groups.push({ label: vehicleLabel, items: vItems });
                        }

                        return groups.map((group, gi) => (
                            <div key={gi} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Car className="h-3 w-3 text-zinc-500" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{group.label}</p>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                    {group.items.map((item, i) => (
                                        <MediaTile
                                            key={i}
                                            item={item}
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
    const { toast } = useToast();
    const user = getCurrentUser();
    const { isDemoMode } = useDemoMode();

    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<Customer[]>([]);
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
            const data = await getSupabaseCustomers();
            setCustomers(data);
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
                const arr = [...(updatedCustomer[m.field as keyof Customer] as string[])];
                arr.splice(m.arrayIndex, 1);
                (updatedCustomer as any)[m.field] = arr;
            } else if (m.type === 'vehicle') {
                const vehicles = [...(updatedCustomer.vehicles || [])];
                const v = { ...vehicles[m.vehicleIndex!] };
                const arr = [...(v[m.field as keyof typeof v] as string[])];
                arr.splice(m.arrayIndex, 1);
                (v as any)[m.field] = arr;
                vehicles[m.vehicleIndex!] = v;
                updatedCustomer.vehicles = vehicles;
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
        (async () => {
            setLoading(true);
            try {
                const data = await getSupabaseCustomers();
                setCustomers(data);
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
            <main className="container mx-auto px-4 pt-24 pb-16">
                {/* Title */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter">
                            Media <span className="text-blue-500">Library</span>
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1">All customer vehicle photos and videos in one place.</p>
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Search by customer or vehicle..."
                            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
                    <TabsList className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl mb-8">
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
                                {customersWithMedia.map(c => (
                                    <CustomerCard
                                        key={c.id}
                                        customer={c}
                                        onOpen={openLightbox}
                                        onAddMedia={(customer) => {
                                          setEditingCustomer(customer);
                                          setModalTab("media");
                                          setModalOpen(true);
                                        }}
                                    />
                                ))}
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
                                            <MediaTile item={item} onClick={() => openLightbox(allMedia, i)} />
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
                <AlertDialogContent>
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
