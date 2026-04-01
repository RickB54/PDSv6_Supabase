import React, { useState, useMemo, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    CalendarDays,
    Clock,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    Users,
    ClipboardList,
    DollarSign,
    Plus,
    UserPlus,
    Play,
    Camera,
    ChevronRight,
    ArrowRight,
    Activity,
    Calendar,
    AlertTriangle,
    ClipboardCheck,
    Package,
    BadgeAlert,
    Search,
    Star,
    LayoutDashboard,
    Trash2,
    Maximize2,
    X
} from "lucide-react";
import { FileText, CheckSquare } from "lucide-react";
import { format, isToday, isThisWeek, isThisMonth, startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input as UIInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useBookingsStore } from "@/store/bookings";
import { useAlertsStore } from "@/store/alerts";
import { useNotesStore, Note } from "@/store/notes";
import localforage from "localforage";
import { getInvoices } from "@/lib/db";

interface Shortcut {
    id: string;
    label: string;
    detail: string;
    type: 'link' | 'modal' | 'content'; // Added 'content' for Learning Library items
    target: string;
    isCustom?: boolean;
    // Fields for Learning Library content items
    thumbnail_url?: string;
    content_type?: 'video' | 'article' | 'pdf' | 'image';
    resource_url?: string;
}

interface PrimeCentralHubProps {
    onQuickAction?: (action: string) => void;
}

const AVAILABLE_SHORTCUTS: Shortcut[] = [
    // Core Operations
    { id: 'bookings', label: 'Bookings Calendar', detail: 'Manage appointments', type: 'link', target: '/bookings' },
    { id: 'accounting', label: 'Accounting', detail: 'Financial overview', type: 'link', target: '/accounting' },
    { id: 'inventory', label: 'Inventory Control', detail: 'Stock management', type: 'link', target: '/inventory-control' },
    { id: 'package-pricing', label: 'Package Pricing', detail: 'Update services', type: 'link', target: '/package-pricing' },
    { id: 'reports', label: 'Reports', detail: 'Business analytics', type: 'link', target: '/reports' },
    { id: 'file-manager', label: 'File Manager', detail: 'Audit docs & photos', type: 'link', target: '/file-manager' },
    { id: 'training', label: 'Training Center', detail: 'Prime Training Manual', type: 'link', target: '/training-manual' },
    { id: 'learning-library', label: 'Learning Library', detail: 'Videos & Articles', type: 'link', target: '/learning-library' },
    { id: 'gallery', label: 'Vehicle Gallery', detail: 'Work samples', type: 'link', target: '/vehicle-gallery' },
    { id: 'tasks', label: 'Tasks & Portal', detail: 'Operational items', type: 'link', target: '/tasks' },
    { id: 'payroll', label: 'Payroll', detail: 'Employee earnings', type: 'link', target: '/payroll' },
    { id: 'staff-schedule', label: 'Staff Schedule', detail: 'Employee shifts', type: 'link', target: '/staff-schedule' },
    { id: 'user-mgmt', label: 'Users & Roles', detail: 'Manage app access', type: 'link', target: '/user-management' },
    { id: 'search-customer', label: 'Customer Profiles', detail: 'CRM database', type: 'link', target: '/search-customer' },
    { id: 'prospects', label: 'Prospects', detail: 'Leads & Enquiries', type: 'link', target: '/prospects' },
    { id: 'estimates', label: 'Estimates', detail: 'Quotes & Proposals', type: 'link', target: '/estimates' },
    { id: 'invoicing', label: 'Invoicing', detail: 'Billing & Payments', type: 'link', target: '/invoicing' },
    { id: 'availability', label: 'Availability Manager', detail: 'Staff blockouts', type: 'link', target: '/availability-manager' },
    { id: 'vehicle-classification', label: 'Vehicle Classes', detail: 'Size definitions', type: 'link', target: '/vehicle-classification' },
    { id: 'client-evaluation', label: 'Client Evaluation', detail: 'Inspection reports', type: 'link', target: '/client-evaluation' },
    { id: 'addon-upsell', label: 'Addon Script', detail: 'Sales guidance', type: 'link', target: '/addon-upsell-script' },
    { id: 'mileage', label: 'Mileage Tracking', detail: 'Vehicle logs', type: 'link', target: '/mileage' },
    { id: 'budget', label: 'Company Budget', detail: 'Expense planning', type: 'link', target: '/company-budget' },
    { id: 'taxes', label: 'Tax Center', detail: 'Reporting & Filings', type: 'link', target: '/taxes' },
    { id: 'coupons', label: 'Discount Coupons', detail: 'Promo code management', type: 'link', target: '/discount-coupons' },
    { id: 'mobile-setup', label: 'Mobile Setup', detail: 'Field unit config', type: 'link', target: '/mobile-setup' },
    { id: 'detailing-vendors', label: 'Detailing Vendors', detail: 'Supplier database', type: 'link', target: '/detailing-vendors' },
    { id: 'settings', label: 'App Settings', detail: 'Global configuration', type: 'link', target: '/settings' },

    // Modals
    { id: 'modal-add-customer', label: 'Quick Add Customer', detail: 'Intake modal', type: 'modal', target: 'add-customer' },
    { id: 'modal-cheat-sheet', label: 'Cheat Sheet', detail: 'Training quick reference', type: 'modal', target: 'cheat-sheet' },
    { id: 'modal-subcontractors', label: 'SubContractors', detail: 'External teams', type: 'modal', target: 'subcontractors' },
    { id: 'modal-user-admin', label: 'User Admin', detail: 'Roles & Rights', type: 'modal', target: 'user-admin' },
    { id: 'modal-employee-mgmt', label: 'Employee Mgmt', detail: 'Details & History', type: 'modal', target: 'employee-mgmt' },
    { id: 'modal-orientation', label: 'Employee Orientation', detail: 'Onboarding flow', type: 'modal', target: 'orientation' },
];

const DEFAULT_PINNED = ['reports', 'training', 'package-pricing', 'gallery'];

export const PrimeCentralHub: React.FC<PrimeCentralHubProps> = ({ onQuickAction }) => {
    const [timeScope, setTimeScope] = useState<'today' | 'week' | 'month'>('today');
    const { items: bookings } = useBookingsStore();
    const { alerts } = useAlertsStore();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [inventories, setInventories] = useState<{ materials: any[], chemicals: any[] }>({ materials: [], chemicals: [] });
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);
    const [customShortcuts, setCustomShortcuts] = useState<Shortcut[]>([]);
    const [isManaging, setIsManaging] = useState(false);
    const [isActionsExpanded, setIsActionsExpanded] = useState(true);
    const [isNotesSelectorOpen, setIsNotesSelectorOpen] = useState(false);
    const [attachedNoteId, setAttachedNoteId] = useState<string | null>(null);
    const [isNoteViewerOpen, setIsNoteViewerOpen] = useState(false);

    const notesStore = useNotesStore();

    // Custom form state
    const [customLabel, setCustomLabel] = useState('');
    const [customTarget, setCustomTarget] = useState('');
    const [customType, setCustomType] = useState<'link' | 'modal' | 'content'>('link');

    useEffect(() => {
        getInvoices().then(val => setInvoices(Array.isArray(val) ? val : []));
        localforage.getItem<any[]>('company-employees').then(val => setEmployees(val || []));
        Promise.all([
            localforage.getItem<any[]>('materials'),
            localforage.getItem<any[]>('chemicals'),
            localforage.getItem<string[]>('prime-pinned-shortcuts'),
            localforage.getItem<Shortcut[]>('prime-custom-shortcuts'),
            localforage.getItem<string>('prime-attached-note-id')
        ]).then(([m, c, p, cs, an]) => {
            setInventories({ materials: (m as any[]) || [], chemicals: (c as any[]) || [] });
            setPinnedIds(p || DEFAULT_PINNED);
            setCustomShortcuts(cs || []);
            setAttachedNoteId(an || null);
        });
        notesStore.refresh();
    }, []);

    const recentActivity = useMemo(() => {
        const activity: any[] = [];
        (bookings || []).slice(0, 5).forEach(b => {
            activity.push({
                type: 'Job',
                name: `${b.customer || 'Lead'}`,
                detail: `${b.vehicleYear || ''} ${b.vehicleMake || ''} ${b.status}`.trim(),
                timestamp: b.createdAt ? parseISO(b.createdAt) : new Date(b.date || Date.now())
            });
        });
        (invoices || []).slice(0, 5).forEach(i => {
            activity.push({
                type: 'Invoice',
                name: `INV-${i.id.substring(0, 8)}`,
                detail: `$${i.total} - ${i.paymentStatus}`,
                timestamp: i.createdAt ? parseISO(i.createdAt) : new Date()
            });
        });
        return activity
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 5)
            .map(item => ({
                ...item,
                time: formatDistanceToNow(item.timestamp, { addSuffix: true })
            }));
    }, [bookings, invoices]);

    const allShortcuts = useMemo(() => [...AVAILABLE_SHORTCUTS, ...customShortcuts], [customShortcuts]);
    const pinnedShortcuts = useMemo(() => {
        return pinnedIds.map(id => allShortcuts.find(s => s.id === id)).filter(Boolean) as Shortcut[];
    }, [pinnedIds, allShortcuts]);

    const handleTogglePinned = (id: string) => {
        const next = pinnedIds.includes(id) ? pinnedIds.filter(i => i !== id) : [...pinnedIds, id];
        setPinnedIds(next);
        localforage.setItem('prime-pinned-shortcuts', next);
    };

    const handleAddCustom = () => {
        if (!customLabel || !customTarget) return;
        const newShortcut: Shortcut = {
            id: `custom-${Date.now()}`,
            label: customLabel,
            detail: 'Custom shortcut',
            type: customType,
            target: customTarget,
            isCustom: true
        };
        const next = [...customShortcuts, newShortcut];
        setCustomShortcuts(next);
        localforage.setItem('prime-custom-shortcuts', next);
        setCustomLabel('');
        setCustomTarget('');
    };

    const handleRemoveCustom = (id: string) => {
        const next = customShortcuts.filter(s => s.id !== id);
        setCustomShortcuts(next);
        setPinnedIds(prev => prev.filter(p => p !== id));
        localforage.setItem('prime-custom-shortcuts', next);
        localforage.setItem('prime-pinned-shortcuts', pinnedIds.filter(p => p !== id));
    };

    const attachedNote = useMemo(() => {
        if (!attachedNoteId) return null;
        return notesStore.notes.find(n => n.id === attachedNoteId);
    }, [attachedNoteId, notesStore.notes]);

    const handleAttachNote = (noteId: string) => {
        setAttachedNoteId(noteId);
        localforage.setItem('prime-attached-note-id', noteId);
        setIsNotesSelectorOpen(false);
    };

    const handleDetachNote = () => {
        setAttachedNoteId(null);
        localforage.setItem('prime-attached-note-id', null);
    };

    // Filtered data based on scope
    const scopedBookings = useMemo(() => {
        const now = new Date();
        let start, end;
        if (timeScope === 'today') {
            start = startOfToday();
            end = endOfToday();
        } else if (timeScope === 'week') {
            start = startOfWeek(now);
            end = endOfWeek(now);
        } else {
            start = startOfMonth(now);
            end = endOfMonth(now);
        }

        return (bookings || []).filter(b => {
            try {
                const d = b.date ? parseISO(b.date) : new Date();
                return isWithinInterval(d, { start, end });
            } catch { return false; }
        });
    }, [bookings, timeScope]);

    const stats = useMemo(() => {
        const scheduled = scopedBookings.length;
        const inProgress = scopedBookings.filter(b => b.status === 'in_progress').length;
        const expectedRevenue = scopedBookings.reduce((acc, b) => acc + (Number(b.price) || 0), 0);
        return { scheduled, inProgress, expectedRevenue };
    }, [scopedBookings]);

    // Action Required Logic
    const actionItems = useMemo(() => {
        const items = [];

        // Overdue invoices
        const now = new Date();
        const overdueInvoices = invoices.filter(inv => inv.paymentStatus !== 'paid' && inv.dueDate && new Date(inv.dueDate) < now);
        if (overdueInvoices.length > 0) {
            items.push({
                id: 'overdue-invoices',
                title: `${overdueInvoices.length} Overdue Invoices`,
                description: `Total outstanding: $${overdueInvoices.reduce((a, b) => a + (Number(b.total) || 0), 0).toFixed(2)}`,
                link: '/accounting',
                type: 'critical'
            });
        }

        // Unassigned jobs
        const unassigned = (bookings || []).filter(b => !b.assignedEmployee && (b.status === 'pending' || b.status === 'confirmed'));
        if (unassigned.length > 0) {
            items.push({
                id: 'unassigned-jobs',
                title: `${unassigned.length} Unassigned Jobs`,
                description: 'Team assignments needed for upcoming bookings',
                link: '/bookings',
                type: 'critical'
            });
        }

        // From Alert System
        const criticalAlerts = (alerts || []).filter(a => !a.read && (a.type === 'low_inventory' || a.type === 'invoice_unpaid' || a.type === 'todo_overdue'));
        criticalAlerts.forEach(a => {
            items.push({
                id: a.id,
                title: a.message || a.type.replace(/_/g, ' '),
                description: format(new Date(a.timestamp), 'MMM d, p'),
                link: '/admin-dashboard', // Or more specific based on mapAlert
                type: 'critical'
            });
        });

        return items.slice(0, 3);
    }, [invoices, bookings, inventories, alerts]);

    // Section 3: Snapshot Metrics
    const summaryMetrics = useMemo(() => {
        const now = new Date();
        const start = timeScope === 'today' ? startOfToday() : timeScope === 'week' ? startOfWeek(now) : startOfMonth(now);
        const end = timeScope === 'today' ? endOfToday() : timeScope === 'week' ? endOfWeek(now) : endOfMonth(now);

        const scopeBookings = (bookings || []).filter(b => {
            try {
                const d = b.date ? parseISO(b.date) : null;
                return d && isWithinInterval(d, { start, end });
            } catch { return false; }
        });

        const upcoming = scopeBookings.filter(b => b.date && new Date(b.date) >= now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
        const jobsInProgress = scopeBookings.filter(b => b.status === 'in_progress').length;
        const jobsWaiting = scopeBookings.filter(b => (b.status === 'confirmed' || b.status === 'pending') && b.date && new Date(b.date) >= now).length;
        const totalEmps = employees.length;
        const assignedInScope = new Set(scopeBookings.filter(b => b.assignedEmployee).map(b => b.assignedEmployee)).size;

        const scopeInvoices = invoices.filter(inv => {
            try {
                const d = inv.createdAt ? parseISO(inv.createdAt) : null;
                return d && isWithinInterval(d, { start, end });
            } catch { return false; }
        });

        const outstandingBalance = scopeInvoices.filter(i => i.paymentStatus !== 'paid').reduce((a, b) => a + (Number(b.total) || 0), 0);
        const collected = scopeInvoices.reduce((a, b) => a + (Number(b.paidAmount) || 0), 0);

        return {
            bookings: {
                count: scopeBookings.length,
                next: upcoming,
                confirmed: scopeBookings.filter(b => b.status === 'confirmed').length
            },
            jobs: {
                inProgress: jobsInProgress,
                waiting: jobsWaiting,
                completed: scopeBookings.filter(b => b.status === 'done').length
            },
            employees: {
                scheduled: assignedInScope,
                available: Math.max(0, totalEmps - assignedInScope),
                conflicts: 0
            },
            finance: {
                due: scopeInvoices.filter(i => i.paymentStatus !== 'paid').length,
                balance: outstandingBalance,
                collected: collected
            }
        };
    }, [bookings, invoices, employees, timeScope]);

    const weeklyDistribution = useMemo(() => {
        const now = new Date();
        const start = startOfWeek(now);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return (bookings || []).filter(b => {
                try {
                    const bd = b.date ? parseISO(b.date) : null;
                    return bd && bd.toDateString() === d.toDateString();
                } catch { return false; }
            }).length;
        });
    }, [bookings]);

    const monthlyRevenueGoal = 15000;
    const monthlyRevenueStats = useMemo(() => {
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        const scopeInvoices = invoices.filter(inv => {
            try {
                const d = inv.createdAt ? parseISO(inv.createdAt) : null;
                return d && isWithinInterval(d, { start, end });
            } catch { return false; }
        });
        const revenue = scopeInvoices.reduce((a, b) => a + (Number(b.paidAmount) || 0), 0);
        const percent = Math.min(100, Math.round((revenue / monthlyRevenueGoal) * 100));
        return { revenue, target: monthlyRevenueGoal, percent };
    }, [invoices]);

    return (
        <div className="flex flex-col gap-8 pb-10 max-w-7xl mx-auto">
            {/* Section 1: Context Header */}
            <header className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight text-white">{format(new Date(), 'EEEE, MMMM do')}</h1>
                        <p className="text-zinc-400 text-sm">
                            {stats.scheduled} jobs scheduled · {stats.inProgress} in progress · ${stats.expectedRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} expected
                        </p>
                    </div>
                    <div className="flex p-1 bg-zinc-900/50 rounded-lg border border-zinc-800">
                        {(['today', 'week', 'month'] as const).map((scope) => (
                            <button
                                key={scope}
                                onClick={() => setTimeScope(scope)}
                                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${timeScope === scope
                                    ? 'bg-zinc-800 text-white shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                {scope.charAt(0).toUpperCase() + scope.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Section 2: Action Required */}
            <section className="space-y-4">
                <button
                    onClick={() => setIsActionsExpanded(!isActionsExpanded)}
                    className="flex items-center justify-between w-full hover:bg-zinc-900/40 p-2 rounded-lg transition-colors group"
                >
                    <div className="flex items-center gap-2">
                        <BadgeAlert className={`w-5 h-5 ${actionItems.length > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                        <h2 className="text-lg font-semibold text-white">Action Required</h2>
                        <Badge variant="outline" className={`ml-2 font-mono ${actionItems.length > 0 ? 'border-red-500/50 text-red-500 bg-red-500/5' : 'border-emerald-500/50 text-emerald-500 bg-emerald-500/5'}`}>
                            {actionItems.length}
                        </Badge>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${isActionsExpanded ? 'rotate-90' : ''}`} />
                </button>

                {isActionsExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        {actionItems.length > 0 ? (
                            actionItems.map((item) => (
                                <Link key={item.id} to={item.link} className="group">
                                    <Card className="p-4 bg-zinc-900/40 border-zinc-800 hover:border-red-500/50 transition-colors h-full flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between mb-2">
                                                <span className="text-red-500 text-xs font-bold uppercase tracking-wider">High Priority</span>
                                                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-red-500 transition-colors" />
                                            </div>
                                            <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                                            <p className="text-zinc-400 text-sm">{item.description}</p>
                                        </div>
                                    </Card>
                                </Link>
                            ))
                        ) : (
                            <Card className="col-span-full p-4 bg-zinc-900/20 border-zinc-800 border-dashed flex flex-row items-center justify-center gap-3 text-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500/50" />
                                <p className="text-zinc-500 text-sm">Clear skies! No critical blockers or overdue items requiring attention.</p>
                            </Card>
                        )}
                    </div>
                )}
            </section>

            {/* Section 3: Operational Snapshot */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Daily Operational Snapshot</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Bookings */}
                    <Link to="/bookings" className="group">
                        <Card className="p-5 bg-zinc-900/40 border-zinc-800 hover:border-blue-500/30 transition-all h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Calendar className="w-5 h-5 text-blue-500" />
                                </div>
                                <Badge variant="outline" className="text-zinc-500 border-zinc-800 font-normal">Details</Badge>
                            </div>
                            <div className="space-y-1 mb-4">
                                <div className="text-2xl font-bold text-white">{summaryMetrics.bookings.count}</div>
                                <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Bookings {timeScope === 'today' ? 'Today' : 'in Scope'}</div>
                            </div>
                            <div className="text-sm text-zinc-400">
                                {summaryMetrics.bookings.next ? (
                                    <span className="flex items-center gap-1.5 line-clamp-1">
                                        <Clock className="w-3.5 h-3.5" /> Next: {format(parseISO(summaryMetrics.bookings.next.date), 'p')}
                                    </span>
                                ) : 'No more upcoming'}
                            </div>
                            <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs text-blue-500 group-hover:underline font-medium">
                                Open Bookings Calendar <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </Card>
                    </Link>

                    {/* Jobs / Operations */}
                    <Link to="/service-checklist" className="group">
                        <Card className="p-5 bg-zinc-900/40 border-zinc-800 hover:border-orange-500/30 transition-all h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <ClipboardCheck className="w-5 h-5 text-orange-500" />
                                </div>
                                <Badge variant="outline" className="text-zinc-500 border-zinc-800 font-normal">Active</Badge>
                            </div>
                            <div className="space-y-1 mb-4">
                                <div className="text-2xl font-bold text-white">{summaryMetrics.jobs.inProgress}</div>
                                <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Jobs in Progress</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex flex-col">
                                    <span className="text-zinc-500 uppercase font-medium">Waiting</span>
                                    <span className="text-white font-semibold">{summaryMetrics.jobs.waiting}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-zinc-500 uppercase font-medium">Done</span>
                                    <span className="text-white font-semibold">{summaryMetrics.jobs.completed}</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs text-orange-500 group-hover:underline font-medium">
                                Open Job Operations <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </Card>
                    </Link>

                    {/* Employee Coverage */}
                    <Link to="/staff-schedule" className="group">
                        <Card className="p-5 bg-zinc-900/40 border-zinc-800 hover:border-purple-500/30 transition-all h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Users className="w-5 h-5 text-purple-500" />
                                </div>
                                <Badge variant="outline" className="text-zinc-500 border-zinc-800 font-normal">Coverage</Badge>
                            </div>
                            <div className="space-y-1 mb-4">
                                <div className="text-2xl font-bold text-white">{summaryMetrics.employees.scheduled}/{employees.length}</div>
                                <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Scheduled Today</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${summaryMetrics.employees.available > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                <span className="text-sm text-zinc-400">{summaryMetrics.employees.available} members available</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs text-purple-500 group-hover:underline font-medium">
                                Open Employee Scheduler <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </Card>
                    </Link>

                    {/* Financial Health */}
                    <Link to="/accounting" className="group">
                        <Card className="p-5 bg-zinc-900/40 border-zinc-800 hover:border-emerald-500/30 transition-all h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <DollarSign className="w-5 h-5 text-emerald-500" />
                                </div>
                                <Badge variant="outline" className="text-zinc-500 border-zinc-800 font-normal">Growth</Badge>
                            </div>
                            <div className="space-y-1 mb-4">
                                <div className="text-2xl font-bold text-white">${summaryMetrics.finance.balance.toLocaleString()}</div>
                                <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Outstanding Balances</div>
                            </div>
                            <div className="text-sm text-emerald-500/80 font-medium">
                                {summaryMetrics.finance.due} Invoices Due
                            </div>
                            <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs text-emerald-500 group-hover:underline font-medium">
                                Open Finance / Invoices <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </Card>
                    </Link>
                </div>
            </section>

            {/* Section 4: Plan & Review */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-white">Plan & Review</h2>
                            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 font-normal">Insights</Badge>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-zinc-900 border-zinc-800 text-xs h-8 gap-2 hover:bg-zinc-800"
                            onClick={() => setIsNotesSelectorOpen(true)}
                        >
                            <FileText className="w-3.5 h-3.5" /> Personal Notes
                        </Button>
                    </div>

                    {attachedNote && (
                        <Card className="p-4 bg-blue-500/5 border-blue-500/20 border-dashed relative group">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Star className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                                    <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Attached Note</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => setIsNoteViewerOpen(true)}>
                                        <Maximize2 className="w-3 h-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-400" onClick={handleDetachNote}>
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                            <h3 className="text-sm font-semibold text-zinc-200 mb-1">{attachedNote.title || 'Untitled Note'}</h3>
                            <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed">
                                {attachedNote.content || 'No content provided.'}
                            </p>
                            <div className="mt-3 flex items-center justify-between">
                                <span className="text-[10px] text-zinc-600">Last updated {format(parseISO(attachedNote.updated_at), 'MMM d, h:mm a')}</span>
                                <Button variant="link" size="sm" className="h-auto p-0 text-[11px] text-blue-400" onClick={() => setIsNoteViewerOpen(true)}>
                                    Edit Note
                                </Button>
                            </div>
                        </Card>
                    )}

                    <Card className="p-6 bg-zinc-900/40 border-zinc-800">
                        {timeScope === 'today' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-1 flex-shrink-0 bg-blue-500 rounded-full" />
                                    <div>
                                        <h4 className="text-white font-medium">Upcoming jobs timeline</h4>
                                        <p className="text-zinc-400 text-sm">You have {summaryMetrics.bookings.count} appointments remaining for today.</p>
                                    </div>
                                </div>
                                <div className="pl-5 border-l border-zinc-800 space-y-4">
                                    {scopedBookings.filter(b => b.status !== 'done' && b.status !== 'blocked').slice(0, 3).map((b, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <span className="text-xs font-mono text-zinc-500">{b.date ? format(parseISO(b.date), 'p') : 'N/A'}</span>
                                            <div className="h-2 w-2 rounded-full bg-blue-500/50" />
                                            <span className="text-sm text-zinc-300">{b.customer} — {b.vehicleYear} {b.vehicleMake} {b.vehicleModel}</span>
                                        </div>
                                    ))}
                                    {scopedBookings.filter(b => b.status !== 'done' && b.status !== 'blocked').length === 0 && (
                                        <p className="text-zinc-500 text-sm italic">No more appointments scheduled for today.</p>
                                    )}
                                </div>
                            </div>
                        )}
                        {timeScope === 'week' && (
                            <div className="space-y-4">
                                <h4 className="text-white font-medium">Workload distribution</h4>
                                <div className="h-24 flex items-end gap-2 px-2">
                                    {weeklyDistribution.map((count, i) => {
                                        const h = Math.min(100, (count / 5) * 100); // Scale 5 jobs as 100%
                                        return (
                                            <div key={i} className="flex-1 bg-blue-500/20 rounded-t-sm hover:bg-blue-500/40 transition-colors relative group" style={{ height: `${Math.max(10, h)}%` }}>
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-zinc-800 text-[10px] px-1 rounded text-white transition-opacity whitespace-nowrap">{count} jobs</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                                    <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
                                </div>
                            </div>
                        )}
                        {timeScope === 'month' && (
                            <div className="space-y-4">
                                <h4 className="text-white font-medium">Capacity trends</h4>
                                <div className="flex items-center gap-6">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-400">Monthly Target</span>
                                            <span className="text-white">${monthlyRevenueStats.revenue.toLocaleString()} / ${monthlyRevenueStats.target.toLocaleString()}</span>
                                        </div>
                                        <Progress value={monthlyRevenueStats.percent} className="h-2" />
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-bold text-emerald-500">{monthlyRevenueStats.percent}%</span>
                                        <p className="text-xs text-zinc-500">Revenue to Goal</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                    <Card className="divide-y divide-zinc-800 bg-zinc-900/40 border-zinc-800 overflow-hidden h-full">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((recent, i) => (
                                <div key={i} className="p-3 hover:bg-zinc-800/40 transition-colors flex items-center justify-between cursor-pointer group">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-zinc-500 font-medium">{recent.type}</span>
                                        <span className="text-sm text-zinc-200 group-hover:text-white transition-colors">{recent.name}</span>
                                        <span className="text-[11px] text-zinc-600">{recent.detail}</span>
                                    </div>
                                    <span className="text-[10px] text-zinc-600 tabular-nums">{recent.time}</span>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-zinc-600 italic text-sm">No recent activity detected.</div>
                        )}
                    </Card>
                </div>
            </section>

            {/* Section 5: Quick Actions */}
            <section className="space-y-4 mt-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
                    <Badge variant="outline" className="text-zinc-500 border-zinc-800 font-normal">Workflow</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                        { label: 'New Booking', icon: Plus, link: '/services', color: 'bg-blue-500' },
                        { label: 'Assign Staff', icon: UserPlus, link: '/bookings', color: 'bg-purple-500' },
                        { label: 'Start Job', icon: Play, link: '/service-checklist', color: 'bg-orange-500' },
                        { label: 'Upload Photos', icon: Camera, link: '/vehicle-gallery', color: 'bg-cyan-500' },
                        { label: 'Create Invoice', icon: FileText, link: '/invoicing', color: 'bg-emerald-500' },
                    ].map((action, i) => (
                        <Link key={i} to={action.link} className="flex flex-col items-center gap-3 p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl hover:bg-zinc-800/60 transition-all hover:border-zinc-700 text-white group">
                            <div className={`p-3 ${action.color}/10 rounded-xl group-hover:scale-110 transition-transform`}>
                                <action.icon className={`w-5 h-5 ${action.color.replace('bg-', 'text-')}`} />
                            </div>
                            <span className="text-sm font-medium text-center">{action.label}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Section 6: Favorites Accordion */}
            <section className="space-y-2 mt-8">
                <Accordion type="single" collapsible className="w-full border-none" defaultValue="favorites">
                    <AccordionItem value="favorites" className="border-none">
                        <div className="flex items-center justify-between gap-4 mb-2">
                            <AccordionTrigger className="hover:no-underline py-0 border-none group">
                                <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-yellow-500" />
                                    <h2 className="text-lg font-semibold text-white">Pinned / Favorites</h2>
                                </div>
                            </AccordionTrigger>
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsManaging(true);
                                }}
                                variant="ghost"
                                className="text-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white h-7 gap-1.5 px-3 rounded-full transition-all border border-emerald-500/20"
                            >
                                <Plus className="w-3 h-3" /> Manage Favorites
                            </Button>
                        </div>
                        <AccordionContent className="pt-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {pinnedShortcuts.length > 0 ? (
                                    pinnedShortcuts.map((pin) => {
                                        // Handle content-type shortcuts (from Learning Library)
                                        if (pin.type === 'content') {
                                            return (
                                                <div key={pin.id} onClick={() => pin.resource_url && window.open(pin.resource_url, '_blank')} className="cursor-pointer group">
                                                    <Card className="overflow-hidden bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-all h-full hover:bg-zinc-800/20">
                                                        {/* Thumbnail Section */}
                                                        {pin.thumbnail_url ? (
                                                            <div className="aspect-video w-full bg-zinc-950 overflow-hidden">
                                                                <img 
                                                                    src={pin.thumbnail_url} 
                                                                    alt={pin.label}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="aspect-video w-full bg-zinc-950 flex items-center justify-center">
                                                                <FileText className="w-8 h-8 text-zinc-700" />
                                                            </div>
                                                        )}
                                                        {/* Content Section */}
                                                        <div className="p-3">
                                                            <div className="text-sm font-semibold text-zinc-200 group-hover:text-white mb-1 line-clamp-2">{pin.label}</div>
                                                            <div className="text-[11px] text-zinc-500 line-clamp-1 italic">{pin.detail}</div>
                                                            {pin.content_type && (
                                                                <div className="mt-2">
                                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                                        {pin.content_type}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </Card>
                                                </div>
                                            );
                                        }
                                        
                                        // Handle regular link shortcuts
                                        return pin.type === 'link' ? (
                                            <Link key={pin.id} to={pin.target}>
                                                <Card className="p-4 bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer h-full group hover:bg-zinc-800/20">
                                                    <div className="text-sm font-semibold text-zinc-200 group-hover:text-white mb-1">{pin.label}</div>
                                                    <div className="text-[11px] text-zinc-500 line-clamp-1 italic">{pin.detail}</div>
                                                </Card>
                                            </Link>
                                        ) : (
                                            <Card key={pin.id} onClick={() => onQuickAction?.(`modal:${pin.target}`)} className="p-4 bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer h-full group hover:bg-zinc-800/20">
                                                <div className="text-sm font-semibold text-zinc-200 group-hover:text-white mb-1">{pin.label}</div>
                                                <div className="text-[11px] text-zinc-500 line-clamp-1 italic">{pin.detail}</div>
                                            </Card>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-full p-8 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center">
                                        <p className="text-zinc-600 text-sm">No shortcuts pinned yet. Click manage to add some!</p>
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </section>

            {/* Manage Favorites Modal */}
            <Dialog open={isManaging} onOpenChange={setIsManaging}>
                <DialogContent className="sm:max-w-[700px] bg-zinc-950 border-zinc-800 text-white max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-2xl font-bold">Manage Functional Favorites</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Select existing application modules or create a custom shortcut to pin to your dashboard.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        <section className="space-y-4">
                            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Available Modules</h3>
                            <ScrollArea className="h-[250px] pr-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {AVAILABLE_SHORTCUTS.map((s) => (
                                        <div key={s.id} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800 group">
                                            <Checkbox
                                                id={s.id}
                                                checked={pinnedIds.includes(s.id)}
                                                onCheckedChange={() => handleTogglePinned(s.id)}
                                                className="border-zinc-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                            <div className="flex flex-col leading-tight">
                                                <Label htmlFor={s.id} className="text-sm font-semibold group-hover:text-white transition-colors cursor-pointer">{s.label}</Label>
                                                <span className="text-[10px] text-zinc-500">{s.detail}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </section>

                        <section className="space-y-4 pt-4 border-t border-zinc-800">
                            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Add Custom Shortcut</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-end p-4 bg-zinc-900/40 rounded-xl border border-zinc-800">
                                <div className="space-y-2">
                                    <Label className="text-xs">Label</Label>
                                    <UIInput
                                        placeholder="e.g. My Custom Tool"
                                        className="bg-zinc-950 border-zinc-800 h-9 text-xs"
                                        value={customLabel}
                                        onChange={(e) => setCustomLabel(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 lg:col-span-1">
                                    <Label className="text-xs">Select Target (Searchable)</Label>
                                    <Select
                                        value={customTarget}
                                        onValueChange={(val) => {
                                            setCustomTarget(val);
                                            const item = AVAILABLE_SHORTCUTS.find(s => s.target === val);
                                            if (item) {
                                                setCustomType(item.type);
                                                if (!customLabel) setCustomLabel(item.label);
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-xs">
                                            <SelectValue placeholder="Pick a page or modal" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white max-h-[300px]">
                                            <SelectGroup>
                                                <SelectLabel className="text-zinc-500 text-[10px] uppercase">Pages & Links</SelectLabel>
                                                {AVAILABLE_SHORTCUTS.filter(s => s.type === 'link').map(s => (
                                                    <SelectItem key={s.id} value={s.target} className="text-xs">{s.label}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                            <SelectSeparator className="bg-zinc-800" />
                                            <SelectGroup>
                                                <SelectLabel className="text-zinc-500 text-[10px] uppercase">Interactive Modals</SelectLabel>
                                                {AVAILABLE_SHORTCUTS.filter(s => s.type === 'modal').map(s => (
                                                    <SelectItem key={s.id} value={s.target} className="text-xs">{s.label}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2">
                                    <div className="space-y-2 flex-1">
                                        <Label className="text-xs">Type</Label>
                                        <Select value={customType} onValueChange={(val) => setCustomType(val as 'link' | 'modal')}>
                                            <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                                                <SelectItem value="link" className="text-xs">Page Link</SelectItem>
                                                <SelectItem value="modal" className="text-xs">Modal</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={handleAddCustom} size="sm" className="h-9 self-end bg-blue-600 hover:bg-blue-700 font-bold">
                                        Add
                                    </Button>
                                </div>
                            </div>

                            {customShortcuts.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-500">Your Custom Shortcuts</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {customShortcuts.map((s) => (
                                            <div key={s.id} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full">
                                                <Checkbox
                                                    checked={pinnedIds.includes(s.id)}
                                                    onCheckedChange={() => handleTogglePinned(s.id)}
                                                    className="h-3 w-3 border-zinc-700"
                                                />
                                                <span className="text-[11px] font-medium">{s.label}</span>
                                                <button onClick={() => handleRemoveCustom(s.id)} className="text-zinc-500 hover:text-red-400">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>

                    <DialogFooter className="p-6 pt-4 border-t border-zinc-800 bg-zinc-950">
                        <Button onClick={() => setIsManaging(false)} className="bg-zinc-800 hover:bg-zinc-700 text-white w-full sm:w-auto">
                            Close & Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Notes Selector Modal */}
            <Dialog open={isNotesSelectorOpen} onOpenChange={setIsNotesSelectorOpen}>
                <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Personal Notes</DialogTitle>
                        <DialogDescription>Attach a note to your dashboard for quick reference.</DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                            <UIInput
                                placeholder="Search your notes..."
                                className="pl-9 bg-zinc-900 border-zinc-800 h-10"
                                value={notesStore.searchQuery}
                                onChange={(e) => notesStore.setSearch(e.target.value)}
                            />
                        </div>

                        <ScrollArea className="h-[300px] border border-zinc-800 rounded-lg p-2">
                            {notesStore.notes.length > 0 ? (
                                <div className="space-y-2">
                                    {notesStore.notes.filter(n =>
                                        n.title.toLowerCase().includes(notesStore.searchQuery.toLowerCase()) ||
                                        n.content.toLowerCase().includes(notesStore.searchQuery.toLowerCase())
                                    ).map(note => (
                                        <div
                                            key={note.id}
                                            className="p-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all group cursor-pointer"
                                            onClick={() => handleAttachNote(note.id)}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="text-sm font-medium text-zinc-200 truncate pr-4">{note.title || 'Untitled'}</h4>
                                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-blue-400 opacity-0 group-hover:opacity-100">
                                                    Attach
                                                </Button>
                                            </div>
                                            <p className="text-xs text-zinc-500 line-clamp-1 italic">
                                                {note.content ? note.content.substring(0, 60) + '...' : 'No content'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-600 italic text-sm">
                                    <FileText className="w-8 h-8 mb-2 opacity-20" />
                                    No notes found.
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Link to="/personal-notes" className="w-full sm:w-auto">
                            <Button variant="outline" className="w-full border-zinc-800 hover:bg-zinc-900">
                                Open Notes App
                            </Button>
                        </Link>
                        <Button variant="ghost" onClick={() => setIsNotesSelectorOpen(false)}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Note Viewer/Editor Modal */}
            <Dialog open={isNoteViewerOpen} onOpenChange={setIsNoteViewerOpen}>
                <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-white h-[80vh] flex flex-col">
                    <DialogHeader className="flex-row items-center justify-between space-y-0 pb-4 border-b border-zinc-800">
                        <div>
                            <DialogTitle>View Note</DialogTitle>
                            <DialogDescription>Quickly edit or view your attached note.</DialogDescription>
                        </div>
                        <Link to="/personal-notes">
                            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white flex items-center gap-2">
                                <ArrowRight className="w-4 h-4" /> Go to Notes App
                            </Button>
                        </Link>
                    </DialogHeader>

                    {attachedNote ? (
                        <div className="flex-1 flex flex-col overflow-hidden py-4 space-y-4">
                            <UIInput
                                className="bg-transparent border-none text-2xl font-bold p-0 focus-visible:ring-0 placeholder:text-zinc-700"
                                value={attachedNote.title}
                                onChange={(e) => notesStore.updateNote(attachedNote.id, { title: e.target.value })}
                            />
                            <Textarea
                                className="flex-1 bg-transparent border-none p-0 focus-visible:ring-0 resize-none text-zinc-300 leading-relaxed placeholder:text-zinc-700"
                                value={attachedNote.content}
                                onChange={(e) => notesStore.updateNote(attachedNote.id, { content: e.target.value })}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-zinc-600">
                            Note not found or deleted.
                        </div>
                    )}

                    <DialogFooter className="pt-4 border-t border-zinc-800">
                        <Button onClick={() => setIsNoteViewerOpen(false)} className="bg-blue-600 hover:bg-blue-700">
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
