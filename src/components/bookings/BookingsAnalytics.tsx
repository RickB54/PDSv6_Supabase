import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Booking, useBookingsStore } from "@/store/bookings";
import { format, parseISO, subMonths, isSameMonth, isWithinInterval, startOfDay, endOfDay, isSameDay, startOfWeek, endOfWeek, isToday, startOfMonth, endOfMonth } from "date-fns";
import { Calendar as CalendarIcon, Phone, Mail, Clock, Bell, ChevronDown, Repeat, Filter, Archive, Sparkles, Package, BarChart3, FileBarChart, FileText, FilePlus, AlertTriangle, Printer, Save, Send, RotateCcw, Edit, Trash2, BookOpen, ArrowUp, Gift, ClipboardCheck, Users, DollarSign, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useTasksStore } from "@/store/tasks";
import { useDemoMode } from "@/contexts/DemoContext";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { addOns, servicePackages } from "@/lib/services";
import { cn } from "@/lib/utils";
import { getPriceChangeHistory, PriceChangeRecord, getAllPackageMeta, getAllAddOnMeta, getCustomPackages, getCustomAddOns } from "@/lib/servicesMeta";
import { LineChart, Line } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import localforage from "localforage";

import { CustomerIntelligence360Modal } from "./CustomerIntelligence360Modal";

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
    const { update, remove } = useBookingsStore();
    const user = getCurrentUser();
    const [reminderOpen, setReminderOpen] = useState(false);
    const [selectedCustomerForReminder, setSelectedCustomerForReminder] = useState<any>(null);
    const [reminderDate, setReminderDate] = useState("");
    const [reminderNote, setReminderNote] = useState("");
    const [reminderFrequency, setReminderFrequency] = useState<string>("3"); // Default 3 months
    const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
    const [selectedChartJobs, setSelectedChartJobs] = useState<any[]>([]);
    const [isChartJobsModalOpen, setIsChartJobsModalOpen] = useState(false);
    const [chartJobsModalTitle, setChartJobsModalTitle] = useState("");

    // Operational Review State
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedBookingForReview, setSelectedBookingForReview] = useState<any>(null);
    const [priceHistory, setPriceHistory] = useState<PriceChangeRecord[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);

    useEffect(() => {
        setPriceHistory(getPriceChangeHistory());
        localforage.getItem<any[]>('company-employees').then(val => setEmployees(val || []));
    }, []);

    const handleDeleteCustomerBooking = async (bookingId: string) => {
        if (window.confirm("Are you sure you want to delete this booking record? This removes the interaction from the insights history.")) {
            try {
                await remove(bookingId);
                toast.success("Booking record deleted successfully");
            } catch (error) {
                toast.error("Failed to delete booking");
            }
        }
    };

    const { isDemoMode, isAdminPreview, setAdminPreview, canAccess, visibleSections } = useDemoMode();
    const [searchQuery, setSearchQuery] = useState("");
    const volumeChartRef = useRef<HTMLDivElement>(null);
    const serviceChartRef = useRef<HTMLDivElement>(null);

    const generateAnalyticsPDF = async () => {
        toast.info("Preparing your performance report with charts...");
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const dateStr = format(new Date(), "yyyy-MM-dd");

        // Helper to add chart images
        const addChartToPDF = async (ref: React.RefObject<HTMLDivElement>, y: number, title: string, widthPercent: number = 100, xPos: number = 15) => {
            if (!ref.current) return y;
            try {
                const canvas = await html2canvas(ref.current, {
                    backgroundColor: '#ffffff',
                    scale: 2,
                    logging: false,
                    useCORS: true,
                    onclone: (clonedDoc) => {
                        const elements = clonedDoc.querySelectorAll('*');
                        elements.forEach((el: any) => {
                            if (el.classList.contains('text-white') || el.classList.contains('text-zinc-100')) {
                                el.style.color = '#1e293b';
                            }
                        });
                    }
                });
                const imgData = canvas.toDataURL('image/png');
                const margin = xPos;
                const availableWidth = pageWidth - 30;
                const imgWidth = (availableWidth * widthPercent) / 100;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                doc.setFontSize(9);
                doc.setTextColor(148, 163, 184);
                doc.text(title.toUpperCase(), margin, y);
                doc.addImage(imgData, 'PNG', margin, y + 2, imgWidth, imgHeight, undefined, 'FAST');
                return y + imgHeight + 10;
            } catch (e) {
                console.error("Chart capture failed", e);
                return y + 5;
            }
        };

        // 1. Fetch Goals Data
        const goals = await localforage.getItem<any>('prime-business-goals') || {
            weeklyRevenue: 2500, monthlyRevenue: 10000,
            weeklyServices: 10, monthlyServices: 40,
            weeklyAddons: 5, monthlyAddons: 20
        };

        // 2. Calculate Goals Actuals
        const now = new Date();
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const weekBookings = bookings.filter(b => {
            const d = b.date ? parseISO(b.date) : null;
            return d && isWithinInterval(d, { start: weekStart, end: weekEnd }) && (b.status === 'done' || b.status === 'completed');
        });

        const monthBookings = bookings.filter(b => {
            const d = b.date ? parseISO(b.date) : null;
            return d && isWithinInterval(d, { start: monthStart, end: monthEnd }) && (b.status === 'done' || b.status === 'completed');
        });

        const actuals = {
            weekRevenue: weekBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0),
            monthRevenue: monthBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0),
            weekServices: weekBookings.length,
            monthServices: monthBookings.length,
            weekAddons: weekBookings.reduce((sum, b) => sum + (b.addons?.length || 0) + (b.title?.toLowerCase().includes('+') ? 1 : 0), 0),
            monthAddons: monthBookings.reduce((sum, b) => sum + (b.addons?.length || 0) + (b.title?.toLowerCase().includes('+') ? 1 : 0), 0)
        };

        // Clean Header (No gray backgrounds)
        doc.setFontSize(22);
        doc.setTextColor(24, 24, 27);
        doc.setFont("helvetica", "bold");
        doc.text("PRIME AUTO DETAIL", 15, 20);
        
        doc.setFontSize(11);
        doc.setTextColor(14, 165, 233); // Sky 500
        doc.text("BUSINESS PERFORMANCE & CRM REPORT", 15, 27);
        
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text(`Generated: ${format(new Date(), "PPPP p")}`, 15, 33);

        // Summary Statistics (Compact & Colorful)
        let yPos = 45;
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("TOTAL BOOKINGS", 15, yPos);
        doc.text("COMPLETED", 65, yPos);
        doc.text("PENDING", 115, yPos);
        doc.text("SUCCESS RATE", 165, yPos);

        yPos += 7;
        doc.setFontSize(16);
        doc.setTextColor(24, 24, 27);
        doc.text(stats.totalBookings.toString(), 15, yPos);
        doc.setTextColor(22, 163, 74); // Green
        doc.text(stats.completed.toString(), 65, yPos);
        doc.setTextColor(59, 130, 246); // Blue
        doc.text(stats.pending.toString(), 115, yPos);
        doc.setTextColor(139, 92, 246); // Violet
        doc.text(`${Math.round((stats.completed / (stats.totalBookings || 1)) * 100)}%`, 165, yPos);

        yPos += 15;

        // Goals & Performance Section
        doc.setFontSize(13);
        doc.setTextColor(24, 24, 27);
        doc.setFont("helvetica", "bold");
        doc.text("GOALS VS ACTUAL PERFORMANCE", 15, yPos);
        yPos += 5;

        const goalRows = [
            ["Weekly Revenue", `$${goals.weeklyRevenue}`, `$${actuals.weekRevenue}`, `${Math.round((actuals.weekRevenue / goals.weeklyRevenue) * 100)}%`],
            ["Monthly Revenue", `$${goals.monthlyRevenue}`, `$${actuals.monthRevenue}`, `${Math.round((actuals.monthRevenue / goals.monthlyRevenue) * 100)}%`],
            ["Weekly Services", goals.weeklyServices, actuals.weekServices, `${Math.round((actuals.weekServices / goals.weeklyServices) * 100)}%`],
            ["Monthly Services", goals.monthlyServices, actuals.monthServices, `${Math.round((actuals.monthServices / goals.monthlyServices) * 100)}%`],
            ["Weekly Add-ons", goals.weeklyAddons, actuals.weekAddons, `${Math.round((actuals.weekAddons / goals.weeklyAddons) * 100)}%`],
            ["Monthly Add-ons", goals.monthlyAddons, actuals.monthAddons, `${Math.round((actuals.monthAddons / goals.monthlyAddons) * 100)}%`]
        ];

        autoTable(doc, {
            startY: yPos,
            head: [['Metric', 'Target', 'Actual', 'Achievement']],
            body: goalRows,
            theme: 'grid',
            headStyles: { fillColor: [14, 165, 233], textColor: 255 }, // Sky 500
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'center', fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 3) {
                    const val = parseInt(data.cell.text[0]);
                    if (val >= 100) data.cell.styles.textColor = [22, 163, 74];
                    else if (val < 50) data.cell.styles.textColor = [220, 38, 38];
                }
            }
        });

        // Add Charts (Much Smaller & Side-by-Side)
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 12;
        
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        
        const chartYStart = yPos;
        await addChartToPDF(volumeChartRef, chartYStart, "VOLUME TRENDS", 45, 15);
        yPos = await addChartToPDF(serviceChartRef, chartYStart, "SERVICE SHARE", 45, pageWidth / 2 + 5);

        // Customer Insights
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFontSize(13);
        doc.setTextColor(24, 24, 27);
        doc.text("CUSTOMER ENGAGEMENT & LOYALTY", 15, yPos);
        yPos += 5;

        autoTable(doc, {
            startY: yPos,
            head: [['Customer', 'Total Jobs', 'Last Service', 'Primary Service']],
            body: customerStats.slice(0, 10).map(c => [
                c.name,
                c.count,
                format(parseISO(c.lastService), "MMM d, yyyy"),
                c.service
            ]),
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59] } // Slate 800
        });

        // Add-ons & Upsells
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 10;
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFontSize(13);
        doc.text("ADD-ON SERVICE PERFORMANCE", 15, yPos);
        yPos += 5;

        autoTable(doc, {
            startY: yPos,
            head: [['Add-on Service', 'Customer', 'Date', 'Revenue']],
            body: addonsData.slice(0, 10).map(a => [
                a.name,
                a.customer,
                format(parseISO(a.date), "MMM d"),
                `$${a.revenue.toFixed(2)}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [6, 182, 212] }, // Cyan 500
            columnStyles: { 3: { halign: 'right' } }
        });

        // Detailed Service Log
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 10;
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFontSize(13);
        doc.text("RECENT SERVICE RECORDS", 15, yPos);
        yPos += 5;

        autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Customer', 'Service', 'Revenue', 'Status']],
            body: serviceDetailsData.slice(0, 25).map(s => [
                format(parseISO(s.date), "MMM d"),
                s.customer,
                s.service,
                `$${s.revenue.toFixed(2)}`,
                s.status.toUpperCase()
            ]),
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105] },
            columnStyles: { 3: { halign: 'right' } }
        });

        // Quotes Analytics
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 10;
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFontSize(13);
        doc.text("QUOTES & ESTIMATES PERFORMANCE", 15, yPos);
        yPos += 5;

        autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Customer', 'Service', 'Total', 'Status']],
            body: filteredQuotes.slice(0, 10).map(q => [
                format(parseISO(q.createdAt), "MMM d"),
                q.customer_name || q.customerName,
                q.service_title || q.serviceTitle || 'General',
                `$${(q.total || 0).toFixed(2)}`,
                (q.status || 'pending').toUpperCase()
            ]),
            theme: 'grid',
            headStyles: { fillColor: [139, 92, 246] },
            columnStyles: { 3: { halign: 'right' } }
        });

        // Reminders
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 10;
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFontSize(13);
        doc.text("ACTIVE REMINDERS & FOLLOW-UPS", 15, yPos);
        yPos += 5;

        autoTable(doc, {
            startY: yPos,
            head: [['Customer', 'Type', 'Due Date', 'Notes']],
            body: dashboardReminders.slice(0, 10).map(r => [
                r.customer,
                r.title,
                format(parseISO(r.date), "MMM d"),
                r.description
            ]),
            theme: 'grid',
            headStyles: { fillColor: [245, 158, 11] }
        });

        // Comprehensive Price Evolution Audit Trail (Replacing Brief Summary)
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 15;
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.setTextColor(24, 24, 27);
        doc.setFont("helvetica", "bold");
        doc.text("OFFICIAL PRICE EVOLUTION AUDIT TRAIL", 15, yPos);
        yPos += 8;

        const pkgMeta = getAllPackageMeta();
        const addonMeta = getAllAddOnMeta();
        const allPkgs = [...servicePackages, ...getCustomPackages()].filter(p => (pkgMeta[p.id]?.visible) !== false && !pkgMeta[p.id]?.deleted);
        const allAddons = [...addOns, ...getCustomAddOns()].filter(a => (addonMeta[a.id]?.visible) !== false && !addonMeta[a.id]?.deleted);
        const vehicleTypes = ['compact', 'midsize', 'truck', 'luxury'];
        const fullHistory = [...priceHistory].reverse();

        const categories = [
            { id: 'exterior', title: "EXTERIOR SERVICES", color: [16, 185, 129] },
            { id: 'interior', title: "INTERIOR SERVICES", color: [59, 130, 246] },
            { id: 'full', title: "FULL DETAIL SERVICES", color: [139, 92, 246] }
        ];

        categories.forEach(cat => {
            const pkgs = allPkgs.filter(p => p.id.toLowerCase().includes(cat.id));
            if (pkgs.length === 0) return;

            if (yPos > 260) { doc.addPage(); yPos = 20; }
            
            doc.setFillColor(...(cat.color as [number, number, number]));
            doc.rect(14, yPos, 182, 7, 'F');
            doc.setFontSize(10);
            doc.setTextColor(255);
            doc.text(cat.title, 18, yPos + 5);
            yPos += 10;

            pkgs.forEach(pkg => {
                const body = vehicleTypes.map(v => {
                    const key = `package:${pkg.id}:${v}`;
                    const snapshots = fullHistory.filter(h => h.snapshot && h.snapshot[key]);
                    const changes: {price: string, date: string}[] = [];
                    snapshots.forEach(h => {
                        const price = `$${h.snapshot![key]}`;
                        if (changes.length === 0 || changes[changes.length - 1].price !== price) {
                            changes.push({ price, date: format(parseISO(h.date), "MMM d, h:mm a") });
                        }
                    });

                    const currentPrice = (pkg.pricing as any)[v];
                    const original = changes.length > 0 ? changes[0].price : `$${currentPrice}`;
                    const current = changes.length > 0 ? changes[changes.length - 1].price : `$${currentPrice}`;
                    let influxList = "-";
                    let timestampList = "Stable";
                    let newPriceList = "-";

                    if (changes.length > 1) {
                        const instances = [];
                        for (let i = 1; i < changes.length; i++) {
                            instances.push({ from: changes[i-1].price, to: changes[i].price, when: changes[i].date });
                        }
                        influxList = instances.map(inst => inst.from).join('\n');
                        timestampList = instances.map(inst => inst.when).join('\n');
                        newPriceList = instances.map(inst => inst.to).join('\n');
                    }

                    return [v.toUpperCase(), original, current, influxList, timestampList, newPriceList];
                });

                autoTable(doc, {
                    startY: yPos,
                    head: [[pkg.name, 'Initial', 'Current', 'Price Influx', 'Timestamp', 'New Price']],
                    body: body,
                    headStyles: { fillColor: [244, 244, 245], textColor: [31, 41, 55], fontStyle: 'bold', fontSize: 8 },
                    columnStyles: { 
                        0: { fontStyle: 'bold', cellWidth: 35 }, 1: { cellWidth: 15 }, 2: { cellWidth: 15, fontStyle: 'bold' },
                        3: { cellWidth: 20 }, 4: { cellWidth: 35 }, 5: { cellWidth: 20, fontStyle: 'bold' }
                    },
                    margin: { left: 14, right: 14 },
                    theme: 'grid',
                    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }
                });
                yPos = (doc as any).lastAutoTable.finalY + 10;
            });
        });

        if (allAddons.length > 0) {
            doc.addPage();
            yPos = 20;
            doc.setFillColor(245, 158, 11); // Amber
            doc.rect(14, yPos, 182, 7, 'F');
            doc.setFontSize(10);
            doc.setTextColor(255);
            doc.text("ADD-ONS & UPGRADES AUDIT", 18, yPos + 5);
            yPos += 10;

            const addonRows = allAddons.map(a => {
                const key = `addon:${a.id}:compact`;
                const snapshots = fullHistory.filter(h => h.snapshot && h.snapshot[key]);
                const changes: {price: string, date: string}[] = [];
                snapshots.forEach(h => {
                    const price = `$${h.snapshot![key]}`;
                    if (changes.length === 0 || changes[changes.length - 1].price !== price) {
                        changes.push({ price, date: format(parseISO(h.date), "MMM d, h:mm a") });
                    }
                });

                const currentPrice = a.basePrice || (a.pricing as any).compact;
                const original = changes.length > 0 ? changes[0].price : `$${currentPrice}`;
                const current = changes.length > 0 ? changes[changes.length - 1].price : `$${currentPrice}`;
                let influxList = "-";
                let timestampList = "Stable";
                let newPriceList = "-";

                if (changes.length > 1) {
                    const instances = [];
                    for (let i = 1; i < changes.length; i++) {
                        instances.push({ from: changes[i-1].price, to: changes[i].price, when: changes[i].date });
                    }
                    influxList = instances.map(inst => inst.from).join('\n');
                    timestampList = instances.map(inst => inst.when).join('\n');
                    newPriceList = instances.map(inst => inst.to).join('\n');
                }

                return [a.name, original, current, influxList, timestampList, newPriceList];
            });

            autoTable(doc, {
                startY: yPos,
                head: [['Add-on Item', 'Initial', 'Current', 'Price Influx', 'Timestamp', 'New Price']],
                body: addonRows,
                headStyles: { fillColor: [244, 244, 245], textColor: [31, 41, 55], fontStyle: 'bold', fontSize: 8 },
                columnStyles: { 
                    0: { fontStyle: 'bold', cellWidth: 35 }, 1: { cellWidth: 15 }, 2: { cellWidth: 15, fontStyle: 'bold' },
                    3: { cellWidth: 20 }, 4: { cellWidth: 35 }, 5: { cellWidth: 20, fontStyle: 'bold' }
                },
                margin: { left: 14, right: 14 },
                theme: 'striped',
                styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }
            });
        }

        doc.save(`Prime_Analytics_Full_Report_${dateStr}.pdf`);
        toast.success("Optimized comprehensive report generated.");
    };

    const generatePriceHistoryPDF = () => {
        const doc = new jsPDF();
        const history = [...priceHistory].reverse();
        
        if (history.length === 0) {
            toast.error("No price history data available to export.");
            return;
        }

        const pkgMeta = getAllPackageMeta();
        const addonMeta = getAllAddOnMeta();
        const allPkgs = [...servicePackages, ...getCustomPackages()].filter(p => (pkgMeta[p.id]?.visible) !== false && !pkgMeta[p.id]?.deleted);
        const allAddons = [...addOns, ...getCustomAddOns()].filter(a => (addonMeta[a.id]?.visible) !== false && !addonMeta[a.id]?.deleted);

        const vehicleTypes = ['compact', 'midsize', 'truck', 'luxury'];
        
        // Header
        doc.setFillColor(16, 185, 129); // Emerald
        doc.rect(0, 0, 210, 45, 'F');
        doc.setFontSize(24);
        doc.setTextColor(255);
        doc.text("PRIME AUTO DETAIL", 14, 22);
        doc.setFontSize(14);
        doc.text("Official Price Evolution Audit Trail", 14, 32);
        
        doc.setFontSize(10);
        doc.setTextColor(200);
        doc.text(`Report Generated: ${format(new Date(), "PPpp")}`, 14, 40);

        let currentY = 55;

        const categories = [
            { id: 'exterior', title: "EXTERIOR SERVICES", color: [16, 185, 129] },
            { id: 'interior', title: "INTERIOR SERVICES", color: [59, 130, 246] },
            { id: 'full', title: "FULL DETAIL SERVICES", color: [139, 92, 246] }
        ];

        categories.forEach(cat => {
            const pkgs = allPkgs.filter(p => p.id.toLowerCase().includes(cat.id));
            if (pkgs.length === 0) return;

            if (currentY > 260) { doc.addPage(); currentY = 20; }
            
            // Sub-header bar
            doc.setFillColor(...(cat.color as [number, number, number]));
            doc.rect(14, currentY, 182, 8, 'F');
            doc.setFontSize(11);
            doc.setTextColor(255);
            doc.setFont("helvetica", "bold");
            doc.text(cat.title, 18, currentY + 6);
            currentY += 12;

            pkgs.forEach(pkg => {
                const body = vehicleTypes.map(v => {
                    const key = `package:${pkg.id}:${v}`;
                    const snapshots = history.filter(h => h.snapshot && h.snapshot[key]);
                    const changes: {price: string, date: string}[] = [];
                    
                    snapshots.forEach(h => {
                        const price = `$${h.snapshot![key]}`;
                        if (changes.length === 0 || changes[changes.length - 1].price !== price) {
                            changes.push({ price, date: format(parseISO(h.date), "MMM d, h:mm a") });
                        }
                    });

                    const currentPrice = (pkg.pricing as any)[v];
                    const original = changes.length > 0 ? changes[0].price : `$${currentPrice}`;
                    const current = changes.length > 0 ? changes[changes.length - 1].price : `$${currentPrice}`;
                    
                    let influxList = "";
                    let timestampList = "";
                    let newPriceList = "";

                    if (changes.length <= 1) {
                        influxList = "-";
                        timestampList = "Stable (No changes)";
                        newPriceList = "-";
                    } else {
                        const instances = [];
                        for (let i = 1; i < changes.length; i++) {
                            instances.push({
                                from: changes[i-1].price,
                                to: changes[i].price,
                                when: changes[i].date
                            });
                        }
                        influxList = instances.map(inst => inst.from).join('\n');
                        timestampList = instances.map(inst => inst.when).join('\n');
                        newPriceList = instances.map(inst => inst.to).join('\n');
                    }

                    return [v.toUpperCase(), original, current, influxList, timestampList, newPriceList];
                });

                autoTable(doc, {
                    startY: currentY,
                    head: [[pkg.name, 'Initial', 'Current', 'Price Influx', 'Timestamp', 'New Price']],
                    body: body,
                    headStyles: { fillColor: [244, 244, 245], textColor: [31, 41, 55], fontStyle: 'bold', fontSize: 8 },
                    columnStyles: { 
                        0: { fontStyle: 'bold', cellWidth: 35 },
                        1: { cellWidth: 15 },
                        2: { cellWidth: 15, fontStyle: 'bold' },
                        3: { cellWidth: 20 },
                        4: { cellWidth: 35 },
                        5: { cellWidth: 20, fontStyle: 'bold' }
                    },
                    margin: { left: 14, right: 14 },
                    theme: 'grid',
                    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
            });
        });

        // Always start Add-ons on a new page as requested
        doc.addPage(); 
        currentY = 20;

        if (allAddons.length > 0) {
            doc.setFillColor(245, 158, 11); // Amber
            doc.rect(14, currentY, 182, 8, 'F');
            doc.setFontSize(11);
            doc.setTextColor(255);
            doc.setFont("helvetica", "bold");
            doc.text("ADD-ONS & UPGRADES", 18, currentY + 6);
            currentY += 12;

            const addonRows = allAddons.map(a => {
                const key = `addon:${a.id}:compact`;
                const snapshots = history.filter(h => h.snapshot && h.snapshot[key]);
                const changes: {price: string, date: string}[] = [];
                
                snapshots.forEach(h => {
                    const price = `$${h.snapshot![key]}`;
                    if (changes.length === 0 || changes[changes.length - 1].price !== price) {
                        changes.push({ price, date: format(parseISO(h.date), "MMM d, h:mm a") });
                    }
                });

                const currentPrice = a.basePrice || (a.pricing as any).compact;
                const original = changes.length > 0 ? changes[0].price : `$${currentPrice}`;
                const current = changes.length > 0 ? changes[changes.length - 1].price : `$${currentPrice}`;
                
                let influxList = "";
                let timestampList = "";
                let newPriceList = "";

                if (changes.length <= 1) {
                    influxList = "-";
                    timestampList = "Stable (No changes)";
                    newPriceList = "-";
                } else {
                    const instances = [];
                    for (let i = 1; i < changes.length; i++) {
                        instances.push({
                            from: changes[i-1].price,
                            to: changes[i].price,
                            when: changes[i].date
                        });
                    }
                    influxList = instances.map(inst => inst.from).join('\n');
                    timestampList = instances.map(inst => inst.when).join('\n');
                    newPriceList = instances.map(inst => inst.to).join('\n');
                }

                return [a.name, original, current, influxList, timestampList, newPriceList];
            });

            autoTable(doc, {
                startY: currentY,
                head: [['Add-on Item', 'Initial', 'Current', 'Price Influx', 'Timestamp', 'New Price']],
                body: addonRows,
                headStyles: { fillColor: [244, 244, 245], textColor: [31, 41, 55], fontStyle: 'bold', fontSize: 8 },
                columnStyles: { 
                    0: { fontStyle: 'bold', cellWidth: 35 }, 
                    1: { cellWidth: 15 }, 
                    2: { cellWidth: 15, fontStyle: 'bold' }, 
                    3: { cellWidth: 20 },
                    4: { cellWidth: 35 },
                    5: { cellWidth: 20, fontStyle: 'bold' }
                },
                margin: { left: 14, right: 14 },
                theme: 'striped',
                styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }
            });
        }

        doc.save(`Prime_Price_Audit_${format(new Date(), "yyyy-MM-dd")}.pdf`);
        toast.success("Price evolution audit trail generated.");
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
    const [isFilterOpen, setIsFilterOpen] = useState(false);
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

    // Invoices Filter
    const [invShowArchived, setInvShowArchived] = useState(() => localStorage.getItem('analytics_inv_showArchived') === 'true');
    const [invDateFilter, setInvDateFilter] = useState<{ start: Date | undefined; end: Date | undefined }>(() => {
        try {
            const saved = localStorage.getItem('analytics_inv_dateFilter');
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
        localStorage.setItem('analytics_inv_showArchived', String(invShowArchived));
        localStorage.setItem('analytics_inv_dateFilter', JSON.stringify(invDateFilter));
    }, [invShowArchived, invDateFilter]);

    useEffect(() => {
        localStorage.setItem('analytics_quotes_showArchived', String(quotesShowArchived));
        localStorage.setItem('analytics_quotes_dateFilter', JSON.stringify(quotesDateFilter));
    }, [quotesShowArchived, quotesDateFilter]);

    // Quality Review Filter
    const [qualShowArchived, setQualShowArchived] = useState(() => localStorage.getItem('analytics_qual_showArchived') === 'true');
    const [qualDateFilter, setQualDateFilter] = useState<{ start: Date | undefined; end: Date | undefined }>(() => {
        try {
            const saved = localStorage.getItem('analytics_qual_dateFilter');
            if (saved) {
                const p = JSON.parse(saved);
                return { start: p.start ? new Date(p.start) : undefined, end: p.end ? new Date(p.end) : undefined };
            }
        } catch (e) {}
        return { start: undefined, end: undefined };
    });

    useEffect(() => {
        localStorage.setItem('analytics_qual_showArchived', String(qualShowArchived));
        localStorage.setItem('analytics_qual_dateFilter', JSON.stringify(qualDateFilter));
    }, [qualShowArchived, qualDateFilter]);

    const [showTestData, setShowTestData] = useState(true);

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
        if (!showTestData) {
            result = result.filter(b => {
                const customerName = (b.customer || b.customerName || b.customer_name || '').toLowerCase().trim();
                const isTestUser = customerName.includes('rick berube') || customerName === 'demo' || customerName === 'test';
                const hasMockNote = (b.notes || '').includes('[MOCK_DATA]') || (b.notes || '').includes('Test booking');
                return !isTestUser && !hasMockNote;
            });
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
    const filteredQualBookings = useMemo(() => getFiltered(bookings, qualShowArchived, qualDateFilter), [bookings, qualShowArchived, qualDateFilter]);
    const filteredInvoices = useMemo(() => getFiltered(invoices, invShowArchived, invDateFilter, 'createdAt'), [invoices, invShowArchived, invDateFilter]);

    const invDeliveryPieData = useMemo(() => {
        let sent = 0;
        let notSent = 0;
        
        filteredInvoices.forEach((inv: any) => {
            if (inv.isSent) {
                sent++;
            } else {
                notSent++;
            }
        });

        const data = [
            { name: 'Sent', value: sent, color: '#6366f1' },
            { name: 'Not Sent', value: notSent, color: '#f59e0b' },
        ].filter(d => d.value > 0);
        return data.length > 0 ? data : [{ name: 'No Data', value: 1, color: '#3f3f46' }];
    }, [filteredInvoices]);

    const invOutcomePieData = useMemo(() => {
        let paid = 0;
        let partiallyPaid = 0;
        let unpaid = 0;
        
        filteredInvoices.forEach((inv: any) => {
            const status = inv.paymentStatus || 'unpaid';
            if (status === 'paid' || (inv.paidAmount && inv.total && inv.paidAmount >= inv.total)) {
                paid++;
            } else if (status === 'partially-paid' || (inv.paidAmount && inv.paidAmount > 0)) {
                partiallyPaid++;
            } else {
                unpaid++;
            }
        });

        const data = [
            { name: 'Paid', value: paid, color: '#10b981' },
            { name: 'Partially Paid', value: partiallyPaid, color: '#3b82f6' },
            { name: 'Unpaid', value: unpaid, color: '#ef4444' }
        ].filter(d => d.value > 0);
        return data.length > 0 ? data : [{ name: 'No Data', value: 1, color: '#3f3f46' }];
    }, [filteredInvoices]);

    const deliveryPieData = useMemo(() => {
        let sent = 0;
        let notReceived = 0;
        
        filteredQuotes.forEach((q: any) => {
            if (q.isSent || q.status === 'sent' || q.status === 'accepted' || q.status === 'declined' || q.status === 'denied') {
                sent++;
            } else {
                notReceived++;
            }
        });

        const data = [
            { name: 'Sent', value: sent, color: '#3b82f6' },
            { name: 'Not Received', value: notReceived, color: '#f59e0b' },
        ].filter(d => d.value > 0);
        return data.length > 0 ? data : [{ name: 'No Data', value: 1, color: '#3f3f46' }];
    }, [filteredQuotes]);

    const outcomePieData = useMemo(() => {
        let accepted = 0;
        let denied = 0;
        let noAnswer = 0;
        let pending = 0;
        
        filteredQuotes.forEach((q: any) => {
            const s = (q.status || '').toLowerCase();
            const isSent = q.isSent || s === 'sent' || s === 'accepted' || s === 'declined' || s === 'denied';

            if (s === 'accepted') accepted++;
            else if (s === 'denied' || s === 'declined') denied++;
            else if (isSent) noAnswer++;
            else pending++;
        });

        const data = [
            { name: 'Accepted', value: accepted, color: '#10b981' },
            { name: 'Declined', value: denied, color: '#ef4444' },
            { name: 'No Answer', value: noAnswer, color: '#8b5cf6' },
            { name: 'Pending', value: pending, color: '#a1a1aa' }
        ].filter(d => d.value > 0);
        return data.length > 0 ? data : [{ name: 'No Data', value: 1, color: '#3f3f46' }];
    }, [filteredQuotes]);

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

    const handleChartClick = (data: any, type: string) => {
        if (!data || (!data.name && !data.activePayload)) return;
        
        let title = data.name;
        // Recharts BarChart passes an event with activePayload when clicking a bar
        if (!title && data.activePayload && data.activePayload.length > 0) {
            title = data.activePayload[0].payload.name;
        }

        setChartJobsModalTitle(`Jobs: ${title} (${type})`);
        
        let jobs: any[] = [];
        if (type === 'Service') {
            jobs = filteredPerfBookings.filter(b => (b.title || "Unknown") === title);
        } else if (type === 'Location') {
            jobs = filteredPerfBookings.filter(b => {
                const customer = customers.find(c => c.name === b.customer || c.id === b.customerId);
                const address = b.address || customer?.address || "N/A";
                const pos = b.placeOfService || "";
                const isShop = pos.toLowerCase().includes("shop") || (!pos && (!address || address === "N/A" || address.toLowerCase().includes("shop") || address.toLowerCase().includes("prime auto detail")));
                return title === 'Onsite' ? isShop : !isShop;
            });
        } else if (type === 'Volume') {
            const thisYear = new Date().getFullYear();
            jobs = filteredPerfBookings.filter(b => {
                const d = parseISO(b.date);
                return format(d, "MMM") === title && d.getFullYear() === thisYear;
            });
        }
        
        setSelectedChartJobs(jobs);
        setIsChartJobsModalOpen(true);
    };

    const locationPieData = useMemo(() => {
        let mobile = 0;
        let onsite = 0;
        
        filteredPerfBookings.forEach(b => {
            const customer = customers.find(c => c.name === b.customer || c.id === b.customerId);
            const address = b.address || customer?.address || "N/A";
            const pos = b.placeOfService || "";
            const isShop = pos.toLowerCase().includes("shop") || (!pos && (!address || address === "N/A" || address.toLowerCase().includes("shop") || address.toLowerCase().includes("prime auto detail")));
            if (isShop) {
                onsite++;
            } else {
                mobile++;
            }
        });

        return [
            { name: "Mobile", value: mobile },
            { name: "Onsite", value: onsite }
        ].filter(d => d.value > 0);
    }, [filteredPerfBookings, customers]);

    const serviceDetailsData = useMemo(() => {
        return filteredPerfBookings.map(b => {
            const customer = customers.find(c => c.name === b.customer || c.id === b.customerId);
            const address = b.address || customer?.address || "N/A";
            const pos = b.placeOfService || "";
            const isShop = pos.toLowerCase().includes("shop") || (!pos && (!address || address === "N/A" || address.toLowerCase().includes("shop") || address.toLowerCase().includes("prime auto detail")));
            
            // Cross-reference revenue from invoices if booking price is 0
            let revenue = Number(b.price || 0);
            let value = Number(b.price || 0);
            
            if (true) {
                const bDate = b.date?.split('T')[0];
                const match = invoices.find(inv => {
                    const invDate = inv.serviceDate || inv.date || inv.createdAt?.split('T')[0];
                    const isCustMatch = inv.customerId === b.customerId || inv.customerName === b.customer;
                    // Match by customer and date (some wiggle room for date sync)
                    return isCustMatch && (invDate === bDate || (Math.abs(new Date(invDate).getTime() - new Date(bDate).getTime()) < 86400000 * 2));
                });
                if (match) {
                    revenue = match.total || 0;
                    value = match.services?.reduce((acc: number, s: any) => acc + (Number(s.price) || 0), 0) || revenue;
                }
            }

            return {
                id: b.id,
                date: b.date,
                customer: b.customer,
                address: address,
                locationType: isShop ? "Shop" : "Onsite",
                service: b.title,
                status: (b.status || 'pending').toLowerCase(),
                revenue: revenue,
                value: value > 0 ? value : revenue
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [filteredPerfBookings, customers, invoices]);

    const doneServices = useMemo(() => {
        const qualMap = filteredQualBookings.map(b => b.id);
        return serviceDetailsData.filter(s => (s.status === 'done' || s.status === 'completed') && qualMap.includes(s.id));
    }, [serviceDetailsData, filteredQualBookings]);

    const probonoJobs = useMemo(() => {
        // All done services with $0 revenue, cross-referencing invoice IDs for navigation
        return doneServices
            .filter(s => s.revenue === 0)
            .map(s => {
                // Find matching invoice for navigation
                const sDate = s.date?.split('T')[0];
                const matchedInv = invoices.find(inv => {
                    const invDate = (inv.serviceDate || inv.date || inv.createdAt || '').split('T')[0];
                    const isCustMatch = inv.customerId === s.id || inv.customerName === s.customer;
                    return isCustMatch && (invDate === sDate || Math.abs(new Date(invDate).getTime() - new Date(sDate).getTime()) < 86400000 * 2);
                });
                return { ...s, invoiceId: matchedInv?.id || null };
            });
    }, [doneServices, invoices]);

    const freeVsPaidPieData = useMemo(() => {
        const free = probonoJobs.length;
        const paid = doneServices.length - free;
        return [
            { name: 'Paid Jobs', value: paid, color: '#10b981' },
            { name: 'Probono Jobs', value: free, color: '#ec4899' }
        ].filter(d => d.value > 0);
    }, [doneServices, probonoJobs]);

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
                actionUrl: `/invoicing?editId=${inv.id}`,
                icon: <FileText className="w-4 h-4" />,
                color: 'red'
            });
        });

        // 4. Missing Invoices for Completed Jobs
        doneServices.forEach(b => {
            const hasInvoice = invoices.some(inv => {
                const isCustMatch = inv.customerId === (b as any).customerId || inv.customerName === b.customer;
                const invDate = inv.serviceDate || inv.date || inv.createdAt?.split('T')[0];
                const bDate = b.date?.split('T')[0];
                return isCustMatch && (invDate === bDate || Math.abs(new Date(invDate).getTime() - new Date(bDate).getTime()) < 86400000 * 2);
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
                    actionUrl: `/invoicing?customerId=${(b as any).customerId || ''}`, // Assuming the invoicing page handles missing customerId or we can search
                    icon: <FilePlus className="w-4 h-4" />,
                    color: 'emerald'
                });
            }
        });

        // 5. Generated Invoices Not Yet Sent
        invoices.filter(inv => !inv.isSent).forEach(inv => {
            reminders.push({
                id: `invoice-not-sent-${inv.id}`,
                type: 'unsent_invoice',
                customer: inv.customerName || 'Customer',
                date: inv.date || inv.createdAt || new Date().toISOString(),
                title: 'Unsent Invoice',
                description: `Invoice #${inv.invoiceNumber || inv.id.slice(0,6).toUpperCase()} has not been sent yet.`,
                actionText: 'View Invoice',
                actionUrl: `/invoicing?editId=${inv.id}`,
                icon: <Send className="w-4 h-4" />,
                color: 'indigo'
            });
        });

        return reminders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [filteredPerfBookings, toDoServices, doneServices, invoices]);

    const snapshotTitle = useMemo(() => {
        if (!perfDateFilter.start || !perfDateFilter.end) return "All-Time Operational Snapshot";
        if (isSameDay(perfDateFilter.start, startOfDay(new Date()))) return "Daily Operational Snapshot";
        if (isSameDay(perfDateFilter.start, startOfWeek(new Date()))) return "Weekly Operational Snapshot";
        if (isSameDay(perfDateFilter.start, startOfMonth(new Date()))) return "Monthly Operational Snapshot";
        return "Custom Operational Snapshot";
    }, [perfDateFilter]);

    const summaryMetrics = useMemo(() => {
        try {
            const now = new Date();
            const filterStart = perfDateFilter.start || new Date(2000, 0, 1);
            const filterEnd = perfDateFilter.end || new Date(2100, 11, 31);

            const scopeBookings = (bookings || []).filter(b => {
                if (!b) return false;
                if (b.customer === 'Generic Customer' || b.customer === 'TEST Customer') return false;
                try {
                    const d = b.date ? parseISO(b.date) : null;
                    return d && !isNaN(d.getTime()) && !isNaN(filterStart.getTime()) && !isNaN(filterEnd.getTime()) && isWithinInterval(d, { start: filterStart, end: filterEnd });
                } catch { return false; }
            });

            const upcoming = scopeBookings.filter(b => {
                if (!b.date) return false;
                const d = new Date(b.date);
                return !isNaN(d.getTime()) && d >= now;
            }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
            
            const jobsInProgress = scopeBookings.filter(b => b.status === 'in_progress').length;
            const jobsWaiting = scopeBookings.filter(b => (b.status === 'confirmed' || b.status === 'pending') && b.date && new Date(b.date) >= now).length;
            const assignedInScope = new Set(scopeBookings.filter(b => b.assignedEmployee).map(b => b.assignedEmployee)).size;

            const scopeInvoices = (invoices || []).filter(inv => {
                if (!inv) return false;
                if (inv.customerName === 'Generic Customer' || inv.customer_name === 'Generic Customer' || inv.customerName === 'TEST Customer' || inv.customer_name === 'TEST Customer') return false;
                try {
                    const d = inv.createdAt ? parseISO(inv.createdAt) : null;
                    return d && !isNaN(d.getTime()) && !isNaN(filterStart.getTime()) && !isNaN(filterEnd.getTime()) && isWithinInterval(d, { start: filterStart, end: filterEnd });
                } catch { return false; }
            });

            return {
                bookings: {
                    count: scopeBookings.length,
                    next: upcoming,
                    completed: scopeBookings.filter(b => b.status === 'done' || b.status === 'completed').length
                },
                jobs: {
                    inProgress: jobsInProgress,
                    waiting: jobsWaiting,
                    completed: scopeBookings.filter(b => b.status === 'done' || b.status === 'completed').length
                },
                employees: {
                    scheduled: assignedInScope,
                    available: employees.length - assignedInScope
                },
                finance: {
                    balance: invoices.filter(i => i.paymentStatus !== 'paid').reduce((a, b) => a + (Number(b.total) || 0), 0),
                    due: invoices.filter(i => i.paymentStatus !== 'paid').length,
                    collected: scopeInvoices.reduce((a, b) => a + (Number(b.paidAmount) || 0), 0)
                }
            };
        } catch (e) {
            return { bookings: { count: 0, next: null, completed: 0 }, jobs: { inProgress: 0, waiting: 0, completed: 0 }, employees: { scheduled: 0, available: 0 }, finance: { balance: 0, due: 0, collected: 0 } };
        }
    }, [bookings, invoices, employees, perfDateFilter]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 w-full overflow-x-hidden">
            {/* Global Actions Bar & Bookmarks */}
            <div className="flex flex-col gap-4 mb-2 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Business Intelligence</h3>
                        <p className="text-xs text-zinc-500">Comprehensive overview of operational performance and revenue goals.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <CustomerIntelligence360Modal customers={customers} />
                        <Button 
                            onClick={generateAnalyticsPDF}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-6 gap-2 shadow-lg shadow-blue-900/20 w-full sm:w-auto"
                        >
                            <Printer className="w-4 h-4" />
                            Print Performance Report
                        </Button>
                        <Button 
                            variant="outline"
                            onClick={generatePriceHistoryPDF}
                            className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white h-10 gap-2 w-full sm:w-auto"
                        >
                            <FileBarChart className="w-4 h-4" />
                            Price Audit
                        </Button>
                    </div>
                </div>
                
                {/* Bookmarks Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/50">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mr-2 flex items-center gap-1"><BookOpen className="w-3 h-3"/> Jump To:</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:text-white" onClick={() => document.getElementById('revenue-performance')?.scrollIntoView({ behavior: 'smooth' })}>Revenue & Pipeline</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:text-white" onClick={() => document.getElementById('service-detail')?.scrollIntoView({ behavior: 'smooth' })}>Service Logs</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:text-white" onClick={() => document.getElementById('invoices-tracker')?.scrollIntoView({ behavior: 'smooth' })}>Invoices</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:text-white" onClick={() => document.getElementById('estimates-tracker')?.scrollIntoView({ behavior: 'smooth' })}>Estimates & Quotes</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:text-white" onClick={() => document.getElementById('probono-tracker')?.scrollIntoView({ behavior: 'smooth' })}>Probono Jobs</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:text-white" onClick={() => document.getElementById('customer-insights')?.scrollIntoView({ behavior: 'smooth' })}>Customer Insights</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:text-white" onClick={() => document.getElementById('operational-quality')?.scrollIntoView({ behavior: 'smooth' })}>Quality Review</Button>
                </div>
            </div>

            {/* Scroll To Top Button */}
            <Button
                variant="default"
                size="icon"
                className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-2xl bg-zinc-100 text-zinc-900 hover:bg-white hover:scale-110 transition-all border border-zinc-300"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                title="Back to Top"
            >
                <ArrowUp className="h-6 w-6" />
            </Button>

            {/* Dynamic Operational Snapshot */}
            <section className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-white">{snapshotTitle}</h2>
                    <Button variant="outline" size="sm" className={cn("gap-2 border-zinc-700 font-bold h-8 text-[11px] hover:bg-zinc-800 transition-all shadow-xl", (perfDateFilter.start || perfDateFilter.end) && "bg-red-600 text-white border-red-600 hover:bg-red-700")} onClick={() => {
                        document.getElementById('revenue-performance')?.scrollIntoView({ behavior: 'smooth' });
                        setTimeout(() => setIsFilterOpen(true), 300);
                    }}>
                        <Filter className="h-3.5 w-3.5" />
                        Filter Data
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Bookings */}
                    <div className="group cursor-pointer" onClick={() => document.getElementById('revenue-performance')?.scrollIntoView({ behavior: 'smooth' })}>
                        <Card className="p-5 bg-zinc-900/40 border-zinc-800 hover:border-blue-500/30 transition-all h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <CalendarIcon className="w-5 h-5 text-blue-500" />
                                </div>
                                <Badge variant="outline" className="text-zinc-500 border-zinc-800 font-normal">Details</Badge>
                            </div>
                            <div className="space-y-1 mb-4">
                                <div className="text-2xl font-bold text-white">{summaryMetrics.bookings.count}</div>
                                <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Bookings in Period</div>
                            </div>
                            <div className="text-sm text-zinc-400">
                                {summaryMetrics.bookings.next ? (
                                    <span className="flex items-center gap-1.5 line-clamp-1">
                                        <Clock className="w-3.5 h-3.5" /> Next: {(() => {
                                            try {
                                                const d = parseISO(summaryMetrics.bookings.next.date);
                                                return isNaN(d.getTime()) ? 'Invalid date' : format(d, 'p');
                                            } catch { return 'Invalid date'; }
                                        })()}
                                    </span>
                                ) : 'No more upcoming'}
                            </div>
                            <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs text-blue-500 group-hover:underline font-medium">
                                Open Bookings Calendar <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </Card>
                    </div>

                    {/* Jobs / Operations */}
                    <div className="group cursor-pointer" onClick={() => document.getElementById('service-detail')?.scrollIntoView({ behavior: 'smooth' })}>
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
                    </div>

                    {/* Employee Coverage */}
                    <div className="group cursor-pointer">
                        <Card className="p-5 bg-zinc-900/40 border-zinc-800 hover:border-purple-500/30 transition-all h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Users className="w-5 h-5 text-purple-500" />
                                </div>
                                <Badge variant="outline" className="text-zinc-500 border-zinc-800 font-normal">Coverage</Badge>
                            </div>
                            <div className="space-y-1 mb-4">
                                <div className="text-2xl font-bold text-white">{summaryMetrics.employees.scheduled}/{employees.length}</div>
                                <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Scheduled in Period</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${(summaryMetrics?.employees?.available || 0) > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                <span className="text-sm text-zinc-400">{(summaryMetrics?.employees?.available || 0)} members available</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs text-purple-500 group-hover:underline font-medium">
                                Open Employee Scheduler <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </Card>
                    </div>

                    {/* Financial Health */}
                    <div className="group cursor-pointer" onClick={() => document.getElementById('invoices-tracker')?.scrollIntoView({ behavior: 'smooth' })}>
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
                                {(summaryMetrics?.finance?.due || 0)} Invoices Due
                            </div>
                            <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs text-emerald-500 group-hover:underline font-medium">
                                Open Finance / Invoices <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </Card>
                    </div>
                </div>
            </section>



            {/* Global Charts Filter */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Performance Graphs</h3>
                <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("gap-2 border-zinc-700 font-bold h-8 text-[11px] hover:bg-zinc-800 transition-all shadow-xl", (perfDateFilter.start || perfDateFilter.end) && "bg-red-600 text-white border-red-600 hover:bg-red-700")}>
                            <Filter className="h-3.5 w-3.5" />
                            Filter Graphs
                            {(!perfShowArchived) && (
                                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 ml-1 h-4 px-1 border-none text-[8px]">
                                    Active Only
                                </Badge>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-0 overflow-hidden shadow-2xl" align="end">
                        <div className="p-4 bg-red-600 flex items-center justify-between shadow-lg">
                            <span className="text-xs font-black uppercase tracking-widest text-white antialiased">Filter Graphs</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20 rounded-full" onClick={() => setIsFilterOpen(false)}>
                                <span className="sr-only">Close</span>
                                ✕
                            </Button>
                        </div>

                        <div className="p-4 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white">Show Archived</span>
                                </div>
                                <Switch checked={perfShowArchived} onCheckedChange={setPerfShowArchived} className="border border-zinc-700 data-[state=checked]:bg-emerald-500" />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white">Show Test Data</span>
                                    <span className="text-[10px] text-zinc-500">Include 'Rick Berube' demo accounts</span>
                                </div>
                                <Switch checked={showTestData} onCheckedChange={setShowTestData} className="border border-zinc-700 data-[state=checked]:bg-amber-500" />
                            </div>

                            <div className="space-y-3">
                                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Quick Filters</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn("h-8 text-[11px] font-bold border border-zinc-800 hover:bg-zinc-800", (!perfDateFilter.start && !perfDateFilter.end) && "bg-red-600 text-white border-red-600 hover:bg-red-700")}
                                        onClick={() => setPerfDateFilter({ start: undefined, end: undefined })}
                                    >
                                        ALL TIME
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn("h-8 text-[11px] font-bold border border-zinc-800 hover:bg-zinc-800", (perfDateFilter.start && isToday(perfDateFilter.start) && !perfDateFilter.end) && "bg-red-600 text-white border-red-600 hover:bg-red-700")}
                                        onClick={() => setPerfDateFilter({ start: startOfDay(new Date()), end: endOfDay(new Date()) })}
                                    >
                                        TODAY
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn("h-8 text-[11px] font-bold border border-zinc-800 hover:bg-zinc-800", (perfDateFilter.start && perfDateFilter.end && isSameDay(perfDateFilter.start, startOfWeek(new Date()))) && "bg-red-600 text-white border-red-600 hover:bg-red-700")}
                                        onClick={() => setPerfDateFilter({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) })}
                                    >
                                        THIS WEEK
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn("h-8 text-[11px] font-bold border border-zinc-800 hover:bg-zinc-800", (perfDateFilter.start && isSameMonth(perfDateFilter.start, new Date()) && perfDateFilter.end && isSameDay(perfDateFilter.start, startOfMonth(new Date()))) && "bg-red-600 text-white border-red-600 hover:bg-red-700")}
                                        onClick={() => setPerfDateFilter({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })}
                                    >
                                        THIS MONTH
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2 border-t border-zinc-800/50">
                                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Custom Range</span>
                                <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/40">
                                    <Calendar
                                        mode="range"
                                        selected={{ from: perfDateFilter.start, to: perfDateFilter.end }}
                                        onSelect={(range) => setPerfDateFilter({ start: range?.from, end: range?.to })}
                                        initialFocus
                                        className="bg-transparent text-white"
                                    />
                                </div>
                                {(perfDateFilter.start || perfDateFilter.end) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-[10px] font-black uppercase text-zinc-500 hover:text-red-500 transition-colors"
                                        onClick={() => setPerfDateFilter({ start: undefined, end: undefined })}
                                    >
                                        <RotateCcw className="h-3 w-3 mr-2" />
                                        Clear Date Filter
                                    </Button>
                                )}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Charts Row */}
            <div id="revenue-performance" className="grid grid-cols-1 xl:grid-cols-3 gap-6 scroll-mt-24">
                {/* Booking Volume Chart */}
                <Card ref={volumeChartRef} className="bg-zinc-900/50 border-zinc-800 w-full overflow-hidden backdrop-blur-sm shadow-xl">
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
                                <Bar dataKey="bookings" fill="url(#violetGradient)" radius={[4, 4, 0, 0]} onClick={(data) => handleChartClick(data, 'Volume')} cursor="pointer" />
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

                {/* Service & Location Distribution */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Service Distribution Pie Chart */}
                    <Card ref={serviceChartRef} className="bg-zinc-900/50 border-zinc-800 w-full overflow-hidden backdrop-blur-sm shadow-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-zinc-100 flex items-center gap-2 text-sm">
                                <Package className="w-4 h-4 text-emerald-400" />
                                Service Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[260px] pb-4 px-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={65}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                        onClick={(data) => handleChartClick(data, 'Service')}
                                        cursor="pointer"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Location Distribution Pie Chart */}
                    <Card className="bg-zinc-900/50 border-zinc-800 w-full overflow-hidden backdrop-blur-sm shadow-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-zinc-100 flex items-center gap-2 text-sm">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                Location Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[260px] pb-4 px-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={locationPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={65}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                        onClick={(data) => handleChartClick(data, 'Location')}
                                        cursor="pointer"
                                    >
                                        {locationPieData.map((entry, index) => (
                                            <Cell key={`cell-loc-${index}`} fill={['#3b82f6', '#10b981'][index % 2]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
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
            <Card id="service-detail" className="bg-zinc-900 border-zinc-800 w-full overflow-hidden shadow-2xl scroll-mt-24">
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

            {/* Invoices Tracker */}
            <Card id="invoices-tracker" className="bg-zinc-900 border-zinc-800 w-full overflow-hidden shadow-xl border-t-2 border-t-indigo-500/30 mt-6 scroll-mt-24">
                <CardHeader className="border-b border-zinc-800 bg-zinc-950/30 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-indigo-400" />
                        <div>
                            <CardTitle>Invoices</CardTitle>
                            <CardDescription>Track invoice statuses (Not Sent, Sent, Unpaid, Paid)</CardDescription>
                        </div>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50">
                                <Filter className="h-4 w-4" />
                                Filter
                                {(invShowArchived || invDateFilter.start) && (
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
                                    <Switch checked={invShowArchived} onCheckedChange={setInvShowArchived} className="border border-zinc-700 data-[state=checked]:bg-emerald-500" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Quick Filters</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                            onClick={() => setInvDateFilter({ start: undefined, end: undefined })}
                                        >
                                            All Time
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                            onClick={() => setInvDateFilter({ start: startOfDay(new Date()), end: endOfDay(new Date()) })}
                                        >
                                            Today
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                            onClick={() => {
                                                const d = new Date();
                                                setInvDateFilter({ start: new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000), end: endOfDay(d) });
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
                                                setInvDateFilter({ start: new Date(d.getFullYear(), d.getMonth(), 1), end: endOfDay(d) });
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
                                            selected={{ from: invDateFilter.start, to: invDateFilter.end }}
                                            onSelect={(range) => setInvDateFilter({ start: range?.from, end: range?.to })}
                                            initialFocus
                                            className="rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200"
                                        />
                                    </div>
                                    {(invDateFilter.start || invDateFilter.end) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setInvDateFilter({ start: undefined, end: undefined })}
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
                    <div className="grid grid-cols-1 lg:grid-cols-3">
                        <div className="lg:col-span-2 overflow-x-auto border-r border-zinc-800">
                            <Table>
                                <TableHeader className="bg-zinc-950/50">
                                    <TableRow className="hover:bg-transparent border-zinc-800">
                                        <TableHead>Date</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Vehicle</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead className="text-center">Delivery</TableHead>
                                        <TableHead className="text-right">Outcome</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInvoices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-zinc-500 py-12 italic">
                                                No invoices found for the selected period.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredInvoices.map((inv) => {
                                            const isSent = inv.isSent;
                                            const status = inv.paymentStatus || 'unpaid';
                                            
                                            let outcomeDisplay = 'Unpaid';
                                            let outcomeClass = "bg-red-500/10 text-red-400 border-red-500/20";
                                            if (status === 'paid' || (inv.paidAmount && inv.total && inv.paidAmount >= inv.total)) {
                                                outcomeDisplay = 'Paid';
                                                outcomeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                                            } else if (status === 'partially-paid' || (inv.paidAmount && inv.paidAmount > 0)) {
                                                outcomeDisplay = 'Partially Paid';
                                                outcomeClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                                            }

                                            return (
                                                <TableRow key={inv.id} className="hover:bg-zinc-900/30 border-zinc-800 transition-colors cursor-pointer" onClick={() => navigate(`/invoicing?editId=${inv.id}`)}>
                                                    <TableCell className="text-zinc-400 text-xs font-mono">
                                                        {inv.date || (inv.createdAt ? format(parseISO(inv.createdAt), "MMM d, yyyy") : "N/A")}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-zinc-200">{inv.customerName}</TableCell>
                                                    <TableCell className="text-zinc-500 text-xs">{inv.vehicle}</TableCell>
                                                    <TableCell className="font-bold text-zinc-300">
                                                        ${(inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-bold uppercase", isSent ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20")}>
                                                            {isSent ? 'Sent' : 'Not Sent'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-bold uppercase", outcomeClass)}>
                                                            {outcomeDisplay}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="lg:col-span-1 p-4 bg-zinc-900 flex flex-col items-center justify-start border-l border-zinc-800 gap-8 overflow-y-auto max-h-[500px]">
                            <div className="w-full flex flex-col items-center">
                                <h4 className="text-xs uppercase font-black text-zinc-500 tracking-widest mb-4">Delivery Status</h4>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={invDeliveryPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={65}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {invDeliveryPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="w-full flex flex-col items-center">
                                <h4 className="text-xs uppercase font-black text-zinc-500 tracking-widest mb-4">Invoice Outcomes</h4>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={invOutcomePieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={65}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {invOutcomePieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Estimates Tracker */}
            <Card id="estimates-tracker" className="bg-zinc-900 border-zinc-800 w-full overflow-hidden shadow-xl border-t-2 border-t-emerald-500/30 mt-6 scroll-mt-24">
                <CardHeader className="border-b border-zinc-800 bg-zinc-950/30 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileBarChart className="w-5 h-5 text-emerald-400" />
                        <div>
                            <CardTitle>Estimates</CardTitle>
                            <CardDescription>Track estimates statuses (Not Received, Sent, Accepted, Denied)</CardDescription>
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
                                    <Switch checked={quotesShowArchived} onCheckedChange={setQuotesShowArchived} className="border border-zinc-700 data-[state=checked]:bg-emerald-500" />
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
                    <div className="grid grid-cols-1 lg:grid-cols-3">
                        <div className="lg:col-span-2 overflow-x-auto border-r border-zinc-800">
                            <Table>
                                <TableHeader className="bg-zinc-950/50">
                                    <TableRow className="hover:bg-transparent border-zinc-800">
                                        <TableHead>Date</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Service</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead className="text-center">Delivery</TableHead>
                                        <TableHead className="text-right">Outcome</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredQuotes.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-zinc-500 py-12 italic">
                                                No estimates found for the selected period.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredQuotes.map((q) => {
                                            let s = (q.status || '').toLowerCase();
                                            const isSent = q.isSent || s === 'sent' || s === 'accepted' || s === 'declined' || s === 'denied';
                                            
                                            let outcomeDisplay = 'Pending';
                                            let outcomeClass = "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
                                            if (s === 'accepted') {
                                                outcomeDisplay = 'Accepted';
                                                outcomeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                                            } else if (s === 'denied' || s === 'declined') {
                                                outcomeDisplay = 'Declined';
                                                outcomeClass = "bg-red-500/10 text-red-400 border-red-500/20";
                                            } else if (isSent) {
                                                outcomeDisplay = 'No Answer';
                                                outcomeClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                                            }

                                            return (
                                                <TableRow key={q.id} className="hover:bg-zinc-900/30 border-zinc-800 transition-colors cursor-pointer" onClick={() => navigate(`/estimates?editId=${q.id}`)}>
                                                    <TableCell className="text-zinc-400 text-xs font-mono">
                                                        {q.createdAt ? format(parseISO(q.createdAt), "MMM d, yyyy") : "N/A"}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-zinc-200">{q.customerName || q.customer}</TableCell>
                                                    <TableCell className="text-zinc-300">{Array.isArray(q.services) ? q.services.map((s:any)=>s.name).join(', ') : (q.service || 'N/A')}</TableCell>
                                                    <TableCell className="text-emerald-400 font-mono font-bold">${(q.total || 0).toFixed(2)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-bold uppercase", isSent ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20")}>
                                                            {isSent ? 'Sent' : 'Not Received'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-bold uppercase", outcomeClass)}>
                                                            {outcomeDisplay}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="lg:col-span-1 p-4 bg-zinc-900 flex flex-col items-center justify-start border-l border-zinc-800 gap-8 overflow-y-auto max-h-[500px]">
                            <div className="w-full flex flex-col items-center">
                                <h4 className="text-xs uppercase font-black text-zinc-500 tracking-widest mb-4">Delivery Status</h4>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={deliveryPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={65}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {deliveryPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="w-full flex flex-col items-center">
                                <h4 className="text-xs uppercase font-black text-zinc-500 tracking-widest mb-4">Estimate Outcomes</h4>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={outcomePieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={65}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {outcomePieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
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



            {/* Probono Jobs Tracker */}
            <Card id="probono-tracker" className="bg-zinc-900 border-zinc-800 w-full overflow-hidden shadow-xl border-t-2 border-t-pink-500/30 mt-6 scroll-mt-24">
                <CardHeader className="border-b border-zinc-800 bg-zinc-950/30 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-pink-400" />
                        <div>
                            <CardTitle>Probono Jobs</CardTitle>
                            <CardDescription>Completed jobs with $0.00 collected — click any row to view the invoice</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/20">
                            {probonoJobs.length} FREE JOBS
                        </Badge>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50">
                                    <Filter className="h-4 w-4" />
                                    Filter
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-4" align="end">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Quick Filters</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button variant="outline" size="sm" className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                                onClick={() => setQualDateFilter({ start: undefined, end: undefined })}>All Time</Button>
                                            <Button variant="outline" size="sm" className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                                onClick={() => setQualDateFilter({ start: startOfDay(new Date()), end: endOfDay(new Date()) })}>Today</Button>
                                            <Button variant="outline" size="sm" className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                                onClick={() => { const d = new Date(); setQualDateFilter({ start: new Date(d.getTime() - 7*24*60*60*1000), end: endOfDay(d) }); }}>This Week</Button>
                                            <Button variant="outline" size="sm" className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                                                onClick={() => { const d = new Date(); setQualDateFilter({ start: new Date(d.getFullYear(), d.getMonth(), 1), end: endOfDay(d) }); }}>This Month</Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Custom Range</Label>
                                        <Calendar
                                            mode="range"
                                            selected={{ from: qualDateFilter.start, to: qualDateFilter.end }}
                                            onSelect={(range) => setQualDateFilter({ start: range?.from, end: range?.to })}
                                            initialFocus
                                            className="rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200"
                                        />
                                        {(qualDateFilter.start || qualDateFilter.end) && (
                                            <Button variant="ghost" size="sm" onClick={() => setQualDateFilter({ start: undefined, end: undefined })} className="w-full text-zinc-400 hover:text-white mt-2">Clear Range</Button>
                                        )}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 lg:grid-cols-3">
                        <div className="lg:col-span-2 overflow-x-auto border-r border-zinc-800">
                            <Table>
                                <TableHeader className="bg-zinc-950/50">
                                    <TableRow className="hover:bg-transparent border-zinc-800">
                                        <TableHead>Date</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Service</TableHead>
                                        <TableHead className="text-right">Job Value</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {probonoJobs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-zinc-500 py-12 italic">
                                                No probono jobs found for the selected period. 🎉
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        probonoJobs.map((job) => (
                                            <TableRow
                                                key={job.id}
                                                className="hover:bg-pink-900/10 border-zinc-800 transition-colors cursor-pointer"
                                                onClick={() => {
                                                    if (job.invoiceId) {
                                                        navigate(`/invoicing?editId=${job.invoiceId}`);
                                                    } else {
                                                        navigate(`/bookings?customer=${encodeURIComponent(job.customer)}`);
                                                    }
                                                }}
                                            >
                                                <TableCell className="text-zinc-400 text-xs font-mono">
                                                    {job.date ? format(parseISO(job.date), "MMM d, yyyy") : "N/A"}
                                                </TableCell>
                                                <TableCell className="font-semibold text-zinc-200">{job.customer}</TableCell>
                                                <TableCell className="text-zinc-400 text-xs">{job.service}</TableCell>
                                                <TableCell className="text-right text-emerald-400 font-mono">
                                                    {job.value > 0 ? `$${job.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "N/A"}
                                                </TableCell>
                                                <TableCell className="text-right text-pink-400 font-mono font-bold">
                                                    $0.00
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="lg:col-span-1 p-4 bg-zinc-900 flex flex-col items-center justify-center border-l border-zinc-800">
                            <h4 className="text-xs uppercase font-black text-zinc-500 tracking-widest mb-4">Paid vs Free Comparison</h4>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={freeVsPaidPieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={85}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                            onClick={(entry: any) => {
                                                if (entry?.name === 'Probono Jobs') {
                                                    document.getElementById('probono-tracker')?.scrollIntoView({ behavior: 'smooth' });
                                                }
                                            }}
                                        >
                                            {freeVsPaidPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>



            {/* CRM Customer List */}
            <Card id="customer-insights" className="bg-zinc-900 border-zinc-800 w-full overflow-hidden scroll-mt-24">
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
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                                                            onClick={() => navigate(`/search-customer?customerId=${cust.id || ''}&search=${encodeURIComponent(cust.name)}`)}
                                                            title="Edit Customer Profile"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className={lastBooking.isArchived ? "text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}
                                                            onClick={() => handleArchiveToggle(cust.lastBookingId, !!lastBooking.isArchived)}
                                                            title={lastBooking.isArchived ? "Restore" : "Archive"}
                                                        >
                                                            <Archive className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="text-red-500/70 hover:text-red-400 hover:bg-red-500/10"
                                                            onClick={() => handleDeleteCustomerBooking(cust.lastBookingId)}
                                                            title="Delete Booking Record"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
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
            <Card id="operational-quality" className="bg-zinc-900 border-zinc-800 w-full overflow-hidden shadow-xl border-t-2 border-t-violet-500/30 mt-8 relative group scroll-mt-24">
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
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2 border-zinc-800 bg-zinc-900/50">
                                    <Filter className="h-4 w-4" />
                                    Filter
                                    {(qualShowArchived || qualDateFilter.start) && (
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
                                        <Switch checked={qualShowArchived} onCheckedChange={setQualShowArchived} className="border border-zinc-700 data-[state=checked]:bg-emerald-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Quick Filters</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button variant="outline" size="sm" className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700" onClick={() => setQualDateFilter({ start: undefined, end: undefined })}>All Time</Button>
                                            <Button variant="outline" size="sm" className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700" onClick={() => setQualDateFilter({ start: startOfDay(new Date()), end: endOfDay(new Date()) })}>Today</Button>
                                            <Button variant="outline" size="sm" className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700" onClick={() => { const d = new Date(); setQualDateFilter({ start: new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000), end: endOfDay(d) }); }}>This Week</Button>
                                            <Button variant="outline" size="sm" className="text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700" onClick={() => { const d = new Date(); setQualDateFilter({ start: new Date(d.getFullYear(), d.getMonth(), 1), end: endOfDay(d) }); }}>This Month</Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Custom Range</Label>
                                        <div className="grid gap-2 text-zinc-200">
                                            <Calendar
                                                mode="range"
                                                selected={{ from: qualDateFilter.start, to: qualDateFilter.end }}
                                                onSelect={(range) => setQualDateFilter({ start: range?.from, end: range?.to })}
                                                initialFocus
                                                className="rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200"
                                            />
                                        </div>
                                        {(qualDateFilter.start || qualDateFilter.end) && (
                                            <Button variant="ghost" size="sm" onClick={() => setQualDateFilter({ start: undefined, end: undefined })} className="w-full text-zinc-400 hover:text-white mt-2">Clear Range</Button>
                                        )}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
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

            {/* Chart Jobs Modal */}
            <Dialog open={isChartJobsModalOpen} onOpenChange={setIsChartJobsModalOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">{chartJobsModalTitle} ({selectedChartJobs.length} Jobs)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        {selectedChartJobs.length === 0 ? (
                            <p className="text-zinc-400">No jobs found for this category.</p>
                        ) : (
                            selectedChartJobs.map((b, i) => (
                                <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg flex justify-between items-center shadow-md">
                                    <div>
                                        <h4 className="font-bold text-lg text-zinc-100">{b.customer}</h4>
                                        <div className="text-sm text-zinc-400 flex items-center gap-2 mt-1">
                                            <CalendarIcon className="w-3.5 h-3.5 text-zinc-500" />
                                            {b.date ? format(parseISO(b.date), "MMMM d, yyyy 'at' h:mm a") : 'Unknown Date'}
                                        </div>
                                        <div className="text-sm text-zinc-400 mt-2">
                                            <span className="font-semibold text-zinc-300">Service:</span> {b.title || 'Unknown'}
                                        </div>
                                        <div className="text-sm text-zinc-400">
                                            <span className="font-semibold text-zinc-300">Location:</span> {b.placeOfService || b.address || "Customer's address"}
                                        </div>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:text-white"
                                        onClick={() => {
                                            setIsChartJobsModalOpen(false);
                                            navigate(`/search-customer?customerId=${b.customerId || ''}&search=${encodeURIComponent(b.customer)}`);
                                        }}
                                    >
                                        View Profile
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}


