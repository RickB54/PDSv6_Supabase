import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast as uiToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { servicePackages as builtInPackages, addOns as builtInAddOns } from "@/lib/services";
import {
  getPackageMeta,
  setPackageMeta,
  getAllPackageMeta,
  getAllAddOnMeta,
  getAddOnMeta,
  setAddOnMeta,
  getCustomPackages,
  saveCustomPackage,
  deleteCustomPackage,
  getCustomAddOns,
  saveCustomAddOn,
  deleteCustomAddOn,
  postFullSync,
  buildFullSyncPayload,
  getCustomServices,
  addCustomService,
  updateCustomService,
  deleteCustomService,
  postServicesFullSync,
  getPriceChangeHistory,
  logPriceChange,
  PriceChangeRecord,
} from "@/lib/servicesMeta";
import supabase from "@/lib/supabase";
import * as supaPkgs from "@/services/supabase/packages";
import packageBasic from "@/assets/package-basic.jpg";
import packageExpress from "@/assets/package-express.jpg";
import packageExterior from "@/assets/package-exterior.jpg";
import packageInterior from "@/assets/package-interior.jpg";
import packageFull from "@/assets/package-full.jpg";
import packagePremium from "@/assets/package-premium.jpg";
import primeEssentialExt from "@/assets/prime_essential_exterior_v3.png";
import primeEssentialInt from "@/assets/prime_essential_interior_2025.png";
import primeEssentialFull from "@/assets/prime_essential_full_v3.png";
import primeEliteExt from "@/assets/prime_essential_exterior.png";
import primeEliteInt from "@/assets/prime_essential_interior.png";
import primeEliteFull from "@/assets/prime_essential_full_detail.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Trash2, Info, RefreshCw, ShieldAlert, HelpCircle, FileDown, History, Calendar, Clock } from "lucide-react";
import localforage from "localforage";
import { pushAdminAlert } from "@/lib/adminAlerts";
import primeLogo from "@/assets/prime-logo.png";
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import api from "@/lib/api";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { isSupabaseEnabled } from "@/lib/auth";
import * as supaAddOns from "@/services/supabase/addOns";
import { compressImageForUpload } from "@/lib/image-compression";
import { isDemoActive } from "@/lib/supa-data";
import { ServiceComparisonModal } from "@/components/ServiceComparisonModal";
import { cn } from "@/lib/utils";

type Pricing = { compact: number; midsize: number; truck: number; luxury: number };
type PriceMap = Record<string, string>;
const BACKUP_KEY = "savedPrices_backup";
const PERSISTENT_BACKUP_KEY = "savedPrices_restore_point"; // survives Settings → Delete All Data
const ONE_TIME_ORIGINAL_SEED_FLAG = "original_prices_seeded_once";

export default function PackagePricing() {
  const [view, setView] = useState<"packages" | "addons" | "both">("packages");
  const [masterPct, setMasterPct] = useState("");
  const [globalPct, setGlobalPct] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [savedPrices, setSavedPrices] = useState<PriceMap>({});
  const [currentPrices, setCurrentPrices] = useState<PriceMap>({});
  const [pendingVisibilityPkg, setPendingVisibilityPkg] = useState<Record<string, boolean | undefined>>({});
  const [pendingVisibilityAddon, setPendingVisibilityAddon] = useState<Record<string, boolean | undefined>>({});
  const [editServicesFor, setEditServicesFor] = useState<string | null>(null);
  const [editServicesType, setEditServicesType] = useState<'package' | 'addon' | null>(null);
  const [editServicesSelection, setEditServicesSelection] = useState<Record<string, boolean>>({});
  const [customServiceRows, setCustomServiceRows] = useState<Array<{ id: string | null; name: string; checked: boolean }>>([]);
  const [addPackageOpen, setAddPackageOpen] = useState(false);
  const [addAddonOpen, setAddAddonOpen] = useState(false);
  const [newPkgForm, setNewPkgForm] = useState({
    name: "",
    description: "",
    // dynamic pricing inputs keyed by vehicle type id
    pricing: { compact: "", midsize: "", truck: "", luxury: "" } as Record<string, string>,
    imageDataUrl: "",
  });
  const [newAddonForm, setNewAddonForm] = useState({
    name: "",
    // dynamic pricing inputs keyed by vehicle type id
    pricing: { compact: "", midsize: "", truck: "", luxury: "" } as Record<string, string>,
  });
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [comparisonVehicle, setComparisonVehicle] = useState('compact');
  const [comparisonSelection, setComparisonSelection] = useState<Record<string, boolean>>({});
  const [liveSnapshot, setLiveSnapshot] = useState<any>(null);
  const builtInSizes: string[] = ["compact", "midsize", "truck", "luxury"];
  const [vehicleType, setVehicleType] = useState<string>("compact");
  const [vehicleOptions, setVehicleOptions] = useState<string[]>(builtInSizes);
  const [vehicleLabels, setVehicleLabels] = useState<Record<string, string>>({
    compact: "Compact/Sedan (Small cars and sedans)",
    midsize: "Mid-Size/SUV (Mid-size cars and SUVs)",
    truck: "Truck/Van/Large SUV (Trucks, vans, large SUVs)",
    luxury: "Luxury/High-End (Luxury and premium vehicles)",
  });

  const [comparisonMatrixOpen, setComparisonMatrixOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [recentChangesOpen, setRecentChangesOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceChangeRecord[]>([]);

  useEffect(() => {
    setPriceHistory(getPriceChangeHistory());
  }, []);
  
  const refreshHistory = () => {
    setPriceHistory(getPriceChangeHistory());
  };

  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("mode") === "scenario") {
      setComparisonOpen(true);
    }
  }, [searchParams]);

  // Package mode toggle state
  const [packageMode, setPackageMode] = useState<"3-pack" | "6-pack">("6-pack");

  const getKey = (type: "package" | "addon", id: string, size: string) => `${type}:${id}:${size}`;
  const shouldUpdate = (key: string, target: "packages" | "addons" | "both") => {
    if (target === "both") return true;
    if (target === "packages") return key.startsWith("package:");
    if (target === "addons") return key.startsWith("addon:");
    return false;
  };

  const [scenarioProj, setScenarioProj] = useState({ pkg: 0, addon: 0 });
  const [projInput, setProjInput] = useState(""); // Input for projection %

  const getProjectedPrice = (type: 'package' | 'addon', id: string, size: string) => {
    const key = getKey(type, id, size);
    let base = parseFloat(currentPrices[key]) || 0;
    
    // Fallback to built-in/custom definition if not found or 0
    if (base === 0) {
      const item = type === 'package' 
        ? [...builtInPackages, ...getCustomPackages()].find(p => p.id === id)
        : [...builtInAddOns, ...getCustomAddOns()].find(a => a.id === id);
      base = (item?.pricing as any)?.[size] || 0;
    }

    const pct = type === 'package' ? scenarioProj.pkg : scenarioProj.addon;
    if (pct === 0) return base;
    return base * (1 + pct / 100);
  };

  const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ? 'http://localhost:6066/api' : '/api';

  async function getSavedPrices(): Promise<PriceMap> {
    const local = (await localforage.getItem<PriceMap>("savedPrices")) || {};
    try {
      const res = await fetch(`${API_BASE}/packages/prices?v=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") {
          return { ...local, ...data };
        }
      }
    } catch { }
    return local;
  }

  async function getBackupPrices(): Promise<PriceMap> {
    const backup = (await localforage.getItem<PriceMap>(BACKUP_KEY)) || {};
    return backup;
  }

  async function saveBackupPrices(snapshot: PriceMap) {
    await localforage.setItem(BACKUP_KEY, snapshot);
  }

  function seedFromDefinitions(): PriceMap {
    const seeded: PriceMap = {};
    const allPkgs = [...builtInPackages, ...getCustomPackages()];
    allPkgs.forEach(p => {
      seeded[getKey("package", p.id, "compact")] = String(p.pricing.compact);
      seeded[getKey("package", p.id, "midsize")] = String(p.pricing.midsize);
      seeded[getKey("package", p.id, "truck")] = String(p.pricing.truck);
      seeded[getKey("package", p.id, "luxury")] = String(p.pricing.luxury);
    });
    const allAddOns = [...builtInAddOns, ...getCustomAddOns()];
    allAddOns.forEach(a => {
      seeded[getKey("addon", a.id, "compact")] = String(a.pricing.compact);
      seeded[getKey("addon", a.id, "midsize")] = String(a.pricing.midsize);
      seeded[getKey("addon", a.id, "truck")] = String(a.pricing.truck);
      seeded[getKey("addon", a.id, "luxury")] = String(a.pricing.luxury);
    });
    return seeded;
  }

  function getPersistentBackup(): PriceMap {
    try {
      const raw = localStorage.getItem(PERSISTENT_BACKUP_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function savePersistentBackup(snapshot: PriceMap) {
    try {
      localStorage.setItem(PERSISTENT_BACKUP_KEY, JSON.stringify(snapshot));
    } catch { }
  }

  async function saveToBackend(updated: PriceMap) {
    if (isDemoActive()) {
      toast.error("Changes not saved in demo.");
      return;
    }

    try {
      // 1. Local API POST (for non-Supabase environments/fallback)
      await fetch(`${API_BASE}/packages/prices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      // 2. Supabase Strict Sync
      if (isSupabaseEnabled()) {

        const allPkgs = [...builtInPackages, ...getCustomPackages()];
        const pkgRows = allPkgs
          .filter(p => !getPackageMeta(p.id)?.deleted)
          .map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            compact_price: Number(updated[`package:${p.id}:compact`] || p.pricing.compact),
            midsize_price: Number(updated[`package:${p.id}:midsize`] || p.pricing.midsize),
            truck_price: Number(updated[`package:${p.id}:truck`] || p.pricing.truck),
            luxury_price: Number(updated[`package:${p.id}:luxury`] || p.pricing.luxury),
            is_active: (getPackageMeta(p.id)?.visible !== false)
          }));

        const allAddons = [...builtInAddOns, ...getCustomAddOns()];
        const addRows = allAddons
          .filter(a => !getAddOnMeta(a.id)?.deleted)
          .map(a => ({
            id: a.id,
            name: a.name,
            description: (a as any).description || "",
            compact_price: Number(updated[`addon:${a.id}:compact`] || a.pricing.compact),
            midsize_price: Number(updated[`addon:${a.id}:midsize`] || a.pricing.midsize),
            truck_price: Number(updated[`addon:${a.id}:truck`] || a.pricing.truck),
            luxury_price: Number(updated[`addon:${a.id}:luxury`] || a.pricing.luxury),
            is_active: (getAddOnMeta(a.id)?.visible !== false)
          }));

        // DELETE "GHOSTS" (Any ID in Supabase not in our current defined collections)
        try {
          const { data: allSupPkgs } = await supabase.from('packages').select('id');
          const validPkgIds = allPkgs.map(p => p.id);
          const pkgGhosts = (allSupPkgs || []).filter(p => !validPkgIds.includes(p.id));
          if (pkgGhosts.length > 0) {
            for (const g of pkgGhosts) await supaPkgs.remove(g.id);
          }
          const { data: allSupAddons } = await supabase.from('add_ons').select('id');
          const validAddonIds = allAddons.map(a => a.id);
          const addonGhosts = (allSupAddons || []).filter(a => !validAddonIds.includes(a.id));
          if (addonGhosts.length > 0) {
            for (const g of addonGhosts) await supaAddOns.remove(g.id);
          }
        } catch (e) {
          console.error("Strict ghost removal failed", e);
        }

        // UPSERT ALLOWED DATA
        if (pkgRows.length > 0) await supaPkgs.upsert(pkgRows);
        if (addRows.length > 0) await supaAddOns.upsert(addRows);
      }
    } catch (e: any) {
      console.error("saveToBackend failed", e);
      toast.error(`Failed to sync: ${e.message || "Unknown error"}`);
    }
  }

  async function saveToLocalforage(updated: PriceMap) {
    await localforage.setItem("savedPrices", updated);
  }

  // Helper to silently ping backend live API after saves (no new tab)
  const openPackagesLiveInBrowser = async () => {
    try {
      const url = `${API_BASE}/packages/live?v=${Date.now()}`;
      await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
      try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'packages' } })); } catch { }
    } catch { }
  };

  // Soft refresh signal for Website preview without opening tabs
  const forceWebsiteTabRefresh = async () => {
    try {
      await fetch(`${API_BASE}/packages/sync?v=${Date.now()}`, { method: 'POST' });
    } catch { }
    try { localStorage.setItem('force-refresh', String(Date.now())); } catch { }
    try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'website' } })); } catch { }
  };

  // Soft refresh for Book Now preview without opening tabs
  const forceBookNowTabRefresh = async () => {
    try { localStorage.setItem('force-refresh-book', String(Date.now())); } catch { }
    try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'booknow' } })); } catch { }
  };

  const openViewAllPrices = async () => {
    // Use current in-memory state instead of fetching from backend
    const snapshot = {
      savedPrices: currentPrices,
      packageMeta: getAllPackageMeta(),
      addOnMeta: getAllAddOnMeta(),
      customPackages: getCustomPackages(),
      customAddOns: getCustomAddOns(),
    };
    setLiveSnapshot(snapshot);
    setViewAllOpen(true);
  };

  const generateAddOnsListPDF = async () => {
    try {
      const liveAddons: Array<{ id: string; name: string; pricing: { compact: number; midsize: number; truck: number; luxury: number } }> = await api('/api/addons/live', { method: 'GET' }) || [];
      const doc = new jsPDF();
      doc.setTextColor(200, 0, 0);
      doc.setFontSize(18);
      doc.text('Add-Ons List', 20, 20);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      const dateStr = new Date().toLocaleString();
      doc.text(`Date: ${dateStr}`, 20, 28);

      // Table headers
      let y = 40;
      doc.setFontSize(12);
      doc.text('Name', 20, y);
      doc.text('Description', 70, y);
      doc.text('Compact', 120, y);
      doc.text('Midsize', 140, y);
      doc.text('Truck', 160, y);
      doc.text('Luxury', 180, y);
      y += 6;
      doc.setFontSize(11);

      liveAddons.forEach((a) => {
        const desc = String((a as any).description || '—');
        const compact = `$${Number(a.pricing.compact || 0)}`;
        const midsize = `$${Number(a.pricing.midsize || 0)}`;
        const truck = `$${Number(a.pricing.truck || 0)}`;
        const luxury = `$${Number(a.pricing.luxury || 0)}`;
        const nameLines = doc.splitTextToSize(a.name || '', 45);
        const descLines = doc.splitTextToSize(desc, 40);
        const rowHeight = Math.max(nameLines.length, descLines.length) * 5 + 2;
        doc.text(nameLines, 20, y);
        doc.text(descLines, 70, y);
        doc.text(compact, 120, y);
        doc.text(midsize, 140, y);
        doc.text(truck, 160, y);
        doc.text(luxury, 180, y);
        y += rowHeight;
        if (y > 270) { doc.addPage(); y = 20; }
      });

      const pdfDataUrl = doc.output('dataurlstring');
      const today = new Date().toISOString().split('T')[0];
      const fileName = `addons_export_${today}.pdf`;
      savePDFToArchive('add-Ons' as any, 'Admin', 'addons_export', pdfDataUrl, { fileName, path: 'add-Ons/' });
      toast.success('Add-Ons List PDF saved to File Manager');
      try { window.dispatchEvent(new CustomEvent('pdf_archive_updated')); } catch { }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate Add-Ons PDF');
    }
  };

  // Refresh the in-memory live snapshot after a sync so View All reflects latest
  const refreshLiveAfterSync = async () => {
    try {
      const res = await fetch(`${API_BASE}/packages/live?v=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        setLiveSnapshot(data);
      }
    } catch { }
  };

  const liveGetKey = (type: 'package' | 'addon', id: string, size: string) => `${type}:${id}:${size}`;

  const downloadPricesJSON = async () => {
    const now = new Date().toISOString().split('T')[0];
    const payload = {
      savedPrices: liveSnapshot?.savedPrices || (await localforage.getItem<PriceMap>('savedPrices')) || {},
      packageMeta: liveSnapshot?.packageMeta || getAllPackageMeta(),
      addOnMeta: liveSnapshot?.addOnMeta || getAllAddOnMeta(),
      customPackages: liveSnapshot?.customPackages || getCustomPackages(),
      customAddOns: liveSnapshot?.customAddOns || getCustomAddOns(),
      customServices: getCustomServices(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pricing-backup-${now}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPrices = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const snapshot = liveSnapshot;
    const pkgMeta = snapshot?.packageMeta || {};
    const addonMeta = snapshot?.addOnMeta || {};
    const saved = snapshot?.savedPrices || {};
    const visiblePkgs = [...builtInPackages, ...(snapshot?.customPackages || [])].filter(p => (pkgMeta[p.id]?.visible) !== false && !pkgMeta[p.id]?.deleted);
    const visibleAddons = [...builtInAddOns, ...(snapshot?.customAddOns || [])].filter(a => (addonMeta[a.id]?.visible) !== false && !addonMeta[a.id]?.deleted);

    const getPrice = (type: 'package' | 'addon', id: string, size: string) => {
      const key = `${type}:${id}:${size}`;
      const val = saved[key];
      if (val !== undefined && val !== null && val !== "") return { value: parseFloat(val), isOverride: true };

      // Fallback to built-in or custom definition pricing
      const item = type === 'package'
        ? [...builtInPackages, ...(snapshot?.customPackages || [])].find(p => p.id === id)
        : [...builtInAddOns, ...(snapshot?.customAddOns || [])].find(a => a.id === id);

      return { value: (item as any)?.pricing?.[size] || 0, isOverride: false };
    };
    const rowHtml = (name: string, type: 'package' | 'addon', id: string) => {
      const sizes = ['compact', 'midsize', 'truck', 'luxury'];
      const cells = sizes.map(sz => {
        const { value, isOverride } = getPrice(type, id, sz);
        const style = isOverride ? 'color:#dc2626;font-weight:bold;' : '';
        return `<td style="padding:8px;border:1px solid #ddd;text-align:right;${style}">$${value.toFixed(2)}</td>`;
      }).join('');
      
      return `<tr><td style="padding:8px;border:1px solid #ddd">${name}</td>${cells}</tr>`;
    };

    const pkgRows = visiblePkgs.map(p => rowHtml(p.name, 'package', p.id)).join('');
    const addonRows = visibleAddons.map(a => rowHtml(a.name, 'addon', a.id)).join('');
    const today = new Date().toLocaleDateString();

    win.document.write(`
      <html>
        <head>
          <title>Current Live Pricing</title>
          <style>
            body{font-family:Arial, sans-serif; padding:24px;}
            h1{color:#dc2626;}
            table{border-collapse:collapse;width:100%;margin-bottom:20px;}
            th{background:#dc2626;color:white;padding:10px;text-align:right;}
            th:first-child{text-align:left;}
            td{border:1px solid #ddd;padding:8px;text-align:right;}
            td:first-child{text-align:left;}
            tr:nth-child(even){background:#f9f9f9}
          </style>
        </head>
        <body>
          <h1>Current Live Pricing</h1>
          <p>${today}</p>
          <h2>Packages</h2>
          <table><thead><tr><th>Service</th><th>Compact</th><th>Midsize</th><th>Truck</th><th>Luxury</th></tr></thead><tbody>${pkgRows}</tbody></table>
          <h2>Add-Ons</h2>
          <table><thead><tr><th>Service</th><th>Compact</th><th>Midsize</th><th>Truck</th><th>Luxury</th></tr></thead><tbody>${addonRows}</tbody></table>
          <script>window.onload = function(){ window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const downloadPricesPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'p' });
      doc.setTextColor(200, 0, 0);
      doc.setFontSize(20);
      doc.text("Current Live Pricing — Prime Auto Detail", 14, 20);

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

      const snapshot = liveSnapshot;
      const pkgMeta = snapshot?.packageMeta || {};
      const addonMeta = snapshot?.addOnMeta || {};
      const saved = snapshot?.savedPrices || {};
      const visiblePkgs = [...builtInPackages, ...(snapshot?.customPackages || [])].filter(p => (pkgMeta[p.id]?.visible) !== false && !pkgMeta[p.id]?.deleted);
      const visibleAddons = [...builtInAddOns, ...(snapshot?.customAddOns || [])].filter(a => (addonMeta[a.id]?.visible) !== false && !addonMeta[a.id]?.deleted);

      const getPrice = (type: 'package' | 'addon', id: string, size: string) => {
        const key = `${type}:${id}:${size}`;
        const val = saved[key];
        if (val !== undefined && val !== null && val !== "") return { value: parseFloat(val), isOverride: true };

        const item = type === 'package'
          ? [...builtInPackages, ...(snapshot?.customPackages || [])].find(p => p.id === id)
          : [...builtInAddOns, ...(snapshot?.customAddOns || [])].find(a => a.id === id);

        return { value: (item as any)?.pricing?.[size] || 0, isOverride: false };
      };

      let y = 40;
      const xPos = [95, 120, 145, 170]; // Shifted left for portrait

      const checkPageBreak = (needed = 10) => {
        if (y + needed > 280) {
          doc.addPage();
          y = 20;
        }
      };

      const drawHeader = (title: string) => {
        checkPageBreak(20);
        doc.setFontSize(12);
        doc.setTextColor(200, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(title, 14, y);
        y += 8;

        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 6, 182, 8, "F");
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text("Service", 18, y);
        doc.text("Compact", 100, y, { align: 'right' });
        doc.text("Midsize", 125, y, { align: 'right' });
        doc.text("Truck", 150, y, { align: 'right' });
        doc.text("Luxury", 175, y, { align: 'right' });
        doc.setFont("helvetica", "normal");
        y += 10;
      };

      // Packages
      drawHeader("Packages");
      visiblePkgs.forEach(p => {
        checkPageBreak();
        doc.setFontSize(9);
        doc.text(p.name, 18, y);
        vehicleOptions.forEach((v, i) => {
          const { value, isOverride } = getPrice('package', p.id, v);
          if (isOverride) {
            doc.setTextColor(200, 0, 0);
            doc.setFont("helvetica", "bold");
          } else {
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "normal");
          }
          doc.text(`$${value.toFixed(2)}`, xPos[i], y, { align: 'right' });
        });
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        y += 7;
      });

      y += 8;

      // Add-Ons
      drawHeader("Add-Ons");
      visibleAddons.forEach(a => {
        checkPageBreak();
        doc.setFontSize(9);
        doc.text(a.name, 18, y);
        vehicleOptions.forEach((v, i) => {
          const { value, isOverride } = getPrice('addon', a.id, v);
          if (isOverride) {
            doc.setTextColor(200, 0, 0);
            doc.setFont("helvetica", "bold");
          } else {
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "normal");
          }
          doc.text(`$${value.toFixed(2)}`, xPos[i], y, { align: 'right' });
        });
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        y += 7;
      });

      // --- NEW: SERVICE FEATURE COMPARISON MATRIX ---
      doc.addPage();
      y = 20;
      doc.setTextColor(220, 38, 38);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("SERVICE FEATURE COMPARISON", 105, y, { align: "center" });
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Comparison between Essential and Elite package levels across all categories.", 105, y, { align: "center" });
      y += 15;

      const compGroups = [
        {
          title: "Exterior Details",
          packages: builtInPackages.filter(p => p.id.includes("exterior"))
        },
        {
          title: "Interior Details",
          packages: builtInPackages.filter(p => p.id.includes("interior"))
        },
        {
          title: "Full Detail Packages",
          packages: [
            builtInPackages.find(p => p.id === "prime-essential-full"),
            builtInPackages.find(p => p.id === "prime-elite-full")
          ].filter(Boolean) as any[]
        }
      ];

      compGroups.forEach((group) => {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38);
        doc.text(group.title.toUpperCase(), 14, y);
        y += 5;

        const allSteps = Array.from(new Set(group.packages.flatMap(p => p.steps.map(s => s.name))));
        const tableBody = allSteps.flatMap(stepName => {
          const mainRow = [stepName];
          group.packages.forEach(p => {
            mainRow.push(p.steps.some((s: any) => s.name === stepName) ? "YES" : "-");
          });
          const stepObj = group.packages.flatMap(p => p.steps).find((s: any) => s.name === stepName);
          const instructions = stepObj?.instructions || "Perform this step with detailing precision.";
          return [mainRow, [`  > ${instructions}`, ...group.packages.map(() => "")]];
        });

        autoTable(doc, {
          startY: y,
          head: [["FEATURE / STEP", ...group.packages.map(p => p.name.replace("Prime ", ""))]],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontSize: 8 },
          styles: { fontSize: 7, cellPadding: 2 },
          columnStyles: { 0: { cellWidth: 100 }, 1: { halign: 'center' }, 2: { halign: 'center' } },
          didParseCell: (data) => {
            if (data.row.index % 2 !== 0) {
              data.cell.styles.fontStyle = 'italic';
              data.cell.styles.textColor = [100, 100, 100];
              data.cell.styles.fontSize = 6;
            }
          }
        });

        // Update y for next table
        y = (doc as any).lastAutoTable.finalY + 15;
      });

      const fileName = `prime_pricing_list_${new Date().toISOString().split('T')[0]}.pdf`;
      const pdfData = doc.output('datauristring');
      doc.save(fileName);
      savePDFToArchive('Price Sheets' as any, 'Admin', 'live_pricing_list', pdfData, { fileName, path: 'pricing/' });
      toast.success("Pricing PDF Downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    }
  };
  const downloadScenarioPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setTextColor(200, 0, 0);
      doc.setFontSize(22);
      doc.text("Pricing Scenario", 20, 20);

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(12);
      doc.text(`Vehicle: ${vehicleLabels[comparisonVehicle] || comparisonVehicle}`, 20, 30);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 36);

      if (scenarioProj.pkg !== 0 || scenarioProj.addon !== 0) {
        doc.setTextColor(204, 102, 0); // Dark Orange
        doc.setFontSize(10);
        doc.text(`* Includes Hypothetical Projection: Packages ${scenarioProj.pkg > 0 ? '+' : ''}${scenarioProj.pkg}%, Add-Ons ${scenarioProj.addon > 0 ? '+' : ''}${scenarioProj.addon}%`, 20, 42);
      }

      let y = 50;
      let total = 0;
      const prices: number[] = [];
      const pkgs = [...builtInPackages, ...getCustomPackages()];
      const addons = [...builtInAddOns, ...getCustomAddOns()];

      // Headers
      doc.setFillColor(240, 240, 240);
      doc.rect(20, y - 6, 170, 8, "F");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text("Item", 25, y);
      doc.text("Type", 120, y);
      doc.text("Price", 170, y);
      y += 10;

      // Items
      Object.keys(comparisonSelection).forEach(id => {
        if (!comparisonSelection[id]) return;

        let name = "";
        let type = "";
        let price = 0;

        const p = pkgs.find(x => x.id === id);
        if (p) {
          name = p.name;
          type = "Package";
          price = getProjectedPrice('package', id, comparisonVehicle);
        } else {
          const a = addons.find(x => x.id === id);
          if (a) {
            name = a.name;
            type = "Add-On";
            price = getProjectedPrice('addon', id, comparisonVehicle);
          }
        }

        if (name) {
          total += price;
          prices.push(price);
          doc.text(name, 25, y);
          doc.text(type, 120, y);
          doc.text(`$${price.toFixed(2)}`, 170, y);
          y += 8;
        }
      });

      // Footer Logic
      const isComparison = prices.length > 1;
      const diff = isComparison ? Math.max(...prices) - Math.min(...prices) : 0;

      y += 5;
      doc.setDrawColor(200, 0, 0);
      doc.line(20, y, 190, y);
      y += 10;
      doc.setFontSize(16);

      if (isComparison) {
        doc.setTextColor(220, 38, 38); // Red
        doc.text(`Price Difference: $${diff.toFixed(2)}`, 120, y);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("(Max - Min)", 120, y + 5);
      } else {
        doc.setTextColor(0, 150, 0); // Green
        doc.text(`Total Estimate: $${total.toFixed(2)}`, 120, y);
      }

      const fileName = `scenario_${new Date().toISOString().split('T')[0]}.pdf`;
      const pdfData = doc.output('datauristring');
      doc.save(fileName);
      savePDFToArchive('Estimates' as any, 'Admin', 'scenario_estimate', pdfData, { fileName, path: 'estimates/' });
      toast.success("Scenario PDF saved!");
    } catch (e) {
      toast.error("Failed to generate PDF");
    }
  };

  const printScenario = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    let rows = "";
    let total = 0;
    const prices: number[] = [];
    const pkgs = [...builtInPackages, ...getCustomPackages()];
    const addons = [...builtInAddOns, ...getCustomAddOns()];

    const projectionNote = (scenarioProj.pkg !== 0 || scenarioProj.addon !== 0)
      ? `<div style="color: #d97706; font-size: 12px; margin-bottom: 20px;">* Includes Hypothetical Projection: Packages ${scenarioProj.pkg > 0 ? '+' : ''}${scenarioProj.pkg}%, Add-Ons ${scenarioProj.addon > 0 ? '+' : ''}${scenarioProj.addon}%</div>`
      : '';

    Object.keys(comparisonSelection).forEach(id => {
      if (!comparisonSelection[id]) return;
      let name = "";
      let type = "";
      let price = 0;

      const p = pkgs.find(x => x.id === id);
      if (p) {
        name = p.name;
        type = "Package";
        price = getProjectedPrice('package', id, comparisonVehicle);
      } else {
        const a = addons.find(x => x.id === id);
        if (a) {
          name = a.name;
          type = "Add-On";
          price = getProjectedPrice('addon', id, comparisonVehicle);
        }
      }

      if (name) {
        total += price;
        prices.push(price);
        rows += `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px;">${name}</td>
                <td style="padding: 12px; color: #666;">${type}</td>
                <td style="padding: 12px; text-align: right; font-family: monospace;">$${price.toFixed(2)}</td>
              </tr>
            `;
      }
    });

    const isComparison = prices.length > 1;
    const diff = isComparison ? Math.max(...prices) - Math.min(...prices) : 0;

    const footerHtml = isComparison
      ? `<div style="text-align: right; font-size: 24px; font-weight: bold; color: #dc2626; border-top: 2px solid #dc2626; padding-top: 20px;">
             Price Difference: $${diff.toFixed(2)}
             <div style="font-size: 14px; color: #666; font-weight: normal; margin-top: 4px;">(Max - Min)</div>
           </div>`
      : `<div style="text-align: right; font-size: 24px; font-weight: bold; color: #059669; border-top: 2px solid #ddd; padding-top: 20px;">
             Total Estimate: $${total.toFixed(2)}
           </div>`;

    win.document.write(`
      <html>
        <head>
          <title>Pricing Scenario Quote</title>
          <style>
            body { font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #dc2626; margin-bottom: 5px; }
            .meta { color: #666; margin-bottom: 30px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 12px; background: #f9f9f9; border-bottom: 2px solid #dc2626; }
          </style>
        </head>
        <body>
          <h1>Pricing Scenario Quote</h1>
          <div class="meta">
            Generated on ${new Date().toLocaleDateString()}<br>
            Vehicle Type: <strong>${vehicleLabels[comparisonVehicle] || comparisonVehicle}</strong>
          </div>
          ${projectionNote}
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Type</th>
                <th style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="3" style="padding:20px;text-align:center;">No items selected</td></tr>'}
            </tbody>
          </table>
          ${footerHtml}
          <script>window.onload = function(){ window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const generatePriceAuditPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'p' });
      const history = getPriceChangeHistory();
      const classifications = ["compact", "midsize", "truck", "luxury"];
      const allPkgs = [...builtInPackages, ...getCustomPackages()];
      const allAddons = [...builtInAddOns, ...getCustomAddOns()];

      doc.setTextColor(220, 38, 38);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Price Evolution Audit Trail", 14, 20);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      doc.text("Tracking most recent price adjustments compared to previous states.", 14, 33);

      let yPos = 45;

      classifications.forEach((size, sIdx) => {
        if (sIdx > 0) {
          doc.addPage();
          yPos = 20;
        }

        // Section Header
        doc.setFillColor(30, 30, 30);
        doc.rect(14, yPos, 182, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`VEHICLE CLASSIFICATION: ${size.toUpperCase()}`, 18, yPos + 7);
        yPos += 15;

        const buildTableData = (items: any[], type: 'package' | 'addon') => {
          return items.map(item => {
            const key = `${type}:${item.id}:${size}`;
            const baseVal = (item.pricing as any)[size];
            
            const itemHistory = history.filter(r => r.snapshot && r.snapshot[key]);
            const latestRec = itemHistory[0];
            const firstRec = [...itemHistory].reverse().find(r => Math.abs(parseFloat(r.snapshot![key]) - baseVal) > 0.01);
            
            const currentVal = parseFloat(currentPrices[key]) || baseVal;
            
            const firstPrice = firstRec ? `$${parseFloat(firstRec.snapshot![key]).toFixed(2)}` : '—';
            const firstDate = firstRec ? new Date(firstRec.date).toLocaleDateString() : '—';
            const currentPrice = `$${currentVal.toFixed(2)}`;
            const currentDate = latestRec ? new Date(latestRec.date).toLocaleDateString() : '—';

            return [
              item.name,
              `$${baseVal.toFixed(2)}`,
              `${firstPrice} (${firstDate})`,
              `${currentPrice} (${currentDate})`
            ];
          });
        };

        const pkgData = buildTableData(allPkgs, 'package');
        const addonData = buildTableData(allAddons, 'addon');

        // Packages Table
        doc.setFontSize(10);
        doc.setTextColor(220, 38, 38);
        doc.text("PRIMARY SERVICE PACKAGES", 14, yPos);
        yPos += 4;

        autoTable(doc, {
          startY: yPos,
          head: [['Service Name', 'Original (Base)', 'First Change', 'Currently Changed']],
          body: pkgData,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { halign: 'right', cellWidth: 35 },
            2: { halign: 'right', cellWidth: 45 },
            3: { halign: 'right', cellWidth: 45 }
          }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 12;

        // Addons Table
        doc.setFontSize(10);
        doc.setTextColor(220, 38, 38);
        doc.text("ADD-ON SERVICES", 14, yPos);
        yPos += 4;

        autoTable(doc, {
          startY: yPos,
          head: [['Add-On Name', 'Original (Base)', 'First Change', 'Currently Changed']],
          body: addonData,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { halign: 'right', cellWidth: 35 },
            2: { halign: 'right', cellWidth: 45 },
            3: { halign: 'right', cellWidth: 45 }
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      });

      doc.save(`price_audit_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Price Audit PDF saved (Portrait)");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Price Audit PDF");
    }
  };

  const generateRecentChangesPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'p' });
      const history = getPriceChangeHistory();
      const classifications = ["compact", "midsize", "truck", "luxury"];
      
      // Source of truth for "Current" should be currentPrices state
      const allItems = [
        ...builtInPackages.map(p => ({ ...p, type: 'package' as const })),
        ...getCustomPackages().map(p => ({ ...p, type: 'package' as const })),
        ...builtInAddOns.map(a => ({ ...a, type: 'addon' as const })),
        ...getCustomAddOns().map(a => ({ ...a, type: 'addon' as const }))
      ];

      const changedItems = allItems.filter(item => {
        return classifications.some(size => {
          const key = `${item.type}:${item.id}:${size}`;
          const currentVal = parseFloat(currentPrices[key]) || (item.pricing as any)[size];
          const baseVal = (item.pricing as any)[size];
          
          // Case 1: Current override differs from base
          if (Math.abs(currentVal - baseVal) > 0.01) return true;
          
          // Case 2: Historical record shows it once differed from base
          const hasHistoricalDelta = history.some(r => 
            r.snapshot && 
            r.snapshot[key] && 
            Math.abs(parseFloat(r.snapshot[key]) - baseVal) > 0.01
          );
          return hasHistoricalDelta;
        });
      });

      doc.setTextColor(220, 38, 38);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Recent Price Adjustments", 14, 20);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      doc.text("Summary of services with active price overrides across all vehicle classes.", 14, 33);

      let yPos = 45;

      if (changedItems.length === 0) {
        doc.text("No price changes detected compared to base definitions.", 14, yPos);
      } else {
        changedItems.forEach((item, idx) => {
          if (yPos > 240) { doc.addPage(); yPos = 20; }

          const isAddon = item.type === 'addon';
          const themeColor: [number, number, number] = isAddon ? [37, 99, 235] : [220, 38, 38];

          // Item Header
          doc.setFillColor(...themeColor);
          doc.rect(14, yPos, 182, 10, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(`${item.name.toUpperCase()} (${item.type.toUpperCase()})`, 18, yPos + 7);
          yPos += 12;

          const tableData = classifications.map(size => {
            const key = `${item.type}:${item.id}:${size}`;
            const baseVal = (item.pricing as any)[size];
            
            const itemHistory = history.filter(r => r.snapshot && r.snapshot[key]);
            const latestRec = itemHistory[0];
            const firstRec = [...itemHistory].reverse().find(r => Math.abs(parseFloat(r.snapshot![key]) - baseVal) > 0.01);
            
            const currentVal = parseFloat(currentPrices[key]) || baseVal;
            
            // If there is ANY history record for this item, it is considered MODIFIED in the audit sense
            const isActuallyModified = itemHistory.length > 0;

            const firstPrice = firstRec ? `$${parseFloat(firstRec.snapshot![key]).toFixed(2)}` : '—';
            const firstDate = firstRec ? new Date(firstRec.date).toLocaleDateString() : '—';
            const currentPrice = `$${currentVal.toFixed(2)}`;
            const currentDate = latestRec ? new Date(latestRec.date).toLocaleDateString() : '—';

            return [
              size.toUpperCase(),
              `$${baseVal.toFixed(2)}`,
              `${firstPrice} (${firstDate})`,
              `${currentPrice} (${currentDate})`
            ];
          });

          autoTable(doc, {
            startY: yPos,
            head: [['Vehicle Class', 'Original (Base)', 'First Change', 'Currently Changed']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2.5 },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            margin: { left: 14, right: 14 },
            columnStyles: {
              1: { halign: 'right', cellWidth: 35 },
              2: { halign: 'right', cellWidth: 50 },
              3: { halign: 'right', cellWidth: 50 }
            },
            didParseCell: (data) => {
              if (data.column.index === 3) {
                const rowIdx = data.row.index;
                const itemHistory = history.filter(r => r.snapshot && r.snapshot[`${item.type}:${item.id}:${classifications[rowIdx]}`]);
                if (itemHistory.length > 0) {
                  data.cell.styles.textColor = themeColor;
                  data.cell.styles.fontStyle = 'bold';
                }
              }
            }
          });

          yPos = (doc as any).lastAutoTable.finalY + 10;
        });
      }

      doc.save(`recent_changes_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Recent Changes PDF saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Recent Changes PDF");
    }
  };

  const downloadMatrixPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setTextColor(200, 0, 0);
      doc.setFontSize(22);
      doc.text("Vehicle Price Comparison", 20, 20);

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(12);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);

      let y = 45;
      const ids = Object.keys(comparisonSelection).filter(k => comparisonSelection[k]);
      const pkg = [...builtInPackages, ...getCustomPackages()];
      const add = [...builtInAddOns, ...getCustomAddOns()];
      const vehicles = vehicleOptions; // ['compact', 'midsize', 'truck', 'luxury']
      const xPos = [90, 120, 150, 180]; // Columns X positions

      // Headers
      doc.setFillColor(240, 240, 240);
      doc.rect(15, y - 6, 180, 8, "F");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Service Items", 20, y);
      doc.text("Compact", xPos[0], y, { align: 'right' });
      doc.text("Midsize", xPos[1], y, { align: 'right' });
      doc.text("Truck", xPos[2], y, { align: 'right' });
      doc.text("Luxury", xPos[3], y, { align: 'right' });

      doc.setFont("helvetica", "normal");
      y += 10;

      ids.forEach(id => {
        const p = pkg.find(x => x.id === id);
        const item = p || add.find(x => x.id === id);
        if (!item) return;
        const typePrefix = p ? 'package' : 'addon';

        doc.text(item.name, 20, y);
        vehicles.forEach((v, i) => {
          const price = parseFloat(currentPrices[getKey(typePrefix, id, v)]) || 0;
          doc.text(`$${price.toFixed(2)}`, xPos[i], y, { align: 'right' });
        });
        y += 8;
      });

      y += 5;
      doc.setDrawColor(200, 0, 0);
      doc.line(20, y, 190, y);
      y += 10;

      // Footer
      if (ids.length > 1) {
        doc.setTextColor(200, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("Difference (Max-Min):", 20, y);
        vehicles.forEach((v, i) => {
          const prices = ids.map(id => {
            const p = pkg.find(x => x.id === id);
            if (p) return parseFloat(currentPrices[getKey('package', id, v)]) || 0;
            const a = add.find(x => x.id === id);
            return parseFloat(currentPrices[getKey('addon', id, v)]) || 0;
          });
          const diff = Math.max(...prices) - Math.min(...prices);
          doc.text(`$${diff.toFixed(2)}`, xPos[i], y, { align: 'right' });
        });
      } else {
        doc.setTextColor(0, 150, 0);
        doc.setFont("helvetica", "bold");
        doc.text("Total Sum:", 20, y);
        vehicles.forEach((v, i) => {
          let total = 0;
          ids.forEach(id => {
            const p = pkg.find(x => x.id === id);
            if (p) total += parseFloat(currentPrices[getKey('package', id, v)]) || 0;
            else {
              const a = add.find(x => x.id === id);
              if (a) total += parseFloat(currentPrices[getKey('addon', id, v)]) || 0;
            }
          });
          doc.text(`$${total.toFixed(2)}`, xPos[i], y, { align: 'right' });
        });
      }

      const fileName = `matrix_comparison_${new Date().toISOString().split('T')[0]}.pdf`;
      const pdfData = doc.output('datauristring');
      doc.save(fileName);
      savePDFToArchive('Estimates' as any, 'Admin', 'pricing_matrix', pdfData, { fileName, path: 'estimates/' });
      toast.success("Comparison Matrix saved!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    }
  };

  const printMatrix = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    const ids = Object.keys(comparisonSelection).filter(k => comparisonSelection[k]);
    const pkg = [...builtInPackages, ...getCustomPackages()];
    const add = [...builtInAddOns, ...getCustomAddOns()];

    let rows = "";
    ids.forEach(id => {
      const p = pkg.find(x => x.id === id);
      const item = p || add.find(x => x.id === id);
      if (!item) return;
      const typePrefix = p ? 'package' : 'addon';

      let cells = "";
      vehicleOptions.forEach(v => {
        const price = parseFloat(currentPrices[getKey(typePrefix, id, v)]) || 0;
        cells += `<td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${price.toFixed(2)}</td>`;
      });
      rows += `<tr><td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>${cells}</tr>`;
    });

    let footer = "";
    if (ids.length > 1) {
      let cells = "";
      vehicleOptions.forEach(v => {
        const prices = ids.map(id => {
          const p = pkg.find(x => x.id === id);
          if (p) return parseFloat(currentPrices[getKey('package', id, v)]) || 0;
          const a = add.find(x => x.id === id);
          return parseFloat(currentPrices[getKey('addon', id, v)]) || 0;
        });
        const diff = Math.max(...prices) - Math.min(...prices);
        cells += `<td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: red; font-weight: bold;">$${diff.toFixed(2)}</td>`;
      });
      footer = `<tr style="background: #fee;"><td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: red;">Difference (Max-Min):</td>${cells}</tr>`;
    } else {
      let cells = "";
      vehicleOptions.forEach(v => {
        let total = 0;
        ids.forEach(id => {
          const p = pkg.find(x => x.id === id);
          if (p) total += parseFloat(currentPrices[getKey('package', id, v)]) || 0;
          else {
            const a = add.find(x => x.id === id);
            if (a) total += parseFloat(currentPrices[getKey('addon', id, v)]) || 0;
          }
        });
        cells += `<td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: green; font-weight: bold;">$${total.toFixed(2)}</td>`;
      });
      footer = `<tr><td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">Total Sum:</td>${cells}</tr>`;
    }

    win.document.write(`
      <html>
        <head>
          <title>Pricing Matrix</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f4f4f5; text-align: right; padding: 10px; border: 1px solid #ddd; }
            th:first-child { text-align: left; }
            h1 { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1>Vehicle Price Comparison</h1>
          <p>${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Service Items</th>
                <th>Compact</th>
                <th>Midsize</th>
                <th>Truck</th>
                <th>Luxury</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>${footer}</tfoot>
          </table>
          <script>window.onload = function(){ window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };


  const handleModalPricingRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.savedPrices) await localforage.setItem('savedPrices', data.savedPrices);
      if (data.packageMeta) localStorage.setItem('packageMeta', JSON.stringify(data.packageMeta));
      if (data.addOnMeta) localStorage.setItem('addOnMeta', JSON.stringify(data.addOnMeta));
      if (data.customPackages) localStorage.setItem('customServicePackages', JSON.stringify(data.customPackages));
      if (data.customAddOns) localStorage.setItem('customAddOns', JSON.stringify(data.customAddOns));
      if (data.customServices) localStorage.setItem('customServices', JSON.stringify(data.customServices));
      await postFullSync();
      await refreshLiveAfterSync();
      logPriceChange({ type: 'restore', description: `Restored pricing from JSON backup file: ${file.name}` });
      refreshHistory();
      toast.success('Pricing restored from backup — live site updated');
      setViewAllOpen(false);
    } catch (error) {
      toast.error('Restore failed. Invalid file or format.');
    }
  };

  useEffect(() => {
    // Auto-sync local state to backend/API memory on mount to ensure fresh consistency
    const timer = setTimeout(async () => {
      await postFullSync();
      // Also trigger a background save to Supabase to ensure cloud integrity
      saveToBackend(currentPrices);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      // 1. Seed defaults first (prevent empty UI)
      const seededDefault = seedFromDefinitions();
      setSavedPrices(seededDefault);
      setCurrentPrices(seededDefault); // display defaults while loading

      // 2. Try loading from Cloud (Supabase) - The Source of Truth
      if (isSupabaseEnabled()) {
        try {
          const [pkgs, addons] = await Promise.all([supaPkgs.getAll(), supaAddOns.getAll()]);

          const cloudPrices: PriceMap = {};
          const cloudMetaPkgs: Record<string, any> = {};
          const cloudMetaAddons: Record<string, any> = {};

          if (pkgs.length > 0 || addons.length > 0) {
            // Map Package Data
            pkgs.forEach((p: any) => {
              if (p.compact_price != null && p.compact_price > 0) cloudPrices[getKey('package', p.id, 'compact')] = String(p.compact_price);
              if (p.midsize_price != null && p.midsize_price > 0) cloudPrices[getKey('package', p.id, 'midsize')] = String(p.midsize_price);
              if (p.truck_price != null && p.truck_price > 0) cloudPrices[getKey('package', p.id, 'truck')] = String(p.truck_price);
              if (p.luxury_price != null && p.luxury_price > 0) cloudPrices[getKey('package', p.id, 'luxury')] = String(p.luxury_price);

              cloudMetaPkgs[p.id] = {
                id: p.id,
                visible: p.is_active === true,
                deleted: false,
                imageDataUrl: p.image_url || ""
              };
            });

            // Map Add-On Data
            addons.forEach((a: any) => {
              if (a.compact_price != null && a.compact_price > 0) cloudPrices[getKey('addon', a.id, 'compact')] = String(a.compact_price);
              if (a.midsize_price != null && a.midsize_price > 0) cloudPrices[getKey('addon', a.id, 'midsize')] = String(a.midsize_price);
              if (a.truck_price != null && a.truck_price > 0) cloudPrices[getKey('addon', a.id, 'truck')] = String(a.truck_price);
              if (a.luxury_price != null && a.luxury_price > 0) cloudPrices[getKey('addon', a.id, 'luxury')] = String(a.luxury_price);

              cloudMetaAddons[a.id] = {
                id: a.id,
                visible: a.is_active === true,
                deleted: false
              };
            });

            // Merge Meta
            Object.entries(cloudMetaPkgs).forEach(([id, meta]) => setPackageMeta(id, meta));
            Object.entries(cloudMetaAddons).forEach(([id, meta]) => setAddOnMeta(id, meta));

            // Merge Prices
            const localSaved = await getSavedPrices();
            const merged = { ...localSaved, ...cloudPrices };

            setSavedPrices(merged);
            setCurrentPrices(merged);
            await saveToLocalforage(merged);

            toast.success("Pricing and metadata loaded from Cloud.");
            return;
          }
        } catch (e) {
          console.error("Cloud load failed, falling back to local", e);
        }
      }

      // 3. Fallback: Load from Local Storage (Offline / Legacy)
      let lastSaved = await getSavedPrices();
      let backup = await getBackupPrices();

      // ONE-TIME INJECTION (Keep existing logic)
      const hasSeeded = localStorage.getItem(ONE_TIME_ORIGINAL_SEED_FLAG) === "true";
      if (!hasSeeded) {
        const seeded = seedFromDefinitions();
        await saveToLocalforage(seeded);
        await saveBackupPrices(seeded);
        savePersistentBackup(seeded);
        localStorage.setItem(ONE_TIME_ORIGINAL_SEED_FLAG, "true");
        setSavedPrices(seeded);
        setCurrentPrices(seeded);
        return;
      }

      if (Object.keys(lastSaved).length === 0) {
        const seeded = seedFromDefinitions();
        lastSaved = seeded;
      }

      setSavedPrices(lastSaved);
      setCurrentPrices(lastSaved);
    };
    load();
  }, []);

  // Load dynamic vehicle types for selector
  useEffect(() => {
    const loadVehicleTypes = async () => {
      try {
        const res = await fetch(`${API_BASE}/vehicle-types/live?v=${Date.now()}`, {
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const opts = data.map((v: any) => v.id).filter(Boolean);
            const map: Record<string, string> = {};
            data.forEach((v: any) => {
              if (v?.id) {
                map[v.id] = v.name + (v.description ? ` (${v.description})` : '');
              }
            });
            map.compact = map.compact || 'Compact/Sedan (Small cars and sedans)';
            map.midsize = map.midsize || 'Mid-Size/SUV (Mid-size cars and SUVs)';
            map.truck = map.truck || 'Truck/Van/Large SUV (Trucks, vans, large SUVs)';
            map.luxury = map.luxury || 'Luxury/High-End (Luxury and premium vehicles)';
            setVehicleLabels(map);
            setVehicleOptions(opts.length ? opts : builtInSizes);
            // ensure current selection is valid
            if (!opts.includes(vehicleType)) setVehicleType(opts[0] || 'compact');
          }
        }
      } catch { }
    };
    loadVehicleTypes();
    const onChanged = (e: any) => {
      if (e && e.detail && (e.detail.kind === 'vehicle-types' || e.detail.type === 'vehicle-types')) loadVehicleTypes();
    };
    window.addEventListener('content-changed', onChanged as any);
    return () => window.removeEventListener('content-changed', onChanged as any);
  }, [vehicleType]);

  const handleChange = (key: string, value: string) => {
    let num = parseFloat(value);
    if (isNaN(num)) num = 0;
    // enforce non-negative whole numbers within a reasonable upper bound
    num = Math.max(0, Math.min(9999, num));
    const rounded = String(Math.round(num));
    setCurrentPrices(prev => ({ ...prev, [key]: rounded }));
  };

  const applyIncrease = (id: string, percent: number) => {
    const factor = 1 + percent / 100;
    const sizes: string[] = builtInSizes;
    const updated: PriceMap = { ...currentPrices };
    sizes.forEach(size => {
      const key = getKey("package", id, size);
      const base = parseFloat(savedPrices[key]) || 0;
      // Fix Javascript floating point errors (e.g. 90 * 1.1 = 99.00000000000001) before ceiling
      const preciseValue = Math.round(base * factor * 100) / 100;
      updated[key] = String(Math.ceil(preciseValue));
    });
    setCurrentPrices(updated);
    logPriceChange({ type: 'percentage', description: `Applied ${percent}% increase to package ${id}. (Unsaved)`, snapshot: updated });
    refreshHistory();
  };

  const reset = (id: string) => {
    const sizes: string[] = builtInSizes;
    const updated: PriceMap = { ...currentPrices };
    sizes.forEach(size => {
      const key = getKey("package", id, size);
      updated[key] = savedPrices[key] || "0";
    });
    setCurrentPrices(updated);
  };

  const resetAll = () => {
    setCurrentPrices(savedPrices);
    logPriceChange({ type: 'reset', description: 'Reset all unsaved changes.' });
    refreshHistory();
    toast.success("Back to your last SAVED prices");
  };

  // EXACT FUNCTIONS REQUESTED
  const applyMaster = (target: 'packages' | 'addons' | 'both') => {
    const pct = parseFloat(masterPct) || 0;
    if (pct === 0) return;
    const factor = 1 + (pct / 100);
    const updated: PriceMap = { ...currentPrices };
    Object.keys(savedPrices).forEach(key => {
      if (shouldUpdate(key, target)) {
        const oldVal = parseFloat(savedPrices[key]) || 0;
        const preciseValue = Math.round(oldVal * factor * 100) / 100;
        updated[key] = String(Math.ceil(preciseValue));
      }
    });
    setCurrentPrices(updated);
    setMasterPct('');
    logPriceChange({ type: 'master', description: `Applied ${pct}% increase to ${target} (Unsaved)`, snapshot: updated });
    refreshHistory();
    toast.success(`Applied ${pct > 0 ? '+' : ''}${pct}% to ${target === 'both' ? 'EVERYTHING' : target}`);
  };

  const applyGlobal = () => {
    const pct = parseFloat(globalPct) || 0;
    if (pct === 0) return;
    const factor = 1 + (pct / 100);
    const updated: PriceMap = { ...currentPrices };
    Object.keys(savedPrices).forEach(key => {
      const oldVal = parseFloat(savedPrices[key]) || 0;
      const preciseValue = Math.round(oldVal * factor * 100) / 100;
      updated[key] = String(Math.ceil(preciseValue));
    });
    setCurrentPrices(updated);
    setGlobalPct('');
    logPriceChange({ type: 'global', description: `NUCLEAR: Applied ${pct}% to ALL prices (Unsaved)`, snapshot: updated });
    refreshHistory();
    toast.success(`NUCLEAR UPDATE: ${pct > 0 ? '+' : ''}${pct}% APPLIED TO ALL PRICES`);
  };

  const saveOne = async (keys: string[]) => {
    if (isDemoActive()) {
      toast.error("Demo Mode: Individual price locking is disabled.");
      return;
    }
    // Preserve previous baseline as backup before overwriting
    await saveBackupPrices(savedPrices);
    const updated: PriceMap = { ...savedPrices };
    keys.forEach(key => {
      const value = Math.ceil(parseFloat(currentPrices[key]) || 0).toString();
      updated[key] = value;
    });
    
    // Apply any pending visibility change for the entity corresponding to the keys
    // We determine the sample ID (e.g. 'prime-essential-exterior') from the keys provided
    const sample = keys[0];
    const parts = sample.split(":");
    if (parts.length >= 2) {
      const type = parts[0] as 'package' | 'addon';
      const id = parts[1];
      
      if (type === 'package') {
        const pend = pendingVisibilityPkg[id];
        if (typeof pend !== 'undefined') { 
          setPackageMeta(id, { visible: pend }); 
          setPendingVisibilityPkg(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      } else {
        const pend = pendingVisibilityAddon[id];
        if (typeof pend !== 'undefined') { 
          setAddOnMeta(id, { visible: pend }); 
          setPendingVisibilityAddon(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      }
    }
    
    // NOW save to backend, it will pick up the freshly saved meta visibility (visible: pend)
    await saveToBackend(updated);
    await saveToLocalforage(updated);
    setSavedPrices(updated);
    setCurrentPrices(updated);
    
    const label = keys.length === 1 ? keys[0] : `${keys[0].split(":")[0]}:${keys[0].split(":")[1]}`;
    await postFullSync();
    forceWebsiteTabRefresh();
    forceBookNowTabRefresh();
    openPackagesLiveInBrowser();
    logPriceChange({ type: 'manual', description: `Saved changes to items: ${keys.join(', ')}`, snapshot: updated });
    refreshHistory();
    toast.success(`${label} prices and visibility status locked in.`);
  };

  const saveAll = async () => {
    if (isDemoActive()) {
      toast.error("Demo Mode: Global price saving is disabled.");
      return;
    }
    // 1. APPLY ALL PENDING VISIBILITY CHANGES FIRST
    // This is critical because saveToBackend reads from getPackageMeta which reads from localStorage.
    Object.keys(pendingVisibilityPkg).forEach(pid => {
      const val = pendingVisibilityPkg[pid];
      if (typeof val !== 'undefined') setPackageMeta(pid, { visible: val });
    });
    Object.keys(pendingVisibilityAddon).forEach(aid => {
      const val = pendingVisibilityAddon[aid];
      if (typeof val !== 'undefined') setAddOnMeta(aid, { visible: val });
    });
    setPendingVisibilityPkg({});
    setPendingVisibilityAddon({});

    // 2. Preserve entire previous baseline as backup before global overwrite
    await saveBackupPrices(savedPrices);
    const rounded: PriceMap = {};
    Object.keys(currentPrices).forEach(key => {
      rounded[key] = Math.ceil(parseFloat(currentPrices[key]) || 0).toString();
    });

    // 3. NOW SAVE TO BACKEND (reads current metadata)
    await saveToBackend(rounded);
    await saveToLocalforage(rounded);
    setSavedPrices(rounded);
    setCurrentPrices(rounded);

    // Update persistent restore point to ALWAYS remember your latest saved prices
    savePersistentBackup(rounded);
    
    // 4. SYNC & REFRESH
    await fetch(`${API_BASE}/packages/sync`, { method: "POST" });
    await postFullSync();
    forceWebsiteTabRefresh();
    forceBookNowTabRefresh();
    openPackagesLiveInBrowser();
    logPriceChange({ type: 'manual', description: 'Saved ALL prices and visibility globally.', snapshot: rounded });
    refreshHistory();
    toast.success("All changes (pricing + visibility) synced to Cloud and Live Website.");
  };

  const restoreAllPrices = async () => {
    if (isDemoActive()) {
      toast.error("Demo Mode: Pricing restoration is disabled.");
      return;
    }
    // First, check for a persistent restore point (survives Delete All Data)
    const persistent = getPersistentBackup();
    if (!persistent || Object.keys(persistent).length === 0) {
      // No restore point yet — capture current baseline as the restore point
      savePersistentBackup(savedPrices);
      toast.success("Restore point saved. Next click will restore to these prices.");
      return;
    }
    const restored: PriceMap = persistent;
    toast.success("Restored ALL prices from your saved restore point.");
    await saveToBackend(restored);
    await saveToLocalforage(restored);
    setSavedPrices(restored);
    setCurrentPrices(restored);
    // Also refresh regular backup to match restored values
    await saveBackupPrices(restored);
    try { await fetch(`${API_BASE}/packages/sync`, { method: "POST" }); } catch { }
    await postFullSync();
    forceWebsiteTabRefresh();
    forceBookNowTabRefresh();
    openPackagesLiveInBrowser();
    logPriceChange({ type: 'restore', description: 'Restored all prices from persistent backup.', snapshot: restored });
    refreshHistory();
  };

  // Utilities: image mapping for current live assets
  const packageImages: Record<string, string> = {
    "prime-essential-exterior": primeEssentialExt,
    "prime-essential-interior": primeEssentialInt,
    "prime-essential-full": primeEssentialFull,

    // 3-Pack (Prime 2026) Images - Matching Customer Portal
    "prime-2026-exterior": primeEssentialExt,
    "prime-2026-interior": primeEssentialInt,
    "prime-2026-full": primeEssentialFull,

    "prime-elite-exterior": primeEliteExt,
    "prime-elite-interior": primeEliteInt,
    "prime-elite-full": primeEliteFull,
    "prime-express-exterior": packageExpress,
    "prime-express-interior": packageExpress,
    "prime-express-full-detail": packageFull,

    // Legacy / Other Mappings
    "basic-exterior": packageBasic,
    "express-wax": packageExpress,
    "full-exterior": packageExterior,
    "interior-cleaning": packageInterior,
    "full-detail": packageFull,
    "premium-detail": packagePremium,
  };

  const getLiveImage = (id: string) => {
    const meta = getPackageMeta(id);
    if (meta?.imageDataUrl) return meta.imageDataUrl;
    return packageImages[id] || packageBasic;
  };

  const handleImageUpload = async (id: string, file: File) => {
    if (isDemoActive()) {
      toast.error("Demo Mode: Image uploads are disabled.");
      return;
    }
    try {
      toast.info("Processing image...");

      const compressedFile = await compressImageForUpload(file);

      const ext = file.name.split('.').pop();
      const fileName = `packages/${id}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-media')
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-media')
        .getPublicUrl(fileName);

      setPackageMeta(id, { imageDataUrl: publicUrl });
      await postFullSync();
      await refreshLiveAfterSync();
      toast.success("Package image updated and synced");

    } catch (err: any) {
      console.error(err);
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    }
  };

  // Apply visibility immediately, also queue for UI; then full-sync and live refresh
  const queueVisibility = async (type: 'package' | 'addon', id: string, visible: boolean) => {
    if (type === 'package') {
      setPendingVisibilityPkg(prev => ({ ...prev, [id]: visible }));
      setPackageMeta(id, { visible });
    } else {
      setPendingVisibilityAddon(prev => ({ ...prev, [id]: visible }));
      setAddOnMeta(id, { visible });
    }

    // Immediate Supabase Update for Visibility
    if (isSupabaseEnabled()) {
      try {
        if (type === 'package') {
          const pkg = [...builtInPackages, ...getCustomPackages()].find(p => p.id === id);
          if (pkg) {
            const pricing = (pkg.pricing || {}) as any;
            await supaPkgs.upsert([{
              id,
              name: pkg.name,
              description: (pkg as any).description || "",
              compact_price: pricing.compact || 0,
              midsize_price: pricing.midsize || 0,
              truck_price: pricing.truck || 0,
              luxury_price: pricing.luxury || 0,
              is_active: visible
            }]);
          }
        } else {
          const addon = [...builtInAddOns, ...getCustomAddOns()].find(a => a.id === id);
          if (addon) {
            const pricing = (addon.pricing || {}) as any;
            await supaAddOns.upsert([{
              id,
              name: addon.name,
              description: (addon as any).description || "",
              compact_price: pricing.compact || 0,
              midsize_price: pricing.midsize || 0,
              truck_price: pricing.truck || 0,
              luxury_price: pricing.luxury || 0,
              is_active: visible
            }]);
          }
        }
      } catch (err) {
        console.error("Failed to sync visibility to Supabase", err);
      }
    }

    try {
      if (type === 'package') {
        setPendingVisibilityPkg(prev => { const n = { ...prev }; delete n[id]; return n; });
      } else {
        setPendingVisibilityAddon(prev => { const n = { ...prev }; delete n[id]; return n; });
      }
      await postFullSync();
      await forceWebsiteTabRefresh();
      await forceBookNowTabRefresh();
      const statusText = visible ? "LIVE on website" : "HIDDEN from website";
      toast.success(`${type === 'package' ? 'Package' : 'Add-On'} is now ${statusText}`);
    } catch { }
  };

  const openEditServices = (type: 'package' | 'addon', id: string) => {
    setEditServicesFor(id);
    setEditServicesType(type);
    const initial: Record<string, boolean> = {};
    if (type === 'package') {
      const pkg = [...builtInPackages, ...getCustomPackages()].find(p => p.id === id);
      const override = getPackageMeta(id)?.stepIds || pkg?.steps.map(s => s.id) || [];
      override.forEach(sid => { initial[sid] = true; });
    } else {
      const override = getAddOnMeta(id)?.stepIds || [];
      override.forEach(sid => { initial[sid] = true; });
    }
    setEditServicesSelection(initial);
    // Load global custom services and add a blank row at bottom
    const customs = getCustomServices();
    const rows = customs.map(cs => ({ id: cs.id, name: cs.name, checked: !!initial[cs.id] }));
    rows.push({ id: null, name: '', checked: false });
    setCustomServiceRows(rows);
  };

  const saveEditServices = async () => {
    if (isDemoActive()) {
      toast.error("Demo Mode: Custom service management is disabled.");
      return;
    }
    if (!editServicesFor || !editServicesType) return;
    // Persist all custom rows globally (even unchecked). Create IDs for new rows with non-empty names.
    const finalCustomIds: string[] = [];
    const updatedRows = customServiceRows.map(row => {
      if (row.id) {
        updateCustomService(row.id, row.name.trim());
        if (row.checked) finalCustomIds.push(row.id);
        return row;
      } else {
        const name = row.name.trim();
        if (!name) return row;
        const created = addCustomService(name);
        if (row.checked) finalCustomIds.push(created.id);
        return { ...row, id: created.id };
      }
    });
    setCustomServiceRows(updatedRows);

    // Selected standard step IDs
    const standardSelected = Object.keys(editServicesSelection).filter(k => editServicesSelection[k] && !finalCustomIds.includes(k));
    const stepIds = [...standardSelected, ...finalCustomIds];
    if (editServicesType === 'package') setPackageMeta(editServicesFor, { stepIds }); else setAddOnMeta(editServicesFor, { stepIds });

    setEditServicesFor(null);
    setEditServicesType(null);
    setEditServicesSelection({});
    await postServicesFullSync();
    forceWebsiteTabRefresh();
    forceBookNowTabRefresh();
    openPackagesLiveInBrowser();
    toast.success("Services updated and synced");
  };

  const addCustomRow = () => {
    setCustomServiceRows(prev => [...prev, { id: null, name: '', checked: false }]);
  };
  const removeCustomRow = async (idx: number) => {
    const row = customServiceRows[idx];
    if (row.id) {
      const ok = window.confirm('Delete this custom service from ALL packages?');
      if (!ok) return;
      deleteCustomService(row.id);
      await postServicesFullSync();
      forceWebsiteTabRefresh();
      forceBookNowTabRefresh();
      openPackagesLiveInBrowser();
    }
    setCustomServiceRows(prev => prev.filter((_, i) => i !== idx));
  };

  const confirmDelete = async (type: 'package' | 'addon', id: string) => {
    if (isDemoActive()) {
      toast.error("Demo Mode: Deletion is disabled.");
      return;
    }
    try {
      if (type === 'package') {
        const isCustom = !!getCustomPackages().find(p => p.id === id);
        if (isCustom) {
          deleteCustomPackage(id);
          if (isSupabaseEnabled()) await supaPkgs.remove(id);
        } else {
          setPackageMeta(id, { deleted: true, visible: false, imageDataUrl: undefined });
          // Built-ins aren't removed from DB, just marked inactive. saveToBackend handles this based on meta.
        }
      } else {
        const isCustomA = !!getCustomAddOns().find(a => a.id === id);
        if (isCustomA) {
          deleteCustomAddOn(id);
          if (isSupabaseEnabled()) await supaAddOns.remove(id);
        } else {
          setAddOnMeta(id, { deleted: true, visible: false });
        }
      }

      // Sync remaining state (especially for built-ins marked deleted)
      if (isSupabaseEnabled()) await saveToBackend(savedPrices);

      await postFullSync();
      forceWebsiteTabRefresh();
      forceBookNowTabRefresh();
      openPackagesLiveInBrowser();
      toast.success("Deleted and synced");

      // Refresh currentPrices to drop deleted entries visually
      const updated: PriceMap = { ...currentPrices };
      Object.keys(updated).forEach(k => { if (k.includes(`:${id}:`)) delete updated[k]; });
      setCurrentPrices(updated);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete/sync to cloud.");
    }
  };

  const handleNewPackageSave = async () => {
    if (isDemoActive()) {
      toast.error("Demo Mode: New package creation is disabled.");
      return;
    }
    const id = `custom-${Date.now()}`;
    const stepsUnion = [...builtInPackages.flatMap(p => p.steps)].reduce<Record<string, { id: string; name: string; category: 'exterior' | 'interior' | 'final' }>>((acc, s) => { acc[s.id] = s; return acc; }, {});
    const defaultSteps = Object.values(stepsUnion).slice(0, 8); // pick some defaults
    const pricing = {
      compact: Math.ceil(parseFloat(newPkgForm.pricing.compact || "") || 0),
      midsize: Math.ceil(parseFloat(newPkgForm.pricing.midsize || "") || 0),
      truck: Math.ceil(parseFloat(newPkgForm.pricing.truck || "") || 0),
      luxury: Math.ceil(parseFloat(newPkgForm.pricing.luxury || "") || 0),
    };
    saveCustomPackage({ id, name: newPkgForm.name || 'New Package', description: newPkgForm.description || '', pricing, steps: defaultSteps });
    // New packages default OFF on live site
    if (newPkgForm.imageDataUrl) setPackageMeta(id, { imageDataUrl: newPkgForm.imageDataUrl, visible: false }); else setPackageMeta(id, { visible: false });
    setAddPackageOpen(false);
    // Insert entered prices for all live vehicle options into savedPrices/currentPrices
    const updatedPrices: PriceMap = { ...savedPrices };
    vehicleOptions.forEach(sz => {
      const entered = Math.ceil(parseFloat(newPkgForm.pricing[sz] || "") || 0);
      updatedPrices[getKey('package', id, sz)] = String(entered);
    });
    setSavedPrices(updatedPrices);
    setCurrentPrices(updatedPrices);
    await saveToLocalforage(updatedPrices);
    await saveToBackend(updatedPrices);
    await postFullSync();
    forceWebsiteTabRefresh();
    forceBookNowTabRefresh();
    openPackagesLiveInBrowser();
    toast.success("New package added and synced");
    // Reset form fields
    setNewPkgForm({ name: '', description: '', pricing: { compact: '', midsize: '', truck: '', luxury: '' }, imageDataUrl: '' });
  };

  const handleNewAddonSave = async () => {
    if (isDemoActive()) {
      toast.error("Demo Mode: New add-on creation is disabled.");
      return;
    }
    const id = `custom-addon-${Date.now()}`;
    const pricing = {
      compact: Math.ceil(parseFloat(newAddonForm.pricing.compact || "") || 0),
      midsize: Math.ceil(parseFloat(newAddonForm.pricing.midsize || "") || 0),
      truck: Math.ceil(parseFloat(newAddonForm.pricing.truck || "") || 0),
      luxury: Math.ceil(parseFloat(newAddonForm.pricing.luxury || "") || 0),
    };
    saveCustomAddOn({ id, name: newAddonForm.name || 'New Add-On', pricing });
    // New add-ons default OFF on live site
    setAddOnMeta(id, { visible: false });
    setAddAddonOpen(false);
    // Insert entered prices for all live vehicle options into savedPrices/currentPrices
    const updatedPrices: PriceMap = { ...savedPrices };
    vehicleOptions.forEach(sz => {
      const entered = Math.ceil(parseFloat(newAddonForm.pricing[sz] || "") || 0);
      updatedPrices[getKey('addon', id, sz)] = String(entered);
    });
    setSavedPrices(updatedPrices);
    setCurrentPrices(updatedPrices);
    await saveToLocalforage(updatedPrices);
    await saveToBackend(updatedPrices);
    await postFullSync();
    forceWebsiteTabRefresh();
    forceBookNowTabRefresh();
    openPackagesLiveInBrowser();
    toast.success("New add-on added and synced");
    // Reset form fields
    setNewAddonForm({ name: '', pricing: { compact: '', midsize: '', truck: '', luxury: '' } });
  };

  const legacyIds = ['basic-exterior', 'express-wax', 'full-exterior', 'interior-cleaning', 'full-detail', 'premium-detail', 'prime-2026-exterior', 'prime-2026-interior', 'prime-2026-full'];

  const allPkgsData = Array.from(new Map([...builtInPackages, ...getCustomPackages()].map(p => [p.id, p])).values());
  const activePkgs = allPkgsData.filter(p => !getPackageMeta(p.id)?.deleted && getPackageMeta(p.id)?.visible !== false).length;
  const archivedPkgs = allPkgsData.filter(p => getPackageMeta(p.id)?.deleted || getPackageMeta(p.id)?.visible === false).length;

  const allAddonsData = Array.from(new Map([...builtInAddOns, ...getCustomAddOns()].map(a => [a.id, a])).values());
  const activeAddons = allAddonsData.filter(a => !getAddOnMeta(a.id)?.deleted && getAddOnMeta(a.id)?.visible !== false).length;
  const archivedAddons = allAddonsData.filter(a => getAddOnMeta(a.id)?.deleted || getAddOnMeta(a.id)?.visible === false).length;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Package Pricing">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHelpModalOpen(true)}
              className="border-red-500 text-red-500 hover:bg-red-500/10 font-black uppercase tracking-widest text-[10px] px-2 sm:px-3 h-8 sm:h-9"
              title="Package Pricing Help"
            >
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" /> 
              <span className="hidden sm:inline">Help</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (confirm("Sync all data fresh from the cloud? This will resolve any discrepancies between your browser and the database.")) {
                  window.location.reload();
                }
              }}
              className="border-blue-500 text-blue-500 hover:bg-blue-500/10 font-black uppercase tracking-widest text-[10px] px-2 sm:px-3 h-8 sm:h-9"
              title="Sync with Cloud"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" /> 
              <span className="hidden sm:inline">Sync with Cloud</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setComparisonMatrixOpen(true)}
              className="border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 font-black uppercase tracking-widest text-[10px] px-2 sm:px-3 h-8 sm:h-9"
              title="Show Services"
            >
              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" /> 
              <span className="hidden sm:inline">Services</span>
            </Button>
          </div>
      </PageHeader>

      <main className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in space-y-8">

        {/* Premium Header Block */}
        <div className="bg-gradient-to-r from-red-950/40 via-black to-zinc-950 p-8 rounded-2xl border border-red-900/20 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Package Pricing</h1>
              <p className="text-zinc-400 max-w-xl">Manage your service menu, adjust pricing globally, and control website visibility.</p>
            </div>
            <div className="flex flex-row gap-4 sm:gap-8 justify-end">
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-0.5">{activePkgs}</div>
                <div className="text-[8px] sm:text-[10px] uppercase tracking-widest font-black text-red-500 leading-tight">Active<br className="sm:hidden" /> Pkgs</div>
                <div className="text-[8px] sm:text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1 whitespace-nowrap">{archivedPkgs} Arc.</div>
              </div>
              <div className="w-px h-10 bg-zinc-800"></div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-0.5">{activeAddons}</div>
                <div className="text-[8px] sm:text-[10px] uppercase tracking-widest font-black text-red-500 leading-tight">Active<br className="sm:hidden" /> Addons</div>
                <div className="text-[8px] sm:text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1 whitespace-nowrap">{archivedAddons} Arc.</div>
              </div>
            </div>
          </div>
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        </div>

        {/* Pricing Controls Card */}
        <div className="bg-gradient-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="w-1 h-8 bg-red-600 rounded-full"></span>
              Edit Pricing
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHelpModalOpen(true)}
              className="text-zinc-500 hover:text-white hover:bg-zinc-800"
              title="Pricing Help"
            >
              <HelpCircle className="w-5 h-5 mr-2" />
              Help
            </Button>
          </div>
          <p className="text-zinc-400 mb-6 ml-3">Changes apply everywhere, including the live website.</p>

          {isDemoActive() && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-500 rounded-lg flex items-center gap-3 animate-pulse">
              <ShieldAlert className="w-6 h-6 text-red-500" />
              <div>
                <p className="font-black text-white uppercase tracking-wider">Demo / Simulation Mode READ-ONLY</p>
                <p className="text-zinc-300 text-sm">Administrative pricing actions are strictly disabled to protect your live website data.</p>
              </div>
            </div>
          )}



          <Accordion type="multiple" className="space-y-4">
            {/* Increase % Section */}
            <AccordionItem value="increase" className="border border-zinc-800 rounded-xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900/50 to-zinc-950/80 shadow-sm transition-all hover:border-red-900/30 group">
              <AccordionTrigger className="px-6 py-4 text-white hover:no-underline hover:text-red-400 data-[state=open]:text-red-400 transition-colors">
                <span className="text-lg font-semibold flex items-center gap-3">
                  <span className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </span>
                  Increase % by Category
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="1"
                      placeholder="e.g. 5, -10"
                      className="w-32 px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white text-lg font-medium focus:outline-none focus:border-red-500"
                      value={masterPct}
                      onChange={(e) => setMasterPct(e.target.value)}
                    />
                    <span className="text-white text-lg">Increase %</span>
                  </div>

                  <Button
                    size="lg"
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-6"
                    onClick={() => applyMaster('packages')}
                  >
                    Packages
                  </Button>
                  <Button
                    size="lg"
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-6"
                    onClick={() => applyMaster('addons')}
                  >
                    Add-Ons
                  </Button>
                  <Button
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-8"
                    onClick={() => applyMaster('both')}
                  >
                    Both
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* View & Export Section */}
            <AccordionItem value="view-export" className="border border-zinc-800 rounded-xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900/50 to-zinc-950/80 shadow-sm transition-all hover:border-blue-900/30 group">
              <AccordionTrigger className="px-6 py-4 text-white hover:no-underline hover:text-blue-400 data-[state=open]:text-blue-400 transition-colors">
                <span className="text-lg font-semibold flex items-center gap-3">
                  <span className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </span>
                  View & Export Pricing
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <Button
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-8"
                    onClick={openViewAllPrices}
                  >
                    View All Prices
                  </Button>

                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8"
                    onClick={() => { setComparisonSelection({}); setComparisonVehicle(vehicleType); setComparisonOpen(true); }}
                  >
                    Current Price Comparisons
                  </Button>

                  <Button
                    size="lg"
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-6"
                    onClick={generateAddOnsListPDF}
                  >
                    Add-Ons List (PDF)
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Show Services Section */}
            <AccordionItem value="show-services" className="border border-zinc-800 rounded-xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900/50 to-zinc-950/80 shadow-sm transition-all hover:border-emerald-900/30 group">
              <AccordionTrigger className="px-6 py-4 text-white hover:no-underline hover:text-emerald-400 data-[state=open]:text-emerald-400 transition-colors">
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="text-lg font-semibold flex items-center gap-3">
                    <span className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    </span>
                    Show Services
                  </span>
                  
                  {/* Help Button & Dialog moved here */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-zinc-500 hover:text-white h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHelpModalOpen(true);
                    }}
                    title="Proper Procedure Help"
                  >
                    <HelpCircle className="w-5 h-5" />
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button size="lg" variant={view === 'packages' ? 'default' : 'outline'} onClick={() => setView('packages')}>Show Packages</Button>
                    <Button size="lg" variant={view === 'addons' ? 'default' : 'outline'} onClick={() => setView('addons')}>Show Add-Ons</Button>
                    <Button size="lg" variant={view === 'both' ? 'default' : 'outline'} onClick={() => setView('both')}>Show Both</Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="border-blue-500 text-blue-500 hover:bg-blue-600 hover:text-white"
                      onClick={() => {
                        setView('both');
                        setShowArchived(false);
                        toast.info("Showing live services only");
                      }}
                    >
                      Show Live Packages Only
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 w-fit">
                    <Switch
                      id="show-archived"
                      checked={showArchived}
                      onCheckedChange={setShowArchived}
                    />
                    <Label htmlFor="show-archived" className="text-white font-medium cursor-pointer">
                      Show Archived (Hidden) Packages & Add-Ons
                    </Label>
                    {showArchived && (
                      <span className="text-xs bg-red-600/20 text-red-400 px-2 py-0.5 rounded border border-red-600/30 font-bold uppercase tracking-wider animate-pulse-subtle">
                        Viewing All
                      </span>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Price Change History Section */}
            <AccordionItem value="history" className="border border-zinc-800 rounded-xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900/50 to-zinc-950/80 shadow-sm transition-all hover:border-purple-900/30 group">
              <AccordionTrigger className="px-6 py-4 text-white hover:no-underline hover:text-purple-400 data-[state=open]:text-purple-400 transition-colors">
                <span className="text-lg font-semibold flex items-center gap-3">
                  <span className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  </span>
                  Price Change History
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="flex justify-between items-center mb-4 px-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <History className="w-3 h-3" /> Audit Log Records
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-[10px] font-black border-purple-500/30 text-purple-400 hover:bg-purple-500/10 gap-1.5"
                      onClick={() => {
                        setPriceHistory(getPriceChangeHistory());
                        setRecentChangesOpen(true);
                      }}
                    >
                      <Clock className="w-3.5 h-3.5" /> RECENT PRICE CHANGES
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-[10px] font-black border-purple-500/30 text-purple-400 hover:bg-purple-500/10 gap-1.5"
                      onClick={generatePriceAuditPDF}
                    >
                      <FileDown className="w-3.5 h-3.5" /> SAVE PRICE AUDIT PDF
                    </Button>
                  </div>
                </div>
                <div className="bg-black/50 border border-zinc-800 rounded-lg p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {priceHistory.length === 0 ? (
                    <div className="text-zinc-500 text-center py-6">No price changes recorded yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {priceHistory.map(record => (
                        <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/50 pb-3 last:border-0 last:pb-0">
                          <div>
                            <div className="text-xs text-zinc-500 mb-0.5">{new Date(record.date).toLocaleString()}</div>
                            <div className="text-sm text-zinc-300 font-medium">{record.description}</div>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border self-start sm:self-auto ${
                            record.type === 'percentage' || record.type === 'master' || record.type === 'global' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                            record.type === 'restore' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            record.type === 'reset' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {record.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center gap-4 flex-wrap">
            <Button
              size="lg"
              className="bg-red-600 hover:bg-red-700 font-bold px-8"
              onClick={saveAll}
            >
              Save All
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-red-600 text-red-500 hover:bg-red-600/20 font-bold px-8"
              onClick={resetAll}
            >
              Reset All Changes
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-green-600 text-green-500 hover:bg-green-600/20 font-bold px-8"
              onClick={restoreAllPrices}
            >
              Restore All Prices
            </Button>
          </div>
        </div>

        {/* Vehicle Type Selector - Front and Center above the services */}
        <div className="flex items-center gap-4 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 shadow-lg">
          <Label className="text-white text-xl font-black uppercase tracking-tight">Active Vehicle Pricing Category:</Label>
          <Select value={vehicleType} onValueChange={(v) => setVehicleType(v)}>
            <SelectTrigger className="w-80 bg-black border-red-600/30 text-white text-lg font-bold h-12 hover:border-red-600 transition-colors">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
              {vehicleOptions.map((opt) => (
                <SelectItem key={opt} value={opt} className="font-bold">{vehicleLabels[opt] || opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Packages grid */}
        {(view === "packages" || view === "both") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from(new Map([...builtInPackages, ...getCustomPackages()].map(p => [p.id, p])).values())


              .filter(pkg => !getPackageMeta(pkg.id)?.deleted) // Hard ignore truly deleted ones
              .filter(pkg => {
                const isHidden = getPackageMeta(pkg.id)?.visible === false || legacyIds.includes(pkg.id);
                return showArchived || !isHidden;
              })
              .map(pkg => {
                const isArchived = getPackageMeta(pkg.id)?.visible === false;
                return (
                  <Card key={pkg.id} className={`p-4 space-y-3 transition-all duration-300 ${isArchived ? 'opacity-60 border-zinc-800 grayscale-[0.5]' : ''}`}>
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold">{pkg.name}</h3>
                      {isArchived && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700 font-black uppercase tracking-widest">Archived</span>}
                    </div>
                    {/* Picture Upload Area (packages only) */}
                    <div className="flex flex-col xl:flex-row xl:flex-nowrap items-start gap-3 w-full">
                      {(() => {
                        const customUrl = getPackageMeta(pkg.id)?.imageDataUrl;
                        const isFullDetail = pkg.id.includes('full-detail') || pkg.id.includes('full-detail-2025') || pkg.id.includes('full');

                        if (isFullDetail && !customUrl && !packageImages[pkg.id]) {
                          return (
                            <div className="w-full xl:w-[300px] xl:h-[200px] flex overflow-hidden rounded border border-zinc-700 shadow shrink-0">
                              <div className="w-1/2 h-full border-r border-white/10">
                                <img src={primeEssentialExt} alt="Ext" className="w-full h-full object-cover" />
                              </div>
                              <div className="w-1/2 h-full">
                                <img src={primeEssentialInt} alt="Int" className="w-full h-full object-cover" />
                              </div>
                            </div>
                          );
                        }

                        return (
                          <img
                            src={getLiveImage(pkg.id)}
                            onError={(e) => {
                              const fallback = packageImages[pkg.id] || packageBasic;
                              if (e.currentTarget.src !== fallback) {
                                e.currentTarget.src = fallback;
                              }
                            }}
                            alt={pkg.name}
                            className="w-full xl:w-[300px] xl:h-[200px] object-cover xl:shrink-0 rounded border border-zinc-700 shadow"
                          />
                        );
                      })()}
                      <div className="min-w-0 flex-1 w-full">
                        <Label className="text-xs text-white mb-1 block">Change Package Image</Label>
                        <input type="file" accept="image/png,image/jpeg" onChange={(e) => e.target.files && handleImageUpload(pkg.id, e.target.files[0])} />
                        <div className="mt-2 flex items-center gap-2">
                          <Label className="text-white">Show on Live Website</Label>
                          <Switch
                            className={(typeof pendingVisibilityPkg[pkg.id] !== 'undefined')
                              ? "data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-red-600"
                              : "data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"}
                            checked={(pendingVisibilityPkg[pkg.id] ?? (getPackageMeta(pkg.id)?.visible !== false)) as boolean}
                            onCheckedChange={(checked) => queueVisibility('package', pkg.id, checked)}
                          />
                          {typeof pendingVisibilityPkg[pkg.id] !== 'undefined' ? (
                            <span className="text-red-500 text-xs">Pending</span>
                          ) : (getPackageMeta(pkg.id)?.visible === false ? (
                            <span className="text-red-500 text-xs">Hidden</span>
                          ) : (
                            <span className="text-green-500 text-xs">Live</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">{vehicleLabels[vehicleType] || vehicleType}</label>
                        <Input
                          type="number"
                          step="1"
                          value={currentPrices[getKey('package', pkg.id, vehicleType)] || (pkg.pricing as any)?.[vehicleType] || ''}
                          onChange={(e) => handleChange(getKey('package', pkg.id, vehicleType), e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="button-group-responsive flex gap-2 flex-wrap xl:flex-nowrap max-w-full">
                      <Button variant="outline" onClick={() => applyIncrease(pkg.id, 5)}>Apply 5%</Button>
                      <Button variant="outline" onClick={() => applyIncrease(pkg.id, 10)}>Apply 10%</Button>
                      <Button variant="outline" onClick={() => reset(pkg.id)}>Reset</Button>
                      <Button
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => saveOne([getKey('package', pkg.id, vehicleType)])}
                      >
                        Save
                      </Button>
                      <Button variant="outline" className="border-red-600 text-red-500" onClick={() => openEditServices('package', pkg.id)}>Edit Services</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="bg-red-700">
                            <span className="inline-flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                            <AlertDialogDescription>This will remove the package from admin and live site.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="button-group-responsive">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => confirmDelete('package', pkg.id)}>Yes, delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Card>
                );
              })}
          </div>
        )}

        {/* Add-ons grid */}
        {(view === "addons" || view === "both") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from(new Map([...builtInAddOns, ...getCustomAddOns()].map(a => [a.id, a])).values())


              .filter(a => !getAddOnMeta(a.id)?.deleted)
              .filter(a => showArchived || getAddOnMeta(a.id)?.visible !== false)
              .map(addon => {
                const isArchivedAddon = getAddOnMeta(addon.id)?.visible === false;
                return (
                  <Card key={addon.id} className={`p-4 space-y-3 transition-all duration-300 ${isArchivedAddon ? 'opacity-60 border-zinc-800 grayscale-[0.5]' : ''}`}>
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold">{addon.name}</h3>
                      {isArchivedAddon && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700 font-black uppercase tracking-widest">Archived</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-white">Show on Live Website</Label>
                      <Switch
                        className={(typeof pendingVisibilityAddon[addon.id] !== 'undefined')
                          ? "data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-red-600"
                          : "data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"}
                        checked={(pendingVisibilityAddon[addon.id] ?? (getAddOnMeta(addon.id)?.visible !== false)) as boolean}
                        onCheckedChange={(checked) => queueVisibility('addon', addon.id, checked)}
                      />
                      {typeof pendingVisibilityAddon[addon.id] !== 'undefined' ? (
                        <span className="text-red-500 text-xs">Pending</span>
                      ) : (getAddOnMeta(addon.id)?.visible === false ? (
                        <span className="text-red-500 text-xs">Hidden</span>
                      ) : (
                        <span className="text-green-500 text-xs">Live</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">{vehicleLabels[vehicleType] || vehicleType}</label>
                        <Input
                          type="number"
                          step="1"
                          value={currentPrices[getKey('addon', addon.id, vehicleType)] || (addon.pricing as any)?.[vehicleType] || ''}
                          onChange={(e) => handleChange(getKey('addon', addon.id, vehicleType), e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="button-group-responsive flex gap-2 flex-wrap xl:flex-nowrap max-w-full">
                      <Button variant="outline" onClick={() => {
                        const sizes: string[] = builtInSizes;
                        const factor = 1 + (5 / 100);
                        const upd = { ...currentPrices };
                        sizes.forEach(sz => {
                          const key = getKey('addon', addon.id, sz);
                          const base = parseFloat(savedPrices[key]) || 0;
                          upd[key] = String(Math.round(base * factor));
                        });
                        setCurrentPrices(upd);
                      }}>Apply 5%</Button>
                      <Button variant="outline" onClick={() => {
                        const sizes: string[] = builtInSizes;
                        const factor = 1 + (10 / 100);
                        const upd = { ...currentPrices };
                        sizes.forEach(sz => {
                          const key = getKey('addon', addon.id, sz);
                          const base = parseFloat(savedPrices[key]) || 0;
                          upd[key] = String(Math.round(base * factor));
                        });
                        setCurrentPrices(upd);
                      }}>Apply 10%</Button>

                      <Button variant="outline" onClick={() => {
                        const sizes: string[] = builtInSizes;
                        const upd = { ...currentPrices };
                        sizes.forEach(sz => {
                          const key = getKey('addon', addon.id, sz);
                          upd[key] = savedPrices[key] || '0';
                        });
                        setCurrentPrices(upd);
                      }}>Reset</Button>
                      <Button
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => saveOne([getKey('addon', addon.id, vehicleType)])}
                      >
                        Save
                      </Button>
                      <Button variant="outline" className="border-red-600 text-red-500" onClick={() => openEditServices('addon', addon.id)}>Edit Services</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="bg-red-700">
                            <span className="inline-flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                            <AlertDialogDescription>This will remove the add-on from admin and live site.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="button-group-responsive">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => confirmDelete('addon', addon.id)}>Yes, delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Card>
                );
              })}
          </div>
        )}

        {/* Toolbar: Add new package/add-on */}
        <div className="flex items-center gap-3 mt-6">
          {(view === 'packages' || view === 'both') && (
            <Button className="bg-red-600" onClick={() => setAddPackageOpen(true)}>+ Add New Package</Button>
          )}
          {(view === 'addons' || view === 'both') && (
            <Button className="bg-red-600" onClick={() => setAddAddonOpen(true)}>+ Add New Add-On</Button>
          )}
        </div>

        {/* Edit Services Modal */}
        <Dialog open={!!editServicesFor} onOpenChange={(o) => { if (!o) { setEditServicesFor(null); setEditServicesType(null); } }}>
          <DialogContent className="sm:max-w-[95vw] md:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Services</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-auto">
              {/* Standard services (packages only) */}
              {editServicesType === 'package' && (
                <div className="space-y-2">
                  {([...builtInPackages, ...getCustomPackages()].find(p => p.id === editServicesFor)?.steps || [])
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(step => (
                      <label key={step.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!editServicesSelection[step.id]} onChange={(e) => setEditServicesSelection(prev => ({ ...prev, [step.id]: e.target.checked }))} />
                        <span>{step.name}</span>
                      </label>
                    ))}
                </div>
              )}
              {/* Custom services */}
              <div className="space-y-2">
                <Label className="text-white">Custom Services</Label>
                {customServiceRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input type="checkbox" checked={row.checked} onChange={(e) => setCustomServiceRows(prev => prev.map((r, i) => i === idx ? { ...r, checked: e.target.checked } : r))} />
                    <Input className="flex-1" placeholder="Add Custom Service" value={row.name}
                      onChange={(e) => setCustomServiceRows(prev => prev.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))} />
                    <Button variant="destructive" className="bg-red-700" onClick={() => removeCustomRow(idx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {idx === customServiceRows.length - 1 && (
                      <Button onClick={addCustomRow} className="bg-red-600 rounded-full w-8 h-8 p-0 text-white">+</Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="button-group-responsive">
              <Button onClick={saveEditServices} className="bg-red-600">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add New Package Modal */}
        <Dialog open={addPackageOpen} onOpenChange={setAddPackageOpen}>
          <DialogContent className="sm:max-w-[95vw] md:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Package</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex flex-wrap md:flex-nowrap items-start gap-4">
                <img
                  src={newPkgForm.imageDataUrl || packageBasic}
                  onError={(e) => { e.currentTarget.src = packageBasic; }}
                  className="shrink-0 w-[300px] h-[200px] object-cover rounded border shadow"
                />
                <div className="min-w-0 flex-1">
                  <Label className="text-xs">Change Package Image</Label>
                  <input type="file" accept="image/png,image/jpeg" onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    try {
                      toast.info("Uploading...");
                      const compressed = await compressImageForUpload(f);
                      const ext = f.name.split('.').pop();
                      const fileName = `packages/new_${Date.now()}.${ext}`;
                      const { error } = await supabase.storage.from('blog-media').upload(fileName, compressed);
                      if (error) throw error;
                      const { data: { publicUrl } } = supabase.storage.from('blog-media').getPublicUrl(fileName);
                      setNewPkgForm(prev => ({ ...prev, imageDataUrl: publicUrl }));
                      toast.success("Image ready");
                    } catch (err) {
                      toast.error("Upload failed");
                    }
                  }} />
                </div>
              </div>
              <div>
                <Label>Name</Label>
                <Input value={newPkgForm.name} onChange={(e) => setNewPkgForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={newPkgForm.description} onChange={(e) => setNewPkgForm(prev => ({ ...prev, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {vehicleOptions.map(sz => (
                  <div key={sz}>
                    <label className="text-xs text-muted-foreground">{vehicleLabels[sz] || sz}</label>
                    <Input type="number" value={newPkgForm.pricing[sz] || ''}
                      onChange={(e) => setNewPkgForm(prev => ({ ...prev, pricing: { ...prev.pricing, [sz]: e.target.value } }))} />
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="button-group-responsive">
              <Button onClick={handleNewPackageSave} className="bg-red-600">Create Package</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add New Add-On Modal */}
        <Dialog open={addAddonOpen} onOpenChange={setAddAddonOpen}>
          <DialogContent className="sm:max-w-[95vw] md:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Add-On</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={newAddonForm.name} onChange={(e) => setNewAddonForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {vehicleOptions.map(sz => (
                  <div key={sz}>
                    <label className="text-xs text-muted-foreground">{vehicleLabels[sz] || sz}</label>
                    <Input type="number" value={newAddonForm.pricing[sz] || ''}
                      onChange={(e) => setNewAddonForm(prev => ({ ...prev, pricing: { ...prev.pricing, [sz]: e.target.value } }))} />
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="button-group-responsive">
              <Button onClick={handleNewAddonSave} className="bg-red-600">Create Add-On</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Current Price Comparison Modal */}
        <Dialog open={comparisonOpen} onOpenChange={setComparisonOpen}>
          <DialogContent className="sm:max-w-[95vw] lg:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
            <div className="p-6 border-b border-zinc-800 bg-zinc-950">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <DialogTitle className="text-2xl font-bold">Scenario Builder</DialogTitle>
                  <p className="text-zinc-400 text-sm">Select items to calculate a total expense scenario.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <Button
                    onClick={() => setComparisonMatrixOpen(true)}
                    variant="ghost"
                    className="h-9 border border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 font-bold uppercase tracking-widest text-[10px]"
                  >
                    <Info className="w-4 h-4 mr-2" /> Show Services
                  </Button>
                  <div className="flex items-center gap-3 bg-zinc-900 p-1.5 px-3 rounded-lg border border-zinc-800">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Vehicle Size:</span>
                    <Select value={comparisonVehicle} onValueChange={setComparisonVehicle}>
                      <SelectTrigger className="w-[180px] bg-black border-zinc-700 h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {vehicleOptions.map(opt => <SelectItem key={opt} value={opt} className="text-xs font-bold uppercase">{vehicleLabels[opt] || opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-black/50">
              {/* Projection Toolbar */}
              <div className="mb-2 p-4 bg-zinc-900/80 border border-zinc-800 rounded-lg shadow-sm">
                <h3 className="text-zinc-400 text-xs uppercase font-bold mb-3 tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                  Hypothetical Price Projection (Does not save)
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-300">Adjustment %:</span>
                    <Input
                      type="number"
                      placeholder="0"
                      className="w-20 h-8 bg-black border-zinc-700 text-white"
                      value={projInput}
                      onChange={(e) => setProjInput(e.target.value)}
                    />
                  </div>
                  <Button size="sm" variant="outline" className="h-8 border-zinc-700 text-zinc-300 hover:text-white" onClick={() => {
                    const val = parseFloat(projInput) || 0;
                    setScenarioProj(prev => ({ ...prev, pkg: val }));
                  }}>Apply to Packages</Button>
                  <Button size="sm" variant="outline" className="h-8 border-zinc-700 text-zinc-300 hover:text-white" onClick={() => {
                    const val = parseFloat(projInput) || 0;
                    setScenarioProj(prev => ({ ...prev, addon: val }));
                  }}>Apply to Add-Ons</Button>
                  <Button size="sm" variant="outline" className="h-8 border-blue-900/50 text-blue-400 hover:bg-blue-900/30" onClick={() => {
                    const val = parseFloat(projInput) || 0;
                    setScenarioProj({ pkg: val, addon: val });
                  }}>Apply to ALL</Button>
                  {(scenarioProj.pkg !== 0 || scenarioProj.addon !== 0) && (
                    <Button size="sm" variant="ghost" className="h-8 text-red-400 hover:text-red-300 hover:bg-red-950/20" onClick={() => {
                      setScenarioProj({ pkg: 0, addon: 0 });
                      setProjInput("");
                    }}>Reset</Button>
                  )}
                </div>
                {(scenarioProj.pkg !== 0 || scenarioProj.addon !== 0) && (
                  <div className="mt-3 text-xs text-yellow-500 flex items-center gap-2 font-mono">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    Prices shown include +{scenarioProj.pkg}% (Pkg) / +{scenarioProj.addon}% (Addon) projection.
                  </div>
                )}
              </div>
              {/* Packages Section */}
              <div>
                <h3 className="text-red-500 font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-8 h-px bg-red-500"></span> Packages
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...builtInPackages, ...getCustomPackages()]
                    .filter(p => !getPackageMeta(p.id)?.deleted)
                    .map(p => {
                      const isArchived = getPackageMeta(p.id)?.visible === false;
                      // Uses helper for projection
                      const price = getProjectedPrice('package', p.id, comparisonVehicle);
                      const isSelected = !!comparisonSelection[p.id];
                      // Determine services/steps list
                      const metaOverride = getPackageMeta(p.id)?.stepIds;
                      const displaySteps = metaOverride && metaOverride.length > 0
                        ? metaOverride.map(sid => {
                          // Look up in built-ins
                          const builtIn = builtInPackages.flatMap(pkg => pkg.steps).find(s => s.id === sid);
                          if (builtIn) return builtIn.name;
                          // Look up in custom
                          const cus = getCustomServices().find(c => c.id === sid);
                          return cus ? cus.name : null;
                        }).filter(Boolean)
                        : p.steps.map(s => s.name);

                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 relative group/item
                                    ${isSelected ? 'bg-red-950/30 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'}
                                    ${isArchived ? 'opacity-60 border-dashed border-zinc-700 grayscale-[0.3]' : ''}`}
                        >
                          {isArchived && <div className="absolute -top-2 -right-1 z-10 text-[7px] bg-zinc-800 text-zinc-400 px-1 border border-zinc-700 rounded font-black uppercase tracking-tighter">Archived</div>}
                          <div className="flex items-center gap-3 flex-1" onClick={() => setComparisonSelection(prev => ({ ...prev, [p.id]: !prev[p.id] }))}>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-red-600 border-red-600 text-white' : 'border-zinc-600'}`}>
                              {isSelected && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className={`font-medium ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{p.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="font-mono font-bold text-emerald-400" onClick={() => setComparisonSelection(prev => ({ ...prev, [p.id]: !prev[p.id] }))}>
                              ${price}
                            </div>
                            <div className="relative group/info">
                              <button onClick={(e) => e.stopPropagation()} className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 flex items-center justify-center transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                              </button>
                              <div className="absolute bottom-full right-0 mb-2 w-64 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl p-3 z-50 invisible opacity-0 translate-y-2 group-hover/info:visible group-hover/info:opacity-100 group-hover/info:translate-y-0 transition-all pointer-events-none group-hover/info:pointer-events-auto">
                                <h4 className="text-sm font-bold text-white mb-2 border-b border-zinc-800 pb-1">Included Services</h4>
                                <ul className="text-xs text-zinc-400 space-y-1 list-disc pl-4 max-h-48 overflow-y-auto custom-scrollbar">
                                  {displaySteps.length > 0 ? displaySteps.map((s, i) => (
                                    <li key={i}>{s}</li>
                                  )) : <li>No specific services listed.</li>}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Add-Ons Section */}
              <div>
                <h3 className="text-blue-500 font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-8 h-px bg-blue-500"></span> Add-Ons
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...builtInAddOns, ...getCustomAddOns()]
                    .filter(a => !getAddOnMeta(a.id)?.deleted)
                    .map(a => {
                      const isArchived = getAddOnMeta(a.id)?.visible === false;
                      // Uses helper for projection
                      const price = getProjectedPrice('addon', a.id, comparisonVehicle);
                      const isSelected = !!comparisonSelection[a.id];
                      // Determine services/steps list
                      const metaOverride = getAddOnMeta(a.id)?.stepIds;
                      // Addons by default might not have 'steps' defined in standard object, check fallback
                      const displaySteps = metaOverride && metaOverride.length > 0
                        ? metaOverride.map(sid => {
                          // Look up in built-ins
                          const builtIn = builtInPackages.flatMap(pkg => pkg.steps).find(s => s.id === sid);
                          if (builtIn) return builtIn.name;
                          // Look up in custom
                          const cus = getCustomServices().find(c => c.id === sid);
                          return cus ? cus.name : null;
                        }).filter(Boolean)
                        : [(a as any).description].filter(Boolean); // Fallback to description for addons

                      return (
                        <div
                          key={a.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 relative group/item
                                    ${isSelected ? 'bg-blue-950/30 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'}
                                    ${isArchived ? 'opacity-60 border-dashed border-zinc-700 grayscale-[0.3]' : ''}`}
                        >
                          {isArchived && <div className="absolute -top-2 -right-1 z-10 text-[7px] bg-zinc-800 text-zinc-400 px-1 border border-zinc-700 rounded font-black uppercase tracking-tighter">Archived</div>}
                          <div className="flex items-center gap-3 flex-1" onClick={() => setComparisonSelection(prev => ({ ...prev, [a.id]: !prev[a.id] }))}>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-600'}`}>
                              {isSelected && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className={`font-medium ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{a.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="font-mono font-bold text-emerald-400" onClick={() => setComparisonSelection(prev => ({ ...prev, [a.id]: !prev[a.id] }))}>
                              ${price}
                            </div>
                            <div className="relative group/info">
                              <button onClick={(e) => e.stopPropagation()} className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 flex items-center justify-center transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                              </button>
                              <div className="absolute bottom-full right-0 mb-2 w-64 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl p-3 z-50 invisible opacity-0 translate-y-2 group-hover/info:visible group-hover/info:opacity-100 group-hover/info:translate-y-0 transition-all pointer-events-none group-hover/info:pointer-events-auto">
                                <h4 className="text-sm font-bold text-white mb-2 border-b border-zinc-800 pb-1">Included Services</h4>
                                <ul className="text-xs text-zinc-400 space-y-1 list-disc pl-4 max-h-48 overflow-y-auto custom-scrollbar">
                                  {displaySteps.length > 0 ? displaySteps.map((s, i) => (
                                    <li key={i}>{s}</li>
                                  )) : <li>{(a as any).description || "No description."}</li>}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xl z-10">
              <div className="flex items-center gap-2">
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white border-red-800" onClick={() => setComparisonSelection({})}>
                  Clear All
                </Button>
                <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={printScenario}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  Print
                </Button>
                <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setPreviewOpen(true)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  Preview
                </Button>
                <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => setMatrixOpen(true)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                  Compare Vehicles
                </Button>
                <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={downloadScenarioPDF}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 24 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Save PDF
                </Button>
              </div>
              <div className="flex items-center gap-4 bg-zinc-900 px-6 py-3 rounded-xl border border-zinc-800">
                <div className="text-right">
                  <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                    {Object.keys(comparisonSelection).filter(k => comparisonSelection[k]).length > 1 ? 'Price Difference' : 'Estimated Total'}
                  </div>
                  <div className={`text-3xl font-bold font-mono tracking-tight leading-none ${Object.keys(comparisonSelection).filter(k => comparisonSelection[k]).length > 1 ? 'text-red-500' : 'text-emerald-400'}`}>
                    ${(() => {
                      const ids = Object.keys(comparisonSelection).filter(k => comparisonSelection[k]);
                      const pkgs = [...builtInPackages, ...getCustomPackages()];
                      const addons = [...builtInAddOns, ...getCustomAddOns()];

                      if (ids.length > 1) {
                        // Comparison Mode: Difference (Max - Min)
                        const prices = ids.map(id => {
                          const p = pkgs.find(x => x.id === id);
                          if (p) return getProjectedPrice('package', id, comparisonVehicle);
                          const a = addons.find(x => x.id === id);
                          return getProjectedPrice('addon', id, comparisonVehicle);
                        });
                        const min = Math.min(...prices);
                        const max = Math.max(...prices);
                        return (max - min).toFixed(2);
                      } else {
                        // Sum Mode
                        let total = 0;
                        ids.forEach(id => {
                          const p = pkgs.find(x => x.id === id);
                          if (p) total += getProjectedPrice('package', id, comparisonVehicle);
                          else {
                            const a = addons.find(x => x.id === id);
                            if (a) total += getProjectedPrice('addon', id, comparisonVehicle);
                          }
                        });
                        return total.toFixed(2);
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Quote Modal */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-xl bg-white text-black p-0 overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6 border-b border-gray-200 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-red-600">Pricing Estimate</h2>
                  <p className="text-gray-500 text-sm mt-1">Prime Auto Detail</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>{new Date().toLocaleDateString()}</div>
                  <div className="font-semibold text-black mt-1 capitalize">{vehicleLabels[comparisonVehicle] || comparisonVehicle}</div>
                </div>
              </div>

              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b-2 border-red-600/20 text-left text-gray-500">
                    <th className="py-2 font-semibold">Service</th>
                    <th className="py-2 font-semibold">Type</th>
                    <th className="py-2 text-right font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(() => {
                    let total = 0;
                    const pkg = [...builtInPackages, ...getCustomPackages()];
                    const add = [...builtInAddOns, ...getCustomAddOns()];
                    const ids = Object.keys(comparisonSelection).filter(k => comparisonSelection[k]);

                    if (ids.length === 0) return <tr><td colSpan={3} className="py-4 text-center text-gray-400">No items selected</td></tr>;

                    return ids.map(id => {
                      const p = pkg.find(x => x.id === id);
                      if (p) {
                        const price = parseFloat(currentPrices[getKey('package', id, comparisonVehicle)]) || 0;
                        total += price;
                        return (
                          <tr key={id}>
                            <td className="py-3">{p.name}</td>
                            <td className="py-3 text-gray-500">Package</td>
                            <td className="py-3 text-right font-mono">${price.toFixed(2)}</td>
                          </tr>
                        );
                      }
                      const a = add.find(x => x.id === id);
                      if (a) {
                        const price = parseFloat(currentPrices[getKey('addon', id, comparisonVehicle)]) || 0;
                        total += price;
                        return (
                          <tr key={id}>
                            <td className="py-3">{a.name}</td>
                            <td className="py-3 text-gray-500">Add-On</td>
                            <td className="py-3 text-right font-mono">${price.toFixed(2)}</td>
                          </tr>
                        );
                      }
                      return null;
                    });
                  })()}
                </tbody>
              </table>

              <div className="flex justify-end border-t border-gray-200 pt-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500 uppercase font-bold tracking-wider">
                    {Object.keys(comparisonSelection).filter(k => comparisonSelection[k]).length > 1 ? 'Price Difference' : 'Total Estimate'}
                  </div>
                  <div className={`text-3xl font-bold font-mono mt-1 ${Object.keys(comparisonSelection).filter(k => comparisonSelection[k]).length > 1 ? 'text-red-500' : 'text-emerald-600'}`}>
                    ${(() => {
                      const ids = Object.keys(comparisonSelection).filter(k => comparisonSelection[k]);
                      const pkg = [...builtInPackages, ...getCustomPackages()];
                      const add = [...builtInAddOns, ...getCustomAddOns()];

                      if (ids.length > 1) {
                        const prices = ids.map(id => {
                          const p = pkg.find(x => x.id === id);
                          if (p) return parseFloat(currentPrices[getKey('package', id, comparisonVehicle)]) || 0;
                          const a = add.find(x => x.id === id);
                          return parseFloat(currentPrices[getKey('addon', id, comparisonVehicle)]) || 0;
                        });
                        const min = Math.min(...prices);
                        const max = Math.max(...prices);
                        return (max - min).toFixed(2);
                      } else {
                        let total = 0;
                        ids.forEach(id => {
                          const p = pkg.find(x => x.id === id);
                          if (p) total += parseFloat(currentPrices[getKey('package', id, comparisonVehicle)]) || 0;
                          else {
                            const a = add.find(x => x.id === id);
                            if (a) total += parseFloat(currentPrices[getKey('addon', id, comparisonVehicle)]) || 0;
                          }
                        });
                        return total.toFixed(2);
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={printScenario}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={downloadScenarioPDF}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 24 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Save PDF
                </Button>
              </div>
              <Button onClick={() => setPreviewOpen(false)} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">Close Preview</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Matrix Comparison Modal */}
        <Dialog open={matrixOpen} onOpenChange={setMatrixOpen}>
          <DialogContent className="sm:max-w-4xl bg-white text-black p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-red-600 mb-4">Vehicle Price Comparison</DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse shadow-sm">
                <thead>
                  <tr className="bg-zinc-100 text-left border-b-2 border-red-600">
                    <th className="p-3 font-bold border border-zinc-200">Service Items</th>
                    <th className="p-3 font-bold border border-zinc-200 text-right bg-zinc-50">Compact</th>
                    <th className="p-3 font-bold border border-zinc-200 text-right bg-zinc-50">Midsize</th>
                    <th className="p-3 font-bold border border-zinc-200 text-right bg-zinc-50">Truck</th>
                    <th className="p-3 font-bold border border-zinc-200 text-right bg-zinc-50">Luxury</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const pkg = [...builtInPackages, ...getCustomPackages()];
                    const add = [...builtInAddOns, ...getCustomAddOns()];
                    const ids = Object.keys(comparisonSelection).filter(k => comparisonSelection[k]);

                    if (ids.length === 0) return <tr><td colSpan={5} className="p-6 text-center text-zinc-400 italic">No items selected to compare. Select items in the Scenario Builder.</td></tr>;

                    return ids.map(id => {
                      const p = pkg.find(x => x.id === id);
                      const item = p || add.find(x => x.id === id);
                      if (!item) return null;
                      const typePrefix = p ? 'package' : 'addon';

                      return (
                        <tr key={id} className="odd:bg-white even:bg-zinc-50 hover:bg-red-50 transition-colors">
                          <td className="p-3 border border-zinc-200 font-medium text-zinc-800">
                            {item.name} <span className="text-xs text-zinc-400 font-normal ml-1">({p ? 'Pkg' : 'Add-on'})</span>
                          </td>
                          {vehicleOptions.map(v => (
                            <td key={v} className="p-3 border border-zinc-200 text-right font-mono text-zinc-700">
                              ${(parseFloat(currentPrices[getKey(typePrefix, id, v)]) || 0).toFixed(2)}
                            </td>
                          ))}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
                <tfoot className="bg-zinc-100 font-bold border-t-2 border-red-600">
                  {(() => {
                    const ids = Object.keys(comparisonSelection).filter(k => comparisonSelection[k]);
                    const isComparison = ids.length > 1;

                    if (isComparison) {
                      return (
                        <tr className="bg-red-50">
                          <td className="p-3 border border-zinc-200 text-right uppercase tracking-wider text-xs text-red-500 font-bold">Difference (Max-Min):</td>
                          {vehicleOptions.map(v => (
                            <td key={v} className="p-3 border border-zinc-200 text-right text-red-600 text-lg font-mono">
                              ${(() => {
                                const pkg = [...builtInPackages, ...getCustomPackages()];
                                const add = [...builtInAddOns, ...getCustomAddOns()];
                                const prices = ids.map(id => {
                                  const p = pkg.find(x => x.id === id);
                                  if (p) return parseFloat(currentPrices[getKey('package', id, v)]) || 0;
                                  const a = add.find(x => x.id === id);
                                  return parseFloat(currentPrices[getKey('addon', id, v)]) || 0;
                                });
                                const min = Math.min(...prices);
                                const max = Math.max(...prices);
                                return (max - min).toFixed(2);
                              })()}
                            </td>
                          ))}
                        </tr>
                      );
                    } else {
                      // Total Sum (Only if 0 or 1 item selected)
                      return (
                        <tr>
                          <td className="p-3 border border-zinc-200 text-right uppercase tracking-wider text-xs text-zinc-500 pt-4">Total Sum:</td>
                          {vehicleOptions.map(v => (
                            <td key={v} className="p-3 border border-zinc-200 text-right text-emerald-600 text-lg pt-4 leading-none">
                              ${(() => {
                                let t = 0;
                                const pkg = [...builtInPackages, ...getCustomPackages()];
                                const add = [...builtInAddOns, ...getCustomAddOns()];
                                ids.forEach(id => {
                                  const p = pkg.find(x => x.id === id);
                                  if (p) t += parseFloat(currentPrices[getKey('package', id, v)]) || 0;
                                  else {
                                    const a = add.find(x => x.id === id);
                                    if (a) t += parseFloat(currentPrices[getKey('addon', id, v)]) || 0;
                                  }
                                });
                                return t.toFixed(2);
                              })()}
                            </td>
                          ))}
                        </tr>
                      );
                    }
                  })()}
                </tfoot>
              </table>
            </div>
            <div className="mt-6 flex justify-between items-center">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-zinc-300" onClick={printMatrix}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  Print
                </Button>
                <Button variant="outline" size="sm" className="border-zinc-300" onClick={downloadMatrixPDF}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 24 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Matrix PDF
                </Button>
              </div>
              <Button onClick={() => setMatrixOpen(false)} variant="outline" className="border-zinc-300 text-zinc-700 hover:bg-zinc-100">Close Chart</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={viewAllOpen} onOpenChange={setViewAllOpen}>
          <DialogContent className="sm:max-w-[95vw] lg:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Current Live Pricing — Prime Auto Detail</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-end gap-3 mb-4">
              <Button variant="outline" onClick={printPrices}>Print</Button>
              <Button variant="outline" onClick={downloadPricesPDF}>Download PDF</Button>
              <Button variant="outline" onClick={downloadPricesJSON}>Backup as JSON</Button>
              <label>
                <Button variant="outline" asChild>
                  <span>Restore Pricing from JSON</span>
                </Button>
                <input type="file" accept=".json" className="hidden" onChange={handleModalPricingRestore} />
              </label>
            </div>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <h3 className="text-red-600 font-bold mb-2">Packages</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-red-600 text-white">
                        <th className="p-2 border">Service</th>
                        <th className="p-2 border">Compact</th>
                        <th className="p-2 border">Midsize</th>
                        <th className="p-2 border">Truck</th>
                        <th className="p-2 border">Luxury</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const snap = liveSnapshot;
                        if (!snap) return null;
                        const pkgMeta = snap.packageMeta || {};
                        const saved = snap.savedPrices || {};
                        const visible = Array.from(new Map([...builtInPackages, ...(snap.customPackages || [])].map(p => [p.id, p])).values())


                          .filter(p => (pkgMeta[p.id]?.visible) !== false && !pkgMeta[p.id]?.deleted);
                        return visible.map(p => {
                          const getP = (sz: string) => {
                            const val = saved[liveGetKey('package', p.id, sz)];
                            const isO = val !== undefined && val !== null && val !== "";
                            return { v: isO ? parseFloat(val) : p.pricing[sz as keyof typeof p.pricing], isO };
                          };
                          const pr = {
                            compact: getP('compact'),
                            midsize: getP('midsize'),
                            truck: getP('truck'),
                            luxury: getP('luxury'),
                          };
                          return (
                            <tr key={p.id} className="odd:bg-white even:bg-zinc-50">
                              <td className="p-2 border font-medium">{p.name}</td>
                              <td className="p-2 border text-right font-black text-black">${pr.compact.v}</td>
                              <td className="p-2 border text-right font-black text-black">${pr.midsize.v}</td>
                              <td className="p-2 border text-right font-black text-black">${pr.truck.v}</td>
                              <td className="p-2 border text-right font-black text-black">${pr.luxury.v}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="text-red-600 font-bold mb-2">Add-Ons</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-red-600 text-white">
                        <th className="p-2 border">Service</th>
                        <th className="p-2 border">Compact</th>
                        <th className="p-2 border">Midsize</th>
                        <th className="p-2 border">Truck</th>
                        <th className="p-2 border">Luxury</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const snap = liveSnapshot;
                        if (!snap) return null;
                        const addonMeta = snap.addOnMeta || {};
                        const saved = snap.savedPrices || {};
                        const visible = Array.from(new Map([...builtInAddOns, ...(snap.customAddOns || [])].map(a => [a.id, a])).values())


                          .filter(a => (addonMeta[a.id]?.visible) !== false && !addonMeta[a.id]?.deleted);
                        return visible.map(a => {
                          const getP = (sz: string) => {
                            const val = saved[liveGetKey('addon', a.id, sz)];
                            const isO = val !== undefined && val !== null && val !== "";
                            return { v: isO ? parseFloat(val) : (a.pricing as any)[sz], isO };
                          };
                          const pr = {
                            compact: getP('compact'),
                            midsize: getP('midsize'),
                            truck: getP('truck'),
                            luxury: getP('luxury'),
                          };
                          return (
                            <tr key={a.id} className="odd:bg-white even:bg-zinc-50">
                              <td className="p-2 border font-medium">{a.name}</td>
                              <td className="p-2 border text-right font-black text-black">${pr.compact.v}</td>
                              <td className="p-2 border text-right font-black text-black">${pr.midsize.v}</td>
                              <td className="p-2 border text-right font-black text-black">${pr.truck.v}</td>
                              <td className="p-2 border text-right font-black text-black">${pr.luxury.v}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={recentChangesOpen} onOpenChange={setRecentChangesOpen}>
          <DialogContent className="sm:max-w-4xl bg-zinc-950 border-zinc-800 text-white max-h-[85vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-4 mb-4">
              <div>
                <DialogTitle className="text-2xl font-black text-red-500">RECENT PRICE CHANGES</DialogTitle>
                <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest font-bold">Only showing services with active overrides</p>
              </div>
              <Button variant="outline" size="sm" onClick={generateRecentChangesPDF} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                <FileDown className="w-4 h-4 mr-2" /> Export PDF
              </Button>
            </DialogHeader>

            <div className="space-y-12 pr-2 custom-scrollbar">
              {(() => {
                const history = priceHistory.length > 0 ? priceHistory : getPriceChangeHistory();
                const classifications = ["compact", "midsize", "truck", "luxury"];
                const allPkgs = [
                  ...builtInPackages.map(p => ({ ...p, type: 'package' as const })),
                  ...getCustomPackages().map(p => ({ ...p, type: 'package' as const }))
                ];
                const allAddons = [
                  ...builtInAddOns.map(a => ({ ...a, type: 'addon' as const })),
                  ...getCustomAddOns().map(a => ({ ...a, type: 'addon' as const }))
                ];

                const filterChanges = (items: any[]) => items.filter(item => {
                  return classifications.some(size => {
                    const key = `${item.type}:${item.id}:${size}`;
                    const currentVal = parseFloat(currentPrices[key]) || (item.pricing as any)[size];
                    const baseVal = (item.pricing as any)[size];
                    if (Math.abs(currentVal - baseVal) > 0.01) return true;
                    return history.some(r => r.snapshot && r.snapshot[key] && Math.abs(parseFloat(r.snapshot[key]) - baseVal) > 0.01);
                  });
                });

                const changedPkgs = filterChanges(allPkgs);
                const changedAddons = filterChanges(allAddons);

                if (changedPkgs.length === 0 && changedAddons.length === 0) {
                  return <div className="text-center py-20 text-zinc-600 font-bold italic">No active price overrides detected.</div>;
                }

                const renderItem = (item: any, isAddon: boolean) => (
                  <div key={item.id} className={cn(
                    "border rounded-xl overflow-hidden bg-zinc-900/30",
                    isAddon ? "border-blue-500/20" : "border-zinc-800"
                  )}>
                    <div className={cn(
                      "px-4 py-2 border-b flex justify-between items-center",
                      isAddon ? "bg-blue-900/20 border-blue-800/30" : "bg-zinc-800/50 border-zinc-800"
                    )}>
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">{item.name}</h4>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded border",
                        isAddon ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}>{item.type}</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
                      {classifications.map(size => {
                        const key = `${item.type}:${item.id}:${size}`;
                        const baseVal = (item.pricing as any)[size];
                        
                        const itemHistory = history.filter(r => r.snapshot && r.snapshot[key]);
                        const latestRec = itemHistory[0];
                        const firstRec = [...itemHistory].reverse().find(r => Math.abs(parseFloat(r.snapshot![key]) - baseVal) > 0.01);
                        
                        const currentVal = parseFloat(currentPrices[key]) || baseVal;
                        const hasChanged = Math.abs(currentVal - baseVal) > 0.01;

                        const firstPrice = firstRec ? parseFloat(firstRec.snapshot![key]) : null;
                        const firstDate = firstRec ? new Date(firstRec.date).toLocaleDateString() : null;
                        const currentDate = latestRec ? new Date(latestRec.date).toLocaleDateString() : null;

                        return (
                          <div key={size} className={cn(
                            "p-4 rounded-lg border transition-all space-y-4",
                            hasChanged 
                              ? (isAddon ? "bg-blue-950/30 border-blue-500/60 ring-1 ring-blue-500/20" : "bg-red-950/30 border-red-500/60 ring-1 ring-red-500/20")
                              : "bg-zinc-900 border-zinc-800"
                          )}>
                            <div className="text-[11px] font-black text-white uppercase flex justify-between border-b border-zinc-800 pb-2">
                              <span className={hasChanged ? (isAddon ? "text-blue-400" : "text-red-400") : "text-zinc-400"}>{size}</span>
                              {hasChanged && <span className={isAddon ? "text-blue-400 font-black" : "text-red-400 font-black"}>● MODIFIED</span>}
                            </div>
                            
                            <div className="space-y-4">
                              {/* Original Price */}
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-white uppercase font-black">Original (Base)</span>
                                <span className="text-sm text-white font-mono font-black">${baseVal}</span>
                              </div>

                              {/* First -> Current Shift */}
                              <div className="flex items-center justify-between gap-6 pt-2 border-t border-zinc-800/50">
                                <div className="flex-1">
                                  <div className="text-[10px] text-white mb-1 uppercase font-black">
                                    First {firstDate ? `(${firstDate})` : '(—)'}
                                  </div>
                                  <div className="text-base font-black text-white">${firstPrice ?? baseVal}</div>
                                </div>
                                <div className="text-zinc-500 font-black">→</div>
                                <div className="text-right flex-1">
                                  <div className="text-[10px] text-white mb-1 uppercase font-black">
                                    Current {currentDate ? `(${currentDate})` : '(—)'}
                                  </div>
                                  <div className={cn("text-base font-black", hasChanged ? (isAddon ? "text-blue-400" : "text-red-400") : "text-white")}>
                                    ${currentVal}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );

                return (
                  <div className="space-y-12">
                    {changedPkgs.length > 0 && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 text-red-500 font-black text-xs uppercase tracking-[0.2em]">
                          <div className="h-px flex-1 bg-red-500/20" />
                          Primary Service Packages
                          <div className="h-px flex-1 bg-red-500/20" />
                        </div>
                        {changedPkgs.map(item => renderItem(item, false))}
                      </div>
                    )}
                    
                    {changedAddons.length > 0 && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 text-blue-500 font-black text-xs uppercase tracking-[0.2em]">
                          <div className="h-px flex-1 bg-blue-500/20" />
                          Add-On Services
                          <div className="h-px flex-1 bg-blue-500/20" />
                        </div>
                        {changedAddons.map(item => renderItem(item, true))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
        <ServiceComparisonModal open={comparisonMatrixOpen} onOpenChange={setComparisonMatrixOpen} />
      </main>

      {/* Global Package Pricing Help Modal */}
      <Dialog open={helpModalOpen} onOpenChange={setHelpModalOpen}>
        <DialogContent className="sm:max-w-3xl bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-red-500">Package Pricing Help & Procedure</DialogTitle>
          </DialogHeader>
          <div className="space-y-8 py-4 overflow-y-auto max-h-[75vh] pr-4 custom-scrollbar">
            
            {/* NEW PRICING SECTIONS */}
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white border-b border-zinc-800 pb-1 flex items-center gap-2">
                  <span className="text-red-500">⚙️</span> 1. How Pricing Architecture Works
                </h3>
                <ul className="list-disc list-inside text-zinc-400 text-sm space-y-2 ml-2 leading-relaxed">
                  <li><strong>Centralized Base Prices:</strong> The system relies on hardcoded base prices. This page acts as an "Override Manager".</li>
                  <li><strong>Overrides:</strong> When you set a new price here and hit "Save," it creates an "override" in your local browser and cloud storage. The application will ALWAYS prioritize your overrides over the default code.</li>
                  <li><strong>The Reset Button:</strong> "Reset" is NOT a factory reset. It simply acts as an "Undo" button, returning any unsaved numbers in the boxes back to your last official Save Point.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white border-b border-zinc-800 pb-1 flex items-center gap-2">
                  <span className="text-red-500">🧮</span> 2. Percentage Adjustments (5% & 10%)
                </h3>
                <ul className="list-disc list-inside text-zinc-400 text-sm space-y-2 ml-2 leading-relaxed">
                  <li><strong>Independent Adjustments:</strong> You can use the "Apply 5%" or "Apply 10%" buttons to quickly increase prices for a specific package.</li>
                  <li><strong>Rounding Logic:</strong> The system uses a strict "Ceiling Rounding" formula (<code className="text-red-400 bg-red-950/50 px-1 py-0.5 rounded">Math.ceil</code>). This guarantees that any calculation producing change (e.g., $255.50) will instantly jump up to the next whole dollar (e.g., $256). <strong>No loose change!</strong></li>
                  <li><strong>Sequential Compounding:</strong> The percentage increases calculate based on whatever price is <em>currently saved</em>. If you raise a price and save it, the next time you hit "Apply 10%", it will calculate 10% from the new, higher baseline.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white border-b border-zinc-800 pb-1 flex items-center gap-2">
                  <span className="text-red-500">✍️</span> 3. Manual Overrides
                </h3>
                <ul className="list-disc list-inside text-zinc-400 text-sm space-y-2 ml-2 leading-relaxed">
                  <li><strong>Total Independence:</strong> You are never forced to use percentages. Every box is independent. You can manually type $99 in Compact, $500 in Truck, lower a different package to $50, and leave everything else untouched.</li>
                  <li><strong>Zero Interruption:</strong> Changing one price manually will <em>never</em> break or recalculate the other packages unless you explicitly tell the system to do so.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white border-b border-zinc-800 pb-1 flex items-center gap-2">
                  <span className="text-red-500">💾</span> 4. Saving and Restoring
                </h3>
                <ul className="list-disc list-inside text-zinc-400 text-sm space-y-2 ml-2 leading-relaxed">
                  <li><strong>Saving:</strong> Once you are satisfied with your edits, click "Save" on the individual package, or "Save All" at the top right. This locks the prices in permanently.</li>
                  <li><strong>Restore Pricing from JSON:</strong> If you ever want to revert everything back to a previous state, use the "Backup as JSON" button before you make big changes. You can then use "Restore Pricing from JSON" to instantly load those old prices back into the system.</li>
                </ul>
              </section>
            </div>

            {/* PRE-EXISTING PROCEDURE SECTIONS */}
            <div className="space-y-6 pt-6 border-t border-zinc-800/50">
              <h2 className="text-xl font-black uppercase text-zinc-500 tracking-wider">Additional Procedures</h2>
              
              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white border-b border-zinc-800 pb-1">5. Management Workflow</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  You can manage your pricing and visibility from <span className="text-white font-bold underline">ANY environment</span> (local computer or live website) as long as you are logged in as an <strong>Admin</strong>.
                </p>
                <ul className="list-disc list-inside text-zinc-400 text-sm space-y-1 ml-2">
                  <li>Toggle <strong>"Live"</strong> to show or hide a package.</li>
                  <li>Your choice is saved <strong>instantly</strong> to the cloud database.</li>
                  <li className="text-red-400 font-bold underline">You do NOT need to hit the red "Save" button for visibility changes!</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white border-b border-zinc-800 pb-1">6. Synchronization & Caching</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  The public Services page automatically checks for updates every 2 minutes. 
                </p>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  <strong>Pro Tip:</strong> If your changes don't appear immediately on the website, click the <span className="text-blue-400 font-bold">"Sync with Cloud"</span> button located at the top of the Services page to force a refresh.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white border-b border-zinc-800 pb-1">7. How to Test Correctly</h3>
                <p className="text-zinc-400 text-sm leading-relaxed font-bold text-red-400">
                  IMPORTANT: Always use an "Incognito" or "Private" browser window when testing as a customer.
                </p>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Because you are an Admin, your browser might remember your settings or show you "hidden" items that a regular customer cannot see. Testing in Incognito ensures you see exactly what a non-logged-in visitor sees.
                </p>
              </section>
            </div>

          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-zinc-800">
            <Button className="bg-red-600 hover:bg-red-700 font-bold px-8" onClick={() => setHelpModalOpen(false)}>Understood</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
