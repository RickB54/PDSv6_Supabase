import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { upsertExpense } from "@/lib/db";
import { getSupabasePayrollRecords, markPayrollPaid, updatePayrollRecord, deletePayrollRecord } from "@/lib/supa-data";
import {
  Wallet, Clock, DollarSign, CheckCircle, ArrowRight, User, Trophy, Award, TrendingUp, Briefcase, BadgeDollarSign, Zap, Edit2, Trash2
} from "lucide-react";
import { useDemoMode } from "@/contexts/DemoContext";
import { PaymentWorkflowHelp } from "@/components/help/PaymentWorkflowHelp";
import { cn } from "@/lib/utils";

export default function Payroll() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();

  const [tab, setTab] = useState<'pending' | 'history' | 'dashboard'>('pending');
  const [pendingRecords, setPendingRecords] = useState<any[]>([]);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit dialog state
  const [editRecord, setEditRecord] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCommission, setEditCommission] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editEmployee, setEditEmployee] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { load(); }, [tab, isDemoMode]);

  const load = async () => {
    setIsLoading(true);
    try {
      const pending = await getSupabasePayrollRecords('pending');
      setPendingRecords(pending);
      setSelectedIds(pending.map(r => r.id));
      const history = await getSupabasePayrollRecords('paid');
      setHistoryRecords(history);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const groupedPending = pendingRecords.reduce((acc, curr) => {
    if (!acc[curr.employee_name]) acc[curr.employee_name] = [];
    acc[curr.employee_name].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  const selectedTotal = pendingRecords
    .filter(r => selectedIds.includes(r.id))
    .reduce((sum, r) => sum + Number(r.earned_amount || 0), 0);

  const handleToggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const openEdit = (record: any) => {
    setEditRecord(record);
    setEditAmount(String(record.earned_amount ?? ""));
    setEditCommission(String(record.commission_percent ?? ""));
    setEditTitle(record.booking_title ?? "");
    setEditEmployee(record.employee_name ?? "");
    setEditNotes(record.notes ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editRecord) return;
    setIsSaving(true);
    try {
      await updatePayrollRecord(editRecord.id, {
        earned_amount: parseFloat(editAmount) || 0,
        commission_percent: parseFloat(editCommission) || 0,
        booking_title: editTitle,
        employee_name: editEmployee,
        notes: editNotes,
      });
      toast({ title: "Record Updated", description: "Payroll record saved successfully." });
      setEditRecord(null);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePayrollRecord(deleteId);
      toast({ title: "Record Deleted", description: "Payroll record removed." });
      setDeleteId(null);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to delete record.", variant: "destructive" });
    }
  };

  const handleProcessPayRun = async () => {
    const recordsToPay = pendingRecords.filter(r => selectedIds.includes(r.id));
    if (recordsToPay.length === 0) { toast({ title: "No records selected", variant: "destructive" }); return; }
    try {
      const byEmployee = recordsToPay.reduce((acc, curr) => {
        if (!acc[curr.employee_name]) acc[curr.employee_name] = [];
        acc[curr.employee_name].push(curr);
        return acc;
      }, {} as Record<string, any[]>);
      for (const [empName, records] of Object.entries(byEmployee)) {
        const totalAmount = records.reduce((sum, r) => sum + Number(r.earned_amount), 0);
        const expense = await upsertExpense({
          amount: totalAmount,
          description: `Payroll Run: ${records.length} jobs completed`,
          category: 'Payroll',
          payee: empName,
          createdAt: new Date().toISOString()
        } as any);
        for (const record of records) { await markPayrollPaid(record.id, expense.id); }
      }
      toast({ title: "Pay Run Processed", description: `Paid $${selectedTotal.toFixed(2)} to ${Object.keys(byEmployee).length} employees.` });
      load();
    } catch {
      toast({ title: "Error processing pay run", variant: "destructive" });
    }
  };

  const RecordRow = ({ record, showStatus = false }: { record: any; showStatus?: boolean }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800 hover:bg-zinc-800/40 transition-colors group">
      {!showStatus && (
        <Checkbox
          checked={selectedIds.includes(record.id)}
          onCheckedChange={() => handleToggle(record.id)}
          className="border-zinc-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 shrink-0"
        />
      )}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 items-center min-w-0">
        <div className="md:col-span-2">
          <p className="text-sm font-bold text-white truncate">{record.booking_title || '—'}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {showStatus ? record.employee_name + ' · ' : ''}
            {new Date(record.paid_at || record.created_at).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-0.5">Job Revenue</p>
          <p className="text-sm text-zinc-300">${Number(record.job_price || 0).toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-0.5">
            Earned {record.commission_percent ? `(${record.commission_percent}%)` : ''}
          </p>
          <p className="text-sm font-bold text-emerald-400">${Number(record.earned_amount).toFixed(2)}</p>
        </div>
      </div>
      {/* Action buttons */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10"
          onClick={() => openEdit(record)}
          title="Edit record"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
          onClick={() => setDeleteId(record.id)}
          title="Delete record"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Payroll Engine" />
      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">

        <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-indigo-500/5 rotate-12 transform scale-150 pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-indigo-500/20 text-indigo-400"><DollarSign className="h-8 w-8" /></div>
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  Unified Payroll Engine <PaymentWorkflowHelp variant="payroll-engine" />
                </h2>
                <p className="text-zinc-400 text-sm">Full control — edit, delete, and process employee payouts</p>
              </div>
            </div>
            <div className="flex gap-4 sm:gap-8 items-center flex-wrap justify-end">
              <div className="text-center">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Pending Total</p>
                <p className="text-3xl font-bold text-indigo-400 mt-1">${selectedTotal.toFixed(2)}</p>
              </div>
              <div className="pl-4 sm:pl-8 border-l border-zinc-700">
                <Button variant="outline" size="sm" className="bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 font-black uppercase tracking-widest text-[10px]" onClick={() => navigate('/payments')}>
                  All Payments <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Tab Nav */}
        <div className="flex flex-wrap gap-2 p-1 bg-zinc-900/50 rounded-full border border-zinc-800 w-fit">
          {(['pending', 'history', 'dashboard'] as const).map(t => (
            <Button key={t} variant={tab === t ? "default" : "ghost"}
              className={`rounded-full px-6 ${tab === t ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
              onClick={() => setTab(t)}>
              {t === 'pending' && <><Wallet className="h-4 w-4 mr-2" />Pending Pay Run</>}
              {t === 'history' && <><Clock className="h-4 w-4 mr-2" />Payout History</>}
              {t === 'dashboard' && <><User className="h-4 w-4 mr-2" />Performance Dashboard</>}
            </Button>
          ))}
        </div>

        {/* PENDING TAB */}
        {tab === 'pending' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {Object.keys(groupedPending).length === 0 && !isLoading && (
              <Card className="p-12 text-center bg-zinc-900 border-zinc-800">
                <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white">All caught up!</h3>
                <p className="text-zinc-400 mt-2">No pending earnings. Hover any row to edit or delete it.</p>
              </Card>
            )}
            {(Object.entries(groupedPending) as [string, any[]][]).map(([empName, records]) => {
              const empSelectedTotal = records.filter(r => selectedIds.includes(r.id)).reduce((sum, r) => sum + Number(r.earned_amount), 0);
              return (
                <Card key={empName} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                  <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/20 rounded-full text-indigo-400"><User className="h-5 w-5" /></div>
                      <div>
                        <h3 className="font-bold text-white text-lg">{empName}</h3>
                        <p className="text-xs text-zinc-400">{records.length} pending jobs · hover rows to edit/delete</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Selected Payout</p>
                      <p className="text-xl font-black text-emerald-400">${empSelectedTotal.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {records.map(record => <RecordRow key={record.id} record={record} />)}
                  </div>
                </Card>
              );
            })}
            {Object.keys(groupedPending).length > 0 && (
              <div className="sticky bottom-4 z-20 mt-8">
                <Card className="bg-zinc-950 border-indigo-500/30 shadow-2xl shadow-indigo-900/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-zinc-400">Total Selected for Processing</p>
                    <p className="text-2xl font-black text-white">${selectedTotal.toFixed(2)}</p>
                  </div>
                  <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold" onClick={handleProcessPayRun}>
                    <CheckCircle className="h-5 w-5 mr-2" /> Process Pay Run & Add to Ledger
                  </Button>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2"><Clock className="h-4 w-4 text-indigo-400" /> Payout History</h3>
              <p className="text-xs text-zinc-500">Hover any row to edit or delete</p>
            </div>
            <div className="p-4 space-y-3">
              {historyRecords.length === 0 && !isLoading && (
                <p className="text-center text-zinc-500 py-8">No payment history found.</p>
              )}
              {historyRecords.map(record => <RecordRow key={record.id} record={record} showStatus />)}
            </div>
          </Card>
        )}

        {/* DASHBOARD TAB */}
        {tab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-12">
            {historyRecords.length === 0 ? (
              <Card className="p-12 text-center bg-zinc-900 border-zinc-800">
                <User className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white">No Performance Data</h3>
                <p className="text-zinc-400 mt-2">Process pay runs to generate employee performance metrics.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(() => {
                  const statsByEmployee = historyRecords.reduce((acc, curr) => {
                    if (!acc[curr.employee_name]) acc[curr.employee_name] = { totalPaid: 0, jobsCompleted: 0, highestPayout: 0 };
                    acc[curr.employee_name].totalPaid += Number(curr.earned_amount || 0);
                    acc[curr.employee_name].jobsCompleted += 1;
                    if (Number(curr.earned_amount) > acc[curr.employee_name].highestPayout) {
                      acc[curr.employee_name].highestPayout = Number(curr.earned_amount);
                    }
                    return acc;
                  }, {} as Record<string, { totalPaid: number; jobsCompleted: number; highestPayout: number }>);

                  const sorted = (Object.entries(statsByEmployee) as [string, any][]).sort((a, b) => b[1].totalPaid - a[1].totalPaid);
                  return sorted.map(([empName, stats], index) => {
                    const isTop = index === 0;
                    const avgJobPayout = stats.totalPaid / stats.jobsCompleted;
                    const estHourly = stats.totalPaid / (stats.jobsCompleted * 3.5);
                    return (
                      <Card key={empName} className={cn("bg-zinc-900 border-zinc-800 relative overflow-hidden", isTop && "border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.15)]")}>
                        {isTop && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl z-10 flex items-center gap-1"><Trophy className="h-3 w-3" /> Employee of the Month</div>}
                        <CardHeader className="pb-3 border-b border-zinc-800/50 relative z-10">
                          <CardTitle className="text-xl text-white flex items-center gap-3">
                            <div className={cn("p-2.5 rounded-xl", isTop ? "bg-indigo-500/20 text-indigo-400" : "bg-zinc-800 text-zinc-400")}>
                              {isTop ? <Award className="h-5 w-5" /> : <User className="h-5 w-5" />}
                            </div>
                            <div>
                              <div className="font-black tracking-tight">{empName}</div>
                              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mt-0.5">Rank #{index + 1}</div>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-5 space-y-5 relative z-10">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
                              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1 flex items-center gap-1"><DollarSign className="h-3 w-3 text-emerald-500" /> Total Earnings</p>
                              <p className="text-2xl font-black text-emerald-400">${stats.totalPaid.toFixed(2)}</p>
                            </div>
                            <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
                              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1 flex items-center gap-1"><Briefcase className="h-3 w-3 text-blue-500" /> Jobs Done</p>
                              <p className="text-2xl font-black text-white">{stats.jobsCompleted}</p>
                            </div>
                          </div>
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/30">
                              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><BadgeDollarSign className="h-4 w-4 text-zinc-500" /> Highest Payout</span>
                              <span className="text-sm font-black text-emerald-400">${stats.highestPayout.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/30">
                              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><TrendingUp className="h-4 w-4 text-zinc-500" /> Avg Job Payout</span>
                              <span className="text-sm font-black text-white">${avgJobPayout.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/30">
                              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><Zap className="h-4 w-4 text-zinc-500" /> Est. Hourly Rate</span>
                              <span className="text-sm font-black text-blue-400">~${estHourly.toFixed(2)}/hr</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}
      </main>

      {/* EDIT DIALOG */}
      <Dialog open={!!editRecord} onOpenChange={open => !open && setEditRecord(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit2 className="h-5 w-5 text-indigo-400" /> Edit Payroll Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Employee Name</Label>
                <Input value={editEmployee} onChange={e => setEditEmployee(e.target.value)} className="bg-zinc-950 border-zinc-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Job / Booking Title</Label>
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-zinc-950 border-zinc-700 text-white mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Amount Earned ($)</Label>
                <Input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="bg-zinc-950 border-zinc-700 text-white mt-1 text-lg font-bold font-mono" />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Commission %</Label>
                <Input type="number" step="0.1" value={editCommission} onChange={e => setEditCommission(e.target.value)} className="bg-zinc-950 border-zinc-700 text-white mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Notes (optional)</Label>
              <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="e.g. Adjustment reason..." className="bg-zinc-950 border-zinc-700 text-white mt-1" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditRecord(null)} className="text-zinc-400">Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payroll Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently remove this payroll entry. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
