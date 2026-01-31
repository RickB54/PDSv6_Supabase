import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from "recharts";
import {
    Receipt,
    Plus,
    Search,
    Download,
    Printer,
    Trash2,
    Calendar,
    Tag,
    Building,
    Wallet,
    TrendingUp,
    Filter,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle
} from "lucide-react";
import { format } from "date-fns";
import {
    TaxExpense,
    getSupabaseTaxExpenses,
    upsertSupabaseTaxExpense,
    deleteSupabaseTaxExpense
} from "@/lib/supa-data";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const TAX_CATEGORIES = [
    "Supplies",
    "Equipment",
    "Vehicle (Gas/Maint)",
    "Marketing",
    "Rent & Utilities",
    "Insurance",
    "Legal & Professional",
    "Payroll Taxes",
    "Travel",
    "Software & Subscriptions",
    "Meals & Entertainment",
    "Other"
];

const PAYMENT_METHODS = [
    "Company Credit Card",
    "Bank Transfer",
    "Cash",
    "Business Check",
    "Personal (Reimbursement)"
];

const COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"
];

const Taxes = () => {
    const [expenses, setExpenses] = useState<TaxExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");

    // New Expense State
    const [newExpense, setNewExpense] = useState<Partial<TaxExpense>>({
        date: format(new Date(), "yyyy-MM-dd"),
        amount: 0,
        category: TAX_CATEGORIES[0],
        payment_method: PAYMENT_METHODS[0],
        is_deductible: true,
        tags: []
    });

    useEffect(() => {
        loadExpenses();
    }, [selectedYear]);

    const loadExpenses = async () => {
        setLoading(true);
        try {
            const data = await getSupabaseTaxExpenses(selectedYear);
            setExpenses(data);
        } catch (error) {
            console.error("Load expenses error:", error);
            toast.error("Failed to load tax expenses");
        } finally {
            setLoading(false);
        }
    };

    const handleAddExpense = async () => {
        if (!newExpense.amount || newExpense.amount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        if (!newExpense.category) {
            toast.error("Please select a category");
            return;
        }

        try {
            await upsertSupabaseTaxExpense(newExpense);
            toast.success("Expense added successfully");
            setIsAdding(false);
            setNewExpense({
                date: format(new Date(), "yyyy-MM-dd"),
                amount: 0,
                category: TAX_CATEGORIES[0],
                payment_method: PAYMENT_METHODS[0],
                is_deductible: true,
                tags: []
            });
            loadExpenses();
        } catch (error) {
            console.error("Add expense error:", error);
            toast.error("Failed to save expense");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this expense?")) return;
        try {
            await deleteSupabaseTaxExpense(id);
            toast.success("Expense deleted");
            loadExpenses();
        } catch (error) {
            toast.error("Failed to delete expense");
        }
    };

    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => {
            const matchesSearch =
                (exp.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                (exp.notes?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                (exp.category.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = categoryFilter === "all" || exp.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [expenses, searchTerm, categoryFilter]);

    const stats = useMemo(() => {
        const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const deductible = filteredExpenses.filter(e => e.is_deductible).reduce((sum, exp) => sum + exp.amount, 0);
        const nonDeductible = total - deductible;

        const byCategory = TAX_CATEGORIES.map((cat, idx) => ({
            name: cat,
            value: filteredExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0),
            color: COLORS[idx % COLORS.length]
        })).filter(c => c.value > 0);

        return { total, deductible, nonDeductible, byCategory };
    }, [filteredExpenses]);

    const exportCSV = () => {
        const headers = ["Date", "Vendor", "Amount", "Category", "Method", "Deductible", "Notes"];
        const rows = filteredExpenses.map(exp => [
            exp.date,
            exp.vendor || "",
            exp.amount,
            exp.category,
            exp.payment_method || "",
            exp.is_deductible ? "Yes" : "No",
            exp.notes || ""
        ]);

        const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tax-expenses-${selectedYear}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(`Tax Expense Report - ${selectedYear}`, 14, 20);
        doc.setFontSize(12);
        doc.text(`Total: $${stats.total.toFixed(2)} | Deductible: $${stats.deductible.toFixed(2)}`, 14, 30);

        const tableData = filteredExpenses.map(exp => [
            exp.date,
            exp.vendor || "",
            exp.category,
            `$${exp.amount.toFixed(2)}`,
            exp.is_deductible ? "Yes" : "No"
        ]);

        autoTable(doc, {
            startY: 40,
            head: [["Date", "Vendor", "Category", "Amount", "Deductible"]],
            body: tableData,
        });

        doc.save(`Tax_Report_${selectedYear}.pdf`);
    };

    return (
        <div className="min-h-screen bg-black">
            <PageHeader title={`Tax Tracking ${selectedYear}`} />

            <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">

                {/* Navigation & Year Selector */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-zinc-400 hover:text-white"
                            onClick={() => setSelectedYear(prev => prev - 1)}
                        >
                            <ChevronLeft />
                        </Button>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                            {selectedYear} Fiscal Year
                        </h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-zinc-400 hover:text-white"
                            onClick={() => setSelectedYear(prev => prev + 1)}
                        >
                            <ChevronRight />
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            onClick={() => setIsAdding(!isAdding)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                        >
                            {isAdding ? "Cancel" : <><Plus className="h-4 w-4 mr-2" /> Add Expense</>}
                        </Button>
                        <Button variant="outline" onClick={exportCSV} className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">
                            <Download className="h-4 w-4 mr-2" /> CSV
                        </Button>
                        <Button variant="outline" onClick={generatePDF} className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">
                            <Printer className="h-4 w-4 mr-2" /> PDF
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 bg-zinc-900/50 border-zinc-800 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <TrendingUp className="h-16 w-16" />
                        </div>
                        <Label className="text-zinc-400 uppercase tracking-widest text-xs font-bold">Year to Date Total</Label>
                        <h3 className="text-4xl font-bold mt-2 text-white">${stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        <p className="text-xs text-zinc-500 mt-2 italic">Total business expenditure recorded</p>
                    </Card>

                    <Card className="p-6 bg-emerald-500/5 border-emerald-500/20 backdrop-blur-xl group">
                        <div className="flex justify-between items-start">
                            <div>
                                <Label className="text-emerald-500/70 uppercase tracking-widest text-xs font-bold">Tax Deductible</Label>
                                <h3 className="text-4xl font-bold mt-2 text-emerald-400">${stats.deductible.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                            </div>
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </div>
                        </div>
                        <div className="mt-4 w-full bg-zinc-800 rounded-full h-1.5">
                            <div
                                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000"
                                style={{ width: stats.total > 0 ? `${(stats.deductible / stats.total) * 100}%` : '0%' }}
                            />
                        </div>
                    </Card>

                    <Card className="p-6 bg-red-500/5 border-red-500/20 backdrop-blur-xl group">
                        <div className="flex justify-between items-start">
                            <div>
                                <Label className="text-red-500/70 uppercase tracking-widest text-xs font-bold">Non-Deductible</Label>
                                <h3 className="text-4xl font-bold mt-2 text-red-400">${stats.nonDeductible.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                            </div>
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <XCircle className="h-5 w-5 text-red-500" />
                            </div>
                        </div>
                        <div className="mt-4 w-full bg-zinc-800 rounded-full h-1.5">
                            <div
                                className="bg-red-500 h-1.5 rounded-full transition-all duration-1000"
                                style={{ width: stats.total > 0 ? `${(stats.nonDeductible / stats.total) * 100}%` : '0%' }}
                            />
                        </div>
                    </Card>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6 bg-zinc-900/40 border-zinc-800 backdrop-blur-xl">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Filter className="h-4 w-4 text-indigo-400" /> Category Breakdown
                        </h3>
                        <div className="h-[300px] w-full">
                            {stats.byCategory.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.byCategory}
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.byCategory.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-zinc-500 italic">No data to display</div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6 bg-zinc-900/40 border-zinc-800 backdrop-blur-xl">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-emerald-400" /> Monthly Spending Pattern
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={
                                    Array.from({ length: 12 }, (_, i) => ({
                                        name: format(new Date(selectedYear, i, 1), "MMM"),
                                        amount: filteredExpenses
                                            .filter(e => new Date(e.date).getMonth() === i)
                                            .reduce((sum, e) => sum + e.amount, 0)
                                    }))
                                }>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Add Expense Form */}
                {isAdding && (
                    <Card className="p-6 md:p-8 bg-zinc-900/60 border-zinc-800 backdrop-blur-2xl animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <Receipt className="h-5 w-5 text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold">New Tax Expense</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Date *</Label>
                                <Input
                                    type="date"
                                    className="bg-black/40 border-zinc-800 focus:border-indigo-500"
                                    value={newExpense.date}
                                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Amount ($) *</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    className="bg-black/40 border-zinc-800 focus:border-indigo-500"
                                    value={newExpense.amount || ""}
                                    onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Category *</Label>
                                <Select
                                    value={newExpense.category}
                                    onValueChange={(val) => setNewExpense({ ...newExpense, category: val })}
                                >
                                    <SelectTrigger className="bg-black/40 border-zinc-800">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                        {TAX_CATEGORIES.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Vendor / Payee</Label>
                                <Input
                                    placeholder="e.g. Amazon, Fuel Depot"
                                    className="bg-black/40 border-zinc-800 focus:border-indigo-500"
                                    value={newExpense.vendor || ""}
                                    onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Payment Method</Label>
                                <Select
                                    value={newExpense.payment_method}
                                    onValueChange={(val) => setNewExpense({ ...newExpense, payment_method: val })}
                                >
                                    <SelectTrigger className="bg-black/40 border-zinc-800">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                        {PAYMENT_METHODS.map(method => (
                                            <SelectItem key={method} value={method}>{method}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Deductible?</Label>
                                <div className="flex items-center gap-4 h-10 px-4 bg-black/20 rounded-md border border-zinc-800">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="deductible"
                                            checked={newExpense.is_deductible === true}
                                            onChange={() => setNewExpense({ ...newExpense, is_deductible: true })}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-zinc-300">Yes</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="deductible"
                                            checked={newExpense.is_deductible === false}
                                            onChange={() => setNewExpense({ ...newExpense, is_deductible: false })}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-zinc-300">No</span>
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Notes / Receipt Link</Label>
                                <Input
                                    placeholder="Reference or URL"
                                    className="bg-black/40 border-zinc-800 focus:border-indigo-500"
                                    value={newExpense.notes || ""}
                                    onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="ghost" className="hover:bg-zinc-800" onClick={() => setIsAdding(false)}>Cancel</Button>
                            <Button onClick={handleAddExpense} className="bg-indigo-600 hover:bg-indigo-500 px-8">Save Record</Button>
                        </div>
                    </Card>
                )}

                {/* Filters & Search */}
                <div className="flex flex-wrap items-center gap-4 justify-between bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Filter by vendor, note..."
                            className="bg-black/40 border-zinc-800 pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-48 bg-black/40 border-zinc-800">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                <SelectItem value="all">All Categories</SelectItem>
                                {TAX_CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Expenses Table */}
                <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-zinc-900/50">
                                <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                                    <TableHead className="text-zinc-400 font-medium">Date</TableHead>
                                    <TableHead className="text-zinc-400 font-medium">Vendor/Description</TableHead>
                                    <TableHead className="text-zinc-400 font-medium">Category</TableHead>
                                    <TableHead className="text-zinc-400 font-medium">Amount</TableHead>
                                    <TableHead className="text-zinc-400 font-medium text-center">Deductible</TableHead>
                                    <TableHead className="text-zinc-400 font-medium text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20 text-zinc-500 italic">
                                            Loading tax records...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredExpenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20 text-zinc-500 italic">
                                            No tax expenses found for {selectedYear}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredExpenses.map((exp) => (
                                        <TableRow key={exp.id} className="border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                                            <TableCell className="font-mono text-zinc-400 text-sm">
                                                {format(new Date(exp.date), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-zinc-200">{exp.vendor || "Direct Expense"}</span>
                                                    <span className="text-xs text-zinc-500 line-clamp-1">{exp.notes || "No notes"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                    {exp.category}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-bold text-zinc-200">
                                                ${exp.amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {exp.is_deductible ? (
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                                                ) : (
                                                    <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-zinc-600 hover:text-red-400 hover:bg-red-400/10"
                                                    onClick={() => handleDelete(exp.id!)}
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

export default Taxes;
