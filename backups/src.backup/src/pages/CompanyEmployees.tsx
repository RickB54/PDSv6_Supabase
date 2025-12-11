import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { Users, Clock, CheckCircle2, DollarSign, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import localforage from "localforage";
import api from "@/lib/api";
import { servicePackages, addOns } from "@/lib/services";

interface Employee {
  email: string;
  name: string;
  role: string; // 'Employee' | 'Admin'
  flatRate?: number; // default hourly or per-job flat amount
  bonuses?: number; // accumulated or default bonus for pay period
  paymentByJob?: boolean; // if true, pay calculated per job rather than hourly
  jobRates?: Record<string, number>; // mapping: service/add-on name -> payout
}

interface JobRecord {
  jobId: string;
  employee: string;
  customer: string;
  vehicle: string;
  service: string;
  totalTime?: string;
  finishedAt: string;
  totalRevenue?: number;
}

const CompanyEmployees = () => {
  const user = getCurrentUser();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [jobRecords, setJobRecords] = useState<JobRecord[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<Array<{ employee?: string; amount?: number; status?: string }>>([]);
  const [owedMap, setOwedMap] = useState<Record<string, number>>({}); // key by employee email
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    email: string;
    role: string;
    flatRate: string;
    bonuses: string;
    paymentByJob: boolean;
    jobRates: Record<string, string>;
  }>({ name: "", email: "", role: "Employee", flatRate: "", bonuses: "", paymentByJob: false, jobRates: {} });

  useEffect(() => {
    // Only admins can access
    if (user?.role !== 'admin') {
      window.location.href = '/';
      return;
    }
    loadEmployees();
    loadJobRecords();
    loadPayrollHistory();
  }, [user]);

  const loadEmployees = async () => {
    // Pull unified employees via API and enrich with local company-specific details
    const apiEmployees = (await api("/api/users/employees", { method: "GET" })) || [];
    const lf = (await localforage.getItem<Employee[]>("company-employees")) || [];
    const ls = (() => { try { return JSON.parse(localStorage.getItem('company-employees') || '[]'); } catch { return []; } })() as Employee[];
    const localAll: Employee[] = [];
    const addLocal = (e: Employee) => { if (!localAll.find(x => x.email === e.email)) localAll.push(e); };
    lf.forEach(addLocal); ls.forEach(addLocal);

    const localByEmail: Record<string, Employee> = Object.fromEntries(localAll.map(e => [e.email, e]));
    const normRole = (r: any) => String(r || '').toLowerCase() === 'admin' ? 'Admin' : 'Employee';

    const merged: Employee[] = [];
    const seen = new Set<string>();
    (Array.isArray(apiEmployees) ? apiEmployees : []).forEach((u: any) => {
      const email = String(u.email || '').toLowerCase();
      const local = localByEmail[email] || localByEmail[String(u.email || '')] || undefined;
      const emp: Employee = {
        email: u.email,
        name: u.name || local?.name || u.email,
        role: normRole(u.role || local?.role),
        flatRate: local?.flatRate,
        bonuses: local?.bonuses,
        paymentByJob: local?.paymentByJob,
        jobRates: local?.jobRates,
      };
      merged.push(emp);
      seen.add(email);
    });
    // Include local-only employees not present in API list
    localAll.forEach((e) => {
      const emailKey = String(e.email || '').toLowerCase();
      if (!seen.has(emailKey)) {
        merged.push({ ...e, role: normRole(e.role) });
      }
    });
    setEmployees(merged);
  };

  const saveEmployees = async (list: Employee[]) => {
    // Persist to both localforage and localStorage to avoid driver issues
    await localforage.setItem("company-employees", list);
    try { localStorage.setItem('company-employees', JSON.stringify(list)); } catch {}
    setEmployees(list);
  };

  const loadJobRecords = () => {
    const completed = JSON.parse(localStorage.getItem('completedJobs') || '[]');
    setJobRecords(completed);
  };

  const loadPayrollHistory = async () => {
    const list = (await localforage.getItem<any[]>('payroll-history')) || [];
    setPayrollHistory(list);
  };

  // Compute owed per employee (unpaid jobs + pending history - adjustments)
  useEffect(() => {
    const adjRaw = localStorage.getItem('payroll_owed_adjustments') || '{}';
    const adj = JSON.parse(adjRaw || '{}');
    const next: Record<string, number> = {};
    employees.forEach(emp => {
      const unpaidJobs = jobRecords.filter(j => j.status === 'completed' && !j.paid && j.employee === emp.email);
      const unpaidSum = unpaidJobs.reduce((s, j) => s + Number(j.totalRevenue || 0), 0);
      const pendHist = payrollHistory.filter(h => String(h.status) === 'Pending' && (String(h.employee) === emp.name || String(h.employee) === emp.email));
      const pendingSum = pendHist.reduce((s, h) => s + Number(h.amount || 0), 0);
      const adjSum = Number(adj[emp.name] || 0) + Number(adj[emp.email] || 0);
      next[emp.email] = Math.max(0, unpaidSum + pendingSum - adjSum);
    });
    setOwedMap(next);
  }, [employees, jobRecords, payrollHistory]);

  const filteredJobs = selectedEmployee
    ? jobRecords.filter(j => j.employee === selectedEmployee)
    : jobRecords;

  const totalJobs = filteredJobs.length;
  const totalRevenue = filteredJobs.reduce((sum, j) => sum + (j.totalRevenue || 0), 0);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Employee Work History", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
    
    if (selectedEmployee) {
      const emp = employees.find(e => e.email === selectedEmployee);
      doc.text(`Employee: ${emp?.name || selectedEmployee}`, 20, 40);
    }
    
    let y = 50;
    doc.text("Job | Customer | Vehicle | Service | Date", 20, y);
    y += 7;
    
    filteredJobs.forEach((job) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(
        `${job.jobId} | ${job.customer} | ${job.vehicle} | ${job.service} | ${new Date(job.finishedAt).toLocaleDateString()}`,
        20,
        y
      );
      y += 7;
    });
    
    doc.save(`Employee_History_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const impersonateEmployee = async (emp: Employee) => {
    if (!emp) return;
    try {
      const syntheticId = `emp_${String(emp.email || emp.name || '').toLowerCase()}`;
      const res = await api(`/api/users/impersonate/${syntheticId}`, { method: 'POST' });
      if (res?.ok) {
        toast({ title: 'Impersonation active', description: `Signed on as ${emp.name}` });
        setTimeout(() => { window.location.href = '/dashboard'; }, 200);
      } else {
        toast({ title: 'Failed to impersonate', description: 'User was not found.' });
      }
    } catch {
      toast({ title: 'Failed to impersonate' });
    }
  };

  const openAdd = () => {
    setForm({ name: "", email: "", role: "Employee", flatRate: "", bonuses: "", paymentByJob: false, jobRates: {} });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload: Employee = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role || 'Employee',
      flatRate: form.flatRate ? parseFloat(form.flatRate) : undefined,
      bonuses: form.bonuses ? parseFloat(form.bonuses) : undefined,
      paymentByJob: !!form.paymentByJob,
      jobRates: Object.fromEntries(Object.entries(form.jobRates || {}).filter(([_, v]) => v !== '' && !isNaN(parseFloat(v))).map(([k, v]) => [k, parseFloat(v)])),
    };
    // Basic validation with clear feedback
    if (!payload.name) { toast({ title: 'Name required', description: 'Please enter a name.', variant: 'destructive' }); return; }
    if (!payload.email) { toast({ title: 'Email required', description: 'Please enter an email.', variant: 'destructive' }); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) { toast({ title: 'Invalid email', description: 'Enter a valid email address.', variant: 'destructive' }); return; }
    if (user?.role !== 'admin') { toast({ title: 'Not allowed', description: 'Only admins can add employees.', variant: 'destructive' }); return; }

    // Immediate local update for reliability
    const existsIdx = employees.findIndex(e => e.email === payload.email);
    const next = [...employees];
    let actionLabel = 'Employee added';
    if (existsIdx >= 0) { next[existsIdx] = { ...next[existsIdx], ...payload }; actionLabel = 'Employee updated'; }
    else { next.push(payload); }
    try {
      await saveEmployees(next);
      setModalOpen(false);
      toast({ title: 'Saved', description: actionLabel });
    } catch (e:any) {
      toast({ title: 'Save failed', description: e?.message || 'Could not persist employee.', variant: 'destructive' });
      return;
    }

    // Try syncing to API non-blocking
    try { await api('/api/employees', { method: 'POST', body: JSON.stringify(payload) }); } catch {}
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Company Employees" />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Employee Management</h1>
            <Button onClick={generatePDF} variant="outline">
              Download Report
            </Button>
          </div>

          {/* Employee Selector */}
          <Card className="p-4 bg-gradient-card border-border">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <label className="font-medium">Select Employee:</label>
              </div>
              <Select value={selectedEmployee || "all"} onValueChange={(val) => setSelectedEmployee(val === "all" ? "" : val)}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.email} value={emp.email}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="ml-auto bg-gradient-hero" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" /> Add Employee
              </Button>
            </div>
            {selectedEmployee && (
  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(() => { const emp = employees.find(e => e.email === selectedEmployee); const lastPaid = (emp as any)?.lastPaid || '—'; const owed = owedMap[selectedEmployee] || 0; return (
                <>
                  <div className="p-3 rounded border border-border">
                    <p className="text-sm text-muted-foreground">Last Paid</p>
                    <p className="text-lg font-semibold text-foreground">{String(lastPaid)}</p>
                  </div>
                  <div className="p-3 rounded border border-border">
                    <p className="text-sm text-muted-foreground">Owed Balance</p>
                    <p className="text-lg font-semibold text-foreground">${owed.toFixed(2)}</p>
                  </div>
                </>
                ); })()}
              </div>
            )}
          </Card>

          {/* All Employees */}
          <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-xl font-bold text-foreground mb-4">All Employees</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {employees.map((emp) => (
                <div key={emp.email} className="p-3 rounded border border-border">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{emp.name}</p>
                      <p className="text-sm text-muted-foreground">{emp.email}</p>
                      <p className="text-xs text-muted-foreground">Role: {emp.role}</p>
                    </div>
                    <Button size="sm" className="bg-red-700 hover:bg-red-800" onClick={() => impersonateEmployee(emp)}>Impersonate</Button>
                  </div>
                </div>
              ))}
              {employees.length === 0 && (
                <p className="text-sm text-muted-foreground">No employees saved yet.</p>
              )}
            </div>
          </Card>

          {/* Stats */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="p-6 bg-gradient-card border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                  <h3 className="text-2xl font-bold text-foreground">{totalJobs}</h3>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/20 rounded-lg">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Revenue Generated</p>
                  <h3 className="text-2xl font-bold text-foreground">${totalRevenue.toFixed(2)}</h3>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Jobs/Day</p>
                  <h3 className="text-2xl font-bold text-foreground">
                    {totalJobs > 0 ? (totalJobs / 30).toFixed(1) : '0'}
                  </h3>
                </div>
              </div>
            </Card>
          </div>

          {/* Selected Employee History */}
          {selectedEmployee && (
            <Card className="bg-gradient-card border-border">
              <div className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Selected Employee History</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                          No work history found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredJobs.map((job) => (
                        <TableRow key={job.jobId}>
                          <TableCell className="font-mono text-sm">{job.jobId}</TableCell>
                          <TableCell>{job.customer}</TableCell>
                          <TableCell>{job.vehicle}</TableCell>
                          <TableCell>{job.service}</TableCell>
                          <TableCell>{job.totalTime || 'N/A'}</TableCell>
                          <TableCell>{new Date(job.finishedAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Work History Table (All / Filtered) */}
          <Card className="bg-gradient-card border-border">
            <div className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Work History</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        No work history found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredJobs.map((job) => (
                      <TableRow key={job.jobId}>
                        <TableCell className="font-mono text-sm">{job.jobId}</TableCell>
                        <TableCell>{job.employee}</TableCell>
                        <TableCell>{job.customer}</TableCell>
                        <TableCell>{job.vehicle}</TableCell>
                        <TableCell>{job.service}</TableCell>
                        <TableCell>{job.totalTime || 'N/A'}</TableCell>
                        <TableCell>{new Date(job.finishedAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </main>

      {/* Add Employee Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Employee</option>
                <option>Admin</option>
              </select>
            </div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Flat Rate</Label>
                <Input type="number" step="0.01" value={form.flatRate} onChange={(e) => setForm({ ...form, flatRate: e.target.value })} placeholder="e.g., 20.00" />
              </div>
              <div className="space-y-1">
                <Label>Bonuses</Label>
                <Input type="number" step="0.01" value={form.bonuses} onChange={(e) => setForm({ ...form, bonuses: e.target.value })} placeholder="e.g., 50.00" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input id="paymentByJob" type="checkbox" checked={form.paymentByJob} onChange={(e) => setForm({ ...form, paymentByJob: e.target.checked })} />
              <Label htmlFor="paymentByJob">Payment by Job</Label>
            </div>
            {form.paymentByJob && (
              <div className="mt-2 space-y-2">
                <Label>Job Rate Editor (per service/add-on payout)</Label>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto p-2 border rounded">
                  {[...servicePackages.map((p: any) => ({ id: p.id, name: p.name })), ...addOns.map((a: any) => ({ id: a.id, name: a.name }))].map((item: any) => (
                    <div key={item.id} className="space-y-1">
                      <Label className="text-xs">{item.name}</Label>
                      <Input type="number" step="0.01" value={form.jobRates[item.name] || ''} onChange={(e) => setForm({ ...form, jobRates: { ...form.jobRates, [item.name]: e.target.value } })} placeholder="e.g., 25.00" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
<DialogFooter className="button-group-responsive">
            <Button className="bg-gradient-hero" onClick={handleSave}>Save</Button>
</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyEmployees;
