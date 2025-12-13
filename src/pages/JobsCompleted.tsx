import { useEffect, useMemo, useState } from "react";
import localforage from "localforage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import JobHistoryModal from "@/components/checklist/JobHistoryModal";
import { useSearchParams } from "react-router-dom";
import { getCurrentUser } from "@/lib/auth";
import { getInvoices } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Calendar, Filter, Users, Layers, CheckCircle, Search, Eye } from "lucide-react";

type PDFRecord = {
  id: string;
  fileName: string;
  recordType: string;
  customerName: string;
  date: string;
  timestamp: string;
  recordId: string; // checklistId
  pdfData: string; // data URL
};

type ChecklistRecord = {
  id: string;
  packageId: string;
  vehicleType: string;
  vehicleTypeNote?: string;
  addons: string[];
  tasks: { id: string; name: string; category: 'preparation' | 'exterior' | 'interior' | 'final'; checked: boolean }[];
  progress: number;
  employeeId?: string;
  estimatedTime?: string;
  customerId?: string;
  createdAt?: string;
};

type FilterPreset = "all" | "today" | "last7" | "last30" | "year" | "custom";

export default function JobsCompleted() {
  const [params] = useSearchParams();
  const [pdfJobs, setPdfJobs] = useState<PDFRecord[]>([]);
  const [checklists, setChecklists] = useState<ChecklistRecord[]>([]);
  const [preset, setPreset] = useState<FilterPreset>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Array<{ name: string; email?: string }>>([]);
  const [employeeFilter, setEmployeeFilter] = useState<string>("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [groupBy, setGroupBy] = useState<'none' | 'month' | 'employee'>('none');

  useEffect(() => {
    // Load Job PDFs
    const pdfRaw = JSON.parse(localStorage.getItem('pdfArchive') || '[]') as PDFRecord[];
    const jobs = pdfRaw.filter(r => r.recordType === 'Job');
    setPdfJobs(jobs);

    // Load generic checklists
    localforage.getItem('generic-checklists').then((list: any) => {
      setChecklists(Array.isArray(list) ? list : []);
    });

    // Load employees (include admin/current user)
    (async () => {
      try {
        const list = (await localforage.getItem<any[]>('company-employees')) || [];
        const cur = getCurrentUser();
        const names: Array<{ name: string; email?: string }> = [];
        list.forEach((e: any) => { if (e?.name) names.push({ name: String(e.name), email: String(e.email || '') }); });
        if (cur?.role === 'admin' && !names.find(n => n.name.toLowerCase() === 'admin')) {
          names.unshift({ name: 'Admin', email: cur.email });
        }
        setEmployees(names);
      } catch { }
    })();

    // Load invoices
    (async () => {
      try {
        const invs = await getInvoices<any>();
        setInvoices(invs || []);
      } catch { }
    })();
  }, []);

  // Preselect filter from query param once employees are loaded
  useEffect(() => {
    const empParam = params.get('employee');
    if (!empParam) return;
    if (empParam.toLowerCase() === 'admin') {
      setEmployeeFilter('Admin');
      return;
    }
    const match = employees.find(e => e.name.toLowerCase() === empParam.toLowerCase());
    if (match) setEmployeeFilter(match.name);
  }, [params, employees]);

  const rows = useMemo(() => {
    const merged = pdfJobs.map(pdf => {
      const cl = checklists.find(c => c.id === pdf.recordId) || null;
      return { pdf, cl };
    });
    // Apply filter
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dFrom = preset === 'custom' && fromDate ? new Date(fromDate) : null;
    const dTo = preset === 'custom' && toDate ? new Date(toDate) : null;
    const inRange = (ts: string) => {
      const d = new Date(ts);
      switch (preset) {
        case 'today':
          return d >= startOfToday;
        case 'last7':
          return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'last30':
          return d >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case 'year':
          return d >= startOfYear;
        case 'custom':
          if (dFrom && dTo) return d >= dFrom && d <= new Date(dTo.getTime() + 24 * 60 * 60 * 1000 - 1);
          if (dFrom) return d >= dFrom;
          if (dTo) return d <= new Date(dTo.getTime() + 24 * 60 * 60 * 1000 - 1);
          return true;
        case 'all':
        default:
          return true;
      }
    };
    const dateFiltered = merged.filter(r => inRange(r.pdf.timestamp));
    // Employee filter by checklist-assigned employeeId (stores employee name)
    const empFiltered = employeeFilter
      ? dateFiltered.filter(r => (r.cl?.employeeId || '').toLowerCase() === employeeFilter.toLowerCase())
      : dateFiltered;
    return empFiltered;
  }, [pdfJobs, checklists, preset, fromDate, toDate, employeeFilter]);

  const monthKey = (iso: string) => {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const paymentsForJobMonth = (row: { pdf: PDFRecord; cl: ChecklistRecord | null }) => {
    const cid = row.cl?.customerId || '';
    const mkey = monthKey(row.pdf.timestamp);
    const monthInvs = invoices.filter(inv => inv.customerId === cid && monthKey(inv.date || inv.createdAt || row.pdf.timestamp) === mkey);
    const total = monthInvs.reduce((s, inv) => s + (inv.total || 0), 0);
    const paid = monthInvs.reduce((s, inv) => s + (inv.paidAmount || 0), 0);
    return { total, paid };
  };

  const [selectedJob, setSelectedJob] = useState<{ pdf: PDFRecord; cl: ChecklistRecord | null } | null>(null);
  const adminPdfForSelected = useMemo(() => {
    if (!selectedJob?.cl) return null;
    const list = JSON.parse(localStorage.getItem('pdfArchive') || '[]') as PDFRecord[];
    const id = `materials-${selectedJob.cl.id}`;
    const rec = list.find(r => r.recordType === 'Admin Updates' && r.recordId === id);
    return rec ? { id: rec.id, fileName: rec.fileName, pdfData: rec.pdfData } : null;
  }, [selectedJob]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Jobs Completed" />

      <main className="container mx-auto px-4 py-6 max-w-7xl space-y-6 animate-in fade-in-50">

        {/* Filters Card */}
        <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Filter & Sort</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Time Range</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <Select value={preset} onValueChange={(v) => setPreset(v as FilterPreset)}>
                  <SelectTrigger className="w-full pl-9 bg-zinc-950 border-zinc-800 text-zinc-200">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    <SelectItem value="all">All jobs</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="last7">Last week</SelectItem>
                    <SelectItem value="last30">Last month</SelectItem>
                    <SelectItem value="year">This year</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                disabled={preset !== 'custom'}
                className="bg-zinc-950 border-zinc-800 text-zinc-200 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                disabled={preset !== 'custom'}
                className="bg-zinc-950 border-zinc-800 text-zinc-200 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Employee</label>
              <div className="relative">
                <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <Select value={employeeFilter || 'all'} onValueChange={(v) => setEmployeeFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-full pl-9 bg-zinc-950 border-zinc-800 text-zinc-200">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Group By</label>
              <div className="relative">
                <Layers className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
                  <SelectTrigger className="w-full pl-9 bg-zinc-950 border-zinc-800 text-zinc-200">
                    <SelectValue placeholder="Grouping" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* Results Info */}
        <div className="flex items-center gap-2 text-zinc-400 text-sm pl-1">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <span>Found {rows.length} completed jobs</span>
        </div>

        {/* Grouped or Flat Table */}
        {groupBy === 'none' && (
          <Card className="overflow-hidden border-zinc-800 bg-zinc-900/50">
            <Table>
              <TableHeader className="bg-zinc-900">
                <TableRow className="border-zinc-800 hover:bg-zinc-900">
                  <TableHead className="text-zinc-400">Customer</TableHead>
                  <TableHead className="text-zinc-400">Completed</TableHead>
                  <TableHead className="text-zinc-400">Package</TableHead>
                  <TableHead className="text-zinc-400">Vehicle</TableHead>
                  <TableHead className="text-zinc-400">Employee</TableHead>
                  <TableHead className="text-zinc-400">Progress</TableHead>
                  <TableHead className="text-zinc-400">Invoice Total</TableHead>
                  <TableHead className="text-zinc-400">Paid</TableHead>
                  <TableHead className="w-[100px] text-zinc-400 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => {
                  const pay = paymentsForJobMonth(row);
                  return (
                    <TableRow key={row.pdf.id} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell className="font-medium text-zinc-200">{row.pdf.customerName}</TableCell>
                      <TableCell className="text-zinc-400">{row.pdf.date}</TableCell>
                      <TableCell className="text-zinc-300">{row.cl?.packageId || '-'}</TableCell>
                      <TableCell className="text-zinc-400">{row.cl?.vehicleType || '-'}</TableCell>
                      <TableCell className="text-zinc-300">{row.cl?.employeeId || '-'}</TableCell>
                      <TableCell className="text-zinc-400">{row.cl ? `${Math.round(row.cl.progress || 0)}%` : '-'}</TableCell>
                      <TableCell className="text-emerald-400 font-bold">${pay.total.toFixed(2)}</TableCell>
                      <TableCell className="text-zinc-400">${pay.paid.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedJob(row as any); setOpenIdx(idx); }} className="h-8 border-zinc-700 hover:bg-zinc-800 hover:text-white">
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-zinc-500 py-12">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      No jobs found for selected range.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {groupBy !== 'none' && (
          <div className="space-y-6">
            {Object.entries(
              rows.reduce((acc: Record<string, typeof rows>, r) => {
                const key = groupBy === 'month' ? monthKey(r.pdf.timestamp) : (r.cl?.employeeId || 'Unknown');
                acc[key] = acc[key] || [];
                acc[key].push(r);
                return acc;
              }, {})
            ).map(([key, list]) => {
              const summary = list.reduce((s, r) => {
                const p = paymentsForJobMonth(r);
                s.jobs += 1;
                s.total += p.total;
                s.paid += p.paid;
                return s;
              }, { jobs: 0, total: 0, paid: 0 });
              return (
                <Card key={key} className="overflow-hidden border-zinc-800 bg-zinc-900/50">
                  <div className="px-6 py-4 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        {groupBy === 'month' ? <Calendar className="h-4 w-4 text-indigo-400" /> : <Users className="h-4 w-4 text-indigo-400" />}
                      </div>
                      <span className="text-lg font-bold text-white uppercase tracking-tight">
                        {groupBy === 'month' ? `Month: ${key}` : `Employee: ${key}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="px-3 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                        Jobs: <span className="text-white font-bold">{summary.jobs}</span>
                      </div>
                      <div className="px-3 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                        Total: <span className="text-emerald-400 font-bold">${summary.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <Table>
                    <TableHeader className="bg-zinc-900">
                      <TableRow className="border-zinc-800 hover:bg-zinc-900">
                        <TableHead className="text-zinc-400">Customer</TableHead>
                        <TableHead className="text-zinc-400">Completed</TableHead>
                        <TableHead className="text-zinc-400">Package</TableHead>
                        <TableHead className="text-zinc-400">Vehicle</TableHead>
                        <TableHead className="text-zinc-400">Employee</TableHead>
                        <TableHead className="text-zinc-400">Progress</TableHead>
                        <TableHead className="text-zinc-400">Invoice Total</TableHead>
                        <TableHead className="text-zinc-400">Paid</TableHead>
                        <TableHead className="w-[100px] text-zinc-400 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((row, idx) => {
                        const pay = paymentsForJobMonth(row);
                        return (
                          <TableRow key={row.pdf.id} className="border-zinc-800 hover:bg-zinc-800/50">
                            <TableCell className="font-medium text-zinc-200">{row.pdf.customerName}</TableCell>
                            <TableCell className="text-zinc-400">{row.pdf.date}</TableCell>
                            <TableCell className="text-zinc-300">{row.cl?.packageId || '-'}</TableCell>
                            <TableCell className="text-zinc-400">{row.cl?.vehicleType || '-'}</TableCell>
                            <TableCell className="text-zinc-300">{row.cl?.employeeId || '-'}</TableCell>
                            <TableCell className="text-zinc-400">{row.cl ? `${Math.round(row.cl.progress || 0)}%` : '-'}</TableCell>
                            <TableCell className="text-emerald-400 font-bold">${pay.total.toFixed(2)}</TableCell>
                            <TableCell className="text-zinc-400">${pay.paid.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => { setSelectedJob(row as any); setOpenIdx(idx); }} className="h-8 border-zinc-700 hover:bg-zinc-800 hover:text-white">
                                <Eye className="h-4 w-4 mr-1" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              );
            })}
          </div>
        )}

        <JobHistoryModal
          open={openIdx !== null}
          onOpenChange={(v) => { if (!v) { setOpenIdx(null); setSelectedJob(null); } }}
          jobPdf={selectedJob ? {
            id: selectedJob.pdf.id,
            fileName: selectedJob.pdf.fileName,
            date: selectedJob.pdf.date,
            timestamp: selectedJob.pdf.timestamp,
            recordId: selectedJob.pdf.recordId,
            customerName: selectedJob.pdf.customerName,
            pdfData: selectedJob.pdf.pdfData,
          } : null}
          checklist={selectedJob?.cl || null}
          adminUpdatesPdf={adminPdfForSelected}
        />
      </main>
    </div>
  );
}
