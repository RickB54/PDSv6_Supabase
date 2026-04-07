import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import localforage from "localforage";
import { Trash2, Upload, X, ImageIcon, Info, Save, Camera, Beaker, ExternalLink, Plus as PlusIcon, RefreshCw, Sparkles } from "lucide-react";
import { compressImageForUpload } from "@/lib/image-compression";
import { supabase, upsertSupabaseTaxExpense, getSupabaseTaxExpenses } from "@/lib/supa-data";
import { getChemicals as getLibraryChemicals, getChemicalById } from "@/lib/chemicals";
import { DilutionRatio } from "@/types/chemicals";
import { generateTemplate } from "@/lib/chemical-ai";
import { useDemoMode } from "@/contexts/DemoContext";
import { uploadFile } from "@/lib/storage-utils";

// Updated naming: material → supply, tool → equipment
// Backward compatibility maintained in data layer
type Mode = 'chemical' | 'supply' | 'equipment' | 'material' | 'tool'; // material & tool kept for backward compat

interface ChemicalForm {
  id?: string;
  name: string;
  brand?: string;
  bottleSize: string;
  costPerBottle: string;
  currentStock: string;
  threshold: string;
  unitOfMeasure: string;
  consumptionRatePerJob: string;
  imageUrl?: string;
  chemicalLibraryId?: string;
  isTaxDeductible?: boolean;
  notes?: string;
  dilutionRatios: DilutionRatio[];
  updatedAt?: string;
  createdAt?: string;
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
  updatedAt?: string;
  createdAt?: string;
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
  updatedAt?: string;
  createdAt?: string;
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
    currentStock: "1",
    threshold: "1",
    category: "Other",
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
    dilutionRatios: [],
    updatedAt: "",
    createdAt: "",
  });

  const [libraryOptions, setLibraryOptions] = useState<any[]>([]);

  useEffect(() => {
    if (mode === 'chemical' && open) {
      getLibraryChemicals().then(setLibraryOptions).catch(err => console.error("Failed to load library", err));
    }
  }, [mode, open]);

  const photoRef = useRef<HTMLInputElement>(null);
  const photoCameraRef = useRef<HTMLInputElement>(null);
  const recoveredRef = useRef(false);
  const [isUploading, setIsUploading] = useState(false);

  // Track if user selected "Custom" for dropdowns
  const [customCategory, setCustomCategory] = useState(false);
  const [customSubtype, setCustomSubtype] = useState(false);
  const [customUnit, setCustomUnit] = useState(false);

  // Dropdown options
  const categoryOptions = {
    supply: ["Other", "Towel/Rag", "Bottle", "Business Item", "Safety Item", "Brush", "Tool", "Consumable", "Chemical", "PPE", "Custom"],
    equipment: ["Power Tool", "Hand Tool", "Equipment", "Accessory", "Vehicle", "Other", "Custom"]
  };

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
    // If we've already recovered in this mount session, ignore prop changes that might overwrite our data
    if (recoveredRef.current) return;

    // CHECK RECOVERY FIRST - Always prioritize unsaved draft if modal is open
    const saved = localStorage.getItem('pending_inventory_form');
    if (saved && open) {
      try {
        const parsed = JSON.parse(saved);
        // Only recover if the mode matches
        if (parsed.mode === mode) {
          // If we have an initial item, only recover if it's the same item
          if (initial && parsed.form.id && parsed.form.id !== initial.id) {
            // ID mismatch, don't recover
          } else {
            console.log("Recovered unsaved draft state. Locking until save/close.");
            setForm(parsed.form);
            setCustomSubtype(parsed.customSubtype);
            setCustomUnit(parsed.customUnit);
            setCustomCategory(parsed.customCategory);
            recoveredRef.current = true;
            return;
          }
        }
      } catch (e) {
        console.error("Restore failed", e);
      }
    }

    if (initial) {
      const initialSubtype = (initial as any).subtype || "";
      const initialUnit = (initial as any).unitOfMeasure || "";
      const initialCat = (initial as any).category || "";
      const isCustomCat = initialCat && 
        (mode === 'equipment' || mode === 'tool' ? 
          !categoryOptions.equipment.includes(initialCat) : 
          !categoryOptions.supply.includes(initialCat));
      
      setCustomCategory(isCustomCat);
      setCustomSubtype(initialSubtype && !sizeOptions.includes(initialSubtype));
      setCustomUnit(initialUnit && !getUnitOptions().includes(initialUnit));

      setForm((f) => ({
        ...f,
        id: initial.id || f.id,
        name: initial.name || "",
        brand: (initial as any).brand || "",
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
        imageUrl: (initial as any).imageUrl || f.imageUrl,
        chemicalLibraryId: (initial as any).chemicalLibraryId || "",
        dilutionRatios: (initial as any).dilutionRatios || [],
        updatedAt: (initial as any).updated_at || (initial as any).updatedAt || "",
        createdAt: (initial as any).createdAt || (initial as any).created_at || "",
      }));
    } else {
      setCustomCategory(false);
      setCustomSubtype(false);
      setCustomUnit(false);
      setForm({
        id: undefined,
        name: "",
        bottleSize: "",
        costPerBottle: "",
        currentStock: "0",
        threshold: "1",
        category: "Other",
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
        dilutionRatios: [],
      });
    }
  }, [initial, open, mode]);

  // Clean up lock when modal closes
  useEffect(() => {
    if (!open) {
      recoveredRef.current = false;
    }
  }, [open]);

  // SESSION RECOVERY: Persist form state to SESSION STORAGE on every change
  // This allows the app to RE-OPEN the modal automatically if the browser reloads
  // after the user takes a picture (common mobile OOM crash)
  useEffect(() => {
    if (open) {
      localStorage.setItem('pending_inventory_form', JSON.stringify({
        form,
        mode,
        customCategory,
        customSubtype,
        customUnit
      }));
    }
  }, [form, mode, customCategory, customSubtype, customUnit, open]);

  const numeric = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setIsUploading(true);
      try {
        toast.info("Optimizing and uploading image...");
        const rawFile = e.target.files[0];

        // Explicitly compress before even sending to the upload utility 
        // to provide double-protection against OOM on high-end rear cameras
        const { compressImageForUpload } = await import('@/lib/image-compression');
        const compressed = await compressImageForUpload(rawFile);

        const publicUrl = await uploadFile('blog-media', compressed);

        setForm(prev => ({ ...prev, imageUrl: publicUrl }));
        toast.success("Image secured to cloud");
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

  const addDilution = () => {
    const newD: DilutionRatio = { method: "Spray", ratio: "1:10", soil_level: "General", notes: "" };
    setForm(f => ({ ...f, dilutionRatios: [...(f.dilutionRatios || []), newD] }));
  };

  const updateDilution = (index: number, field: keyof DilutionRatio, val: string) => {
    const arr = [...(form.dilutionRatios || [])];
    arr[index] = { ...arr[index], [field]: val };
    setForm(f => ({ ...f, dilutionRatios: arr }));
  };

  const removeDilution = (index: number) => {
    const arr = [...(form.dilutionRatios || [])];
    arr.splice(index, 1);
    setForm(f => ({ ...f, dilutionRatios: arr }));
  };

  const syncFromLibrary = async (libId: string) => {
    if (!libId) return;
    try {
      const libData = await getChemicalById(libId);
      if (libData && libData.dilution_ratios) {
        setForm(f => ({
          ...f,
          dilutionRatios: libData.dilution_ratios
        }));
        toast.success("Synced dilution ratios from library card");
      }
    } catch (err) {
      console.error("Failed to sync from library", err);
    }
  };

  const { isDemoMode } = useDemoMode();

  const save = async () => {
    try {
      // Validate required fields
      if (!form.name.trim()) {
        toast.error("Name is required");
        return;
      }

      if (isDemoMode) {
        toast.warning("Training Session: Persistent database writes are disabled.", {
          description: "Your changes were simulated locally but not saved to the permanent inventory."
        });
        onOpenChange(false);
        return;
      }

      // Calculate total cost for tax tracking/payload use
      const unitCost = mode === 'chemical' ? numeric(form.costPerBottle) :
        (mode === 'equipment' || mode === 'tool') ? numeric(form.price || form.cost) :
          numeric(form.costPerItem);
      
      const qty = mode === 'chemical' ? numeric(form.currentStock) : numeric(form.quantity);
      const totalCost = unitCost * qty;

      const isNew = !form.id; // Track if this is a new purchase
      const id = form.id || crypto.randomUUID();

      console.log(`[UnifiedInventoryModal] Saving ${mode}:`, { id, isNew, name: form.name, quantity: qty, unitCost, totalCost });

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
          dilutionRatios: form.dilutionRatios,
        };

        // Import inventory-data at top of file
        const { saveChemical } = await import("@/lib/inventory-data");
        await saveChemical(payload, isNew);

      } else if (mode === 'equipment' || mode === 'tool') {
        const payload = {
          id,
          name: form.name.trim(),
          category: form.category || 'General', // FIXED: include category
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

        console.log('[UnifiedInventoryModal] Supplies/Material Payload:', payload);

        const { saveMaterial } = await import("@/lib/inventory-data");
        const result = await saveMaterial(payload, isNew);
        console.log('[UnifiedInventoryModal] saveMaterial database response:', result);
      }

      // Invalidate session cache so InventoryControl re-fetches fresh data
      // (prevents stale localforage from overwriting the new imageUrl on the cards)
      sessionStorage.removeItem('inventory-loaded');

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
              amount: totalCost,
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
      
      // EXPLICITLY clear recovery drafts on success to prevent 'ghosting'
      localStorage.removeItem('pending_inventory_form');
      localStorage.removeItem('pending_inventory_form_active');
      recoveredRef.current = false;

      if (onSaved) {
        console.log('[UnifiedInventoryModal] Notifying parent to refresh data...');
        await onSaved();
      }

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

  const handleDelete = async () => {
    if (!form.id) return;

    if (isDemoMode) {
      toast.error("Training Mode: Record deletion is disabled.");
      onOpenChange(false);
      return;
    }

    if (!window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) return;

    try {
      if (mode === 'chemical') {
        const { deleteChemical } = await import("@/lib/inventory-data");
        await deleteChemical(form.id);
      } else if (mode === 'equipment' || mode === 'tool') {
        const { deleteTool } = await import("@/lib/inventory-data");
        await deleteTool(form.id);
      } else {
        const { deleteMaterial } = await import("@/lib/inventory-data");
        await deleteMaterial(form.id);
      }
      
      toast.success("Item deleted successfully");
      onOpenChange(false);
      onSaved?.();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete item: " + (error.message || "Unknown error"));
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
          {(form.updatedAt || form.createdAt) && (
            <div className="absolute top-6 right-10 text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700/50">
              {form.updatedAt ? `Last Updated: ${new Date(form.updatedAt).toLocaleString()}` : `Created: ${new Date(form.createdAt!).toLocaleString()}`}
            </div>
          )}
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
              
              <div className="absolute -bottom-1 -right-1 flex gap-1">
                {/* GALLERY BUTTON */}
                <button
                  type="button"
                  disabled={isUploading}
                  title="Upload from library"
                  className={`rounded-full p-1.5 border-2 border-zinc-900 cursor-pointer shadow-lg transition-colors ${isUploading ? 'bg-zinc-700 cursor-not-allowed opacity-50' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white'}`}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    photoRef.current?.click(); 
                  }}
                >
                  <Upload className="h-3 w-3" />
                </button>

                {/* CAMERA BUTTON */}
                <button
                  type="button"
                  disabled={isUploading}
                  title="Take new photo"
                  className={`rounded-full p-1.5 border-2 border-zinc-900 cursor-pointer shadow-lg transition-colors ${isUploading ? 'bg-zinc-700 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    // Pre-save state just before triggering camera
                    localStorage.setItem('pending_inventory_form', JSON.stringify({
                      form,
                      mode,
                      customCategory,
                      customSubtype,
                      customUnit
                    }));
                    localStorage.setItem('pending_inventory_form_active', 'true');
                    photoCameraRef.current?.click(); 
                  }}
                >
                  {isUploading ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3" />
                  )}
                </button>
              </div>
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
                    {!customCategory ? (
                      <select
                        value={categoryOptions.supply.includes(form.category) ? form.category : "Custom"}
                        onChange={(e) => {
                          if (e.target.value === "Custom") {
                            setCustomCategory(true);
                            setForm({ ...form, category: "" });
                          } else {
                            setForm({ ...form, category: e.target.value });
                          }
                        }}
                        className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                      >
                        <option value="">Select category...</option>
                        {categoryOptions.supply.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                          className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                          placeholder="Enter custom category..."
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCustomCategory(false);
                            setForm({ ...form, category: "Other" });
                          }}
                          className="h-9 px-3 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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
                  {!customCategory ? (
                    <select
                      value={categoryOptions.equipment.includes(form.category) ? form.category : "Custom"}
                      onChange={(e) => {
                        if (e.target.value === "Custom") {
                          setCustomCategory(true);
                          setForm({ ...form, category: "" });
                        } else {
                          setForm({ ...form, category: e.target.value });
                        }
                      }}
                      className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                    >
                      <option value="">Select category...</option>
                      {categoryOptions.equipment.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                        placeholder="Enter custom category..."
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCustomCategory(false);
                          setForm({ ...form, category: "Other" });
                        }}
                        className="h-9 px-3 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
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
                    <Label className="text-xs text-zinc-400">Cost per Bottle</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.costPerBottle}
                      onChange={(e) => setForm({ ...form, costPerBottle: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                    />
                    <div className="mt-1 text-[10px] text-zinc-500 flex justify-between font-bold uppercase tracking-tight">
                      <span>Total Value:</span>
                      <span className="text-emerald-400 font-black">
                        ${(numeric(form.costPerBottle) * numeric(form.currentStock)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
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
                    <Label className="text-xs text-zinc-400">Price / Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value, cost: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                    />
                    <div className="mt-1 text-[10px] text-zinc-500 flex justify-between font-bold uppercase tracking-tight">
                      <span>Total Worth:</span>
                      <span className="text-emerald-400 font-black">
                        ${(numeric(form.price) * numeric(form.quantity)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
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
                    <Label className="text-xs text-zinc-400">Cost per Item</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.costPerItem}
                      onChange={(e) => setForm({ ...form, costPerItem: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm"
                    />
                    <div className="mt-1 text-[10px] text-zinc-500 flex justify-between font-bold uppercase tracking-tight">
                      <span>Total Cost:</span>
                      <span className="text-emerald-400 font-black">
                        ${(numeric(form.costPerItem) * numeric(form.quantity)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
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
          </div>

          {/* Dilution Ratios Section */}
          {mode === 'chemical' && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-center justify-between border-b border-blue-900/30 pb-2 mb-3">
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <Beaker className="w-4 h-4" /> Dilution Ratios
                </h3>
                {form.chemicalLibraryId && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => syncFromLibrary(form.chemicalLibraryId!)}
                    className="text-[10px] text-blue-400 p-0 h-auto"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Force Sync
                  </Button>
                )}
              </div>

              {/* Link Status & Actions */}
              <div className="mb-4 bg-zinc-900/50 p-3 rounded border border-zinc-700/50">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <Label className="text-[10px] text-zinc-400 uppercase mb-1 block font-bold">Linked Knowledge Card</Label>
                    {form.chemicalLibraryId ? (
                      <div className="flex items-center gap-2 group">
                        <span className="text-sm text-yellow-500 font-semibold truncate">
                          {libraryOptions.find(l => l.id === form.chemicalLibraryId)?.brand} - {libraryOptions.find(l => l.id === form.chemicalLibraryId)?.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            onOpenChange(false);
                            window.dispatchEvent(new CustomEvent('open-chemical-detail', { detail: form.chemicalLibraryId }));
                          }}
                          className="h-5 w-5 text-zinc-500 hover:text-white"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-500 italic">Not linked to a library card.</span>
                    )}
                  </div>
                  
                  {(!form.dilutionRatios || form.dilutionRatios.length === 0) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const template = generateTemplate(form.name, 'Exterior');
                        if (template.dilution_ratios) {
                          setForm(f => ({ ...f, dilutionRatios: [...template.dilution_ratios!] }));
                          toast.success("AI suggested ratios for this product type.");
                        }
                      }}
                      className="h-8 text-[10px] bg-blue-900/20 border-blue-800/50 text-blue-300 hover:bg-blue-900/40"
                    >
                      <Sparkles className="h-3 w-3 mr-1" /> AI Lookup
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {form.dilutionRatios?.map((ratio, idx) => (
                  <div key={idx} className="flex gap-2 items-start bg-zinc-900 p-2 rounded border border-zinc-700/50">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500 uppercase">Method</Label>
                        <Input 
                          value={ratio.method} 
                          onChange={e => updateDilution(idx, 'method', e.target.value)} 
                          className="h-8 text-sm bg-zinc-800 border-zinc-700" 
                          placeholder="Spray, Foam..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500 uppercase">Ratio</Label>
                        <Input 
                          value={ratio.ratio} 
                          onChange={e => updateDilution(idx, 'ratio', e.target.value)} 
                          className="h-8 text-sm bg-zinc-800 border-zinc-700 font-bold text-blue-300" 
                          placeholder="1:10, 1oz/gal..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500 uppercase">Soil Level</Label>
                        <Input 
                          value={ratio.soil_level} 
                          onChange={e => updateDilution(idx, 'soil_level', e.target.value)} 
                          className="h-8 text-sm bg-zinc-800 border-zinc-700" 
                          placeholder="General, Heavy..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500 uppercase">Notes</Label>
                        <Input 
                          value={ratio.notes} 
                          onChange={e => updateDilution(idx, 'notes', e.target.value)} 
                          className="h-8 text-sm bg-zinc-800 border-zinc-700" 
                          placeholder="Specific tips..."
                        />
                      </div>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => removeDilution(idx)} 
                      className="mt-5 hover:text-red-500 h-8 w-8 text-zinc-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {(!form.dilutionRatios || form.dilutionRatios.length === 0) && (
                  <p className="text-xs text-zinc-500 italic">No dilution ratios defined for this inventory item.</p>
                )}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={addDilution} 
                  className="mt-2 border-dashed border-zinc-700 text-zinc-400 hover:text-white"
                >
                  <PlusIcon className="w-3 h-3 mr-2" /> Add Ratio
                </Button>
              </div>
            </div>
          )}

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
        <DialogFooter className="p-6 pt-4 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between gap-2 mt-auto">
          <div className="flex gap-2">
            {form.id && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="bg-red-900/40 border border-red-800 text-red-400 hover:bg-red-800 hover:text-white"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => { try { window.location.href = '/reports?tab=inventory'; } catch { } }}
              className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            >
              View Inventory Report
            </Button>
          </div>
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
