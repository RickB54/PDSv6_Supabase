import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { getSupabaseInvoices, upsertSupabaseInvoice } from "@/lib/supa-data";
import { DollarSign, Clock, TrendingUp, AlertTriangle, Filter, CheckCircle, Database } from "lucide-react";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizeVehicleType } from "@/lib/pricingHelpers";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function TimeProfitabilityPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const invs = await getSupabaseInvoices();
      setInvoices(invs || []);
      setLoading(false);
    }
    load();
  }, []);

  const filterInvoices = () => {
    const now = new Date();
    return invoices.filter(inv => {
      // Must have hours worked to calculate metrics
      if (!inv.hoursWorked || inv.hoursWorked <= 0) return false;

      const invDateStr = inv.serviceDate || inv.date || inv.createdAt;
      const invDate = invDateStr ? new Date(invDateStr) : new Date();

      let passQuick = true;
      if (dateFilter === "daily") passQuick = invDate.toDateString() === now.toDateString();
      else if (dateFilter === "weekly") passQuick = invDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (dateFilter === "monthly") passQuick = invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
      else if (dateFilter === "yearly") passQuick = invDate.getFullYear() === now.getFullYear();

      let passRange = true;
      if (dateRange.from) passRange = invDate >= new Date(dateRange.from.setHours(0, 0, 0, 0));
      if (passRange && dateRange.to) passRange = invDate <= new Date(dateRange.to.setHours(23, 59, 59, 999));

      let passCustomer = true;
      if (customerFilter !== "all") {
        const cust = inv.customerName || "Unknown Customer";
        passCustomer = cust === customerFilter;
      }

      return passQuick && passRange && passCustomer;
    });
  };

  const filtered = filterInvoices();

  const calculateMetrics = (invList: any[]) => {
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalNetPayout = 0;
    let totalHours = 0;

    invList.forEach(inv => {
      const rev = inv.total || 0;
      const cost = inv.productCost || 0;
      const hrs = inv.hoursWorked || 0;
      // Use stripeNetPayout if available, otherwise assume 0 fees and use rev
      const netPayout = inv.stripeNetPayout !== undefined ? inv.stripeNetPayout : rev;

      totalRevenue += rev;
      totalProfit += (netPayout - cost);
      totalNetPayout += netPayout;
      totalHours += hrs;
    });

    return {
      revenuePerHour: totalHours > 0 ? totalRevenue / totalHours : 0,
      profitPerHour: totalHours > 0 ? totalProfit / totalHours : 0,
      netPayoutPerHour: totalHours > 0 ? totalNetPayout / totalHours : 0,
      totalHours,
      totalRevenue,
      totalProfit,
      totalNetPayout,
      count: invList.length
    };
  };

  const overall = calculateMetrics(filtered);

  // Groupings
  const byVehicle: Record<string, any[]> = {};
  const byMethod: Record<string, any[]> = {};
  const byMonth: Record<string, any[]> = {};

  const byCustomer: Record<string, any[]> = {};

  filtered.forEach(inv => {
    const vClass = normalizeVehicleType(inv.vehicle || "");
    if (!byVehicle[vClass]) byVehicle[vClass] = [];
    byVehicle[vClass].push(inv);

    const mthd = inv.hoursMethod || "manual";
    if (!byMethod[mthd]) byMethod[mthd] = [];
    byMethod[mthd].push(inv);

    const d = inv.serviceDate ? new Date(inv.serviceDate) : (inv.date ? new Date(inv.date) : new Date());
    const mStr = d.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!byMonth[mStr]) byMonth[mStr] = [];
    byMonth[mStr].push(inv);

    const cust = inv.customerName || "Unknown Customer";
    if (!byCustomer[cust]) byCustomer[cust] = [];
    byCustomer[cust].push(inv);
  });

  // Calculate worst performing jobs (Drag List)
  const dragList = [...filtered].sort((a, b) => {
    const aRevHr = (a.total || 0) / (a.hoursWorked || 1);
    const bRevHr = (b.total || 0) / (b.hoursWorked || 1);
    return aRevHr - bRevHr;
  }).slice(0, 10);

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading Profitability Data...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <PageHeader 
        title="Time & Profitability" 
        subtitle="Track average revenue and profit per hour to optimize your business operations."
      />

      <div className="flex flex-col md:flex-row gap-4 items-end bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
        <div className="space-y-2 w-full md:w-auto">
          <label className="text-xs text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-2">
            <Filter className="h-3 w-3" /> Quick Filter
          </label>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-700 text-white">
              <SelectValue placeholder="Filter by date..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="daily">Today</SelectItem>
              <SelectItem value="weekly">Last 7 Days</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
              <SelectItem value="custom">Custom Range...</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2 w-full md:w-auto">
          <label className="text-xs text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-2">
            <Filter className="h-3 w-3" /> Customer
          </label>
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-full md:w-[220px] bg-zinc-900 border-zinc-700 text-white">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">All Customers</SelectItem>
              {Array.from(new Set(invoices.map(i => i.customerName || "Unknown Customer"))).sort().map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dateFilter === "custom" && (
          <div className="w-full md:w-auto mt-4 md:mt-0">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
        )}

        <div className="md:ml-auto w-full md:w-auto mt-4 md:mt-0 flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-white">
                <Database className="w-4 h-4 mr-2 text-blue-400" />
                Backfill Historical Data
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl bg-zinc-950 border-zinc-800 text-white max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Backfill Time & Profitability Data</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-zinc-400 mb-4">
                This list shows all past jobs that are missing hours-worked data. Enter the hours below and save individually to instantly update your analytics.
              </p>
              <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {invoices.filter(i => !i.hoursWorked || i.hoursWorked <= 0).sort((a,b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).map(inv => (
                  <BackfillRow key={inv.id} invoice={inv} onUpdate={(updated) => {
                    setInvoices(prev => prev.map(p => p.id === updated.id ? updated : p));
                  }} />
                ))}
                {invoices.filter(i => !i.hoursWorked || i.hoursWorked <= 0).length === 0 && (
                  <div className="text-center text-zinc-500 italic py-8">All your invoices have hours tracked! 🎉</div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card className="p-6 bg-emerald-900/10 border-emerald-500/20">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            <h3 className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Revenue / Hour</h3>
          </div>
          <div className="text-4xl font-black text-emerald-400">${overall.revenuePerHour.toFixed(2)}</div>
          <div className="text-sm text-zinc-500 mt-2">Gross average across {overall.count} tracked jobs</div>
        </Card>

        <Card className="p-6 bg-purple-900/10 border-purple-500/20">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-5 w-5 text-purple-400" />
            <h3 className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Net Payout / Hour</h3>
          </div>
          <div className="text-4xl font-black text-purple-400">${overall.netPayoutPerHour.toFixed(2)}</div>
          <div className="text-sm text-zinc-500 mt-2">Actual net average (after Stripe fees)</div>
        </Card>

        <Card className="p-6 bg-blue-900/10 border-blue-500/20">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            <h3 className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Profit / Hour</h3>
          </div>
          <div className="text-4xl font-black text-blue-400">${overall.profitPerHour.toFixed(2)}</div>
          <div className="text-sm text-zinc-500 mt-2">Net average after product costs</div>
        </Card>

        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="h-5 w-5 text-white" />
            <h3 className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Total Profit</h3>
          </div>
          <div className="text-4xl font-black text-white">${overall.totalProfit.toFixed(2)}</div>
          <div className="text-sm text-zinc-500 mt-2">Absolute profit across {overall.count} jobs</div>
        </Card>

        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-5 w-5 text-zinc-400" />
            <h3 className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Total Tracked Hours</h3>
          </div>
          <div className="text-4xl font-black text-white">{overall.totalHours.toFixed(1)} <span className="text-xl text-zinc-500 font-medium">hrs</span></div>
          <div className="text-sm text-zinc-500 mt-2">Based on current filter selection</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Breakdowns */}
        <div className="space-y-6">
          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <h3 className="text-lg font-bold text-white mb-4">Breakdown by Vehicle Class</h3>
            <div className="space-y-3">
              {Object.keys(byVehicle).length === 0 ? (
                <div className="text-zinc-500 italic text-sm py-8 text-center border border-dashed border-zinc-800 rounded-lg">No data available for the selected period.</div>
              ) : (
                <>
                  <div className="h-64 w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Object.entries(byVehicle).map(([k, list]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), RevHr: calculateMetrics(list).revenuePerHour, ProfHr: calculateMetrics(list).profitPerHour, NetHr: calculateMetrics(list).netPayoutPerHour }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                          itemStyle={{ color: '#e4e4e7' }}
                          formatter={(value: number) => [`$${value.toFixed(2)}/hr`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="RevHr" name="Revenue/Hr" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="NetHr" name="Net Payout/Hr" fill="#c084fc" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="ProfHr" name="Profit/Hr" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {Object.entries(byVehicle).sort((a, b) => b[1].length - a[1].length).map(([vClass, list]) => {
                    const metrics = calculateMetrics(list);
                    return (
                      <div key={vClass} className="flex justify-between items-center p-3 rounded bg-zinc-950 border border-zinc-800/50">
                        <div>
                          <div className="text-white font-medium capitalize">{vClass}</div>
                          <div className="text-xs text-zinc-500">{metrics.count} jobs • {metrics.totalHours.toFixed(1)} hrs</div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Rev/Hr</div>
                            <div className="text-emerald-400 font-mono font-bold">${metrics.revenuePerHour.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Net/Hr</div>
                            <div className="text-purple-400 font-mono font-bold">${metrics.netPayoutPerHour.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Prof/Hr</div>
                            <div className="text-blue-400 font-mono font-bold">${metrics.profitPerHour.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <h3 className="text-lg font-bold text-white mb-4">Breakdown by Month</h3>
            <div className="space-y-3">
              {Object.keys(byMonth).length === 0 ? (
                <div className="text-zinc-500 italic text-sm py-8 text-center border border-dashed border-zinc-800 rounded-lg">No data available for the selected period.</div>
              ) : (
                <>
                  <div className="h-64 w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Object.entries(byMonth).map(([k, list]) => ({ name: k, RevHr: calculateMetrics(list).revenuePerHour, ProfHr: calculateMetrics(list).profitPerHour, NetHr: calculateMetrics(list).netPayoutPerHour }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                          itemStyle={{ color: '#e4e4e7' }}
                          formatter={(value: number) => [`$${value.toFixed(2)}/hr`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="RevHr" name="Revenue/Hr" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="NetHr" name="Net Payout/Hr" fill="#c084fc" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="ProfHr" name="Profit/Hr" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {Object.entries(byMonth).map(([month, list]) => {
                    const metrics = calculateMetrics(list);
                    return (
                      <div key={month} className="flex justify-between items-center p-3 rounded bg-zinc-950 border border-zinc-800/50">
                        <div>
                          <div className="text-white font-medium">{month}</div>
                          <div className="text-xs text-zinc-500">{metrics.count} jobs • {metrics.totalHours.toFixed(1)} hrs</div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Rev/Hr</div>
                            <div className="text-emerald-400 font-mono font-bold">${metrics.revenuePerHour.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Net/Hr</div>
                            <div className="text-purple-400 font-mono font-bold">${metrics.netPayoutPerHour.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Prof/Hr</div>
                            <div className="text-blue-400 font-mono font-bold">${metrics.profitPerHour.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <h3 className="text-lg font-bold text-white mb-4">Breakdown by Entry Method</h3>
            <div className="space-y-3">
              {Object.keys(byMethod).length === 0 ? (
                <div className="text-zinc-500 italic text-sm py-8 text-center border border-dashed border-zinc-800 rounded-lg">No data available for the selected period.</div>
              ) : (
                <>
                  <div className="h-64 w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Object.entries(byMethod).map(([k, list]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), RevHr: calculateMetrics(list).revenuePerHour, ProfHr: calculateMetrics(list).profitPerHour, NetHr: calculateMetrics(list).netPayoutPerHour }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                          itemStyle={{ color: '#e4e4e7' }}
                          formatter={(value: number) => [`$${value.toFixed(2)}/hr`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="RevHr" name="Revenue/Hr" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="NetHr" name="Net Payout/Hr" fill="#c084fc" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="ProfHr" name="Profit/Hr" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {Object.entries(byMethod).map(([method, list]) => {
                    const metrics = calculateMetrics(list);
                    return (
                      <div key={method} className="flex justify-between items-center p-3 rounded bg-zinc-950 border border-zinc-800/50">
                        <div>
                          <div className="text-white font-medium capitalize">{method}</div>
                          <div className="text-xs text-zinc-500">{metrics.count} jobs • {metrics.totalHours.toFixed(1)} hrs</div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Rev/Hr</div>
                            <div className="text-emerald-400 font-mono font-bold">${metrics.revenuePerHour.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Net/Hr</div>
                            <div className="text-purple-400 font-mono font-bold">${metrics.netPayoutPerHour.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Prof/Hr</div>
                            <div className="text-blue-400 font-mono font-bold">${metrics.profitPerHour.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Drag List */}
        <div>
          <Card className="p-6 bg-red-900/5 border-red-500/10">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <h3 className="text-lg font-bold text-white">Lowest $/Hour "Drag" List</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              These are the lowest performing jobs. Review these to identify services that are taking too long or not priced correctly.
            </p>
            <div className="space-y-3">
              {dragList.length === 0 ? (
                <div className="text-zinc-500 italic text-sm">No jobs match your filters.</div>
              ) : (
                dragList.map(inv => {
                  const rev = inv.total || 0;
                  const cost = inv.productCost || 0;
                  const hrs = inv.hoursWorked || 1;
                  const revHr = rev / hrs;
                  const profHr = (rev - cost) / hrs;
                  return (
                    <Link key={inv.id} to={`/invoicing?editId=${inv.id}`} className="block">
                      <div className="group flex justify-between items-center p-3 rounded bg-zinc-950 border border-zinc-800/50 hover:border-red-500/30 transition-colors">
                        <div>
                          <div className="text-white font-medium group-hover:text-red-400 transition-colors">
                            {inv.customerName} - {inv.vehicle}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1 flex gap-2">
                            <span>{new Date(inv.serviceDate || inv.date || inv.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="font-mono">{hrs} hrs</span>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div className="bg-emerald-900/20 text-emerald-400 px-2 py-1 rounded text-xs font-mono font-bold border border-emerald-500/10">
                            R: ${revHr.toFixed(2)}/h
                          </div>
                          <div className="bg-blue-900/20 text-blue-400 px-2 py-1 rounded text-xs font-mono font-bold border border-blue-500/10">
                            P: ${profHr.toFixed(2)}/h
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <h3 className="text-lg font-bold text-white mb-4">Breakdown by Customer</h3>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {Object.keys(byCustomer).length === 0 ? (
            <div className="text-zinc-500 italic text-sm py-8 text-center border border-dashed border-zinc-800 rounded-lg">No data available for the selected period.</div>
          ) : (
            Object.entries(byCustomer).sort((a, b) => b[1].length - a[1].length).map(([customer, list]) => {
              const metrics = calculateMetrics(list);
              return (
                <div key={customer} className="flex justify-between items-center p-3 rounded bg-zinc-950 border border-zinc-800/50">
                  <div>
                    <div className="text-white font-medium">{customer}</div>
                    <div className="text-xs text-zinc-500">{metrics.count} jobs • {metrics.totalHours.toFixed(1)} hrs</div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Rev/Hr</div>
                      <div className="text-emerald-400 font-mono font-bold">${metrics.revenuePerHour.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Net/Hr</div>
                      <div className="text-purple-400 font-mono font-bold">${metrics.netPayoutPerHour.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Prof/Hr</div>
                      <div className="text-blue-400 font-mono font-bold">${metrics.profitPerHour.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

    </div>
  );
}

function BackfillRow({ invoice, onUpdate }: { invoice: any, onUpdate: (inv: any) => void }) {
  const [hours, setHours] = useState<string>("");
  const [cost, setCost] = useState<string>(invoice.productCost?.toString() || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!hours) return;
    setSaving(true);
    try {
      const h = parseFloat(hours);
      const c = cost ? parseFloat(cost) : 0;
      const payload = { ...invoice, hoursWorked: h, productCost: c, hoursMethod: "manual" };
      await upsertSupabaseInvoice(payload);
      setSaved(true);
      onUpdate(payload);
    } catch (err) {
      console.error(err);
      alert("Failed to update invoice.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) return null; // Hide from list once saved

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate">{invoice.customerName} - {invoice.vehicle}</div>
        <div className="text-xs text-zinc-500 mt-1">
          {new Date(invoice.serviceDate || invoice.date || invoice.createdAt).toLocaleDateString()} • Inv #{invoice.invoiceNumber || invoice.id?.substring(0, 6)} • Total: ${invoice.total || 0}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400">Hours:</label>
          <Input 
            type="number" 
            step="0.5" 
            placeholder="e.g. 2.5"
            value={hours} 
            onChange={(e) => setHours(e.target.value)} 
            className="w-20 bg-zinc-950 border-zinc-700 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400">Cost $:</label>
          <Input 
            type="number" 
            step="1" 
            placeholder="e.g. 15"
            value={cost} 
            onChange={(e) => setCost(e.target.value)} 
            className="w-20 bg-zinc-950 border-zinc-700 h-8 text-sm"
          />
        </div>
        <Button 
          size="sm" 
          onClick={handleSave} 
          disabled={!hours || saving}
          className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving ? "..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
