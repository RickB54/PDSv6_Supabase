import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, AlertTriangle, Printer, Save, Trash2, TrendingUp, Package, ChevronDown, ChevronUp, FileText, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { pushAdminAlert } from "@/lib/adminAlerts";
import { useAlertsStore } from "@/store/alerts";
import localforage from "localforage";
import api from "@/lib/api";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import UnifiedInventoryModal from "@/components/inventory/UnifiedInventoryModal";
import ImportWizardModal from "@/components/inventory/ImportWizardModal";
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
  toolId?: string;
  toolName?: string;
  serviceName: string;
  date: string;
  remainingStock?: number;
  amountUsed?: string | number;
  notes?: string;
}

interface Tool {
  id: string;
  name: string;
  warranty: string;
  purchaseDate: string;
  price: number;
  lifeExpectancy: string;
  notes: string;
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
  const [tools, setTools] = useState<Tool[]>([]);
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'chemical' | 'material' | 'tool'>('chemical');
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
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [importWizardTab, setImportWizardTab] = useState<"chemicals" | "tools" | "materials">("chemicals");

  // Usage Edit State
  const [usageEditOpen, setUsageEditOpen] = useState(false);
  const [usageEditItem, setUsageEditItem] = useState<UsageHistory | null>(null);
  const [usageEditNotes, setUsageEditNotes] = useState("");

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
    const tls = (await localforage.getItem<Tool[]>("tools")) || [];
    const usage = (await localforage.getItem<UsageHistory[]>("chemical-usage")) || [];
    const toolUsage = (await localforage.getItem<UsageHistory[]>("tool-usage")) || [];
    const allUsage = [...usage, ...toolUsage].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setChemicals(chems);
    setMaterials(mats);
    setTools(tls);
    setUsageHistory(allUsage);
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

  const openAddTool = () => {
    setEditing(null);
    setModalMode('tool');
    setModalOpen(true);
  };

  const openEdit = (item: any, mode: 'chemical' | 'material' | 'tool') => {
    setEditing(item);
    setModalMode(mode);
    setModalOpen(true);
  };

  // Save handled inside UnifiedInventoryModal; refresh list on onSaved

  const handleDelete = async (id: string, mode: 'chemical' | 'material' | 'tool', itemName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`);
    if (!confirmed) return;

    if (mode === 'chemical') {
      const updated = chemicals.filter(c => c.id !== id);
      await saveChemicals(updated);
      toast({ title: "Chemical Deleted", description: `${itemName} removed from inventory.` });
    } else if (mode === 'material') {
      const updated = materials.filter(m => m.id !== id);
      await localforage.setItem("materials", updated);
      setMaterials(updated);
      toast({ title: "Material Deleted", description: `${itemName} removed from inventory.` });
    } else {
      const updated = tools.filter(t => t.id !== id);
      await localforage.setItem("tools", updated);
      setTools(updated);
      toast({ title: "Tool Deleted", description: `${itemName} removed from inventory.` });
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
    if (dateRange.from) passRange = d >= new Date(dateRange.from.setHours(0, 0, 0, 0));
    if (passRange && dateRange.to) passRange = d <= new Date(dateRange.to.setHours(23, 59, 59, 999));

    return passQuick && passRange;
  };

  const filteredHistory = usageHistory.filter(filterByDate);

  const lowStockChemicals = chemicals.filter(c => c.currentStock <= c.threshold);
  const lowStockMaterials = materials.filter(m => typeof m.lowThreshold === 'number' && m.quantity <= (m.lowThreshold as number));
  const lowStockTotal = lowStockChemicals.length + lowStockMaterials.length;

  // Push admin alert when low inventory changes (dedup by hash incl. quantities)
  // Expanded state for sections
  const [expandedSections, setExpandedSections] = useState({
    chemicals: false,
    materials: false,
    tools: false,
  });

  const toggleSection = (sec: 'chemicals' | 'materials' | 'tools') => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const expandAll = () => setExpandedSections({ chemicals: true, materials: true, tools: true });
  const collapseAll = () => setExpandedSections({ chemicals: false, materials: false, tools: false });

  // Metrics
  const totalItems = chemicals.length + materials.length + tools.length;
  const lowStockCount = chemicals.filter(c => c.currentStock <= c.threshold).length +
    materials.filter(m => typeof m.lowThreshold === 'number' && m.quantity <= (m.lowThreshold || 0)).length;
  // Approximating value if cost exists
  const totalValue =
    chemicals.reduce((acc, c) => acc + (c.costPerBottle || 0) * (c.currentStock || 0), 0) +
    materials.reduce((acc, m) => acc + (m.costPerItem || 0) * (m.quantity || 0), 0) +
    tools.reduce((acc, t) => acc + (t.price || 0), 0);

  // Helper to get formatted fraction/qty string
  const getUsageAmount = (item: any) => {
    if (item.fraction) return item.fraction; // Chemical fraction string
    if (item.amountUsed) {
      const n = Number(item.amountUsed);
      // If small decimal, might be fraction converted
      if (n < 1 && n > 0) return item.fraction || `${(n * 100).toFixed(0)}%`;
      return n.toFixed(1).replace(/\.0$/, '');
    }
    return '-';
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Inventory Control" />

      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">

        {/* Inventory Summary (Top, Non-Collapsible) */}
        <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-blue-500/20 text-blue-400">
                <Package className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Inventory Summary</h2>
                <p className="text-zinc-400 text-sm">Overview of all assets and stock levels</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8 w-full md:w-auto">
              <div className="text-center">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Total Items</p>
                <p className="text-3xl font-bold text-white mt-1">{totalItems}</p>
              </div>
              <div className="text-center border-l border-zinc-700 pl-8">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Total Value</p>
                <p className="text-3xl font-bold text-emerald-400 mt-1">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              </div>
              <div className="text-center border-l border-zinc-700 pl-8 relative">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Low Stock</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <p className={`text-3xl font-bold ${lowStockCount > 0 ? "text-red-500" : "text-zinc-400"}`}>{lowStockCount}</p>
                  {lowStockCount > 0 && <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Global Expand/Collapse Controls */}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>Expand All</Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>Collapse All</Button>
        </div>

        {/* Chemicals Section (Yellow) */}
        <div className="border border-yellow-500/30 rounded-xl overflow-hidden bg-zinc-900/50">
          <div
            className="p-4 bg-yellow-500/10 flex items-center justify-between cursor-pointer hover:bg-yellow-500/15 transition-colors"
            onClick={() => toggleSection('chemicals')}
          >
            <div className="flex items-center gap-3">
              <div className={`h-2 w-2 rounded-full ${chemicals.some(c => c.currentStock <= c.threshold) ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
              <h3 className="text-lg font-semibold text-yellow-100">Chemicals</h3>
              <HelpCircle className="h-4 w-4 text-zinc-400 hover:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: 'inventory-chemicals' })); }} />
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{chemicals.length} items</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <div className="hidden sm:block">
                <span className="mr-4">Value: <span className="text-zinc-200">${chemicals.reduce((a, c) => a + (c.costPerBottle * c.currentStock), 0).toFixed(0)}</span></span>
                {chemicals.some(c => c.currentStock <= c.threshold) && (
                  <span className="text-red-400 font-medium flex items-center gap-1 inline-flex">
                    <AlertTriangle className="h-3 w-3" /> {chemicals.filter(c => c.currentStock <= c.threshold).length} Low
                  </span>
                )}
              </div>
              {expandedSections.chemicals ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>

          {expandedSections.chemicals && (
            <div className="p-4 border-t border-yellow-500/10 animate-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  <Button size="sm" onClick={openAddChemical} className="bg-yellow-600 hover:bg-yellow-500 text-white border-0"><Plus className="h-3 w-3 mr-1" /> Add Chemical</Button>
                  <Button size="sm" variant="outline" onClick={() => { setImportWizardTab("chemicals"); setImportWizardOpen(true); }}><Package className="h-3 w-3 mr-1" /> Import</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-yellow-500/20">
                      <TableHead>Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Cost/Unit</TableHead>
                      <TableHead>Stock Level</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chemicals.map(c => (
                      <TableRow key={c.id} className="border-yellow-500/10 hover:bg-yellow-500/5">
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.bottleSize}</TableCell>
                        <TableCell>${c.costPerBottle.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${c.currentStock <= c.threshold ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {c.currentStock} remaining
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(c, 'chemical')} className="h-8 w-8 p-0"><FileText className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id, 'chemical', c.name)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {chemicals.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No chemicals tracked.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Materials Section (Blue) */}
        <div className="border border-blue-500/30 rounded-xl overflow-hidden bg-zinc-900/50">
          <div
            className="p-4 bg-blue-500/10 flex items-center justify-between cursor-pointer hover:bg-blue-500/15 transition-colors"
            onClick={() => toggleSection('materials')}
          >
            <div className="flex items-center gap-3">
              <div className={`h-2 w-2 rounded-full ${materials.some(m => typeof m.lowThreshold === 'number' && m.quantity <= m.lowThreshold) ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
              <h3 className="text-lg font-semibold text-blue-100">Materials</h3>
              <HelpCircle className="h-4 w-4 text-zinc-400 hover:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: 'inventory-materials' })); }} />
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{materials.length} items</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <div className="hidden sm:block">
                <span className="mr-4">Value: <span className="text-zinc-200">${materials.reduce((a, m) => a + ((m.costPerItem || 0) * (m.quantity || 0)), 0).toFixed(0)}</span></span>
                {materials.some(m => typeof m.lowThreshold === 'number' && m.quantity <= m.lowThreshold) && (
                  <span className="text-red-400 font-medium flex items-center gap-1 inline-flex">
                    <AlertTriangle className="h-3 w-3" /> {materials.filter(m => typeof m.lowThreshold === 'number' && m.quantity <= m.lowThreshold).length} Low
                  </span>
                )}
              </div>
              {expandedSections.materials ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>

          {expandedSections.materials && (
            <div className="p-4 border-t border-blue-500/10 animate-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  <Button size="sm" onClick={openAddMaterial} className="bg-blue-600 hover:bg-blue-500 text-white border-0"><Plus className="h-3 w-3 mr-1" /> Add Material</Button>
                  <Button size="sm" variant="outline" onClick={() => { setImportWizardTab("materials"); setImportWizardOpen(true); }}><Package className="h-3 w-3 mr-1" /> Import</Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-blue-500/20">
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Cost/Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map(m => (
                    <TableRow key={m.id} className="border-blue-500/10 hover:bg-blue-500/5">
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.category}</TableCell>
                      <TableCell>${(m.costPerItem || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${typeof m.lowThreshold === 'number' && m.quantity <= m.lowThreshold ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/10 text-blue-400'}`}>
                          {m.quantity} units
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m, 'material')} className="h-8 w-8 p-0"><FileText className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id, 'material', m.name)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {materials.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No materials tracked.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Tools Section (Purple) */}
        <div className="border border-purple-500/30 rounded-xl overflow-hidden bg-zinc-900/50">
          <div
            className="p-4 bg-purple-500/10 flex items-center justify-between cursor-pointer hover:bg-purple-500/15 transition-colors"
            onClick={() => toggleSection('tools')}
          >
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              <h3 className="text-lg font-semibold text-purple-100">Tools</h3>
              <HelpCircle className="h-4 w-4 text-zinc-400 hover:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-help', { detail: 'inventory-tools' })); }} />
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{tools.length} items</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <div className="hidden sm:block">
                <span className="mr-4">Value: <span className="text-zinc-200">${tools.reduce((a, t) => a + (t.price || 0), 0).toFixed(0)}</span></span>
              </div>
              {expandedSections.tools ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>

          {expandedSections.tools && (
            <div className="p-4 border-t border-purple-500/10 animate-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  <Button size="sm" onClick={openAddTool} className="bg-purple-600 hover:bg-purple-500 text-white border-0"><Plus className="h-3 w-3 mr-1" /> Add Tool</Button>
                  <Button size="sm" variant="outline" onClick={() => { setImportWizardTab("tools"); setImportWizardOpen(true); }}><Package className="h-3 w-3 mr-1" /> Import</Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-purple-500/20">
                    <TableHead>Name</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tools.map(t => (
                    <TableRow key={t.id} className="border-purple-500/10 hover:bg-purple-500/5">
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.purchaseDate ? new Date(t.purchaseDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>${(t.price || 0).toFixed(2)}</TableCell>
                      <TableCell><span className="text-xs text-muted-foreground truncate max-w-[200px] inline-block">{t.notes}</span></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(t, 'tool')} className="h-8 w-8 p-0"><FileText className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id, 'tool', t.name)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tools.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No tools tracked.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Usage History Section (Updated) */}
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
          <div className="rounded-md border border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-900/50 hover:bg-zinc-900/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Item Used</TableHead>
                  <TableHead>Amount Used</TableHead>
                  <TableHead>Amount Left</TableHead>
                  <TableHead>Service / Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map(item => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-zinc-900/30 cursor-pointer transition-colors border-b border-zinc-800/50"
                    onClick={() => { setUsageEditItem(item); setUsageEditNotes(item.notes || ''); setUsageEditOpen(true); }}
                    title="Click to view/edit notes"
                  >
                    <TableCell className="text-zinc-400 font-mono text-xs">{new Date(item.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${item.chemicalId ? 'text-yellow-400' : item.materialId ? 'text-blue-400' : 'text-purple-400'}`}>
                        {item.chemicalName || item.materialName || item.toolName || 'Unknown Item'}
                      </span>
                    </TableCell>
                    <TableCell>{getUsageAmount(item)}</TableCell>
                    <TableCell>
                      {item.remainingStock !== undefined
                        ? <span className="text-zinc-300 font-mono">{Number(item.remainingStock).toFixed(1).replace(/\.0$/, '')}</span>
                        : <span className="text-zinc-600 italic text-xs">n/a</span>}
                    </TableCell>
                    <TableCell className="text-zinc-300 max-w-[200px]">
                      <div>{item.serviceName}</div>
                      {item.notes && <div className="text-xs text-zinc-500 truncate" title={item.notes}>{item.notes}</div>}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-zinc-500">
                      No usage history found for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

      </main>

      {/* Usage Edit Modal */}
      <Dialog open={usageEditOpen} onOpenChange={setUsageEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Usage Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Service / Reason</Label>
              <p className="font-medium text-white">{usageEditItem?.serviceName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Item</Label>
              <p className="font-medium text-white">{usageEditItem?.chemicalName || usageEditItem?.materialName || usageEditItem?.toolName || 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date</Label>
              <p className="text-sm text-zinc-400">{usageEditItem ? new Date(usageEditItem.date).toLocaleString() : '-'}</p>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={usageEditNotes}
                onChange={(e) => setUsageEditNotes(e.target.value)}
                placeholder="Add details about this usage..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageEditOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!usageEditItem) return;
              const list = (await localforage.getItem<UsageHistory[]>('chemical-usage')) || [];
              const idx = list.findIndex(x => x.id === usageEditItem.id);
              if (idx !== -1) {
                list[idx] = { ...list[idx], notes: usageEditNotes };
                await localforage.setItem('chemical-usage', list);
              } else {
                const toolList = (await localforage.getItem<UsageHistory[]>('tool-usage')) || [];
                const toolIdx = toolList.findIndex(x => x.id === usageEditItem.id);
                if (toolIdx !== -1) {
                  toolList[toolIdx] = { ...toolList[toolIdx], notes: usageEditNotes };
                  await localforage.setItem('tool-usage', toolList);
                }
              }
              await loadData();
              setUsageEditOpen(false);
              toast({ title: 'Usage Updated', description: 'Notes saved.' });
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnifiedInventoryModal
        mode={modalMode}
        open={modalOpen}
        onOpenChange={setModalOpen}
        initial={editing || null}
        onSaved={async () => { await loadData(); }}
      />
      {/* ... keeping other modals ... */}

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
                  {['1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8', '1'].map(f => (<option key={f} value={f}>{f}</option>))}
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
                {employees.map((e: any) => (<option key={e.id || e.email || e.name} value={String(e.id || e.email || e.name)}>{e.name || e.email || e.id}</option>))}
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
              const matName = materials.find(m => m.id === updateMatId)?.name;
              const chemName = chemicals.find(c => c.id === updateChemId)?.name;
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
                if (updateChecklistText) { doc.text('Checklist Items:', 20, y); y += 6; const t = doc.splitTextToSize(updateChecklistText, 170); doc.text(t, 20, y); y += t.length * 6 + 6; }
                if (updateNotes) { doc.text('Notes to Employee:', 20, y); y += 6; const n = doc.splitTextToSize(updateNotes, 170); doc.text(n, 20, y); }
                const dataUrl = doc.output('dataurlstring');
                const fileName = `Admin_Update_Materials_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
                try { const { savePDFToArchive } = await import('@/lib/pdfArchive'); savePDFToArchive('Admin Updates', 'Admin', `materials-update-${Date.now()}`, dataUrl, { fileName, path: 'Admin Updates/' }); } catch { }
              } catch { }

              // Send employee notification
              if (updateEmployee) {
                pushEmployeeNotification(updateEmployee, `Material update: ${(matName || '')}${matName && chemName ? ' & ' : ''}${chemName || ''}. Note: ${updateNotes || '-'}`, { materialId: updateMatId, chemicalId: updateChemId });
              }

              setUpdatesModalOpen(false);
              const params = new URLSearchParams(location.search);
              if (params.has("updates")) navigate(location.pathname, { replace: true });
              setUpdateMatId(''); setUpdateMatQtyNote(''); setUpdateChemId(''); setUpdateChemFraction(''); setUpdateChecklistText(''); setUpdateNotes('');
              toast({ title: 'Update Saved', description: 'Usage history updated and employee notified.' });
            }}>Save Update</Button>
          </DialogFooter>
        </DialogContent>

        {/* Import Wizard Modal */}
        <ImportWizardModal
          open={importWizardOpen}
          onOpenChange={setImportWizardOpen}
          defaultTab={importWizardTab}
          onImportComplete={loadData}
        />

      </Dialog>
    </div>
  );
};

export default InventoryControl;
