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
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    
    // New Folder State
    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    
    // Load from local storage
    useEffect(() => {
        const savedFiles = localStorage.getItem('business_drive_files_v2');
        const savedFolders = localStorage.getItem('business_drive_folders_v2');
        if (savedFiles) {
            try { setFiles(JSON.parse(savedFiles)); } catch (e) { }
        }
        if (savedFolders) {
            try { setFolders(JSON.parse(savedFolders)); } catch (e) { }
        }
        setIsInitialLoad(false);
    }, []);

    // Save to local storage
    useEffect(() => {
        if (!isInitialLoad) {
            localStorage.setItem('business_drive_files_v2', JSON.stringify(files));
            localStorage.setItem('business_drive_folders_v2', JSON.stringify(folders));
        }
    }, [files, folders, isInitialLoad]);

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

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const newFile: DriveFile = {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                type: file.type,
                size: (file.size / 1024).toFixed(1) + ' KB',
                modified: new Date().toLocaleString(),
                path: [...currentPath],
                data: event.target?.result as string
            };
            setFiles(prev => [...prev, newFile]);
            toast({
                title: "File Uploaded",
                description: `${file.name} added to ${currentPath.length > 0 ? currentPath[currentPath.length - 1] : "Root"}`
            });
        };
        reader.readAsDataURL(file);
    };

    const [isDeletingFolder, setIsDeletingFolder] = useState<string | null>(null);

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

    const deleteFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
        toast({ title: "File Deleted", variant: "destructive" });
    };

    const confirmDeleteFolder = (id: string) => {
        setFolders(prev => prev.filter(f => f.id !== id));
        setIsDeletingFolder(null);
        toast({ title: "Folder Deleted", variant: "destructive" });
    };

    const downloadFile = (file: DriveFile) => {
        if (!file.data) return;
        const link = document.createElement('a');
        link.href = file.data;
        link.download = file.name;
        link.click();
    };

    const openViewer = (file: DriveFile) => {
        setSelectedFile(file);
        setIsViewerOpen(true);
    };

    const handleUpOneLevel = () => {
        if (currentPath.length > 0) {
            const newPath = [...currentPath];
            newPath.pop();
            setCurrentPath(newPath);
        }
    };

    const handleNext = () => {
        if (!selectedFile) return;
        const currentIndex = currentItems.files.findIndex(f => f.id === selectedFile.id);
        if (currentIndex < currentItems.files.length - 1) {
            setSelectedFile(currentItems.files[currentIndex + 1]);
        }
    };

    const handlePrev = () => {
        if (!selectedFile) return;
        const currentIndex = currentItems.files.findIndex(f => f.id === selectedFile.id);
        if (currentIndex > 0) {
            setSelectedFile(currentItems.files[currentIndex - 1]);
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
                                <Upload className="w-4 h-4 mr-2" /> Upload File
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <input type="file" id="drive-upload" className="hidden" onChange={handleUpload} />
                </div>
            </div>

            {/* Gemini Summary Bar (Aesthetic) */}
            <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/10 to-transparent p-5 rounded-2xl border border-blue-500/20 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="text-base font-black text-white flex items-center gap-2">
                            Ask Gemini
                        </div>
                        <div className="text-sm text-zinc-400">Summarize, analyze, and get up to speed with files in this folder.</div>
                    </div>
                </div>
                <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-xs font-bold uppercase tracking-widest hidden sm:flex">Analyze Folder</Button>
            </div>

            {/* Content Section */}
            <div className={cn(
                viewMode === 'grid' 
                    ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
                    : "space-y-3"
            )}>
                {currentItems.folders.length === 0 && currentItems.files.length === 0 ? (
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
                                                <DropdownMenuItem className="hover:bg-zinc-800 text-destructive cursor-pointer" onClick={() => setIsDeletingFolder(folder.id)}>
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
                                                <DropdownMenuItem className="hover:bg-zinc-800 text-destructive cursor-pointer" onClick={() => setIsDeletingFolder(folder.id)}>
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
                                                <DropdownMenuItem className="hover:bg-zinc-800 text-destructive cursor-pointer" onClick={() => deleteFile(file.id)}>
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
                                                <DropdownMenuItem className="hover:bg-zinc-800 text-destructive cursor-pointer" onClick={() => deleteFile(file.id)}>
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
                <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] p-0 bg-black/95 border-none outline-none overflow-hidden flex flex-col items-stretch">
                    <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
                        <div className="flex items-center gap-4 text-white">
                            <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={() => setIsViewerOpen(false)}>
                                <X className="w-6 h-6" />
                            </Button>
                            <div className="flex flex-col">
                                <span className="text-sm font-black truncate max-w-[300px]">{selectedFile?.name}</span>
                                <span className="text-[10px] text-zinc-400 font-bold uppercase">{selectedFile?.type} • {selectedFile?.size}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hidden sm:flex" onClick={() => selectedFile && downloadFile(selectedFile)}>
                                <Download className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hidden sm:flex" onClick={() => window.print()}>
                                <Printer className="w-5 h-5" />
                            </Button>
                            <div className="h-6 w-px bg-white/20 mx-2" />
                            <div className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10">
                                    <ZoomOut className="w-4 h-4" />
                                </Button>
                                <span className="text-[10px] font-black text-white px-2">100%</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10">
                                    <ZoomIn className="w-4 h-4" />
                                </Button>
                            </div>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                                <Maximize2 className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 relative flex items-center justify-center overflow-auto p-4 pt-20">
                        {selectedFile && (
                            <>
                                {/* Navigation Buttons */}
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute left-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/5 hover:bg-white/20 text-white z-50"
                                    onClick={handlePrev}
                                    disabled={currentItems.files.findIndex(f => f.id === selectedFile.id) === 0}
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute right-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/5 hover:bg-white/20 text-white z-50 rotate-180"
                                    onClick={handleNext}
                                    disabled={currentItems.files.findIndex(f => f.id === selectedFile.id) === currentItems.files.length - 1}
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </Button>

                                <div className="w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-300">
                                    {selectedFile.type.startsWith('application/pdf') || selectedFile.name.endsWith('.pdf') ? (
                                        <div className="bg-white shadow-2xl w-full max-w-[850px] aspect-[8.5/11] rounded-sm overflow-hidden">
                                            <iframe src={selectedFile.data} className="w-full h-full border-0" title={selectedFile.name} />
                                        </div>
                                    ) : selectedFile.type.startsWith('image/') ? (
                                        <img 
                                            src={selectedFile.data} 
                                            className="max-w-full max-h-full object-contain shadow-2xl rounded-sm" 
                                            alt={selectedFile.name} 
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 text-white">
                                            <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center">
                                                <FileText className="w-16 h-16 text-zinc-500" />
                                            </div>
                                            <p className="text-lg font-bold">Preview not available for this file type</p>
                                            <Button className="bg-blue-600" onClick={() => downloadFile(selectedFile)}>
                                                Download {selectedFile.name}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="p-4 bg-black/80 flex items-center justify-center gap-2 overflow-x-auto">
                        {currentItems.files.map(f => (
                            <div 
                                key={f.id}
                                className={cn(
                                    "w-12 h-16 rounded border-2 transition-all cursor-pointer overflow-hidden shrink-0",
                                    selectedFile?.id === f.id ? "border-blue-500 scale-110" : "border-transparent opacity-50 hover:opacity-100"
                                )}
                                onClick={() => setSelectedFile(f)}
                            >
                                {f.type.startsWith('image/') ? (
                                    <img src={f.data} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-zinc-600" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Folder Deletion Confirmation */}
            <AlertDialog open={!!isDeletingFolder} onOpenChange={(open) => !open && setIsDeletingFolder(null)}>
                <AlertDialogContent className="bg-[#0d1117] border-zinc-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            This action cannot be undone. This will permanently delete the folder
                            and all of its contents from your Business Drive.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-800 text-white hover:bg-zinc-700 border-none">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            className="bg-red-600 hover:bg-red-700 text-white border-none"
                            onClick={() => isDeletingFolder && confirmDeleteFolder(isDeletingFolder)}
                        >
                            Delete Folder
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
