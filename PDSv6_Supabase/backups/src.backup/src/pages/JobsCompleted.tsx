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
  tasks: { id: string; name: string; category: 'preparation'|'exterior'|'interior'|'final'; checked: boolean }[];
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
  const [groupBy, setGroupBy] = useState<'none'|'month'|'employee'>('none');

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
      } catch {}
    })();

    // Load invoices
    (async () => {
      try {
        const invs = await getInvoices<any>();
        setInvoices(invs || []);
      } catch {}
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
          if (dFrom && dTo) return d >= dFrom && d <= new Date(dTo.getTime() + 24*60*60*1000 - 1);
          if (dFrom) return d >= dFrom;
          if (dTo) return d <= new Date(dTo.getTime() + 24*60*60*1000 - 1);
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
    const m = String(d.getMonth()+1).padStart(2,'0');
    return `${y}-${m}`;
  };

  const paymentsForJobMonth = (row: { pdf: PDFRecord; cl: ChecklistRecord|null }) => {
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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Jobs Completed</h1>
      </div>

      <Card className="p-4 bg-gradient-card border-border">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Filter</p>
            <Select value={preset} onValueChange={(v) => setPreset(v as FilterPreset)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All jobs</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last7">Last week</SelectItem>
                <SelectItem value="last30">Last month</SelectItem>
                <SelectItem value="year">This year</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">From</p>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={preset !== 'custom'} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">To</p>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={preset !== 'custom'} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Sort by Employee</p>
            <Select value={employeeFilter || 'all'} onValueChange={(v) => setEmployeeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Group by</p>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Grouping" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Grouped or Flat Table */}
      {groupBy === 'none' && (
        <Card className="p-0 overflow-hidden border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Invoice Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => {
                const pay = paymentsForJobMonth(row);
                return (
                  <TableRow key={row.pdf.id}>
                    <TableCell className="text-foreground">{row.pdf.customerName}</TableCell>
                    <TableCell className="text-foreground">{row.pdf.date}</TableCell>
                    <TableCell className="text-foreground">{row.cl?.packageId || '-'}</TableCell>
                    <TableCell className="text-foreground">{row.cl?.vehicleType || '-'}</TableCell>
                    <TableCell className="text-foreground">{row.cl?.employeeId || '-'}</TableCell>
                    <TableCell className="text-foreground">{row.cl ? `${Math.round(row.cl.progress || 0)}%` : '-'}</TableCell>
                    <TableCell className="text-foreground">${pay.total.toFixed(2)}</TableCell>
                    <TableCell className="text-foreground">${pay.paid.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="secondary" onClick={() => { setSelectedJob(row as any); setOpenIdx(idx); }}>View</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">No jobs found for selected range.</TableCell>
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
              <Card key={key} className="p-0 overflow-hidden border-border">
                <div className="px-4 py-3 border-b border-border bg-background/60 flex items-center justify-between">
                  <div className="text-foreground font-semibold">
                    {groupBy === 'month' ? `Month: ${key}` : `Employee: ${key}`}
                  </div>
                  <div className="text-sm text-muted-foreground">Jobs: {summary.jobs} • Invoice Total: ${summary.total.toFixed(2)} • Paid: ${summary.paid.toFixed(2)}</div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Invoice Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((row, idx) => {
                      const pay = paymentsForJobMonth(row);
                      return (
                        <TableRow key={row.pdf.id}>
                          <TableCell className="text-foreground">{row.pdf.customerName}</TableCell>
                          <TableCell className="text-foreground">{row.pdf.date}</TableCell>
                          <TableCell className="text-foreground">{row.cl?.packageId || '-'}</TableCell>
                          <TableCell className="text-foreground">{row.cl?.vehicleType || '-'}</TableCell>
                          <TableCell className="text-foreground">{row.cl?.employeeId || '-'}</TableCell>
                          <TableCell className="text-foreground">{row.cl ? `${Math.round(row.cl.progress || 0)}%` : '-'}</TableCell>
                          <TableCell className="text-foreground">${pay.total.toFixed(2)}</TableCell>
                          <TableCell className="text-foreground">${pay.paid.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="secondary" onClick={() => { setSelectedJob(row as any); setOpenIdx(idx); }}>View</Button>
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
        onOpenChange={(v) => { if (!v) { setOpenIdx(null); setSelectedJob(null); }}}
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
    </div>
  );
}
