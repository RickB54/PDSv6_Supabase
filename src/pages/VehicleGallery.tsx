import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search, Image as ImageIcon, Video, Maximize2, X, ChevronRight,
    ChevronDown, ChevronUp, ChevronsUp, ChevronsDown, Trash2, Plus, ExternalLink, User, Car, Loader2,
    Calendar, Filter, Share2, Facebook, Copy, Camera, Upload, Download,
    ArrowLeft, LayoutGrid, HelpCircle, Clock, Info
} from "lucide-react";
import { uploadFile } from "@/lib/storage-utils";
import { getCurrentUser } from "@/lib/auth";
import { 
    getSupabaseCustomers, Customer, Vehicle, upsertSupabaseVehicle, 
    supabase, getSupabaseAllVehicles, getLibraryItems, upsertLibraryItem, 
    deleteLibraryItem 
} from "@/lib/supa-data";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { VideoEmbed } from "@/components/video/VideoEmbed";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function VehicleGallery() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const user = getCurrentUser();
    const isAdmin = user?.role === 'admin';

    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
    const [generalGalleryItems, setGeneralGalleryItems] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<'organized' | 'general'>('organized');

    // UI State
    const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: 'image' | 'video'; title: string } | null>(null);
    const [isMediaOpen, setIsMediaOpen] = useState(false);
    const [expandedVehicleIds, setExpandedVehicleIds] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'gallery' | 'flat'>('gallery');

    // Add Media State
    const [isAddMediaOpen, setIsAddMediaOpen] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [targetVehicle, setTargetVehicle] = useState<Vehicle | null>(null);
    const [newMediaUrl, setNewMediaUrl] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [newMediaType, setNewMediaType] = useState<'general' | 'before' | 'after' | 'video' | 'gallery'>('general');
    const [saving, setSaving] = useState(false);

    // Quick Add Vehicle State
    const [showQuickAddVehicle, setShowQuickAddVehicle] = useState(false);
    const [quickVehicle, setQuickVehicle] = useState({ year: '', make: '', model: '' });

    // Media Search State for Modal
    const [customerSearchQuery, setCustomerSearchQuery] = useState("");

    // Recent Customers (last 5 used)
    const [recentCustomerIds, setRecentCustomerIds] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem('gallery_recent_customers');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    const addToRecentCustomers = (customerId: string) => {
        const updated = [customerId, ...recentCustomerIds.filter(id => id !== customerId)].slice(0, 5);
        setRecentCustomerIds(updated);
        localStorage.setItem('gallery_recent_customers', JSON.stringify(updated));
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [customerData, vehicleData, galleryData] = await Promise.all([
                getSupabaseCustomers(),
                getSupabaseAllVehicles(),
                getLibraryItems('general_gallery')
            ]);

            setCustomers(customerData);
            setAllVehicles(vehicleData);
            setGeneralGalleryItems(galleryData);

            if (vehicleData.length < 5) {
                setExpandedVehicleIds(vehicleData.map(v => v.id));
            }
        } catch (err) {
            console.error("Failed to load gallery data:", err);
            toast({ title: "Error", description: "Failed to load vehicle media data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = useMemo(() => {
        if (!searchQuery) return customers;
        const q = searchQuery.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(q) ||
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.vehicles?.some(v =>
                v.make.toLowerCase().includes(q) ||
                v.model.toLowerCase().includes(q) ||
                v.year?.toString().includes(q) ||
                v.vin?.toLowerCase().includes(q)
            ))
        );
    }, [customers, searchQuery]);

    const filteredVehicles = useMemo(() => {
        if (!searchQuery) return allVehicles;
        const q = searchQuery.toLowerCase();
        return allVehicles.filter(v => {
            const customerName = (v as any).customer_info?.name || '';
            return (
                v.make.toLowerCase().includes(q) ||
                v.model.toLowerCase().includes(q) ||
                v.year?.toString().includes(q) ||
                v.vin?.toLowerCase().includes(q) ||
                customerName.toLowerCase().includes(q)
            );
        });
    }, [allVehicles, searchQuery]);

    const handleMediaClick = (url: string, type: 'image' | 'video', title: string) => {
        setSelectedMedia({ url, type, title });
        setIsMediaOpen(true);
    };

    const handleDeleteMedia = async (vehicle: Vehicle, type: 'general' | 'before' | 'after' | 'video', index: number) => {
        if (!isAdmin) {
            toast({ title: "Permission Denied", description: "Only admins can delete media.", variant: "destructive" });
            return;
        }

        if (!confirm("Are you sure you want to remove this media?")) return;

        const updatedVehicle = { ...vehicle };
        if (type === 'general') updatedVehicle.generalPhotos = vehicle.generalPhotos?.filter((_, i) => i !== index);
        if (type === 'before') updatedVehicle.beforePhotos = vehicle.beforePhotos?.filter((_, i) => i !== index);
        if (type === 'after') updatedVehicle.afterPhotos = vehicle.afterPhotos?.filter((_, i) => i !== index);
        if (type === 'video') updatedVehicle.videoUrls = vehicle.videoUrls?.filter((_, i) => i !== index);

        try {
            await upsertSupabaseVehicle(updatedVehicle as any);
            toast({ title: "Deleted", description: "Media removed successfully." });
            loadData();
        } catch (err: any) {
            toast({ title: "Delete Failed", description: err.message || "Could not delete media.", variant: "destructive" });
        }
    };

    const handleQuickAddVehicle = async () => {
        if (!selectedCustomerId || !quickVehicle.make || !quickVehicle.model) {
            toast({ title: "Missing Info", description: "Please enter at least Make and Model.", variant: "destructive" });
            return;
        }

        try {
            const newVehicle = {
                id: crypto.randomUUID(),
                make: quickVehicle.make,
                model: quickVehicle.model,
                year: quickVehicle.year || '',
                type: '',
                color: '',
                vin: '',
                customer_id: selectedCustomerId,
                generalPhotos: [],
                beforePhotos: [],
                afterPhotos: [],
                videoUrls: []
            };

            await upsertSupabaseVehicle(newVehicle as any);
            await loadData();

            const refreshedCustomer = customers.find(c => c.id === selectedCustomerId);
            const createdVehicle = refreshedCustomer?.vehicles?.find(v => v.id === newVehicle.id);
            if (createdVehicle) {
                setTargetVehicle(createdVehicle);
            }

            setShowQuickAddVehicle(false);
            setQuickVehicle({ year: '', make: '', model: '' });
            toast({ title: "Vehicle Added!", description: `${newVehicle.year} ${newVehicle.make} ${newVehicle.model} added successfully.` });
        } catch (err: any) {
            toast({ title: "Failed to Add Vehicle", description: err.message, variant: "destructive" });
        }
    };

    const handleAddMedia = async () => {
        if (!targetVehicle && newMediaType !== 'gallery') return;
        if (newMediaType === 'video' && !newMediaUrl.trim()) return;
        if (newMediaType !== 'video' && !selectedFile && !newMediaUrl.trim()) return;

        setSaving(true);
        const updatedVehicle = targetVehicle ? { ...targetVehicle } : null;
        let url = newMediaUrl.trim();

        try {
            if (newMediaType !== 'video' && selectedFile) {
                toast({ title: "Uploading...", description: "Transferring media to secure storage." });
                url = await uploadFile('customer-photos', selectedFile);
            }

            if (!url) throw new Error("No URL or file provided");

            if (newMediaType === 'gallery') {
                const galleryItem = {
                    id: crypto.randomUUID(),
                    title: `Gallery ${new Date().toLocaleDateString()}`,
                    description: `General gallery item uploaded on ${new Date().toLocaleDateString()}`,
                    category: 'general_gallery',
                    type: 'image',
                    url: url
                };
                await upsertLibraryItem(galleryItem as any);
                toast({ title: "Added to Gallery", description: "Successfully added to the General Gallery." });
            } else if (updatedVehicle) {
                if (newMediaType === 'general') updatedVehicle.generalPhotos = [...(updatedVehicle.generalPhotos || []), url];
                if (newMediaType === 'before') updatedVehicle.beforePhotos = [...(updatedVehicle.beforePhotos || []), url];
                if (newMediaType === 'after') updatedVehicle.afterPhotos = [...(updatedVehicle.afterPhotos || []), url];
                if (newMediaType === 'video') updatedVehicle.videoUrls = [...(updatedVehicle.videoUrls || []), url];
                
                await upsertSupabaseVehicle(updatedVehicle as any);
                addToRecentCustomers(selectedCustomerId);
                toast({ title: "Media Added", description: "Successfully added to vehicle gallery." });
            }
            
            setNewMediaUrl("");
            setSelectedFile(null);
            setSelectedCustomerId("");
            setTargetVehicle(null);
            setIsAddMediaOpen(false);
            loadData();
        } catch (err: any) {
            console.error("Failed to add media:", err);
            toast({ title: "Operation Failed", description: err.message || "Could not add media. Please try again.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Accessing Media Library...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />
            <main className="container mx-auto px-4 pt-24 pb-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black uppercase tracking-tighter">Media <span className="text-blue-500">Library</span></h1>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-zinc-500 hover:text-white transition-all"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: 'media-library' }))}
                        >
                            <HelpCircle className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 flex-1 md:flex-none px-6 rounded-xl font-bold uppercase tracking-tighter shadow-lg shadow-emerald-900/20"
                            onClick={() => setIsAddMediaOpen(true)}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Media
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800">
                        <TabsList className="bg-zinc-950 border border-zinc-800 p-1 rounded-xl">
                            <TabsTrigger value="organized" className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg uppercase font-bold tracking-tighter">
                                <Car className="h-4 w-4 mr-2" />
                                Customers & Vehicles
                            </TabsTrigger>
                            <TabsTrigger value="general" className="px-6 data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg uppercase font-bold tracking-tighter">
                                <LayoutGrid className="h-4 w-4 mr-2" />
                                General Gallery
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-3">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                                <Input
                                    placeholder={activeTab === 'organized' ? "Search Customers..." : "Filter gallery..."}
                                    className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:ring-blue-500/20"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <TabsContent value="organized" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                            <div className="flex items-center bg-zinc-950 rounded-xl p-1 border border-zinc-800">
                                <Button
                                    variant={viewMode === 'gallery' ? 'default' : 'ghost'}
                                    className={`h-8 text-xs px-4 rounded-lg font-bold uppercase transition-all ${viewMode === 'gallery' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                                    onClick={() => setViewMode('gallery')}
                                >
                                    Timeline
                                </Button>
                                <Button
                                    variant={viewMode === 'flat' ? 'default' : 'ghost'}
                                    className={`h-8 text-xs px-4 rounded-lg font-bold uppercase transition-all ${viewMode === 'flat' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                                    onClick={() => setViewMode('flat')}
                                >
                                    Flat Grid
                                </Button>
                                <Button
                                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                                    className={`h-8 text-xs px-4 rounded-lg font-bold uppercase transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                                    onClick={() => setViewMode('list')}
                                >
                                    Grouped
                                </Button>
                            </div>

                            {viewMode !== 'flat' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        if (expandedVehicleIds.length > 0) setExpandedVehicleIds([]);
                                        else setExpandedVehicleIds(allVehicles.map(v => v.id));
                                    }}
                                    className="text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-950/30 h-8 rounded-lg text-[10px] font-black uppercase px-3"
                                >
                                    {expandedVehicleIds.length > 0 ? <><ChevronsUp className="h-3 w-3 mr-2" /> Retract All</> : <><ChevronsDown className="h-3 w-3 mr-2" /> Expand All</>}
                                </Button>
                            )}
                        </div>

                        {filteredCustomers.length === 0 ? (
                            <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800 rounded-xl border-dashed">
                                <ImageIcon className="h-12 w-12 mx-auto text-zinc-700 mb-4" />
                                <h3 className="text-xl font-semibold text-zinc-300">No media found</h3>
                                <p className="text-zinc-500 mt-2">No vehicles matching your search were found.</p>
                            </div>
                        ) : viewMode === 'flat' ? (
                            <FlatGalleryView 
                                vehicles={filteredVehicles} 
                                onMediaClick={handleMediaClick} 
                                onDeleteMedia={handleDeleteMedia} 
                                isAdmin={isAdmin} 
                            />
                        ) : viewMode === 'gallery' ? (
                            <UnifiedGalleryView
                                vehicles={filteredVehicles}
                                onMediaClick={handleMediaClick}
                                onDeleteMedia={handleDeleteMedia}
                                isAdmin={isAdmin}
                                toast={toast}
                                expandedVehicleIds={expandedVehicleIds}
                                onToggleVehicle={(id) => setExpandedVehicleIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id])}
                                onToggleAll={() => {
                                    if (expandedVehicleIds.length > 0) setExpandedVehicleIds([]);
                                    else setExpandedVehicleIds(filteredVehicles.map(v => v.id));
                                }}
                            />
                        ) : (
                            <div className="space-y-6">
                                {filteredCustomers.map(customer => (
                                    <Card key={customer.id} className="bg-zinc-900/50 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors">
                                        <CardHeader className="bg-zinc-900 pb-4 p-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 shrink-0 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                                                        <User className="h-5 w-5 text-blue-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <CardTitle className="text-white text-base md:text-lg truncate">{customer.name}</CardTitle>
                                                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-0.5">
                                                            <Badge variant="outline" className="text-[10px] bg-zinc-800 border-zinc-700 whitespace-nowrap">
                                                                {customer.type || 'Customer'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
                                                    {(customer.vehicles || []).length} Vehicle(s)
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <Accordion type="multiple" className="w-full" value={expandedVehicleIds} onValueChange={setExpandedVehicleIds}>
                                                {(customer.vehicles || []).map((vehicle, vIdx) => (
                                                    <AccordionItem key={vehicle.id || vIdx} value={vehicle.id || `v-${vIdx}`} className="border-zinc-800/50 px-6">
                                                        <AccordionTrigger className="hover:no-underline py-4">
                                                            <div className="flex items-center justify-between w-full pr-4 gap-2">
                                                                <div className="flex items-center gap-3 text-left min-w-0">
                                                                    <Car className="h-4 w-4 text-zinc-500 shrink-0" />
                                                                    <span className="font-medium text-zinc-200 text-sm md:text-base truncate">
                                                                        {vehicle.year} {vehicle.make} {vehicle.model}
                                                                    </span>
                                                                </div>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-3 text-[10px] uppercase font-bold text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white shrink-0"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setTargetVehicle(vehicle);
                                                                        setIsAddMediaOpen(true);
                                                                    }}
                                                                >
                                                                    Add Media
                                                                </Button>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="pb-6">
                                                            <Tabs defaultValue="all" className="w-full">
                                                                <TabsList className="bg-zinc-950 border border-zinc-800 mb-4 h-9 p-1">
                                                                    <TabsTrigger value="all" className="text-xs h-7">All Media</TabsTrigger>
                                                                    <TabsTrigger value="before" className="text-xs h-7 text-orange-400">Before</TabsTrigger>
                                                                    <TabsTrigger value="after" className="text-xs h-7 text-emerald-400">After</TabsTrigger>
                                                                    <TabsTrigger value="videos" className="text-xs h-7 text-pink-400">Videos</TabsTrigger>
                                                                </TabsList>
                                                                <TabsContent value="all" className="space-y-6">
                                                                    <MediaGroup title="General" items={vehicle.generalPhotos || []} type="image" onView={(u: string) => handleMediaClick(u, 'image', `General - ${vehicle.make}`)} onDelete={(idx: number) => handleDeleteMedia(vehicle, 'general', idx)} isAdmin={isAdmin} />
                                                                    <MediaGroup title="Before" items={vehicle.beforePhotos || []} type="image" accent="orange" onView={(u: string) => handleMediaClick(u, 'image', `Before - ${vehicle.make}`)} onDelete={(idx: number) => handleDeleteMedia(vehicle, 'before', idx)} isAdmin={isAdmin} />
                                                                    <MediaGroup title="After" items={vehicle.afterPhotos || []} type="image" accent="emerald" onView={(u: string) => handleMediaClick(u, 'image', `After - ${vehicle.make}`)} onDelete={(idx: number) => handleDeleteMedia(vehicle, 'after', idx)} isAdmin={isAdmin} />
                                                                    <MediaGroup title="Videos" items={vehicle.videoUrls || []} type="video" accent="pink" onView={(u: string) => handleMediaClick(u, 'video', `Video - ${vehicle.make}`)} onDelete={(idx: number) => handleDeleteMedia(vehicle, 'video', idx)} isAdmin={isAdmin} />
                                                                </TabsContent>
                                                                <TabsContent value="before">
                                                                    <MediaGrid items={vehicle.beforePhotos || []} type="image" onView={(u: string) => handleMediaClick(u, 'image', `Before - ${vehicle.make}`)} onDelete={(idx: number) => handleDeleteMedia(vehicle, 'before', idx)} isAdmin={isAdmin} />
                                                                </TabsContent>
                                                                <TabsContent value="after">
                                                                    <MediaGrid items={vehicle.afterPhotos || []} type="image" onView={(u: string) => handleMediaClick(u, 'image', `After - ${vehicle.make}`)} onDelete={(idx: number) => handleDeleteMedia(vehicle, 'after', idx)} isAdmin={isAdmin} />
                                                                </TabsContent>
                                                                <TabsContent value="videos">
                                                                    <MediaGrid items={vehicle.videoUrls || []} type="video" onView={(u: string) => handleMediaClick(u, 'video', `Video - ${vehicle.make}`)} onDelete={(idx: number) => handleDeleteMedia(vehicle, 'video', idx)} isAdmin={isAdmin} />
                                                                </TabsContent>
                                                            </Tabs>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                ))}
                                            </Accordion>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="general" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <GeneralGalleryView
                            items={generalGalleryItems}
                            onMediaClick={handleMediaClick}
                            onDelete={(id) => {
                                if (confirm("Remove this item from the gallery?")) {
                                    deleteLibraryItem(id).then(() => loadData());
                                }
                            }}
                            isAdmin={isAdmin}
                            searchQuery={searchQuery}
                        />
                    </TabsContent>
                </Tabs>

                {/* Lightbox / Media Viewer */}
                <Dialog open={isMediaOpen} onOpenChange={setIsMediaOpen}>
                    <DialogContent className="max-w-[95vw] sm:max-w-4xl bg-black border-zinc-800 p-0 overflow-hidden">
                        {selectedMedia && (
                            <div className="flex flex-col">
                                <div className="p-4 bg-zinc-900 flex items-center justify-between border-b border-zinc-800">
                                    <DialogTitle className="text-white font-medium flex items-center gap-2">
                                        {selectedMedia.type === 'image' ? <ImageIcon className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                                        {selectedMedia.title}
                                    </DialogTitle>
                                    <Button variant="ghost" size="icon" onClick={() => setIsMediaOpen(false)} className="h-8 w-8 text-zinc-500 hover:text-white">
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                                <div className="flex-1 flex items-center justify-center p-4 min-h-[50vh]">
                                    {selectedMedia.type === 'image' ? (
                                        <img src={selectedMedia.url} alt="Vehicle" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl" />
                                    ) : (
                                        <div className="w-full">
                                            <VideoEmbed url={selectedMedia.url} title={selectedMedia.title} />
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 bg-zinc-900 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-800">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedMedia.url);
                                            toast({ title: "Copied!", description: "URL copied to clipboard." });
                                        }}
                                    >
                                        <Copy className="h-4 w-4 mr-2" /> Copy URL
                                    </Button>
                                    {selectedMedia.type === 'image' && (
                                        <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                                            <a href={selectedMedia.url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4 mr-2" /> View Original
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Add Media Dialog */}
                <Dialog open={isAddMediaOpen} onOpenChange={setIsAddMediaOpen}>
                    <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md p-0 overflow-hidden">
                        <DialogHeader className="p-6 pb-0">
                            <DialogTitle className="text-white text-xl font-black uppercase tracking-tighter">Add <span className="text-blue-500">Media</span></DialogTitle>
                        </DialogHeader>
                        
                        <div className="p-6 space-y-6">
                            {/* Media Category Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                    Destination
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant={newMediaType === 'gallery' ? "default" : "outline"}
                                        className={`h-11 rounded-xl text-xs font-bold uppercase tracking-tighter transition-all ${newMediaType === 'gallery' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'border-zinc-800 text-zinc-500'}`}
                                        onClick={() => setNewMediaType('gallery')}
                                    >
                                        <LayoutGrid className="h-4 w-4 mr-2" />
                                        General Gallery
                                    </Button>
                                    <Button
                                        variant={newMediaType !== 'gallery' ? "default" : "outline"}
                                        className={`h-11 rounded-xl text-xs font-bold uppercase tracking-tighter transition-all ${newMediaType !== 'gallery' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'border-zinc-800 text-zinc-500'}`}
                                        onClick={() => {
                                            if (newMediaType === 'gallery') setNewMediaType('general');
                                        }}
                                    >
                                        <Car className="h-4 w-4 mr-2" />
                                        Vehicle Tagged
                                    </Button>
                                </div>
                            </div>

                            {/* Conditional Customer/Vehicle Selectors */}
                            {newMediaType !== 'gallery' && (
                                <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                            Customer
                                        </label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                                            <Input
                                                placeholder="Search customers..."
                                                className="pl-9 h-11 bg-zinc-900 border-zinc-800 text-sm rounded-xl"
                                                value={selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name || '' : customerSearchQuery}
                                                onChange={(e) => {
                                                    setCustomerSearchQuery(e.target.value);
                                                    if (selectedCustomerId) {
                                                        setSelectedCustomerId('');
                                                        setTargetVehicle(null);
                                                    }
                                                }}
                                            />
                                        </div>
                                        
                                        {!selectedCustomerId && customerSearchQuery && (
                                            <div className="max-h-40 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl mt-1">
                                                {customers
                                                    .filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                                                    .map(c => (
                                                        <button 
                                                            key={c.id} 
                                                            className="w-full text-left px-4 py-3 hover:bg-blue-600/10 text-sm transition-colors border-b border-zinc-800/50 last:border-0"
                                                            onClick={() => {
                                                                setSelectedCustomerId(c.id);
                                                                setCustomerSearchQuery("");
                                                            }}
                                                        >
                                                            {c.name}
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        )}
                                    </div>

                                    {selectedCustomerId && (
                                        <div className="space-y-3 animate-in fade-in duration-300">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                                Vehicle & Type
                                            </label>
                                            <div className="grid grid-cols-1 gap-3">
                                                <select 
                                                    className="w-full h-11 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    value={targetVehicle?.id || ""}
                                                    onChange={(e) => {
                                                        const v = customers.find(c => c.id === selectedCustomerId)?.vehicles?.find(v => v.id === e.target.value);
                                                        setTargetVehicle(v || null);
                                                    }}
                                                >
                                                    <option value="">Select vehicle...</option>
                                                    {(customers.find(c => c.id === selectedCustomerId)?.vehicles || []).map(v => (
                                                        <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
                                                    ))}
                                                </select>

                                                <div className="flex flex-wrap gap-2">
                                                    {(['general', 'before', 'after', 'video'] as const).map(t => (
                                                        <Button
                                                            key={t}
                                                            variant="outline"
                                                            size="sm"
                                                            className={`h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${newMediaType === t ? 'bg-blue-600 text-white border-blue-600' : 'border-zinc-800 text-zinc-500 hover:text-white'}`}
                                                            onClick={() => setNewMediaType(t)}
                                                        >
                                                            {t}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Media Capture/Upload Section */}
                            <div className="space-y-4 pt-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Media Source
                                </label>
                                
                                {newMediaType === 'video' ? (
                                    <div className="space-y-3">
                                        <Input
                                            placeholder="YouTube or Video URL..."
                                            className="h-11 bg-zinc-900 border-zinc-800 rounded-xl"
                                            value={newMediaUrl}
                                            onChange={(e) => setNewMediaUrl(e.target.value)}
                                        />
                                        <p className="text-[10px] text-zinc-500 italic">Supports YouTube, Vimeo, and direct links.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <Button variant="outline" className="w-full h-24 rounded-2xl flex flex-col gap-2 border-dashed border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all group">
                                                    <Upload className="h-6 w-6 text-zinc-500 group-hover:text-emerald-400 group-hover:scale-110 transition-all" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Library</span>
                                                </Button>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <Button variant="outline" className="w-full h-24 rounded-2xl flex flex-col gap-2 border-dashed border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all group">
                                                    <Camera className="h-6 w-6 text-zinc-500 group-hover:text-blue-400 group-hover:scale-110 transition-all" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Camera</span>
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        {selectedFile ? (
                                            <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <ImageIcon className="h-4 w-4 text-blue-400 shrink-0" />
                                                    <span className="text-xs font-bold text-blue-300 truncate">{selectedFile.name}</span>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-400 hover:text-white" onClick={() => setSelectedFile(null)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Input
                                                placeholder="Or paste an image URL..."
                                                className="h-11 bg-zinc-900 border-zinc-800 rounded-xl text-xs"
                                                value={newMediaUrl}
                                                onChange={(e) => setNewMediaUrl(e.target.value)}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="p-6 bg-zinc-900/50 border-t border-zinc-800 gap-3 sm:gap-0">
                            <Button variant="ghost" onClick={() => setIsAddMediaOpen(false)} className="text-zinc-500 font-bold uppercase tracking-widest text-xs h-11 px-6">Cancel</Button>
                            <Button 
                                className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs h-11 px-8 rounded-xl shadow-lg shadow-blue-900/40"
                                onClick={handleAddMedia}
                                disabled={saving || (newMediaType !== 'gallery' && !targetVehicle) || (newMediaType === 'video' ? !newMediaUrl.trim() : (!newMediaUrl.trim() && !selectedFile))}
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                                Save to {newMediaType === 'gallery' ? 'Library' : 'Vehicle'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}

function GeneralGalleryView({ items, onMediaClick, onDelete, isAdmin, searchQuery }: any) {
    const filtered = useMemo(() => {
        if (!searchQuery) return items;
        const q = searchQuery.toLowerCase();
        return items.filter((i: any) => 
            i.title?.toLowerCase().includes(q) || 
            i.description?.toLowerCase().includes(q)
        );
    }, [items, searchQuery]);

    if (filtered.length === 0) {
        return (
            <div className="text-center py-32 bg-zinc-950/50 border border-zinc-900 rounded-3xl border-dashed">
                <ImageIcon className="h-16 w-16 mx-auto text-zinc-800 mb-6" />
                <h3 className="text-2xl font-black text-zinc-500 uppercase tracking-tighter">Empty Gallery</h3>
                <p className="text-zinc-600 mt-2 max-w-xs mx-auto">Upload standalone images or media items to build your general marketing and library assets.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filtered.map((item: any) => (
                <div key={item.id} className="group relative aspect-square rounded-3xl bg-zinc-950 border border-zinc-900 overflow-hidden hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 cursor-pointer" onClick={() => onMediaClick(item.url, 'image', item.title)}>
                    <img src={item.url} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                        <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                            <h4 className="text-sm font-black text-white uppercase tracking-tighter truncate">{item.title}</h4>
                            <div className="flex items-center justify-between mt-3">
                                <Button size="sm" variant="secondary" className="h-8 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black font-bold uppercase text-[10px] tracking-widest px-4">
                                    Expand
                                </Button>
                                {isAdmin && (
                                    <Button size="sm" variant="destructive" className="h-8 w-8 rounded-xl flex items-center justify-center p-0" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-4 right-4 z-10">
                        <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest backdrop-blur-md">
                            Library
                        </Badge>
                    </div>
                </div>
            ))}
        </div>
    );
}

function UnifiedGalleryView({ vehicles, onMediaClick, onDeleteMedia, isAdmin, toast, expandedVehicleIds, onToggleVehicle, onToggleAll }: any) {
    const [activeCategory, setActiveCategory] = useState<'all' | 'general' | 'before' | 'after' | 'video'>('all');

    const allMedia = useMemo(() => {
        const media: any[] = [];
        vehicles.forEach((v: Vehicle) => {
            const customerName = (v as any).customer_info?.name || 'Unassigned';
            const vehicleLabel = `${v.year} ${v.make} ${v.model}`;

            if (activeCategory === 'all' || activeCategory === 'general') {
                v.generalPhotos?.forEach((url, idx) => media.push({ url, type: 'image', category: 'general', vehicle: vehicleLabel, customer: customerName, vehicleId: v.id, index: idx }));
            }
            if (activeCategory === 'all' || activeCategory === 'before') {
                v.beforePhotos?.forEach((url, idx) => media.push({ url, type: 'image', category: 'before', vehicle: vehicleLabel, customer: customerName, vehicleId: v.id, index: idx }));
            }
            if (activeCategory === 'all' || activeCategory === 'after') {
                v.afterPhotos?.forEach((url, idx) => media.push({ url, type: 'image', category: 'after', vehicle: vehicleLabel, customer: customerName, vehicleId: v.id, index: idx }));
            }
            if (activeCategory === 'all' || activeCategory === 'video') {
                v.videoUrls?.forEach((url, idx) => media.push({ url, type: 'video', category: 'video', vehicle: vehicleLabel, customer: customerName, vehicleId: v.id, index: idx }));
            }
        });
        return media;
    }, [vehicles, activeCategory]);

    const categoryColors: Record<string, string> = {
        general: 'bg-blue-600',
        before: 'bg-orange-600',
        after: 'bg-emerald-600',
        video: 'bg-pink-600'
    };

    if (allMedia.length === 0) {
        return (
            <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800 rounded-xl border-dashed">
                <ImageIcon className="h-10 w-10 mx-auto text-zinc-700 mb-4" />
                <h3 className="text-lg font-bold text-zinc-400 uppercase tracking-tighter">No items to show</h3>
                <p className="text-zinc-600 text-sm mt-1">None of your vehicles have media in this category yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-wrap items-center gap-2">
                {(['all', 'general', 'before', 'after', 'video'] as const).map(cat => (
                    <Button 
                        key={cat} 
                        variant="ghost" 
                        size="sm" 
                        className={`h-8 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-white'}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </Button>
                ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {allMedia.map((media, idx) => (
                    <div
                        key={`${media.url}-${idx}`}
                        className="group relative aspect-square rounded-2xl bg-zinc-950 border border-zinc-900 overflow-hidden hover:border-blue-500/50 hover:shadow-2xl transition-all cursor-pointer"
                        onClick={() => onMediaClick(media.url, media.type, media.vehicle)}
                    >
                        {media.type === 'image' ? (
                            <img src={media.url} alt={media.vehicle} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                <Video className="h-8 w-8 text-pink-400 opacity-50" />
                            </div>
                        )}

                        <div className="absolute top-3 left-3 z-10">
                            <Badge className={`${categoryColors[media.category]} text-white text-[8px] px-2 py-0.5 uppercase font-black tracking-widest border-0`}>
                                {media.category}
                            </Badge>
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end">
                            <p className="text-[10px] font-black text-white uppercase tracking-tighter truncate">{media.vehicle}</p>
                            <p className="text-[8px] text-zinc-500 font-bold uppercase truncate">{media.customer}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function FlatGalleryView({ vehicles, onMediaClick, onDeleteMedia, isAdmin }: any) {
    const allMedia = useMemo(() => {
        const media: any[] = [];
        vehicles.forEach((v: Vehicle) => {
            const customerName = (v as any).customer_info?.name || 'Unassigned';
            const vehicleLabel = `${v.year} ${v.make} ${v.model}`;
            v.generalPhotos?.forEach((url, idx) => media.push({ url, type: 'image', category: 'general', vehicle: vehicleLabel, customer: customerName, vehicleId: v.id, index: idx }));
            v.beforePhotos?.forEach((url, idx) => media.push({ url, type: 'image', category: 'before', vehicle: vehicleLabel, customer: customerName, vehicleId: v.id, index: idx }));
            v.afterPhotos?.forEach((url, idx) => media.push({ url, type: 'image', category: 'after', vehicle: vehicleLabel, customer: customerName, vehicleId: v.id, index: idx }));
            v.videoUrls?.forEach((url, idx) => media.push({ url, type: 'video', category: 'video', vehicle: vehicleLabel, customer: customerName, vehicleId: v.id, index: idx }));
        });
        return media;
    }, [vehicles]);

    const categoryColors: Record<string, string> = {
        general: 'bg-blue-600',
        before: 'bg-orange-600',
        after: 'bg-emerald-600',
        video: 'bg-pink-600'
    };

    if (allMedia.length === 0) return (
        <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800 rounded-3xl border-dashed">
            <ImageIcon className="h-12 w-12 mx-auto text-zinc-800 mb-4" />
            <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No media assets found</p>
        </div>
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {allMedia.map((m, i) => (
                <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-zinc-900 hover:border-blue-500 transition-all cursor-pointer" onClick={() => onMediaClick(m.url, m.type, m.vehicle)}>
                    <img src={m.url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute top-2 left-2 z-10">
                        <Badge className={`${categoryColors[m.category]} text-[8px] font-black uppercase tracking-widest px-2 py-0.5`}>{m.category}</Badge>
                    </div>
                </div>
            ))}
        </div>
    );
}

function MediaGroup({ title, items, type, accent = "blue", onView, onDelete, isAdmin }: any) {
    if (items.length === 0) return null;
    const accentColors: any = { blue: "text-blue-400", orange: "text-orange-400", emerald: "text-emerald-400", pink: "text-pink-400" };
    return (
        <div className="space-y-3">
            <h4 className={`text-[10px] font-black uppercase tracking-widest ${accentColors[accent]} flex items-center gap-2`}>
                <div className={`h-1 w-1 rounded-full ${accent === 'blue' ? 'bg-blue-500' : accent === 'orange' ? 'bg-orange-500' : accent === 'emerald' ? 'bg-emerald-500' : 'bg-pink-500'}`} />
                {title} <span className="text-zinc-600 ml-1">({items.length})</span>
            </h4>
            <MediaGrid items={items} type={type} onView={onView} onDelete={onDelete} isAdmin={isAdmin} />
        </div>
    );
}

function MediaGrid({ items, type, onView, onDelete, isAdmin }: any) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {items.map((url: string, idx: number) => (
                <div key={idx} className="group relative aspect-square rounded-xl bg-zinc-950 border border-zinc-900 overflow-hidden hover:border-zinc-500 transition-all shadow-xl cursor-pointer" onClick={() => onView(url)}>
                    <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white text-white hover:text-black" onClick={(e) => { e.stopPropagation(); onView(url); }}>
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                            <Button size="icon" variant="destructive" className="h-8 w-8 rounded-lg bg-red-600/80 hover:bg-red-600" onClick={(e) => { e.stopPropagation(); onDelete(idx); }}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
