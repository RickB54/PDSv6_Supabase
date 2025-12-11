import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import CustomerModal, { type Customer as ModalCustomer } from "@/components/customers/CustomerModal";
import { getCustomers, deleteCustomer as removeCustomer, purgeTestCustomers, getInvoices, upsertCustomer } from "@/lib/db";
import { getUnifiedCustomers } from "@/lib/customers";
import api from "@/lib/api";
import { Search, Pencil, Trash2, Plus, Printer, Save, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, FileBarChart, Eye, Edit } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import DateRangeFilter, { DateRangeValue } from "@/components/filters/DateRangeFilter";
import jsPDF from "jspdf";

interface Customer {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  vehicle: string;
  model: string;
  year: string;
  color: string;
  mileage: string;
  vehicleType: string;
  conditionInside: string;
  conditionOutside: string;
  services: string[];
  lastService: string;
  duration: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

const SearchCustomer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [autoOpenedAdd, setAutoOpenedAdd] = useState(false);
const [dateFilter, setDateFilter] = useState<"all" | "daily" | "weekly" | "monthly">("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});

useEffect(() => {
    (async () => {
      try {
        const list = await getUnifiedCustomers();
        setCustomers(Array.isArray(list) ? (list as Customer[]) : []);
      } catch (err: any) {
        console.error('Failed to load customers:', err);
        try {
          const fallback = await getCustomers();
          setCustomers(Array.isArray(fallback) ? (fallback as Customer[]) : []);
          toast({ title: 'Load failed — retry', description: 'Using local customers cache.', variant: 'default' });
        } catch (err2: any) {
          toast({ title: 'Load failed — retry', description: err2?.message || String(err2), variant: 'destructive' });
          setCustomers([]);
        }
      }
    })();
  }, []);

const refresh = async () => {
    try {
      const list = await getUnifiedCustomers();
      setCustomers(Array.isArray(list) ? (list as Customer[]) : []);
    } catch (err: any) {
      console.error('Refresh customers failed:', err);
      try {
        const fallback = await getCustomers();
        setCustomers(Array.isArray(fallback) ? (fallback as Customer[]) : []);
        toast({ title: 'Load failed — retry', description: 'Using local customers cache.', variant: 'default' });
      } catch (err2: any) {
        toast({ title: 'Load failed — retry', description: err2?.message || String(err2), variant: 'destructive' });
        setCustomers([]);
      }
    }
  };

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setModalOpen(true); };
  const onSaveModal = async (data: ModalCustomer) => {
    try {
      await api('/api/customers', { method: 'POST', body: JSON.stringify(data) });
      await refresh();
      setModalOpen(false);
      toast({ title: "Customer Saved", description: "Record stored." });
    } catch (err: any) {
      // Fallback to local IndexedDB when backend is unavailable
      try {
        const saved = await upsertCustomer(data as any);
        const list = await getCustomers();
        setCustomers(list as Customer[]);
        setModalOpen(false);
        toast({ title: "Saved locally", description: "Backend unavailable; stored offline.", variant: 'default' });
      } catch (err2: any) {
        toast({ title: "Save failed", description: err2?.message || String(err2), variant: 'destructive' });
      }
    }
  };

  // Auto-open Add Customer modal ONCE when `?add=true` or bare `?add` exists
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const flag = params.get("add");
    const shouldOpen = flag === "true" || flag === "1" || (flag === null && params.has("add"));
    if (shouldOpen && !autoOpenedAdd) {
      setEditing(null);
      setModalOpen(true);
      setAutoOpenedAdd(true);
    }
  }, [location.search, autoOpenedAdd]);

const filterByDate = (customer: Customer) => {
    const now = new Date();
    const baseDateStr = customer.updatedAt || customer.createdAt || customer.lastService;
    if (!baseDateStr) return dateFilter === "all" && !(dateRange.from || dateRange.to);
    const d = new Date(baseDateStr);

    let passQuick = true;
    const dayMs = 24 * 60 * 60 * 1000;
    if (dateFilter === "daily") passQuick = now.getTime() - d.getTime() < dayMs;
    if (dateFilter === "weekly") passQuick = now.getTime() - d.getTime() < 7 * dayMs;
    if (dateFilter === "monthly") passQuick = now.getTime() - d.getTime() < 30 * dayMs;

    let passRange = true;
    if (dateRange.from) passRange = d >= new Date(dateRange.from.setHours(0,0,0,0));
    if (passRange && dateRange.to) passRange = d <= new Date(dateRange.to.setHours(23,59,59,999));

    return passQuick && passRange;
  };

  const filteredCustomers = (Array.isArray(customers) ? customers : []).filter(customer => {
    const matchesSearch = (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone || '').includes(searchTerm) ||
      (customer.vehicle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.year || '').includes(searchTerm);
    return matchesSearch && filterByDate(customer);
  });

  const handleDelete = async () => {
    if (!deleteCustomerId) return;
    await removeCustomer(deleteCustomerId);
    await refresh();
    toast({
      title: "Customer Deleted",
      description: "Customer record has been removed.",
    });
    setDeleteCustomerId(null);
  };

  const generatePDF = (download = false) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Customer List", 20, 20);
    let y = 35;
    filteredCustomers.forEach((c) => {
      doc.setFontSize(12);
      doc.text(`${c.name} | ${c.phone} | ${c.email || '-'} | ${c.year} ${c.vehicle} ${c.model}`, 20, y);
      y += 7;
      if (y > 280) { doc.addPage(); y = 20; }
    });
    if (download) doc.save("customers.pdf"); else window.open(doc.output('bloburl'), '_blank');
  };

  const [expandedCustomers, setExpandedCustomers] = useState<string[]>([]);
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleCustomer = (id: string) => {
    setExpandedCustomers(prev => (prev.includes(id) ? [] : [id]));
    setAllExpanded(false);
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedCustomers([]);
    } else {
      setExpandedCustomers(filteredCustomers.map(c => c.id!));
    }
    setAllExpanded(!allExpanded);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Customer Info" />
      
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6 animate-fade-in">
          {/* Search Bar */}
          <Card className="p-6 bg-gradient-card border-border">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-foreground">Find Customer</h2>
                <div className="flex gap-2 items-center flex-wrap">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All Time</option>
                    <option value="daily">Today</option>
                    <option value="weekly">This Week</option>
                    <option value="monthly">This Month</option>
                  </select>
                  <DateRangeFilter value={dateRange} onChange={setDateRange} storageKey="customers-range" />
                  <Button variant="outline" onClick={() => generatePDF(false)}>
                    <Printer className="h-4 w-4 mr-2" />Print
                  </Button>
                  <Button variant="outline" onClick={() => generatePDF(true)}>
                    <Save className="h-4 w-4 mr-2" />Save PDF
                  </Button>
                  <Button className="bg-gradient-hero" onClick={openAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Customer
                  </Button>
                </div>
              </div>
              
              {filteredCustomers.length > 0 && (
                <div className="flex gap-2 items-center">
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {allExpanded ? (
                      <>
                        <ChevronsUp className="h-4 w-4 mr-2" />
                        Collapse All
                      </>
                    ) : (
                      <>
                        <ChevronsDown className="h-4 w-4 mr-2" />
                        Expand All
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, phone, vehicle make, model, or year..."
                    className="pl-10 bg-background border-border"
                  />
                </div>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={""}
                >
                  <option value="" disabled>All Customers</option>
                  {[...(Array.isArray(customers) ? customers : [])].sort((a,b) => (a.name || '').localeCompare(b.name || '')).map(c => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Customer List */}
          <div className="space-y-4">
            {[...filteredCustomers]
              .sort((a,b) => {
                const da = a.updatedAt || a.createdAt || a.lastService || "";
                const db = b.updatedAt || b.createdAt || b.lastService || "";
                return (db ? new Date(db).getTime() : 0) - (da ? new Date(da).getTime() : 0);
              })
              .map((customer) => {
              const isExpanded = expandedCustomers.includes(customer.id!);
              if (!allExpanded && expandedCustomers.length > 0 && !isExpanded) {
                return null;
              }
              return (
                <Card 
                  key={customer.id} 
                  className={`bg-gradient-card border-border hover:shadow-glow transition-all ${
                    isExpanded ? 'sticky top-4 z-10 shadow-xl' : ''
                  }`}
                >
                  <Collapsible open={isExpanded} onOpenChange={() => toggleCustomer(customer.id!)}>
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <CollapsibleTrigger className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <h3 className="text-xl font-bold text-foreground">{customer.name}</h3>
                              <p className="text-muted-foreground">{customer.phone}</p>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(customer)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteCustomerId(customer.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button asChild variant="outline" size="sm" className="ml-2">
                            <Link to={`/service-checklist?customerId=${customer.id}`}>
                              Start Job
                            </Link>
                          </Button>
                        </div>
                      </div>

                      <CollapsibleContent className="mt-4">
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-muted-foreground">Vehicle</Label>
                              <p className="text-foreground font-medium">
                                {customer.year} {customer.vehicle} {customer.model}
                              </p>
                            </div>
                            
                            <div>
                              <Label className="text-muted-foreground">Email</Label>
                              <p className="text-foreground font-medium">{customer.email || "N/A"}</p>
                            </div>

                            <div>
                              <Label className="text-muted-foreground">Address</Label>
                              <p className="text-foreground font-medium">{customer.address || "N/A"}</p>
                            </div>

                            <div>
                              <Label className="text-muted-foreground">Color</Label>
                              <p className="text-foreground font-medium">{customer.color || "N/A"}</p>
                            </div>

                            <div>
                              <Label className="text-muted-foreground">Mileage</Label>
                              <p className="text-foreground font-medium">{customer.mileage ? `${customer.mileage} miles` : "N/A"}</p>
                            </div>

                            <div>
                              <Label className="text-muted-foreground">Vehicle Type</Label>
                              <p className="text-foreground font-medium">{customer.vehicleType || "N/A"}</p>
                            </div>

                            <div>
                              <Label className="text-muted-foreground">Last Service</Label>
                              <p className="text-foreground font-medium">{customer.lastService}</p>
                            </div>

                            <div>
                              <Label className="text-muted-foreground">Condition (Inside)</Label>
                              <p className="text-foreground font-medium">{customer.conditionInside || "N/A"}</p>
                            </div>

                            <div>
                              <Label className="text-muted-foreground">Condition (Outside)</Label>
                              <p className="text-foreground font-medium">{customer.conditionOutside || "N/A"}</p>
                            </div>

                            <div className="md:col-span-2">
                              <Label className="text-muted-foreground">Services</Label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {(Array.isArray(customer.services) ? customer.services : []).map((service, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full"
                                  >
                                    {service}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <Label className="text-muted-foreground">Duration</Label>
                              <p className="text-foreground font-medium">{customer.duration}</p>
                            </div>
                          </div>

                          {customer.notes && (
                            <div>
                              <Label className="text-muted-foreground">Notes</Label>
                              <p className="text-foreground">{customer.notes}</p>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                </Card>
              );
            })}
          </div>

          {filteredCustomers.length === 0 && (
            <Card className="p-12 bg-gradient-card border-border text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No customers yet</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or add a new customer
              </p>
              <div className="mt-4">
                <Button className="bg-gradient-hero" onClick={openAdd}>
                  <Plus className="h-4 w-4 mr-2" /> Add Customer
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>

      <AlertDialog open={deleteCustomerId !== null} onOpenChange={() => setDeleteCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this customer record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
<AlertDialogFooter className="button-group-responsive">
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Yes
            </AlertDialogAction>
</AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomerModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            const params = new URLSearchParams(location.search);
            if (params.has("add")) navigate(location.pathname, { replace: true });
          }
        }}
        initial={editing}
        onSave={async (data) => {
          await onSaveModal(data);
          const params = new URLSearchParams(location.search);
          if (params.has("add")) navigate(location.pathname, { replace: true });
        }}
      />
    </div>
  );
};

export default SearchCustomer;
 
