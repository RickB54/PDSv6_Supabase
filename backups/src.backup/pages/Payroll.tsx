import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
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
import { Pencil, Trash2, Save, X } from "lucide-react";

type JobRow = { kind: 'job'; amount: number; description: string; date: string; employee?: string; jobId?: string };
type HoursRow = { kind: 'hours'; name: string; email?: string; hours: number; rate: number; bonus?: number; jobPay?: number };
type CustomRow = { kind: 'custom'; amount: number; paymentType: 'Bonus' | 'Commission' | 'Tip' | 'Reimbursement' | 'Overtime Pay' | 'Holiday Pay' | 'Gift' | 'Advance' | 'Other'; otherReason?: string };
type Row = JobRow | HoursRow | CustomRow;

const defaultRows: Row[] = [
  { kind: 'job', amount: 0, description: '', date: new Date().toISOString().slice(0,10) },
];

const Payroll = () => {
  const [params] = useSearchParams();
  const { toast } = useToast();
  const user = getCurrentUser();
  const [periodStart, setPeriodStart] = useState<string>(new Date().toISOString().slice(0,10));
  const [periodEnd, setPeriodEnd] = useState<string>(new Date().toISOString().slice(0,10));
  const [rows, setRows] = useState<Row[]>(defaultRows);
  const [tab, setTab] = useState<'current'|'history'|'checks'>('current');
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
  const [checkDate, setCheckDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [checkMemo, setCheckMemo] = useState<string>('');
  const [checkType, setCheckType] = useState<'Check' | 'Cash' | 'Direct Deposit'>('Check');
  const [checkPayeeType, setCheckPayeeType] = useState<'Employee' | 'Customer' | 'Other'>('Employee');

  useEffect(() => {
    const load = async () => {
      const list = (await localforage.getItem<any[]>("company-employees")) || [];
      setEmployees(list);
    const jobs = JSON.parse(localStorage.getItem('completedJobs') || '[]');
    setCompletedJobs(jobs);
  };
  load();
}, []);

  // If opened as a clean modal with query params, pre-populate a single row
  useEffect(() => {
    const modal = params.get('modal');
    if (modal !== '1') return;
    const emp = params.get('employee') || '';
    const jobId = params.get('jobId') || '';
    // Try to find the job by jobId, otherwise present a blank job row
    try {
      const job = completedJobs.find((j:any) => String(j.jobId) === String(jobId));
      if (job) {
        const newRow: JobRow = {
          kind: 'job',
          amount: Number(job.totalRevenue || 0),
          description: `${job.service || 'Job'} - ${job.vehicle || ''} - ${job.customer || ''}`,
          date: String(job.finishedAt || new Date().toISOString().slice(0,10)),
          employee: emp || job.employee || '',
          jobId: job.jobId,
        };
        setRows([newRow]);
      } else {
        setRows([{ kind: 'job', amount: 0, description: '', date: new Date().toISOString().slice(0,10), employee: emp || '' }]);
      }
    } catch {
      setRows([{ kind: 'job', amount: 0, description: '', date: new Date().toISOString().slice(0,10), employee: emp || '' }]);
    }
  }, [params, completedJobs]);

  // Overdue employee toasts (7+ days since lastPaid)
  const [overdueToastShown, setOverdueToastShown] = useState(false);
  useEffect(() => {
    if (overdueToastShown) return;
    (async () => {
      try {
        const list = (await localforage.getItem<any[]>('company-employees')) || [];
        const now = Date.now();
        const overdue = list.filter((e:any) => e.lastPaid && (now - new Date(e.lastPaid).getTime()) > 7*24*60*60*1000);
        overdue.slice(0, 3).forEach((e:any) => {
          toast({ title: 'Overdue Employee', description: `${e.name} overdue — pay now`, variant: 'destructive' });
        });
        if (overdue.length > 0) setOverdueToastShown(true);
      } catch {}
    })();
  }, [employees, overdueToastShown]);

  // Weekly Payroll Due alert: period ended and no Paid entries recorded within range
  useEffect(() => {
    const today = new Date();
    const end = new Date(periodEnd);
    if (tab !== 'current') return;
    if (end <= today) {
      const anyPaid = history.some(h => h.status === 'Paid' && new Date(h.date) >= new Date(periodStart) && new Date(h.date) <= new Date(periodEnd));
      if (!anyPaid) {
        try {
          // Avoid duplicate alerts for the same period when revisiting Payroll.
          const existing = getAdminAlerts().some(a =>
            a.type === 'payroll_due' &&
            String(a?.payload?.periodStart || '') === String(periodStart) &&
            String(a?.payload?.periodEnd || '') === String(periodEnd) &&
            String(a?.message || '').includes('Weekly payroll due')
          );
          if (!existing) {
            pushAdminAlert('payroll_due', `Weekly payroll due — no payments logged`, 'system', { periodStart, periodEnd });
          }
        } catch {}
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
  // Removed fixed tax calculations to keep totals flexible and accurate

  const addJobRow = () => setRows(r => [...r, { kind: 'job', amount: 0, description: '', date: new Date().toISOString().slice(0,10) }]);
const addJobRowFromCompleted = (job: any) => {
  try {
    const newRow: JobRow = {
      kind: 'job',
      amount: Number(job.totalRevenue || 0),
      description: `${job.service || 'Job'} - ${job.vehicle || ''} - ${job.customer || ''}`,
      date: String(job.finishedAt || new Date().toISOString().slice(0,10)),
      employee: job.employee || '',
      jobId: job.jobId,
    };
    setRows(prev => [...prev, newRow]);
    const t = toast({
      title: 'Added to Payroll',
      description: 'Row added. You can edit inline or undo.',
      // Yellow-styled toast
      className: 'border-yellow-500 bg-yellow-100 text-yellow-900',
      action: (
        <ToastAction altText="Undo" onClick={() => {
          try {
            setRows(prev => prev.filter(r => !(r.kind === 'job' && (r as JobRow).jobId === job.jobId)));
          } catch {}
        }}>Undo</ToastAction>
      ),
    });
    // Keep toast around longer so undo is possible
    // use-toast already sets a long remove delay; no-op here
  } catch (e) {
    try { toast({ title: 'Error', description: 'Failed to add row.', variant: 'destructive' }); } catch {}
  }
};
  const addRow = () => setRows(r => [...r, { kind: 'hours', name: "New Employee", hours: 0, rate: 15, bonus: 0 }]);
  const addCustomPayment = () => setRows(r => [...r, { kind: 'custom', amount: 0, paymentType: 'Bonus' }]);
  const removeRow = (idx: number) => setRows(r => r.filter((_, i) => i !== idx));

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
      const taxRate = parseFloat(localStorage.getItem('payrollTaxRate') || '0') || 0;
      const taxes = grossPay * (taxRate / 100);
      const netPay = grossPay - taxes;
      doc.text(`Total Gross: $${grossPay.toFixed(2)}`, 20, y);
      y += 6;
      doc.text(`Taxes (${taxRate.toFixed(2)}%): -$${taxes.toFixed(2)}`, 20, y);
      y += 6;
      doc.text(`Net Pay: $${netPay.toFixed(2)}`, 20, y);
      const pdfDataUrl = doc.output('dataurlstring');
      const fileName = `Payroll_${periodStart}_to_${periodEnd}.pdf`;
      // Save into archive under Payroll
      savePDFToArchive('Payroll', 'Company', `payroll-${periodStart}-${periodEnd}`, pdfDataUrl, { fileName });
      // Find the saved PDF id to attach to history entries
      let pdfId: string | undefined;
      try {
        const archive = JSON.parse(localStorage.getItem('pdfArchive') || '[]');
        const latest = [...archive].reverse().find((r: any) => r?.recordType === 'Payroll' && r?.recordId === `payroll-${periodStart}-${periodEnd}`);
        pdfId = latest?.id;
      } catch {}
      try {
        await api('/api/payroll/save', { method: 'POST', body: JSON.stringify({ periodStart, periodEnd, rows }) });
      } catch {}
      // Also record each row to history as Paid
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
        // Mark completed jobs as paid if included
        try {
          const completed = JSON.parse(localStorage.getItem('completedJobs') || '[]');
          const paidIds = entries.filter(e => e.type === 'job' && e.jobId).map(e => e.jobId);
          const next = completed.map((j:any) => paidIds.includes(j.jobId) ? { ...j, paid: true } : j);
          localStorage.setItem('completedJobs', JSON.stringify(next));
          setCompletedJobs(next);
        } catch {}
      } catch {}
      await loadHistory();
      // Update employee lastPaid
      try {
        const paidEmployees: string[] = entries.map((e:any) => e.employee).filter(Boolean);
        if (paidEmployees.length > 0) {
          const list = (await localforage.getItem<any[]>("company-employees")) || [];
          const today = new Date().toISOString().slice(0,10);
          const next = list.map((emp:any) => paidEmployees.includes(emp.name) ? { ...emp, lastPaid: today } : emp);
          await localforage.setItem('company-employees', next);
        }
      } catch {}
      try {
        pushAdminAlert('payroll_due', `Payroll due: $${grossPay.toFixed(2)} for period`, 'system', { amount: grossPay, periodStart, periodEnd, recordType: 'Payroll' });
      } catch {}
      // Generate Admin Update PDF summarizing payments
      try {
        const doc2 = new jsPDF();
        doc2.setFontSize(16); doc2.text('Admin Update: Payments Saved', 20, 20);
        doc2.setFontSize(11); let y2 = 32;
        entries.forEach((e:any) => { doc2.text(`${e.date} — ${e.employee || 'N/A'} — ${e.type} — $${Number(e.amount||0).toFixed(2)}`, 20, y2); y2 += 6; });
        const pdf2 = doc2.output('dataurlstring');
        savePDFToArchive('Admin Updates', 'Company', `payroll-update-${Date.now()}`, pdf2, { fileName: `Admin_Update_Payroll_${periodEnd}.pdf` });
        pushAdminAlert('pdf_saved', 'Payment saved + Admin Update PDF created', 'system', { recordType: 'Admin Updates' });
      } catch {}
      toast({ title: "Saved", description: "Payroll PDF saved to archive." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate payroll PDF.", variant: "destructive" });
    }
  };

  const savePaymentRow = async (idx: number) => {
    try {
      const row = rows[idx];
      await api('/api/payroll/save', { method: 'POST', body: JSON.stringify({ periodStart, periodEnd, row }) });
      // Also append to history as Pending
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
      // Raise a payroll due alert tied to this employee for badge visibility
      try {
        const empName = String(entry.employee || '').trim();
        if (empName) {
          pushAdminAlert('payroll_due', `Payroll pending — ${empName} $${Number(entry.amount||0).toFixed(2)}`,'system', { recordType: 'Payroll', recordId: empName });
        } else {
          pushAdminAlert('payroll_due', `Payroll pending entry saved`, 'system', { recordType: 'Payroll' });
        }
      } catch {}
      // Mark matching completed job as paid if applicable
      if (row.kind === 'job' && (row as JobRow).jobId) {
        try {
          const completed = JSON.parse(localStorage.getItem('completedJobs') || '[]');
          const next = completed.map((j:any) => j.jobId === (row as JobRow).jobId ? { ...j, paid: true } : j);
          localStorage.setItem('completedJobs', JSON.stringify(next));
          setCompletedJobs(next);
        } catch {}
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
    const patch = {
      amount: Number(editDraft.amount || 0),
      type: editDraft.type || '',
      description: editDraft.description || '',
    };
    await api('/api/payroll/history/update', { method: 'POST', body: JSON.stringify({ id: editId, patch }) });
    // Admin Update PDF reflecting edit
    try {
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text('Admin Update: Payroll Entry Edited', 20, 20);
      doc.setFontSize(11); doc.text(`ID: ${editId}`, 20, 32);
      doc.text(`Type: ${patch.type}  Amount: $${patch.amount.toFixed(2)}`, 20, 38);
      doc.text(`Description: ${patch.description}`, 20, 44);
      const pdf = doc.output('dataurlstring');
      savePDFToArchive('Admin Updates', 'Company', `payroll-edit-${editId}`, pdf, { fileName: `Admin_Update_Edit_${editId}.pdf` });
      pushAdminAlert('pdf_saved', 'Payment updated + Admin Update PDF created', 'system', { recordType: 'Admin Updates' });
    } catch {}
    cancelEdit();
    await loadHistory();
    toast({ title: 'Updated', description: 'History entry updated and totals recalculated.' });
  };
  const deleteEntry = async (id: string) => {
    const ok = window.confirm('Delete from history?');
    if (!ok) return;
    await api('/api/payroll/history/delete', { method: 'POST', body: JSON.stringify({ id }) });
    await loadHistory();
    toast({ title: 'Deleted', description: 'Entry removed and totals updated.' });
  };

  const isCleanModal = params.get('modal') === '1';
  if (isCleanModal) {
    const employeeParam = params.get('employee') || '';
    const jobIdParam = params.get('jobId') || '';
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-4 max-w-xl">
          <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Pay Employee</h2>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Employee</div>
              <Input readOnly className="border-red-600 text-white" value={employeeParam} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <Input type="number" step="0.01" className="text-right border-red-600 text-white" value={(rows[0] as JobRow)?.amount || 0}
                    onChange={(e) => setRows(r => { const c=[...r]; const cur=c[0] as JobRow; c[0] = { ...cur, amount: parseFloat(e.target.value) || 0 }; return c; })} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" className="border-red-600 text-white" value={(rows[0] as JobRow)?.date}
                    onChange={(e) => setRows(r => { const c=[...r]; const cur=c[0] as JobRow; c[0] = { ...cur, date: e.target.value }; return c; })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input placeholder="e.g. Job Pay" className="border-red-600 text-white" value={(rows[0] as JobRow)?.description || ''}
                  onChange={(e) => setRows(r => { const c=[...r]; const cur=c[0] as JobRow; c[0] = { ...cur, description: e.target.value }; return c; })} />
              </div>
              <div className="flex gap-2 mt-3">
                <Button className="rounded-lg bg-red-700 hover:bg-red-800" onClick={async () => {
                  await savePaymentRow(0);
                  try {
                    const jr = (rows[0] as JobRow);
                    const emp = String(jr.employee || employeeParam || '').trim();
                    const amt = String(jr.amount || 0);
                    const date = String(jr.date || new Date().toISOString().slice(0,10));
                    const memo = String(jr.description || 'Job Pay');
                    const qs = new URLSearchParams({ modal: 'checks', employee: emp, amount: amt, date, memo }).toString();
                    if (window.opener) { window.opener.location.href = `/payroll?${qs}`; }
                    window.close();
                  } catch {}
                }}>Pay Now</Button>
                <Button className="rounded-lg" variant="outline" onClick={() => { try { window.close(); } catch {} }}>Cancel</Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // Minimal Checks/Cash/Online payment modal view via query params
  const isChecksModal = params.get('modal') === 'checks';
  if (isChecksModal) {
    const empParam = params.get('employee') || '';
    const amtParam = params.get('amount') || '';
    const dateParam = params.get('date') || new Date().toISOString().slice(0,10);
    const memoParam = params.get('memo') || '';
    // Prefill local state
    useEffect(() => {
      setCheckEmployee(empParam);
      setCheckAmount(amtParam);
      setCheckDate(dateParam);
      setCheckMemo(memoParam || 'Payroll Payment');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const saveCheckModal = async () => {
      try {
        const amt = parseFloat(checkAmount || '0') || 0;
        const doc = new jsPDF();
        doc.setFontSize(16); doc.text('Payroll Payment', 20, 20);
        doc.setFontSize(11);
        doc.text(`Employee: ${checkEmployee || 'N/A'}`, 20, 32);
        doc.text(`Date: ${checkDate}`, 20, 38);
        doc.text(`Type: ${checkType}`, 20, 44);
        doc.text(`Amount: $${amt.toFixed(2)}`, 20, 50);
        if (checkMemo) { doc.text(`Memo: ${checkMemo}`, 20, 56); }
        const pdf = doc.output('dataurlstring');
        savePDFToArchive('Payroll', 'Company', `check-${checkNumber || Date.now()}`, pdf, { fileName: `Payroll_${checkType}_${checkEmployee || 'Employee'}.pdf`, path: `Payroll Checks/` });
        // Log as paid
        await api('/api/payroll/history', { method: 'POST', body: JSON.stringify({ date: checkDate, type: checkType, description: checkMemo || checkType, amount: amt, status: 'Paid', employee: checkEmployee }) });
        // Record payroll payment in accounting as an expense
        try {
          await upsertExpense({
            amount: amt,
            description: (checkMemo && checkMemo.trim().length > 0) ? checkMemo.trim() : `Payroll: ${checkEmployee} (${checkType})`,
            category: 'Payroll',
            paymentMethod: checkType,
            createdAt: new Date(checkDate).toISOString(),
          });
        } catch {}
        // Update lastPaid
        try {
          const list = (await localforage.getItem<any[]>("company-employees")) || [];
          const today = new Date().toISOString().slice(0,10);
          const next = list.map((e:any) => e.name === checkEmployee ? { ...e, lastPaid: today } : e);
          await localforage.setItem('company-employees', next);
        } catch {}
        // Clear any payroll_due alert tied to this employee
        try { if (checkEmployee) { dismissAlertsForRecord('Payroll' as any, checkEmployee as any); } } catch {}
        toast({ title: 'Paid', description: 'Payment recorded and archived.' });
        window.location.href = '/payroll';
      } catch {
        toast({ title: 'Error', description: 'Could not save payment.', variant: 'destructive' });
      }
    };

    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-4 max-w-xl">
          <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Finalize Payment</h2>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Payee</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select value={checkPayeeType} onValueChange={(v:any)=>setCheckPayeeType(v)}>
                    <SelectTrigger className="h-8 w-full border-red-700 text-white bg-black">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Employee">Employee</SelectItem>
                      <SelectItem value="Customer">Customer</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input className="border-red-600 text-white" placeholder={`${checkPayeeType} name`} value={checkEmployee} onChange={(e) => setCheckEmployee(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <Input type="number" step="0.01" className="text-right border-red-600 text-white" value={checkAmount} onChange={(e) => setCheckAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" className="border-red-600 text-white" value={checkDate} onChange={(e) => setCheckDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select value={checkType} onValueChange={(v:any) => setCheckType(v)}>
                  <SelectTrigger className="h-8 w-full border-red-700 text-white bg-black">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Check">Check</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Direct Deposit">Direct Deposit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Memo</Label>
                <Input className="border-red-600 text-white" value={checkMemo} onChange={(e) => setCheckMemo(e.target.value)} />
              </div>
              <div className="flex gap-2 mt-3">
                <Button className="rounded-lg bg-red-700 hover:bg-red-800" onClick={saveCheckModal}>Save Payment</Button>
                <Button className="rounded-lg" variant="outline" onClick={() => { window.location.href = '/payroll'; }}>Cancel</Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Payroll" />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          <div className="flex gap-2 mb-2 items-center flex-wrap">
            <Button className={`rounded-lg py-2 px-4 ${tab==='current'? 'bg-red-700 hover:bg-red-800' : ''}`} variant={tab==='current'? 'default':'outline'} onClick={() => setTab('current')}>Current</Button>
            <Button className={`rounded-lg py-2 px-4 ${tab==='history'? 'bg-red-700 hover:bg-red-800' : ''}`} variant={tab==='history'? 'default':'outline'} onClick={() => setTab('history')}>History</Button>
            <Button className={`rounded-lg py-2 px-4 ${tab==='checks'? 'bg-red-700 hover:bg-red-800' : ''}`} variant={tab==='checks'? 'default':'outline'} onClick={() => setTab('checks')}>Write Checks</Button>
            <Button variant="outline" onClick={() => { try { window.location.href = '/reports?tab=employee'; } catch {} }}>Employee Report</Button>
          </div>
          {/* Render tab content using explicit conditional blocks to avoid parser confusion */}
          {tab === 'current' && (
            <> 
            <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Pay Period</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" className="border-red-600 text-white" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" className="border-red-600 text-white" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Total Payroll</Label>
                <Input readOnly className="border-red-600 text-white" value={`$${grossPay.toFixed(2)}`} />
              </div>
            </div>
            </Card>

          {/* Completed Jobs from Service Checklist */}
            <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Completed Jobs (Unpaid)</h2>
            <div className="space-y-3">
              {completedJobs.filter((j:any) => j.status === 'completed' && !j.paid).length === 0 ? (
                <div className="text-sm text-muted-foreground">No unpaid completed jobs.</div>
              ) : (
                completedJobs.filter((j:any) => j.status === 'completed' && !j.paid).map((j:any) => (
                  <div key={j.jobId} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end hover:shadow-md hover:shadow-red-900/20 rounded-lg p-2">
                    <div className="md:col-span-3">
                      <div className="text-sm text-muted-foreground">{j.finishedAt?.slice(0,10)}</div>
                      <div className="font-medium">{j.service} - {j.vehicle}</div>
                      <div className="text-sm">{j.customer}</div>
                    </div>
                    <div className="md:col-span-2 text-right">
                      <div className="text-sm text-muted-foreground">Amount Due</div>
                      <div className="text-lg font-semibold">${Number(j.totalRevenue || 0).toFixed(2)}</div>
                    </div>
                    <div className="md:col-span-1 flex gap-2 justify-end">
                      <Button className="rounded-lg py-2 px-4 bg-red-700 hover:bg-red-800" onClick={() => addJobRowFromCompleted(j)}>Add to Payroll</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Job Pay, Hours & Custom Payments</h2>
            <div className="space-y-3">
              {rows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end hover:shadow hover:shadow-red-900/20 rounded-lg p-2">
                  {row.kind === 'job' ? (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Job Pay ($)</Label>
                        <Input type="number" step="0.01" className="text-right border-red-600 text-white" value={(row as JobRow).amount || 0}
                          onChange={(e) => setRows(r => { const c=[...r]; const cur=c[idx] as JobRow; c[idx] = { ...cur, amount: parseFloat(e.target.value) || 0 }; return c; })} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Job Description</Label>
                        <Input placeholder="e.g. Full Detail - Black SUV" className="border-red-600 text-white" value={(row as JobRow).description || ''}
                          onChange={(e) => setRows(r => { const c=[...r]; const cur=c[idx] as JobRow; c[idx] = { ...cur, description: e.target.value }; return c; })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" className="border-red-600 text-white" value={(row as JobRow).date}
                          onChange={(e) => setRows(r => { const c=[...r]; const cur=c[idx] as JobRow; c[idx] = { ...cur, date: e.target.value }; return c; })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Assign Employee</Label>
                        <Select value={(row as JobRow).employee || ''}
                          onValueChange={(email) => setRows(r => { const c=[...r]; const cur=c[idx] as JobRow; c[idx] = { ...cur, employee: email }; return c; })}>
                          <SelectTrigger className="h-8 w-full border-red-700 text-white bg-black">
                            <SelectValue placeholder="Select employee (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map(emp => (
                              <SelectItem key={emp.email} value={emp.name}>{emp.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        <Button size="sm" className="rounded-lg bg-red-700 hover:bg-red-800" onClick={() => savePaymentRow(idx)}>Save Payment</Button>
                        <Button size="sm" className="rounded-lg" variant="outline" onClick={() => removeRow(idx)}>Remove</Button>
                      </div>
                    </>
                  ) : row.kind === 'hours' ? (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Employee</Label>
                        <Input className="border-red-600 text-white" value={(row as HoursRow).name} onChange={(e) => setRows(r => { const c=[...r]; const cur=c[idx] as HoursRow; c[idx] = { ...cur, name: e.target.value }; return c; })} />
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Load from employees</Label>
                          <Select onValueChange={(email) => {
                            const emp = employees.find(e => e.email === email);
                            if (!emp) return;
                            let jobPay = 0;
                            if (emp.paymentByJob) {
                              const start = new Date(periodStart);
                              const end = new Date(periodEnd);
                              const jobs = completedJobs.filter(j => j.employee === email && new Date(j.finishedAt) >= new Date(start.setHours(0,0,0,0)) && new Date(j.finishedAt) <= new Date(end.setHours(23,59,59,999)));
                              const rates = emp.jobRates || {};
                              jobPay = jobs.reduce((acc: number, j: any) => {
                                const servicePay = rates[j.service || ''] || 0;
                                const addOnPay = (Array.isArray(j.addOns) ? j.addOns : []).reduce((s: number, name: string) => s + (rates[name] || 0), 0);
                                return acc + servicePay + addOnPay;
                              }, 0);
                            }
                            setRows(r => { const c=[...r]; const cur=c[idx] as HoursRow; c[idx] = { ...cur, name: emp.name, email, rate: emp.flatRate || cur.rate, bonus: emp.bonuses || 0, jobPay }; return c; });
                          }}>
                            <SelectTrigger className="h-8 w-full border-red-700 text-white bg-black">
                              <SelectValue placeholder="Select saved employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map(emp => (
                                <SelectItem key={emp.email} value={emp.email}>{emp.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Hours</Label>
                        <Input type="number" className="border-red-600 text-white" value={(row as HoursRow).hours} onChange={(e) => setRows(r => { const c=[...r]; const cur=c[idx] as HoursRow; c[idx] = { ...cur, hours: parseFloat(e.target.value) || 0 }; return c; })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Rate ($/hr)</Label>
                        <Input type="number" className="border-red-600 text-white" value={(row as HoursRow).rate} onChange={(e) => setRows(r => { const c=[...r]; const cur=c[idx] as HoursRow; c[idx] = { ...cur, rate: parseFloat(e.target.value) || 0 }; return c; })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Bonus</Label>
                        <Input type="number" className="border-red-600 text-white" value={(row as HoursRow).bonus || 0} onChange={(e) => setRows(r => { const c=[...r]; const cur=c[idx] as HoursRow; c[idx] = { ...cur, bonus: parseFloat(e.target.value) || 0 }; return c; })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Job Pay</Label>
                        <Input type="number" step="0.01" className="border-red-600 text-white" value={(row as HoursRow).jobPay || 0} onChange={(e) => setRows(r => { const c=[...r]; const cur=c[idx] as HoursRow; c[idx] = { ...cur, jobPay: parseFloat(e.target.value) || 0 }; return c; })} />
                      </div>
                      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        <Button size="sm" className="rounded-lg bg-red-700 hover:bg-red-800" onClick={() => savePaymentRow(idx)}>Save Payment</Button>
                        <Button size="sm" className="rounded-lg" variant="outline" onClick={() => removeRow(idx)}>Remove</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Custom Payment</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Amount ($)</span>
                          <Input type="number" step="0.01" className="text-right border-red-600 text-white" value={(row as CustomRow).amount}
                            onChange={(e) => setRows(r => { const c=[...r]; const cur=c[idx] as CustomRow; c[idx] = { ...cur, amount: parseFloat(e.target.value) || 0 }; return c; })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Type</Label>
                        <Select value={(row as CustomRow).paymentType}
                          onValueChange={(val) => setRows(r => { const c=[...r]; const cur=c[idx] as CustomRow; c[idx] = { ...cur, paymentType: val as CustomRow['paymentType'] }; return c; })}>
                          <SelectTrigger className="h-8 w-full border-red-700 text-white bg-black">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {['Bonus','Commission','Tip','Reimbursement','Overtime Pay','Holiday Pay','Gift','Advance','Other','Check'].map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {(row as CustomRow).paymentType === 'Other' && (
                        <div className="space-y-2">
                          <Label>Reason</Label>
                          <Input placeholder="e.g. Tools" className="border-red-600 text-white" value={(row as CustomRow).otherReason || ''}
                            onChange={(e) => setRows(r => { const c=[...r]; const cur=c[idx] as CustomRow; c[idx] = { ...cur, otherReason: e.target.value }; return c; })} />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button className="rounded-lg py-2 px-4 bg-red-700 hover:bg-red-800" onClick={() => savePaymentRow(idx)}>Save Payment</Button>
                        <Button className="rounded-lg py-2 px-4" variant="outline" onClick={() => removeRow(idx)}>Remove</Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <Button size="sm" className="rounded-lg bg-red-700 hover:bg-red-800" onClick={addJobRow}>Add Job Pay Row</Button>
                <Button size="sm" className="rounded-lg" variant="outline" onClick={addRow}>Add Hours Row</Button>
                <Button size="sm" className="rounded-lg bg-red-700 hover:bg-red-800" onClick={addCustomPayment}>Add Custom Payment</Button>
                <Button size="sm" className="rounded-lg bg-red-700 hover:bg-red-800" onClick={savePayStub}>Pay Now</Button>
                <Button size="sm" className="rounded-lg bg-gradient-hero" onClick={savePayStub}>Save Payroll PDF</Button>
              </div>
              <div className="mt-4 p-4 border border-border rounded-md bg-black text-white max-w-md">
                <div className="flex justify-between font-semibold"><span>Total Payroll:</span><span>${grossPay.toFixed(2)}</span></div>
              </div>
            </div>
            </Card>
            </>
          )}
          {tab === 'history' && (
            <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Payroll History</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
              <div className="space-y-1">
                <Label>Employee</Label>
                <Select value={draftEmployee || ''} onValueChange={(v)=>setDraftEmployee(v === 'ALL' ? '' : v)}>
                  <SelectTrigger className="h-8 w-full border-red-700 text-white bg-black">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.email} value={emp.name}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={draftType || ''} onValueChange={(v)=>setDraftType(v === 'ALL' ? '' : v)}>
                  <SelectTrigger className="h-8 w-full border-red-700 text-white bg-black">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    {['job','hours','custom','Bonus','Commission','Tip','Reimbursement','Overtime Pay','Holiday Pay','Gift','Advance','Other','Check'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Start</Label>
                <Input type="date" className="border-red-600 text-white" value={draftStart} onChange={(e)=>setDraftStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>End</Label>
                <Input type="date" className="border-red-600 text-white" value={draftEnd} onChange={(e)=>setDraftEnd(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Search</Label>
                <Input placeholder="Search description/type" className="border-red-600 text-white" value={draftSearch} onChange={(e)=>setDraftSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <Button className="rounded-lg py-2 px-4 bg-red-700 hover:bg-red-800" onClick={applyFilters}>Apply Filters</Button>
              <Button className="rounded-lg py-2 px-4 bg-red-700 hover:bg-red-800" variant="outline" onClick={clearFilters}>Clear Filters</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-3 py-2 border-b">Date</th>
                    <th className="px-3 py-2 border-b">Employee</th>
                    <th className="px-3 py-2 border-b">Type</th>
                    <th className="px-3 py-2 border-b">Description</th>
                    <th className="px-3 py-2 border-b">Amount</th>
                    <th className="px-3 py-2 border-b">Status</th>
                    <th className="px-3 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-background/50 hover:shadow hover:shadow-red-900/20 cursor-pointer" onClick={() => {
                      try {
                        if (!h.pdfId) return;
                        const archive = JSON.parse(localStorage.getItem('pdfArchive') || '[]');
                        const rec = archive.find((r:any) => r?.id === h.pdfId);
                        if (rec?.pdfData) window.open(rec.pdfData, '_blank');
                      } catch {}
                    }}>
                      <td className="px-3 py-2 border-b">{h.date}</td>
                      <td className="px-3 py-2 border-b">{h.employee || ''}</td>
                      <td className="px-3 py-2 border-b capitalize">{editId===h.id ? (
                        <Input className="h-8 border-red-600 text-white" value={editDraft?.type || ''} onChange={(e)=>setEditDraft(d=>({ ...(d||{}), type: e.target.value }))} />
                      ) : h.type}</td>
                      <td className="px-3 py-2 border-b">{editId===h.id ? (
                        <Input className="h-8 border-red-600 text-white" value={editDraft?.description || ''} onChange={(e)=>setEditDraft(d=>({ ...(d||{}), description: e.target.value }))} />
                      ) : (h.description || '')}</td>
                      <td className="px-3 py-2 border-b">{editId===h.id ? (
                        <Input className="h-8 border-red-600 text-white" type="number" value={editDraft?.amount || ''} onChange={(e)=>setEditDraft(d=>({ ...(d||{}), amount: e.target.value }))} />
                      ) : `$${Number(h.amount || 0).toFixed(2)}`}</td>
                      <td className="px-3 py-2 border-b">{h.status}</td>
                      <td className="px-3 py-2 border-b">
                        {editId===h.id ? (
                          <div className="flex items-center gap-2">
                            <Button className="rounded-lg py-2 px-4 bg-red-700 hover:bg-red-800" onClick={(e)=>{ e.stopPropagation(); saveEdit(); }}><Save className="w-4 h-4" /></Button>
                            <Button className="rounded-lg py-2 px-4" variant="outline" onClick={(e)=>{ e.stopPropagation(); cancelEdit(); }}><X className="w-4 h-4" /></Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button className="rounded-lg py-2 px-4" variant="outline" onClick={(e)=>{ e.stopPropagation(); startEdit(h); }}><Pencil className="w-4 h-4" /></Button>
                            <Button className="rounded-lg py-2 px-4 bg-red-700 hover:bg-red-800" onClick={(e)=>{ e.stopPropagation(); deleteEntry(h.id); }}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr><td className="px-3 py-4 text-muted-foreground" colSpan={7}>No history found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            </Card>
          )}
          {tab === 'checks' && (
            // Write Checks Tab
            <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Write Checks</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={checkEmployee} onValueChange={(v)=>setCheckEmployee(v)}>
                  <SelectTrigger className="h-8 w-full border-red-700 text-white bg-black">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.email} value={emp.name}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payee Type</Label>
                <Select value={checkPayeeType} onValueChange={(v)=>setCheckPayeeType(v as any)}>
                  <SelectTrigger className="h-8 w-full border-red-700 text-white bg-black">
                    <SelectValue placeholder="Select payee type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Employee">Employee</SelectItem>
                    <SelectItem value="Customer">Customer</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Check Amount ($)</Label>
                <Input className="border-red-600 text-white" type="number" step="0.01" value={checkAmount} onChange={(e)=>setCheckAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Check Number</Label>
                <Input className="border-red-600 text-white" value={checkNumber} onChange={(e)=>setCheckNumber(e.target.value)} placeholder="001" />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input className="border-red-600 text-white" type="date" value={checkDate} onChange={(e)=>setCheckDate(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Memo</Label>
                <Input className="border-red-600 text-white" placeholder="e.g. November Pay" value={checkMemo} onChange={(e)=>setCheckMemo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select value={checkType} onValueChange={(v)=>setCheckType(v as any)}>
                  <SelectTrigger className="h-8 w-full border-red-700 text-white bg-black">
                    <SelectValue placeholder="Check" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Check','Cash','Direct Deposit'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="rounded-lg py-2 px-4 bg-red-700 hover:bg-red-800" onClick={async ()=>{
                try {
                  const amt = Number(checkAmount || 0);
                  const doc = new jsPDF();
                  doc.setTextColor(200,0,0);
                  doc.setFontSize(18); doc.text('Company Check', 20, 20);
                  doc.setTextColor(0,0,0);
                  doc.setFontSize(12); doc.text(`No.: ${checkNumber || 'N/A'}`, 20, 30);
                  doc.text(`Date: ${checkDate}`, 120, 30);
                  doc.setFontSize(16); doc.text(`Pay to: ${checkEmployee || 'Employee'}`, 20, 42);
                  doc.setFontSize(12); doc.text(`Payee Type: ${checkPayeeType}`, 20, 50);
                  doc.setFontSize(14); doc.text(`Amount: $${amt.toFixed(2)}`, 20, 62);
                  if (checkMemo) doc.text(`Memo: ${checkMemo}`, 20, 72);
                  const pdf = doc.output('dataurlstring');
                  savePDFToArchive('Payroll', 'Company', `check-${checkNumber || Date.now()}`, pdf, { fileName: `Check_${checkNumber || 'N/A'}_${checkEmployee || 'Employee'}.pdf`, path: `Payroll Checks/` });
                  try { pushAdminAlert('pdf_saved', 'Payroll check PDF saved', 'system', { recordType: 'Payroll Checks' }); } catch {}
                  // Log to history as paid
                  await api('/api/payroll/history', { method: 'POST', body: JSON.stringify({ date: checkDate, type: 'Check', description: checkMemo || checkType, amount: amt, status: 'Paid', employee: checkEmployee }) });
                  // Record payroll payment in accounting as an expense
                  try {
                    await upsertExpense({
                      amount: amt,
                      description: (checkMemo && checkMemo.trim().length > 0) ? checkMemo.trim() : `Payroll: ${checkEmployee} (${checkType}, ${checkPayeeType})`,
                      category: 'Payroll',
                      paymentMethod: checkType,
                      createdAt: new Date(checkDate).toISOString(),
                    });
                  } catch {}
                  // Update Last Paid
                  try {
                    const list = (await localforage.getItem<any[]>('company-employees')) || [];
                    const today = new Date().toISOString().slice(0,10);
                    const next = list.map((e:any) => e.name === checkEmployee ? { ...e, lastPaid: today } : e);
                    await localforage.setItem('company-employees', next);
                  } catch {}
                  // Reduce owed balance via adjustments
                  try {
                    const adjRaw = localStorage.getItem('payroll_owed_adjustments') || '{}';
                    const adj = JSON.parse(adjRaw);
                    const key = checkEmployee || 'Employee';
                    adj[key] = Number(adj[key] || 0) + amt;
                    localStorage.setItem('payroll_owed_adjustments', JSON.stringify(adj));
                  } catch {}
                  toast({ title: 'Check Generated', description: 'PDF saved and history updated.' });
                } catch {
                  toast({ title: 'Error', description: 'Failed to generate check.', variant: 'destructive' });
                }
              }}>Generate Check</Button>
            </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Payroll;
