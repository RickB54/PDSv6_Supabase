export type AdminAlertType =
  | "video_checked"
  | "tip_checked"
  | "cheat_sheet_downloaded"
  | "exam_started"
  | "exam_scheduled"
  | "exam_reminder"
  | "exam_paused"
  | "exam_passed"
  | "exam_failed"
  | "handbook_completed"
  | "admin_message"
  | "pdf_saved"
  | "low_inventory"
  | "booking_created"
  | "customer_added"
  | "invoice_created"
  | "invoice_unpaid"
  | "payroll_due"
  | "accounting_update"
  | "todo_overdue"
  | "todo_completed"
  | "todo_acknowledged"
  | "todo_comment"
  | "todo_updated"
  | "pricing_update"
  | "job_progress"
  | "job_completed"
  | "admin_email_sent";

export interface AdminAlert {
  id: string;
  type: AdminAlertType;
  message: string;
  actor: string;
  timestamp: string;
  payload?: Record<string, any>;
  read?: boolean;
}

const STORAGE_KEY = "admin_alerts";

export function pushAdminAlert(
  type: AdminAlertType,
  message: string,
  actor: string,
  payload?: Record<string, any>
): void {
  const alert: AdminAlert = {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    type,
    message,
    actor,
    timestamp: new Date().toISOString(),
    payload: payload || {},
    read: false,
  };

  const existing: AdminAlert[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  existing.push(alert);

  // keep last 500 alerts
  const trimmed = existing.slice(Math.max(0, existing.length - 500));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

  // Proactively notify the current tab to refresh alerts (storage events don't fire in same tab)
  try {
    window.dispatchEvent(new CustomEvent('admin_alerts_updated'));
  } catch {}
}

export function getAdminAlerts(): AdminAlert[] {
  const list: AdminAlert[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  // Backfill read=false for older records without the flag
  return list.map(a => ({ ...a, read: !!a.read }));
}

export function markAlertRead(id: string): void {
  const list: AdminAlert[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const next = list.map(a => (a.id === id ? { ...a, read: true } : a));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function markAllAlertsRead(): void {
  const list: AdminAlert[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const next = list.map(a => ({ ...a, read: true }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function dismissAlert(id: string): void {
  const list: AdminAlert[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const next = list.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearAllAlerts(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
}

// Dismiss all alerts associated with a specific record (e.g., a PDF in File Manager)
export function dismissAlertsForRecord(recordType: string, recordId: string): void {
  const list: AdminAlert[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const next = list.filter(a => {
    const payload = a.payload || {};
    if (typeof payload !== 'object') return true;
    // Match either by recordId or bookingId to cover older entries
    const matchesRecordId = String(payload.recordId || '') === String(recordId);
    const matchesBookingId = String(payload.bookingId || '') === String(recordId);
    // Also support matching by archive record id for per-file targeting
    const matchesArchiveId = String(payload.id || '') === String(recordId);
    const matchesType = !recordType || String(payload.recordType || '') === String(recordType);
    return !(matchesType && (matchesRecordId || matchesBookingId || matchesArchiveId));
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
