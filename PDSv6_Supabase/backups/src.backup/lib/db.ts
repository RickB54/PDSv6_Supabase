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
  } catch {}
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

export async function addEstimate<T>(estimate: T): Promise<GenericWithId & T> {
  const list = await getArray<any>(KEYS.estimates);
  const saved: any = { id: genId(), ...estimate };
  list.push(saved);
  await setArray(KEYS.estimates, list);
  return saved;
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
  } catch {}
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
  try { pushAdminAlert('accounting_update', 'Accounting updated: expense recorded', 'system', { recordType: 'Accounting', id: saved.id }); } catch {}
  return saved;
}

export async function deleteExpense(id: string): Promise<void> {
  const list = await getArray<any>(KEYS.expenses);
  const next = list.filter((e: any) => e.id !== id);
  await setArray(KEYS.expenses, next);
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
