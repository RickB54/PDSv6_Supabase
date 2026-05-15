import React, { useState, useEffect, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Folder, FileText, Plus, Grid, List, MoreVertical, 
    ChevronRight, Upload, Search, Filter, Trash2, Download, Eye, Sparkles, Clock, User, File,
    Maximize2, Minimize2, ZoomIn, ZoomOut, ChevronLeft, X, Printer, Info, FolderPlus, ArrowLeft
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
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/storage-utils";

interface DriveFile {
    id: string;
    name: string;
    type: string;
    size: string;
    modified: string;
    path: string[]; // Array of folder names leading to this file
    data?: string; // base64 or blob URL
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
    { id: '8', name: "My Logos", path: [] }
];

export default function BusinessDrive() {
    const { toast } = useToast();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentPath, setCurrentPath] = useState<string[]>([]); // empty array means root
    const [searchTerm, setSearchTerm] = useState("");
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [folders, setFolders] = useState<DriveFolder[]>(DEFAULT_FOLDERS);
    const [isLoaded, setIsLoaded] = useState(false);
    const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    
    // New Folder State
    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    
    // Persistence & Migration to localforage (IndexedDB) to avoid QuotaExceededError
    useEffect(() => {
        const loadData = async () => {
            try {
                const { default: localforage } = await import('localforage');
                
                // 1. Check localforage first (Primary storage)
                const savedFiles = await localforage.getItem<DriveFile[]>('business_drive_files_v3');
                const savedFolders = await localforage.getItem<DriveFolder[]>('business_drive_folders_v3');

                if (savedFiles) setFiles(savedFiles);
                if (savedFolders) setFolders(savedFolders);
                else setFolders(DEFAULT_FOLDERS);

                // 2. Migration: If empty, try migrating from localStorage (Old storage)
                if (!savedFiles) {
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
                if (!savedFolders || savedFolders.length === 0) {
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
                await localforage.setItem('business_drive_files_v3', files);
                await localforage.setItem('business_drive_folders_v3', folders);
            } catch (err) {
                console.warn("Auto-save failed:", err);
            }
        };
        saveData();
    }, [files, folders, isLoaded]);

    const currentItems = useMemo(() => {
        const filteredFiles = files.filter(f => {
            const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPath = JSON.stringify(f.path) === JSON.stringify(currentPath);
            return matchesSearch && matchesPath;
        });

        const filteredFolders = folders.filter(f => {
            const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPath = JSON.stringify(f.path) === JSON.stringify(currentPath);
            return matchesSearch && matchesPath;
        });

        return { files: filteredFiles, folders: filteredFolders };
    }, [files, folders, currentPath, searchTerm]);

    const openViewer = (file: DriveFile) => {
        setSelectedFile(file);
        setIsViewerOpen(true);
        setZoom(100);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        const filesArray = Array.from(fileList);
        const uploadCount = filesArray.length;
        
        toast({ 
            title: uploadCount > 1 ? `Uploading ${uploadCount} files...` : "Uploading...", 
            description: `Preparing your ${uploadCount > 1 ? 'assets' : 'file'} for secure storage.` 
        });

        for (const file of filesArray) {
            try {
                // Upload to Supabase bucket 'customer-photos'
                const publicUrl = await uploadFile('customer-photos', file, `business-drive/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`);

                const newFile: DriveFile = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    type: file.type,
                    size: (file.size / 1024).toFixed(1) + ' KB',
                    modified: new Date().toLocaleString(),
                    path: [...currentPath],
                    data: publicUrl
                };

                setFiles(prev => [...prev, newFile]);
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

    return (
        <div className="space-y-6 animate-fade-in p-1">
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#0d1117] p-4 rounded-xl border border-zinc-800 shadow-xl">
                <div className="flex items-center gap-3 text-sm text-zinc-400 overflow-hidden">
                    {currentPath.length > 0 && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-zinc-800 text-white" 
                            onClick={handleUpOneLevel}
                            title="Up One Level"
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
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input 
                            placeholder="Search Drive..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-[#161b22] border-zinc-800 w-full md:w-64 focus:ring-blue-500/20"
                        />
                    </div>
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
                            <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => document.getElementById('drive-upload')?.click()}>
                                <Upload className="w-4 h-4 mr-2" /> Upload Files
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <input type="file" id="drive-upload" className="hidden" multiple onChange={handleUpload} />
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
                        {currentItems.folders.map(folder => (
                            viewMode === 'grid' ? (
                                <Card 
                                    key={folder.id}
                                    className="bg-[#0d1117] border-zinc-800 p-5 hover:border-blue-500/50 hover:bg-[#161b22] transition-all cursor-pointer group relative shadow-md"
                                    onClick={() => setCurrentPath([...currentPath, folder.name])}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-zinc-800/50 rounded-xl group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-all duration-300">
                                            <Folder className="w-7 h-7" />
                                        </div>
                                        <span className="font-bold text-white truncate text-sm sm:text-base">{folder.name}</span>
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
                            ) : (
                                <div 
                                    key={folder.id} 
                                    className="flex items-center justify-between p-4 bg-[#0d1117] border border-zinc-800 rounded-xl hover:bg-[#161b22] transition-all group shadow-sm cursor-pointer"
                                    onClick={() => setCurrentPath([...currentPath, folder.name])}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="p-2 bg-zinc-800/50 rounded-lg">
                                            <Folder className="w-5 h-5 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                                        </div>
                                        <span className="text-sm font-bold text-white truncate">{folder.name}</span>
                                    </div>
                                    <div className="flex items-center gap-8 text-xs text-zinc-500" onClick={(e) => e.stopPropagation()}>
                                        <div className="w-40 text-right uppercase tracking-widest font-black text-zinc-600">Folder</div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-zinc-800 text-white">
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
                                </div>
                            )
                        ))}

                        {/* Render Files */}
                        {currentItems.files.map(file => (
                            viewMode === 'grid' ? (
                                <Card 
                                    key={file.id} 
                                    className="bg-[#0d1117] border-zinc-800 p-5 hover:border-blue-500/50 hover:bg-[#161b22] transition-all group relative shadow-md cursor-pointer"
                                    onClick={() => openViewer(file)}
                                >
                                    <div className="flex flex-col items-center text-center space-y-3">
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
                                <div 
                                    key={file.id} 
                                    className="flex items-center justify-between p-4 bg-[#0d1117] border border-zinc-800 rounded-xl hover:bg-[#161b22] transition-all group shadow-sm cursor-pointer"
                                    onClick={() => openViewer(file)}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="p-2 bg-zinc-800/50 rounded-lg">
                                            {file.type.startsWith('image/') ? (
                                                <img src={file.data} className="w-5 h-5 object-cover rounded-sm" alt="" />
                                            ) : (
                                                <FileText className="w-5 h-5 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                                            )}
                                        </div>
                                        <span className="text-sm font-bold text-white truncate">{file.name}</span>
                                    </div>
                                    <div className="flex items-center gap-8 text-xs text-zinc-500" onClick={(e) => e.stopPropagation()}>
                                        <div className="hidden lg:flex items-center gap-2 w-32">
                                            <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] font-black">ME</div>
                                            Me
                                        </div>
                                        <div className="hidden sm:flex items-center gap-2 w-40">
                                            <Clock className="w-3.5 h-3.5" /> {file.modified}
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
        </div>
    );
}
