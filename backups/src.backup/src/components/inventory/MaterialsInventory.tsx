import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Printer, Save } from "lucide-react";
import localforage from "localforage";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { markViewed } from "@/lib/viewTracker";
import api from "@/lib/api";
import UnifiedInventoryModal from "@/components/inventory/UnifiedInventoryModal";

interface MaterialItem {
  id: string;
  name: string;
  category: string; // Rag, Brush, Tool, Other
  subtype?: string; // e.g., microfiber size or brush type
  quantity: number;
  costPerItem?: number;
  notes?: string;
  lowThreshold?: number;
  createdAt: string;
}

export default function MaterialsInventory() {
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialItem | null>(null);
  // Using UnifiedInventoryModal; local form state removed

  useEffect(() => { load(); }, []);

  const load = async () => {
    const list = (await localforage.getItem<MaterialItem[]>("materials")) || [];
    setItems(list);
  };

  const saveList = async (list: MaterialItem[]) => {
    await localforage.setItem("materials", list);
    setItems(list);
  };

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (item: MaterialItem) => {
    setEditing(item);
    setModalOpen(true);
  };

  // Save handled inside UnifiedInventoryModal; refresh list on onSaved

  // Restore helpers used by the previous working version
  const loadMaterials = async () => {
    await load();
  };

  const saveMaterial = async (newMaterial: any) => {
    const list = (await localforage.getItem<MaterialItem[]>("materials")) || [];
    const data: MaterialItem = {
      id: newMaterial.id,
      name: String(newMaterial.name || "").trim(),
      category: String(newMaterial.category || "Rag"),
      subtype: newMaterial.subtype || "",
      quantity: parseInt(newMaterial.quantity) || 0,
      costPerItem: newMaterial.costPerItem ? parseFloat(newMaterial.costPerItem) : undefined,
      notes: newMaterial.notes || undefined,
      lowThreshold: newMaterial.lowThreshold ? parseInt(newMaterial.lowThreshold) : undefined,
      createdAt: new Date().toISOString(),
    };
    const next = [...list, data];
    await localforage.setItem("materials", next);
    setItems(next);
  };

  const printOrSave = (download = false) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Materials Inventory", 20, 20);
    let y = 35;
    doc.setFontSize(11);
    items.forEach((i) => {
      const cost = i.costPerItem ? `$${i.costPerItem.toFixed(2)}` : "-";
      doc.text(`${i.name} | ${i.category} | ${i.subtype || "-"} | Qty: ${i.quantity} | ${cost}`, 20, y);
      y += 7;
      if (y > 280) { doc.addPage(); y = 20; }
    });
    if (download) doc.save("materials-inventory.pdf"); else window.open(doc.output('bloburl'), '_blank');
  };

  return (
    <Card className="p-6 bg-gradient-card border-border">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-foreground">Materials Inventory</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => printOrSave(false)}><Printer className="h-4 w-4 mr-2" />Print</Button>
          <Button variant="outline" onClick={() => printOrSave(true)}><Save className="h-4 w-4 mr-2" />Save PDF</Button>
          <Button onClick={openAdd} className="bg-gradient-hero"><Plus className="h-4 w-4 mr-2" />Add Item</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="hidden md:table-cell">Subtype/Size</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead className="hidden md:table-cell">Cost</TableHead>
            <TableHead className="hidden md:table-cell">Threshold</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(i => (
            <TableRow key={i.id} className="cursor-pointer" onClick={() => { markViewed("inventory", i.id); openEdit(i); }}>
              <TableCell className="font-medium">{i.name}</TableCell>
              <TableCell className="hidden md:table-cell">{i.category}</TableCell>
              <TableCell className="hidden md:table-cell">{i.subtype || "-"}</TableCell>
              <TableCell>{i.quantity}</TableCell>
              <TableCell className="hidden md:table-cell">{i.costPerItem ? `$${i.costPerItem.toFixed(2)}` : "-"}</TableCell>
              <TableCell className="hidden md:table-cell">{typeof i.lowThreshold === 'number' ? i.lowThreshold : '-'}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No materials added yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <UnifiedInventoryModal
        mode="material"
        open={modalOpen}
        onOpenChange={setModalOpen}
        initial={editing || null}
        onSaved={async () => { await load(); }}
      />
    </Card>
  );
}
