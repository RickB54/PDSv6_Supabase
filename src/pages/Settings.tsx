import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Download, Upload, Trash2, RotateCcw, AlertTriangle, Database, ShieldAlert, FileText, CheckCircle2, HardDrive, TestTube2, AlertCircle, RefreshCw, Key, Settings as SettingsIcon, Newspaper, MessageCircle, Calendar, HelpCircle, Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { postFullSync, postServicesFullSync } from "@/lib/servicesMeta";
import { exportAllData, downloadBackup, restoreFromJSON, SCHEMA_VERSION } from '@/lib/backup';
import { isDriveEnabled, uploadJSONToDrive, pickDriveFileAndDownload } from '@/lib/googleDrive';
import { useDemoMode } from "@/contexts/DemoContext";
import { getMenuGroups, TOP_ITEMS } from "@/components/menu-config";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMemo } from "react";
import { saveBackupToSupabase, listSupabaseBackups, loadBackupFromSupabase, deleteSupabaseBackup, BackupMetadata } from '@/lib/supabase-backup';
import { deleteCustomersOlderThan, deleteInvoicesOlderThan, deleteExpensesOlderThan, deleteInventoryUsageOlderThan, deleteBookingsOlderThan, deleteEmployeesOlderThan, deleteEverything as deleteAllSupabase, deleteEverythingExceptInventory, previewDeleteCustomers, previewDeleteInvoices, previewDeleteExpenses, previewDeleteInventory, previewDeleteAll, previewDeleteAllExceptInventory } from '@/services/supabase/adminOps';
import localforage from "localforage";
import EnvironmentHealthModal from '@/components/admin/EnvironmentHealthModal';
import { restoreDefaults, restorePackages, restoreAddons } from '@/lib/restoreDefaults';
import jsPDF from 'jspdf';
import { savePDFToArchive } from '@/lib/pdfArchive';
import { pushAdminAlert } from '@/lib/adminAlerts';
import supabase, { isSupabaseConfigured } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useFullScreen } from "@/hooks/useFullScreen";
import { InventoryImportModal } from "@/components/inventory/InventoryImportModal";
import { InventoryCleanupModal } from "@/components/inventory/InventoryCleanupModal";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListChecks } from "lucide-react";

const Settings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const { isFullScreen, toggleFullScreen } = useFullScreen();
  const { isDemoMode, isAdminPreview, setAdminPreview, visibleSections, setVisibleSections, saveConfig, isPublicDemoDisabled, setPublicDemoDisabled, disabledReason, setDisabledReason } = useDemoMode();

  // Get all possible section keys for the checklist
  const allAvailableKeys = useMemo(() => {
    const keys: { id: string; title: string; group: string }[] = [];
    
    // Add TOP_ITEMS
    TOP_ITEMS.forEach(item => {
      if (item.key) keys.push({ id: item.key, title: item.title, group: 'Main Navigation' });
    });

    // Add Menu Groups
    const groups = getMenuGroups({
      todoCount: 0, payrollDueCount: 0, inventoryCount: 0, fileCount: 0, 
      bookingsBadgeColor: 'blue', tentativeBookingsCount: 0 
    });

    groups.forEach(group => {
      group.items.forEach(item => {
        if (item.key) keys.push({ id: item.key, title: item.title, group: group.title });
      });
    });

    const blacklisted = ['availability-manager', 'payroll', 'accounting', 'company-budget', 'taxes'];
    return keys.filter(k => !blacklisted.includes(k.id));
  }, []);

  const toggleSectionVisibility = (key: string) => {
    const next = visibleSections.includes(key)
      ? visibleSections.filter(k => k !== key)
      : [...visibleSections, key];
    setVisibleSections(next);
  };

  const selectAllDemo = () => {
    setVisibleSections(allAvailableKeys.map(k => k.id));
  };

  const selectNoneDemo = () => {
    setVisibleSections(['public-site']);
  };

  const handleSaveDemoConfig = async () => {
    try {
      await saveConfig();
      toast({ title: "Demo Config Saved", description: "The public demo visibility settings have been updated and synced to the cloud." });
    } catch (e) {
      toast({ title: "Failed to Save", description: "Cloud sync failed.", variant: "destructive" });
    }
  };

  // ... (rest of state)
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
  const [restoreDefaultsOpen, setRestoreDefaultsOpen] = useState(false);
  const [supabaseBackups, setSupabaseBackups] = useState<BackupMetadata[]>([]);
  const [supabaseBackupsOpen, setSupabaseBackupsOpen] = useState(false);
  const [inventoryImportOpen, setInventoryImportOpen] = useState(false);
  const [inventoryCleanupOpen, setInventoryCleanupOpen] = useState(false);
  const [granularNukeOpen, setGranularNukeOpen] = useState(false);
  const [nukeItems, setNukeItems] = useState<{ id: string; name: string; count: number; selected: boolean }[]>([]);
  const [nukeLoading, setNukeLoading] = useState(false);
  const [nukeStatus, setNukeStatus] = useState("");
  const [nukeError, setNukeError] = useState<string | null>(null);

  const [hideChatBot, setHideChatBot] = useState(() => localStorage.getItem('hide_chat_bot') === 'true');

  useEffect(() => {
    const handleUpdate = () => {
      setHideChatBot(localStorage.getItem('hide_chat_bot') === 'true');
    };
    window.addEventListener('hide-chat-bot-updated', handleUpdate);
    return () => window.removeEventListener('hide-chat-bot-updated', handleUpdate);
  }, []);

  // Supabase diagnostics block state
  const [diag, setDiag] = useState<{ authMode: string; urlPresent: boolean; keyPresent: boolean; configured: boolean; uid: string | null; appUserReadable: boolean | null; lastChecked: string }>({
    authMode: String(import.meta.env.VITE_AUTH_MODE || 'unset'),
    urlPresent: !!import.meta.env.VITE_SUPABASE_URL,
    keyPresent: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
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
        authMode: String(import.meta.env.VITE_AUTH_MODE || 'unset'),
        urlPresent: !!import.meta.env.VITE_SUPABASE_URL,
        keyPresent: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
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

  // Auto-trigger Danger Zone if navigated to with query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") === "danger-zone") {
      setTimeout(() => {
        const dangerSection = document.getElementById("danger-zone-section");
        if (dangerSection) dangerSection.scrollIntoView({ behavior: "smooth", block: "center" });
        if (!dangerUnlocked) {
          setPinInput("");
          setPinModalOpen(true);
        }
      }, 300); // Wait for render
      // Remove the query param so it doesn't re-trigger on subsequent re-renders naturally
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, dangerUnlocked, navigate]);
  const confirmValid = confirmText.trim().toUpperCase() === "DELETE";

  const isAdmin = user?.role === 'admin';
  const realUser = getCurrentUser();
  const isRealAdminOrEmployee = realUser?.role === 'admin' || realUser?.role === 'employee';
  const isDemoOrAdmin = isAdmin || isDemoMode;

  // Redirect non-admin users (except in Demo Mode)
  if (!isDemoOrAdmin) {
    navigate('/');
    return null;
  }

  const handleBackup = async () => {
    if (isDemoMode) {
      toast({ title: "Demo Mode (Read-Only)", description: "Configuration export is disabled for training visitor security." });
      return;
    }
    try {
      const { json } = await exportAllData();
      downloadBackup(json);
      toast({ title: "Backup Created", description: `Backup includes Supabase + local (v${SCHEMA_VERSION}).` });
    } catch (error: any) {
      console.error("Backup error:", error);
      toast({ title: "Backup Failed", description: "Error: " + (error?.message || String(error)), variant: "destructive" });
    }
  };

  const formatRestoreDetails = (details: Record<string, number>) => {
    if (!details || Object.keys(details).length === 0) return "Configuration updated.";
    return Object.entries(details)
      .map(([table, count]) => `${count} ${table.replace('_', ' ')}`)
      .join(", ");
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isDemoMode) {
      toast({ title: "Demo Mode (Read-Only)", description: "Database restoration is disabled to protect the sample environment.", variant: "destructive" });
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = await restoreFromJSON(text);
      if (result.success) {
        toast({
          title: "Restore Complete",
          description: `Successfully restored: ${formatRestoreDetails(result.details)}`,
        });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error(result.error || "Failed to process backup file.");
      }
    } catch (error: any) {
      console.error("Restore error:", error);
      toast({ title: "Restore Failed", description: error?.message || String(error), variant: "destructive" });
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
        const result = await restoreFromJSON(file.content);
        if (result.success) {
          toast({
            title: 'Restore Complete',
            description: `Restored from Drve: ${formatRestoreDetails(result.details)}`
          });
          setTimeout(() => window.location.reload(), 2000);
        } else {
          throw new Error(result.error);
        }
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
      const API_BASE = '/api';
      await postFullSync();
      await postServicesFullSync();
      try { await fetch(`/api/packages/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }); } catch { }
      toast({ title: "Pricing restored from backup — live site updated" });
    } catch (error) {
      toast({ title: "Restore Failed", description: "Could not restore pricing.", variant: "destructive" });
    }
  };

  const handleBackupToSupabase = async () => {
    try {
      // Force session refresh check
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        toast({ title: "Auth Required", description: "Please log out and log back in to refresh your cloud authorization.", variant: "destructive" });
        return;
      }

      const { json } = await exportAllData();
      const { path, error } = await saveBackupToSupabase(json);
      if (path && !error) {
        toast({ title: "Backup Saved to Supabase", description: "Backup uploaded successfully to cloud storage." });
        const backups = await listSupabaseBackups();
        setSupabaseBackups(backups);
      } else {
        toast({ title: "Backup Failed", description: error || "Could not upload to Supabase.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Supabase backup error:", error);
      toast({ title: "Backup Failed", description: error?.message || "Unknown error", variant: "destructive" });
    }
  };

  const handleRestoreFromSupabase = async (filename: string) => {
    try {
      const json = await loadBackupFromSupabase(filename);
      if (json) {
        const result = await restoreFromJSON(json);
        if (result.success) {
          toast({
            title: "Restore Complete",
            description: `Restored from Supabase: ${formatRestoreDetails(result.details)}`
          });
          setTimeout(() => window.location.reload(), 2000);
        } else {
          throw new Error(result.error);
        }
      } else {
        toast({ title: "Restore Failed", description: "Could not load backup from Supabase.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Supabase restore error:", error);
      toast({ title: "Restore Failed", description: error?.message || "Unknown error", variant: "destructive" });
    }
  };

  const handleDeleteSupabaseBackup = async (filename: string) => {
    if (!confirm(`Delete backup "${filename}"? This cannot be undone.`)) return;
    try {
      const success = await deleteSupabaseBackup(filename);
      if (success) {
        toast({ title: "Backup Deleted", description: `Deleted ${filename}` });
        // Refresh backup list
        const backups = await listSupabaseBackups();
        setSupabaseBackups(backups);
      } else {
        toast({ title: "Delete Failed", description: "Could not delete backup.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Delete backup error:", error);
      toast({ title: "Delete Failed", description: error?.message || "Unknown error", variant: "destructive" });
    }
  };

  const handleOpenSupabaseBackups = async () => {
    try {
      const backups = await listSupabaseBackups();
      setSupabaseBackups(backups);
      setSupabaseBackupsOpen(true);
    } catch (error: any) {
      console.error("List backups error:", error);
      toast({ title: "Error", description: "Could not load backups from Supabase.", variant: "destructive" });
    }
  };



  const generateDeletionFailsafePDF = async (type: string, days?: any) => {
    try {
      const doc = new jsPDF();
      let y = 20;
      const addLine = (text: string, indent = 0) => {
        doc.text(text, 20 + indent, y);
        y += 6;
        if (y > 270) { doc.addPage(); y = 20; }
      };

      doc.setFontSize(16);
      doc.setTextColor(220, 38, 38);
      doc.text('DELETION PRE-BACKUP (FAILSAFE)', 105, 18, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100);
      const now = new Date();
      addLine(`Target: ${type.toUpperCase()} Operations`);
      if (days) addLine(`Scope: Older than ${days} days`);
      addLine(`Date: ${now.toLocaleString()}`);
      y += 5;

      // 1. Snapshot Customers & Contacts
      if (type === 'all' || type === 'all_except_inventory' || type === 'customers') {
        const { data: custs } = await supabase.from('customers').select('name, email, phone, type');
        if (custs?.length) {
          doc.setFontSize(12); doc.setTextColor(0); addLine('CUSTOMERS SNAPSHOT:');
          doc.setFontSize(8); doc.setTextColor(80);
          custs.forEach(c => addLine(`• ${c.name} | ${c.phone || 'No Phone'} | ${c.email || 'No Email'}`, 5));
          y += 5;
        }
      }

      // 2. Snapshot Bookings
      if (type === 'all' || type === 'all_except_inventory' || type === 'bookings') {
        const { data: bks } = await supabase.from('bookings').select('date, start_time, package_name, customer_id, customers(name)').limit(100);
        if (bks?.length) {
          doc.setFontSize(12); doc.setTextColor(0); addLine('BOOKINGS SNAPSHOT (Last 100):');
          doc.setFontSize(8); doc.setTextColor(80);
          bks.forEach((b: any) => addLine(`• ${b.date} ${b.start_time || ''} | ${b.package_name} | Client: ${b.customers?.name || 'Unknown'}`, 5));
          y += 5;
        }
      }

      // 3. Snapshot Invoices
      if (type === 'all' || type === 'all_except_inventory' || type === 'invoices') {
        const { data: invs } = await supabase.from('invoices').select('invoice_number, total_amount, created_at, customer_id, customers(name)').limit(100);
        if (invs?.length) {
          doc.setFontSize(12); doc.setTextColor(0); addLine('INVOICES SNAPSHOT (Last 100):');
          doc.setFontSize(8); doc.setTextColor(80);
          invs.forEach((v: any) => addLine(`• #${v.invoice_number} | $${v.total_amount} | ${new Date(v.created_at).toLocaleDateString()} | Client: ${v.customers?.name || 'Unknown'}`, 5));
          y += 5;
        }
      }

      const dataUrl = doc.output('dataurlstring');
      const fileName = `Failsafe_Pre_${type}_${Date.now()}.pdf`;
      savePDFToArchive('Failsafe' as any, 'System', `failsafe-${Date.now()}`, dataUrl, { fileName, path: 'Failsafe Backups/' });

      // pushAdminAlert('pdf_saved', `Failsafe Deletion Backup (${type}) created`, 'system', { fileName });
      toast({ title: 'Failsafe Created', description: 'Pre-deletion PDF saved to File Manager.' });
    } catch (e) {
      console.error('Failsafe PDF Error:', e);
    }
  };

  const handleOpenGranularNuke = async () => {
    setNukeLoading(true);
    setNukeError(null);
    setGranularNukeOpen(true);
    const tables = [
      ['bookings', 'date'],
      ['availability_blocks', 'date'],
      ['customers', 'created_at'],
      ['invoices', 'created_at'],
      ['expenses', 'date'],
      ['usage', 'date'],
      ['inventory_records', 'created_at'],
      ['vehicles', 'created_at'],
      ['packages', 'created_at'],
      ['add_ons', 'created_at'],
      ['team_messages', 'id'],
    ] as const;

    const items: typeof nukeItems = [];
    try {
      setNukeStatus("Authenticating...");
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Cloud session expired. Please log out and back in to refresh your cloud token.");
      }

      for (const [name, col] of tables) {
        setNukeStatus(`Scanning ${name.replace(/_/g, ' ').toUpperCase()}...`);
        try {
          // Robust count: head: true returns just the count without downloading rows
          const { count: c, error: scanErr } = await (supabase as any)
            .from(name)
            .select('*', { count: 'exact', head: true });

          if (scanErr) throw scanErr;

          items.push({
            id: name,
            name: name.replace(/_/g, ' ').toUpperCase(),
            count: c || 0,
            selected: false
          });
        } catch (err: any) {
          console.error(`Scan error for ${name}:`, err);
          items.push({ id: name, name: name.replace(/_/g, ' ').toUpperCase() + " (Scan Error)", count: 0, selected: false });
        }
      }

      setNukeStatus("Checking local archives...");
      const localSchedules: any[] = await localforage.getItem('staff_schedule_shifts') || [];
      items.push({ id: 'staff_schedule', name: 'STAFF SCHEDULE (LOCAL)', count: localSchedules.length, selected: false });

      setNukeItems(items);
      setNukeStatus("Scan Complete");
    } catch (e: any) {
      console.error(e);
      setNukeError(e.message || "Database scan failed. Potential cloud sync issue.");
    } finally {
      setNukeLoading(false);
    }
  };

  const executeGranularNuke = async () => {
    const selected = nukeItems.filter(i => i.selected);
    if (selected.length === 0) return;

    if (!confirm(`Are you absolutely sure you want to delete ${selected.length} categories of data?`)) return;

    toast({ title: "Nuking selected data...", description: "Please wait while we purge the records." });

    try {
      for (const item of selected) {
        if (item.id === 'customers') await deleteCustomersOlderThan('all');
        else if (item.id === 'bookings') await deleteBookingsOlderThan('all');
        else if (item.id === 'availability_blocks') await deleteBookingsOlderThan('all'); // Handles blocks
        else if (item.id === 'invoices') await deleteInvoicesOlderThan('all');
        else if (item.id === 'expenses') await deleteExpensesOlderThan('all');
        else if (item.id === 'usage' || item.id === 'inventory_records') await deleteInventoryUsageOlderThan('all');
        else if (item.id === 'staff_schedule') await localforage.removeItem('staff_schedule_shifts');
        else if (item.id === 'team_messages') await (await import('@/services/supabase/adminOps')).deleteAllTeamMessages();
        else {
          // Generic delete if not handled
          await (supabase as any).from(item.id).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
      }
      toast({ title: "Purge Complete", description: "Successfully deleted selected records." });
      setGranularNukeOpen(false);
      setTimeout(() => window.location.reload(), 500);
    } catch (e: any) {
      toast({ title: "Purge Failed", description: e.message, variant: "destructive" });
    }
  };

  const deleteData = async (type: string) => {
    try {
      const now = new Date();
      const days = Number(String(timeRange || '').trim());
      const hasRange = Number.isFinite(days) && days > 0;
      const cutoffDate = new Date(now.getTime() - Math.max(0, days) * 24 * 60 * 60 * 1000);

      console.group(`[Settings] Delete request: ${type}`);

      // FAILSAFE: snapshots critical data
      if (type === 'all' || type === 'all_except_inventory' || type === 'customers' || type === 'bookings' || type === 'invoices') {
        await generateDeletionFailsafePDF(type, days);
      }

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
        // Supabase
        await deleteBookingsOlderThan(hasRange ? String(days) : 'all');
        await deleteCustomersOlderThan(hasRange ? String(days) : 'all');
      } else if (type === "invoices") {
        const invoices: any[] = await localforage.getItem("invoices") || [];
        const filtered = hasRange ? invoices.filter((inv: any) => {
          const d = new Date(inv.createdAt || inv.date || '');
          return d > cutoffDate;
        }) : [];
        await localforage.setItem("invoices", filtered);
        await deleteInvoicesOlderThan(hasRange ? String(days) : 'all');
      } else if (type === "accounting") {
        const expenses: any[] = await localforage.getItem("expenses") || [];
        const filtered = hasRange ? expenses.filter((e: any) => new Date(e.date || e.createdAt) > cutoffDate) : [];
        await localforage.setItem("expenses", filtered);
        await deleteExpensesOlderThan(hasRange ? String(days) : 'all');
      } else if (type === "inventory") {
        if (!hasRange) {
          await localforage.removeItem("chemicals");
          await localforage.removeItem("materials");
          await localforage.removeItem("tools");
        }
        await deleteInventoryUsageOlderThan(hasRange ? String(days) : 'all');
      } else if (type === "all" || type === "all_except_inventory") {
        // Supabase master delete
        if (type === "all_except_inventory") await deleteEverythingExceptInventory();
        else await deleteAllSupabase();

        // Local wipe
        const volatileLfKeys = [
          'customers', 'invoices', 'expenses', 'estimates',
          'completed-jobs', 'payroll-history', 'pdfArchive',
          'customCategories', 'customExpenseCategories', 'customIncomeCategories',
          'category-colors-map', 'staff_schedule_shifts'
        ];
        if (type === "all") volatileLfKeys.push('chemicals', 'materials', 'tools', 'chemicalUsage', 'inventory-estimates');

        for (const k of volatileLfKeys) { try { await localforage.removeItem(k); } catch { } }

        // LocalStorage preservation
        const preserve = new Set([
          'training_exam_custom', 'training_exam_progress', 'training_exam_schedule',
          'handbook_progress', 'handbook_start_at', 'employee_training_progress', 'employee_training_certified',
          'currentUser', 'auth_token', 'user_session',
          'packageMeta', 'addOnMeta', 'customServicePackages', 'customAddOns', 'customServices', 'savedPrices',
          'servicePackages', 'addOns', 'pricing_config', 'savedPrices_backup', 'savedPrices_restore_point',
          'faqs', 'contactInfo', 'aboutSections', 'aboutFeatures', 'testimonials',
          'hero_content', 'website_pages', 'website_config', 'seo_settings', 'footer_content', 'header_links',
          'hiddenMenuItems', 'admin_preferences', 'app_settings',
          'company-employees', 'employee_roles', 'vehicle_classification_history', 'vehicle_db'
        ]);
        Object.keys(localStorage).forEach(k => { if (!preserve.has(k)) localStorage.removeItem(k); });

        setSummaryData({ preserved: Array.from(preserve), deleted: volatileLfKeys, note: 'Preserved: Admin accounts, pricing, chemical cards, and website content.' });
        setSummaryOpen(true);
        setTimeout(() => window.location.reload(), 300);
      }

      toast({ title: "Data Deleted", description: `${type} removed.` });
      setDeleteDialog(null);
      setTimeRange("");
      console.groupEnd();
    } catch (error) {
      console.error('[Settings] Delete Failed', error);
      toast({ title: "Delete Failed", description: "Operation failed.", variant: "destructive" });
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

      // Revalidate live content endpoints on port 6066 if available
      try { await fetch(`/api/packages/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }); } catch { }
      try { await fetch(`/api/addons/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }); } catch { }

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
        else if (deleteDialog === 'all' || deleteDialog === 'all_except_inventory') {
          const previewData = deleteDialog === 'all' ? await previewDeleteAll(d) : await previewDeleteAllExceptInventory();
          // Add local staff schedule check
          try {
            const localShifts: any[] = await localforage.getItem('staff_schedule_shifts') || [];
            previewData.tables.push({ name: 'staff_schedule', count: localShifts.length });
          } catch { }
          setPreview(previewData);
        }
      } catch { setPreview(null); }
    };
    load();
  }, [deleteDialog, timeRange]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="System Settings" />

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">

        {/* App Preferences */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-5 h-5 text-blue-400" />
              <CardTitle className="text-lg font-bold text-white">Display Preferences</CardTitle>
            </div>
            <Button
              variant={isFullScreen ? "destructive" : "secondary"}
              onClick={toggleFullScreen}
              className="h-8 text-xs mb-0"
            >
              {isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
            </Button>
          </CardHeader>
          <CardContent className="pt-2 border-t border-zinc-800/50 mt-2">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <Label htmlFor="hide-chat-bot" className="text-white font-semibold cursor-pointer">Hide AI Chat Bot</Label>
                  <p className="text-[10px] text-zinc-500">Globally hide the floating chat assistant button</p>
                </div>
              </div>
              <Switch 
                id="hide-chat-bot"
                checked={hideChatBot}
                onCheckedChange={(val) => {
                  setHideChatBot(val);
                  localStorage.setItem('hide_chat_bot', String(val));
                  window.dispatchEvent(new CustomEvent('hide-chat-bot-updated'));
                  toast({
                    title: val ? "Chat Bot Hidden" : "Chat Bot Restored",
                    description: val ? "The AI assistant button has been removed from view." : "The AI assistant button is now visible.",
                  });
                }}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Supabase Diagnostics */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-800/50">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-500" />
              <CardTitle className="text-xl font-bold text-white">System Diagnostics</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={loadSupabaseDiagnostics} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block text-xs uppercase mb-1">Auth Mode</span>
                <span className="font-mono text-zinc-200">{diag.authMode}</span>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block text-xs uppercase mb-1">Supabase URL</span>
                <span className={`font-mono font-bold ${diag.urlPresent ? 'text-emerald-400' : 'text-red-400'}`}>{diag.urlPresent ? 'Connected' : 'Missing'}</span>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block text-xs uppercase mb-1">Anon Key</span>
                <span className={`font-mono font-bold ${diag.keyPresent ? 'text-emerald-400' : 'text-red-400'}`}>{diag.keyPresent ? 'Present' : 'Missing'}</span>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block text-xs uppercase mb-1">Config Check</span>
                <span className="font-mono text-zinc-200">{String(diag.configured)}</span>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block text-xs uppercase mb-1">User UID</span>
                <span className="font-mono text-zinc-200 block truncate" title={diag.uid || ''}>{diag.uid || 'Not Logged In'}</span>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block text-xs uppercase mb-1">DB Access</span>
                <span className="font-mono text-zinc-200">{diag.appUserReadable === null ? 'Unknown' : diag.appUserReadable ? 'Readable' : 'Restricted'}</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-zinc-500 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${diag.configured ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              Last diagnostic check: {new Date(diag.lastChecked).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Public Demo System */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-zinc-800/50 bg-zinc-950/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <ShieldAlert className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-white text-xl">Public Demo System</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-amber-500 hover:text-amber-400 p-0"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: 'interactive-training-demo' }))}
                      title="Learn how to share this demo"
                    >
                      <HelpCircle className="w-5 h-5" />
                    </Button>
                  </div>
                  <CardDescription className="text-zinc-400">Manage public access and Guided Training Mode</CardDescription>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 bg-zinc-900/80 p-2 rounded-full border border-zinc-800">
                  <span className="text-[10px] font-black text-zinc-400 pl-3 uppercase tracking-[0.2em]">Live DEMO URL: {isPublicDemoDisabled ? <span className="text-red-500">OFFLINE</span> : <span className="text-emerald-500">LIVE</span>}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 text-zinc-500 hover:text-emerald-500 p-0"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: 'interactive-training-demo' }))}
                    title="Help: Public Demo & Security"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </Button>
                  <Switch 
                    id="demo-public-kill-switch"
                    checked={!isPublicDemoDisabled} 
                    onCheckedChange={async (val) => {
                      setPublicDemoDisabled(!val);
                      // In a real app we'd wait for the state to update or pass the new value
                      // to a dedicated save function. For now, since we want immediate security,
                      // we'll update the context's persistence logic directly.
                      toast({
                        title: val ? "Live Demo ACTIVATED" : "Live Demo DISABLED",
                        description: val ? "The public /demo URL is now accessible." : "The public /demo URL has been revoked.",
                        variant: val ? "default" : "destructive"
                      });
                    }}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 gap-1 text-[9px] text-zinc-500 hover:text-amber-500 uppercase tracking-tighter">
                        <TestTube2 className="w-3 h-3" />
                        Test Instructions
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 shadow-2xl p-4">
                      <div className="space-y-3">
                        <h4 className="font-bold text-amber-500 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          How to Test as a Visitor
                        </h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Follow these steps to confirm the kill-switch is active for the public:
                        </p>
                        <ol className="text-[11px] text-zinc-300 space-y-2 list-decimal pl-4">
                          <li>Set the <strong>Live DEMO URL</strong> toggle to <span className="text-red-500 font-bold">OFFLINE</span>.</li>
                          <li>Turn <span className="text-amber-500 font-bold">OFF</span> "Admin Preview Mode" below.</li>
                          <li>Open an <strong>Incognito/Private</strong> window in your browser.</li>
                          <li>Navigate to <code>/demo</code> on your domain.</li>
                          <li><strong>Pass Score:</strong> You should see a "Disabled" error toast and be redirected instantly.</li>
                        </ol>
                        <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-500 italic">
                          Note: Your "Admin Preview" toggle allows YOU to see the demo even when it's offline for everyone else.
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                {isPublicDemoDisabled && (
                  <div className="flex items-center gap-3 bg-zinc-900/80 p-2 rounded-lg border border-red-900/30 animate-in slide-in-from-right-4">
                    <span className="text-[9px] font-bold text-red-400 pl-3 uppercase tracking-wider whitespace-nowrap">Reason:</span>
                    <Select value={disabledReason} onValueChange={(val) => {
                      setDisabledReason(val);
                      toast({ title: "Status Reason Updated", description: `Visitors will now see: "${val}"` });
                    }}>
                      <SelectTrigger className="h-8 border-none bg-transparent text-xs font-bold text-zinc-300 w-[200px] focus:ring-0 shadow-none">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-zinc-800">
                        <SelectItem value="Security Investigation">Security Investigation</SelectItem>
                        <SelectItem value="System Maintenance">System Maintenance</SelectItem>
                        <SelectItem value="Configuration Updates">Configuration Updates</SelectItem>
                        <SelectItem value="Suspicious Activity Detected">Suspicious Activity Detected</SelectItem>
                        <SelectItem value="Offline for Training">Offline for Training</SelectItem>
                        <SelectItem value="Database Optimization">Database Optimization</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-zinc-900/80 p-2 rounded-full border border-zinc-800">
                  <span className="text-[10px] font-black text-zinc-400 pl-3 uppercase tracking-[0.2em]">Admin Preview Mode</span>
                  <Switch 
                    id="demo-master-toggle"
                    checked={isAdminPreview} 
                    onCheckedChange={setAdminPreview}
                    className="data-[state=checked]:bg-amber-600"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="bg-amber-900/10 border border-amber-900/30 rounded-xl p-4 flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-1 shrink-0" />
              <div className="text-sm">
                <p className="text-amber-200 font-semibold mb-1">Important Security Note</p>
                <p className="text-amber-400/80">
                  Enabling sections below only makes them visible in the Sidebar. All demo routes are strictly **READ-ONLY**. 
                  Visitors will see mock data and cannot modify your production database.
                </p>
                {!isPublicDemoDisabled && (
                  <p className="text-emerald-400 font-bold mt-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> The /demo URL is currently active and accessible to anyone with the link.
                  </p>
                )}
                {isPublicDemoDisabled && (
                  <p className="text-red-400 font-bold mt-2 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> The public /demo URL is DISABLED. Only admins using Preview Mode can see the demo environment.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-blue-400" />
                  Section Visibility Checklist
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllDemo} className="h-7 text-[10px] border-zinc-700 hover:bg-zinc-800">
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectNoneDemo} className="h-7 text-[10px] border-zinc-700 hover:bg-zinc-800">
                    Select None
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[350px] rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                <div className="space-y-6">
                  {/* Categorized Keys */}
                  {Array.from(new Set(allAvailableKeys.map(k => k.group))).map(groupName => (
                    <div key={groupName} className="space-y-3">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] border-b border-zinc-800 pb-1 mb-2">
                        {groupName}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {allAvailableKeys.filter(k => k.group === groupName).map(section => (
                          <div 
                            key={section.id} 
                            onClick={() => toggleSectionVisibility(section.id)}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer group ${
                              visibleSections.includes(section.id) 
                                ? 'bg-blue-600/10 border-blue-600/30 text-blue-100' 
                                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <span className="text-xs font-medium">{section.title}</span>
                            <Checkbox 
                              checked={visibleSections.includes(section.id)}
                              onCheckedChange={() => toggleSectionVisibility(section.id)}
                              className="border-zinc-700 data-[state=checked]:bg-blue-600"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <div>
                <p className="text-xs text-zinc-500">
                  <span className="text-blue-400 font-bold">{visibleSections.length}</span> sections currently visible to public
                </p>
              </div>
              <Button 
                onClick={handleSaveDemoConfig}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-8 rounded-full shadow-lg shadow-blue-900/20"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Demo Changes to Cloud
              </Button>
            </div>
          </CardContent>
        </Card>


        {/* Backup & Restore */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
          <CardHeader className="border-b border-zinc-800/50">
            <div className="flex items-center gap-3">
              <HardDrive className="w-6 h-6 text-blue-500" />
              <div>
                <CardTitle className="text-white text-xl">Data Management</CardTitle>
                <CardDescription className="text-zinc-400">Backup, restore, and manage your application data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button onClick={() => setInventoryImportOpen(true)} variant="outline" className="h-16 justify-start border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-amber-500/50 group md:col-span-1">
                <FileText className="h-6 w-6 mr-3 text-amber-500 group-hover:text-amber-400" />
                <div className="text-left">
                  <div className="font-semibold">Import Inventory</div>
                  <div className="text-xs text-zinc-500 font-normal">Standard Catalog or Custom</div>
                </div>
              </Button>



              <Button onClick={handleBackupToDrive} variant="outline" className="h-16 justify-start border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-emerald-500/50 group">
                <Upload className="h-6 w-6 mr-3 text-emerald-500 group-hover:text-emerald-400" />
                <div className="text-left">
                  <div className="font-semibold">Save to Drive</div>
                  <div className="text-xs text-zinc-500 font-normal">Upload backup to Google Drive</div>
                </div>
              </Button>

              <Button variant="outline" onClick={handleOpenDriveRestore} className="h-16 justify-start border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-purple-500/50 group">
                <Upload className="h-6 w-6 mr-3 text-purple-500 group-hover:text-purple-400" />
                <div className="text-left">
                  <div className="font-semibold">Restore from Drive</div>
                  <div className="text-xs text-zinc-500 font-normal">Fetch and restore backup from Drive</div>
                </div>
              </Button>

              <Button onClick={handleBackup} variant="outline" className="h-16 justify-start border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-blue-500/50 group">
                <Download className="h-6 w-6 mr-3 text-blue-500 group-hover:text-blue-400" />
                <div className="text-left">
                  <div className="font-semibold">Download Backup</div>
                  <div className="text-xs text-zinc-500 font-normal">Save complete JSON backup locally</div>
                </div>
              </Button>

              <label className="cursor-pointer">
                <div className="h-16 flex items-center px-4 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-purple-500/50 group transition-colors">
                  <RefreshCw className="h-6 w-6 mr-3 text-purple-500 group-hover:text-purple-400" />
                  <div className="text-left">
                    <div className="font-semibold">Restore Data</div>
                    <div className="text-xs text-zinc-500 font-normal">Restore from a local JSON file</div>
                  </div>
                </div>
                <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
              </label>

              <Button variant="outline" onClick={handleBackupToSupabase} className="h-16 justify-start border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-emerald-500/50 group md:col-span-1">
                <Database className="h-6 w-6 mr-3 text-emerald-500 group-hover:text-emerald-400" />
                <div className="text-left">
                  <div className="font-semibold">Backup to Supabase</div>
                  <div className="text-xs text-zinc-500 font-normal">Upload backup to Supabase</div>
                </div>
              </Button>

              <Button variant="outline" onClick={handleOpenSupabaseBackups} className="h-16 justify-start border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-emerald-500/50 group md:col-span-1">
                <RefreshCw className="h-6 w-6 mr-3 text-emerald-500 group-hover:text-emerald-400" />
                <div className="text-left">
                  <div className="font-semibold">Restore from Supabase</div>
                  <div className="text-xs text-zinc-500 font-normal">View/restore Supabase backups</div>
                </div>
              </Button>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex flex-wrap gap-3">
              <label className="cursor-pointer inline-flex">
                <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-zinc-700 bg-transparent hover:bg-zinc-800 hover:text-accent-foreground h-10 px-4 py-2 text-zinc-400 hover:text-white">
                  <FileText className="h-4 w-4 mr-2" />
                  Restore Pricing Only
                </div>
                <input type="file" accept=".json" className="hidden" onChange={handlePricingRestore} />
              </label>

              <Button variant="outline" onClick={() => setHealthOpen(true)} className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800">
                <AlertCircle className="w-4 h-4 mr-2" /> Environment Health
              </Button>
            </div>
          </CardContent>
        </Card>



        {/* Danger Zone */}
        <Card
          id="danger-zone-section"
          className={`border-2 cursor-pointer transition-all duration-300 ${dangerUnlocked ? 'bg-gradient-to-br from-red-950/30 to-zinc-950 border-red-900/50' : 'bg-zinc-950 border-zinc-800 hover:border-red-900/30'}`}
          onClick={() => { if (!dangerUnlocked) { setPinInput(""); setPinModalOpen(true); } }}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldAlert className={`w-8 h-8 ${dangerUnlocked ? 'text-red-500' : 'text-zinc-600'}`} />
              <div>
                <CardTitle className={`${dangerUnlocked ? 'text-red-500' : 'text-zinc-500'} text-xl`}>Danger Zone</CardTitle>
                <CardDescription className="text-zinc-500">
                  {dangerUnlocked ? 'CAUTION: Destructive actions unlocked.' : 'Restricted area. PIN required to access.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!dangerUnlocked && (
              <div className="flex items-center gap-2 text-zinc-600 bg-zinc-900/50 p-4 rounded-lg border border-zinc-900">
                <Key className="w-4 h-4" />
                <span>Click to unlock. Default PIN: 1234</span>
              </div>
            )}

            {dangerUnlocked && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Restore Packages & Addons */}
                <div className="bg-amber-950/10 border border-amber-900/30 rounded-lg p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-amber-500 flex items-center gap-2 text-lg">
                        <RotateCcw className="h-5 w-5" />
                        Restore Defaults
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1 max-w-xl">
                        Reset customized services, packages, and add-ons to their original factory settings. This does not delete customer data.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleRestoreDefaults}
                      className="border-amber-700 text-amber-500 hover:bg-amber-950 hover:text-amber-400 w-full md:w-auto"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore Presets
                    </Button>
                  </div>
                </div>

                {/* DELETE EVERYTHING */}
                <div className="bg-red-950/10 border border-red-900/30 rounded-lg p-5">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div>
                      <h3 className="font-bold text-red-500 flex items-center gap-2 text-xl">
                        <Trash2 className="h-6 w-6" />
                        Master Reset (Local Data Only)
                      </h3>
                      <p className="text-sm text-zinc-400 mt-2 max-w-xl">
                        Permanently wipe ALL <strong className="text-zinc-200">local, user-generated data</strong> (mock data & offline input) from this browser only. <br />
                        <span className="text-red-400 font-bold block mt-1">SAFE: This will NEVER delete data from your Supabase cloud database.</span>
                      </p>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-zinc-950/50 p-4 rounded border border-zinc-800">
                        <div>
                          <strong className="text-red-400 block mb-2 text-sm uppercase tracking-wider border-b border-red-900/30 pb-1">WILL DELETE (Local):</strong>
                          <ul className="list-disc list-inside text-zinc-400 space-y-1">
                            <li>All Local Invoices & Estimates</li>
                            <li>Local Calendar Bookings</li>
                            <li>Local Tasks & Active Reminders</li>
                            <li>Local Service Checklists</li>
                            <li>Local Inventory (Chemicals, Materials, Tools)</li>
                            <li>Local Accounting (Expenses/Income)</li>
                            <li>Local App Preferences</li>
                            <li>Local/Mock Customer & Employee Profiles</li>
                            <li>Staff Schedule</li>
                            <li>Team Chat Messages (via separate tool below)</li>
                          </ul>
                        </div>
                        <div>
                          <strong className="text-emerald-500 block mb-2 text-sm uppercase tracking-wider border-b border-emerald-900/30 pb-1">WILL NOT DELETE (Supabase/Cloud):</strong>
                          <ul className="list-disc list-inside text-zinc-400 space-y-1">
                            <li>Real Administrators (Cloud)</li>
                            <li><strong className="text-emerald-400">Chemical Cards (Inventory Catalog)</strong></li>
                            <li><strong className="text-emerald-400">Service Packages & Pricing</strong></li>
                            <li><strong className="text-emerald-400">Phone Assistant Data & Config</strong></li>
                            <li><strong className="text-emerald-400">Package Comparisons & Scenarios</strong></li>
                            <li>Real Employees & Customer Accounts</li>
                            <li>Website Content & CMS Data</li>
                            <li>Training Manuals & Exams</li>
                          </ul>
                        </div>
                      </div>
                      <p className="text-xs text-amber-500 mt-2 italic font-bold">FAILSAVE: A PDF snapshot of your data will be auto-generated before any deletion starts.</p>
                      <p className="text-xs text-zinc-500 mt-1 italic">* Chemical cards and equipment are protected. Only stock usage/history is cleared during a global reset.</p>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-4">
                      <Button
                        variant="destructive"
                        className="bg-red-700 hover:bg-red-600 text-white font-bold h-12 px-6 w-full md:w-auto shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all"
                        onClick={(e) => { e.stopPropagation(); setDeleteDialog('all'); setPreview(null); }}
                      >
                        <Trash2 className="h-5 w-5 mr-2" /> Master Local Reset
                      </Button>

                      <Button
                        variant="outline"
                        className="border-red-500 text-red-500 hover:bg-red-950 font-bold h-12 px-6 w-full md:w-auto transition-all"
                        onClick={(e) => { e.stopPropagation(); handleOpenGranularNuke(); }}
                      >
                        <AlertTriangle className="h-5 w-5 mr-2" /> Detailed Deletion Checklist
                      </Button>
                    </div>
                  </div>
                </div>

                {/* NEW: RESET ALL EXCEPT INVENTORY */}
                <div className="bg-red-950/10 border border-red-900/30 rounded-lg p-6 shadow-inner">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <h3 className="font-bold text-red-500 flex items-center gap-2 text-xl">
                        <Database className="h-6 w-6" />
                        Reset All EXCEPT Inventory
                      </h3>
                      <p className="text-sm text-zinc-400 mt-2 max-w-xl">
                        A clean slate for your business operations. Wipes customers, vehicles, bookings, and invoices, but <strong className="text-emerald-400 underline italic">preserves your inventory catalog</strong> (chemicals, tools, materials).
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase font-bold tracking-tighter">
                        <span className="bg-red-900/30 text-red-400 px-2 py-0.5 rounded border border-red-900/50">Wipes CRM</span>
                        <span className="bg-red-900/30 text-red-400 px-2 py-0.5 rounded border border-red-900/50">Wipes Billing</span>
                        <span className="bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/50">Keeps Chemicals</span>
                        <span className="bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/50">Keeps Tools</span>
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      className="bg-zinc-900 hover:bg-red-900 text-red-500 border border-red-900/50 font-bold h-12 px-6 w-full md:w-auto self-center transition-all hover:scale-105"
                      onClick={() => { setPinInput(""); setDeleteDialog("all_except_inventory"); }}
                    >
                      <Trash2 className="h-5 w-5 mr-2" />
                      RESET OPERATIONS
                    </Button>
                  </div>
                </div>

                {/* BULK CLEANUP INVENTORY */}
                <div className="bg-red-950/10 border border-red-900/30 rounded-lg p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-red-500 flex items-center gap-2 text-lg">
                        <Trash2 className="h-5 w-5" />
                        Bulk Cleanup (Inventory)
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1 max-w-xl">
                        Open the bulk deletion tool to quickly select and permanently wipe multiple inventory items (chemicals, supplies, equipment).
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-900/70 border border-red-800 hover:bg-red-800 text-red-100 h-10 px-4"
                      onClick={() => setInventoryCleanupOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Launch Cleanup Tool
                    </Button>
                  </div>
                </div>


                {/* CHAT HISTORY RESET */}
                <div className="bg-red-950/10 border border-red-900/30 rounded-lg p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-red-500 flex items-center gap-2 text-lg">
                        <MessageCircle className="h-5 w-5" />
                        Reset Chat History
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1 max-w-xl">
                        Permanently delete ALL messages from the team chat. This deletes data from the cloud database.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-900/70 border border-red-800 hover:bg-red-800 text-red-100"
                      onClick={() => {
                        if (confirm("Are you SURE you want to delete ALL team chat messages? This cannot be undone.")) {
                          import("@/services/supabase/adminOps").then(({ deleteAllTeamMessages }) => {
                            deleteAllTeamMessages()
                              .then((count) => toast({ title: "Chat Cleared", description: `Deleted ${count} messages.` }))
                              .catch((e) => toast({ title: "Error", description: e.message, variant: "destructive" }));
                          });
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3 mr-2" /> Delete All Messages
                    </Button>
                  </div>
                </div>

                {/* STAFF SCHEDULE RESET */}
                <div className="bg-red-950/10 border border-red-900/30 rounded-lg p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-red-500 flex items-center gap-2 text-lg">
                        <Calendar className="h-5 w-5" />
                        Clear Staff Schedule
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1 max-w-xl">
                        Delete shifts from the staff schedule by time range (day/week/month). Requires PIN + DELETE confirmation.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-900/70 border border-red-800 hover:bg-red-800 text-red-100"
                      onClick={() => {
                        // Navigate to Staff Schedule where they can use the Clear Schedule button
                        navigate('/staff-schedule');
                        toast({
                          title: "Navigate to Staff Schedule",
                          description: "Use the 'Clear Schedule' button in the Staff Schedule page to delete shifts by time range."
                        });
                      }}
                    >
                      <Calendar className="w-3 h-3 mr-2" /> Go to Staff Schedule
                    </Button>
                  </div>
                </div>

                {/* DELETE ALL NOTES */}
                <div className="bg-red-950/10 border border-red-900/30 rounded-lg p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-red-500 flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5" />
                        Delete All Personal Notes
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1 max-w-xl">
                        Permanently delete ALL notes, notebooks, and sections from the Personal Notes app. This deletes data from the cloud database.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-900/70 border border-red-800 hover:bg-red-800 text-red-100"
                      onClick={async () => {
                        if (confirm("Are you SURE you want to delete ALL personal notes, notebooks, and sections? This cannot be undone.")) {
                          try {
                            const user = getCurrentUser();
                            if (!user) {
                              toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
                              return;
                            }

                            // Delete all notes
                            const { error: notesError, count: notesCount } = await supabase
                              .from('personal_notes')
                              .delete({ count: 'exact' })
                              .eq('user_id', user.id);

                            // Delete all sections
                            const { error: sectionsError, count: sectionsCount } = await supabase
                              .from('personal_sections')
                              .delete({ count: 'exact' })
                              .eq('user_id', user.id);

                            // Delete all notebooks
                            const { error: notebooksError, count: notebooksCount } = await supabase
                              .from('personal_notebooks')
                              .delete({ count: 'exact' })
                              .eq('user_id', user.id);

                            if (notesError || sectionsError || notebooksError) {
                              toast({
                                title: "Error",
                                description: "Failed to delete some items. Check permissions.",
                                variant: "destructive"
                              });
                            } else {
                              toast({
                                title: "Notes Deleted",
                                description: `Deleted ${notesCount || 0} notes, ${sectionsCount || 0} sections, and ${notebooksCount || 0} notebooks. Please refresh the Notes page to see changes.`
                              });
                            }
                          } catch (e: any) {
                            toast({
                              title: "Error",
                              description: e.message || "Failed to delete notes",
                              variant: "destructive"
                            });
                          }
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3 mr-2" /> Delete All Notes
                    </Button>
                  </div>
                </div>

                {/* BLOG CONTENT RESET */}
                <div className="bg-red-950/10 border border-red-900/30 rounded-lg p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-red-500 flex items-center gap-2 text-lg">
                        <Newspaper className="h-5 w-5" />
                        Reset Blog Content
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1 max-w-xl">
                        Bulk delete blog posts by type. This action cannot be undone.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="bg-red-900/70 border border-red-800 hover:bg-red-800 text-red-100"
                        onClick={() => {
                          if (confirm("Permanently delete ALL VIDEO posts?")) {
                            import("@/lib/supa-data").then(({ deleteLibraryItems }) => {
                              deleteLibraryItems('video').then(({ count }) => toast({ title: "Deleted", description: `Removed ${count} video posts.` }));
                            })
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-2" /> Delete Videos
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="bg-red-900/70 border border-red-800 hover:bg-red-800 text-red-100"
                        onClick={() => {
                          if (confirm("Permanently delete ALL PICTURE posts?")) {
                            import("@/lib/supa-data").then(({ deleteLibraryItems }) => {
                              deleteLibraryItems('image').then(({ count }) => toast({ title: "Deleted", description: `Removed ${count} picture posts.` }));
                            })
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-2" /> Delete Photos
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="bg-red-600 hover:bg-red-500 text-white font-bold"
                        onClick={() => {
                          if (confirm("WARNING: Permanently delete ALL blog posts (Videos & Photos)?")) {
                            import("@/lib/supa-data").then(({ deleteLibraryItems }) => {
                              deleteLibraryItems('all').then(({ count }) => toast({ title: "Deleted", description: `Removed all ${count} blog posts.` }));
                            })
                          }
                        }}
                      >
                        <AlertTriangle className="w-3 h-3 mr-2" /> Delete All Posts
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                  <h4 className="text-zinc-300 font-semibold mb-2 text-sm">Need to delete specific items?</h4>
                  <div className="text-xs text-zinc-500 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    <span>• <strong>Customers:</strong> Admin → Customers list</span>
                    <span>• <strong>Transactions:</strong> Accounting → Ledger</span>
                    <span>• <strong>Invoices:</strong> Invoicing → Invoices list</span>
                    <span>• <strong>Staff:</strong> Admin → Company Employees</span>
                    <span>• <strong>Inventory:</strong> Inventory Control</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </main>

      {/* PIN Modal */}
      <Dialog open={pinModalOpen} onOpenChange={setPinModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Security Verification</DialogTitle>
            <DialogDescription className="text-zinc-500">Enter your 4-digit security PIN to access the Danger Zone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex justify-center">
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-32 text-center text-2xl tracking-[0.5em] bg-zinc-900 border-zinc-700 text-white placeholder:tracking-normal"
                autoFocus
              />
            </div>
            {pinError && <p className="text-center text-red-500 text-sm">{pinError}</p>}
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
              onClick={() => {
                if (pinValid) {
                  setDangerUnlocked(true);
                  setPinModalOpen(false);
                  setPinError('');
                  toast({ title: 'Access Granted', description: 'Danger Zone unlocked for this session.' });
                } else {
                  setPinError('Incorrect PIN');
                }
              }}
            >
              Unlock Access
            </Button>

            <div className="pt-4 border-t border-zinc-800 mt-4">
              <p className="text-xs text-zinc-500 mb-2">Change Security PIN</p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  maxLength={4}
                  placeholder="New PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="bg-zinc-900 border-zinc-700 text-white h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (newPin.length !== 4) { setPinError('Must be 4 digits'); return; }
                    setDangerPin(newPin);
                    localStorage.setItem('danger-pin', newPin);
                    setNewPin('');
                    toast({ title: 'PIN Updated' });
                  }}
                  className="text-zinc-400 hover:text-white"
                >Save</Button>
              </div>
              <Button
                variant="link"
                size="sm"
                className="text-red-500 p-0 h-auto mt-2 text-xs"
                onClick={() => {
                  setDangerPin('1234');
                  localStorage.setItem('danger-pin', '1234');
                  toast({ title: 'PIN Reset to 1234' });
                }}
              >Reset to Default (1234)</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteDialog !== null} onOpenChange={() => { setDeleteDialog(null); setTimeRange(""); setPinInput(""); setConfirmText(""); }}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {deleteDialog === 'all'
                ? <span className="space-y-2 block">
                  <span>This is a MASTER RESET for <strong>LOCAL DATA ONLY</strong>.</span>
                  <span className="block text-red-400">It will NOT delete any Supabase/Cloud data.</span>
                </span>
                : `This will permanently delete ${deleteDialog} data.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            {deleteDialog !== 'all' && (
              <div>
                <Label className="text-zinc-500 text-xs uppercase font-bold">Filter by Age (Optional)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 30 (Leave blank for ALL)"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-white mt-1"
                />
                <p className="text-xs text-zinc-500 mt-1">Enter days to keep valid data, preserving recent records.</p>
              </div>
            )}

            {preview && (
              <div className="bg-zinc-900 p-3 rounded border border-zinc-800 text-sm">
                <strong className="text-zinc-300 block mb-1">Preview Deletion:</strong>
                {preview.tables.map(t => (
                  <div key={t.name} className="flex justify-between text-zinc-400">
                    <span>{t.name}</span>
                    <span>{t.count} rows</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label className="text-zinc-500 text-xs uppercase font-bold">Verify PIN</Label>
              <Input
                type="password"
                placeholder="Enter PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                className="bg-zinc-900 border-zinc-700 text-white mt-1"
              />
            </div>

            {deleteDialog === 'all' && (
              <div>
                <Label className="text-red-500 text-xs uppercase font-bold">Final Confirmation</Label>
                <Input
                  placeholder="Type DELETE to confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="bg-red-950/20 border-red-900 text-red-200 placeholder:text-red-900 mt-1"
                />
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 text-white border-zinc-800 hover:bg-zinc-800">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteData(deleteDialog!)}
              className="bg-red-600 hover:bg-red-700 text-white border-none"
              disabled={!dangerPin || !pinValid || (deleteDialog === 'all' && !confirmValid)}
            >
              Execute Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Summary Report Modal */}
      <AlertDialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-emerald-500 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Deletion Complete
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              The requested data has been successfully removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="text-sm bg-zinc-900 p-4 rounded border border-zinc-800 space-y-2">
            <div><span className="text-zinc-500">Preserved System Data:</span> <span className="text-emerald-400">{summaryData?.preserved?.length || 0} items</span></div>
            <div><span className="text-zinc-500">Deleted User Data:</span> <span className="text-red-400">{summaryData?.deleted?.length || 0} items</span></div>
            <div className="pt-2 text-xs text-zinc-500 border-t border-zinc-800 mt-2">{summaryData?.note}</div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSummaryOpen(false)} className="bg-zinc-800 text-white hover:bg-zinc-700 border-zinc-700">Close Report</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EnvironmentHealthModal open={healthOpen} onOpenChange={setHealthOpen} />


      {/* Restore Choices Dialog */}
      <Dialog open={restoreDefaultsOpen} onOpenChange={setRestoreDefaultsOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Restore System Defaults</DialogTitle>
            <DialogDescription className="text-zinc-400">Select which data component you wish to reset to original factory settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <Button onClick={() => executeRestore('packages')} variant="outline" className="w-full justify-start border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
              <span className="mr-2 text-zinc-500">1.</span> Packages Only
            </Button>
            <Button onClick={() => executeRestore('addons')} variant="outline" className="w-full justify-start border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
              <span className="mr-2 text-zinc-500">2.</span> Add-ons Only
            </Button>
            <Button onClick={() => executeRestore('both')} className="w-full justify-start bg-amber-600 hover:bg-amber-700 text-white">
              <span className="mr-2 text-amber-200">3.</span> Restore Everything
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supabase Backups Dialog */}
      <Dialog open={supabaseBackupsOpen} onOpenChange={setSupabaseBackupsOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-500" />
              Supabase Cloud Backups
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              View, restore, or delete backups stored in Supabase cloud storage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            {supabaseBackups.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No backups found in Supabase</p>
                <p className="text-sm mt-1">Click "Backup to Supabase" to create your first backup</p>
              </div>
            ) : (
              supabaseBackups.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-emerald-500/50 transition-colors">
                  <div className="flex-1">
                    <div className="font-semibold text-white">{backup.filename}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {new Date(backup.created_at).toLocaleString()} • {(backup.size_bytes / 1024).toFixed(1)} KB • v{backup.schema_version}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestoreFromSupabase(backup.filename)}
                      className="border-emerald-700 text-emerald-400 hover:bg-emerald-950 hover:text-emerald-300"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSupabaseBackup(backup.filename)}
                      className="border-red-700 text-red-400 hover:bg-red-950 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="pt-4 border-t border-zinc-800">
            <Button variant="outline" onClick={() => setSupabaseBackupsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InventoryImportModal
        open={inventoryImportOpen}
        onOpenChange={setInventoryImportOpen}
      />

      <InventoryCleanupModal
        open={inventoryCleanupOpen}
        onOpenChange={setInventoryCleanupOpen}
      />

      {/* Granular Deletion Checklist Modal */}
      <Dialog open={granularNukeOpen} onOpenChange={setGranularNukeOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-zinc-800">
            <DialogTitle className="text-red-500 flex items-center gap-2 text-xl italic font-black uppercase tracking-tighter">
              <ShieldAlert className="h-6 w-6" /> Purge Selection Checklist
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Select specific categories to permanently remove from the database. Use extreme caution.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 min-h-0 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {nukeLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <RefreshCw className="h-10 w-10 text-red-500 animate-spin" />
                <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">{nukeStatus || "PURGE SCAN INITIALIZING..."}</p>
                <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden relative">
                  <div className="absolute inset-0 bg-red-600 animate-loading-bar"></div>
                </div>
              </div>
            ) : nukeError ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
                <div className="h-16 w-16 rounded-full bg-red-950/30 flex items-center justify-center border border-red-900 animate-pulse">
                  <ShieldAlert className="h-8 w-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-white font-bold text-lg">Scan Interrupted</h3>
                  <p className="text-zinc-500 text-sm max-w-xs">{nukeError}</p>
                </div>
                <Button onClick={handleOpenGranularNuke} variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                  Retry Authorization
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-lg mb-6">
                  <p className="text-xs text-red-200">
                    <strong>WARNING:</strong> This tool performs direct deletions on both local and cloud tables. Selected items WILL be permanently lost.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {nukeItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${item.selected ? 'bg-red-950/30 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.1)]' : 'bg-black border-zinc-800 hover:border-zinc-700'}`}
                      onClick={() => {
                        setNukeItems(prev => prev.map(i => i.id === item.id ? { ...i, selected: !i.selected } : i));
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.selected}
                          className="border-zinc-700 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-black tracking-tight text-white">{item.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono uppercase">Identifier: {item.id}</span>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-mono font-bold ${item.count > 0 ? 'text-red-400 bg-red-950/20' : 'text-zinc-600 bg-zinc-900'}`}>
                        {item.count} RECORDS
                      </div>
                    </div>
                  ))}
                  {nukeItems.length === 0 && !nukeLoading && !nukeError && (
                    <p className="text-center py-10 text-zinc-600 text-sm">No deletable records found.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 border-t border-zinc-800 bg-black/40 gap-3">
            <Button variant="outline" onClick={() => setGranularNukeOpen(false)} className="border-zinc-700 text-zinc-400 hover:text-white">
              Abort Purge
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              disabled={nukeItems.every(i => !i.selected) || nukeLoading || isDemoMode}
              onClick={executeGranularNuke}
            >
              {isDemoMode ? "Purge Disabled in Demo" : `Nuke Selected (${nukeItems.filter(i => i.selected).length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
