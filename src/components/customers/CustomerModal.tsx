import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { upsertCustomer } from "@/lib/db";
import { getSupabaseCustomers, upsertSupabaseCustomer, Customer, getLibraryItems, LibraryItem, supabase } from "@/lib/supa-data";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";
import { User, Mail, Phone, MapPin, Car, Calendar, Clock, Search, Image as ImageIcon, Video, Link as LinkIcon, X, Camera, Trash2, FileBarChart, Plus, ChevronDown, ExternalLink } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import VehicleSelectorModal from "@/components/vehicles/VehicleSelectorModal";
import browserImageCompression from "browser-image-compression";



interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Customer | null;
  onSave: (data: Customer) => Promise<void> | void;
  defaultType?: 'customer' | 'prospect';
}

export default function CustomerModal({ open, onOpenChange, initial, onSave, defaultType = 'customer' }: Props) {
  const [vehicleSelectorOpen, setVehicleSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [linkedVehicles, setLinkedVehicles] = useState<any[]>([]);
  const [currentVehicleIdx, setCurrentVehicleIdx] = useState<number | null>(null);

  const user = getCurrentUser();
  const isAdmin = user?.role === 'admin';

  // File upload refs
  const generalPhotoRef = useRef<HTMLInputElement>(null);
  const generalPhotoCameraRef = useRef<HTMLInputElement>(null);
  const beforePhoto1Ref = useRef<HTMLInputElement>(null);
  const beforePhoto1CameraRef = useRef<HTMLInputElement>(null);
  const beforePhoto2Ref = useRef<HTMLInputElement>(null);
  const afterPhoto1Ref = useRef<HTMLInputElement>(null);
  const afterPhoto1CameraRef = useRef<HTMLInputElement>(null);
  const afterPhoto2Ref = useRef<HTMLInputElement>(null);
  const video1Ref = useRef<HTMLInputElement>(null);
  const video2Ref = useRef<HTMLInputElement>(null);
  const video3Ref = useRef<HTMLInputElement>(null);
  const generalPhoto1Ref = useRef<HTMLInputElement>(null);
  const generalPhoto2Ref = useRef<HTMLInputElement>(null);
  const generalPhoto3Ref = useRef<HTMLInputElement>(null);
  const generalPhoto4Ref = useRef<HTMLInputElement>(null);

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
    lastService: "",
    duration: "",
    notes: "",
    howFound: "",
    howFoundOther: "",
    type: defaultType,
    generalPhotos: [],
    beforePhotos: [],
    afterPhotos: [],
    shortVideos: [],
    videoUrl: "",
    learningCenterUrl: "",
    videoNote: "",
    vehicles: [],
  });

  const isProspect = form.type === 'prospect';

  useEffect(() => {
    const initForm = async () => {
      setLinkedVehicles([]); // Reset
      if (initial) {
        let cIn = "";
        let cOut = "";
        const noteStr = initial.notes || "";
        const match = noteStr.match(/\[Vehicle Condition\]\s*Inside:\s*([0-5])\/5\s*Outside:\s*([0-5])\/5/i);
        if (match) {
          cIn = match[1];
          cOut = match[2];
        }

        setForm({
          ...initial,
          services: initial.services || [],
          type: initial.type || defaultType,
          conditionInside: initial.conditionInside || cIn,
          conditionOutside: initial.conditionOutside || cOut,
          generalPhotos: initial.generalPhotos || [],
          beforePhotos: initial.beforePhotos || [],
          afterPhotos: initial.afterPhotos || [],
          shortVideos: initial.shortVideos || [],
          videoUrl: initial.videoUrl || "",
          learningCenterUrl: initial.learningCenterUrl || "",
          videoNote: initial.videoNote || ""
        });

        // Fetch all linked vehicles
        if (initial.id) {
          try {
            const { data: vehs } = await supabase
              .from('vehicles')
              .select('*')
              .eq('customer_id', initial.id)
              .order('created_at', { ascending: true });
            if (vehs) {
              setLinkedVehicles(vehs);
              setForm(prev => ({
                ...prev,
                vehicles: vehs.map(v => ({
                  id: v.id,
                  make: v.make,
                  model: v.model,
                  year: v.year ? String(v.year) : "",
                  type: v.type,
                  color: v.color,
                  vin: v.vin,
                  conditionInside: "",
                  conditionOutside: "",
                  mileage: ""
                }))
              }));
            }
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
          lastService: "",
          duration: "",
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

    initForm();
    getLibraryItems().then(items => setLibraryItems(items || []));
  }, [initial, open, defaultType]);

  const handleChange = (key: keyof Customer, value: string) => {
    if (key === "services") {
      setForm((f) => ({ ...f, services: value.split(",").map((s) => s.trim()).filter(Boolean) }));
    } else {
      setForm((f) => ({ ...f, [key]: value } as Customer));
    }
  };

  const handleVehicleSelect = (data: { make: string; model: string; category: string }, index?: number) => {
    let mappedType = "";
    const cat = data.category;
    if (cat === "Compact") mappedType = "Compact/Sedan (Small cars and sedans)";
    else if (cat === "Midsize / Sedan") mappedType = "Compact/Sedan (Small cars and sedans)";
    else if (cat === "SUV / Crossover") mappedType = "Mid-Size/SUV (Mid-size cars and SUVs)";
    else if (cat === "Truck / Oversized") mappedType = "Truck/Van/Large SUV (Trucks, vans, large SUVs)";
    else if (cat === "Oversized Specialty") mappedType = "Truck/Van/Large SUV (Trucks, vans, large SUVs)";
    else if (cat.includes("Compact/Sedan")) mappedType = "Compact/Sedan (Small cars and sedans)";
    else if (cat.includes("Mid-Size/SUV")) mappedType = "Mid-Size/SUV (Mid-size cars and SUVs)";
    else if (cat.includes("Truck/Van/Large SUV")) mappedType = "Truck/Van/Large SUV (Trucks, vans, large SUVs)";
    else if (cat.includes("Luxury/High-End")) mappedType = "Luxury/High-End (Luxury and premium vehicles)";

    if (typeof index === 'number') {
      const updated = [...(form.vehicles || [])];
      updated[index] = {
        ...updated[index],
        make: data.make,
        model: data.model,
        type: mappedType || updated[index].type
      };
      setForm(prev => ({ ...prev, vehicles: updated }));
    } else {
      setForm(prev => ({
        ...prev,
        vehicle: data.make,
        model: data.model,
        vehicleType: mappedType || prev.vehicleType
      }));
    }
  };

  const addVehicleRow = () => {
    setForm(prev => ({
      ...prev,
      vehicles: [...(prev.vehicles || []), { make: "", model: "", year: "", type: "", color: "", vin: "", conditionInside: "", conditionOutside: "", mileage: "" }]
    }));
  };

  const updateVehicleRow = (index: number, patch: any) => {
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



  const handleFileUpload = async (file: File, type: 'generalPhotos' | 'beforePhotos' | 'afterPhotos' | 'shortVideos', index: number, vehicleIndex?: number) => {
    try {
      if (!file) return;

      const maxSize = type === 'shortVideos' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("File Too Large", { description: "Max size exceeded." });
        return;
      }

      setLoading(true);
      toast.info("Uploading...", { description: "Processing..." });

      let fileToUpload = file;
      if (type !== 'shortVideos' && file.type.startsWith('image/')) {
        fileToUpload = await browserImageCompression(file, {
          maxSizeMB: 0.4,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
          initialQuality: 0.6,
          maxIteration: 10
        });
      }

      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
      const filePath = `customers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-photos')
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-photos')
        .getPublicUrl(filePath);

      setForm(prev => {
        if (vehicleIndex !== undefined && prev.vehicles && prev.vehicles[vehicleIndex]) {
          const updatedVehicles = [...prev.vehicles];
          const vehicle = { ...updatedVehicles[vehicleIndex] };
          const currentMedia = (vehicle as any)[type] || [];
          const updatedMedia = [...currentMedia];
          if (index < updatedMedia.length) {
            updatedMedia[index] = publicUrl;
          } else {
            updatedMedia.push(publicUrl);
          }
          (vehicle as any)[type] = updatedMedia;
          updatedVehicles[vehicleIndex] = vehicle;
          return { ...prev, vehicles: updatedVehicles };
        } else {
          const current = prev[type] || [];
          const updated = [...current];
          updated[index] = publicUrl;
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

  const removeMedia = (type: 'generalPhotos' | 'beforePhotos' | 'afterPhotos' | 'shortVideos', index: number, vehicleIndex?: number) => {
    setForm(prev => {
      if (vehicleIndex !== undefined && prev.vehicles && prev.vehicles[vehicleIndex]) {
        const updatedVehicles = [...prev.vehicles];
        const vehicle = { ...updatedVehicles[vehicleIndex] };
        const currentMedia = (vehicle as any)[type] || [];
        const updatedMedia = currentMedia.filter((_: any, i: number) => i !== index);
        (vehicle as any)[type] = updatedMedia;
        updatedVehicles[vehicleIndex] = vehicle;
        return { ...prev, vehicles: updatedVehicles };
      } else {
        const current = prev[type] || [];
        const updated = current.filter((_: any, i: number) => i !== index);
        return { ...prev, [type]: updated };
      }
    });
  };

  const updateVideoUrl = (vehicleIndex: number, index: number, url: string) => {
    setForm(prev => {
      if (prev.vehicles && prev.vehicles[vehicleIndex]) {
        const updatedVehicles = [...prev.vehicles];
        const vehicle = { ...updatedVehicles[vehicleIndex] };
        const videoUrls = [...(vehicle.videoUrls || [])];
        videoUrls[index] = url;
        vehicle.videoUrls = videoUrls;
        updatedVehicles[vehicleIndex] = vehicle;
        return { ...prev, vehicles: updatedVehicles };
      }
      return prev;
    });
  };

  const addVideoUrl = (vehicleIndex: number) => {
    setForm(prev => {
      if (prev.vehicles && prev.vehicles[vehicleIndex]) {
        const updatedVehicles = [...prev.vehicles];
        const vehicle = { ...updatedVehicles[vehicleIndex] };
        vehicle.videoUrls = [...(vehicle.videoUrls || []), ""];
        updatedVehicles[vehicleIndex] = vehicle;
        return { ...prev, vehicles: updatedVehicles };
      }
      return prev;
    });
  };

  const removeVideoUrl = (vehicleIndex: number, index: number) => {
    setForm(prev => {
      if (prev.vehicles && prev.vehicles[vehicleIndex]) {
        const updatedVehicles = [...prev.vehicles];
        const vehicle = { ...updatedVehicles[vehicleIndex] };
        vehicle.videoUrls = (vehicle.videoUrls || []).filter((_, i) => i !== index);
        updatedVehicles[vehicleIndex] = vehicle;
        return { ...prev, vehicles: updatedVehicles };
      }
      return prev;
    });
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

    // Delegate save to parent component (which handles fallback to local storage)
    try {
      await onSave(payload as any);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Save Error:", err);
      toast.error("Save failed");
    }
  };

  const handleDeleteLinkedVehicle = async (vehicleId: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      toast.info("Deleting vehicle dependencies...");
      // 1. Delete Dependencies first (Bookings & Estimates) & INVOICES?
      // Best effort - catch errors individually so we proceed
      await supabase.from('bookings').delete().eq('vehicle_id', vehicleId).then(({ error }) => {
        if (error) console.error("Booking delete error (ignored):", error);
      });
      await supabase.from('estimates').delete().eq('vehicle_id', vehicleId).then(({ error }) => {
        if (error) console.error("Estimate delete error (ignored):", error);
      });

      // 2. Delete the Vehicle
      toast.info("Deleting vehicle record...");
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) throw error;

      // 3. PARANOID VERIFICATION: Check if it's actually gone
      const { count: existsCount } = await supabase
        .from('vehicles')
        .select('id', { count: 'exact', head: true })
        .eq('id', vehicleId);

      if (existsCount && existsCount > 0) {
        // DELETE FAILED (likely RLS). Try Update/Unlink fallback.
        console.warn("Delete failed (RLS?). Attempting to unlink vehicle...");

        const { error: unlinkError } = await supabase
          .from('vehicles')
          .update({ customer_id: null })
          .eq('id', vehicleId);

        if (unlinkError) {
          const msg = "PERMISSION DENIED: You cannot delete or unlink this vehicle.\n\nThis usually happens because the vehicle was created by another user or a public form, and the database security prevents admins from modifying it.\n\nPlease ask the developer to check 'RLS Policies' on the 'vehicles' table.";
          alert(msg);
          throw new Error(msg);
        }

        toast.success("Vehicle unlinked (Permission restriction bypassed)");
      } else {
        toast.success("Vehicle deleted successfully");
      }

      // 4. Force specific fresh fetch to be sure UI is in sync
      const { data: freshList } = await supabase.from('vehicles').select('*').eq('customer_id', initial.id);
      const updatedList = freshList || [];
      setLinkedVehicles(updatedList);

      // 5. Logic to close or clear form
      const remainingCount = updatedList.length;

      // If the deleted vehicle data matches what's currently in the form inputs, clear the form
      const deletedVehicle = linkedVehicles.find(v => v.id === vehicleId);
      const isMatch = deletedVehicle && (
        (form.vehicle === deletedVehicle.make && form.model === deletedVehicle.model) ||
        remainingCount === 0
      );

      if (isMatch) {
        setForm(prev => ({ ...prev, vehicle: "", model: "", year: "", color: "", mileage: "", vehicleType: "", conditionInside: "", conditionOutside: "" }));
      }

      // Auto-close if this was the blockage preventing customer deletion
      if (remainingCount === 0 && confirm("Vehicle removed. The customer profile is now clear of vehicles.\n\nClose this window to proceed with deleting the customer?")) {
        onOpenChange(false);
      }

    } catch (e: any) {
      console.error(e);
      toast.error("Failed to delete vehicle", { description: e.message });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {initial?.id ? `Edit ${isProspect ? 'Prospect' : 'Customer'}` : `Add New ${isProspect ? 'Prospect' : 'Customer'}`}
            </DialogTitle>
            <DialogDescription>
              {isProspect
                ? "Track potential client details. Convert to customer later by booking a job."
                : "Manage customer profile and vehicle details."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">

            {/* Contact Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</h3>
              <div className="grid gap-3">
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="Full Name"
                    className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                      placeholder="Phone"
                      className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                      type="email"
                      placeholder="Email"
                      className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                      placeholder="Address"
                      className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                      value={form.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                    />
                  </div>
                  {form.address && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowMap(true)}
                      className="shrink-0 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                      title="View on Map"
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Vehicle Section - Accordion Style */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicles
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVehicleRow}
                  className="h-8 text-xs border-emerald-600/30 text-emerald-500 hover:bg-emerald-600/10"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Another Vehicle
                </Button>
              </div>

              <Accordion type="multiple" defaultValue={["vehicle-0"]} className="space-y-2">
                {(form.vehicles || []).map((v, idx) => (
                  <AccordionItem key={idx} value={`vehicle-${idx}`} className="border border-zinc-800 bg-zinc-900/40 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-zinc-800/50">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 border border-zinc-700">
                            {idx + 1}
                          </div>
                          <span className="text-sm font-medium text-white">
                            {v.year || v.make || v.model ? `${v.year} ${v.make} ${v.model}`.trim() : `Vehicle ${idx + 1}`}
                          </span>
                          {v.type && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 border-zinc-700 text-zinc-500">
                              {v.type}
                            </Badge>
                          )}
                        </div>
                        {idx > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); removeVehicleRow(idx); }}
                            className="h-7 w-7 p-0 text-red-500 hover:bg-red-950/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 border-t border-zinc-800/50">
                      <div className="grid gap-4">
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentVehicleIdx(idx);
                              setVehicleSelectorOpen(true);
                            }}
                            className="h-7 text-[10px] border-dashed border-zinc-700 hover:border-zinc-500"
                          >
                            <Search className="w-3 h-3 mr-1" />
                            Database Search
                          </Button>
                        </div>

                        <div className="grid gap-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <select
                              value={v.type}
                              onChange={(e) => updateVehicleRow(idx, { type: e.target.value })}
                              className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                            >
                              <option value="">Select Type</option>
                              <option value="Compact/Sedan (Small cars and sedans)">Compact/Sedan (Small cars and sedans)</option>
                              <option value="Mid-Size/SUV (Mid-size cars and SUVs)">Mid-Size/SUV (Mid-size cars and SUVs)</option>
                              <option value="Truck/Van/Large SUV (Trucks, vans, large SUVs)">Truck/Van/Large SUV (Trucks, vans, large SUVs)</option>
                              <option value="Luxury/High-End (Luxury and premium vehicles)">Luxury/High-End (Luxury and premium vehicles)</option>
                              <option value="Motorcycle">Motorcycle</option>
                              <option value="RV/Boat">RV/Boat</option>
                            </select>
                            <Input
                              placeholder="Year"
                              className="bg-zinc-950 border-zinc-800 text-white h-10"
                              value={v.year}
                              onChange={(e) => updateVehicleRow(idx, { year: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              placeholder="Make"
                              className="bg-zinc-950 border-zinc-800 text-white h-10"
                              value={v.make}
                              onChange={(e) => updateVehicleRow(idx, { make: e.target.value })}
                            />
                            <Input
                              placeholder="Model"
                              className="bg-zinc-950 border-zinc-800 text-white h-10"
                              value={v.model}
                              onChange={(e) => updateVehicleRow(idx, { model: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              placeholder="Color"
                              className="bg-zinc-950 border-zinc-800 text-white h-10"
                              value={v.color}
                              onChange={(e) => updateVehicleRow(idx, { color: e.target.value })}
                            />
                            <Input
                              placeholder="Mileage"
                              className="bg-zinc-950 border-zinc-800 text-white h-10"
                              value={v.mileage || ""}
                              onChange={(e) => updateVehicleRow(idx, { mileage: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase">Interior Cond.</Label>
                              <select
                                value={v.conditionInside}
                                onChange={(e) => updateVehicleRow(idx, { conditionInside: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white outline-none"
                              >
                                <option value="">N/A</option>
                                <option value="1">1 - Poor</option>
                                <option value="2">2 - Fair</option>
                                <option value="3">3 - Good</option>
                                <option value="4">4 - Great</option>
                                <option value="5">5 - Pristine</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase">Exterior Cond.</Label>
                              <select
                                value={v.conditionOutside}
                                onChange={(e) => updateVehicleRow(idx, { conditionOutside: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white outline-none"
                              >
                                <option value="">N/A</option>
                                <option value="1">1 - Poor</option>
                                <option value="2">2 - Fair</option>
                                <option value="3">3 - Good</option>
                                <option value="4">4 - Great</option>
                                <option value="5">5 - Pristine</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Acquisition */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Acquisition</h3>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.howFound || ""}
                  onChange={(e) => handleChange("howFound", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">How Found?</option>
                  <option value="online">Online</option>
                  <option value="in-person">In Person (Casual)</option>
                  <option value="on-the-job">On the Job</option>
                  <option value="referral">Referral</option>
                  <option value="friend-family">Friend/Family</option>
                  <option value="pool-league">Pool League</option>
                  <option value="other">Other</option>
                </select>
                {form.howFound === "other" && (
                  <Input
                    placeholder="Specify..."
                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                    value={form.howFoundOther || ""}
                    onChange={(e) => handleChange("howFoundOther", e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* Services for Customers */}
            {
              !isProspect && (
                <>
                  <div className="h-px bg-zinc-800" />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Service History</h3>
                    <div className="grid gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                          <Input
                            placeholder="Last Service Date"
                            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                            value={form.lastService}
                            onChange={(e) => handleChange("lastService", e.target.value)}
                          />
                        </div>
                        <div className="relative">
                          <Clock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                          <Input
                            placeholder="Duration"
                            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                            value={form.duration}
                            onChange={(e) => handleChange("duration", e.target.value)}
                          />
                        </div>
                      </div>
                      <Input
                        placeholder="Services (comma separated)"
                        className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                        value={form.services.join(", ")}
                        onChange={(e) => handleChange("services", e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )
            }

            <div className="h-px bg-zinc-800" />

            {/* Vehicle Media Gallery Integration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Vehicle Media Gallery
                </h3>
                {form.id && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-blue-500 h-auto p-0 text-xs flex items-center gap-1"
                    onClick={() => window.open(`/vehicle-gallery?customerId=${form.id}`, '_blank')}
                  >
                    View Full Gallery <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-3">
                <p className="text-[11px] text-blue-400 leading-tight">
                  <strong>Gallery Workflow:</strong> Photos are stored in-app and become a permanent part of the record.
                  Videos are embedded from external platforms (YouTube, FB, IG, TikTok).
                  Manage all media centrally in the <span className="underline cursor-pointer" onClick={() => window.open('/vehicle-gallery', '_blank')}>Vehicle Gallery</span>.
                </p>
              </div>

              {(form.vehicles || []).length === 0 ? (
                <div className="text-center py-6 border border-dashed border-zinc-800 rounded-lg">
                  <Car className="h-8 w-8 mx-auto text-zinc-800 mb-2" />
                  <p className="text-xs text-zinc-500">No vehicles linked to add media to.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(form.vehicles || []).map((vehicle, vIdx) => {
                    const isFirst = vIdx === 0;
                    const content = (
                      <div className="space-y-6 pt-2">
                        {/* Photo Grid */}
                        <div className="grid grid-cols-3 gap-3">
                          <MediaUploadField
                            label="Before Photo"
                            type="beforePhotos"
                            photos={vehicle.beforePhotos || []}
                            vIdx={vIdx}
                            onUpload={handleFileUpload}
                            onRemove={removeMedia}
                          />
                          <MediaUploadField
                            label="After Photo"
                            type="afterPhotos"
                            photos={vehicle.afterPhotos || []}
                            vIdx={vIdx}
                            onUpload={handleFileUpload}
                            onRemove={removeMedia}
                          />
                          <MediaUploadField
                            label="General Photo"
                            type="generalPhotos"
                            photos={vehicle.generalPhotos || []}
                            vIdx={vIdx}
                            onUpload={handleFileUpload}
                            onRemove={removeMedia}
                          />
                        </div>

                        {/* Video URLs */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-zinc-400 flex items-center gap-1">
                              <Video className="h-3 w-3" /> Embedded Video URLs
                            </Label>
                            {isAdmin && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] bg-zinc-900 border-zinc-700"
                                onClick={() => addVideoUrl(vIdx)}
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add Video
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {(vehicle.videoUrls || []).map((url, urlIdx) => (
                              <div key={urlIdx} className="flex gap-2">
                                <div className="relative flex-1">
                                  <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                                  <Input
                                    placeholder="YouTube, FB, TikTok URL..."
                                    className="pl-9 bg-zinc-900 border-zinc-800 text-white text-xs h-9"
                                    value={url}
                                    onChange={(e) => updateVideoUrl(vIdx, urlIdx, e.target.value)}
                                    disabled={!isAdmin && !!url}
                                  />
                                </div>
                                {isAdmin && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeVideoUrl(vIdx, urlIdx)}
                                    className="h-9 w-9 text-red-500 hover:bg-red-950/30"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            {(vehicle.videoUrls || []).length === 0 && (
                              <p className="text-[10px] text-zinc-600 italic">No videos linked for this vehicle.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );

                    if (isFirst) {
                      return (
                        <div key={vIdx} className="space-y-2 border-b border-zinc-800 pb-6">
                          <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                            <Car className="h-3 w-3" /> {vehicle.year} {vehicle.make} {vehicle.model} (Primary)
                          </div>
                          {content}
                        </div>
                      );
                    }

                    return (
                      <Accordion key={vIdx} type="single" collapsible className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/30">
                        <AccordionItem value={`veh-${vIdx}`} className="border-0">
                          <AccordionTrigger className="px-4 py-2 hover:no-underline text-xs font-medium text-zinc-400">
                            <div className="flex items-center gap-2">
                              <Car className="h-3 w-3" /> {vehicle.year} {vehicle.make} {vehicle.model}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            {content}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Notes & Scripts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {isProspect ? 'Prospect Notes & Scripts' : 'Customer Notes'}
                </h3>
                {form.id && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = `/client-evaluation?customerId=${form.id}&customerName=${encodeURIComponent(form.name)}`;
                        window.open(url, '_blank');
                      }}
                      className="h-8 text-xs border-emerald-600 text-emerald-600 hover:bg-emerald-600/10"
                      title="Open Client Evaluation script for this customer"
                    >
                      <FileBarChart className="h-3 w-3 mr-1" />
                      Client Evaluation
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = `/addon-upsell?customerId=${form.id}&customerName=${encodeURIComponent(form.name)}`;
                        window.open(url, '_blank');
                      }}
                      className="h-8 text-xs border-purple-600 text-purple-600 hover:bg-purple-600/10"
                      title="Open Addon Upsell script for this customer"
                    >
                      <FileBarChart className="h-3 w-3 mr-1" />
                      Addon Upsell
                    </Button>
                  </div>
                )}
              </div>

              <Textarea
                placeholder={isProspect
                  ? "Notes for this prospect:\n• What services they want\n• Price discussed\n• Appointment date/time\n• Follow-up actions\n• Concerns or questions..."
                  : "Additional notes about the customer..."
                }
                className="bg-zinc-900 border-zinc-800 min-h-[120px] text-white placeholder:text-zinc-500"
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
              />

              {isProspect && (
                <p className="text-[10px] text-amber-500 flex items-center gap-1">
                  <FileBarChart className="h-3 w-3" />
                  Tip: Save first, then use script buttons above to guide your conversation
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading ? 'Uploading...' : `Save ${isProspect ? 'Prospect' : 'Customer'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VehicleSelectorModal
        open={vehicleSelectorOpen}
        onOpenChange={setVehicleSelectorOpen}
        onSelect={(data) => handleVehicleSelect(data, currentVehicleIdx !== null ? currentVehicleIdx : undefined)}
      />

      <Dialog open={showMap} onOpenChange={setShowMap}>
        <DialogContent className="sm:max-w-[600px] h-[500px] bg-zinc-950 border-zinc-800 p-0 overflow-hidden">
          <DialogHeader className="p-4 bg-zinc-900/50 border-b border-zinc-800 absolute top-0 w-full z-10 backdrop-blur-sm">
            <DialogTitle className="text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              {form.address || "Location"}
            </DialogTitle>
          </DialogHeader>
          <div className="w-full h-full pt-[60px]">
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(form.address || "")}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            ></iframe>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface MediaUploadFieldProps {
  label: string;
  type: 'generalPhotos' | 'beforePhotos' | 'afterPhotos';
  photos: string[];
  vIdx: number;
  onUpload: (file: File, type: any, index: number, vIdx: number) => void;
  onRemove: (type: any, index: number, vIdx: number) => void;
}

function MediaUploadField({ label, type, photos, vIdx, onUpload, onRemove }: MediaUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-zinc-500 uppercase font-bold">{label}</Label>
      <div className="relative aspect-square rounded-md bg-zinc-900 border border-zinc-800 overflow-hidden ring-1 ring-zinc-800/50">
        {photos && photos[0] ? (
          <>
            <img src={photos[0]} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(type, 0, vIdx)}
              className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors backdrop-blur-sm"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-800/50 transition-colors"
          >
            <ImageIcon className="h-4 w-4 text-zinc-700 mb-1" />
            <p className="text-[8px] text-zinc-600">Upload</p>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], type, 0, vIdx)}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], type, 0, vIdx)}
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
          className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 hover:bg-blue-500 rounded-full border border-zinc-950 shadow-xl z-20 transition-transform active:scale-90"
        >
          <Camera className="h-3 w-3 text-white" />
        </button>
      </div>
    </div>
  );
}
