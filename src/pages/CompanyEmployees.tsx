import { useState, useEffect, useRef } from "react";
import { useDemoMode } from "@/contexts/DemoContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { Users, Clock, CheckCircle2, DollarSign, Plus, Edit, Trash2, Wallet, AlertTriangle, Shield, User, ShieldCheck, UserCircle, RefreshCw, Calculator, HelpCircle, Archive, ArchiveRestore, EyeOff, Eye, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import localforage from "localforage";
import api from "@/lib/api";
import { getSupabaseEmployees, uploadEmployeePhoto, getSupabasePayrollRecords, markPayrollPaid } from "@/lib/supa-data";
import { upsertExpense } from "@/lib/db";
import { servicePackages, addOns } from "@/lib/services";
import DateRangeFilter from "@/components/filters/DateRangeFilter";
import { PaymentWorkflowHelp } from "@/components/help/PaymentWorkflowHelp";
import { EmploymentComplianceGuide } from "@/components/compliance/EmploymentComplianceGuide";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import supabase from "@/lib/supabase";
import { getTrainingModules, getTrainingBadges, type TrainingModule, type TrainingBadge } from "@/lib/supa-data";

interface Employee {
  id?: string;
  email: string;
  name: string;
  role: string;
  flatRate?: number;
  bonuses?: number;
  paymentByJob?: boolean;
  payStructure?: string;
  tax_classification?: string;
  jobRates?: Record<string, number>;
  profilePhotoUrl?: string;
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
  status?: string;
  paid?: boolean;
}

const CompanyEmployees = () => {
  const { isDemoMode, mockUser } = useDemoMode();
  const user = getCurrentUser() || (isDemoMode ? mockUser : null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [jobRecords, setJobRecords] = useState<JobRecord[]>([]);
  const [pendingPayroll, setPendingPayroll] = useState<any[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<Array<{ employee?: string; amount?: number; status?: string }>>([]);
  const [owedMap, setOwedMap] = useState<Record<string, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState("");
  const [payDescription, setPayDescription] = useState("");
  const [payEmployee, setPayEmployee] = useState<Employee | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [employeeToArchive, setEmployeeToArchive] = useState<string | null>(null);
  const [archivedFilter, setArchivedFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUploadTarget, setPhotoUploadTarget] = useState<string | null>(null);

  const [form, setForm] = useState<{
    name: string;
    email: string;
    role: string;
    password?: string; // Added for Auth creation
    originalEmail?: string; // Added to track original email during edits
    flatRate: string;
    bonuses: string;
    paymentByJob: boolean;
    payStructure: string;
    jobRates: Record<string, string>;
  }>({ name: "", email: "", role: "Employee", password: "", flatRate: "", bonuses: "", paymentByJob: false, payStructure: "hourly-w2", jobRates: {} });

  const [workHistoryDateRange, setWorkHistoryDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Training State
  const [trainingMap, setTrainingMap] = useState<Record<string, { status: string; score: number; date?: string }>>({});
  const [employeeBadges, setEmployeeBadges] = useState<Record<string, TrainingBadge[]>>({});

  useEffect(() => {
    if (!isDemoMode && user?.role !== 'admin') {
      window.location.href = '/';
      return;
    }
    loadData();
  }, [user?.id, user?.role, isDemoMode]);

  const loadData = async () => {
    const merged = await getSupabaseEmployees();
    setEmployees(merged);
    const pending = await getSupabasePayrollRecords('pending');
    setPendingPayroll(pending);
    
    const history = (await localforage.getItem<any[]>('payroll-history')) || [];
    setPayrollHistory(history);

    // Fetch Full Training Data
    try {
      const [modules, badges] = await Promise.all([
        getTrainingModules(),
        getTrainingBadges()
      ]);

      // Needed for badges: matching user -> completed modules -> badge reward
      const { data: allProgress } = await supabase.from('training_progress').select(`
          user_id, status, score, completed_at, module_id,
          users:user_id ( email ) 
      `);

      if (allProgress) {
        // 1. Map Orientation Exam Status (Specific legacy requirement)
        const orientationMod = modules.find(m => m.title === 'Final Orientation Exam');
        const examMap: Record<string, any> = {};

        // 2. Map Badges
        const badgeMap: Record<string, TrainingBadge[]> = {};

        allProgress.forEach((p: any) => {
          const email = p.users?.email;
          if (!email) return;

          // Exam Status
          if (orientationMod && p.module_id === orientationMod.id) {
            examMap[email] = { status: p.status, score: p.score, date: p.completed_at };
          }

          // Badge Checks
          if (p.status === 'completed') {
            const startMod = modules.find(m => m.id === p.module_id);
            if (startMod && startMod.badge_reward_id) {
              const items = badgeMap[email] || [];
              const badge = badges.find(b => b.id === startMod.badge_reward_id);
              if (badge && !items.find(existing => existing.id === badge.id)) {
                items.push(badge);
              }
              badgeMap[email] = items;
            }
          }
        });

        setTrainingMap(examMap);
        setEmployeeBadges(badgeMap);
      }
    } catch (e) { console.error(e); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoUploadTarget) return;

    setIsUploadingPhoto(photoUploadTarget);
    toast({ title: "Uploading Photo", description: "Please wait..." });

    const res = await uploadEmployeePhoto(photoUploadTarget, file);
    
    if (res.error) {
      toast({ title: "Upload Failed", description: res.error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Profile photo updated" });
      await loadData();
    }
    
    setIsUploadingPhoto(null);
    setPhotoUploadTarget(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveEmployees = async (list: Employee[]) => {
    await localforage.setItem("company-employees", list);
    try { localStorage.setItem('company-employees', JSON.stringify(list)); } catch { }
    setEmployees(list);
  };

  useEffect(() => {
    const adjRaw = localStorage.getItem('payroll_owed_adjustments') || '{}';
    const adj = JSON.parse(adjRaw || '{}');
    const next: Record<string, number> = {};
    employees.forEach(emp => {
      const pendingForEmp = pendingPayroll.filter(p => p.employee_name === emp.name || p.employee_id === emp.email);
      const pendingSum = pendingForEmp.reduce((s, p) => s + Number(p.earned_amount || 0), 0);
      next[emp.email] = pendingSum;
    });
    setOwedMap(next);
  }, [employees, pendingPayroll]);

  const filteredJobs = jobRecords.filter(j => {
    if (selectedEmployee && j.employee !== selectedEmployee) return false;
    if (!j.finishedAt) return false;
    const date = new Date(j.finishedAt);
    if (workHistoryDateRange.from && date < new Date(workHistoryDateRange.from.setHours(0, 0, 0, 0))) return false;
    if (workHistoryDateRange.to && date > new Date(workHistoryDateRange.to.setHours(23, 59, 59, 999))) return false;
    return true;
  });

  const totalJobs = filteredJobs.length;
  const totalRevenue = filteredJobs.reduce((sum, j) => sum + (j.totalRevenue || 0), 0);

  const generatePDF = () => {
    // Simplified PDF gen call
    toast({ title: "Report Generated", description: "PDF downloaded." });
  };

  const impersonateEmployee = async (emp: Employee) => {
    toast({ title: "Impersonating...", description: `Signing in as ${emp.name}` });
    setTimeout(() => window.location.href = '/dashboard', 1000);
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    const empToDelete = employees.find(e => e.email === employeeToDelete);
    if (!empToDelete) return;

    // SAFETY CHECK: Prevent self-deletion
    if (user?.email?.toLowerCase() === empToDelete.email.toLowerCase()) {
      toast({ 
        title: "Action Blocked", 
        description: "You cannot delete your own account while logged in.", 
        variant: "destructive" 
      });
      setDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
      return;
    }

    const updated = employees.filter(e => e.email !== employeeToDelete);
    await saveEmployees(updated);
    
    // Also cleanup from app_users if possible
    try {
      await supabase.from('app_users').delete().eq('email', employeeToDelete);
    } catch { }

    toast({ title: "Deleted", description: `${empToDelete.name} has been removed.` });
    setDeleteConfirmOpen(false);
    setEmployeeToDelete(null);
  };

  const handleArchive = async () => {
    if (!employeeToArchive) return;
    const emp = employees.find(e => e.email === employeeToArchive);
    if (!emp) return;

    // SAFETY CHECK: Prevent self-archiving
    if (user?.email?.toLowerCase() === emp.email.toLowerCase()) {
      toast({
        title: "Action Blocked",
        description: "You cannot archive your own account while logged in.",
        variant: "destructive"
      });
      setArchiveConfirmOpen(false);
      setEmployeeToArchive(null);
      return;
    }

    // SAFETY CHECK: Prevent archiving Admins
    if (emp.role === 'Admin') {
      toast({
        title: "Action Blocked",
        description: "Admin accounts cannot be archived.",
        variant: "destructive"
      });
      setArchiveConfirmOpen(false);
      setEmployeeToArchive(null);
      return;
    }

    const isCurrentlyArchived = (emp as any).status === 'Inactive';
    const newStatus = isCurrentlyArchived ? 'Active' : 'Inactive';

    try {
      const { error } = await supabase
        .from('app_users')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('email', emp.email);

      if (error) throw error;

      // Update local state immediately
      const updated = employees.map(e =>
        e.email === emp.email ? { ...e, status: newStatus as any } : e
      );
      await saveEmployees(updated);

      toast({
        title: isCurrentlyArchived ? 'Employee Restored' : 'Employee Archived',
        description: isCurrentlyArchived
          ? `${emp.name} has been restored to active status.`
          : `${emp.name} has been archived and is now hidden from the active roster.`
      });
    } catch (err) {
      console.error('Archive/restore failed:', err);
      toast({ title: 'Error', description: 'Failed to update employee status.', variant: 'destructive' });
    }

    setArchiveConfirmOpen(false);
    setEmployeeToArchive(null);
  };

  const handlePay = async () => {
    if (!payEmployee) return;
    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0 || !payType) { toast({ title: "Error", description: "Invalid amount or type.", variant: "destructive" }); return; }

    // Payment Logic - Create unified expense
    const expense = await upsertExpense({
      amount: amt,
      description: payDescription || `${payType}: ${payEmployee.name}`,
      category: 'Payroll',
      payee: payEmployee.name,
      createdAt: new Date().toISOString()
    } as any);

    // Mark specific pending payroll records as paid to clear them from Payroll Engine
    const pendingForEmp = pendingPayroll.filter(p => p.employee_name === payEmployee.name || p.employee_id === payEmployee.email);
    for (const record of pendingForEmp) {
      try { await markPayrollPaid(record.id, expense.id); } catch (e) { console.error(e); }
    }

    // Update local state
    toast({ title: "Payment Recorded", description: `$${amt.toFixed(2)} paid to ${payEmployee.name}` });
    setPayDialogOpen(false);
    await loadData();
  };

  const openEdit = (emp: Employee) => {
    let currentStructure = emp.payStructure;
    if (!currentStructure) {
      if (emp.tax_classification === '1099') {
        currentStructure = emp.paymentByJob ? "job-1099" : "hourly-1099";
      } else {
        if (emp.paymentByJob) currentStructure = "job-w2";
        else if (emp.flatRate && emp.flatRate > 0) currentStructure = "flat-w2";
        else currentStructure = "hourly-w2";
      }
    }

    setForm({
      name: emp.name, email: emp.email, originalEmail: emp.email, role: emp.role,
      flatRate: emp.flatRate?.toString() || "", bonuses: emp.bonuses?.toString() || "",
      paymentByJob: !!emp.paymentByJob,
      payStructure: currentStructure,
      jobRates: Object.fromEntries(Object.entries(emp.jobRates || {}).map(([k, v]) => [k, String(v)]))
    });
    setIsEditMode(true);
    setModalOpen(true);
  };

  const openAdd = () => {
    setForm({ name: "", email: "", originalEmail: "", role: "Employee", password: "", flatRate: "", bonuses: "", paymentByJob: false, payStructure: "hourly-w2", jobRates: {} });
    setIsEditMode(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast({ title: "Missing Information", description: "Please provide both a Name and Email address. The app requires an email to link their payroll and account.", variant: "destructive" });
      return;
    }

    // 1. Sync with Supabase Auth & app_users
    let userExistsInDb = false;
    if (form.email) {
      const { data: existingUser } = await supabase.from('app_users').select('id').eq('email', form.email).maybeSingle();
      userExistsInDb = !!existingUser;
    }

    if (!userExistsInDb && form.email) {
      try {
        const { data, error } = await supabase.functions.invoke("create-employee", {
          body: { name: form.name, email: form.email, password: form.password, role: form.role.toLowerCase() },
        });
        if (error || !data?.ok) throw error || new Error("create_employee_failed");
        toast({ title: "Auth Created", description: "User account created in Supabase Auth." });
        userExistsInDb = true;
      } catch (e) {
        console.error("Auth Create Error", e);
        toast({ 
          title: "Failed to Create Employee", 
          description: "Could not create the employee in the database. The record was NOT saved. Please try again.", 
          variant: "destructive" 
        });
        return; // HALT execution - do not create a ghost record!
      }
    }

    // 2. Update existing Profile Data (DB)
    const is1099 = form.payStructure.includes('1099');
    const newTaxClass = is1099 ? '1099' : 'W-2';
    const newPaymentByJob = form.payStructure.startsWith('job-');
    
    try {
      if (userExistsInDb && form.email) {
        await supabase.from('app_users').update({
          name: form.name,
          role: form.role.toLowerCase(),
          tax_classification: newTaxClass,
          updated_at: new Date().toISOString()
        }).eq('email', form.email);
      }
    } catch { }

    const payload: Employee = {
      name: form.name, email: form.email, role: form.role,
      flatRate: parseFloat(form.flatRate) || undefined,
      bonuses: parseFloat(form.bonuses) || undefined,
      paymentByJob: newPaymentByJob,
      payStructure: form.payStructure,
      tax_classification: newTaxClass,
      jobRates: Object.fromEntries(Object.entries(form.jobRates || {}).map(([k, v]) => [k, parseFloat(v)]))
    };

    const next = [...employees];
    const targetEmail = isEditMode && form.originalEmail ? form.originalEmail : payload.email;
    const idx = next.findIndex(e => e.email === targetEmail);
    if (idx >= 0) next[idx] = payload;
    else next.push(payload);

    await saveEmployees(next);
    setModalOpen(false);
    toast({ title: "Saved", description: isEditMode ? "Employee updated" : "Employee added" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Company Employees" />
      <main className="container mx-auto px-4 py-6 max-w-7xl space-y-6">

        {/* Stats Card */}
        <Card className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-indigo-500/5 rotate-12 transform scale-150 pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-indigo-500/20 text-indigo-400">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    Staff Management <PaymentWorkflowHelp variant="staff-management" />
                  </h2>
                  <EmploymentComplianceGuide />
                  <Button 
                    variant="outline" 
                    className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 ml-2"
                    onClick={() => navigate(`/employee-profile/${user?.id || user?.email}?tab=training`)}
                  >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Training Progress
                  </Button>
                </div>
                <p className="text-zinc-400 text-sm mt-1">Manage employees, track revenue, and history</p>
              </div>
            </div>

            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Total Revenue</p>
                <p className="text-3xl font-bold text-emerald-400 mt-1">${totalRevenue.toFixed(0)}</p>
              </div>
              <div className="text-center border-l border-zinc-700 pl-8">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Total Jobs</p>
                <p className="text-3xl font-bold text-indigo-400 mt-1">{totalJobs}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Filters & Actions */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
          <div className="flex gap-2 w-full md:w-auto items-center flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md">
              <Users className="h-4 w-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-400">Employees:</span>
              <span className="text-white font-bold">{employees.filter(e => (e as any).status !== 'Inactive').length}</span>
              {employees.some(e => (e as any).status === 'Inactive') && (
                <span className="text-xs text-zinc-600 ml-1">({employees.filter(e => (e as any).status === 'Inactive').length} archived)</span>
              )}
            </div>
            <Select value={archivedFilter} onValueChange={(v) => setArchivedFilter(v as any)}>
              <SelectTrigger className={`w-[150px] bg-zinc-950 border-zinc-800 text-xs font-medium h-9 ${
                archivedFilter === 'archived' ? 'border-amber-500/40 text-amber-400' :
                archivedFilter === 'all' ? 'border-indigo-500/40 text-indigo-400' :
                'text-zinc-400'
              }`}>
                <div className="flex items-center gap-1.5">
                  {archivedFilter === 'archived' ? <Archive className="h-3.5 w-3.5" /> :
                   archivedFilter === 'all' ? <Eye className="h-3.5 w-3.5" /> :
                   <Users className="h-3.5 w-3.5" />}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                <SelectItem value="active" className="text-xs">
                  <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-indigo-400" /> Active Only</span>
                </SelectItem>
                <SelectItem value="archived" className="text-xs">
                  <span className="flex items-center gap-1.5"><Archive className="h-3.5 w-3.5 text-amber-400" /> Archived Only</span>
                </SelectItem>
                <SelectItem value="all" className="text-xs">
                  <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-zinc-400" /> All Employees</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedEmployee || "all"} onValueChange={(val) => setSelectedEmployee(val === "all" ? "" : val)}>
              <SelectTrigger className="w-[180px] bg-zinc-950 border-zinc-800"><SelectValue placeholder="All Staff" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {employees.map(e => <SelectItem key={e.email || `no-email-${e.name}`} value={e.email || `no-email-${e.name}`}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" className="border-indigo-500/20 hover:bg-indigo-500/10 text-indigo-400" onClick={() => navigate('/payroll')}>
              <DollarSign className="w-4 h-4 mr-2" /> Payroll
            </Button>
          </div>
          <div className="flex gap-2 w-full md:w-auto justify-end items-center flex-wrap">
            <DateRangeFilter value={workHistoryDateRange} onChange={setWorkHistoryDateRange} />
            <div className="relative group">
              <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="h-4 w-4 mr-2" /> Add Employee</Button>
              <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-800 text-xs text-zinc-300 p-2 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                <span className="font-bold text-white block mb-1">Tip: Proper Employee Onboarding</span>
                Always enter employees here to properly set up their pay rates and payroll tracking. This will simultaneously create their app login.
              </div>
            </div>
          </div>
        </div>

        {/* Employee Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {employees.filter(emp => {
            const isArchived = (emp as any).status === 'Inactive';
            if (archivedFilter === 'archived') return isArchived;
            if (archivedFilter === 'all') return true;
            return !isArchived; // 'active' — default
          }).map(emp => {
            const isArchived = (emp as any).status === 'Inactive';
            const owed = owedMap[emp.email] || 0;
            const myBadges = employeeBadges[emp.email] || [];

            return (
              <Card key={emp.email} className={`bg-zinc-900 border-zinc-800 hover:border-indigo-500/30 transition-all p-6 flex flex-col gap-5 min-h-[280px] ${
                isArchived ? 'opacity-60 border-dashed border-zinc-700' : ''
              }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div 
                        className="h-14 w-14 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold border border-zinc-700 relative overflow-hidden group cursor-pointer flex-shrink-0"
                        onClick={() => {
                          setPhotoUploadTarget(emp.email);
                          fileInputRef.current?.click();
                        }}
                      >
                        {isUploadingPhoto === emp.email ? (
                           <RefreshCw className="h-5 w-5 animate-spin text-zinc-500" />
                        ) : emp.profilePhotoUrl ? (
                          <img src={emp.profilePhotoUrl} alt={emp.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{emp.name.charAt(0)}</span>
                        )}
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div className="overflow-hidden min-w-0">
                      <h3 className="font-bold text-white truncate text-lg pr-2">{emp.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        {emp.role === 'Admin' ? <Shield className="h-3 w-3 text-amber-500" /> : <User className="h-3 w-3" />}
                        {emp.role}
                        {isArchived && (
                          <span className="ml-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">Archived</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {owed > 0 && (
                    <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded text-xs font-bold text-center">
                      Due: ${owed.toFixed(2)}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800/50">
                    <span className="text-zinc-500 text-xs block">Last Paid</span>
                    <span className="text-zinc-300">{(emp as any).lastPaid || 'Never'}</span>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800/50">
                    <span className="text-zinc-500 text-xs block">Pay Type</span>
                    <span className="text-zinc-300">
                      {emp.payStructure === 'hourly-w2' ? 'Hourly (W-2)' :
                       emp.payStructure === 'flat-w2' ? 'Flat Rate (W-2)' :
                       emp.payStructure === 'job-w2' ? 'Pay by the Job (W-2)' :
                       emp.payStructure === 'job-1099' ? 'Contractor — Per Job (1099)' :
                       emp.payStructure === 'hourly-1099' ? 'Contractor — Hourly (1099)' :
                       emp.tax_classification === '1099' ? (emp.paymentByJob ? 'Contractor — Per Job (1099)' : 'Contractor — Hourly (1099)') :
                       (emp.paymentByJob ? 'Pay by the Job (W-2)' : 'Hourly / Flat Rate (W-2)')}
                    </span>
                  </div>
                </div>

                {/* Training & Badges */}
                <div className="mt-2 space-y-2">
                  {trainingMap[emp.email] ? (
                    <div className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 font-medium ${trainingMap[emp.email].score >= 38 ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                      trainingMap[emp.email].status === 'completed' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                        'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                      }`}>
                      {trainingMap[emp.email].score >= 38 ? <CheckCircle2 className="w-3 h-3" /> : null}
                      {trainingMap[emp.email].score >= 38 ? `Orientation Passed` :
                        trainingMap[emp.email].status === 'completed' ? `Orientation Failed` : 'Orientation Started'}
                    </div>
                  ) : null}

                  {myBadges.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {myBadges.map(b => (
                        <div key={b.id} className={`text-[10px] px-2 py-0.5 rounded-full border bg-${b.color}-500/10 text-${b.color}-500 border-${b.color}-500/30 flex items-center gap-1`}>
                          <ShieldCheck className="w-3 h-3" /> {b.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-zinc-800 justify-between">
                  <Button variant="ghost" size="sm" className="flex-1 h-9 min-w-[70px] text-zinc-400 hover:text-white hover:bg-zinc-800 flex justify-center" onClick={() => openEdit(emp)}><Edit className="h-4 w-4 mr-1.5" /> Edit</Button>
                  <Button variant="ghost" size="sm" className="flex-1 h-9 min-w-[70px] text-blue-400 hover:text-blue-300 hover:bg-blue-950/20 flex justify-center" onClick={() => navigate(`/employee-profile/${emp.id || emp.email}`)}><UserCircle className="h-4 w-4 mr-1.5" /> Profile</Button>
                  <Button variant="ghost" size="sm" className="flex-1 h-9 min-w-[70px] text-purple-400 hover:text-purple-300 hover:bg-purple-950/20 flex justify-center" onClick={() => navigate(`/compensation-payroll?employee=${emp.email}`)}><Calculator className="h-4 w-4 mr-1.5" /> Calc</Button>
                  {!isArchived && (
                    <Button variant="ghost" size="sm" className="flex-1 h-9 min-w-[70px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 flex justify-center" onClick={() => { setPayEmployee(emp); setPayAmount(owedMap[emp.email]?.toString() || ""); setPayDialogOpen(true) }}><Wallet className="h-4 w-4 mr-1.5" /> Pay</Button>
                  )}
                  {emp.role !== 'Admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`flex-1 h-9 min-w-[70px] flex justify-center ${
                        isArchived
                          ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/20'
                          : 'text-amber-500/70 hover:text-amber-400 hover:bg-amber-950/20'
                      }`}
                      onClick={() => { setEmployeeToArchive(emp.email); setArchiveConfirmOpen(true); }}
                    >
                      {isArchived
                        ? <><ArchiveRestore className="h-4 w-4 mr-1.5" /> Restore</>  
                        : <><Archive className="h-4 w-4 mr-1.5" /> Archive</>}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="flex-1 h-9 min-w-[70px] text-zinc-500 hover:text-red-400 hover:bg-red-950/20 flex justify-center" onClick={() => { setEmployeeToDelete(emp.email); setDeleteConfirmOpen(true) }}><Trash2 className="h-4 w-4 mr-1.5" /> Del</Button>
                </div>
              </Card>
            );
          })}
          {employees.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-xl">
              <Users className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-lg text-zinc-400">No employees found</h3>
              <Button variant="link" onClick={openAdd}>Add your first employee</Button>
            </div>
          )}
        </div>

        {/* History Table */}
        <Card className="bg-zinc-900 border-zinc-800 mt-8">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <h3 className="font-bold text-white flex items-center gap-2"><Clock className="h-4 w-4 text-zinc-400" /> Work History</h3>
            <span className="text-xs text-zinc-500">{filteredJobs.length} Records</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-950">
                <TableRow className="hover:bg-transparent border-zinc-800">
                  <TableHead className="text-zinc-400">Date</TableHead>
                  <TableHead className="text-zinc-400">Employee</TableHead>
                  <TableHead className="text-zinc-400">Customer</TableHead>
                  <TableHead className="text-zinc-400">Service</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-zinc-500">No history found for current filters</TableCell></TableRow>
                ) : (
                  filteredJobs.slice(0, 50).map(j => (
                    <TableRow key={j.jobId} className="border-zinc-800 hover:bg-zinc-800/30">
                      <TableCell className="font-mono text-zinc-400">{j.finishedAt?.slice(0, 10)}</TableCell>
                      <TableCell className="text-white font-medium">{j.employee}</TableCell>
                      <TableCell className="text-zinc-300">{j.customer} <span className="text-zinc-500 text-xs ml-1">• {j.vehicle}</span></TableCell>
                      <TableCell className="text-zinc-300">{j.service}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

      </main>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEditMode ? "Edit Employee" : "Add Employee"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="text-zinc-400">Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-zinc-950 border-zinc-800" /></div>
            <div><Label className="text-zinc-400">Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-zinc-950 border-zinc-800" /></div>
            {!isEditMode && (
              <div><Label className="text-zinc-400">Initial Password</Label><Input value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} className="bg-zinc-950 border-zinc-800" placeholder="For App Login" /></div>
            )}
            <div><Label className="text-zinc-400">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Employee">Employee</SelectItem><SelectItem value="Admin">Admin</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-zinc-400 m-0">Pay Structure</Label>
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      className="inline-flex items-center justify-center rounded-full w-5 h-5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors focus:outline-none shrink-0"
                      aria-label="How to Choose Pay Structure"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-[480px] p-5 shadow-2xl border-blue-500/30 bg-zinc-900 overflow-y-auto max-h-[85vh]">
                    <div className="space-y-5">
                      <h4 className="font-bold text-lg text-white border-b border-zinc-800 pb-3">How to Choose the Right Pay Structure</h4>
                      <p className="text-zinc-200 font-semibold text-sm">The key question: Do you control how this person does their work?</p>
                      
                      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg space-y-3">
                        <p className="font-bold text-blue-400 text-sm">If YES → W-2 Employee</p>
                        <p className="text-xs text-zinc-300 leading-relaxed">You tell them when to show up, what to do, how to do it, and you provide the tools and equipment. This is a W-2 employment relationship regardless of how you pay them (hourly, flat rate, or per job).</p>
                        <p className="text-xs font-semibold text-zinc-200 pt-1">Signs you have a W-2 employee:</p>
                        <ul className="text-xs text-zinc-300 list-disc pl-5 space-y-1.5">
                          <li>You set their schedule</li>
                          <li>You provide chemicals, equipment, and supplies</li>
                          <li>You train them on your specific methods</li>
                          <li>They work exclusively or primarily for you</li>
                          <li>You direct every aspect of how the work is done</li>
                        </ul>
                      </div>

                      <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg space-y-3">
                        <p className="font-bold text-orange-400 text-sm">If NO → 1099 Contractor</p>
                        <p className="text-xs text-zinc-300 leading-relaxed">They set their own hours, use their own tools, work for multiple clients, and you simply pay them for the end result. You do not direct how they do the work — only what the final result should be.</p>
                        <p className="text-xs font-semibold text-zinc-200 pt-1">Signs you have a 1099 contractor:</p>
                        <ul className="text-xs text-zinc-300 list-disc pl-5 space-y-1.5">
                          <li>They set their own schedule</li>
                          <li>They bring their own tools and supplies</li>
                          <li>They work for multiple clients, not just you</li>
                          <li>They operate their own business</li>
                          <li>You pay for the result, not the process</li>
                        </ul>
                      </div>

                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg space-y-2">
                        <p className="font-bold text-emerald-400 text-sm">Quick rule of thumb for your business:</p>
                        <p className="text-xs text-zinc-300 leading-relaxed">If you are training someone, providing all chemicals and equipment, and working alongside them — they are almost certainly a W-2 employee, not a 1099 contractor. Misclassifying a W-2 worker as 1099 can result in IRS penalties including back taxes, interest, and fines going back multiple years.</p>
                      </div>

                      <div className="space-y-3">
                        <p className="font-bold text-white text-sm">Not sure? Ask yourself:</p>
                        <ul className="text-xs text-zinc-300 space-y-2">
                          <li><span className="text-zinc-100">Am I providing their tools and supplies?</span> → W-2</li>
                          <li><span className="text-zinc-100">Am I training them on my specific methods?</span> → W-2</li>
                          <li><span className="text-zinc-100">Do they set their own hours and work for other clients?</span> → Possibly 1099</li>
                          <li><span className="text-zinc-100">Do they have their own detailing business?</span> → Possibly 1099</li>
                        </ul>
                      </div>

                      <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-xs text-zinc-400 leading-relaxed italic">
                        <strong className="text-zinc-300 not-italic">When in doubt:</strong> Consult your accountant or employment attorney before processing your first payroll. The IRS and both Massachusetts and New Hampshire impose penalties for misclassification. A 30-minute consultation now costs far less than a misclassification penalty later.
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Select value={form.payStructure} onValueChange={(v) => setForm({ ...form, payStructure: v, paymentByJob: v.startsWith('job-') })}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">W-2 Employee</div>
                  <SelectItem value="hourly-w2">Hourly (W-2)</SelectItem>
                  <SelectItem value="flat-w2">Flat Rate (W-2)</SelectItem>
                  <SelectItem value="job-w2">Pay by the Job (W-2)</SelectItem>
                  <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-2 border-t border-zinc-800">1099 Contractor</div>
                  <SelectItem value="job-1099">Contractor — Per Job (1099)</SelectItem>
                  <SelectItem value="hourly-1099">Contractor — Hourly (1099)</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-2 text-xs text-zinc-400 bg-zinc-950 p-3 rounded-md border border-zinc-800 leading-relaxed">
                {form.payStructure === 'hourly-w2' && "This employee is on your regular payroll and is paid a set rate per hour worked. As a W-2 employer you are responsible for withholding federal income tax, Social Security, and Medicare (FICA) from their paycheck, as well as paying the employer's share of FICA taxes. You must issue them a W-4 before their first paycheck and a W-2 at the end of each tax year. Best for employees who work regular, trackable hours on a consistent schedule."}
                {form.payStructure === 'flat-w2' && "This employee is on your regular payroll and is paid a fixed predetermined amount per pay period regardless of hours worked. Same tax withholding obligations as Hourly (W-2) — you withhold income tax and FICA, pay employer FICA, issue W-4 and W-2. Best for employees with a consistent, predictable workload where hourly tracking isn't practical."}
                {form.payStructure === 'job-w2' && "This employee is on your regular payroll and is paid a set amount per job completed. Same tax withholding obligations as other W-2 options — you withhold income tax and FICA, pay employer FICA, issue W-4 and W-2. Best for employees where pay varies based on how many jobs they complete but you still want them classified as regular employees with full payroll tax treatment."}
                {form.payStructure === 'job-1099' && "This person is an independent contractor, not an employee. They are paid a fixed amount per job completed and are responsible for paying their own taxes — you do NOT withhold income tax, Social Security, or Medicare from their payment. You do NOT pay employer FICA taxes. Instead, you collect a W-9 from them before their first payment, pay them the agreed amount in full, and issue a 1099-NEC at the end of the year if you paid them $600 or more total. Best for skilled tradespeople or specialists you hire on a per-job basis without a long-term employment commitment. Note: The IRS has strict rules about who qualifies as a contractor vs. an employee — misclassifying a W-2 worker as 1099 can result in significant penalties. Confirm with your accountant if you are unsure."}
                {form.payStructure === 'hourly-1099' && "This person is an independent contractor paid by the hour. Same 1099 treatment as Contractor — Per Job — no withholding, no employer FICA, collect W-9 before first payment, issue 1099-NEC if total payments reach $600 or more in the calendar year. Best for contractors whose work is time-based rather than project-based but who are still not regular employees. Same IRS classification caution applies — confirm with your accountant if unsure whether this person should be W-2 instead."}
              </div>
              <p className="mt-3 text-[11px] text-zinc-500 italic leading-relaxed">
                Not sure which to choose? As a general rule: if you control when, where, and how the work is done, the worker is likely a W-2 employee. If they set their own schedule and methods, they may qualify as a 1099 contractor. When in doubt, consult your accountant or employment attorney — the IRS and Massachusetts both impose penalties for misclassification.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-zinc-400">Flat Rate ($)</Label><Input type="number" value={form.flatRate} onChange={e => setForm({ ...form, flatRate: e.target.value })} className="bg-zinc-950 border-zinc-800" disabled={form.paymentByJob} /></div>
              <div><Label className="text-zinc-400">Bonuses ($)</Label><Input type="number" value={form.bonuses} onChange={e => setForm({ ...form, bonuses: e.target.value })} className="bg-zinc-950 border-zinc-800" /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader><DialogTitle>Pay {payEmployee?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-purple-500/10 text-purple-400 border border-purple-500/20 p-3 rounded-lg text-sm mb-2">
              <span className="font-bold flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Unsure of the amount?</span>
              <p className="mt-1 text-purple-300/80">Use the Compensation Calculator to calculate the correct amount first.</p>
              <Button variant="link" className="text-purple-300 hover:text-purple-200 h-auto p-0 mt-1 font-bold" onClick={() => navigate('/compensation-payroll')}>
                Open Calculator &rarr;
              </Button>
            </div>
            <div><Label className="text-zinc-400">Amount ($)</Label><Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="bg-zinc-950 border-zinc-800 text-xl font-bold font-mono" /></div>
            <div><Label className="text-zinc-400">Payment Type</Label>
              <Select value={payType} onValueChange={setPayType}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Job">Job Payment</SelectItem>
                  <SelectItem value="Hourly">Hourly</SelectItem>
                  <SelectItem value="Bonus">Bonus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handlePay} className="bg-green-600 hover:bg-green-700">Confirm Payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirm Dialog */}
      <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {employees.find(e => e.email === employeeToArchive)?.status === 'Inactive'
                ? <><ArchiveRestore className="h-5 w-5 text-amber-400" /> Restore Employee?</>
                : <><Archive className="h-5 w-5 text-amber-500" /> Archive Employee?</>}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {employees.find(e => e.email === employeeToArchive && (e as any).status === 'Inactive')
                ? `This will restore ${employees.find(e => e.email === employeeToArchive)?.name} to active status. They will reappear on the active roster.`
                : `This will archive ${employees.find(e => e.email === employeeToArchive)?.name}. They will be hidden from the active roster but all their data and history will be preserved. You can restore them at any time.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className={employees.find(e => e.email === employeeToArchive && (e as any).status === 'Inactive')
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-amber-600 hover:bg-amber-700'
              }
            >
              {employees.find(e => e.email === employeeToArchive && (e as any).status === 'Inactive') ? 'Restore' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {employees.find(e => e.email === employeeToDelete)?.role === 'Admin' ? 'Delete Admin Account?' : 'Delete Employee?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {employees.find(e => e.email === employeeToDelete)?.role === 'Admin' 
                ? 'CAUTION: You are about to delete an ADMINISTRATOR account. This will remove their system-wide access and management privileges.'
                : 'This will remove the employee and their history. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handlePhotoUpload} 
        accept="image/*" 
        className="hidden" 
      />

    </div>
  );
};

export default CompanyEmployees;
