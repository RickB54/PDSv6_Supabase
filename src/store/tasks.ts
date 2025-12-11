import { create } from "zustand";
import localforage from "localforage";
import { pushAdminAlert } from "@/lib/adminAlerts";
import { pushEmployeeNotification } from "@/lib/employeeNotifications";
import { getCurrentUser } from "@/lib/auth";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "not_started" | "in_progress" | "waiting" | "completed" | "acknowledged";

export interface TaskChecklistItem { id: string; text: string; done: boolean; }
export interface TaskAttachment { id: string; name: string; url: string; type?: string; size?: number; }

export interface TaskAssignee { email?: string; name?: string }
export interface TaskComment { id: string; authorEmail?: string; authorName?: string; text: string; createdAt: string }
export interface TaskReadReceipt { user: string; viewedAt: string }

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string; // ISO date (YYYY-MM-DD)
  dueTime?: string; // HH:mm
  priority: TaskPriority;
  status: TaskStatus;
  customerId?: string;
  vehicleId?: string;
  workOrderId?: string;
  // Deprecated: assigneeId kept in persisted data for backward-compat, use assignees
  assigneeId?: string; // name or id string
  assignees: TaskAssignee[];
  notes?: string;
  checklist: TaskChecklistItem[];
  attachments: TaskAttachment[];
  readReceipts: TaskReadReceipt[];
  comments: TaskComment[];
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  order: number; // for manual ordering
}

type FilterKey = "all" | "mine" | "overdue" | "today" | "upcoming";

interface TasksState {
  items: Task[];
  filter: FilterKey;
  search: string;
  selectedIds: string[];
  settings: {
    autoAssignByJobType: boolean;
    enableFollowUpOnWorkOrderComplete: boolean;
    autoChecklistByServicePackage: boolean;
  };
  refresh: () => Promise<void>;
  add: (t: Partial<Task>) => Promise<Task>;
  update: (id: string, patch: Partial<Task>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
  setFilter: (f: FilterKey) => void;
  setSearch: (q: string) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  bulkComplete: (ids: string[]) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  markRead: (id: string, userKey?: string) => Promise<void>;
  addComment: (id: string, comment: { text: string; authorEmail?: string; authorName?: string }) => Promise<void>;
}

const STORAGE_KEY = "tasks";

async function load(): Promise<Task[]> {
  try {
    const list = (await localforage.getItem(STORAGE_KEY)) || [];
    const arr = Array.isArray(list) ? (list as Task[]) : [];
    if (arr.length > 0) {
      return arr.map((t: any) => ({
        ...t,
        checklist: Array.isArray(t.checklist) ? t.checklist : [],
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
        priority: (t.priority as TaskPriority) || "medium",
        status: (t.status as TaskStatus) || "not_started",
        assignees: Array.isArray((t as any).assignees) ? (t as any).assignees : (t.assigneeId ? [{ name: t.assigneeId }] : []),
        readReceipts: Array.isArray((t as any).readReceipts) ? (t as any).readReceipts : [],
        comments: Array.isArray((t as any).comments) ? (t as any).comments : [],
        order: typeof t.order === 'number' ? t.order : 0,
      }));
    }
  } catch {}
  // Fallback to localStorage if localforage is unavailable or empty
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) {
      return (arr as any[]).map((t: any) => ({
        ...t,
        checklist: Array.isArray(t.checklist) ? t.checklist : [],
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
        priority: (t.priority as TaskPriority) || "medium",
        status: (t.status as TaskStatus) || "not_started",
        assignees: Array.isArray(t.assignees) ? t.assignees : (t.assigneeId ? [{ name: t.assigneeId }] : []),
        readReceipts: Array.isArray(t.readReceipts) ? t.readReceipts : [],
        comments: Array.isArray(t.comments) ? t.comments : [],
        order: typeof t.order === 'number' ? t.order : 0,
      }));
    }
  } catch {}
  return [];
}

async function save(items: Task[]): Promise<void> {
  try {
    await localforage.setItem(STORAGE_KEY, items);
  } catch {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }
}

export const useTasksStore = create<TasksState>((set, get) => ({
  items: [],
  filter: "all",
  search: "",
  selectedIds: [],
  settings: {
    autoAssignByJobType: false,
    enableFollowUpOnWorkOrderComplete: true,
    autoChecklistByServicePackage: true,
  },
  refresh: async () => {
    const items = await load();
    set({ items });
  },
  add: async (t) => {
    const now = new Date().toISOString();
    const id = t.id || `task_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    const items = get().items;
    const order = items.length > 0 ? Math.max(...items.map(i => i.order || 0)) + 1 : 0;
    const record: Task = {
      id,
      title: String(t.title || 'Untitled Task'),
      description: t.description || '',
      dueDate: t.dueDate,
      dueTime: t.dueTime,
      priority: (t.priority as TaskPriority) || 'medium',
      status: (t.status as TaskStatus) || 'not_started',
      customerId: t.customerId,
      vehicleId: t.vehicleId,
      workOrderId: t.workOrderId,
      assigneeId: t.assigneeId,
      assignees: Array.isArray((t as any).assignees) ? ((t as any).assignees as TaskAssignee[]) : (t.assigneeId ? [{ name: t.assigneeId }] : []),
      notes: t.notes || '',
      checklist: Array.isArray(t.checklist) ? t.checklist : [],
      attachments: Array.isArray(t.attachments) ? t.attachments : [],
      readReceipts: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
      order,
    };
    const next = [...items, record];
    await save(next);
    set({ items: next });
    // Push alert for upcoming/overdue tasks to integrate with existing notifications
    try {
      if (record.dueDate) {
        const today = new Date();
        const due = new Date(record.dueDate + (record.dueTime ? `T${record.dueTime}:00` : 'T00:00:00'));
        if (due.getTime() < today.setHours(23,59,59,999)) {
          pushAdminAlert('todo_overdue', `Task overdue: ${record.title}`, 'system', { taskId: record.id });
        }
      }
    } catch {}
    // Notify assigned employees on creation
    try {
      (record.assignees || []).forEach(a => {
        const key = String(a.email || a.name || '').trim();
        if (key) pushEmployeeNotification(key, `New Todo: ${record.title}`, { taskId: record.id });
      });
    } catch {}
    return record;
  },
  update: async (id, patch) => {
    const items = get().items;
    const before = items.find(i => i.id === id);
    const next = items.map(i => i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i);
    await save(next);
    set({ items: next });
    // Notify assigned employees about updates
    try {
      const updated = next.find(i => i.id === id)!;
      (updated.assignees || []).forEach(a => {
        const key = String(a.email || a.name || '').trim();
        if (key) pushEmployeeNotification(key, `Todo Updated: ${updated.title}`, { taskId: id });
      });
    } catch {}
    // If status moved to completed or acknowledged, notify admins
    try {
      const after = next.find(i => i.id === id)!;
      const actor = getCurrentUser();
      if (before && after && before.status !== after.status) {
        if (after.status === 'completed') {
          pushAdminAlert('todo_completed' as any, `Todo Completed: ${after.title}`, String(actor?.email || actor?.name || 'employee'), { taskId: id });
        }
        if (after.status === 'acknowledged') {
          pushAdminAlert('todo_acknowledged' as any, `Todo Acknowledged: ${after.title}`, String(actor?.email || actor?.name || 'employee'), { taskId: id });
        }
      }
    } catch {}
  },
  remove: async (id) => {
    const items = get().items;
    const next = items.filter(i => i.id !== id);
    await save(next);
    set({ items: next, selectedIds: get().selectedIds.filter(s => s !== id) });
  },
  reorder: async (orderedIds) => {
    const byId = new Map(get().items.map(i => [i.id, i] as const));
    const next: Task[] = orderedIds.map((id, idx) => ({ ...byId.get(id)!, order: idx }));
    await save(next);
    set({ items: next });
  },
  setFilter: (f) => set({ filter: f }),
  setSearch: (q) => set({ search: q }),
  toggleSelect: (id) => {
    const selected = new Set(get().selectedIds);
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    set({ selectedIds: Array.from(selected) });
  },
  clearSelection: () => set({ selectedIds: [] }),
  bulkComplete: async (ids) => {
    const items = get().items.map(i => ids.includes(i.id) ? { ...i, status: 'completed', updatedAt: new Date().toISOString() } : i);
    await save(items);
    set({ items, selectedIds: [] });
  },
  bulkDelete: async (ids) => {
    const items = get().items.filter(i => !ids.includes(i.id));
    await save(items);
    set({ items, selectedIds: [] });
  },
  markRead: async (id, userKey) => {
    const items = get().items;
    const key = String(userKey || getCurrentUser()?.email || getCurrentUser()?.name || '').trim();
    const next = items.map(i => {
      if (i.id !== id) return i;
      const receipts = Array.isArray(i.readReceipts) ? [...i.readReceipts] : [];
      if (key && !receipts.find(r => r.user === key)) receipts.push({ user: key, viewedAt: new Date().toISOString() });
      return { ...i, readReceipts: receipts, updatedAt: new Date().toISOString() };
    });
    await save(next);
    set({ items: next });
  },
  addComment: async (id, comment) => {
    const items = get().items;
    const curUser = getCurrentUser();
    const next = items.map(i => {
      if (i.id !== id) return i;
      const list = Array.isArray(i.comments) ? [...i.comments] : [];
      const c: TaskComment = { id: `c_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, text: comment.text, authorEmail: comment.authorEmail || curUser?.email, authorName: comment.authorName || curUser?.name, createdAt: new Date().toISOString() };
      list.push(c);
      return { ...i, comments: list, updatedAt: new Date().toISOString() };
    });
    await save(next);
    set({ items: next });
    // Notify admins of comment
    try {
      const task = next.find(i => i.id === id)!;
      pushAdminAlert('todo_comment' as any, `Todo Comment: ${task.title}`, String(curUser?.email || curUser?.name || 'employee'), { taskId: id });
      // Notify other assignees (excluding the commenter)
      (task.assignees || []).forEach(a => {
        const key = String(a.email || a.name || '').trim();
        if (key && key !== String(curUser?.email || curUser?.name || '')) pushEmployeeNotification(key, `Comment on Todo: ${task.title}`, { taskId: id });
      });
    } catch {}
  }
}));

// Simple NLP: parse phrases like "Follow up with John tomorrow at 3 PM"
export function parseTaskInput(input: string): Partial<Task> {
  const out: Partial<Task> = { title: input.trim(), priority: 'medium', status: 'not_started' };
  const lower = input.toLowerCase();
  // Priority markers
  if (/(urgent|asap|high priority)/.test(lower)) out.priority = 'urgent';
  else if (/\blow\b/.test(lower)) out.priority = 'low';
  else if (/\bmedium\b/.test(lower)) out.priority = 'medium';

  // Dates
  const now = new Date();
  if (/tomorrow/.test(lower)) {
    const d = new Date(now.getTime() + 24*60*60*1000);
    out.dueDate = d.toISOString().slice(0,10);
  } else if (/today/.test(lower)) {
    out.dueDate = now.toISOString().slice(0,10);
  } else {
    const m = lower.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s(\d{1,2})/);
    if (m) {
      try {
        const monthIdx = ["january","february","march","april","may","june","july","august","september","october","november","december"].indexOf(m[1]);
        const year = now.getFullYear();
        const dt = new Date(year, monthIdx, Number(m[2]));
        out.dueDate = dt.toISOString().slice(0,10);
      } catch {}
    }
  }
  // Time
  const tm = lower.match(/(\d{1,2})(?::(\d{2}))?\s?(am|pm)/);
  if (tm) {
    let hh = Number(tm[1]);
    const mm = tm[2] ? Number(tm[2]) : 0;
    const ampm = tm[3];
    if (ampm === 'pm' && hh < 12) hh += 12;
    if (ampm === 'am' && hh === 12) hh = 0;
    out.dueTime = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  }

  // Simple linkage extraction by keywords
  const cust = input.match(/with\s([A-Z][a-zA-Z]+[\sA-Za-z]*)/);
  if (cust) out.customerId = cust[1].trim();

  return out;
}

// Internal workflow listeners: dispatch custom events to trigger auto tasks
export function initTaskWorkflowListeners() {
  try {
    window.addEventListener('workorder_completed', (ev: any) => {
      const { enableFollowUpOnWorkOrderComplete } = useTasksStore.getState().settings;
      if (!enableFollowUpOnWorkOrderComplete) return;
      const payload = ev?.detail || {};
      const title = `Follow up on work order ${payload.workOrderId || ''}`.trim();
      useTasksStore.getState().add({
        title,
        description: 'Auto-created follow-up task',
        workOrderId: payload.workOrderId,
        customerId: payload.customerId,
        status: 'not_started',
        priority: 'medium',
        dueDate: new Date(Date.now() + 3*24*60*60*1000).toISOString().slice(0,10)
      });
    });
    window.addEventListener('service_package_selected', (ev: any) => {
      const { autoChecklistByServicePackage } = useTasksStore.getState().settings;
      if (!autoChecklistByServicePackage) return;
      const { packageName } = ev?.detail || {};
      const templates: Record<string, string[]> = {
        'Express': ['Confirm booking time','Prep vehicle','Gather materials'],
        'Full Detail': ['Pre-detail checklist','Interior deep clean','Exterior polish','Final inspection'],
      };
      const checklist = (templates[packageName] || ['Pre-detail checklist']).map(t => ({ id: `chk_${Math.random().toString(36).slice(2,6)}`, text: t, done: false }));
      useTasksStore.getState().add({ title: `${packageName} workflow`, checklist });
    });
  } catch {}
}
