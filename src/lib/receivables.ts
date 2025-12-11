import localforage from "localforage";
import { pushAdminAlert } from "@/lib/adminAlerts";

localforage.config({ name: "prime-detail-db" });

const KEY = "receivables";

export type Receivable = {
  id?: string;
  amount: number;
  category?: string;
  description?: string;
  date: string; // ISO date
  customerId?: string;
  customerName?: string;
  paymentMethod?: string; // cash, card, etc
  createdAt?: string;
  updatedAt?: string;
};

const genId = () =>
(typeof crypto !== "undefined" && "randomUUID" in crypto
  ? (crypto as any).randomUUID()
  : `rcv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

async function getList(): Promise<Receivable[]> {
  return (await localforage.getItem<Receivable[]>(KEY)) || [];
}

async function setList(list: Receivable[]) {
  await localforage.setItem(KEY, list);
}

export async function getReceivables(): Promise<Receivable[]> {
  return getList();
}

export async function upsertReceivable(rec: Receivable): Promise<Receivable> {
  const list = await getList();
  const now = new Date().toISOString();
  let saved: Receivable;

  if (rec.id) {
    const idx = list.findIndex((r) => r.id === rec.id);
    if (idx >= 0) {
      saved = { ...list[idx], ...rec, updatedAt: now };
      list[idx] = saved;
    } else {
      saved = { ...rec, id: rec.id, createdAt: now, updatedAt: now };
      list.push(saved);
    }
  } else {
    saved = { ...rec, id: genId(), createdAt: now, updatedAt: now };
    list.push(saved);
  }

  await setList(list);
  try {
    pushAdminAlert('accounting_update', 'Income recorded', 'system', { recordType: 'Accounting', id: saved.id });
  } catch { }
  return saved;
}

export async function deleteReceivable(id: string): Promise<void> {
  const list = await getList();
  const next = list.filter((r) => r.id !== id);
  await setList(next);
}
