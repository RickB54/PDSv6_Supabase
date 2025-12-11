import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, AlertTriangle, Printer, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { pushAdminAlert } from "@/lib/adminAlerts";
import { useAlertsStore } from "@/store/alerts";
import localforage from "localforage";
import api from "@/lib/api";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import UnifiedInventoryModal from "@/components/inventory/UnifiedInventoryModal";
import jsPDF from "jspdf";
import { pushEmployeeNotification } from "@/lib/employeeNotifications";

interface Chemical {
  id: string;
  name: string;
  bottleSize: string;
  costPerBottle: number;
  threshold: number;
  currentStock: number;
}

interface UsageHistory {
  id: string;
  chemicalId?: string;
  chemicalName?: string;
  materialId?: string;
  materialName?: string;
  serviceName: string;
  date: string;
}

const InventoryControl = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  type MaterialItem = {
    id: string;
    name: string;
    category: string;
    subtype?: string;
    quantity: number;
    costPerItem?: number;
    notes?: string;
    lowThreshold?: number;
    createdAt: string;
  };
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'chemical' | 'material'>('chemical');
  const [editing, setEditing] = useState<any | null>(null);
  const [dateFilter, setDateFilter] = useState<"all" | "daily" | "weekly" | "monthly">("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [updatesModalOpen, setUpdatesModalOpen] = useState(false);
  const [autoOpenedFromQuery, setAutoOpenedFromQuery] = useState(false);
  const [updateNotes, setUpdateNotes] = useState("");
  const [updateChecklistText, setUpdateChecklistText] = useState("");
  const [updateEmployee, setUpdateEmployee] = useState<string>("");
  const [updateChemId, setUpdateChemId] = useState<string>("");
  const [updateChemFraction, setUpdateChemFraction] = useState<string>("");
  const [updateMatId, setUpdateMatId] = useState<string>("");
  const [updateMatQtyNote, setUpdateMatQtyNote] = useState<string>("");
  const [employees, setEmployees] = useState<any[]>([]);
  // Using UnifiedInventoryModal; local form state removed

  useEffect(() => {
    loadData();
    // Persist date filter
    const saved = localStorage.getItem('inventory-date-filter');
    if (saved) setDateFilter(saved as any);
    (async () => {
      const emps = (await localforage.getItem('company-employees')) || [];
      setEmployees(emps as any[]);
    })();
  }, []);

  // Auto-open Material Updates modal ONCE when `?updates=true` or `?updates` is present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const flag = params.get("updates");
    const shouldOpen = flag === "true" || flag === "1" || (flag === null && params.has("updates"));
    if (shouldOpen && !autoOpenedFromQuery) {
      setUpdatesModalOpen(true);
      setAutoOpenedFromQuery(true);
    }
  }, [location.search, autoOpenedFromQuery]);

  useEffect(() => {
    localStorage.setItem('inventory-date-filter', dateFilter);
  }, [dateFilter]);

  const loadData = async () => {
    const chems = (await localforage.getItem<Chemical[]>("chemicals")) || [];
    const mats = (await localforage.getItem<MaterialItem[]>("materials")) || [];
    const usage = (await localforage.getItem<UsageHistory[]>("chemical-usage")) || [];
    setChemicals(chems);
    setMaterials(mats);
    setUsageHistory(usage);
  };

  const saveChemicals = async (data: Chemical[]) => {
    await localforage.setItem("chemicals", data);
    setChemicals(data);
  };

  const openAddChemical = () => {
    setEditing(null);
    setModalMode('chemical');
    setModalOpen(true);
  };

  const openAddMaterial = () => {
    setEditing(null);
    setModalMode('material');
    setModalOpen(true);
  };

  const openEdit = (item: any, mode: 'chemical' | 'material') => {
    setEditing(item);
    setModalMode(mode);
    setModalOpen(true);
  };

  // Save handled inside UnifiedInventoryModal; refresh list on onSaved

  const handleDelete = async (id: string, mode: 'chemical' | 'material') => {
    if (mode === 'chemical') {
      const updated = chemicals.filter(c => c.id !== id);
      await saveChemicals(updated);
      toast({ title: "Chemical Deleted", description: "Item removed from inventory." });
    } else {
      const updated = materials.filter(m => m.id !== id);
      await localforage.setItem("materials", updated);
      setMaterials(updated);
      toast({ title: "Material Deleted", description: "Item removed from inventory." });
    }
  };

  const filterByDate = (item: UsageHistory) => {
    const d = new Date(item.date);
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    let passQuick = true;
    if (dateFilter === "daily") passQuick = now.getTime() - d.getTime() < dayMs;
    if (dateFilter === "weekly") passQuick = now.getTime() - d.getTime() < 7 * dayMs;
    if (dateFilter === "monthly") passQuick = now.getTime() - d.getTime() < 30 * dayMs;

    let passRange = true;
    if (dateRange.from) passRange = d >= new Date(dateRange.from.setHours(0,0,0,0));
    if (passRange && dateRange.to) passRange = d <= new Date(dateRange.to.setHours(23,59,59,999));

    return passQuick && passRange;
  };

  const filteredHistory = usageHistory.filter(filterByDate);

  const lowStockChemicals = chemicals.filter(c => c.currentStock <= c.threshold);
  const lowStockMaterials = materials.filter(m => typeof m.lowThreshold === 'number' && m.quantity <= (m.lowThreshold as number));
  const lowStockTotal = lowStockChemicals.length + lowStockMaterials.length;

  // Push admin alert when low inventory changes (dedup by hash incl. quantities)
  useEffect(() => {
    // Avoid clearing hash before data loads (arrays empty on first render)
    if (chemicals.length === 0 && materials.length === 0) return;
    try {
      // Include current quantities/stock in the hash so edits re-trigger alerts
      const ids = [
        ...lowStockChemicals.map(c => `c:${c.id}:${c.currentStock}`),
        ...lowStockMaterials.map(m => `m:${m.id}:${m.quantity}`)
      ];
      const hash = ids.sort().join("|");
      const prev = localStorage.getItem('inventory_low_hash') || '';
      // Persist count for sidebar badge
      localStorage.setItem('inventory_low_count', String(ids.length));
      if (hash && hash !== prev) {
        localStorage.setItem('inventory_low_hash', hash);
        const names = [
          ...lowStockMaterials.map(m => m.name),
          ...lowStockChemicals.map(c => c.name)
        ];
        pushAdminAlert(
          'low_inventory',
          `Low inventory: ${ids.length} item(s) below threshold`,
          'system',
          { count: ids.length, items: names, recordType: 'Inventory' }
        );
        // Immediately refresh alert UI
        try { useAlertsStore.getState().refresh(); } catch {}
      }
      // If data loaded and no low inventory, clear hash to allow future alerts
      if (!hash && prev) {
        localStorage.removeItem('inventory_low_hash');
        localStorage.setItem('inventory_low_count', '0');
      }
    } catch {}
  }, [chemicals, materials]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Inventory Control" />
      
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6 animate-fade-in">
          {lowStockTotal > 0 && (
            <Card className="p-4 bg-destructive/10 border-destructive">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">
                  Low Inventory Alert: {lowStockTotal} item(s) below threshold
                </span>
              </div>
              <ul className="mt-2 ml-7 text-sm">
                {[...lowStockMaterials.map(m => ({ id: m.id, label: `${m.name} (${m.category}) - ${m.quantity} remaining` })),
                  ...lowStockChemicals.map(c => ({ id: c.id, label: `${c.name} (Chemical) - ${c.currentStock} remaining` }))]
                  .map(item => (
                    <li key={item.id}>{item.label}</li>
                  ))}
              </ul>
            </Card>
          )}

          <Card className="p-6 bg-gradient-card border-border">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-2xl font-bold text-foreground">Combined Inventory</h2>
              <div className="flex gap-2">
                <Button onClick={openAddMaterial} className="bg-gradient-hero">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Material
                </Button>
                <Button onClick={openAddChemical} className="bg-gradient-hero">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Chemical
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Subtype / Size</TableHead>
                  <TableHead className="hidden md:table-cell">Cost</TableHead>
                  <TableHead>Quantity / Stock</TableHead>
                  <TableHead className="hidden md:table-cell">Threshold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ...materials.map(m => ({
                    id: m.id,
                    type: 'material' as const,
                    name: m.name,
                    subtypeOrSize: m.subtype || '-',
                    cost: typeof m.costPerItem === 'number' ? `$${m.costPerItem.toFixed(2)}` : '-',
                    qtyOrStock: m.quantity,
                    threshold: typeof m.lowThreshold === 'number' ? m.lowThreshold : '-',
                    low: typeof m.lowThreshold === 'number' ? (m.quantity <= (m.lowThreshold as number)) : false,
                    raw: m,
                  })),
                  ...chemicals.map(c => ({
                    id: c.id,
                    type: 'chemical' as const,
                    name: c.name,
                    subtypeOrSize: c.bottleSize,
                    cost: `$${c.costPerBottle.toFixed(2)}`,
                    qtyOrStock: c.currentStock,
                    threshold: c.threshold,
                    low: c.currentStock <= c.threshold,
                    raw: c,
                  })),
                ].map(row => (
                  <TableRow key={`${row.type}-${row.id}`} className="cursor-pointer" onClick={() => openEdit(row.raw, row.type)}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{row.type === 'chemical' ? 'Chemical' : 'Material'}</TableCell>
                    <TableCell className="hidden md:table-cell">{row.subtypeOrSize || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{row.cost}</TableCell>
                    <TableCell className={row.low ? "text-destructive font-bold" : ""}>{row.qtyOrStock}</TableCell>
                    <TableCell className="hidden md:table-cell">{row.threshold as any}</TableCell>
                  </TableRow>
                ))}
                {materials.length + chemicals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No items added yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <Card className="p-6 bg-gradient-card border-border">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-2xl font-bold text-foreground">Usage History</h2>
              <div className="flex gap-2 items-center flex-wrap">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="daily">Today</option>
                  <option value="weekly">This Week</option>
                  <option value="monthly">This Month</option>
                </select>
                <DateRangeFilter value={dateRange} onChange={setDateRange} storageKey="inventory-history-range" />
                <Button variant="outline" onClick={() => setUpdatesModalOpen(true)}>Material Updates</Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Chemical</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Service</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.date).toLocaleString()}</TableCell>
                    <TableCell>{item.chemicalName || '-'}</TableCell>
                    <TableCell>{(item as any).materialName || '-'}</TableCell>
                    <TableCell>{item.serviceName}</TableCell>
                  </TableRow>
                ))}
                {filteredHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No usage history found for the selected period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>

      <UnifiedInventoryModal
        mode={modalMode}
        open={modalOpen}
        onOpenChange={setModalOpen}
        initial={editing || null}
        onSaved={async () => { await loadData(); }}
      />

      {/* Material Updates modal (Usage History) */}
      <Dialog
        open={updatesModalOpen}
        onOpenChange={(open) => {
          setUpdatesModalOpen(open);
          if (!open) {
            const params = new URLSearchParams(location.search);
            if (params.has("updates")) {
              navigate(location.pathname, { replace: true });
            }
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Material Updates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Material</Label>
                <select value={updateMatId} onChange={(e) => setUpdateMatId(e.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select material...</option>
                  {materials.map(m => (<option key={m.id} value={m.id}>{m.name}</option>))}
                </select>
                <Input placeholder="Quantity / Note (e.g., 2 bottles or 3 units)" value={updateMatQtyNote} onChange={(e) => setUpdateMatQtyNote(e.target.value)} className="mt-2" />
              </div>
              <div>
                <Label>Chemical</Label>
                <select value={updateChemId} onChange={(e) => setUpdateChemId(e.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select chemical...</option>
                  {chemicals.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
                <select value={updateChemFraction} onChange={(e) => setUpdateChemFraction(e.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Fraction used</option>
                  {['1/8','1/4','3/8','1/2','5/8','3/4','7/8','1'].map(f => (<option key={f} value={f}>{f}</option>))}
                </select>
              </div>
            </div>
            <div>
              <Label>Checklist Items (text)</Label>
              <Input value={updateChecklistText} onChange={(e) => setUpdateChecklistText(e.target.value)} placeholder="e.g., Prep inspect, Tools gathered, Final pass" />
            </div>
            <div>
              <Label>Notes to Employee</Label>
              <Input value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} placeholder="Provide guidance or feedback" />
            </div>
            <div>
              <Label>Notify Employee</Label>
              <select value={updateEmployee} onChange={(e) => setUpdateEmployee(e.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select employee...</option>
                {employees.map((e:any) => (<option key={e.id || e.email || e.name} value={String(e.id || e.email || e.name)}>{e.name || e.email || e.id}</option>))}
              </select>
            </div>
          </div>
<DialogFooter className="button-group-responsive">
            <Button
              variant="outline"
              onClick={() => {
                setUpdatesModalOpen(false);
                const params = new URLSearchParams(location.search);
                if (params.has("updates")) navigate(location.pathname, { replace: true });
              }}
            >
              Cancel
            </Button>
            <Button className="bg-gradient-hero" onClick={async () => {
              const now = new Date().toISOString();
              const matName = materials.find(m=>m.id===updateMatId)?.name;
              const chemName = chemicals.find(c=>c.id===updateChemId)?.name;
              const record: UsageHistory = {
                id: `u_${Date.now()}`,
                materialId: updateMatId || undefined,
                materialName: matName || undefined,
                chemicalId: updateChemId || undefined,
                chemicalName: chemName || undefined,
                serviceName: 'Material Update',
                date: now,
              };
              const list = (await localforage.getItem<UsageHistory[]>('chemical-usage')) || [];
              list.push(record);
              await localforage.setItem('chemical-usage', list);
              setUsageHistory(list);

              // Generate Admin Updates PDF for archive
              try {
                const doc = new jsPDF();
                doc.setFontSize(16); doc.text('Admin Updates', 20, 20);
                doc.setFontSize(12); doc.text('Material Updates — Usage History', 20, 30);
                let y = 42;
                if (matName) { doc.text(`Material: ${matName} — ${updateMatQtyNote || '-'}`, 20, y); y += 8; }
                if (chemName) { doc.text(`Chemical: ${chemName} — ${updateChemFraction || '-'}`, 20, y); y += 8; }
                if (updateChecklistText) { doc.text('Checklist Items:', 20, y); y += 6; const t = doc.splitTextToSize(updateChecklistText, 170); doc.text(t, 20, y); y += t.length*6 + 6; }
                if (updateNotes) { doc.text('Notes to Employee:', 20, y); y += 6; const n = doc.splitTextToSize(updateNotes, 170); doc.text(n, 20, y); }
                const dataUrl = doc.output('dataurlstring');
                const fileName = `Admin_Update_Materials_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
                try { const { savePDFToArchive } = await import('@/lib/pdfArchive'); savePDFToArchive('Admin Updates', 'Admin', `materials-update-${Date.now()}`, dataUrl, { fileName, path: 'Admin Updates/' }); } catch {}
              } catch {}

              // Send employee notification
              if (updateEmployee) {
                pushEmployeeNotification(updateEmployee, `Material update: ${(matName||'')}${matName&&chemName?' & ':''}${chemName||''}. Note: ${updateNotes || '-'}`, { materialId: updateMatId, chemicalId: updateChemId });
              }

              setUpdatesModalOpen(false);
              const params = new URLSearchParams(location.search);
              if (params.has("updates")) navigate(location.pathname, { replace: true });
              setUpdateMatId(''); setUpdateMatQtyNote(''); setUpdateChemId(''); setUpdateChemFraction(''); setUpdateChecklistText(''); setUpdateNotes('');
              toast({ title: 'Update Saved', description: 'Usage history updated and employee notified.' });
            }}>Save Update</Button>
</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryControl;
