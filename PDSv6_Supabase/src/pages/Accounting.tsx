import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, Pencil, Trash2, Printer, Save } from "lucide-react";
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
import { getInvoices, getExpenses, upsertExpense } from "@/lib/db";
import { getReceivables, upsertReceivable, Receivable } from "@/lib/receivables";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import localforage from "localforage";
import { getCategoryColors } from "@/lib/categoryColors";

interface Invoice {
  id?: string;
  total: number;
  createdAt: string;
}

interface Expense {
  id?: string;
  amount: number;
  description: string;
  createdAt: string;
  category?: string;
}

const DEFAULT_CATEGORIES = {
  income: [
    "Service Income",
    "Product Sales",
    "Consulting",
    "Other Income"
  ],
  expense: [
    "Payroll",
    "Supplies",
    "Marketing",
    "Utilities",
    "Rent",
    "Insurance",
    "Other Expenses"
  ]
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
  const [showDeleteExpense, setShowDeleteExpense] = useState(false);
  const [showDeleteNotes, setShowDeleteNotes] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [expenseList, setExpenseList] = useState<Expense[]>([]);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [incomeList, setIncomeList] = useState<Receivable[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});

  // Add Income form state
  const [incomeAmount, setIncomeAmount] = useState<string>("");
  const [incomeCategory, setIncomeCategory] = useState<string>("");
  const [incomeDescription, setIncomeDescription] = useState<string>("");
  const [incomeDate, setIncomeDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [incomeCustomer, setIncomeCustomer] = useState<string>("");
  const [incomeMethod, setIncomeMethod] = useState<string>("");

  // New category creation
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"income" | "expense">("income");

  useEffect(() => {
    loadData();
    loadCustomCategories();
  }, [dateFilter]);

  const loadCustomCategories = async () => {
    const cats = await localforage.getItem<string[]>("customCategories") || [];
    setCustomCategories(cats);
  };

  const loadData = async () => {
    const invoices = await getInvoices();
    const expensesData = await getExpenses();
    const incomes = await getReceivables();
    setExpenseList(expensesData as Expense[]);
    setInvoiceList(invoices as Invoice[]);
    setIncomeList(incomes as Receivable[]);

    // Load category colors
    const allCategories = new Set<string>();
    (expensesData as Expense[]).forEach(exp => {
      if (exp.category) allCategories.add(exp.category);
    });
    (incomes as Receivable[]).forEach(inc => {
      if (inc.category) allCategories.add(inc.category);
    });
    if (allCategories.size > 0) {
      const colors = await getCategoryColors(Array.from(allCategories));
      setCategoryColors(colors);
    }

    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let daily = 0, weekly = 0, monthly = 0, totalExp = 0;

    (invoices as Invoice[]).forEach(inv => {
      const invDate = new Date(inv.createdAt);
      if (invDate.toDateString() === today) daily += inv.total;
      if (invDate >= weekAgo) weekly += inv.total;
      if (invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear()) {
        monthly += inv.total;
      }
    });

    // Include manual income (receivables)
    (incomes as Receivable[]).forEach(rcv => {
      const d = new Date(rcv.date || rcv.createdAt || new Date().toISOString());
      const amt = Number(rcv.amount || 0);
      if (d.toDateString() === today) daily += amt;
      if (d >= weekAgo) weekly += amt;
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        monthly += amt;
      }
    });

    (expensesData as Expense[]).forEach(exp => {
      totalExp += exp.amount;
    });

    setDailyRevenue(daily);
    setWeeklyRevenue(weekly);
    setMonthlyRevenue(monthly);
    setTotalSpent(totalExp);
  };

  const calculateProfit = () => {
    // Compute filtered totals using quick filter + custom date range
    const now = new Date();
    const startQuick = dateFilter === 'daily' ? new Date(now.setHours(0, 0, 0, 0))
      : dateFilter === 'weekly' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : dateFilter === 'monthly' ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          : null;

    const within = (dStr: string) => {
      const d = new Date(dStr);
      if (startQuick && d < startQuick) return false;
      if (dateRange.from && d < new Date(dateRange.from.setHours(0, 0, 0, 0))) return false;
      if (dateRange.to && d > new Date(dateRange.to.setHours(23, 59, 59, 999))) return false;
      return true;
    };

    const revenueInvoices = invoiceList.filter(inv => within(inv.createdAt)).reduce((sum, i) => sum + (i.total || 0), 0);
    const revenueIncome = incomeList.filter(rcv => within(rcv.date || rcv.createdAt)).reduce((sum, r) => sum + (r.amount || 0), 0);
    const revenue = revenueInvoices + revenueIncome;
    const exp = expenseList.filter(ex => within(ex.createdAt)).reduce((sum, e) => sum + (e.amount || 0), 0);
    return revenue - exp;
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
    const saved = await upsertReceivable({
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

    // Check if category already exists
    const allExistingCategories = [
      ...DEFAULT_CATEGORIES.income,
      ...DEFAULT_CATEGORIES.expense,
      ...customCategories
    ];

    if (allExistingCategories.includes(trimmedName)) {
      toast({ title: "Error", description: "Category already exists", variant: "destructive" });
      return;
    }

    // Add to custom categories
    const updated = [...customCategories, trimmedName];
    await localforage.setItem("customCategories", updated);
    setCustomCategories(updated);

    // Assign a color to the new category
    const { getCategoryColor } = await import("@/lib/categoryColors");
    const color = await getCategoryColor(trimmedName);
    setCategoryColors(prev => ({ ...prev, [trimmedName]: color }));

    // Set it as the selected category for the current form
    if (newCategoryType === "income") {
      setIncomeCategory(trimmedName);
    } else {
      setExpenseCategory(trimmedName);
    }

    // Reset and close dialog
    setNewCategoryName("");
    setShowNewCategoryDialog(false);
    toast({ title: "Category Created", description: `"${trimmedName}" has been added` });
  };

  const generatePDF = (action: 'save' | 'print') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Helper to convert hex/color string to rgb
    const getRgb = (color: string) => {
      // Create a temporary element to compute color
      const el = document.createElement('div');
      el.style.color = color;
      document.body.appendChild(el);
      const computed = window.getComputedStyle(el).color;
      document.body.removeChild(el);
      const match = computed.match(/\d+/g);
      return match ? { r: Number(match[0]), g: Number(match[1]), b: Number(match[2]) } : { r: 0, g: 0, b: 0 };
    };

    // Title
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("Accounting Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} | Filter: ${dateFilter.toUpperCase()}`, 14, 26);

    // Financial Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 35, pageWidth - 28, 55, 3, 3, 'FD');

    const profitVal = calculateProfit();
    const netColor = profitVal >= 0 ? [22, 163, 74] : [220, 38, 38];
    const totalRevenue = dailyRevenue + weeklyRevenue + monthlyRevenue; // This logic in original code assumes non-overlapping which is display-only, let's use actual calculated totals for report consistency

    // Recalculate totals for report to be precise based on current view
    // Compute totals using the same filter logic as calculateProfit for consistency
    const now = new Date();
    const startQuick = dateFilter === 'daily' ? new Date(now.setHours(0, 0, 0, 0))
      : dateFilter === 'weekly' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : dateFilter === 'monthly' ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          : null;

    const within = (dStr: string) => {
      const d = new Date(dStr);
      if (startQuick && d < startQuick) return false;
      if (dateRange.from && d < new Date(dateRange.from.setHours(0, 0, 0, 0))) return false;
      if (dateRange.to && d > new Date(dateRange.to.setHours(23, 59, 59, 999))) return false;
      return true;
    };

    const revenueInvoices = invoiceList.filter(inv => within(inv.createdAt)).reduce((sum, i) => sum + (i.total || 0), 0);
    const revenueIncome = incomeList.filter(rcv => within(rcv.date || rcv.createdAt)).reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalRev = revenueInvoices + revenueIncome;
    const totalExp = expenseList.filter(ex => within(ex.createdAt)).reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = totalRev - totalExp;

    // Summary Statistics
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Total Revenue", 30, 50);
    doc.setFontSize(16);
    doc.setTextColor(22, 163, 74);
    doc.text(`$${totalRev.toFixed(2)}`, 30, 60);

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Total Expenses", 85, 50);
    doc.setFontSize(16);
    doc.setTextColor(220, 38, 38);
    doc.text(`$${totalExp.toFixed(2)}`, 85, 60);

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Net Profit", 140, 50);
    doc.setFontSize(16);
    doc.setTextColor(netColor[0], netColor[1], netColor[2]);
    doc.text(`$${Math.abs(netProfit).toFixed(2)}`, 140, 60);
    doc.setFontSize(10);
    doc.text(netProfit >= 0 ? "Profit" : "Loss", 140, 66);

    // Revenue Tracking Details
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Revenue Tracking (Current Period)", 30, 80);
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text(`Daily: $${dailyRevenue.toFixed(2)}  |  Weekly: $${weeklyRevenue.toFixed(2)}  |  Monthly: $${monthlyRevenue.toFixed(2)}`, 30, 86);

    let yPos = 100;

    // Transaction Ledger - Income
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Transaction Ledger", 14, yPos);
    yPos += 8;
    doc.setFontSize(12);
    doc.setTextColor(22, 163, 74);
    doc.text("Income (Credits)", 14, yPos);
    yPos += 6;

    const incomeRows = incomeList.filter(i => within(i.date || i.createdAt || '')).map(i => [
      (i.date || i.createdAt || '').slice(0, 10),
      i.category || 'General',
      i.description || i.customerName || '-',
      `$${i.amount.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: incomeRows,
      theme: 'striped',
      headStyles: { fillColor: [22, 163, 74] },
      columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 15;

    // Transaction Ledger - Expenses
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text("Expenses (Debits)", 14, yPos);
    yPos += 6;

    const expenseRows = expenseList.filter(e => within(e.createdAt)).map(e => [
      (e.createdAt || '').slice(0, 10),
      e.category || 'General',
      e.description || '-',
      `$${e.amount.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: expenseRows,
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] },
      columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
    });

    // Notes Section
    if (notes) {
      // @ts-ignore
      yPos = doc.lastAutoTable.finalY + 20;
      if (yPos > 250) { doc.addPage(); yPos = 20; }

      doc.setFillColor(254, 252, 232); // yellow-50
      doc.setDrawColor(253, 224, 71); // yellow-300
      doc.roundedRect(14, yPos, pageWidth - 28, 30, 3, 3, 'FD');

      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text("Notes", 20, yPos + 10);
      doc.setFontSize(10);
      doc.setTextColor(80);
      const splitNotes = doc.splitTextToSize(notes, pageWidth - 40);
      doc.text(splitNotes, 20, yPos + 18);
    }

    if (action === 'save') {
      doc.save(`accounting-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: "PDF Saved", description: "Report downloaded successfully." });
    } else {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    }
  };

  const profit = calculateProfit();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Accounting" />

      <main className="container mx-auto px-4 py-6 max-w-6xl">
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
                </SelectContent>
              </Select>
              <DateRangeFilter value={dateRange} onChange={setDateRange} storageKey="accounting-range" />
              <Button variant="outline" onClick={() => { try { window.location.href = '/reports?tab=accounting'; } catch { } }}>Report</Button>
              <Button size="icon" variant="outline" onClick={() => generatePDF('print')}>
                <Printer className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => generatePDF('save')}>
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => { try { window.location.href = '/reports?tab=accounting'; } catch { } }}>View Accounting Report</Button>
            </div>
          </div>

          {/* Profit/Loss Summary - Moved to Top */}
          <Card className={`p-6 border-border ${profit > 0 ? 'bg-green-600' : profit < 0 ? 'bg-red-600' : 'bg-blue-600'}`}>
            <h2 className="text-2xl font-bold text-white mb-2">Profit/Loss Summary</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white">
                ${Math.abs(profit).toFixed(2)}
              </span>
              <span className="text-white/80">
                {profit > 0 ? 'Profit' : profit < 0 ? 'Loss' : 'Break-Even'}
              </span>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Revenue Tracking (Invoices + Income)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-background/50 rounded-lg border border-border">
                <Label className="text-muted-foreground">Daily Revenue</Label>
                <p className="text-3xl font-bold text-foreground mt-2">
                  ${dailyRevenue.toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-background/50 rounded-lg border border-border">
                <Label className="text-muted-foreground">Weekly Revenue</Label>
                <p className="text-3xl font-bold text-foreground mt-2">
                  ${weeklyRevenue.toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-background/50 rounded-lg border border-border">
                <Label className="text-muted-foreground">Monthly Revenue</Label>
                <p className="text-3xl font-bold text-foreground mt-2">
                  ${monthlyRevenue.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          {/* Accordion Sections */}
          <Accordion type="multiple" defaultValue={["ledger"]} className="space-y-4">
            {/* Add Income Section */}
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
                            {customCategories.filter(c => !DEFAULT_CATEGORIES.expense.includes(c)).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
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
                        <Input value={incomeCustomer} onChange={(e) => setIncomeCustomer(e.target.value)} placeholder="Customer name" />
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

            {/* Expense Tracking Section */}
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
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="job-expense">Add New Expense</Label>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => expenses && setShowDeleteExpense(true)}
                            disabled={!expenses}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                        <div>
                          <Label className="text-xs mb-1 block">Description</Label>
                          <Input
                            id="expense-desc"
                            placeholder="Expense description"
                            value={expenseDesc}
                            onChange={(e) => setExpenseDesc(e.target.value)}
                            className="bg-background border-border"
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">Category</Label>
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
                            <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>
                              {DEFAULT_CATEGORIES.expense.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                              {customCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                              <SelectItem value="___CREATE_NEW___" className="text-primary font-semibold border-t mt-1 pt-1">
                                + Create New Category
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="job-expense"
                            type="number"
                            value={expenses}
                            onChange={(e) => setExpenses(e.target.value)}
                            placeholder="Enter expense amount"
                            className="pl-10 bg-background border-border"
                          />
                        </div>
                        <Button onClick={handleAddExpense} className="bg-gradient-hero">
                          Add Expense
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 bg-background/50 rounded-lg border border-border">
                      <Label className="text-muted-foreground">Total Spent to Date</Label>
                      <p className="text-3xl font-bold text-foreground mt-2">
                        ${totalSpent.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* Transaction Ledger Section */}
            <AccordionItem value="ledger" className="border-none">
              <Card className="bg-gradient-card border-border">
                <AccordionTrigger className="px-6 pt-6 pb-4 hover:no-underline">
                  <h2 className="text-2xl font-bold text-foreground">Transaction Ledger</h2>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <p className="text-sm text-muted-foreground mb-4">View, edit, or delete individual debits (expenses) and credits (income)</p>

                  <div className="space-y-6">
                    {/* Credits (Income) Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-green-600 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Credits (Income) - {incomeList.length} transactions
                      </h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {incomeList.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded">No income transactions yet</p>
                        ) : (
                          incomeList.map((income) => (
                            <div
                              key={income.id}
                              className="p-3 border rounded-lg"
                              style={{
                                backgroundColor: categoryColors[income.category || 'General']
                                  ? `${categoryColors[income.category || 'General']}15`
                                  : 'rgb(240, 253, 244)',
                                borderColor: categoryColors[income.category || 'General'] || 'rgb(187, 247, 208)'
                              }}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-green-700 dark:text-green-400">
                                      +${(income.amount || 0).toFixed(2)}
                                    </span>
                                    <span
                                      className="text-xs px-2 py-0.5 rounded font-medium"
                                      style={{
                                        backgroundColor: categoryColors[income.category || 'General'] || '#10b981',
                                        color: 'white'
                                      }}
                                    >
                                      {income.category || 'General'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-foreground truncate">{income.description || income.customerName || 'No description'}</p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    <span>{new Date(income.date || income.createdAt).toLocaleString()}</span>
                                    {income.customerName && <span>• Customer: {income.customerName}</span>}
                                    {income.paymentMethod && <span>• {income.paymentMethod}</span>}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={async () => {
                                      const newAmount = prompt('Edit amount:', String(income.amount || 0));
                                      if (newAmount && !isNaN(parseFloat(newAmount))) {
                                        await upsertReceivable({ ...income, amount: parseFloat(newAmount) });
                                        loadData();
                                        toast({ title: 'Income Updated' });
                                      }
                                    }}
                                    title="Edit"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={async () => {
                                      if (confirm('Delete this income transaction?')) {
                                        const { deleteReceivable } = await import('@/lib/receivables');
                                        if (income.id) await deleteReceivable(income.id);
                                        loadData();
                                        toast({ title: 'Income Deleted' });
                                      }
                                    }}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Debits (Expenses) Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
                        <TrendingDown className="h-5 w-5" />
                        Debits (Expenses) - {expenseList.length} transactions
                      </h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {expenseList.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded">No expense transactions yet</p>
                        ) : (
                          expenseList.map((expense) => (
                            <div
                              key={expense.id}
                              className="p-3 border rounded-lg"
                              style={{
                                backgroundColor: categoryColors[(expense as any).category || 'General']
                                  ? `${categoryColors[(expense as any).category || 'General']}15`
                                  : 'rgb(254, 242, 242)',
                                borderColor: categoryColors[(expense as any).category || 'General'] || 'rgb(254, 202, 202)'
                              }}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-red-700 dark:text-red-400">
                                      -${(expense.amount || 0).toFixed(2)}
                                    </span>
                                    <span
                                      className="text-xs px-2 py-0.5 rounded font-medium"
                                      style={{
                                        backgroundColor: categoryColors[(expense as any).category || 'General'] || '#ef4444',
                                        color: 'white'
                                      }}
                                    >
                                      {(expense as any).category || 'General'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-foreground truncate">{expense.description || 'No description'}</p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    <span>{new Date(expense.createdAt).toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={async () => {
                                      const newAmount = prompt('Edit amount:', String(expense.amount || 0));
                                      if (newAmount && !isNaN(parseFloat(newAmount))) {
                                        await upsertExpense({ ...expense, amount: parseFloat(newAmount) } as any);
                                        loadData();
                                        toast({ title: 'Expense Updated' });
                                      }
                                    }}
                                    title="Edit"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={async () => {
                                      if (confirm('Delete this expense transaction?')) {
                                        const { deleteExpense } = await import('@/lib/db');
                                        if (expense.id) await deleteExpense(expense.id);
                                        loadData();
                                        toast({ title: 'Expense Deleted' });
                                      }
                                    }}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <p className="text-xs text-muted-foreground">Total Credits</p>
                        <p className="text-xl font-bold text-green-600">
                          +${incomeList.reduce((sum, i) => sum + (i.amount || 0), 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <p className="text-xs text-muted-foreground">Total Debits</p>
                        <p className="text-xl font-bold text-red-600">
                          -${expenseList.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
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
                <Button variant="ghost" size="icon">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => notes && setShowDeleteNotes(true)}
                  disabled={!notes}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
      </main >

      <AlertDialog open={showDeleteExpense} onOpenChange={setShowDeleteExpense}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the current expense input. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="button-group-responsive">
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setExpenses(""); setExpenseDesc(""); setShowDeleteExpense(false); }}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteNotes} onOpenChange={setShowDeleteNotes}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your notes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="button-group-responsive">
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setNotes(""); setShowDeleteNotes(false); }}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Category Dialog */}
      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new {newCategoryType === "income" ? "income" : "expense"} category.
              A unique color will be automatically assigned.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-category-name">Category Name</Label>
              <Input
                id="new-category-name"
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateNewCategory();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewCategoryDialog(false);
              setNewCategoryName("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewCategory} className="bg-gradient-hero">
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Accounting;
