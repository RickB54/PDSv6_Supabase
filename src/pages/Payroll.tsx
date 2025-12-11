import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { upsertExpense } from "@/lib/db";
import { pushAdminAlert, dismissAlertsForRecord, getAdminAlerts } from "@/lib/adminAlerts";
import { getCurrentUser } from "@/lib/auth";
import localforage from "localforage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import {
  Pencil, Trash2, Save, X, ChevronDown, ChevronUp,
  Briefcase, Clock, DollarSign, Wallet, CreditCard,
  CalendarDays, User, Search
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type JobRow = { kind: 'job'; amount: number; description: string; date: string; employee?: string; jobId?: string };
type HoursRow = { kind: 'hours'; name: string; email?: string; hours: number; rate: number; bonus?: number; jobPay?: number };
type CustomRow = { kind: 'custom'; amount: number; paymentType: 'Bonus' | 'Commission' | 'Tip' | 'Reimbursement' | 'Overtime Pay' | 'Holiday Pay' | 'Gift' | 'Advance' | 'Other'; otherReason?: string };
type Row = JobRow | HoursRow | CustomRow;

const defaultRows: Row[] = [
  { kind: 'job', amount: 0, description: '', date: new Date().toISOString().slice(0, 10) },
];

const Payroll = () => {
  const [params] = useSearchParams();
  const { toast } = useToast();
  const user = getCurrentUser();
  const [periodStart, setPeriodStart] = useState<string>(new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState<string>(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>(defaultRows);
  const [tab, setTab] = useState<'current' | 'history' | 'checks'>('current');
  const [history, setHistory] = useState<Array<{ id: string; date: string; type: string; description?: string; amount: number; status: 'Paid' | 'Pending'; employee?: string; pdfId?: string }>>([]);

  // Applied filters
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStart, setFilterStart] = useState<string>('');
  const [filterEnd, setFilterEnd] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');

  // Draft controls (Apply only on button click)
  const [draftEmployee, setDraftEmployee] = useState<string>('');
  const [draftType, setDraftType] = useState<string>('');
  const [draftStart, setDraftStart] = useState<string>('');
  const [draftEnd, setDraftEnd] = useState<string>('');
  const [draftSearch, setDraftSearch] = useState<string>('');

  const [employees, setEmployees] = useState<Array<{ name: string; email: string; flatRate?: number; bonuses?: number; paymentByJob?: boolean; jobRates?: Record<string, number> }>>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ amount?: string; type?: string; description?: string } | null>(null);

  // Checks tab state
  const [checkEmployee, setCheckEmployee] = useState<string>('');
  const [checkAmount, setCheckAmount] = useState<string>('');
  const [checkNumber, setCheckNumber] = useState<string>('');
  const [checkDate, setCheckDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [checkMemo, setCheckMemo] = useState<string>('');
  const [checkType, setCheckType] = useState<'Check' | 'Cash' | 'Direct Deposit'>('Check');
  const [checkPayeeType, setCheckPayeeType] = useState<'Employee' | 'Customer' | 'Other'>('Employee');

  // Collapsible States
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);
  const [isWorksheetExpanded, setIsWorksheetExpanded] = useState(true);

  useEffect(() => {
    const load = async () => {
      const list = (await localforage.getItem<any[]>("company-employees")) || [];
      setEmployees(list);
      const jobs = JSON.parse(localStorage.getItem('completedJobs') || '[]');
      setCompletedJobs(jobs);
    };
    load();
  }, []);

  // Modal logic
  useEffect(() => {
    const modal = params.get('modal');
    if (modal !== '1') return;
    const emp = params.get('employee') || '';
    const jobId = params.get('jobId') || '';
    try {
      const job = completedJobs.find((j: any) => String(j.jobId) === String(jobId));
      if (job) {
        const newRow: JobRow = {
          kind: 'job',
          amount: Number(job.totalRevenue || 0),
          description: `${job.service || 'Job'} - ${job.vehicle || ''} - ${job.customer || ''}`,
          date: String(job.finishedAt || new Date().toISOString().slice(0, 10)),
          employee: emp || job.employee || '',
          jobId: job.jobId,
        };
        setRows([newRow]);
      } else {
        setRows([{ kind: 'job', amount: 0, description: '', date: new Date().toISOString().slice(0, 10), employee: emp || '' }]);
      }
    } catch {
      setRows([{ kind: 'job', amount: 0, description: '', date: new Date().toISOString().slice(0, 10), employee: emp || '' }]);
    }
  }, [params, completedJobs]);

  // Overdue Toast
  const [overdueToastShown, setOverdueToastShown] = useState(false);
  useEffect(() => {
    if (overdueToastShown) return;
    (async () => {
      try {
        const list = (await localforage.getItem<any[]>('company-employees')) || [];
        const now = Date.now();
        const overdue = list.filter((e: any) => e.lastPaid && (now - new Date(e.lastPaid).getTime()) > 7 * 24 * 60 * 60 * 1000);
        overdue.slice(0, 3).forEach((e: any) => {
          toast({ title: 'Overdue Employee', description: `${e.name} overdue — pay now`, variant: 'destructive' });
        });
        if (overdue.length > 0) setOverdueToastShown(true);
      } catch { }
    })();
  }, [employees, overdueToastShown]);

  // Payroll Due Alert
  useEffect(() => {
    const today = new Date();
    const end = new Date(periodEnd);
    if (tab !== 'current') return;
    if (end <= today) {
      const anyPaid = history.some(h => h.status === 'Paid' && new Date(h.date) >= new Date(periodStart) && new Date(h.date) <= new Date(periodEnd));
      if (!anyPaid) {
        try {
          const existing = getAdminAlerts().some(a =>
            a.type === 'payroll_due' &&
            String(a?.payload?.periodStart || '') === String(periodStart) &&
            String(a?.payload?.periodEnd || '') === String(periodEnd) &&
            String(a?.message || '').includes('Weekly payroll due')
          );
          if (!existing) {
            pushAdminAlert('payroll_due', `Weekly payroll due — no payments logged`, 'system', { periodStart, periodEnd });
          }
        } catch { }
      }
    }
  }, [tab, periodStart, periodEnd, history]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const grossPay = rows.reduce((sum, r) => {
    if (r.kind === 'job') return sum + (r.amount || 0);
    if (r.kind === 'hours') return sum + (r.hours * r.rate + (r.bonus || 0) + (r.jobPay || 0));
    return sum + ((r as CustomRow).amount || 0);
  }, 0);

  const addJobRow = () => {
    setRows(r => [...r, { kind: 'job', amount: 0, description: '', date: new Date().toISOString().slice(0, 10) }]);
    if (!isWorksheetExpanded) setIsWorksheetExpanded(true);
  };
  const addHoursRow = () => {
    setRows(r => [...r, { kind: 'hours', name: "New Employee", hours: 0, rate: 15, bonus: 0 }]);
    if (!isWorksheetExpanded) setIsWorksheetExpanded(true);
  };
  const addCustomRow = () => {
    setRows(r => [...r, { kind: 'custom', amount: 0, paymentType: 'Bonus' }]);
    if (!isWorksheetExpanded) setIsWorksheetExpanded(true);
  };

  const addJobRowFromCompleted = (job: any) => {
    try {
      const newRow: JobRow = {
        kind: 'job',
        amount: Number(job.totalRevenue || 0),
        description: `${job.service || 'Job'} - ${job.vehicle || ''} - ${job.customer || ''}`,
        date: String(job.finishedAt || new Date().toISOString().slice(0, 10)),
        employee: job.employee || '',
        jobId: job.jobId,
      };
      setRows(prev => [...prev, newRow]);
      if (!isWorksheetExpanded) setIsWorksheetExpanded(true);
      toast({
        title: 'Added to Payroll',
        description: 'Row added. You can edit inline or undo.',
        className: 'border-yellow-500 bg-yellow-100 text-yellow-900',
        action: (
          <ToastAction altText="Undo" onClick={() => {
            try {
              setRows(prev => prev.filter(r => !(r.kind === 'job' && (r as JobRow).jobId === job.jobId)));
            } catch { }
          }}>Undo</ToastAction>
        ),
      });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to add row.', variant: 'destructive' });
    }
  };

  const removeRow = (idx: number) => setRows(r => r.filter((_, i) => i !== idx));

  // PDF Generation & Saving
  const savePayStub = async () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Payroll Summary", 20, 20);
      doc.setFontSize(12);
      doc.text(`Period: ${periodStart} to ${periodEnd}`, 20, 30);
      let y = 42;
      doc.setFontSize(11);
      rows.forEach((r) => {
        if (r.kind === 'hours') {
          const pay = r.hours * r.rate + (r.bonus || 0) + (r.jobPay || 0);
          const parts: string[] = [];
          parts.push(`${r.hours} hrs @ $${r.rate}/hr`);
          if ((r.bonus || 0) > 0) parts.push(`Bonus $${(r.bonus || 0).toFixed(2)}`);
          if ((r.jobPay || 0) > 0) parts.push(`Job Pay $${(r.jobPay || 0).toFixed(2)}`);
          doc.text(`• ${parts.join(' + ')} = $${pay.toFixed(2)}`, 20, y);
        } else if (r.kind === 'job') {
          const jr = r as JobRow;
          const label = jr.description ? `Job Pay: ${jr.description}` : 'Job Pay';
          doc.text(`• ${label} = $${(jr.amount || 0).toFixed(2)}`, 20, y);
        } else {
          const cr = r as CustomRow;
          const label = cr.paymentType === 'Other' && cr.otherReason ? `Other: ${cr.otherReason}` : cr.paymentType;
          doc.text(`• ${label} = $${(cr.amount || 0).toFixed(2)}`, 20, y);
        }
        y += 6;
      });
      y += 6;
      doc.setFontSize(12);
      doc.text(`Total Gross: $${grossPay.toFixed(2)}`, 20, y);

      const pdfDataUrl = doc.output('dataurlstring');
      const fileName = `Payroll_${periodStart}_to_${periodEnd}.pdf`;
      savePDFToArchive('Payroll', 'Company', `payroll-${periodStart}-${periodEnd}`, pdfDataUrl, { fileName });

      let pdfId: string | undefined;
      try {
        const archive = JSON.parse(localStorage.getItem('pdfArchive') || '[]');
        const latest = [...archive].reverse().find((r: any) => r?.recordType === 'Payroll' && r?.recordId === `payroll-${periodStart}-${periodEnd}`);
        pdfId = latest?.id;
      } catch { }

      try {
        await api('/api/payroll/save', { method: 'POST', body: JSON.stringify({ periodStart, periodEnd, rows }) });
      } catch { }

      // Log history
      try {
        const entries = rows.map((r) => {
          if (r.kind === 'hours') {
            const amt = r.hours * r.rate + (r.bonus || 0) + (r.jobPay || 0);
            return { type: 'hours', amount: amt, description: `${r.hours} hrs @ $${r.rate}/hr`, date: periodEnd, status: 'Paid', employee: r.name, pdfId };
          } else if (r.kind === 'job') {
            const jr = r as JobRow;
            return { type: 'job', amount: jr.amount || 0, description: jr.description || '', date: jr.date, status: 'Paid', employee: jr.employee, pdfId, jobId: jr.jobId };
          } else {
            const cr = r as CustomRow; const label = cr.paymentType === 'Other' && cr.otherReason ? `Other: ${cr.otherReason}` : cr.paymentType;
            return { type: 'custom', amount: cr.amount || 0, description: label, date: periodEnd, status: 'Paid', employee: '', pdfId };
          }
        });
        await api('/api/payroll/history', { method: 'POST', body: JSON.stringify(entries) });
        // Mark jobs paid
        try {
          const completed = JSON.parse(localStorage.getItem('completedJobs') || '[]');
          const paidIds = entries.filter((e: any) => e.type === 'job' && e.jobId).map((e: any) => e.jobId);
          const next = completed.map((j: any) => paidIds.includes(j.jobId) ? { ...j, paid: true } : j);
          localStorage.setItem('completedJobs', JSON.stringify(next));
          setCompletedJobs(next);
        } catch { }
      } catch { }

      await loadHistory();
      toast({ title: "Saved", description: "Payroll PDF saved to archive." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate payroll PDF.", variant: "destructive" });
    }
  };

  const savePaymentRow = async (idx: number) => {
    try {
      const row = rows[idx];
      await api('/api/payroll/save', { method: 'POST', body: JSON.stringify({ periodStart, periodEnd, row }) });
      // Logic for single row save...
      let entry: any = null;
      if (row.kind === 'hours') {
        const amt = row.hours * row.rate + (row.bonus || 0) + (row.jobPay || 0);
        entry = { type: 'hours', amount: amt, description: `${row.hours} hrs @ $${row.rate}/hr`, date: periodEnd, status: 'Pending', employee: row.name };
      } else if (row.kind === 'job') {
        const jr = row as JobRow;
        entry = { type: 'job', amount: jr.amount || 0, description: jr.description || '', date: jr.date, status: 'Pending', employee: jr.employee, jobId: jr.jobId };
      } else {
        const cr = row as CustomRow; const label = cr.paymentType === 'Other' && cr.otherReason ? `Other: ${cr.otherReason}` : cr.paymentType;
        entry = { type: 'custom', amount: cr.amount || 0, description: label, date: periodEnd, status: 'Pending', employee: '' };
      }
      await api('/api/payroll/history', { method: 'POST', body: JSON.stringify(entry) });

      if (row.kind === 'job' && (row as JobRow).jobId) {
        try {
          const completed = JSON.parse(localStorage.getItem('completedJobs') || '[]');
          const next = completed.map((j: any) => j.jobId === (row as JobRow).jobId ? { ...j, paid: true } : j);
          localStorage.setItem('completedJobs', JSON.stringify(next));
          setCompletedJobs(next);
        } catch { }
      }
      await loadHistory();
      toast({ title: 'Payment Saved', description: 'Row saved instantly.' });
    } catch (e) {
      toast({ title: 'Save Failed', description: 'Could not save payment.', variant: 'destructive' });
    }
  };

  const loadHistory = async () => {
    try {
      const qs = new URLSearchParams({
        employeeId: filterEmployee || '',
        start: filterStart || '',
        end: filterEnd || '',
        type: filterType || '',
        search: filterSearch || '',
      }).toString();
      const res = await api(`/api/payroll/history?${qs}`, { method: 'GET' });
      setHistory(Array.isArray(res) ? res : []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => { if (tab === 'history') { loadHistory(); } }, [tab, filterEmployee, filterType, filterStart, filterEnd, filterSearch]);

  const applyFilters = () => {
    setFilterEmployee(draftEmployee);
    setFilterType(draftType);
    setFilterStart(draftStart);
    setFilterEnd(draftEnd);
    setFilterSearch(draftSearch);
  };
  const clearFilters = () => {
    setDraftEmployee(''); setDraftType(''); setDraftStart(''); setDraftEnd(''); setDraftSearch('');
    setFilterEmployee(''); setFilterType(''); setFilterStart(''); setFilterEnd(''); setFilterSearch('');
  };

  const startEdit = (row: any) => {
    setEditId(row.id);
    setEditDraft({ amount: String(row.amount ?? ''), type: String(row.type ?? ''), description: String(row.description ?? '') });
  };
  const cancelEdit = () => { setEditId(null); setEditDraft(null); };
  const saveEdit = async () => {
    if (!editId || !editDraft) return;
    const patch = { amount: Number(editDraft.amount || 0), type: editDraft.type || '', description: editDraft.description || '' };
    await api('/api/payroll/history/update', { method: 'POST', body: JSON.stringify({ id: editId, patch }) });
    cancelEdit();
    await loadHistory();
    toast({ title: 'Updated', description: 'History entry updated.' });
  };
  const deleteEntry = async (id: string) => {
    if (!window.confirm('Delete from history?')) return;
    await api('/api/payroll/history/delete', { method: 'POST', body: JSON.stringify({ id }) });
    await loadHistory();
    toast({ title: 'Deleted', description: 'Entry removed.' });
  };

  // Render Helpers
  const renderJobRow = (row: JobRow, idx: number) => (
    <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end p-3 border border-border rounded-lg bg-card hover:bg-muted/10">
      <div className="md:col-span-2 space-y-1">
        <Label className="text-xs text-muted-foreground">Job Pay ($)</Label>
        <Input type="number" step="0.01" className="text-right border-emerald-600/50" value={row.amount || 0}
          onChange={(e) => setRows(r => { const c = [...r]; const cur = c[idx] as JobRow; c[idx] = { ...cur, amount: parseFloat(e.target.value) || 0 }; return c; })} />
      </div>
      <div className="md:col-span-2 space-y-1">
        <Label className="text-xs text-muted-foreground">Description</Label>
        <Input placeholder="e.g. Full Detail" className="border-emerald-600/50" value={row.description || ''}
          onChange={(e) => setRows(r => { const c = [...r]; const cur = c[idx] as JobRow; c[idx] = { ...cur, description: e.target.value }; return c; })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Date</Label>
        <Input type="date" className="border-emerald-600/50" value={row.date}
          onChange={(e) => setRows(r => { const c = [...r]; const cur = c[idx] as JobRow; c[idx] = { ...cur, date: e.target.value }; return c; })} />
      </div>
      <div className="flex gap-2">
        <Button size="icon" variant="ghost" className="h-9 w-9 text-green-500 hover:text-green-400" onClick={() => savePaymentRow(idx)}><Save className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500 hover:text-red-400" onClick={() => removeRow(idx)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader title="Payroll" />
      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button className={`rounded-full px-6 transition-all ${tab === 'current' ? 'bg-emerald-600 shadow-emerald-900/20 shadow-lg hover:bg-emerald-700' : 'bg-muted/50 hover:bg-muted'}`} onClick={() => setTab('current')}>Current Payroll</Button>
          <Button className={`rounded-full px-6 transition-all ${tab === 'history' ? 'bg-purple-600 shadow-purple-900/20 shadow-lg hover:bg-purple-700' : 'bg-muted/50 hover:bg-muted'}`} onClick={() => setTab('history')}>History & Reports</Button>
          <Button className={`rounded-full px-6 transition-all ${tab === 'checks' ? 'bg-amber-600 shadow-amber-900/20 shadow-lg hover:bg-amber-700' : 'bg-muted/50 hover:bg-muted'}`} onClick={() => setTab('checks')}>Write Checks</Button>
        </div>

        {/* CURRENT PAYROLL TAB */}
        {tab === 'current' && (
          <div className="space-y-6 animate-fade-in">

            {/* Summary Card */}
            <Card className="border-emerald-500/30 border-t-4 shadow-lg bg-gradient-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2"><CalendarDays className="h-5 w-5 text-emerald-400" /> Pay Period</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Start Date</Label>
                    <Input type="date" className="border-emerald-500/30 bg-black/20" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">End Date</Label>
                    <Input type="date" className="border-emerald-500/30 bg-black/20" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Total Estimated</Label>
                    <div className="flex items-center h-10 px-3 rounded-md border border-emerald-500/50 bg-emerald-950/20 text-emerald-400 font-mono text-lg font-bold">
                      ${grossPay.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unpaid Completed Jobs - Collapsible */}
            <Collapsible open={isCompletedExpanded} onOpenChange={setIsCompletedExpanded}>
              <Card className={`border-blue-500/30 shadow-lg bg-card transition-all duration-300 ${!isCompletedExpanded ? 'opacity-80' : ''}`}>
                <CardHeader className="py-3 px-4 flex flex-row items-center cursor-pointer hover:bg-muted/5" onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="bg-blue-500/10 p-1.5 rounded-md"><Briefcase className="h-5 w-5 text-blue-400" /></div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">Completed Jobs (Unpaid)</span>
                      <span className="text-xs text-muted-foreground">{completedJobs.filter(j => j.status === 'completed' && !j.paid).length} jobs available</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {isCompletedExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 px-4 bg-muted/5 rounded-b-lg border-t border-border/50">
                    {completedJobs.filter(j => j.status === 'completed' && !j.paid).length === 0 ? (
                      <div className="py-6 text-center text-muted-foreground text-sm">No unpaid completed jobs found.</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 mt-4">
                        {completedJobs.filter(j => j.status === 'completed' && !j.paid).map(j => (
                          <div key={j.jobId} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border border-blue-500/20 bg-blue-950/5 hover:bg-blue-950/10 transition-colors gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-blue-400 font-mono text-xs border border-blue-500/30 px-1.5 rounded">{j.finishedAt?.slice(0, 10)}</span>
                                <span className="font-medium text-sm">{j.service}</span>
                              </div>
                              <div className="text-xs text-muted-foreground flex gap-2">
                                <span>{j.vehicle}</span>
                                <span>•</span>
                                <span>{j.customer}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Revenue</div>
                                <div className="font-bold text-blue-100">${Number(j.totalRevenue || 0).toFixed(2)}</div>
                              </div>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs shadow-lg shadow-blue-900/20" onClick={() => addJobRowFromCompleted(j)}>Add</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Worksheet - Collapsible */}
            <Collapsible open={isWorksheetExpanded} onOpenChange={setIsWorksheetExpanded}>
              <Card className="border-emerald-500/30 shadow-lg bg-card">
                <CardHeader className="py-3 px-4 flex flex-row items-center cursor-pointer hover:bg-muted/5" onClick={() => setIsWorksheetExpanded(!isWorksheetExpanded)}>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="bg-emerald-500/10 p-1.5 rounded-md"><Wallet className="h-5 w-5 text-emerald-400" /></div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">Payroll Worksheet</span>
                      <span className="text-xs text-muted-foreground">{rows.length} entries</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {isWorksheetExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 px-4 bg-muted/5 rounded-b-lg border-t border-border/50">
                    <div className="space-y-4 mt-4">
                      {rows.map((row, idx) => (
                        <div key={idx} className="animate-in fade-in slide-in-from-top-1 duration-200">
                          {row.kind === 'job' && renderJobRow(row, idx)}
                          {row.kind === 'hours' && (
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end p-3 border border-border rounded-lg bg-card hover:bg-muted/10">
                              <div className="md:col-span-2 space-y-1">
                                <Label className="text-xs text-muted-foreground">Employee / Task</Label>
                                <Input className="border-indigo-500/40" value={row.name} onChange={(e) => setRows(r => { const c = [...r]; const cur = c[idx] as HoursRow; c[idx] = { ...cur, name: e.target.value }; return c; })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Hours</Label>
                                <Input type="number" className="border-indigo-500/40" value={row.hours} onChange={(e) => setRows(r => { const c = [...r]; const cur = c[idx] as HoursRow; c[idx] = { ...cur, hours: parseFloat(e.target.value) || 0 }; return c; })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Rate ($)</Label>
                                <Input type="number" className="border-indigo-500/40" value={row.rate} onChange={(e) => setRows(r => { const c = [...r]; const cur = c[idx] as HoursRow; c[idx] = { ...cur, rate: parseFloat(e.target.value) || 0 }; return c; })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Bonus ($)</Label>
                                <Input type="number" className="border-indigo-500/40" value={row.bonus || 0} onChange={(e) => setRows(r => { const c = [...r]; const cur = c[idx] as HoursRow; c[idx] = { ...cur, bonus: parseFloat(e.target.value) || 0 }; return c; })} />
                              </div>
                              <div className="flex gap-2">
                                <Button size="icon" variant="ghost" className="h-9 w-9 text-green-500" onClick={() => savePaymentRow(idx)}><Save className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500" onClick={() => removeRow(idx)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          )}
                          {row.kind === 'custom' && (
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end p-3 border border-border rounded-lg bg-card hover:bg-muted/10">
                              <div className="md:col-span-2 space-y-1">
                                <Label className="text-xs text-muted-foreground">Type</Label>
                                <Select value={row.paymentType} onValueChange={(val: any) => setRows(r => { const c = [...r]; const cur = c[idx] as CustomRow; c[idx] = { ...cur, paymentType: val }; return c; })}>
                                  <SelectTrigger className="border-amber-500/40"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {['Bonus', 'Commission', 'Tip', 'Other'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-2 space-y-1">
                                <Label className="text-xs text-muted-foreground">Amount ($)</Label>
                                <Input type="number" className="border-amber-500/40" value={row.amount} onChange={(e) => setRows(r => { const c = [...r]; const cur = c[idx] as CustomRow; c[idx] = { ...cur, amount: parseFloat(e.target.value) || 0 }; return c; })} />
                              </div>
                              <div className="flex gap-2">
                                <Button size="icon" variant="ghost" className="h-9 w-9 text-green-500" onClick={() => savePaymentRow(idx)}><Save className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500" onClick={() => removeRow(idx)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 justify-center mt-6 flex-wrap">
                      <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/30" onClick={addJobRow}>+ Job Row</Button>
                      <Button variant="outline" className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-950/30" onClick={addHoursRow}>+ Hourly Row</Button>
                      <Button variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-950/30" onClick={addCustomRow}>+ Custom Payment</Button>
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px] shadow-lg shadow-emerald-900/30" onClick={savePayStub}>Finalize & Save</Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <Card className="border-purple-500/30 border-t-4 shadow-lg bg-card animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-purple-400"><Clock className="h-5 w-5" /> History & Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 bg-muted/10 p-4 rounded-lg border border-border/50">
                <div className="space-y-1"><Label className="text-xs">Employee</Label><Input placeholder="All" className="h-8" value={draftEmployee} onChange={e => setDraftEmployee(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Start Date</Label><Input type="date" className="h-8" value={draftStart} onChange={e => setDraftStart(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">End Date</Label><Input type="date" className="h-8" value={draftEnd} onChange={e => setDraftEnd(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Search</Label><Input placeholder="Desc..." className="h-8" value={draftSearch} onChange={e => setDraftSearch(e.target.value)} /></div>
                <div className="flex items-end"><Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700" onClick={applyFilters}>Apply</Button></div>
              </div>
              <div className="rounded-md border border-border/50 overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/20 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Employee</th>
                      <th className="px-4 py-3 text-left font-medium">Description</th>
                      <th className="px-4 py-3 text-left font-medium">Amount</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {history.map(h => (
                      <tr key={h.id} className="hover:bg-muted/5 transition-colors">
                        <td className="px-4 py-3">{h.date}</td>
                        <td className="px-4 py-3">{h.employee || 'N/A'}</td>
                        <td className="px-4 py-3 text-muted-foreground w-1/3 truncate" title={h.description}>{h.description}</td>
                        <td className="px-4 py-3 font-mono font-medium">${Number(h.amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${h.status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{h.status}</span></td>
                        <td className="px-4 py-3 flex gap-2">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteEntry(h.id)}><Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" /></Button>
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No records found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* WRITE CHECKS TAB */}
        {tab === 'checks' && (
          <Card className="border-amber-500/30 border-t-4 shadow-lg bg-card animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-amber-400"><CreditCard className="h-5 w-5" /> Write Checks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payee Name</Label>
                    <div className="flex gap-2">
                      <Select value={checkPayeeType} onValueChange={(v: any) => setCheckPayeeType(v)}>
                        <SelectTrigger className="w-[120px] bg-muted/10"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Employee">Employee</SelectItem><SelectItem value="Customer">Customer</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                      </Select>
                      <Input className="border-amber-500/30" placeholder="Name..." value={checkEmployee} onChange={e => setCheckEmployee(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount ($)</Label>
                    <Input type="number" step="0.01" className="border-amber-500/30 text-lg font-mono" value={checkAmount} onChange={e => setCheckAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" className="border-amber-500/30" value={checkDate} onChange={e => setCheckDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Check Number</Label>
                    <Input className="border-amber-500/30" placeholder="e.g. 1001" value={checkNumber} onChange={e => setCheckNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Memo</Label>
                    <Input className="border-amber-500/30" placeholder="e.g. Services Rendered" value={checkMemo} onChange={e => setCheckMemo(e.target.value)} />
                  </div>
                  <div className="pt-6">
                    <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/20 h-10 text-base" onClick={async () => {
                      try {
                        const amt = Number(checkAmount || 0);
                        const doc = new jsPDF();
                        doc.setTextColor(200, 0, 0);
                        doc.setFontSize(18); doc.text('Company Check', 20, 20);
                        doc.setTextColor(0, 0, 0);
                        doc.setFontSize(12); doc.text(`No.: ${checkNumber || 'N/A'}`, 20, 30);
                        doc.text(`Date: ${checkDate}`, 120, 30);
                        doc.setFontSize(16); doc.text(`Pay to: ${checkEmployee || 'Employee'}`, 20, 42);
                        doc.setFontSize(12); doc.text(`Payee Type: ${checkPayeeType}`, 20, 50);
                        doc.setFontSize(14); doc.text(`Amount: $${amt.toFixed(2)}`, 20, 62);
                        if (checkMemo) doc.text(`Memo: ${checkMemo}`, 20, 72);
                        const pdf = doc.output('dataurlstring');
                        savePDFToArchive('Payroll', 'Company', `check-${checkNumber || Date.now()}`, pdf, { fileName: `Check_${checkNumber || 'N/A'}_${checkEmployee || 'Employee'}.pdf`, path: `Payroll Checks/` });
                        try { pushAdminAlert('pdf_saved', 'Payroll check PDF saved', 'system', { recordType: 'Payroll Checks' }); } catch { }
                        await api('/api/payroll/history', { method: 'POST', body: JSON.stringify({ date: checkDate, type: 'Check', description: checkMemo || checkType, amount: amt, status: 'Paid', employee: checkEmployee }) });
                        try {
                          await upsertExpense({
                            amount: amt,
                            description: (checkMemo && checkMemo.trim().length > 0) ? checkMemo.trim() : `Payroll: ${checkEmployee} (${checkType}, ${checkPayeeType})`,
                            category: 'Payroll',
                            paymentMethod: checkType,
                            createdAt: new Date(checkDate).toISOString(),
                          });
                        } catch { }
                        try {
                          const list = (await localforage.getItem<any[]>('company-employees')) || [];
                          const today = new Date().toISOString().slice(0, 10);
                          const next = list.map((e: any) => e.name === checkEmployee ? { ...e, lastPaid: today } : e);
                          await localforage.setItem('company-employees', next);
                        } catch { }
                        try {
                          const adjRaw = localStorage.getItem('payroll_owed_adjustments') || '{}';
                          const adj = JSON.parse(adjRaw);
                          const key = checkEmployee || 'Employee';
                          adj[key] = Number(adj[key] || 0) + amt;
                          localStorage.setItem('payroll_owed_adjustments', JSON.stringify(adj));
                        } catch { }
                        toast({ title: 'Check Generated', description: 'PDF saved and history updated.' });
                      } catch {
                        toast({ title: 'Error', description: 'Failed to generate check.', variant: 'destructive' });
                      }
                    }}>Generate & Save Check</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Payroll;
