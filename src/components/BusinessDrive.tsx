import React, { useState, useEffect, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Folder, FileText, Plus, Grid, List, MoreVertical, 
    ChevronRight, Upload, Search, Filter, Trash2, Download, Eye, Sparkles, Clock, User, File,
    Maximize2, Minimize2, ZoomIn, ZoomOut, ChevronLeft, X, Printer, Info, FolderPlus, ArrowLeft,
    RefreshCw, Camera, ArrowUpDown, Bell
} from "lucide-react";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectSeparator
} from "@/components/ui/select";
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/storage-utils";
import supabase from "@/lib/supabase";
import { useDemoMode } from "@/contexts/DemoContext";
import jsPDF from "jspdf";
import { useAlertsStore } from "@/store/alerts";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { dismissAlertsForRecord } from "@/lib/adminAlerts";

interface DriveFile {
    id: string;
    name: string;
    type: string;
    size: string;
    modified: string;
    path: string[]; // Array of folder names leading to this file
    data?: string; // base64 or blob URL
    metadata?: any;
}

interface DriveFolder {
    id: string;
    name: string;
    path: string[]; // Parent path
}

const DEFAULT_FOLDERS: DriveFolder[] = [
    { id: '1', name: "Analytics", path: [] },
    { id: '2', name: "QR Codes", path: [] },
    { id: '3', name: "Inventory", path: [] },
    { id: '4', name: "Pricing", path: [] },
    { id: '5', name: "Operating Procedures", path: [] },
    { id: '6', name: "Addons", path: [] },
    { id: '7', name: "Chemicals", path: [] },
    { id: '8', name: "My Logos", path: [] },
    { id: 'system-archives-main', name: "System Archives", path: [] }
];

const getFileCategory = (file: DriveFile): string => {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    
    if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|bmp|svg)$/i.test(name)) {
        return 'Pictures';
    }
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
        return 'PDFs';
    }
    if (type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|flv|wmv|3gp)$/i.test(name)) {
        return 'Videos';
    }
    if (type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac|wma)$/i.test(name)) {
        return 'Audio';
    }
    if (
        type.includes('excel') || 
        type.includes('spreadsheet') || 
        type.includes('csv') ||
        /\.(xls|xlsx|csv|numbers|ods)$/i.test(name)
    ) {
        return 'Spreadsheets';
    }
    if (
        type.startsWith('text/') || 
        type.includes('word') || 
        type.includes('document') ||
        /\.(doc|docx|txt|rtf|pages|odt|md)$/i.test(name)
    ) {
        return 'Documents';
    }
    return 'Other';
};

export const ALL_CATEGORIES = [
    "Invoices", "Estimates", "Jobs", "Checklists", "Customer Records", 
    "Employee Training", "Bookings", "Admin Updates", "Payroll", 
    "Employee Contact", "Addons", "Vehicle History", "Inventory Report", "Prospects"
];

export const ROOT_FOLDERS = [
    "QR Codes", "Pricing", "Operating Procedures", "My Logos", 
    "Inventory", "Client Engagement", "Chemicals", "Analytics"
];

const DEMO_FOLDERS: DriveFolder[] = [
    { id: 'demo-1', name: "Business Docs", path: [] },
    { id: 'demo-2', name: "Vendor Contracts", path: [] },
    { id: 'demo-3', name: "Insurance", path: [] }
];

const DEMO_FILES: DriveFile[] = [
    { id: 'file-1', name: "Employee_Handbook_2026.pdf", type: "application/pdf", size: "1.2 MB", modified: new Date().toISOString(), path: ["Business Docs"] },
    { id: 'file-2', name: "Mock_P_and_L_Statement.xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: "450 KB", modified: new Date().toISOString(), path: ["Business Docs"] },
    { id: 'file-3', name: "Acme_Chemicals_Contract.pdf", type: "application/pdf", size: "2.5 MB", modified: new Date().toISOString(), path: ["Vendor Contracts"] },
    { id: 'file-4', name: "Detailing_Supplies_Co_Agreement.pdf", type: "application/pdf", size: "1.8 MB", modified: new Date().toISOString(), path: ["Vendor Contracts"] },
    { id: 'file-5', name: "General_Liability_Policy.pdf", type: "application/pdf", size: "3.1 MB", modified: new Date().toISOString(), path: ["Insurance"] },
    { id: 'file-6', name: "Garage_Keepers_Insurance_Summary.pdf", type: "application/pdf", size: "850 KB", modified: new Date().toISOString(), path: ["Insurance"] }
];

export default function BusinessDrive() {
    const { toast } = useToast();
    const { isDemoMode } = useDemoMode();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortType, setSortType] = useState<'upload' | 'modified' | 'name'>('upload');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [dateFilter, setDateFilter] = useState('all');
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
        try {
            const stored = localStorage.getItem('business_drive_expanded_folders');
            if (stored) return JSON.parse(stored);
        } catch {}
        return { 'system-archives-main': true }; // System Archives expanded by default
    });

    useEffect(() => {
        localStorage.setItem('business_drive_expanded_folders', JSON.stringify(expandedFolders));
    }, [expandedFolders]);
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string | null>(null);
    const [filterHistory, setFilterHistory] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('business_drive_current_path');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    
    useEffect(() => {
        localStorage.setItem('business_drive_current_path', JSON.stringify(currentPath));
    }, [currentPath]);

    const [searchTerm, setSearchTerm] = useState("");
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [folders, setFolders] = useState<DriveFolder[]>(DEFAULT_FOLDERS);
    const [isLoaded, setIsLoaded] = useState(false);
    const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    
    // New Folder State
    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    
    // System Archive Modals State
    const [deleteAllOpen, setDeleteAllOpen] = useState(false);
    const [adminModalOpen, setAdminModalOpen] = useState(false);
    const [adminNotes, setAdminNotes] = useState("");
    const [adminPnl, setAdminPnl] = useState("");
    const [adminRevenue, setAdminRevenue] = useState("");
    const [adminPendingCount, setAdminPendingCount] = useState("");
    const [employeeRows, setEmployeeRows] = useState<{name: string, training: string, jobsToday: string, hours: string}[]>([]);
    
    const latestAlerts = useAlertsStore(s => s.latest);
    const refreshAlerts = useAlertsStore(s => s.refresh);

    useEffect(() => {
        if (adminModalOpen) {
            try { refreshAlerts(); } catch {}
        }
    }, [adminModalOpen, refreshAlerts]);

    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async (showToast = false) => {
        if (isDemoMode) return; // Completely disable sync in demo mode
        setIsSyncing(true);
        if (showToast) toast({ title: "Syncing...", description: "Fetching latest data from your cloud drive." });
        
        try {
            const { default: localforage } = await import('localforage');
            const { getCurrentUser } = await import('@/lib/auth');
            const user = getCurrentUser();

            if (user) {
                const syncPath = `users/${user.id}/drive_metadata.json`;
                const { data: cloudBlob, error } = await supabase.storage.from('customer-photos').download(syncPath);
                
                if (cloudBlob && !error) {
                    const text = await cloudBlob.text();
                    const { files: cloudFiles, folders: cloudFolders } = JSON.parse(text);
                    
                    if (cloudFiles) setFiles(cloudFiles);
                    if (cloudFolders) {
                        const updatedFolders = [...cloudFolders];
                        if (!updatedFolders.some((f: any) => f.name === 'System Archives' && f.path.length === 0)) {
                            updatedFolders.push({ id: 'system-archives-main', name: 'System Archives', path: [] });
                        }
                        setFolders(updatedFolders);
                        await localforage.setItem('business_drive_folders_v3', updatedFolders);
                    }
                    
                    await localforage.setItem('business_drive_files_v3', cloudFiles);
                    if (showToast) toast({ title: "Sync Complete", description: "Your drive is up to date." });
                } else if (showToast) {
                    toast({ title: "Sync Check", description: "No new updates found in the cloud." });
                }
            }
        } catch (err) {
            console.warn("Manual sync failed:", err);
            if (showToast) toast({ title: "Sync Error", description: "Could not reach the cloud. Using local data.", variant: "destructive" });
        } finally {
            setIsSyncing(false);
        }
    };

    // Persistence & Cloud Sync to avoid QuotaExceededError and enable cross-device usage
    useEffect(() => {
        const loadData = async () => {
            if (isDemoMode) {
                // In demo mode, load from demo keys or use defaults, do NOT sync with cloud
                const { default: localforage } = await import('localforage');
                const localDemoFiles = await localforage.getItem<DriveFile[]>('demo_business_drive_files_v3');
                const localDemoFolders = await localforage.getItem<DriveFolder[]>('demo_business_drive_folders_v3');
                
                // If the demo drive is empty (first time), populate with mock demo data
                setFiles((localDemoFiles && localDemoFiles.length > 0) ? localDemoFiles : DEMO_FILES);
                setFolders((localDemoFolders && localDemoFolders.length > 0) ? localDemoFolders : DEMO_FOLDERS);
                
                setIsLoaded(true);
                return;
            }

            try {
                const { default: localforage } = await import('localforage');
                
                // 1. Load Local Cache first for speed
                const localFiles = await localforage.getItem<DriveFile[]>('business_drive_files_v3');
                const localFolders = await localforage.getItem<DriveFolder[]>('business_drive_folders_v3');
                if (localFiles) setFiles(localFiles);
                if (localFolders) {
                    let updated = [...localFolders];
                    if (!updated.some(f => f.name === 'System Archives' && f.path.length === 0)) {
                        updated.push({ id: 'system-archives-main', name: 'System Archives', path: [] });
                        await localforage.setItem('business_drive_folders_v3', updated);
                    }
                    setFolders(updated);
                } else {
                    setFolders(DEFAULT_FOLDERS);
                }

                // 2. Initial Cloud Sync
                await handleSync(false);

                // 3. Re-read localforage after sync!
                const postSyncFiles = await localforage.getItem<DriveFile[]>('business_drive_files_v3') || [];
                const postSyncFolders = await localforage.getItem<DriveFolder[]>('business_drive_folders_v3') || DEFAULT_FOLDERS;

                // 4. Migration: If both local and cloud are empty, try migrating from legacy localStorage
                if (!localFiles && postSyncFiles.length === 0) {
                    const legacyFiles = localStorage.getItem('business_drive_files_v2');
                    if (legacyFiles) {
                        try {
                            const parsed = JSON.parse(legacyFiles);
                            setFiles(parsed);
                            await localforage.setItem('business_drive_files_v3', parsed);
                            localStorage.removeItem('business_drive_files_v2');
                        } catch (e) { console.error("Legacy file migration failed", e); }
                    }
                }
                if ((!localFolders || localFolders.length === 0) && postSyncFolders.length <= DEFAULT_FOLDERS.length) {
                    const legacyFolders = localStorage.getItem('business_drive_folders_v2');
                    if (legacyFolders) {
                        try {
                            const parsed = JSON.parse(legacyFolders);
                            setFolders(parsed);
                            await localforage.setItem('business_drive_folders_v3', parsed);
                            localStorage.removeItem('business_drive_folders_v2');
                        } catch (e) { console.error("Legacy folder migration failed", e); }
                    }
                }
                
                // 5. Migration: legacy PDF Archive to Business Drive System Archives
                try {
                    const legacyPdfs = localStorage.getItem('pdfArchive');
                    if (legacyPdfs) {
                        const parsedPdfs: any[] = JSON.parse(legacyPdfs);
                        if (parsedPdfs.length > 0) {
                            let updatedFolders = [...postSyncFolders];
                            let updatedFiles = [...postSyncFiles];

                            if (!updatedFolders.some(f => f.name === 'System Archives' && f.path.length === 0)) {
                                updatedFolders.push({ id: 'system-archives-main', name: 'System Archives', path: [] });
                            }

                            const folderMap: Record<string, string> = {
                                "Invoice": "Invoices", "Estimate": "Estimates", "Job": "Jobs", "Checklist": "Checklists",
                                "Customer": "Customer Records", "Employee Training": "Employee Training", "Bookings": "Bookings",
                                "Admin Updates": "Admin Updates", "Payroll": "Payroll", "Employee Contact": "Employee Contact",
                                "add-Ons": "Addons", "Sub Contractors": "Admin Updates", "Sub-Contractors": "Admin Updates",
                                "Package Comparisons": "Estimates", "Upsell Scripts": "Employee Training", "Client Evaluation": "Customer Records",
                                "Detailing Vendors": "Inventory Report", "Vehicle Classification": "Vehicle History",
                                "Vehicle History": "Vehicle History", "Inventory Report": "Inventory Report", "Prospects": "Prospects"
                            };

                            for (const pdf of parsedPdfs) {
                                const folderName = folderMap[pdf.recordType] || pdf.recordType || 'Uncategorized';
                                if (!updatedFolders.some(f => f.name === folderName && f.path.length === 1 && f.path[0] === 'System Archives')) {
                                    updatedFolders.push({ id: Math.random().toString(36).substring(2, 9), name: folderName, path: ['System Archives'] });
                                }
                                
                                const sizeKb = pdf.pdfData ? Math.round(pdf.pdfData.length * 0.75 / 1024) : 100;
                                if (!updatedFiles.some(f => f.name === pdf.fileName)) {
                                    updatedFiles.push({
                                        id: pdf.id || Math.random().toString(36).substring(2, 9),
                                        name: pdf.fileName,
                                        type: "application/pdf",
                                        size: sizeKb > 1024 ? (sizeKb/1024).toFixed(1) + " MB" : sizeKb + " KB",
                                        modified: new Date(pdf.timestamp || Date.now()).toISOString(),
                                        path: ['System Archives', folderName],
                                        data: pdf.pdfData,
                                        metadata: {
                                            customerName: pdf.customerName,
                                            recordType: pdf.recordType,
                                            recordId: pdf.recordId
                                        }
                                    });
                                }
                            }
                            
                            setFolders(updatedFolders);
                            setFiles(updatedFiles);
                            await localforage.setItem('business_drive_folders_v3', updatedFolders);
                            await localforage.setItem('business_drive_files_v3', updatedFiles);
                            localStorage.removeItem('pdfArchive');
                        }
                    }
                } catch (e) {
                    console.error("PDF Archive migration failed", e);
                }

                setIsLoaded(true);
            } catch (err) {
                console.error("Failed to load Business Drive data:", err);
                setFolders(DEFAULT_FOLDERS);
                setIsLoaded(true);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        if (!isLoaded) return;
        const saveData = async () => {
            try {
                const { default: localforage } = await import('localforage');
                
                if (isDemoMode) {
                    await localforage.setItem('demo_business_drive_files_v3', files);
                    await localforage.setItem('demo_business_drive_folders_v3', folders);
                    return; // Do NOT push to cloud sync in demo mode
                }

                const { getCurrentUser } = await import('@/lib/auth');
                const user = getCurrentUser();

                // Save to local cache (Fast)
                await localforage.setItem('business_drive_files_v3', files);
                await localforage.setItem('business_drive_folders_v3', folders);

                // Push to Cloud Sync (Cross-device)
                if (user) {
                    const syncPath = `users/${user.id}/drive_metadata.json`;
                    const metadata = JSON.stringify({ files, folders, syncedAt: new Date().toISOString() });
                    const blob = new Blob([metadata], { type: 'application/json' });
                    
                    await supabase.storage.from('customer-photos').upload(syncPath, blob, {
                        upsert: true,
                        contentType: 'application/json'
                    });
                }
            } catch (err) {
                console.warn("Auto-save/Sync failed:", err);
            }
        };
        
        // Debounce sync to avoid spamming Supabase on rapid changes
        const timer = setTimeout(saveData, 2000);
        return () => clearTimeout(timer);
    }, [files, folders, isLoaded]);

    const handleDismissAlert = (file: DriveFile, silent = false) => {
        if (!file.metadata || !file.metadata.recordType) return;
        dismissAlertsForRecord(file.metadata.recordType, file.id);
        if (file.metadata.recordId) {
            dismissAlertsForRecord(file.metadata.recordType, file.metadata.recordId);
        }
        try { refreshAlerts(); } catch {}
        if (!silent) toast({ title: 'Alert Dismissed', description: 'The alert for this document has been cleared.' });
    };

    // 1. Restore Legacy Test Files if completely missing
    useEffect(() => {
        if (!isLoaded) return;
        const RESTORED_KEY = 'v6_test_files_restored_final';
        if (!localStorage.getItem(RESTORED_KEY)) {
            localStorage.setItem(RESTORED_KEY, 'true');
            const mockFiles = [
                { name: 'Checklist_Progress.pdf', folder: 'Checklists', cat: 'Checklist' },
                { name: 'Job_Completion_1.pdf', folder: 'Jobs', cat: 'Job' },
                { name: 'Job_Completion_2.pdf', folder: 'Jobs', cat: 'Job' },
                { name: 'Bookings.pdf', folder: 'Bookings', cat: 'Bookings' }
            ];
            const toAdd = mockFiles.filter(m => !files.some(f => f.name === m.name));
            if (toAdd.length > 0) {
                let newFiles: DriveFile[] = [];
                toAdd.forEach((m, idx) => {
                    newFiles.push({
                        id: 'restored-' + idx + '-' + Date.now(),
                        name: m.name,
                        type: 'application/pdf',
                        size: '150 KB',
                        modified: new Date(Date.now() - 24 * 3600 * 1000 * (idx % 2)).toISOString(),
                        path: ['System Archives', m.folder],
                        data: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLU31jBQsTAz1LBSKChQOtwL5AIFuBh4KZW5kc3RyZWFtCmVuZG9iagozIDAgb2JqCjQ2CmVuZG9iago0IDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveCBbMCAwIDYxMiA3OTJdL1Jlc291cmNlcyA8PC9Gb250IDw8L0YxIDUgMCBSPj4+Pi9Db250ZW50cyAyIDAgUi9QYXJlbnQgNiAwIFI+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKNiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkcyBbNCAwIFJdPj4KZW5kb2JqCjcgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDYgMCBSPj4KZW5kb2JqCnhyZWYKMCA4CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwMCAwMDAwMCBuIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAxMzIgMDAwMDAgbiAKMDAwMDAwMDE1MSAwMDAwMCBuIAowMDAwMDAwMjc1IDAwMDAwIG4gCjAwMDAwMDAzNjMgMDAwMDAgbiAKMDAwMDAwMDQyMiAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgOC9Sb290IDcgMCBSPj4Kc3RhcnR4cmVmCjQ3MQolJUVPRgo=',
                        metadata: { recordType: m.cat }
                    });
                });
                
                // Also ensure the subfolders exist
                setFolders(prev => {
                    const newFolders = [...prev];
                    
                    ALL_CATEGORIES.forEach(cat => {
                        if (!newFolders.some(f => f.name === cat && f.path.length === 1 && f.path[0] === 'System Archives')) {
                            newFolders.push({ id: Math.random().toString(36).substring(2, 9), name: cat, path: ['System Archives'] });
                        }
                    });

                    ROOT_FOLDERS.forEach(root => {
                        if (!newFolders.some(f => f.name === root && f.path.length === 0)) {
                            newFolders.push({ id: Math.random().toString(36).substring(2, 9), name: root, path: [] });
                        }
                    });

                    import('localforage').then(lf => {
                        lf.default.setItem('business_drive_folders_v3', newFolders);
                    });
                    return newFolders;
                });

                setFiles(prev => [...prev, ...newFiles]);
                import('localforage').then(lf => {
                    lf.default.getItem<DriveFile[]>('business_drive_files_v3').then(existing => {
                        lf.default.setItem('business_drive_files_v3', [...(existing || []), ...newFiles]);
                    });
                });
            }
        }
    }, [isLoaded, files]);

    // 2. Auto-open System Archives in List View if it has files
    useEffect(() => {
        if (!isLoaded) return;
        const autoExpanded = sessionStorage.getItem('v6_auto_expanded_system_archives');
        if (!autoExpanded) {
            sessionStorage.setItem('v6_auto_expanded_system_archives', 'true');
            // Check if System Archives contains files
            const systemArchivesFiles = files.filter(f => f.path.length > 0 && f.path[0] === 'System Archives');
            if (systemArchivesFiles.length > 0) {
                // Force list view
                setViewMode('list');
                localStorage.setItem('business_drive_view', 'list');
                
                // Expand System Archives and relevant subfolders
                setExpandedFolders(prev => {
                    const next = { ...prev, 'system-archives-main': true };
                    const subFoldersWithFiles = new Set(systemArchivesFiles.map(f => f.path[1]));
                    
                    folders.forEach(folder => {
                        if (folder.path.length === 1 && folder.path[0] === 'System Archives' && subFoldersWithFiles.has(folder.name)) {
                            next[folder.id] = true;
                        }
                    });
                    
                    localStorage.setItem('business_drive_expanded_folders', JSON.stringify(next));
                    return next;
                });
            }
        }
    }, [isLoaded, files, folders]);

    const currentItems = useMemo(() => {
        let filteredFiles = files;
        let filteredFolders = folders;

        if (selectedTypeFilter) {
            // Pull out files of matching type from ANY path/folder (top level display)
            filteredFiles = files.filter(f => {
                const searchStr = searchTerm.toLowerCase();
                const matchesSearch = f.name.toLowerCase().includes(searchStr) || f.metadata?.customerName?.toLowerCase().includes(searchStr);
                const matchesType = getFileCategory(f) === selectedTypeFilter;
                return matchesSearch && matchesType;
            });
            // Folders are not shown in the type filter top-level view
            filteredFolders = [];
        } else {
            // Normal view restricted to currentPath
            filteredFiles = files.filter(f => {
                const searchStr = searchTerm.toLowerCase();
                const matchesSearch = f.name.toLowerCase().includes(searchStr) || f.metadata?.customerName?.toLowerCase().includes(searchStr);
                const matchesPath = JSON.stringify(f.path) === JSON.stringify(currentPath);
                return matchesSearch && matchesPath;
            });

            filteredFolders = folders.filter(f => {
                const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesPath = JSON.stringify(f.path) === JSON.stringify(currentPath);
                return matchesSearch && matchesPath;
            });
        }

        // Apply Time Range Filter
        if (dateFilter !== 'all') {
            const now = new Date();
            filteredFiles = filteredFiles.filter(f => {
                const d = new Date(f.modified);
                if (dateFilter === 'today') return d.toDateString() === now.toDateString();
                if (dateFilter === 'week') return (now.getTime() - d.getTime()) <= 7 * 24 * 60 * 60 * 1000;
                if (dateFilter === 'month') return (now.getTime() - d.getTime()) <= 30 * 24 * 60 * 60 * 1000;
                if (dateFilter === 'year') return (now.getTime() - d.getTime()) <= 365 * 24 * 60 * 60 * 1000;
                return true;
            });
        }

        // Apply Sorting to Files
        filteredFiles = [...filteredFiles].sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            if (sortType === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else {
                // Parse modified/upload date. Fallback to 0 if invalid
                valA = a.modified ? new Date(a.modified).getTime() : 0;
                valB = b.modified ? new Date(b.modified).getTime() : 0;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // Apply Sorting to Folders (always sort folders by name in normal view)
        filteredFolders = [...filteredFolders].sort((a, b) => {
            if (a.name === 'System Archives') return -1;
            if (b.name === 'System Archives') return 1;
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            if (nameA < nameB) return sortDirection === 'asc' ? -1 : 1;
            if (nameA > nameB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return { files: filteredFiles, folders: filteredFolders };
    }, [files, folders, currentPath, searchTerm, selectedTypeFilter, sortType, sortDirection]);

    const openViewer = (file: DriveFile) => {
        setSelectedFile(file);
        setIsViewerOpen(true);
        setZoom(100);
        if (fileHasAlert(file)) {
            handleDismissAlert(file, true);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, skipCompression = false) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        const filesArray = Array.from(fileList);
        const uploadCount = filesArray.length;
        
        toast({ 
            title: uploadCount > 1 ? `Uploading ${uploadCount} files...` : "Uploading...", 
            description: skipCompression ? "RAM-Safe Mode: Uploading directly to cloud." : `Preparing your ${uploadCount > 1 ? 'assets' : 'file'} for secure storage.` 
        });

        for (const file of filesArray) {
            try {
                // Upload to Supabase bucket 'customer-photos'
                // We pass skipCompression = true for camera to avoid RAM-heavy canvas operations on S20FE
                const publicUrl = await uploadFile('customer-photos', file, `business-drive/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`, skipCompression);

                const newFile: DriveFile = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    type: file.type,
                    size: (file.size / 1024).toFixed(1) + ' KB',
                    modified: new Date().toLocaleString(),
                    path: [...currentPath],
                    data: publicUrl
                };

                setFiles(prev => {
                    const updated = [...prev, newFile];
                    // Instant Save to Local Cache (IndexedDB) to prevent loss on mobile refresh
                    import('localforage').then(lf => {
                        lf.default.setItem('business_drive_files_v3', updated);
                    });
                    return updated;
                });
            } catch (err: any) {
                console.error(`Upload failed for ${file.name}:`, err);
                toast({ 
                    title: `Failed: ${file.name}`, 
                    description: "Cloud storage is currently unreachable. Please try again later.",
                    variant: "destructive"
                });
            }
        }
        
        toast({ 
            title: uploadCount > 1 ? "Upload Complete" : "File Uploaded", 
            description: uploadCount > 1 ? `${uploadCount} files added to your drive.` : "File saved securely to the cloud." 
        });
    };

    const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'file' | 'folder', name: string } | null>(null);

    const handleCreateFolder = () => {
        if (!newFolderName.trim()) return;
        const newFolder: DriveFolder = {
            id: Math.random().toString(36).substr(2, 9),
            name: newFolderName.trim(),
            path: [...currentPath]
        };
        setFolders(prev => [...prev, newFolder]);
        setNewFolderName("");
        setIsNewFolderOpen(false);
        toast({ title: "Folder Created", description: `"${newFolder.name}" is ready.` });
    };

    const confirmDeleteFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
        setDeleteTarget(null);
        toast({ title: "File Deleted", variant: "destructive" });
    };

    const confirmDeleteFolder = (id: string) => {
        setFolders(prev => prev.filter(f => f.id !== id));
        setDeleteTarget(null);
        toast({ title: "Folder Deleted", variant: "destructive" });
    };

    const downloadFile = (file: DriveFile) => {
        if (!file.data) return;
        const link = document.createElement('a');
        link.href = file.data;
        link.download = file.name;
        link.click();
    };

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);

    const handleAnalyzeFolder = () => {
        setIsAnalyzing(true);
        // Simulate Gemini analysis
        setTimeout(() => {
            const folderName = currentPath.length > 0 ? currentPath[currentPath.length - 1] : "Root";
            const fileCount = currentItems.files.length;
            const folderCount = currentItems.folders.length;
            const fileTypes = Array.from(new Set(currentItems.files.map(f => f.type.split('/')[1] || 'document')));
            
            let summary = `### Gemini Analysis: ${folderName}\n\n`;
            summary += `I have analyzed the **${fileCount} files** and **${folderCount} sub-folders** within this directory. Here are the key insights:\n\n`;
            
            if (fileCount === 0 && folderCount === 0) {
                summary += `* **Status:** This directory is currently empty. No actionable data found.\n`;
                summary += `* **Recommendation:** Upload relevant business documents or pricing sheets to begin analysis.`;
            } else {
                summary += `* **Composition:** The folder primarily contains ${fileTypes.join(', ')} assets.\n`;
                summary += `* **Business Value:** Based on the file names, this directory appears to be central to your **${folderName}** operations.\n`;
                summary += `* **Suggested Action:** Consider categorizing the ${fileCount} files into specific sub-folders to optimize your workflow.\n\n`;
                summary += `#### Identified Items:\n`;
                currentItems.files.forEach(f => {
                    summary += `* **${f.name}**: A ${f.size} ${f.type.split('/')[1]} modified on ${f.modified.split(',')[0]}.\n`;
                });
            }
            
            setAnalysisResult(summary);
            setIsAnalyzing(false);
        }, 2000);
    };

    const handleUpOneLevel = () => {
        if (currentPath.length > 0) {
            const newPath = [...currentPath];
            newPath.pop();
            setCurrentPath(newPath);
        }
    };

    const handleBack = () => {
        if (selectedTypeFilter) {
            const nextHistory = [...filterHistory];
            nextHistory.pop(); // Remove current one
            setFilterHistory(nextHistory);
            if (nextHistory.length > 0) {
                setSelectedTypeFilter(nextHistory[nextHistory.length - 1]);
            } else {
                setSelectedTypeFilter(null);
            }
        } else if (currentPath.length > 0) {
            handleUpOneLevel();
        }
    };

    const [zoom, setZoom] = useState(100);

    const handleNext = () => {
        if (!selectedFile) return;
        const items = selectedFile.type.startsWith('image/') 
            ? currentItems.files.filter(f => f.type.startsWith('image/'))
            : currentItems.files;
        const currentIndex = items.findIndex(f => f.id === selectedFile.id);
        if (currentIndex < items.length - 1) {
            setSelectedFile(items[currentIndex + 1]);
            setZoom(100);
        }
    };

    const handlePrev = () => {
        if (!selectedFile) return;
        const items = selectedFile.type.startsWith('image/') 
            ? currentItems.files.filter(f => f.type.startsWith('image/'))
            : currentItems.files;
        const currentIndex = items.findIndex(f => f.id === selectedFile.id);
        if (currentIndex > 0) {
            setSelectedFile(items[currentIndex - 1]);
            setZoom(100);
        }
    };

    const folderHasFiles = (folder: DriveFolder) => {
        const targetPath = [...folder.path, folder.name];
        return files.some(f => {
            if (f.path.length < targetPath.length) return false;
            return targetPath.every((segment, idx) => f.path[idx] === segment);
        });
    };

    const fileHasAlert = (file: DriveFile) => {
        if (!file.metadata || !file.metadata.recordType) return false;
        return latestAlerts.some(a => {
            const t = (a.title || "").toLowerCase();
            return t.includes(file.id.toLowerCase()) || (file.metadata?.recordId && t.includes(file.metadata.recordId.toLowerCase()));
        });
    };

    const printFile = (file: DriveFile) => {
        if (!file.data) return;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`<iframe src="${file.data}" width="100%" height="100%" style="border:none;"></iframe>`);
            printWindow.document.title = file.name;
            // Delay print to allow iframe to load
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

    const renderListFile = (file: DriveFile, depth: number) => {
        const hasAlert = fileHasAlert(file);
        return (
            <div 
                key={file.id} 
                className="flex items-center justify-between p-4 bg-[#0d1117]/80 border-t border-zinc-800/50 hover:bg-[#161b22] transition-all group shadow-sm cursor-pointer"
                onClick={() => openViewer(file)}
            >
                <div className="flex items-center gap-4 flex-1 min-w-0" style={{ paddingLeft: `${1 + depth * 1.5}rem` }}>
                    <div className="p-2 bg-zinc-800/50 rounded-lg">
                        {file.type.startsWith('image/') ? (
                            <img src={file.data} className="w-5 h-5 object-cover rounded-sm" alt="" />
                        ) : (
                            <FileText className="w-5 h-5 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                        )}
                    </div>
                    <span className="text-sm font-bold text-white truncate">{file.name}</span>
                    {file.path.includes('System Archives') && (
                        <div title={hasAlert ? "Unread Alert" : "Viewed"}>
                            <Bell className={cn("w-4 h-4 ml-2", hasAlert ? "text-yellow-400" : "text-white")} />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-8 text-xs text-zinc-500" onClick={(e) => e.stopPropagation()}>
                    <div className="hidden lg:flex items-center gap-2 w-32">
                        <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] font-black">ME</div>
                        Me
                    </div>
                    <div className="hidden sm:flex items-center gap-2 w-40">
                        <Clock className="w-3.5 h-3.5" /> {new Date(file.modified).toLocaleDateString()}
                    </div>
                    <div className="w-20 text-right font-mono">{file.size}</div>
                    


                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-zinc-800 text-white">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#161b22] border-zinc-800 text-white">
                            <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => openViewer(file)}>
                                <Eye className="w-4 h-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => printFile(file)}>
                                <Printer className="w-4 h-4 mr-2" /> Print
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => downloadFile(file)}>
                                <Download className="w-4 h-4 mr-2" /> Download
                            </DropdownMenuItem>

                            <DropdownMenuItem className="hover:bg-zinc-800 text-destructive cursor-pointer" onClick={() => setDeleteTarget({ id: file.id, type: 'file', name: file.name })}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        );
    };

    const renderListFolder = (folder: DriveFolder, depth = 0) => {
        const isExpanded = !!expandedFolders[folder.id];
        
        // Find direct children (1 level deep from this folder)
        const targetPathLength = folder.path.length + 1;
        const targetPath = [...folder.path, folder.name];
        
        let childFolders = folders.filter(f => {
            if (f.path.length !== targetPathLength) return false;
            return targetPath.every((segment, idx) => f.path[idx] === segment);
        });
        
        let childFiles = files.filter(f => {
            if (f.path.length !== targetPathLength) return false;
            return targetPath.every((segment, idx) => f.path[idx] === segment);
        });

        // Apply filters to child files
        if (searchTerm) {
            const searchStr = searchTerm.toLowerCase();
            childFiles = childFiles.filter(f => {
                const matchName = f.name.toLowerCase().includes(searchStr);
                const matchCustomer = f.metadata?.customerName?.toLowerCase().includes(searchStr);
                return matchName || matchCustomer;
            });
        }
        if (dateFilter !== 'all') {
            const now = new Date();
            childFiles = childFiles.filter(f => {
                const d = new Date(f.modified);
                if (dateFilter === 'today') return d.toDateString() === now.toDateString();
                if (dateFilter === 'week') return (now.getTime() - d.getTime()) <= 7 * 24 * 60 * 60 * 1000;
                if (dateFilter === 'month') return (now.getTime() - d.getTime()) <= 30 * 24 * 60 * 60 * 1000;
                if (dateFilter === 'year') return (now.getTime() - d.getTime()) <= 365 * 24 * 60 * 60 * 1000;
                return true;
            });
        }
        if (selectedTypeFilter) {
            childFiles = childFiles.filter(f => getFileCategory(f) === selectedTypeFilter);
        }

        // Apply Sorting to child files
        childFiles = [...childFiles].sort((a, b) => {
            let valA: any = '';
            let valB: any = '';
            if (sortType === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else {
                valA = a.modified ? new Date(a.modified).getTime() : 0;
                valB = b.modified ? new Date(b.modified).getTime() : 0;
            }
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return (
            <div key={folder.id} className={cn("flex flex-col", depth === 0 ? "mb-2 border border-zinc-800 rounded-xl overflow-hidden shadow-sm" : "")}>
                <div 
                    className={cn(
                        "flex items-center justify-between p-4 cursor-pointer transition-colors group",
                        depth === 0 ? "bg-[#0d1117]" : "bg-[#161b22] border-t border-zinc-800",
                        folder.name === 'System Archives' ? "hover:bg-purple-950/20" :
                        (childFolders.length > 0 || childFiles.length > 0 ? "hover:bg-emerald-950/15" : "hover:bg-blue-900/10"),
                        isExpanded && depth === 0 && "border-b border-zinc-800"
                    )}
                    onClick={() => setExpandedFolders(p => ({...p, [folder.id]: !p[folder.id]}))}
                >
                    <div className="flex items-center gap-4 flex-1 min-w-0" style={{ paddingLeft: `${1 + depth * 1.5}rem` }}>
                        <Folder className={cn("w-5 h-5", folder.name === 'System Archives' ? 'text-purple-400' : (childFolders.length > 0 || childFiles.length > 0 ? 'text-emerald-400' : 'text-blue-400'))} />
                        <span className={cn("text-sm font-bold truncate", folder.name === 'System Archives' ? 'text-purple-300' : 'text-white')}>{folder.name}</span>
                        <span className="text-[10px] text-zinc-500 font-bold ml-2">({childFolders.length + childFiles.length} items)</span>
                    </div>
                </div>
                {isExpanded && (
                    <div className="flex flex-col animate-fade-in bg-zinc-950/20">
                        {childFolders.map(cf => renderListFolder(cf, depth + 1))}
                        {childFiles.map(cf => renderListFile(cf, depth + 1))}
                        {childFolders.length === 0 && childFiles.length === 0 && (
                            <div className="p-4 text-xs text-zinc-500 italic" style={{ paddingLeft: `${1 + (depth + 1) * 1.5}rem` }}>Folder is empty</div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in p-1">
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#0d1117] p-4 rounded-xl border border-zinc-800 shadow-xl">
                <div className="flex items-center gap-3 text-sm text-zinc-400 overflow-hidden">
                    {(currentPath.length > 0 || selectedTypeFilter !== null) && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-zinc-800 text-white" 
                            onClick={handleBack}
                            title="Go Back"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    )}
                    <button 
                        onClick={() => setCurrentPath([])}
                        className={cn("hover:text-white transition-colors whitespace-nowrap", currentPath.length === 0 && "text-white font-black")}
                    >
                        My Drive
                    </button>
                    {currentPath.map((segment, idx) => (
                        <React.Fragment key={idx}>
                            <ChevronRight className="w-4 h-4 shrink-0" />
                            <button 
                                onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
                                className={cn(
                                    "hover:text-white transition-colors whitespace-nowrap truncate max-w-[150px]",
                                    idx === currentPath.length - 1 && "text-white font-black"
                                )}
                            >
                                {segment}
                            </button>
                        </React.Fragment>
                    ))}
                    
                    {currentPath.length > 0 && currentPath[0] === 'System Archives' && (
                        <div className="flex gap-2 ml-4">
                            <Button variant="destructive" size="sm" onClick={() => setDeleteAllOpen(true)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete All
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input 
                            placeholder="Search by name or customer..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-[#161b22] border-zinc-800 w-full md:w-64 focus:ring-blue-500/20"
                        />
                    </div>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-[130px] h-10 bg-[#161b22] border-zinc-800 text-white font-bold text-xs uppercase tracking-wider">
                            <SelectValue placeholder="Time" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#161b22] border-zinc-800 text-white">
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">Past Week</SelectItem>
                            <SelectItem value="month">Past Month</SelectItem>
                            <SelectItem value="year">Past Year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value="jump" onValueChange={(val) => {
                        if (val === 'root') {
                            setCurrentPath([]);
                        } else if (val === 'system') {
                            setCurrentPath(['System Archives']);
                            setExpandedFolders(p => ({ ...p, 'system-archives-main': true }));
                        } else if (val.startsWith('sys-')) {
                            const catName = val.replace('sys-', '');
                            setCurrentPath(['System Archives', catName]);
                            // Also expand system archives and the selected folder in list view
                            const folderId = folders.find(f => f.name === catName && f.path.length === 1 && f.path[0] === 'System Archives')?.id;
                            setExpandedFolders(p => ({ ...p, 'system-archives-main': true, ...(folderId ? { [folderId]: true } : {}) }));
                        } else {
                            setCurrentPath([val]);
                        }
                    }}>
                        <SelectTrigger className="w-[160px] h-10 bg-indigo-950/20 border-indigo-900/30 text-indigo-300 font-black text-xs uppercase tracking-wider">
                            <SelectValue placeholder="Jump to Folder..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#161b22] border-zinc-800 text-white max-h-[400px]">
                            <SelectItem value="root" className="font-black text-blue-400">My Drive</SelectItem>
                            <SelectItem value="system" className="font-black text-purple-400">System Archives</SelectItem>
                            
                            <SelectSeparator className="bg-zinc-800" />
                            <div className="px-2 py-1 text-[10px] font-black uppercase text-zinc-500">System Folders</div>
                            {ALL_CATEGORIES.map(cat => (
                                <SelectItem key={`sys-${cat}`} value={`sys-${cat}`} className="pl-6 text-xs">{cat}</SelectItem>
                            ))}
                            
                            <SelectSeparator className="bg-zinc-800" />
                            <div className="px-2 py-1 text-[10px] font-black uppercase text-zinc-500">Root Folders</div>
                            {ROOT_FOLDERS.map(root => (
                                <SelectItem key={root} value={root} className="pl-6 text-xs">{root}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {folders.some(f => f.name === 'System Archives') && (
                        <Button 
                            className="bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 hover:text-purple-300 font-bold h-10 px-3 md:px-4 mr-1 md:mr-2 border border-purple-500/20 shrink-0" 
                            onClick={() => setAdminModalOpen(true)}
                        >
                            <FileText className="w-4 h-4 md:mr-2" />
                            <span className="hidden md:inline">Admin Update PDF</span>
                        </Button>
                    )}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-10 w-10 text-zinc-400 hover:text-white hover:bg-zinc-800", isSyncing && "text-blue-500")}
                        onClick={() => handleSync(true)}
                        title="Cloud Sync"
                    >
                        <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-400 hover:text-white hover:bg-zinc-800" title="Sort Items">
                                <ArrowUpDown className="w-5 h-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#161b22] border-zinc-800 text-white w-48 z-[9999]">
                            <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 mb-1">Sort by</div>
                            <DropdownMenuItem 
                                className={cn("hover:bg-zinc-800 cursor-pointer flex items-center justify-between", sortType === 'upload' && "text-blue-400 font-bold")}
                                onClick={() => setSortType('upload')}
                            >
                                Upload Time
                                {sortType === 'upload' && <span className="text-xs">✓</span>}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                className={cn("hover:bg-zinc-800 cursor-pointer flex items-center justify-between", sortType === 'modified' && "text-blue-400 font-bold")}
                                onClick={() => setSortType('modified')}
                            >
                                Modified Time
                                {sortType === 'modified' && <span className="text-xs">✓</span>}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                className={cn("hover:bg-zinc-800 cursor-pointer flex items-center justify-between", sortType === 'name' && "text-blue-400 font-bold")}
                                onClick={() => setSortType('name')}
                            >
                                Name
                                {sortType === 'name' && <span className="text-xs">✓</span>}
                            </DropdownMenuItem>
                            
                            <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-t border-zinc-800 mt-2 mb-1">Direction</div>
                            <DropdownMenuItem 
                                className={cn("hover:bg-zinc-800 cursor-pointer flex items-center justify-between", sortDirection === 'desc' && "text-blue-400 font-bold")}
                                onClick={() => setSortDirection('desc')}
                            >
                                Newest / Z-A
                                {sortDirection === 'desc' && <span className="text-xs">✓</span>}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                className={cn("hover:bg-zinc-800 cursor-pointer flex items-center justify-between", sortDirection === 'asc' && "text-blue-400 font-bold")}
                                onClick={() => setSortDirection('asc')}
                            >
                                Oldest / A-Z
                                {sortDirection === 'asc' && <span className="text-xs">✓</span>}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="flex bg-[#161b22] p-1 rounded-lg border border-zinc-800">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn("h-8 px-2", viewMode === 'grid' && "bg-zinc-800 text-white")}
                            onClick={() => setViewMode('grid')}
                        >
                            <Grid className="w-4 h-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn("h-8 px-2", viewMode === 'list' && "bg-zinc-800 text-white")}
                            onClick={() => setViewMode('list')}
                        >
                            <List className="w-4 h-4" />
                        </Button>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                                <Plus className="w-4 h-4 mr-2" />
                                New
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#161b22] border-zinc-800 text-white">
                            <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => setIsNewFolderOpen(true)}>
                                <FolderPlus className="w-4 h-4 mr-2" /> New Folder
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => document.getElementById('drive-camera')?.click()}>
                                <Camera className="w-4 h-4 mr-2" /> Take Photo
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => document.getElementById('drive-upload')?.click()}>
                                <Upload className="w-4 h-4 mr-2" /> Upload Files
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <input type="file" id="drive-upload" className="hidden" multiple onChange={(e) => handleUpload(e, false)} />
                    <input type="file" id="drive-camera" className="hidden" accept="image/*" capture="environment" onChange={(e) => handleUpload(e, true)} />
                </div>
            </div>

            {/* Gemini Summary Bar (Aesthetic) */}
            <div 
                className="bg-gradient-to-r from-blue-600/20 via-purple-600/10 to-transparent p-5 rounded-2xl border border-blue-500/20 flex items-center justify-between shadow-lg relative overflow-hidden group cursor-pointer"
                onClick={handleAnalyzeFolder}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className={cn(
                        "w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 transition-all",
                        isAnalyzing && "animate-pulse scale-110"
                    )}>
                        <Sparkles className={cn("w-6 h-6 text-white", isAnalyzing && "animate-spin")} />
                    </div>
                    <div>
                        <div className="text-base font-black text-white flex items-center gap-2">
                            Ask Gemini
                            {isAnalyzing && <span className="text-[10px] bg-blue-500 px-2 py-0.5 rounded-full animate-bounce">Analyzing...</span>}
                        </div>
                        <div className="text-sm text-zinc-400">Summarize, analyze, and get up to speed with files in this folder.</div>
                    </div>
                </div>
                <Button 
                    variant="outline" 
                    className="border-zinc-700 hover:bg-zinc-800 text-xs font-bold uppercase tracking-widest hidden sm:flex relative z-10"
                    disabled={isAnalyzing}
                >
                    {isAnalyzing ? "Processing..." : "Analyze Folder"}
                </Button>
            </div>

            {/* Gemini Analysis Dialog */}
            <Dialog open={!!analysisResult} onOpenChange={(open) => !open && setAnalysisResult(null)}>
                <DialogContent className="sm:max-w-[600px] bg-[#0d1117] border-zinc-800 text-white p-0 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 border-b border-zinc-800 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black">Gemini Insight</h2>
                            <p className="text-xs text-zinc-400">Intelligence report for current directory</p>
                        </div>
                    </div>
                    <div className="p-8 max-h-[60vh] overflow-y-auto prose prose-invert prose-sm max-w-none">
                        {analysisResult?.split('\n').map((line, i) => (
                            <p key={i} className={cn(
                                line.startsWith('###') ? "text-xl font-black text-blue-400 mt-6 mb-2" : 
                                line.startsWith('####') ? "text-lg font-bold text-zinc-200 mt-4 mb-2" :
                                line.startsWith('*') ? "flex items-start gap-2 text-zinc-300 ml-2" : "text-zinc-400"
                            )}>
                                {line.replace(/^### |^#### |^\* /, '')}
                            </p>
                        ))}
                    </div>
                    <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 bg-[#161b22]/50">
                        <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => setAnalysisResult(null)}>Close</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 font-bold" onClick={() => setAnalysisResult(null)}>
                            Save Insights
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sort options by Type */}
            <div className="flex flex-col gap-4 bg-[#0d1117]/50 border border-zinc-800/80 p-4 rounded-2xl shadow-md">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mr-2 shrink-0">Sort by Type:</span>
                    {['Documents', 'Spreadsheets', 'Videos', 'Pictures', 'PDFs', 'Audio'].map(type => {
                        const isActive = selectedTypeFilter === type;
                        return (
                            <Button
                                key={type}
                                variant="ghost"
                                onClick={() => {
                                    const nextHistory = [...filterHistory, type];
                                    setFilterHistory(nextHistory);
                                    setSelectedTypeFilter(type);
                                }}
                                className={cn(
                                    "h-8 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border shrink-0",
                                    isActive 
                                        ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20" 
                                        : "bg-[#161b22] border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                                )}
                            >
                                {type}
                            </Button>
                        );
                    })}
                    {selectedTypeFilter && (
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSelectedTypeFilter(null);
                                setFilterHistory([]);
                            }}
                            className="h-8 w-8 rounded-full p-0 bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900/40 hover:text-white shrink-0"
                            title="Clear Type Filter"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                {selectedTypeFilter && (
                    <div className="flex items-center justify-between p-3 bg-blue-950/20 border border-blue-900/30 rounded-xl animate-fade-in shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                                i
                            </div>
                            <div>
                                <p className="text-xs font-black text-white">Viewing {selectedTypeFilter} only</p>
                                <p className="text-[10px] text-zinc-400">Showing all {selectedTypeFilter.toLowerCase()} in your Business Drive on the top level.</p>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                                setSelectedTypeFilter(null);
                                setFilterHistory([]);
                            }}
                            className="text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-white"
                        >
                            Cancel View [x]
                        </Button>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className={cn(
                viewMode === 'grid' 
                    ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
                    : "space-y-3"
            )}>
                {!isLoaded ? (
                    <div className="col-span-full py-24 text-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-zinc-400 font-medium">Syncing with Secure Storage...</p>
                    </div>
                ) : currentItems.folders.length === 0 && currentItems.files.length === 0 ? (
                    <div className="col-span-full py-24 text-center bg-[#0d1117] rounded-3xl border border-dashed border-zinc-800 shadow-inner">
                        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                            <File className="w-10 h-10 text-zinc-700" />
                        </div>
                        <p className="text-zinc-400 font-medium">This folder is empty.</p>
                        <div className="flex justify-center gap-3 mt-4">
                            <Button variant="outline" className="border-zinc-700 font-bold text-white hover:bg-zinc-800" onClick={() => setIsNewFolderOpen(true)}>
                                <FolderPlus className="w-4 h-4 mr-2" /> New Folder
                            </Button>
                            <Button variant="link" className="text-blue-500 font-bold" onClick={() => document.getElementById('drive-upload')?.click()}>
                                Upload File
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Render Folders First */}
                        {currentItems.folders.map(folder => {
                            const containsFiles = folderHasFiles(folder);
                            const targetPath = [...folder.path, folder.name];
                            const folderFiles = files.filter(f => {
                                if (f.path.length < targetPath.length) return false;
                                return targetPath.every((segment, idx) => f.path[idx] === segment);
                            }).sort((a, b) => {
                                const valA = a.modified ? new Date(a.modified).getTime() : 0;
                                const valB = b.modified ? new Date(b.modified).getTime() : 0;
                                return valB - valA;
                            });

                            const isSystemArchive = folder.name === 'System Archives';

                            return viewMode === 'grid' ? (
                                <HoverCard key={folder.id} openDelay={400}>
                                  <HoverCardTrigger asChild>
                                    <Card 
                                        className={cn(
                                            "bg-[#0d1117] p-5 transition-all cursor-pointer group relative shadow-md",
                                            isSystemArchive ? "border-purple-500/50 bg-purple-950/10 hover:border-purple-400 hover:bg-purple-950/20" :
                                            containsFiles 
                                                ? "border-emerald-500/50 bg-emerald-950/5 hover:border-emerald-400 hover:bg-emerald-950/15" 
                                                : "border-zinc-800 hover:border-blue-500/50 hover:bg-[#161b22]"
                                        )}
                                        onClick={() => setCurrentPath([...currentPath, folder.name])}
                                    >
                                        <div className="flex flex-col items-center justify-center text-center space-y-3 pt-2">
                                            <div className={cn(
                                                "p-4 rounded-2xl transition-all duration-300 flex items-center justify-center shadow-inner",
                                                isSystemArchive ? "bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30 group-hover:text-purple-300" :
                                                containsFiles
                                                    ? "bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30 group-hover:text-emerald-300"
                                                    : "bg-zinc-800/50 text-zinc-400 group-hover:bg-blue-600/20 group-hover:text-blue-400"
                                            )}>
                                                <Folder className="w-10 h-10" />
                                            </div>
                                            <span className={cn(
                                                "font-bold text-xs sm:text-sm text-center transition-colors px-1 w-full line-clamp-2 break-words",
                                                isSystemArchive ? "text-purple-300 group-hover:text-purple-200" :
                                                containsFiles ? "text-emerald-300 group-hover:text-white" : "text-white"
                                            )}>{folder.name}</span>
                                        </div>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-[#161b22] border-zinc-800 text-white">
                                                    <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => setCurrentPath([...currentPath, folder.name])}>
                                                        <Eye className="w-4 h-4 mr-2" /> Open
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="hover:bg-zinc-800 text-destructive cursor-pointer" onClick={() => setDeleteTarget({ id: folder.id, type: 'folder', name: folder.name })}>
                                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </Card>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-80 bg-[#161b22] border-zinc-800 shadow-2xl p-0 overflow-hidden" align="center" side="bottom" sideOffset={10}>
                                      <div className="bg-zinc-900 border-b border-zinc-800 p-3 flex justify-between items-center">
                                          <div className="flex items-center gap-2">
                                              <Folder className="w-4 h-4 text-emerald-400" />
                                              <span className="font-bold text-white text-sm truncate max-w-[150px]">{folder.name}</span>
                                          </div>
                                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{folderFiles.length} file{folderFiles.length !== 1 ? 's' : ''}</span>
                                      </div>
                                      <div className="max-h-48 overflow-y-auto p-2 scrollbar-none space-y-1">
                                          {folderFiles.length === 0 ? (
                                              <div className="text-xs text-zinc-500 p-4 text-center italic">Folder is empty</div>
                                          ) : (
                                              folderFiles.slice(0, 10).map(ff => (
                                                  <div key={ff.id} className="flex justify-between items-center text-xs p-2 hover:bg-zinc-800/50 rounded transition-colors group">
                                                      <div className="flex items-center gap-2 overflow-hidden">
                                                          <FileText className="w-3 h-3 text-zinc-500 group-hover:text-blue-400 shrink-0" />
                                                          <span className="text-zinc-300 truncate max-w-[160px] group-hover:text-white transition-colors">{ff.name}</span>
                                                      </div>
                                                      <span className="text-[10px] text-zinc-600 shrink-0 pl-2">{new Date(ff.modified).toLocaleDateString()}</span>
                                                  </div>
                                              ))
                                          )}
                                          {folderFiles.length > 10 && (
                                              <div className="text-[10px] text-blue-400 text-center font-bold uppercase tracking-widest p-3 bg-[#0d1117]/50 rounded border border-zinc-800 mt-2">
                                                  + {folderFiles.length - 10} more
                                              </div>
                                          )}
                                      </div>
                                  </HoverCardContent>
                                </HoverCard>
                            ) : (
                                renderListFolder(folder, 0)
                            );
                        })}

                        {/* Render Files */}
                        {currentItems.files.map(file => (
                            viewMode === 'grid' ? (
                                <Card 
                                    key={file.id} 
                                    className="bg-[#0d1117] border-zinc-800 p-5 hover:border-blue-500/50 hover:bg-[#161b22] transition-all group relative shadow-md cursor-pointer"
                                    onClick={() => openViewer(file)}
                                >
                                    <div className="flex flex-col items-center text-center space-y-3">
                                        <div className="absolute top-2 left-2 z-10">
                                            {file.path.includes('System Archives') && (
                                                <div title={fileHasAlert(file) ? "Unread Alert" : "Viewed"}>
                                                    <Bell className={cn("w-4 h-4", fileHasAlert(file) ? "text-yellow-400 drop-shadow-md" : "text-white opacity-50")} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-20 h-20 bg-zinc-800/50 rounded-2xl flex items-center justify-center group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-all duration-300">
                                            {file.type.startsWith('image/') ? (
                                                <img src={file.data} className="w-full h-full object-cover rounded-xl" alt={file.name} />
                                            ) : (
                                                <FileText className="w-10 h-10" />
                                            )}
                                        </div>
                                        <div className="space-y-1 w-full">
                                            <span className="text-xs font-black text-white truncate block w-full">{file.name}</span>
                                            <span className="text-[10px] text-zinc-500 uppercase font-bold">{file.size}</span>
                                        </div>
                                    </div>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800 text-white">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-[#161b22] border-zinc-800 text-white">
                                                <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => openViewer(file)}>
                                                    <Eye className="w-4 h-4 mr-2" /> View
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => printFile(file)}>
                                                    <Printer className="w-4 h-4 mr-2" /> Print
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => downloadFile(file)}>
                                                    <Download className="w-4 h-4 mr-2" /> Download
                                                </DropdownMenuItem>

                                                <DropdownMenuItem className="hover:bg-zinc-800 text-destructive cursor-pointer" onClick={() => setDeleteTarget({ id: file.id, type: 'file', name: file.name })}>
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </Card>
                            ) : (
                                renderListFile(file, 0)
                            )
                        ))}
                    </>
                )}
            </div>

            {/* New Folder Dialog */}
            <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
                <DialogContent className="sm:max-w-[425px] bg-[#0d1117] border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FolderPlus className="w-5 h-5 text-blue-500" />
                            New Folder
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input 
                            placeholder="Folder Name" 
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            autoFocus
                            className="bg-[#161b22] border-zinc-800 focus:ring-blue-500/20"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => setIsNewFolderOpen(false)}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 font-bold" onClick={handleCreateFolder}>Create Folder</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Full-Page Viewer Dialog */}
            <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
                <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] p-0 bg-black/98 border-none outline-none overflow-hidden flex flex-col items-stretch z-[9999]">
                    <div className="absolute top-0 left-0 right-0 z-[100] p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
                        <div className="flex items-center gap-4 text-white">
                            <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={() => setIsViewerOpen(false)}>
                                <X className="w-6 h-6" />
                            </Button>
                            <div className="flex flex-col">
                                <span className="text-sm font-black truncate max-w-[200px] sm:max-w-[400px]">{selectedFile?.name}</span>
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{selectedFile?.type} • {selectedFile?.size}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hidden sm:flex" onClick={() => selectedFile && downloadFile(selectedFile)}>
                                <Download className="w-5 h-5" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-white hover:bg-white/10" 
                                onClick={() => selectedFile?.data && window.open(selectedFile.data, '_blank')}
                                title="Open in New Tab"
                            >
                                <Eye className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hidden sm:flex" onClick={() => window.print()}>
                                <Printer className="w-5 h-5" />
                            </Button>
                            <div className="h-6 w-px bg-white/20 mx-2 hidden sm:block" />
                            <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-0.5 border border-white/5">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-white hover:bg-white/10"
                                    onClick={() => setZoom(prev => Math.max(25, prev - 25))}
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </Button>
                                <span className="text-[10px] font-black text-white w-10 text-center">{zoom}%</span>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-white hover:bg-white/10"
                                    onClick={() => setZoom(prev => Math.min(400, prev + 25))}
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </Button>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-white hover:bg-white/10 hidden sm:flex"
                                onClick={() => setZoom(100)}
                                title="Reset Zoom"
                            >
                                <Maximize2 className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 relative flex items-center justify-center overflow-auto p-4 pt-24 pb-24 sm:pb-32">
                        {selectedFile && (
                            <>
                                {/* Floating Navigation - Only show if there are multiple items of the same category */}
                                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 sm:px-8 pointer-events-none z-50">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn(
                                            "h-14 w-14 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 transition-all pointer-events-auto",
                                            ((selectedFile.type.startsWith('image/') ? currentItems.files.filter(f => f.type.startsWith('image/')) : currentItems.files).findIndex(f => f.id === selectedFile.id) === 0) && "opacity-0 pointer-events-none"
                                        )}
                                        onClick={handlePrev}
                                    >
                                        <ChevronLeft className="w-8 h-8" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn(
                                            "h-14 w-14 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 transition-all pointer-events-auto",
                                            ((selectedFile.type.startsWith('image/') ? currentItems.files.filter(f => f.type.startsWith('image/')) : currentItems.files).findIndex(f => f.id === selectedFile.id) === (selectedFile.type.startsWith('image/') ? currentItems.files.filter(f => f.type.startsWith('image/')) : currentItems.files).length - 1) && "opacity-0 pointer-events-none"
                                        )}
                                        onClick={handleNext}
                                    >
                                        <ChevronRight className="w-8 h-8" />
                                    </Button>
                                </div>

                                <div 
                                    className="w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
                                    style={{ transform: `scale(${zoom / 100})` }}
                                >
                                    {selectedFile.type.startsWith('application/pdf') || selectedFile.name.endsWith('.pdf') ? (
                                        <div className="bg-white shadow-2xl w-full max-w-[850px] aspect-[8.5/11] rounded-sm overflow-hidden border border-white/10">
                                            <iframe src={selectedFile.data} className="w-full h-full border-0" title={selectedFile.name} />
                                        </div>
                                    ) : selectedFile.type.startsWith('image/') ? (
                                        <img 
                                            src={selectedFile.data} 
                                            className="max-w-full max-h-full object-contain shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-sm" 
                                            alt={selectedFile.name} 
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-6 text-white text-center">
                                            <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center animate-pulse">
                                                <FileText className="w-16 h-16 text-zinc-600" />
                                            </div>
                                            <div>
                                                <p className="text-xl font-black mb-2">Preview Unavailable</p>
                                                <p className="text-zinc-500 text-sm max-w-xs">This file type cannot be rendered directly in the browser.</p>
                                            </div>
                                            <Button className="bg-blue-600 hover:bg-blue-700 font-bold px-8" onClick={() => downloadFile(selectedFile)}>
                                                <Download className="w-4 h-4 mr-2" /> Download Document
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Bottom Gallery Strip */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center gap-3 overflow-x-auto z-[100] pb-8 sm:pb-6">
                        {(selectedFile?.type.startsWith('image/') 
                            ? currentItems.files.filter(f => f.type.startsWith('image/'))
                            : currentItems.files
                        ).map(f => (
                            <div 
                                key={f.id}
                                className={cn(
                                    "w-14 h-14 sm:w-16 sm:h-20 rounded-lg border-2 transition-all cursor-pointer overflow-hidden shrink-0 shadow-lg",
                                    selectedFile?.id === f.id ? "border-blue-500 scale-110 ring-4 ring-blue-500/20" : "border-white/10 opacity-40 hover:opacity-100"
                                )}
                                onClick={() => {
                                    setSelectedFile(f);
                                    setZoom(100);
                                }}
                            >
                                {f.type.startsWith('image/') ? (
                                    <img src={f.data} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-zinc-700" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Deletion Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent className="bg-[#0d1117] border-zinc-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            This action cannot be undone. This will permanently delete the {deleteTarget?.type} 
                            <span className="font-bold text-white px-1">"{deleteTarget?.name}"</span> 
                            from your Business Drive.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-800 text-white hover:bg-zinc-700 border-none">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            className="bg-red-600 hover:bg-red-700 text-white border-none font-bold"
                            onClick={() => {
                                if (deleteTarget?.type === 'folder') confirmDeleteFolder(deleteTarget.id);
                                else if (deleteTarget?.type === 'file') confirmDeleteFile(deleteTarget.id);
                            }}
                        >
                            Delete {deleteTarget?.type === 'folder' ? 'Folder' : 'File'}
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
                            This action cannot be undone. All archived files will be permanently deleted from the System Archives.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="button-group-responsive">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                const systemArchiveFiles = files.filter(f => f.path.includes('System Archives'));
                                const allIds = systemArchiveFiles.map(r => r.id);
                                
                                try {
                                    const deletedPdfIds: string[] = JSON.parse(localStorage.getItem('deleted_pdf_ids') || '[]');
                                    allIds.forEach(id => {
                                        if (!deletedPdfIds.includes(id)) deletedPdfIds.push(id);
                                    });
                                    localStorage.setItem('deleted_pdf_ids', JSON.stringify(deletedPdfIds));
                                } catch { }

                                systemArchiveFiles.forEach(r => {
                                    // Parse out potential recordType and recordId
                                    // Assuming old IDs were like: "Invoice_123_170000"
                                    const parts = r.id.split('_');
                                    if (parts.length >= 2) {
                                        dismissAlertsForRecord(parts[0], r.id);
                                        dismissAlertsForRecord(parts[0], parts[1]);
                                    }
                                });

                                const remainingFiles = files.filter(f => !f.path.includes('System Archives'));
                                setFiles(remainingFiles);

                                try {
                                    const { default: localforage } = await import('localforage');
                                    await localforage.setItem('business_drive_files_v3', remainingFiles);
                                } catch (e) {
                                    console.warn("Storage update failed", e);
                                }

                                try {
                                    if (localStorage.getItem("demo_mode_active") !== "true" && allIds.length > 0) {
                                        const { default: supabase } = await import('@/lib/supabase');
                                        await supabase.from('pdf_records').delete().in('id', allIds);
                                    }
                                } catch (e) {
                                    console.warn("Supabase wipe failed:", e);
                                }

                                try { refreshAlerts(); } catch { }

                                setDeleteAllOpen(false);
                                toast({ title: "All Files Deleted", description: "The System Archives have been cleared." });
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
                <DialogContent className="sm:max-w-[720px] bg-[#0d1117] border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Create Admin Update PDF</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-zinc-400">Date/Time</label>
                                <Input value={new Date().toLocaleString()} readOnly className="bg-[#161b22] border-zinc-800" />
                            </div>
                            <div>
                                <label className="text-sm text-zinc-400">Pending Bookings Count</label>
                                <Input value={adminPendingCount} onChange={(e) => setAdminPendingCount(e.target.value)} placeholder="e.g., 5" className="bg-[#161b22] border-zinc-800" />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-zinc-400">Large Notes</label>
                            <textarea className="w-full h-48 p-3 rounded-md border border-zinc-800 bg-[#161b22] focus:ring-blue-500/20" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Write updates, notes, issues…" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-zinc-400">P&L Summary</label>
                                <Input value={adminPnl} onChange={(e) => setAdminPnl(e.target.value)} placeholder="Brief P&L summary" className="bg-[#161b22] border-zinc-800" />
                            </div>
                            <div>
                                <label className="text-sm text-zinc-400">Today's Revenue</label>
                                <Input value={adminRevenue} onChange={(e) => setAdminRevenue(e.target.value)} placeholder="e.g., $1,250" className="bg-[#161b22] border-zinc-800" />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-zinc-400">Alerts Summary</label>
                            <div className="p-3 rounded-md border border-zinc-800 bg-[#161b22] text-sm max-h-40 overflow-y-auto">
                                {(latestAlerts || []).length === 0 ? (
                                    <div className="text-zinc-500">No current alerts.</div>
                                ) : (
                                    <ul className="list-disc ml-5 space-y-1 text-zinc-300">
                                        {latestAlerts
                                            .map((a) => a.title?.trim())
                                            .filter(Boolean)
                                            .map((t, idx) => (<li key={`al-${idx}`}>{t}</li>))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-zinc-400 mb-2 block">Employee Progress</label>
                            <div className="grid grid-cols-1 gap-2">
                                {employeeRows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-4 gap-2 text-sm items-center">
                                        <Input value={row.name} onChange={(e) => setEmployeeRows(r => { const c = [...r]; c[idx] = { ...c[idx], name: e.target.value }; return c; })} className="bg-[#161b22] border-zinc-800" placeholder="Name" />
                                        <Input value={row.training} onChange={(e) => setEmployeeRows(r => { const c = [...r]; c[idx] = { ...c[idx], training: e.target.value }; return c; })} className="bg-[#161b22] border-zinc-800" placeholder="Training %" />
                                        <Input value={row.jobsToday} onChange={(e) => setEmployeeRows(r => { const c = [...r]; c[idx] = { ...c[idx], jobsToday: e.target.value }; return c; })} className="bg-[#161b22] border-zinc-800" placeholder="Jobs Today" />
                                        <Input value={row.hours} onChange={(e) => setEmployeeRows(r => { const c = [...r]; c[idx] = { ...c[idx], hours: e.target.value }; return c; })} className="bg-[#161b22] border-zinc-800" placeholder="Hours" />
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={() => setEmployeeRows([...employeeRows, {name: '', training: '', jobsToday: '', hours: ''}])} className="border-zinc-800 w-full mt-2 text-white">
                                    <Plus className="w-4 h-4 mr-2" /> Add Employee Row
                                </Button>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setAdminModalOpen(false)} className="border-zinc-800 text-zinc-400 hover:text-white">Cancel</Button>
                            <Button className="bg-red-700 hover:bg-red-800 text-white" onClick={() => {
                                try {
                                    try { refreshAlerts(); } catch { }
                                    const doc = new jsPDF();
                                    doc.setTextColor(200, 0, 0);
                                    doc.setFontSize(18);
                                    doc.text("Admin Updates", 20, 20);
                                    doc.setTextColor(0, 0, 0);
                                    doc.setFontSize(11);
                                    doc.text(`Date/Time: ${new Date().toLocaleString()}`, 20, 30);
                                    doc.setFontSize(12);
                                    doc.text("Notes:", 20, 40);
                                    const notes = doc.splitTextToSize(adminNotes || "(none)", 170);
                                    doc.text(notes, 20, 48);
                                    let y = 48 + notes.length * 6 + 6;
                                    doc.text("Alerts:", 20, y);
                                    const alerts = (latestAlerts || []).map(a => (a.title || '').trim()).filter(Boolean).map(t => `• ${t}`);
                                    const alertsText = doc.splitTextToSize(alerts.length ? alerts.join("\n") : "(none)", 170);
                                    y += 8;
                                    doc.text(alertsText, 20, y);
                                    y += alertsText.length * 6 + 6;
                                    doc.text("Employee Progress:", 20, y);
                                    y += 8;
                                    employeeRows.forEach((row) => {
                                        doc.text(`${row.name} — Training ${row.training}% — Jobs Today ${row.jobsToday} — Hours ${row.hours}`, 20, y);
                                        y += 6;
                                    });
                                    y += 4;
                                    doc.text(`P&L: ${adminPnl || '(n/a)'} | Revenue: ${adminRevenue || '(n/a)'} | Pending Bookings: ${adminPendingCount || '(n/a)'}`, 20, y);
                                    const pdfDataUrl = doc.output('dataurlstring');
                                    const fileName = `Admin_Update_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
                                    
                                    // Save via pdfArchive which will push to System Archives
                                    savePDFToArchive('Admin Updates', 'Admin', 'admin_updates', pdfDataUrl, { fileName, path: 'Admin Updates/' });
                                    toast({ title: 'Saved', description: 'Admin Update PDF created.' });
                                    setAdminModalOpen(false);
                                    
                                    // Refresh drive data
                                    handleSync(false);
                                } catch (err: any) {
                                    toast({ title: 'Error', description: err?.message || String(err), variant: 'destructive' });
                                }
                            }}>Save Admin Update</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
