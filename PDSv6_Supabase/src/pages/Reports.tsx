import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Save, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { servicePackages } from "@/lib/services";
import { savePDFToArchive } from "@/lib/pdfArchive";
import localforage from "localforage";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import jsPDF from "jspdf";
import { getCurrentUser } from "@/lib/auth";
import { getReceivables } from "@/lib/receivables";
import { getExpenses } from "@/lib/db";

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
  const isAdmin = currentUser?.email.includes('admin');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const cust = (await localforage.getItem<any[]>("customers")) || [];
    const inv = (await localforage.getItem<any[]>("invoices")) || [];
    const chems = (await localforage.getItem<any[]>("chemicals")) || [];
    const mats = (await localforage.getItem<any[]>("materials")) || [];
    const tls = (await localforage.getItem<any[]>("tools")) || [];
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

      const lowStock = stock <= chem.threshold;
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

  // Build a PDF for a specific customer's jobs; returns data URL or blob URL
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

      // Optional: attach checklist info from servicePackages if available
      const svc = servicePackages.find(sp => sp.id === job.serviceId || sp.name === job.service);
      if (svc) {
        const stepCount = (svc.steps || []).length;
        doc.text(`Checklist Tasks: ${stepCount}`, 20, y); y += 8;
      }
    });

    return returnDataUrl ? doc.output('datauristring') : doc.output('bloburl');
  };

  // Admin-only check
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Reports" />
        <main className="container mx-auto px-4 py-6 max-w-4xl">
          <Card className="p-8 bg-destructive/10 border-destructive">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertTriangle className="h-16 w-16 text-destructive" />
              <h2 className="text-2xl font-bold text-foreground">Admin Access Required</h2>
              <p className="text-muted-foreground">
                Reports are only accessible to administrators. Please contact your system administrator.
              </p>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  const lowStockChemicals = chemicals.filter(c => c.currentStock <= c.threshold);
  const lowStockMaterials = materials.filter(m => (m.quantity || 0) <= (m.threshold || m.lowThreshold || 0));
  const lowStockTools = tools.filter(t => (t.quantity || 0) <= (t.threshold || 0));
  const totalInventoryValue = chemicals.reduce((sum, c) => sum + ((c.costPerBottle || 0) * (c.currentStock || 0)), 0);
  const totalMaterialsValue = materials.reduce((sum, m) => sum + ((m.costPerItem || 0) * (m.quantity || 0)), 0);
  const totalToolsValue = tools.reduce((sum, t) => sum + ((t.cost || 0) * (t.quantity || 1)), 0);
  const chemicalsSorted = [...chemicals].sort((a, b) => {
    const alow = a.currentStock <= a.threshold; const blow = b.currentStock <= b.threshold;
    if (alow !== blow) return alow ? -1 : 1; return (a.name || '').localeCompare(b.name || '');
  });
  const materialsSorted = [...materials].sort((a, b) => {
    const alow = (a.quantity || 0) <= (a.threshold || a.lowThreshold || 0);
    const blow = (b.quantity || 0) <= (b.threshold || b.lowThreshold || 0);
    if (alow !== blow) return alow ? -1 : 1; return (a.name || '').localeCompare(b.name || '');
  });
  const toolsSorted = [...tools].sort((a, b) => {
    const alow = (a.quantity || 0) <= (a.threshold || 0);
    const blow = (b.quantity || 0) <= (b.threshold || 0);
    if (alow !== blow) return alow ? -1 : 1; return (a.name || '').localeCompare(b.name || '');
  });

  const [params] = useSearchParams();
  const initialTab = (params.get('tab') || 'customers') as 'customers' | 'invoices' | 'inventory' | 'employee' | 'estimates' | 'accounting';
  const [tab, setTab] = useState<typeof initialTab>(initialTab);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    } catch { }
  }, [tab]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Business Reports (Admin Only)" />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6 animate-fade-in">
          {/* Date Filters */}
          <Card className="p-4 bg-gradient-card border-border">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-wrap">
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="daily">Today</SelectItem>
                  <SelectItem value="weekly">This Week</SelectItem>
                  <SelectItem value="monthly">This Month</SelectItem>
                </SelectContent>
              </Select>
              <DateRangeFilter value={dateRange} onChange={setDateRange} storageKey="reports-range" />
            </div>
          </Card>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-6 bg-muted">
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="employee">Employee</TabsTrigger>
              <TabsTrigger value="estimates">Estimates</TabsTrigger>
              <TabsTrigger value="accounting">Accounting</TabsTrigger>
            </TabsList>

            {/* Customer Report */}
            <TabsContent value="customers" className="space-y-4">
              <Card className="p-6 bg-gradient-card border-border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-foreground">Customer Report</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => generateCustomerReport(false)}>
                      <Printer className="h-4 w-4 mr-2" />Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => generateCustomerReport(true)}>
                      <Save className="h-4 w-4 mr-2" />Save PDF
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Total Customers: <span className="font-semibold text-foreground">{customers.length}</span>
                  </p>

                  {/* Customer-Specific Report */}
                  <div className="pt-4 border-t border-border">
                    <label className="block text-sm font-medium mb-2">Select Customer for Detailed Report</label>
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                      <SelectTrigger className="w-full max-w-md bg-background border-border">
                        <SelectValue placeholder="Choose a customer..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {customers.map(cust => (
                          <SelectItem key={cust.id} value={cust.id}>
                            {cust.name} - {cust.vehicle || 'No vehicle'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCustomer && (() => {
                    const cust = customers.find(c => c.id === selectedCustomer);
                    const custInvoices = invoices.filter(inv => inv.customerId === selectedCustomer);
                    const totalSpent = custInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
                    const totalOwed = custInvoices.reduce((sum, inv) => sum + ((inv.total || 0) - (inv.paidAmount || 0)), 0);

                    return (
                      <div className="mt-4 p-4 bg-muted/20 rounded-lg">
                        <button
                          className="font-bold text-lg mb-2 text-primary underline"
                          onClick={() => {
                            const jobsForCustomer = jobs.filter(j => (j.customerId || j.customer?.id) === cust?.id || (j.customer || j.customerName) === cust?.name);
                            setCustomerJobs(jobsForCustomer);
                            setCustomerJobsCustomer(cust);
                            setCustomerJobsOpen(true);
                          }}
                        >{cust?.name}</button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Spent</p>
                            <p className="text-xl font-bold text-primary">${totalSpent.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Balance Owed</p>
                            <p className="text-xl font-bold text-destructive">${totalOwed.toFixed(2)}</p>
                          </div>
                        </div>
                        <p className="text-sm">Vehicle: {cust?.year} {cust?.vehicle} {cust?.model}</p>
                        <p className="text-sm">Total Services: {custInvoices.length}</p>
                      </div>
                    );
                  })()}
                </div>
              </Card>
            </TabsContent>

            {/* Invoice Report */}
            <TabsContent value="invoices" className="space-y-4">
              <Card className="p-6 bg-gradient-card border-border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-foreground">Invoice Report</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => generateCustomerReport(false)}>
                      <Printer className="h-4 w-4 mr-2" />Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => generateCustomerReport(true)}>
                      <Save className="h-4 w-4 mr-2" />Save PDF
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Invoices</p>
                    <p className="text-2xl font-bold text-foreground">{filterByDate(invoices).length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-primary">
                      ${filterByDate(invoices).reduce((sum, inv) => sum + (inv.total || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                    <p className="text-2xl font-bold text-success">
                      ${filterByDate(invoices).reduce((sum, inv) => sum + (inv.paidAmount || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className="text-2xl font-bold text-destructive">
                      ${(filterByDate(invoices).reduce((sum, inv) => sum + (inv.total || 0), 0) -
                        filterByDate(invoices).reduce((sum, inv) => sum + (inv.paidAmount || 0), 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Inventory Report */}
            <TabsContent value="inventory" className="space-y-4">
              <Card className="p-6 bg-gradient-card border-border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-foreground">Inventory Report</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => generateInventoryReport(false)}>
                      <Printer className="h-4 w-4 mr-2" />Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => generateInventoryReport(true)}>
                      <Save className="h-4 w-4 mr-2" />Save PDF
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold text-foreground">{chemicals.length + materials.length + tools.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Low Stock Items</p>
                    <p className="text-2xl font-bold text-destructive">{lowStockChemicals.length + lowStockMaterials.length + lowStockTools.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold text-success">${(totalInventoryValue + totalMaterialsValue + totalToolsValue).toFixed(2)}</p>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-2 text-red-600">Chemicals</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chemicalsSorted.map(chem => (
                        <TableRow key={chem.id}>
                          <TableCell className="font-medium">{chem.name}</TableCell>
                          <TableCell>{chem.bottleSize}</TableCell>
                          <TableCell className={chem.currentStock <= chem.threshold ? 'text-destructive font-bold' : ''}>
                            {chem.currentStock}
                          </TableCell>
                          <TableCell>${(chem.costPerBottle || 0).toFixed(2)}</TableCell>
                          <TableCell>${((chem.costPerBottle || 0) * (chem.currentStock || 0)).toFixed(2)}</TableCell>
                          <TableCell>
                            {chem.currentStock <= chem.threshold ? (
                              <span className="text-destructive font-semibold">⚠️ LOW STOCK</span>
                            ) : (
                              <span className="text-success">✓ OK</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={4} className="text-right">Subtotal:</TableCell>
                        <TableCell>${totalInventoryValue.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2 text-red-600">Materials</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Subtype</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {materialsSorted.map(mat => (
                          <TableRow key={mat.id}>
                            <TableCell className="font-medium">{mat.name}</TableCell>
                            <TableCell>{mat.subtype || mat.type || '—'}</TableCell>
                            <TableCell className={(mat.quantity || 0) <= (mat.threshold || mat.lowThreshold || 0) ? 'text-destructive font-bold' : ''}>
                              {mat.quantity || 0}
                            </TableCell>
                            <TableCell>${(mat.costPerItem || 0).toFixed(2)}</TableCell>
                            <TableCell>${((mat.costPerItem || 0) * (mat.quantity || 0)).toFixed(2)}</TableCell>
                            <TableCell>
                              {(mat.quantity || 0) <= (mat.threshold || mat.lowThreshold || 0) ? (
                                <span className="text-destructive font-semibold">⚠️ LOW STOCK</span>
                              ) : (
                                <span className="text-success">✓ OK</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {materialsSorted.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-6">No materials tracked.</TableCell>
                          </TableRow>
                        )}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={4} className="text-right">Subtotal:</TableCell>
                          <TableCell>${totalMaterialsValue.toFixed(2)}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2 text-red-600">Tools</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Threshold</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {toolsSorted.map(tool => (
                          <TableRow key={tool.id}>
                            <TableCell className="font-medium">{tool.name}</TableCell>
                            <TableCell>{tool.category || '—'}</TableCell>
                            <TableCell className={(tool.quantity || 0) <= (tool.threshold || 0) ? 'text-destructive font-bold' : ''}>
                              {tool.quantity || 0}
                            </TableCell>
                            <TableCell>${(tool.cost || 0).toFixed(2)}</TableCell>
                            <TableCell>${((tool.cost || 0) * (tool.quantity || 1)).toFixed(2)}</TableCell>
                            <TableCell>{tool.threshold || 0}</TableCell>
                            <TableCell>
                              {(tool.quantity || 0) <= (tool.threshold || 0) ? (
                                <span className="text-destructive font-semibold">⚠️ LOW STOCK</span>
                              ) : (
                                <span className="text-success">✓ OK</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {toolsSorted.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-6">No tools tracked.</TableCell>
                          </TableRow>
                        )}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={4} className="text-right">Subtotal:</TableCell>
                          <TableCell>${totalToolsValue.toFixed(2)}</TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Employee Performance Report */}
            <TabsContent value="employee" className="space-y-4">
              <Card className="p-6 bg-gradient-card border-border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-foreground">Employee Performance Report</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => generateEmployeeReport(false)}>
                      <Printer className="h-4 w-4 mr-2" />Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => generateEmployeeReport(true)}>
                      <Save className="h-4 w-4 mr-2" />Save PDF
                    </Button>
                  </div>
                </div>
                {(() => {
                  const filteredJobs = filterByDate(jobs, 'finishedAt');
                  const filteredPayments = filterByDate(payrollHistory, 'date');
                  const totalPaid = filteredPayments.reduce((s, p) => s + (p.amount || 0), 0);
                  const hoursRegex = /([0-9]+(?:\.[0-9]+)?)\s*hrs/i;
                  const totalHours = filteredPayments.reduce((s, p) => {
                    const d = String(p.description || '');
                    const m = d.match(hoursRegex); return s + (m ? Number(m[1]) : 0);
                  }, 0);
                  const employeesPaid = Array.from(new Set(filteredPayments.map(p => p.employee).filter(Boolean))).length;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Jobs Completed</p>
                        <p className="text-2xl font-bold text-foreground">{filteredJobs.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Paid</p>
                        <p className="text-2xl font-bold text-success">${totalPaid.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Hours</p>
                        <p className="text-2xl font-bold text-primary">{totalHours.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Employees Paid</p>
                        <p className="text-2xl font-bold text-foreground">{employeesPaid}</p>
                      </div>
                    </div>
                  );
                })()}

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterByDate(jobs, 'finishedAt').map((job, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            <span
                              className="text-primary underline cursor-pointer"
                              onClick={() => { setSelectedJob(job); setChecklistOpen(true); }}
                            >
                              {job.employee || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>{job.customer || 'N/A'}</TableCell>
                          <TableCell>{job.service || 'N/A'}</TableCell>
                          <TableCell>{job.totalTime || 'N/A'}</TableCell>
                          <TableCell>{job.finishedAt ? new Date(job.finishedAt).toLocaleDateString() : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                      {filterByDate(jobs, 'finishedAt').length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No completed jobs for the selected period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Payroll Payments</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Employee</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterByDate(payrollHistory, 'date').map((p, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{p.date ? new Date(p.date).toLocaleDateString() : 'N/A'}</TableCell>
                            <TableCell className="font-medium">{p.employee || 'N/A'}</TableCell>
                            <TableCell>{p.type || 'N/A'}</TableCell>
                            <TableCell>{p.description || '—'}</TableCell>
                            <TableCell className="text-primary font-semibold">${Number(p.amount || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                        {filterByDate(payrollHistory, 'date').length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No payroll payments for the selected period.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Estimates & Quotes Report */}
            <TabsContent value="estimates" className="space-y-4">
              <Card className="p-6 bg-gradient-card border-border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-foreground">Estimates & Quotes Report</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => generateEstimatesReport(false)}>
                      <Printer className="h-4 w-4 mr-2" />Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => generateEstimatesReport(true)}>
                      <Save className="h-4 w-4 mr-2" />Save PDF
                    </Button>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-muted-foreground">
                    Total Estimates: <span className="font-semibold text-foreground">{filterByDate(estimates).length}</span>
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterByDate(estimates).map((est) => (
                        <TableRow key={est.id}>
                          <TableCell className="font-medium">#{est.id || 'N/A'}</TableCell>
                          <TableCell>{est.customerName || 'N/A'}</TableCell>
                          <TableCell>{est.service || 'N/A'}</TableCell>
                          <TableCell className="text-primary font-semibold">${est.total || 0}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-semibold 
                            ${est.status === 'Accepted' ? 'bg-success/20 text-success' :
                                est.status === 'Sent' ? 'bg-primary/20 text-primary' :
                                  'bg-muted text-muted-foreground'}`}>
                              {est.status || 'Draft'}
                            </span>
                          </TableCell>
                          <TableCell>{est.createdAt ? new Date(est.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                      {filterByDate(estimates).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No estimates for the selected period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            {/* Accounting Report */}
            <TabsContent value="accounting" className="space-y-4">
              <Card className="p-6 bg-gradient-card border-border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-foreground">Accounting Report</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      // Export CSV
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
                      const lines: string[] = ['Type,Date,Amount,Category,Description,Customer,Method'];
                      income.filter(i => within(i.date || i.createdAt)).forEach(i => {
                        lines.push(`Income,${(i.date || i.createdAt || '').slice(0, 10)},${i.amount || 0},${i.category || ''},${String(i.description || '').replace(/,/g, ';')},${i.customerName || ''},${i.paymentMethod || ''}`);
                      });
                      expenses.filter(e => within(e.createdAt)).forEach(e => {
                        lines.push(`Expense,${(e.createdAt || '').slice(0, 10)},${e.amount || 0},${e.category || ''},${String(e.description || '').replace(/,/g, ';')},,`);
                      });
                      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `accounting_${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}>
                      Export CSV
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Income</p>
                    <p className="text-2xl font-bold text-success">
                      ${income.filter(i => filterByDate([i], i.date ? 'date' : 'createdAt').length).reduce((s, i) => s + (i.amount || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expenses</p>
                    <p className="text-2xl font-bold text-destructive">
                      ${expenses.filter(e => filterByDate([e]).length).reduce((s, e) => s + (e.amount || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Profit / Loss</p>
                    <p className="text-2xl font-bold text-foreground">
                      {(() => {
                        const inc = income.filter(i => filterByDate([i], i.date ? 'date' : 'createdAt').length).reduce((s, i) => s + (i.amount || 0), 0);
                        const exp = expenses.filter(e => filterByDate([e]).length).reduce((s, e) => s + (e.amount || 0), 0);
                        const p = inc - exp; return `${p < 0 ? '-' : ''}$${Math.abs(p).toFixed(2)}`;
                      })()}
                    </p>
                  </div>
                </div>

                {/* Income Table */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Income</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {income.filter(i => filterByDate([i], i.date ? 'date' : 'createdAt').length).map((i, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{(i.date || i.createdAt || '').slice(0, 10)}</TableCell>
                            <TableCell>${(i.amount || 0).toFixed(2)}</TableCell>
                            <TableCell>{i.category || 'General'}</TableCell>
                            <TableCell>{i.description || ''}</TableCell>
                            <TableCell>{i.customerName || ''}</TableCell>
                            <TableCell>{i.paymentMethod || ''}</TableCell>
                          </TableRow>
                        ))}
                        {income.filter(i => filterByDate([i], i.date ? 'date' : 'createdAt').length).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No income records.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Expense Table */}
                <div>
                  <h3 className="font-semibold mb-2">Expenses</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.filter(e => filterByDate([e]).length).map((e, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{(e.createdAt || '').slice(0, 10)}</TableCell>
                            <TableCell>${(e.amount || 0).toFixed(2)}</TableCell>
                            <TableCell>{e.category || 'General'}</TableCell>
                            <TableCell>{e.description || ''}</TableCell>
                          </TableRow>
                        ))}
                        {expenses.filter(e => filterByDate([e]).length).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No expense records.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Checklist Modal for Employee Report */}
        <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Job Checklist</DialogTitle>
            </DialogHeader>
            {selectedJob && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Customer</div>
                    <div>{selectedJob.customer || selectedJob.customerName || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Vehicle</div>
                    <div>{selectedJob.vehicle || selectedJob.vehicleType || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Service</div>
                    <div>{selectedJob.service || selectedJob.package || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Employee</div>
                    <div>{selectedJob.employee || selectedJob.employeeName || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Finished</div>
                    <div>{selectedJob.finishedAt ? new Date(selectedJob.finishedAt).toLocaleString() : '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div>${Number(selectedJob.totalRevenue || selectedJob.total || 0).toFixed(2)}</div>
                  </div>
                </div>

                {!!(selectedJob.addOns && selectedJob.addOns.length) && (
                  <div>
                    <div className="text-sm font-medium">Add-ons</div>
                    <ul className="list-disc ml-5">
                      {selectedJob.addOns.map((a: string, idx: number) => (
                        <li key={idx}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(selectedJob.tasks && selectedJob.tasks.length > 0) ? (
                  <div>
                    <div className="text-sm font-medium">Checklist Tasks</div>
                    <ul className="list-disc ml-5">
                      {selectedJob.tasks.map((t: string, idx: number) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-medium">Checklist Tasks</div>
                    <ul className="list-disc ml-5">
                      {(() => {
                        const svcKey = selectedJob.service || selectedJob.package;
                        const pkg = servicePackages.find(s => s.id === svcKey) || servicePackages.find(s => s.name === svcKey);
                        const steps = pkg?.steps || [];
                        return steps.map((step, idx) => (<li key={idx}>{step.name}</li>));
                      })()}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Customer Jobs Modal */}
        <Dialog open={customerJobsOpen} onOpenChange={setCustomerJobsOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Customer Jobs Report</DialogTitle>
            </DialogHeader>
            {customerJobsCustomer && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{customerJobsCustomer.name}</h3>
                    <p className="text-sm text-muted-foreground">{customerJobsCustomer.email || '—'} • {customerJobsCustomer.phone || '—'}</p>
                    <p className="text-sm text-muted-foreground">Vehicle: {customerJobsCustomer.year || ''} {customerJobsCustomer.vehicle || ''} {customerJobsCustomer.model || ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      try {
                        const url = buildCustomerJobsPDF(customerJobsCustomer, customerJobs, false);
                        window.open(url, '_blank');
                      } catch { }
                    }}>
                      <Printer className="h-4 w-4 mr-2" />Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      try {
                        const dataUrl = buildCustomerJobsPDF(customerJobsCustomer, customerJobs, true);
                        const fileName = `CustomerJobs_${String(customerJobsCustomer.name || 'Customer').replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
                        savePDFToArchive('Customer', customerJobsCustomer.name || 'Customer', customerJobsCustomer.id || String(Date.now()), String(dataUrl), { fileName });
                      } catch { }
                    }}>
                      <Save className="h-4 w-4 mr-2" />Save to File Manager
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Add-ons</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerJobs.map((job, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{job.finishedAt ? new Date(job.finishedAt).toLocaleString() : '—'}</TableCell>
                          <TableCell>{job.employee?.name || job.employee || job.employeeName || '—'}</TableCell>
                          <TableCell>{job.service || job.package || '—'}</TableCell>
                          <TableCell>{Array.isArray(job.addOns) ? job.addOns.join(', ') : (job.addOns || '—')}</TableCell>
                          <TableCell>{job.totalTime || job.duration || '—'}</TableCell>
                          <TableCell>${Number(job.totalRevenue || job.total || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      {customerJobs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No jobs found for this customer.</TableCell>
                        </TableRow>
                      )}
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
