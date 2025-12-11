export interface EmployeeNotification {
  id: string;
  employeeId: string; // can be name or id string
  message: string;
  timestamp: string;
  payload?: Record<string, any>;
  read?: boolean;
}

const STORAGE_KEY = 'employee_notifications';

export function pushEmployeeNotification(employeeId: string, message: string, payload?: Record<string, any>) {
  const notif: EmployeeNotification = {
    id: `emp_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    employeeId,
    message,
    timestamp: new Date().toISOString(),
    payload: payload || {},
    read: false,
  };
  const list: EmployeeNotification[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  list.push(notif);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(Math.max(0, list.length - 500))));
  try { window.dispatchEvent(new CustomEvent('employee_notifications_updated')); } catch {}
}

export function getEmployeeNotifications(employeeId?: string): EmployeeNotification[] {
  const list: EmployeeNotification[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const normalized = list.map(n => ({ ...n, read: !!n.read }));
  if (!employeeId) return normalized;
  return normalized.filter(n => String(n.employeeId) === String(employeeId));
}

export function markEmployeeNotificationRead(id: string) {
  const list: EmployeeNotification[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const next = list.map(n => (n.id === id ? { ...n, read: true } : n));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function markAllEmployeeNotificationsRead(employeeId?: string) {
  const list: EmployeeNotification[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const next = list.map(n => (!employeeId || String(n.employeeId) === String(employeeId) ? { ...n, read: true } : n));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
