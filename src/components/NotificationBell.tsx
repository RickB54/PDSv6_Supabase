import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAlertsStore, mapAlert } from "@/store/alerts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { getEmployeeNotifications, markAllEmployeeNotificationsRead, markEmployeeNotificationRead } from "@/lib/employeeNotifications";
import supabase from "@/lib/supabase";
import { notify } from "@/store/alerts";

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
      // LOUD notification beep for new bookings
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square"; // More attention-grabbing
        o.frequency.value = 1200; // Higher pitch
        g.gain.setValueAtTime(0.3, ctx.currentTime); // LOUD volume (was 0.02)
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        o.connect(g); g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.3);
        setTimeout(() => ctx.close(), 400);
      } catch { }
      setTimeout(() => setRing(false), 600);
    }
    prevUnreadRef.current = count;
  }, [unreadCount, empUnreadCount, isFileManagerView, isEmployee]);

  // Keep dropdown in sync when alerts/employee notifications change
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'admin_alerts') {
        try { refresh(); } catch { }
      }
      if (e.key === 'employee_notifications') {
        try {
          const list = getEmployeeNotifications();
          const filtered = list.filter(n => employeeKeys.includes(String(n.employeeId || '').toLowerCase()));
          setEmpItems(filtered.map(n => ({ id: n.id, title: n.message, href: '/tasks', read: !!n.read })));
          setEmpUnreadCount(filtered.filter(n => !n.read).length);
        } catch { }
      }
    };
    const onAdminLocal = (e: Event) => { try { refresh(); } catch { } };
    const onEmpLocal = (e: Event) => {
      try {
        const list = getEmployeeNotifications();
        const filtered = list.filter(n => employeeKeys.includes(String(n.employeeId || '').toLowerCase()));
        setEmpItems(filtered.map(n => ({ id: n.id, title: n.message, href: '/tasks', read: !!n.read })));
        setEmpUnreadCount(filtered.filter(n => !n.read).length);
      } catch { }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('admin_alerts_updated', onAdminLocal as EventListener);
    window.addEventListener('employee_notifications_updated', onEmpLocal as EventListener);
    try { refresh(); } catch { }
    try { onEmpLocal(new Event('init')); } catch { }
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('admin_alerts_updated', onAdminLocal as EventListener);
      window.removeEventListener('employee_notifications_updated', onEmpLocal as EventListener);
    };
  }, [refresh, employeeKeys.join('|')]);

  const items = useMemo(() => {
    // Sort by newest first (reverse the array since alerts are stored oldest-first)
    if (isEmployee) {
      const sorted = [...(empItems || [])].reverse();
      return sorted.slice(0, 10);
    }
    // For admin alerts, get raw alerts to access timestamps, then map to UI format
    const sortedAlerts = [...(alerts || [])]
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, 10)
      .map(a => {
        const mapped = mapAlert(a);
        return { ...mapped, timestamp: a.timestamp, read: a.read };
      });
    return sortedAlerts;
  }, [alerts, empItems, isEmployee]);
  // Compute important unread using full AdminAlert objects, not mapped UI items
  const importantUnreadActual = useMemo(() => {
    if (isEmployee) return 0; // employee notifications are all treated equally for now
    const importantTypes = ['exam_reminder', 'admin_message', 'booking_created', 'pdf_saved'];
    return (alerts || []).filter(a => !a.read && importantTypes.includes(a.type)).length;
  }, [alerts, isEmployee]);
  const importantUnread = isFileManagerView ? 0 : importantUnreadActual;
  const displayUnreadCount = isFileManagerView ? 0 : (isEmployee ? empUnreadCount : (unreadCount || 0));

  // Background Sync for Online Bookings (ensure Admin is notified of public website activity)
  useEffect(() => {
    if (isEmployee || isFileManagerView) return;

    const syncBookings = async () => {
      try {
        const { data } = await supabase
          .from('bookings')
          .select('id, scheduled_at, service_package, booking_vehicle')
          .eq('status', 'tentative')
          .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(10);

        if (data && data.length > 0) {
          const localAlerts = JSON.parse(localStorage.getItem('admin_alerts') || '[]');
          
          data.forEach(b => {
            let meta = b.booking_vehicle || {};
            if (typeof meta === 'string') {
              try { meta = JSON.parse(meta); } catch(e) { meta = {}; }
            }
            const custName = b.customer_name || meta.customer_name || meta.name || 'New Customer';
            const syncId = `sync_book_${b.id}`;
            const alreadyNotified = localAlerts.some((a: any) => 
              (a.type === 'booking_created' && String(a.payload?.recordId || '') === String(b.id)) ||
              (a.id === syncId)
            );

            if (!alreadyNotified) {
              toast({
                title: "New Online Booking!",
                description: `${custName} just booked a ${b.service_package}.`,
                variant: "default",
              });

              notify(
                'booking_created',
                `NEW ONLINE REQUEST: ${custName} - ${b.service_package}`,
                'Customer Web',
                { id: syncId, recordId: b.id, bookingId: b.id }
              );
            }
          });
          
          if (addedAny) refresh();
        }
      } catch (err) {
        console.warn("[AlertSync] Failed to poll bookings:", err);
      }
    };

    const interval = setInterval(syncBookings, 30000); // Check every 30s
    syncBookings(); // Initial check
    return () => clearInterval(interval);
  }, [isEmployee, isFileManagerView, refresh]);

  // Priority: Yellow if ANY unread (easier to see), Red if 0 (matches user's screenshot requirement for 'nothing new')
  const bellColorClass = (displayUnreadCount > 0 || importantUnread > 0) ? "text-yellow-400" : "text-red-600";

  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative group">
          <Bell className={`h-6 w-6 transition-all duration-300 ${bellColorClass} ${ring ? 'animate-bounce scale-110' : 'group-hover:scale-110'}`} />
          {/* Show badge for ANY unread count with high-contrast red for urgency */}
          {(displayUnreadCount > 0 || importantUnread > 0) && (
            <Badge className="absolute -top-1 -right-1 bg-red-600 text-white font-bold border-2 border-black animate-in zoom-in duration-300">
              {displayUnreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[80vh] overflow-y-auto">
        <div className="px-3 py-2 text-sm font-semibold border-b border-border">Alerts</div>
        {items.length === 0 ? (
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">No new alerts</div>
        ) : (
          items.map(a => (
            <DropdownMenuItem key={a.id} className="flex flex-col items-start gap-2 p-3 border-b border-border/50 focus:bg-zinc-800 focus:text-white cursor-pointer group">
              <div className="flex items-center justify-between w-full">
                <div className="text-sm break-words flex-1 leading-relaxed group-hover:text-white">{a.title}</div>
                {(a as any).timestamp && (
                  <div className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">
                    {(() => {
                      const diff = Date.now() - new Date((a as any).timestamp).getTime();
                      const mins = Math.floor(diff / 60000);
                      const hrs = Math.floor(diff / 3600000);
                      const days = Math.floor(diff / 86400000);
                      if (mins < 1) return 'Just now';
                      if (mins < 60) return `${mins}m ago`;
                      if (hrs < 24) return `${hrs}h ago`;
                      return `${days}d ago`;
                    })()}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end w-full gap-3 mt-1">
                <a
                  href={a.href}
                  className="text-xs font-medium text-primary hover:text-white hover:underline px-2 py-1 rounded hover:bg-primary transition-colors bg-zinc-900 border border-zinc-700"
                  onClick={(e) => {
                    if (isEmployee) {
                      try { markEmployeeNotificationRead(a.id); } catch { }
                      try {
                        const list = getEmployeeNotifications();
                        const filtered = list.filter(n => employeeKeys.includes(String(n.employeeId || '').toLowerCase()));
                        setEmpItems(filtered.map(n => ({ id: n.id, title: n.message, href: '/tasks', read: !!n.read })));
                        setEmpUnreadCount(filtered.filter(n => !n.read).length);
                      } catch { }
                    } else {
                      markRead(a.id);
                    }
                  }}
                >
                  Open
                </a>
                {!isEmployee && (
                  <button
                    className="text-xs text-muted-foreground hover:text-red-400 px-2 py-1 rounded hover:bg-zinc-900 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try { useAlertsStore.getState().dismiss(a.id); } catch { }
                    }}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
        <div className="px-3 py-2">
          {isEmployee ? (
            <Button variant="outline" size="sm" onClick={() => {
              try { markAllEmployeeNotificationsRead(employeeKeys[0]); } catch { }; try {
                const list = getEmployeeNotifications();
                const filtered = list.filter(n => employeeKeys.includes(String(n.employeeId || '').toLowerCase()));
                setEmpItems(filtered.map(n => ({ id: n.id, title: n.message, href: '/tasks', read: !!n.read })));
                setEmpUnreadCount(filtered.filter(n => !n.read).length);
              } catch (e) { }
              setOpen(false);
            }} className="w-full">Mark all read</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => { dismissAll(); setOpen(false); }} className="w-full">Dismiss all</Button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
