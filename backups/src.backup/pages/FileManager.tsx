import { useState, useEffect, Fragment } from "react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth";
import { FileText, Download, Search, Filter, Trash2, Eye, BellOff, Bell, Printer } from "lucide-react";
import { markViewed, isViewed, unmarkViewed } from "@/lib/viewTracker";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
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
import { dismissAlertsForRecord } from "@/lib/adminAlerts";
import { useAlertsStore } from "@/store/alerts";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";

interface PDFRecord {
  id: string;
  fileName: string;
  recordType: "Invoice" | "Estimate" | "Job" | "Checklist" | "Customer" | "Employee Training" | "Bookings" | "Admin Updates" | "Payroll" | "Employee Contact" | "add-Ons" | "Mock Data";
  customerName: string;
  date: string;
  timestamp: string;
  recordId: string;
  pdfData: string; // base64 or blob URL
  path?: string; // optional path for static files served under /files
}

  const FileManager = () => {
  const location = useLocation();
  const user = getCurrentUser();
  const { toast } = useToast();
  const [records, setRecords] = useState<PDFRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [userChangedTypeFilter, setUserChangedTypeFilter] = useState(false);
  const [appliedUrlCategory, setAppliedUrlCategory] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<PDFRecord | null>(null);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [adminPnl, setAdminPnl] = useState("");
  const [adminRevenue, setAdminRevenue] = useState("");
  const [adminPendingCount, setAdminPendingCount] = useState<string>("");
  const [employeeRows, setEmployeeRows] = useState<{
    name: string;
    training: string;
    jobsToday: string;
    hours: string;
  }[]>([]);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);

  // Subscribe to latest alerts and refresh when opening the Admin Updates modal
  const latestAlerts = useAlertsStore((s) => s.latest);
  const refreshAlerts = useAlertsStore((s) => s.refresh);
  useEffect(() => {
    if (adminModalOpen) {
      try { refreshAlerts(); } catch {}
    }
  }, [adminModalOpen, refreshAlerts]);

  // Normalize category values coming from URL (handle plurals/synonyms)
  const normalizeCategory = (val: string | null): "all" | "Invoice" | "Estimate" | "Job" | "Checklist" | "Customer" | "Employee Training" | "Bookings" | "Admin Updates" | "Payroll" | "Employee Contact" | "add-Ons" => {
    const s = String(val || '').trim().toLowerCase();
    if (!s) return "all";
    if (s === "all") return "all";
    if (s.includes("invoice")) return "Invoice";
    if (s.includes("estimate")) return "Estimate";
    if (s.includes("job")) return "Job"; // e.g., "Jobs" → "Job"
    if (s.includes("checklist")) return "Checklist";
    if (s.includes("customer")) return "Customer";
    if (s.includes("employee") || s.includes("training")) return "Employee Training";
    if (s.includes("booking")) return "Bookings";
    if (s.includes("admin") && s.includes("update")) return "Admin Updates";
    if (s.includes("payroll")) return "Payroll";
    if (s.includes("employee") && s.includes("contact")) return "Employee Contact";
    if (s.includes("add-ons") || s.includes("addons") || s.includes("add-on")) return "add-Ons";
    return "all";
  };

  useEffect(() => {
    // Only admins can access
    if (user?.role !== 'admin') {
      window.location.href = '/';
      return;
    }
    loadRecords();

    // Apply category filter from URL if present
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    if (category) {
      setTypeFilter(normalizeCategory(category));
      setAppliedUrlCategory(true);
      // Clear the URL param after applying so user can change category freely
      try {
        params.delete('category');
        const url = new URL(window.location.href);
        url.search = params.toString();
        window.history.replaceState(null, '', url.toString());
      } catch {}
    }
  }, [user]);

  // Update filter when the URL query changes (e.g., clicking another alert)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    if (category && !userChangedTypeFilter) {
      setTypeFilter(normalizeCategory(category));
    }
  }, [location.search]);

  const loadRecords = () => {
    const stored = localStorage.getItem('pdfArchive');
    if (stored) {
      setRecords(JSON.parse(stored));
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || record.recordType === typeFilter;
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const recordDate = new Date(record.timestamp);
      const now = new Date();
      if (dateFilter === "today") {
        matchesDate = recordDate.toDateString() === now.toDateString();
      } else if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = recordDate >= weekAgo;
      } else if (dateFilter === "month") {
        matchesDate = recordDate.getMonth() === now.getMonth() && 
                     recordDate.getFullYear() === now.getFullYear();
      }
    }
    
    return matchesSearch && matchesType && matchesDate;
  });

  // Bell state mirrors viewed status: unviewed → bell on (yellow), viewed → bell off (white)
  // Using the global view tracker ensures sidebar badges stay in sync.

  const buildBackendUrl = (record: PDFRecord) => {
    const base = "http://localhost:6061/files/";
    // Preferred: folder path + fileName
    if (record.path) {
      const path = record.path.endsWith("/") ? record.path : record.path + "/";
      const encodedPath = path
        .split("/")
        .filter(Boolean)
        .map(encodeURIComponent)
        .join("/") + "/";
      const encodedFile = encodeURIComponent(record.fileName);
      return base + encodedPath + encodedFile;
    }
    // Fallback: direct by record id (backend may support /files/:id)
    if (record.id) {
      return base + encodeURIComponent(record.id);
    }
    return null;
  };

  const downloadPDF = (record: PDFRecord) => {
    const link = document.createElement('a');
    link.href = record.pdfData;
    link.download = record.fileName;
    link.click();
    markViewed("file", record.id);
  };

  const openPrintPreview = async (record: PDFRecord) => {
    // Prefer local data/blob URL for reliability; fall back to backend URL
    const backendUrl = buildBackendUrl(record);
    const isInline = record.pdfData?.startsWith('data:application/pdf') || record.pdfData?.startsWith('blob:');
    const targetUrl = isInline ? record.pdfData : backendUrl || null;
    if (!targetUrl) return;

    try {
      const win = window.open(targetUrl, 'pdf-print');
      setTimeout(() => { try { win?.focus(); win?.print(); } catch {} }, 800);
      markViewed("file", record.id);
    } catch {}
  };

  const handleDelete = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    localStorage.setItem('pdfArchive', JSON.stringify(updated));
    setRecords(updated);
    setDeleteId(null);
    toast({
      title: "Deleted",
      description: "File deleted successfully"
    });
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="File Manager" />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">PDF Archive</h1>
            <div className="text-muted-foreground">
              {filteredRecords.length} of {records.length} files
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="bg-red-700 hover:bg-red-800" onClick={() => setAdminModalOpen(true)}>
              Create Admin Update PDF
            </Button>
          </div>

          {/* Filters */}
          <Card className="p-4 bg-gradient-card border-border">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by file name or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setUserChangedTypeFilter(true); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Invoice">Invoices</SelectItem>
                <SelectItem value="Estimate">Estimates</SelectItem>
                <SelectItem value="Job">Jobs</SelectItem>
                <SelectItem value="Checklist">Checklists</SelectItem>
                <SelectItem value="Customer">Customer Records</SelectItem>
                <SelectItem value="Employee Training">Employee Training</SelectItem>
                <SelectItem value="Bookings">Bookings</SelectItem>
                <SelectItem value="Admin Updates">Admin Updates</SelectItem>
                <SelectItem value="Payroll">Payroll</SelectItem>
                <SelectItem value="Employee Contact">Employee Contact</SelectItem>
                <SelectItem value="add-Ons">Add-Ons</SelectItem>
              </SelectContent>
            </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* File List */}
          <Card className="bg-gradient-card border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No files found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  [...filteredRecords]
                    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          {record.fileName}
                          {isViewed("file", record.id) ? (
                            <span className="text-xs text-zinc-500">• viewed</span>
                          ) : null}
                        </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                          {record.recordType}
                        </span>
                      </TableCell>
                      <TableCell>{record.customerName}</TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(record.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="icon" variant="ghost" onClick={async () => {
                            setSelectedRecord(record);
                            setViewerLoading(true);
                            setViewerError(null);
                            markViewed("file", record.id);
                            // Prefer local data/blob URL first, then backend URL
                            const isInline = record.pdfData?.startsWith('data:application/pdf') || record.pdfData?.startsWith('blob:');
                            if (isInline) {
                              setViewerSrc(record.pdfData);
                              setViewerLoading(false);
                            } else {
                              const backendUrl = buildBackendUrl(record);
                              if (backendUrl) {
                                setViewerSrc(backendUrl);
                                setViewerLoading(false);
                              } else {
                                setViewerSrc(null);
                                const msg = record.pdfData?.startsWith('blob:')
                                  ? 'This PDF was saved as a temporary blob URL and cannot be displayed after reload. Please re-generate this document.'
                                  : 'Unable to display PDF.';
                                setViewerError(msg);
                                setViewerLoading(false);
                              }
                            }
                          }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { markViewed("file", record.id); downloadPDF(record); }}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { markViewed("file", record.id); openPrintPreview(record); }} title="Print">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              try {
                                // Deterministically map bell state to viewed status
                                // Bell ON (yellow) means unviewed; Bell OFF (white) means viewed
                                const viewed = isViewed("file", record.id);
                                if (viewed) {
                                  // Turn bell ON → mark as unviewed
                                  unmarkViewed("file", record.id);
                                } else {
                                  // Turn bell OFF → mark as viewed
                                  markViewed("file", record.id);
                                }
                                // Clear any historical admin alerts tied to this exact archive ID
                                try { dismissAlertsForRecord(record.recordType, record.id); } catch {}
                                // Force re-render
                                setRecords(prev => [...prev]);
                              } catch {}
                            }}
                            title="Toggle alert flag for this file"
                          >
                            {!isViewed("file", record.id) ? (
                              <Bell className="h-4 w-4 text-yellow-400" />
                            ) : (
                              <Bell className="h-4 w-4 text-white" />
                            )}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteId(record.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Forever?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The file will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
<AlertDialogFooter className="button-group-responsive">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive"
            >
              Yes, Delete
            </AlertDialogAction>
</AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Updates Creator Dialog */}
      <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Create Admin Update PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Date/Time</label>
                <Input value={new Date().toLocaleString()} readOnly />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Pending Bookings Count</label>
                <Input value={adminPendingCount} onChange={(e) => setAdminPendingCount(e.target.value)} placeholder="e.g., 5" />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Large Notes</label>
              <textarea className="w-full h-48 p-3 rounded-md border border-border bg-background" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Write updates, notes, issues…" />
            </div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">P&L Summary</label>
                <Input value={adminPnl} onChange={(e) => setAdminPnl(e.target.value)} placeholder="Brief P&L summary" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Today's Revenue</label>
                <Input value={adminRevenue} onChange={(e) => setAdminRevenue(e.target.value)} placeholder="e.g., $1,250" />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Alerts Summary</label>
              <div className="p-3 rounded-md border border-border bg-background text-sm">
                {(latestAlerts || []).length === 0 ? (
                  <div className="text-muted-foreground">No current alerts.</div>
                ) : (
                  <ul className="list-disc ml-5">
                    {latestAlerts
                      .map((a) => a.title?.trim())
                      .filter(Boolean)
                      .map((t, idx) => (<li key={`al-${idx}`}>{t}</li>))}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Employee Progress</label>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm items-center">
                <div className="font-semibold">Name</div>
                <div className="font-semibold">Training %</div>
                <div className="font-semibold">Jobs Today</div>
                <div className="font-semibold">Hours Worked</div>
                {employeeRows.map((row, idx) => (
                  <Fragment key={idx}>
                    <Input value={row.name} onChange={(e) => setEmployeeRows(r => { const c=[...r]; c[idx] = { ...c[idx], name: e.target.value }; return c; })} />
                    <Input value={row.training} onChange={(e) => setEmployeeRows(r => { const c=[...r]; c[idx] = { ...c[idx], training: e.target.value }; return c; })} />
                    <Input value={row.jobsToday} onChange={(e) => setEmployeeRows(r => { const c=[...r]; c[idx] = { ...c[idx], jobsToday: e.target.value }; return c; })} />
                    <Input value={row.hours} onChange={(e) => setEmployeeRows(r => { const c=[...r]; c[idx] = { ...c[idx], hours: e.target.value }; return c; })} />
                  </Fragment>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdminModalOpen(false)}>Cancel</Button>
              <Button className="bg-red-700 hover:bg-red-800" onClick={() => {
                try {
                  // Ensure alerts list is up-to-date
                  try { refreshAlerts(); } catch {}
                  const doc = new jsPDF();
                  // Header
                  doc.setTextColor(200, 0, 0);
                  doc.setFontSize(18);
                  doc.text("Admin Updates", 20, 20);
                  doc.setTextColor(0,0,0);
                  doc.setFontSize(11);
                  doc.text(`Date/Time: ${new Date().toLocaleString()}`, 20, 30);
                  // Notes
                  doc.setFontSize(12);
                  doc.text("Notes:", 20, 40);
                  const notes = doc.splitTextToSize(adminNotes || "(none)", 170);
                  doc.text(notes, 20, 48);
                  // Alerts
                  let y = 48 + notes.length * 6 + 6;
                  doc.text("Alerts:", 20, y);
                  const alerts = (latestAlerts || [])
                    .map(a => (a.title || '').trim())
                    .filter(Boolean)
                    .map(t => `• ${t}`);
                  const alertsText = doc.splitTextToSize(alerts.length ? alerts.join("\n") : "(none)", 170);
                  y += 8;
                  doc.text(alertsText, 20, y);
                  y += alertsText.length * 6 + 6;
                  // Employee Progress
                  doc.text("Employee Progress:", 20, y);
                  y += 8;
                  employeeRows.forEach((row) => {
                    doc.text(`${row.name} — Training ${row.training}% — Jobs Today ${row.jobsToday} — Hours ${row.hours}`, 20, y);
                    y += 6;
                  });
                  y += 4;
                  // Other Info
                  doc.text(`P&L: ${adminPnl || '(n/a)'} | Revenue: ${adminRevenue || '(n/a)'} | Pending Bookings: ${adminPendingCount || '(n/a)'}`, 20, y);
                  const pdfDataUrl = doc.output('dataurlstring');
                  const fileName = `Admin_Update_${new Date().toLocaleDateString().replace(/\//g,'-')}.pdf`;
                  savePDFToArchive('Admin Updates', 'Admin', 'admin_updates', pdfDataUrl, { fileName, path: 'Admin Updates/' });
                  toast({ title: 'Saved', description: 'Admin Update PDF created.' });
                  setAdminModalOpen(false);
                  loadRecords();
                } catch (err: any) {
                  toast({ title: 'Error', description: err?.message || String(err), variant: 'destructive' });
                }
              }}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => {
        if (!open) {
          setSelectedRecord(null);
          setViewerSrc(null);
          setViewerError(null);
          setViewerLoading(false);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0">
          <DialogHeader>
            <DialogTitle>{selectedRecord?.fileName || "PDF Preview"}</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="w-full h-[90vh]">
              {viewerLoading && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading PDF...
                </div>
              )}
              {!viewerLoading && viewerSrc && (
                <iframe
                  key={selectedRecord.id}
                  src={viewerSrc}
                  title={selectedRecord.fileName}
                  className="w-full h-full border-0"
                  onError={() => toast({ title: 'PDF failed to load — download instead', variant: 'destructive' })}
                />
              )}
              {!viewerLoading && !viewerSrc && (
                <div className="flex flex-col items-center justify-center h-full">
                  <img src="/placeholder.svg" alt="PDF unavailable" className="w-24 h-24 opacity-40" />
                  <p className="mt-3 text-sm text-muted-foreground">{viewerError || "PDF unavailable. Try downloading or check the File Manager."}</p>
                  {selectedRecord?.pdfData && (
                    <Button className="mt-4" onClick={() => downloadPDF(selectedRecord!)}>
                      Download {selectedRecord.fileName}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileManager;
