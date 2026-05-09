import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Save, AlertTriangle, FileBarChart, Calendar, TrendingUp, Download, History, Calculator, PieChart, FileText, HelpCircle, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { servicePackages } from "@/lib/services";
import { savePDFToArchive } from "@/lib/pdfArchive";
import localforage from "localforage";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import { getReceivables } from "@/lib/receivables";
import { getExpenses } from "@/lib/db";
import { getChemicals, getMaterials, getTools } from "@/lib/inventory-data";
import { getSupabaseEstimates, getSupabaseTaxExpenses, getSupabaseInvoices, getSupabaseMileageLogs, getSupabaseTaxReports, saveSupabaseTaxReport, getSupabaseCustomers, getSupabaseBookings, getSupabaseEmployees } from "@/lib/supa-data";
import { useDemoMode } from "@/contexts/DemoContext";
import { MOCK_CUSTOMERS, MOCK_INVOICES, MOCK_INVENTORY, MOCK_BOOKINGS, MOCK_ESTIMATES, MOCK_ACCOUNTING, MOCK_PROSPECTS } from "@/lib/demoMockData";

const Reports = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dateFilter, setDateFilter] = useState<"all" | "daily" | "weekly" | "monthly">("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
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

  // Tax Report State
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());
  const [taxReport, setTaxReport] = useState<any>(null);
  const [isGeneratingTax, setIsGeneratingTax] = useState(false);
  const [taxHistory, setTaxHistory] = useState<any[]>([]);
  const [showTaxHistory, setShowTaxHistory] = useState(false);
  const [mileageRate, setMileageRate] = useState<number>(0.67);

  const currentUser = getCurrentUser();
  const { isDemoMode } = useDemoMode();
  const isAdmin = currentUser?.role === 'admin' || isDemoMode;

  useEffect(() => {
    // Always load data from localforage (fast, cached)
    loadData();

    // Mark as loaded for this session
    sessionStorage.setItem('reports-loaded', 'true');
  }, []);

  const loadData = async () => {
    if (isDemoMode) {
      setCustomers(MOCK_CUSTOMERS);
      setInvoices(MOCK_INVOICES);
      setChemicals(MOCK_INVENTORY.chemicals);
      setMaterials(MOCK_INVENTORY.materials);
      setTools([]);
      setJobs(MOCK_BOOKINGS.filter(b => b.status === 'completed' || b.status === 'in_progress'));
      setEstimates(MOCK_ESTIMATES);
      setIncome(MOCK_ACCOUNTING.transactions.filter(t => t.type === 'income'));
      setExpenses(MOCK_ACCOUNTING.transactions.filter(t => t.type === 'expense'));
      setPayrollHistory([]);
      setTaxHistory([]);
      return;
    }
    const cust = await getSupabaseCustomers();
    // Load Estimates from Supabase
    const estimatesData = await getSupabaseEstimates();
    const incomeData = await getReceivables();
    const expenseData = await getExpenses();
    const payrollData = (await localforage.getItem<any[]>("payroll-history")) || [];
    const taxReportsData = await getSupabaseTaxReports();

    const inv = await getSupabaseInvoices();
    // Load Inventory from Supabase
    const chems = await getChemicals();
    const mats = await getMaterials();
    const tls = await getTools();
    
    // Fetch bookings to populate jobs for Employee report
    const bookingsData = await getSupabaseBookings();
    const allEmps = await getSupabaseEmployees();
    // Show all jobs except cancelled ones for comprehensive employee reporting
    const activeJobs = (bookingsData || []).filter(b => b.status !== 'cancelled');
    
    setCustomers(cust);
    setInvoices(inv);
    setChemicals(chems);
    setMaterials(mats);
    setTools(tls);
    setJobs(activeJobs);
    setEmployees(allEmps);
    setEstimates(estimatesData);
    setIncome(incomeData);
    setExpenses(expenseData);
    setPayrollHistory(payrollData);
    setTaxHistory(taxReportsData);
  };

  const filterByDate = (items: any[], dateField = "createdAt") => {
    const now = new Date();
    return items.filter(item => {
      const itemDate = new Date(item[dateField] || item.date || item.createdAt || item.finishedAt || item.created_at);
      const isInvalidDate = !itemDate || isNaN(itemDate.getTime());

      // If "All Time" and no custom range, show everything (even items with invalid dates)
      if (dateFilter === "all" && !dateRange.from && !dateRange.to) return true;
      
      // If a specific filter is set but the date is invalid, hide it
      if (isInvalidDate) return false;

      let passQuick = true;
      if (dateFilter === "daily") passQuick = itemDate.toDateString() === now.toDateString();
      else if (dateFilter === "weekly") passQuick = itemDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (dateFilter === "monthly") passQuick = itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();

      let passRange = true;
      if (dateRange.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        passRange = itemDate >= fromDate;
      }
      if (passRange && dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        passRange = itemDate <= toDate;
      }

      return passQuick && passRange;
    });
  };

  const generateCustomerReport = (download = false) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Customer Database Report", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 28, { align: "center" });

    let y = 40;
    // Only Active Customers (not prospects)
    const filteredCustomers = customers.filter(c => (c.type || '').toLowerCase() !== 'prospect');

    filteredCustomers.forEach((cust) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${cust.name}`, 20, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Vehicle: ${cust.year || ''} ${cust.vehicle || ''} ${cust.model || ''} | Type: ${cust.vehicleType || 'N/A'}`, 20, y);
      y += 5;
      doc.text(`Email: ${cust.email || 'N/A'} | Phone: ${cust.phone || 'N/A'}`, 20, y);
      y += 5;
      doc.text(`Address: ${cust.address || 'N/A'}`, 20, y);
      y += 8;
      doc.line(20, y, 190, y);
      y += 10;
    });

    if (download) doc.save(`CustomerReport_${new Date().toISOString().split('T')[0]}.pdf`);
    else window.open(doc.output('bloburl'), '_blank');
  };

  const generateProspectReport = (download = false) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(234, 88, 12); // Orange for prospects
    doc.text("Prospects & Leads Report", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 28, { align: "center" });

    let y = 40;
    // Only Prospects + Date Filter
    const filteredProspects = filterByDate(customers.filter(c => (c.type || '').toLowerCase() === 'prospect'), 'created_at');

    filteredProspects.forEach((prospect) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(`${prospect.name}`, 20, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Interest: ${prospect.vehicle || ''} ${prospect.model || ''} | How Found: ${prospect.howFound || 'N/A'}`, 20, y);
      y += 5;
      doc.text(`Email: ${prospect.email || 'N/A'} | Phone: ${prospect.phone || 'N/A'}`, 20, y);
      y += 5;
      doc.text(`Address: ${prospect.address || 'N/A'}`, 20, y);
      y += 5;
      if (prospect.notes) {
        const splitNotes = doc.splitTextToSize(`Notes: ${prospect.notes}`, 170);
        doc.text(splitNotes, 20, y);
        y += (splitNotes.length * 5);
      }
      y += 8;
      doc.setDrawColor(234, 88, 12);
      doc.line(20, y, 190, y);
      y += 10;
    });

    if (download) doc.save(`ProspectReport_${new Date().toISOString().split('T')[0]}.pdf`);
    else window.open(doc.output('bloburl'), '_blank');
  };

  const generateInvoicesReport = (download = false) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(181, 142, 21); // Yellow/Gold
    doc.text("Invoice Performance Report", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()} | Filter: ${dateFilter.toUpperCase()}`, 105, 28, { align: "center" });

    let y = 40;
    const filteredInvoices = filterByDate(invoices, 'date');

    const invoiceRows = filteredInvoices.map(inv => [
      inv.invoiceNumber || inv.id?.substring(0, 8) || 'N/A',
      inv.customerName || 'N/A',
      new Date(inv.date || inv.createdAt).toLocaleDateString(),
      `$${(inv.total || 0).toFixed(2)}`,
      `$${(inv.paidAmount || 0).toFixed(2)}`,
      inv.isPaid ? 'PAID' : 'PENDING'
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Inv #', 'Customer', 'Date', 'Total', 'Paid', 'Status']],
      body: invoiceRows,
      theme: 'striped',
      headStyles: { fillColor: [181, 142, 21] }, // Yellow/Gold
      columnStyles: { 
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'right' }
      }
    });

    if (download) doc.save(`InvoiceReport_${new Date().toISOString().split('T')[0]}.pdf`);
    else window.open(doc.output('bloburl'), '_blank');
  };

  const generateInventoryReport = (download = false) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(26);
    doc.setTextColor(30, 41, 59);
    doc.text("Inventory Status Hub", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Strategic Asset Report | Generated: ${new Date().toLocaleString()}`, 14, 27);

    // 1. Valuation Graphic Summary (THE POP!)
    const chemVal = chemicals.reduce((s, c) => s + ((c.costPerBottle || 0) * (c.currentStock || 0)), 0);
    const matVal = materials.reduce((s, m) => s + ((m.costPerItem || 0) * (m.quantity || 0)), 0);
    const tlsTotal = tools.reduce((s, t) => s + ((t.price || 0) * (t.quantity || 1)), 0);
    const gTotal = chemVal + matVal + tlsTotal;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 35, pageWidth - 28, 50, 2, 2, 'FD');

    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105);
    doc.text("PORTFOLIO VALUATION DISTRIBUTION", 20, 45);

    // Dynamic Bar Chart
    const maxVal = Math.max(chemVal, matVal, tlsTotal, 1);
    const chartX = 20;
    const chartY = 70;
    const barSpacing = 40;

    // Chemicals Bar
    doc.setFillColor(30, 64, 175); // Blue
    const h1 = (chemVal / maxVal) * 20;
    doc.rect(chartX, chartY - h1, 25, h1, 'F');
    doc.setFontSize(8);
    doc.text(`Chem: $${chemVal.toFixed(0)}`, chartX, chartY + 5);

    // Materials Bar
    doc.setFillColor(153, 27, 27); // Red
    const h2 = (matVal / maxVal) * 20;
    doc.rect(chartX + barSpacing, chartY - h2, 25, h2, 'F');
    doc.text(`Mat: $${matVal.toFixed(0)}`, chartX + barSpacing, chartY + 5);

    // Tools Bar
    doc.setFillColor(21, 128, 61); // Green
    const h3 = (tlsTotal / maxVal) * 20;
    doc.rect(chartX + barSpacing * 2, chartY - h3, 25, h3, 'F');
    doc.text(`Tools: $${tlsTotal.toFixed(0)}`, chartX + barSpacing * 2, chartY + 5);

    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text(`$${gTotal.toFixed(2)}`, pageWidth - 20, 55, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("TOTAL VALUATION", pageWidth - 20, 62, { align: 'right' });

    let y = 95;

    // 2. Chemicals
    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175); // Blue
    doc.text("Chemical Inventory", 14, y);
    y += 5;

    const chemRows = chemicals.map(chem => {
      const cost = chem.costPerBottle || 0;
      const stock = chem.currentStock || 0;
      const total = cost * stock;
      const isLow = stock < (chem.threshold || 0);
      
      return [
        `${chem.name} (${chem.bottleSize || 'N/A'})`,
        stock.toString(),
        `$${cost.toFixed(2)}`,
        `$${total.toFixed(2)}`,
        isLow ? 'LOW STOCK' : 'OK'
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['Item Name', 'Stock', 'Unit Cost', 'Total Value', 'Status']],
      body: chemRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175] },
      columnStyles: {
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4 && data.cell.raw === 'LOW STOCK') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // 3. Materials (Next Page)
    doc.addPage();
    y = 20;
    doc.setFontSize(16);
    doc.setTextColor(153, 27, 27); // Red-ish
    doc.text("Materials Inventory", 14, y);
    y += 5;

    const matRows = materials.map(mat => {
      const cost = mat.costPerItem || 0;
      const qty = mat.quantity || 0;
      const total = cost * qty;
      const isLow = qty < (mat.threshold || 0);
      
      return [
        mat.name,
        qty.toString(),
        `$${cost.toFixed(2)}`,
        `$${total.toFixed(2)}`,
        isLow ? 'LOW STOCK' : 'OK'
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['Material Name', 'Qty', 'Unit Cost', 'Total Value', 'Status']],
      body: matRows,
      theme: 'striped',
      headStyles: { fillColor: [153, 27, 27] },
      columnStyles: {
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4 && data.cell.raw === 'LOW STOCK') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // 4. Tools (Next Page)
    doc.addPage();
    y = 20;
    doc.setFontSize(16);
    doc.setTextColor(21, 128, 61); // Green
    doc.text("Tools & Equipment", 14, y);
    y += 5;

    const toolRows = tools.map(tool => {
      const cost = tool.price || 0;
      const qty = tool.quantity || 1;
      const total = cost * qty;
      return [
        tool.name,
        qty.toString(),
        `$${cost.toFixed(2)}`,
        `$${total.toFixed(2)}`,
        (tool.condition || 'Good').toUpperCase()
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['Tool/Asset Name', 'Qty', 'Asset Value', 'Total Value', 'Condition']],
      body: toolRows,
      theme: 'striped',
      headStyles: { fillColor: [21, 128, 61] },
      columnStyles: {
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'center' }
      }
    });

    if (download) doc.save(`InventoryReport_${new Date().toISOString().split('T')[0]}.pdf`);
    else window.open(doc.output('bloburl'), '_blank');
  };

  const generateEmployeeReport = (download = false) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(181, 142, 21);
    doc.text("Employee Performance Report", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()} | Filter: ${dateFilter.toUpperCase()}`, 105, 28, { align: "center" });

    // Ensure all employees are included, even if they have 0 stats
    const employeeStats: Record<string, { jobs: number, revenue: number }> = {};
    employees.forEach(emp => {
      employeeStats[emp.name] = { jobs: 0, revenue: 0 };
    });
    
    jobs.forEach(job => {
      const empName = job.employeeId || job.employee || job.employeeName || 'Unknown';
      if (!employeeStats[empName]) {
        employeeStats[empName] = { jobs: 0, revenue: 0 };
      }
      employeeStats[empName].jobs += 1;
      employeeStats[empName].revenue += (job.totalRevenue || job.total || 0);
    });

    const empData = Object.entries(employeeStats).map(([name, stats]: any) => [
      name,
      stats.jobs.toString(),
      `$${stats.revenue.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Employee Name', 'Jobs Completed', 'Total Revenue Produced']],
      body: empData,
      theme: 'striped',
      headStyles: { fillColor: [181, 142, 21] }
    });

    if (download) doc.save(`EmployeeReport_${new Date().toISOString().split('T')[0]}.pdf`);
    else window.open(doc.output('bloburl'), '_blank');
  };

  const generateEstimatesReport = (download = false) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(181, 142, 21);
    doc.text("Estimates Performance Report", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()} | Filter: ${dateFilter.toUpperCase()}`, 105, 28, { align: "center" });

    const fEstimates = filterByDate(estimates);
    const rows = fEstimates.map(est => [
      est.estimateNumber || est.id?.substring(0, 6) || 'N/A',
      est.customerName || 'N/A',
      Array.isArray(est.services) ? est.services.map((s: any) => s.name).join(', ') : (est.service || 'N/A'),
      `$${(est.total || 0).toFixed(2)}`,
      est.status || 'Draft',
      est.createdAt ? new Date(est.createdAt).toLocaleDateString() : 'N/A'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['ID', 'Customer', 'Services', 'Amount', 'Status', 'Date']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [181, 142, 21] },
      columnStyles: {
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'center' }
      }
    });

    if (download) doc.save(`EstimatesReport_${new Date().toISOString().split('T')[0]}.pdf`);
    else window.open(doc.output('bloburl'), '_blank');
  };

  const generateAccountingReport = (download = false) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("Accounting & Financial Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()} | Filter: ${dateFilter.toUpperCase()}`, 14, 26);

    let y = 35;

    // 1. Inventory Assets (Calculated from live data)
    const chemVal = chemicals.reduce((s, c) => s + ((c.costPerBottle || 0) * (c.currentStock || 0)), 0);
    const matVal = materials.reduce((s, m) => s + ((m.costPerItem || 0) * (m.quantity || 0)), 0);
    const toolVal = tools.reduce((s, t) => s + ((t.price || 0) * (t.quantity || 1)), 0);
    const totalAssets = chemVal + matVal + toolVal;

    doc.setFontSize(14);
    doc.setTextColor(22, 101, 52); // Dark Green
    doc.text("Inventory Assets", 14, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Category', 'Valuation', 'Status']],
      body: [
        ['Chemicals', `$${chemVal.toFixed(2)}`, 'On-Shelve'],
        ['Materials', `$${matVal.toFixed(2)}`, 'Stocked'],
        ['Tools/Gear', `$${toolVal.toFixed(2)}`, 'Assets'],
        ['TOTAL INVESTMENT', `$${totalAssets.toFixed(2)}`, 'Balanced']
      ],
      theme: 'grid',
      headStyles: { fillColor: [22, 101, 52] },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === 3) {
          data.cell.styles.fillColor = [240, 253, 244];
        }
      }
    });

    // 2. Financial Summary
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 15;
    const activeIncome = income.filter(i => filterByDate([i], i.date ? 'date' : 'createdAt').length);
    const activeExpenses = expenses.filter(e => filterByDate([e]).length);

    const totalInc = activeIncome.reduce((s, i) => s + (i.amount || 0), 0);
    const totalExp = activeExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const netProfit = totalInc - totalExp;

    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175); // Blue
    doc.text("Financial Summary", 14, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Amount']],
      body: [
        ['Total Income', `$${totalInc.toFixed(2)}`],
        ['Total Operating Expenses', `$${totalExp.toFixed(2)}`],
        ['Net Profit/Loss', `$${netProfit.toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175] },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === 2) {
          data.cell.styles.textColor = netProfit >= 0 ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fillColor = netProfit >= 0 ? [240, 253, 244] : [254, 242, 242];
        }
      }
    });

    // 3. Ledger Details (Breakdown on NEW PAGE)
    doc.addPage();
    y = 20;
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Transaction Ledger Details", 14, y);
    y += 10;

    // Income Table
    doc.setFontSize(12);
    doc.setTextColor(22, 101, 52);
    doc.text("Income (Credits)", 14, y);
    y += 5;

    const incomeRows = activeIncome.map(i => [
      (i.date || i.createdAt || '').slice(0, 10),
      i.category || 'General',
      i.description || '-',
      `$${(i.amount || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: incomeRows,
      theme: 'striped',
      headStyles: { fillColor: [22, 101, 52] },
      columnStyles: { 
        2: { cellWidth: 'auto' }, // Allow description to wrap
        3: { halign: 'right', fontStyle: 'bold' } 
      }
    });

    // Expenses Table
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 15;
    if (y > 250) { doc.addPage(); y = 20; }
    
    doc.setFontSize(12);
    doc.setTextColor(153, 27, 27);
    doc.text("Expenses (Debits)", 14, y);
    y += 5;

    const expenseRows = activeExpenses.map(e => [
      (e.createdAt || '').slice(0, 10),
      e.category || 'General',
      e.description || '-',
      `$${(e.amount || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: expenseRows,
      theme: 'striped',
      headStyles: { fillColor: [153, 27, 27] },
      columnStyles: { 
        2: { cellWidth: 'auto' }, // Allow description to wrap
        3: { halign: 'right', fontStyle: 'bold' } 
      }
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

  const generateTaxReport = async () => {
    setIsGeneratingTax(true);
    try {
      const yearStart = `${taxYear}-01-01`;
      const yearEnd = `${taxYear}-12-31`;

      // 1. Gather Income
      const invs = await getSupabaseInvoices();
      const yearInvoices = invs.filter(inv => {
        const d = inv.date || inv.createdAt;
        return d && d >= yearStart && d <= yearEnd;
      });
      const grossRevenue = yearInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      // Breakdown by services
      const revenueByService: Record<string, number> = {};
      yearInvoices.forEach(inv => {
        (inv.services || []).forEach((s: any) => {
          const name = s.name || 'Other';
          revenueByService[name] = (revenueByService[name] || 0) + (s.price || 0);
        });
      });

      // 2. Gather Expenses
      const exps = await getSupabaseTaxExpenses(taxYear);
      const totalExpenses = exps.reduce((sum, e) => sum + e.amount, 0);
      const deductibleExpenses = exps.filter(e => e.is_deductible).reduce((sum, e) => sum + e.amount, 0);
      const nonDeductibleExpenses = totalExpenses - deductibleExpenses;

      const expensesByCategory: Record<string, number> = {};
      exps.forEach(e => {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
      });

      // 3. Gather Mileage
      const logs = await getSupabaseMileageLogs();
      const yearLogs = logs.filter(l => l.date >= yearStart && l.date <= yearEnd);
      const totalMiles = yearLogs.reduce((sum, l) => sum + Number(l.miles_driven), 0);
      const mileageDeduction = totalMiles * mileageRate;

      // Monthly mileage breakdown
      const monthlyMileage: number[] = new Array(12).fill(0);
      yearLogs.forEach(l => {
        const month = new Date(l.date).getMonth();
        monthlyMileage[month] += Number(l.miles_driven);
      });

      // 4. Inventory/Assets (already in tax expenses if tagged, but we can verify)
      const assetExpenses = exps.filter(e => e.asset_id).reduce((sum, e) => sum + e.amount, 0);

      const report = {
        year: taxYear,
        generatedAt: new Date().toISOString(),
        income: {
          grossRevenue,
          byService: revenueByService,
          invoiceCount: yearInvoices.length
        },
        expenses: {
          total: totalExpenses,
          deductible: deductibleExpenses,
          nonDeductible: nonDeductibleExpenses,
          byCategory: expensesByCategory,
          assetRelated: assetExpenses
        },
        mileage: {
          totalMiles,
          deduction: mileageDeduction,
          rate: mileageRate,
          monthly: monthlyMileage
        },
        netIncome: grossRevenue - deductibleExpenses - mileageDeduction
      };

      setTaxReport(report);
      toast.success(`${taxYear} Tax Report Generated`);
    } catch (err) {
      console.error("Failed to generate tax report:", err);
      toast.error("Generation failed");
    } finally {
      setIsGeneratingTax(false);
    }
  };

  const saveTaxReportArchive = async () => {
    if (!taxReport) return;
    try {
      await saveSupabaseTaxReport({
        year: taxReport.year,
        report_name: `${taxReport.year} Combined Tax Summary`,
        report_data: taxReport,
        notes: `Generated on ${new Date(taxReport.generatedAt).toLocaleString()}`
      });
      const updated = await getSupabaseTaxReports();
      setTaxHistory(updated);
      toast.success("Report archived for historical reference");
    } catch (err) {
      toast.error("Failed to archive report");
    }
  };

  const generateTaxPDF = () => {
    if (!taxReport) return;
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text(`Tax Summary Report - ${taxReport.year}`, margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date(taxReport.generatedAt).toLocaleString()}`, margin, y);
    y += 15;

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Executive Summary", margin, y);
    y += 7;

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Amount']],
      body: [
        ['Gross Revenue', `$${taxReport.income.grossRevenue.toLocaleString()}`],
        ['Deductible Expenses', `$${taxReport.expenses.deductible.toLocaleString()}`],
        ['Mileage Deduction', `$${taxReport.mileage.deduction.toLocaleString()}`],
        ['Net Taxable Profit', `$${taxReport.netIncome.toLocaleString()}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] } // emerald-500 equivalent
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // Income Details
    doc.text("Income Breakdown", margin, y);
    autoTable(doc, {
      startY: y + 5,
      head: [['Service/Category', 'Amount']],
      body: Object.entries(taxReport.income.byService).map(([k, v]) => [k, `$${Number(v).toLocaleString()}`])
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // Expense Details
    doc.text("Expense Categories", margin, y);
    autoTable(doc, {
      startY: y + 5,
      head: [['Category', 'Amount']],
      body: Object.entries(taxReport.expenses.byCategory).map(([k, v]) => [k, `$${Number(v).toLocaleString()}`])
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // Mileage
    doc.text("Mileage Log Summary", margin, y);
    autoTable(doc, {
      startY: y + 5,
      head: [['Year', 'Total Miles', 'IRS Rate', 'Deduction']],
      body: [[
        taxReport.year,
        `${taxReport.mileage.totalMiles} mi`,
        `$${taxReport.mileage.rate}/mi`,
        `$${taxReport.mileage.deduction.toLocaleString()}`
      ]]
    });

    doc.save(`Tax_Report_${taxReport.year}.pdf`);
  };

  const lowStockChemicals = chemicals.filter(c => c.currentStock < c.threshold);
  const lowStockMaterials = materials.filter(m => (m.quantity || 0) < (m.threshold || m.lowThreshold || 0));
  const lowStockTools = tools.filter(t => (t.quantity || 0) < (t.threshold || 0));
  const totalInventoryValue = chemicals.reduce((sum, c) => sum + ((c.costPerBottle || 0) * (c.currentStock || 0)), 0);
  const totalMaterialsValue = materials.reduce((sum, m) => sum + ((m.costPerItem || 0) * (m.quantity || 0)), 0);
  const totalToolsValue = tools.reduce((sum, t) => sum + ((t.price || 0) * (t.quantity || 1)), 0);
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

  const addonsData = useMemo(() => {
    const fInvoices = filterByDate(invoices);
    const addons: any[] = [];
    fInvoices.forEach(inv => {
      (inv.services || []).forEach((s: any) => {
        if (s.isAddon || s.type === 'addon' || (s.name && s.name.toLowerCase().includes('add-on'))) {
          addons.push({
            name: s.name,
            price: Number(s.price || 0),
            date: inv.date || inv.createdAt,
            customerName: inv.customerName,
            invoiceNumber: inv.invoiceNumber,
            id: inv.id
          });
        }
      });
    });
    return addons;
  }, [invoices, dateFilter, dateRange]);

  const totalAddonRevenue = addonsData.reduce((sum, a) => sum + a.price, 0);

  const servicesData = useMemo(() => {
    const fInvoices = filterByDate(invoices);
    const services: any[] = [];
    fInvoices.forEach(inv => {
      (inv.services || []).forEach((s: any) => {
        const isAddon = s.isAddon || s.type === 'addon' || (s.name && s.name.toLowerCase().includes('add-on'));
        if (!isAddon) {
          services.push({
            name: s.name,
            price: Number(s.price || 0),
            date: inv.date || inv.createdAt,
            customerName: inv.customerName,
            invoiceNumber: inv.invoiceNumber,
            id: inv.id
          });
        }
      });
    });
    return services;
  }, [invoices, dateFilter, dateRange]);

  const totalServiceRevenue = servicesData.reduce((sum, s) => sum + s.price, 0);

  const employeeStats = useMemo(() => {
    const stats: any = {};
    
    // Initialize with all known employees from Supabase to ensure "Paul" etc. show up even with 0 jobs
    employees.forEach(emp => {
      stats[emp.name] = { jobs: 0, revenue: 0, email: emp.email };
    });

    // Add "Unassigned" as a fallback
    stats['Unassigned'] = { jobs: 0, revenue: 0 };

    filterByDate(jobs, "finishedAt").forEach((job: any) => {
      const emp = job.employee || 'Unassigned';
      if (!stats[emp]) stats[emp] = { jobs: 0, revenue: 0 };
      stats[emp].jobs += 1;
      stats[emp].revenue += job.totalRevenue || 0;
    });

    return stats;
  }, [jobs, employees, dateFilter, dateRange]);

  const tabList = [
    { id: 'customers', label: 'Customers' },
    { id: 'prospects', label: 'Prospects' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'employee', label: 'Employee' },
    { id: 'estimates', label: 'Estimates' },
    { id: 'accounting', label: 'Accounting' },
    { id: 'tax-report', label: 'Tax Report' },
    { id: 'addons', label: 'Add-ons' },
    { id: 'services', label: 'Services' },
  ]

  const tab = searchParams.get('tab') || 'customers';
  const setTab = (newTab: string) => {
    setSearchParams({ tab: newTab }, { replace: true });
  };

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
                <h2 className="text-2xl font-bold text-white flex items-center">
                  Reports Center
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: 'reports-global-summary' }))}
                    className="ml-2 p-1 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-emerald-400 transition-all"
                    title="What is Global Summary?"
                  >
                    <HelpCircle className="h-5 w-5" />
                  </button>
                </h2>
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
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: 'reports-temporal-scan' }))}
                className="p-2 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-blue-400 transition-all"
                title="About Temporal Scans"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
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
                  <p className="text-zinc-500 text-sm">Total Customers: <span className="text-white font-mono">{customers.filter(c => (c.type || '').toLowerCase() !== 'prospect').length}</span></p>
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
                    {Array.from(new Map(customers.map(c => [c.id || c.name, c])).values()).map(c => (
                      <SelectItem key={c.id || c.name} value={c.id || c.name}>{c.name}</SelectItem>
                    ))}
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

              <div className="mt-8 p-6 bg-red-500/5 rounded-xl border border-red-500/10">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-red-400 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" /> Customers with Outstanding Balance
                  </h4>
                </div>
                <div className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-950">
                  <Table>
                    <TableHeader className="bg-zinc-900">
                      <TableRow className="border-zinc-800">
                        <TableHead className="text-zinc-400">Customer</TableHead>
                        <TableHead className="text-zinc-400">Total Spent</TableHead>
                        <TableHead className="text-zinc-400">Balance Due</TableHead>
                        <TableHead className="text-zinc-400 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const debtors = Array.from(new Map(
                          customers
                            .filter(c => (c.type || '').toLowerCase() !== 'prospect')
                            .map(c => [c.id || c.name, c])
                        ).values()).map(cust => {
                          const custInvoices = invoices.filter(inv => inv.customerId === cust.id || inv.customerName === cust.name);
                          const totalSpent = custInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
                          const totalOwed = custInvoices.reduce((sum, inv) => sum + ((inv.total || 0) - (inv.paidAmount || 0)), 0);
                          return { ...cust, totalSpent, totalOwed };
                        }).filter(d => d.totalOwed > 0.01);

                        if (debtors.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-zinc-500 italic">No outstanding balances found</TableCell>
                            </TableRow>
                          );
                        }

                        return debtors.map(d => (
                          <TableRow key={d.id || d.name} className="border-zinc-800 hover:bg-zinc-900/50">
                            <TableCell className="font-medium text-zinc-200">{d.name}</TableCell>
                            <TableCell className="text-zinc-400">${d.totalSpent.toFixed(2)}</TableCell>
                            <TableCell className="text-red-400 font-bold">${d.totalOwed.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(d.id || d.name)} className="text-zinc-400 hover:text-white">View Details</Button>
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-zinc-950 border-zinc-800">
                  <h4 className="text-lg font-bold text-zinc-200 mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-400" /> Top Customers by Lifetime Value
                  </h4>
                  <div className="space-y-4">
                    {(() => {
                      const ltvData = Array.from(new Map(
                        customers
                          .filter(c => (c.type || '').toLowerCase() !== 'prospect')
                          .map(c => [c.id || c.name, c])
                      ).values()).map(cust => {
                        const custInvoices = invoices.filter(inv => inv.customerId === cust.id || inv.customerName === cust.name);
                        const totalSpent = custInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
                        return { ...cust, totalSpent };
                      })
                      .sort((a, b) => b.totalSpent - a.totalSpent)
                      .slice(0, 5);

                      if (ltvData.length === 0) return <p className="text-zinc-500 italic text-sm text-center py-4">No data available</p>;

                      return ltvData.map((d, i) => (
                        <div key={d.id || d.name} className="flex justify-between items-center p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="flex items-center gap-3">
                            <span className="text-zinc-500 font-mono text-xs w-4">#{i+1}</span>
                            <div>
                              <p className="text-sm font-bold text-zinc-200">{d.name}</p>
                              <p className="text-xs text-zinc-500">{d.vehicle} {d.model}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-400">${d.totalSpent.toLocaleString()}</p>
                            <p className="text-[10px] text-zinc-500 uppercase">Total Revenue</p>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </Card>

                <Card className="p-6 bg-zinc-950 border-zinc-800">
                  <h4 className="text-lg font-bold text-zinc-200 mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-400" /> Customer Retention & Frequency
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {(() => {
                      const customerStats = customers.filter(c => (c.type || '').toLowerCase() !== 'prospect').map(cust => {
                        const count = invoices.filter(inv => inv.customerId === cust.id || inv.customerName === cust.name).length;
                        return count;
                      });
                      const repeatCustomers = customerStats.filter(c => c > 1).length;
                      const averageServices = customerStats.length > 0 ? (customerStats.reduce((a, b) => a + b, 0) / customerStats.length).toFixed(1) : 0;
                      
                      return (
                        <>
                          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                            <p className="text-2xl font-bold text-white">{repeatCustomers}</p>
                            <p className="text-[10px] text-zinc-500 uppercase mt-1">Repeat Clients</p>
                          </div>
                          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                            <p className="text-2xl font-bold text-white">{averageServices}</p>
                            <p className="text-[10px] text-zinc-500 uppercase mt-1">Avg Services/Cust</p>
                          </div>
                          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center col-span-2">
                            <p className="text-2xl font-bold text-blue-400">
                              {customerStats.length > 0 ? ((repeatCustomers / customerStats.length) * 100).toFixed(0) : 0}%
                            </p>
                            <p className="text-[10px] text-zinc-500 uppercase mt-1">Retention Rate</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </Card>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="prospects" className="space-y-4 animate-in fade-in-50">
            <Card className="p-6 bg-zinc-900/50 border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-200">Prospects & Leads</h3>
                  <p className="text-zinc-500 text-sm">Potential clients from the Prospects database</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => generateProspectReport(false)} className="border-orange-500/30 text-orange-400 hover:bg-orange-600/10"><Printer className="h-4 w-4 mr-2" /> Print</Button>
                  <Button variant="outline" size="sm" onClick={() => generateProspectReport(true)} className="border-orange-500/30 text-orange-400 hover:bg-orange-600/10"><Save className="h-4 w-4 mr-2" /> PDF</Button>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-950">
                <Table>
                  <TableHeader className="bg-zinc-900">
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">Lead Name</TableHead>
                      <TableHead className="text-zinc-400">Contact</TableHead>
                      <TableHead className="text-zinc-400">Vehicle of Interest</TableHead>
                      <TableHead className="text-zinc-400">Acquisition</TableHead>
                      <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers
                      .filter(c => (c.type || '').toLowerCase() === 'prospect')
                      .map((p, i) => (
                        <TableRow key={i} className="border-zinc-800 hover:bg-zinc-900/50">
                          <TableCell className="font-bold text-zinc-200">{p.name}</TableCell>
                          <TableCell className="text-zinc-400 text-xs">
                            {p.email}<br/>{p.phone}
                          </TableCell>
                          <TableCell className="text-zinc-400 text-xs">
                            {p.year} {p.vehicle} {p.model}
                          </TableCell>
                          <TableCell className="text-zinc-500 text-xs italic">
                            {p.howFound || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-orange-400 h-8" onClick={() => window.location.href = `/prospects?search=${encodeURIComponent(p.name)}`}>
                              Manage Lead
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    {customers.filter(c => (c.type || '').toLowerCase() === 'prospect').length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-zinc-500">No prospects found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-zinc-950 border-zinc-800">
                  <h4 className="text-lg font-bold text-zinc-200 mb-4 flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-orange-400" /> Lead Acquisition Sources
                  </h4>
                  <div className="space-y-3">
                    {(() => {
                      const prospectsList = customers.filter(c => (c.type || '').toLowerCase() === 'prospect');
                      const sources: Record<string, number> = {};
                      prospectsList.forEach(p => {
                        const s = p.howFound || 'Unknown';
                        sources[s] = (sources[s] || 0) + 1;
                      });
                      
                      const sortedSources = Object.entries(sources).sort((a, b) => b[1] - a[1]);
                      
                      if (sortedSources.length === 0) return <p className="text-zinc-500 italic text-sm text-center py-4">No source data available</p>;

                      return sortedSources.map(([source, count]) => (
                        <div key={source} className="flex justify-between items-center">
                          <span className="text-sm text-zinc-400">{source}</span>
                          <div className="flex items-center gap-3 flex-1 px-4">
                            <div className="h-2 bg-zinc-800 rounded-full flex-1 overflow-hidden">
                              <div 
                                className="h-full bg-orange-500/50" 
                                style={{ width: `${(count / (prospectsList.length || 1)) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-zinc-500 w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </Card>

                <Card className="p-6 bg-zinc-950 border-zinc-800">
                  <h4 className="text-lg font-bold text-zinc-200 mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" /> Stale Leads (No Bookings &gt; 30 Days)
                  </h4>
                  <div className="space-y-4">
                    {(() => {
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      
                      const staleLeads = customers
                        .filter(c => (c.type || '').toLowerCase() === 'prospect')
                        .filter(p => new Date(p.created_at || 0) < thirtyDaysAgo)
                        .slice(0, 5);

                      if (staleLeads.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
                            <TrendingUp className="h-6 w-6" />
                          </div>
                          <p className="text-sm text-zinc-400 font-medium">All leads are fresh!</p>
                        </div>
                      );

                      return staleLeads.map((p) => (
                        <div key={p.id || p.name} className="flex justify-between items-center p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div>
                            <p className="text-sm font-bold text-zinc-200">{p.name}</p>
                            <p className="text-[10px] text-zinc-500 uppercase">Created {new Date(p.created_at).toLocaleDateString()}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="text-orange-400 hover:text-orange-300 h-7 text-xs" onClick={() => window.location.href = `/prospects?search=${encodeURIComponent(p.name)}`}>
                            Follow Up
                          </Button>
                        </div>
                      ));
                    })()}
                  </div>
                </Card>
              </div>
            </Card>
          </TabsContent>

          {/* INVOICES TAB */}
          <TabsContent value="invoices" className="space-y-4 animate-in fade-in-50">
            <Card className="p-6 bg-zinc-900/50 border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-200">Invoice Performance</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => generateInvoicesReport(false)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"><Printer className="h-4 w-4 mr-2" /> Print</Button>
                  <Button variant="outline" size="sm" onClick={() => generateInvoicesReport(true)} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"><Save className="h-4 w-4 mr-2" /> PDF</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Count</p>
                  <p className="text-3xl font-bold text-white mt-1">{filterByDate(invoices, 'date').length}</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Revenue</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">${filterByDate(invoices, 'date').reduce((sum, inv) => sum + (inv.total || 0), 0).toFixed(2)}</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Collected</p>
                  <p className="text-3xl font-bold text-blue-400 mt-1">${filterByDate(invoices, 'date').reduce((sum, inv) => sum + (inv.paidAmount || 0), 0).toFixed(2)}</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Outstanding</p>
                  <p className="text-3xl font-bold text-red-400 mt-1">
                    ${(filterByDate(invoices, 'date').reduce((sum, inv) => sum + (inv.total || 0), 0) - filterByDate(invoices, 'date').reduce((sum, inv) => sum + (inv.paidAmount || 0), 0)).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-950">
                <Table>
                  <TableHeader className="bg-zinc-900">
                    <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableHead className="text-zinc-400">Invoice #</TableHead>
                      <TableHead className="text-zinc-400">Customer</TableHead>
                      <TableHead className="text-zinc-400">Date</TableHead>
                      <TableHead className="text-zinc-400">Amount</TableHead>
                      <TableHead className="text-zinc-400">Paid</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterByDate(invoices, 'date').length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-zinc-500 italic">No invoices found for the selected period.</TableCell>
                      </TableRow>
                    ) : (
                      filterByDate(invoices, 'date').map((inv, idx) => (
                        <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="font-mono text-zinc-400">#{inv.invoiceNumber || inv.id?.substring(0, 8)}</TableCell>
                          <TableCell className="font-medium text-zinc-200">{inv.customerName || 'N/A'}</TableCell>
                          <TableCell className="text-zinc-400">{new Date(inv.date || inv.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-zinc-200 font-bold">${(inv.total || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-emerald-400">${(inv.paidAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inv.isPaid ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                              {inv.isPaid ? 'PAID' : 'PENDING'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
                        <TableCell className="text-zinc-300">1</TableCell>
                        <TableCell className="text-zinc-400">${(t.price || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-zinc-300">${(t.price || 0).toFixed(2)}</TableCell>
                        <TableCell><span className="text-emerald-500 text-xs">OK</span></TableCell>
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

              <h4 className="text-md font-bold text-zinc-300 mb-3">Staff Performance Summary</h4>
              <div className="rounded-lg border border-zinc-800 overflow-hidden mb-6">
                <Table>
                  <TableHeader className="bg-zinc-900">
                    <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableHead className="text-zinc-400">Employee Name</TableHead>
                      <TableHead className="text-zinc-400">Jobs Completed</TableHead>
                      <TableHead className="text-zinc-400">Revenue Generated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(employeeStats).filter(([name]) => name !== 'Unassigned').map(([name, stats]: any) => (
                      <TableRow key={name} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="font-medium text-zinc-200">{name}</TableCell>
                        <TableCell className="text-zinc-300">{stats.jobs}</TableCell>
                        <TableCell className="text-emerald-400 font-bold">${stats.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <h4 className="text-md font-bold text-zinc-300 mb-3">Detailed Job History</h4>
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
                        <TableCell className="font-mono text-zinc-500">#{est.estimateNumber || est.id?.substring(0, 6)}</TableCell>
                        <TableCell className="text-zinc-300 font-medium">{est.customerName || 'N/A'}</TableCell>
                        <TableCell className="text-zinc-400 max-w-[200px] truncate" title={Array.isArray(est.services) ? est.services.map((s: any) => s.name).join(', ') : (est.service || '')}>
                          {Array.isArray(est.services) ? est.services.map((s: any) => s.name).join(', ') : (est.service || 'N/A')}
                        </TableCell>
                        <TableCell className="text-emerald-400 font-bold">${(est.total || 0).toFixed(2)}</TableCell>
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
                      if (!d) return dateFilter === 'all' && !dateRange.from && !dateRange.to;
                      const dt = new Date(d);
                      if (isNaN(dt.getTime())) return dateFilter === 'all' && !dateRange.from && !dateRange.to;
                      
                      let okQuick = true;
                      const now = new Date();
                      if (dateFilter === 'daily') okQuick = dt.toDateString() === now.toDateString();
                      else if (dateFilter === 'weekly') okQuick = dt >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                      else if (dateFilter === 'monthly') okQuick = dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
                      
                      let okRange = true;
                      if (dateRange.from) {
                        const f = new Date(dateRange.from);
                        f.setHours(0, 0, 0, 0);
                        okRange = dt >= f;
                      }
                      if (okRange && dateRange.to) {
                        const t = new Date(dateRange.to);
                        t.setHours(23, 59, 59, 999);
                        okRange = dt <= t;
                      }
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
              </div>


              {/* Inventory Assets Summary */}
              <h4 className="text-md font-bold text-zinc-300 mb-3 uppercase flex items-center">
                Inventory Assets
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: 'reports-logic-grouping' }))}
                  className="ml-2 p-1 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-purple-400 transition-all"
                  title="What is Logic Grouping?"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Chemicals</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">${totalInventoryValue.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Materials</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">${totalMaterialsValue.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Tools</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">${totalToolsValue.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-zinc-900 rounded border border-zinc-700">
                  <p className="text-xs text-zinc-400 uppercase">Total Inventory</p>
                  <p className="text-xl font-bold text-white mt-1">${(totalInventoryValue + totalMaterialsValue + totalToolsValue).toFixed(2)}</p>
                </div>
              </div>

              {/* Break-Even Analysis */}
              <h4 className="text-md font-bold text-zinc-300 mb-3 uppercase flex items-center">
                Break-Even Analysis
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: 'break-even-analysis' }))}
                  className="ml-2 p-1 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-orange-400 transition-all"
                  title="How to read this chart?"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Investment (Assets)</p>
                  <p className="text-xl font-bold text-emerald-300 mt-1">
                    ${(totalInventoryValue + totalMaterialsValue + totalToolsValue).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Service Revenue</p>
                  <p className="text-xl font-bold text-emerald-300 mt-1">
                    ${income.reduce((s, i) => s + (i.amount || 0), 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-zinc-900 rounded border border-zinc-700">
                  <p className="text-xs text-zinc-400 uppercase">Remaining to Break Even</p>
                  <p className="text-xl font-bold text-orange-400 mt-1">
                    {(() => {
                      const invest = (totalInventoryValue + totalMaterialsValue + totalToolsValue);
                      const rev = income.reduce((s, i) => s + (i.amount || 0), 0);
                      const rem = invest - rev;
                      return rem > 0 ? `$${rem.toFixed(2)}` : 'PROFITABLE';
                    })()}
                  </p>
                </div>
              </div>

              <h4 className="text-md font-bold text-zinc-300 mb-3 uppercase">Financial Performance</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Income</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">${income.filter(i => filterByDate([i], i.date ? 'date' : 'createdAt').length).reduce((s, i) => s + (i.amount || 0), 0).toFixed(2)}</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">
                    ${(() => {
                      const inventoryCategories = ["supplies", "equipment", "chemicals", "inventory"];
                      const filtered = expenses.filter(e => {
                        const passDate = filterByDate([e]).length > 0;
                        const cat = (e.category || '').toLowerCase();
                        return passDate && !inventoryCategories.includes(cat);
                      });
                      return filtered.reduce((s, e) => s + (e.amount || 0), 0).toFixed(2);
                    })()}
                  </p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Net Profit</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {(() => {
                      const inc = income.filter(i => filterByDate([i], i.date ? 'date' : 'createdAt').length).reduce((s, i) => s + (i.amount || 0), 0);
                      const inventoryCategories = ["supplies", "equipment", "chemicals", "inventory"];
                      const exp = expenses.filter(e => {
                        const passDate = filterByDate([e]).length > 0;
                        const cat = (e.category || '').toLowerCase();
                        return passDate && !inventoryCategories.includes(cat);
                      }).reduce((s, e) => s + (e.amount || 0), 0);
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
                    {expenses.filter(e => {
                      const passDate = filterByDate([e]).length > 0;
                      const inventoryCategories = ["supplies", "equipment", "chemicals", "inventory"];
                      const cat = (e.category || '').toLowerCase();
                      return passDate && !inventoryCategories.includes(cat);
                    }).map((e, idx) => (
                      <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="text-zinc-400">{(e.createdAt || '').slice(0, 10)}</TableCell>
                        <TableCell className="text-red-400 font-bold">${(e.amount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-zinc-300">{e.category || 'General'}</TableCell>
                        <TableCell className="text-zinc-400 max-w-[200px] truncate">{e.description}</TableCell>
                      </TableRow>
                    ))}
                    {expenses.filter(e => {
                      const passDate = filterByDate([e]).length > 0;
                      const inventoryCategories = ["supplies", "equipment", "chemicals", "inventory"];
                      const cat = (e.category || '').toLowerCase();
                      return passDate && !inventoryCategories.includes(cat);
                    }).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-zinc-500 py-4">No non-inventory expense records.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tax-report">
            <Card className="p-6 bg-zinc-900/50 border-zinc-800">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div className="space-y-1">
                  <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                    <FileText className="h-6 w-6 text-emerald-500" />
                    Generated Tax Report
                  </h2>
                  <p className="text-zinc-400 text-sm">Consolidated financial overview for accounting and tax filing.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center bg-black/40 rounded-xl border border-zinc-800 p-1 px-2 h-10">
                    <Label className="px-2 text-[10px] text-zinc-500 uppercase font-bold">Year</Label>
                    <Select value={String(taxYear)} onValueChange={(val) => setTaxYear(Number(val))}>
                      <SelectTrigger className="w-[80px] h-8 bg-transparent border-none text-white focus:ring-0 text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        {[2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center bg-black/40 rounded-xl border border-zinc-800 p-1 px-2 h-10">
                    <Label className="px-2 text-[10px] text-zinc-500 uppercase font-bold">Rate/mi</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={mileageRate}
                      onChange={(e) => setMileageRate(Number(e.target.value))}
                      className="w-12 h-8 bg-transparent border-none text-white focus:ring-0 text-xs text-center font-bold"
                    />
                  </div>
                  <Button onClick={generateTaxReport} disabled={isGeneratingTax} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 px-4 rounded-xl shadow-lg shadow-emerald-500/20">
                    {isGeneratingTax ? "..." : "Generate Report"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowTaxHistory(true)} className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 h-10 rounded-xl">
                    <History className="h-4 w-4 mr-2" /> History
                  </Button>
                </div>
              </div>

              {!taxReport && !isGeneratingTax && (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-950/30">
                  <Calculator className="h-16 w-16 text-zinc-700 mb-4" />
                  <h3 className="text-xl font-medium text-zinc-400">Ready to Generate</h3>
                  <p className="text-zinc-500 max-w-xs mt-2">Select a year above to consolidate all income, expenses, and mileage data.</p>
                </div>
              )}

              {taxReport && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800/50 flex flex-col justify-between">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Gross Revenue</span>
                      <span className="text-3xl font-black text-white mt-2">${taxReport.income.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800/50 flex flex-col justify-between">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Deductible Exp</span>
                      <span className="text-3xl font-black text-red-500 mt-2">
                        -${(taxReport.expenses.deductible + taxReport.mileage.deduction).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="p-4 bg-zinc-950 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
                      <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Net Taxable Profit</span>
                      <span className="text-3xl font-black text-emerald-400 mt-2">${taxReport.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800/50 flex flex-col justify-between">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Business Miles</span>
                      <span className="text-3xl font-black text-blue-400 mt-2">{taxReport.mileage.totalMiles.toLocaleString()} mi</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pb-4 border-b border-zinc-800">
                    <Button variant="outline" size="sm" onClick={saveTaxReportArchive} className="border-zinc-700 text-zinc-300">
                      <Save className="h-4 w-4 mr-2" /> Save to History
                    </Button>
                    <Button size="sm" className="bg-zinc-100 text-black hover:bg-white font-bold" onClick={generateTaxPDF}>
                      <Printer className="h-4 w-4 mr-2" /> Print Summary PDF
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-emerald-500" />
                          Business Income Summary
                        </h3>
                        <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                          <Table>
                            <TableBody>
                              {Object.entries(taxReport.income.byService).map(([name, val]: [any, any]) => (
                                <TableRow key={name} className="border-zinc-800/50">
                                  <TableCell className="text-zinc-300">{name}</TableCell>
                                  <TableCell className="text-right text-emerald-400 font-mono">${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-zinc-900/50 border-t-2 border-zinc-800 font-bold">
                                <TableCell className="text-white">Total Gross Income</TableCell>
                                <TableCell className="text-right text-white font-mono">${taxReport.income.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          Business Expenses Summary
                        </h3>
                        <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                          <Table>
                            <TableBody>
                              {Object.entries(taxReport.expenses.byCategory).map(([name, val]: [any, any]) => (
                                <TableRow key={name} className="border-zinc-800/50">
                                  <TableCell className="text-zinc-300">{name}</TableCell>
                                  <TableCell className="text-right text-red-400 font-mono">${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-zinc-900/50 border-t-2 border-zinc-800">
                                <TableCell className="text-zinc-400 text-sm">Non-Deductible total included above</TableCell>
                                <TableCell className="text-right text-zinc-400 font-mono text-sm">(${taxReport.expenses.nonDeductible.toLocaleString(undefined, { minimumFractionDigits: 2 })})</TableCell>
                              </TableRow>
                              <TableRow className="bg-zinc-900/50 border-t-2 border-zinc-800 font-bold">
                                <TableCell className="text-white">Total Deductible (Operations)</TableCell>
                                <TableCell className="text-right text-white font-mono">${taxReport.expenses.deductible.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </section>
                    </div>

                    <div className="space-y-6">
                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <PieChart className="h-5 w-5 text-blue-500" />
                          Mileage Log Summary
                        </h3>
                        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-6">
                          <div className="flex justify-between items-center mb-6">
                            <div>
                              <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">IRS Rate ({taxReport.year})</p>
                              <p className="text-2xl font-black text-white">${taxReport.mileage.rate} / mi</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Estimated Deduction</p>
                              <p className="text-2xl font-black text-blue-400">${taxReport.mileage.deduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Monthly Breakdown (Miles)</p>
                            <div className="grid grid-cols-6 gap-2">
                              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                                <div key={m} className="bg-zinc-900 p-2 rounded border border-zinc-800 text-center">
                                  <span className="block text-[10px] text-zinc-500 font-bold">{m}</span>
                                  <span className="text-xs text-zinc-300">{taxReport.mileage.monthly[idx] || 0}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <History className="h-5 w-5 text-purple-500" />
                          Inventory & Asset Expenses
                        </h3>
                        <Card className="p-4 bg-zinc-950 border-purple-500/20">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400">Total Asset Purchases</span>
                            <span className="text-purple-400 font-bold">${taxReport.expenses.assetRelated.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-2 italic">Calculated from deductible inventory acquisitions.</p>
                        </Card>
                      </section>

                      <Card className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-950 border-emerald-500/30">
                        <h4 className="text-emerald-500 font-black uppercase text-xs mb-4">Year-To-Date Final Overview</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between text-zinc-400"><span>Gross Revenue</span><span>${taxReport.income.grossRevenue.toLocaleString()}</span></div>
                          <div className="flex justify-between text-zinc-400"><span>Operating Expenses</span><span>-${taxReport.expenses.deductible.toLocaleString()}</span></div>
                          <div className="flex justify-between text-zinc-400"><span>Mileage Deduction</span><span>-${taxReport.mileage.deduction.toLocaleString()}</span></div>
                          <Separator className="bg-zinc-800" />
                          <div className="flex justify-between items-end pt-2">
                            <span className="text-white font-bold text-lg">Net Profit</span>
                            <span className="text-3xl font-black text-emerald-400">${taxReport.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ADD-ONS TAB */}
          <TabsContent value="addons" className="space-y-4 animate-in fade-in-50">
            <Card className="p-6 bg-zinc-900/50 border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-200">Add-on Performance</h3>
                  <p className="text-xs text-zinc-500 mt-1 italic">* This data is for analysis only and is not double-counted in Accounting/Budget totals.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const doc = new jsPDF();
                    doc.text("Add-on Analysis Report", 14, 20);
                    autoTable(doc, {
                      startY: 25,
                      head: [['Date', 'Add-on', 'Customer', 'Invoice', 'Revenue']],
                      body: addonsData.map(a => [
                        new Date(a.date).toLocaleDateString(),
                        a.name,
                        a.customerName || 'N/A',
                        `#${a.invoiceNumber || 'N/A'}`,
                        `$${a.price.toFixed(2)}`
                      ])
                    });
                    window.open(doc.output('bloburl'), '_blank');
                  }} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                    <Printer className="h-4 w-4 mr-2" /> Print Analysis
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Add-on Upsells</p>
                  <p className="text-3xl font-bold text-blue-400 mt-1">{addonsData.length}</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Add-on Revenue</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">${totalAddonRevenue.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Avg Add-on Value</p>
                  <p className="text-3xl font-bold text-purple-400 mt-1">
                    ${addonsData.length > 0 ? (totalAddonRevenue / addonsData.length).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-900">
                    <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableHead className="text-zinc-400">Date</TableHead>
                      <TableHead className="text-zinc-400">Add-on Item</TableHead>
                      <TableHead className="text-zinc-400">Customer</TableHead>
                      <TableHead className="text-zinc-400">Invoice</TableHead>
                      <TableHead className="text-zinc-400 text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addonsData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-zinc-500 italic">No add-ons found for the selected period.</TableCell>
                      </TableRow>
                    ) : (
                      addonsData.map((a, idx) => (
                        <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="text-zinc-400">{new Date(a.date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium text-zinc-200">{a.name}</TableCell>
                          <TableCell className="text-zinc-300">{a.customerName || 'N/A'}</TableCell>
                          <TableCell className="text-zinc-400">#{a.invoiceNumber || 'N/A'}</TableCell>
                          <TableCell className="text-emerald-400 text-right font-bold">${a.price.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* SERVICES TAB */}
          <TabsContent value="services" className="space-y-4 animate-in fade-in-50">
            <Card className="p-6 bg-zinc-900/50 border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-200">Services Performance</h3>
                  <p className="text-xs text-zinc-500 mt-1 italic">* This data focuses on core service packages (Essential, Elite, etc.).</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const doc = new jsPDF();
                    doc.setFontSize(18);
                    doc.setTextColor(181, 142, 21);
                    doc.text("Core Services Analysis Report", 105, 20, { align: "center" });
                    doc.setFontSize(10);
                    doc.setTextColor(100, 100, 100);
                    doc.text(`Generated: ${new Date().toLocaleString()} | Filter: ${dateFilter.toUpperCase()}`, 105, 28, { align: "center" });

                    autoTable(doc, {
                      startY: 35,
                      head: [['Date', 'Service', 'Customer', 'Invoice', 'Revenue']],
                      body: servicesData.map(s => [
                        new Date(s.date).toLocaleDateString(),
                        s.name,
                        s.customerName || 'N/A',
                        `#${s.invoiceNumber || 'N/A'}`,
                        `$${s.price.toFixed(2)}`
                      ]),
                      theme: 'striped',
                      headStyles: { fillColor: [181, 142, 21] }
                    });
                    window.open(doc.output('bloburl'), '_blank');
                  }} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                    <Printer className="h-4 w-4 mr-2" /> Print Analysis
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Services Sold</p>
                  <p className="text-3xl font-bold text-blue-400 mt-1">{servicesData.length}</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Total Service Revenue</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">${totalServiceRevenue.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase">Avg Service Value</p>
                  <p className="text-3xl font-bold text-purple-400 mt-1">
                    ${servicesData.length > 0 ? (totalServiceRevenue / servicesData.length).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-900">
                    <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableHead className="text-zinc-400">Date</TableHead>
                      <TableHead className="text-zinc-400">Service Package</TableHead>
                      <TableHead className="text-zinc-400">Customer</TableHead>
                      <TableHead className="text-zinc-400">Invoice</TableHead>
                      <TableHead className="text-zinc-400 text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servicesData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-zinc-500 italic">No services found for the selected period.</TableCell>
                      </TableRow>
                    ) : (
                      servicesData.map((s, idx) => (
                        <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="text-zinc-400">{new Date(s.date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium text-zinc-200">{s.name}</TableCell>
                          <TableCell className="text-zinc-300">{s.customerName || 'N/A'}</TableCell>
                          <TableCell className="text-zinc-400">#{s.invoiceNumber || 'N/A'}</TableCell>
                          <TableCell className="text-emerald-400 text-right font-bold">${s.price.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
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

        <Dialog open={showTaxHistory} onOpenChange={setShowTaxHistory}>
          <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800 text-zinc-200">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <History className="h-5 w-5 text-zinc-400" />
                Tax Report Archive
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 border rounded-xl border-zinc-800 overflow-hidden">
              <Table>
                <TableHeader className="bg-zinc-900">
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Year</TableHead>
                    <TableHead className="text-zinc-400">Name</TableHead>
                    <TableHead className="text-zinc-400">Generated On</TableHead>
                    <TableHead className="text-right text-zinc-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxHistory.map((report) => (
                    <TableRow key={report.id} className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableCell className="font-bold text-white">{report.year}</TableCell>
                      <TableCell className="text-zinc-300">{report.report_name}</TableCell>
                      <TableCell className="text-zinc-500 text-xs">{new Date(report.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTaxReport(report.report_data);
                            setTaxYear(report.year);
                            setShowTaxHistory(false);
                          }}
                          className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        >
                          View Report
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {taxHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-zinc-500">No archived reports found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter className="mt-4 border-t border-zinc-800 pt-4">
              <Button variant="outline" onClick={() => setShowTaxHistory(false)} className="border-zinc-700 text-zinc-300">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div >
  );
};

export default Reports;
