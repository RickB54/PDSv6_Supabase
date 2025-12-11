import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import CustomerModal, { type Customer as ModalCustomer } from "@/components/customers/CustomerModal";
import { getCustomers, deleteCustomer as removeCustomer, upsertCustomer } from "@/lib/db";
import { getUnifiedCustomers } from "@/lib/customers";
import api from "@/lib/api";
import { Search, Pencil, Trash2, Plus, Save, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, MapPin, CalendarPlus, Users } from "lucide-react";
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
import { savePDFToArchive } from "@/lib/pdfArchive";

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
  howFound?: string;
  howFoundOther?: string;
  type?: 'customer' | 'prospect';
}

const Prospects = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [dateFilter, setDateFilter] = useState<"all" | "daily" | "weekly" | "monthly">("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});

  useEffect(() => {
    (async () => {
      try {
        const list = await getUnifiedCustomers();
        // Filter for prospects
        const prospects = (list as Customer[]).filter(c => c.type === 'prospect');
        setCustomers(prospects);
      } catch (err: any) {
        console.error('Failed to load prospects:', err);
        try {
          const fallback = await getCustomers();
          const prospects = (fallback as Customer[]).filter(c => c.type === 'prospect');
          setCustomers(prospects);
          toast({ title: 'Load failed — retry', description: 'Using local cache.', variant: 'default' });
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
      const prospects = (list as Customer[]).filter(c => c.type === 'prospect');
      setCustomers(prospects);
    } catch (err: any) {
      console.error('Refresh prospects failed:', err);
      try {
        const fallback = await getCustomers();
        const prospects = (fallback as Customer[]).filter(c => c.type === 'prospect');
        setCustomers(prospects);
        toast({ title: 'Load failed — retry', description: 'Using local cache.', variant: 'default' });
      } catch (err2: any) {
        console.error(err2);
      }
    }
  };

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setModalOpen(true); };

  const onSaveModal = async (data: ModalCustomer) => {
    // Ensure it stays a prospect unless strictly changed (though modal handles type)
    if (!data.type) data.type = 'prospect';

    try {
      await api('/api/customers', { method: 'POST', body: JSON.stringify(data) });
      await refresh();
      setModalOpen(false);
      toast({ title: "Prospect Saved", description: "Record stored." });
    } catch (err: any) {
      try {
        const saved = await upsertCustomer(data as any);
        await refresh();
        setModalOpen(false);
        toast({ title: "Saved locally", description: "Backend unavailable; stored offline.", variant: 'default' });
      } catch (err2: any) {
        toast({ title: "Save failed", description: err2?.message || String(err2), variant: 'destructive' });
      }
    }
  };

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
    if (dateRange.from) passRange = d >= new Date(dateRange.from.setHours(0, 0, 0, 0));
    if (passRange && dateRange.to) passRange = d <= new Date(dateRange.to.setHours(23, 59, 59, 999));

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
      title: "Prospect Deleted",
      description: "Record has been removed.",
    });
    setDeleteCustomerId(null);
  };

  const generatePDF = (download = false) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("Prospects List Report", 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, y);
    y += 15;

    filteredCustomers.forEach((c) => {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFillColor(168, 85, 247); // Purple
      doc.rect(14, y, pageWidth - 28, 10, 'F');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(c.name || "Unknown Prospect", 18, y + 7);
      y += 15;

      doc.setTextColor(40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(`Phone: ${c.phone || "N/A"}`, 18, y);
      doc.text(`Email: ${c.email || "N/A"}`, 18, y + 5);
      doc.text(`Vehicle: ${c.year || ''} ${c.vehicle || ''} ${c.model || ''}`, 110, y);
      doc.text(`Acquisition: ${c.howFound || 'N/A'}`, 110, y + 5);

      y += 15;
      doc.setDrawColor(200);
      doc.line(14, y, pageWidth - 14, y);
      y += 10;
    });

    if (download) {
      const fileName = `prospects_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      try {
        const dataUrl = doc.output('datauristring');
        savePDFToArchive('Prospects', 'Admin', `prospects-${Date.now()}`, dataUrl, { fileName });
        toast({ title: 'Archived', description: 'Saved to File Manager under prospects/.' });
      } catch (e) {
        console.error('Archive failed', e);
      }
    } else {
      window.open(doc.output('bloburl'), '_blank');
    }
  };

  const [expandedCustomers, setExpandedCustomers] = useState<string[]>([]);
  const [allExpanded, setAllExpanded] = useState(false);
  const [openMaps, setOpenMaps] = useState<string[]>([]);

  const toggleMap = (id: string) => {
    setOpenMaps(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

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
      <PageHeader title="Prospects" />

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6 animate-fade-in">
          {/* Search Bar */}
          <Card className="p-6 bg-gradient-card border-border">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-purple-400" />
                  <h2 className="text-2xl font-bold text-foreground">Find Prospect</h2>
                </div>
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
                  <Button variant="outline" onClick={() => generatePDF(true)}>
                    <Save className="h-4 w-4 mr-2" />Save PDF
                  </Button>
                  <Button className="bg-gradient-hero" onClick={openAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Prospect
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
                    placeholder="Search by name, phone, vehicle, etc..."
                    className="pl-10 bg-background border-border"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* List */}
          <div className="space-y-4">
            {[...filteredCustomers]
              .sort((a, b) => {
                const da = a.updatedAt || a.createdAt || "";
                const db = b.updatedAt || b.createdAt || "";
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
                    className={`bg-gradient-card border-border hover:shadow-glow transition-all ${isExpanded ? 'sticky top-4 z-10 shadow-xl' : ''
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
                                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                  {customer.name}
                                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/50">Prospect</span>
                                </h3>
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
                              onClick={() => setDeleteCustomerId(customer.id!)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button asChild variant="outline" size="sm" className="ml-2">
                              <Link to={`/bookings?add=true&customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}&address=${encodeURIComponent(customer.address || '')}&email=${encodeURIComponent(customer.email || '')}&phone=${encodeURIComponent(customer.phone || '')}&vehicleYear=${encodeURIComponent(customer.year || '')}&vehicleMake=${encodeURIComponent(customer.vehicle || '')}&vehicleModel=${encodeURIComponent(customer.model || '')}&vehicleType=${encodeURIComponent(customer.vehicleType || '')}`}>
                                <CalendarPlus className="h-4 w-4 mr-2" />
                                Convert to Booking
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

                              <div className={openMaps.includes(customer.id!) ? "md:col-span-2" : ""}>
                                <div className="flex items-center gap-2">
                                  <Label className="text-muted-foreground">Address</Label>
                                  {customer.address && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                      onClick={(e) => { e.stopPropagation(); toggleMap(customer.id!); }}
                                    >
                                      <MapPin className="h-3 w-3 mr-1" />
                                      {openMaps.includes(customer.id!) ? "Hide Map" : "Find On Map"}
                                    </Button>
                                  )}
                                </div>
                                <p className="text-foreground font-medium">{customer.address || "N/A"}</p>
                                {openMaps.includes(customer.id!) && customer.address && (
                                  <div className="mt-2 w-full h-64 rounded-md overflow-hidden border border-zinc-800 animate-in fade-in zoom-in duration-300">
                                    <iframe
                                      width="100%"
                                      height="100%"
                                      frameBorder="0"
                                      scrolling="no"
                                      marginHeight={0}
                                      marginWidth={0}
                                      src={`https://maps.google.com/maps?q=${encodeURIComponent(customer.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                      title={`Map for ${customer.name}`}
                                    ></iframe>
                                  </div>
                                )}
                              </div>

                              <div>
                                <Label className="text-muted-foreground">How Found</Label>
                                <p className="text-foreground font-medium">
                                  {customer.howFound === 'other' ? (customer.howFoundOther || 'Other') : (customer.howFound || "N/A")}
                                </p>
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
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No prospects yet</h3>
              <p className="text-muted-foreground">
                Add people you meet to track them as potential clients.
              </p>
              <div className="mt-4">
                <Button className="bg-gradient-hero" onClick={openAdd}>
                  <Plus className="h-4 w-4 mr-2" /> Add Prospect
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
              This will permanently delete this prospect record.
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
        onOpenChange={setModalOpen}
        initial={editing}
        onSave={onSaveModal}
        defaultType="prospect"
      />
    </div>
  );
};

export default Prospects;
