import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Shield, User, Briefcase, FileText, Activity, DollarSign, Star, AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { getSupabaseEmployees, type Employee } from '@/lib/supa-data';

const TABS = [
  { id: 'personal',     label: 'Personal',     icon: User },
  { id: 'employment',   label: 'Employment',   icon: Briefcase },
  { id: 'compensation', label: 'Compensation', icon: DollarSign },
  { id: 'performance',  label: 'Performance',  icon: Activity },
  { id: 'admin',        label: 'Admin',        icon: FileText },
];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</Label>
    {children}
  </div>
);

const inputCls = "bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-indigo-500 transition-colors";

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [emp, setEmp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    // Fetch directly from Supabase for full column set
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .or(`id.eq.${id},email.eq.${id}`)
      .maybeSingle();

    if (error || !data) {
      // Fallback: search by email match from merged list
      const emps = await getSupabaseEmployees();
      const found = emps.find(e => e.id === id || e.email === id);
      if (found) {
        const { data: full } = await supabase.from('app_users').select('*').eq('id', found.id!).maybeSingle();
        setEmp(full || found);
      } else {
        toast({ title: 'Employee not found', variant: 'destructive' });
        navigate('/company-employees');
      }
    } else {
      setEmp(data);
    }
    setLoading(false);
  };

  const set = (field: string, value: any) => setEmp((prev: any) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!emp?.id) return;
    setSaving(true);
    const { error } = await supabase.from('app_users').update({
      name: emp.name,
      full_legal_name: emp.full_legal_name || null,
      phone: emp.phone || null,
      home_address: emp.home_address || null,
      dob: emp.dob || null,
      emergency_contact_name: emp.emergency_contact_name || null,
      emergency_contact_phone: emp.emergency_contact_phone || null,
      job_title: emp.job_title || null,
      employee_type: emp.employee_type || null,
      status: emp.status || null,
      hire_date: emp.hire_date || null,
      termination_date: emp.termination_date || null,
      tax_classification: emp.tax_classification || null,
      payment_method_notes: emp.payment_method_notes || null,
      skill_rating: emp.skill_rating ? Number(emp.skill_rating) : null,
      work_ethic_notes: emp.work_ethic_notes || null,
      customer_feedback_score: emp.customer_feedback_score ? Number(emp.customer_feedback_score) : null,
      incident_log: emp.incident_log || null,
      tier_promotion_history: emp.tier_promotion_history || null,
      internal_notes: emp.internal_notes || null,
      documents_on_file: emp.documents_on_file || null,
      updated_at: new Date().toISOString(),
    }).eq('id', emp.id);

    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✓ Profile saved', description: `${emp.name}'s profile has been updated.` });
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-zinc-400 text-sm">Loading profile...</p>
      </div>
    </div>
  );
  if (!emp) return null;

  const initials = (emp.name || emp.email || '?').charAt(0).toUpperCase();
  const statusColor: Record<string, string> = {
    Active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Inactive: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    Terminated: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur border-b border-zinc-800/60 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => navigate('/company-employees')}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-lg">
                {initials}
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">{emp.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-zinc-500">{emp.job_title || emp.employee_type || 'No title set'}</span>
                  {emp.status && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${statusColor[emp.status] || 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                      {emp.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 min-w-[110px]">
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Profile'}
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col lg:flex-row gap-6">
        {/* Sidebar Nav */}
        <nav className="w-full lg:w-56 shrink-0">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            {TABS.map((tab, i) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${i !== 0 ? 'border-t border-zinc-800/50' : ''} ${active ? 'bg-indigo-600/15 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                  {active && <ChevronRight className="h-3.5 w-3.5 ml-auto text-indigo-500" />}
                </button>
              );
            })}
          </div>

          {/* Quick Stats */}
          <div className="mt-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Quick Info</p>
            <div className="text-xs text-zinc-400 space-y-1.5">
              <div className="flex justify-between"><span>Role</span><span className="text-zinc-200 font-medium capitalize">{emp.role}</span></div>
              <div className="flex justify-between"><span>Email</span><span className="text-zinc-300 font-mono text-[10px] truncate max-w-[110px]">{emp.email}</span></div>
              {emp.hire_date && <div className="flex justify-between"><span>Hired</span><span className="text-zinc-200">{emp.hire_date}</span></div>}
              {emp.skill_rating && <div className="flex justify-between"><span>Skill</span><span className="text-amber-400">{'★'.repeat(emp.skill_rating)}{'☆'.repeat(5 - emp.skill_rating)}</span></div>}
            </div>
          </div>
        </nav>

        {/* Content Panel */}
        <div className="flex-1 bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 min-h-[500px]">

          {/* PERSONAL */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white mb-1">Personal & Contact Info</h2>
                <p className="text-xs text-zinc-500">Private employee information — admin only.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Full Legal Name">
                  <Input value={emp.full_legal_name || ''} onChange={e => set('full_legal_name', e.target.value)} className={inputCls} placeholder="As shown on ID/tax docs" />
                </Field>
                <Field label="Display Name">
                  <Input value={emp.name || ''} onChange={e => set('name', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Email (Login — read only)">
                  <Input value={emp.email} disabled className="bg-zinc-950/50 border-zinc-800 text-zinc-500" />
                </Field>
                <Field label="Phone Number">
                  <Input value={emp.phone || ''} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="(555) 000-0000" />
                </Field>
                <Field label="Date of Birth">
                  <Input type="date" value={emp.dob || ''} onChange={e => set('dob', e.target.value)} className={inputCls} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Home Address">
                    <Textarea value={emp.home_address || ''} onChange={e => set('home_address', e.target.value)} className={`${inputCls} h-20`} placeholder="Street, City, State, ZIP" />
                  </Field>
                </div>
                <div className="md:col-span-2 pt-2 border-t border-zinc-800">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Emergency Contact</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Contact Name">
                      <Input value={emp.emergency_contact_name || ''} onChange={e => set('emergency_contact_name', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Contact Phone">
                      <Input value={emp.emergency_contact_phone || ''} onChange={e => set('emergency_contact_phone', e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EMPLOYMENT */}
          {activeTab === 'employment' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white mb-1">Employment Details</h2>
                <p className="text-xs text-zinc-500">Classification, status, and key dates.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Job Title">
                  <Input value={emp.job_title || ''} onChange={e => set('job_title', e.target.value)} className={inputCls} placeholder="e.g. Detail Technician" />
                </Field>
                <Field label="System Role (App Access)">
                  <Input value={emp.role} disabled className="bg-zinc-950/50 border-zinc-800 text-zinc-500 capitalize" />
                </Field>
                <Field label="Employee Type (Tier / Split %)">
                  <Select value={emp.employee_type || ''} onValueChange={v => set('employee_type', v)}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard Detail Technician">Standard Detail Technician</SelectItem>
                      <SelectItem value="Lead Detail Technician">Lead Detail Technician</SelectItem>
                      <SelectItem value="Independent Contractor">Independent Contractor</SelectItem>
                      <SelectItem value="Shop Manager">Shop Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Employment Status">
                  <Select value={emp.status || 'Active'} onValueChange={v => set('status', v)}>
                    <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Tax Classification">
                  <Select value={emp.tax_classification || ''} onValueChange={v => set('tax_classification', v)}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="W-2">W-2 Employee</SelectItem>
                      <SelectItem value="1099">1099 Contractor</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Hire Date">
                  <Input type="date" value={emp.hire_date || ''} onChange={e => set('hire_date', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Termination Date">
                  <Input type="date" value={emp.termination_date || ''} onChange={e => set('termination_date', e.target.value)} className={inputCls} />
                </Field>
              </div>
            </div>
          )}

          {/* COMPENSATION */}
          {activeTab === 'compensation' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white mb-1">Compensation Profile</h2>
                <p className="text-xs text-zinc-500">Pay structure managed in Staff Management. Notes stored here.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-400 space-y-1">
                  <p className="font-semibold text-zinc-300">Current Pay Settings (from Staff Management)</p>
                  <p>Pay structure: <span className="text-white">{emp.paymentByJob ? 'Per Job' : 'Hourly / Flat Rate'}</span></p>
                  {emp.flatRate && <p>Flat rate: <span className="text-emerald-400">${emp.flatRate}/hr</span></p>}
                  {emp.bonuses && <p>Bonus: <span className="text-emerald-400">${emp.bonuses}</span></p>}
                  <p className="text-zinc-600 italic pt-1">Edit rates from the Employee Card → Edit button in Staff Management.</p>
                </div>
                <div className="md:col-span-2">
                  <Field label="Payment Method Notes / Direct Deposit Info">
                    <Textarea value={emp.payment_method_notes || ''} onChange={e => set('payment_method_notes', e.target.value)}
                      className={`${inputCls} h-28`} placeholder="Routing/account info, Zelle handle, Venmo, check preference, etc. (admin only)" />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* PERFORMANCE */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white mb-1">Performance & Tracking</h2>
                <p className="text-xs text-zinc-500">Internal ratings and notes — not visible to the employee.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Skill Rating (1–5)">
                  <div className="flex items-center gap-2 mt-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => set('skill_rating', n)}
                        className={`h-9 w-9 rounded-lg border text-sm font-bold transition-all ${Number(emp.skill_rating) >= n ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-600'}`}>
                        {n}
                      </button>
                    ))}
                    {emp.skill_rating && (
                      <button onClick={() => set('skill_rating', null)} className="text-xs text-zinc-600 hover:text-zinc-400 ml-1">clear</button>
                    )}
                  </div>
                </Field>
                <Field label="Avg Customer Feedback Score">
                  <Input type="number" step="0.1" min="1" max="5" value={emp.customer_feedback_score || ''} onChange={e => set('customer_feedback_score', e.target.value)} className={inputCls} placeholder="e.g. 4.8" />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Work Ethic & General Performance Notes">
                    <Textarea value={emp.work_ethic_notes || ''} onChange={e => set('work_ethic_notes', e.target.value)} className={`${inputCls} h-32`} placeholder="Reliability, attitude, strengths, areas for improvement…" />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Incident Log (JSON — date + note entries)">
                    <Textarea value={emp.incident_log ? JSON.stringify(emp.incident_log, null, 2) : '[]'}
                      onChange={e => { try { set('incident_log', JSON.parse(e.target.value)); } catch {} }}
                      className={`${inputCls} h-24 font-mono text-xs`} />
                    <p className="text-xs text-zinc-600 mt-1">Format: <code className="text-zinc-500">[{`{"date":"2026-07-01","note":"..."}`}]</code></p>
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Tier Promotion History (JSON)">
                    <Textarea value={emp.tier_promotion_history ? JSON.stringify(emp.tier_promotion_history, null, 2) : '[]'}
                      onChange={e => { try { set('tier_promotion_history', JSON.parse(e.target.value)); } catch {} }}
                      className={`${inputCls} h-24 font-mono text-xs`} />
                    <p className="text-xs text-zinc-600 mt-1">Format: <code className="text-zinc-500">[{`{"date":"2026-01-01","from":"Standard","to":"Lead"}`}]</code></p>
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ADMIN */}
          {activeTab === 'admin' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white mb-1">Admin & Documents</h2>
                <p className="text-xs text-zinc-500">Private admin notes and document tracking.</p>
              </div>
              <div className="space-y-5">
                <Field label="Internal Admin Notes">
                  <Textarea value={emp.internal_notes || ''} onChange={e => set('internal_notes', e.target.value)}
                    className={`${inputCls} h-36`} placeholder="Private notes visible only to admins — HR considerations, hire context, any sensitive info…" />
                </Field>
                <Field label="Documents on File">
                  <Textarea value={emp.documents_on_file ? JSON.stringify(emp.documents_on_file, null, 2) : '[]'}
                    onChange={e => { try { set('documents_on_file', JSON.parse(e.target.value)); } catch {} }}
                    className={`${inputCls} h-28 font-mono text-xs`} />
                  <p className="text-xs text-zinc-600 mt-1">e.g. <code className="text-zinc-500">["W-4","Driver's License","I-9","Direct Deposit Form"]</code></p>
                </Field>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Account Metadata</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-zinc-500">
                    <span>Supabase ID</span><span className="font-mono text-zinc-400 truncate">{emp.id}</span>
                    <span>Email</span><span className="text-zinc-300">{emp.email}</span>
                    <span>Role</span><span className="text-zinc-300 capitalize">{emp.role}</span>
                    <span>Created</span><span className="text-zinc-300">{emp.created_at?.slice(0,10)}</span>
                    <span>Last Updated</span><span className="text-zinc-300">{emp.updated_at?.slice(0,10)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
