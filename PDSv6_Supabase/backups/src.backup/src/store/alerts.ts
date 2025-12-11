import { create } from "zustand";
import { getAdminAlerts, pushAdminAlert, AdminAlert, markAlertRead, markAllAlertsRead, dismissAlert, clearAllAlerts } from "@/lib/adminAlerts";

type UIAlert = { id: string; title: string; href: string };

  interface AlertsState {
    alerts: AdminAlert[];
    latest: UIAlert[];
    unreadCount: number;
    lastNotifiedId?: string;
    add: (alert: AdminAlert) => void;
    markAllRead: () => void;
    markRead: (id: string) => void;
    dismiss: (id: string) => void;
    dismissAll: () => void;
    refresh: () => void;
  }

function mapAlert(a: AdminAlert): UIAlert {
  // Show percent-only for exam progress outcomes, keep destination appropriate
  const isExamOutcome = a.type === "exam_passed" || a.type === "exam_failed";
  const title = isExamOutcome
    ? (typeof a.payload?.percent === "number" ? `${a.payload.percent}%` : a.message || "Exam")
    : (a.message || a.type.replace(/_/g, " "));
  let href = "/admin-dashboard";
  switch (a.type) {
    case "exam_started":
    case "exam_scheduled":
    case "exam_reminder":
    case "exam_failed":
    case "exam_paused":
      href = "/file-manager?category=" + encodeURIComponent("Employee Training");
      break;
    case "exam_passed":
      href = "/file-manager?category=" + encodeURIComponent("Employee Training");
      break;
    case "handbook_completed":
      href = "/file-manager?category=" + encodeURIComponent("Employee Training");
      break;
    case "pdf_saved":
      href = a.payload?.recordType ? `/file-manager?category=${encodeURIComponent(String(a.payload.recordType))}` : "/file-manager";
      break;
    case "low_inventory":
      href = "/inventory-control";
      break;
    case "booking_created":
      // Route to Customer Profiles instead of removed Bookings page
      href = "/search-customer";
      break;
    case "customer_added":
      href = "/search-customer";
      break;
    case "invoice_created":
    case "invoice_unpaid":
      href = "/invoicing";
      break;
    case "payroll_due":
      href = "/payroll";
      break;
    case "accounting_update":
      href = "/accounting";
      break;
    case "todo_overdue":
      href = "/tasks";
      break;
    case "todo_completed":
    case "todo_acknowledged":
    case "todo_comment":
    case "todo_updated":
      href = "/tasks";
      break;
    case "job_progress":
      href = "/checklist";
      break;
    case "job_completed":
      href = "/payroll";
      break;
    case "admin_email_sent":
    case "admin_message":
      href = "/admin-dashboard";
      break;
    case "pricing_update":
      href = "/package-pricing";
      break;
    case "cheat_sheet_downloaded":
    case "video_checked":
    case "tip_checked":
      href = "/file-manager?category=" + encodeURIComponent("Employee Training");
      break;
    default:
      href = "/admin-dashboard";
  }
  return { id: a.id, title, href };
}

export const useAlertsStore = create<AlertsState>((set, get) => {
  const initialAlerts = getAdminAlerts();
  return {
    alerts: initialAlerts,
    // Suppress payroll_due in dropdown items but COUNT all unread in badge
    latest: initialAlerts.filter(a => a.type !== 'payroll_due').map(mapAlert),
    unreadCount: initialAlerts.filter(a => !a.read && a.type !== 'payroll_due').length,
    lastNotifiedId: undefined,
    add: (alert) => {
      // Persist via existing util
      pushAdminAlert(alert.type, alert.message, alert.actor, alert.payload);
      const alerts = getAdminAlerts();
      set({ alerts, latest: alerts.filter(a => a.type !== 'payroll_due').map(mapAlert), unreadCount: alerts.filter(a => !a.read && a.type !== 'payroll_due').length, lastNotifiedId: alert.id });
    },
    markAllRead: () => {
      markAllAlertsRead();
      const alerts = getAdminAlerts();
      set({ alerts, latest: alerts.filter(a => a.type !== 'payroll_due').map(mapAlert), unreadCount: alerts.filter(a => !a.read && a.type !== 'payroll_due').length });
    },
    markRead: (id: string) => {
      markAlertRead(id);
      const alerts = getAdminAlerts();
      set({ alerts, latest: alerts.filter(a => a.type !== 'payroll_due').map(mapAlert), unreadCount: alerts.filter(a => !a.read && a.type !== 'payroll_due').length });
    },
    dismiss: (id: string) => {
      dismissAlert(id);
      const alerts = getAdminAlerts();
      set({ alerts, latest: alerts.filter(a => a.type !== 'payroll_due').map(mapAlert), unreadCount: alerts.filter(a => !a.read && a.type !== 'payroll_due').length });
    },
    dismissAll: () => {
      clearAllAlerts();
      const alerts: AdminAlert[] = [];
      set({ alerts, latest: [], unreadCount: 0 });
    },
    refresh: () => {
      const alerts = getAdminAlerts();
      set({ alerts, latest: alerts.filter(a => a.type !== 'payroll_due').map(mapAlert), unreadCount: alerts.filter(a => !a.read && a.type !== 'payroll_due').length });
    }
  };
});

// Helper for components to push typed alerts easily
export function notify(type: AdminAlert["type"], message: string, actor: string, payload?: Record<string, any>) {
  const id = `${type}_${Date.now()}`;
  useAlertsStore.getState().add({ id, type, message, actor, timestamp: new Date().toISOString(), payload });
}
