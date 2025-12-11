import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAlertsStore } from "@/store/alerts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { getEmployeeNotifications, markAllEmployeeNotificationsRead, markEmployeeNotificationRead } from "@/lib/employeeNotifications";

export default function NotificationBell() {
  const { alerts, latest, unreadCount, markAllRead, markRead, dismissAll, refresh } = useAlertsStore();
  const user = getCurrentUser();
  const isEmployee = !!user && user.role === 'employee';
  const employeeKeys = useMemo(() => {
    const email = String(user?.email || '').trim();
    const name = String(user?.name || '').trim();
    return [email, name].filter(Boolean).map(s => s.toLowerCase());
  }, [user]);
  const [empItems, setEmpItems] = useState<{ id: string; title: string; href: string; read?: boolean }[]>([]);
  const [empUnreadCount, setEmpUnreadCount] = useState<number>(0);
  const [ring, setRing] = useState(false);
  const prevUnreadRef = useRef(unreadCount);
  const location = useLocation();
  const isFileManagerView = location.pathname.startsWith('/file-manager');

  useEffect(() => {
    const count = isEmployee ? empUnreadCount : unreadCount;
    if (isFileManagerView) {
      setRing(false);
      prevUnreadRef.current = count;
      return;
    }
    if (count > prevUnreadRef.current) {
      setRing(true);
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine"; o.frequency.value = 880;
        g.gain.value = 0.02;
        o.connect(g); g.connect(ctx.destination);
        o.start(); setTimeout(() => { o.stop(); ctx.close(); }, 180);
      } catch {}
      setTimeout(() => setRing(false), 600);
    }
    prevUnreadRef.current = count;
  }, [unreadCount, empUnreadCount, isFileManagerView, isEmployee]);

  // Keep dropdown in sync when alerts/employee notifications change
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'admin_alerts') {
        try { refresh(); } catch {}
      }
      if (e.key === 'employee_notifications') {
        try {
          const list = getEmployeeNotifications();
          const filtered = list.filter(n => employeeKeys.includes(String(n.employeeId || '').toLowerCase()));
          setEmpItems(filtered.map(n => ({ id: n.id, title: n.message, href: '/tasks', read: !!n.read })));
          setEmpUnreadCount(filtered.filter(n => !n.read).length);
        } catch {}
      }
    };
    const onAdminLocal = (e: Event) => { try { refresh(); } catch {} };
    const onEmpLocal = (e: Event) => {
      try {
        const list = getEmployeeNotifications();
        const filtered = list.filter(n => employeeKeys.includes(String(n.employeeId || '').toLowerCase()));
        setEmpItems(filtered.map(n => ({ id: n.id, title: n.message, href: '/tasks', read: !!n.read })));
        setEmpUnreadCount(filtered.filter(n => !n.read).length);
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('admin_alerts_updated', onAdminLocal as EventListener);
    window.addEventListener('employee_notifications_updated', onEmpLocal as EventListener);
    try { refresh(); } catch {}
    try { onEmpLocal(new Event('init')); } catch {}
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('admin_alerts_updated', onAdminLocal as EventListener);
      window.removeEventListener('employee_notifications_updated', onEmpLocal as EventListener);
    };
  }, [refresh, employeeKeys.join('|')]);

  const items = useMemo(() => {
    if (isEmployee) return [...empItems].reverse().slice(0, 10);
    return [...latest].reverse().slice(0, 10);
  }, [latest, empItems, isEmployee]);
  // Compute important unread using full AdminAlert objects, not mapped UI items
  const importantUnreadActual = useMemo(() => {
    if (isEmployee) return 0; // employee notifications are all treated equally for now
    return alerts.filter(a => !a.read && (a.type === 'exam_reminder' || a.type === 'admin_message')).length;
  }, [alerts, isEmployee]);
  const importantUnread = isFileManagerView ? 0 : importantUnreadActual;
  const displayUnreadCount = isFileManagerView ? 0 : (isEmployee ? empUnreadCount : unreadCount);
  const bellColorClass = importantUnread > 0 ? "text-yellow-400" : (displayUnreadCount > 0 ? "text-white" : "text-red-500");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative">
          <Bell className={`h-5 w-5 ${bellColorClass} ${ring ? 'animate-bounce' : ''}`} />
          {/* Show badge for important alerts; otherwise show unread count subtly */}
          {importantUnread > 0 ? (
            <Badge className="absolute -top-1 -right-1 bg-yellow-500 text-black">{importantUnread}</Badge>
          ) : (
            <Badge className="absolute -top-1 -right-1 bg-zinc-700 text-white">{displayUnreadCount}</Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2 text-sm font-semibold">Alerts</div>
        {items.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">No alerts</div>
        ) : (
          items.map(a => (
            <DropdownMenuItem key={a.id} className="flex items-center justify-between">
              <div className="text-sm">{a.title}</div>
              <a
                href={a.href}
                className="text-xs text-blue-600 hover:underline"
                onClick={() => {
                  if (isEmployee) {
                    try { markEmployeeNotificationRead(a.id); } catch {}
                    // Refresh local state
                    try {
                      const list = getEmployeeNotifications();
                      const filtered = list.filter(n => employeeKeys.includes(String(n.employeeId || '').toLowerCase()));
                      setEmpItems(filtered.map(n => ({ id: n.id, title: n.message, href: '/tasks', read: !!n.read })));
                      setEmpUnreadCount(filtered.filter(n => !n.read).length);
                    } catch {}
                  } else {
                    markRead(a.id);
                  }
                }}
              >Open</a>
              {!isEmployee && (
                <button className="text-xs text-muted-foreground hover:text-red-600" onClick={() => { try { useAlertsStore.getState().dismiss(a.id); } catch {} }}>Dismiss</button>
              )}
            </DropdownMenuItem>
          ))
        )}
        <div className="px-3 py-2">
          {isEmployee ? (
            <Button variant="outline" size="sm" onClick={() => { try { markAllEmployeeNotificationsRead(employeeKeys[0]); } catch {} ; try {
              const list = getEmployeeNotifications();
              const filtered = list.filter(n => employeeKeys.includes(String(n.employeeId || '').toLowerCase()));
              setEmpItems(filtered.map(n => ({ id: n.id, title: n.message, href: '/tasks', read: !!n.read })));
              setEmpUnreadCount(filtered.filter(n => !n.read).length);
            } catch {} }} className="w-full">Mark all read</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={dismissAll} className="w-full">Dismiss all</Button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
