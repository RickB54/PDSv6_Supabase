import supabase from './supabase';

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
  | "exam_validation_failed"
  | "exam_randomized"
  | "cheat_sheet_generated"
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
const DUMMY_BOOKING_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Pushes alerts to the global database storage (dummy booking)
 */
async function syncToDB(alerts: AdminAlert[]): Promise<void> {
  try {
    if (localStorage.getItem("demo_mode_active") === "true") {
      // Prevent background polling from triggering the global write-block toast
      return;
    }
    // Keep only last 200 for DB storage to keep it lightweight
    const trimmed = alerts.slice(Math.max(0, alerts.length - 200));
    await supabase.from('bookings').upsert({
      id: DUMMY_BOOKING_ID,
      service_package: 'SYSTEM_ALERTS_STORAGE',
      status: 'system',
      booking_vehicle: { alerts: trimmed },
      notes: `LAST_SYNC:${new Date().toISOString()}`
    });
  } catch (err) {
    console.error("[AdminAlerts] DB Sync Failed:", err);
  }
}

/**
 * Fetches alerts from the global database storage
 */
export async function fetchAlertsFromDB(): Promise<AdminAlert[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('booking_vehicle')
      .eq('id', DUMMY_BOOKING_ID)
      .maybeSingle();
    
    if (error || !data?.booking_vehicle?.alerts) return [];
    return data.booking_vehicle.alerts as AdminAlert[];
  } catch (err) {
    console.warn("[AdminAlerts] DB Fetch Failed:", err);
    return [];
  }
}

/**
 * Synchronizes local alerts with database alerts (Merge & Re-persist)
 */
export async function performGlobalSync(): Promise<AdminAlert[]> {
  const local = getAdminAlerts();
  const remote = await fetchAlertsFromDB();
  const dismissedIds = JSON.parse(localStorage.getItem('dismissed_alert_ids') || '[]');

  // Merge logic: Map by ID, Remote wins if exists, otherwise keep local
  const mergedMap = new Map<string, AdminAlert>();
  local.forEach(a => {
    if (!dismissedIds.includes(a.id)) mergedMap.set(a.id, a);
  });
  remote.forEach(a => {
    if (!dismissedIds.includes(a.id)) mergedMap.set(a.id, a);
  });

  const merged = Array.from(mergedMap.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 500);

  // DEDUPLICATE BOOKINGS BY BOOKING ID TO PREVENT MULTIPLE ALERTS PER BOOKING
  const uniqueBookingAlerts = new Map<string, AdminAlert>();
  const finalAlerts: AdminAlert[] = [];
  
  merged.forEach(a => {
    if (a.type === 'booking_created' && a.payload?.bookingId) {
      const bid = String(a.payload.bookingId);
      const existing = uniqueBookingAlerts.get(bid);
      if (!existing) {
        uniqueBookingAlerts.set(bid, a);
      } else {
        // If existing doesn't have customerId, but this one does, prefer the one with customerId
        if (!existing.payload?.customerId && a.payload?.customerId) {
          uniqueBookingAlerts.set(bid, a);
        }
      }
    }
  });

  merged.forEach(a => {
    if (a.type === 'booking_created' && a.payload?.bookingId) {
      const bid = String(a.payload.bookingId);
      if (uniqueBookingAlerts.get(bid)?.id === a.id) {
        finalAlerts.push(a);
      }
    } else {
      finalAlerts.push(a);
    }
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(finalAlerts));
  
  // Proactively clean up remote DB alerts as well
  syncToDB(finalAlerts);
  
  // Proactively notify the current tab to refresh alerts
  try {
    window.dispatchEvent(new CustomEvent('admin_alerts_updated'));
  } catch { }

  return finalAlerts;
}

export function pushAdminAlert(
  type: AdminAlertType,
  message: string,
  actor: string,
  payload?: Record<string, any>
): void {
  // Prevent local duplicates of booking alerts before they can even be created
  if (type === 'booking_created' && payload?.bookingId) {
    const existingList: AdminAlert[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const duplicate = existingList.some(a => 
      a.type === 'booking_created' && 
      String(a.payload?.bookingId || '') === String(payload.bookingId)
    );
    if (duplicate) return;
  }

  const alert: AdminAlert = {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    message,
    actor,
    timestamp: new Date().toISOString(),
    payload: payload || {},
    read: false,
  };

  const existing: AdminAlert[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  existing.push(alert);

  const trimmed = existing.slice(Math.max(0, existing.length - 500));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

  // Background Sync
  syncToDB(trimmed);

  try {
    window.dispatchEvent(new CustomEvent('admin_alerts_updated'));
  } catch { }
}

export function getAdminAlerts(): AdminAlert[] {
  const list: AdminAlert[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  return list.map(a => ({ ...a, read: !!a.read }));
}

export function markAlertRead(id: string): void {
  const list: AdminAlert[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const next = list.map(a => (a.id === id ? { ...a, read: true } : a));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  syncToDB(next);
}

export function markAllAlertsRead(): void {
  const list: AdminAlert[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const next = list.map(a => ({ ...a, read: true }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  syncToDB(next);
}

export function dismissAlert(id: string): void {
  const list: AdminAlert[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const next = list.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

  try {
    const dismissedIds: string[] = JSON.parse(localStorage.getItem('dismissed_alert_ids') || '[]');
    if (!dismissedIds.includes(id)) {
      dismissedIds.push(id);
      localStorage.setItem('dismissed_alert_ids', JSON.stringify(dismissedIds));
    }
  } catch (e) {
    console.error("Failed to update dismissed_alert_ids:", e);
  }

  syncToDB(next);
}

export function clearAllAlerts(): void {
  const list: AdminAlert[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  try {
    const dismissedIds: string[] = JSON.parse(localStorage.getItem('dismissed_alert_ids') || '[]');
    list.forEach(a => {
      if (!dismissedIds.includes(a.id)) {
        dismissedIds.push(a.id);
      }
    });
    localStorage.setItem('dismissed_alert_ids', JSON.stringify(dismissedIds));
  } catch (e) {
    console.error("Failed to update dismissed_alert_ids on clearAll:", e);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  syncToDB([]);
}

export function dismissAlertsForRecord(recordType: string, recordId: string): void {
  const list: AdminAlert[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const dismissed: string[] = [];
  const next = list.filter(a => {
    const payload = a.payload || {};
    if (typeof payload !== 'object') return true;
    const matchesRecordId = String(payload.recordId || '') === String(recordId);
    const matchesBookingId = String(payload.bookingId || '') === String(recordId);
    const matchesArchiveId = String(payload.id || '') === String(recordId);
    const matchesType = !recordType || String(payload.recordType || '') === String(recordType);
    const shouldDismiss = matchesType && (matchesRecordId || matchesBookingId || matchesArchiveId);
    if (shouldDismiss) {
      dismissed.push(a.id);
    }
    return !shouldDismiss;
  });

  if (dismissed.length > 0) {
    try {
      const dismissedIds: string[] = JSON.parse(localStorage.getItem('dismissed_alert_ids') || '[]');
      dismissed.forEach(id => {
        if (!dismissedIds.includes(id)) {
          dismissedIds.push(id);
        }
      });
      localStorage.setItem('dismissed_alert_ids', JSON.stringify(dismissedIds));
    } catch (e) {
      console.error("Failed to update dismissed_alert_ids in dismissAlertsForRecord:", e);
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  syncToDB(next);
}
