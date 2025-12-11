import localforage from 'localforage';
export type VehicleType = 'compact' | 'midsize' | 'truck' | 'luxury';

export interface PackageMeta {
  id: string;
  imageDataUrl?: string; // data URL or remote path
  visible?: boolean; // default true
  stepIds?: string[]; // overrides for steps shown on public pages
  descriptionOverride?: string; // overrides package description used in Learn More modal/cards
  deleted?: boolean;
}

export interface AddOnMeta {
  id: string;
  visible?: boolean; // default true
  stepIds?: string[];
  deleted?: boolean;
}

const PKG_META_KEY = 'packageMeta';
const ADDON_META_KEY = 'addOnMeta';
const CUSTOM_PKGS_KEY = 'customServicePackages';
const CUSTOM_ADDONS_KEY = 'customAddOns';
const CUSTOM_SERVICES_KEY = 'customServices';

function loadMap<T>(key: string): Record<string, T> {
  try { return JSON.parse(localStorage.getItem(key) || '{}') as Record<string, T>; } catch { return {}; }
}
function saveMap<T>(key: string, map: Record<string, T>) {
  localStorage.setItem(key, JSON.stringify(map));
}

export function getPackageMeta(id: string): PackageMeta | undefined {
  const all = loadMap<PackageMeta>(PKG_META_KEY);
  return all[id];
}
export function setPackageMeta(id: string, meta: Partial<PackageMeta>) {
  const all = loadMap<PackageMeta>(PKG_META_KEY);
  const prev = all[id] || { id };
  all[id] = { ...prev, id, ...meta } as PackageMeta;
  saveMap(PKG_META_KEY, all);
}
export function getAllPackageMeta(): Record<string, PackageMeta> {
  return loadMap<PackageMeta>(PKG_META_KEY);
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
  const id = `cs-${Date.now()}-${Math.floor(Math.random()*1000)}`;
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

export async function postFullSync() {
  try {
    const payload = await buildFullSyncPayload();
    await fetch('http://localhost:6061/api/packages/full-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}
}

export async function postServicesFullSync() {
  try {
    const payload = {
      customServices: getCustomServices(),
      packageMeta: getAllPackageMeta(),
      addOnMeta: getAllAddOnMeta(),
    };
    await fetch('http://localhost:6061/api/services/full-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}
}
