import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Removed accordion import since we are restoring the boxes grid layout
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
 import { AlertTriangle, CalendarDays, UserPlus, FileText, Package, DollarSign, Calculator, Folder, Users, Grid3X3, CheckSquare, Tag, Settings as Cog, Shield, ClipboardCheck, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { CheatSheetPanel } from "@/pages/CheatSheet";
import localforage from "localforage";
import HelpModal from "@/components/help/HelpModal";
import { getCurrentUser } from "@/lib/auth";
import { useAlertsStore } from "@/store/alerts";
import { isViewed } from "@/lib/viewTracker";
import { getInvoices, upsertCustomer } from "@/lib/db";
import { insertStaticMockBasic, removeStaticMockBasic } from "@/lib/staticMock";
import api from "@/lib/api";
import { postFullSync } from "@/lib/servicesMeta";
import { useToast } from "@/hooks/use-toast";
import { notify } from "@/store/alerts";
import CustomerModal from "@/components/customers/CustomerModal";
import OrientationModal from "@/components/training/OrientationModal";
import jsPDF from 'jspdf';
  import { savePDFToArchive } from '@/lib/pdfArchive';
  import { useBookingsStore } from "@/store/bookings";

type Job = { finishedAt: string; totalRevenue: number; status: string };

// Persistent menu visibility settings
const MENU_STORAGE_KEY = 'hiddenMenuItems';
  const MENU_REGISTRY: { key: string; label: string }[] = [
    { key: 'start-job', label: 'Start a Job' },
  // { key: 'bookings', label: 'Bookings' }, // removed
  { key: 'search-customer', label: 'Customer Profiles' },
  { key: 'invoicing', label: 'Invoicing' },
  { key: 'accounting', label: 'Accounting' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'inventory-control', label: 'Inventory Control' },
  { key: 'file-manager', label: 'File Manager' },
  { key: 'reports', label: 'Reports' },
  { key: 'employee-dashboard', label: 'Employee Dashboard' },
  { key: 'service-checklist', label: 'Service Checklist' },
  { key: 'package-pricing', label: 'Package Pricing' },
  { key: 'settings', label: 'Settings' },
  { key: 'discount-coupons', label: 'Discount Coupons' },
  { key: 'training-manual', label: 'Quick Detailing Manual' },
    { key: 'company-employees', label: 'Company Employees' },
    { key: 'jobs-completed-admin', label: 'Jobs Completed by Admin' },
    { key: 'book-new-job', label: 'Book A New Job' },
  ];

function getHiddenMenuItems(): string[] {
  try {
    const raw = localStorage.getItem(MENU_STORAGE_KEY);
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function setHiddenMenuItems(items: string[]) {
  localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(items));
}
export function isMenuHidden(key: string): boolean {
  return getHiddenMenuItems().includes(key);
}

function MenuVisibilityControls() {
  const [hidden, setHidden] = useState<string[]>(getHiddenMenuItems());
  const { toast } = useToast();
  const toggleKey = (key: string, show: boolean) => {
    const next = show ? hidden.filter((k) => k !== key) : [...hidden, key];
    setHidden(next);
    setHiddenMenuItems(next);
    // Nudge listeners (sidebar, dashboards) to recompute
    window.dispatchEvent(new Event('storage'));
    toast({ title: 'Menu visibility updated', description: `${show ? 'Showing' : 'Hiding'} ${MENU_REGISTRY.find(i => i.key === key)?.label || key}` });
  };
  return (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {MENU_REGISTRY.map((item) => {
        const shown = !hidden.includes(item.key);
        return (
          <div key={item.key} className="flex items-center gap-2 p-2 rounded border border-zinc-800 bg-zinc-900">
            <Checkbox checked={shown} onCheckedChange={(val) => toggleKey(item.key, Boolean(val))} id={`menu_${item.key}`} />
            <Label htmlFor={`menu_${item.key}`} className="text-sm text-white">{item.label}</Label>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const { latest, unreadCount, markRead, dismiss, dismissAll, refresh } = useAlertsStore();
  const alertsAll = useAlertsStore((s) => s.alerts);
  const [newBookingsToday, setNewBookingsToday] = useState<number>(0);
  const [unpaidInvoices, setUnpaidInvoices] = useState<number>(0);
  const [criticalInventory, setCriticalInventory] = useState<number>(0);
  const [newFilesToday, setNewFilesToday] = useState<number>(0);
  const [unviewedFilesCount, setUnviewedFilesCount] = useState<number>(0);
  const [adminJobsCount, setAdminJobsCount] = useState<number>(0);
  const [totalDue, setTotalDue] = useState<number>(0);
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  // Menu visibility tick to refresh when settings change
  const [menuTick, setMenuTick] = useState(0);
  // User Administration modal state
  const [userAdminOpen, setUserAdminOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [impersonateId, setImpersonateId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<'employee' | 'admin'>('employee');
  // Employee-focused User Management modal state
  const [employeeMgmtOpen, setEmployeeMgmtOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [empSearch, setEmpSearch] = useState('');
  const [empNewName, setEmpNewName] = useState('');
  const [empNewEmail, setEmpNewEmail] = useState('');
  const [empNewPassword, setEmpNewPassword] = useState('');
  const [empEditId, setEmpEditId] = useState<string | null>(null);
  const [empEditName, setEmpEditName] = useState('');
  const [empEditEmail, setEmpEditEmail] = useState('');
  // Website Admin state
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [contactInfo, setContactInfo] = useState<{ hours: string; phone: string; address: string; email: string }>({ hours: '', phone: '', address: '', email: '' });
  const [aboutSections, setAboutSections] = useState<any[]>([]);
  // Modals for edit/add
  const [editVehicle, setEditVehicle] = useState<any | null>(null);
  const [newVehicleOpen, setNewVehicleOpen] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehicleDesc, setNewVehicleDesc] = useState('');
  const [newVehicleBase, setNewVehicleBase] = useState<string>('midsize');
  const [newVehicleMultiplier, setNewVehicleMultiplier] = useState<string>('100');
  const [editFaq, setEditFaq] = useState<any | null>(null);
  const [newFaqOpen, setNewFaqOpen] = useState(false);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [editAbout, setEditAbout] = useState<any | null>(null);
  const [newAboutOpen, setNewAboutOpen] = useState(false);
  const [newAboutSection, setNewAboutSection] = useState('');
  const [newAboutContent, setNewAboutContent] = useState('');
  // Cheat Sheet modal
  const [cheatOpen, setCheatOpen] = useState(false);
  const [orientationOpen, setOrientationOpen] = useState(false);
  const user = getCurrentUser();
  const [helpOpen, setHelpOpen] = useState(false);
  const [mockDataOpen, setMockDataOpen] = useState(false);
  const [mockReport, setMockReport] = useState<any | null>(null);
  // Bookings list for dashboard metrics (e.g., today's new bookings)
  const items = useBookingsStore((s) => s.items);

  // Removed auto-open for Website Administration to decouple from Admin Dashboard

  const loadUsers = async () => {
    try {
      const list = await api('/api/users', { method: 'GET' });
      setUsers(Array.isArray(list) ? list : []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    if (userAdminOpen) loadUsers();
  }, [userAdminOpen]);

  const loadEmployees = async () => {
    try {
      const list = await api('/api/users/employees', { method: 'GET' });
      setEmployees(Array.isArray(list) ? list : []);
    } catch { setEmployees([]); }
  };
  useEffect(() => { if (employeeMgmtOpen) loadEmployees(); }, [employeeMgmtOpen]);

  const createEmployee = async () => {
    if (!empNewName || !empNewEmail) {
      toast({ title: 'Name and Email required' });
      return;
    }
    const res = await api('/api/users/create-employee', { method: 'POST', body: JSON.stringify({ name: empNewName, email: empNewEmail, password: empNewPassword }) });
    if (res?.ok) {
      setEmpNewName(''); setEmpNewEmail(''); setEmpNewPassword('');
      await loadEmployees();
      toast({ title: 'Employee created', description: res?.user?.email });
    } else {
      toast({ title: 'Failed to create employee' });
    }
  };
  const updateEmployee = async () => {
    if (!empEditId) return;
    const res = await api('/api/users/update', { method: 'POST', body: JSON.stringify({ id: empEditId, name: empEditName, email: empEditEmail }) });
    if (res?.ok) {
      setEmpEditId(null); setEmpEditName(''); setEmpEditEmail('');
      await loadEmployees();
      toast({ title: 'Employee updated' });
    } else {
      toast({ title: 'Update failed' });
    }
  };
  const impersonateEmployee = async (id: string) => {
    const res = await api(`/api/users/impersonate/${id}`, { method: 'POST' });
    if (res?.ok) { toast({ title: 'Impersonating employee', description: res?.user?.email }); }
    else { toast({ title: 'Impersonation failed' }); }
  };
  const deleteEmployee = async (id: string) => {
    if (!confirm('Delete this employee?')) return;
    const res = await api(`/api/users/${id}`, { method: 'DELETE' });
    if (res?.ok) { await loadEmployees(); toast({ title: 'Employee deleted' }); }
    else { toast({ title: 'Delete failed' }); }
  };

  // Load Website Admin content when modal opens and refresh on content-changed
  useEffect(() => {
    const loadWA = async () => {
      try {
        const vt = await api('/api/vehicle-types', { method: 'GET' });
        setVehicleTypes(Array.isArray(vt) ? vt : []);
      } catch { setVehicleTypes([]); }
      try {
        const f = await api('/api/faqs', { method: 'GET' });
        // Handle both array response and object with items property to ensure all FAQs load
        const items = Array.isArray(f) ? f : (Array.isArray((f as any)?.items) ? (f as any).items : []);
        setFaqs(items);
      } catch { setFaqs([]); }
      try {
        const c = await api('/api/contact', { method: 'GET' });
        if (c && typeof c === 'object') setContactInfo({
          hours: c.hours || '',
          phone: c.phone || '',
          address: c.address || '',
          email: c.email || '',
        });
      } catch {}
      try {
        const a = await api('/api/about', { method: 'GET' });
        setAboutSections(Array.isArray(a) ? a : []);
      } catch { setAboutSections([]); }
    };
    if (userAdminOpen) loadWA();
    const onChanged = (e: any) => {
      if (!userAdminOpen) return;
      if (e && e.detail && ['vehicle-types','faqs','contact','about'].includes(e.detail.kind)) loadWA();
    };
    window.addEventListener('content-changed', onChanged as any);
    return () => window.removeEventListener('content-changed', onChanged as any);
  }, [userAdminOpen]);

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return String(u.name).toLowerCase().includes(q) || String(u.email).toLowerCase().includes(q);
  });

  const handleCreateUser = async () => {
    try {
      const payload = {
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword.trim() || undefined,
        role: newRole,
      };
      if (!payload.name || !payload.email) {
        toast({ title: 'Missing fields', description: 'Name and Email are required' });
        return;
      }
      const res = await api('/api/users/create', { method: 'POST', body: JSON.stringify(payload) });
      if (res?.ok) {
        toast({ title: 'User created', description: `${payload.name} (${payload.role})` });
        setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('employee');
        await loadUsers();
      } else if (res?.error === 'user_exists') {
        toast({ title: 'Email already exists', description: 'Choose a different email' });
      } else {
        toast({ title: 'Failed to create user', description: 'Try again' });
      }
    } catch {
      toast({ title: 'Failed to create', description: 'Unexpected error' });
    }
  };

  const handleUpdateRole = async (id: string, role: 'employee' | 'admin') => {
    try {
      const res = await api(`/api/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
      if (res?.ok) {
        toast({ title: 'Role updated', description: `Now ${role}` });
        await loadUsers();
      } else {
        toast({ title: 'Failed to update role' });
      }
    } catch {
      toast({ title: 'Failed to update role' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api(`/api/users/${id}`, { method: 'DELETE' });
      if (res?.ok) {
        toast({ title: 'User deleted' });
        await loadUsers();
      } else {
        toast({ title: 'Failed to delete' });
      }
    } catch {
      toast({ title: 'Failed to delete' });
    } finally {
      setDeleteId(null);
    }
  };

  const handleImpersonate = async (id: string) => {
    try {
      const res = await api(`/api/users/impersonate/${id}`, { method: 'POST' });
      if (res?.ok) {
        toast({ title: 'Impersonation active', description: `Signed on as ${res.user?.name || 'user'}` });
        // Redirect to appropriate dashboard
        setUserAdminOpen(false);
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 200);
      } else {
        toast({ title: 'Failed to impersonate' });
      }
    } catch {
      toast({ title: 'Failed to impersonate' });
    }
  };

  useEffect(() => {
    const todayStr = new Date().toDateString();
    const count = items.filter(b => new Date(b.date).toDateString() === todayStr && !isViewed("booking", b.id)).length;
    setNewBookingsToday(count);
  }, [items]);

  // Helper: unread alert count by type
  const badgeByType = useMemo(() => {
    return (type: any) => alertsAll.filter((a) => a.type === type && !a.read).length;
  }, [alertsAll]);

  useEffect(() => {
    // Invoices unpaid
    getInvoices<any>().then(list => {
      const count = list.filter((inv: any) => (inv.paymentStatus || "unpaid") !== "paid").length;
      setUnpaidInvoices(count);
    });

    // Materials + Chemicals critical count
    Promise.all([
      localforage.getItem<any[]>("materials"),
      localforage.getItem<any[]>("chemicals")
    ]).then(([mats, chems]) => {
      const mArr = Array.isArray(mats) ? mats : [];
      const cArr = Array.isArray(chems) ? chems : [];
      const mCount = mArr.filter(i => typeof i.lowThreshold === 'number' && (i.quantity || 0) <= (i.lowThreshold || 0)).length;
      const cCount = cArr.filter(c => (c.currentStock || 0) <= (c.threshold || 0)).length;
      const total = mCount + cCount;
      setCriticalInventory(total);
      try { localStorage.setItem('inventory_low_count', String(total)); } catch {}
    });

    // File Manager new files today
    const records = JSON.parse(localStorage.getItem('pdfArchive') || '[]');
    const tStr = new Date().toLocaleDateString().replace(/\//g, '-');
    const countToday = records.filter((r: any) => String(r.date).includes(tStr) && !isViewed("file", String(r.id))).length;
    setNewFilesToday(countToday);
    const countAllUnviewed = records.filter((r: any) => !isViewed("file", String(r.id))).length;
    setUnviewedFilesCount(countAllUnviewed);

    // Payroll Due: use endpoints for count and total; then push alerts/toast
    (async () => {
      try {
        const cRes = await api('/api/payroll/due-count', { method: 'GET' });
        const tRes = await api('/api/payroll/due-total', { method: 'GET' });
        const count = Number(cRes?.count || 0);
        const total = Number(tRes?.total || 0);
        setOverdueCount(count);
        setTotalDue(total);
        if (count > 0) {
          toast({ title: `${count} employees overdue — check Payroll`, description: `Total due $${total.toFixed(2)}` });
          // Push per-employee alerts with estimated amounts
          try {
            const employees = (await localforage.getItem<any[]>('company-employees')) || [];
            const hist = (await localforage.getItem<any[]>('payroll-history')) || [];
            const jobs = JSON.parse(localStorage.getItem('completedJobs') || '[]');
            const adj = JSON.parse(localStorage.getItem('payroll_owed_adjustments') || '{}');
            const now = Date.now();
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            const dueEmps = employees.filter((emp:any) => {
              const lastPaidTs = emp.lastPaid ? new Date(emp.lastPaid).getTime() : 0;
              const recentPaid = hist.some(h => String(h.status) === 'Paid' && (String(h.employee) === emp.name || String(h.employee) === emp.email) && (now - new Date(h.date).getTime()) <= sevenDays);
              return (!recentPaid) && ((now - lastPaidTs) > sevenDays);
            });
            dueEmps.forEach((emp:any) => {
              const unpaidJobs = jobs.filter((j:any) => j.status === 'completed' && !j.paid && (String(j.employee) === emp.email || String(j.employee) === emp.name));
              const unpaidSum = unpaidJobs.reduce((s:number, j:any) => s + Number(j.totalRevenue || 0), 0);
              const pendHist = hist.filter((h:any) => String(h.status) === 'Pending' && (String(h.employee) === emp.name || String(h.employee) === emp.email));
              const pendingSum = pendHist.reduce((s:number, h:any) => s + Number(h.amount || 0), 0);
              const adjSum = Number(adj[emp.name] || 0) + Number(adj[emp.email] || 0);
              const owed = Math.max(0, unpaidSum + pendingSum - adjSum);
              const msg = `${emp.name} due $${owed.toFixed(2)} — pay now`;
              // Prevent duplicate unread alerts for same employee within 24h
              const already = alertsAll.some(a => a.type === 'payroll_due' && a.message?.includes(emp.name) && !a.read && (now - new Date(a.timestamp).getTime()) < (24*60*60*1000));
              if (!already) notify('payroll_due', msg, 'system', { employee: emp.name, amount: owed });
            });
          } catch {}
        }
      } catch {}
    })();
  }, []);

  // Real-time Alerts: reflect changes across tabs and actions
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'admin_alerts') {
        try { refresh(); } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    try { refresh(); } catch {}
    const onAlertsUpdated = () => { try { refresh(); } catch {} };
    window.addEventListener('admin_alerts_updated' as any, onAlertsUpdated as any);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('admin_alerts_updated' as any, onAlertsUpdated as any);
    };
  }, [refresh]);

  useEffect(() => {
    const recalc = () => {
      const todayStr = new Date().toDateString();
      setNewBookingsToday((Array.isArray(items) ? items : []).filter(b => new Date(b.date).toDateString() === todayStr && !isViewed("booking", b.id)).length);
      // Recompute inventory across materials + chemicals
      Promise.all([
        localforage.getItem<any[]>("materials"),
        localforage.getItem<any[]>("chemicals")
      ]).then(([mats, chems]) => {
        const mArr = Array.isArray(mats) ? mats : [];
        const cArr = Array.isArray(chems) ? chems : [];
        const mCount = mArr.filter(i => typeof i.lowThreshold === 'number' && (i.quantity || 0) <= (i.lowThreshold || 0)).length;
        const cCount = cArr.filter(c => (c.currentStock || 0) <= (c.threshold || 0)).length;
        const total = mCount + cCount;
        setCriticalInventory(total);
        try { localStorage.setItem('inventory_low_count', String(total)); } catch {}
      });
      // Recompute files today
    const records = JSON.parse(localStorage.getItem('pdfArchive') || '[]');
    const tStr = new Date().toLocaleDateString().replace(/\//g, '-');
    setNewFilesToday(records.filter((r: any) => String(r.date).includes(tStr) && !isViewed("file", String(r.id))).length);
    setUnviewedFilesCount(records.filter((r: any) => !isViewed("file", String(r.id))).length);
    // Admin jobs badge: count Job PDFs linked to checklists with employeeId 'Admin'
    try {
      const jobPdfs = (records as any[]).filter(r => String(r.recordType) === 'Job');
      localforage.getItem<any[]>('generic-checklists').then((list) => {
        const checklists = Array.isArray(list) ? list : [];
        const merged = jobPdfs.map(pdf => ({ pdf, cl: checklists.find((c:any) => String(c.id) === String(pdf.recordId)) || null }));
        const countAdmin = merged.filter(r => String(r.cl?.employeeId || '').toLowerCase() === 'admin').length;
        setAdminJobsCount(countAdmin);
      });
    } catch {}
    };
    window.addEventListener('storage', recalc);
    return () => window.removeEventListener('storage', recalc);
  }, [items]);

  const RedBox = ({
    title,
    subtitle,
    href,
    onClick,
    Icon,
    badgeCount = 0,
    accent = 'blue',
  }: { title: string; subtitle?: string; href?: string; onClick?: () => void; Icon: any; badgeCount?: number; accent?: 'blue' | 'purple' | 'orange' | 'pink' | 'yellow' | 'green' | 'indigo' | 'cyan' | 'teal' | 'zinc'; }) => {
    const accents: Record<string, { icon: string; badge: string; btn: string; hoverRing: string }> = {
      blue:   { icon: 'text-blue-600/80',   badge: 'bg-blue-600/90',   btn: 'border-blue-600 text-blue-600 hover:bg-blue-600/10',   hoverRing: 'hover:ring-2 hover:ring-blue-600' },
      purple: { icon: 'text-purple-600/80', badge: 'bg-purple-600/90', btn: 'border-purple-600 text-purple-600 hover:bg-purple-600/10', hoverRing: 'hover:ring-2 hover:ring-purple-600' },
      orange: { icon: 'text-orange-500/80', badge: 'bg-orange-500/90', btn: 'border-orange-500 text-orange-500 hover:bg-orange-500/10', hoverRing: 'hover:ring-2 hover:ring-orange-500' },
      pink:   { icon: 'text-pink-600/80',   badge: 'bg-pink-600/90',   btn: 'border-pink-600 text-pink-600 hover:bg-pink-600/10',   hoverRing: 'hover:ring-2 hover:ring-pink-600' },
      yellow: { icon: 'text-yellow-500/80', badge: 'bg-yellow-500/90', btn: 'border-yellow-500 text-yellow-500 hover:bg-yellow-500/10', hoverRing: 'hover:ring-2 hover:ring-yellow-500' },
      green:  { icon: 'text-green-600/80',  badge: 'bg-green-600/90',  btn: 'border-green-600 text-green-600 hover:bg-green-600/10',  hoverRing: 'hover:ring-2 hover:ring-green-600' },
      indigo: { icon: 'text-indigo-600/80', badge: 'bg-indigo-600/90', btn: 'border-indigo-600 text-indigo-600 hover:bg-indigo-600/10', hoverRing: 'hover:ring-2 hover:ring-indigo-600' },
      cyan:   { icon: 'text-cyan-600/80',   badge: 'bg-cyan-600/90',   btn: 'border-cyan-600 text-cyan-600 hover:bg-cyan-600/10',   hoverRing: 'hover:ring-2 hover:ring-cyan-600' },
      teal:   { icon: 'text-teal-600/80',   badge: 'bg-teal-600/90',   btn: 'border-teal-600 text-teal-600 hover:bg-teal-600/10',   hoverRing: 'hover:ring-2 hover:ring-teal-600' },
      zinc:   { icon: 'text-zinc-400/80',   badge: 'bg-zinc-600/90',   btn: 'border-zinc-600 text-zinc-300 hover:bg-zinc-600/10',   hoverRing: 'hover:ring-2 hover:ring-zinc-600' },
    };
    const a = accents[accent] || accents.blue;
    const inner = (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-sm ${a.btn}`}>
        <Icon className={`w-3.5 h-3.5 ${a.icon}`} />
        <span>{title}</span>
        {badgeCount > 0 && (
          <span className={`ml-1 ${a.badge} text-white rounded-full h-4 w-4 inline-flex items-center justify-center text-[9px]`}>{badgeCount}</span>
        )}
      </div>
    );
    if (href) {
      return (
        <Link to={href} className={`${a.hoverRing}`}>{inner}</Link>
      );
    }
    return (
      <button type="button" onClick={onClick} className={`${a.hoverRing}`}>{inner}</button>
    );
  };

  // Removed auto FAQ seeding to keep Website Administration independent

  return (
    <div>
      <PageHeader title="Admin Dashboard" />
      <div className="p-4 space-y-6 max-w-screen-xl mx-auto overflow-x-hidden">
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => setHelpOpen(true)}>Help</Button>
        </div>
        {/* Removed top-right Website Administration button; now a dashboard box below */}
        {/* Real-time Alerts banner with deep purple background */}
        <Card className="p-4 border-purple-500/60 border bg-purple-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-white" />
              <h2 className="font-bold text-white">Real-time Alerts</h2>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-white">Unread: {unreadCount}</span>
              <Button size="sm" className="bg-black text-red-700 border-red-700 hover:bg-red-800/20" onClick={dismissAll}>Dismiss All</Button>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="space-y-2 max-h-48 overflow-auto">
            {[...latest].reverse().slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-white">{a.title}</span>
                <div className="flex items-center gap-2">
                  <a href={a.href} className="text-xs text-blue-400 hover:underline" onClick={() => markRead(a.id)}>Open</a>
                  <Button size="xs" variant="outline" onClick={() => markRead(a.id)}>Mark read</Button>
                  <Button size="xs" variant="outline" className="bg-black text-red-700 border-red-700 hover:bg-red-800/20" onClick={() => dismiss(a.id)}>Dismiss</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Eight grouped boxes with combined menu items in a 3x3-style grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Training Hub */}
          <Card className="relative p-5 bg-[#18181b] rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="w-6 h-6 text-green-500" />
              <div className="text-lg font-bold">Training Hub</div>
            </div>
            {/* Cheat Sheet & Exam Control — compact pill links with icons */}
            <Card className="p-4 bg-[#0f0f13] rounded-xl border border-zinc-800">
              <div className="mt-1 flex flex-row flex-wrap gap-1.5">
                <button type="button" onClick={() => setCheatOpen(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-purple-600 text-purple-600 hover:bg-purple-600/10 cursor-pointer">
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  <span>Open Cheat Sheet</span>
                </button>
                <Link to="/exam-admin" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-indigo-600 text-indigo-600 hover:bg-indigo-600/10">
                  <Cog className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Manage Exam</span>
                </Link>
                <button type="button" onClick={() => setOrientationOpen(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-orange-600 text-orange-600 hover:bg-orange-600/10">
                  <ClipboardCheck className="w-3.5 h-3.5 text-orange-600" />
                  <span>Employee Handbook</span>
                </button>
                {/* Place Take Exam directly under Open Entire Exam without disturbing layout */}
                <div className="w-full"></div>
                <Link to="/employee-dashboard?startExam=1" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-green-600 text-green-600 hover:bg-green-600/10">
                  <ClipboardCheck className="w-3.5 h-3.5 text-green-600" />
                  <span>Take Exam</span>
                </Link>
              </div>
            </Card>
          </Card>

          {/* Admin Control */}
          <Card className="relative p-5 bg-[#18181b] rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-6 h-6 text-blue-500" />
              <div className="text-lg font-bold">Admin Control</div>
            </div>
            {/* Inner dark box to match Training Hub */}
            <Card className="p-4 bg-[#0f0f13] rounded-xl border border-zinc-800">
              <div className="flex flex-row flex-wrap gap-1.5">
                {/* System Admin — compact pill links */}
                <Link to="/website-admin" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-600/10">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Website Administration</span>
                </Link>
                <Link to="/admin/users" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-pink-600 text-pink-600 hover:bg-pink-600/10">
                  <Users className="w-3.5 h-3.5 text-pink-600" />
                  <span>Users & Roles</span>
                </Link>
                {!isMenuHidden('settings') && (
                  <Link to="/settings" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-cyan-600 text-cyan-600 hover:bg-cyan-600/10">
                    <Cog className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Company Settings</span>
                  </Link>
                )}
                <button onClick={() => { setMockDataOpen(true); setMockReport(null); }} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-red-600 text-red-600 hover:bg-red-600/10">
                  <Tag className="w-3.5 h-3.5 text-red-600" />
                  <span>Mock Data System</span>
                </button>
                {/* Restore Defaults moved to Settings → Danger Zone */}
              </div>
            </Card>
          </Card>

          {/* Job Operations */}
          <Card className="relative p-5 bg-[#18181b] rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="w-6 h-6 text-orange-500" />
              <div className="text-lg font-bold">Job Operations</div>
            </div>
            {/* Inner dark box to match Training Hub */}
            <Card className="p-4 bg-[#0f0f13] rounded-xl border border-zinc-800">
              <div className="flex flex-row flex-wrap gap-2">
                {!isMenuHidden('start-job') && (
                  <RedBox accent="orange" title="Start a Job" subtitle="Open Service Checklist" href="/service-checklist" Icon={ClipboardCheck} />
                )}
                {!isMenuHidden('jobs-completed-admin') && (
                  <RedBox accent="orange" title="Jobs Completed by Admin" subtitle="View your admin work history" href="/jobs-completed?employee=admin" Icon={FileText} badgeCount={adminJobsCount} />
                )}
                {!isMenuHidden('book-new-job') && (
                  <RedBox
                    accent="orange"
                    title="Book A New Job"
                    subtitle="Lead to Book Now page"
                    href="/book-now"
                    Icon={ClipboardCheck}
                  />
                )}
                {/* New Booking card removed */}
              </div>
            </Card>
          </Card>

          {/* Customer Hub */}
          <Card className="relative p-5 bg-[#18181b] rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-6 h-6 text-purple-500" />
              <div className="text-lg font-bold">Customer Hub</div>
            </div>
            {/* Inner dark box to match Training Hub */}
            <Card className="p-4 bg-[#0f0f13] rounded-xl border border-zinc-800">
              <div className="flex flex-row flex-wrap gap-2">
                {!isMenuHidden('search-customer') && (
                  <RedBox accent="purple" title="Add Customer" subtitle="Open popup to add" onClick={() => setAddCustomerOpen(true)} Icon={UserPlus} badgeCount={badgeByType('customer_added')} />
                )}
                {!isMenuHidden('customer-profiles') && (
                  <RedBox accent="purple" title="Customer Profiles" subtitle="View Customer Info PDFs" href="/search-customer" Icon={Users} badgeCount={alertsAll.filter(a => a.payload?.recordType === 'Customer' && !a.read).length} />
                )}
              </div>
            </Card>

            {/* Tasks & Portal (moved under Customer Hub, same format) */}
            <div className="flex items-center gap-2 mt-6 mb-3">
              <CheckSquare className="w-6 h-6 text-zinc-400" />
              <div className="text-lg font-bold">Tasks & Portal</div>
            </div>
            <Card className="p-4 bg-[#0f0f13] rounded-xl border border-zinc-800">
              <div className="flex flex-row flex-wrap gap-2">
                {!isMenuHidden('employee-dashboard') && (
                  <RedBox accent="zinc" title="Staff Portal" subtitle="Open menu" href="/employee-dashboard" Icon={Grid3X3} />
                )}
                {!isMenuHidden('service-checklist') && (
                  <RedBox accent="zinc" title="Todo" subtitle={`Overdue: ${0}`} href="/tasks" Icon={CheckSquare} badgeCount={badgeByType('todo_overdue')} />
                )}
              </div>
            </Card>
          </Card>

          {/* Finance Center */}
          <Card className="relative p-5 bg-[#18181b] rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-6 h-6 text-green-600" />
              <div className="text-lg font-bold">Finance Center</div>
            </div>
            {/* Inner dark box to match Training Hub */}
            <Card className="p-4 bg-[#0f0f13] rounded-xl border border-zinc-800">
              <div className="flex flex-row flex-wrap gap-2">
                {!isMenuHidden('invoicing') && (
                  <RedBox accent="green" title="Create Invoice" subtitle={`${unpaidInvoices} unpaid`} href="/invoicing" Icon={FileText} badgeCount={Math.max(unpaidInvoices, badgeByType('invoice_unpaid'))} />
                )}
                {!isMenuHidden('payroll') && (
                  <RedBox accent="green" title="Payroll Due" subtitle={`${overdueCount} employees due payment this week — $${totalDue.toFixed(2)} total`} href="/payroll" Icon={DollarSign} badgeCount={Math.max(badgeByType('payroll_due'), overdueCount)} />
                )}
                {!isMenuHidden('pay-employee') && (
                  <RedBox accent="green" title="Pay Employee" subtitle="Open checks/cash/direct deposit" href="/payroll?modal=checks" Icon={DollarSign} />
                )}
                {!isMenuHidden('accounting') && (
                  <RedBox accent="green" title="Accounting" subtitle="View P&L" href="/accounting" Icon={Calculator} badgeCount={badgeByType('accounting_update')} />
                )}
                {!isMenuHidden('discount-coupons') && (
                  <RedBox accent="green" title="Discount Coupons" subtitle="Create and manage offers" href="/discount-coupons" Icon={Tag} />
                )}
              </div>
            </Card>
          </Card>

          {/* Inventory & Files */}
          <Card className="relative p-5 bg-[#18181b] rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Folder className="w-6 h-6 text-yellow-500" />
              <div className="text-lg font-bold">Inventory & Files</div>
            </div>
            {/* Inner dark box to match Training Hub */}
            <Card className="p-4 bg-[#0f0f13] rounded-xl border border-zinc-800">
              <div className="flex flex-row flex-wrap gap-2">
                {!isMenuHidden('inventory-control') && (
                  <RedBox accent="yellow" title="Low Inventory" subtitle={`${criticalInventory} items critical`} href="/inventory-control" Icon={Package} badgeCount={criticalInventory} />
                )}
                {!isMenuHidden('inventory-control') && (
                  <RedBox accent="yellow" title="Material Updates" subtitle="Record usage and notes" href="/inventory-control?updates=true" Icon={FileText} />
                )}
                {!isMenuHidden('file-manager') && (
                  <RedBox accent="yellow" title="File Manager" subtitle={`Unviewed: ${unviewedFilesCount}`} href="/file-manager" Icon={Folder} badgeCount={unviewedFilesCount} />
                )}
              </div>
            </Card>

            {/* Pricing moved under Inventory & Files, preserving colors and structure */}
            <div className="flex items-center gap-2 mt-6 mb-3">
              <Tag className="w-6 h-6 text-pink-500" />
              <div className="text-lg font-bold">Pricing</div>
            </div>
            {/* Inner dark box to match Training Hub */}
            <Card className="p-4 bg-[#0f0f13] rounded-xl border border-zinc-800">
              <div className="flex flex-row flex-wrap gap-2">
                {!isMenuHidden('package-pricing') && (
                  <RedBox accent="pink" title="Package Pricing" subtitle="Update prices" href="/package-pricing" Icon={Tag} badgeCount={badgeByType('pricing_update')} />
                )}
              </div>
            </Card>
          </Card>

          {/* Add Customer Popup */}
          <CustomerModal
            open={addCustomerOpen}
            onOpenChange={setAddCustomerOpen}
            initial={null}
            onSave={async (data) => {
              try {
                await upsertCustomer(data as any);
                setAddCustomerOpen(false);
                toast({ title: 'Customer Saved', description: 'Record stored.' });
              } catch (err: any) {
                setAddCustomerOpen(false);
                toast({ title: 'Save failed', description: err?.message || String(err), variant: 'destructive' });
              }
            }}
          />

          {/* Orientation Welcome Popup */}
          <OrientationModal
            open={orientationOpen}
            onOpenChange={setOrientationOpen}
          />

          {/* Tasks & Portal — moved under Customer Hub above */}

          {/* Pricing — moved under Inventory & Files above */}
        </div>

        {/* Cheat Sheet Modal — panel rendered inside dialog content */}
        <Dialog open={cheatOpen} onOpenChange={setCheatOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Training Cheat Sheet</DialogTitle>
            </DialogHeader>
            <CheatSheetPanel embedded />
          </DialogContent>
        </Dialog>

        {/* Mock Data System Popup — local-only users/employees/inventory */}
        <Dialog open={mockDataOpen} onOpenChange={setMockDataOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Mock Data System (Local Only)</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 text-sm">
              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-red-700 hover:bg-red-800"
                  onClick={async () => {
                    try {
                      setMockReport({ progress: ['Starting local-only insertion…'], createdAt: new Date().toISOString() });
                      const push = (msg: string) => setMockReport((prev: any) => ({ ...(prev||{}), progress: [ ...((prev?.progress)||[]), `${new Date().toLocaleTimeString()} — ${msg}` ] }));
                      const tracker = await insertStaticMockBasic(push, { customers: 5, employees: 5, chemicals: 3, materials: 3 });
                      // Build simple report
                      const usersLF = (await localforage.getItem<any[]>('users')) || [];
                      const customersLF = (await localforage.getItem<any[]>('customers')) || [];
                      const employeesLF = (await localforage.getItem<any[]>('company-employees')) || [];
                      const chemicalsLF = (await localforage.getItem<any[]>('chemicals')) || [];
                      const materialsLF = (await localforage.getItem<any[]>('materials')) || [];
                      const summary = {
                        local_users: usersLF.length,
                        local_customers: customersLF.length,
                        local_employees: employeesLF.length,
                        chemicals_count: chemicalsLF.length,
                        materials_count: materialsLF.length,
                        mode: 'Local only — Not Linked to Supabase',
                      };
                      setMockReport((prev: any) => ({ ...(prev||{}), customers: tracker.customers, employees: tracker.employees, inventory: tracker.inventory, summary }));
                      try {
                        window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'users' } }));
                        window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'customers' } }));
                        window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'employees' } }));
                        window.dispatchEvent(new CustomEvent('inventory-changed'));
                      } catch {}
                      toast?.({ title: 'Static Mock Data Inserted', description: 'Added customers, employees, and inventory locally.' });
                    } catch (e: any) {
                      const errMsg = e?.message || String(e);
                      setMockReport((prev: any) => ({ ...(prev||{}), errors: [ ...(prev?.errors||[]), errMsg ] }));
                    }
                  }}
                >Insert Mock Data</Button>
                <Button
                  variant="outline"
                  className="border-red-700 text-red-700 hover:bg-red-700/10"
                  onClick={async () => {
                    try {
                      setMockReport((prev:any) => ({ ...(prev||{}), progress: ['Removing local-only mock data…'] }));
                      await removeStaticMockBasic((msg) => setMockReport((prev: any) => ({ ...(prev||{}), progress: [ ...((prev?.progress)||[]), `${new Date().toLocaleTimeString()} — ${msg}` ] })));
                      try {
                        window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'users' } }));
                        window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'customers' } }));
                        window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'employees' } }));
                        window.dispatchEvent(new CustomEvent('inventory-changed'));
                      } catch {}
                      setMockReport((prev: any) => ({ ...(prev||{}), removed: true, removedAt: new Date().toISOString() }));
                      toast?.({ title: 'Static Mock Data Removed', description: 'Local-only mock data was cleared.' });
                    } catch (e: any) {
                      const errMsg = e?.message || String(e);
                      setMockReport((prev: any) => ({ ...(prev||{}), errors: [ ...(prev?.errors||[]), errMsg ] }));
                    }
                  }}
                >Remove Mock Data</Button>
              <Button
                variant="secondary"
                className="border-red-700 text-white bg-red-700 hover:bg-red-800"
                onClick={() => {
                  try {
                    const doc = new jsPDF();
                    let y = 30;
                    const addLine = (text: string, indent = 0) => {
                      doc.text(text, 20 + indent, y);
                      y += 6;
                      if (y > 270) { doc.addPage(); y = 20; }
                    };

                    doc.setFontSize(18);
                    doc.text('Mock Data Report', 105, 18, { align: 'center' });
                    doc.setFontSize(11);
                    const created = mockReport?.createdAt ? new Date(mockReport.createdAt).toLocaleString() : new Date().toLocaleString();
                    const removed = mockReport?.removedAt ? new Date(mockReport.removedAt).toLocaleString() : '—';
                    addLine(`Created: ${created}`);
                    addLine(`Removed: ${removed}`);

                    // Live Progress
                    if ((mockReport?.progress || []).length > 0) {
                      doc.setFontSize(12);
                      addLine('Live Progress:');
                      doc.setFontSize(11);
                      (mockReport?.progress || []).forEach((ln: string) => addLine(`- ${ln}`, 6));
                    }

                    // Summary
                    if (mockReport?.summary) {
                      doc.setFontSize(12);
                      addLine('Summary:');
                      doc.setFontSize(11);
                      addLine(`Local Users: ${mockReport.summary.local_users}`, 6);
                      addLine(`Local Customers: ${mockReport.summary.local_customers}`, 6);
                      addLine(`Local Employees: ${mockReport.summary.local_employees}`, 6);
                      addLine(`Chemicals: ${mockReport.summary.chemicals_count}`, 6);
                      addLine(`Materials: ${mockReport.summary.materials_count}`, 6);
                      addLine(`Mode: ${mockReport.summary.mode}`, 6);
                    }

                    // Customers
                    doc.setFontSize(12);
                    addLine('Customers:');
                    doc.setFontSize(11);
                    (mockReport?.customers || []).forEach((c:any) => addLine(`- ${c.name} — ${c.email}`, 6));

                    // Employees
                    doc.setFontSize(12);
                    addLine('Employees:');
                    doc.setFontSize(11);
                    (mockReport?.employees || []).forEach((e:any) => addLine(`- ${e.name} — ${e.email}`, 6));

                    // Inventory
                    doc.setFontSize(12);
                    addLine('Inventory:');
                    doc.setFontSize(11);
                    (mockReport?.inventory || []).forEach((i:any) => addLine(`- ${i.category}: ${i.name}`, 6));

                    // Removal status
                    if (mockReport?.removed) {
                      doc.setFontSize(12);
                      addLine('Removal Status:');
                      doc.setFontSize(11);
                      addLine(`Mock data removed at ${new Date(mockReport.removedAt).toLocaleString()}`, 6);
                    }

                    // Errors
                    if ((mockReport?.errors || []).length > 0) {
                      doc.setFontSize(12);
                      addLine('Issues detected:');
                      doc.setFontSize(11);
                      (mockReport.errors || []).forEach((err: any) => addLine(`- ${String(err)}`, 6));
                    }

                    const dataUrl = doc.output('dataurlstring');
                    const today = new Date().toISOString().split('T')[0];
                    const fileName = `MockData_Report_${today}.pdf`;
                    savePDFToArchive('Mock Data' as any, 'Admin', `mock-data-${Date.now()}`, dataUrl, { fileName, path: 'Mock Data/' });
                    toast?.({ title: 'Saved to File Manager', description: 'Mock Data Report archived.' });
                  } catch (e:any) {
                    toast?.({ title: 'Save Failed', description: e?.message || 'Could not generate PDF', variant: 'destructive' });
                  }
                }}
              >Save to PDF</Button>
              </div>

              {mockReport?.progress && (
                <div className="rounded-md border p-3">
                  <div className="font-semibold mb-2">Live Progress</div>
                  {(mockReport.progress || []).map((ln: string, i: number) => (
                    <div key={`md-prog-${i}`}>- {ln}</div>
                  ))}
                </div>
              )}

              <div>
                <div className="font-semibold">Customers Created</div>
                {(mockReport?.customers || []).map((c: any, i: number) => (
                  <div key={`md-c-${i}`} className="mt-1">- {c.name} ({c.email}) — Local only; appears in Admin → Customers and dropdowns</div>
                ))}
              </div>
              <div>
                <div className="font-semibold">Employees Created</div>
                {(mockReport?.employees || []).map((e: any, i: number) => (
                  <div key={`md-e-${i}`} className="mt-1">- {e.name} ({e.email}) — Local only; appears in Admin → Company Employees and selectors</div>
                ))}
              </div>
              <div>
                <div className="font-semibold">Inventory Added</div>
                {(mockReport?.inventory || []).map((i: any, idx: number) => (
                  <div key={`md-i-${idx}`} className="mt-1">- {i.name} — {i.category} — Local only; appears in Inventory Control and Inventory Report</div>
                ))}
              </div>
              <div>
                <div className="font-semibold">Summary</div>
                <div className="text-muted-foreground">{mockReport?.summary?.mode}</div>
                {mockReport?.summary && (
                  <div className="text-muted-foreground">Local counts — users={mockReport.summary.local_users}, customers={mockReport.summary.local_customers}, employees={mockReport.summary.local_employees}, chemicals={mockReport.summary.chemicals_count}, materials={mockReport.summary.materials_count}</div>
                )}
                <div className="text-xs mt-1">No Supabase interactions. If using Supabase-backed mock system later, ensure your Supabase env/config is valid.</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Administration Modal */}
        <Dialog open={userAdminOpen} onOpenChange={setUserAdminOpen}>
          {/* Centered, full-viewport content without conflicting positioning */}
          <DialogContent className="max-w-none w-screen h-screen sm:rounded-none p-0 bg-black text-white overflow-hidden">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle className="text-red-500">User Administration — Full Control</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6 space-y-6 h-[calc(100%-4rem)] overflow-auto">
              {/* Search */}
              <div className="grid grid-cols-1 gap-4">
                <div className="relative">
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users by name or email" className="bg-zinc-900 border-zinc-700 text-white" />
                </div>
              </div>

              {/* Section 1: User List */}
              <Card className="p-4 bg-zinc-900 border-zinc-800">
                <h3 className="text-lg font-semibold mb-4">User List</h3>
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-zinc-300">Name</TableHead>
                        <TableHead className="text-zinc-300">Email</TableHead>
                        <TableHead className="text-zinc-300">Role</TableHead>
                        <TableHead className="text-zinc-300">Last Login</TableHead>
                        <TableHead className="text-zinc-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="text-white">{u.name}</TableCell>
                          <TableCell className="text-white">{u.email}</TableCell>
                          <TableCell>
                            <Select value={u.role} onValueChange={(val) => handleUpdateRole(u.id, val as 'employee' | 'admin')}>
                              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue placeholder="Role" />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-800">
                                <SelectItem value="employee">Employee</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-zinc-300">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}</TableCell>
                          <TableCell className="space-x-2">
                            <Button size="sm" className="bg-red-700 hover:bg-red-800" onClick={() => handleImpersonate(u.id)}>Impersonate</Button>
                            <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setDeleteId(u.id)}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-zinc-400 py-8">No users found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Section 2: Add New User */}
              <Card className="p-4 bg-zinc-900 border-zinc-800">
                <h3 className="text-lg font-semibold mb-4">Add New User</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-zinc-400">Name</label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400">Email</label>
                    <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400">Password</label>
                    <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Blank to auto-generate" className="bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400">Role</label>
                    <Select value={newRole} onValueChange={(val) => setNewRole(val as 'employee' | 'admin')}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4">
                  <Button className="bg-red-700 hover:bg-red-800" onClick={handleCreateUser}>Create User</Button>
                </div>
              </Card>

              {/* Section 3: Impersonate */}
              <Card className="p-4 bg-zinc-900 border-zinc-800">
                <h3 className="text-lg font-semibold mb-4">Impersonate</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="text-sm text-zinc-400">Select User</label>
                    <Select value={impersonateId || ''} onValueChange={(val) => setImpersonateId(val)}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue placeholder="Choose user" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 max-h-64 overflow-y-auto">
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name} — {u.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Button className="bg-red-700 hover:bg-red-800" disabled={!impersonateId} onClick={() => impersonateId && handleImpersonate(impersonateId)}>Sign On As Selected</Button>
                  </div>
                </div>
              </Card>

              {/* Section 4: Menu Visibility */}
              <Card className="p-4 bg-zinc-900 border-zinc-800">
                <h3 className="text-lg font-semibold mb-4">Menu Visibility</h3>
                <p className="text-sm text-zinc-400 mb-2">Hide or show items in the slide-out menu. Hidden items will also be removed from Admin Dashboard quick actions.</p>
                <MenuVisibilityControls />
              </Card>

              {/* Section 5: Website Admin */}
              <Card className="p-4 bg-zinc-900 border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">Website Admin</h3>
                  <span className="text-xs text-zinc-400">Port 6061 • Red/Black</span>
                </div>
                {/* Vehicle Types */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Vehicle Types</h4>
                    <Button className="bg-red-700 hover:bg-red-800" onClick={() => setNewVehicleOpen(true)}>Add New</Button>
                  </div>
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-zinc-300">Name</TableHead>
                          <TableHead className="text-zinc-300">Description</TableHead>
                          <TableHead className="text-zinc-300">Edit</TableHead>
                          <TableHead className="text-zinc-300">Delete</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vehicleTypes.map((vt: any) => (
                          <TableRow key={vt.id}>
                            <TableCell className="text-white">{vt.name}</TableCell>
                            <TableCell className="text-zinc-300">{vt.description || '—'}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditVehicle(vt)}>Edit</Button>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" disabled={vt.protected} onClick={async () => {
                                if (!confirm('Delete this vehicle type?')) return;
                                await api(`/api/vehicle-types/${vt.id}`, { method: 'DELETE' });
                                const updated = await api('/api/vehicle-types', { method: 'GET' });
                                setVehicleTypes(Array.isArray(updated) ? updated : []);
                                // Push live vehicle types to server so all dropdowns immediately reflect deletion
                                try {
                                  await fetch('http://localhost:6061/api/vehicle-types/live', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(Array.isArray(updated) ? updated : []),
                                  });
                                } catch {}
                                try { await postFullSync(); } catch {}
                                try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'vehicle-types' } })); } catch {}
                                toast({ title: 'Vehicle type deleted', description: vt.name });
                              }}>Delete</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {vehicleTypes.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-zinc-400 py-6">No vehicle types</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* FAQs */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">FAQs</h4>
                    <Button className="bg-red-700 hover:bg-red-800" onClick={() => setNewFaqOpen(true)}>Add New</Button>
                  </div>
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-zinc-300">Question</TableHead>
                          <TableHead className="text-zinc-300">Answer</TableHead>
                          <TableHead className="text-zinc-300">Edit</TableHead>
                          <TableHead className="text-zinc-300">Delete</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {faqs.map((fq: any) => (
                          <TableRow key={fq.id}>
                            <TableCell className="text-white">{fq.question}</TableCell>
                            <TableCell className="text-zinc-300">{fq.answer}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditFaq(fq)}>Edit</Button>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={async () => {
                                if (!confirm('Delete this FAQ?')) return;
                                await api(`/api/faqs/${fq.id}`, { method: 'DELETE' });
                                const updated = await api('/api/faqs', { method: 'GET' });
                                setFaqs(Array.isArray(updated) ? updated : (Array.isArray((updated as any)?.items) ? (updated as any).items : []));
                                try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'faqs' } })); } catch {}
                                toast({ title: 'FAQ deleted' });
                              }}>Delete</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {faqs.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-zinc-400 py-6">No FAQs</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Contact */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Contact</h4>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-300">Hours</Label>
                      <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={contactInfo.hours} onChange={(e) => setContactInfo({ ...contactInfo, hours: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-zinc-300">Phone</Label>
                      <Input className="bg-zinc-800 border-zinc-700 text-white" value={contactInfo.phone} onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-zinc-300">Address</Label>
                      <Input className="bg-zinc-800 border-zinc-700 text-white" value={contactInfo.address} onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-zinc-300">Email</Label>
                      <Input className="bg-zinc-800 border-zinc-700 text-white" value={contactInfo.email} onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                      await api('/api/contact/update', { method: 'POST', body: JSON.stringify(contactInfo) });
                      // Push to live endpoint on 6061 so Contact page reflects changes immediately
                      try {
                        await fetch('http://localhost:6061/api/contact/live', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(contactInfo),
                        });
                      } catch {}
                      try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'contact' } })); } catch {}
                      toast({ title: 'Contact updated', description: 'Synced live on port 6061' });
                    }}>Save Contact</Button>
                  </div>
                </div>

                {/* About */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">About Sections</h4>
                    <Button className="bg-red-700 hover:bg-red-800" onClick={() => setNewAboutOpen(true)}>Add New</Button>
                  </div>
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-zinc-300">Section</TableHead>
                          <TableHead className="text-zinc-300">Content</TableHead>
                          <TableHead className="text-zinc-300">Edit</TableHead>
                          <TableHead className="text-zinc-300">Delete</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aboutSections.map((s: any) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-white">{s.section}</TableCell>
                            <TableCell className="text-zinc-300">{s.content}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditAbout(s)}>Edit</Button>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={async () => {
                                if (!confirm('Delete this section?')) return;
                                await api(`/api/about/${s.id}`, { method: 'DELETE' });
                                const updated = await api('/api/about', { method: 'GET' });
                                setAboutSections(Array.isArray(updated) ? updated : []);
                                toast({ title: 'Section deleted' });
                              }}>Delete</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {aboutSections.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-zinc-400 py-6">No sections</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </Card>

              <div className="flex justify-end">
                <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setUserAdminOpen(false)}>Close</Button>
              </div>

              {/* Vehicle Type Edit Modal */}
              <Dialog open={!!editVehicle} onOpenChange={(o) => !o && setEditVehicle(null)}>
                <DialogContent className="bg-black text-white">
                  <DialogHeader>
                    <DialogTitle>Edit Vehicle Type</DialogTitle>
                  </DialogHeader>
                  {editVehicle && (
                    <div className="space-y-3">
                      <Input className="bg-zinc-800 border-zinc-700 text-white" value={editVehicle.name} onChange={(e) => setEditVehicle({ ...editVehicle, name: e.target.value })} placeholder="Name" />
                      <Input className="bg-zinc-800 border-zinc-700 text-white" value={editVehicle.description || ''} onChange={(e) => setEditVehicle({ ...editVehicle, description: e.target.value })} placeholder="Description" />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditVehicle(null)}>Cancel</Button>
                        <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                          await api(`/api/vehicle-types/${editVehicle.id}`, { method: 'PUT', body: JSON.stringify({ name: editVehicle.name, description: editVehicle.description }) });
                          const updated = await api('/api/vehicle-types', { method: 'GET' });
                          setVehicleTypes(Array.isArray(updated) ? updated : []);
                          // Push live vehicle types to server so all dropdowns reflect edits immediately
                          try {
                            await fetch('http://localhost:6061/api/vehicle-types/live', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(Array.isArray(updated) ? updated : []),
                            });
                          } catch {}
                          // Notify other pages and trigger live refresh
                          try { await postFullSync(); } catch {}
                          try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'vehicle-types' } })); } catch {}
                          setEditVehicle(null);
                          toast({ title: 'Vehicle type updated' });
                        }}>Save</Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* Vehicle Type Add Modal */}
              <Dialog open={newVehicleOpen} onOpenChange={setNewVehicleOpen}>
                <DialogContent className="bg-black text-white">
                  <DialogHeader>
                    <DialogTitle>Add Vehicle Type</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input className="bg-zinc-800 border-zinc-700 text-white" value={newVehicleName} onChange={(e) => setNewVehicleName(e.target.value)} placeholder="Name" />
                    <Input className="bg-zinc-800 border-zinc-700 text-white" value={newVehicleDesc} onChange={(e) => setNewVehicleDesc(e.target.value)} placeholder="Description" />
                    <div>
                      <label className="text-sm text-zinc-400">$ Amount — Multiplier for packages/add-ons (e.g. 100 for Compact, 150 for Luxury)</label>
                      <Input
                        type="number"
                        step={1}
                        min={0}
                        max={10000}
                        className="bg-zinc-800 border-red-700 text-white placeholder:text-white"
                        value={newVehicleMultiplier}
                        onChange={(e) => setNewVehicleMultiplier(e.target.value)}
                        onBlur={() => {
                          const raw = Number(newVehicleMultiplier);
                          if (Number.isFinite(raw)) {
                            const rounded = Math.round(raw);
                            if (rounded !== raw) {
                              setNewVehicleMultiplier(String(rounded));
                              toast({ title: `Rounded to $${rounded}` });
                            }
                          }
                        }}
                        placeholder="$150"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setNewVehicleOpen(false)}>Cancel</Button>
                      <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                        const safeName = (newVehicleName || '').trim();
                        if (!safeName) {
                          toast({ title: 'Name required', description: 'Please enter a vehicle type name.' });
                          return;
                        }
                        const slug = safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `vt_${Date.now()}`;
                        // 1) Create the vehicle type record
                        await api('/api/vehicle-types', { method: 'POST', body: JSON.stringify({ id: slug, name: safeName, description: newVehicleDesc, hasPricing: true }) });
                        // 2) Validate and apply $ Amount multiplier to seed pricing for new type
                        let amt = Math.round(Number(newVehicleMultiplier || '100'));
                        if (!Number.isFinite(amt) || amt < 0 || amt > 10000) {
                          toast({ title: 'Invalid $ Amount', description: 'Enter a whole number between 0 and 10000.' , variant: 'destructive'});
                          return;
                        }
                        if (String(amt) !== String(newVehicleMultiplier)) {
                          toast({ title: `Rounded to $${amt}` });
                        }
                        if (!confirm('Update all packages? (affects live site)')) {
                          return;
                        }
                        await api('/api/packages/apply-vehicle-multiplier', { method: 'POST', body: JSON.stringify({ vehicleTypeId: slug, multiplier: amt }) });
                        // 3) Refresh vehicle types list
                        const updated = await api('/api/vehicle-types', { method: 'GET' });
                        setVehicleTypes(Array.isArray(updated) ? updated : []);
                        // Push live vehicle types to server for immediate dropdown sync
                        try {
                          await fetch('http://localhost:6061/api/vehicle-types/live', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(Array.isArray(updated) ? updated : []),
                          });
                        } catch {}
                        // 4) Post full sync so live site sees pricing updates
                        try { await postFullSync(); } catch {}
                        // 5) Dispatch content-changed events so dropdowns refresh immediately
                        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'vehicle-types' } })); } catch {}
                        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'packages' } })); } catch {}
                        // 6) Force refresh Service and Book Now pages in other tabs
                        try { localStorage.setItem('force-refresh', String(Date.now())); } catch {}
                        // Reset form
                        setNewVehicleName('');
                        setNewVehicleDesc('');
                        setNewVehicleMultiplier('100');
                        setNewVehicleOpen(false);
                        toast({ title: 'Vehicle type added', description: `Seeded pricing: $ Amount × base compact` });
                      }}>Save</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* FAQ Edit Modal */}
              <Dialog open={!!editFaq} onOpenChange={(o) => !o && setEditFaq(null)}>
                <DialogContent className="bg-black text-white">
                  <DialogHeader>
                    <DialogTitle>Edit FAQ</DialogTitle>
                  </DialogHeader>
                  {editFaq && (
                    <div className="space-y-3">
                      <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-24" value={editFaq.question} onChange={(e) => setEditFaq({ ...editFaq, question: e.target.value })} placeholder="Question" />
                      <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={editFaq.answer} onChange={(e) => setEditFaq({ ...editFaq, answer: e.target.value })} placeholder="Answer" />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditFaq(null)}>Cancel</Button>
                        <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                          await api(`/api/faqs/${editFaq.id}`, { method: 'PUT', body: JSON.stringify({ question: editFaq.question, answer: editFaq.answer }) });
                          const updated = await api('/api/faqs', { method: 'GET' });
                          setFaqs(Array.isArray(updated) ? updated : (Array.isArray((updated as any)?.items) ? (updated as any).items : []));
                          try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'faqs' } })); } catch {}
                          setEditFaq(null);
                          toast({ title: 'FAQ updated' });
                        }}>Save</Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* FAQ Add Modal */}
              <Dialog open={newFaqOpen} onOpenChange={setNewFaqOpen}>
                <DialogContent className="bg-black text-white">
                  <DialogHeader>
                    <DialogTitle>Add FAQ</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-24" value={newFaqQ} onChange={(e) => setNewFaqQ(e.target.value)} placeholder="Question" />
                    <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={newFaqA} onChange={(e) => setNewFaqA(e.target.value)} placeholder="Answer" />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setNewFaqOpen(false)}>Cancel</Button>
                      <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                        await api('/api/faqs', { method: 'POST', body: JSON.stringify({ question: newFaqQ, answer: newFaqA }) });
                        const updated = await api('/api/faqs', { method: 'GET' });
                        setFaqs(Array.isArray(updated) ? updated : (Array.isArray((updated as any)?.items) ? (updated as any).items : []));
                        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'faqs' } })); } catch {}
                        setNewFaqQ('');
                        setNewFaqA('');
                        setNewFaqOpen(false);
                        toast({ title: 'FAQ added' });
                      }}>Save</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* About Edit Modal */}
              <Dialog open={!!editAbout} onOpenChange={(o) => !o && setEditAbout(null)}>
                <DialogContent className="bg-black text-white">
                  <DialogHeader>
                    <DialogTitle>Edit Section</DialogTitle>
                  </DialogHeader>
                  {editAbout && (
                    <div className="space-y-3">
                      <Input className="bg-zinc-800 border-zinc-700 text-white" value={editAbout.section} onChange={(e) => setEditAbout({ ...editAbout, section: e.target.value })} placeholder="Section name" />
                      <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={editAbout.content} onChange={(e) => setEditAbout({ ...editAbout, content: e.target.value })} placeholder="Content" />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditAbout(null)}>Cancel</Button>
                        <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                          await api(`/api/about/${editAbout.id}`, { method: 'PUT', body: JSON.stringify({ section: editAbout.section, content: editAbout.content }) });
                          const updated = await api('/api/about', { method: 'GET' });
                          setAboutSections(Array.isArray(updated) ? updated : []);
                          setEditAbout(null);
                          toast({ title: 'Section updated' });
                        }}>Save</Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* About Add Modal */}
              <Dialog open={newAboutOpen} onOpenChange={setNewAboutOpen}>
                <DialogContent className="bg-black text-white">
                  <DialogHeader>
                    <DialogTitle>Add Section</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input className="bg-zinc-800 border-zinc-700 text-white" value={newAboutSection} onChange={(e) => setNewAboutSection(e.target.value)} placeholder="Section" />
                    <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={newAboutContent} onChange={(e) => setNewAboutContent(e.target.value)} placeholder="Content" />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setNewAboutOpen(false)}>Cancel</Button>
                      <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                        await api('/api/about', { method: 'POST', body: JSON.stringify({ section: newAboutSection, content: newAboutContent }) });
                        const updated = await api('/api/about', { method: 'GET' });
                        setAboutSections(Array.isArray(updated) ? updated : []);
                        setNewAboutSection('');
                        setNewAboutContent('');
                        setNewAboutOpen(false);
                        toast({ title: 'Section added' });
                      }}>Save</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Delete Confirm */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete user?</AlertDialogTitle>
                  <AlertDialogDescription>This will remove the user permanently.</AlertDialogDescription>
                </AlertDialogHeader>
<AlertDialogFooter className="button-group-responsive">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive" onClick={() => deleteId && handleDelete(deleteId)}>Yes, Delete</AlertDialogAction>
</AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogContent>
        </Dialog>

        {/* User Management — Employee Rights Modal */}
        <Dialog open={employeeMgmtOpen} onOpenChange={setEmployeeMgmtOpen}>
          <DialogContent className="max-w-none w-screen h-screen sm:rounded-none p-0 bg-black text-white overflow-hidden">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle className="text-red-500">User Management — Employee Rights</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6 space-y-6 h-[calc(100%-4rem)] overflow-auto">
              {/* Search */}
              <div className="grid grid-cols-1 gap-4">
                <Input value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} placeholder="Search employees" className="bg-zinc-900 border-zinc-700 text-white" />
              </div>

              {/* Employee List */}
              <Card className="p-4 bg-zinc-900 border-zinc-800">
                <h3 className="text-lg font-semibold mb-4">Employees</h3>
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-zinc-300">Name</TableHead>
                        <TableHead className="text-zinc-300">Email</TableHead>
                        <TableHead className="text-zinc-300">Role</TableHead>
                        <TableHead className="text-zinc-300">Last Login</TableHead>
                        <TableHead className="text-zinc-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.filter((u) => {
                        const q = empSearch.trim().toLowerCase();
                        const combo = `${u.name || ''} ${u.email || ''}`.toLowerCase();
                        return !q || combo.includes(q);
                      }).map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="text-white">
                            {empEditId === u.id ? (
                              <Input value={empEditName} onChange={(e) => setEmpEditName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                            ) : (
                              u.name
                            )}
                          </TableCell>
                          <TableCell className="text-white">
                            {empEditId === u.id ? (
                              <Input value={empEditEmail} onChange={(e) => setEmpEditEmail(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                            ) : (
                              u.email
                            )}
                          </TableCell>
                          <TableCell className="text-zinc-300">Employee</TableCell>
                          <TableCell className="text-zinc-300">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}</TableCell>
                          <TableCell className="space-x-2">
                            {empEditId === u.id ? (
                              <>
                                <Button size="sm" className="bg-red-700 hover:bg-red-800" onClick={updateEmployee}>Save</Button>
                                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300" onClick={() => { setEmpEditId(null); setEmpEditName(''); setEmpEditEmail(''); }}>Cancel</Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => { setEmpEditId(u.id); setEmpEditName(u.name || ''); setEmpEditEmail(u.email || ''); }}>Edit</Button>
                                <Button size="sm" className="bg-red-700 hover:bg-red-800" onClick={() => impersonateEmployee(u.id)}>Impersonate</Button>
                                <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => deleteEmployee(u.id)}>Delete</Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {employees.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-zinc-400 py-8">No employees found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Add New Employee */}
              <Card className="p-4 bg-zinc-900 border-zinc-800">
                <h3 className="text-lg font-semibold mb-4">Add New Employee</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-zinc-400">Name</label>
                    <Input value={empNewName} onChange={(e) => setEmpNewName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400">Email</label>
                    <Input value={empNewEmail} onChange={(e) => setEmpNewEmail(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400">Password</label>
                    <Input value={empNewPassword} onChange={(e) => setEmpNewPassword(e.target.value)} placeholder="Blank to auto-generate" className="bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <div className="flex items-end">
                    <Button className="bg-red-700 hover:bg-red-800" onClick={createEmployee}>Create Employee</Button>
                  </div>
                </div>
              </Card>

            </div>
          </DialogContent>
        </Dialog>
      </div>
      <HelpModal open={helpOpen} onOpenChange={setHelpOpen} role={(user?.role === 'admin') ? 'admin' : 'employee'} />
    </div>
  );
}
