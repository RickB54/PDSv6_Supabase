import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import localforage from "localforage";

type Mode = 'chemical' | 'material';

interface ChemicalForm {
  id?: string;
  name: string;
  bottleSize: string;
  costPerBottle: string; // numeric string
  currentStock: string; // numeric string
  threshold: string; // numeric string
}

interface MaterialForm {
  id?: string;
  name: string;
  category: string;
  subtype: string;
  quantity: string; // numeric string
  costPerItem: string; // numeric string
  notes: string;
  threshold: string; // maps to lowThreshold
}

type Props = {
  mode: Mode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<ChemicalForm & MaterialForm> | null;
  onSaved?: () => Promise<void> | void;
};

export default function UnifiedInventoryModal({ mode, open, onOpenChange, initial, onSaved }: Props) {
  const [form, setForm] = useState<ChemicalForm & MaterialForm>({
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
  });

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
      });
    }
  }, [initial, open, mode]);

  const numeric = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const save = async () => {
    try {
      if (!form.name.trim()) {
        toast.error("Name is required");
        return;
      }
      const id = form.id || `${mode}-${Date.now()}`;
      if (mode === 'chemical') {
        const payload = {
          id,
          name: form.name.trim(),
          bottleSize: form.bottleSize.trim(),
          costPerBottle: numeric(form.costPerBottle),
          currentStock: Math.round(numeric(form.currentStock)),
          threshold: Math.round(numeric(form.threshold) || 2),
        };
        try {
          await api('/api/inventory/chemicals', { method: 'POST', body: JSON.stringify(payload) });
        } catch (err) {
          const list = (await localforage.getItem<any[]>("chemicals")) || [];
          const existsIdx = list.findIndex((c) => c.id === id);
          if (existsIdx >= 0) list[existsIdx] = payload; else list.push(payload);
          await localforage.setItem("chemicals", list);
        }
      } else {
        const payload = {
          id,
          name: form.name.trim(),
          category: form.category || 'Other',
          subtype: form.subtype || "",
          quantity: Math.round(numeric(form.quantity)),
          costPerItem: form.costPerItem ? numeric(form.costPerItem) : undefined,
          notes: form.notes || undefined,
          lowThreshold: form.threshold ? Math.round(numeric(form.threshold)) : undefined,
          createdAt: new Date().toISOString(),
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
          <DialogTitle>{mode === 'chemical' ? (form.id ? 'Edit Chemical' : 'Add Chemical') : (form.id ? 'Edit Material' : 'Add Material')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
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
                  <Label>Cost per Bottle</Label>
                  <Input type="number" step="0.01" value={form.costPerBottle} onChange={(e) => setForm({ ...form, costPerBottle: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Current Stock</Label>
                  <Input type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} />
                </div>
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
                  <Label>Cost per Item</Label>
                  <Input type="number" step="0.01" value={form.costPerItem} onChange={(e) => setForm({ ...form, costPerItem: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label>Low Inventory Threshold</Label>
            <Input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { try { window.location.href = '/reports?tab=inventory'; } catch {} }}>View Inventory Report</Button>
          <Button onClick={save} className="bg-gradient-hero">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
