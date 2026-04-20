import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  User, Mail, Phone, MapPin, Car, Calendar, Search, 
  Image as ImageIcon, Video, X, Camera, Trash2, 
  FileBarChart, Plus, ChevronDown, ExternalLink, 
  Star, ShieldCheck, Zap, Users, Info
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VehicleSelectorModal from "@/components/vehicles/VehicleSelectorModal";
import browserImageCompression from "browser-image-compression";
import { useBookingsStore } from "@/store/bookings";
import { useCouponsStore } from "@/store/coupons";
import { supabase, Customer, Vehicle, getLibraryItems, LibraryItem } from "@/lib/supa-data";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { RetentionHub } from "./RetentionHub";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Customer | null;
  onSave: (data: Customer) => Promise<void> | void;
  defaultType?: 'customer' | 'prospect';
  initialTab?: string;
}

export default function CustomerModal({ open, onOpenChange, initial, onSave, defaultType = 'customer', initialTab = 'profile' }: Props) {
  const [vehicleSelectorOpen, setVehicleSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [linkedVehicles, setLinkedVehicles] = useState<Vehicle[]>([]);
  const [currentVehicleIdx, setCurrentVehicleIdx] = useState<number | null>(null);
  
  const { items: allBookings } = useBookingsStore();
  const { refresh: refreshCoupons } = useCouponsStore();

  const user = getCurrentUser();
  const isAdmin = user?.role === 'admin';

  const [form, setForm] = useState<Customer>({
    id: undefined,
    name: "",
    address: "",
    phone: "",
    email: "",
    vehicle: "",
    model: "",
    year: "",
    color: "",
    mileage: "",
    vehicleType: "",
    conditionInside: "",
    conditionOutside: "",
    services: [],
    notes: "",
    type: defaultType,
    generalPhotos: [],
    beforePhotos: [],
    afterPhotos: [],
    shortVideos: [],
    videoUrl: "",
    learningCenterUrl: "",
    videoNote: "",
    has_google_review: false,
    vehicles: [],
  });

  const isProspect = form.type === 'prospect';

  useEffect(() => {
    const initForm = async () => {
      setLinkedVehicles([]);
      if (initial) {
        let cIn = "";
        let cOut = "";
        const noteStr = initial.notes || "";
        const match = noteStr.match(/\[Vehicle Condition\]\s*Inside:\s*([0-5])\/5\s*Outside:\s*([0-5])\/5/i);
        if (match) {
          cIn = match[1];
          cOut = match[2];
        }

        // Parse legacy vehicle_info if it's a string
        let vInfo = (initial as any).vehicle_info;
        if (typeof vInfo === 'string') {
          try { vInfo = JSON.parse(vInfo); } catch (e) { vInfo = {}; }
        }

        const ini = initial as any; // cast to access any legacy fields safely
        let baseVehicles = initial.vehicles || [];
        const hasLegacyInfo = initial.vehicle || initial.model || initial.year || ini.make || vInfo?.make || vInfo?.vehicle || vInfo?.model;
        
        if (baseVehicles.length === 0 && hasLegacyInfo) {
          baseVehicles = [{
            make: ini.make || initial.vehicle || vInfo?.make || vInfo?.vehicle || "",
            model: initial.model || vInfo?.model || "",
            year: initial.year ? String(initial.year) : String(vInfo?.year || ""),
            type: initial.vehicleType || vInfo?.type || vInfo?.vehicleType || "",
            color: initial.color || vInfo?.color || "",
            mileage: (initial.mileage || vInfo?.mileage) ? String(initial.mileage || vInfo?.mileage) : "",
            conditionInside: initial.conditionInside || vInfo?.conditionInside || cIn || "",
            conditionOutside: initial.conditionOutside || vInfo?.conditionOutside || cOut || "",
            generalPhotos: initial.generalPhotos || vInfo?.generalPhotos || [],
            beforePhotos: initial.beforePhotos || vInfo?.beforePhotos || [],
            afterPhotos: initial.afterPhotos || vInfo?.afterPhotos || [],
            videoUrls: ini.shortVideos || vInfo?.videoUrls || vInfo?.shortVideos || []
          }];
        }

        setForm({
          ...initial,
          vehicles: baseVehicles,
          type: initial.type || defaultType,
          conditionInside: initial.conditionInside || cIn,
          conditionOutside: initial.conditionOutside || cOut,
        });

        if (initial.id) {
          try {
            const { data: vehs } = await supabase
              .from('vehicles')
              .select('*')
              .eq('customer_id', initial.id)
              .order('created_at', { ascending: true });
            if (vehs) setLinkedVehicles(vehs);
          } catch (e) {
            console.error("Error loading linked vehicles", e);
          }
        }
      } else {
        setForm({
          id: undefined,
          name: "",
          address: "",
          phone: "",
          email: "",
          vehicle: "",
          model: "",
          year: "",
          color: "",
          mileage: "",
          vehicleType: "",
          conditionInside: "",
          conditionOutside: "",
          services: [],
          notes: "",
          type: defaultType,
          generalPhotos: [],
          beforePhotos: [],
          afterPhotos: [],
          shortVideos: [],
          videoUrl: "",
          learningCenterUrl: "",
          videoNote: "",
          vehicles: [
            { make: "", model: "", year: "", type: "", color: "", vin: "", conditionInside: "", conditionOutside: "", mileage: "" }
          ]
        });
      }
    };

    if (open) {
      initForm();
      refreshCoupons();
    }
  }, [initial, open, defaultType]);

  const handleChange = (key: keyof Customer, value: string) => {
    setForm((f) => ({ ...f, [key]: value } as Customer));
  };

  const handleVehicleSelect = (data: { make: string; model: string; category: string }, index?: number) => {
    let mappedType = data.category;
    if (data.category === "Compact") mappedType = "Compact/Sedan (Small cars and sedans)";
    else if (data.category === "Midsize / Sedan") mappedType = "Mid-Size/SUV (Mid-size cars and SUVs)";
    else if (data.category === "SUV / Crossover") mappedType = "Mid-Size/SUV (Mid-size cars and SUVs)";
    else if (data.category === "Truck / Oversized") mappedType = "Truck/Van/Large SUV (Trucks, vans, large SUVs)";
    else if (data.category === "Oversized Specialty") mappedType = "Luxury/High-End (Luxury and premium vehicles)";

    if (typeof index === 'number') {
      const updated = [...(form.vehicles || [])];
      updated[index] = { ...updated[index], make: data.make, model: data.model, type: mappedType };
      setForm(prev => ({ ...prev, vehicles: updated }));
    } else {
      setForm(prev => ({ ...prev, vehicle: data.make, model: data.model, vehicleType: mappedType }));
    }
  };

  const addVehicleRow = () => {
    setForm(prev => ({
      ...prev,
      vehicles: [...(prev.vehicles || []), { make: "", model: "", year: "", type: "", color: "", vin: "", conditionInside: "", conditionOutside: "", mileage: "" }]
    }));
  };

  const updateVehicleRow = (index: number, patch: Partial<Vehicle>) => {
    const updated = [...(form.vehicles || [])];
    updated[index] = { ...updated[index], ...patch };
    setForm(prev => ({ ...prev, vehicles: updated }));
  };

  const removeVehicleRow = (index: number) => {
    if ((form.vehicles || []).length <= 1) return;
    setForm(prev => ({
      ...prev,
      vehicles: (prev.vehicles || []).filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = async (file: File, type: 'generalPhotos' | 'beforePhotos' | 'afterPhotos', index: number, vehicleIndex?: number) => {
    try {
      if (!file) return;
      setLoading(true);
      toast.info("Uploading...", { description: "Processing..." });

      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        fileToUpload = await browserImageCompression(file, { maxSizeMB: 0.4, maxWidthOrHeight: 1280, useWebWorker: true });
      }

      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
      const filePath = `customers/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('customer-photos').upload(filePath, fileToUpload);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('customer-photos').getPublicUrl(filePath);

      setForm(prev => {
        if (vehicleIndex !== undefined && vehicleIndex !== -1 && prev.vehicles && prev.vehicles[vehicleIndex]) {
          const updatedVehicles = [...prev.vehicles];
          const vehicle = { ...updatedVehicles[vehicleIndex] };
          const currentMedia = (vehicle as any)[type] || [];
          const updatedMedia = [...currentMedia];
          if (!updatedMedia.includes(publicUrl)) {
            updatedMedia.push(publicUrl);
          }
          (vehicle as any)[type] = updatedMedia;
          updatedVehicles[vehicleIndex] = vehicle;
          return { ...prev, vehicles: updatedVehicles };
        } else {
          const current = (prev as any)[type] || [];
          const updated = [...current];
          if (!updated.includes(publicUrl)) {
            updated.push(publicUrl);
          }
          return { ...prev, [type]: updated };
        }
      });
      toast.success("Uploaded successfully!");
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error("Upload Failed", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const removeMedia = (type: 'generalPhotos' | 'beforePhotos' | 'afterPhotos', index: number, vehicleIndex?: number) => {
    setForm(prev => {
      if (vehicleIndex !== undefined && vehicleIndex !== -1 && prev.vehicles && prev.vehicles[vehicleIndex]) {
        const updatedVehicles = [...prev.vehicles];
        const vehicle = { ...updatedVehicles[vehicleIndex] };
        const currentMedia = (vehicle as any)[type] || [];
        (vehicle as any)[type] = currentMedia.filter((_: any, i: number) => i !== index);
        updatedVehicles[vehicleIndex] = vehicle;
        return { ...prev, vehicles: updatedVehicles };
      } else {
        const current = (prev as any)[type] || [];
        return { ...prev, [type]: current.filter((_: any, i: number) => i !== index) };
      }
    });
  };

  const handleBook = () => {
    const v = ((form.vehicles || [])[0] || {}) as import('@/lib/supa-data').Vehicle;
    const params = new URLSearchParams();
    params.set('add', 'true');
    if (form.id) params.set('customerId', form.id);
    if (form.name) params.set('customerName', form.name);
    if (form.email) params.set('email', form.email);
    if (form.phone) params.set('phone', form.phone);
    if (form.address) params.set('address', form.address);
    
    const vYear = v.year || form.year || "";
    const vMake = v.make || form.vehicle || "";
    const vModel = v.model || form.model || "";
    const vType = v.type || form.vehicleType || "";
    
    if (vYear) params.set('vehicleYear', vYear);
    if (vMake) params.set('vehicleMake', vMake);
    if (vModel) params.set('vehicleModel', vModel);
    if (vType) params.set('vehicleType', vType);

    window.location.href = `/bookings?${params.toString()}`;
  };

  const handleSubmit = async () => {
    const payload = { ...form };
    if (!payload.id) delete payload.id;
    if (!payload.type) payload.type = defaultType;

    let cleanNotes = (payload.notes || "").replace(/\[Vehicle Condition\]\s*Inside:\s*([0-5])\/5\s*Outside:\s*([0-5])\/5/gi, "").trim();
    if (payload.conditionInside || payload.conditionOutside) {
      cleanNotes += `\n\n[Vehicle Condition]\nInside: ${payload.conditionInside || '?'}/5\nOutside: ${payload.conditionOutside || '?'}/5`;
    }
    payload.notes = cleanNotes;

    try {
      setLoading(true);
      await onSave(payload as any);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Save Error:", err);
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLinkedVehicle = async (vehicleId: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
      if (error) throw error;
      toast.success("Vehicle deleted");
      setLinkedVehicles(prev => prev.filter(v => v.id !== vehicleId));
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to delete vehicle", { description: e.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-zinc-950 border-zinc-800 text-foreground p-0 overflow-hidden flex flex-col h-[90vh]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            {initial?.id ? `Edit ${isProspect ? 'Prospect' : 'Customer'}` : `Add New ${isProspect ? 'Prospect' : 'Customer'}`}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={initialTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b border-white/5 bg-zinc-950 sticky top-0 z-20">
            <TabsList className="bg-transparent border-none p-0 h-12 gap-8">
              <TabsTrigger value="profile" className="data-[state=active]:bg-transparent data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none h-12 px-0 text-xs font-black uppercase tracking-widest transition-all">
                Profile
              </TabsTrigger>
              <TabsTrigger value="media" className="data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none h-12 px-0 text-xs font-black uppercase tracking-widest transition-all">
                Media & Gallery
              </TabsTrigger>
              <TabsTrigger value="retention" className="data-[state=active]:bg-transparent data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none h-12 px-0 text-xs font-black uppercase tracking-widest transition-all">
                Retention
              </TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:bg-transparent data-[state=active]:text-amber-400 data-[state=active]:border-b-2 data-[state=active]:border-amber-500 rounded-none h-12 px-0 text-xs font-black uppercase tracking-widest transition-all">
                Notes
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <TabsContent value="profile" className="m-0 p-6 space-y-8 outline-none border-0">
              {/* Contact Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</h3>
                <div className="grid gap-3">
                  <Input
                    placeholder="Full Name"
                    className="bg-zinc-900 border-zinc-800 text-white"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Phone"
                      className="bg-zinc-900 border-zinc-800 text-white"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      className="bg-zinc-900 border-zinc-800 text-white"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-900/40 rounded-lg border border-zinc-800/50">
                     <div className="flex items-center gap-2">
                        <Star className={cn("h-4 w-4", form.has_google_review ? "text-amber-500 fill-amber-500" : "text-zinc-500")} />
                        <span className="text-xs font-bold uppercase tracking-tight text-zinc-300">Google Business Review Left?</span>
                     </div>
                     <Switch 
                      checked={form.has_google_review || false}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, has_google_review: checked }))}
                      className="data-[state=checked]:bg-blue-600 scale-90"
                     />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Address"
                      className="flex-1 bg-zinc-900 border-zinc-800 text-white"
                      value={form.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                    />
                    {form.address && (
                      <Button variant="outline" size="icon" onClick={() => setShowMap(true)} className="border-zinc-800 text-zinc-400">
                        <MapPin className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="h-px bg-zinc-800" />

              {/* Vehicles Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Car className="h-4 w-4" /> Vehicles
                  </h3>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] bg-zinc-900 border-zinc-700" onClick={addVehicleRow}>
                    <Plus className="h-3 w-3 mr-1" /> Add Row
                  </Button>
                </div>

                <div className="space-y-6">
                  {form.vehicles?.map((vehicle, vIdx) => (
                    <div key={vIdx} className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                          <Input size={1} placeholder="Year" className="bg-zinc-950 border-zinc-800 text-zinc-300" value={vehicle.year} onChange={(e) => updateVehicleRow(vIdx, { year: e.target.value })} />
                          <Input size={1} placeholder="Make" className="bg-zinc-950 border-zinc-800 text-zinc-300" value={vehicle.make} onChange={(e) => updateVehicleRow(vIdx, { make: e.target.value })} />
                          <Input size={1} placeholder="Model" className="bg-zinc-950 border-zinc-800 text-zinc-300" value={vehicle.model} onChange={(e) => updateVehicleRow(vIdx, { model: e.target.value })} />
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-500" onClick={() => { setCurrentVehicleIdx(vIdx); setVehicleSelectorOpen(true); }}><Search className="h-4 w-4" /></Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-500" onClick={() => removeVehicleRow(vIdx)}><Trash2 className="h-4 w-4" /></Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                         <div className="space-y-1">
                            <Label className="text-[10px] text-zinc-500 uppercase font-black">Color</Label>
                            <Input placeholder="Color" className="h-8 text-xs bg-zinc-950 border-zinc-800" value={vehicle.color} onChange={(e) => updateVehicleRow(vIdx, { color: e.target.value })} />
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] text-zinc-500 uppercase font-black">Mileage</Label>
                            <Input placeholder="Mileage" className="h-8 text-xs bg-zinc-950 border-zinc-800" value={vehicle.mileage} onChange={(e) => updateVehicleRow(vIdx, { mileage: e.target.value })} />
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] text-zinc-500 uppercase font-black">Body Type</Label>
                            <button
                              type="button"
                              className="h-8 w-full text-xs bg-zinc-950 border border-zinc-800 rounded-md px-3 text-left hover:border-blue-500 transition-colors flex items-center justify-between gap-2"
                              onClick={() => { setCurrentVehicleIdx(vIdx); setVehicleSelectorOpen(true); }}
                            >
                              <span className={vehicle.type ? 'text-zinc-200' : 'text-zinc-600'}>{vehicle.type || 'Click to classify...'}</span>
                              <Search className="h-3 w-3 text-zinc-500 shrink-0" />
                            </button>
                         </div>
                      </div>
                       <div className="pt-2 border-t border-zinc-800/50 flex items-center justify-between">
                         <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Photos → open the Media &amp; Gallery tab</p>
                         {form.id && (
                           <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black text-blue-400 hover:text-blue-300 gap-1.5" onClick={() => window.open(`/vehicle-gallery?customerId=${form.id}`, '_blank')}>
                             GALLERY <ExternalLink className="h-3 w-3" />
                           </Button>
                         )}
                       </div>
                      </div>

                  ))}
                </div>

                {linkedVehicles.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-zinc-800">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1"><Info className="w-3 h-3" /> Database History</h4>
                    <div className="grid gap-2">
                       {linkedVehicles.map((v) => (
                         <div key={v.id} className="flex items-center justify-between p-2 bg-zinc-950/60 rounded border border-zinc-800 text-xs">
                           <span className="text-zinc-300">{v.year} {v.make} {v.model}</span>
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDeleteLinkedVehicle(v.id!)}><Trash2 className="h-3.5 w-3.5" /></Button>
                         </div>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="media" className="m-0 p-6 space-y-8 outline-none border-0">
               <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-indigo-500" /> Media & Gallery Management
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Capture before/after photos and general vehicle media</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[9px] font-black text-blue-400 hover:text-blue-300 gap-1.5"
                    onClick={() => window.open(`/vehicle-gallery?customerId=${form.id}`, '_blank')}
                    disabled={!form.id}
                  >
                    OPEN GLOBAL GALLERY <ExternalLink className="h-3 w-3" />
                  </Button>
               </div>

               <div className="space-y-6">
                  {form.vehicles && form.vehicles.length > 0 ? (
                    form.vehicles.map((vehicle, vIdx) => {
                      const vLabel = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || `Vehicle ${vIdx + 1}`;
                      return (
                        <div key={vIdx} className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Car className="h-3.5 w-3.5 text-zinc-500" />
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-300">{vLabel}</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <MediaUploadField label="Before Photos" type="beforePhotos" photos={vehicle.beforePhotos || []} vIdx={vIdx} onUpload={handleFileUpload} onRemove={removeMedia} />
                            <MediaUploadField label="After Photos" type="afterPhotos" photos={vehicle.afterPhotos || []} vIdx={vIdx} onUpload={handleFileUpload} onRemove={removeMedia} />
                            <MediaUploadField label="General Media" type="generalPhotos" photos={vehicle.generalPhotos || []} vIdx={vIdx} onUpload={handleFileUpload} onRemove={removeMedia} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Car className="h-3.5 w-3.5 text-zinc-500" />
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-300">General Photos</h4>
                        <span className="text-[9px] text-zinc-600 font-bold ml-2">(no vehicle linked — add one in Profile tab to organize by vehicle)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <MediaUploadField label="Before Photos" type="beforePhotos" photos={form.beforePhotos || []} vIdx={-1} onUpload={handleFileUpload} onRemove={removeMedia} />
                        <MediaUploadField label="After Photos" type="afterPhotos" photos={form.afterPhotos || []} vIdx={-1} onUpload={handleFileUpload} onRemove={removeMedia} />
                        <MediaUploadField label="General Media" type="generalPhotos" photos={form.generalPhotos || []} vIdx={-1} onUpload={handleFileUpload} onRemove={removeMedia} />
                      </div>
                    </div>
                  )}
               </div>
            </TabsContent>

            <TabsContent value="retention" className="m-0 p-0 outline-none border-0">
               {form.id ? (
                 <RetentionHub customer={form} />
               ) : (
                 <div className="p-12 text-center space-y-4">
                   <div className="h-20 w-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500"><Zap className="h-10 w-10" /></div>
                   <h3 className="text-lg font-bold text-white">Save Record First</h3>
                   <p className="text-sm text-zinc-500 max-w-xs mx-auto">Access the Retention Hub once a profile is created to track engagement history and send automated follow-ups.</p>
                 </div>
               )}
            </TabsContent>

            <TabsContent value="notes" className="m-0 p-6 space-y-6 outline-none border-0">
               <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Internal Notes & Scripts</h3>
                  <div className="flex gap-2">
                     <Button variant="outline" size="sm" onClick={() => window.open(`/client-evaluation?customerId=${form.id}`, '_blank')} className="h-8 text-xs border-blue-600 text-blue-500"><FileBarChart className="h-3 w-3 mr-1" /> Client Eval</Button>
                     <Button variant="outline" size="sm" onClick={() => window.open(`/addon-upsell?customerId=${form.id}`, '_blank')} className="h-8 text-xs border-purple-600 text-purple-600"><Zap className="h-3 w-3 mr-1" /> Addon Upsell</Button>
                  </div>
               </div>
               <Textarea 
                placeholder="Additional notes, history, or specific instructions..."
                className="bg-zinc-900 border-zinc-800 min-h-[200px] text-zinc-200"
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
               />
            </TabsContent>
          </div>

          <DialogFooter className="p-6 bg-zinc-900/50 border-t border-zinc-800 gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">Cancel</Button>
            {form.id && (
              <Button type="button" variant="outline" onClick={handleBook} className="border-blue-600 text-blue-400 hover:bg-blue-600/10">
                 <Calendar className="w-4 h-4 mr-2" /> Book Appointment
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 min-w-[120px]">
              {loading ? 'Processing...' : `Save ${isProspect ? 'Prospect' : 'Customer'}`}
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>

      <VehicleSelectorModal
        open={vehicleSelectorOpen}
        onOpenChange={setVehicleSelectorOpen}
        onSelect={(data) => handleVehicleSelect(data, currentVehicleIdx !== null ? currentVehicleIdx : undefined)}
        initialCustomerId={form.id}
      />

      <Dialog open={showMap} onOpenChange={setShowMap}>
        <DialogContent className="sm:max-w-[700px] h-[500px] bg-zinc-950 border-zinc-800 p-0 overflow-hidden">
          <iframe
            width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen
            src={`https://maps.google.com/maps?q=${encodeURIComponent(form.address || "")}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
          ></iframe>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

interface MediaUploadFieldProps {
  label: string;
  type: 'generalPhotos' | 'beforePhotos' | 'afterPhotos';
  photos: string[];
  vIdx: number;
  onUpload: (file: File, type: 'generalPhotos'|'beforePhotos'|'afterPhotos', index: number, vIdx: number) => void;
  onRemove: (type: 'generalPhotos'|'beforePhotos'|'afterPhotos', index: number, vIdx: number) => void;
}

function MediaUploadField({ label, type, photos, vIdx, onUpload, onRemove }: MediaUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const currentPhotos = photos || [];

  return (
    <div className="space-y-2">
      <Label className="text-[9px] text-zinc-500 uppercase font-black">{label} ({currentPhotos.length})</Label>
      <div className="grid grid-cols-2 gap-2">
        {currentPhotos.map((url, idx) => (
          <div key={idx} className="relative aspect-square rounded bg-zinc-950 border border-zinc-800 overflow-hidden group">
            <img src={url} className="w-full h-full object-cover" />
            <button onClick={() => onRemove(type, idx, vIdx)} className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-2 h-2 text-white" />
            </button>
          </div>
        ))}
        <div className="relative aspect-square rounded border border-dashed border-zinc-800 flex items-center justify-center bg-zinc-950/40 hover:bg-zinc-900 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
          <Plus className="w-4 h-4 text-zinc-700" />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], type, currentPhotos.length, vIdx)} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], type, currentPhotos.length, vIdx)} />
          <button type="button" onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }} className="absolute bottom-1 right-1 p-1 bg-blue-600 rounded-full"><Camera className="w-3 h-3 text-white" /></button>
        </div>
      </div>
    </div>
  );
}
