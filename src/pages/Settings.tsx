import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Download, Upload, Trash2, RotateCcw } from "lucide-react";
import { postFullSync, postServicesFullSync } from "@/lib/servicesMeta";
import { exportAllData, downloadBackup, restoreFromJSON, SCHEMA_VERSION } from '@/lib/backup';
import { isDriveEnabled, uploadJSONToDrive, pickDriveFileAndDownload } from '@/lib/googleDrive';
import { deleteCustomersOlderThan, deleteInvoicesOlderThan, deleteExpensesOlderThan, deleteInventoryUsageOlderThan, deleteBookingsOlderThan, deleteEmployeesOlderThan, deleteEverything as deleteAllSupabase, previewDeleteCustomers, previewDeleteInvoices, previewDeleteExpenses, previewDeleteInventory, previewDeleteAll } from '@/services/supabase/adminOps';
import localforage from "localforage";
import EnvironmentHealthModal from '@/components/admin/EnvironmentHealthModal';
import { restoreDefaults, restorePackages, restoreAddons } from '@/lib/restoreDefaults';
import { insertMockData, removeMockData } from '@/lib/mockData';
import { insertStaticMockData, removeStaticMockData, insertStaticMockBasic, removeStaticMockBasic } from '@/lib/staticMock';
import jsPDF from 'jspdf';
import { savePDFToArchive } from '@/lib/pdfArchive';
import { pushAdminAlert } from '@/lib/adminAlerts';
import supabase, { isSupabaseConfigured } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const Settings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("");
  const [preview, setPreview] = useState<{ tables: { name: string; count: number }[] } | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<{ preserved: string[]; deleted: string[]; note?: string } | null>(null);
  const [healthOpen, setHealthOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [staticReportOpen, setStaticReportOpen] = useState(false);
  const [staticReportData, setStaticReportData] = useState<any | null>(null);
  const [mockDataOpen, setMockDataOpen] = useState(false);
  const [mockReport, setMockReport] = useState<any | null>(null);
  const [restoreDefaultsOpen, setRestoreDefaultsOpen] = useState(false);

  // Supabase diagnostics block state
  const [diag, setDiag] = useState<{ authMode: string; urlPresent: boolean; keyPresent: boolean; configured: boolean; uid: string | null; appUserReadable: boolean | null; lastChecked: string }>({
    authMode: String((import.meta as any)?.env?.VITE_AUTH_MODE || ''),
    urlPresent: !!(import.meta as any)?.env?.VITE_SUPABASE_URL,
    keyPresent: !!(import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY,
    configured: isSupabaseConfigured(),
    uid: null,
    appUserReadable: null,
    lastChecked: new Date().toISOString(),
  });

  const loadSupabaseDiagnostics = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id || null;
      let appUserReadable: boolean | null = null;
      if (uid) {
        try {
          const { data: au, error } = await supabase
            .from('app_users')
            .select('id')
            .eq('id', uid)
            .maybeSingle();
          appUserReadable = !!au && !error;
        } catch {
          appUserReadable = false;
        }
      }
      setDiag({
        authMode: String((import.meta as any)?.env?.VITE_AUTH_MODE || ''),
        urlPresent: !!(import.meta as any)?.env?.VITE_SUPABASE_URL,
        keyPresent: !!(import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY,
        configured: isSupabaseConfigured(),
        uid,
        appUserReadable,
        lastChecked: new Date().toISOString(),
      });
    } catch {
      setDiag(d => ({ ...d, configured: isSupabaseConfigured(), lastChecked: new Date().toISOString() }));
    }
  };

  useEffect(() => { loadSupabaseDiagnostics(); }, []);
  // Danger Zone PIN state and session unlock
  const [dangerPin, setDangerPin] = useState<string>(() => {
    try {
      const existing = localStorage.getItem('danger-pin');
      if (!existing) {
        localStorage.setItem('danger-pin', '1234');
        return '1234';
      }
      return existing;
    } catch {
      return '1234';
    }
  });
  const [pinInput, setPinInput] = useState<string>("");
  const [confirmText, setConfirmText] = useState<string>("");
  const [dangerUnlocked, setDangerUnlocked] = useState<boolean>(false);
  const [pinModalOpen, setPinModalOpen] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const pinRequired = true; // Always require PIN for destructive actions
  const pinValid = !!dangerPin && !!pinInput && dangerPin === pinInput;
  const confirmValid = confirmText.trim().toUpperCase() === "DELETE";

  // Redirect non-admin users
  if (user?.role !== 'admin') {
    navigate('/');
    return null;
  }

  const handleBackup = async () => {
    try {
      const { json } = await exportAllData();
      downloadBackup(json);
      toast({ title: "Backup Created", description: `Backup includes Supabase + local (v${SCHEMA_VERSION}).` });
    } catch (error) {
      toast({ title: "Backup Failed", description: "Could not create backup.", variant: "destructive" });
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await restoreFromJSON(text);
      toast({ title: "Restore Complete", description: "Supabase + local data restored." });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast({ title: "Restore Failed", description: "Could not restore data.", variant: "destructive" });
    }
  };

  const handleBackupToDrive = async () => {
    try {
      const { json } = await exportAllData();
      const enabled = await isDriveEnabled();
      if (!enabled) {
        downloadBackup(json);
        window.open('https://drive.google.com/drive/u/0/my-drive', '_blank');
        toast({ title: 'Drive Not Configured', description: 'Downloaded backup. Upload it to Drive manually.' });
        return;
      }
      const id = await uploadJSONToDrive(`pds-backup-${new Date().toISOString().split('T')[0]}.json`, json);
      if (id) {
        toast({ title: 'Backup Uploaded', description: `Google Drive file ID: ${id}` });
      } else {
        downloadBackup(json);
        window.open('https://drive.google.com/drive/u/0/my-drive', '_blank');
        toast({ title: 'Drive Upload Failed', description: 'Downloaded backup for manual upload.' });
      }
    } catch {
      toast({ title: 'Backup Failed', description: 'Unable to create or upload backup.', variant: 'destructive' });
    }
  };

  const handleOpenDriveRestore = async () => {
    try {
      const enabled = await isDriveEnabled();
      if (!enabled) {
        window.open('https://drive.google.com/drive/u/0/my-drive', '_blank');
        toast({ title: 'Drive Not Configured', description: 'Download JSON from Drive, then use Restore Backup.' });
        return;
      }
      const file = await pickDriveFileAndDownload();
      if (file?.content) {
        await restoreFromJSON(file.content);
        toast({ title: 'Restore Complete', description: `Restored from Drive file: ${file.name}` });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast({ title: 'No JSON Found', description: 'Pick a JSON backup in Drive.' });
      }
    } catch {
      toast({ title: 'Restore Failed', description: 'Unable to restore from Drive.', variant: 'destructive' });
    }
  };

  const handlePricingRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.savedPrices) await localforage.setItem('savedPrices', data.savedPrices);
      if (data.packageMeta) localStorage.setItem('packageMeta', JSON.stringify(data.packageMeta));
      if (data.addOnMeta) localStorage.setItem('addOnMeta', JSON.stringify(data.addOnMeta));
      if (data.customPackages) localStorage.setItem('customServicePackages', JSON.stringify(data.customPackages));
      if (data.customAddOns) localStorage.setItem('customAddOns', JSON.stringify(data.customAddOns));
      if (data.customServices) localStorage.setItem('customServices', JSON.stringify(data.customServices));
      await postFullSync();
      await postServicesFullSync();
      try { await fetch(`http://localhost:6061/api/packages/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }); } catch { }
      toast({ title: "Pricing restored from backup — live site updated" });
    } catch (error) {
      toast({ title: "Restore Failed", description: "Could not restore pricing.", variant: "destructive" });
    }
  };

  const deleteData = async (type: string) => {
    try {
      const now = new Date();
      const days = Number(String(timeRange || '').trim());
      const hasRange = Number.isFinite(days) && days > 0;
      const cutoffDate = new Date(now.getTime() - Math.max(0, days) * 24 * 60 * 60 * 1000);

      // Temporary detailed logs per request: role, filters, responses, audit-log
      const { data: auth } = await (await import('@/lib/supabase')).default.auth.getUser();
      const role = getCurrentUser()?.role;
      console.group(`[Settings] Delete request`);
      console.log('type', type);
      console.log('sessionUserId', auth?.user?.id);
      console.log('role', role);
      console.log('days', days, 'hasRange', hasRange, 'cutoffDate', cutoffDate.toISOString());

      if (type === "customers") {
        // Local cache
        const customers: any[] = await localforage.getItem("customers") || [];
        const filtered = hasRange
          ? customers.filter((c: any) => {
            const dateStr = c.createdAt || c.updatedAt || '';
            const date = dateStr ? new Date(dateStr) : null;
            return date && !Number.isNaN(date.getTime()) && date > cutoffDate;
          })
          : [];
        await localforage.setItem("customers", filtered);
        // Supabase — customers + app_users (role=customer)
        try {
          await deleteBookingsOlderThan(hasRange ? String(days) : 'all');
          console.log('[Settings] deleteBookingsOlderThan done');
          await deleteCustomersOlderThan(hasRange ? String(days) : 'all');
          console.log('[Settings] deleteCustomersOlderThan done');
        } catch (e) {
          console.error('[Settings] customers delete error', e);
          throw e;
        }
      } else if (type === "invoices") {
        const invoices: any[] = await localforage.getItem("invoices") || [];
        const filtered = hasRange
          ? invoices.filter((inv: any) => {
            const dateStr = inv.createdAt || inv.date || inv.updatedAt || '';
            const date = dateStr ? new Date(dateStr) : null;
            return date && !Number.isNaN(date.getTime()) && date > cutoffDate;
          })
          : [];
        await localforage.setItem("invoices", filtered);
        try {
          await deleteInvoicesOlderThan(hasRange ? String(days) : 'all');
          console.log('[Settings] deleteInvoicesOlderThan done');
        } catch (e) {
          console.error('[Settings] invoices delete error', e);
          throw e;
        }
      } else if (type === "accounting") {
        const expenses: any[] = await localforage.getItem("expenses") || [];
        const filtered = hasRange
          ? expenses.filter((exp: any) => {
            const dateStr = exp.date || exp.createdAt || '';
            const date = dateStr ? new Date(dateStr) : null;
            return date && !Number.isNaN(date.getTime()) && date > cutoffDate;
          })
          : [];
        await localforage.setItem("expenses", filtered);
        try {
          await deleteExpensesOlderThan(hasRange ? String(days) : 'all');
          console.log('[Settings] deleteExpensesOlderThan done');
        } catch (e) {
          console.error('[Settings] expenses delete error', e);
          throw e;
        }
      } else if (type === "inventory") {
        if (hasRange) {
          const usage: any[] = (await localforage.getItem("chemicalUsage")) || [];
          const filtered = usage.filter((u: any) => {
            const dateStr = u.date || '';
            const date = dateStr ? new Date(dateStr) : null;
            return date && !Number.isNaN(date.getTime()) && date > cutoffDate;
          });
          await localforage.setItem("chemicalUsage", filtered);
        } else {
          // Delete all local inventory lists when days are blank
          try { await localforage.removeItem("chemicals"); } catch { }
          try { await localforage.removeItem("materials"); } catch { }
          try { await localforage.removeItem("tools"); } catch { }
          try { await localforage.removeItem("inventory-estimates"); } catch { }
          try { await localforage.removeItem("chemicalUsage"); } catch { }
          try { await localforage.removeItem("chemical-usage"); } catch { }
        }
        try {
          await deleteInventoryUsageOlderThan(hasRange ? String(days) : 'all');
          console.log('[Settings] deleteInventoryUsageOlderThan done');
        } catch (e) {
          console.error('[Settings] inventory delete error', e);
          throw e;
        }
      } else if (type === "all") {
        // Supabase: Try to delete, but don't fail if Supabase is not configured
        try {
          await deleteAllSupabase();
          console.log('[Settings] deleteAllSupabase done');
        } catch (e) {
          console.warn('[Settings] Supabase delete skipped (not configured or failed):', e);
          // Continue with local deletion even if Supabase fails
        }

        // Local: selectively remove volatile data, preserve training/exam/admin/employee/pricing/website
        const volatileLfKeys = [
          'customers', 'invoices', 'expenses', 'estimates',
          'chemicals', 'materials', 'tools', 'chemicalUsage', 'chemical-usage', 'tool-usage', 'inventory-estimates',
          'completed-jobs', 'payroll-history', 'pdfArchive',
          // Category data (user-generated, should be deleted with transactions)
          'customCategories',
          'customExpenseCategories',
          'customIncomeCategories',
          'category-colors-map'
        ];
        for (const key of volatileLfKeys) {
          try { await localforage.removeItem(key); } catch { }
        }
        // Preserve all system/default data in localStorage
        const preserveLsKeys = new Set([
          // Training & Education
          'training_exam_custom', 'training_exam_progress', 'training_exam_schedule',
          'handbook_progress', 'handbook_start_at', 'employee_training_progress', 'employee_training_certified',
          // Authentication & User
          'currentUser', 'auth_token', 'user_session',
          // Pricing & Services (CRITICAL - never delete)
          'packageMeta', 'addOnMeta', 'customServicePackages', 'customAddOns', 'customServices', 'savedPrices',
          'servicePackages', 'addOns', 'pricing_config', 'savedPrices_backup', 'savedPrices_restore_point',
          // Website Content (CRITICAL - never delete)
          'faqs', 'contactInfo', 'aboutSections', 'aboutFeatures', 'testimonials',
          'hero_content', 'website_pages', 'website_config', 'seo_settings',
          // Admin Settings
          'hiddenMenuItems', 'admin_preferences', 'app_settings',
          // Company Data
          'company-employees', 'employee_roles',
          // Vehicle Database
          'vehicle_classification_history', 'vehicle_db'
        ]);
        // Remove localStorage items except preserved ones
        try {
          const lsKeys = Object.keys(localStorage);
          for (const k of lsKeys) {
            if (!preserveLsKeys.has(k)) localStorage.removeItem(k);
          }
        } catch { }
        setSummaryData({
          preserved: Array.from(preserveLsKeys),
          deleted: volatileLfKeys,
          note: 'Preserved: Admin/employee accounts, exam content, training manual, pricing packages, website content, and all system configurations.'
        });
        setSummaryOpen(true);
        // Revalidate live content endpoints on port 6063 (user's custom port)
        try { await fetch(`http://localhost:6063/api/packages/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }); } catch { }
        try { await fetch(`http://localhost:6063/api/addons/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }); } catch { }
        try { setTimeout(() => window.location.reload(), 300); } catch { }
      }

      const rangeText = type === 'all' ? '' : hasRange ? ` older than ${days} day(s)` : ' (all)';
      toast({ title: "Data Deleted", description: `${type} data${rangeText} removed.` });
      console.groupEnd();
      setDeleteDialog(null);
      setTimeRange("");
    } catch (error) {
      // Surface full Supabase error in console
      try {
        const err = error as any;
        console.error('[Settings] Delete Failed', {
          type,
          error: err,
          message: err?.message,
          details: err?.details,
          hint: err?.hint,
          code: err?.code,
        });
      } catch { }
      toast({ title: "Delete Failed", description: "Could not delete data.", variant: "destructive" });
      console.groupEnd();
    }
  };

  const handleRestoreDefaults = () => {
    setRestoreDefaultsOpen(true);
  };

  const executeRestore = async (mode: 'packages' | 'addons' | 'both') => {
    try {
      setRestoreDefaultsOpen(false);
      toast({ title: 'Restoring...', description: `Restoring ${mode === 'both' ? 'packages and add-ons' : mode}...` });

      if (mode === 'packages') await restorePackages();
      else if (mode === 'addons') await restoreAddons();
      else await restoreDefaults();

      // Notify listeners of content changes
      try {
        window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'vehicle-types' } }));
        window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'packages' } }));
        window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'faqs' } }));
        window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'contact' } }));
        window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'about' } }));
      } catch { }

      // Revalidate live content endpoints on port 6061 if available
      try { await fetch(`http://localhost:6061/api/packages/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }); } catch { }
      try { await fetch(`http://localhost:6061/api/addons/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }); } catch { }

      toast({ title: 'Restored', description: `${mode === 'both' ? 'Defaults' : mode} restored successfully. Live site updated.` });
    } catch (err: any) {
      toast({ title: 'Restore Failed', description: err?.message || String(err), variant: 'destructive' });
    }
  };

  // Load dry-run preview when dialog opens or timeRange changes
  useEffect(() => {
    const load = async () => {
      if (!deleteDialog) { setPreview(null); return; }
      const d = String(timeRange || '').trim();
      try {
        if (deleteDialog === 'customers') setPreview(await previewDeleteCustomers(d));
        else if (deleteDialog === 'invoices') setPreview(await previewDeleteInvoices(d));
        else if (deleteDialog === 'accounting') setPreview(await previewDeleteExpenses(d));
        else if (deleteDialog === 'inventory') setPreview(await previewDeleteInventory(d));
        else if (deleteDialog === 'all') setPreview(await previewDeleteAll(d));
      } catch { setPreview(null); }
    };
    load();
  }, [deleteDialog, timeRange]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Settings" />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6 animate-fade-in">
          {/* Supabase Diagnostics */}
          <Card className="p-4 border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Supabase Diagnostics</h2>
              <Button variant="outline" size="sm" onClick={loadSupabaseDiagnostics}>Refresh</Button>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">VITE_AUTH_MODE:</span> <span className="font-mono">{diag.authMode || 'unset'}</span></div>
              <div><span className="text-muted-foreground">URL detected:</span> <span className="font-mono">{diag.urlPresent ? 'yes' : 'no'}</span></div>
              <div><span className="text-muted-foreground">Anon key detected:</span> <span className="font-mono">{diag.keyPresent ? 'yes' : 'no'}</span></div>
              <div><span className="text-muted-foreground">isSupabaseConfigured:</span> <span className="font-mono">{String(diag.configured)}</span></div>
              <div><span className="text-muted-foreground">auth.getUser().uid:</span> <span className="font-mono">{diag.uid || 'none'}</span></div>
              <div><span className="text-muted-foreground">app_users readable:</span> <span className="font-mono">{diag.appUserReadable === null ? 'unknown' : diag.appUserReadable ? 'yes' : 'no'}</span></div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Last checked: {new Date(diag.lastChecked).toLocaleString()}</div>
          </Card>

          {/* Backup & Restore */}
          <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Backup & Restore</h2>
            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground mb-4">Download a backup of all your data or restore from a previous backup.</p>
                <div className="flex gap-4 flex-wrap">
                  <Button onClick={handleBackup} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Backup
                  </Button>
                  <Button onClick={handleBackupToDrive} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Backup then Open Google Drive
                  </Button>
                  <label>
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Restore Backup
                      </span>
                    </Button>
                    <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
                  </label>
                  <Button variant="outline" onClick={handleOpenDriveRestore}>
                    <Upload className="h-4 w-4 mr-2" />
                    Open Drive to fetch backup
                  </Button>
                  <label>
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Restore Pricing from JSON Backup
                      </span>
                    </Button>
                    <input type="file" accept=".json" className="hidden" onChange={handlePricingRestore} />
                  </label>
                  <Button variant="outline" onClick={() => setHealthOpen(true)}>
                    Environment Health Check
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Mock Data System (Local Only) */}
          <Card className="p-6 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Mock Data System</h2>
            <p className="text-sm text-muted-foreground mb-4">Insert and remove local-only mock customers, employees, and inventory. No Supabase interaction.</p>
            <div className="flex flex-wrap gap-4">
              <Button variant="default" onClick={() => { setMockDataOpen(true); setMockReport(null); }}>
                Open Mock Data System
              </Button>
            </div>
          </Card>

          {/* Mock Data Tools */}
          <Card className="p-6 bg-gradient-card border-border hidden">
            <h2 className="text-2xl font-bold text-foreground mb-4">Mock Data Tools</h2>
            <p className="text-sm text-muted-foreground mb-4">Create and remove realistic test users and jobs via normal backend flows. Mock entries are tagged internally and removable.</p>
            <div className="flex flex-wrap gap-4">
              <Button
                variant="default"
                onClick={async () => {
                  try {
                    toast({ title: 'Seeding Mock Data', description: 'Creating users, jobs, invoices, inventory…' });
                    // Open report immediately and stream progress lines
                    setReportData({ progress: ['Starting mock data insertion…'] });
                    setReportOpen(true);
                    const push = (msg: string) => {
                      setReportData((prev: any) => ({ ...(prev || {}), progress: [...((prev?.progress) || []), `${new Date().toLocaleTimeString()} — ${msg}`] }));
                    };
                    const tracker = await insertMockData(push);
                    // Trigger UI refresh events so other pages pick up changes
                    try {
                      window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'users' } }));
                      window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'customers' } }));
                      window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'employees' } }));
                      window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'invoices' } }));
                      window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'jobs' } }));
                      window.dispatchEvent(new CustomEvent('inventory-changed'));
                    } catch { }
                    // Build full report with local + supabase verification
                    const errors: Array<{ step: string; message: string; fallback?: string; suggestion?: string }> = [];
                    const usersLF = (await localforage.getItem<any[]>('users')) || [];
                    const customersLF = (await localforage.getItem<any[]>('customers')) || [];
                    const employeesLF = (await localforage.getItem<any[]>('company-employees')) || [];
                    const invoicesLF = (await localforage.getItem<any[]>('invoices')) || [];
                    const checklistsLF = (await localforage.getItem<any[]>('generic-checklists')) || [];
                    let pdfCount = 0;
                    try { const pdfRaw = JSON.parse(localStorage.getItem('pdfArchive') || '[]'); pdfCount = Array.isArray(pdfRaw) ? pdfRaw.length : 0; } catch { }
                    let appUsersSB: any[] = [];
                    let customersSB: any[] = [];
                    let supabaseNote = 'Supabase not configured';
                    if (isSupabaseConfigured()) {
                      try {
                        const ids = tracker.users.map((u: any) => u.id);
                        const custIds = tracker.users.filter((u: any) => u.role === 'customer').map((u: any) => u.id);
                        const { data: au, error: auErr } = await supabase.from('app_users').select('id,email').in('id', ids);
                        const { data: cu, error: cuErr } = await supabase.from('customers').select('id,email').in('id', custIds);
                        appUsersSB = Array.isArray(au) ? au : [];
                        customersSB = Array.isArray(cu) ? cu : [];
                        supabaseNote = 'Verified app_users and customers tables';
                        if (auErr || cuErr) {
                          errors.push({ step: 'Supabase verify', message: 'Verification partially failed', fallback: 'Local caches present', suggestion: 'Check RLS policies for app_users/customers' });
                        }
                      } catch (e: any) {
                        errors.push({ step: 'Supabase verify', message: e?.message || 'Failed to read Supabase tables', fallback: 'Local-only data inserted', suggestion: 'Ensure VITE_SUPABASE_URL and anon key are set, and RLS allows reads' });
                      }
                    }
                    // Build customers and employees sections
                    const custSection = tracker.users.filter((u: any) => u.role === 'customer').map((u: any) => {
                      const inUsers = usersLF.some(x => x.id === u.id);
                      const inCustomers = customersLF.some(x => x.id === u.id);
                      const sbApp = appUsersSB.some(x => x.id === u.id);
                      const sbCust = customersSB.some(x => x.id === u.id);
                      if (!sbApp && isSupabaseConfigured()) errors.push({ step: 'Create user (app_users)', message: `Customer ${u.email} not found in app_users`, fallback: 'Local cache created', suggestion: 'Confirm edge function create-user executed' });
                      return {
                        name: u.name,
                        email: u.email,
                        role: 'customer',
                        supabase: { app_users: sbApp, customers: sbCust, auth_users: 'unavailable' },
                        local: { users: inUsers, customers: inCustomers },
                        appears: [
                          'Appears in Customers list under Admin → Customers',
                          'Searchable via Customers search and dropdown selectors',
                          isSupabaseConfigured() ? 'Added to Supabase table customers (if configured)' : 'Local only — Supabase not configured',
                        ],
                      };
                    });
                    const empSection = tracker.users.filter((u: any) => u.role === 'employee').map((u: any) => {
                      const inUsers = usersLF.some(x => x.id === u.id);
                      const inEmployees = employeesLF.some(x => x.id === u.id);
                      const sbApp = appUsersSB.some(x => x.id === u.id);
                      if (!sbApp && isSupabaseConfigured()) errors.push({ step: 'Create user (app_users)', message: `Employee ${u.email} not found in app_users`, fallback: 'Local cache created', suggestion: 'Confirm edge function create-user executed' });
                      return {
                        name: u.name,
                        email: u.email,
                        role: 'employee',
                        supabase: { app_users: sbApp, customers: false, auth_users: 'unavailable' },
                        local: { users: inUsers, employees: inEmployees },
                        appears: [
                          'Appears in Employees list under Admin → Company Employees',
                          'Appears in employee dropdown for job assignment',
                          isSupabaseConfigured() ? 'Added to Supabase table app_users (if configured)' : 'Local only — Supabase not configured',
                        ],
                      };
                    });
                    // Jobs + invoices
                    const jobsSection = (tracker.jobDetails || []).map((j: any) => {
                      const inChecklist = checklistsLF.some(x => x.id === j.id);
                      const invObj = invoicesLF.find(x => x.id === j?.invoice?.id);
                      const invInfo = invObj ? { total: invObj.total, paidAmount: invObj.paidAmount, paymentStatus: invObj.paymentStatus } : j.invoice;
                      if (!inChecklist) errors.push({ step: 'Checklist creation', message: `Job ${j.id} not found in generic-checklists`, fallback: 'Invoice may still exist', suggestion: 'Check Jobs Completed page filters' });
                      return {
                        id: j.id,
                        customer: j.customerName,
                        employee: j.employeeName,
                        package: j.packageName,
                        invoice: invInfo,
                        appears: [
                          'Appears in Jobs Completed; enable grouping if helpful',
                          'Shows totals in Invoicing; filter by customer',
                          'PDF archived if jsPDF available (Job PDF Archive)',
                        ],
                      };
                    });
                    const inventorySection = (tracker.inventory || []).map((i: any) => ({
                      name: i.name,
                      category: i.category,
                      appears: [
                        i.category === 'Chemical' ? 'In Inventory Control under Chemicals' : 'In Inventory Control under Materials',
                        'Shows in Inventory Report',
                      ],
                    }));
                    const summary = {
                      supabase_app_users: appUsersSB.length,
                      supabase_customers: customersSB.length,
                      supabase_auth_users: 'unavailable',
                      local_users: usersLF.length,
                      local_customers: customersLF.length,
                      local_employees: employeesLF.length,
                      local_invoices: invoicesLF.length,
                      local_checklists: checklistsLF.length,
                      pdf_archive_count: pdfCount,
                      note: isSupabaseConfigured() ? supabaseNote : 'Local-only mode',
                    };
                    setReportData((prev: any) => ({ ...(prev || {}), customers: custSection, employees: empSection, jobs: jobsSection, inventory: inventorySection, summary, errors }));
                    toast({ title: 'Mock Data Inserted', description: `Users: ${tracker.users.length}, Jobs: ${tracker.jobs.length}, Invoices: ${tracker.invoices.length}` });
                    // Revalidate content endpoints on 6061 if available
                    try { await fetch(`http://localhost:6061/api/packages/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }); } catch { }
                    try { await fetch(`http://localhost:6061/api/addons/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }); } catch { }
                  } catch (e) {
                    toast({ title: 'Insert Failed', description: 'Could not insert mock data.', variant: 'destructive' });
                  }
                }}
              >Insert Mock Data</Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await removeMockData();
                    try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'users' } })); } catch { }
                    toast({ title: 'Mock Data Removed', description: 'Local caches and counts refreshed.' });
                  } catch (e) {
                    toast({ title: 'Remove Failed', description: 'Could not remove mock data.', variant: 'destructive' });
                  }
                }}
              >Remove Mock Data</Button>
            </div>
          </Card>

          {/* Danger Zone — locked overlay / gated by PIN */}
          <Card
            className="p-6 bg-gradient-card border-destructive border-2 cursor-pointer"
            onClick={() => { if (!dangerUnlocked) { setPinInput(""); setPinModalOpen(true); } }}
          >
            <h2 className="text-2xl font-bold text-destructive mb-2">⚠️ Danger Zone</h2>
            {!dangerUnlocked && (
              <div className="text-muted-foreground">
                <p className="mb-2">Locked — click to unlock with PIN.</p>
                <div className="text-xs">Default PIN is 1 2 3 4. You can change it in the modal.</div>
              </div>
            )}
            {dangerUnlocked && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Critical operations. Use individual delete functions in each module for targeted deletions.
                </p>

                {/* Restore Packages & Addons */}
                <div className="border border-amber-500/30 rounded-lg p-4 bg-amber-500/5">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-amber-500" />
                        Restore Packages & Addons
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Restore original pricing packages and add-ons to factory defaults
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        ✓ Safe operation - only resets pricing data
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleRestoreDefaults}
                      className="border-amber-500 text-amber-600 hover:bg-amber-500/10"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore Defaults
                    </Button>
                  </div>
                </div>

                {/* DELETE EVERYTHING */}
                <div className="border-t-2 border-destructive/50 pt-6">
                  <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/5">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-destructive text-lg flex items-center gap-2">
                          <Trash2 className="h-6 w-6" />
                          DELETE ALL USER DATA
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          Permanently remove ALL user-generated data from the application
                        </p>
                        <div className="mt-3 space-y-1 text-xs">
                          <p className="text-destructive font-semibold">⚠️ This will delete:</p>
                          <ul className="list-disc list-inside ml-2 text-muted-foreground space-y-0.5">
                            <li>All customers, vehicles, and bookings</li>
                            <li>All invoices and estimates</li>
                            <li>All accounting records (income & expenses)</li>
                            <li>All custom income & expense categories</li>
                            <li>All category color assignments</li>
                            <li>All inventory data and usage logs</li>
                            <li>All employee records (except current user)</li>
                            <li>All payroll history and payment records</li>
                            <li>All job history and notes</li>
                          </ul>
                          <p className="text-green-600 font-semibold mt-2">✓ This will preserve:</p>
                          <ul className="list-disc list-inside ml-2 text-muted-foreground space-y-0.5">
                            <li>Pricing packages & addons</li>
                            <li>Default income & expense categories</li>
                            <li>Vehicle classifications</li>
                            <li>Service templates</li>
                            <li>Standard inventory lists (Import Wizard defaults)</li>
                            <li>Training manual & exam questions</li>
                            <li>System settings</li>
                            <li>Website content</li>
                          </ul>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="lg"
                        className="bg-destructive text-destructive-foreground font-bold min-w-[200px]"
                        onClick={() => { setPinInput(""); setDeleteDialog("all"); }}
                      >
                        <Trash2 className="h-5 w-5 mr-2" />
                        DELETE EVERYTHING
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="font-semibold mb-2">💡 Need to delete specific items?</p>
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    <li>• <strong>Customers:</strong> Go to Customers page → Delete individual customers</li>
                    <li>• <strong>Accounting:</strong> Go to Accounting → Transaction Ledger → Edit/Delete individual transactions</li>
                    <li>• <strong>Custom Categories:</strong> Go to Company Budget → Manage income/expense categories</li>
                    <li>• <strong>Category Colors:</strong> Automatically assigned and managed in Accounting page</li>
                    <li>• <strong>Invoices/Estimates:</strong> Go to Invoicing page → Delete individual invoices</li>
                    <li>• <strong>Employees:</strong> Go to Company Employees → Delete individual employees</li>
                    <li>• <strong>Payroll History:</strong> Go to Payroll → History tab → Edit/Delete individual payments</li>
                    <li>• <strong>Inventory:</strong> Go to Inventory → Delete items (can rebuild from Import Wizard)</li>
                    <li>• <strong>Mock Data:</strong> Use "Mock Data System" button or "Clear Mock Employees"</li>
                  </ul>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Danger Zone PIN Modal */}
      <Dialog open={pinModalOpen} onOpenChange={setPinModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Danger Zone PIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Enter PIN to unlock</Label>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                type="password"
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-32 mt-1"
              />
              {pinError && <p className="text-xs text-destructive mt-1">{pinError}</p>}
              <div className="mt-3">
                <Button
                  onClick={() => {
                    if (pinValid) {
                      setDangerUnlocked(true);
                      setPinModalOpen(false);
                      setPinError('');
                      toast?.({ title: 'Unlocked', description: 'Danger Zone visible for this session.' });
                    } else {
                      setPinError('Incorrect PIN');
                    }
                  }}
                >Unlock</Button>
              </div>
            </div>

            <div className="border-t pt-3">
              <Label className="text-sm">Change PIN (4 digits)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  type="password"
                  placeholder="New PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-32"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!newPin || newPin.length !== 4) {
                      setPinError('PIN must be 4 digits');
                      return;
                    }
                    setDangerPin(newPin);
                    try { localStorage.setItem('danger-pin', newPin); } catch { }
                    setNewPin('');
                    setPinError('');
                    toast?.({ title: 'PIN changed', description: 'New PIN saved.' });
                  }}
                >Save PIN</Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setNewPin('');
                    try { localStorage.setItem('danger-pin', '1234'); } catch { }
                    setDangerPin('1234');
                    toast?.({ title: 'PIN reset', description: 'Default set to 1234.' });
                  }}
                >Reset to 1234</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog !== null} onOpenChange={() => {
        setDeleteDialog(null);
        setTimeRange("");
        setPinInput("");
        setConfirmText("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog === 'all'
                ? 'This will delete ALL volatile data. Admin/employee accounts, exam questions, training manual, and pricing metadata are preserved.'
                : `This will delete ${deleteDialog} data ${timeRange ? `older than ${timeRange} day(s)` : '(all)'}.`
              }
              {preview && (
                <div className="mt-3 text-sm">
                  <div className="font-medium">Dry-run preview:</div>
                  {(preview.tables || []).map((t) => (
                    <div key={t.name}>{t.name}: {t.count} rows</div>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Label className="text-sm">Enter PIN to confirm</Label>
                {!dangerPin && (
                  <p className="text-xs text-amber-500 mt-1">No PIN set. Save a PIN above to enable destructive actions.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteDialog !== "all" && (
            <div className="py-4">
              <Label htmlFor="timeRange">Delete records older than (days):</Label>
              <Input
                id="timeRange"
                type="number"
                placeholder="e.g., 30, 90, 365"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">Leave blank to delete all records in this group.</p>
            </div>
          )}

          {/* PIN Entry */}
          <div className="py-2">
            <Label className="text-sm font-semibold">
              {deleteDialog === "all" ? "Step 1: Enter PIN" : "Enter PIN to confirm"}
            </Label>
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              type="password"
              placeholder="Enter PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              className="w-48 mt-2"
            />
            {pinRequired && dangerPin && !pinValid && pinInput && (
              <p className="text-xs text-destructive mt-1">❌ PIN does not match.</p>
            )}
            {pinValid && (
              <p className="text-xs text-green-600 mt-1">✓ PIN verified</p>
            )}
          </div>

          {/* Type DELETE Confirmation - ONLY for "all" delete */}
          {deleteDialog === "all" && (
            <div className="py-2">
              <Label className="text-sm font-semibold">Step 2: Type DELETE to confirm</Label>
              <Input
                placeholder='Type "DELETE" (all caps)'
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-48 mt-2"
                disabled={!pinValid}
              />
              {confirmText && !confirmValid && (
                <p className="text-xs text-destructive mt-1">❌ Must type DELETE exactly (all caps)</p>
              )}
              {confirmValid && (
                <p className="text-xs text-green-600 mt-1">✓ Confirmation verified</p>
              )}
            </div>
          )}

          <AlertDialogFooter className="button-group-responsive">
            <AlertDialogCancel onClick={() => {
              setPinInput("");
              setConfirmText("");
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteData(deleteDialog!)}
              className="bg-destructive"
              disabled={
                !dangerPin ||
                !pinValid ||
                (deleteDialog === "all" && !confirmValid) // Only require confirmValid for "all"
              }
            >
              Yes, Delete {deleteDialog === "all" ? "Everything" : "Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Delete Everything Summary Modal */}
      <AlertDialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Everything Summary</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="mb-2 text-sm">
                Preserved keys: {summaryData?.preserved?.join(', ') || 'None'}
              </div>
              <div className="mb-2 text-sm">
                Deleted keys: {summaryData?.deleted?.join(', ') || 'None'}
              </div>
              <div className="text-sm">{summaryData?.note}</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSummaryOpen(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EnvironmentHealthModal open={healthOpen} onOpenChange={setHealthOpen} />
      {/* Mock Data System Popup — local-only users/employees/inventory */}
      <Dialog open={mockDataOpen} onOpenChange={setMockDataOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Mock Data System (Local Only)</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 text-sm">
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-red-700 hover:bg-red-800"
                onClick={async () => {
                  try {
                    setMockReport({ progress: ['Starting local-only insertion…'], createdAt: new Date().toISOString() });
                    const push = (msg: string) => setMockReport((prev: any) => ({ ...(prev || {}), progress: [...((prev?.progress) || []), `${new Date().toLocaleTimeString()} — ${msg}`] }));
                    const tracker = await insertStaticMockBasic(push, { customers: 5, employees: 5, chemicals: 3, materials: 3 });
                    // Build simple report
                    const usersLF = (await localforage.getItem<any[]>('users')) || [];
                    const customersLF = (await localforage.getItem<any[]>('customers')) || [];
                    const employeesLF = (await localforage.getItem<any[]>('company-employees')) || [];
                    const chemicalsLF = (await localforage.getItem<any[]>('chemicals')) || [];
                    const materialsLF = (await localforage.getItem<any[]>('materials')) || [];
                    const summary = {
                      local_users: usersLF.length,
                      local_customers: customersLF.length,
                      local_employees: employeesLF.length,
                      chemicals_count: chemicalsLF.length,
                      materials_count: materialsLF.length,
                      mode: 'Local only — Not Linked to Supabase',
                    };
                    setMockReport((prev: any) => ({
                      ...(prev || {}),
                      customers: tracker.customers,
                      employees: tracker.employees,
                      inventory: tracker.inventory,
                      income: tracker.income,
                      expenses: tracker.expenses,
                      payroll: tracker.payroll,
                      invoices: tracker.invoices,
                      categories: tracker.categories,
                      summary
                    }));
                    try {
                      window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'users' } }));
                      window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'customers' } }));
                      window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'employees' } }));
                      window.dispatchEvent(new CustomEvent('inventory-changed'));
                    } catch { }
                    toast?.({ title: 'Static Mock Data Inserted', description: 'Added customers, employees, and inventory locally.' });
                  } catch (e: any) {
                    const errMsg = e?.message || String(e);
                    setMockReport((prev: any) => ({ ...(prev || {}), errors: [...(prev?.errors || []), errMsg] }));
                  }
                }}
              >Insert Mock Data</Button>
              <Button
                variant="outline"
                className="border-red-700 text-red-700 hover:bg-red-700/10"
                onClick={async () => {
                  try {
                    setMockReport((prev: any) => ({ ...(prev || {}), progress: ['Removing local-only mock data…'] }));
                    await removeStaticMockBasic((msg) => setMockReport((prev: any) => ({ ...(prev || {}), progress: [...((prev?.progress) || []), `${new Date().toLocaleTimeString()} — ${msg}`] })));
                    try {
                      window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'users' } }));
                      window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'customers' } }));
                      window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'employees' } }));
                      window.dispatchEvent(new CustomEvent('inventory-changed'));
                    } catch { }
                    setMockReport((prev: any) => ({ ...(prev || {}), removed: true, removedAt: new Date().toISOString() }));
                    toast?.({ title: 'Static Mock Data Removed', description: 'Local-only mock data was cleared.' });
                  } catch (e: any) {
                    const errMsg = e?.message || String(e);
                    setMockReport((prev: any) => ({ ...(prev || {}), errors: [...(prev?.errors || []), errMsg] }));
                  }
                }}
              >Remove Mock Data</Button>
              <Button
                variant="secondary"
                className="border-red-700 text-white bg-red-700 hover:bg-red-800"
                onClick={() => {
                  try {
                    const doc = new jsPDF();
                    const addLine = (text: string, indent = 0) => {
                      doc.text(text, 20 + indent, y);
                      y += 6;
                      if (y > 270) { doc.addPage(); y = 20; }
                    };

                    doc.setFontSize(18);
                    doc.text('Mock Data Report', 105, 18, { align: 'center' });
                    doc.setFontSize(11);
                    const created = mockReport?.createdAt ? new Date(mockReport.createdAt).toLocaleString() : new Date().toLocaleString();
                    const removed = mockReport?.removedAt ? new Date(mockReport.removedAt).toLocaleString() : '—';
                    let y = 30;
                    addLine(`Created: ${created}`);
                    addLine(`Removed: ${removed}`);

                    // Live Progress
                    if ((mockReport?.progress || []).length > 0) {
                      doc.setFontSize(12);
                      addLine('Live Progress:');
                      doc.setFontSize(11);
                      (mockReport?.progress || []).forEach((ln: string) => addLine(`- ${ln}`, 6));
                    }

                    // Summary
                    if (mockReport?.summary) {
                      doc.setFontSize(12);
                      addLine('Summary:');
                      doc.setFontSize(11);
                      addLine(`Local Users: ${mockReport.summary.local_users}`, 6);
                      addLine(`Local Customers: ${mockReport.summary.local_customers}`, 6);
                      addLine(`Local Employees: ${mockReport.summary.local_employees}`, 6);
                      addLine(`Chemicals: ${mockReport.summary.chemicals_count}`, 6);
                      addLine(`Materials: ${mockReport.summary.materials_count}`, 6);
                      addLine(`Mode: ${mockReport.summary.mode}`, 6);
                    }

                    // Customers
                    doc.setFontSize(12);
                    addLine('Customers:');
                    doc.setFontSize(11);
                    (mockReport?.customers || []).forEach((c: any) => addLine(`- ${c.name} — ${c.email}`, 6));

                    // Employees
                    doc.setFontSize(12);
                    addLine('Employees:');
                    doc.setFontSize(11);
                    (mockReport?.employees || []).forEach((e: any) => addLine(`- ${e.name} — ${e.email}`, 6));

                    // Inventory
                    doc.setFontSize(12);
                    addLine('Inventory:');
                    doc.setFontSize(11);
                    (mockReport?.inventory || []).forEach((i: any) => addLine(`- ${i.category}: ${i.name}`, 6));

                    // Categories (NEW!)
                    if (mockReport?.categories) {
                      doc.setFontSize(12);
                      addLine('Custom Categories:');
                      doc.setFontSize(11);
                      addLine(`Income Categories (${(mockReport.categories.income || []).length}):`, 6);
                      (mockReport.categories.income || []).forEach((cat: string) => addLine(`  - ${cat}`, 10));
                      addLine(`Expense Categories (${(mockReport.categories.expense || []).length}):`, 6);
                      (mockReport.categories.expense || []).forEach((cat: string) => addLine(`  - ${cat}`, 10));
                    }

                    // Income Transactions (NEW!)
                    if ((mockReport?.income || []).length > 0) {
                      doc.setFontSize(12);
                      addLine(`Income Transactions (${mockReport.income.length}):`);
                      doc.setFontSize(11);
                      mockReport.income.forEach((inc: any) => {
                        const date = new Date(inc.date).toLocaleDateString();
                        addLine(`- $${inc.amount} — ${inc.category} (${inc.source}) — ${date}`, 6);
                      });
                    }

                    // Expense Transactions (NEW!)
                    if ((mockReport?.expenses || []).length > 0) {
                      doc.setFontSize(12);
                      addLine(`Expense Transactions (${mockReport.expenses.length}):`);
                      doc.setFontSize(11);
                      mockReport.expenses.forEach((exp: any) => {
                        const date = new Date(exp.date).toLocaleDateString();
                        addLine(`- $${exp.amount} — ${exp.category} — ${date}`, 6);
                      });
                    }

                    // Payroll History (NEW!)
                    if ((mockReport?.payroll || []).length > 0) {
                      doc.setFontSize(12);
                      addLine(`Payroll History (${mockReport.payroll.length}):`);
                      doc.setFontSize(11);
                      mockReport.payroll.forEach((pay: any) => {
                        const date = new Date(pay.date).toLocaleDateString();
                        addLine(`- ${pay.employeeName}: $${pay.amount} (${pay.type}) — ${date}`, 6);
                      });
                    }

                    // Invoices (NEW!)
                    if ((mockReport?.invoices || []).length > 0) {
                      doc.setFontSize(12);
                      addLine(`Sample Invoices (${mockReport.invoices.length}):`);
                      doc.setFontSize(11);
                      mockReport.invoices.forEach((inv: any) => {
                        addLine(`- Invoice #${inv.invoiceNumber}: ${inv.customerName} — $${inv.total} (${inv.paymentStatus})`, 6);
                      });
                    }

                    // Removal status
                    if (mockReport?.removed) {
                      doc.setFontSize(12);
                      addLine('Removal Status:');
                      doc.setFontSize(11);
                      addLine(`Mock data removed at ${new Date(mockReport.removedAt).toLocaleString()}`, 6);
                    }

                    // Errors
                    if ((mockReport?.errors || []).length > 0) {
                      doc.setFontSize(12);
                      addLine('Issues detected:');
                      doc.setFontSize(11);
                      (mockReport.errors || []).forEach((err: any) => addLine(`- ${String(err)}`, 6));
                    }

                    const dataUrl = doc.output('dataurlstring');
                    const today = new Date().toISOString().split('T')[0];
                    const fileName = `MockData_Report_${today}.pdf`;
                    savePDFToArchive('Mock Data' as any, 'Admin', `mock-data-${Date.now()}`, dataUrl, { fileName, path: 'Mock Data/' });

                    // Push admin alert (imported at top)
                    try {
                      pushAdminAlert('pdf_saved', 'Mock Data Report saved to File Manager', 'system', {
                        recordType: 'Mock Data',
                        fileName
                      });
                    } catch { }

                    toast?.({ title: 'Saved to File Manager', description: 'Mock Data Report archived.' });
                  } catch (e: any) {
                    toast?.({ title: 'Save Failed', description: e?.message || 'Could not generate PDF', variant: 'destructive' });
                  }
                }}
              >Save to PDF</Button>
            </div>
            {/* Live Progress */}
            {mockReport?.progress && (
              <div className="rounded-md border p-3">
                <div className="font-semibold mb-2">Live Progress</div>
                {(mockReport.progress || []).map((ln: string, i: number) => (
                  <div key={`prog-${i}`}>- {ln}</div>
                ))}
              </div>
            )}
            {/* Summary */}
            {mockReport?.summary && (
              <div className="rounded-md border p-3">
                <div className="font-semibold mb-2">Summary</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>Local Users: {mockReport.summary.local_users}</div>
                  <div>Local Customers: {mockReport.summary.local_customers}</div>
                  <div>Local Employees: {mockReport.summary.local_employees}</div>
                  <div>Chemicals: {mockReport.summary.chemicals_count}</div>
                  <div>Materials: {mockReport.summary.materials_count}</div>
                  <div>Mode: {mockReport.summary.mode}</div>
                </div>
              </div>
            )}
            {/* Created lists */}
            {mockReport?.customers && (
              <div className="rounded-md border p-3">
                <div className="font-semibold mb-2">Customers</div>
                <ul className="list-disc ml-5">
                  {mockReport.customers.map((c: any, i: number) => (
                    <li key={`c-${i}`}>{c.name} — {c.email}</li>
                  ))}
                </ul>
              </div>
            )}
            {mockReport?.employees && (
              <div className="rounded-md border p-3">
                <div className="font-semibold mb-2">Employees</div>
                <ul className="list-disc ml-5">
                  {mockReport.employees.map((e: any, i: number) => (
                    <li key={`e-${i}`}>{e.name} — {e.email}</li>
                  ))}
                </ul>
              </div>
            )}
            {mockReport?.inventory && (
              <div className="rounded-md border p-3">
                <div className="font-semibold mb-2">Inventory</div>
                <ul className="list-disc ml-5">
                  {mockReport.inventory.map((it: any, i: number) => (
                    <li key={`i-${i}`}>{it.category}: {it.name}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Removal status */}
            {mockReport?.removed && (
              <div className="rounded-md border border-yellow-600 p-3 text-yellow-600">
                Mock data removed at {new Date(mockReport.removedAt).toLocaleString()}
              </div>
            )}
            {/* Errors */}
            {mockReport?.errors?.length > 0 && (
              <div className="rounded-md border border-destructive p-3 text-destructive">
                <div className="font-semibold mb-2">Issues detected</div>
                {mockReport.errors.map((err: any, i: number) => (
                  <div key={i} className="mb-1">- {String(err)}</div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Mock Data Report Popup */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Mock Data Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 text-sm">
            {reportData?.progress && (
              <div className="rounded-md border p-3">
                <div className="font-semibold mb-2">Live Progress</div>
                {(reportData.progress || []).map((ln: string, i: number) => (
                  <div key={`prog-${i}`}>- {ln}</div>
                ))}
              </div>
            )}
            {reportData?.errors?.length > 0 && (
              <div className="rounded-md border border-destructive p-3 text-destructive">
                <div className="font-semibold mb-2">Issues detected</div>
                {reportData.errors.map((err: any, i: number) => (
                  <div key={i} className="mb-1">
                    - {err.step}: {err.message}
                    {err.fallback ? ` — fallback: ${err.fallback}` : ''}
                    {err.suggestion ? ` — check: ${err.suggestion}` : ''}
                  </div>
                ))}
              </div>
            )}
            <div>
              <div className="font-semibold">Customers</div>
              {(reportData?.customers || []).map((c: any, i: number) => (
                <div key={`cust-${i}`} className="mt-2">
                  - {c.name} ({c.email}) — role: {c.role}
                  <div className="text-muted-foreground">
                    Supabase: app_users={String(c.supabase.app_users)}, customers={String(c.supabase.customers)}
                  </div>
                  <div className="text-muted-foreground">Local: users={String(c.local.users)}, customers={String(c.local.customers)}</div>
                  <div className="mt-1 text-xs">{c.appears.join(' • ')}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="font-semibold">Employees</div>
              {(reportData?.employees || []).map((e: any, i: number) => (
                <div key={`emp-${i}`} className="mt-2">
                  - {e.name} ({e.email}) — role: {e.role}
                  <div className="text-muted-foreground">Supabase: app_users={String(e.supabase.app_users)}</div>
                  <div className="text-muted-foreground">Local: users={String(e.local.users)}, employees={String(e.local.employees)}</div>
                  <div className="mt-1 text-xs">{e.appears.join(' • ')}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="font-semibold">Jobs</div>
              {(reportData?.jobs || []).map((j: any, i: number) => (
                <div key={`job-${i}`} className="mt-2">
                  - {j.id} — customer: {j.customer}, employee: {j.employee}, package: {j.package}
                  <div className="text-muted-foreground">Invoice: status={j?.invoice?.paymentStatus}, total={j?.invoice?.total}, paid={j?.invoice?.paidAmount}</div>
                  <div className="mt-1 text-xs">{j.appears.join(' • ')}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="font-semibold">Inventory</div>
              {(reportData?.inventory || []).map((i: any, idx: number) => (
                <div key={`inv-${idx}`} className="mt-2">
                  - {i.name} — {i.category}
                  <div className="mt-1 text-xs">{i.appears.join(' • ')}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="font-semibold">Summary</div>
              <div className="text-muted-foreground">
                Supabase: app_users={reportData?.summary?.supabase_app_users}, customers={reportData?.summary?.supabase_customers} ({reportData?.summary?.note})
              </div>
              <div className="text-muted-foreground">
                Local counts — users={reportData?.summary?.local_users}, customers={reportData?.summary?.local_customers}, employees={reportData?.summary?.local_employees}, invoices={reportData?.summary?.local_invoices}, checklists={reportData?.summary?.local_checklists}, pdfArchive={reportData?.summary?.pdf_archive_count}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Static Mock Data Report (Local Only) */}
      <Dialog open={staticReportOpen} onOpenChange={setStaticReportOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Static Mock Data Report (Local Only — Not Linked to Supabase)</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 text-sm">
            {staticReportData?.progress && (
              <div className="rounded-md border p-3">
                <div className="font-semibold mb-2">Live Progress</div>
                {(staticReportData.progress || []).map((ln: string, i: number) => (
                  <div key={`s-prog-${i}`}>- {ln}</div>
                ))}
              </div>
            )}
            <div>
              <div className="font-semibold">Customers</div>
              {(staticReportData?.customers || []).map((c: any, i: number) => (
                <div key={`s-cust-${i}`} className="mt-2">
                  - {c.name} ({c.email}) — role: {c.role}
                  <div className="text-muted-foreground">{c.supabase}</div>
                  <div className="text-muted-foreground">Local: users={String(c.local.users)}, customers={String(c.local.customers)}</div>
                  <div className="mt-1 text-xs">{c.appears.join(' • ')}</div>
                  <div className="mt-1 text-xs italic">{c.where}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="font-semibold">Employees</div>
              {(staticReportData?.employees || []).map((e: any, i: number) => (
                <div key={`s-emp-${i}`} className="mt-2">
                  - {e.name} ({e.email}) — role: {e.role}
                  <div className="text-muted-foreground">{e.supabase}</div>
                  <div className="text-muted-foreground">Local: users={String(e.local.users)}, employees={String(e.local.employees)}</div>
                  <div className="mt-1 text-xs">{e.appears.join(' • ')}</div>
                  <div className="mt-1 text-xs italic">{e.where}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="font-semibold">Jobs</div>
              {(staticReportData?.jobs || []).map((j: any, i: number) => (
                <div key={`s-job-${i}`} className="mt-2">
                  - {j.id} — customer: {j.customer}, employee: {j.employee}, package: {j.package}
                  <div className="text-muted-foreground">Invoice: status={j?.invoice?.paymentStatus}, total={j?.invoice?.total}, paid={j?.invoice?.paidAmount}</div>
                  <div className="mt-1 text-xs">{j.appears.join(' • ')}</div>
                  <div className="mt-1 text-xs italic">{j.where}</div>
                  <div className="mt-1 text-xs italic">Mode: {j.mode}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="font-semibold">Inventory</div>
              {(staticReportData?.inventory || []).map((i: any, idx: number) => (
                <div key={`s-inv-${idx}`} className="mt-2">
                  - {i.name} — {i.category}
                  <div className="mt-1 text-xs">{i.appears.join(' • ')}</div>
                  <div className="mt-1 text-xs italic">{i.where}</div>
                  <div className="mt-1 text-xs italic">Mode: {i.mode}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="font-semibold">Summary</div>
              <div className="text-muted-foreground">{staticReportData?.summary?.mode}</div>
              <div className="text-muted-foreground">
                Local counts — users={staticReportData?.summary?.local_users}, customers={staticReportData?.summary?.local_customers}, employees={staticReportData?.summary?.local_employees}, invoices={staticReportData?.summary?.local_invoices}, checklists={staticReportData?.summary?.local_checklists}, pdfArchive={staticReportData?.summary?.pdf_archive_count}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Defaults Choice Modal */}
      <Dialog open={restoreDefaultsOpen} onOpenChange={setRestoreDefaultsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restore Packages & Addons</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Choose what you would like to restore to original defaults. This will overwrite your current pricing for the selected items.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => executeRestore('packages')} variant="outline" className="justify-start">
                1. Restore Packages Only
              </Button>
              <Button onClick={() => executeRestore('addons')} variant="outline" className="justify-start">
                2. Restore Add-ons Only
              </Button>
              <Button onClick={() => executeRestore('both')} variant="default" className="justify-start bg-primary text-primary-foreground">
                3. Restore Both (Packages & Addons)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Settings;

