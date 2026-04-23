import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Pencil, Trash2, Save, X, ChevronDown, ChevronUp,
  Download, Upload, RefreshCw, TrendingUp, Search,
  Printer, TrendingDown, DollarSign, Package, HelpCircle
} from "lucide-react";
import { getInvoices, getExpenses, upsertExpense, deleteExpense } from "@/lib/db";
import { getReceivables, upsertReceivable, deleteReceivable, Receivable } from "@/lib/receivables";
import { getSupabaseCustomers, getSupabaseTaxExpenses } from "@/lib/supa-data";
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
  id?: string;
  total: number;
  createdAt: string;
  paymentStatus?: "unpaid" | "partially-paid" | "paid";
  paidAmount?: number;
  invoiceNumber?: string;
}

interface Expense {
  id?: string;
  amount: number;
  description: string;
  createdAt: string;
  category?: string;
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
      const invoices = await getInvoices<Invoice>();
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

      let daily = 0, weekly = 0, monthly = 0, totalRev = 0;

      const paidInvoices = invoices.filter(inv => inv.paymentStatus === 'paid' || (inv.paidAmount || 0) > 0);
      
      paidInvoices.forEach(inv => {
        const amt = inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0);
        const d = new Date(inv.createdAt);
        if (d.toDateString() === today) daily += amt;
        if (d >= weekAgo) weekly += amt;
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) monthly += amt;
        totalRev += amt;
      });

      incomes.forEach(inc => {
        const amt = inc.amount || 0;
        const d = new Date(inc.date || inc.createdAt);
        if (d.toDateString() === today) daily += amt;
        if (d >= weekAgo) weekly += amt;
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) monthly += amt;
        totalRev += amt;
      });

      const yearly = incomes.filter(inc => {
        const d = new Date(inc.date || inc.createdAt);
        return d.getFullYear() === now.getFullYear();
      }).reduce((sum, inc) => sum + (inc.amount || 0), 0) + 
      invoices.filter(inv => {
        const d = new Date(inv.createdAt);
        const isPaid = inv.paymentStatus === 'paid' || (inv.paidAmount || 0) > 0;
        return isPaid && d.getFullYear() === now.getFullYear();
      }).reduce((sum, inv) => sum + (inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0)), 0);

      setDailyRevenue(daily);
      setWeeklyRevenue(weekly);
      setMonthlyRevenue(monthly);
      setTotalRevenue(totalRev);

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
          const matches = (inv.invoiceNumber || '').toLowerCase().includes(search) || 
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
        return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
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

          <Card className="p-6 bg-gradient-card border-border">
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
                          className="pl-9"
                          value={ledgerSearch}
                          onChange={(e) => setLedgerSearch(e.target.value)}
                        />
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
                        {filteredAndSortedInvoices.map(inv => (
                          <div key={`inv-${inv.id}`} className="p-3 border rounded-lg bg-blue-50/50 flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-blue-700">+${(inv.paidAmount || inv.total).toFixed(2)}</p>
                              <p className="text-sm">Paid Invoice #{String(inv.invoiceNumber || inv.id?.slice(0, 8))}</p>
                              <span className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                        {filteredAndSortedIncomes.map(income => (
                          <div key={income.id} className="p-3 border rounded-lg bg-green-50/50 flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-green-700">+${(income.amount || 0).toFixed(2)}</p>
                              <p className="text-sm">{income.description || 'Income'}</p>
                              <span className="text-xs text-muted-foreground">{new Date(income.date || income.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => setEditItemState({ open: true, type: 'income', id: income.id!, amount: String(income.amount || 0) })}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteItemState({ open: true, type: 'income', id: income.id! })}><Trash2 className="h-4 w-4" /></Button>
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
                              <span className="text-xs text-muted-foreground">{new Date(expense.createdAt).toLocaleString()}</span>
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
