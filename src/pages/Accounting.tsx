import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Pencil, Trash2, Save, X, ChevronDown, ChevronUp,
  Download, Upload, RefreshCw, TrendingUp, Search,
  Printer, TrendingDown, DollarSign, Package, HelpCircle,
  CheckCircle
} from "lucide-react";
import { getInvoices, getExpenses, upsertExpense, deleteExpense } from "@/lib/db";
import { getReceivables, upsertReceivable, deleteReceivable, Receivable } from "@/lib/receivables";
import { getSupabaseCustomers, getSupabaseTaxExpenses, getSupabaseInvoices } from "@/lib/supa-data";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import localforage from "localforage";
import { getAllCategoryColors } from "@/lib/categoryColors";
import { getInventoryTotals, InventoryTotals } from "@/lib/inventory-totals";
import { useDemoMode } from "@/contexts/DemoContext";

interface Invoice {
  id: string;
  total: number;
  createdAt: string;
  date?: string;
  invoiceNumber?: string;
  paidAmount?: number;
  paymentStatus?: "unpaid" | "partially-paid" | "paid";
  tipAmount?: number;
  customerName?: string;
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  category?: string;
  createdAt: string;
}

const DEFAULT_CATEGORIES = {
  expense: ["Supplies", "Equipment", "Marketing", "Rent", "Insurance", "Utilities", "Payroll", "Maintenance", "Travel", "Other"],
  income: ["Service", "Product", "Investment", "Other"]
};

const Accounting = () => {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [totalSpent, setTotalSpent] = useState(0);
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [weeklyRevenue, setWeeklyRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [showDeleteExpense, setShowDeleteExpense] = useState(false);
  const [showDeleteNotes, setShowDeleteNotes] = useState(false);

  const [deleteItemState, setDeleteItemState] = useState<{ open: boolean, type: 'income' | 'expense', id: string }>({ open: false, type: 'income', id: '' });
  const [editItemState, setEditItemState] = useState<{ open: boolean, type: 'income' | 'expense', id: string, amount: string }>({ open: false, type: 'income', id: '', amount: '' });
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);

  const [dateFilter, setDateFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [expenseList, setExpenseList] = useState<Expense[]>([]);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [incomeList, setIncomeList] = useState<Receivable[]>([]);
  const [ledgerSortBy, setLedgerSortBy] = useState<"date" | "amount" | "category" | "updated">("date");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});

  const [incomeAmount, setIncomeAmount] = useState<string>("");
  const [incomeCategory, setIncomeCategory] = useState<string>("");
  const [incomeDescription, setIncomeDescription] = useState<string>("");
  const [incomeDate, setIncomeDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [incomeCustomer, setIncomeCustomer] = useState<string>("");
  const [incomeMethod, setIncomeMethod] = useState<string>("cash");
  const [customers, setCustomers] = useState<any[]>([]);

  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"income" | "expense">("income");

  const [inventoryTotals, setInventoryTotals] = useState<InventoryTotals>({
    chemicals: 0,
    materials: 0,
    tools: 0,
    total: 0,
    itemCount: { chemicals: 0, materials: 0, tools: 0, total: 0 }
  });

  const { isDemoMode } = useDemoMode();
  const [expenseBreakdown, setExpenseBreakdown] = useState<Record<string, number>>({});

  const loadData = async () => {
    try {
      // Use getSupabaseInvoices so tipAmount (from VIRTUAL_TIP) is parsed correctly
      const invoices = await getSupabaseInvoices();
      const expensesData = await getExpenses<Expense>();
      const incomes = await getReceivables();
      const invTotals = await getInventoryTotals();
      
      setExpenseList(expensesData);
      setInvoiceList(invoices);
      setIncomeList(incomes as Receivable[]);
      setInventoryTotals(invTotals);

      const now = new Date();
      const today = now.toDateString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      let daily = 0, weekly = 0, monthly = 0, totalRev = 0;

      const paidInvoices = invoices.filter(inv => {
        const isPaid = inv.paymentStatus === 'paid' || (inv.paidAmount || 0) > 0;
        if (!isPaid) return false;
        // Exclude Generic Customer test data
        if ((inv as any).customerName === 'Generic Customer' || (inv as any).customer_name === 'Generic Customer' || (inv as any).customerName === 'TEST Customer' || (inv as any).customer_name === 'TEST Customer') return false;
        return true;
      });
      
      paidInvoices.forEach(inv => {
        const tipAmt = (inv as any).tipAmount || 0;
        const rawAmt = inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0);
        // If paidAmount already exceeds invoice total, tip is embedded in paidAmount.
        // Otherwise, tip was stored separately and must be added to get true total received.
        const totalReceived = rawAmt + (rawAmt <= inv.total && tipAmt > 0 ? tipAmt : 0);
        const d = new Date(inv.createdAt);
        if (d.toDateString() === today) daily += totalReceived;
        if (d >= startOfWeek) weekly += totalReceived;
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) monthly += totalReceived;
        totalRev += totalReceived;
      });

      incomes.forEach(inc => {
        const amt = inc.amount || 0;
        // Exclude Generic Customer test data
        if (inc.customerName === 'Generic Customer' || inc.customerName === 'TEST Customer') return;
        
        const d = new Date(inc.date || inc.createdAt);
        if (d.toDateString() === today) daily += amt;
        if (d >= startOfWeek) weekly += amt;
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) monthly += amt;
        totalRev += amt;
      });

      // Apply dateFilter to compute filtered totalRevenue for the break-even display
      const getInvoiceTotalReceived = (inv: Invoice) => {
        const tipA = (inv as any).tipAmount || 0;
        const raw = inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0);
        // If paidAmount already exceeds invoice total, tip is embedded.
        // Otherwise add the separately-stored tip to get true total received.
        return raw + (raw <= inv.total && tipA > 0 ? tipA : 0);
      };

      let filteredTotal = 0;
      if (dateFilter === 'all') {
        filteredTotal = totalRev;
      } else {
        const filterDate = (d: Date) => {
          if (dateFilter === 'daily') return d.toDateString() === today;
          if (dateFilter === 'weekly') return d >= startOfWeek;
          if (dateFilter === 'monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          if (dateFilter === 'yearly') return d.getFullYear() === now.getFullYear();
          return true;
        };
        paidInvoices.forEach(inv => {
          if (filterDate(new Date(inv.createdAt))) filteredTotal += getInvoiceTotalReceived(inv);
        });
        incomes.forEach(inc => {
          if (inc.customerName === 'Generic Customer' || inc.customerName === 'TEST Customer') return;
          if (filterDate(new Date(inc.date || inc.createdAt))) filteredTotal += (inc.amount || 0);
        });
      }

      setDailyRevenue(daily);
      setWeeklyRevenue(weekly);
      setMonthlyRevenue(monthly);
      setTotalRevenue(filteredTotal);

      const inventoryCategories = ["Supplies", "Equipment", "Chemicals", "Inventory"];
      const manualExpenses = expensesData.filter(e => {
        const desc = (e.description || '').toUpperCase();
        const cat = (e.category || '').toLowerCase();
        
        const isTaxPrefix = desc.startsWith('[TAX]');
        const isInventoryCategory = inventoryCategories.some(ic => cat === ic.toLowerCase());
        
        return !isTaxPrefix && !isInventoryCategory;
      });

      const totalManualSpent = manualExpenses.reduce((sum, e) => sum + e.amount, 0);
      setTotalSpent(totalManualSpent);

      const breakdown: Record<string, number> = {};
      manualExpenses.forEach(e => {
        const cat = e.category || 'Other';
        breakdown[cat] = (breakdown[cat] || 0) + e.amount;
      });
      setExpenseBreakdown(breakdown);

    } catch (err) {
      console.error('Accounting loadData error:', err);
    }
  };

  useEffect(() => {
    loadData();
    loadCustomCategories();
    getSupabaseCustomers().then(setCustomers);
  }, [dateFilter, dateRange]);

  const loadCustomCategories = async () => {
    const cats = await localforage.getItem<string[]>("customCategories") || [];
    setCustomCategories(cats);
    const colors = await getAllCategoryColors();
    setCategoryColors(colors);
  };

  const handleConfirmDeleteItem = async () => {
    const { type, id } = deleteItemState;
    if (!id) return;
    try {
      if (type === 'income') {
        await deleteReceivable(id);
        toast({ title: 'Income Deleted' });
      } else {
        await deleteExpense(id);
        toast({ title: 'Expense Deleted' });
      }
      loadData();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeleteItemState(prev => ({ ...prev, open: false }));
    }
  };

  const handleSaveEditItem = async () => {
    const { type, id, amount } = editItemState;
    if (!id || !amount || isNaN(parseFloat(amount))) return;

    try {
      if (type === 'income') {
        const income = incomeList.find(i => i.id === id);
        if (income) {
          await upsertReceivable({ ...income, amount: parseFloat(amount) });
          toast({ title: 'Income Updated' });
        }
      } else {
        const expense = expenseList.find(e => e.id === id);
        if (expense) {
          await upsertExpense({ ...expense, amount: parseFloat(amount) } as any);
          toast({ title: 'Expense Updated' });
        }
      }
      loadData();
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setEditItemState(prev => ({ ...prev, open: false }));
    }
  };

  const calculateProfit = () => {
    return totalRevenue - (totalSpent + inventoryTotals.total);
  };

  const handleAddExpense = async () => {
    const expense = parseFloat(expenses) || 0;
    if (expense === 0) return;

    await upsertExpense({
      amount: expense,
      category: expenseCategory || "General",
      description: expenseDesc || "Expense",
      createdAt: new Date().toISOString(),
    } as any);

    setExpenses("");
    setExpenseDesc("");
    setExpenseCategory("");
    toast({
      title: "Expense Added",
      description: `$${expense.toFixed(2)} added to total expenses.`,
    });
    loadData();
  };

  const handleAddIncome = async () => {
    const amt = parseFloat(incomeAmount) || 0;
    if (amt === 0) return;
    await upsertReceivable({
      amount: amt,
      category: incomeCategory || "General",
      description: incomeDescription || "Income",
      date: incomeDate,
      customerName: incomeCustomer || undefined,
      paymentMethod: incomeMethod || undefined,
    });
    setIncomeAmount("");
    setIncomeCategory("");
    setIncomeDescription("");
    setIncomeMethod("");
    loadData();
    toast({ title: "Income Added", description: `$${amt.toFixed(2)} recorded as income.` });
  };

  const handleCreateNewCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: "Error", description: "Please enter a category name", variant: "destructive" });
      return;
    }

    const trimmedName = newCategoryName.trim();
    const allExistingCategories = [
      ...DEFAULT_CATEGORIES.income,
      ...DEFAULT_CATEGORIES.expense,
      ...customCategories
    ];

    if (allExistingCategories.includes(trimmedName)) {
      toast({ title: "Error", description: "Category already exists", variant: "destructive" });
      return;
    }

    const updated = [...customCategories, trimmedName];
    await localforage.setItem("customCategories", updated);
    setCustomCategories(updated);

    const { getCategoryColor } = await import("@/lib/categoryColors");
    const color = await getCategoryColor(trimmedName);
    setCategoryColors(prev => ({ ...prev, [trimmedName]: color }));

    if (newCategoryType === "income") {
      setIncomeCategory(trimmedName);
    } else {
      setExpenseCategory(trimmedName);
    }

    setNewCategoryName("");
    setShowNewCategoryDialog(false);
    toast({ title: "Category Created", description: `"${trimmedName}" has been added` });
  };

  const generatePDF = (action: 'save' | 'print') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(24);
    doc.setTextColor(30, 41, 59);
    doc.text("Accounting & Ledger Report", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} | Filter: ${dateFilter.toUpperCase()}`, 14, 26);

    const netProfit = calculateProfit();
    const netColor = netProfit >= 0 ? [22, 101, 52] : [153, 27, 27];
    
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 38, pageWidth - 28, 60, 2, 2, 'FD');

    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text("CURRENT FINANCIAL POSITION", 20, 48);

    doc.setFontSize(20);
    doc.setTextColor(netColor[0], netColor[1], netColor[2]);
    doc.text(`$${Math.abs(netProfit).toFixed(2)}`, 20, 62);
    
    doc.setFontSize(10);
    doc.text(netProfit >= 0 ? "SURPLUS" : "DEFICIT", 20, 68);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Operational Revenue: $${totalRevenue.toFixed(2)}`, 20, 78);
    doc.text(`Asset Investment: $${inventoryTotals.total.toFixed(2)}`, 20, 84);

    if (action === 'save') {
      doc.save(`accounting-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: "PDF Saved", description: "Report downloaded successfully." });
    } else {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    }
  };

  const profit = calculateProfit();

  const filteredAndSortedInvoices = useMemo(() => {
    return invoiceList
      .filter(inv => {
        const isPaid = inv.paymentStatus === 'paid' || (inv.paidAmount || 0) > 0;
        if (!isPaid) return false;
        
        const d = new Date(inv.createdAt);
        const now = new Date();
        const today = now.toDateString();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        let show = true;
        if (dateFilter === 'daily') show = d.toDateString() === today;
        else if (dateFilter === 'weekly') show = d >= weekAgo;
        else if (dateFilter === 'monthly') show = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        else if (dateFilter === 'yearly') show = d.getFullYear() === now.getFullYear();
        
        if (dateRange.from && d < new Date(dateRange.from.setHours(0,0,0,0))) show = false;
        if (dateRange.to && d > new Date(dateRange.to.setHours(23,59,59,999))) show = false;
        
        if (ledgerSearch) {
          const search = ledgerSearch.toLowerCase();
          const matches = String(inv.invoiceNumber || '').toLowerCase().includes(search) || 
                          String(inv.total).includes(search);
          if (!matches) show = false;
        }
        
        return show;
      })
      .sort((a, b) => {
        if (ledgerSortBy === 'amount') return b.total - a.total;
        if (ledgerSortBy === 'category') return ("Invoice").localeCompare("Invoice");
        if (ledgerSortBy === 'updated') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [invoiceList, dateFilter, dateRange, ledgerSearch, ledgerSortBy]);

  const filteredAndSortedIncomes = useMemo(() => {
    return incomeList
      .filter(inc => {
        const d = new Date(inc.date || inc.createdAt);
        const now = new Date();
        const today = now.toDateString();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        let show = true;
        if (dateFilter === 'daily') show = d.toDateString() === today;
        else if (dateFilter === 'weekly') show = d >= weekAgo;
        else if (dateFilter === 'monthly') show = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        else if (dateFilter === 'yearly') show = d.getFullYear() === now.getFullYear();
        
        if (dateRange.from && d < new Date(dateRange.from.setHours(0,0,0,0))) show = false;
        if (dateRange.to && d > new Date(dateRange.to.setHours(23,59,59,999))) show = false;
        
        if (ledgerSearch) {
          const search = ledgerSearch.toLowerCase();
          const matches = (inc.description || '').toLowerCase().includes(search) || 
                          (inc.category || '').toLowerCase().includes(search) ||
                          (inc.customerName || '').toLowerCase().includes(search) ||
                          String(inc.amount).includes(search);
          if (!matches) show = false;
        }
        
        return show;
      })
      .sort((a, b) => {
        if (ledgerSortBy === 'amount') return (b.amount || 0) - (a.amount || 0);
        if (ledgerSortBy === 'category') return (a.category || "").localeCompare(b.category || "");
        if (ledgerSortBy === 'updated') return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
        return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
      });
  }, [incomeList, dateFilter, dateRange, ledgerSearch, ledgerSortBy]);

  const filteredAndSortedExpenses = useMemo(() => {
    return expenseList
      .filter(exp => {
        const d = new Date(exp.createdAt);
        const now = new Date();
        const today = now.toDateString();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        let show = true;
        if (dateFilter === 'daily') show = d.toDateString() === today;
        else if (dateFilter === 'weekly') show = d >= weekAgo;
        else if (dateFilter === 'monthly') show = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        else if (dateFilter === 'yearly') show = d.getFullYear() === now.getFullYear();
        
        if (dateRange.from && d < new Date(dateRange.from.setHours(0,0,0,0))) show = false;
        if (dateRange.to && d > new Date(dateRange.to.setHours(23,59,59,999))) show = false;
        
        if (ledgerSearch) {
          const search = ledgerSearch.toLowerCase();
          const matches = (exp.description || '').toLowerCase().includes(search) || 
                          (exp.category || '').toLowerCase().includes(search) ||
                          String(exp.amount).includes(search);
          if (!matches) show = false;
        }
        
        return show;
      })
      .sort((a, b) => {
        if (ledgerSortBy === 'amount') return b.amount - a.amount;
        if (ledgerSortBy === 'category') return (a.category || "").localeCompare(b.category || "");
        if (ledgerSortBy === 'updated') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [expenseList, dateFilter, dateRange, ledgerSearch, ledgerSortBy]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <PageHeader title="Accounting" />

      <main className="container mx-auto px-4 py-6 max-w-6xl w-full">
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h1 className="text-3xl font-bold text-foreground">Accounting</h1>
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="daily">Today</SelectItem>
                  <SelectItem value="weekly">This Week</SelectItem>
                  <SelectItem value="monthly">This Month</SelectItem>
                  <SelectItem value="yearly">This Year</SelectItem>
                </SelectContent>
              </Select>
              <DateRangeFilter value={dateRange} onChange={setDateRange} storageKey="accounting-range" />
              <Button variant="outline" onClick={() => generatePDF('save')}>
                <Save className="h-4 w-4 mr-2" />
                Save PDF
              </Button>
            </div>
          </div>

          <Card className={`p-6 border-none text-white ${profit >= 0 ? "bg-emerald-600 shadow-xl shadow-emerald-900/20" : "bg-red-600 shadow-xl shadow-red-900/20"}`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold opacity-90">Profit/Loss Summary</h2>
              <button 
                className="opacity-70 hover:opacity-100 transition-opacity"
                onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: 'net-profit-explanation' }))}
                title="How is this calculated?"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">
                ${Math.abs(profit).toFixed(2)}
              </span>
              <span className="opacity-80 font-medium uppercase tracking-wider text-xs">
                {profit > 0 ? 'Profit' : profit < 0 ? 'Loss' : 'Break-Even'}
              </span>
            </div>
            <p className="text-[10px] opacity-70 mt-2 italic">Calculated as: (Cash Revenue) - (Manual Expenses + Inventory Valuation)</p>
          </Card>

          <Card className="p-6 bg-gradient-card border-border relative overflow-hidden">
            <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <CheckCircle className="h-3 w-3" /> Auto-Sync Active
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Revenue Tracking (Invoices + Income)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-background/50 rounded-lg border border-border">
                <Label className="text-muted-foreground">Daily Revenue</Label>
                <p className="text-3xl font-bold text-foreground mt-2">${dailyRevenue.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-background/50 rounded-lg border border-border">
                <Label className="text-muted-foreground">Weekly Revenue</Label>
                <p className="text-3xl font-bold text-foreground mt-2">${weeklyRevenue.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-background/50 rounded-lg border border-border">
                <Label className="text-muted-foreground">Monthly Revenue</Label>
                <p className="text-3xl font-bold text-foreground mt-2">${monthlyRevenue.toFixed(2)}</p>
              </div>
            </div>
            <p className="mt-4 text-[10px] text-zinc-500 flex items-center gap-2 italic">
              <HelpCircle className="h-3 w-3 text-emerald-500" />
              Tip: Payments recorded in the "Invoicing" page are added here automatically. Do not manually add them as income to avoid double-counting.
            </p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-500" />
              Break-Even Analysis
              <button 
                className="text-blue-400 hover:text-blue-600 transition-colors"
                onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: 'break-even-analysis' }))}
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Total Business Investment</Label>
                <p className="text-3xl font-bold text-red-500">
                  ${(inventoryTotals.total + totalSpent).toFixed(2)}
                </p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Inventory (Assets):</span>
                    <span className="font-medium">${inventoryTotals.total.toFixed(2)}</span>
                  </div>
                  <div className="pl-3 space-y-0.5 border-l-2 border-primary/20 ml-1 mt-1 mb-2">
                    <div className="flex justify-between text-[10px] opacity-80">
                      <span>• Chemicals:</span>
                      <span>${inventoryTotals.chemicals.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] opacity-80">
                      <span>• Supplies:</span>
                      <span>${inventoryTotals.materials.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] opacity-80">
                      <span>• Equipment:</span>
                      <span>${inventoryTotals.tools.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Non-Inventory Expenses:</span>
                    <span className="font-medium">${totalSpent.toFixed(2)}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 italic pl-3 mt-1 leading-tight">
                    * Inventory (Pools, Tools, etc.) are tracked separately from overhead to avoid double-counting.
                  </p>
                  <div className="pt-1 border-t border-muted-foreground/20 flex justify-between font-semibold">
                    <span>Total Investment:</span>
                    <span>${(inventoryTotals.total + totalSpent).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Total Service Revenue</Label>
                <p className="text-3xl font-bold text-green-500">
                  ${totalRevenue.toFixed(2)}
                </p>
              </div>

              <div className="space-y-2">
                {(() => {
                  const currentTotalRevenue = totalRevenue;
                  const totalInvestment = inventoryTotals.total + totalSpent;
                  const remaining = totalInvestment - currentTotalRevenue;
                  const percentRecovered = totalInvestment > 0 ? (currentTotalRevenue / totalInvestment) * 100 : 0;
                  const isBreakEven = remaining <= 0;

                  return (
                    <>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                        {isBreakEven ? 'Profit Beyond All Costs' : 'Remaining to Break Even'}
                      </Label>
                      <p className={`text-3xl font-bold ${isBreakEven ? 'text-green-500' : 'text-orange-500'}`}>
                        ${Math.abs(remaining).toFixed(2)}
                      </p>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full transition-all ${isBreakEven ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(percentRecovered, 100)}%` }} />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </Card>

          <Accordion type="multiple" defaultValue={["ledger"]} className="space-y-4">
            <AccordionItem value="income" className="border-none">
              <Card className="bg-gradient-card border-border">
                <AccordionTrigger className="px-6 pt-6 pb-4 hover:no-underline">
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    Add Income (Receivables)
                  </h2>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Amount</Label>
                        <Input type="number" value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} placeholder="0.00" />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select
                          value={incomeCategory}
                          onValueChange={(value) => {
                            if (value === "___CREATE_NEW___") {
                              setNewCategoryType("income");
                              setShowNewCategoryDialog(true);
                            } else {
                              setIncomeCategory(value);
                            }
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {DEFAULT_CATEGORIES.income.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            {customCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            <SelectItem value="___CREATE_NEW___" className="text-primary font-semibold border-t mt-1 pt-1">
                              + Create New Category
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Input value={incomeDescription} onChange={(e) => setIncomeDescription(e.target.value)} placeholder="Optional description" />
                      </div>
                      <div>
                        <Label>Date</Label>
                        <Input type="date" value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Customer (optional)</Label>
                        <Select value={incomeCustomer} onValueChange={setIncomeCustomer}>
                          <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value=" ">None</SelectItem>
                            {customers.map(c => (
                              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Payment Method (optional)</Label>
                        <Select value={incomeMethod} onValueChange={setIncomeMethod}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="transfer">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Button onClick={handleAddIncome} className="bg-gradient-hero">Add Income</Button>
                    </div>
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>

            <AccordionItem value="expenses" className="border-none">
              <Card className="bg-gradient-card border-border">
                <AccordionTrigger className="px-6 pt-6 pb-4 hover:no-underline">
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <TrendingDown className="h-6 w-6 text-primary" />
                    Expense Tracking
                  </h2>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Amount</Label>
                        <Input type="number" value={expenses} onChange={(e) => setExpenses(e.target.value)} placeholder="0.00" />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select
                          value={expenseCategory}
                          onValueChange={(value) => {
                            if (value === "___CREATE_NEW___") {
                              setNewCategoryType("expense");
                              setShowNewCategoryDialog(true);
                            } else {
                              setExpenseCategory(value);
                            }
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {DEFAULT_CATEGORIES.expense.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            {customCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            <SelectItem value="___CREATE_NEW___" className="text-primary font-semibold border-t mt-1 pt-1">
                              + Create New Category
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Description</Label>
                        <Input value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="Expense description" />
                      </div>
                    </div>
                    <div>
                      <Button onClick={handleAddExpense} className="bg-gradient-hero">Add Expense</Button>
                    </div>
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>

            <AccordionItem value="ledger" className="border-none">
              <Card className="bg-gradient-card border-border">
                <AccordionTrigger className="px-6 pt-6 pb-4 hover:no-underline">
                  <h2 className="text-2xl font-bold text-foreground">Transaction Ledger</h2>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search transactions..." 
                          className="pl-9 pr-10"
                          value={ledgerSearch}
                          onChange={(e) => setLedgerSearch(e.target.value)}
                        />
                        {ledgerSearch && (
                          <button 
                            onClick={() => setLedgerSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2 items-center">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Sort By:</Label>
                        <Select value={ledgerSortBy} onValueChange={(v: any) => setLedgerSortBy(v)}>
                          <SelectTrigger className="w-[140px] h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="date">Date (Newest)</SelectItem>
                            <SelectItem value="amount">Amount (Highest)</SelectItem>
                            <SelectItem value="category">Category</SelectItem>
                            <SelectItem value="updated">Last Updated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-green-600 mb-3">Credits (Income)</h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {filteredAndSortedInvoices.map(inv => {
                          const tipAmt = (inv as any).tipAmount || 0;
                          const rawAmt = inv.paidAmount || inv.total;
                          const serviceAmt = Math.max(0, rawAmt - tipAmt);
                          return (
                          <div
                            key={`inv-${inv.id}`}
                            className="p-3 border rounded-lg bg-blue-50/50 flex justify-between items-center cursor-pointer hover:bg-blue-100/60 transition-colors"
                            onClick={() => setSelectedTransaction({ type: 'invoice', data: inv })}
                          >
                            <div>
                              <p className="font-semibold text-blue-700">+${rawAmt.toFixed(2)}</p>
                              <p className="text-sm">Paid Invoice #{String((inv as any).invoiceNumber || inv.id?.slice(0, 8))}</p>
                              {tipAmt > 0 && (
                                <p className="text-[11px] text-emerald-600 font-semibold">Includes ${tipAmt.toFixed(2)} Tip · Service: ${serviceAmt.toFixed(2)}</p>
                              )}
                              <span className="text-[11px] font-black text-blue-500/80 mt-1 block uppercase tracking-widest">{new Date(inv.createdAt).toLocaleString()}</span>
                            </div>
                            <span className="text-xs text-zinc-400 italic pr-1">tap for details</span>
                          </div>
                          );
                        })}
                        {filteredAndSortedIncomes.map(income => (
                          <div
                            key={income.id}
                            className="p-3 border rounded-lg bg-green-50/50 flex justify-between items-center cursor-pointer hover:bg-green-100/60 transition-colors"
                            onClick={() => setSelectedTransaction({ type: 'income', data: income })}
                          >
                            <div>
                              <p className="font-semibold text-green-700">+${(income.amount || 0).toFixed(2)}</p>
                              <p className="text-sm">{income.description || 'Income'}</p>
                              <span className="text-[11px] font-black text-emerald-500/80 mt-1 block uppercase tracking-widest">{new Date(income.createdAt || income.date).toLocaleString()}</span>
                            </div>
                            <div className="flex gap-1 items-center">
                              <span className="text-xs text-zinc-400 italic pr-1">tap for details</span>
                              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditItemState({ open: true, type: 'income', id: income.id!, amount: String(income.amount || 0) }); }}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteItemState({ open: true, type: 'income', id: income.id! }); }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-red-600 mb-3">Debits (Expenses)</h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {filteredAndSortedExpenses.map(expense => (
                          <div key={expense.id} className="p-3 border rounded-lg bg-red-50/50 flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-red-700">-${(expense.amount || 0).toFixed(2)}</p>
                              <p className="text-sm">{expense.description || 'Expense'}</p>
                              <span className="text-[11px] font-black text-red-500/80 mt-1 block uppercase tracking-widest">{new Date(expense.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => setEditItemState({ open: true, type: 'expense', id: expense.id!, amount: String(expense.amount || 0) })}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteItemState({ open: true, type: 'expense', id: expense.id! })}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Total Revenue</p>
                        <p className="text-xl font-bold text-green-600">+${totalRevenue.toFixed(2)}</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Total Expenses</p>
                        <p className="text-xl font-bold text-red-600">-${(totalSpent + inventoryTotals.total).toFixed(2)}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Net Balance</p>
                        <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {profit >= 0 ? '+' : ''} ${profit.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>

          <Card className="p-6 bg-gradient-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-foreground">Notes</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => setNotes("")} disabled={!notes}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add general accounting notes here..."
              className="min-h-[80px] bg-background border-border"
              maxLength={250}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {notes.length}/250 characters
            </p>
          </Card>
        </div>
      </main>

      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Category</DialogTitle></DialogHeader>
          <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Category Name" />
          <DialogFooter>
            <Button onClick={handleCreateNewCategory}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Breakdown Modal */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="sm:max-w-[480px] bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              Transaction Breakdown
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Full details for this {selectedTransaction?.type === 'invoice' ? 'invoice payment' : 'income entry'}.
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction?.type === 'invoice' && (() => {
            const inv = selectedTransaction.data;
            const tipAmt = inv.tipAmount || 0;
            const rawAmt = inv.paidAmount || inv.total;
            // If paidAmount already exceeds invoice total, tip is embedded. Otherwise add it.
            const totalReceived = rawAmt + (rawAmt <= inv.total && tipAmt > 0 ? tipAmt : 0);
            const serviceAmt = Math.max(0, totalReceived - tipAmt);
            return (
              <div className="py-2 space-y-2 text-sm">
                <div className="rounded-lg bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800">
                  <div className="flex justify-between p-3"><span className="text-zinc-400">Invoice #</span><span className="text-zinc-100 font-mono">{inv.invoiceNumber || inv.id?.slice(0, 8)}</span></div>
                  <div className="flex justify-between p-3"><span className="text-zinc-400">Customer</span><span className="text-zinc-100">{inv.customerName || (inv as any).customer_name || '—'}</span></div>
                  <div className="flex justify-between p-3"><span className="text-zinc-400">Invoice Total (Service)</span><span className="text-zinc-100">${inv.total?.toFixed(2)}</span></div>
                  <div className="flex justify-between p-3 bg-emerald-950/30"><span className="text-zinc-300 font-semibold">Total Received from Customer</span><span className="text-white font-bold text-base">${totalReceived.toFixed(2)}</span></div>
                  <div className="flex justify-between p-3"><span className="text-zinc-400">  ↳ Service Revenue</span><span className="text-blue-400 font-semibold">${serviceAmt.toFixed(2)}</span></div>
                  <div className="flex justify-between p-3"><span className="text-zinc-400">  ↳ Tip (Your Income — Not on Customer PDF)</span><span className={`font-bold ${tipAmt > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>${tipAmt.toFixed(2)}</span></div>
                  <div className="flex justify-between p-3"><span className="text-zinc-400">Payment Status</span><span className={`font-bold capitalize ${inv.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>{inv.paymentStatus || '—'}</span></div>
                  <div className="flex justify-between p-3"><span className="text-zinc-400">Date</span><span className="text-zinc-100">{new Date(inv.createdAt).toLocaleString()}</span></div>
                </div>
                <p className="text-[11px] text-zinc-600 italic text-center">Tip IS counted in your budget &amp; accounting totals — just not printed on the customer&apos;s PDF.</p>
              </div>
            );
          })()}
          {selectedTransaction?.type === 'income' && (() => {
            const inc = selectedTransaction.data;
            return (
              <div className="py-2 space-y-2 text-sm">
                <div className="rounded-lg bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800">
                  <div className="flex justify-between p-3"><span className="text-zinc-400">Description</span><span className="text-zinc-100">{inc.description || '—'}</span></div>
                  <div className="flex justify-between p-3"><span className="text-zinc-400">Amount</span><span className="text-green-400 font-bold">${(inc.amount || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between p-3"><span className="text-zinc-400">Category</span><span className="text-zinc-100">{inc.category || '—'}</span></div>
                  <div className="flex justify-between p-3"><span className="text-zinc-400">Customer</span><span className="text-zinc-100">{inc.customerName || '—'}</span></div>
                  <div className="flex justify-between p-3"><span className="text-zinc-400">Payment Method</span><span className="text-zinc-100 capitalize">{inc.paymentMethod || '—'}</span></div>
                  <div className="flex justify-between p-3"><span className="text-zinc-400">Date</span><span className="text-zinc-100">{new Date(inc.date || inc.createdAt).toLocaleString()}</span></div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedTransaction(null)} className="text-zinc-400 hover:text-white">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteItemState.open} onOpenChange={(open) => setDeleteItemState(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteItem} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editItemState.open} onOpenChange={(open) => setEditItemState(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Amount</DialogTitle></DialogHeader>
          <div className="py-2">
            <Label>Amount</Label>
            <Input type="number" value={editItemState.amount} onChange={(e) => setEditItemState(prev => ({ ...prev, amount: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItemState(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button onClick={handleSaveEditItem}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Accounting;
