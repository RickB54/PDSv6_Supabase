import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Booking, useBookingsStore } from "@/store/bookings";
import { format, parseISO, subMonths, isSameMonth, isWithinInterval, startOfDay, endOfDay, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { Calendar as CalendarIcon, Phone, Mail, Clock, Bell, ChevronDown, Repeat, Filter, Archive, Sparkles, Package, BarChart3, FileBarChart, FileText, FilePlus, AlertTriangle, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useTasksStore } from "@/store/tasks";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { addOns } from "@/lib/services";
import { cn } from "@/lib/utils";
import { getPriceChangeHistory, PriceChangeRecord } from "@/lib/servicesMeta";
import { LineChart, Line } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface BookingsAnalyticsProps {
    bookings: Booking[];
    customers: any[];
    invoices?: any[];
    estimates?: any[];
    defaultOpenAccordion?: string;
}

export function BookingsAnalytics({ bookings, customers, invoices = [], estimates = [], defaultOpenAccordion }: BookingsAnalyticsProps) {
    const navigate = useNavigate();
    const { add } = useTasksStore();
    const { update } = useBookingsStore();
    const user = getCurrentUser();
    const [reminderOpen, setReminderOpen] = useState(false);
    const [selectedCustomerForReminder, setSelectedCustomerForReminder] = useState<any>(null);
    const [reminderDate, setReminderDate] = useState("");
    const [reminderNote, setReminderNote] = useState("");
    const [reminderFrequency, setReminderFrequency] = useState<string>("3"); // Default 3 months
    const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

    // Operational Review State
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedBookingForReview, setSelectedBookingForReview] = useState<any>(null);
    const [priceHistory, setPriceHistory] = useState<PriceChangeRecord[]>([]);
    useEffect(() => {
        setPriceHistory(getPriceChangeHistory());
    }, []);

    const generatePriceHistoryPDF = () => {
        const doc = new jsPDF();
        const history = [...priceHistory].reverse(); // Oldest to newest
        
        if (history.length === 0) {
            toast.error("No price history data available to export.");
            return;
        }

        // Find all unique item keys across all snapshots
        const itemKeys = new Set<string>();
        history.forEach(h => {
            if (h.snapshot) {
                Object.keys(h.snapshot).forEach(k => itemKeys.add(k));
            }
        });

        const sortedKeys = Array.from(itemKeys).sort();
        const packageKeys = sortedKeys.filter(k => k.startsWith('package:'));
        const addonKeys = sortedKeys.filter(k => k.startsWith('addon:'));

        const getRowData = (keys: string[]) => {
            return keys.map(key => {
                const snapshots = history.filter(h => h.snapshot && h.snapshot[key]);
                if (snapshots.length === 0) return null;

                let label = key;
                if (key.startsWith('package:')) {
                    const parts = key.split(':');
                    const pkgName = parts[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    label = `${pkgName} (${parts[2].toUpperCase()})`;
                } else if (key.startsWith('addon:')) {
                    label = key.replace('addon:', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                }

                const evolution = snapshots.map(h => `$${h.snapshot![key]}`).join(' → ');
                const original = `$${snapshots[0].snapshot![key]}`;
                const current = `$${snapshots[snapshots.length - 1].snapshot![key]}`;

                return [label, original, current, evolution];
            }).filter(Boolean) as any[][];
        };

        // Header
        doc.setFillColor(16, 185, 129); // Emerald
        doc.rect(0, 0, 210, 40, 'F');
        doc.setFontSize(22);
        doc.setTextColor(255);
        doc.text("PRIME AUTO DETAIL", 14, 20);
        doc.setFontSize(14);
        doc.text("Historical Price Evolution Report", 14, 30);
        
        doc.setFontSize(10);
        doc.setTextColor(200);
        doc.text(`Generated: ${format(new Date(), "PPpp")}`, 14, 36);

        let currentY = 50;

        if (packageKeys.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(31, 41, 55);
            doc.text("SERVICE PACKAGES", 14, currentY);
            
            autoTable(doc, {
                startY: currentY + 5,
                head: [['Package Name', 'Initial', 'Current', 'Price Influx / Timeline']],
                body: getRowData(packageKeys),
                headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 50 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 20, fontStyle: 'bold' },
                    3: { cellWidth: 'auto' }
                },
                margin: { left: 14, right: 14 },
                theme: 'striped'
            });
            currentY = (doc as any).lastAutoTable.finalY + 20;
        }

        if (addonKeys.length > 0) {
            if (currentY > 250) { doc.addPage(); currentY = 20; }
            doc.setFontSize(14);
            doc.setTextColor(31, 41, 55);
            doc.text("ADD-ONS & UPGRADES", 14, currentY);

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Add-on Item', 'Initial', 'Current', 'Price Influx / Timeline']],
                body: getRowData(addonKeys),
                headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' }, // Blue
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 50 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 20, fontStyle: 'bold' },
                    3: { cellWidth: 'auto' }
                },
                margin: { left: 14, right: 14 },
                theme: 'striped'
            });
        }

        doc.save(`Prime_Price_Evolution_${format(new Date(), "yyyy-MM-dd")}.pdf`);
        toast.success("Price evolution report downloaded.");
    };

    const [bookingReviews, setBookingReviews] = useState<Record<string, any>>(() => {
        try {
            return JSON.parse(localStorage.getItem('prime_booking_reviews') || '{}');
        } catch { return {}; }
    });

    const [reviewForm, setReviewForm] = useState({
        performance: "",
        mistakes: "",
        sentiment: "satisfied", // loved, satisfied, disappointed
        googleReview: false,
        googleStars: 5
    });

    const saveReview = () => {
        if (!selectedBookingForReview) return;
        const updated = { ...bookingReviews, [selectedBookingForReview.id]: reviewForm };
        setBookingReviews(updated);
        localStorage.setItem('prime_booking_reviews', JSON.stringify(updated));
        setIsReviewModalOpen(false);
        toast.success("Operational review saved.");
    };

    const openReview = (booking: any) => {
        setSelectedBookingForReview(booking);
        const existing = bookingReviews[booking.id] || {
            performance: "",
            mistakes: "",
            sentiment: "satisfied",
            googleReview: false,
            googleStars: 5
        };
        setReviewForm(existing);
        setIsReviewModalOpen(true);
    };

    // --- Persistent Filter States ---
    
    // Performance Filter
    const [perfShowArchived, setPerfShowArchived] = useState(() => localStorage.getItem('analytics_perf_showArchived') === 'true');
    const [perfDateFilter, setPerfDateFilter] = useState<{ start: Date | undefined; end: Date | undefined }>(() => {
        try {
            const saved = localStorage.getItem('analytics_perf_dateFilter');
            if (saved) {
                const p = JSON.parse(saved);
                return { start: p.start ? new Date(p.start) : undefined, end: p.end ? new Date(p.end) : undefined };
            }
        } catch (e) {}
        return { start: undefined, end: undefined };
    });

    // Insights Filter
    const [insShowArchived, setInsShowArchived] = useState(() => localStorage.getItem('analytics_ins_showArchived') === 'true');
    const [insDateFilter, setInsDateFilter] = useState<{ start: Date | undefined; end: Date | undefined }>(() => {
        try {
            const saved = localStorage.getItem('analytics_ins_dateFilter');
            if (saved) {
                const p = JSON.parse(saved);
                return { start: p.start ? new Date(p.start) : undefined, end: p.end ? new Date(p.end) : undefined };
            }
        } catch (e) {}
        return { start: undefined, end: undefined };
    });

    // Quotes Filter
    const [quotesShowArchived, setQuotesShowArchived] = useState(() => localStorage.getItem('analytics_quotes_showArchived') === 'true');
    const [quotesDateFilter, setQuotesDateFilter] = useState<{ start: Date | undefined; end: Date | undefined }>(() => {
        try {
            const saved = localStorage.getItem('analytics_quotes_dateFilter');
            if (saved) {
                const p = JSON.parse(saved);
                return { start: p.start ? new Date(p.start) : undefined, end: p.end ? new Date(p.end) : undefined };
            }
        } catch (e) {}
        return { start: undefined, end: undefined };
    });

    // Persistence Effects
    useEffect(() => {
        localStorage.setItem('analytics_perf_showArchived', String(perfShowArchived));
        localStorage.setItem('analytics_perf_dateFilter', JSON.stringify(perfDateFilter));
    }, [perfShowArchived, perfDateFilter]);

    useEffect(() => {
        localStorage.setItem('analytics_ins_showArchived', String(insShowArchived));
        localStorage.setItem('analytics_ins_dateFilter', JSON.stringify(insDateFilter));
    }, [insShowArchived, insDateFilter]);

    useEffect(() => {
        localStorage.setItem('analytics_quotes_showArchived', String(quotesShowArchived));
        localStorage.setItem('analytics_quotes_dateFilter', JSON.stringify(quotesDateFilter));
    }, [quotesShowArchived, quotesDateFilter]);

    const handleArchiveToggle = (bookingId: string, currentStatus: boolean) => {
        update(bookingId, { isArchived: !currentStatus });
        toast.success(currentStatus ? "Booking restored" : "Booking archived");
    };

    // --- Helper to filter data ---
    const getFiltered = (data: any[], showArchived: boolean, dateFilter: { start: Date | undefined; end: Date | undefined }, dateKey: string = 'date') => {
        let result = data;
        if (!showArchived) {
            result = result.filter(b => !b.isArchived && !b.archived);
        }
        if (dateFilter.start && dateFilter.end) {
            result = result.filter(b => {
                const val = b[dateKey] || b.createdAt;
                if (!val) return true;
                const d = typeof val === 'string' ? parseISO(val) : val;
                return isWithinInterval(d, { start: startOfDay(dateFilter.start!), end: endOfDay(dateFilter.end!) });
            });
        } else if (dateFilter.start) {
            result = result.filter(b => {
                const val = b[dateKey] || b.createdAt;
                if (!val) return true;
                const d = typeof val === 'string' ? parseISO(val) : val;
                return isSameDay(d, dateFilter.start!);
            });
        }
        return result;
    };

    // Derived filtered data
    const filteredPerfBookings = useMemo(() => getFiltered(bookings, perfShowArchived, perfDateFilter), [bookings, perfShowArchived, perfDateFilter]);
    const filteredInsBookings = useMemo(() => getFiltered(bookings, insShowArchived, insDateFilter), [bookings, insShowArchived, insDateFilter]);
    const filteredQuotes = useMemo(() => getFiltered(estimates, quotesShowArchived, quotesDateFilter, 'createdAt'), [estimates, quotesShowArchived, quotesDateFilter]);

    // Stats based on Performance Filter (Primary view)
    const stats = useMemo(() => {
        const totalBookings = filteredPerfBookings.length;
        const completed = filteredPerfBookings.filter(b => b.status === "done" || b.status === "completed").length;
        const pending = filteredPerfBookings.filter(b => b.status === "pending" || b.status === "confirmed").length;
        return { totalBookings, completed, pending };
    }, [filteredPerfBookings]);

    // --- Charts Data ---
    const barData = useMemo(() => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = subMonths(new Date(), i);
            months.push(d);
        }
        return months.map(date => {
            const name = format(date, "MMM");
            const count = filteredPerfBookings.filter(b => isSameMonth(parseISO(b.date), date)).length;
            return { name, bookings: count };
        });
    }, [filteredPerfBookings]);

    const pieData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredPerfBookings.forEach(b => {
            const svc = b.title || "Unknown";
            counts[svc] = (counts[svc] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredPerfBookings]);

    const serviceDetailsData = useMemo(() => {
        return filteredPerfBookings.map(b => {
            const customer = customers.find(c => c.name === b.customer || c.id === b.customerId);
            const address = b.address || customer?.address || "N/A";
            const isShop = !address || address === "N/A" || address.toLowerCase().includes("shop") || address.toLowerCase().includes("prime auto detail");
            
            // Cross-reference revenue from invoices if booking price is 0
            let revenue = Number(b.price || 0);
            if (revenue === 0) {
                const bDate = b.date?.split('T')[0];
                const match = invoices.find(inv => {
                    const invDate = inv.date || inv.createdAt?.split('T')[0];
                    const isCustMatch = inv.customerId === b.customerId || inv.customerName === b.customer;
                    // Match by customer and date (some wiggle room for date sync)
                    return isCustMatch && (invDate === bDate || (inv.total > 0 && Math.abs(new Date(invDate).getTime() - new Date(bDate).getTime()) < 86400000));
                });
                if (match) revenue = match.total;
            }

            return {
                id: b.id,
                date: b.date,
                customer: b.customer,
                address: address,
                locationType: isShop ? "Shop" : "Onsite",
                service: b.title,
                status: (b.status || 'pending').toLowerCase(),
                revenue: revenue
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [filteredPerfBookings, customers, invoices]);

    const doneServices = useMemo(() => 
        serviceDetailsData.filter(s => s.status === 'done' || s.status === 'completed'),
    [serviceDetailsData]);

    const toDoServices = useMemo(() => 
        serviceDetailsData.filter(s => s.status !== 'done' && s.status !== 'completed'),
    [serviceDetailsData]);

    // --- Price Chart Data ---
    const priceChartData = useMemo(() => {
        const chronological = [...priceHistory].reverse();
        return chronological.map((record) => {
            const date = format(parseISO(record.date), "MMM d");
            let extPrice = 0, intPrice = 0, fullPrice = 0;
            if (record.snapshot && Object.keys(record.snapshot).length > 0) {
                extPrice = parseFloat(record.snapshot['package:prime-essential-exterior:compact'] || '0');
                intPrice = parseFloat(record.snapshot['package:prime-essential-interior:compact'] || '0');
                fullPrice = parseFloat(record.snapshot['package:prime-essential-full:compact'] || '0');
            }
            return {
                name: date,
                fullDate: format(parseISO(record.date), "MMM d, yyyy HH:mm"),
                "Exterior": extPrice || null,
                "Interior": intPrice || null,
                "Full Detail": fullPrice || null,
                type: record.type,
                description: record.description
            };
        });
    }, [priceHistory]);

    // --- Reminder Frequency Data ---
    const frequencyData = useMemo(() => {
        const counts: Record<string, number> = { '1 Month': 0, '3 Months': 0, '4 Months': 0, '6 Months': 0, 'Custom': 0 };
        filteredPerfBookings.filter(b => b.hasReminder).forEach(b => {
            if (b.reminderFrequency === 1) counts['1 Month']++;
            else if (b.reminderFrequency === 3) counts['3 Months']++;
            else if (b.reminderFrequency === 4) counts['4 Months']++;
            else if (b.reminderFrequency === 6) counts['6 Months']++;
            else counts['Custom']++;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
    }, [filteredPerfBookings]);

    const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

    const customerStats = useMemo(() => {
        const map = new Map<string, { id: string, name: string, email: string, phone: string, count: number, lastService: string, service: string, lastBookingId: string }>();

        filteredInsBookings.forEach(b => {
            if (!b.customer) return;
            const custMatch = customers.find(c => c.name === b.customer || c.id === b.customerId);
            const existing = map.get(b.customer) || {
                id: custMatch?.id || "",
                name: b.customer,
                email: custMatch?.email || "",
                phone: custMatch?.phone || "",
                count: 0,
                lastService: "",
                service: "",
                lastBookingId: ""
            };

            existing.count += 1;
            if (!existing.lastService || new Date(b.date) > new Date(existing.lastService)) {
                existing.lastService = b.date;
                existing.service = b.title;
                existing.lastBookingId = b.id;
            }
            
            // Add quotes to the customer stats
            const customerQuotes = (estimates || []).filter(est => 
                (est.customer_id === b.customerId) || 
                ((est.customer_name || est.customerName || '').toLowerCase().trim() === b.customer.toLowerCase().trim())
            );
            (existing as any).quotes = customerQuotes;

            map.set(b.customer, existing);
        });
        return Array.from(map.values()).sort((a, b) => new Date(b.lastService).getTime() - new Date(a.lastService).getTime());
    }, [filteredInsBookings, customers, estimates]);

    const addonsData = useMemo(() => {
        const details: { name: string, customer: string, date: string, revenue: number, id: string }[] = [];
        
        invoices.forEach(inv => {
            (inv.services || []).forEach((s: any, idx: number) => {
                const sName = (s.name || '').toLowerCase();
                const isAddon = s.isAddon || 
                                s.type === 'addon' || 
                                sName.includes('add-on') || 
                                addOns.some(a => a.name.toLowerCase() === sName);
                                
                if (isAddon) {
                    details.push({
                        id: `${inv.id}-${idx}`,
                        name: s.name,
                        customer: inv.customerName || "Unknown",
                        date: inv.date || inv.createdAt?.split('T')[0] || "",
                        revenue: Number(s.price || 0)
                    });
                }
            });
        });
        
        return details.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [invoices]);

    const handleCreateReminder = async () => {
        if (!selectedCustomerForReminder || !reminderDate) return;

        // 1. Create Task (Always create a new task for the new reminder date)
        await add({
            title: `Call ${selectedCustomerForReminder.name} - ${selectedCustomerForReminder.service} Follow-up`,
            description: `Follow up with customer regarding their ${selectedCustomerForReminder.service} on ${new Date(selectedCustomerForReminder.lastService).toLocaleDateString()}.\nNotes: ${reminderNote}`,
            dueDate: reminderDate,
            priority: 'medium',
            status: 'not_started',
            assignees: user ? [{ email: user.email, name: user.name }] : []
        });

        // 2. Update Booking with Reminder Status
        const bookingId = editingBookingId || selectedCustomerForReminder.lastBookingId;
        if (bookingId) {
            update(bookingId, {
                hasReminder: true,
                reminderFrequency: parseInt(reminderFrequency) || 0
            });
        }

        toast.success(editingBookingId ? "Reminder updated!" : "Reminder set & task created!");
        setReminderOpen(false);
        setReminderDate("");
        setReminderNote("");
        setReminderFrequency("3");
        setSelectedCustomerForReminder(null);
        setEditingBookingId(null);
    };

    const handleEditReminder = (booking: Booking) => {
        const cust = customers.find(c => c.name === booking.customer) || {
            name: booking.customer,
            lastService: booking.date,
            service: booking.title,
            email: '', phone: ''
        };

        setSelectedCustomerForReminder({ ...cust, lastBookingId: booking.id });
        setEditingBookingId(booking.id);

        // Populate form
        setReminderFrequency(booking.reminderFrequency?.toString() || "3");
        // Calculate date if standard frequency, otherwise generic future date
        if (booking.reminderFrequency) {
            const d = new Date(); d.setMonth(d.getMonth() + booking.reminderFrequency);
            setReminderDate(d.toISOString().split('T')[0]);
        } else {
            setReminderDate("");
        }
        setReminderNote(""); // Reset notes or fetch from somewhere if reserved
        setReminderOpen(true);
    };

    const dashboardReminders = useMemo(() => {
        const reminders: { id: string, type: string, customer: string, date: string, title: string, description: string, actionText: string, actionUrl: string, icon: any, color: string, booking?: any }[] = [];
        
        // 1. Manual Reminders
        filteredPerfBookings.filter(b => b.hasReminder).forEach(b => {
            reminders.push({
                id: `manual-${b.id}`,
                type: 'manual_reminder',
                customer: b.customer,
                date: b.date,
                title: 'Follow-up Task',
                description: `Reminder to follow up with ${b.customer} regarding their ${b.title}.`,
                actionText: 'Reschedule',
                actionUrl: '', // handled by custom button
                icon: <Bell className="w-4 h-4" />,
                color: 'amber',
                booking: b
            });
        });

        // 2. Upcoming Bookings this Week
        const dWeekStart = startOfWeek(new Date());
        const dWeekEnd = endOfWeek(new Date());
        toDoServices.forEach(b => {
            const d = parseISO(b.date);
            if (isWithinInterval(d, { start: dWeekStart, end: dWeekEnd }) && d >= startOfDay(new Date())) {
                reminders.push({
                    id: `upcoming-${b.id}`,
                    type: 'upcoming_booking',
                    customer: b.customer,
                    date: b.date,
                    title: 'Upcoming Booking',
                    description: `${b.service} scheduled for ${format(d, "EEEE, MMM d")}.`,
                    actionText: 'View Details',
                    actionUrl: `/bookings?customer=${encodeURIComponent(b.customer)}`,
                    icon: <CalendarIcon className="w-4 h-4" />,
                    color: 'blue'
                });
            }
        });

        // 3. Unpaid Invoices
        invoices.filter(inv => inv.status !== 'Paid' && inv.status !== 'Draft').forEach(inv => {
            reminders.push({
                id: `unpaid-${inv.id}`,
                type: 'unpaid_invoice',
                customer: inv.customerName || 'Customer',
                date: inv.createdAt || inv.date,
                title: 'Unpaid Invoice',
                description: `Invoice #${inv.id.slice(0,6).toUpperCase()} for $${(inv.total || 0).toFixed(2)} is pending.`,
                actionText: 'View Invoice',
                actionUrl: `/invoicing?customerId=${inv.customerId}`,
                icon: <FileText className="w-4 h-4" />,
                color: 'red'
            });
        });

        // 4. Missing Invoices for Completed Jobs
        doneServices.forEach(b => {
            const hasInvoice = invoices.some(inv => {
                const isCustMatch = inv.customerId === b.customerId || inv.customerName === b.customer;
                const invDate = inv.date || inv.createdAt?.split('T')[0];
                const bDate = b.date?.split('T')[0];
                return isCustMatch && (invDate === bDate || Math.abs(new Date(invDate).getTime() - new Date(bDate).getTime()) < 86400000);
            });
            if (!hasInvoice && b.revenue > 0) {
                reminders.push({
                    id: `unsent-${b.id}`,
                    type: 'unsent_invoice',
                    customer: b.customer,
                    date: b.date,
                    title: 'Invoice Needed',
                    description: `Job completed on ${format(parseISO(b.date), "MMM d")} but no invoice found.`,
                    actionText: 'Create Invoice',
                    actionUrl: `/invoicing?customerId=${b.customerId || ''}`, // Assuming the invoicing page handles missing customerId or we can search
                    icon: <FilePlus className="w-4 h-4" />,
                    color: 'emerald'
                });
            }
        });

        return reminders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [filteredPerfBookings, toDoServices, doneServices, invoices]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 w-full overflow-x-hidden">
            {/* KPI Cards - Mobile Optimized (Single Line) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <Card className="bg-zinc-900 border-zinc-800 p-2 sm:p-4 flex flex-col items-center justify-center text-center h-24">
                    <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</div>
                    <div className="text-xl sm:text-2xl font-bold">{stats.totalBookings}</div>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-2 sm:p-4 flex flex-col items-center justify-center text-center h-24">
                    <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Done</div>
                    <div className="text-xl sm:text-2xl font-bold text-green-500">{stats.completed}</div>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 p-2 sm:p-4 flex flex-col items-center justify-center text-center h-24">
                    <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Pending</div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-500">{stats.pending}</div>
                </Card>
            </div>



            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Booking Volume Chart */}
                <Card className="bg-zinc-900/50 border-zinc-800 w-full overflow-hidden backdrop-blur-sm shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-zinc-100 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-violet-400" />
                            Booking Volume
                        </CardTitle>
                        <CardDescription>Monthly bookings for the last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="bookings" fill="url(#violetGradient)" radius={[4, 4, 0, 0]} />
                                <defs>
                                    <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Service Distribution Pie Chart */}
                <Card className="bg-zinc-900/50 border-zinc-800 w-full overflow-hidden backdrop-blur-sm shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-zinc-100 flex items-center gap-2">
                            <Package className="w-4 h-4 text-emerald-400" />
                            Service Distribution
                        </CardTitle>
                        <CardDescription>Most popular service packages</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Active Reminders List */}
            <Card className="bg-zinc-950/20 border-zinc-800 shadow-sm">
                <Accordion type="single" collapsible defaultValue={defaultOpenAccordion} className="w-full">
                    <AccordionItem value="active-reminders" className="border-none">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-amber-500" />
                                <span className="font-bold text-zinc-100 uppercase tracking-widest text-xs">Active Reminders</span>
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 h-5">
                                    {dashboardReminders.length}
                                </Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-2">
                            <div className="space-y-3">
                                {dashboardReminders.length === 0 ? (
                                    <div className="text-center py-10 text-zinc-600 border border-dashed border-zinc-800 rounded-lg">
                                        No reminders set.
                                    </div>
                                ) : (
                                    dashboardReminders.map(rem => (
                                        <div key={rem.id} className={`flex items-center justify-between p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/50 group hover:border-${rem.color}-500/30 transition-all shadow-lg`}>
                                            <div className="flex items-start gap-4">
                                                <div className={`w-10 h-10 rounded-full bg-${rem.color}-500/10 flex items-center justify-center text-${rem.color}-500 font-bold border border-${rem.color}-500/20`}>
                                                    {rem.icon}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-zinc-100">{rem.customer}</h4>
                                                        <Badge variant="outline" className={`text-[9px] h-4 px-1.5 bg-${rem.color}-500/10 text-${rem.color}-400 border-${rem.color}-500/20 uppercase tracking-wider`}>
                                                            {rem.title}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[11px] text-zinc-400">
                                                            {rem.description}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {rem.type === 'manual_reminder' ? (
                                                    <>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 px-2 text-zinc-500 hover:text-white"
                                                            onClick={() => handleEditReminder(rem.booking)}
                                                        >
                                                            <Repeat className="w-4 h-4 mr-1" />
                                                            Reschedule
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 px-2 text-zinc-500 hover:text-red-400"
                                                            onClick={() => update(rem.booking.id, { hasReminder: false })}
                                                        >
                                                            Dismiss
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className={`h-8 px-4 bg-${rem.color}-500/10 text-${rem.color}-400 hover:bg-${rem.color}-500/20 hover:text-${rem.color}-300`}
                                                        onClick={() => navigate(rem.actionUrl)}
                                                    >
                                                        {rem.actionText}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </Card>

            {/* Service Performance Detail Log - COMPLETED ONLY */}
            <Card className="bg-zinc-900 border-zinc-800 w-full overflow-hidden shadow-2xl">
                <CardHeader className="border-b border-zinc-800 bg-zinc-950/30 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-400" />
                        <div>
                            <CardTitle>Service Performance Detail</CardTitle>
                            <CardDescription>History of all completed services</CardDescription>
                        </div>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50">
                                <Filter className="h-4 w-4" />
                                Filter
                                {(perfShowArchived || perfDateFilter.start) && (
                                    <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 ml-1 h-5 px-1.5">
                                        !
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-zinc-200">Show Archived</span>
                                    <Switch checked={perfShowArchived} onCheckedChange={setPerfShowArchived} className="border border-zinc-700 data-[state=checked]:bg-emerald-500" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Quick Filters</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                            onClick={() => setPerfDateFilter({ start: undefined, end: undefined })}
                                        >
                                            All Time
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                            onClick={() => setPerfDateFilter({ start: startOfDay(new Date()), end: endOfDay(new Date()) })}
                                        >
                                            Today
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                            onClick={() => {
                                                const d = new Date();
                                                setPerfDateFilter({ start: new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000), end: endOfDay(d) });
                                            }}
                                        >
                                            This Week
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                            onClick={() => {
                                                const d = new Date();
                                                setPerfDateFilter({ start: new Date(d.getFullYear(), d.getMonth(), 1), end: endOfDay(d) });
                                            }}
                                        >
                                            This Month
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Custom Range</Label>
                                    <div className="grid gap-2 text-zinc-200">
                                        <Calendar
                                            mode="range"
                                            selected={{ from: perfDateFilter.start, to: perfDateFilter.end }}
                                            onSelect={(range) => setPerfDateFilter({ start: range?.from, end: range?.to })}
                                            initialFocus
                                            className="rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200"
                                        />
                                    </div>
                                    {(perfDateFilter.start || perfDateFilter.end) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setPerfDateFilter({ start: undefined, end: undefined })}
                                            className="w-full text-zinc-400 hover:text-white mt-2"
                                        >
                                            Clear Range
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-zinc-950/50">
                                <TableRow className="hover:bg-transparent border-zinc-800">
                                    <TableHead className="w-[120px]">Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead className="hidden md:table-cell">Address</TableHead>
                                    <TableHead>Service Package</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {doneServices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-zinc-500 py-12 italic">
                                            No completed services recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    doneServices.map((svc) => (
                                        <TableRow key={svc.id} className="hover:bg-zinc-900/30 border-zinc-800 transition-colors">
                                            <TableCell className="text-zinc-400 text-xs font-mono">
                                                {format(parseISO(svc.date), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell className="font-semibold text-zinc-200">{svc.customer}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn(
                                                    "text-[10px] h-5 px-1.5 font-bold uppercase",
                                                    svc.locationType === 'Shop' 
                                                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                                                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                )}>
                                                    {svc.locationType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-xs text-zinc-500 max-w-[180px] truncate" title={svc.address}>
                                                {svc.address}
                                            </TableCell>
                                            <TableCell className="text-zinc-300 font-medium">{svc.service}</TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-emerald-400 font-bold font-mono">
                                                    ${(svc.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Services To Be Done - UPCOMING/IN PROGRESS */}
            <Card className="bg-zinc-900 border-zinc-800 w-full overflow-hidden shadow-xl">
                <CardHeader className="border-b border-zinc-800 bg-zinc-950/30">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-400" />
                        <div>
                            <CardTitle>Services To Be Done</CardTitle>
                            <CardDescription>Upcoming and in-progress appointments</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-zinc-950/50">
                                <TableRow className="hover:bg-transparent border-zinc-800">
                                    <TableHead className="w-[120px]">Scheduled</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Est. Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {toDoServices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-zinc-500 py-10 italic">
                                            No upcoming services scheduled.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    toDoServices.map((svc) => (
                                        <TableRow key={svc.id} className="hover:bg-zinc-900/30 border-zinc-800 transition-colors">
                                            <TableCell className="text-zinc-400 text-xs font-mono">
                                                {format(parseISO(svc.date), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell className="font-medium text-zinc-300">{svc.customer}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn(
                                                    "text-[10px] h-5 px-1.5 font-bold uppercase",
                                                    svc.locationType === 'Shop' 
                                                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                                                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                )}>
                                                    {svc.locationType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-zinc-400 text-sm">{svc.service}</TableCell>
                                            <TableCell>
                                                <Badge className="bg-zinc-800 text-zinc-400 border-none capitalize text-[10px]">
                                                    {svc.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-zinc-500 font-mono">
                                                ${(svc.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Add-on Performance Section */}
            <Card className="bg-zinc-900 border-zinc-800 w-full overflow-hidden">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-400" />
                        <div>
                            <CardTitle>Add-on Performance</CardTitle>
                            <CardDescription>Revenue tracking for specialized service add-ons</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-zinc-800 overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-zinc-950">
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Add-on Item</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {addonsData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-zinc-500 py-10 italic">
                                            No add-on revenue recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    addonsData.map((addon) => (
                                        <TableRow key={addon.id} className="hover:bg-zinc-950/50">
                                            <TableCell className="text-zinc-400 text-xs">
                                                {addon.date ? format(parseISO(addon.date), "MMM d, yyyy") : "N/A"}
                                            </TableCell>
                                            <TableCell className="font-medium text-zinc-300">{addon.customer}</TableCell>
                                            <TableCell className="text-emerald-400/80">{addon.name}</TableCell>
                                            <TableCell className="text-right text-emerald-400 font-mono">
                                                ${addon.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Customer Quotes Section */}
            <Card className="bg-zinc-900 border-zinc-800 w-full overflow-hidden shadow-xl border-t-2 border-t-blue-500/30">
                <CardHeader className="border-b border-zinc-800 bg-zinc-950/30 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileBarChart className="w-5 h-5 text-blue-400" />
                        <div>
                            <CardTitle>Customer Quotes</CardTitle>
                            <CardDescription>Quotes and estimates given to customers or prospects</CardDescription>
                        </div>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50">
                                <Filter className="h-4 w-4" />
                                Filter
                                {(quotesShowArchived || quotesDateFilter.start) && (
                                    <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 ml-1 h-5 px-1.5">
                                        !
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-zinc-200">Show Archived</span>
                                    <Switch checked={quotesShowArchived} onCheckedChange={setQuotesShowArchived} className="border border-zinc-700 data-[state=checked]:bg-blue-500" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Quick Filters</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                            onClick={() => setQuotesDateFilter({ start: undefined, end: undefined })}
                                        >
                                            All Time
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                            onClick={() => setQuotesDateFilter({ start: startOfDay(new Date()), end: endOfDay(new Date()) })}
                                        >
                                            Today
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                            onClick={() => {
                                                const d = new Date();
                                                setQuotesDateFilter({ start: new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000), end: endOfDay(d) });
                                            }}
                                        >
                                            This Week
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                            onClick={() => {
                                                const d = new Date();
                                                setQuotesDateFilter({ start: new Date(d.getFullYear(), d.getMonth(), 1), end: endOfDay(d) });
                                            }}
                                        >
                                            This Month
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Custom Range</Label>
                                    <div className="grid gap-2 text-zinc-200">
                                        <Calendar
                                            mode="range"
                                            selected={{ from: quotesDateFilter.start, to: quotesDateFilter.end }}
                                            onSelect={(range) => setQuotesDateFilter({ start: range?.from, end: range?.to })}
                                            initialFocus
                                            className="rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200"
                                        />
                                    </div>
                                    {(quotesDateFilter.start || quotesDateFilter.end) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setQuotesDateFilter({ start: undefined, end: undefined })}
                                            className="w-full text-zinc-400 hover:text-white mt-2"
                                        >
                                            Clear Range
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-zinc-950/50">
                                <TableRow className="hover:bg-transparent border-zinc-800">
                                    <TableHead>Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredQuotes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-zinc-500 py-12 italic">
                                            No quotes found for the selected period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredQuotes.map((q) => (
                                        <TableRow key={q.id} className="hover:bg-zinc-900/30 border-zinc-800 transition-colors">
                                            <TableCell className="text-zinc-400 text-xs font-mono">
                                                {q.createdAt ? format(parseISO(q.createdAt), "MMM d, yyyy") : "N/A"}
                                            </TableCell>
                                            <TableCell className="font-semibold text-zinc-200">{q.customerName || q.customer}</TableCell>
                                            <TableCell className="text-zinc-300">{Array.isArray(q.services) ? q.services.map((s:any)=>s.name).join(', ') : (q.service || 'N/A')}</TableCell>
                                            <TableCell className="text-emerald-400 font-mono font-bold">${(q.total || 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className={cn(
                                                    "text-[10px] h-5 px-1.5 font-bold uppercase",
                                                    q.status === 'Accepted' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                    q.status === 'Sent' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                    "bg-zinc-800 text-zinc-400 border-zinc-700"
                                                )}>
                                                    {q.status || 'Draft'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* CRM Customer List */}
            <Card className="bg-zinc-900 border-zinc-800 w-full overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Customer Insights & Follow-up</CardTitle>
                        <CardDescription>Track recent customers and set reminders for repeat business</CardDescription>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50">
                                <Filter className="h-4 w-4" />
                                Filter
                                {(insShowArchived || insDateFilter.start) && (
                                    <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 ml-1 h-5 px-1.5">
                                        !
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-zinc-200">Show Archived</span>
                                    <Switch checked={insShowArchived} onCheckedChange={setInsShowArchived} className="border border-zinc-700 data-[state=checked]:bg-primary" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Quick Filters</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                            onClick={() => setInsDateFilter({ start: undefined, end: undefined })}
                                        >
                                            All Time
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                            onClick={() => setInsDateFilter({ start: startOfDay(new Date()), end: endOfDay(new Date()) })}
                                        >
                                            Today
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                            onClick={() => {
                                                const d = new Date();
                                                setInsDateFilter({ start: new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000), end: endOfDay(d) });
                                            }}
                                        >
                                            This Week
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                            onClick={() => {
                                                const d = new Date();
                                                setInsDateFilter({ start: new Date(d.getFullYear(), d.getMonth(), 1), end: endOfDay(d) });
                                            }}
                                        >
                                            This Month
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Custom Range</Label>
                                    <div className="grid gap-2 text-zinc-200">
                                        <Calendar
                                            mode="range"
                                            selected={{ from: insDateFilter.start, to: insDateFilter.end }}
                                            onSelect={(range) => setInsDateFilter({ start: range?.from, end: range?.to })}
                                            initialFocus
                                            className="rounded-md border border-zinc-800 bg-zinc-900"
                                        />
                                    </div>
                                    {(insDateFilter.start || insDateFilter.end) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-xs text-muted-foreground hover:text-white"
                                            onClick={() => setInsDateFilter({ start: undefined, end: undefined })}
                                        >
                                            Clear Dates
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-zinc-800 overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-zinc-950">
                                <TableRow>
                                    <TableHead className="w-[150px]">Customer</TableHead>
                                    <TableHead className="min-w-[150px]">Contact</TableHead>
                                    <TableHead className="min-w-[100px]">Last Service</TableHead>
                                    <TableHead className="min-w-[120px]">Quotes Given</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customerStats.map((cust) => (
                                    <TableRow key={cust.name} className="hover:bg-zinc-900/50">
                                        <TableCell className="font-medium">{cust.name}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs text-muted-foreground gap-1">
                                                {cust.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {cust.email}</span>}
                                                {cust.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {cust.phone}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>{new Date(cust.lastService).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            {(cust as any).quotes && (cust as any).quotes.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {(cust as any).quotes.slice(0, 2).map((q: any, idx: number) => (
                                                        <Badge key={q.id || idx} variant="outline" className="text-[9px] h-4 bg-blue-500/5 text-blue-400 border-blue-500/20 truncate max-w-[120px]">
                                                            ${(q.total || 0).toFixed(0)} - {q.status || 'Draft'}
                                                        </Badge>
                                                    ))}
                                                    {(cust as any).quotes.length > 2 && (
                                                        <span className="text-[9px] text-zinc-500 ml-1">+{(cust as any).quotes.length - 2} more</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-zinc-600 italic">No quotes</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {bookings.find(b => b.id === cust.lastBookingId)?.hasReminder ? (
                                                <div className="flex justify-end">
                                                    <Badge variant="secondary" className="text-yellow-500 bg-yellow-500/10 border-yellow-500/20 gap-1">
                                                        <Bell className="w-3 h-3" /> Set
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                                    onClick={() => {
                                                        setSelectedCustomerForReminder(cust);
                                                        // Default 3 months
                                                        setReminderFrequency("3");
                                                        const d = new Date(); d.setMonth(d.getMonth() + 3);
                                                        setReminderDate(d.toISOString().split('T')[0]);
                                                        setReminderOpen(true);
                                                    }}
                                                >
                                                    <Bell className="w-4 h-4 mr-2" />
                                                    Remind
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {(() => {
                                                const lastBooking = bookings.find(b => b.id === cust.lastBookingId);
                                                if (!lastBooking) return null;
                                                return (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className={lastBooking.isArchived ? "text-yellow-500 hover:text-yellow-400" : "text-zinc-500 hover:text-zinc-300"}
                                                        onClick={() => handleArchiveToggle(cust.lastBookingId, !!lastBooking.isArchived)}
                                                        title={lastBooking.isArchived ? "Restore" : "Archive"}
                                                    >
                                                        <Archive className="h-4 w-4" />
                                                    </Button>
                                                );
                                            })()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>



            {/* Post-Service Performance Review Section - NEW AT BOTTOM */}
            <Card className="bg-zinc-900 border-zinc-800 w-full overflow-hidden shadow-xl border-t-2 border-t-violet-500/30 mt-8 relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="bg-zinc-950/20 relative">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/20 glow-violet">
                                <Repeat className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                                <CardTitle className="text-zinc-100 uppercase tracking-tighter">Operational Quality Review</CardTitle>
                                <CardDescription className="text-zinc-400">Log internal notes, mistakes, and customer sentiment for continuous improvement</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 relative">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-zinc-950/50">
                                <TableRow className="hover:bg-transparent border-zinc-800">
                                    <TableHead className="w-[120px]">Job Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Sentiment</TableHead>
                                    <TableHead>Google Star</TableHead>
                                    <TableHead className="text-right">Review Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {doneServices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-zinc-500 py-12 italic">
                                            No completed jobs available for review yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    doneServices.slice(0, 15).map((svc) => {
                                        const review = bookingReviews[svc.id];
                                        return (
                                            <TableRow key={svc.id} className="hover:bg-zinc-800/20 border-zinc-800 group/row">
                                                <TableCell className="text-zinc-500 text-xs font-mono">
                                                    {format(parseISO(svc.date), "MMM d, yyyy")}
                                                </TableCell>
                                                <TableCell className="font-bold text-zinc-200">{svc.customer}</TableCell>
                                                <TableCell>
                                                    {review ? (
                                                        <Badge variant="outline" className={cn(
                                                            "text-[10px] h-5 px-2 font-black tracking-tighter",
                                                            review.sentiment === 'loved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                            review.sentiment === 'satisfied' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                            "bg-red-500/10 text-red-400 border-red-500/20"
                                                        )}>
                                                            {review.sentiment.toUpperCase()}
                                                        </Badge>
                                                    ) : <span className="text-[10px] text-zinc-600 italic uppercase font-bold tracking-widest opacity-40">Pending Review</span>}
                                                </TableCell>
                                                <TableCell>
                                                    {review?.googleReview ? (
                                                        <div className="flex items-center gap-1 text-amber-500">
                                                            <Sparkles className="w-3 h-3 fill-current" />
                                                            <span className="text-xs font-bold font-mono">{review.googleStars}/5</span>
                                                        </div>
                                                    ) : <span className="text-xs text-zinc-700">—</span>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className={cn(
                                                            "text-[10px] h-7 px-3 font-bold transition-all",
                                                            review 
                                                                ? "text-zinc-500 hover:text-white" 
                                                                : "text-violet-400 hover:text-white bg-violet-500/5 hover:bg-violet-500/20 border border-violet-500/10"
                                                        )}
                                                        onClick={() => openReview(svc)}
                                                    >
                                                        {review ? 'Edit Report' : 'Log Feedback'}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Price Fluctuation History Section */}
            <Card className="bg-zinc-900 border-zinc-800 w-full overflow-hidden shadow-xl border-t-2 border-t-emerald-500/30 mt-8">
                <CardHeader className="bg-zinc-950/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <BarChart3 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <CardTitle className="text-zinc-100 uppercase tracking-tighter">Price Fluctuation History</CardTitle>
                            <CardDescription className="text-zinc-400">Track how your pricing strategy has evolved over time</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800"
                            onClick={() => window.print()}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all font-bold"
                            onClick={generatePriceHistoryPDF}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save PDF Report
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    {priceChartData.length < 2 ? (
                        <div className="text-center text-zinc-500 py-12 italic border border-dashed border-zinc-800 rounded-lg">
                            Not enough price change data to display a trend graph yet. Make a few price adjustments to see this populate.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Exterior Graph */}
                            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/80">
                                <h3 className="text-sm font-bold text-zinc-300 mb-4 text-center">Prime Essential Exterior</h3>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={priceChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                            <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickMargin={8} />
                                            <YAxis stroke="#52525b" fontSize={10} tickFormatter={(val) => `$${val}`} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                                                itemStyle={{ color: '#e4e4e7', fontSize: '12px' }}
                                                labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontSize: '10px' }}
                                                formatter={(value: number, name: string) => [`$${value}`, name]}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="Exterior" 
                                                stroke="#3b82f6" 
                                                strokeWidth={2} 
                                                dot={{ r: 3, fill: '#3b82f6', strokeWidth: 1 }} 
                                                activeDot={{ r: 5, fill: '#60a5fa' }}
                                                connectNulls
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Interior Graph */}
                            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/80">
                                <h3 className="text-sm font-bold text-zinc-300 mb-4 text-center">Prime Essential Interior</h3>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={priceChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                            <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickMargin={8} />
                                            <YAxis stroke="#52525b" fontSize={10} tickFormatter={(val) => `$${val}`} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                                                itemStyle={{ color: '#e4e4e7', fontSize: '12px' }}
                                                labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontSize: '10px' }}
                                                formatter={(value: number, name: string) => [`$${value}`, name]}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="Interior" 
                                                stroke="#f59e0b" 
                                                strokeWidth={2} 
                                                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 1 }} 
                                                activeDot={{ r: 5, fill: '#fbbf24' }}
                                                connectNulls
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Full Detail Graph */}
                            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/80">
                                <h3 className="text-sm font-bold text-zinc-300 mb-4 text-center">Prime Essential Full Detail</h3>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={priceChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                            <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickMargin={8} />
                                            <YAxis stroke="#52525b" fontSize={10} tickFormatter={(val) => `$${val}`} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                                                itemStyle={{ color: '#e4e4e7', fontSize: '12px' }}
                                                labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontSize: '10px' }}
                                                formatter={(value: number, name: string) => [`$${value}`, name]}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="Full Detail" 
                                                stroke="#10b981" 
                                                strokeWidth={2} 
                                                dot={{ r: 3, fill: '#10b981', strokeWidth: 1 }} 
                                                activeDot={{ r: 5, fill: '#34d399' }}
                                                connectNulls
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Reminder Dialog */}
            <Dialog open={reminderOpen} onOpenChange={(open) => { setReminderOpen(open); if (!open) setEditingBookingId(null); }}>
                <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-zinc-100">{editingBookingId ? 'Edit Follow-up Task' : 'Set Follow-up Reminder'}</DialogTitle>
                        <CardDescription className="text-zinc-400 mt-2">
                            This creates an <strong>internal follow-up task</strong> for you to contact the customer. 
                            Reminders are for your internal records and will not send automated messages to the client.
                        </CardDescription>
                    </DialogHeader>
                    
                    <div className="flex gap-2 mb-4">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 text-[10px] bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
                            onClick={() => {
                                const name = selectedCustomerForReminder?.name;
                                if (name) navigate(`/bookings?customer=${encodeURIComponent(name)}`);
                            }}
                        >
                            View Booking History
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 text-[10px] bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
                            onClick={() => {
                                const id = selectedCustomerForReminder?.id || customers.find(c => c.name === selectedCustomerForReminder?.name)?.id;
                                if (id) navigate(`/invoicing?customerId=${id}`);
                            }}
                        >
                            Customer Profile
                        </Button>
                    </div>

                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-zinc-300 font-medium">Customer</Label>
                            <Input value={selectedCustomerForReminder?.name || ''} disabled className="col-span-3 bg-zinc-900 border-zinc-800 text-zinc-100 opacity-80" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-zinc-300 font-medium">Frequency</Label>
                            <Select value={reminderFrequency} onValueChange={(val) => {
                                setReminderFrequency(val);
                                if (val !== 'custom') {
                                    const months = parseInt(val);
                                    if (!isNaN(months)) {
                                        const d = new Date(); d.setMonth(d.getMonth() + months);
                                        setReminderDate(d.toISOString().split('T')[0]);
                                    }
                                }
                            }}>
                                <SelectTrigger className="col-span-3 bg-zinc-900 border-zinc-800 text-zinc-100">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                    <SelectItem value="1">1 Month</SelectItem>
                                    <SelectItem value="3">3 Months (Standard)</SelectItem>
                                    <SelectItem value="4">4 Months</SelectItem>
                                    <SelectItem value="6">6 Months</SelectItem>
                                    <SelectItem value="custom">Custom Date</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-zinc-300 font-medium">Due Date</Label>
                            <Input
                                type="date"
                                value={reminderDate}
                                onChange={(e) => { setReminderDate(e.target.value); setReminderFrequency('custom'); }}
                                className="col-span-3 bg-zinc-900 border-zinc-800 text-zinc-100"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-zinc-300 font-medium">Notes</Label>
                            <Input
                                value={reminderNote}
                                onChange={(e) => setReminderNote(e.target.value)}
                                placeholder="e.g. Call to schedule maintenance wash"
                                className="col-span-3 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setReminderOpen(false)} className="text-zinc-400 hover:text-white">Cancel</Button>
                        <Button onClick={handleCreateReminder} className="bg-primary hover:bg-primary/90 text-white font-bold px-6">
                            {editingBookingId ? 'Update Task' : 'Set Follow-up Task'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Operational Review Modal */}
            <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-[550px] overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 via-emerald-500 to-violet-600" />
                    <DialogHeader className="pt-4">
                        <DialogTitle className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                            <Repeat className="w-5 h-5 text-violet-400" />
                            Post-Service Performance Review
                        </DialogTitle>
                        <CardDescription className="text-zinc-400">
                            Log internal notes and customer feedback for the job with <strong>{selectedBookingForReview?.customer}</strong>
                        </CardDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">How did you do? (Performance Notes)</Label>
                            <Textarea 
                                className="bg-zinc-900 border-zinc-800 text-zinc-100 h-24 placeholder:text-zinc-700 resize-none focus:border-violet-500/50 transition-colors"
                                placeholder="Write specific notes on how the job went, tools used, timing, etc..."
                                value={reviewForm.performance}
                                onChange={e => setReviewForm(prev => ({ ...prev, performance: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500 text-red-400/70">Mistakes or Areas for Improvement</Label>
                            <Textarea 
                                className="bg-zinc-900 border-zinc-800 text-zinc-100 h-20 placeholder:text-zinc-700 resize-none focus:border-red-500/30 transition-colors"
                                placeholder="Any missed spots? Time delays? Communication issues?"
                                value={reviewForm.mistakes}
                                onChange={e => setReviewForm(prev => ({ ...prev, mistakes: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Customer Sentiment</Label>
                                <Select value={reviewForm.sentiment} onValueChange={v => setReviewForm(prev => ({ ...prev, sentiment: v }))}>
                                    <SelectTrigger className={cn(
                                        "bg-zinc-900 border-zinc-800 text-zinc-100",
                                        reviewForm.sentiment === 'loved' && "border-emerald-500/30 text-emerald-400",
                                        reviewForm.sentiment === 'disappointed' && "border-red-500/30 text-red-400"
                                    )}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800">
                                        <SelectItem value="loved" className="text-emerald-400">Loved it! (Stellar)</SelectItem>
                                        <SelectItem value="satisfied" className="text-blue-400">Satisfied (Good)</SelectItem>
                                        <SelectItem value="disappointed" className="text-red-400">Disappointed (Poor)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Google Review?</Label>
                                <div className={cn(
                                    "flex items-center gap-4 h-10 rounded-md border px-3 transition-colors",
                                    reviewForm.googleReview ? "bg-amber-500/5 border-amber-500/30" : "bg-zinc-900 border-zinc-800"
                                )}>
                                    <Switch checked={reviewForm.googleReview} onCheckedChange={v => setReviewForm(prev => ({ ...prev, googleReview: v }))} />
                                    <span className={cn("text-xs font-bold", reviewForm.googleReview ? "text-amber-500" : "text-zinc-500")}>
                                        {reviewForm.googleReview ? 'Review Received' : 'No Review Yet'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {reviewForm.googleReview && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Google Star Rating</Label>
                                <div className="flex gap-4">
                                    {[1,2,3,4,5].map(star => (
                                        <Button 
                                            key={star}
                                            variant="ghost" 
                                            size="sm" 
                                            className={cn(
                                                "flex-1 h-10 rounded-lg border transition-all",
                                                reviewForm.googleStars >= star ? "bg-amber-500/10 border-amber-500/50 text-amber-500" : "bg-zinc-900 border-zinc-800 text-zinc-700 hover:bg-zinc-800"
                                            )}
                                            onClick={() => setReviewForm(prev => ({ ...prev, googleStars: star }))}
                                        >
                                            <Sparkles className={cn("w-4 h-4 mr-1", reviewForm.googleStars >= star ? "fill-current" : "")} />
                                            {star}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 mt-4 border-t border-zinc-800 pt-6">
                        <Button variant="ghost" onClick={() => setIsReviewModalOpen(false)} className="text-zinc-500 hover:text-white">Cancel</Button>
                        <Button onClick={saveReview} className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-8 shadow-lg shadow-violet-600/20 active:scale-95 transition-transform">
                            Save Operational Review
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
