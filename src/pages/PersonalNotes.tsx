import { useEffect, useState, useMemo } from "react";
import { useNotesStore, Note, Notebook, Section } from "@/store/notes";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus, Search, Trash2, Folder, Inbox, Briefcase, User, Menu, ArrowLeft,
    MoreVertical, FileText, Lock, Unlock, Star, Tag, ChevronRight, ChevronDown, Edit2, Image as ImageIcon, X, Maximize2,
    ChevronLeft, Link as LinkIcon, ArrowRight
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
    DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supa-data";
import { compressImageForUpload } from "@/lib/image-compression";
import { VoiceInput } from "@/components/VoiceInput";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

export default function PersonalNotes() {
    // Store
    const store = useNotesStore();

    // Local UI State
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [createNotebookOpen, setCreateNotebookOpen] = useState(false);
    const [newNotebookName, setNewNotebookName] = useState("");
    const [createSectionOpen, setCreateSectionOpen] = useState(false);
    const [newSectionName, setNewSectionName] = useState("");
    const [targetNotebookId, setTargetNotebookId] = useState<string | null>(null);
    const [unlockOpen, setUnlockOpen] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [noteImages, setNoteImages] = useState<string[]>([]);
    const [mobileView, setMobileView] = useState<'folders' | 'notes' | 'editor'>('folders');
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [hoveredImage, setHoveredImage] = useState<string | null>(null);
    // Rename & Delete State
    const [renameOpen, setRenameOpen] = useState(false);
    const [renameData, setRenameData] = useState<{ type: 'notebook' | 'section', id: string, name: string } | null>(null);

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'notebook' | 'section' | 'note', id: string, name: string } | null>(null);

    // Initialize
    useEffect(() => {
        store.refresh();
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Filter Logic
    const filteredNotes = useMemo(() => {
        let list = store.notes;

        // 1. Search (Global across all notes)
        if (store.searchQuery) {
            const q = store.searchQuery.toLowerCase();
            list = list.filter(n =>
                n.title.toLowerCase().includes(q) ||
                n.content?.toLowerCase().includes(q) ||
                n.tags?.some(t => t.toLowerCase().includes(q))
            );
        } else {
            // 2. Hierarchy Filter (OneNote-style: Notebook > Section > Pages)
            if (store.activeSectionId === 'quick-notes') {
                // Quick Notes: only show notes without a section
                list = list.filter(n => !n.section_id);
            } else if (store.activeSectionId) {
                // Specific section selected: only show notes in that section
                list = list.filter(n => n.section_id === store.activeSectionId);
            } else if (store.activeNotebookId) {
                // Notebook selected but no section: show ALL notes from ALL sections in this notebook
                const sectionIds = store.sections
                    .filter(s => s.notebook_id === store.activeNotebookId)
                    .map(s => s.id);
                list = list.filter(n => n.section_id && sectionIds.includes(n.section_id));
            } else {
                // No notebook or section selected: default to Quick Notes
                list = list.filter(n => !n.section_id);
            }
        }

        // 3. Sort (Pinned first, then by last updated)
        return list.sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
    }, [store.notes, store.searchQuery, store.activeNotebookId, store.activeSectionId, store.sections]);

    const activeNote = useMemo(() => store.notes.find(n => n.id === store.activeNoteId), [store.notes, store.activeNoteId]);

    // Extract images from note content
    useEffect(() => {
        if (!activeNote?.content) {
            setNoteImages([]);
            return;
        }
        const imageRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/g;
        const matches = [...activeNote.content.matchAll(imageRegex)];
        const urls = matches.map(m => m[1]);
        setNoteImages(urls);
    }, [activeNote?.content]);

    // Handlers
    const handleCreateNotebook = async () => {
        if (!newNotebookName.trim()) return;
        await store.createNotebook(newNotebookName);
        setNewNotebookName("");
        setCreateNotebookOpen(false);
    };

    const handleCreateSection = async () => {
        if (!newSectionName.trim() || !targetNotebookId) return;
        await store.createSection(targetNotebookId, newSectionName);
        setNewSectionName("");
        setTargetNotebookId(null);
        setCreateSectionOpen(false);
    };

    const handleCreateNote = async () => {
        const id = await store.createNote(store.activeSectionId === 'quick-notes' ? null : store.activeSectionId);
        if (isMobile) setMobileView('editor');
    };

    const handleRenameSave = async () => {
        if (!renameData || !renameData.name.trim()) return;
        if (renameData.type === 'notebook') await store.updateNotebook(renameData.id, renameData.name);
        if (renameData.type === 'section') await store.updateSection(renameData.id, renameData.name);
        setRenameOpen(false);
        setRenameData(null);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        if (deleteTarget.type === 'notebook') await store.deleteNotebook(deleteTarget.id);
        if (deleteTarget.type === 'section') await store.deleteSection(deleteTarget.id);
        if (deleteTarget.type === 'note') await store.deleteNote(deleteTarget.id);
        setConfirmDeleteOpen(false);
        setDeleteTarget(null);
    };

    const requestDelete = (type: 'notebook' | 'section' | 'note', id: string, name: string) => {
        setDeleteTarget({ type, id, name });
        setConfirmDeleteOpen(true);
    };

    const toggleLock = async () => {
        if (!activeNote) return;
        if (activeNote.is_locked) {
            // Unlock: In a real app we'd ask for password. 
            // Here we just toggle for "Authorized" user (RLS handles fetch access, client toggles view state?)
            // Actually, if it's locked in DB, we shouldn't have content?
            // For MVP, "Lock" just creates a visual gate.
            // setUnlockOpen(true); 
            await store.updateNote(activeNote.id, { is_locked: false });
        } else {
            await store.updateNote(activeNote.id, { is_locked: true });
        }
    };

    const addTag = (tag: string) => {
        if (!activeNote) return;
        const current = activeNote.tags || [];
        if (!current.includes(tag)) {
            store.updateNote(activeNote.id, { tags: [...current, tag] });
        }
    };

    const handleDeleteImage = async (urlToDelete: string) => {
        if (!activeNote) return;
        const imageRegex = new RegExp(`!\\[.*?\\]\\(${urlToDelete.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
        const updatedContent = activeNote.content.replace(imageRegex, '');
        await store.updateNote(activeNote.id, { content: updatedContent });
        toast.success("Image removed from note");
    };

    const getCleanContent = (content: string) => {
        if (!content) return '';
        // Find the start of the first image markdown
        const splitIndex = content.search(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
        if (splitIndex === -1) return content;
        // Everything before the first image is considered the editable text
        return content.substring(0, splitIndex);
    };

    const handleTextChange = (newText: string) => {
        if (!activeNote) return;
        // Find where the images start in the existing content
        const splitIndex = activeNote.content.search(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
        if (splitIndex === -1) {
            // No images, just update text
            store.updateNote(activeNote.id, { content: newText });
        } else {
            // Preserve the images part exactly as it is (including its preceding whitespace)
            const imagesPart = activeNote.content.substring(splitIndex);
            store.updateNote(activeNote.id, { content: newText + imagesPart });
        }
    };

    const navigateLightbox = (direction: 'next' | 'prev') => {
        if (lightboxIndex === null) return;
        if (direction === 'next') {
            setLightboxIndex((lightboxIndex + 1) % noteImages.length);
        } else {
            setLightboxIndex((lightboxIndex - 1 + noteImages.length) % noteImages.length);
        }
    };

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!activeNote || !e.target.files) return;
        setUploadingImage(true);

        try {
            const files = Array.from(e.target.files);
            const uploadPromises = files.map(async (file) => {
                // Compress image using centralized utility
                const compressed = await compressImageForUpload(file);

                // Upload to Supabase Storage
                const fileName = `notes/${activeNote.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name}`;
                const { data, error } = await supabase.storage
                    .from('note-images')
                    .upload(fileName, compressed);

                if (error) throw error;

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('note-images')
                    .getPublicUrl(fileName);

                return publicUrl;
            });

            const uploadedUrls = await Promise.all(uploadPromises);

            // Add image URLs to note content
            const currentContent = activeNote.content || '';
            const imageMarkdown = uploadedUrls.map(url => `![Image](${url})`).join('\n');
            await store.updateNote(activeNote.id, {
                content: (activeNote.content ? activeNote.content + '\n' : '') + imageMarkdown
            });
            toast.success("Image uploaded successfully!");
        } catch (error: any) {
            console.error('Image upload failed:', error);
            if (error.message?.includes('Bucket not found')) {
                toast.error("Storage bucket 'note-images' not found. Please contact admin to set it up.");
            } else {
                toast.error('Failed to upload image: ' + (error.message || 'Unknown error'));
            }
        } finally {
            setUploadingImage(false);
            if (e.target) e.target.value = '';
        }
    }

    return (
        <div className="h-screen flex flex-col bg-zinc-950 text-foreground overflow-hidden">
            <div className="shrink-0">
                <PageHeader title="Personal Notes" />
            </div>

            <div className="flex-1 overflow-hidden relative">
                {isMobile ? (
                    /* MOBILE LAYERED VIEW */
                    <div className="h-full w-full relative">
                        {/* 1. Folders View */}
                        <div className={`absolute inset-0 transition-transform duration-300 ${mobileView === 'folders' ? 'translate-x-0' : '-translate-x-full'}`}>
                            <div className="h-full flex flex-col">
                                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                                    <span className="font-bold text-zinc-100 italic tracking-wider">PROJECT NOTEBOOKS</span>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-zinc-800" onClick={() => setCreateNotebookOpen(true)}>
                                        <Plus className="w-5 h-5 text-blue-400" />
                                    </Button>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-3 space-y-2">
                                        <div
                                            className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border
                                                ${store.activeSectionId === 'quick-notes' ? 'bg-blue-600/20 border-blue-500/50 text-white' : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'}
                                            `}
                                            onClick={() => { store.setActiveSection('quick-notes'); store.setActiveNotebook(null); setMobileView('notes'); }}
                                        >
                                            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                <Inbox className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-sm">Quick Notes</div>
                                                <div className="text-[10px] text-zinc-500 uppercase tracking-tighter">Initial Thoughts & Ideas</div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                                        </div>

                                        {store.notebooks.map(nb => (
                                            <div key={nb.id} className="space-y-1">
                                                <div
                                                    className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border group
                                                        ${store.activeNotebookId === nb.id ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-zinc-900/20 border-zinc-900 text-zinc-500'}
                                                    `}
                                                    onClick={() => store.setActiveNotebook(nb.id === store.activeNotebookId ? null : nb.id)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${store.activeNotebookId === nb.id ? 'bg-zinc-700' : 'bg-zinc-900'}`}>
                                                            {store.activeNotebookId === nb.id ? <ChevronDown className="w-4 h-4 text-zinc-300" /> : <Folder className="w-5 h-5 text-zinc-600" />}
                                                        </div>
                                                        <span className="font-bold text-sm tracking-tight">{nb.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-600" onClick={(e) => { e.stopPropagation(); setTargetNotebookId(nb.id); setCreateSectionOpen(true); }}>
                                                            <Plus className="w-4 h-4" />
                                                        </Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-600" onClick={(e) => e.stopPropagation()}>
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => { setRenameData({ type: 'notebook', id: nb.id, name: nb.name }); setRenameOpen(true); }}>
                                                                    <Edit2 className="w-4 h-4 mr-2" /> Rename
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-red-500" onClick={() => requestDelete('notebook', nb.id, nb.name)}>
                                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>

                                                {store.activeNotebookId === nb.id && (
                                                    <div className="ml-6 space-y-1 mt-1">
                                                        {store.sections.filter(s => s.notebook_id === nb.id).map(sec => (
                                                            <div
                                                                key={sec.id}
                                                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border
                                                                    ${store.activeSectionId === sec.id ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-transparent border-transparent text-zinc-500'}
                                                                `}
                                                                onClick={() => { store.setActiveSection(sec.id); setMobileView('notes'); }}
                                                            >
                                                                <span className="text-sm font-semibold">{sec.name}</span>
                                                                <ChevronRight className="w-4 h-4 opacity-50" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>

                        {/* 2. Notes List View */}
                        <div className={`absolute inset-0 bg-zinc-950 transition-transform duration-300 z-10 ${mobileView === 'notes' ? 'translate-x-0' : 'translate-x-full'}`}>
                            <div className="h-full flex flex-col">
                                <div className="p-3 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900/50">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-zinc-800" onClick={() => setMobileView('folders')}>
                                        <ArrowLeft className="w-5 h-5" />
                                    </Button>
                                    <div className="flex-1">
                                        <h2 className="text-sm font-bold text-white">
                                            {store.activeSectionId === 'quick-notes' ? 'Quick Notes' : (store.sections.find(s => s.id === store.activeSectionId)?.name || 'Notes')}
                                        </h2>
                                    </div>
                                    <Button size="sm" className="bg-blue-600 h-8 font-bold rounded-lg" onClick={handleCreateNote}>
                                        <Plus className="w-4 h-4 mr-1" /> New
                                    </Button>
                                </div>
                                <div className="p-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                                        <Input
                                            placeholder="Search notes..."
                                            className="pl-10 pr-10 bg-zinc-900/50 border-zinc-800 h-10 rounded-xl"
                                            value={store.searchQuery}
                                            onChange={(e) => store.setSearch(e.target.value)}
                                        />
                                        {store.searchQuery && (
                                            <button 
                                                onClick={() => store.setSearch('')}
                                                className="absolute right-3 top-2.5 text-zinc-500 hover:text-white transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-3 space-y-3">
                                        {filteredNotes.map(note => (
                                            <div
                                                key={note.id}
                                                onClick={() => { store.setActiveNote(note.id); setMobileView('editor'); }}
                                                className={`p-4 rounded-xl border bg-zinc-900/40 relative active:scale-[0.98] transition-all
                                                    ${store.activeNoteId === note.id ? 'border-blue-500/50 bg-blue-500/5' : 'border-zinc-800/50'}
                                                `}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-bold text-base text-zinc-200 truncate pr-8">
                                                        {note.title || 'Untitled'}
                                                    </span>
                                                    <div className="flex gap-1">
                                                        {note.is_pinned && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                                                        {note.is_locked && <Lock className="w-3.5 h-3.5 text-red-500" />}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-zinc-500 line-clamp-2 h-8">
                                                    {note.is_locked ? '🔒 Content Protected' : (note.content || 'Add some notes...')}
                                                </p>
                                                <div className="mt-3 flex items-center justify-between">
                                                    <div className="flex gap-1">
                                                        {note.tags?.slice(0, 2).map(t => (
                                                            <Badge key={t} className="bg-zinc-800 text-[10px] h-5 py-0 px-2 font-normal text-zinc-400 border-none">#{t}</Badge>
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] font-mono text-zinc-600">{new Date(note.updated_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredNotes.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                                <FileText className="w-20 h-20 mb-4" />
                                                <p className="text-lg font-bold">No notes found</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>

                        {/* 3. Editor View */}
                        <div className={`absolute inset-0 bg-zinc-950 transition-all duration-300 z-20 ${mobileView === 'editor' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
                            {activeNote && (
                                <div className="h-full flex flex-col">
                                    <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80 backdrop-blur-xl">
                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-zinc-800" onClick={() => setMobileView('notes')}>
                                            <ArrowLeft className="w-6 h-6" />
                                        </Button>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => store.updateNote(activeNote.id, { is_pinned: !activeNote.is_pinned })}>
                                                <Star className={`w-5 h-5 ${activeNote.is_pinned ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-500'}`} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="rounded-full" onClick={toggleLock}>
                                                {activeNote.is_locked ? <Lock className="w-5 h-5 text-red-500" /> : <Unlock className="w-5 h-5 text-zinc-500" />}
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="rounded-full">
                                                        <MoreVertical className="w-5 h-5 text-zinc-500" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem className="text-red-500" onClick={() => { requestDelete('note', activeNote.id, activeNote.title); setMobileView('notes'); }}>
                                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <ScrollArea className="flex-1">
                                        <div className="p-6 space-y-6">
                                            <textarea
                                                className="w-full bg-transparent border-none text-3xl font-black placeholder:text-zinc-800 focus:outline-none text-white tracking-tight resize-none"
                                                placeholder="Note Title"
                                                value={activeNote.title}
                                                rows={1}
                                                onChange={(e) => {
                                                    store.updateNote(activeNote.id, { title: e.target.value });
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                }}
                                                ref={(el) => {
                                                    if (el) {
                                                        el.style.height = 'auto';
                                                        el.style.height = el.scrollHeight + 'px';
                                                    }
                                                }}
                                            />

                                            <div className="flex flex-wrap items-center gap-2">
                                                {activeNote.tags?.map(tag => (
                                                    <Badge key={tag} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 flex items-center gap-1 group">
                                                        {tag}
                                                        <X className="w-3 h-3 opacity-50 hover:opacity-100 cursor-pointer" onClick={() => store.updateNote(activeNote.id, { tags: activeNote.tags.filter(t => t !== tag) })} />
                                                    </Badge>
                                                ))}
                                                <input
                                                    className="bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1 text-xs w-24 focus:outline-none focus:border-blue-500"
                                                    placeholder="+ tag"
                                                    value={tagInput}
                                                    onChange={(e) => setTagInput(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' && tagInput.trim()) { addTag(tagInput.trim()); setTagInput(""); } }}
                                                />
                                            </div>

                                            {/* Mobile Image Gallery Section */}
                                            {noteImages.length > 0 && (
                                                <div className="space-y-4">
                                                    <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                                                        <ImageIcon className="w-3 h-3" /> Captured Images
                                                    </h3>
                                                    <div className="grid grid-cols-2 gap-3 pb-2 overflow-x-auto">
                                                        {noteImages.map((url, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl active:scale-95 transition-transform"
                                                                onClick={() => setLightboxIndex(idx)}
                                                            >
                                                                <img src={url} alt="Note asset" className="w-full h-full object-cover" />
                                                                {/* Small X button in top-right corner always visible on mobile */}
                                                                <button
                                                                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-500/90 hover:bg-red-500 text-white flex items-center justify-center shadow-lg border border-white/20 z-10"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (window.confirm('Delete this image?')) {
                                                                            handleDeleteImage(url);
                                                                        }
                                                                    }}
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {activeNote.is_locked ? (
                                                <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/50">
                                                    <Lock className="w-12 h-12 text-zinc-700 mb-4" />
                                                    <p className="text-zinc-500 font-bold mb-6">Encrypted Content</p>
                                                    <Button onClick={toggleLock} className="bg-blue-600 rounded-xl px-10">Decrypt Note</Button>
                                                </div>
                                            ) : (
                                                <Textarea
                                                    className="w-full min-h-[400px] bg-transparent border-none text-lg leading-relaxed text-zinc-300 p-0 focus-visible:ring-0 placeholder:text-zinc-800"
                                                    placeholder="Express your thoughts here..."
                                                    value={getCleanContent(activeNote.content)}
                                                    onChange={(e) => handleTextChange(e.target.value)}
                                                />
                                            )}
                                        </div>
                                    </ScrollArea>

                                    {/* Mobile Toolbar - Fixed at Bottom */}
                                    <div className="shrink-0 p-4 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-xl flex items-center gap-3">
                                        <Button
                                            className="h-12 w-12 rounded-2xl bg-blue-600 hover:bg-blue-500 p-0 relative shrink-0"
                                            onClick={() => document.getElementById('note-image-upload-mobile')?.click()}
                                            disabled={uploadingImage}
                                        >
                                            <ImageIcon className={`w-6 h-6 ${uploadingImage ? 'animate-pulse' : ''} text-white`} />
                                            <input id="note-image-upload-mobile" type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleImageUpload} />
                                        </Button>

                                        <VoiceInput
                                            onTranscript={(text) => {
                                                if (activeNote) {
                                                    // Get current clean text content (without images)
                                                    const currentText = getCleanContent(activeNote.content);
                                                    // Append new voice text with proper spacing
                                                    const newText = currentText ? `${currentText} ${text}` : text;
                                                    handleTextChange(newText);
                                                }
                                            }}
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* DESKTOP RESIZABLE VIEW */
                    <ResizablePanelGroup direction="horizontal" className="h-full">
                        {/* 1. Notebooks & Sections Sidebar */}
                        <ResizablePanel defaultSize={20} minSize={15} className="bg-zinc-950 border-r border-zinc-900 flex flex-col overflow-hidden min-w-0">
                            <div className="p-5 border-b border-zinc-900 bg-zinc-900/20">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Notebooks</span>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md hover:bg-zinc-800" onClick={() => setCreateNotebookOpen(true)}>
                                        <Plus className="w-4 h-4 text-zinc-400" />
                                    </Button>
                                </div>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-3 space-y-1">
                                    <div
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                                            ${store.activeSectionId === 'quick-notes' ? 'bg-blue-600/10 text-blue-400' : 'text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300'}
                                        `}
                                        onClick={() => { store.setActiveSection('quick-notes'); store.setActiveNotebook(null); }}
                                    >
                                        <Inbox className="w-4 h-4" />
                                        <span className="font-bold text-sm tracking-tight">Quick Notes</span>
                                    </div>

                                    {store.notebooks.map(nb => (
                                        <div key={nb.id} className="space-y-0.5">
                                            <div
                                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer group transition-all
                                                    ${store.activeNotebookId === nb.id ? 'bg-zinc-900 text-zinc-200 shadow-sm' : 'text-zinc-600 hover:bg-zinc-900/30 hover:text-zinc-400'}
                                                `}
                                                onClick={() => store.setActiveNotebook(nb.id === store.activeNotebookId ? null : nb.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {store.activeNotebookId === nb.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                    <span className="font-bold text-sm tracking-tight truncate max-w-[150px]">{nb.name}</span>
                                                </div>
                                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-zinc-800" onClick={(e) => { e.stopPropagation(); setTargetNotebookId(nb.id); setCreateSectionOpen(true); }}>
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-zinc-800" onClick={(e) => e.stopPropagation()}>
                                                                <MoreVertical className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="start">
                                                            <DropdownMenuItem onClick={() => { setRenameData({ type: 'notebook', id: nb.id, name: nb.name }); setRenameOpen(true); }}>
                                                                <Edit2 className="w-4 h-4 mr-2" /> Rename
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-500" onClick={() => requestDelete('notebook', nb.id, nb.name)}>
                                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>

                                            {store.activeNotebookId === nb.id && (
                                                <div className="ml-6 border-l border-zinc-900 pl-3 py-1 space-y-0.5">
                                                    {store.sections.filter(s => s.notebook_id === nb.id).map(sec => (
                                                        <div
                                                            key={sec.id}
                                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer group transition-all
                                                                ${store.activeSectionId === sec.id ? 'bg-blue-600/5 text-blue-400' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/20'}
                                                            `}
                                                            onClick={() => store.setActiveSection(sec.id)}
                                                        >
                                                            <span className="text-xs font-bold tracking-tight">{sec.name}</span>
                                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button size="icon" variant="ghost" className="h-5 w-5 rounded-md text-zinc-600 hover:text-zinc-300" onClick={(e) => { e.stopPropagation(); setRenameData({ type: 'section', id: sec.id, name: sec.name }); setRenameOpen(true); }}>
                                                                    <Edit2 className="w-3 h-3" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" className="h-5 w-5 rounded-md text-zinc-600 hover:text-red-500" onClick={(e) => { e.stopPropagation(); requestDelete('section', sec.id, sec.name); }}>
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </ResizablePanel>

                        <ResizableHandle withHandle className="bg-transparent w-2 -mx-1" />

                        {/* 2. Notes List Panel */}
                        <ResizablePanel defaultSize={25} minSize={20} className="bg-zinc-950/20 border-r border-zinc-900 flex flex-col overflow-hidden min-w-0">
                            <div className="p-5 border-b border-zinc-900 space-y-3 bg-zinc-900/10">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest truncate flex-1">
                                        {store.activeSectionId === 'quick-notes' ? 'Quick Notes' : 'Page List'}
                                    </h2>
                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg h-7 px-3 shrink-0 ml-2" onClick={handleCreateNote}>
                                        <Plus className="w-3.5 h-3.5 mr-1" /> New
                                    </Button>
                                </div>
                                <div className="relative group">
                                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                                    <Input
                                        placeholder="Fast search..."
                                        className="pl-9 pr-10 h-9 bg-zinc-900 border-zinc-800 rounded-xl text-xs placeholder:text-zinc-700"
                                        value={store.searchQuery}
                                        onChange={(e) => store.setSearch(e.target.value)}
                                    />
                                    {store.searchQuery && (
                                        <button 
                                            onClick={() => store.setSearch('')}
                                            className="absolute right-3 top-2.5 text-zinc-600 hover:text-white transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-3 space-y-2">
                                    {filteredNotes.map(note => (
                                        <div
                                            key={note.id}
                                            onClick={() => store.setActiveNote(note.id)}
                                            className={`p-4 cursor-pointer rounded-2xl border transition-all duration-200 group relative
                                                ${store.activeNoteId === note.id ? 'bg-zinc-900 border-blue-500/30 ring-1 ring-blue-500/20' : 'bg-transparent border-transparent hover:bg-zinc-900/40'}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`font-bold text-sm truncate flex-1 tracking-tight break-words overflow-hidden ${store.activeNoteId === note.id ? 'text-white' : 'text-zinc-300'}`}>
                                                    {note.title || 'Untitled Draft'}
                                                </span>
                                                <div className="flex gap-1 h-4">
                                                    {note.is_pinned && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                                                    {note.is_locked && <Lock className="w-3 h-3 text-red-500" />}
                                                </div>
                                            </div>
                                            <div className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed mb-3 break-words overflow-hidden">
                                                {note.is_locked ? 'Sensitive content is encrypted for privacy.' : (getCleanContent(note.content) || 'Write something inspiring...')}
                                            </div>
                                            <div className="flex items-center justify-between border-t border-zinc-900 pt-3">
                                                <div className="flex gap-1 overflow-hidden">
                                                    {note.tags?.slice(0, 2).map(t => (
                                                        <span key={t} className="text-[9px] px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-bold text-zinc-500 uppercase tracking-tighter">#{t}</span>
                                                    ))}
                                                </div>
                                                <span className="text-[9px] text-zinc-700 font-mono italic">{new Date(note.updated_at).toLocaleDateString()}</span>
                                            </div>
                                            {store.activeNoteId === note.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />}
                                        </div>
                                    ))}
                                    {filteredNotes.length === 0 && (
                                        <div className="py-20 text-center space-y-3 opacity-20">
                                            <FileText className="w-12 h-12 mx-auto" />
                                            <p className="text-sm font-bold">No results found</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </ResizablePanel>

                        <ResizableHandle withHandle className="bg-transparent w-2 -mx-1" />

                        {/* 3. Editor Panel */}
                        <ResizablePanel defaultSize={55} className="bg-zinc-950 flex flex-col overflow-hidden min-w-0">
                            {activeNote ? (
                                <div className="h-full flex flex-col">
                                    <div className="h-16 border-b border-zinc-900 flex items-center px-6 justify-between bg-zinc-900/5">
                                        <div className="flex items-center gap-4 text-xs">
                                            <div className="flex flex-col">
                                                <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Status</span>
                                                <span className="text-green-500 font-bold">Autosaved</span>
                                            </div>
                                            <div className="w-[1px] h-6 bg-zinc-900" />
                                            <div className="flex flex-col">
                                                <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Last Synced</span>
                                                <span className="text-zinc-300">{new Date(activeNote.updated_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center px-1 py-1 rounded-xl bg-zinc-900/50 border border-zinc-800 mr-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg"
                                                    disabled={uploadingImage}
                                                    onClick={() => document.getElementById('note-image-upload-desktop')?.click()}
                                                >
                                                    <ImageIcon className={`w-4 h-4 ${uploadingImage ? 'text-blue-500 animate-pulse' : 'text-zinc-400'}`} />
                                                    <input id="note-image-upload-desktop" type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                                                </Button>
                                                <VoiceInput
                                                    onTranscript={(text) => {
                                                        if (activeNote) {
                                                            // Get current clean text content (without images)
                                                            const currentText = getCleanContent(activeNote.content);
                                                            // Append new voice text with proper spacing
                                                            const newText = currentText ? `${currentText} ${text}` : text;
                                                            handleTextChange(newText);
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-zinc-900" onClick={() => store.updateNote(activeNote.id, { is_pinned: !activeNote.is_pinned })}>
                                                <Star className={`w-4 h-4 ${activeNote.is_pinned ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-600'}`} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-zinc-900" onClick={toggleLock}>
                                                {activeNote.is_locked ? <Lock className="w-4 h-4 text-red-500" /> : <Unlock className="w-4 h-4 text-zinc-600" />}
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-zinc-900">
                                                        <MoreVertical className="w-4 h-4 text-zinc-600" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem className="text-red-500" onClick={() => requestDelete('note', activeNote.id, activeNote.title)}>
                                                        <Trash2 className="w-4 h-4 mr-2" /> Delete Entry
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <ScrollArea className="flex-1">
                                        <div className="p-12 max-w-4xl mx-auto w-full space-y-10">
                                            <textarea
                                                className="w-full bg-transparent border-none text-6xl font-black placeholder:text-zinc-900 focus:outline-none text-white tracking-tighter resize-none"
                                                placeholder="Enter Title..."
                                                value={activeNote.title}
                                                rows={1}
                                                onChange={(e) => {
                                                    store.updateNote(activeNote.id, { title: e.target.value });
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                }}
                                                ref={(el) => {
                                                    if (el) {
                                                        el.style.height = 'auto';
                                                        el.style.height = el.scrollHeight + 'px';
                                                    }
                                                }}
                                            />

                                            <div className="flex flex-wrap items-center gap-3">
                                                {activeNote.tags?.map(tag => (
                                                    <Badge key={tag} className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group">
                                                        {tag}
                                                        <X className="w-3 h-3 text-red-500 opacity-0 group-hover:opacity-100 cursor-pointer" onClick={() => store.updateNote(activeNote.id, { tags: activeNote.tags.filter(t => t !== tag) })} />
                                                    </Badge>
                                                ))}
                                                <div className="flex items-center gap-2 bg-zinc-900/40 rounded-full px-4 border border-zinc-900 focus-within:border-blue-500/50 transition-all">
                                                    <Tag className="w-3 h-3 text-zinc-600" />
                                                    <input
                                                        className="bg-transparent border-none text-[10px] w-32 focus:outline-none text-zinc-200 py-2 font-bold uppercase tracking-widest"
                                                        placeholder="Add Classification..."
                                                        value={tagInput}
                                                        onChange={(e) => setTagInput(e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter' && tagInput.trim()) { addTag(tagInput.trim()); setTagInput(""); } }}
                                                    />
                                                </div>
                                            </div>

                                            {/* PC Image Section */}
                                            {noteImages.length > 0 && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-[1px] flex-1 bg-zinc-900" />
                                                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Visual Assets</span>
                                                        <div className="h-[1px] flex-1 bg-zinc-900" />
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-6">
                                                        {noteImages.map((url, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="relative aspect-video rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 group cursor-zoom-in hover:border-blue-500/50 transition-all shadow-xl"
                                                                onClick={() => setLightboxIndex(idx)}
                                                                onMouseEnter={() => setHoveredImage(url)}
                                                                onMouseLeave={() => setHoveredImage(null)}
                                                            >
                                                                <img src={url} alt="Note asset" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                                    <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                                                                        <Maximize2 className="w-6 h-6 text-white" />
                                                                    </div>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-12 w-12 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all active:scale-95"
                                                                        onClick={(e) => { 
                                                                            e.stopPropagation(); 
                                                                            if (window.confirm('Are you sure you want to delete this image?')) {
                                                                                handleDeleteImage(url); 
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </Button>
                                                                </div>
                                                                {hoveredImage === url && (
                                                                    <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-xl p-3 rounded-2xl text-[10px] text-zinc-400 break-all border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className="font-black text-zinc-200 uppercase tracking-widest text-[8px]">Asset Metadata</span>
                                                                            <LinkIcon className="w-3 h-3 text-blue-400" />
                                                                        </div>
                                                                        {url}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {activeNote.is_locked ? (
                                                <div className="h-[400px] flex flex-col items-center justify-center bg-zinc-900/20 border-4 border-zinc-900 border-dotted rounded-[4rem]">
                                                    <div className="h-24 w-24 rounded-full bg-zinc-900 flex items-center justify-center mb-8">
                                                        <Lock className="w-10 h-10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]" />
                                                    </div>
                                                    <h3 className="text-2xl font-black text-white mb-2">Vault Locked</h3>
                                                    <p className="text-zinc-600 font-bold mb-10 tracking-tight">This entry is protected with end-to-end encryption.</p>
                                                    <Button onClick={toggleLock} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-12 py-6 rounded-3xl text-lg shadow-xl shadow-blue-500/10">Access Data</Button>
                                                </div>
                                            ) : (
                                                <Textarea
                                                    className="w-full min-h-[600px] bg-transparent border-none text-xl leading-relaxed text-zinc-400 p-0 focus-visible:ring-0 placeholder:text-zinc-900 font-medium"
                                                    placeholder="Start drafting your next big thing..."
                                                    value={getCleanContent(activeNote.content)}
                                                    onChange={(e) => handleTextChange(e.target.value)}
                                                />
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center bg-zinc-950/40">
                                    <div className="relative mb-10">
                                        <div className="absolute -inset-10 bg-blue-500/5 blur-[100px] rounded-full" />
                                        <FileText className="w-32 h-32 text-zinc-900 relative" />
                                    </div>
                                    <h3 className="text-3xl font-black text-zinc-800 tracking-tighter mb-4">Select a Knowledge Base</h3>
                                    <p className="text-zinc-700 font-bold">Your ideas deserve space. Select or create an entry to begin.</p>
                                </div>
                            )}
                        </ResizablePanel>
                    </ResizablePanelGroup>
                )}
            </div>

            {/* Dialogs */}
            <Dialog open={createNotebookOpen} onOpenChange={setCreateNotebookOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create New Notebook</DialogTitle></DialogHeader>
                    <Input placeholder="Notebook Name" value={newNotebookName} onChange={e => setNewNotebookName(e.target.value)} />
                    <Button onClick={handleCreateNotebook}>Create</Button>
                </DialogContent>
            </Dialog>

            <Dialog open={createSectionOpen} onOpenChange={setCreateSectionOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create Section</DialogTitle></DialogHeader>
                    <Input placeholder="Section Name" value={newSectionName} onChange={e => setNewSectionName(e.target.value)} />
                    <Button onClick={handleCreateSection}>Create</Button>
                </DialogContent>
            </Dialog>

            {/* Rename Dialog */}
            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Rename {renameData?.type === 'notebook' ? 'Notebook' : 'Section'}</DialogTitle></DialogHeader>
                    <Input
                        placeholder="Name"
                        value={renameData?.name || ''}
                        onChange={e => setRenameData(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setRenameOpen(false)}>Cancel</Button>
                        <Button onClick={handleRenameSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the {deleteTarget?.type} "{deleteTarget?.name}"
                            {deleteTarget?.type === 'notebook' && " and all sections/notes inside it."}
                            {deleteTarget?.type === 'section' && " and all notes inside it."}
                            . This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirmDeleteOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Image Lightbox Carousel */}
            {lightboxIndex !== null && noteImages[lightboxIndex] && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setLightboxIndex(null)}
                >
                    <div className="absolute top-6 left-6 flex items-center gap-4 z-[60]">
                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-xs font-black tracking-[0.2em] uppercase">
                            Asset {lightboxIndex + 1} of {noteImages.length}
                        </div>
                    </div>

                    <div className="absolute top-6 right-6 flex gap-3 z-[60]">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md"
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                if (window.confirm('Are you sure you want to delete this image?')) {
                                    handleDeleteImage(noteImages[lightboxIndex]); 
                                    setLightboxIndex(null); 
                                }
                            }}
                        >
                            <Trash2 className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md"
                            onClick={() => setLightboxIndex(null)}
                        >
                            <X className="w-6 h-6" />
                        </Button>
                    </div>

                    {/* Navigation Buttons */}
                    {noteImages.length > 1 && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute left-6 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md z-[60] group"
                                onClick={(e) => { e.stopPropagation(); navigateLightbox('prev'); }}
                            >
                                <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-6 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md z-[60] group"
                                onClick={(e) => { e.stopPropagation(); navigateLightbox('next'); }}
                            >
                                <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </>
                    )}

                    <div
                        className="relative max-w-7xl w-full h-full flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={noteImages[lightboxIndex]}
                            alt="Full size"
                            className="max-w-full max-h-full object-contain rounded-xl shadow-[0_0_100px_rgba(0,0,0,0.5)] transition-all duration-500 animate-in zoom-in-95"
                        />
                    </div>

                    {/* Thumbnails list at bottom */}
                    {noteImages.length > 1 && (
                        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 px-6 overflow-x-auto py-4 z-[60]">
                            {noteImages.map((url, idx) => (
                                <div
                                    key={idx}
                                    className={`relative h-16 aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${lightboxIndex === idx ? 'border-blue-500 scale-110 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 opacity-50 hover:opacity-100'}`}
                                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                                >
                                    <img src={url} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
