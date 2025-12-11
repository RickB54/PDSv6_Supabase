import { useEffect, useState } from "react";
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
  getCustomServices,
  addCustomService,
  updateCustomService,
  deleteCustomService,
  postServicesFullSync,
} from "@/lib/servicesMeta";
import packageBasic from "@/assets/package-basic.jpg";
import packageExpress from "@/assets/package-express.jpg";
import packageExterior from "@/assets/package-exterior.jpg";
import packageInterior from "@/assets/package-interior.jpg";
import packageFull from "@/assets/package-full.jpg";
import packagePremium from "@/assets/package-premium.jpg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Trash2 } from "lucide-react";
import localforage from "localforage";
import { pushAdminAlert } from "@/lib/adminAlerts";
import primeLogo from "@/assets/prime-logo.png";
import jsPDF from "jspdf";
import api from "@/lib/api";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { isSupabaseEnabled } from "@/lib/auth";
import * as supaPkgs from "@/services/supabase/packages";
import * as supaAddOns from "@/services/supabase/addOns";

type Pricing = { compact: number; midsize: number; truck: number; luxury: number };
type PriceMap = Record<string, string>;
const BACKUP_KEY = "savedPrices_backup";
const PERSISTENT_BACKUP_KEY = "savedPrices_restore_point"; // survives Settings → Delete All Data
const ONE_TIME_ORIGINAL_SEED_FLAG = "original_prices_seeded_once";

export default function PackagePricing() {
  const [view, setView] = useState<"packages" | "addons" | "both">("packages");
  const [masterPct, setMasterPct] = useState("");
  const [globalPct, setGlobalPct] = useState("");
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
  const [liveSnapshot, setLiveSnapshot] = useState<any>(null);
  const builtInSizes: string[] = ["compact", "midsize", "truck", "luxury"];
  const [vehicleType, setVehicleType] = useState<string>("compact");
  const [vehicleOptions, setVehicleOptions] = useState<string[]>(builtInSizes);
  const [vehicleLabels, setVehicleLabels] = useState<Record<string, string>>({
    compact: "Compact",
    midsize: "Midsize",
    truck: "Truck",
    luxury: "Luxury",
  });

  const getKey = (type: "package" | "addon", id: string, size: string) => `${type}:${id}:${size}`;
  const shouldUpdate = (key: string, target: "packages" | "addons" | "both") => {
    if (target === "both") return true;
    if (target === "packages") return key.startsWith("package:");
    if (target === "addons") return key.startsWith("addon:");
    return false;
  };

  async function getSavedPrices(): Promise<PriceMap> {
    const local = (await localforage.getItem<PriceMap>("savedPrices")) || {};
    try {
      const res = await fetch(`http://localhost:6061/api/packages/prices?v=${Date.now()}`, {
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
    try {
      await fetch("http://localhost:6061/api/packages/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch { }

    // Supabase write-through: upsert per-vehicle prices for packages/add-ons
    try {
      if (isSupabaseEnabled()) {
        const getVal = (kind: 'package' | 'addon', id: string, vt: keyof Pricing): number => {
          const k = `${kind}:${id}:${vt}`;
          const raw = updated[k];
          const n = raw != null ? parseFloat(raw) : NaN;
          return Number.isFinite(n) ? n : 0;
        };

        const allPackages = [...builtInPackages, ...getCustomPackages()];
        const pkgRows = allPackages.map(p => ({
          id: p.id,
          name: p.name,
          description: (p as any).description || '',
          compact_price: getVal('package', p.id, 'compact') || (p.pricing?.compact ?? p.basePrice ?? 0),
          midsize_price: getVal('package', p.id, 'midsize') || (p.pricing?.midsize ?? p.basePrice ?? 0),
          truck_price: getVal('package', p.id, 'truck') || (p.pricing?.truck ?? p.basePrice ?? 0),
          luxury_price: getVal('package', p.id, 'luxury') || (p.pricing?.luxury ?? p.basePrice ?? 0),
          discount_percent: null,
          discount_start: null,
          discount_end: null,
          is_active: true,
        }));

        const allAddOns = [...builtInAddOns, ...getCustomAddOns()];
        const addRows = allAddOns.map(a => ({
          id: a.id,
          name: a.name,
          description: (a as any).description || '',
          compact_price: getVal('addon', a.id, 'compact') || (a.pricing?.compact ?? a.basePrice ?? 0),
          midsize_price: getVal('addon', a.id, 'midsize') || (a.pricing?.midsize ?? a.basePrice ?? 0),
          truck_price: getVal('addon', a.id, 'truck') || (a.pricing?.truck ?? a.basePrice ?? 0),
          luxury_price: getVal('addon', a.id, 'luxury') || (a.pricing?.luxury ?? a.basePrice ?? 0),
          discount_percent: null,
          discount_start: null,
          discount_end: null,
          is_active: true,
        }));

        try { await supaPkgs.upsert(pkgRows); } catch { }
        try { await supaAddOns.upsert(addRows); } catch { }
      }
    } catch { }
  }

  async function saveToLocalforage(updated: PriceMap) {
    await localforage.setItem("savedPrices", updated);
  }

  // Helper to silently ping backend live API after saves (no new tab)
  const openPackagesLiveInBrowser = async () => {
    try {
      const url = `http://localhost:6061/api/packages/live?v=${Date.now()}`;
      await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
      try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'packages' } })); } catch { }
    } catch { }
  };

  // Soft refresh signal for Website preview without opening tabs
  const forceWebsiteTabRefresh = async () => {
    try {
      await fetch(`http://localhost:6061/api/packages/sync?v=${Date.now()}`, { method: 'POST' });
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
      const res = await fetch(`http://localhost:6061/api/packages/live?v=${Date.now()}`, {
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

  const downloadPricesPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const snapshot = liveSnapshot;
    const pkgMeta = snapshot?.packageMeta || {};
    const addonMeta = snapshot?.addOnMeta || {};
    const saved = snapshot?.savedPrices || {};
    const visiblePkgs = [...builtInPackages, ...(snapshot?.customPackages || [])].filter(p => (pkgMeta[p.id]?.visible) !== false && !pkgMeta[p.id]?.deleted);
    const visibleAddons = [...builtInAddOns, ...(snapshot?.customAddOns || [])].filter(a => (addonMeta[a.id]?.visible) !== false && !addonMeta[a.id]?.deleted);
    const rowHtml = (name: string, pricing: any) => `
      <tr>
        <td style=\"padding:8px;border:1px solid #ddd\">${name}</td>
        <td style=\"padding:8px;border:1px solid #ddd;text-align:right\">$${pricing.compact}</td>
        <td style=\"padding:8px;border:1px solid #ddd;text-align:right\">$${pricing.midsize}</td>
        <td style=\"padding:8px;border:1px solid #ddd;text-align:right\">$${pricing.truck}</td>
        <td style=\"padding:8px;border:1px solid #ddd;text-align:right\">$${pricing.luxury}</td>
      </tr>`;
    const getPrice = (type: 'package' | 'addon', id: string) => ({
      compact: parseFloat(saved[liveGetKey(type, id, 'compact')]) || 0,
      midsize: parseFloat(saved[liveGetKey(type, id, 'midsize')]) || 0,
      truck: parseFloat(saved[liveGetKey(type, id, 'truck')]) || 0,
      luxury: parseFloat(saved[liveGetKey(type, id, 'luxury')]) || 0,
    });
    const pkgRows = visiblePkgs.map(p => rowHtml(p.name, getPrice('package', p.id))).join('');
    const addonRows = visibleAddons.map(a => rowHtml(a.name, getPrice('addon', a.id))).join('');
    const today = new Date().toLocaleDateString();
    const logoSrc = primeLogo;
    win.document.write(`
      <html>
        <head>
          <title>Current Live Pricing — Prime Detail Solutions</title>
          <style>
            body{font-family:Arial, sans-serif; padding:24px;}
            h1{color:#dc2626;}
            .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
            .table-title{margin-top:24px;color:#dc2626}
            table{border-collapse:collapse;width:100%;}
            thead th{background:#dc2626;color:#fff;padding:10px;border:1px solid #b91c1c}
            tr:nth-child(even){background:#f9f9f9}
          </style>
        </head>
        <body>
          <div class=\"header\">
            <img src=\"${logoSrc}\" alt=\"Prime Detail Solutions\" style=\"height:48px\"/>
            <div style=\"text-align:right;color:#444\">${today}</div>
          </div>
          <h1>Current Live Pricing — Prime Detail Solutions</h1>
          <h2 class=\"table-title\">Packages</h2>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Compact</th>
                <th>Midsize</th>
                <th>Truck</th>
                <th>Luxury</th>
              </tr>
            </thead>
            <tbody>
              ${pkgRows}
            </tbody>
          </table>
          <h2 class=\"table-title\">Add-Ons</h2>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Compact</th>
                <th>Midsize</th>
                <th>Truck</th>
                <th>Luxury</th>
              </tr>
            </thead>
            <tbody>
              ${addonRows}
            </tbody>
          </table>
          <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>
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
      await postServicesFullSync();
      await refreshLiveAfterSync();
      toast.success('Pricing restored from backup — live site updated');
      setViewAllOpen(false);
    } catch (error) {
      toast.error('Restore failed. Invalid file or format.');
    }
  };

  useEffect(() => {
    const load = async () => {
      // Prefill immediately from website definitions so inputs are never empty
      const seededDefault = seedFromDefinitions();
      setSavedPrices(seededDefault);
      setCurrentPrices(seededDefault);

      let lastSaved = await getSavedPrices();
      let backup = await getBackupPrices();

      // ONE-TIME INJECTION: Set original website prices as the baseline exactly once
      const hasSeeded = localStorage.getItem(ONE_TIME_ORIGINAL_SEED_FLAG) === "true";
      if (!hasSeeded) {
        const seeded = seedFromDefinitions();
        // Persist locally for immediate baseline; let you click Save All to publish
        await saveToLocalforage(seeded);
        // Prime backups to these original values
        await saveBackupPrices(seeded);
        savePersistentBackup(seeded);
        localStorage.setItem(ONE_TIME_ORIGINAL_SEED_FLAG, "true");
        setSavedPrices(seeded);
        setCurrentPrices(seeded);
        toast.success("Original website prices loaded one-time. Click Save All to lock.");
        return;
      }
      // Seed baseline from definitions if nothing saved yet
      if (Object.keys(lastSaved).length === 0) {
        const seeded = seedFromDefinitions();
        await saveToLocalforage(seeded);
        await saveToBackend(seeded);
        lastSaved = seeded;
      }
      // Initialize backup if missing
      if (Object.keys(backup).length === 0) {
        const initialBackup = Object.keys(lastSaved).length > 0 ? lastSaved : seedFromDefinitions();
        await saveBackupPrices(initialBackup);
        backup = initialBackup;
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
        const res = await fetch(`http://localhost:6061/api/vehicle-types/live?v=${Date.now()}`, {
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const opts = data.map((v: any) => v.id).filter(Boolean);
            const map: Record<string, string> = {};
            data.forEach((v: any) => { if (v?.id) map[v.id] = v?.name || v.id; });
            map.compact = map.compact || 'Compact';
            map.midsize = map.midsize || 'Midsize';
            map.truck = map.truck || 'Truck';
            map.luxury = map.luxury || 'Luxury';
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
      updated[key] = String(Math.round(base * factor));
    });
    setCurrentPrices(updated);
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
        updated[key] = String(Math.round(oldVal * factor));
      }
    });
    setCurrentPrices(updated);
    setMasterPct('');
    toast.success(`Applied ${pct > 0 ? '+' : ''}${pct}% to ${target === 'both' ? 'EVERYTHING' : target}`);
  };

  const applyGlobal = () => {
    const pct = parseFloat(globalPct) || 0;
    if (pct === 0) return;
    const factor = 1 + (pct / 100);
    const updated: PriceMap = { ...currentPrices };
    Object.keys(savedPrices).forEach(key => {
      const oldVal = parseFloat(savedPrices[key]) || 0;
      updated[key] = String(Math.round(oldVal * factor));
    });
    setCurrentPrices(updated);
    setGlobalPct('');
    toast.success(`NUCLEAR UPDATE: ${pct > 0 ? '+' : ''}${pct}% APPLIED TO ALL PRICES`);
  };

  const saveOne = async (keys: string[]) => {
    // Preserve previous baseline as backup before overwriting
    await saveBackupPrices(savedPrices);
    const updated: PriceMap = { ...savedPrices };
    keys.forEach(key => {
      const value = Math.ceil(parseFloat(currentPrices[key]) || 0).toString();
      updated[key] = value;
    });
    // Apply any pending visibility change for the entity corresponding to the keys
    const sample = keys[0];
    const parts = sample.split(":");
    const type = parts[0] as 'package' | 'addon';
    const id = parts[1];
    if (type === 'package') {
      const pend = pendingVisibilityPkg[id];
      if (typeof pend !== 'undefined') { setPackageMeta(id, { visible: pend }); delete pendingVisibilityPkg[id]; setPendingVisibilityPkg({ ...pendingVisibilityPkg }); }
    } else {
      const pend = pendingVisibilityAddon[id];
      if (typeof pend !== 'undefined') { setAddOnMeta(id, { visible: pend }); delete pendingVisibilityAddon[id]; setPendingVisibilityAddon({ ...pendingVisibilityAddon }); }
    }
    await saveToBackend(updated);
    await saveToLocalforage(updated);
    setSavedPrices(updated);
    setCurrentPrices(updated);
    const label = keys.length === 1 ? keys[0] : `${keys[0].split(":")[0]}:${keys[0].split(":")[1]}`;
    // Full live sync after a price save
    await postFullSync();
    forceWebsiteTabRefresh();
    forceBookNowTabRefresh();
    openPackagesLiveInBrowser();
    toast.success(`${label} → prices saved as NEW BASELINE`);
    try {
      pushAdminAlert('pricing_update', `Pricing updated: ${label}`, 'system', { recordType: 'Pricing', keys });
    } catch { }
  };

  const saveAll = async () => {
    // Preserve entire previous baseline as backup before global overwrite
    await saveBackupPrices(savedPrices);
    const rounded: PriceMap = {};
    Object.keys(currentPrices).forEach(key => {
      rounded[key] = Math.ceil(parseFloat(currentPrices[key]) || 0).toString();
    });
    await saveToBackend(rounded);
    await saveToLocalforage(rounded);
    setSavedPrices(rounded);
    setCurrentPrices(rounded);
    // Apply all pending visibility changes
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
    // Update persistent restore point to ALWAYS remember your latest saved prices
    savePersistentBackup(rounded);
    await fetch("http://localhost:6061/api/packages/sync", { method: "POST" });
    await postFullSync();
    forceWebsiteTabRefresh();
    forceBookNowTabRefresh();
    openPackagesLiveInBrowser();
    toast.success("ALL PRICES LOCKED IN FOREVER + WEBSITE UPDATED");
    try {
      pushAdminAlert('pricing_update', 'Pricing updated: ALL prices', 'system', { recordType: 'Pricing' });
    } catch { }
  };

  const restoreAllPrices = async () => {
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
    try { await fetch("http://localhost:6061/api/packages/sync", { method: "POST" }); } catch { }
    await postFullSync();
    forceWebsiteTabRefresh();
    forceBookNowTabRefresh();
    openPackagesLiveInBrowser();
  };

  // Utilities: image mapping for current live assets
  const packageImages: Record<string, string> = {
    "basic-exterior": packageBasic,
    "express-wax": packageExpress,
    "full-exterior": packageExterior,
    "interior-cleaning": packageInterior,
    "full-detail": packageFull,
    "premium-detail": packagePremium,
  };

  const getLiveImage = (id: string) => {
    const meta = getPackageMeta(id);
    return meta?.imageDataUrl || packageImages[id] || "";
  };

  const handleImageUpload = async (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      // Draw to 300x200 canvas with object-fit: cover behavior
      try {
        const img = new Image();
        img.onload = async () => {
          const targetW = 300, targetH = 200;
          const canvas = document.createElement('canvas');
          canvas.width = targetW; canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const scale = Math.max(targetW / img.width, targetH / img.height);
            const sw = img.width * scale;
            const sh = img.height * scale;
            const dx = (targetW - sw) / 2;
            const dy = (targetH - sh) / 2;
            ctx.drawImage(img, dx, dy, sw, sh);
            const out = canvas.toDataURL('image/jpeg', 0.92);
            setPackageMeta(id, { imageDataUrl: out });
            await postFullSync();
            await refreshLiveAfterSync();
            toast.success("Package image updated and synced");
            return;
          }
          setPackageMeta(id, { imageDataUrl: dataUrl });
        };
        img.src = dataUrl;
      } catch {
        setPackageMeta(id, { imageDataUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
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
    try {
      await postFullSync();
      forceWebsiteTabRefresh();
      forceBookNowTabRefresh();
      openPackagesLiveInBrowser();
      toast.success(`${type === 'package' ? 'Package' : 'Add-On'} visibility updated live.`);
    } catch (e) {
      toast.error('Failed to sync visibility. Please try again.');
    }
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
    if (type === 'package') {
      // If custom, remove; if built-in, mark deleted
      const isCustom = !!getCustomPackages().find(p => p.id === id);
      if (isCustom) deleteCustomPackage(id); else setPackageMeta(id, { deleted: true, visible: false, imageDataUrl: undefined });
    } else {
      const isCustomA = !!getCustomAddOns().find(a => a.id === id);
      if (isCustomA) deleteCustomAddOn(id); else setAddOnMeta(id, { deleted: true, visible: false });
    }
    await postFullSync();
    forceWebsiteTabRefresh();
    forceBookNowTabRefresh();
    openPackagesLiveInBrowser();
    toast.success("Deleted and synced");
    // Refresh currentPrices to drop deleted entries visually
    const updated: PriceMap = { ...currentPrices };
    Object.keys(updated).forEach(k => { if (k.includes(`:${id}:`)) delete updated[k]; });
    setCurrentPrices(updated);
  };

  const handleNewPackageSave = async () => {
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

  return (
    <div>
      <PageHeader title="Package Pricing" />
      <div className="p-4 space-y-6 max-w-screen-xl mx-auto overflow-x-hidden">
        {/* REORGANIZED PRICING CONTROLS */}
        <div className="bg-zinc-900/70 backdrop-blur border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Edit Pricing</h2>
          <p className="text-zinc-400 mb-6">Changes apply everywhere, including the live website.</p>

          {/* Vehicle Type Selector - Front and Center */}
          <div className="mb-6 flex items-center gap-4">
            <Label className="text-white text-lg font-semibold">Vehicle Type:</Label>
            <Select value={vehicleType} onValueChange={(v) => setVehicleType(v)}>
              <SelectTrigger className="w-64 bg-zinc-900 border-zinc-700 text-white text-lg">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 text-white">
                {vehicleOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{vehicleLabels[opt] || opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Accordion type="multiple" className="space-y-4">
            {/* Increase % Section */}
            <AccordionItem value="increase" className="border border-zinc-700 rounded-lg">
              <AccordionTrigger className="px-4 text-white hover:no-underline">
                <span className="text-lg font-semibold">Increase % by Category</span>
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
            <AccordionItem value="view-export" className="border border-zinc-700 rounded-lg">
              <AccordionTrigger className="px-4 text-white hover:no-underline">
                <span className="text-lg font-semibold">View & Export Pricing</span>
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
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-6"
                    onClick={generateAddOnsListPDF}
                  >
                    Add-Ons List (PDF)
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Show Services Section */}
            <AccordionItem value="show-services" className="border border-zinc-700 rounded-lg">
              <AccordionTrigger className="px-4 text-white hover:no-underline">
                <span className="text-lg font-semibold">Show Services</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Button size="lg" variant={view === 'packages' ? 'default' : 'outline'} onClick={() => setView('packages')}>Show Packages</Button>
                  <Button size="lg" variant={view === 'addons' ? 'default' : 'outline'} onClick={() => setView('addons')}>Show Add-Ons</Button>
                  <Button size="lg" variant={view === 'both' ? 'default' : 'outline'} onClick={() => setView('both')}>Show Both</Button>
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

        {/* Packages grid */}
        {(view === "packages" || view === "both") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...builtInPackages, ...getCustomPackages()].filter(pkg => !getPackageMeta(pkg.id)?.deleted).map(pkg => (
              <Card key={pkg.id} className="p-4 space-y-3">
                <h3 className="font-semibold">{pkg.name}</h3>
                {/* Picture Upload Area (packages only) */}
                <div className="flex flex-col md:flex-row md:flex-nowrap items-start gap-3">
                  <img src={getLiveImage(pkg.id)} alt={pkg.name} className="w-full md:w-[300px] md:h-[200px] object-contain md:shrink-0 rounded border border-zinc-700 shadow" />
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
                      value={currentPrices[getKey('package', pkg.id, vehicleType)] || ''}
                      onChange={(e) => handleChange(getKey('package', pkg.id, vehicleType), e.target.value)}
                    />
                  </div>
                </div>
                <div className="button-group-responsive flex gap-2 flex-wrap md:flex-nowrap max-w-full">
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
            ))}
          </div>
        )}

        {/* Add-ons grid */}
        {(view === "addons" || view === "both") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...builtInAddOns, ...getCustomAddOns()].filter(a => !getAddOnMeta(a.id)?.deleted).map(addon => (
              <Card key={addon.id} className="p-4 space-y-3">
                <h3 className="font-semibold">{addon.name}</h3>
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
                      value={currentPrices[getKey('addon', addon.id, vehicleType)] || ''}
                      onChange={(e) => handleChange(getKey('addon', addon.id, vehicleType), e.target.value)}
                    />
                  </div>
                </div>
                <div className="button-group-responsive flex gap-2 flex-wrap md:flex-nowrap max-w-full">
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
            ))}
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
                <img src={newPkgForm.imageDataUrl || packageBasic} className="shrink-0 w-[300px] h-[200px] object-cover rounded border shadow" />
                <div className="min-w-0 flex-1">
                  <Label className="text-xs">Change Package Image</Label>
                  <input type="file" accept="image/png,image/jpeg" onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const r = new FileReader(); r.onload = () => {
                      const dataUrl = String(r.result || '');
                      try {
                        const img = new Image();
                        img.onload = () => {
                          const targetW = 300, targetH = 200;
                          const canvas = document.createElement('canvas');
                          canvas.width = targetW; canvas.height = targetH;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            const scale = Math.max(targetW / img.width, targetH / img.height);
                            const sw = img.width * scale;
                            const sh = img.height * scale;
                            const dx = (targetW - sw) / 2;
                            const dy = (targetH - sh) / 2;
                            ctx.drawImage(img, dx, dy, sw, sh);
                            const out = canvas.toDataURL('image/jpeg', 0.92);
                            setNewPkgForm(prev => ({ ...prev, imageDataUrl: out }));
                            return;
                          }
                          setNewPkgForm(prev => ({ ...prev, imageDataUrl: dataUrl }));
                        };
                        img.src = dataUrl;
                      } catch {
                        setNewPkgForm(prev => ({ ...prev, imageDataUrl: dataUrl }));
                      }
                    }; r.readAsDataURL(f);
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
        {/* View All Prices Modal */}
        <Dialog open={viewAllOpen} onOpenChange={setViewAllOpen}>
          <DialogContent className="sm:max-w-[95vw] lg:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Current Live Pricing — Prime Detail Solutions</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-end gap-3 mb-4">
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
                        const visible = [...builtInPackages, ...(snap.customPackages || [])]
                          .filter(p => (pkgMeta[p.id]?.visible) !== false && !pkgMeta[p.id]?.deleted);
                        return visible.map(p => {
                          const pricing = {
                            compact: parseFloat(saved[liveGetKey('package', p.id, 'compact')]) || p.pricing.compact,
                            midsize: parseFloat(saved[liveGetKey('package', p.id, 'midsize')]) || p.pricing.midsize,
                            truck: parseFloat(saved[liveGetKey('package', p.id, 'truck')]) || p.pricing.truck,
                            luxury: parseFloat(saved[liveGetKey('package', p.id, 'luxury')]) || p.pricing.luxury,
                          };
                          return (
                            <tr key={p.id} className="odd:bg-white even:bg-zinc-50">
                              <td className="p-2 border">{p.name}</td>
                              <td className="p-2 border text-right">${pricing.compact}</td>
                              <td className="p-2 border text-right">${pricing.midsize}</td>
                              <td className="p-2 border text-right">${pricing.truck}</td>
                              <td className="p-2 border text-right">${pricing.luxury}</td>
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
                        const visible = [...builtInAddOns, ...(snap.customAddOns || [])]
                          .filter(a => (addonMeta[a.id]?.visible) !== false && !addonMeta[a.id]?.deleted);
                        return visible.map(a => {
                          const pricing = {
                            compact: parseFloat(saved[liveGetKey('addon', a.id, 'compact')]) || a.pricing.compact,
                            midsize: parseFloat(saved[liveGetKey('addon', a.id, 'midsize')]) || a.pricing.midsize,
                            truck: parseFloat(saved[liveGetKey('addon', a.id, 'truck')]) || a.pricing.truck,
                            luxury: parseFloat(saved[liveGetKey('addon', a.id, 'luxury')]) || a.pricing.luxury,
                          };
                          return (
                            <tr key={a.id} className="odd:bg-white even:bg-zinc-50">
                              <td className="p-2 border">{a.name}</td>
                              <td className="p-2 border text-right">${pricing.compact}</td>
                              <td className="p-2 border text-right">${pricing.midsize}</td>
                              <td className="p-2 border text-right">${pricing.truck}</td>
                              <td className="p-2 border text-right">${pricing.luxury}</td>
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
      </div>
    </div>
  );
}
