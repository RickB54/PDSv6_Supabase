import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { upsertExpense } from "@/lib/db";
import { getSupabasePayrollRecords, markPayrollPaid } from "@/lib/supa-data";
import {
  Wallet, Clock, DollarSign, CheckCircle, ArrowRight, User
} from "lucide-react";
import { useDemoMode } from "@/contexts/DemoContext";
import HelpModal from "@/components/help/HelpModal";

export default function Payroll() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();

  const [tab, setTab] = useState<'pending' | 'history' | 'dashboard'>('pending');
  const [pendingRecords, setPendingRecords] = useState<any[]>([]);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    load();
  }, [tab, isDemoMode]);

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

  // Group pending by employee
  const groupedPending = pendingRecords.reduce((acc, curr) => {
    if (!acc[curr.employee_name]) acc[curr.employee_name] = [];
    acc[curr.employee_name].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  const selectedTotal = pendingRecords
    .filter(r => selectedIds.includes(r.id))
    .reduce((sum, r) => sum + Number(r.earned_amount || 0), 0);

  const handleToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleProcessPayRun = async () => {
    const recordsToPay = pendingRecords.filter(r => selectedIds.includes(r.id));
    if (recordsToPay.length === 0) {
       toast({ title: "No records selected", variant: "destructive" });
       return;
    }

    try {
      // Group by employee to create one expense per employee
      const byEmployee = recordsToPay.reduce((acc, curr) => {
        if (!acc[curr.employee_name]) acc[curr.employee_name] = [];
        acc[curr.employee_name].push(curr);
        return acc;
      }, {} as Record<string, any[]>);

      for (const [empName, records] of Object.entries(byEmployee)) {
        const totalAmount = records.reduce((sum, r) => sum + Number(r.earned_amount), 0);
        
        // 1. Create expense
        const expense = await upsertExpense({
            amount: totalAmount,
            description: `Payroll Run: ${records.length} jobs completed`,
            category: 'Payroll',
            payee: empName,
            createdAt: new Date().toISOString()
        } as any);

        // 2. Mark records as paid
        for (const record of records) {
          await markPayrollPaid(record.id, expense.id);
        }
      }

      toast({ title: "Pay Run Processed", description: `Paid $${selectedTotal.toFixed(2)} to ${Object.keys(byEmployee).length} employees.` });
      
      // Reload
      load();
    } catch (err) {
      toast({ title: "Error processing pay run", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Payroll Engine" />
      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">

        {/* Stats Card */}
        <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-indigo-500/5 rotate-12 transform scale-150 pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-indigo-500/20 text-indigo-400">
                <DollarSign className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  Unified Payroll Engine
                  <HelpModal
                    title="Pay Run System"
                    description="The Payroll Engine automatically calculates employee earnings based on completed jobs."
                    items={[
                      { title: 'Job Completion', content: 'When a job is marked Done, earnings are calculated (Price - Stripe - Materials = Labor Revenue * Tier %)' },
                      { title: 'Processing', content: 'Select pending jobs and click Process Pay Run to log them as official business expenses in the accounting ledger.' }
                    ]}
                  />
                </h2>
                <p className="text-zinc-400 text-sm">Automated payout calculations and ledger integration</p>
              </div>
            </div>

            <div className="flex gap-4 sm:gap-8 items-center flex-wrap justify-end">
              <div className="text-center">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Pending Total</p>
                <p className="text-3xl font-bold text-indigo-400 mt-1">${selectedTotal.toFixed(2)}</p>
              </div>
              <div className="pl-4 sm:pl-8 mt-2 sm:mt-0 w-full sm:w-auto border-l border-zinc-700">
                  <Button variant="outline" size="sm" className="bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 w-full font-black uppercase tracking-widest text-[10px]" onClick={() => navigate('/payments')}>
                    All Payments <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Tab Nav */}
        <div className="flex flex-wrap gap-2 p-1 bg-zinc-900/50 rounded-full border border-zinc-800 w-fit">
          <Button
            variant={tab === 'pending' ? "default" : "ghost"}
            className={`rounded-full px-6 ${tab === 'pending' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            onClick={() => setTab('pending')}
          >
            <Wallet className="h-4 w-4 mr-2" /> Pending Pay Run
          </Button>
          <Button
            variant={tab === 'history' ? "default" : "ghost"}
            className={`rounded-full px-6 ${tab === 'history' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            onClick={() => setTab('history')}
          >
            <Clock className="h-4 w-4 mr-2" /> Payout History
          </Button>
          <Button
            variant={tab === 'dashboard' ? "default" : "ghost"}
            className={`rounded-full px-6 ${tab === 'dashboard' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            onClick={() => setTab('dashboard')}
          >
            <User className="h-4 w-4 mr-2" /> Performance Dashboard
          </Button>
        </div>

        {tab === 'pending' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {Object.keys(groupedPending).length === 0 && !isLoading && (
               <Card className="p-12 text-center bg-zinc-900 border-zinc-800">
                  <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white">All caught up!</h3>
                  <p className="text-zinc-400 mt-2">There are no pending job earnings to process.</p>
               </Card>
            )}

            {Object.entries(groupedPending).map(([empName, records]) => {
               const empTotal = records.reduce((sum, r) => sum + Number(r.earned_amount), 0);
               const empSelectedTotal = records.filter(r => selectedIds.includes(r.id)).reduce((sum, r) => sum + Number(r.earned_amount), 0);
               
               return (
                 <Card key={empName} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                   <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex justify-between items-center">
                     <div className="flex items-center gap-3">
                       <div className="p-2 bg-indigo-500/20 rounded-full text-indigo-400">
                         <User className="h-5 w-5" />
                       </div>
                       <div>
                         <h3 className="font-bold text-white text-lg">{empName}</h3>
                         <p className="text-xs text-zinc-400">{records.length} pending jobs</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Selected Payout</p>
                       <p className="text-xl font-black text-emerald-400">${empSelectedTotal.toFixed(2)}</p>
                     </div>
                   </div>
                   
                   <div className="p-4 space-y-3">
                     {records.map(record => (
                       <div key={record.id} className="flex items-center gap-4 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                         <Checkbox 
                           checked={selectedIds.includes(record.id)} 
                           onCheckedChange={() => handleToggle(record.id)}
                           className="border-zinc-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                         />
                         <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                           <div className="md:col-span-2">
                             <p className="text-sm font-bold text-white truncate">{record.booking_title}</p>
                             <p className="text-xs text-zinc-500 mt-1">{new Date(record.created_at).toLocaleDateString()}</p>
                           </div>
                           <div>
                             <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Job Revenue</p>
                             <p className="text-sm text-zinc-300">${Number(record.job_price).toFixed(2)}</p>
                           </div>
                           <div className="text-right">
                             <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Net Earning ({record.commission_percent}%)</p>
                             <p className="text-sm font-bold text-emerald-400">${Number(record.earned_amount).toFixed(2)}</p>
                           </div>
                         </div>
                       </div>
                     ))}
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
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                    onClick={handleProcessPayRun}
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Process Pay Run & Add to Ledger
                  </Button>
                </Card>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-zinc-950 border-b border-zinc-800">
                     <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Date Paid</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Employee</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Job Reference</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400 text-right">Amount</th>
                   </tr>
                 </thead>
                 <tbody>
                   {historyRecords.length === 0 && !isLoading && (
                     <tr>
                       <td colSpan={4} className="p-8 text-center text-zinc-500">No payment history found.</td>
                     </tr>
                   )}
                   {historyRecords.map(record => (
                     <tr key={record.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                       <td className="p-4 text-sm text-zinc-300">{new Date(record.paid_at || record.created_at).toLocaleDateString()}</td>
                       <td className="p-4 text-sm font-medium text-white">{record.employee_name}</td>
                       <td className="p-4 text-sm text-zinc-400">{record.booking_title}</td>
                       <td className="p-4 text-sm font-bold text-emerald-400 text-right">${Number(record.earned_amount).toFixed(2)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </Card>
        )}

        {tab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(
                historyRecords.reduce((acc, curr) => {
                  if (!acc[curr.employee_name]) acc[curr.employee_name] = { totalPaid: 0, jobsCompleted: 0 };
                  acc[curr.employee_name].totalPaid += Number(curr.earned_amount || 0);
                  acc[curr.employee_name].jobsCompleted += 1;
                  return acc;
                }, {} as Record<string, { totalPaid: number, jobsCompleted: number }>)
              ).map(([empName, stats]) => (
                <Card key={empName} className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2 border-b border-zinc-800/50">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <div className="p-2 bg-indigo-500/20 rounded-full text-indigo-400">
                        <User className="h-4 w-4" />
                      </div>
                      {empName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Total Earnings</p>
                      <p className="text-2xl font-black text-emerald-400">${stats.totalPaid.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Jobs Completed</p>
                      <p className="text-xl font-bold text-white">{stats.jobsCompleted}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {historyRecords.length === 0 && (
                <div className="col-span-full">
                  <Card className="p-12 text-center bg-zinc-900 border-zinc-800">
                    <User className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">No Performance Data</h3>
                    <p className="text-zinc-400 mt-2">Process pay runs to start generating employee performance metrics.</p>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
