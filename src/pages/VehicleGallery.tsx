import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search, Image as ImageIcon, Video, Maximize2, X, ChevronRight,
    ChevronDown, Trash2, Plus, ExternalLink, User, Car, Loader2,
    Calendar, Filter, Share2, Facebook, Copy, Camera, Upload, Download,
    ArrowLeft
} from "lucide-react";
import { uploadFile } from "@/lib/storage-utils";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseCustomers, Customer, Vehicle, upsertSupabaseVehicle, supabase, getSupabaseAllVehicles } from "@/lib/supa-data";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { VideoEmbed } from "@/components/video/VideoEmbed";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    const [searchQuery, setSearchQuery] = useState("");

    // UI State
    const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: 'image' | 'video'; title: string } | null>(null);
    const [isMediaOpen, setIsMediaOpen] = useState(false);
    const [expandedCustomers, setExpandedCustomers] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'gallery'>('gallery'); // New: Gallery view by default

    // Add Media State
    const [isAddMediaOpen, setIsAddMediaOpen] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [targetVehicle, setTargetVehicle] = useState<Vehicle | null>(null);
    const [newMediaUrl, setNewMediaUrl] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [newMediaType, setNewMediaType] = useState<'general' | 'before' | 'after' | 'video'>('general');
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
            const [customerData, vehicleData] = await Promise.all([
                getSupabaseCustomers(),
                getSupabaseAllVehicles()
            ]);

            setCustomers(customerData);
            setAllVehicles(vehicleData);

            if (customerData.length < 5) {
                setExpandedCustomers(customerData.map(c => c.id || ""));
            }

            console.log('🖼️ Gallery loaded:', {
                customerCount: customerData.length,
                totalVehicles: vehicleData.length,
                vehiclesWithPhotos: vehicleData.filter(v =>
                    (v.generalPhotos?.length || 0) +
                    (v.beforePhotos?.length || 0) +
                    (v.afterPhotos?.length || 0) +
                    (v.videoUrls?.length || 0) > 0
                ).length
            });
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
                v.year?.includes(q) ||
                v.vin?.toLowerCase().includes(q)
            ))
        );
    }, [customers, searchQuery]);

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

            // Find and select the newly created vehicle
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
        if (!targetVehicle) return;
        if (newMediaType === 'video' && !newMediaUrl.trim()) return;
        if (newMediaType !== 'video' && !selectedFile && !newMediaUrl.trim()) return;

        setSaving(true);
        const updatedVehicle = { ...targetVehicle };
        let url = newMediaUrl.trim();

        try {
            // Upload file if selected
            if (newMediaType !== 'video' && selectedFile) {
                toast({ title: "Uploading...", description: "Transferring media to secure storage." });
                url = await uploadFile('customer-photos', selectedFile);
            }

            if (!url) throw new Error("No URL or file provided");

            if (newMediaType === 'general') updatedVehicle.generalPhotos = [...(targetVehicle.generalPhotos || []), url];
            if (newMediaType === 'before') updatedVehicle.beforePhotos = [...(targetVehicle.beforePhotos || []), url];
            if (newMediaType === 'after') updatedVehicle.afterPhotos = [...(targetVehicle.afterPhotos || []), url];
            if (newMediaType === 'video') updatedVehicle.videoUrls = [...(targetVehicle.videoUrls || []), url];

            await upsertSupabaseVehicle(updatedVehicle as any);
            addToRecentCustomers(selectedCustomerId);
            toast({ title: "Media Added", description: "Successfully added to vehicle gallery." });
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
                <p className="text-zinc-400">Loading Vehicle Gallery...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="mb-4 text-zinc-500 hover:text-white -ml-2"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <h1 className="text-3xl font-bold text-white mb-2">Vehicle Media Gallery</h1>
                    <p className="text-zinc-400 text-sm">Centralized repository for all vehicle photos and embedded videos.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Upload Media Button */}
                    <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                        onClick={() => setIsAddMediaOpen(true)}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Media
                    </Button>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
                        <Button
                            size="sm"
                            variant={viewMode === 'gallery' ? 'default' : 'ghost'}
                            className={`h-8 text-xs ${viewMode === 'gallery' ? 'bg-blue-600 hover:bg-blue-700' : 'text-zinc-400'}`}
                            onClick={() => setViewMode('gallery')}
                        >
                            <ImageIcon className="h-3.5 w-3.5 mr-1.5" /> Gallery
                        </Button>
                        <Button
                            size="sm"
                            variant={viewMode === 'list' ? 'default' : 'ghost'}
                            className={`h-8 text-xs ${viewMode === 'list' ? 'bg-blue-600 hover:bg-blue-700' : 'text-zinc-400'}`}
                            onClick={() => setViewMode('list')}
                        >
                            <Car className="h-3.5 w-3.5 mr-1.5" /> List
                        </Button>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Search Customer or Vehicle..."
                            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:ring-blue-500/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {filteredCustomers.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800 rounded-xl border-dashed">
                    <ImageIcon className="h-12 w-12 mx-auto text-zinc-700 mb-4" />
                    <h3 className="text-xl font-semibold text-zinc-300">No media found</h3>
                    <p className="text-zinc-500 mt-2">Try adjusting your search or add media via Customer Cards.</p>
                </div>
            ) : viewMode === 'gallery' ? (
                <UnifiedGalleryView
                    vehicles={allVehicles}
                    onMediaClick={handleMediaClick}
                    onDeleteMedia={handleDeleteMedia}
                    isAdmin={isAdmin}
                    toast={toast}
                />
            ) : (
                <div className="space-y-6">
                    {filteredCustomers.map(customer => {
                        const hasAnyMedia = customer.vehicles?.some(v =>
                            (v.generalPhotos?.length || 0) > 0 ||
                            (v.beforePhotos?.length || 0) > 0 ||
                            (v.afterPhotos?.length || 0) > 0 ||
                            (v.videoUrls?.length || 0) > 0
                        );

                        return (
                            <Card key={customer.id} className="bg-zinc-900/50 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors">
                                <CardHeader className="bg-zinc-900 pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                                                <User className="h-5 w-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-white text-lg">{customer.name}</CardTitle>
                                                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                                                    <Badge variant="outline" className="text-[10px] bg-zinc-800 border-zinc-700">
                                                        {customer.type || 'Customer'}
                                                    </Badge>
                                                    {customer.email && <span className="flex items-center gap-1"><Filter className="h-3 w-3" /> {customer.email}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge className="bg-blue-600 hover:bg-blue-700">
                                            {customer.vehicles?.length || 0} Vehicle(s)
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Accordion type="multiple" className="w-full">
                                        {customer.vehicles?.map((vehicle, vIdx) => (
                                            <AccordionItem key={vehicle.id || vIdx} value={vehicle.id || `v-${vIdx}`} className="border-zinc-800/50 px-6">
                                                <AccordionTrigger className="hover:no-underline py-4">
                                                    <div className="flex items-center justify-between w-full pr-4">
                                                        <div className="flex items-center gap-3 text-left">
                                                            <Car className="h-4 w-4 text-zinc-500" />
                                                            <span className="font-medium text-zinc-200">
                                                                {vehicle.year} {vehicle.make} {vehicle.model}
                                                            </span>
                                                            <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-400 font-normal">
                                                                {vehicle.type}
                                                            </Badge>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-[10px] uppercase font-bold text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTargetVehicle(vehicle);
                                                                setIsAddMediaOpen(true);
                                                            }}
                                                        >
                                                            <Plus className="h-3 w-3 mr-1" /> Add Media
                                                        </Button>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="pb-6">
                                                    <Tabs defaultValue="all" className="w-full">
                                                        <TabsList className="bg-zinc-950 border border-zinc-800 mb-4 h-9">
                                                            <TabsTrigger value="all" className="text-xs h-7">All Media</TabsTrigger>
                                                            <TabsTrigger value="before" className="text-xs h-7 text-orange-400">Before</TabsTrigger>
                                                            <TabsTrigger value="after" className="text-xs h-7 text-emerald-400">After</TabsTrigger>
                                                            <TabsTrigger value="videos" className="text-xs h-7 text-pink-400">Videos</TabsTrigger>
                                                        </TabsList>

                                                        <TabsContent value="all" className="space-y-6">
                                                            <MediaGroup
                                                                title="General Photos"
                                                                items={vehicle.generalPhotos || []}
                                                                type="image"
                                                                onView={(u) => handleMediaClick(u, 'image', `General - ${vehicle.make} ${vehicle.model}`)}
                                                                onDelete={(idx) => handleDeleteMedia(vehicle, 'general', idx)}
                                                                isAdmin={isAdmin}
                                                            />
                                                            <MediaGroup
                                                                title="Before Service"
                                                                items={vehicle.beforePhotos || []}
                                                                type="image"
                                                                accent="orange"
                                                                onView={(u) => handleMediaClick(u, 'image', `Before - ${vehicle.make} ${vehicle.model}`)}
                                                                onDelete={(idx) => handleDeleteMedia(vehicle, 'before', idx)}
                                                                isAdmin={isAdmin}
                                                            />
                                                            <MediaGroup
                                                                title="After Service"
                                                                items={vehicle.afterPhotos || []}
                                                                type="image"
                                                                accent="emerald"
                                                                onView={(u) => handleMediaClick(u, 'image', `After - ${vehicle.make} ${vehicle.model}`)}
                                                                onDelete={(idx) => handleDeleteMedia(vehicle, 'after', idx)}
                                                                isAdmin={isAdmin}
                                                            />
                                                            <MediaGroup
                                                                title="Embedded Videos"
                                                                items={vehicle.videoUrls || []}
                                                                type="video"
                                                                accent="pink"
                                                                onView={(u) => handleMediaClick(u, 'video', `Video - ${vehicle.make} ${vehicle.model}`)}
                                                                onDelete={(idx) => handleDeleteMedia(vehicle, 'video', idx)}
                                                                isAdmin={isAdmin}
                                                            />
                                                        </TabsContent>

                                                        <TabsContent value="before">
                                                            <MediaGrid
                                                                items={vehicle.beforePhotos || []}
                                                                type="image"
                                                                onView={(u) => handleMediaClick(u, 'image', `Before - ${vehicle.make} ${vehicle.model}`)}
                                                                onDelete={(idx) => handleDeleteMedia(vehicle, 'before', idx)}
                                                                isAdmin={isAdmin}
                                                            />
                                                        </TabsContent>

                                                        <TabsContent value="after">
                                                            <MediaGrid
                                                                items={vehicle.afterPhotos || []}
                                                                type="image"
                                                                onView={(u) => handleMediaClick(u, 'image', `After - ${vehicle.make} ${vehicle.model}`)}
                                                                onDelete={(idx) => handleDeleteMedia(vehicle, 'after', idx)}
                                                                isAdmin={isAdmin}
                                                            />
                                                        </TabsContent>

                                                        <TabsContent value="videos">
                                                            <MediaGrid
                                                                items={vehicle.videoUrls || []}
                                                                type="video"
                                                                onView={(u) => handleMediaClick(u, 'video', `Video - ${vehicle.make} ${vehicle.model}`)}
                                                                onDelete={(idx) => handleDeleteMedia(vehicle, 'video', idx)}
                                                                isAdmin={isAdmin}
                                                            />
                                                        </TabsContent>
                                                    </Tabs>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

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
                            </div>
                            <div className="flex-1 flex items-center justify-center p-4 min-h-[50vh]">
                                {selectedMedia.type === 'image' ? (
                                    <img src={selectedMedia.url} alt="Vehicle" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
                                ) : (
                                    <div className="w-full">
                                        <VideoEmbed url={selectedMedia.url} title={selectedMedia.title} />
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-zinc-900 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-800">
                                <Button variant="secondary" size="sm" onClick={() => setIsMediaOpen(false)}>Close</Button>

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

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-blue-900/50 text-blue-400 hover:bg-blue-900/20"
                                    onClick={() => {
                                        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(selectedMedia.url)}`;
                                        window.open(fbUrl, '_blank', 'width=600,height=400');
                                    }}
                                >
                                    <Facebook className="h-4 w-4 mr-2" /> Share to FB
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
                <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">Add Vehicle Media</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Customer Selector with Search */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Select Customer</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                <Input
                                    placeholder="Type to search customers..."
                                    className="pl-9 bg-zinc-900 border-zinc-800 text-white text-sm"
                                    value={selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name || '' : customerSearchQuery}
                                    onChange={(e) => {
                                        setCustomerSearchQuery(e.target.value);
                                        if (selectedCustomerId) {
                                            setSelectedCustomerId('');
                                            setTargetVehicle(null);
                                        }
                                    }}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                            {/* Recent Customers */}
                            {!selectedCustomerId && recentCustomerIds.length > 0 && !customerSearchQuery && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recent</label>
                                    <div className="flex flex-wrap gap-2">
                                        {recentCustomerIds.map(id => {
                                            const customer = customers.find(c => c.id === id);
                                            if (!customer) return null;
                                            return (
                                                <Button
                                                    key={id}
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-[10px] border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800"
                                                    onClick={() => {
                                                        setSelectedCustomerId(id);
                                                        setTargetVehicle(null);
                                                        setCustomerSearchQuery("");
                                                    }}
                                                >
                                                    {customer.name}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {!selectedCustomerId && (
                                <div className="max-h-48 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-lg">
                                    {customers
                                        .filter(c => !customerSearchQuery || c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(customer => (
                                            <button
                                                key={customer.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 hover:bg-zinc-800 text-sm text-zinc-300 flex items-center justify-between group"
                                                onClick={() => {
                                                    setSelectedCustomerId(customer.id);
                                                    setTargetVehicle(null);
                                                    setCustomerSearchQuery("");
                                                }}
                                            >
                                                <span>{customer.name}</span>
                                                <Badge variant="outline" className="text-[9px] opacity-60 group-hover:opacity-100">
                                                    {customer.type}
                                                </Badge>
                                            </button>
                                        ))
                                    }
                                    {customers.filter(c => !customerSearchQuery || c.name.toLowerCase().includes(customerSearchQuery.toLowerCase())).length === 0 && (
                                        <p className="p-3 text-xs text-zinc-500 text-center">No customers found</p>
                                    )}
                                </div>
                            )}
                            {selectedCustomerId && (
                                <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-lg flex items-center justify-between">
                                    <span className="text-sm text-blue-400 font-medium">
                                        {customers.find(c => c.id === selectedCustomerId)?.name}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-zinc-500 hover:text-white"
                                        onClick={() => {
                                            setSelectedCustomerId('');
                                            setTargetVehicle(null);
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Vehicle Selector - Only show if customer is selected */}
                        {selectedCustomerId && (() => {
                            const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
                            const vehicles = selectedCustomer?.vehicles || [];

                            return (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Select Vehicle</label>
                                    {vehicles.length > 0 ? (
                                        <select
                                            className="w-full p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-200 text-sm"
                                            value={targetVehicle?.id || ""}
                                            onChange={(e) => {
                                                const vehicle = vehicles.find(v => v.id === e.target.value);
                                                setTargetVehicle(vehicle || null);
                                            }}
                                        >
                                            <option value="">Choose a vehicle...</option>
                                            {vehicles.map((vehicle) => (
                                                <option key={vehicle.id} value={vehicle.id}>
                                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="space-y-3">
                                            {!showQuickAddVehicle ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full border-emerald-600 text-emerald-400 hover:bg-emerald-600/10"
                                                    onClick={() => setShowQuickAddVehicle(true)}
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Quick Add Vehicle
                                                </Button>
                                            ) : (
                                                <div className="space-y-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-xs font-bold text-emerald-400">ADD NEW VEHICLE</h4>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 text-zinc-500 hover:text-white"
                                                            onClick={() => {
                                                                setShowQuickAddVehicle(false);
                                                                setQuickVehicle({ year: '', make: '', model: '' });
                                                            }}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                    <Input
                                                        placeholder="Year (optional)"
                                                        className="bg-zinc-900 border-zinc-800 text-white text-sm h-9"
                                                        value={quickVehicle.year}
                                                        onChange={(e) => setQuickVehicle({ ...quickVehicle, year: e.target.value })}
                                                    />
                                                    <Input
                                                        placeholder="Make *"
                                                        className="bg-zinc-900 border-zinc-800 text-white text-sm h-9"
                                                        value={quickVehicle.make}
                                                        onChange={(e) => setQuickVehicle({ ...quickVehicle, make: e.target.value })}
                                                    />
                                                    <Input
                                                        placeholder="Model *"
                                                        className="bg-zinc-900 border-zinc-800 text-white text-sm h-9"
                                                        value={quickVehicle.model}
                                                        onChange={(e) => setQuickVehicle({ ...quickVehicle, model: e.target.value })}
                                                    />
                                                    <Button
                                                        type="button"
                                                        className="w-full bg-emerald-600 hover:bg-emerald-700 h-9"
                                                        onClick={handleQuickAddVehicle}
                                                        disabled={!quickVehicle.make || !quickVehicle.model}
                                                    >
                                                        <Plus className="h-3 w-3 mr-2" />
                                                        Create Vehicle
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Media Category</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['general', 'before', 'after', 'video'] as const).map((t) => (
                                    <Button
                                        key={t}
                                        variant={newMediaType === t ? "default" : "outline"}
                                        className={`h-9 text-xs capitalize ${newMediaType === t ? 'bg-blue-600' : 'border-zinc-800'}`}
                                        onClick={() => setNewMediaType(t)}
                                    >
                                        {t}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                {newMediaType === 'video' ? 'YouTube/Video URL' : 'Media Option'}
                            </label>

                            {newMediaType === 'video' ? (
                                <Input
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="bg-zinc-900 border-zinc-800 text-white"
                                    value={newMediaUrl}
                                    onChange={(e) => setNewMediaUrl(e.target.value)}
                                />
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <Button variant="outline" className="w-full h-12 border-dashed border-zinc-700 hover:bg-zinc-900 text-zinc-400">
                                                <Upload className="h-4 w-4 mr-2" /> Upload
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
                                            <Button variant="outline" className="w-full h-12 border-dashed border-zinc-700 hover:bg-zinc-900 text-zinc-400">
                                                <Camera className="h-4 w-4 mr-2" /> Camera
                                            </Button>
                                        </div>
                                    </div>

                                    {selectedFile && (
                                        <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded text-blue-400 text-xs flex justify-between items-center">
                                            <span className="truncate max-w-[200px] font-medium">{selectedFile.name}</span>
                                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:text-white" onClick={() => setSelectedFile(null)}>✕</Button>
                                        </div>
                                    )}

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800" /></div>
                                        <div className="relative flex justify-center text-[10px] uppercase font-bold"><span className="bg-zinc-950 px-2 text-zinc-600">or use URL</span></div>
                                    </div>

                                    <Input
                                        placeholder="https://example.com/image.jpg"
                                        className="bg-zinc-900 border-zinc-800 text-white text-sm"
                                        value={newMediaUrl}
                                        onChange={(e) => { setNewMediaUrl(e.target.value); if (e.target.value) setSelectedFile(null); }}
                                    />
                                </div>
                            )}

                            <p className="text-[10px] text-zinc-500 italic">
                                {newMediaType === 'video'
                                    ? 'Paste the full link to the video (YouTube/Vimeo/FB/TikTok preferred).'
                                    : 'Upload a photo directly or paste a link to an existing image file.'}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => {
                            setIsAddMediaOpen(false);
                            setSelectedCustomerId("");
                            setTargetVehicle(null);
                            setNewMediaUrl("");
                            setSelectedFile(null);
                        }} className="text-zinc-400">Cancel</Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            onClick={handleAddMedia}
                            disabled={saving || !targetVehicle || (newMediaType === 'video' ? !newMediaUrl.trim() : (!newMediaUrl.trim() && !selectedFile))}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            Save Media
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function MediaGroup({ title, items, type, accent = "blue", onView, onDelete, isAdmin }: any) {
    if (items.length === 0) return null;

    const accentClasses: any = {
        blue: "text-blue-400 border-blue-900/40",
        orange: "text-orange-400 border-orange-900/40",
        emerald: "text-emerald-400 border-emerald-900/40",
        pink: "text-pink-400 border-pink-900/40",
    };

    return (
        <div className="space-y-3">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${accentClasses[accent]}`}>
                {title} <span className="text-zinc-500 ml-1">({items.length})</span>
            </h4>
            <MediaGrid items={items} type={type} onView={onView} onDelete={onDelete} isAdmin={isAdmin} />
        </div>
    );
}

function MediaGrid({ items, type, onView, onDelete, isAdmin }: any) {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 bg-zinc-950/50 rounded-lg border border-zinc-800">
                <ImageIcon className="h-6 w-6 text-zinc-800 mb-2" />
                <p className="text-xs text-zinc-600">No media available in this category</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((url: string, idx: number) => (
                <div key={idx} className="group relative aspect-square rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden hover:border-zinc-600 transition-all shadow-lg">
                    {type === 'image' ? (
                        <img
                            src={url}
                            alt={`Vehicle ${idx}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full bg-zinc-900 p-0.5">
                            <VideoEmbed url={url} className="h-full rounded-md" />
                        </div>
                    )}

                    {/* Overlays */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs bg-white/10 hover:bg-white/20 border-white/10 text-white"
                            onClick={() => onView(url)}
                        >
                            <Maximize2 className="h-3 w-3 mr-1" /> View
                        </Button>
                        {isAdmin && (
                            <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 text-xs bg-red-600/80 hover:bg-red-600"
                                onClick={() => onDelete(idx)}
                            >
                                <Trash2 className="h-3 w-3 mr-1" /> Delete
                            </Button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

// New Unified Gallery View - Shows ALL media from ALL vehicles with tags
function UnifiedGalleryView({ vehicles, onMediaClick, onDeleteMedia, isAdmin, toast }: {
    vehicles: Vehicle[];
    onMediaClick: (url: string, type: 'image' | 'video', title: string) => void;
    onDeleteMedia: (vehicle: Vehicle, type: 'general' | 'before' | 'after' | 'video', index: number) => void;
    isAdmin: boolean;
    toast: any;
}) {
    // Flatten all media into a single array with metadata
    const allMedia: Array<{
        url: string;
        type: 'image' | 'video';
        category: 'general' | 'before' | 'after' | 'video';
        customerName: string;
        customerType: string;
        vehicleInfo: string;
        vehicle: Vehicle;
        originalIndex: number;
    }> = [];

    // 1. Gather media from all vehicles
    vehicles.forEach(vehicle => {
        const vehicleInfo = `${vehicle.year || ''} ${vehicle.make} ${vehicle.model}`.trim();
        const customerInfo = (vehicle as any).customer_info;
        const customerName = customerInfo?.name || 'Unassigned';
        const customerType = customerInfo?.type || 'N/A';

        // Collect from all categories
        const categories = [
            { id: 'general', photos: vehicle.generalPhotos, type: 'image' },
            { id: 'before', photos: vehicle.beforePhotos, type: 'image' },
            { id: 'after', photos: vehicle.afterPhotos, type: 'image' },
            { id: 'video', photos: vehicle.videoUrls, type: 'video' }
        ] as const;

        categories.forEach(cat => {
            cat.photos?.forEach((url, idx) => {
                allMedia.push({
                    url,
                    type: cat.type as 'image' | 'video',
                    category: cat.id as any,
                    customerName: customerName,
                    customerType: customerType,
                    vehicleInfo,
                    vehicle,
                    originalIndex: idx
                });
            });
        });
    });

    // We already have all customers' vehicles. In supa-data.ts, we fetch vehicles via customers.
    // If a vehicle isn't linked, it won't be in the customer objects.
    // Let's add a placeholder for future: we should ideally fetch ALL vehicles separately if we want to see orphans.


    if (allMedia.length === 0) {
        return (
            <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800 rounded-xl border-dashed">
                <ImageIcon className="h-12 w-12 mx-auto text-zinc-700 mb-4" />
                <h3 className="text-xl font-semibold text-zinc-300">No media available</h3>
                <p className="text-zinc-500 mt-2">Upload photos to vehicles to see them here.</p>
            </div>
        );
    }

    const categoryColors: Record<string, string> = {
        general: 'bg-blue-600',
        before: 'bg-orange-600',
        after: 'bg-emerald-600',
        video: 'bg-pink-600'
    };

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-zinc-400">
                    Showing <span className="font-bold text-white">{allMedia.length}</span> media items across all vehicles
                </p>
                <div className="flex items-center gap-2 text-xs">
                    <Badge className={`${categoryColors.general} text-white`}>General</Badge>
                    <Badge className={`${categoryColors.before} text-white`}>Before</Badge>
                    <Badge className={`${categoryColors.after} text-white`}>After</Badge>
                    <Badge className={`${categoryColors.video} text-white`}>Videos</Badge>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {allMedia.map((media, idx) => (
                    <div
                        key={`${media.url}-${idx}`}
                        className="group relative aspect-square rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all shadow-lg cursor-pointer"
                        onClick={() => onMediaClick(media.url, media.type, `${media.vehicleInfo} - ${media.customerName}`)}
                    >
                        {/* Media Content */}
                        {media.type === 'image' ? (
                            <img
                                src={media.url}
                                alt={media.vehicleInfo}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                onError={(e) => {
                                    console.error("🖼️ Image failed to load:", media.url);
                                    e.currentTarget.src = "https://placehold.co/600x600/111/white?text=Image+Load+Error";
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                <Video className="h-12 w-12 text-pink-400 opacity-50" />
                            </div>
                        )}

                        {/* Category Badge - Top Left */}
                        <div className="absolute top-2 left-2 z-10">
                            <Badge className={`${categoryColors[media.category]} text-white text-[9px] px-2 py-0.5 uppercase font-bold shadow-lg`}>
                                {media.category}
                            </Badge>
                        </div>

                        {/* Customer/Vehicle Tags - Bottom Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-3 pt-8">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <Car className="h-3 w-3 text-blue-400 shrink-0" />
                                    <p className="text-[10px] font-bold text-white truncate">{media.vehicleInfo}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <User className="h-3 w-3 text-zinc-400 shrink-0" />
                                    <p className="text-[9px] text-zinc-300 truncate">{media.customerName}</p>
                                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-zinc-600 text-zinc-400 ml-auto">
                                        {media.customerType}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Hover Actions */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-20">
                            <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 text-xs bg-white/10 hover:bg-white/20 border-white/10 text-white"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMediaClick(media.url, media.type, `${media.vehicleInfo} - ${media.customerName}`);
                                }}
                            >
                                <Maximize2 className="h-3 w-3 mr-1" /> View
                            </Button>

                            {/* Download Button - Only for images */}
                            {media.type === 'image' && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-8 text-xs bg-emerald-600/80 hover:bg-emerald-600 border-emerald-500/20 text-white"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                            const response = await fetch(media.url);
                                            const blob = await response.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `${media.customerName}_${media.vehicleInfo}_${media.category}.jpg`;
                                            document.body.appendChild(a);
                                            a.click();
                                            window.URL.revokeObjectURL(url);
                                            document.body.removeChild(a);
                                            toast({ title: "Downloaded!", description: "Photo saved to your downloads." });
                                        } catch (err) {
                                            toast({ title: "Download Failed", description: "Could not download image.", variant: "destructive" });
                                        }
                                    }}
                                >
                                    <Download className="h-3 w-3 mr-1" /> Download
                                </Button>
                            )}

                            {isAdmin && (
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 text-xs bg-red-600/80 hover:bg-red-600"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteMedia(media.vehicle, media.category, media.originalIndex);
                                    }}
                                >
                                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
