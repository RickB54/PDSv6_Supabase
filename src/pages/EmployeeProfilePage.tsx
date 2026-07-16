import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Shield, User, Briefcase, FileText, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { getSupabaseEmployees, Employee } from '@/lib/supa-data';
import localforage from 'localforage';
import { supabase } from '@/lib/supabase';

const TABS = ['Personal', 'Employment', 'Compensation', 'Performance', 'Admin'];

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Personal');

  useEffect(() => {
    loadEmployee();
  }, [id]);

  const loadEmployee = async () => {
    setLoading(true);
    const emps = await getSupabaseEmployees();
    const found = emps.find(e => e.id === id || e.email === id);
    if (found) {
      setEmployee(found);
    } else {
      toast({ title: "Employee Not Found", variant: "destructive" });
      navigate('/company-employees');
    }
    setLoading(false);
  };

  const handleChange = (field: keyof Employee, value: any) => {
    if (employee) {
      setEmployee({ ...employee, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!employee) return;
    
    // 1. Save to localforage
    const localEmployees = (await localforage.getItem<Employee[]>('company-employees')) || [];
    const idx = localEmployees.findIndex(e => e.email === employee.email);
    if (idx >= 0) {
      localEmployees[idx] = employee;
    } else {
      localEmployees.push(employee);
    }
    await localforage.setItem('company-employees', localEmployees);

    // 2. Sync to Supabase app_users where possible (for simple scalar fields if we wanted to map them)
    // We already keep the main roles and names in sync in CompanyEmployees.tsx, but we can do a quick update here
    try {
      await supabase.from('app_users').update({
        name: employee.name,
        updated_at: new Date().toISOString()
      }).eq('email', employee.email);
    } catch {}

    toast({ title: "Profile Saved", description: "Employee profile successfully updated." });
  };

  if (loading) return <div className="p-8 text-white">Loading profile...</div>;
  if (!employee) return null;

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => navigate('/company-employees')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{employee.name}</h1>
              <p className="text-zinc-400 text-sm">{employee.employee_type || 'Unassigned Type'} • {employee.status || 'Active'}</p>
            </div>
          </div>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full md:w-auto">
            <Save className="h-4 w-4 mr-2" /> Save Profile
          </Button>
        </div>

        {/* Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Nav */}
          <div className="w-full lg:w-64 space-y-1">
            {TABS.map(tab => {
              const icons: any = {
                'Personal': User,
                'Employment': Briefcase,
                'Compensation': Shield,
                'Performance': Activity,
                'Admin': FileText
              };
              const Icon = icons[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab ? 'bg-indigo-600/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            
            {activeTab === 'Personal' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold border-b border-zinc-800 pb-2">Personal & Contact Info</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-zinc-400">Full Legal Name</Label>
                    <Input value={employee.full_legal_name || ''} onChange={(e) => handleChange('full_legal_name', e.target.value)} className="bg-zinc-950 border-zinc-800 mt-1" />
                  </div>
                  <div><Label className="text-zinc-400">Email Address (Login ID)</Label>
                    <Input value={employee.email} disabled className="bg-zinc-950/50 border-zinc-800 text-zinc-500 mt-1" />
                    <p className="text-xs text-zinc-500 mt-1">Email changes must be done from the Staff Management modal.</p>
                  </div>
                  <div><Label className="text-zinc-400">Phone Number</Label>
                    <Input value={employee.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} className="bg-zinc-950 border-zinc-800 mt-1" />
                  </div>
                  <div><Label className="text-zinc-400">Date of Birth</Label>
                    <Input type="date" value={employee.dob || ''} onChange={(e) => handleChange('dob', e.target.value)} className="bg-zinc-950 border-zinc-800 mt-1" />
                  </div>
                  <div className="col-span-1 md:col-span-2"><Label className="text-zinc-400">Home Address</Label>
                    <Textarea value={employee.home_address || ''} onChange={(e) => handleChange('home_address', e.target.value)} className="bg-zinc-950 border-zinc-800 mt-1" />
                  </div>
                  <div className="col-span-1 md:col-span-2 mt-4"><h3 className="text-sm font-semibold text-zinc-300 mb-2">Emergency Contact</h3></div>
                  <div><Label className="text-zinc-400">Emergency Contact Name</Label>
                    <Input value={employee.emergency_contact_name || ''} onChange={(e) => handleChange('emergency_contact_name', e.target.value)} className="bg-zinc-950 border-zinc-800 mt-1" />
                  </div>
                  <div><Label className="text-zinc-400">Emergency Contact Phone</Label>
                    <Input value={employee.emergency_contact_phone || ''} onChange={(e) => handleChange('emergency_contact_phone', e.target.value)} className="bg-zinc-950 border-zinc-800 mt-1" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Employment' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold border-b border-zinc-800 pb-2">Employment Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-zinc-400">Employee Type (Hierarchy & Split %)</Label>
                    <Select value={employee.employee_type || ''} onValueChange={(v) => handleChange('employee_type', v)}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard Detail Technician">Standard Detail Technician</SelectItem>
                        <SelectItem value="Lead Detail Technician">Lead Detail Technician</SelectItem>
                        <SelectItem value="Independent Contractor">Independent Contractor</SelectItem>
                        <SelectItem value="Shop Manager">Shop Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-zinc-400">System Role (App Access)</Label>
                    <Input value={employee.role} disabled className="bg-zinc-950/50 border-zinc-800 text-zinc-500 mt-1" />
                  </div>
                  <div><Label className="text-zinc-400">Employment Status</Label>
                    <Select value={employee.status || 'Active'} onValueChange={(v) => handleChange('status', v)}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1"><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-zinc-400">Tax Classification</Label>
                    <Select value={employee.tax_classification || ''} onValueChange={(v) => handleChange('tax_classification', v)}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1"><SelectValue placeholder="Select classification" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="W-2">W-2 Employee</SelectItem>
                        <SelectItem value="1099">1099 Contractor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-zinc-400">Hire Date</Label>
                    <Input type="date" value={employee.hire_date || ''} onChange={(e) => handleChange('hire_date', e.target.value)} className="bg-zinc-950 border-zinc-800 mt-1" />
                  </div>
                  <div><Label className="text-zinc-400">Termination Date</Label>
                    <Input type="date" value={employee.termination_date || ''} onChange={(e) => handleChange('termination_date', e.target.value)} className="bg-zinc-950 border-zinc-800 mt-1" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Compensation' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold border-b border-zinc-800 pb-2">Compensation Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-zinc-400">Pay Structure</Label>
                    <Select value={employee.paymentByJob ? "job" : "hourly"} onValueChange={(v) => handleChange('paymentByJob', v === "job")}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1"><SelectValue placeholder="Select structure" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly / Flat Rate</SelectItem>
                        <SelectItem value="job">Pay by the Job</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-zinc-400">Flat Rate ($)</Label>
                    <Input type="number" value={employee.flatRate || ''} onChange={(e) => handleChange('flatRate', parseFloat(e.target.value))} className="bg-zinc-950 border-zinc-800 mt-1" disabled={employee.paymentByJob} />
                  </div>
                  <div><Label className="text-zinc-400">Default Hourly Rate ($)</Label>
                    <Input type="number" value={(employee as any).hourly_rate || ''} onChange={(e) => handleChange('hourly_rate', parseFloat(e.target.value))} className="bg-zinc-950 border-zinc-800 mt-1" disabled={employee.paymentByJob} />
                  </div>
                  <div><Label className="text-zinc-400">Standard Bonus ($)</Label>
                    <Input type="number" value={employee.bonuses || ''} onChange={(e) => handleChange('bonuses', parseFloat(e.target.value))} className="bg-zinc-950 border-zinc-800 mt-1" />
                  </div>
                  <div className="col-span-1 md:col-span-2"><Label className="text-zinc-400">Payment Method Notes / Direct Deposit</Label>
                    <Textarea value={(employee as any).payment_method_notes || ''} onChange={(e) => handleChange('payment_method_notes', e.target.value)} className="bg-zinc-950 border-zinc-800 mt-1" placeholder="Routing/Account info, Zelle handle, etc." />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Performance' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold border-b border-zinc-800 pb-2">Performance & Tracking</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label className="text-zinc-400">Skill Rating (1-5)</Label>
                    <Input type="number" min="1" max="5" value={employee.skill_rating || ''} onChange={(e) => handleChange('skill_rating', parseInt(e.target.value))} className="bg-zinc-950 border-zinc-800 mt-1" />
                  </div>
                  <div><Label className="text-zinc-400">Avg Customer Feedback Score</Label>
                    <Input type="number" step="0.1" value={employee.customer_feedback_score || ''} onChange={(e) => handleChange('customer_feedback_score', parseFloat(e.target.value))} className="bg-zinc-950 border-zinc-800 mt-1" />
                  </div>
                  <div className="col-span-1 md:col-span-2"><Label className="text-zinc-400">Work Ethic Notes</Label>
                    <Textarea value={employee.work_ethic_notes || ''} onChange={(e) => handleChange('work_ethic_notes', e.target.value)} className="bg-zinc-950 border-zinc-800 mt-1 h-32" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Admin' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold border-b border-zinc-800 pb-2">Admin & Documents</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div><Label className="text-zinc-400">Internal Admin Notes</Label>
                    <Textarea value={employee.internal_notes || ''} onChange={(e) => handleChange('internal_notes', e.target.value)} className="bg-zinc-950 border-zinc-800 mt-1 h-32" placeholder="Private notes visible only to admins." />
                  </div>
                  <div><Label className="text-zinc-400">Documents on File</Label>
                    <div className="mt-2 text-sm text-zinc-500">Document management component will go here (W-4, License, etc.)</div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
