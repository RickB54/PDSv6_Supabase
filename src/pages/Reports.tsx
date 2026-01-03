import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Save, AlertTriangle, FileBarChart, Calendar, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { servicePackages } from "@/lib/services";
import { savePDFToArchive } from "@/lib/pdfArchive";
import localforage from "localforage";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import jsPDF from "jspdf";
import { getCurrentUser } from "@/lib/auth";
import { getReceivables } from "@/lib/receivables";
import { getExpenses } from "@/lib/db";
import { getChemicals, getMaterials, getTools } from "@/lib/inventory-data";

const Reports = () => {
  const [dateFilter, setDateFilter] = useState<"all" | "daily" | "weekly" | "monthly">("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  // Accounting
  const [income, setIncome] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  // UI state for modals
  const [checklistOpen, setChecklistOpen] = useState<boolean>(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [customerJobsOpen, setCustomerJobsOpen] = useState<boolean>(false);
  const [customerJobs, setCustomerJobs] = useState<any[]>([]);
  const [customerJobsCustomer, setCustomerJobsCustomer] = useState<any | null>(null);

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    // Always load data from localforage (fast, cached)
    loadData();

    // Mark as loaded for this session
    sessionStorage.setItem('reports-loaded', 'true');
  }, []);

  const loadData = async () => {
    const cust = (await localforage.getItem<any[]>("customers")) || [];
    const inv = (await localforage.getItem<any[]>("invoices")) || [];
    // Load Inventory from Supabase
    const chems = await getChemicals();
    const mats = await getMaterials();
    const tls = await getTools();
    let jobsData = (await localforage.getItem<any[]>("completed-jobs")) || [];
    if (!jobsData || jobsData.length === 0) {
      try {
        const ls = localStorage.getItem("completedJobs");
        jobsData = ls ? JSON.parse(ls) : [];
      } catch {
        jobsData = [];
      }
    }
    const estimatesData = (await localforage.getItem<any[]>("estimates")) || [];
    const incomeData = await getReceivables();
    const expenseData = await getExpenses();
    const payrollData = (await localforage.getItem<any[]>("payroll-history")) || [];
    setCustomers(cust);
    setInvoices(inv);
    setChemicals(chems);
    setMaterials(mats);
    setTools(tls);
    setJobs(jobsData);
    setEstimates(estimatesData);
    setIncome(incomeData);
    setExpenses(expenseData);
    setPayrollHistory(payrollData);
  };

  const filterByDate = (items: any[], dateField = "createdAt") => {
    const now = new Date();
    return items.filter(item => {
      const itemDate = new Date(item[dateField] || item.date || item.createdAt || item.finishedAt);
      if (!itemDate || isNaN(itemDate.getTime())) return false;

      let passQuick = true;
      if (dateFilter === "daily") passQuick = itemDate.toDateString() === now.toDateString();
      else if (dateFilter === "weekly") passQuick = itemDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (dateFilter === "monthly") passQuick = itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();

      let passRange = true;
      if (dateRange.from) passRange = itemDate >= new Date(dateRange.from.setHours(0, 0, 0, 0));
      if (passRange && dateRange.to) passRange = itemDate <= new Date(dateRange.to.setHours(23, 59, 59, 999));

      return passQuick && passRange;
    });
  };

  const generateCustomerReport = (download = false) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Customer Report", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 28, { align: "center" });

    let y = 40;
    // Customers don't have dates, so show all customers
    const filteredCustomers = customers;

    filteredCustomers.forEach((cust) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.text(`${cust.name}`, 20, y);
      y += 6;
      doc.setFontSize(9);
      doc.text(`Vehicle: ${cust.year || ''} ${cust.vehicle || ''} ${cust.model || ''} | Type: ${cust.vehicleType || 'N/A'}`, 20, y);
      y += 5;
      doc.text(`Email: ${cust.email || 'N/A'} | Phone: ${cust.phone || 'N/A'}`, 20, y);
      y += 5;
      doc.text(`Address: ${cust.address || 'N/A'}`, 20, y);
      y += 8;
    });

    if (download) doc.save(`CustomerReport_${new Date().toISOString().split('T')[0]}.pdf`);
    else window.open(doc.output('bloburl'), '_blank');
  };

  const generateInventoryReport = (download = false) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Inventory Report", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 28, { align: "center" });

    let y = 40;
    let grandTotal = 0;

    // Chemicals
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.text("Chemical Inventory", 20, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    let chemicalsTotal = 0;
    chemicals.forEach(chem => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      const cost = chem.costPerBottle || 0;
      const stock = chem.currentStock || 0;
      const total = cost * stock;
      chemicalsTotal += total;

      const lowStock = stock < chem.threshold;
      const text = `${chem.name} (${chem.bottleSize})`;
      const details = `Stock: ${stock} | Cost: $${cost.toFixed(2)} | Value: $${total.toFixed(2)}`;

      doc.text(text, 20, y);
      doc.text(details, 120, y);
      if (lowStock) {
        doc.setTextColor(220, 38, 38);
        doc.text("(LOW STOCK)", 180, y);
        doc.setTextColor(0, 0, 0);
      }
      y += 6;
    });

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Chemicals Subtotal: $${chemicalsTotal.toFixed(2)}`, 120, y + 2);
    doc.setFont(undefined, 'normal');
    y += 10;
    grandTotal += chemicalsTotal;

    // Materials
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.text("Materials Inventory", 20, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    let materialsTotal = 0;
    materials.forEach(mat => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      const cost = mat.costPerItem || 0;
      const qty = mat.quantity || 0;
      const total = cost * qty;
      materialsTotal += total;

      doc.text(`${mat.name}`, 20, y);
      doc.text(`Qty: ${qty} | Cost: $${cost.toFixed(2)} | Value: $${total.toFixed(2)}`, 120, y);
      y += 6;
    });

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Materials Subtotal: $${materialsTotal.toFixed(2)}`, 120, y + 2);
    doc.setFont(undefined, 'normal');
    y += 10;
    grandTotal += materialsTotal;

    // Tools
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.text("Tools Inventory", 20, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    let toolsTotal = 0;
    tools.forEach(tool => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      const cost = tool.cost || 0;
      const qty = tool.quantity || 1;
      const total = cost * qty;
      toolsTotal += total;

      doc.text(`${tool.name}`, 20, y);
      doc.text(`Qty: ${qty} | Cost: $${cost.toFixed(2)} | Value: $${total.toFixed(2)}`, 120, y);
      y += 6;
    });

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Tools Subtotal: $${toolsTotal.toFixed(2)}`, 120, y + 2);
    y += 10;
    grandTotal += toolsTotal;

    // Grand Total
    y += 5;
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.text(`GRAND TOTAL: $${grandTotal.toFixed(2)}`, 120, y);

    if (download) doc.save(`InventoryReport_${new Date().toISOString().split('T')[0]}.pdf`);
    else window.open(doc.output('bloburl'), '_blank');
  };

  const generateEmployeeReport = (download = false) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Employee Performance Report", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 28, { align: "center" });

    let y = 40;
    const filteredJobs = filterByDate(jobs, 'finishedAt');

    doc.setFontSize(12);
    doc.text(`Total Jobs Completed: ${filteredJobs.length}`, 20, y);
    y += 10;

    filteredJobs.forEach(job => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.text(`Employee: ${job.employeeId || job.employee || job.employeeName || 'N/A'}`, 20, y);
      y += 5;
      doc.text(`Customer: ${job.customerName || job.customer || 'N/A'} | Vehicle: ${job.vehicleType || job.vehicle || 'N/A'}`, 20, y);
      y += 5;
      doc.text(`Service: ${job.packageId || job.service || 'N/A'} | Time: ${job.estimatedTime || job.totalTime || 'N/A'}`, 20, y);
      y += 5;
      doc.text(`Date: ${job.createdAt || job.finishedAt ? new Date(job.createdAt || job.finishedAt).toLocaleString() : 'N/A'}`, 20, y);
      y += 8;
    });

    if (download) doc.save(`EmployeeReport_${new Date().toISOString().split('T')[0]}.pdf`);
    else window.open(doc.output('bloburl'), '_blank');
  };

  const generateEstimatesReport = (download = false) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Estimates & Quotes Report", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 28, { align: "center" });

    let y = 40;
    const filteredEstimates = filterByDate(estimates);

    doc.setFontSize(12);
    doc.text(`Total Estimates: ${filteredEstimates.length}`, 20, y);
    y += 10;

    filteredEstimates.forEach(est => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.text(`#${est.id || 'N/A'} - ${est.customerName || 'N/A'}`, 20, y);
      y += 5;
      doc.text(`Service: ${est.service || 'N/A'} | Total: $${est.total || 0}`, 20, y);
      y += 5;
      doc.text(`Status: ${est.status || 'Draft'}`, 20, y);
      y += 8;
    });

    if (download) doc.save(`EstimatesReport_${new Date().toISOString().split('T')[0]}.pdf`);
    else window.open(doc.output('bloburl'), '_blank');
  };

  const generateAccountingReport = (download = false) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Accounting & Financial Report", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 28, { align: "center" });

    let y = 40;

    // 1. Inventory Assets (Calculated from live data)
    const chemVal = chemicals.reduce((s, c) => s + ((c.costPerBottle || 0) * (c.currentStock || 0)), 0);
    const matVal = materials.reduce((s, m) => s + ((m.costPerItem || 0) * (m.quantity || 0)), 0);
    const toolVal = tools.reduce((s, t) => s + ((t.cost || 0) * (t.quantity || 1)), 0);
    const totalAssets = chemVal + matVal + toolVal;

    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94); // Green
    doc.text("Inventory Assets", 20, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Chemicals Value: $${chemVal.toFixed(2)}`, 20, y);
    doc.text(`Materials Value: $${matVal.toFixed(2)}`, 80, y);
    doc.text(`Tools Value: $${toolVal.toFixed(2)}`, 140, y);
    y += 6;
    doc.setFont(undefined, 'bold');
    doc.text(`Total Inventory Investment: $${totalAssets.toFixed(2)}`, 20, y);
    doc.setFont(undefined, 'normal');
    y += 15;

    // 2. Financial Summary
    // Filter data based on current UI filter
    const activeIncome = income.filter(i => filterByDate([i], i.date ? 'date' : 'createdAt').length);
    const activeExpenses = expenses.filter(e => filterByDate([e]).length);

    const totalInc = activeIncome.reduce((s, i) => s + (i.amount || 0), 0);
    const totalExp = activeExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const netProfit = totalInc - totalExp;

    doc.setFontSize(14);
    doc.text("Financial Summary", 20, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Total Income: $${totalInc.toFixed(2)}`, 20, y);
    doc.text(`Total Operating Expenses: $${totalExp.toFixed(2)}`, 80, y);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(netProfit >= 0 ? 34 : 220, netProfit >= 0 ? 197 : 38, netProfit >= 0 ? 94 : 38);
    doc.text(`Net Profit: $${netProfit.toFixed(2)}`, 140, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    y += 15;

    // 3. Break-Even Analysis
    const totalInvestment = totalAssets + totalExp; // Assets + Expenses
    const remainingBreakEven = totalInvestment - totalInc;
    const recoveryPct = totalInvestment > 0 ? (totalInc / totalInvestment) * 100 : 0;

    doc.setFontSize(14);
    doc.setTextColor(99, 102, 241); // Indigo
    doc.text("Break-Even Analysis", 20, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
    doc.setFontSize(10);
    doc.text("Tracks ROI (Inventory Assets + Expenses vs Revenue)", 20, y);
    y += 6;
    doc.text(`Total Investment (Assets + Exp): $${totalInvestment.toFixed(2)}`, 20, y);
    doc.text(`Total Service Revenue: $${totalInc.toFixed(2)}`, 100, y);
    y += 6;
    doc.setFont(undefined, 'bold');
    if (remainingBreakEven > 0) {
      doc.setTextColor(234, 88, 12); // Orange
      doc.text(`Remaining to Break Even: $${remainingBreakEven.toFixed(2)}`, 20, y);
    } else {
      doc.setTextColor(34, 197, 94); // Green
      doc.text(`PROFITABLE (Break-Even Achieved!)`, 20, y);
    }
    doc.setTextColor(0, 0, 0);
    doc.text(`Recovery: ${recoveryPct.toFixed(1)}%`, 140, y);
    doc.setFont(undefined, 'normal');
    y += 15;

    // 4. Ledger Details
    doc.setFontSize(14);
    doc.text("Ledger Details", 20, y);
    y += 10;

    // Income
    doc.setFontSize(11);
    doc.text("Income", 20, y);
    y += 6;
    activeIncome.forEach(i => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.text(`+ $${(i.amount || 0).toFixed(2)} | ${(i.date || '').slice(0, 10)} | ${i.category} | ${i.description || '-'}`, 25, y);
      y += 5;
    });

    y += 5;
    if (y > 270) { doc.addPage(); y = 20; }

    // Expenses
    doc.setFontSize(11);
    doc.text("Expenses", 20, y);
    y += 6;
    activeExpenses.forEach(e => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.text(`- $${(e.amount || 0).toFixed(2)} | ${(e.createdAt || '').slice(0, 10)} | ${e.category} | ${e.description || '-'}`, 25, y);
      y += 5;
    });

    if (download) doc.save(`AccountingReport_${new Date().toISOString().split('T')[0]}.pdf`);
    else window.open(doc.output('bloburl'), '_blank');
  };

  const buildCustomerJobsPDF = (cust: any, jobsForCust: any[], returnDataUrl: boolean) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Customer Jobs Report", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 28, { align: "center" });

    let y = 40;
    doc.setFontSize(12);
    doc.text(`Customer: ${cust?.name || '—'}`, 20, y);
    y += 6;
    const vehicleLine = `Vehicle: ${cust?.year || ''} ${cust?.vehicle || ''} ${cust?.model || ''}`.trim();
    if (vehicleLine.length > 9) { doc.text(vehicleLine, 20, y); y += 6; }
    if (cust?.email || cust?.phone) { doc.text(`Contact: ${cust?.email || '—'} | ${cust?.phone || '—'}`, 20, y); y += 10; }

    doc.setFontSize(12);
    doc.text(`Total Jobs: ${jobsForCust.length}`, 20, y);
    y += 8;

    jobsForCust.forEach(job => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      const dateStr = job.finishedAt ? new Date(job.finishedAt).toLocaleString() : '—';
      const employeeStr = job.employee?.name || job.employee || job.employeeName || '—';
      const pkg = job.service || job.package || '—';
      const addOnsStr = Array.isArray(job.addOns) ? job.addOns.join(', ') : (job.addOns || '—');
      const durationStr = job.totalTime || job.duration || '—';
      const totalStr = `$${Number(job.totalRevenue || job.total || 0).toFixed(2)}`;

      doc.text(`Date/Time: ${dateStr}`, 20, y); y += 5;
      doc.text(`Employee: ${employeeStr}`, 20, y); y += 5;
      doc.text(`Package: ${pkg}`, 20, y); y += 5;
      doc.text(`Add-ons: ${addOnsStr}`, 20, y); y += 5;
      doc.text(`Duration: ${durationStr} | Total: ${totalStr}`, 20, y); y += 8;

      const svc = servicePackages.find(sp => sp.id === job.serviceId || sp.name === job.service);
      if (svc) {
        const stepCount = (svc.steps || []).length;
        doc.text(`Checklist Tasks: ${stepCount}`, 20, y); y += 8;
      }
    });

    return returnDataUrl ? doc.output('datauristring') : doc.output('bloburl');
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Reports" />
        <main className="container mx-auto px-4 py-6 max-w-4xl">
          <Card className="p-8 bg-destructive/10 border-destructive">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertTriangle className="h-16 w-16 text-destructive" />
              <h2 className="text-2xl font-bold text-foreground">Admin Access Required</h2>
              <p className="text-muted-foreground">Reports are only accessible to administrators.</p>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  const lowStockChemicals = chemicals.filter(c => c.currentStock < c.threshold);
  const lowStockMaterials = materials.filter(m => (m.quantity || 0) < (m.threshold || m.lowThreshold || 0));
  const lowStockTools = tools.filter(t => (t.quantity || 0) < (t.threshold || 0));
  const totalInventoryValue = chemicals.reduce((sum, c) => sum + ((c.costPerBottle || 0) * (c.currentStock || 0)), 0);
  const totalMaterialsValue = materials.reduce((sum, m) => sum + ((m.costPerItem || 0) * (m.quantity || 0)), 0);
  const totalToolsValue = tools.reduce((sum, t) => sum + ((t.cost || 0) * (t.quantity || 1)), 0);
  const chemicalsSorted = [...chemicals].sort((a, b) => {
    const alow = a.currentStock < a.threshold; const blow = b.currentStock < b.threshold;
    if (alow !== blow) return alow ? -1 : 1; return (a.name || '').localeCompare(b.name || '');
  });
  const materialsSorted = [...materials].sort((a, b) => {
    const alow = (a.quantity || 0) < (a.threshold || a.lowThreshold || 0);
    const blow = (b.quantity || 0) < (b.threshold || b.lowThreshold || 0);
    if (alow !== blow) return alow ? -1 : 1; return (a.name || '').localeCompare(b.name || '');
  });
  const toolsSorted = [...tools].sort((a, b) => {
    const alow = (a.quantity || 0) < (a.threshold || 0);
    const blow = (b.quantity || 0) < (b.threshold || 0);
    if (alow !== blow) return alow ? -1 : 1; return (a.name || '').localeCompare(b.name || '');
  });

  const tabList = [
    { id: 'customers', label: 'Customers' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'employee', label: 'Employee' },
    { id: 'estimates', label: 'Estimates' },
    { id: 'accounting', label: 'Accounting' },
  ]

  const initialTab = new URLSearchParams(window.location.search).get('tab') || 'customers';
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Business Reports" />
      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">

        {/* Stats / Header Card */}
        <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-zinc-800 text-zinc-200">
                <FileBarChart className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Reports Center</h2>
                <p className="text-zinc-400 text-sm">Analyze business performance</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
                <SelectTrigger className="w-40 bg-zinc-950 border-zinc-800 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="daily">Today</SelectItem>
                  <SelectItem value="weekly">This Week</SelectItem>
                  <SelectItem value="monthly">This Month</SelectItem>
                </SelectContent>
              </Select>
              <DateRangeFilter value={dateRange} onChange={setDateRange} storageKey="reports-range" />
            </div>
          </div>
        </Card>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 w-full flex flex-wrap h-auto">
            {tabList.map(t => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="flex-1 min-w-[100px] data-[state=active]:bg-zinc-800 data:[state=active]:text-white data-[state=active]:shadow-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* CUSTOMERS TAB */}
          <TabsContent value="customers" className="space-y-4 animate-in fade-in-50">
            <Card className="p-6 bg-zinc-900/50 border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-200">Customer Overview</h3>
                  <p className="text-zinc-500 text-sm">Total Customers: <span className="text-white font-mono">{customers.length}</span></p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => generateCustomerReport(false)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"><Printer className="h-4 w-4 mr-2" /> Print</Button>
                  <Button variant="outline" size="sm" onClick={() => generateCustomerReport(true)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"><Save className="h-4 w-4 mr-2" /> PDF</Button>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-800">
                <label className="block text-sm font-medium text-zinc-400 mb-2">Detailed Customer Report</label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="w-full max-w-md bg-zinc-950 border-zinc-800 text-zinc-200">
                    <SelectValue placeholder="Select a customer..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-h-[300px]">
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                {selectedCustomer && (() => {
                  const cust = customers.find(c => c.id === selectedCustomer);
                  const custInvoices = invoices.filter(inv => inv.customerId === selectedCustomer);
                  const totalSpent = custInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
                  const totalOwed = custInvoices.reduce((sum, inv) => sum + ((inv.total || 0) - (inv.paidAmount || 0)), 0);
                  return (
                    <div className="mt-6 p-6 bg-zinc-950 rounded-xl border border-zinc-800">
                      <h4 className="text-lg font-bold text-white mb-4 underline decoration-zinc-700 underline-offset-4 cursor-pointer hover:text-blue-400 transition-colors"
                        onClick={() => {
                          const jobsForCustomer = jobs.filter(j => (j.customerId || j.customer?.id) === cust?.id || (j.customer || j.customerName) === cust?.name);
                          setCustomerJobs(jobsForCustomer);
                          setCustomerJobsCustomer(cust);
                          setCustomerJobsOpen(true);
                        }}>
                        {cust?.name}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="p-4 bg-zinc-900 rounded border border-zinc-800">
                          <p className="text-xs text-zinc-500 uppercase">Total Spent</p>
                          <p className="text-2xl font-bold text-emerald-400">${totalSpent.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-zinc-900 rounded border border-zinc-800">
                          <p className="text-xs text-zinc-500 uppercase">Outstanding Balance</p>
                          <p className="text-2xl font-bold text-red-400">${totalOwed.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="text-sm text-zinc-400 space-y-1">
                        <p>Vehicle: <span className="text-zinc-200">{cust?.year} {cust?.vehicle} {cust?.model}</span></p>
                        <p>Total Services: <span className="text-zinc-200">{custInvoices.length}</span></p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </Card>
          </TabsContent>

          {/* INVOICES TAB */}
          <TabsContent value="invoices" className="space-y-4 animate-in fade-in-50">
            <Card className="p-6 bg-zinc-900/50 border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-200">Invoice Performance</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => generateCustomerReport(false)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"><Printer className="h-4 w-4 mr-2" /> Print</Button>
                  <Button variant="outline" size="sm" onClick={() => generateCustomerReport(true)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"><Save className="h-4 w-4 mr-2" /> PDF</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Count</p>
                  <p className="text-3xl font-bold text-white mt-1">{filterByDate(invoices).length}</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Revenue</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">${filterByDate(invoices).reduce((sum, inv) => sum + (inv.total || 0), 0).toFixed(2)}</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Collected</p>
                  <p className="text-3xl font-bold text-blue-400 mt-1">${filterByDate(invoices).reduce((sum, inv) => sum + (inv.paidAmount || 0), 0).toFixed(2)}</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Outstanding</p>
                  <p className="text-3xl font-bold text-red-400 mt-1">
                    ${(filterByDate(invoices).reduce((sum, inv) => sum + (inv.total || 0), 0) - filterByDate(invoices).reduce((sum, inv) => sum + (inv.paidAmount || 0), 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* INVENTORY TAB */}
          <TabsContent value="inventory" className="space-y-4 animate-in fade-in-50">
            <Card className="p-6 bg-zinc-900/50 border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-200">Inventory Status</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => generateInventoryReport(false)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"><Printer className="h-4 w-4 mr-2" /> Print</Button>
                  <Button variant="outline" size="sm" onClick={() => generateInventoryReport(true)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"><Save className="h-4 w-4 mr-2" /> PDF</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Items Tracked</p>
                  <p className="text-3xl font-bold text-white mt-1">{chemicals.length + materials.length + tools.length}</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Low Stock Alerts</p>
                  <p className="text-3xl font-bold text-amber-500 mt-1">{lowStockChemicals.length + lowStockMaterials.length + lowStockTools.length}</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Valuation</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">${(totalInventoryValue + totalMaterialsValue + totalToolsValue).toFixed(2)}</p>
                </div>
              </div>

              {/* Chemicals Table */}
              <h4 className="text-md font-bold text-red-400 mb-3 bg-red-500/10 p-2 rounded inline-block border border-red-500/20">Chemicals</h4>
              <div className="rounded-lg border border-zinc-800 overflow-hidden mb-6">
                <Table>
                  <TableHeader className="bg-zinc-900"><TableRow className="border-zinc-800 hover:bg-zinc-900/50"><TableHead className="text-zinc-400">Item</TableHead><TableHead className="text-zinc-400">Size</TableHead><TableHead className="text-zinc-400">Stock</TableHead><TableHead className="text-zinc-400">Cost</TableHead><TableHead className="text-zinc-400">Value</TableHead><TableHead className="text-zinc-400">Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {chemicalsSorted.map(c => (
                      <TableRow key={c.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="font-medium text-zinc-200">{c.name}</TableCell>
                        <TableCell className="text-zinc-400">{c.bottleSize}</TableCell>
                        <TableCell className={c.currentStock < c.threshold ? "text-amber-500 font-bold" : "text-zinc-300"}>{c.currentStock}</TableCell>
                        <TableCell className="text-zinc-400">${(c.costPerBottle || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-zinc-300">${((c.costPerBottle || 0) * (c.currentStock || 0)).toFixed(2)}</TableCell>
                        <TableCell>{c.currentStock < c.threshold ? <span className="text-amber-500 text-xs font-bold border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded">LOW</span> : <span className="text-emerald-500 text-xs">OK</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Materials Table */}
              <h4 className="text-md font-bold text-blue-400 mb-3 bg-blue-500/10 p-2 rounded inline-block border border-blue-500/20">Materials</h4>
              <div className="rounded-lg border border-zinc-800 overflow-hidden mb-6">
                <Table>
                  <TableHeader className="bg-zinc-900"><TableRow className="border-zinc-800 hover:bg-zinc-900/50"><TableHead className="text-zinc-400">Item</TableHead><TableHead className="text-zinc-400">Subtype</TableHead><TableHead className="text-zinc-400">Qty</TableHead><TableHead className="text-zinc-400">Cost</TableHead><TableHead className="text-zinc-400">Value</TableHead><TableHead className="text-zinc-400">Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {materialsSorted.map(m => (
                      <TableRow key={m.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="font-medium text-zinc-200">{m.name}</TableCell>
                        <TableCell className="text-zinc-400">{m.subtype || m.type || '—'}</TableCell>
                        <TableCell className={(m.quantity || 0) < (m.threshold || m.lowThreshold || 0) ? "text-amber-500 font-bold" : "text-zinc-300"}>{m.quantity || 0}</TableCell>
                        <TableCell className="text-zinc-400">${(m.costPerItem || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-zinc-300">${((m.costPerItem || 0) * (m.quantity || 0)).toFixed(2)}</TableCell>
                        <TableCell>{(m.quantity || 0) < (m.threshold || m.lowThreshold || 0) ? <span className="text-amber-500 text-xs font-bold border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded">LOW</span> : <span className="text-emerald-500 text-xs">OK</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Tools Table */}
              <h4 className="text-md font-bold text-orange-400 mb-3 bg-orange-500/10 p-2 rounded inline-block border border-orange-500/20">Tools</h4>
              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-900"><TableRow className="border-zinc-800 hover:bg-zinc-900/50"><TableHead className="text-zinc-400">Item</TableHead><TableHead className="text-zinc-400">Category</TableHead><TableHead className="text-zinc-400">Qty</TableHead><TableHead className="text-zinc-400">Cost</TableHead><TableHead className="text-zinc-400">Value</TableHead><TableHead className="text-zinc-400">Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {toolsSorted.map(t => (
                      <TableRow key={t.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="font-medium text-zinc-200">{t.name}</TableCell>
                        <TableCell className="text-zinc-400">{t.category || '—'}</TableCell>
                        <TableCell className={(t.quantity || 0) < (t.threshold || 0) ? "text-amber-500 font-bold" : "text-zinc-300"}>{t.quantity || 0}</TableCell>
                        <TableCell className="text-zinc-400">${(t.cost || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-zinc-300">${((t.cost || 0) * (t.quantity || 1)).toFixed(2)}</TableCell>
                        <TableCell>{(t.quantity || 0) < (t.threshold || 0) ? <span className="text-amber-500 text-xs font-bold border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded">LOW</span> : <span className="text-emerald-500 text-xs">OK</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* EMPLOYEE TAB */}
          <TabsContent value="employee" className="space-y-4 animate-in fade-in-50">
            <Card className="p-6 bg-zinc-900/50 border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-200">Employee Performance</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => generateEmployeeReport(false)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"><Printer className="h-4 w-4 mr-2" /> Print</Button>
                  <Button variant="outline" size="sm" onClick={() => generateEmployeeReport(true)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"><Save className="h-4 w-4 mr-2" /> PDF</Button>
                </div>
              </div>

              {(() => {
                const fJobs = filterByDate(jobs, 'finishedAt');
                const fPay = filterByDate(payrollHistory, 'date');
                const totalPaid = fPay.reduce((s, p) => s + (p.amount || 0), 0);
                const employeesPaid = Array.from(new Set(fPay.map(p => p.employee).filter(Boolean))).length;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-zinc-950 rounded border border-zinc-800"><p className="text-xs text-zinc-500 uppercase">Jobs Completed</p><p className="text-2xl font-bold text-white mt-1">{fJobs.length}</p></div>
                    <div className="p-4 bg-zinc-950 rounded border border-zinc-800"><p className="text-xs text-zinc-500 uppercase">Total Paid</p><p className="text-2xl font-bold text-emerald-400 mt-1">${totalPaid.toFixed(2)}</p></div>
                    <div className="p-4 bg-zinc-950 rounded border border-zinc-800"><p className="text-xs text-zinc-500 uppercase">Employees Paid</p><p className="text-2xl font-bold text-purple-400 mt-1">{employeesPaid}</p></div>
                  </div>
                )
              })()}

              <div className="rounded-lg border border-zinc-800 overflow-x-auto mb-6">
                <Table>
                  <TableHeader className="bg-zinc-900"><TableRow className="border-zinc-800 hover:bg-zinc-900/50"><TableHead className="text-zinc-400">Employee</TableHead><TableHead className="text-zinc-400">Customer</TableHead><TableHead className="text-zinc-400">Service</TableHead><TableHead className="text-zinc-400">Time</TableHead><TableHead className="text-zinc-400">Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filterByDate(jobs, 'finishedAt').map((job, idx) => (
                      <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="font-medium">
                          <span className="text-blue-400 hover:text-blue-300 cursor-pointer underline underline-offset-2" onClick={() => { setSelectedJob(job); setChecklistOpen(true); }}>{job.employee || 'N/A'}</span>
                        </TableCell>
                        <TableCell className="text-zinc-300">{job.customer || 'N/A'}</TableCell>
                        <TableCell className="text-zinc-300">{job.service || 'N/A'}</TableCell>
                        <TableCell className="text-zinc-400">{job.totalTime || 'N/A'}</TableCell>
                        <TableCell className="text-zinc-400">{job.finishedAt ? new Date(job.finishedAt).toLocaleDateString() : '—'}</TableCell>
                      </TableRow>
                    ))}
                    {filterByDate(jobs, 'finishedAt').length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-zinc-500 py-8">No jobs found.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>

              <h4 className="text-md font-bold text-zinc-300 mb-3">Recent Payroll</h4>
              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-900"><TableRow className="border-zinc-800 hover:bg-zinc-900/50"><TableHead className="text-zinc-400">Date</TableHead><TableHead className="text-zinc-400">Employee</TableHead><TableHead className="text-zinc-400">Type</TableHead><TableHead className="text-zinc-400">Description</TableHead><TableHead className="text-zinc-400">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filterByDate(payrollHistory, 'date').map((p, idx) => (
                      <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="text-zinc-400">{p.date ? new Date(p.date).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell className="text-zinc-200 font-medium">{p.employee || 'N/A'}</TableCell>
                        <TableCell className="text-zinc-400">{p.type || 'N/A'}</TableCell>
                        <TableCell className="text-zinc-400 max-w-[200px] truncate" title={p.description}>{p.description || '—'}</TableCell>
                        <TableCell className="text-emerald-400 font-bold">${Number(p.amount || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {filterByDate(payrollHistory, 'date').length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-zinc-500 py-8">No payroll history found.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* ESTIMATES TAB */}
          <TabsContent value="estimates" className="space-y-4 animate-in fade-in-50">
            <Card className="p-6 bg-zinc-900/50 border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-200">Estimates Ledger</h3>
                  <p className="text-sm text-zinc-500">Total Estimates: {filterByDate(estimates).length}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => generateEstimatesReport(false)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"><Printer className="h-4 w-4 mr-2" /> Print</Button>
                  <Button variant="outline" size="sm" onClick={() => generateEstimatesReport(true)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"><Save className="h-4 w-4 mr-2" /> PDF</Button>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-900"><TableRow className="border-zinc-800 hover:bg-zinc-900/50"><TableHead className="text-zinc-400">ID</TableHead><TableHead className="text-zinc-400">Customer</TableHead><TableHead className="text-zinc-400">Service</TableHead><TableHead className="text-zinc-400">Amount</TableHead><TableHead className="text-zinc-400">Status</TableHead><TableHead className="text-zinc-400">Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filterByDate(estimates).map(est => (
                      <TableRow key={est.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="font-mono text-zinc-500">#{est.id}</TableCell>
                        <TableCell className="text-zinc-300 font-medium">{est.customerName || 'N/A'}</TableCell>
                        <TableCell className="text-zinc-400">{est.service || 'N/A'}</TableCell>
                        <TableCell className="text-emerald-400 font-bold">${est.total || 0}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${est.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : est.status === 'Sent' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                            {est.status || 'Draft'}
                          </span>
                        </TableCell>
                        <TableCell className="text-zinc-400">{est.createdAt ? new Date(est.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                    {filterByDate(estimates).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-zinc-500 py-8">No estimates found.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* ACCOUNTING TAB */}
          <TabsContent value="accounting" className="space-y-4 animate-in fade-in-50">
            <Card className="p-6 bg-zinc-900/50 border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-200">Accounting Ledger</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => generateAccountingReport(false)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"><Printer className="h-4 w-4 mr-2" /> Print</Button>
                  <Button variant="outline" size="sm" onClick={() => generateAccountingReport(true)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"><Save className="h-4 w-4 mr-2" /> PDF</Button>
                  <Button variant="outline" size="sm" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300" onClick={() => {
                    const within = (d: string) => {
                      const dt = new Date(d);
                      let okQuick = true;
                      const now = new Date();
                      if (dateFilter === 'daily') okQuick = dt.toDateString() === now.toDateString();
                      else if (dateFilter === 'weekly') okQuick = dt >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                      else if (dateFilter === 'monthly') okQuick = dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
                      let okRange = true;
                      if (dateRange.from) okRange = dt >= new Date(dateRange.from.setHours(0, 0, 0, 0));
                      if (okRange && dateRange.to) okRange = dt <= new Date(dateRange.to.setHours(23, 59, 59, 999));
                      return okQuick && okRange;
                    };
                    const lines = ['Type,Date,Amount,Category,Description,Customer,Method'];
                    income.filter(i => within(i.date || i.createdAt)).forEach(i => lines.push(`Income,${(i.date || i.createdAt || '').slice(0, 10)},${i.amount || 0},${i.category || ''},${String(i.description || '').replace(/,/g, ';')},${i.customerName || ''},${i.paymentMethod || ''}`));
                    expenses.filter(e => within(e.createdAt)).forEach(e => lines.push(`Expense,${(e.createdAt || '').slice(0, 10)},${e.amount || 0},${e.category || ''},${String(e.description || '').replace(/,/g, ';')},,`));
                    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `accounting_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}>
                    <Save className="h-4 w-4 mr-2" /> Export CSV
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                    <p className="text-xs text-zinc-500 uppercase">Total Income</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">${income.filter(i => filterByDate([i], i.date ? 'date' : 'createdAt').length).reduce((s, i) => s + (i.amount || 0), 0).toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                    <p className="text-xs text-zinc-500 uppercase">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-400 mt-1">${expenses.filter(e => filterByDate([e]).length).reduce((s, e) => s + (e.amount || 0), 0).toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                    <p className="text-xs text-zinc-500 uppercase">Net Profit</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {(() => {
                        const inc = income.filter(i => filterByDate([i], i.date ? 'date' : 'createdAt').length).reduce((s, i) => s + (i.amount || 0), 0);
                        const exp = expenses.filter(e => filterByDate([e]).length).reduce((s, e) => s + (e.amount || 0), 0);
                        const p = inc - exp;
                        return `${p < 0 ? '-' : ''}$${Math.abs(p).toFixed(2)}`;
                      })()}
                    </p>
                  </div>
                </div>

                {/* Income Table */}
                <h4 className="text-sm font-bold text-zinc-400 mb-2 uppercase">Income Records</h4>
                <div className="rounded-lg border border-zinc-800 overflow-hidden mb-6">
                  <Table>
                    <TableHeader className="bg-zinc-900"><TableRow className="border-zinc-800 hover:bg-zinc-900/50"><TableHead className="text-zinc-400">Date</TableHead><TableHead className="text-zinc-400">Amount</TableHead><TableHead className="text-zinc-400">Cat</TableHead><TableHead className="text-zinc-400">Desc</TableHead><TableHead className="text-zinc-400">Customer</TableHead><TableHead className="text-zinc-400">Method</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {income.filter(i => filterByDate([i], i.date ? 'date' : 'createdAt').length).map((i, idx) => (
                        <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="text-zinc-400">{(i.date || i.createdAt || '').slice(0, 10)}</TableCell>
                          <TableCell className="text-emerald-400 font-bold">${(i.amount || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-zinc-300">{i.category || 'General'}</TableCell>
                          <TableCell className="text-zinc-400 max-w-[150px] truncate">{i.description}</TableCell>
                          <TableCell className="text-zinc-400">{i.customerName}</TableCell>
                          <TableCell className="text-zinc-500 text-xs">{i.paymentMethod}</TableCell>
                        </TableRow>
                      ))}
                      {income.filter(i => filterByDate([i], i.date ? 'date' : 'createdAt').length).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-zinc-500 py-4">No income records.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>

                {/* Expense Table */}
                <h4 className="text-sm font-bold text-zinc-400 mb-2 uppercase">Expense Records</h4>
                <div className="rounded-lg border border-zinc-800 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-zinc-900"><TableRow className="border-zinc-800 hover:bg-zinc-900/50"><TableHead className="text-zinc-400">Date</TableHead><TableHead className="text-zinc-400">Amount</TableHead><TableHead className="text-zinc-400">Category</TableHead><TableHead className="text-zinc-400">Description</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {expenses.filter(e => filterByDate([e]).length).map((e, idx) => (
                        <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="text-zinc-400">{(e.createdAt || '').slice(0, 10)}</TableCell>
                          <TableCell className="text-red-400 font-bold">${(e.amount || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-zinc-300">{e.category || 'General'}</TableCell>
                          <TableCell className="text-zinc-400 max-w-[200px] truncate">{e.description}</TableCell>
                        </TableRow>
                      ))}
                      {expenses.filter(e => filterByDate([e]).length).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-zinc-500 py-4">No expense records.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
            </Card>
          </TabsContent>

        </Tabs>

        {/* DIALOGS */}
        <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
          <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-200">
            <DialogHeader><DialogTitle className="text-white">Job Details</DialogTitle></DialogHeader>
            {selectedJob && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                <div className="space-y-1"><p className="text-zinc-500">Customer</p><p className="font-semibold text-white">{selectedJob.customer || selectedJob.customerName || '—'}</p></div>
                <div className="space-y-1"><p className="text-zinc-500">Vehicle</p><p className="font-semibold text-white">{selectedJob.vehicle || selectedJob.vehicleType || '—'}</p></div>
                <div className="space-y-1"><p className="text-zinc-500">Service</p><p className="font-semibold text-white text-blue-400">{selectedJob.service || selectedJob.package || '—'}</p></div>
                <div className="space-y-1"><p className="text-zinc-500">Employees</p><p className="font-semibold text-white">{selectedJob.employee || selectedJob.employeeName || '—'}</p></div>
                <div className="space-y-1"><p className="text-zinc-500">Finished</p><p className="font-semibold text-white">{selectedJob.finishedAt ? new Date(selectedJob.finishedAt).toLocaleString() : '—'}</p></div>
                <div className="space-y-1"><p className="text-zinc-500">Revenue</p><p className="font-semibold text-emerald-400 text-lg">${Number(selectedJob.totalRevenue || selectedJob.total || 0).toFixed(2)}</p></div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={customerJobsOpen} onOpenChange={setCustomerJobsOpen}>
          <DialogContent className="max-w-4xl bg-zinc-950 border-zinc-800 text-zinc-200">
            <DialogHeader><DialogTitle>Customer History</DialogTitle></DialogHeader>
            {customerJobsCustomer && (
              <div className="space-y-6">
                <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{customerJobsCustomer.name}</h3>
                    <p className="text-zinc-400">{customerJobsCustomer.email || ''} • {customerJobsCustomer.phone || ''}</p>
                  </div>
                </div>
                <div className="rounded border border-zinc-800 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-zinc-900"><TableRow><TableHead>Date</TableHead><TableHead>Service</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {customerJobs.map((j, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{j.finishedAt ? new Date(j.finishedAt).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>{j.service || j.package}</TableCell>
                          <TableCell className="text-emerald-400">${Number(j.totalRevenue || j.total || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
};

export default Reports;
