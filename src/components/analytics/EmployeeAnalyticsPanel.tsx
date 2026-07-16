import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, AlertTriangle, Star, Calendar, ChevronUp, ChevronDown, ArrowRight, Clock } from 'lucide-react';
import { differenceInDays, differenceInMonths, formatDistanceToNow, isPast, isWithinInterval, addDays } from 'date-fns';

const TIER_COLORS: Record<string, string> = {
  'Standard Detail Technician': '#6366f1',
  'Lead Detail Technician': '#8b5cf6',
  'Independent Contractor': '#f59e0b',
  'Shop Manager': '#10b981',
};
const TYPE_COLORS: Record<string, string> = {
  'Full-Time': '#10b981',
  'Part-Time': '#6366f1',
  'Seasonal': '#f59e0b',
  'On-Call': '#ec4899',
};

type SortKey = 'name' | 'tenure' | 'skill_rating' | 'next_review_date' | 'status' | 'employee_type';

export function EmployeeAnalyticsPanel() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_users')
        .select('id,email,name,role,employee_type,employment_type,status,hire_date,skill_rating,customer_feedback_score,next_review_date,documents_with_expiry,documents_on_file,weekly_availability,tax_classification')
        .in('role', ['admin', 'employee'])
        .order('name');
      setEmployees(data || []);
      setLoading(false);
    })();
  }, []);

  const sort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = employees
    .filter(e => {
      if (statusFilter !== 'all' && (e.status || 'Active') !== statusFilter) return false;
      if (search && !e.name?.toLowerCase().includes(search.toLowerCase()) && !e.email?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === 'tenure') {
        va = a.hire_date ? new Date(a.hire_date).getTime() : 0;
        vb = b.hire_date ? new Date(b.hire_date).getTime() : 0;
        return sortAsc ? va - vb : vb - va;
      }
      if (sortKey === 'next_review_date') {
        va = a.next_review_date ? new Date(a.next_review_date).getTime() : Infinity;
        vb = b.next_review_date ? new Date(b.next_review_date).getTime() : Infinity;
        return sortAsc ? va - vb : vb - va;
      }
      if (sortKey === 'skill_rating') {
        va = a.skill_rating ?? -1; vb = b.skill_rating ?? -1;
        return sortAsc ? va - vb : vb - va;
      }
      va = String(a[sortKey] || ''); vb = String(b[sortKey] || '');
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  // Stats
  const total = employees.length;
  const active = employees.filter(e => (e.status || 'Active') === 'Active').length;
  const inactive = employees.filter(e => e.status === 'Inactive').length;
  const terminated = employees.filter(e => e.status === 'Terminated').length;
  const fullTime = employees.filter(e => e.employment_type === 'Full-Time').length;
  const partTime = employees.filter(e => e.employment_type === 'Part-Time').length;

  // Tier distribution
  const tierDist = Object.entries(
    employees.reduce((acc, e) => {
      const t = e.employee_type || 'Unassigned';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Employment type distribution
  const typeDist = Object.entries(
    employees.reduce((acc, e) => {
      const t = e.employment_type || 'Unset';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Compliance flags
  const today = new Date();
  const warningWindow = addDays(today, 30);
  const complianceFlags: { name: string; doc: string; expiry: string; daysLeft: number }[] = [];
  employees.forEach(e => {
    const docs: { name: string; expiry_date: string }[] = e.documents_with_expiry || [];
    docs.forEach(d => {
      if (!d.expiry_date) return;
      const exp = new Date(d.expiry_date);
      const daysLeft = differenceInDays(exp, today);
      if (daysLeft <= 30) {
        complianceFlags.push({ name: e.name || e.email, doc: d.name, expiry: d.expiry_date, daysLeft });
      }
    });
  });

  // Review overdue
  const reviewOverdue = employees.filter(e => e.next_review_date && isPast(new Date(e.next_review_date)));
  const reviewSoon = employees.filter(e => e.next_review_date && !isPast(new Date(e.next_review_date)) && isWithinInterval(new Date(e.next_review_date), { start: today, end: warningWindow }));

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => sort(k)} className="flex items-center gap-1 hover:text-white transition-colors">
      {label}
      {sortKey === k ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <span className="h-3 w-3" />}
    </button>
  );

  if (loading) return <div className="text-zinc-500 text-sm p-4">Loading employee data...</div>;

  return (
    <div className="space-y-6">
      {/* Headcount Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Staff', value: total, color: 'text-white' },
          { label: 'Active', value: active, color: 'text-emerald-400' },
          { label: 'Inactive', value: inactive, color: 'text-yellow-400' },
          { label: 'Terminated', value: terminated, color: 'text-red-400' },
          { label: 'Full-Time', value: fullTime, color: 'text-indigo-400' },
          { label: 'Part-Time', value: partTime, color: 'text-purple-400' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="bg-zinc-900/60 border-zinc-800 p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-zinc-500 mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-zinc-900/60 border-zinc-800 p-4">
          <p className="text-sm font-semibold text-zinc-300 mb-3">Employee Type Distribution</p>
          {tierDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={tierDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${value}`}>
                  {tierDist.map((entry, i) => (
                    <Cell key={i} fill={TIER_COLORS[entry.name] || `hsl(${i * 60}, 70%, 55%)`} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} labelStyle={{ color: '#e4e4e7' }} />
                <Legend formatter={(v) => <span className="text-xs text-zinc-300">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-zinc-600 text-sm text-center py-8">No employee type data yet</p>}
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800 p-4">
          <p className="text-sm font-semibold text-zinc-300 mb-3">Employment Type Breakdown</p>
          {typeDist.some(t => t.name !== 'Unset') ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={typeDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ value }) => `${value}`}>
                  {typeDist.map((entry, i) => (
                    <Cell key={i} fill={TYPE_COLORS[entry.name] || '#71717a'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} labelStyle={{ color: '#e4e4e7' }} />
                <Legend formatter={(v) => <span className="text-xs text-zinc-300">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-zinc-600 text-sm text-center py-8">Set employment type on each employee profile to see breakdown</p>}
        </Card>
      </div>

      {/* Compliance Flags */}
      {(complianceFlags.length > 0 || reviewOverdue.length > 0 || reviewSoon.length > 0) && (
        <Card className="bg-zinc-900/60 border-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-semibold text-amber-400">Compliance & Review Flags</p>
          </div>
          <div className="space-y-2">
            {reviewOverdue.map(e => (
              <div key={`review-${e.id}`} className="flex items-center justify-between text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <span className="text-red-400 font-medium">{e.name} — Review overdue since {e.next_review_date}</span>
                <Button size="sm" variant="ghost" className="h-6 text-xs text-red-400 hover:text-white" onClick={() => navigate(`/employee-profile/${e.id}`)}>
                  Open <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
            {reviewSoon.map(e => (
              <div key={`soon-${e.id}`} className="flex items-center justify-between text-xs bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                <span className="text-yellow-400 font-medium">{e.name} — Review due {e.next_review_date}</span>
                <Button size="sm" variant="ghost" className="h-6 text-xs text-yellow-400 hover:text-white" onClick={() => navigate(`/employee-profile/${e.id}`)}>
                  Open <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
            {complianceFlags.map((f, i) => (
              <div key={i} className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 border ${f.daysLeft < 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                <span className="font-medium">{f.name} — "{f.doc}" {f.daysLeft < 0 ? `expired ${Math.abs(f.daysLeft)}d ago` : `expires in ${f.daysLeft}d`} ({f.expiry})</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Full Employee Table */}
      <Card className="bg-zinc-900/60 border-zinc-800 p-4">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between mb-4">
          <p className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-400" /> All Staff
          </p>
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs bg-zinc-950 border-zinc-800 w-44" />
            {['all', 'Active', 'Inactive', 'Terminated'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${statusFilter === s ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2 pr-4"><SortBtn k="name" label="Name" /></th>
                <th className="text-left py-2 pr-4"><SortBtn k="employee_type" label="Tier" /></th>
                <th className="text-left py-2 pr-4"><SortBtn k="status" label="Status" /></th>
                <th className="text-left py-2 pr-4"><SortBtn k="tenure" label="Tenure" /></th>
                <th className="text-left py-2 pr-4">Pay</th>
                <th className="text-left py-2 pr-4"><SortBtn k="skill_rating" label="Skill" /></th>
                <th className="text-left py-2 pr-4"><SortBtn k="next_review_date" label="Next Review" /></th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const tenureMonths = e.hire_date ? differenceInMonths(today, new Date(e.hire_date)) : null;
                const reviewDue = e.next_review_date ? new Date(e.next_review_date) : null;
                const reviewOverdue = reviewDue && isPast(reviewDue);
                const statusColor: Record<string, string> = { Active: 'text-emerald-400 bg-emerald-500/10', Inactive: 'text-yellow-400 bg-yellow-500/10', Terminated: 'text-red-400 bg-red-500/10' };
                return (
                  <tr key={e.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-white">{e.name}</div>
                      <div className="text-zinc-600 truncate max-w-[140px]">{e.email}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-zinc-300">{e.employee_type || <span className="text-zinc-700">—</span>}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColor[e.status || 'Active'] || 'text-zinc-400 bg-zinc-800'}`}>
                        {e.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-zinc-400">
                      {tenureMonths !== null ? `${tenureMonths < 12 ? `${tenureMonths}mo` : `${Math.floor(tenureMonths / 12)}y ${tenureMonths % 12}mo`}` : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-zinc-400">{e.employment_type || <span className="text-zinc-700">—</span>}</td>
                    <td className="py-2.5 pr-4">
                      {e.skill_rating ? <span className="text-amber-400">{'★'.repeat(e.skill_rating)}{'☆'.repeat(5 - e.skill_rating)}</span> : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="py-2.5 pr-4">
                      {reviewDue ? (
                        <span className={reviewOverdue ? 'text-red-400 font-semibold' : isWithinInterval(reviewDue, { start: today, end: warningWindow }) ? 'text-amber-400' : 'text-zinc-400'}>
                          {e.next_review_date}
                          {reviewOverdue && ' ⚠'}
                        </span>
                      ) : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="py-2.5">
                      <Button size="sm" variant="ghost" className="h-6 text-xs text-indigo-400 hover:text-white" onClick={() => navigate(`/employee-profile/${e.id}`)}>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-zinc-600">No employees match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
