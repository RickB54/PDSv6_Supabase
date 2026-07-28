import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from "recharts";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Activity, 
  ChevronRight, 
  History,
  Download,
  Filter,
  UserCheck,
  Building,
  Target,
  X,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { getCustomerDetailedHistory } from "@/lib/supa-data";
import { exportCustomerHistoryPDF } from "@/lib/pdf-export";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { servicePackages, addOns, getAddOnPrice, getServicePrice, type VehicleType, getCanonicalAddonName } from "@/lib/services";

const mapToServiceVehicleType = (type: string = ""): VehicleType => {
  const t = type.toLowerCase();
  if (t.includes('compact') || t.includes('sedan')) return 'compact';
  if (t.includes('mid') || t.includes('suv')) {
    if (t.includes('large') || t.includes('truck') || t.includes('van')) return 'truck';
    return 'midsize';
  }
  if (t.includes('truck') || t.includes('van') || t.includes('large')) return 'truck';
  if (t.includes('luxury')) return 'luxury';
  return 'compact'; // default
};

interface CustomerIntelligence360ModalProps {
  customers: any[];
  trigger?: React.ReactNode;
  inline?: boolean;
}

export function CustomerIntelligence360Modal({ customers, trigger, inline = false }: CustomerIntelligence360ModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);
  
  // Combobox states
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Filter state
  const [customerFilter, setCustomerFilter] = useState<'all' | 'customer' | 'prospect'>('all');

  // Sorting customers alphabetically and applying filter
  const filteredCustomers = useMemo(() => {
    let result = [...customers];
    if (customerFilter !== 'all') {
      result = result.filter(c => (c.type || 'customer').toLowerCase() === customerFilter);
    }
    return result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [customers, customerFilter]);

  useEffect(() => {
    if (selectedCustomerId && (isOpen || inline)) {
      loadCustomerData(selectedCustomerId);
    } else {
      setHistoryData(null);
    }
  }, [selectedCustomerId, isOpen, inline]);

  const loadCustomerData = async (id: string) => {
    setLoading(true);
    try {
      const data = await getCustomerDetailedHistory(id);
      setHistoryData(data);
    } catch (error) {
      console.error("Failed to load customer history:", error);
      toast.error("Failed to load customer intelligence data.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!historyData) return;
    try {
      await exportCustomerHistoryPDF(historyData);
      toast.success("Intelligence report exported successfully.");
    } catch (error) {
      toast.error("Failed to generate PDF report.");
    }
  };

  const stats = useMemo(() => {
    if (!historyData) return null;
    const { invoices, bookings, estimates, engagements } = historyData;
    
    const ltv = invoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
    const paid = invoices.reduce((sum: number, inv: any) => sum + (inv.paid_amount || 0), 0);
    const visits = bookings.length;
    const avgVisit = visits > 0 ? ltv / visits : 0;
    const collectionRate = ltv > 0 ? (paid / ltv) * 100 : 0;

    return { ltv, paid, visits, avgVisit, collectionRate, estimatesCount: estimates.length, engagementsCount: engagements.length };
  }, [historyData]);

  const chartData = useMemo(() => {
    if (!historyData) return [];
    return [
      { name: 'Visits', count: historyData.bookings.length, color: '#3b82f6' },
      { name: 'Invoices', count: historyData.invoices.length, color: '#10b981' },
      { name: 'Estimates', count: historyData.estimates.length, color: '#f59e0b' },
      { name: 'Notes', count: historyData.engagements.length, color: '#ec4899' },
    ];
  }, [historyData]);

  const ledger = useMemo(() => {
    if (!historyData) return [];
    const items: any[] = [];
    
    historyData.bookings.forEach((b: any) => {
      const vType = mapToServiceVehicleType(b.vehicle || b.vehicleType || '');
      const svcName = b.service || b.service_package || '';
      const svc = servicePackages.find(s => s.name === svcName || s.id === svcName);
      const basePrice = svc ? getServicePrice(svc.id, vType) : 0;

      const addons = b.addons || b.add_ons || [];
      const addonsArray = Array.isArray(addons) ? addons : (typeof addons === 'string' ? JSON.parse(addons) : []);
      const addonBreakdown = addonsArray.map((a: string) => {
        const canonical = getCanonicalAddonName(a);
        const addonDef = addOns.find(ad => ad.name === canonical);
        const price = addonDef ? getAddOnPrice(addonDef.id, vType) : 0;
        return `${canonical} ($${price})`;
      });

      items.push({
        date: b.date || b.created_at,
        type: 'BOOKING',
        activity: b.service || 'Service',
        details: {
          vehicle: `${b.vehicleYear || ''} ${b.vehicleMake || ''} ${b.vehicleModel || ''}${b.vehicleColor ? ` (${b.vehicleColor})` : ''}`.trim() || 'N/A',
          basePrice: basePrice.toFixed(2),
          addons: addonBreakdown,
          probonoReason: b.probonoReason || null,
          probonoPrimaryReason: b.probonoPrimaryReason || null,
          probonoReasons: b.probonoReasons || []
        },
        value: b.price || 0,
        status: b.status,
        raw: b
      });
    });

    historyData.invoices.forEach((i: any) => items.push({
      date: i.date || i.created_at,
      type: 'INVOICE',
      activity: `INV #${i.invoice_number}`,
      details: i.vehicle || 'N/A',
      value: i.total || 0,
      status: i.status,
      raw: i
    }));

    historyData.estimates.forEach((e: any) => items.push({
      date: e.date || e.created_at,
      type: 'ESTIMATE',
      activity: `EST #${e.estimate_number}`,
      details: 'Quote',
      value: e.total || 0,
      status: e.status,
      raw: e
    }));

    historyData.engagements.forEach((e: any) => items.push({
      date: e.created_at,
      type: 'NOTE',
      activity: 'Interaction',
      details: e.type || 'General',
      value: null,
      status: 'Logged',
      raw: e
    }));

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [historyData]);

  const content = (
    <>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-pink-500 z-50" />
      
      {!inline && (
        <DialogClose className="absolute right-2 top-2 z-[150] rounded-full p-3 bg-red-600 text-white hover:bg-red-700 transition-all shadow-2xl scale-110 md:scale-100">
          <X className="w-6 h-6" />
          <span className="sr-only">Close Modal</span>
        </DialogClose>
      )}

      <div className={cn("p-6 pb-2", inline ? "pt-8" : "")}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pr-10 md:pr-0">
            <div>
              {inline ? (
                  <h2 className="text-2xl font-black tracking-tighter text-zinc-100 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-blue-500" />
                    CUSTOMER INTELLIGENCE 360
                  </h2>
              ) : (
                  <DialogTitle className="text-2xl font-black tracking-tighter text-zinc-100 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-blue-500" />
                    CUSTOMER INTELLIGENCE 360
                  </DialogTitle>
              )}
              
              {inline ? (
                  <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest mt-1">
                    Deep-dive operational analytics & customer relationship audit
                  </p>
              ) : (
                  <DialogDescription className="text-zinc-400 text-xs font-medium uppercase tracking-widest mt-1">
                    Deep-dive operational analytics & customer relationship audit
                  </DialogDescription>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-64 hidden md:block">
                <Popover open={desktopOpen} onOpenChange={setDesktopOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={desktopOpen}
                      className="w-full justify-between bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-800 focus:ring-blue-500 font-normal"
                    >
                      {selectedCustomerId
                        ? customers.find((c) => c.id === selectedCustomerId)?.name || "Select Profile..."
                        : "Select Customer/Prospect..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 bg-zinc-900 border-zinc-800" align="end">
                    <Command className="bg-transparent text-zinc-100">
                      <div className="flex p-1 border-b border-zinc-800 bg-zinc-950/50">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn("h-7 text-[10px] flex-1", customerFilter === 'all' ? "bg-zinc-800 text-white" : "text-zinc-400")} 
                          onClick={() => setCustomerFilter('all')}
                        >
                          ALL
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn("h-7 text-[10px] flex-1", customerFilter === 'customer' ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400")} 
                          onClick={() => setCustomerFilter('customer')}
                        >
                          CUSTOMERS
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn("h-7 text-[10px] flex-1", customerFilter === 'prospect' ? "bg-pink-500/20 text-pink-400" : "text-zinc-400")} 
                          onClick={() => setCustomerFilter('prospect')}
                        >
                          PROSPECTS
                        </Button>
                      </div>
                      <CommandInput placeholder="Search name, phone, email..." className="h-9" />
                      <CommandList className="max-h-80">
                        <CommandEmpty className="py-6 text-center text-sm text-zinc-500">No profile found.</CommandEmpty>
                        <CommandGroup>
                          {filteredCustomers.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={(currentValue) => {
                                setSelectedCustomerId(c.id);
                                setDesktopOpen(false);
                              }}
                              className="aria-selected:bg-zinc-800 aria-selected:text-white text-zinc-300"
                            >
                              <div className="flex items-center gap-2 w-full">
                                {c.type === 'prospect' ? <Target className="w-3 h-3 text-pink-400" /> : <UserCheck className="w-3 h-3 text-emerald-400" />}
                                <span>{c.name}</span>
                                <span className="text-[10px] text-zinc-500 opacity-50 ml-auto flex items-center gap-2">
                                  {c.phone && <span className="truncate max-w-[80px]">{c.phone}</span>}
                                  {c.type?.toUpperCase() || 'CUSTOMER'}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              {historyData && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleExportPDF}
                  className="bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 h-9"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Export 360</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              )}
              
              {!inline && (
                <DialogClose asChild>
                  <Button variant="ghost" className="hidden md:flex text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white">
                    Close Profile
                  </Button>
                </DialogClose>
              )}
            </div>
          </div>
          
          {/* Mobile Search Selector (below title on mobile) */}
          <div className="mt-4 md:hidden">
            <Popover open={mobileOpen} onOpenChange={setMobileOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={mobileOpen}
                  className="w-full justify-between bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-800 focus:ring-blue-500 font-normal"
                >
                  {selectedCustomerId
                    ? customers.find((c) => c.id === selectedCustomerId)?.name || "Select Profile..."
                    : "Select Customer/Prospect..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-48px)] p-0 bg-zinc-900 border-zinc-800" align="start">
                <Command className="bg-transparent text-zinc-100">
                  <div className="flex p-1 border-b border-zinc-800 bg-zinc-950/50">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn("h-7 text-[10px] flex-1", customerFilter === 'all' ? "bg-zinc-800 text-white" : "text-zinc-400")} 
                      onClick={() => setCustomerFilter('all')}
                    >
                      ALL
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn("h-7 text-[10px] flex-1", customerFilter === 'customer' ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400")} 
                      onClick={() => setCustomerFilter('customer')}
                    >
                      CUSTOMERS
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn("h-7 text-[10px] flex-1", customerFilter === 'prospect' ? "bg-pink-500/20 text-pink-400" : "text-zinc-400")} 
                      onClick={() => setCustomerFilter('prospect')}
                    >
                      PROSPECTS
                    </Button>
                  </div>
                  <CommandInput placeholder="Search name, phone, email..." className="h-9" />
                  <CommandList className="max-h-80">
                    <CommandEmpty className="py-6 text-center text-sm text-zinc-500">No profile found.</CommandEmpty>
                    <CommandGroup>
                      {filteredCustomers.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={(currentValue) => {
                            setSelectedCustomerId(c.id);
                            setMobileOpen(false);
                          }}
                          className="aria-selected:bg-zinc-800 aria-selected:text-white text-zinc-300"
                        >
                          <div className="flex items-center gap-2 w-full">
                            {c.type === 'prospect' ? <Target className="w-3 h-3 text-pink-400" /> : <UserCheck className="w-3 h-3 text-emerald-400" />}
                            <span>{c.name}</span>
                            <span className="text-[10px] text-zinc-500 opacity-50 ml-auto flex items-center gap-2">
                              {c.phone && <span className="truncate max-w-[80px] hidden sm:inline">{c.phone}</span>}
                              {c.type?.toUpperCase() || 'CUSTOMER'}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!selectedCustomerId ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-zinc-800 rounded-2xl">
              <div className="p-4 bg-zinc-900 rounded-full">
                <Target className="w-12 h-12 text-zinc-700" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-300">No Intelligence Profile Selected</h3>
                <p className="text-zinc-500 max-w-sm mx-auto mt-2">Choose a customer or prospect from the menu above to unlock their full 360-degree performance profile.</p>
              </div>
            </div>
          ) : loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-zinc-400 font-bold animate-pulse">Aggregating Intelligence Data...</p>
            </div>
          ) : historyData && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              {/* Profile Overview Card */}
              <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                          <User className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-zinc-100 uppercase">{historyData.customer.name}</h2>
                          <Badge variant="outline" className={cn(
                            "mt-1 text-[10px] uppercase font-black tracking-widest",
                            historyData.customer.type === 'prospect' ? "text-pink-400 border-pink-500/20" : "text-emerald-400 border-emerald-500/20"
                          )}>
                            {historyData.customer.type || 'Customer'}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Mail className="w-4 h-4" /> {historyData.customer.email || 'No email on file'}
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Phone className="w-4 h-4" /> {historyData.customer.phone || 'No phone on file'}
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400">
                          <MapPin className="w-4 h-4" /> {historyData.customer.address || 'No address provided'}
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Lifetime Value', val: `$${stats?.ltv.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400' },
                        { label: 'Total Visits', val: stats?.visits, icon: History, color: 'text-blue-400' },
                        { label: 'Avg Visit', val: `$${stats?.avgVisit.toFixed(2)}`, icon: TrendingUp, color: 'text-indigo-400' },
                        { label: 'Collection', val: `${Math.round(stats?.collectionRate || 0)}%`, icon: Activity, color: 'text-orange-400' },
                      ].map((stat, i) => (
                        <div key={i} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                          <stat.icon className={cn("w-5 h-5 mb-2", stat.color)} />
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{stat.label}</p>
                          <p className="text-xl font-black text-zinc-100">{stat.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Engagement Chart */}
                <Card className="bg-zinc-900/50 border-zinc-800 lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">Engagement Mix</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            stroke="#52525b" 
                            fontSize={10} 
                            tickMargin={10}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#52525b" 
                            fontSize={10} 
                            axisLine={false}
                          />
                          <Tooltip 
                            cursor={{ fill: '#27272a', opacity: 0.4 }}
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Garage Archive */}
                <Card className="bg-zinc-900/50 border-zinc-800 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">Customer Garage</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-zinc-950/50">
                        <TableRow className="border-zinc-800">
                          <TableHead className="text-[10px] font-black uppercase">Vehicle Specification</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Type</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Color</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Media</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyData.customer.vehicles?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-zinc-600 italic">No vehicles archived.</TableCell>
                          </TableRow>
                        ) : (
                          historyData.customer.vehicles.map((v: any) => (
                            <TableRow key={v.id} className="border-zinc-800 hover:bg-zinc-800/30">
                              <TableCell className="font-bold text-zinc-200">
                                {v.year} {v.make} {v.model}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-[9px] uppercase">{v.type || 'N/A'}</Badge>
                              </TableCell>
                              <TableCell className="text-zinc-400 text-xs">{v.color || 'N/A'}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className="text-blue-400 border-blue-500/20 text-[9px]">
                                  {(v.generalPhotos?.length || 0) + (v.beforePhotos?.length || 0) + (v.afterPhotos?.length || 0)} ASSETS
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Ledger */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">Activity Ledger (Consolidated)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-zinc-950 sticky top-0 z-10">
                        <TableRow className="border-zinc-800">
                          <TableHead className="text-[10px] font-black uppercase w-[120px]">Date</TableHead>
                          <TableHead className="text-[10px] font-black uppercase w-[100px]">Source</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Activity</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Technical Specs</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledger.map((item, idx) => (
                          <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-800/30">
                            <TableCell className="text-[10px] font-mono text-zinc-500">
                              <div className="font-semibold text-zinc-300">{format(parseISO(item.date), "MMM dd, yyyy p")}</div>
                              {item.raw?.created_at && item.type === 'BOOKING' && (
                                <div className="text-[9px] text-zinc-500 italic mt-0.5" title="Time Placed">Placed: {format(parseISO(item.raw.created_at), "MMM dd, yyyy p")}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[9px] font-black tracking-widest uppercase",
                                  item.type === 'BOOKING' ? "text-blue-400 border-blue-500/20" :
                                  item.type === 'INVOICE' ? "text-emerald-400 border-emerald-500/20" :
                                  item.type === 'ESTIMATE' ? "text-orange-400 border-orange-500/20" :
                                  "text-pink-400 border-pink-500/20"
                                )}
                              >
                                {item.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold text-zinc-200">{item.activity}</TableCell>
                             <TableCell className="text-zinc-400 text-[10px]">
                               {item.type === 'BOOKING' ? (
                                 <div className="space-y-1 py-1">
                                   <div className="font-semibold text-zinc-300">{item.details.vehicle}</div>
                                   <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px]">
                                     <span className="text-zinc-500">Base: <strong className="text-emerald-500/80">${item.details.basePrice}</strong></span>
                                     {item.details.addons.length > 0 && (
                                       <span className="text-zinc-500">
                                         Add-ons: <strong className="text-blue-400/80">{item.details.addons.join(', ')}</strong>
                                       </span>
                                     )}
                                     {(item.details.probonoPrimaryReason || item.details.probonoReason) && (
                                       <span className="text-pink-400 font-black uppercase text-[8px] bg-pink-500/10 border border-pink-500/20 px-1 py-0.5 rounded ml-1" title={item.details.probonoReasons?.join(', ')}>
                                         PROBONO: {item.details.probonoPrimaryReason || item.details.probonoReason}
                                         {item.details.probonoReasons && item.details.probonoReasons.length > 1 && ` +${item.details.probonoReasons.length - 1}`}
                                       </span>
                                     )}
                                   </div>
                                   {(() => {
                                     const rawH = item.raw?.rescheduleHistory || item.raw?.booking_vehicle?.reschedule_history || [];
                                     const rH = Array.isArray(rawH) ? rawH : [];
                                     if (rH.length === 0) return null;
                                     return (
                                       <div className="mt-1.5 border-t border-zinc-800/80 pt-1.5 space-y-1">
                                         <div className="text-[9px] font-black uppercase text-cyan-400 flex items-center gap-1">
                                           🔄 Rescheduled Dates:
                                         </div>
                                         <div className="space-y-0.5">
                                           {rH.map((rhItem: any, idx: number) => {
                                             let oldStr = 'N/A';
                                             let newStr = 'N/A';
                                             try { oldStr = format(parseISO(rhItem.originalDate), 'MMM d, yyyy @ h:mm a'); } catch(e){}
                                             try { newStr = format(parseISO(rhItem.newDate), 'MMM d, yyyy @ h:mm a'); } catch(e){}
                                             return (
                                               <div key={idx} className="text-[8px] text-zinc-500 font-mono">
                                                 • {oldStr} ➜ {newStr}
                                               </div>
                                             );
                                           })}
                                         </div>
                                       </div>
                                     );
                                   })()}
                                 </div>
                               ) : (
                                 item.details
                               )}
                             </TableCell>
                            <TableCell className="text-right font-mono font-bold text-zinc-100">
                              {item.value !== null ? `$${item.value.toFixed(2)}` : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Bookings</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Invoices</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-pink-500" /> Notes</div>
          </div>
      </div>
    </>
  );

  if (inline) {
      return (
          <div className="flex flex-col bg-[#09090b] h-full rounded-2xl relative">
              {content}
          </div>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-blue-400">
            <Target className="w-4 h-4" />
            Customer Intelligence 360
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col bg-zinc-950 border-zinc-800 p-0 overflow-hidden">
        {content}
      </DialogContent>
    </Dialog>
  );
}
