import { useState, useEffect, Fragment } from "react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth";
import { useDemoMode } from "@/contexts/DemoContext";
import { FileText, Download, Search, Filter, Trash2, Eye, BellOff, Bell, Printer, X, Folder, Plus, Grid, List, MoreVertical, ChevronRight, Upload, HardDrive, Archive, File } from "lucide-react";
import BusinessDrive from "@/components/BusinessDrive";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  recordType: "Invoice" | "Estimate" | "Job" | "Checklist" | "Customer" | "Employee Training" | "Bookings" | "Admin Updates" | "Payroll" | "Employee Contact" | "add-Ons" | "Sub Contractors" | "Sub-Contractors" | "Package Comparisons" | "Upsell Scripts" | "Client Evaluation" | "Detailing Vendors" | "Vehicle Classification" | "Vehicle History" | "Inventory Report" | "Prospects";
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
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
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
      try { refreshAlerts(); } catch { }
    }
  }, [adminModalOpen, refreshAlerts]);

  // Normalize category values coming from URL (handle plurals/synonyms)
  const normalizeCategory = (val: string | null): "all" | "Invoice" | "Estimate" | "Job" | "Checklist" | "Customer" | "Employee Training" | "Bookings" | "Admin Updates" | "Payroll" | "Employee Contact" | "add-Ons" | "Vehicle History" | "Inventory Report" | "Prospects" => {
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
    if (s.includes("vehicle") && s.includes("history")) return "Vehicle History";
    if (s.includes("inventory") && s.includes("report")) return "Inventory Report";
    if (s.includes("prospect")) return "Prospects";
    return "all";
  };

  const { isDemoMode } = useDemoMode();
  useEffect(() => {
    // Only admins can access
    if (!isDemoMode && user?.role !== 'admin') {
      window.location.href = '/';
      return;
    }
    loadRecords();

    // Listen for real-time PDF updates (from bookings, invoices, etc)
    const handleUpdate = () => loadRecords();
    window.addEventListener('pdf_archive_updated', handleUpdate);

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
      } catch { }
    }

    return () => {
      window.removeEventListener('pdf_archive_updated', handleUpdate);
    };
  }, [user?.id, user?.role, isDemoMode]);

  // Update filter when the URL query changes (e.g., clicking another alert)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    if (category && !userChangedTypeFilter) {
      setTypeFilter(normalizeCategory(category));
    }
  }, [location.search]);

  const loadRecords = async () => {
    if (isDemoMode) {
      setRecords([
        { id: 'demo-pdf-1', fileName: 'Mock_Invoice_INV-1004.pdf', recordType: 'Invoice', customerName: 'John Doe', date: new Date().toLocaleDateString(), timestamp: new Date().toISOString(), recordId: 'inv-1004', pdfData: '' },
        { id: 'demo-pdf-2', fileName: 'Mock_Estimate_EST-2099.pdf', recordType: 'Estimate', customerName: 'Jane Smith', date: new Date().toLocaleDateString(), timestamp: new Date().toISOString(), recordId: 'est-2099', pdfData: '' },
        { id: 'demo-pdf-3', fileName: 'Mock_Employee_Training_Log.pdf', recordType: 'Employee Training', customerName: 'Internal', date: new Date().toLocaleDateString(), timestamp: new Date().toISOString(), recordId: 'trn-001', pdfData: '' }
      ]);
      return;
    }

    const deletedPdfIds: string[] = JSON.parse(localStorage.getItem('deleted_pdf_ids') || '[]');
    const deletedSet = new Set(deletedPdfIds);

    // 1. Load from localStorage (legacy/immediate)
    const stored = localStorage.getItem('pdfArchive');
    let localRecords: PDFRecord[] = [];
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          localRecords = parsed.filter((r: PDFRecord) => !deletedSet.has(r.id));
        }
      } catch { }
    }

    // 2. Load from Supabase
    try {
      const { default: supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('pdf_records')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        if (error.code !== 'PGRST205') {
          console.error("Failed to load PDF records from Supabase:", error);
        }
        setRecords(localRecords);
      } else if (data) {
        const remoteRecords: PDFRecord[] = data
          .filter((r: any) => !deletedSet.has(r.id))
          .map((r: any) => ({
            id: r.id,
            fileName: r.file_name,
            recordType: r.record_type,
            customerName: r.customer_name,
            date: r.date,
            timestamp: r.timestamp,
            recordId: r.record_id,
            pdfData: r.pdf_data,
            path: r.path
          }));

        // Merge and deduplicate by ID
        const combined = [...remoteRecords];
        localRecords.forEach(lr => {
          if (!combined.find(cr => cr.id === lr.id)) {
            combined.push(lr);
          }
        });

        setRecords(combined);
      }
    } catch (e) {
      console.warn("Supabase not available, using local records only");
      setRecords(localRecords);
    }
  };

  // Helper to shorten filenames for display
  const formatDisplayName = (name: string) => {
    // 1. Remove extension
    let clean = name.replace(/\.pdf$/i, '');
    // 2. Try to remove standard 13-digit timestamp suffix often used in this app
    // e.g. "Name_1765431441643" -> "Name"
    clean = clean.replace(/[-_]\d{10,13}$/, '');

    // 3. Truncate if still too long (e.g. > 30 chars)
    if (clean.length > 30) {
      return clean.substring(0, 27) + '...';
    }
    return clean;
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
    const base = "/files/";
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

  const handleViewPDF = async (record: PDFRecord) => {
    setSelectedRecord(record);
    setViewerLoading(true);
    setViewerError(null);
    markViewed("file", record.id);
    
    try {
      // 1. Check if it's already a valid viewer-ready string
      const isDataUri = record.pdfData?.startsWith('data:application/pdf');
      const isBlobUrl = record.pdfData?.startsWith('blob:');
      
      if (isDataUri) {
        // Converting data: URI to Blob URL is much more stable in most browsers
        const base64Content = record.pdfData.split(',')[1];
        if (!base64Content) throw new Error("Empty PDF data content");
        
        const byteCharacters = atob(base64Content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        
        setViewerSrc(blobUrl);
      } else if (isBlobUrl) {
        setViewerSrc(record.pdfData);
      } else {
        const backendUrl = buildBackendUrl(record);
        if (backendUrl) {
          setViewerSrc(backendUrl);
        } else {
          setViewerSrc(null);
          setViewerError("PDF display error: Missing data source.");
        }
      }
    } catch (err: any) {
      console.error("PDF Preview Logic Error:", err);
      setViewerError("Unable to display PDF. Try downloading the file instead.");
    } finally {
      setViewerLoading(false);
    }
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
      setTimeout(() => { try { win?.focus(); win?.print(); } catch { } }, 800);
      markViewed("file", record.id);
    } catch { }
  };

  const handleDelete = async (id: string) => {
    // 1. Add ID to permanent deleted_pdf_ids list
    try {
      const deletedPdfIds: string[] = JSON.parse(localStorage.getItem('deleted_pdf_ids') || '[]');
      if (!deletedPdfIds.includes(id)) {
        deletedPdfIds.push(id);
        localStorage.setItem('deleted_pdf_ids', JSON.stringify(deletedPdfIds));
      }
    } catch { }

    // 2. Automatically dismiss alerts for this record
    const target = records.find(r => r.id === id);
    if (target) {
      dismissAlertsForRecord(target.recordType, target.id);
      if (target.recordId) dismissAlertsForRecord(target.recordType, target.recordId);
    } else {
      dismissAlertsForRecord('', id);
    }

    // 3. Delete from localStorage
    const updated = records.filter(r => r.id !== id);
    localStorage.setItem('pdfArchive', JSON.stringify(updated));
    setRecords(updated);
    
    // 4. Delete from Supabase
    try {
      if (localStorage.getItem("demo_mode_active") !== "true") {
        const { default: supabase } = await import('@/lib/supabase');
        const { error } = await supabase.from('pdf_records').delete().eq('id', id);
        if (error) console.error("Supabase PDF delete failed:", error);
        else console.log("✅ PDF deleted from Supabase:", id);
      }
    } catch (e) {
      console.warn("Supabase not available for delete sync");
    }

    // 5. Refresh global alerts store
    try { refreshAlerts(); } catch { }

    setDeleteId(null);
    toast({
      title: "Deleted",
      description: "File deleted successfully and associated alert dismissed"
    });
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="File Manager" />
      <main className="container mx-auto px-4 py-8 max-w-7xl space-y-8 animate-fade-in">
        <Tabs defaultValue="archive" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#0d1117] border border-zinc-800 h-14 p-1 rounded-xl shadow-lg">
            <TabsTrigger 
              value="archive" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white font-black uppercase tracking-widest text-xs h-full rounded-lg transition-all"
            >
              <Archive className="w-4 h-4 mr-2" /> Alerts & PDF Archive
            </TabsTrigger>
            <TabsTrigger 
              value="drive" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-black uppercase tracking-widest text-xs h-full rounded-lg transition-all"
            >
              <HardDrive className="w-4 h-4 mr-2" /> Business Drive (Docs)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="archive" className="space-y-8 focus-visible:outline-none focus-visible:ring-0">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-purple-900/20 to-black p-6 rounded-xl border border-purple-900/20 shadow-2xl">
              <div>
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">PDF Archive</h1>
                <p className="text-zinc-400 mt-2">Manage and organize all your business documents in one secure place.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="text-right hidden md:block">
                  <div className="text-2xl font-bold text-white mb-1">{records.length}</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">Total Files</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-end gap-3 w-full sm:w-auto">
                <Button
                  variant="destructive"
                  onClick={() => setDeleteAllOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Files
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setAdminModalOpen(true)}>
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
                      className="pl-10 pr-10"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
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
                      <SelectItem value="Vehicle History">Vehicle History</SelectItem>
                      <SelectItem value="Inventory Report">Inventory Report</SelectItem>
                      <SelectItem value="Prospects">Prospects</SelectItem>
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
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
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
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((record) => (
                            <TableRow 
                              key={record.id} 
                              className="cursor-pointer hover:bg-zinc-800/30 transition-colors group"
                              onClick={() => handleViewPDF(record)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2" title={record.fileName}>
                                  <span className="truncate max-w-[200px] group-hover:text-blue-400 transition-colors">{formatDisplayName(record.fileName)}</span>
                                  {isViewed("file", record.id) ? (
                                    <span className="text-xs text-zinc-500 shrink-0">• viewed</span>
                                  ) : null}
                                </div>
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
                                <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                                  <Button size="icon" variant="ghost" className="hover:bg-blue-600/20 hover:text-blue-400" onClick={() => handleViewPDF(record)}>
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
                                        const viewed = isViewed("file", record.id);
                                        if (viewed) unmarkViewed("file", record.id);
                                        else markViewed("file", record.id);
                                        try { dismissAlertsForRecord(record.recordType, record.id); } catch { }
                                        setRecords(prev => [...prev]);
                                      } catch { }
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
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 p-4">
                  {filteredRecords.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No files found</p>
                    </div>
                  ) : (
                    [...filteredRecords]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((record) => (
                        <div 
                          key={record.id} 
                          className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3 active:bg-zinc-800 transition-colors cursor-pointer"
                          onClick={() => handleViewPDF(record)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-base truncate flex items-center gap-2" title={record.fileName}>
                                {formatDisplayName(record.fileName)}
                                {isViewed("file", record.id) && <span className="text-xs text-zinc-500 font-normal shrink-0">• viewed</span>}
                              </div>
                              <div className="text-sm text-zinc-400 mt-1">{record.customerName}</div>
                            </div>
                            <span className="shrink-0 px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                              {record.recordType}
                            </span>
                          </div>

                          <div className="text-xs text-zinc-500">
                            {new Date(record.timestamp).toLocaleString()}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-zinc-800" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-10 w-10 bg-blue-600/10 text-blue-400" onClick={() => handleViewPDF(record)}>
                                <Eye className="h-5 w-5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => { markViewed("file", record.id); downloadPDF(record); }}>
                                <Download className="h-5 w-5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => { markViewed("file", record.id); openPrintPreview(record); }}>
                                <Printer className="h-5 w-5" />
                              </Button>
                            </div>

                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-10 w-10"
                                onClick={() => {
                                  try {
                                    const viewed = isViewed("file", record.id);
                                    if (viewed) unmarkViewed("file", record.id);
                                    else markViewed("file", record.id);
                                    try { dismissAlertsForRecord(record.recordType, record.id); } catch { }
                                    setRecords(prev => [...prev]);
                                  } catch { }
                                }}
                              >
                                {!isViewed("file", record.id) ? (
                                  <Bell className="h-5 w-5 text-yellow-400" />
                                ) : (
                                  <Bell className="h-5 w-5 text-zinc-600" />
                                )}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-10 w-10 text-destructive hover:text-destructive" onClick={() => setDeleteId(record.id)}>
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="drive" className="focus-visible:outline-none focus-visible:ring-0">
            <BusinessDrive />
          </TabsContent>
        </Tabs>
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

      {/* Delete ALL Confirmation Dialog */}
      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Files?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All archived files will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="button-group-responsive">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const allIds = records.map(r => r.id);
                // 1. Save all IDs to deleted_pdf_ids
                try {
                  const deletedPdfIds: string[] = JSON.parse(localStorage.getItem('deleted_pdf_ids') || '[]');
                  allIds.forEach(id => {
                    if (!deletedPdfIds.includes(id)) deletedPdfIds.push(id);
                  });
                  localStorage.setItem('deleted_pdf_ids', JSON.stringify(deletedPdfIds));
                } catch { }

                // 2. Dismiss alerts for all records being deleted
                records.forEach(r => {
                  dismissAlertsForRecord(r.recordType, r.id);
                  if (r.recordId) dismissAlertsForRecord(r.recordType, r.recordId);
                });

                // 3. Clear local storage and state
                localStorage.removeItem('pdfArchive');
                setRecords([]);

                // 4. Delete all records from Supabase
                try {
                  if (localStorage.getItem("demo_mode_active") !== "true" && allIds.length > 0) {
                    const { default: supabase } = await import('@/lib/supabase');
                    await supabase.from('pdf_records').delete().in('id', allIds);
                  }
                } catch (e) {
                  console.warn("Supabase wipe failed:", e);
                }

                // 5. Refresh alerts store
                try { refreshAlerts(); } catch { }

                setDeleteAllOpen(false);
                toast({ title: "All Files Deleted", description: "The PDF archive and all related alerts have been completely cleared." });
              }}
              className="bg-destructive hover:bg-red-700"
            >
              Yes, Delete Everything
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
                    <Input value={row.name} onChange={(e) => setEmployeeRows(r => { const c = [...r]; c[idx] = { ...c[idx], name: e.target.value }; return c; })} />
                    <Input value={row.training} onChange={(e) => setEmployeeRows(r => { const c = [...r]; c[idx] = { ...c[idx], training: e.target.value }; return c; })} />
                    <Input value={row.jobsToday} onChange={(e) => setEmployeeRows(r => { const c = [...r]; c[idx] = { ...c[idx], jobsToday: e.target.value }; return c; })} />
                    <Input value={row.hours} onChange={(e) => setEmployeeRows(r => { const c = [...r]; c[idx] = { ...c[idx], hours: e.target.value }; return c; })} />
                  </Fragment>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdminModalOpen(false)}>Cancel</Button>
              <Button className="bg-red-700 hover:bg-red-800" onClick={() => {
                try {
                  // Ensure alerts list is up-to-date
                  try { refreshAlerts(); } catch { }
                  const doc = new jsPDF();
                  // Header
                  doc.setTextColor(200, 0, 0);
                  doc.setFontSize(18);
                  doc.text("Admin Updates", 20, 20);
                  doc.setTextColor(0, 0, 0);
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
                  const fileName = `Admin_Update_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
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
      </Dialog >

      {/* Immersive PDF Preview Dialog (PC and Mobile Optimized) */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => {
        if (!open) {
          setSelectedRecord(null);
          setViewerSrc(null);
          setViewerError(null);
          setViewerLoading(false);
        }
      }}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] p-0 bg-black/95 border-none outline-none overflow-hidden flex flex-col items-stretch z-[9999]">
          {/* Header Controls */}
          {/* Header Controls */}
          <div className="flex-none w-full z-50 p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-4 text-white min-w-0">
              <Button variant="ghost" size="icon" className="shrink-0 hover:bg-white/10" onClick={() => setSelectedRecord(null)}>
                <X className="w-6 h-6" />
              </Button>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black truncate max-w-[200px] sm:max-w-[400px] lg:max-w-[600px] block" title={selectedRecord?.fileName}>{selectedRecord?.fileName}</span>
                <span className="text-[10px] text-zinc-400 font-bold uppercase block truncate">{selectedRecord?.recordType} • {selectedRecord?.date}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hidden sm:flex" onClick={() => selectedRecord && downloadPDF(selectedRecord)}>
                <Download className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => window.print()}>
                <Printer className="w-5 h-5" />
              </Button>
              <div className="h-6 w-px bg-white/20 mx-2 hidden sm:block" />
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <Grid className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Main Viewer Area */}
          <div className="flex-1 relative flex items-center justify-center overflow-auto p-2 sm:p-4 pb-20 sm:pb-4 bg-zinc-900/50">
            {selectedRecord && (
              <div className="w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
                {viewerLoading && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-white font-bold">Analyzing Document...</p>
                  </div>
                )}
                
                {!viewerLoading && viewerSrc ? (
                  <div className="bg-white shadow-2xl w-full max-w-[850px] h-full sm:aspect-[8.5/11] rounded-sm overflow-hidden flex flex-col">
                    <iframe
                      key={selectedRecord.id}
                      src={viewerSrc}
                      title={selectedRecord.fileName}
                      className="w-full flex-1 border-0"
                    />
                  </div>
                ) : !viewerLoading && (
                  <div className="flex flex-col items-center gap-6 text-center max-w-sm px-6">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center">
                      <FileText className="w-12 h-12 text-zinc-600" />
                    </div>
                    <div>
                      <h3 className="text-white text-lg font-black mb-2">Preview Unavailable</h3>
                      <p className="text-zinc-400 text-sm">{viewerError || "Mobile security may block inline PDF viewing. Please download to view the full document."}</p>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700 w-full font-bold" onClick={() => downloadPDF(selectedRecord)}>
                      <Download className="w-4 h-4 mr-2" /> Download PDF
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Quick Action Footer */}
          {!viewerLoading && selectedRecord && (
            <div className="sm:hidden absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
              <Button className="bg-blue-600 hover:bg-blue-700 font-bold px-8 shadow-xl" onClick={() => downloadPDF(selectedRecord)}>
                <Download className="w-4 h-4 mr-2" /> Download Document
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog >
    </div >
  );
};

export default FileManager;
