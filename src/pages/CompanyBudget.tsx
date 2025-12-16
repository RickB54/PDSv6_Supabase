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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Download, PieChart as PieChartIcon, BarChart3, TrendingUp, Plus, Filter, ChevronDown, Trash2, Pencil, Printer, FileText } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getReceivables, Receivable, upsertReceivable, deleteReceivable } from "@/lib/receivables";
import { getExpenses, upsertExpense, getInvoices, deleteExpense } from "@/lib/db";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import localforage from "localforage";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Expense {
    id: string;
    amount: number;
    category?: string;
    description: string;
    createdAt: string;
}

interface CategoryData {
    name: string;
    amount: number;
    color: string;
    type: 'income' | 'expense';
}

interface BudgetTarget {
    category: string;
    target: number;
    type: 'income' | 'expense';
}

interface Invoice {
    id: string;
    total: number;
    paymentStatus?: "unpaid" | "partially-paid" | "paid";
    paidAmount?: number;
    createdAt: string;
    date: string;
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

const CATEGORY_COLORS = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
    "#6366f1", // indigo
    "#84cc16", // lime
];

// Helper to convert hex to rgb
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

const CompanyBudget = () => {
    const [incomeList, setIncomeList] = useState<Receivable[]>([]);
    const [expenseList, setExpenseList] = useState<Expense[]>([]);
    const [invoiceList, setInvoiceList] = useState<Invoice[]>([]); // Added state
    const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [customIncomeCategories, setCustomIncomeCategories] = useState<string[]>([]);
    const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>([]);
    const [budgetTargets, setBudgetTargets] = useState<BudgetTarget[]>([]);
    const [dateFilter, setDateFilter] = useState("monthly");
    const [dateRange, setDateRange] = useState<DateRangeValue>({});
    const [viewMode, setViewMode] = useState<'pie' | 'bar' | 'line'>('pie');
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
    const [addCategoryOpen, setAddCategoryOpen] = useState(false);
    const [newCategory, setNewCategory] = useState("");
    const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('income');
    const [editCategoryOpen, setEditCategoryOpen] = useState(false);
    const [editCategoryName, setEditCategoryName] = useState("");
    const [editingCategory, setEditingCategory] = useState<{ name: string; type: 'income' | 'expense'; isDefault: boolean } | null>(null);

    // Use local date for default values to prevent "tomorrow" bug
    const getLocalDateStr = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [incomeFormOpen, setIncomeFormOpen] = useState(false);
    const [expenseFormOpen, setExpenseFormOpen] = useState(false);
    const [incomeAmount, setIncomeAmount] = useState("");
    const [incomeCategory, setIncomeCategory] = useState("");
    const [incomeDescription, setIncomeDescription] = useState("");
    const [incomeDate, setIncomeDate] = useState(getLocalDateStr());
    const [incomeCustomer, setIncomeCustomer] = useState("");
    const [incomeMethod, setIncomeMethod] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseCategory, setExpenseCategory] = useState("");
    const [expenseDescription, setExpenseDescription] = useState("");
    const [expenseDate, setExpenseDate] = useState(getLocalDateStr());

    useEffect(() => {
        loadData();
        loadCustomCategories();
        loadBudgetTargets();
    }, [dateFilter, dateRange]);

    const loadData = async () => {
        const incomes = await getReceivables();
        const expenses = await getExpenses<Expense>();
        const invoices = await getInvoices() as Invoice[];
        setIncomeList(incomes as Receivable[]);
        setExpenseList(expenses as Expense[]);
        setInvoiceList(invoices); // Set state
        processCategoryData(incomes, expenses, invoices);
    };

    const loadCustomCategories = async () => {
        const cats = await localforage.getItem<string[]>("customCategories") || [];
        setCustomCategories(cats);
        const incCats = await localforage.getItem<string[]>("customIncomeCategories") || [];
        setCustomIncomeCategories(incCats);
        const expCats = await localforage.getItem<string[]>("customExpenseCategories") || [];
        setCustomExpenseCategories(expCats);
    };

    const loadBudgetTargets = async () => {
        const targets = await localforage.getItem<BudgetTarget[]>("budgetTargets") || [];
        setBudgetTargets(targets);
    };

    const filterByDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();

        if (dateFilter === 'daily') {
            return d.toDateString() === now.toDateString();
        } else if (dateFilter === 'weekly') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return d >= weekAgo;
        } else if (dateFilter === 'monthly') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }

        // Custom range
        if (dateRange.from && d < new Date(dateRange.from.setHours(0, 0, 0, 0))) return false;
        if (dateRange.to && d > new Date(dateRange.to.setHours(23, 59, 59, 999))) return false;

        return true;
    };

    // Derived state for transactions by category (ensures tooltip matches chart)
    const categoryTransactions = useMemo(() => {
        const map = new Map<string, any[]>();

        // Helper to add tx
        const addTx = (cat: string, tx: any) => {
            const current = map.get(cat) || [];
            map.set(cat, [...current, tx]);
        };

        // 1. Invoices (Service Income) - Filter applied same as Chart
        invoiceList.forEach(inv => {
            const amt = (inv.paymentStatus === 'paid' || (inv.paidAmount || 0) > 0)
                ? (inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0))
                : 0;
            if (amt > 0 && filterByDate(inv.createdAt || inv.date)) {
                addTx("Service Income", {
                    date: inv.createdAt || inv.date,
                    desc: `Invoice #${(inv as any).invoiceNumber || 'Paid'}`,
                    amount: amt,
                    cat: 'Invoice'
                });
            }
        });

        // 2. Incomes
        incomeList.forEach(inc => {
            if (filterByDate(inc.date || inc.createdAt || '')) {
                addTx(inc.category || "Other Income", {
                    date: inc.date || inc.createdAt,
                    desc: inc.description || inc.customerName || 'Income',
                    amount: inc.amount,
                    cat: 'Manual' // or inc.category
                });
            }
        });

        // 3. Expenses
        expenseList.forEach(exp => {
            if (filterByDate(exp.createdAt)) {
                addTx(exp.category || "General", {
                    date: exp.createdAt,
                    desc: exp.description || 'Expense',
                    amount: exp.amount,
                    cat: 'Expense'
                });
            }
        });

        // Sort all lists
        map.forEach((list, key) => {
            list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            map.set(key, list);
        });

        return map;
    }, [incomeList, expenseList, invoiceList, dateFilter, dateRange]);

    const processCategoryData = (incomes: Receivable[], expenses: Expense[], invoices: Invoice[] = []) => {
        const categoryMap = new Map<string, { amount: number; type: 'income' | 'expense' }>();

        // Process invoices (paid only)
        invoices.forEach(inv => {
            // Use explicit paidAmount if available, otherwise total if paid
            const amt = (inv.paymentStatus === 'paid' || (inv.paidAmount || 0) > 0)
                ? (inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0))
                : 0;

            if (amt <= 0) return;
            // Check date of invoice (using createdAt or date)
            if (!filterByDate(inv.createdAt || inv.date)) return;

            const cat = "Service Income";
            const current = categoryMap.get(cat) || { amount: 0, type: 'income' as const };
            categoryMap.set(cat, { amount: current.amount + amt, type: 'income' });
        });

        // Process income
        incomes.forEach(income => {
            if (!filterByDate(income.date || income.createdAt || '')) return;
            const cat = income.category || "Other Income";
            const current = categoryMap.get(cat) || { amount: 0, type: 'income' as const };
            categoryMap.set(cat, { amount: current.amount + (income.amount || 0), type: 'income' });
        });

        // Process expenses
        expenses.forEach(expense => {
            if (!filterByDate(expense.createdAt)) return;
            const cat = (expense.category || "Other Expenses");
            const current = categoryMap.get(cat) || { amount: 0, type: 'expense' as const };
            categoryMap.set(cat, { amount: current.amount + (expense.amount || 0), type: 'expense' });
        });

        // Convert to array and assign colors
        const data: CategoryData[] = [];
        let colorIndex = 0;
        categoryMap.forEach((value, name) => {
            data.push({
                name,
                amount: value.amount,
                color: CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length],
                type: value.type
            });
            colorIndex++;
        });

        setCategoryData(data);
    };

    const handleAddCategory = async () => {
        if (!newCategory.trim()) return;

        if (newCategoryType === 'expense') {
            const updated = [...customExpenseCategories, newCategory.trim()];
            await localforage.setItem("customExpenseCategories", updated);
            setCustomExpenseCategories(updated);
        } else {
            const updated = [...customIncomeCategories, newCategory.trim()];
            await localforage.setItem("customIncomeCategories", updated);
            setCustomIncomeCategories(updated);
        }

        setNewCategory("");
        setAddCategoryOpen(false);
        toast.success("Category added successfully");
    };

    const handleAddIncome = async () => {
        const amt = parseFloat(incomeAmount) || 0;
        if (amt === 0) {
            toast.error("Please enter a valid amount");
            return;
        }
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
        setIncomeFormOpen(false);
        loadData();
        toast.success(`Income of $${amt.toFixed(2)} added successfully`);
    };

    const handleAddExpense = async () => {
        const amt = parseFloat(expenseAmount) || 0;
        if (amt === 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        await upsertExpense({
            amount: amt,
            category: expenseCategory || "General",
            description: expenseDescription || "Expense",
            createdAt: expenseDate,
        } as any);
        setExpenseAmount("");
        setExpenseCategory("");
        setExpenseDescription("");
        setExpenseFormOpen(false);
        loadData();
        toast.success(`Expense of $${amt.toFixed(2)} added successfully`);
    };

    const handleDeleteCategory = async (category: string, type: 'income' | 'expense') => {
        const isDefault = type === 'income' ? DEFAULT_CATEGORIES.income.includes(category) : DEFAULT_CATEGORIES.expense.includes(category);

        if (isDefault) {
            toast.error("Cannot delete default categories");
            return;
        }

        if (confirm(`Are you sure you want to delete category "${category}"?`)) {
            if (type === 'income') {
                const updated = customIncomeCategories.filter(c => c !== category);
                const updatedLegacy = customCategories.filter(c => c !== category);
                await localforage.setItem("customIncomeCategories", updated);
                await localforage.setItem("customCategories", updatedLegacy);
                setCustomIncomeCategories(updated);
                setCustomCategories(updatedLegacy);
            } else {
                const updated = customExpenseCategories.filter(c => c !== category);
                await localforage.setItem("customExpenseCategories", updated);
                setCustomExpenseCategories(updated);
            }
            toast.success("Category deleted");
        }
    };

    const openEditCategory = (category: string, type: 'income' | 'expense') => {
        const isDefault = type === 'income' ? DEFAULT_CATEGORIES.income.includes(category) : DEFAULT_CATEGORIES.expense.includes(category);
        setEditingCategory({ name: category, type, isDefault });
        setEditCategoryName(category);
        setEditCategoryOpen(true);
    };

    const handleUpdateCategory = async () => {
        if (!editingCategory || !editCategoryName.trim()) return;

        if (editingCategory.isDefault) {
            toast.error("Cannot edit default categories");
            return;
        }

        const oldName = editingCategory.name;
        const newName = editCategoryName.trim();
        const type = editingCategory.type;

        if (type === 'income') {
            const updated = customIncomeCategories.map(c => c === oldName ? newName : c);
            const updatedLegacy = customCategories.map(c => c === oldName ? newName : c);
            await localforage.setItem("customIncomeCategories", updated);
            await localforage.setItem("customCategories", updatedLegacy);
            setCustomIncomeCategories(updated);
            setCustomCategories(updatedLegacy);
        } else {
            const updated = customExpenseCategories.map(c => c === oldName ? newName : c);
            await localforage.setItem("customExpenseCategories", updated);
            setCustomExpenseCategories(updated);
        }

        setEditCategoryOpen(false);
        setEditingCategory(null);
        toast.success("Category updated");
    };

    const generatePDF = (action: 'save' | 'print') => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Title
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text("Company Budget Report", 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()} | Filter: ${dateFilter.toUpperCase()}`, 14, 26);

        // Financial Summary Box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, 35, pageWidth - 28, 45, 3, 3, 'FD');

        const net = totalIncome - totalExpense;
        const netColor = net >= 0 ? [22, 163, 74] : [220, 38, 38];

        // Summary Statistics
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text("Total Income", 30, 50);
        doc.setFontSize(16);
        doc.setTextColor(22, 163, 74);
        doc.text(`$${totalIncome.toFixed(2)}`, 30, 60);

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text("Total Expenses", 85, 50);
        doc.setFontSize(16);
        doc.setTextColor(220, 38, 38);
        doc.text(`$${totalExpense.toFixed(2)}`, 85, 60);

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text("Net Profit", 140, 50);
        doc.setFontSize(16);
        doc.setTextColor(netColor[0], netColor[1], netColor[2]);
        doc.text(`$${Math.abs(net).toFixed(2)}`, 140, 60);

        let yPos = 90;

        // Category Breakdown with Colors
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Overview & Categories", 14, yPos);
        yPos += 8;

        const catRows = filteredCategories.map(c => {
            const pct = (c.amount / (c.type === 'income' ? totalIncome : totalExpense)) * 100;
            return [
                "", // Color dot placeholder
                c.name,
                c.type.toUpperCase(),
                `$${c.amount.toFixed(2)}`,
                `${pct.toFixed(1)}%`
            ];
        });

        autoTable(doc, {
            startY: yPos,
            head: [['', 'Category', 'Type', 'Amount', 'Share']],
            body: catRows,
            theme: 'grid',
            headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 'auto', fontStyle: 'bold' },
                3: { halign: 'right' },
                4: { halign: 'right' }
            },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 0) {
                    const cat = filteredCategories[data.row.index];
                    if (cat) {
                        const rgb = hexToRgb(cat.color);
                        doc.setFillColor(rgb.r, rgb.g, rgb.b);
                        const dim = data.cell.height - 6;
                        doc.circle(data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, 3, 'F');
                    }
                }
            }
        });

        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 15;

        // Income Breakdown
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.text("Income Breakdown", 14, yPos);
        yPos += 8;

        const incomeRows = incomeList.filter(i => filterByDate(i.date || i.createdAt || '')).map(i => [
            (i.date || i.createdAt || '').slice(0, 10),
            i.category || 'General',
            i.description || '-',
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

        // Expense Breakdown
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.text("Expense Breakdown", 14, yPos);
        yPos += 8;

        const expenseRows = expenseList.filter(e => filterByDate(e.createdAt)).map(e => [
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

        // Budget Planning Data
        doc.addPage();
        yPos = 20;
        doc.setFontSize(14);
        doc.text("Budget Planning Data (This Month)", 14, yPos);
        yPos += 10;

        const budgetRows: any[] = [];

        // Income Targets
        const uniqueIncomeCats = [...DEFAULT_CATEGORIES.income, ...customIncomeCategories, ...customCategories.filter(c => !DEFAULT_CATEGORIES.expense.includes(c))];
        uniqueIncomeCats.forEach(cat => {
            const actualReceivables = incomeList.filter(i => {
                const d = new Date(i.date || i.createdAt || '');
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && (i.category === cat);
            }).reduce((sum, i) => sum + (i.amount || 0), 0);

            // Calculate actual from Invoices (for Service Income)
            let actualInvoices = 0;
            if (cat === 'Service Income' || cat === 'Invoice Revenue') {
                actualInvoices = invoiceList.filter(inv => {
                    // Check if paid
                    const amt = (inv.paymentStatus === 'paid' || (inv.paidAmount || 0) > 0)
                        ? (inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0))
                        : 0;
                    if (amt <= 0) return false;

                    const d = new Date(inv.date || inv.createdAt);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }).reduce((sum, inv) => {
                    const amt = (inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0));
                    return sum + amt;
                }, 0);
            }

            const actual = actualReceivables + actualInvoices;

            const targetObj = budgetTargets.find(t => t.category === cat && t.type === 'income');
            const target = targetObj?.target || 0;
            const variance = actual - target;

            budgetRows.push([cat, 'Income', `$${target.toFixed(2)}`, `$${actual.toFixed(2)}`, `${variance >= 0 ? '+' : ''}${variance.toFixed(2)}`]);
        });

        // Expense Targets
        const uniqueExpenseCats = [...DEFAULT_CATEGORIES.expense, ...customExpenseCategories];
        uniqueExpenseCats.forEach(cat => {
            const actual = expenseList.filter(e => {
                const d = new Date(e.createdAt);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && (e.category === cat);
            }).reduce((sum, e) => sum + (e.amount || 0), 0);

            const targetObj = budgetTargets.find(t => t.category === cat && t.type === 'expense');
            const target = targetObj?.target || 0;
            const variance = target - actual;

            budgetRows.push([cat, 'Expense', `$${target.toFixed(2)}`, `$${actual.toFixed(2)}`, `${variance >= 0 ? '+' : ''}${variance.toFixed(2)}`]);
        });

        autoTable(doc, {
            startY: yPos,
            head: [['Category', 'Type', 'Target', 'Actual', 'Variance']],
            body: budgetRows,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            columnStyles: {
                2: { halign: 'right' },
                3: { halign: 'right' },
                4: { halign: 'right', fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 4) {
                    const text = data.cell.text[0];
                    if (text.startsWith('+') || (data.row.raw[1] === 'Expense' && !text.startsWith('-'))) {
                        data.cell.styles.textColor = [22, 163, 74];
                    } else {
                        data.cell.styles.textColor = [220, 38, 38];
                    }
                }
            }
        });

        if (action === 'save') {
            doc.save(`Company_Budget_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success("PDF saved successfully");
        } else {
            doc.autoPrint();
            window.open(doc.output('bloburl'));
        }
    };

    const exportData = (format: 'json' | 'csv') => {
        if (format === 'json') {
            const data = {
                income: incomeList.filter(i => filterByDate(i.date || i.createdAt || '')),
                expenses: expenseList.filter(e => filterByDate(e.createdAt)),
                categories: categoryData,
                budgetTargets
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `budget-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            const lines = ['Type,Category,Amount,Date,Description'];
            incomeList.filter(i => filterByDate(i.date || i.createdAt || '')).forEach(i => {
                lines.push(`Income,${i.category || 'General'},${i.amount},${i.date},${i.description || ''}`);
            });
            expenseList.filter(e => filterByDate(e.createdAt)).forEach(e => {
                lines.push(`Expense,${e.category || 'General'},${e.amount},${e.createdAt},${e.description || ''}`);
            });
            const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `budget-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
        toast.success(`Exported as ${format.toUpperCase()}`);
    };

    const filteredCategories = categoryData.filter(cat => {
        if (filterType === 'income') return cat.type === 'income';
        if (filterType === 'expense') return cat.type === 'expense';
        return true;
    });

    const totalIncome = categoryData.filter(c => c.type === 'income').reduce((sum, c) => sum + c.amount, 0);
    const totalExpense = categoryData.filter(c => c.type === 'expense').reduce((sum, c) => sum + c.amount, 0);
    const netProfit = totalIncome - totalExpense;

    return (
        <div className="min-h-screen bg-background">
            <PageHeader title="Company Budget" />

            <main className="container mx-auto px-4 py-6 max-w-7xl">
                <div className="space-y-6 animate-fade-in">
                    {/* Header with filters */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h1 className="text-3xl font-bold text-foreground">Financial Dashboard</h1>
                        <div className="flex gap-2 items-center flex-wrap w-full sm:w-auto">
                            <Select value={dateFilter} onValueChange={setDateFilter}>
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="daily">Today</SelectItem>
                                    <SelectItem value="weekly">This Week</SelectItem>
                                    <SelectItem value="monthly">This Month</SelectItem>
                                </SelectContent>
                            </Select>
                            <DateRangeFilter value={dateRange} onChange={setDateRange} storageKey="budget-range" />
                            <Button variant="outline" size="sm" onClick={() => generatePDF('save')}>
                                <FileText className="h-4 w-4 mr-2" />
                                Save PDF
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => generatePDF('print')}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => exportData('csv')}>
                                <Download className="h-4 w-4 mr-2" />
                                CSV
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => exportData('json')}>
                                <Download className="h-4 w-4 mr-2" />
                                JSON
                            </Button>
                        </div>
                    </div>

                    {/* Summary Cards with Add Forms */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Income Card */}
                        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
                            <div className="flex justify-between items-start mb-2">
                                <Label className="text-sm text-muted-foreground">Total Income</Label>
                                <Collapsible open={incomeFormOpen} onOpenChange={setIncomeFormOpen}>
                                    <CollapsibleTrigger asChild>
                                        <Button size="sm" variant="ghost" className="h-8 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/20">
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add Income
                                            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${incomeFormOpen ? 'rotate-180' : ''}`} />
                                        </Button>
                                    </CollapsibleTrigger>
                                </Collapsible>
                            </div>
                            <p className="text-3xl font-bold text-green-600 mb-4">${totalIncome.toFixed(2)}</p>

                            <Collapsible open={incomeFormOpen} onOpenChange={setIncomeFormOpen}>
                                <CollapsibleContent className="space-y-3 mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                                    <div>
                                        <Label className="text-xs">Amount *</Label>
                                        <Input type="number" step="0.01" value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} placeholder="0.00" className="h-9" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Category</Label>
                                        <Select value={incomeCategory} onValueChange={setIncomeCategory}>
                                            <SelectTrigger className="h-9"><SelectValue placeholder="Select category" /></SelectTrigger>
                                            <SelectContent>
                                                {DEFAULT_CATEGORIES.income.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                                {customCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Description</Label>
                                        <Input value={incomeDescription} onChange={(e) => setIncomeDescription(e.target.value)} placeholder="Optional" className="h-9" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Date</Label>
                                        <Input type="date" value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)} className="h-9" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Customer (optional)</Label>
                                        <Input value={incomeCustomer} onChange={(e) => setIncomeCustomer(e.target.value)} placeholder="Customer name" className="h-9" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Payment Method</Label>
                                        <Select value={incomeMethod} onValueChange={setIncomeMethod}>
                                            <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cash">Cash</SelectItem>
                                                <SelectItem value="card">Card</SelectItem>
                                                <SelectItem value="transfer">Bank Transfer</SelectItem>
                                                <SelectItem value="check">Check</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={handleAddIncome} className="w-full bg-green-600 hover:bg-green-700">Add Income</Button>
                                </CollapsibleContent>
                            </Collapsible>
                        </Card>

                        {/* Expense Card */}
                        <Card className="p-6 bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
                            <div className="flex justify-between items-start mb-2">
                                <Label className="text-sm text-muted-foreground">Total Expenses</Label>
                                <Collapsible open={expenseFormOpen} onOpenChange={setExpenseFormOpen}>
                                    <CollapsibleTrigger asChild>
                                        <Button size="sm" variant="ghost" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20">
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add Expense
                                            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${expenseFormOpen ? 'rotate-180' : ''}`} />
                                        </Button>
                                    </CollapsibleTrigger>
                                </Collapsible>
                            </div>
                            <p className="text-3xl font-bold text-red-600 mb-4">${totalExpense.toFixed(2)}</p>

                            <Collapsible open={expenseFormOpen} onOpenChange={setExpenseFormOpen}>
                                <CollapsibleContent className="space-y-3 mt-4 pt-4 border-t border-red-200 dark:border-red-800">
                                    <div>
                                        <Label className="text-xs">Amount *</Label>
                                        <Input type="number" step="0.01" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0.00" className="h-9" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Category</Label>
                                        <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                                            <SelectTrigger className="h-9"><SelectValue placeholder="Select category" /></SelectTrigger>
                                            <SelectContent>
                                                {DEFAULT_CATEGORIES.expense.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                                {customExpenseCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                                {customCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Description</Label>
                                        <Input value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} placeholder="Optional" className="h-9" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Date</Label>
                                        <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="h-9" />
                                    </div>
                                    <Button onClick={handleAddExpense} className="w-full bg-red-600 hover:bg-red-700">Add Expense</Button>
                                </CollapsibleContent>
                            </Collapsible>
                        </Card>

                        {/* Net Profit Card */}
                        <Card className={`p-6 ${netProfit > 0 ? 'bg-green-600' : netProfit < 0 ? 'bg-red-600' : 'bg-blue-600'}`}>
                            <Label className="text-sm text-white/80">Net Profit/Loss</Label>
                            <p className="text-3xl font-bold mt-2 text-white">
                                ${Math.abs(netProfit).toFixed(2)}
                            </p>
                            <p className="text-sm text-white/80 mt-1">{netProfit > 0 ? 'Profit' : netProfit < 0 ? 'Loss' : 'Break-Even'}</p>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <Tabs defaultValue="overview" className="space-y-4">
                        <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-muted/50 p-1">
                            <TabsTrigger value="overview" className="flex-1 min-w-[100px]">Overview</TabsTrigger>
                            <TabsTrigger value="transactions" className="flex-1 min-w-[100px]">Transactions</TabsTrigger>
                            <TabsTrigger value="categories" className="flex-1 min-w-[100px]">Categories</TabsTrigger>
                            <TabsTrigger value="budget" className="flex-1 min-w-[120px]">Budget Planning</TabsTrigger>
                        </TabsList>

                        {/* Transactions Tab */}
                        <TabsContent value="transactions" className="space-y-4">
                            <Card className="p-6">
                                <h2 className="text-xl font-bold mb-4">Transaction Ledger</h2>
                                <p className="text-sm text-muted-foreground mb-6">View all your individual income and expense records. "Manual" income entries can be deleted here if they duplicate your Invoices.</p>

                                <div className="space-y-8">
                                    {/* Income List */}
                                    {/* Income List */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-green-600 mb-3">Income & Invoices</h3>
                                        <div className="rounded-md border overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Date</TableHead>
                                                        <TableHead>Source</TableHead>
                                                        <TableHead>Description</TableHead>
                                                        <TableHead>Amount</TableHead>
                                                        <TableHead className="w-[50px]"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {/* Paid Invoices */}
                                                    {invoiceList.filter(inv => {
                                                        const amt = (inv.paymentStatus === 'paid' || (inv.paidAmount || 0) > 0)
                                                            ? (inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0))
                                                            : 0;
                                                        return amt > 0 && filterByDate(inv.createdAt || inv.date);
                                                    }).map(inv => (
                                                        <TableRow key={`inv-${inv.id}`}>
                                                            <TableCell>{(inv.createdAt || inv.date || '').slice(0, 10)}</TableCell>
                                                            <TableCell><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Invoice</span></TableCell>
                                                            <TableCell>Paid Invoice</TableCell>
                                                            <TableCell>${((inv.paymentStatus === 'paid' || (inv.paidAmount || 0) > 0) ? (inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0)) : 0).toFixed(2)}</TableCell>
                                                            <TableCell>
                                                                {/* Invoices are read-only here */}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}

                                                    {/* Manual Income */}
                                                    {incomeList.filter(i => filterByDate(i.date || i.createdAt || '')).map(inc => (
                                                        <TableRow key={`inc-${inc.id}`}>
                                                            <TableCell>{(inc.date || inc.createdAt || '').slice(0, 10)}</TableCell>
                                                            <TableCell><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">{inc.category || 'Manual'}</span></TableCell>
                                                            <TableCell>{inc.description || inc.customerName || '-'}</TableCell>
                                                            <TableCell>${(inc.amount || 0).toFixed(2)}</TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={async () => {
                                                                        if (confirm('Delete this manual income entry?')) {
                                                                            if (inc.id) await deleteReceivable(inc.id);
                                                                            loadData();
                                                                            toast.success("Income deleted");
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    {/* Expense List */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-red-600 mb-3">Expenses</h3>
                                        <div className="rounded-md border overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Date</TableHead>
                                                        <TableHead>Category</TableHead>
                                                        <TableHead>Description</TableHead>
                                                        <TableHead>Amount</TableHead>
                                                        <TableHead className="w-[50px]"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {expenseList.filter(e => filterByDate(e.createdAt)).map(exp => (
                                                        <TableRow key={`exp-${exp.id}`}>
                                                            <TableCell>{(exp.createdAt || '').slice(0, 10)}</TableCell>
                                                            <TableCell><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">{exp.category || 'General'}</span></TableCell>
                                                            <TableCell>{exp.description || '-'}</TableCell>
                                                            <TableCell>${(exp.amount || 0).toFixed(2)}</TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={async () => {
                                                                        if (confirm('Delete this expense entry?')) {
                                                                            if (exp.id) await deleteExpense(exp.id);
                                                                            loadData();
                                                                            toast.success("Expense deleted");
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="space-y-4">
                            <Card className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold">Category Breakdown</h2>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={viewMode === 'pie' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setViewMode('pie')}
                                        >
                                            <PieChartIcon className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant={viewMode === 'bar' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setViewMode('bar')}
                                        >
                                            <BarChart3 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant={viewMode === 'line' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setViewMode('line')}
                                        >
                                            <TrendingUp className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Pie Chart */}
                                {viewMode === 'pie' && (
                                    <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                                        <div className="relative w-64 h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={filteredCategories}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={2}
                                                        dataKey="amount"
                                                    >
                                                        {filteredCategories.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip
                                                        content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                const data = payload[0].payload;
                                                                const catName = data.name;

                                                                // Use the memoized map source of truth
                                                                const transactions = categoryTransactions.get(catName) || [];
                                                                const displayTx = transactions.slice(0, 5);

                                                                return (
                                                                    <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border border-border min-w-[200px]">
                                                                        <div className="font-bold mb-2 border-b pb-1 flex justify-between">
                                                                            <span>{catName}</span>
                                                                            <span>{transactions.length} items</span>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            {displayTx.map((tx, idx) => (
                                                                                <div key={idx} className="text-xs flex justify-between items-center gap-4">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="font-medium">{tx.desc}</span>
                                                                                        <span className="text-muted-foreground text-[10px]">{new Date(tx.date).toLocaleDateString()}</span>
                                                                                    </div>
                                                                                    <span className="font-semibold whitespace-nowrap">${tx.amount.toFixed(2)}</span>
                                                                                </div>
                                                                            ))}
                                                                            {transactions.length > 5 && (
                                                                                <div className="text-xs text-muted-foreground pt-1 text-center italic">
                                                                                    + {transactions.length - 5} more...
                                                                                </div>
                                                                            )}
                                                                            {transactions.length === 0 && (
                                                                                <div className="text-xs text-muted-foreground">No details available</div>
                                                                            )}
                                                                        </div>
                                                                        <div className="mt-2 pt-2 border-t font-bold flex justify-between text-sm">
                                                                            <span>Total</span>
                                                                            <span>${(payload[0].value as number).toFixed(2)}</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="text-center">
                                                    <p className="text-sm text-muted-foreground">Total</p>
                                                    <p className="text-2xl font-bold">${(totalIncome + totalExpense).toFixed(0)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Legend with Tooltips */}
                                        <div className="flex-1 max-w-md">
                                            <div className="space-y-2">
                                                {filteredCategories.map((cat, idx) => {
                                                    // Get transactions for this category
                                                    const transactions = cat.type === 'income'
                                                        ? incomeList.filter(i => filterByDate(i.date || i.createdAt || '') && (i.category || "Other Income") === cat.name)
                                                        : expenseList.filter(e => filterByDate(e.createdAt) && (e.category || "Other Expenses") === cat.name);

                                                    return (
                                                        <div key={idx} className="group relative flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }} />
                                                                <span className="text-sm font-medium">{cat.name}</span>
                                                                <span className="text-xs text-muted-foreground">({cat.type})</span>
                                                            </div>
                                                            <span className="text-sm font-bold">${cat.amount.toFixed(2)}</span>

                                                            {/* Tooltip - positioned above legend item */}
                                                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-[100] w-full sm:w-96 max-w-[calc(100vw-2rem)]">
                                                                <div className="bg-popover border border-border rounded-lg shadow-xl p-4 max-h-80 overflow-y-auto">
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center justify-between border-b border-border pb-2">
                                                                            <h4 className="font-semibold text-sm">{cat.name} Transactions</h4>
                                                                            <span className="text-xs text-muted-foreground">{transactions.length} items</span>
                                                                        </div>
                                                                        {transactions.length === 0 ? (
                                                                            <p className="text-xs text-muted-foreground">No transactions</p>
                                                                        ) : (
                                                                            <div className="space-y-2">
                                                                                {transactions.map((trans: any, tidx: number) => (
                                                                                    <div key={tidx} className="text-xs p-2 bg-muted/50 rounded">
                                                                                        <div className="flex justify-between items-start gap-2">
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <p className="font-medium truncate">{trans.description || trans.customerName || 'No description'}</p>
                                                                                                <p className="text-muted-foreground text-[10px]">
                                                                                                    {new Date(trans.date || trans.createdAt).toLocaleString()}
                                                                                                </p>
                                                                                            </div>
                                                                                            <span className="font-semibold whitespace-nowrap">
                                                                                                ${(trans.amount || 0).toFixed(2)}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Bar Chart */}
                                {viewMode === 'bar' && (
                                    <div className="space-y-4">
                                        {filteredCategories.map((cat, idx) => {
                                            const maxAmount = Math.max(...filteredCategories.map(c => c.amount), 1);
                                            const percentage = (cat.amount / maxAmount) * 100;

                                            // Get transactions for this category
                                            const transactions = cat.type === 'income'
                                                ? incomeList.filter(i => filterByDate(i.date || i.createdAt || '') && (i.category || "Other Income") === cat.name)
                                                : expenseList.filter(e => filterByDate(e.createdAt) && (e.category || "Other Expenses") === cat.name);

                                            return (
                                                <div key={idx} className="space-y-1 group relative">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-medium">{cat.name}</span>
                                                        <span className="font-bold">${cat.amount.toFixed(2)}</span>
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-6 overflow-hidden relative">
                                                        <div
                                                            className="h-full flex items-center px-2 text-xs text-white font-medium transition-all cursor-pointer"
                                                            style={{
                                                                width: `${percentage}%`,
                                                                backgroundColor: cat.color,
                                                                minWidth: percentage > 0 ? '40px' : '0'
                                                            }}
                                                        >
                                                            {percentage > 10 && `${percentage.toFixed(0)}%`}
                                                        </div>

                                                        {/* Tooltip - positioned above bar */}
                                                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-[100] w-full sm:w-96 max-w-[calc(100vw-2rem)]">
                                                            <div className="bg-popover border border-border rounded-lg shadow-xl p-4 max-h-80 overflow-y-auto">
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between border-b border-border pb-2">
                                                                        <h4 className="font-semibold text-sm">{cat.name} Transactions</h4>
                                                                        <span className="text-xs text-muted-foreground">{transactions.length} items</span>
                                                                    </div>
                                                                    {transactions.length === 0 ? (
                                                                        <p className="text-xs text-muted-foreground">No transactions</p>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            {transactions.map((trans: any, tidx: number) => (
                                                                                <div key={tidx} className="text-xs p-2 bg-muted/50 rounded">
                                                                                    <div className="flex justify-between items-start gap-2">
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <p className="font-medium truncate">{trans.description || trans.customerName || 'No description'}</p>
                                                                                            <p className="text-muted-foreground text-[10px]">
                                                                                                {new Date(trans.date || trans.createdAt).toLocaleString()}
                                                                                            </p>
                                                                                        </div>
                                                                                        <span className="font-semibold whitespace-nowrap">
                                                                                            ${(trans.amount || 0).toFixed(2)}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Line Chart - Monthly Timeline */}
                                {viewMode === 'line' && (
                                    <div className="w-full h-[400px] mt-4">
                                        {(() => {
                                            // Build monthly data
                                            const months: string[] = [];
                                            const now = new Date();
                                            for (let i = 11; i >= 0; i--) {
                                                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                                                months.push(d.toISOString().slice(0, 7));
                                            }

                                            const incomeByMonth = new Map<string, number>();
                                            const expenseByMonth = new Map<string, number>();
                                            months.forEach(m => {
                                                incomeByMonth.set(m, 0);
                                                expenseByMonth.set(m, 0);
                                            });

                                            incomeList.forEach(i => {
                                                const month = (i.date || i.createdAt || '').slice(0, 7);
                                                if (incomeByMonth.has(month)) {
                                                    incomeByMonth.set(month, (incomeByMonth.get(month) || 0) + (i.amount || 0));
                                                }
                                            });

                                            expenseList.forEach(e => {
                                                const month = (e.createdAt || '').slice(0, 7);
                                                if (expenseByMonth.has(month)) {
                                                    expenseByMonth.set(month, (expenseByMonth.get(month) || 0) + (e.amount || 0));
                                                }
                                            });

                                            const aggregateMode = filterType === 'all';
                                            let activeCategories: string[] = [];
                                            let data: any[] = [];
                                            if (aggregateMode) {
                                                data = months.map(m => {
                                                    const inc = incomeByMonth.get(m) || 0;
                                                    const exp = expenseByMonth.get(m) || 0;
                                                    const profit = inc - exp;
                                                    // Avoid division by zero
                                                    const margin = inc > 0 ? (profit / inc) * 100 : 0;
                                                    // Format month for display (e.g., "Jan 2024")
                                                    const [yr, mo] = m.split('-');
                                                    const dateObj = new Date(parseInt(yr), parseInt(mo) - 1, 1);
                                                    const name = dateObj.toLocaleDateString('default', { month: 'short', year: 'numeric' });

                                                    return {
                                                        name,
                                                        Income: inc,
                                                        Expenses: exp,
                                                        Profit: profit,
                                                        Margin: margin
                                                    };
                                                });
                                            } else {
                                                const isIncome = filterType === 'income';
                                                const sourceList = isIncome ? incomeList : expenseList;
                                                activeCategories = Array.from(new Set(sourceList.map(item => item.category || (isIncome ? "Other Income" : "Other Expenses"))));
                                                data = months.map(m => {
                                                    const [yr, mo] = m.split('-');
                                                    const dateObj = new Date(parseInt(yr), parseInt(mo) - 1, 1);
                                                    const name = dateObj.toLocaleDateString('default', { month: 'short', year: 'numeric' });
                                                    const point: any = { name };
                                                    activeCategories.forEach(cat => {
                                                        const total = sourceList.filter(item => {
                                                            const d = (item as any).date || (item as any).createdAt || '';
                                                            const itemMonth = d.slice(0, 7);
                                                            const itemCat = item.category || (isIncome ? "Other Income" : "Other Expenses");
                                                            return itemMonth === m && itemCat === cat;
                                                        }).reduce((sum, item) => sum + (item.amount || 0), 0);
                                                        point[cat] = total;
                                                    });
                                                    return point;
                                                });
                                            }

                                            const getColor = (cat: string) => {
                                                const found = categoryData.find(c => c.name === cat);
                                                return found ? found.color : "#888888";
                                            };

                                            return (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                                        <YAxis yAxisId="left" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                                        {aggregateMode && (
                                                            <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value.toFixed(0)}%`} />
                                                        )}
                                                        <RechartsTooltip
                                                            content={({ active, payload, label }) => {
                                                                if (active && payload && payload.length) {
                                                                    // For LineChart, payload is an array of lines. We want to show details for the active one or all?
                                                                    // Usually user hovers a specific "dot" or the axis.
                                                                    // Let's show details for the items that have value > 0 in this month.

                                                                    const dateStr = label; // e.g. "Dec 2025"
                                                                    // Reverse engineer the date from the string label?
                                                                    // Actually, we have the filter logic available.
                                                                    // Let's find the relevant month.

                                                                    const relevantMonth = months.find(m => {
                                                                        const [yr, mo] = m.split('-');
                                                                        const dateObj = new Date(parseInt(yr), parseInt(mo) - 1, 1);
                                                                        const name = dateObj.toLocaleDateString('default', { month: 'short', year: 'numeric' });
                                                                        return name === label;
                                                                    });

                                                                    if (!relevantMonth) return null;

                                                                    // Collect all relevant transactions for this month across all displayed categories
                                                                    let allTx: any[] = [];

                                                                    payload.forEach((p: any) => {
                                                                        const catName = p.name; // "Income", "Expenses", or Category Name
                                                                        const val = p.value;
                                                                        const color = p.color;

                                                                        if (val <= 0) return;

                                                                        // Logic to find transactions for this Category + Month
                                                                        if (catName === 'Income' || catName === 'Profit' || catName === 'Margin') {
                                                                            // Aggregate mode - maybe just show total? User asked for "breakout".
                                                                            // If "Income" line is hovered, show Income transactions.
                                                                            if (catName === 'Income') {
                                                                                // Invoices
                                                                                const invs = invoiceList.filter(inv => {
                                                                                    const amt = (inv.paymentStatus === 'paid' || (inv.paidAmount || 0) > 0)
                                                                                        ? (inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0))
                                                                                        : 0;
                                                                                    const d = inv.createdAt || inv.date || '';
                                                                                    return amt > 0 && d.startsWith(relevantMonth);
                                                                                }).map(i => ({
                                                                                    date: i.createdAt || i.date,
                                                                                    desc: `Invoice #${(i as any).invoiceNumber || 'Paid'}`,
                                                                                    amount: (i.paidAmount || (i.paymentStatus === 'paid' ? i.total : 0)),
                                                                                    cat: 'Invoice'
                                                                                }));
                                                                                allTx = [...allTx, ...invs];

                                                                                // Manual Income
                                                                                const incs = incomeList.filter(i => {
                                                                                    const d = i.date || i.createdAt || '';
                                                                                    return d.startsWith(relevantMonth);
                                                                                }).map(i => ({
                                                                                    date: i.date || i.createdAt,
                                                                                    desc: i.description || i.customerName || 'Income',
                                                                                    amount: i.amount,
                                                                                    cat: i.category || 'Manual'
                                                                                }));
                                                                                allTx = [...allTx, ...incs];
                                                                            }
                                                                            // If "Expenses", show expenses
                                                                            if (catName === 'Expenses') {
                                                                                const exps = expenseList.filter(e => {
                                                                                    const d = e.createdAt || '';
                                                                                    return d.startsWith(relevantMonth);
                                                                                }).map(e => ({
                                                                                    date: e.createdAt,
                                                                                    desc: e.description || 'Expense',
                                                                                    amount: e.amount,
                                                                                    cat: e.category || 'Expense'
                                                                                }));
                                                                                allTx = [...allTx, ...exps];
                                                                            }
                                                                        } else {
                                                                            // Specific Category Mode
                                                                            // Check if it's income or expense category
                                                                            const isIncCat = DEFAULT_CATEGORIES.income.includes(catName) || customIncomeCategories.includes(catName) || (catName === "Service Income");

                                                                            if (isIncCat) {
                                                                                // Invoices logic for Service Income
                                                                                if (catName === 'Service Income') {
                                                                                    const invs = invoiceList.filter(inv => {
                                                                                        const amt = (inv.paymentStatus === 'paid' || (inv.paidAmount || 0) > 0)
                                                                                            ? (inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0))
                                                                                            : 0;
                                                                                        const d = inv.createdAt || inv.date || '';
                                                                                        return amt > 0 && d.startsWith(relevantMonth);
                                                                                    }).map(i => ({
                                                                                        date: i.createdAt || i.date,
                                                                                        desc: `Invoice #${(i as any).invoiceNumber || 'Paid'}`,
                                                                                        amount: (i.paidAmount || (i.paymentStatus === 'paid' ? i.total : 0)),
                                                                                        cat: 'Invoice'
                                                                                    }));
                                                                                    allTx = [...allTx, ...invs];
                                                                                }
                                                                                // Manual Income for this cat
                                                                                const incs = incomeList.filter(i => {
                                                                                    const d = i.date || i.createdAt || '';
                                                                                    return i.category === catName && d.startsWith(relevantMonth);
                                                                                }).map(i => ({
                                                                                    date: i.date || i.createdAt,
                                                                                    desc: i.description || i.customerName || 'Income',
                                                                                    amount: i.amount,
                                                                                    cat: 'Manual'
                                                                                }));
                                                                                allTx = [...allTx, ...incs];
                                                                            } else {
                                                                                // Expense Cat
                                                                                const exps = expenseList.filter(e => {
                                                                                    const d = e.createdAt || '';
                                                                                    return e.category === catName && d.startsWith(relevantMonth);
                                                                                }).map(e => ({
                                                                                    date: e.createdAt,
                                                                                    desc: e.description || 'Expense',
                                                                                    amount: e.amount,
                                                                                    cat: 'Expense'
                                                                                }));
                                                                                allTx = [...allTx, ...exps];
                                                                            }
                                                                        }
                                                                    });

                                                                    // Sort and limit
                                                                    allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                                                    const displayTx = allTx.slice(0, 5);

                                                                    return (
                                                                        <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border border-border min-w-[200px]">
                                                                            <div className="font-bold mb-2 border-b pb-1">{label}</div>
                                                                            <div className="space-y-2">
                                                                                {displayTx.map((tx, idx) => (
                                                                                    <div key={idx} className="text-xs flex justify-between items-center gap-4">
                                                                                        <div className="flex flex-col">
                                                                                            <span className="font-medium">{tx.desc}</span>
                                                                                            <span className="text-[10px] text-muted-foreground">{tx.cat} • {new Date(tx.date).toLocaleDateString()}</span>
                                                                                        </div>
                                                                                        <span className="font-mono">${tx.amount.toFixed(2)}</span>
                                                                                    </div>
                                                                                ))}
                                                                                {allTx.length > 5 && (
                                                                                    <div className="text-xs text-muted-foreground pt-1 text-center italic">+ {allTx.length - 5} more...</div>
                                                                                )}
                                                                                {allTx.length === 0 && <div className="text-xs text-muted-foreground">No details available</div>}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            }}
                                                        />
                                                        <Legend />
                                                        {aggregateMode ? (
                                                            <>
                                                                <Line yAxisId="left" type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                                <Line yAxisId="left" type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                                <Line yAxisId="left" type="monotone" dataKey="Profit" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                                <Line yAxisId="right" type="monotone" dataKey="Margin" stroke="#f59e0b" strokeWidth={1} dot={false} activeDot={{ r: 4 }} />
                                                            </>
                                                        ) : (
                                                            activeCategories.map(cat => (
                                                                <Line key={cat} yAxisId="left" type="monotone" dataKey={cat} stroke={getColor(cat)} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                                            ))
                                                        )}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            );
                                        })()}
                                    </div>
                                )}
                            </Card>

                            {/* Filter */}
                            <Card className="p-4">
                                <div className="flex items-center gap-4">
                                    <Filter className="h-5 w-5 text-muted-foreground" />
                                    <Label>Filter by Type:</Label>
                                    <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="income">Income Only</SelectItem>
                                            <SelectItem value="expense">Expenses Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* Categories Tab */}
                        <TabsContent value="categories" className="space-y-4">
                            <Card className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold">Manage Categories</h2>
                                    <Button onClick={() => setAddCategoryOpen(true)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Category
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="font-semibold mb-3 text-green-600">Income Categories</h3>
                                        <div className="space-y-2">
                                            {[...DEFAULT_CATEGORIES.income, ...customIncomeCategories, ...customCategories.filter(c => !DEFAULT_CATEGORIES.expense.includes(c))].map((cat, idx) => {
                                                const isDefault = DEFAULT_CATEGORIES.income.includes(cat);
                                                return (
                                                    <div key={idx} className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800 flex justify-between items-center group">
                                                        <span className="font-medium text-green-900 dark:text-green-100">{cat}</span>
                                                        <div className="flex gap-1">
                                                            {!isDefault && (
                                                                <>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditCategory(cat, 'income')}>
                                                                        <Pencil className="h-3 w-3 text-green-700" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteCategory(cat, 'income')}>
                                                                        <Trash2 className="h-3 w-3 text-red-600" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold mb-3 text-red-600">Expense Categories</h3>
                                        <div className="space-y-2">
                                            {[...DEFAULT_CATEGORIES.expense, ...customExpenseCategories].map((cat, idx) => {
                                                const isDefault = DEFAULT_CATEGORIES.expense.includes(cat);
                                                return (
                                                    <div key={idx} className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800 flex justify-between items-center group">
                                                        <span className="font-medium text-red-900 dark:text-red-100">{cat}</span>
                                                        <div className="flex gap-1">
                                                            {!isDefault && (
                                                                <>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditCategory(cat, 'expense')}>
                                                                        <Pencil className="h-3 w-3 text-red-700" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteCategory(cat, 'expense')}>
                                                                        <Trash2 className="h-3 w-3 text-red-600" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* Budget Planning Tab */}
                        <TabsContent value="budget" className="space-y-4">
                            <Card className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold">Budget vs Actual (This Month)</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Set monthly targets and track your performance. Positive variance in Income is good (Green), positive variance in Expenses is bad (Red).
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-md border overflow-x-auto w-full">
                                    <Table className="min-w-[600px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Budget Target</TableHead>
                                                <TableHead>Actual</TableHead>
                                                <TableHead>Variance</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {/* Income Categories */}
                                            {[...DEFAULT_CATEGORIES.income, ...customIncomeCategories, ...customCategories.filter(c => !DEFAULT_CATEGORIES.expense.includes(c))].map(cat => {
                                                // Calculate Actual (This Month)
                                                let actual = 0;
                                                const now = new Date();

                                                // 1. Manual Income
                                                actual += incomeList.filter(i => {
                                                    const d = new Date(i.date || i.createdAt || '');
                                                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && (i.category === cat);
                                                }).reduce((sum, i) => sum + (i.amount || 0), 0);

                                                // 2. Invoices (If Service Income)
                                                if (cat === 'Service Income' || cat === 'Invoice Revenue') {
                                                    actual += invoiceList.filter(inv => {
                                                        const amt = (inv.paymentStatus === 'paid' || (inv.paidAmount || 0) > 0)
                                                            ? (inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0))
                                                            : 0;
                                                        if (amt <= 0) return false;

                                                        const d = new Date(inv.createdAt || inv.date || '');
                                                        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                                    }).reduce((sum, inv) => {
                                                        const amt = (inv.paymentStatus === 'paid' || (inv.paidAmount || 0) > 0)
                                                            ? (inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0))
                                                            : 0;
                                                        return sum + amt;
                                                    }, 0);
                                                }

                                                const targetObj = budgetTargets.find(t => t.category === cat && t.type === 'income');
                                                const target = targetObj?.target || 0;
                                                const variance = actual - target;
                                                const percent = target > 0 ? (actual / target) * 100 : 0;

                                                return (
                                                    <TableRow key={`inc-${cat}`}>
                                                        <TableCell className="font-medium">{cat}</TableCell>
                                                        <TableCell className="text-green-600">Income</TableCell>
                                                        <TableCell>
                                                            <div className="relative max-w-[120px]">
                                                                <span className="absolute left-2 top-2.5 text-muted-foreground">$</span>
                                                                <Input
                                                                    type="number"
                                                                    value={target || ''}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0;
                                                                        const newTargets = [...budgetTargets];
                                                                        const idx = newTargets.findIndex(t => t.category === cat && t.type === 'income');
                                                                        if (idx >= 0) newTargets[idx].target = val;
                                                                        else newTargets.push({ category: cat, target: val, type: 'income' });
                                                                        setBudgetTargets(newTargets);
                                                                        localforage.setItem("budgetTargets", newTargets);
                                                                    }}
                                                                    className="pl-6 h-9"
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>${actual.toFixed(2)}</TableCell>
                                                        <TableCell className={`font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {variance >= 0 ? '+' : ''}{variance.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                                                    <div className={`h-full ${variance >= 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(percent, 100)}%` }} />
                                                                </div>
                                                                <span className="text-xs text-muted-foreground">{percent.toFixed(0)}%</span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}

                                            {/* Expense Categories */}
                                            {[...DEFAULT_CATEGORIES.expense, ...customExpenseCategories].map(cat => {
                                                const actual = expenseList.filter(e => {
                                                    const d = new Date(e.createdAt);
                                                    const now = new Date();
                                                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && (e.category === cat);
                                                }).reduce((sum, e) => sum + (e.amount || 0), 0);

                                                const targetObj = budgetTargets.find(t => t.category === cat && t.type === 'expense');
                                                const target = targetObj?.target || 0;
                                                const variance = target - actual; // For expenses, under budget (positive variance) is good
                                                const percent = target > 0 ? (actual / target) * 100 : 0;
                                                const isOverBudget = actual > target;

                                                return (
                                                    <TableRow key={`exp-${cat}`}>
                                                        <TableCell className="font-medium">{cat}</TableCell>
                                                        <TableCell className="text-red-600">Expense</TableCell>
                                                        <TableCell>
                                                            <div className="relative max-w-[120px]">
                                                                <span className="absolute left-2 top-2.5 text-muted-foreground">$</span>
                                                                <Input
                                                                    type="number"
                                                                    value={target || ''}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0;
                                                                        const newTargets = [...budgetTargets];
                                                                        const idx = newTargets.findIndex(t => t.category === cat && t.type === 'expense');
                                                                        if (idx >= 0) newTargets[idx].target = val;
                                                                        else newTargets.push({ category: cat, target: val, type: 'expense' });
                                                                        setBudgetTargets(newTargets);
                                                                        localforage.setItem("budgetTargets", newTargets);
                                                                    }}
                                                                    className="pl-6 h-9"
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>${actual.toFixed(2)}</TableCell>
                                                        <TableCell className={`font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {variance >= 0 ? '+' : ''}{variance.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                                                    <div className={`h-full ${isOverBudget ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(percent, 100)}%` }} />
                                                                </div>
                                                                <span className="text-xs text-muted-foreground">{percent.toFixed(0)}%</span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            {/* Add Category Dialog */}
            <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Custom Category</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Category Name</Label>
                            <Input
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                placeholder="Enter category name"
                            />
                        </div>
                        <div>
                            <Label>Type</Label>
                            <Select value={newCategoryType} onValueChange={(v: any) => setNewCategoryType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="income">Income</SelectItem>
                                    <SelectItem value="expense">Expense</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddCategoryOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddCategory}>Add Category</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Category Dialog */}
            <Dialog open={editCategoryOpen} onOpenChange={setEditCategoryOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Category Name</Label>
                            <Input
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                placeholder="Enter category name"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditCategoryOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateCategory}>Update Category</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CompanyBudget;
