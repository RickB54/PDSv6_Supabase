import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Download,
    Printer,
    Trash2,
    Calendar,
    Briefcase,
    MapPin,
    Gauge,
    TrendingUp,
    FileText,
    Search,
    Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    getSupabaseMileageLogs,
    upsertSupabaseMileageLog,
    deleteSupabaseMileageLog,
    getSupabaseCustomers,
    MileageLog,
    Customer
} from "@/lib/supa-data";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, startOfDay, startOfMonth, startOfYear, isWithinInterval, endOfDay } from "date-fns";

const PURPOSE_OPTIONS = [
    "Customer job",
    "Supplies",
    "Business travel",
    "Vehicle Maintenance",
    "Marketing",
    "Other"
];

const MileageTracking = () => {
    const { toast } = useToast();
    const [logs, setLogs] = useState<MileageLog[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [newLog, setNewLog] = useState<Partial<MileageLog>>({
        date: format(new Date(), "yyyy-MM-dd"),
        miles_driven: 0,
        purpose: "Customer job",
        is_business: true
    });

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [purposeFilter, setPurposeFilter] = useState("all");
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [mileageData, customerData] = await Promise.all([
                getSupabaseMileageLogs(),
                getSupabaseCustomers()
            ]);
            setLogs(mileageData);
            setCustomers(customerData);
        } catch (error) {
            console.error("Failed to load mileage data:", error);
            toast({ title: "Error", description: "Failed to load mileage logs.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleAddLog = async () => {
        if (!newLog.miles_driven || newLog.miles_driven <= 0) {
            toast({ title: "Invalid Input", description: "Please enter a valid mileage amount.", variant: "destructive" });
            return;
        }

        try {
            await upsertSupabaseMileageLog(newLog);
            toast({ title: "Success", description: "Mileage log entry added." });
            setIsAdding(false);
            setNewLog({
                date: format(new Date(), "yyyy-MM-dd"),
                miles_driven: 0,
                purpose: "Customer job",
                is_business: true
            });
            loadData();
        } catch (error) {
            console.error("Failed to add log:", error);
            toast({ title: "Error", description: "Failed to save mileage log.", variant: "destructive" });
        }
    };

    const handleDeleteLog = async (id: string) => {
        if (!confirm("Are you sure you want to delete this entry?")) return;
        try {
            await deleteSupabaseMileageLog(id);
            toast({ title: "Deleted", description: "Mileage log entry removed." });
            loadData();
        } catch (error) {
            console.error("Failed to delete log:", error);
            toast({ title: "Error", description: "Failed to delete log.", variant: "destructive" });
        }
    };

    // Calculations
    const stats = useMemo(() => {
        const now = new Date();
        const today = startOfDay(now);
        const month = startOfMonth(now);
        const year = startOfYear(now);

        let dailyTotal = 0;
        let monthlyTotal = 0;
        let yearlyTotal = 0;

        logs.forEach(log => {
            const logDate = new Date(log.date);
            const miles = Number(log.miles_driven) || 0;

            if (logDate >= today) dailyTotal += miles;
            if (logDate >= month) monthlyTotal += miles;
            if (logDate >= year) yearlyTotal += miles;
        });

        return { dailyTotal, monthlyTotal, yearlyTotal };
    }, [logs]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch =
                log.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (log as any).customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.start_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.end_location?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesPurpose = purposeFilter === "all" || log.purpose === purposeFilter;
            const matchesYear = log.date.startsWith(yearFilter);

            return matchesSearch && matchesPurpose && matchesYear;
        });
    }, [logs, searchTerm, purposeFilter, yearFilter]);

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text("Mileage Tracking Report", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), "MMMM d, yyyy")}`, 14, 30);
        doc.text(`Year: ${yearFilter}`, 14, 35);

        const tableData = filteredLogs.map(log => [
            log.date,
            log.miles_driven,
            log.purpose,
            (log as any).customerName || "-",
            log.start_location || "-",
            log.end_location || "-"
        ]);

        autoTable(doc, {
            startY: 45,
            head: [["Date", "Miles", "Purpose", "Customer", "Start", "End"]],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
        });

        doc.save(`mileage-report-${yearFilter}-${format(new Date(), "yyyyMMdd")}.pdf`);
    };

    const exportCSV = () => {
        const headers = ["Date", "Miles", "Purpose", "Customer", "Start", "End", "Odometer Start", "Odometer End", "Business"];
        const rows = filteredLogs.map(log => [
            log.date,
            log.miles_driven,
            log.purpose,
            (log as any).customerName || "",
            log.start_location || "",
            log.end_location || "",
            log.odometer_start || "",
            log.odometer_end || "",
            log.is_business ? "Yes" : "No"
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `mileage-export-${yearFilter}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-8 animate-fade-in">
            <PageHeader title="Mileage Tracking" subtitle="IRS-Ready Business Expense Reporting" />

            <div className="max-w-7xl mx-auto space-y-8 mt-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-zinc-900/50 border-zinc-800 p-6 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Calendar className="h-16 w-16" />
                        </div>
                        <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Today's Miles</p>
                        <h3 className="text-4xl font-bold mt-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            {stats.dailyTotal.toFixed(1)}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-2 italic font-mono uppercase">Calculated daily</p>
                    </Card>

                    <Card className="bg-zinc-900/50 border-zinc-800 p-6 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp className="h-16 w-16" />
                        </div>
                        <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">This Month</p>
                        <h3 className="text-4xl font-bold mt-2 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                            {stats.monthlyTotal.toFixed(1)}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-2 italic font-mono uppercase">Monthly cumulative</p>
                    </Card>

                    <Card className="bg-zinc-900/50 border-zinc-800 p-6 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Gauge className="h-16 w-16" />
                        </div>
                        <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">{yearFilter} Annual Total</p>
                        <h3 className="text-4xl font-bold mt-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {stats.yearlyTotal.toFixed(1)}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-2 italic font-mono uppercase">Tax reporting year</p>
                    </Card>
                </div>

                {/* Actions Bar (Responsive) */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="relative w-full sm:w-64 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                            <Input
                                placeholder="Search..."
                                className="bg-black/40 border-zinc-800 pl-10 h-10 ring-offset-zinc-900 focus-visible:ring-indigo-500 w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={purposeFilter} onValueChange={setPurposeFilter}>
                            <SelectTrigger className="w-full sm:w-40 bg-black/40 border-zinc-800 h-10">
                                <Filter className="h-4 w-4 mr-2 text-zinc-500" />
                                <SelectValue placeholder="Purpose" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                                <SelectItem value="all">All Purposes</SelectItem>
                                {PURPOSE_OPTIONS.map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                        <div className="flex items-center gap-2 grow sm:grow-0">
                            <Button
                                variant="outline"
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 flex-1 sm:flex-none"
                                onClick={exportCSV}
                            >
                                <Download className="h-4 w-4 mr-1 sm:mr-2" />
                                CSV
                            </Button>
                            <Button
                                variant="outline"
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 flex-1 sm:flex-none"
                                onClick={generatePDF}
                            >
                                <Printer className="h-4 w-4 mr-1 sm:mr-2" />
                                PDF
                            </Button>
                        </div>
                        <Button
                            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-500/20 w-full sm:w-auto"
                            onClick={() => setIsAdding(!isAdding)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            {isAdding ? "Cancel" : "Add Entry"}
                        </Button>
                    </div>
                </div>

                {/* Add Entry Form (Glassmorphism) */}
                {isAdding && (
                    <Card className="bg-zinc-900/60 border-zinc-800 p-4 md:p-8 backdrop-blur-2xl animate-in slide-in-from-top-4 duration-300 overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <Gauge className="h-5 w-5 text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-semibold">New Mileage Entry</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Date</Label>
                                <Input
                                    type="date"
                                    className="bg-black/40 border-zinc-800"
                                    value={newLog.date}
                                    onChange={(e) => setNewLog({ ...newLog, date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Miles Driven</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="0.0"
                                    className="bg-black/40 border-zinc-800"
                                    value={newLog.miles_driven || ""}
                                    onChange={(e) => setNewLog({ ...newLog, miles_driven: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Purpose</Label>
                                <Select
                                    value={newLog.purpose}
                                    onValueChange={(val) => setNewLog({ ...newLog, purpose: val })}
                                >
                                    <SelectTrigger className="bg-black/40 border-zinc-800">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800">
                                        {PURPOSE_OPTIONS.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Customer (Optional)</Label>
                                <Select
                                    value={newLog.customer_id || "none"}
                                    onValueChange={(val) => setNewLog({ ...newLog, customer_id: val === "none" ? undefined : val })}
                                >
                                    <SelectTrigger className="bg-black/40 border-zinc-800">
                                        <SelectValue placeholder="Select customer" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800">
                                        <SelectItem value="none">None</SelectItem>
                                        {customers.map(c => (
                                            <SelectItem key={c.id} value={c.id || ""}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-6">
                            <div className="space-y-2">
                                <Label className="text-zinc-400 italic">Start Location (Optional)</Label>
                                <Input
                                    placeholder="e.g. Office or Hub"
                                    className="bg-black/40 border-zinc-800"
                                    value={newLog.start_location || ""}
                                    onChange={(e) => setNewLog({ ...newLog, start_location: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400 italic">End Location (Optional)</Label>
                                <Input
                                    placeholder="e.g. Customer Address"
                                    className="bg-black/40 border-zinc-800"
                                    value={newLog.end_location || ""}
                                    onChange={(e) => setNewLog({ ...newLog, end_location: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
                            <Button
                                variant="ghost"
                                className="hover:bg-zinc-800 w-full sm:w-auto order-2 sm:order-1"
                                onClick={() => setIsAdding(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-500 px-8 w-full sm:w-auto order-1 sm:order-2"
                                onClick={handleAddLog}
                            >
                                Save Log
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Table Section (Responsive with horizontal scroll) */}
                <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-zinc-900/50">
                                <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                                    <TableHead className="text-zinc-400 font-medium whitespace-nowrap">Date</TableHead>
                                    <TableHead className="text-zinc-400 font-medium whitespace-nowrap">Miles</TableHead>
                                    <TableHead className="text-zinc-400 font-medium whitespace-nowrap">Purpose</TableHead>
                                    <TableHead className="text-zinc-400 font-medium whitespace-nowrap">Customer/Job</TableHead>
                                    <TableHead className="text-zinc-400 font-medium whitespace-nowrap">Route</TableHead>
                                    <TableHead className="text-zinc-400 font-medium text-right whitespace-nowrap">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-zinc-500 italic">
                                            Loading mileage logs...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-zinc-500 italic">
                                            No mileage logs found for the selected criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id} className="border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                                            <TableCell className="font-mono text-zinc-300 whitespace-nowrap">
                                                {format(new Date(log.date), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                <span className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded font-bold whitespace-nowrap">
                                                    {log.miles_driven} mi
                                                </span>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-2 w-2 rounded-full shrink-0 ${log.purpose === 'Customer job' ? 'bg-emerald-500' :
                                                        log.purpose === 'Supplies' ? 'bg-amber-500' : 'bg-blue-500'
                                                        }`} />
                                                    {log.purpose}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-zinc-400 max-w-[150px] truncate">
                                                {(log as any).customerName || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-[10px] sm:text-xs text-zinc-500 min-w-[120px]">
                                                    {log.start_location && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" /> {log.start_location}</span>}
                                                    {log.end_location && <span className="flex items-center gap-1 mt-1 truncate"><MapPin className="h-3 w-3 text-red-500/50 shrink-0" /> {log.end_location}</span>}
                                                    {!log.start_location && !log.end_location && "Manual entry"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-zinc-600 hover:text-red-400 hover:bg-red-400/10"
                                                    onClick={() => handleDeleteLog(log.id!)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>

            </div>
        </div>
    );
};

export default MileageTracking;
