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
import { supabase } from "@/lib/supa-data";

type Mode = 'chemical' | 'material' | 'tool';

interface ChemicalForm {
  id?: string;
  name: string;
  bottleSize: string;
  costPerBottle: string; // numeric string - MANDATORY
  currentStock: string; // numeric string
  threshold: string; // numeric string - MANDATORY
  unitOfMeasure: string; // e.g., "oz", "mL"
  consumptionRatePerJob: string; // numeric string - consumption per job
  imageUrl?: string;
}

interface MaterialForm {
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
}

interface ToolForm {
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
}

type Props = {
  mode: Mode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<ChemicalForm & MaterialForm & ToolForm> | null;
  onSaved?: () => Promise<void> | void;
};



export default function UnifiedInventoryModal({ mode, open, onOpenChange, initial, onSaved }: Props) {
  const [form, setForm] = useState<ChemicalForm & MaterialForm & ToolForm>({
    id: undefined,
    name: "",
    bottleSize: "",
    costPerBottle: "",
    currentStock: "0",
    threshold: "0",
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
  });

  const photoRef = useRef<HTMLInputElement>(null);
  const photoCameraRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm((f) => ({
        ...f,
        id: initial.id || f.id,
        name: initial.name || "",
        bottleSize: (initial as any).bottleSize || "",
        costPerBottle: initial?.costPerBottle ? String(initial.costPerBottle) : ((initial as any).costPerBottle || ""),
        currentStock: initial?.currentStock ? String(initial.currentStock) : ((initial as any).currentStock || f.currentStock),
        threshold: (initial as any).threshold ? String((initial as any).threshold) : ((initial as any).lowThreshold ? String((initial as any).lowThreshold) : f.threshold),
        category: (initial as any).category || f.category,
        subtype: (initial as any).subtype || "",
        quantity: initial?.quantity ? String(initial.quantity) : ((initial as any).quantity || f.quantity),
        costPerItem: initial?.costPerItem ? String(initial.costPerItem) : ((initial as any).costPerItem || ""),
        notes: (initial as any).notes || "",
        warranty: (initial as any).warranty || "",
        purchaseDate: (initial as any).purchaseDate || "",
        price: (initial as any).price ? String((initial as any).price) : "",
        lifeExpectancy: (initial as any).lifeExpectancy || "",
        imageUrl: (initial as any).imageUrl || "",
      }));
    } else {
      setForm({
        id: undefined,
        name: "",
        bottleSize: "",
        costPerBottle: "",
        currentStock: "0",
        threshold: mode === 'chemical' ? "2" : "",
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
        unitOfMeasure: mode === 'chemical' ? "oz" : "units",
        consumptionRatePerJob: "0",
        imageUrl: "",
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

        // Compress
        const compressedFile = await browserImageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: true
        });

        // Upload to Supabase Storage
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const filePath = `inventory/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('blog-media') // Reusing bucket as per plan
          .upload(filePath, compressedFile);

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
        mode === 'tool' ? numeric(form.price) :
          numeric(form.costPerItem);
      if (cost <= 0) {
        toast.error("Cost is required and must be greater than 0");
        return;
      }

      // Validate threshold (MANDATORY but can be 0 or -1 for ignore)
      // Allow 0 as valid logic for "alert only when 0"
      if (numeric(form.threshold) < 0) {
        // Technically we can support negative if user wants to disable, but user specifically asked for 0
        // So we just ensure it's not nonsensical.
        // For now, let's allow 0.
      }

      const id = form.id || `${mode}-${Date.now()}`;

      if (mode === 'chemical') {
        const payload = {
          id,
          name: form.name.trim(),
          bottleSize: form.bottleSize.trim(),
          costPerBottle: numeric(form.costPerBottle),
          currentStock: Math.round(numeric(form.currentStock)),
          threshold: Math.round(numeric(form.threshold)), // Removed || 2 fallback to allow 0
          unitOfMeasure: form.unitOfMeasure || "oz",
          consumptionRatePerJob: numeric(form.consumptionRatePerJob),
          imageUrl: form.imageUrl,
        };
        try {
          // Check if api is available/configured, otherwise fallback to local
          // For now, chemicals use API primarily but fallback to local
          try {
            await api('/api/inventory/chemicals', { method: 'POST', body: JSON.stringify(payload) });
          } catch {
            // Fallback
            throw new Error("API unavailable");
          }
        } catch (err) {
          const list = (await localforage.getItem<any[]>("chemicals")) || [];
          const existsIdx = list.findIndex((c) => c.id === id);
          if (existsIdx >= 0) list[existsIdx] = payload; else list.push(payload);
          await localforage.setItem("chemicals", list);
        }
      } else if (mode === 'tool') {
        const payload = {
          id,
          name: form.name.trim(),
          category: form.category || "Power Tool",
          warranty: form.warranty || "",
          purchaseDate: form.purchaseDate || "",
          price: numeric(form.price),
          cost: numeric(form.price), // alias
          quantity: Math.round(numeric(form.quantity) || 1),
          threshold: Math.round(numeric(form.threshold) || 0),
          lifeExpectancy: form.lifeExpectancy || "",
          notes: form.notes || "",
          unitOfMeasure: form.unitOfMeasure || "units",
          consumptionRatePerJob: numeric(form.consumptionRatePerJob),
          createdAt: new Date().toISOString(),
          imageUrl: form.imageUrl,
        };
        console.log("Saving tool:", payload);
        try {
          // Save to localforage only for now as no API endpoint specified for tools
          const list = (await localforage.getItem<any[]>("tools")) || [];
          const existsIdx = list.findIndex((c) => c.id === id);
          if (existsIdx >= 0) list[existsIdx] = payload; else list.push(payload);
          await localforage.setItem("tools", list);
          console.log("Tool saved to localforage");
        } catch (error) {
          console.error("LocalForage Save Error:", error);
          toast.error("Failed to save tool locally: " + String(error));
          return;
        }

      } else {
        const payload = {
          id,
          name: form.name.trim(),
          category: form.category || 'Other',
          subtype: form.subtype || "",
          quantity: Math.round(numeric(form.quantity)),
          costPerItem: numeric(form.costPerItem),
          notes: form.notes || undefined,
          lowThreshold: Math.round(numeric(form.threshold)),
          unitOfMeasure: form.unitOfMeasure || "units",
          consumptionRatePerJob: numeric(form.consumptionRatePerJob),
          createdAt: new Date().toISOString(),
          imageUrl: form.imageUrl,
        };
        try {
          await api('/api/inventory/materials', { method: 'POST', body: JSON.stringify(payload) });
        } catch (err) {
          const list = (await localforage.getItem<any[]>("materials")) || [];
          const existsIdx = list.findIndex((c) => c.id === id);
          if (existsIdx >= 0) list[existsIdx] = payload; else list.push(payload);
          await localforage.setItem("materials", list);
        }
      }
      toast.success("Item saved");
      onOpenChange(false);
      await onSaved?.();
    } catch (err: any) {
      toast.error("Save failed: " + (err?.message || String(err)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'chemical' ? (form.id ? 'Edit Chemical' : 'Add Chemical') :
              mode === 'tool' ? (form.id ? 'Edit Tool' : 'Add Tool') :
                (form.id ? 'Edit Material' : 'Add Material')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Image Upload - Always visible at top */}
          <div className="flex justify-center mb-4">
            <div className="relative h-32 w-32 rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900 overflow-hidden flex items-center justify-center cursor-pointer transition-colors"
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
                  <ImageIcon className="h-8 w-8 text-zinc-600 mx-auto mb-1" />
                  <span className="text-xs text-zinc-500">Upload Photo</span>
                </div>
              )}
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <input ref={photoCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            </div>
            {/* Camera Button for Mobile */}
            <div className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-2 border border-zinc-900 cursor-pointer shadow-lg hover:bg-blue-500"
              onClick={(e) => { e.stopPropagation(); photoCameraRef.current?.click(); }}>
              <Camera className="h-4 w-4 text-white" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Item Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          {mode === 'chemical' ? (
            <>
              <div className="space-y-1">
                <Label>Bottle Size</Label>
                <Input value={form.bottleSize} onChange={(e) => setForm({ ...form, bottleSize: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Cost per Bottle *</Label>
                  <Input type="number" step="0.01" value={form.costPerBottle} onChange={(e) => setForm({ ...form, costPerBottle: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label>Current Stock</Label>
                  <Input type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Unit of Measure</Label>
                  <Input value={form.unitOfMeasure} onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })} placeholder="e.g., oz, mL, L" />
                </div>
                <div className="space-y-1">
                  <Label>Consumption per Job</Label>
                  <Input type="number" step="0.01" value={form.consumptionRatePerJob} onChange={(e) => setForm({ ...form, consumptionRatePerJob: e.target.value })} placeholder="e.g., 2" />
                </div>
              </div>
            </>
          ) : mode === 'tool' ? (
            <>
              <div className="space-y-1">
                <Label>Category</Label>
                <select
                  value={form.category || "Power Tool"}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option>Power Tool</option>
                  <option>Hand Tool</option>
                  <option>Equipment</option>
                  <option>Accessory</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Quantity</Label>
                  <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Price / Cost *</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value, cost: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Unit of Measure</Label>
                  <Input value={form.unitOfMeasure} onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })} placeholder="e.g., units, pieces" />
                </div>
                <div className="space-y-1">
                  <Label>Consumption per Job</Label>
                  <Input type="number" step="0.01" value={form.consumptionRatePerJob} onChange={(e) => setForm({ ...form, consumptionRatePerJob: e.target.value })} placeholder="e.g., 1" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Warranty Info</Label>
                  <Input value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })} placeholder="e.g. 2 Years" />
                </div>
                <div className="space-y-1">
                  <Label>Date Purchased</Label>
                  <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Life Expectancy</Label>
                <Input value={form.lifeExpectancy} onChange={(e) => setForm({ ...form, lifeExpectancy: e.target.value })} placeholder="e.g. 5 Years" />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label>Category</Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option>Rag</option>
                  <option>Brush</option>
                  <option>Tool</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Subtype / Size</Label>
                <Input value={form.subtype} onChange={(e) => setForm({ ...form, subtype: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Quantity</Label>
                  <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Cost per Item *</Label>
                  <Input type="number" step="0.01" value={form.costPerItem} onChange={(e) => setForm({ ...form, costPerItem: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Unit of Measure</Label>
                  <Input value={form.unitOfMeasure} onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })} placeholder="e.g., pads, units" />
                </div>
                <div className="space-y-1">
                  <Label>Consumption per Job</Label>
                  <Input type="number" step="0.01" value={form.consumptionRatePerJob} onChange={(e) => setForm({ ...form, consumptionRatePerJob: e.target.value })} placeholder="e.g., 5" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label>Low Inventory Threshold *</Label>
            <Input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} required />
          </div>
        </div>
        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { try { window.location.href = '/reports?tab=inventory'; } catch { } }}>View Inventory Report</Button>
          <Button onClick={save} disabled={isUploading} className="bg-gradient-hero">
            {isUploading ? 'Uploading...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
