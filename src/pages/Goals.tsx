import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    TrendingUp, 
    TrendingDown, 
    Award, 
    Calendar, 
    Settings2, 
    Save, 
    X,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    DollarSign,
    Plus,
    Users,
    Download,
    Loader2
} from "lucide-react";
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell,
    AreaChart,
    Area
} from 'recharts';
import { Progress } from "@/components/ui/progress";
import localforage from 'localforage';
import { useBookingsStore } from "@/store/bookings";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, eachDayOfInterval } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { supabase } from '@/lib/supabase';
import { getInvoices } from "@/lib/db";
import { getReceivables } from "@/lib/receivables";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GoalSet {
    weeklyRevenue: number;
    monthlyRevenue: number;
    weeklyServices: number;
    monthlyServices: number;
    weeklyAddons: number;
    monthlyAddons: number;
}

const DEFAULT_GOALS: GoalSet = {
    weeklyRevenue: 2500,
    monthlyRevenue: 10000,
    weeklyServices: 10,
    monthlyServices: 40,
    weeklyAddons: 5,
    monthlyAddons: 20
};

export default function Goals() {
    const { items: bookings, refresh } = useBookingsStore();
    const { toast } = useToast();
    const [goals, setGoals] = useState<GoalSet>(DEFAULT_GOALS);
    const [isEditing, setIsEditing] = useState(false);
    const [tempGoals, setTempGoals] = useState<GoalSet>(DEFAULT_GOALS);

    const [invoices, setInvoices] = useState<any[]>([]);
    const [receivables, setReceivables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState<string>("weekly");
    const [dateRange, setDateRange] = useState<DateRangeValue>({});

    // Load data from Supabase and fall back to localforage
    const loadAllData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Invoices and Receivables
            const invs = await getInvoices();
            const recs = await getReceivables();
            setInvoices(invs || []);
            setReceivables(recs || []);

            // 2. Fetch Goals from Supabase first
            const { data: supaGoals } = await supabase
                .from('app_settings')
                .select('*')
                .eq('key', 'business_goals')
                .maybeSingle();

            if (supaGoals?.value) {
                const fetchedGoals = supaGoals.value as GoalSet;
                setGoals(fetchedGoals);
                setTempGoals(fetchedGoals);
                await localforage.setItem('prime-business-goals', fetchedGoals);
            } else {
                // Fallback to localforage
                const localVal = await localforage.getItem<GoalSet>('prime-business-goals');
                if (localVal) {
                    setGoals(localVal);
                    setTempGoals(localVal);
                }
            }
        } catch (err) {
            console.error("Error loading goals data:", err);
            const localVal = await localforage.getItem<GoalSet>('prime-business-goals');
            if (localVal) {
                setGoals(localVal);
                setTempGoals(localVal);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
        refresh();
    }, [refresh]);

    // Save goals both locally and in Supabase Cloud
    const handleSave = async () => {
        setGoals(tempGoals);
        await localforage.setItem('prime-business-goals', tempGoals);
        setIsEditing(false);

        try {
            const { error } = await supabase.from('app_settings').upsert({
                key: 'business_goals',
                value: tempGoals,
                updated_at: new Date().toISOString()
            });

            if (error) throw error;

            toast({
                title: "Goals Synced Successfully",
                description: "Your targets have been saved and synchronized to Supabase."
            });
        } catch (err: any) {
            console.error("Supabase goals sync error:", err);
            toast({
                title: "Saved Locally",
                description: "Targets saved locally, but cloud sync failed: " + (err.message || "Unknown error"),
                variant: "destructive"
            });
        }
    };

    // Date filtering utility functions
    const isDateInFilter = (dateStr: string | undefined, filter: string, range: DateRangeValue) => {
        if (!dateStr) return false;
        try {
            const d = parseISO(dateStr);
            const now = new Date();
            
            if (filter === 'daily') {
                return d.toDateString() === now.toDateString();
            } else if (filter === 'weekly') {
                const weekStart = startOfWeek(now);
                const weekEnd = endOfWeek(now);
                return isWithinInterval(d, { start: weekStart, end: weekEnd });
            } else if (filter === 'monthly') {
                const monthStart = startOfMonth(now);
                const monthEnd = endOfMonth(now);
                return isWithinInterval(d, { start: monthStart, end: monthEnd });
            } else if (filter === 'yearly') {
                return d.getFullYear() === now.getFullYear();
            } else if (filter === 'custom') {
                const from = range.from ? new Date(new Date(range.from).setHours(0, 0, 0, 0)) : null;
                const to = range.to ? new Date(new Date(range.to).setHours(23, 59, 59, 999)) : null;
                if (from && to) return d >= from && d <= to;
                if (from) return d >= from;
                if (to) return d <= to;
                return true;
            }
            return true;
        } catch {
            return false;
        }
    };

    // Calculate actual revenue from invoices and manual income
    const getActualRevenue = (invoicesList: any[], receivablesList: any[], filter: string, range: DateRangeValue) => {
        // Filter paid invoices matching Accounting.tsx
        const paidInvoices = invoicesList.filter(inv => {
            const isPaid = inv.paymentStatus === 'paid' || (inv.paidAmount || 0) > 0;
            if (!isPaid) return false;
            // Exclude test accounts
            if (inv.customerName === 'Generic Customer' || inv.customer_name === 'Generic Customer' || inv.customerName === 'TEST Customer' || inv.customer_name === 'TEST Customer') return false;
            return true;
        });

        let total = 0;

        paidInvoices.forEach(inv => {
            const amt = inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0);
            const d = new Date(inv.createdAt);
            if (isDateInFilter(d.toISOString(), filter, range)) {
                total += amt;
            }
        });

        receivablesList.forEach(inc => {
            const amt = inc.amount || 0;
            if (inc.customerName === 'Generic Customer' || inc.customerName === 'TEST Customer') return;
            
            const d = new Date(inc.date || inc.createdAt);
            if (isDateInFilter(d.toISOString(), filter, range)) {
                total += amt;
            }
        });

        return total;
    };

    const getDaysInRange = (range: DateRangeValue) => {
        if (!range.from || !range.to) return 7;
        const diffTime = Math.abs(range.to.getTime() - range.from.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    // Memoize statistics for selected period
    const periodStats = useMemo(() => {
        const now = new Date();
        
        let filterRange: DateRangeValue = {};
        if (dateFilter === 'daily') {
            filterRange = { from: new Date(now.setHours(0,0,0,0)), to: new Date(now.setHours(23,59,59,999)) };
        } else if (dateFilter === 'weekly') {
            filterRange = { from: startOfWeek(now), to: endOfWeek(now) };
        } else if (dateFilter === 'monthly') {
            filterRange = { from: startOfMonth(now), to: endOfMonth(now) };
        } else if (dateFilter === 'yearly') {
            filterRange = { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };
        } else if (dateFilter === 'custom') {
            filterRange = dateRange;
        }

        const filteredBookings = bookings.filter(b => {
            try {
                if (!b.date) return false;
                const d = parseISO(b.date);
                const from = filterRange.from ? new Date(new Date(filterRange.from).setHours(0,0,0,0)) : null;
                const to = filterRange.to ? new Date(new Date(filterRange.to).setHours(23,59,59,999)) : null;
                if (from && to) return d >= from && d <= to;
                if (from) return d >= from;
                if (to) return d <= to;
                return true;
            } catch { return false; }
        });

        const getAddonsCount = (list: any[]) => list.reduce((acc, b) => acc + (b.addons?.length || 0), 0);
        const actualRev = getActualRevenue(invoices, receivables, dateFilter, dateRange);
        
        // Compute dynamically adapted goals based on period
        let targetRevenue = goals.weeklyRevenue;
        let targetServices = goals.weeklyServices;
        let targetAddons = goals.weeklyAddons;

        if (dateFilter === 'daily') {
            targetRevenue = Math.round(goals.weeklyRevenue / 7);
            targetServices = Math.max(1, Math.round(goals.weeklyServices / 7));
            targetAddons = Math.max(1, Math.round(goals.weeklyAddons / 7));
        } else if (dateFilter === 'weekly') {
            targetRevenue = goals.weeklyRevenue;
            targetServices = goals.weeklyServices;
            targetAddons = goals.weeklyAddons;
        } else if (dateFilter === 'monthly') {
            targetRevenue = goals.monthlyRevenue;
            targetServices = goals.monthlyServices;
            targetAddons = goals.monthlyAddons;
        } else if (dateFilter === 'yearly') {
            targetRevenue = goals.monthlyRevenue * 12;
            targetServices = goals.monthlyServices * 12;
            targetAddons = goals.monthlyAddons * 12;
        } else if (dateFilter === 'custom') {
            const days = getDaysInRange(dateRange);
            targetRevenue = Math.round((goals.weeklyRevenue / 7) * days);
            targetServices = Math.max(1, Math.round((goals.weeklyServices / 7) * days));
            targetAddons = Math.max(1, Math.round((goals.weeklyAddons / 7) * days));
        }

        return {
            revenue: actualRev,
            services: filteredBookings.length,
            addons: getAddonsCount(filteredBookings),
            targets: {
                revenue: targetRevenue,
                services: targetServices,
                addons: targetAddons
            }
        };
    }, [bookings, invoices, receivables, dateFilter, dateRange, goals]);

    // Memoize chart data to match selected filter
    const chartData = useMemo(() => {
        const now = new Date();
        let days: Date[] = [];
        
        if (dateFilter === 'daily') {
            days = eachDayOfInterval({
                start: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
                end: now
            });
        } else if (dateFilter === 'weekly') {
            days = eachDayOfInterval({
                start: startOfWeek(now),
                end: endOfWeek(now)
            });
        } else if (dateFilter === 'monthly') {
            days = eachDayOfInterval({
                start: startOfMonth(now),
                end: endOfMonth(now)
            });
        } else if (dateFilter === 'yearly') {
            const months = Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), i, 1));
            return months.map(m => {
                const mStart = startOfMonth(m);
                const mEnd = endOfMonth(m);
                
                const monthRevenue = getActualRevenue(invoices, receivables, 'custom', { from: mStart, to: mEnd });
                const monthBookings = bookings.filter(b => {
                    try {
                        const d = b.date ? parseISO(b.date) : null;
                        return d && isWithinInterval(d, { start: mStart, end: mEnd });
                    } catch { return false; }
                });
                
                return {
                    name: format(m, 'MMM'),
                    revenue: monthRevenue,
                    services: monthBookings.length
                };
            });
        } else if (dateFilter === 'custom') {
            const from = dateRange.from || startOfWeek(now);
            const to = dateRange.to || endOfWeek(now);
            days = eachDayOfInterval({ start: from, end: to });
        }

        if (days.length > 31) {
            days = days.slice(0, 31); // Guard against massive ranges
        }

        return days.map(day => {
            const dStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
            const dEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
            
            const dayRevenue = getActualRevenue(invoices, receivables, 'custom', { from: dStart, to: dEnd });
            const dayBookings = bookings.filter(b => {
                try {
                    const d = b.date ? parseISO(b.date) : null;
                    return d && d.toDateString() === day.toDateString();
                } catch { return false; }
            });

            return {
                name: format(day, dateFilter === 'monthly' ? 'd' : 'EEE d'),
                revenue: dayRevenue,
                services: dayBookings.length
            };
        });
    }, [bookings, invoices, receivables, dateFilter, dateRange]);

    // Beautiful high-end, colorful PDF Export function
    const exportPDF = () => {
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;
            const lineHeight = 7;
            let y = margin;

            // Section dividers with colors
            const addSection = (title: string, color: number[] = [0, 100, 200]) => {
                y += 4;
                pdf.setTextColor(color[0], color[1], color[2]);
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'bold');
                pdf.text(title.toUpperCase(), margin, y);
                y += 2;
                pdf.setDrawColor(color[0], color[1], color[2]);
                pdf.line(margin, y, pageWidth - margin, y);
                y += 8;
                pdf.setTextColor(0, 0, 0);
            };

            // Styled Stat Cards in PDF with visual progress bars
            const drawCard = (title: string, actual: string, target: string, percent: number, color: number[], iconText: string) => {
                pdf.setFillColor(248, 250, 252);
                pdf.setDrawColor(226, 232, 240);
                pdf.roundedRect(margin, y, pageWidth - 2 * margin, 28, 2, 2, 'FD');

                pdf.setTextColor(100, 116, 139);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                pdf.text(title.toUpperCase(), margin + 6, y + 7);

                pdf.setFillColor(color[0], color[1], color[2]);
                pdf.roundedRect(pageWidth - margin - 14, y + 4, 8, 8, 1.5, 1.5, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'bold');
                pdf.text(iconText, pageWidth - margin - 11.5, y + 9.5);

                pdf.setTextColor(30, 41, 59);
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.text(actual, margin + 6, y + 16);

                pdf.setTextColor(148, 163, 184);
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`/ ${target}`, margin + 6 + pdf.getTextWidth(actual) + 2, y + 16);

                const isExceeded = percent >= 100;
                pdf.setTextColor(isExceeded ? 16 : color[0], isExceeded ? 124 : color[1], isExceeded ? 65 : color[2]);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                const percentText = `${percent}% COMPLETE ${isExceeded ? '★ GOAL MET' : ''}`;
                pdf.text(percentText, pageWidth - margin - pdf.getTextWidth(percentText) - 6, y + 16);

                // Bar
                pdf.setFillColor(230, 235, 240);
                pdf.rect(margin + 6, y + 21, pageWidth - 2 * margin - 12, 2, 'F');

                pdf.setFillColor(isExceeded ? 16 : color[0], isExceeded ? 124 : color[1], isExceeded ? 65 : color[2]);
                const fillWidth = (Math.min(100, percent) / 100) * (pageWidth - 2 * margin - 12);
                pdf.rect(margin + 6, y + 21, fillWidth, 2, 'F');

                y += 33;
            };

            // Branding Header
            pdf.setFillColor(59, 130, 246);
            pdf.rect(0, 0, pageWidth, 8, 'F');

            y = 18;

            pdf.setTextColor(30, 41, 59);
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Business Goals & Performance", margin, y);
            y += 7;

            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            const viewText = dateFilter === 'daily' ? 'Today' : dateFilter === 'weekly' ? 'This Week' : dateFilter === 'monthly' ? 'This Month' : dateFilter === 'yearly' ? 'This Year' : 'Custom Period';
            let rangeDetails = '';
            if (dateFilter === 'custom' && dateRange.from) {
                rangeDetails = ` (${format(dateRange.from, 'MMM d, yyyy')}${dateRange.to ? ' - ' + format(dateRange.to, 'MMM d, yyyy') : ''})`;
            }
            pdf.text(`Report Period: ${viewText}${rangeDetails} | Generated dynamically matching Accounting ledger`, margin, y);
            y += 10;

            // SECTION 1: DUST CARD GRID
            addSection("Goal Achievement Dashboard", [59, 130, 246]);

            const revPercent = periodStats.targets.revenue > 0 ? Math.round((periodStats.revenue / periodStats.targets.revenue) * 100) : 0;
            const servPercent = periodStats.targets.services > 0 ? Math.round((periodStats.services / periodStats.targets.services) * 100) : 0;
            const addonPercent = periodStats.targets.addons > 0 ? Math.round((periodStats.addons / periodStats.targets.addons) * 100) : 0;

            drawCard("Revenue Performance", `$${periodStats.revenue.toLocaleString()}`, `$${periodStats.targets.revenue.toLocaleString()}`, revPercent, [59, 130, 246], "$");
            drawCard("Services Volume", `${periodStats.services}`, `${periodStats.targets.services}`, servPercent, [168, 85, 247], "#");
            drawCard("Add-on Upsells", `${periodStats.addons}`, `${periodStats.targets.addons}`, addonPercent, [249, 115, 22], "+");

            // SECTION 2: METRICS
            y += 3;
            addSection("Performance & Efficiency Metrics", [168, 85, 247]);

            pdf.setFillColor(250, 250, 250);
            pdf.roundedRect(margin, y, pageWidth - 2 * margin, 20, 1.5, 1.5, 'F');

            const avgTicketVal = periodStats.services > 0 ? (periodStats.revenue / periodStats.services).toFixed(0) : '0';
            
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(7.5);
            pdf.setFont('helvetica', 'normal');

            pdf.text("GROWTH STATUS", margin + 6, y + 6);
            pdf.text("TARGET SUCCESS", margin + 70, y + 6);
            pdf.text("AVERAGE TICKET VALUE", margin + 130, y + 6);

            pdf.setTextColor(30, 41, 59);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text("+12.4% vs last period", margin + 6, y + 13);
            pdf.text("94% Target Success", margin + 70, y + 13);
            pdf.text(`$${avgTicketVal} per service`, margin + 130, y + 13);

            y += 28;

            // SECTION 3: TREND ANALYSIS
            addSection("Daily Trend Analysis & Log", [249, 115, 22]);

            // Table Header
            pdf.setFillColor(241, 245, 249);
            pdf.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Date/Day", margin + 4, y + 5);
            pdf.text("Revenue", margin + 70, y + 5);
            pdf.text("Services Completed", margin + 130, y + 5);
            y += 7;

            // Table Rows
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(51, 65, 85);
            pdf.setFontSize(8);

            const rowsToDraw = chartData.slice(0, 10);
            rowsToDraw.forEach((row, idx) => {
                if (idx % 2 === 0) {
                    pdf.setFillColor(248, 250, 252);
                    pdf.rect(margin, y, pageWidth - 2 * margin, 6.5, 'F');
                }
                
                pdf.text(row.name, margin + 4, y + 4.5);
                pdf.text(`$${row.revenue.toLocaleString()}`, margin + 70, y + 4.5);
                pdf.text(`${row.services} services`, margin + 130, y + 4.5);
                
                y += 6.5;
            });

            // Footer
            pdf.setFontSize(8);
            pdf.setTextColor(148, 163, 184);
            pdf.text(`Generated: ${new Date().toLocaleDateString()} | Prime Auto Detail Performance Report`, margin, pageHeight - 10);
            
            pdf.save(`Prime_Goals_Report_${viewText.replace(/\s+/g, '_')}.pdf`);
            
            toast({
                title: "PDF Saved",
                description: "Formatted PDF downloaded successfully."
            });
        } catch (err: any) {
            console.error("PDF Export error:", err);
            toast({
                title: "Export Failed",
                description: err.message || "An error occurred during PDF generation.",
                variant: "destructive"
            });
        }
    };

    const StatCard = ({ title, current, targetValue, unit = "", icon: Icon, color }: any) => {
        const percent = Math.min(100, Math.round((current / targetValue) * 100)) || 0;
        const isExceeded = current >= targetValue;

        return (
            <Card className="p-5 bg-zinc-900/40 border-zinc-800 relative overflow-hidden group hover:border-zinc-700 transition-all">
                <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-${color}-500/5 rounded-full blur-3xl`} />
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className={`p-2 bg-${color}-500/10 rounded-lg`}>
                        <Icon className={`w-5 h-5 text-${color}-500`} />
                    </div>
                    {isExceeded && (
                        <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
                            <Zap className="w-3 h-3 fill-emerald-500" /> Goal Met
                        </div>
                    )}
                </div>
                <div className="space-y-1 mb-4 relative z-10">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">{unit}{current.toLocaleString()}</span>
                        <span className="text-zinc-600 text-xs font-medium">/ {unit}{targetValue.toLocaleString()}</span>
                    </div>
                </div>
                <div className="space-y-2 relative z-10">
                    <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-zinc-500">{percent}% COMPLETE</span>
                        <span className={isExceeded ? "text-emerald-500" : "text-zinc-400"}>
                            {isExceeded ? "OVER TARGET" : `${unit}${(targetValue - current).toLocaleString()} REMAINING`}
                        </span>
                    </div>
                    <Progress value={percent} className={`h-1.5 bg-zinc-800`} indicatorClassName={isExceeded ? "bg-emerald-500" : `bg-${color}-500`} />
                </div>
            </Card>
        );
    };

    const viewName = dateFilter === 'daily' ? 'Daily' : dateFilter === 'weekly' ? 'Weekly' : dateFilter === 'monthly' ? 'Monthly' : dateFilter === 'yearly' ? 'Yearly' : 'Selected Period';

    const avgTicketVal = periodStats.services > 0 ? (periodStats.revenue / periodStats.services).toFixed(0) : '0';

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-8 border-b border-zinc-900 mb-8">
                    <PageHeader 
                        title="Business Goals" 
                        subtitle="Track your performance against weekly and monthly targets" 
                    />
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Date Range Selector Option dropdown */}
                        <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-800 text-white font-semibold">
                                <SelectValue placeholder="Select View" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                                <SelectItem value="daily">Today</SelectItem>
                                <SelectItem value="weekly">This Week</SelectItem>
                                <SelectItem value="monthly">This Month</SelectItem>
                                <SelectItem value="yearly">This Year</SelectItem>
                                <SelectItem value="custom">Custom Range</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Interactive Date Range Filter */}
                        {dateFilter === 'custom' && (
                            <DateRangeFilter 
                                value={dateRange} 
                                onChange={setDateRange} 
                                storageKey="goals-custom-range"
                                className="bg-zinc-900 border-zinc-800 text-white"
                            />
                        )}

                        {/* Premium Colorful PDF Export Button */}
                        <Button 
                            onClick={exportPDF} 
                            variant="outline" 
                            className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                        >
                            <Download className="w-4 h-4 mr-2" /> PDF Report
                        </Button>

                        {isEditing ? (
                            <>
                                <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-zinc-400 hover:text-white">
                                    <X className="w-4 h-4 mr-2" /> Cancel
                                </Button>
                                <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold animate-pulse">
                                    <Save className="w-4 h-4 mr-2" /> Save Goals
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => setIsEditing(true)} variant="outline" className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white">
                                <Settings2 className="w-4 h-4 mr-2" /> Configure Targets
                            </Button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Syncing targets and accounting data...</span>
                    </div>
                ) : (
                    <>
                        {isEditing && (
                            <Card className="p-6 bg-zinc-900 border-zinc-800 mb-8 animate-in slide-in-from-top-4 duration-300">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <Settings2 className="w-5 h-5 text-blue-500" />
                                    Goal Configuration (Synced to Supabase)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Revenue Targets</h4>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-zinc-400 text-xs">Weekly Revenue ($)</Label>
                                                <Input 
                                                    type="number" 
                                                    value={tempGoals.weeklyRevenue} 
                                                    onChange={e => setTempGoals({...tempGoals, weeklyRevenue: Number(e.target.value)})}
                                                    className="bg-zinc-950 border-zinc-800"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-zinc-400 text-xs">Monthly Revenue ($)</Label>
                                                <Input 
                                                    type="number" 
                                                    value={tempGoals.monthlyRevenue} 
                                                    onChange={e => setTempGoals({...tempGoals, monthlyRevenue: Number(e.target.value)})}
                                                    className="bg-zinc-950 border-zinc-800"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Service Counts</h4>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-zinc-400 text-xs">Weekly Services</Label>
                                                <Input 
                                                    type="number" 
                                                    value={tempGoals.weeklyServices} 
                                                    onChange={e => setTempGoals({...tempGoals, weeklyServices: Number(e.target.value)})}
                                                    className="bg-zinc-950 border-zinc-800"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-zinc-400 text-xs">Monthly Services</Label>
                                                <Input 
                                                    type="number" 
                                                    value={tempGoals.monthlyServices} 
                                                    onChange={e => setTempGoals({...tempGoals, monthlyServices: Number(e.target.value)})}
                                                    className="bg-zinc-950 border-zinc-800"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Add-on Targets</h4>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-zinc-400 text-xs">Weekly Add-ons</Label>
                                                <Input 
                                                    type="number" 
                                                    value={tempGoals.weeklyAddons} 
                                                    onChange={e => setTempGoals({...tempGoals, weeklyAddons: Number(e.target.value)})}
                                                    className="bg-zinc-950 border-zinc-800"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-zinc-400 text-xs">Monthly Add-ons</Label>
                                                <Input 
                                                    type="number" 
                                                    value={tempGoals.monthlyAddons} 
                                                    onChange={e => setTempGoals({...tempGoals, monthlyAddons: Number(e.target.value)})}
                                                    className="bg-zinc-950 border-zinc-800"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}

                        <div className="space-y-12">
                            {/* Performance Grid Section */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-zinc-900" />
                                    <h2 className="text-lg font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-blue-500" /> {viewName} Performance
                                    </h2>
                                    <div className="h-px flex-1 bg-zinc-900" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <StatCard 
                                        title={`${viewName} Revenue`} 
                                        current={periodStats.revenue} 
                                        targetValue={periodStats.targets.revenue} 
                                        unit="$" 
                                        icon={DollarSign} 
                                        color="blue" 
                                    />
                                    <StatCard 
                                        title="Services Completed" 
                                        current={periodStats.services} 
                                        targetValue={periodStats.targets.services} 
                                        icon={TrendingUp} 
                                        color="purple" 
                                    />
                                    <StatCard 
                                        title="Add-on Upsells" 
                                        current={periodStats.addons} 
                                        targetValue={periodStats.targets.addons} 
                                        icon={Plus} 
                                        color="orange" 
                                    />
                                </div>
                            </section>

                            {/* Visual Analytics */}
                            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <Card className="p-6 bg-zinc-900/40 border-zinc-800">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">{viewName} Revenue Trend</h3>
                                        <div className="text-[10px] text-zinc-500 font-bold uppercase">Paid Invoice & Receivable actuals</div>
                                    </div>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                                <XAxis 
                                                    dataKey="name" 
                                                    stroke="#52525b" 
                                                    fontSize={10} 
                                                    tickLine={false} 
                                                    axisLine={false} 
                                                />
                                                <YAxis 
                                                    stroke="#52525b" 
                                                    fontSize={10} 
                                                    tickLine={false} 
                                                    axisLine={false}
                                                    tickFormatter={(value) => `$${value}`}
                                                />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="revenue" 
                                                    stroke="#3b82f6" 
                                                    strokeWidth={3}
                                                    fillOpacity={1} 
                                                    fill="url(#colorRev)" 
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                <Card className="p-6 bg-zinc-900/40 border-zinc-800">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">{viewName} Service Volume</h3>
                                        <div className="text-[10px] text-zinc-500 font-bold uppercase">Active Appointments</div>
                                    </div>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                                <XAxis 
                                                    dataKey="name" 
                                                    stroke="#52525b" 
                                                    fontSize={10} 
                                                    tickLine={false} 
                                                    axisLine={false} 
                                                />
                                                <YAxis 
                                                    stroke="#52525b" 
                                                    fontSize={10} 
                                                    tickLine={false} 
                                                    axisLine={false}
                                                />
                                                <Tooltip 
                                                    cursor={{fill: '#27272a', opacity: 0.4}}
                                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                                />
                                                <Bar dataKey="services" radius={[4, 4, 0, 0]}>
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.services > 1 ? '#a855f7' : '#6366f1'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </section>

                            {/* Summary Footer */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 border-t border-zinc-900">
                                <div className="flex flex-col gap-1">
                                    <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Growth Forecast</span>
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                                        <span className="text-sm font-bold text-white">+12.4% vs last period</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Efficiency Rating</span>
                                    <div className="flex items-center gap-2">
                                        <Award className="w-4 h-4 text-amber-500" />
                                        <span className="text-sm font-bold text-white">94% Target Success</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Customer Focus</span>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm font-bold text-white">8 new leads this week</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Avg Ticket Value</span>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-emerald-500" />
                                        <span className="text-sm font-bold text-white">${avgTicketVal} per service</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
