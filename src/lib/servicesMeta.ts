import localforage from 'localforage';
export type VehicleType = 'compact' | 'midsize' | 'truck' | 'luxury';

export interface PackageMeta {
  id: string;
  imageDataUrl?: string; // data URL or remote path
  visible?: boolean; // default true
  stepIds?: string[]; // overrides for steps shown on public pages
  stepNameOverrides?: Record<string, string>; // custom step names mapped by ID
  descriptionOverride?: string; // overrides package description used in Learn More modal/cards
  deleted?: boolean;
}

export interface AddOnMeta {
  id: string;
  visible?: boolean; // default true
  stepIds?: string[];
  stepNameOverrides?: Record<string, string>; // custom step names mapped by ID
  deleted?: boolean;
}

const PKG_META_KEY = 'packageMeta';
const ADDON_META_KEY = 'addOnMeta';
const CUSTOM_PKGS_KEY = 'customServicePackages';
const CUSTOM_ADDONS_KEY = 'customAddOns';
const CUSTOM_SERVICES_KEY = 'customServices';
const PRICE_HISTORY_KEY = 'priceChangeHistory';

const LEGACY_PKG_IDS = [
  'basic-exterior', 'express-wax', 'full-exterior', 'interior-cleaning', 'full-detail', 'premium-detail'
];

function loadMap<T>(key: string): Record<string, T> {
  try { return JSON.parse(localStorage.getItem(key) || '{}') as Record<string, T>; } catch { return {}; }
}
function saveMap<T>(key: string, map: Record<string, T>) {
  localStorage.setItem(key, JSON.stringify(map));
}

export function getPackageMeta(id: string): PackageMeta | undefined {
  const all = loadMap<PackageMeta>(PKG_META_KEY);
  if (all[id]) return all[id];

  // Default for legacy 2025 packages is hidden (Archived)
  if (LEGACY_PKG_IDS.includes(id)) {
    return { id, visible: false };
  }

  // DEFAULT VISIBILITY:
  // Prime Elite packages should be HIDDEN by default until the admin decides to show them.
  if (id.startsWith('prime-elite')) {
    return { id, visible: false };
  }

  return undefined;
}
export function setPackageMeta(id: string, meta: Partial<PackageMeta>) {
  const all = loadMap<PackageMeta>(PKG_META_KEY);
  const prev = all[id] || { id };
  all[id] = { ...prev, id, ...meta } as PackageMeta;
  saveMap(PKG_META_KEY, all);
}
export function getAllPackageMeta(): Record<string, PackageMeta> {
  const all = loadMap<PackageMeta>(PKG_META_KEY);

  // Ensure legacy packages are included with hidden status if not explicitly overridden
  LEGACY_PKG_IDS.forEach(id => {
    if (all[id] === undefined) {
      all[id] = { id, visible: false };
    }
  });

  return all;
}

export function getAddOnMeta(id: string): AddOnMeta | undefined {
  const all = loadMap<AddOnMeta>(ADDON_META_KEY);
  return all[id];
}
export function setAddOnMeta(id: string, meta: Partial<AddOnMeta>) {
  const all = loadMap<AddOnMeta>(ADDON_META_KEY);
  const prev = all[id] || { id };
  all[id] = { ...prev, id, ...meta } as AddOnMeta;
  saveMap(ADDON_META_KEY, all);
}
export function getAllAddOnMeta(): Record<string, AddOnMeta> {
  return loadMap<AddOnMeta>(ADDON_META_KEY);
}

export interface CustomServicePackageDef {
  id: string;
  name: string;
  description?: string;
  pricing: { compact: number; midsize: number; truck: number; luxury: number };
  steps: { id: string; name: string; category: 'exterior' | 'interior' | 'final' }[];
}

export interface CustomAddOnDef {
  id: string;
  name: string;
  description?: string;
  learnMoreLink?: string;
  basePrice?: number;
  pricing: { compact: number; midsize: number; truck: number; luxury: number };
}

export function getCustomPackages(): CustomServicePackageDef[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_PKGS_KEY) || '[]'); } catch { return []; }
}
export function saveCustomPackage(pkg: CustomServicePackageDef) {
  const all = getCustomPackages().filter(p => p.id !== pkg.id);
  all.push(pkg);
  localStorage.setItem(CUSTOM_PKGS_KEY, JSON.stringify(all));
}
export function deleteCustomPackage(id: string) {
  const all = getCustomPackages().filter(p => p.id !== id);
  localStorage.setItem(CUSTOM_PKGS_KEY, JSON.stringify(all));
  // Also remove meta
  const meta = getAllPackageMeta(); delete meta[id]; saveMap(PKG_META_KEY, meta);
}

export function getCustomAddOns(): CustomAddOnDef[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_ADDONS_KEY) || '[]'); } catch { return []; }
}
export function saveCustomAddOn(addon: CustomAddOnDef) {
  const all = getCustomAddOns().filter(a => a.id !== addon.id);
  all.push(addon);
  localStorage.setItem(CUSTOM_ADDONS_KEY, JSON.stringify(all));
}
export function deleteCustomAddOn(id: string) {
  const all = getCustomAddOns().filter(a => a.id !== id);
  localStorage.setItem(CUSTOM_ADDONS_KEY, JSON.stringify(all));
  const meta = getAllAddOnMeta(); delete meta[id]; saveMap(ADDON_META_KEY, meta);
}

export interface CustomServiceDef { id: string; name: string }
export function getCustomServices(): CustomServiceDef[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_SERVICES_KEY) || '[]'); } catch { return []; }
}
export function addCustomService(name: string): CustomServiceDef {
  const id = `cs-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const all = getCustomServices();
  const svc = { id, name };
  all.push(svc);
  localStorage.setItem(CUSTOM_SERVICES_KEY, JSON.stringify(all));
  return svc;
}
export function updateCustomService(id: string, name: string) {
  const all = getCustomServices().map(s => s.id === id ? { ...s, name } : s);
  localStorage.setItem(CUSTOM_SERVICES_KEY, JSON.stringify(all));
}
export function deleteCustomService(id: string) {
  // remove from global list
  const all = getCustomServices().filter(s => s.id !== id);
  localStorage.setItem(CUSTOM_SERVICES_KEY, JSON.stringify(all));
  // cascade removal from all package/add-on metas
  const pkgMeta = getAllPackageMeta();
  Object.keys(pkgMeta).forEach(pid => {
    const m = pkgMeta[pid];
    if (m.stepIds) m.stepIds = m.stepIds.filter(sid => sid !== id);
  });
  saveMap(PKG_META_KEY, pkgMeta);
  const addMeta = getAllAddOnMeta();
  Object.keys(addMeta).forEach(aid => {
    const m = addMeta[aid];
    if (m.stepIds) m.stepIds = m.stepIds.filter(sid => sid !== id);
  });
  saveMap(ADDON_META_KEY, addMeta);
}

export interface PriceChangeRecord {
  id: string;
  date: string;
  type: 'manual' | 'percentage' | 'restore' | 'reset' | 'global' | 'master';
  description: string;
  snapshot?: Record<string, string>;
}

export function getPriceChangeHistory(): PriceChangeRecord[] {
  try {
    const raw = localStorage.getItem(PRICE_HISTORY_KEY);
    if (!raw) return [];
    
    const history = JSON.parse(raw) as PriceChangeRecord[];
    // Filter history to only retain entries from 5/24/2026 1:38:40 PM (EDT) and newer
    const cutoff = new Date("2026-05-24T13:38:39.000-04:00").getTime();
    
    const cleanHistory = history.filter(r => {
      // Keep if the date is greater than or equal to the cutoff
      return new Date(r.date).getTime() >= cutoff;
    });

    localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(cleanHistory));
    return cleanHistory;
  } catch {
    return [];
  }
}

export function logPriceChange(record: Omit<PriceChangeRecord, 'id' | 'date'>) {
  const history = getPriceChangeHistory();
  // Attempt to capture current state if not explicitly passed
  let snapshot = record.snapshot;
  if (!snapshot) {
    try {
      snapshot = JSON.parse(localStorage.getItem('savedPrices') || '{}');
    } catch {
      snapshot = {};
    }
  }

  const newRecord: PriceChangeRecord = {
    id: `ph-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: new Date().toISOString(),
    ...record,
    snapshot
  };
  history.unshift(newRecord);
  if (history.length > 200) history.pop(); // keep last 200 records
  localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(history));
}

export function deletePriceChangeRecord(id: string) {
  try {
    const raw = localStorage.getItem(PRICE_HISTORY_KEY);
    if (raw) {
      const history = JSON.parse(raw) as PriceChangeRecord[];
      const updated = history.filter(r => r.id !== id);
      localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error("Failed to delete price change record", e);
  }
}

export function updatePriceChangeRecordDescription(id: string, newDescription: string) {
  try {
    const raw = localStorage.getItem(PRICE_HISTORY_KEY);
    if (raw) {
      const history = JSON.parse(raw) as PriceChangeRecord[];
      const updated = history.map(r => r.id === id ? { ...r, description: newDescription } : r);
      localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error("Failed to update price change record description", e);
  }
}

// Build a snapshot payload for full-sync API
export async function buildFullSyncPayload(): Promise<any> {
  // Pricing from localforage
  let savedPrices: Record<string, string> = {};
  try {
    const item = await localforage.getItem<Record<string, string>>('savedPrices');
    savedPrices = item || {};
  } catch (e) {
    // ignore
  }
  return {
    savedPrices,
    packageMeta: getAllPackageMeta(),
    addOnMeta: getAllAddOnMeta(),
    customPackages: getCustomPackages(),
    customAddOns: getCustomAddOns(),
  };
}

const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ? 'http://localhost:6066/api' : '/api';

export async function postFullSync() {
  try {
    const payload = await buildFullSyncPayload();
    await fetch(`${API_BASE}/packages/full-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch { }
}

export async function postServicesFullSync() {
  try {
    const payload = {
      customServices: getCustomServices(),
      packageMeta: getAllPackageMeta(),
      addOnMeta: getAllAddOnMeta(),
    };
    await fetch(`${API_BASE}/services/full-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch { }
}
