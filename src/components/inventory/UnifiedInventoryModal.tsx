import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import localforage from "localforage";
import { Trash2, Upload, X, ImageIcon, Info, Save, Camera } from "lucide-react";
import browserImageCompression from "browser-image-compression";
import { supabase, upsertSupabaseTaxExpense, getSupabaseTaxExpenses } from "@/lib/supa-data";
import { getChemicals as getLibraryChemicals } from "@/lib/chemicals";

// Updated naming: material → supply, tool → equipment
// Backward compatibility maintained in data layer
type Mode = 'chemical' | 'supply' | 'equipment' | 'material' | 'tool'; // material & tool kept for backward compat

interface ChemicalForm {
  id?: string;
  name: string;
  brand?: string; // NEW: Brand name for chemicals
  bottleSize: string;
  costPerBottle: string; // numeric string - MANDATORY
  currentStock: string; // numeric string
  threshold: string; // numeric string - MANDATORY
  unitOfMeasure: string; // e.g., "oz", "mL"
  consumptionRatePerJob: string; // numeric string - consumption per job
  imageUrl?: string;
  chemicalLibraryId?: string;
  isTaxDeductible?: boolean;
  notes?: string;
}

// Renamed: Material → Supply
interface SupplyForm {
  id?: string;
  name: string;
  category: string;
  subtype: string;
  quantity: string; // numeric string
  costPerItem: string; // numeric string - MANDATORY
  notes: string;
  threshold: string; // maps to lowThreshold - MANDATORY
  unitOfMeasure: string; // e.g., "pads", "units"
  consumptionRatePerJob: string; // numeric string - consumption per job
  imageUrl?: string;
  isTaxDeductible?: boolean;
}

// Renamed: Tool → Equipment
interface EquipmentForm {
  id?: string;
  name: string;
  category: string;
  warranty: string;
  purchaseDate: string;
  price: string; // MANDATORY
  cost: string; // alias for price - MANDATORY
  quantity: string;
  threshold: string; // MANDATORY
  lifeExpectancy: string;
  notes: string;
  unitOfMeasure: string; // e.g., "units"
  consumptionRatePerJob: string; // numeric string - consumption per job
  imageUrl?: string;
  isTaxDeductible?: boolean;
}

type Props = {
  mode: Mode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<ChemicalForm & SupplyForm & EquipmentForm> | null;
  onSaved?: () => Promise<void> | void;
};



export default function UnifiedInventoryModal({ mode: modeProp, open, onOpenChange, initial, onSaved }: Props) {
  // Normalize mode: map legacy names to new names
  const normalizeMode = (m: Mode): Mode => {
    if (m === 'material') return 'supply';
    if (m === 'tool') return 'equipment';
    return m;
  };

  const mode = normalizeMode(modeProp);

  const [form, setForm] = useState<ChemicalForm & SupplyForm & EquipmentForm>({
    id: undefined,
    name: "",
    brand: "", // NEW: Brand field
    bottleSize: "",
    costPerBottle: "",
    currentStock: "0",
    threshold: "1",
    category: "Rag",
    subtype: "",
    quantity: "0",
    costPerItem: "",
    notes: "",
    warranty: "",
    purchaseDate: "",
    price: "",
    cost: "",
    lifeExpectancy: "",
    unitOfMeasure: "",
    consumptionRatePerJob: "0",
    imageUrl: "",
    chemicalLibraryId: "",
    isTaxDeductible: true,
  });

  const [libraryOptions, setLibraryOptions] = useState<any[]>([]);

  useEffect(() => {
    if (mode === 'chemical' && open) {
      getLibraryChemicals().then(setLibraryOptions).catch(err => console.error("Failed to load library", err));
    }
  }, [mode, open]);

  const photoRef = useRef<HTMLInputElement>(null);
  const photoCameraRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Track if user selected "Custom" for dropdowns
  const [customSubtype, setCustomSubtype] = useState(false);
  const [customUnit, setCustomUnit] = useState(false);

  // Dropdown options
  const sizeOptions = ["Small", "Medium", "Large", "Extra Large", "Custom"];

  const chemicalUnits = ["oz", "mL", "L", "Gallons", "Quarts", "Pints", "Custom"];
  const supplyUnits = ["Units", "Pieces", "Pads", "Sheets", "Rolls", "Boxes", "lbs", "kg", "Custom"]; // Renamed from materialUnits
  const equipmentUnits = ["Units", "Pieces", "Sets", "Custom"]; // Renamed from toolUnits

  const getUnitOptions = () => {
    if (mode === 'chemical') return chemicalUnits;
    if (mode === 'equipment' || mode === 'tool') return equipmentUnits;
    return supplyUnits; // supply or material
  };

  useEffect(() => {
    if (initial) {
      const initialSubtype = (initial as any).subtype || "";
      const initialUnit = (initial as any).unitOfMeasure || "";

      // Check if values are custom (not in predefined lists)
      setCustomSubtype(initialSubtype && !sizeOptions.includes(initialSubtype));
      setCustomUnit(initialUnit && !getUnitOptions().includes(initialUnit));

      setForm((f) => ({
        ...f,
        id: initial.id || f.id,
        name: initial.name || "",
        brand: (initial as any).brand || "", // NEW: Load brand
        bottleSize: (initial as any).bottleSize || "",
        costPerBottle: initial?.costPerBottle ? String(initial.costPerBottle) : ((initial as any).costPerBottle || ""),
        currentStock: initial?.currentStock ? String(initial.currentStock) : ((initial as any).currentStock || f.currentStock),
        threshold: (initial as any).threshold ? String((initial as any).threshold) : ((initial as any).lowThreshold ? String((initial as any).lowThreshold) : f.threshold),
        category: (initial as any).category || f.category,
        subtype: initialSubtype,
        quantity: initial?.quantity ? String(initial.quantity) : ((initial as any).quantity || f.quantity),
        costPerItem: initial?.costPerItem ? String(initial.costPerItem) : ((initial as any).costPerItem || ""),
        notes: (initial as any).notes || "",
        warranty: (initial as any).warranty || "",
        purchaseDate: (initial as any).purchaseDate || "",
        price: (initial as any).price ? String((initial as any).price) : "",
        lifeExpectancy: (initial as any).lifeExpectancy || "",
        unitOfMeasure: initialUnit,
        imageUrl: (initial as any).imageUrl || "",
        chemicalLibraryId: (initial as any).chemicalLibraryId || "",
      }));
    } else {
      setCustomSubtype(false);
      setCustomUnit(false);
      setForm({
        id: undefined,
        name: "",
        bottleSize: "",
        costPerBottle: "",
        currentStock: "0",
        threshold: "1",
        category: "Rag",
        subtype: "",
        quantity: "0",
        costPerItem: "",
        notes: "",
        warranty: "",
        purchaseDate: "",
        price: "",
        cost: "",
        lifeExpectancy: "",
        unitOfMeasure: mode === 'chemical' ? "oz" : mode === 'equipment' || mode === 'tool' ? "Units" : "Units",
        consumptionRatePerJob: "0",
        imageUrl: "",
        chemicalLibraryId: "",
      });
    }
  }, [initial, open, mode]);

  const numeric = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setIsUploading(true);
      try {
        toast.info("Processing image...");
        const file = e.target.files[0];

        let fileToUpload = file;

        // Only compress if file is ALREADY small (from library, not camera)
        // Skip compression for large camera photos to prevent memory errors
        const isLikelyFromCamera = file.size > 2 * 1024 * 1024; // > 2MB = probably camera

        if (!isLikelyFromCamera) {
          try {
            // Try to compress smaller images for faster uploads
            toast.info("Compressing...");
            fileToUpload = await browserImageCompression(file, {
              maxSizeMB: 0.5,
              maxWidthOrHeight: 1200,
              useWebWorker: true
            });
          } catch (compressionError) {
            console.warn("Compression failed, uploading original:", compressionError);
            // Fallback to original if compression fails
            fileToUpload = file;
          }
        } else {
          // Large camera photo - upload raw to avoid memory issues
          console.log("Large camera photo detected, skipping compression");
          toast.info("Uploading camera photo...");
        }

        // Upload to Supabase Storage
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const filePath = `inventory/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('blog-media') // Reusing bucket as per plan
          .upload(filePath, fileToUpload);

        if (uploadError) throw uploadError;

        // Get URL
        const { data: { publicUrl } } = supabase.storage
          .from('blog-media')
          .getPublicUrl(filePath);

        setForm(prev => ({ ...prev, imageUrl: publicUrl }));
        toast.success("Image uploaded to cloud");
      } catch (err: any) {
        console.error(err);
        toast.error("Upload failed: " + (err.message || "Unknown error"));
      } finally {
        setIsUploading(false);
      }
    }
  };

  const removeImage = () => {
    setForm(prev => ({ ...prev, imageUrl: "" }));
  };

  const save = async () => {
    try {
      // Validate required fields
      if (!form.name.trim()) {
        toast.error("Name is required");
        return;
      }

      // Validate cost field (MANDATORY)
      const cost = mode === 'chemical' ? numeric(form.costPerBottle) :
        (mode === 'equipment' || mode === 'tool') ? numeric(form.price) :
          numeric(form.costPerItem);
      if (cost <= 0) {
        toast.error("Cost is required and must be greater than 0");
        return;
      }

      const isNew = !form.id; // Track if this is a new purchase
      const id = form.id || crypto.randomUUID();

      if (mode === 'chemical') {
        const payload = {
          id,
          name: form.name.trim(),
          brand: form.brand?.trim() || undefined, // NEW: Include brand
          bottleSize: form.bottleSize.trim(),
          costPerBottle: numeric(form.costPerBottle),
          currentStock: Math.round(numeric(form.currentStock)),
          threshold: Math.round(numeric(form.threshold)),
          imageUrl: form.imageUrl,
          chemicalLibraryId: form.chemicalLibraryId || undefined,
          notes: form.notes || undefined,
        };

        // Import inventory-data at top of file
        const { saveChemical } = await import("@/lib/inventory-data");
        await saveChemical(payload, isNew);

      } else if (mode === 'equipment' || mode === 'tool') {
        const payload = {
          id,
          name: form.name.trim(),
          warranty: form.warranty || "",
          purchaseDate: form.purchaseDate || "",
          price: numeric(form.price),
          lifeExpectancy: form.lifeExpectancy || "",
          notes: form.notes || "",
          imageUrl: form.imageUrl,
        };

        const { saveTool } = await import("@/lib/inventory-data");
        await saveTool(payload, isNew);

      } else { // supply or material
        const payload = {
          id,
          name: form.name.trim(),
          category: form.category || 'Other',
          subtype: form.subtype || "",
          quantity: Math.round(numeric(form.quantity)),
          costPerItem: numeric(form.costPerItem),
          notes: form.notes || undefined,
          lowThreshold: Math.round(numeric(form.threshold)),
          createdAt: new Date().toISOString(),
          imageUrl: form.imageUrl,
        };

        const { saveMaterial } = await import("@/lib/inventory-data");
        await saveMaterial(payload, isNew);
      }

      // INTEGRATION: Track as Tax Expense if enabled
      // Check if this item should be added to tax expenses
      if (form.isTaxDeductible) {
        try {
          // Check if a tax expense record already exists for this asset
          const existingExpenses = await getSupabaseTaxExpenses();
          const existingRecord = existingExpenses.find(exp => exp.asset_id === id);

          // Only create if it doesn't exist yet
          if (!existingRecord) {
            await upsertSupabaseTaxExpense({
              date: form.purchaseDate || new Date().toISOString().split('T')[0],
              amount: cost,
              vendor: "Inventory Purchase",
              category: (mode === 'equipment' || mode === 'tool') ? "Equipment" : "Supplies",
              notes: `Purchased ${form.name}`,
              is_deductible: true,
              is_recurring: false,
              asset_id: id
            });
            toast.success("Item saved and added to tax deductions");
          } else {
            toast.success("Item saved (already in tax deductions)");
          }
        } catch (taxErr) {
          console.error("Failed to create tax expense record:", taxErr);
          // Don't fail the whole save if tax record fails, but warn.
          toast.warning("Inventory saved, but failed to create tax record.");
        }
      } else {
        toast.success("Item saved");
      }

      onOpenChange(false);
      await onSaved?.();

      // Auto-open Card if we just linked one
      if (mode === 'chemical' && form.chemicalLibraryId) {
        // Small delay to ensure modal closes first
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-chemical-detail', { detail: form.chemicalLibraryId }));
        }, 100);
      }
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("Save failed: " + (err?.message || String(err)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800">
          <DialogTitle className="text-white">
            {mode === 'chemical' ? (form.id ? 'Edit Chemical' : 'Add Chemical') :
              (mode === 'equipment' || mode === 'tool') ? (form.id ? 'Edit Equipment' : 'Add Equipment') :
                (form.id ? 'Edit Supply' : 'Add Supply')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Image Upload - Compact at top */}
          <div className="flex justify-center">
            <div className="relative h-24 w-24 rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-800 overflow-hidden flex items-center justify-center cursor-pointer transition-colors"
              onClick={() => !form.imageUrl && photoRef.current?.click()}>
              {form.imageUrl ? (
                <>
                  <img src={form.imageUrl} alt="Item" className="w-full h-full object-cover" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(); }}
                    className="absolute top-1 right-1 bg-red-500 rounded-full p-1 hover:bg-red-600 transition-colors">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </>
              ) : (
                <div className="text-center p-2">
                  <ImageIcon className="h-6 w-6 text-zinc-600 mx-auto mb-1" />
                  <span className="text-xs text-zinc-500">Photo</span>
                </div>
              )}
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <input ref={photoCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
              <button
                type="button"
                className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1.5 border-2 border-zinc-900 cursor-pointer shadow-lg hover:bg-blue-500 transition-colors"
                onClick={(e) => { e.stopPropagation(); photoCameraRef.current?.click(); }}
              >
                <Camera className="h-3 w-3 text-white" />
              </button>
            </div>
          </div>

          {/* Basic Info Section */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Basic Information
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-zinc-400">Item Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                />
              </div>
              {mode === 'chemical' && (
                <div>
                  <Label className="text-xs text-zinc-400">Brand (Optional)</Label>
                  <Input
                    value={form.brand || ""}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                    placeholder="e.g., Superior Products, Meguiar's"
                  />
                </div>
              )}
              {mode === 'chemical' && (
                <div>
                  <Label className="text-xs text-zinc-400">Main Chemical Card (Link)</Label>
                  <select
                    value={form.chemicalLibraryId || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm(f => {
                        const libItem = libraryOptions.find(o => o.id === val);
                        return {
                          ...f,
                          chemicalLibraryId: val,
                          // Auto-fill name/image if empty? Optional.
                          name: (!f.name && libItem) ? libItem.name : f.name,
                          imageUrl: (!f.imageUrl && libItem?.primary_image_url) ? libItem.primary_image_url : f.imageUrl
                        };
                      });
                    }}
                    className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Select chemical card...</option>
                    {libraryOptions.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.brand})</option>
                    ))}
                  </select>
                </div>
              )}
              {mode === 'chemical' && (
                <div>
                  <Label className="text-xs text-zinc-400">Bottle Size</Label>
                  <Input
                    value={form.bottleSize}
                    onChange={(e) => setForm({ ...form, bottleSize: e.target.value })}
                    className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                    placeholder="e.g., 32 oz, 1 L"
                  />
                </div>
              )}
              {(mode === 'supply' || mode === 'material') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-zinc-400">Category</Label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                    >
                      <option>Rag</option>
                      <option>Brush</option>
                      <option>Tool</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Subtype / Size</Label>
                    {!customSubtype ? (
                      <select
                        value={sizeOptions.includes(form.subtype) ? form.subtype : "Custom"}
                        onChange={(e) => {
                          if (e.target.value === "Custom") {
                            setCustomSubtype(true);
                            setForm({ ...form, subtype: "" });
                          } else {
                            setForm({ ...form, subtype: e.target.value });
                          }
                        }}
                        className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                      >
                        <option value="">Select size...</option>
                        {sizeOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={form.subtype}
                          onChange={(e) => setForm({ ...form, subtype: e.target.value })}
                          className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          placeholder="Enter custom size..."
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCustomSubtype(false);
                            setForm({ ...form, subtype: "" });
                          }}
                          className="h-9 px-3 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {(mode === 'equipment' || mode === 'tool') && (
                <div>
                  <Label className="text-xs text-zinc-400">Category</Label>
                  <select
                    value={form.category || "Power Tool"}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                  >
                    <option>Power Tool</option>
                    <option>Hand Tool</option>
                    <option>Equipment</option>
                    <option>Accessory</option>
                    <option>Other</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Stock & Pricing Section */}
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-emerald-300 mb-3">Stock & Pricing</h3>
            <div className="grid grid-cols-2 gap-3">
              {mode === 'chemical' ? (
                <>
                  <div>
                    <Label className="text-xs text-zinc-400">Current Stock</Label>
                    <Input
                      type="number"
                      value={form.currentStock}
                      onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Low Threshold *</Label>
                    <Input
                      type="number"
                      value={form.threshold}
                      onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Cost per Bottle *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.costPerBottle}
                      onChange={(e) => setForm({ ...form, costPerBottle: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Unit of Measure</Label>
                    {!customUnit ? (
                      <select
                        value={getUnitOptions().includes(form.unitOfMeasure) ? form.unitOfMeasure : "Custom"}
                        onChange={(e) => {
                          if (e.target.value === "Custom") {
                            setCustomUnit(true);
                            setForm({ ...form, unitOfMeasure: "" });
                          } else {
                            setForm({ ...form, unitOfMeasure: e.target.value });
                          }
                        }}
                        className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                      >
                        <option value="">Select unit...</option>
                        {getUnitOptions().map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={form.unitOfMeasure}
                          onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })}
                          className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          placeholder="Enter custom unit..."
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCustomUnit(false);
                            setForm({ ...form, unitOfMeasure: "" });
                          }}
                          className="h-9 px-3 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              ) : (mode === 'equipment' || mode === 'tool') ? (
                <>
                  <div>
                    <Label className="text-xs text-zinc-400">Quantity</Label>
                    <Input
                      type="number"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Low Threshold *</Label>
                    <Input
                      type="number"
                      value={form.threshold}
                      onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Price / Cost *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value, cost: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Unit of Measure</Label>
                    {!customUnit ? (
                      <select
                        value={getUnitOptions().includes(form.unitOfMeasure) ? form.unitOfMeasure : "Custom"}
                        onChange={(e) => {
                          if (e.target.value === "Custom") {
                            setCustomUnit(true);
                            setForm({ ...form, unitOfMeasure: "" });
                          } else {
                            setForm({ ...form, unitOfMeasure: e.target.value });
                          }
                        }}
                        className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                      >
                        <option value="">Select unit...</option>
                        {getUnitOptions().map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={form.unitOfMeasure}
                          onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })}
                          className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          placeholder="Enter custom unit..."
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCustomUnit(false);
                            setForm({ ...form, unitOfMeasure: "" });
                          }}
                          className="h-9 px-3 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-xs text-zinc-400">Quantity</Label>
                    <Input
                      type="number"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Low Threshold *</Label>
                    <Input
                      type="number"
                      value={form.threshold}
                      onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Cost per Item *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.costPerItem}
                      onChange={(e) => setForm({ ...form, costPerItem: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Unit of Measure</Label>
                    {!customUnit ? (
                      <select
                        value={getUnitOptions().includes(form.unitOfMeasure) ? form.unitOfMeasure : "Custom"}
                        onChange={(e) => {
                          if (e.target.value === "Custom") {
                            setCustomUnit(true);
                            setForm({ ...form, unitOfMeasure: "" });
                          } else {
                            setForm({ ...form, unitOfMeasure: e.target.value });
                          }
                        }}
                        className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                      >
                        <option value="">Select unit...</option>
                        {getUnitOptions().map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={form.unitOfMeasure}
                          onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })}
                          className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          placeholder="Enter custom unit..."
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCustomUnit(false);
                            setForm({ ...form, unitOfMeasure: "" });
                          }}
                          className="h-9 px-3 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tax Integration Section */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              <Save className="h-4 w-4 text-emerald-400" />
              Tax Tracking
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isTaxDeductible"
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-emerald-500"
                checked={form.isTaxDeductible}
                onChange={(e) => setForm({ ...form, isTaxDeductible: e.target.checked })}
              />
              <Label htmlFor="isTaxDeductible" className="text-sm text-zinc-300 cursor-pointer">
                Track as Tax Deductible Expense
                {form.id ? "" : " (Will create record in Taxes)"}
              </Label>
            </div>
            {!form.id && (
              <p className="text-[10px] text-zinc-500 mt-1 italic">
                * If checked, a record will be added to your Tax Ledger automatically at the current purchase price.
              </p>
            )}
          </div>

          {/* Usage Tracking Section */}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-300 mb-3">Usage Tracking</h3>
            <div>
              <Label className="text-xs text-zinc-400">Consumption per Job</Label>
              <Input
                type="number"
                step="0.01"
                value={form.consumptionRatePerJob}
                onChange={(e) => setForm({ ...form, consumptionRatePerJob: e.target.value })}
                placeholder="e.g., 2"
                className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
              />
            </div>
          </div>

          {/* Equipment-specific Details */}
          {(mode === 'equipment' || mode === 'tool') && (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-300 mb-3">Equipment Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-zinc-400">Warranty Info</Label>
                  <Input
                    value={form.warranty}
                    onChange={(e) => setForm({ ...form, warranty: e.target.value })}
                    placeholder="e.g. 2 Years"
                    className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Date Purchased</Label>
                  <Input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                    className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-zinc-400">Life Expectancy</Label>
                  <Input
                    value={form.lifeExpectancy}
                    onChange={(e) => setForm({ ...form, lifeExpectancy: e.target.value })}
                    placeholder="e.g. 5 Years"
                    className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Additional Notes</h3>
            <div>
              <Label className="text-xs text-zinc-400">Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                placeholder="Any additional information..."
              />
            </div>
          </div>
        </div>
        <DialogFooter className="p-6 pt-4 border-t border-zinc-800 bg-zinc-900 flex items-center justify-end gap-2 mt-auto">
          <Button
            variant="outline"
            onClick={() => { try { window.location.href = '/reports?tab=inventory'; } catch { } }}
            className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
          >
            View Inventory Report
          </Button>
          <Button
            onClick={save}
            disabled={isUploading}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white"
          >
            {isUploading ? 'Uploading...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
