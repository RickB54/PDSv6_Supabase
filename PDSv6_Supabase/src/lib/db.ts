import localforage from "localforage";
import { pushAdminAlert } from "@/lib/adminAlerts";

// Centralized local DB using IndexedDB via localforage
localforage.config({ name: "prime-detail-db" });

const KEYS = {
  customers: "customers",
  estimates: "estimates",
  invoices: "invoices",
  expenses: "expenses",
  meta: "meta",
  sub_contractors: "sub_contractors",
  client_upsells: "client_upsells",
  client_evaluations: "client_evaluations",
  detailing_vendors: "detailing_vendors",
} as const;

type GenericWithId = { id: string };

const genId = () =>
(typeof crypto !== "undefined" && "randomUUID" in crypto
  ? (crypto as any).randomUUID()
  : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

async function getArray<T>(key: string): Promise<T[]> {
  const arr = (await localforage.getItem<T[]>(key)) || [];
  return Array.isArray(arr) ? arr : [];
}

async function setArray<T>(key: string, value: T[]): Promise<void> {
  await localforage.setItem(key, value);
}

// Customers
export async function getCustomers<T extends GenericWithId>(): Promise<T[]> {
  return getArray<T>(KEYS.customers);
}

export async function upsertCustomer<T extends Partial<GenericWithId>>(cust: T): Promise<GenericWithId & T> {
  const list = await getArray<any>(KEYS.customers);
  const now = new Date().toISOString();
  let saved: any;
  if (cust.id) {
    const idx = list.findIndex((c: any) => c.id === cust.id);
    if (idx >= 0) {
      const existing = list[idx];
      saved = { ...existing, ...cust, updatedAt: now, createdAt: existing.createdAt || now };
      list[idx] = saved;
    } else {
      saved = { id: String(cust.id), ...cust, createdAt: now, updatedAt: now };
      list.push(saved);
    }
  } else {
    saved = { id: genId(), ...cust, createdAt: now, updatedAt: now };
    list.push(saved);
  }
  await setArray(KEYS.customers, list);
  try {
    const isNew = !cust.id;
    if (isNew) {
      pushAdminAlert('customer_added', `New customer added: ${String((saved as any).name || '').trim()}`, 'system', { id: saved.id, recordType: 'Customer' });
    }
  } catch { }
  return saved;
}

export async function deleteCustomer(id: string): Promise<void> {
  const list = await getArray<any>(KEYS.customers);
  const next = list.filter((c: any) => c.id !== id);
  await setArray(KEYS.customers, next);
}
export async function purgeTestCustomers(): Promise<void> {
  const list = await getArray<any>(KEYS.customers);
  const next = list.filter((c: any) => !["John Smith", "Sarah Johnson"].includes(String(c.name || "").trim()));
  if (next.length !== list.length) {
    await setArray(KEYS.customers, next);
  }
}

// Estimates
export async function getEstimates<T extends GenericWithId>(): Promise<T[]> {
  return getArray<T>(KEYS.estimates);
}

export async function upsertEstimate<T extends Partial<GenericWithId>>(estimate: T): Promise<GenericWithId & T> {
  const list = await getArray<any>(KEYS.estimates);
  let saved: any;
  if (estimate.id) {
    const idx = list.findIndex((e: any) => e.id === estimate.id);
    if (idx >= 0) {
      // Update existing
      saved = { ...list[idx], ...estimate };
      list[idx] = saved;
    } else {
      // Insert with specified ID
      saved = { id: String(estimate.id), ...estimate };
      list.push(saved);
    }
  } else {
    // New
    saved = { id: genId(), ...estimate };
    list.push(saved);
  }
  await setArray(KEYS.estimates, list);
  return saved;
}

// Keep addEstimate for backward compatibility if needed, but wrap upsert
export async function addEstimate<T>(estimate: T): Promise<GenericWithId & T> {
  return upsertEstimate(estimate as any);
}

export async function deleteEstimate(id: string): Promise<void> {
  const estimates = await getEstimates();
  const filtered = estimates.filter((e: any) => e.id !== id);
  await setArray(KEYS.estimates, filtered);
}

// Invoices (placeholders for future pages to use)
export async function getInvoices<T extends GenericWithId>(): Promise<T[]> {
  return getArray<T>(KEYS.invoices);
}

export async function upsertInvoice<T extends Partial<GenericWithId>>(inv: T): Promise<GenericWithId & T> {
  const list = await getArray<any>(KEYS.invoices);
  let saved: any;
  if (inv.id) {
    const idx = list.findIndex((c: any) => c.id === inv.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...inv };
      saved = list[idx];
    } else {
      saved = { id: String(inv.id), ...inv };
      list.push(saved);
    }
  } else {
    saved = { id: genId(), ...inv };
    list.push(saved);
  }
  await setArray(KEYS.invoices, list);
  try {
    const isNew = !inv.id;
    if (isNew) {
      pushAdminAlert('invoice_created', `Invoice created: #${String((saved as any).invoiceNumber || '')}`, 'system', { id: saved.id, recordType: 'Invoice', amount: (saved as any).total });
    }
    const status = String((saved as any).paymentStatus || 'unpaid');
    if (status !== 'paid') {
      pushAdminAlert('invoice_unpaid', `Invoice unpaid: #${String((saved as any).invoiceNumber || '')}`, 'system', { id: saved.id, recordType: 'Invoice', amountDue: ((saved as any).total || 0) - ((saved as any).paidAmount || 0) });
    }
    // Accounting updates reflect financial changes
    pushAdminAlert('accounting_update', 'Accounting updated: invoices or expenses changed', 'system', { recordType: 'Accounting' });
  } catch { }
  return saved;
}

export async function deleteInvoice(id: string): Promise<void> {
  const list = await getArray<any>(KEYS.invoices);
  const next = list.filter((i: any) => i.id !== id);
  await setArray(KEYS.invoices, next);
}

// Expenses (for Accounting page)
export async function getExpenses<T extends GenericWithId>(): Promise<T[]> {
  return getArray<T>(KEYS.expenses);
}

export async function upsertExpense<T extends Partial<GenericWithId>>(exp: T): Promise<GenericWithId & T> {
  const list = await getArray<any>(KEYS.expenses);
  let saved: any;
  if (exp.id) {
    const idx = list.findIndex((c: any) => c.id === exp.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...exp };
      saved = list[idx];
    } else {
      saved = { id: String(exp.id), ...exp };
      list.push(saved);
    }
  } else {
    saved = { id: genId(), ...exp };
    list.push(saved);
  }
  await setArray(KEYS.expenses, list);
  try { pushAdminAlert('accounting_update', 'Accounting updated: expense recorded', 'system', { recordType: 'Accounting', id: saved.id }); } catch { }
  return saved;
}

export async function deleteExpense(id: string): Promise<void> {
  const list = await getArray<any>(KEYS.expenses);
  const next = list.filter((e: any) => e.id !== id);
  await setArray(KEYS.expenses, next);
}

// Sub-Contractors
export async function getSubContractors<T extends GenericWithId>(): Promise<T[]> {
  return getArray<T>(KEYS.sub_contractors);
}

export async function upsertSubContractor<T extends Partial<GenericWithId>>(sub: T): Promise<GenericWithId & T> {
  const list = await getArray<any>(KEYS.sub_contractors);
  const now = new Date().toISOString();
  let saved: any;
  if (sub.id) {
    const idx = list.findIndex((c: any) => c.id === sub.id);
    if (idx >= 0) {
      saved = { ...list[idx], ...sub, updatedAt: now }; // Preserve created_at if exists
      list[idx] = saved;
    } else {
      saved = { id: String(sub.id), ...sub, created_at: now, updatedAt: now };
      list.push(saved);
    }
  } else {
    saved = { id: genId(), ...sub, created_at: now, updatedAt: now };
    list.push(saved);
  }
  await setArray(KEYS.sub_contractors, list);
  return saved;
}

export async function deleteSubContractor(id: string) {
  const list = await getSubContractors();
  const next = list.filter((x: any) => x.id !== id);
  await setArray(KEYS.sub_contractors, next);
}

// ========== Client Upsells ==========
export async function getClientUpsells<T = any>(): Promise<T[]> {
  return getArray<T>(KEYS.client_upsells);
}

export async function upsertClientUpsell(data: any) {
  const list = await getClientUpsells();
  const idx = list.findIndex((x: any) => x.id === data.id);
  if (idx >= 0) {
    list[idx] = data;
  } else {
    list.push(data);
  }
  await setArray(KEYS.client_upsells, list);
}

export async function deleteClientUpsell(id: string) {
  const list = await getClientUpsells();
  const next = list.filter((x: any) => x.id !== id);
  await setArray(KEYS.client_upsells, next);
}

export async function getClientUpsellHistory(clientId: string) {
  const all = await getClientUpsells();
  return all.filter((x: any) => x.client_id === clientId);
}

// ========== Client Evaluations ==========
export async function getClientEvaluations<T = any>(): Promise<T[]> {
  return getArray<T>(KEYS.client_evaluations);
}

export async function upsertClientEvaluation(data: any) {
  const list = await getClientEvaluations();
  const idx = list.findIndex((x: any) => x.id === data.id);
  if (idx >= 0) {
    list[idx] = data;
  } else {
    list.push(data);
  }
  await setArray(KEYS.client_evaluations, list);
}

export async function deleteClientEvaluation(id: string) {
  const list = await getClientEvaluations();
  const next = list.filter((x: any) => x.id !== id);
  await setArray(KEYS.client_evaluations, next);
}

export async function getClientEvaluationHistory(clientId: string) {
  const all = await getClientEvaluations();
  return all.filter((x: any) => x.client_id === clientId);
}

// ========== Detailing Vendors ==========
export async function getDetailingVendors<T extends GenericWithId>(): Promise<T[]> {
  return getArray<T>(KEYS.detailing_vendors);
}

export async function upsertDetailingVendor<T extends Partial<GenericWithId>>(vendor: T): Promise<GenericWithId & T> {
  const list = await getArray<any>(KEYS.detailing_vendors);
  const now = new Date().toISOString();
  let saved: any;
  if (vendor.id) {
    const idx = list.findIndex((v: any) => v.id === vendor.id);
    if (idx >= 0) {
      saved = { ...list[idx], ...vendor, updatedAt: now };
      list[idx] = saved;
    } else {
      saved = { id: String(vendor.id), ...vendor, created_at: now, updatedAt: now };
      list.push(saved);
    }
  } else {
    saved = { id: genId(), ...vendor, created_at: now, updatedAt: now };
    list.push(saved);
  }
  await setArray(KEYS.detailing_vendors, list);
  return saved;
}

export async function deleteDetailingVendor(id: string) {
  const list = await getDetailingVendors();
  const next = list.filter((x: any) => x.id !== id);
  await setArray(KEYS.detailing_vendors, next);
}

// Backup & Restore
export async function exportAll(): Promise<{ data: Record<string, any>; json: string; }> {
  const customers = await getArray<any>(KEYS.customers);
  const estimates = await getArray<any>(KEYS.estimates);
  const invoices = await getArray<any>(KEYS.invoices);
  const expenses = await getArray<any>(KEYS.expenses);
  const exportedAt = new Date().toISOString();
  const payload = { meta: { exportedAt, version: 1 }, customers, estimates, invoices, expenses };
  const json = JSON.stringify(payload, null, 2);
  return { data: payload, json };
}

export async function importAllFromJSON(json: string): Promise<void> {
  const payload = JSON.parse(json);
  const { customers = [], estimates = [], invoices = [], expenses = [] } = payload || {};
  await setArray(KEYS.customers, customers);
  await setArray(KEYS.estimates, estimates);
  await setArray(KEYS.invoices, invoices);
  await setArray(KEYS.expenses, expenses);
}

export function downloadBlob(filename: string, content: string, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
