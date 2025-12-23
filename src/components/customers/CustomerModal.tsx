import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { upsertCustomer } from "@/lib/db";
import { getSupabaseCustomers, upsertSupabaseCustomer, Customer, getLibraryItems, LibraryItem } from "@/lib/supa-data";
import { toast } from "sonner";
import { User, Mail, Phone, MapPin, Car, Calendar, Clock, Search, Image as ImageIcon, Video, Link as LinkIcon, X, Camera } from "lucide-react";
import VehicleSelectorModal from "@/components/vehicles/VehicleSelectorModal";



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
  });

  const isProspect = form.type === 'prospect';

  useEffect(() => {
    const initForm = () => {
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
          videoNote: ""
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

  const handleVehicleSelect = (data: { make: string; model: string; category: string }) => {
    let mappedType = "";
    const cat = data.category;
    if (cat === "Compact") mappedType = "Compact/Sedan";
    else if (cat === "Midsize / Sedan") mappedType = "Compact/Sedan";
    else if (cat === "SUV / Crossover") mappedType = "Mid-Size/SUV";
    else if (cat === "Truck / Oversized") mappedType = "Truck/Van/Large SUV";
    else if (cat === "Oversized Specialty") mappedType = "Truck/Van/Large SUV";

    setForm(prev => ({
      ...prev,
      vehicle: data.make,
      model: data.model,
      vehicleType: mappedType || prev.vehicleType
    }));
  };

  // File upload handlers
  const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if too large
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to compressed base64
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (file: File, type: 'generalPhotos' | 'beforePhotos' | 'afterPhotos' | 'shortVideos', index: number) => {
    try {
      console.log('handleFileUpload called:', { file: file.name, type, index });

      if (!file) {
        toast.error("Upload Failed", { description: "No file selected" });
        return;
      }

      // Check file size (10MB limit for videos, 5MB for images)
      const maxSize = type === 'shortVideos' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("File Too Large", {
          description: `File is ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: ${maxSize / 1024 / 1024}MB`
        });
        return;
      }

      // Compress images for better performance
      if (type !== 'shortVideos' && file.type.startsWith('image/')) {
        toast.info("Uploading...", { description: "Compressing image..." });
        const compressed = await compressImage(file);
        console.log('Image compressed, updating form');
        setForm(prev => {
          const current = prev[type] || [];
          const updated = [...current];
          updated[index] = compressed;
          console.log('Form updated with compressed image');
          return { ...prev, [type]: updated };
        });
        toast.success("Success!", { description: "Image uploaded" });
      } else {
        // Videos
        toast.info("Uploading...", { description: "Processing video..." });
        const reader = new FileReader();
        reader.onerror = () => {
          toast.error("Upload Failed", { description: "Error reading file" });
        };
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setForm(prev => {
            const current = prev[type] || [];
            const updated = [...current];
            updated[index] = base64;
            return { ...prev, [type]: updated };
          });
          toast.success("Success!", { description: "Video uploaded" });
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error("Upload Failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const removeMedia = (type: 'generalPhotos' | 'beforePhotos' | 'afterPhotos' | 'shortVideos', index: number) => {
    setForm(prev => {
      const current = prev[type] || [];
      const updated = [...current];
      updated[index] = '';
      return { ...prev, [type]: updated };
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

            {/* Vehicle Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Vehicle Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVehicleSelectorOpen(true)}
                  className="h-8 text-xs border-dashed border-zinc-700 hover:border-zinc-500"
                >
                  <Search className="w-3 h-3 mr-1" />
                  Select Vehicle from Database
                </Button>
              </div>

              <div className="grid gap-3">
                <div className="relative">
                  <Car className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <select
                    value={form.vehicleType}
                    onChange={(e) => handleChange("vehicleType", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-3 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select Vehicle Type</option>
                    <option value="Compact/Sedan">Compact/Sedan</option>
                    <option value="Mid-Size/SUV">Mid-Size/SUV</option>
                    <option value="Truck/Van/Large SUV">Truck/Van/Large SUV</option>
                    <option value="Luxury/High-End">Luxury/High-End</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="RV/Boat">RV/Boat</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Input
                    placeholder="Year"
                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                    value={form.year}
                    onChange={(e) => handleChange("year", e.target.value)}
                  />
                  <Input
                    placeholder="Make"
                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                    value={form.vehicle}
                    onChange={(e) => handleChange("vehicle", e.target.value)}
                  />
                  <Input
                    placeholder="Model"
                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                    value={form.model}
                    onChange={(e) => handleChange("model", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Color"
                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                    value={form.color}
                    onChange={(e) => handleChange("color", e.target.value)}
                  />
                  <Input
                    placeholder="Mileage (approx)"
                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                    value={form.mileage}
                    onChange={(e) => handleChange("mileage", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Condition (Inside): 1 (Bad) - 5 (Pristine)</Label>
                    <select
                      value={form.conditionInside}
                      onChange={(e) => handleChange("conditionInside", e.target.value)}
                      className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Rate Condition...</option>
                      <option value="1">1 - Extremely Bad</option>
                      <option value="2">2 - Poor</option>
                      <option value="3">3 - Average</option>
                      <option value="4">4 - Good</option>
                      <option value="5">5 - Pristine</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Condition (Outside): 1 (Bad) - 5 (Pristine)</Label>
                    <select
                      value={form.conditionOutside}
                      onChange={(e) => handleChange("conditionOutside", e.target.value)}
                      className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Rate Condition...</option>
                      <option value="1">1 - Extremely Bad</option>
                      <option value="2">2 - Poor</option>
                      <option value="3">3 - Average</option>
                      <option value="4">4 - Good</option>
                      <option value="5">5 - Pristine</option>
                    </select>
                  </div>
                </div>
              </div>
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
            {!isProspect && (
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
            )}

            <div className="h-px bg-zinc-800" />

            {/* Media Gallery - Simplified for speed */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Job Photos (Before/After)
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Before Photo */}
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Before Photo</Label>
                  <div className="relative aspect-square rounded-md bg-zinc-800/50 border border-zinc-700 overflow-hidden">
                    {form.beforePhotos?.[0] ? (
                      <>
                        <img src={form.beforePhotos[0]} alt="Before" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeMedia('beforePhotos', 0)}
                          className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </>
                    ) : (
                      <div
                        onClick={() => beforePhoto1Ref.current?.click()}
                        className="w-full h-full flex items-center justify-center cursor-pointer hover:border-zinc-600 transition-colors"
                      >
                        <div className="text-center p-2">
                          <ImageIcon className="h-8 w-8 mx-auto text-zinc-600 mb-1" />
                          <p className="text-[10px] text-zinc-500">Click to upload</p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={beforePhoto1Ref}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'beforePhotos', 0)}
                    />
                    <input
                      ref={beforePhoto1CameraRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'beforePhotos', 0)}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); beforePhoto1CameraRef.current?.click(); }}
                      className="absolute -bottom-2 -right-2 p-1.5 bg-blue-600 hover:bg-blue-500 rounded-full border border-zinc-900 shadow-lg z-10"
                      title="Take Photo"
                    >
                      <Camera className="h-3 w-3 text-white" />
                    </button>
                  </div>
                </div>

                {/* General Photo */}
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">General Photo</Label>
                  <div className="relative aspect-square rounded-md bg-zinc-800/50 border border-zinc-700 overflow-hidden">
                    {form.generalPhotos?.[0] ? (
                      <>
                        <img src={form.generalPhotos[0]} alt="General" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeMedia('generalPhotos', 0)}
                          className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </>
                    ) : (
                      <div
                        onClick={() => generalPhotoRef.current?.click()}
                        className="w-full h-full flex items-center justify-center cursor-pointer hover:border-zinc-600 transition-colors"
                      >
                        <div className="text-center p-2">
                          <ImageIcon className="h-8 w-8 mx-auto text-zinc-600 mb-1" />
                          <p className="text-[10px] text-zinc-500">Click to upload</p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={generalPhotoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'generalPhotos', 0)}
                    />
                    <input
                      ref={generalPhotoCameraRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'generalPhotos', 0)}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); generalPhotoCameraRef.current?.click(); }}
                      className="absolute -bottom-2 -right-2 p-1.5 bg-blue-600 hover:bg-blue-500 rounded-full border border-zinc-900 shadow-lg z-10"
                      title="Take Photo"
                    >
                      <Camera className="h-3 w-3 text-white" />
                    </button>
                  </div>
                </div>

                {/* After Photo */}
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">After Photo</Label>
                  <div className="relative aspect-square rounded-md bg-zinc-800/50 border border-zinc-700 overflow-hidden">
                    {form.afterPhotos?.[0] ? (
                      <>
                        <img src={form.afterPhotos[0]} alt="After" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeMedia('afterPhotos', 0)}
                          className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </>
                    ) : (
                      <div
                        onClick={() => afterPhoto1Ref.current?.click()}
                        className="w-full h-full flex items-center justify-center cursor-pointer hover:border-zinc-600 transition-colors"
                      >
                        <div className="text-center p-2">
                          <ImageIcon className="h-8 w-8 mx-auto text-zinc-600 mb-1" />
                          <p className="text-[10px] text-zinc-500">Click to upload</p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={afterPhoto1Ref}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'afterPhotos', 0)}
                    />
                    <input
                      ref={afterPhoto1CameraRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'afterPhotos', 0)}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); afterPhoto1CameraRef.current?.click(); }}
                      className="absolute -bottom-2 -right-2 p-1.5 bg-blue-600 hover:bg-blue-500 rounded-full border border-zinc-900 shadow-lg z-10"
                      title="Take Photo"
                    >
                      <Camera className="h-3 w-3 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Video URL Link */}
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400 flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  Video Link (Optional)
                </Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="https://youtube.com/watch?v=..."
                    className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                    value={form.videoUrl || ""}
                    onChange={(e) => handleChange("videoUrl", e.target.value)}
                  />
                </div>
              </div>

              {/* Learning Center URL Link */}
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400 flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  Learning Center Video (Job Instructions)
                </Label>
                <div className="relative">
                  <Select
                    value={form.learningCenterUrl}
                    onValueChange={(val) => handleChange("learningCenterUrl", val)}
                  >
                    <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white">
                      <SelectValue placeholder="Select a video from Learning Library..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[300px]">
                      {libraryItems.length > 0 ? (
                        libraryItems.map((item) => (
                          <SelectItem key={item.id} value={item.resource_url || ""}>
                            {item.title}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-xs text-zinc-500 text-center">No videos available</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[10px] text-zinc-500 italic mt-1">
                  Link to a video in the Prime Training Center showing how to perform this job
                </p>
              </div>

              {/* Video Note */}
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Video Note (Origin/Instructions)</Label>
                <Input
                  placeholder="e.g. Origin of this video, why it's here..."
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                  value={form.videoNote || ""}
                  onChange={(e) => handleChange("videoNote", e.target.value)}
                />
              </div>
            </div>


            <div className="h-px bg-zinc-800" />

            {/* Notes */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notes</h3>
              <Textarea
                placeholder="Additional notes about the customer or prospect..."
                className="bg-zinc-900 border-zinc-800 min-h-[80px] text-white placeholder:text-zinc-500"
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">Save {isProspect ? 'Prospect' : 'Customer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VehicleSelectorModal
        open={vehicleSelectorOpen}
        onOpenChange={setVehicleSelectorOpen}
        onSelect={handleVehicleSelect}
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
