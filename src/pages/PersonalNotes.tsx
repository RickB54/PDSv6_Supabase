import { useEffect, useState, useMemo } from "react";
import { useNotesStore, Note, Notebook, Section } from "@/store/notes";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus, Search, Trash2, Folder, Inbox, Briefcase, User, Menu, ArrowLeft,
    MoreVertical, FileText, Lock, Unlock, Star, Tag, ChevronRight, ChevronDown, Edit2, Image as ImageIcon, X
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
import imageCompression from 'browser-image-compression';
import { VoiceInput } from "@/components/VoiceInput";

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

        // 1. Search (Global)
        if (store.searchQuery) {
            const q = store.searchQuery.toLowerCase();
            list = list.filter(n =>
                n.title.toLowerCase().includes(q) ||
                n.content?.toLowerCase().includes(q) ||
                n.tags?.some(t => t.toLowerCase().includes(q))
            );
        } else {
            // 2. Hierarchy Filter
            if (store.activeSectionId === 'quick-notes') {
                list = list.filter(n => !n.section_id); // Quick notes have no section
            } else if (store.activeSectionId) {
                list = list.filter(n => n.section_id === store.activeSectionId);
            } else if (store.activeNotebookId) {
                // Show all notes in notebook?? Usually OneNote requires picking a section.
                // For better UX, if notebook picked but no section, maybe show nothing or all sections?
                // Let's filter to sections in this notebook
                const sectionIds = store.sections.filter(s => s.notebook_id === store.activeNotebookId).map(s => s.id);
                list = list.filter(n => n.section_id && sectionIds.includes(n.section_id));
            } else {
                // Determine what to show on "Home"? Maybe Quick Notes?
                list = list.filter(n => !n.section_id);
            }
        }

        // 3. Sort (Pinned first, then updated)
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
        if (isMobile) setSidebarOpen(false);
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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!activeNote || !e.target.files) return;
        setUploadingImage(true);

        try {
            const files = Array.from(e.target.files);
            const uploadPromises = files.map(async (file) => {
                // Compress image
                const compressed = await imageCompression(file, {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true
                });

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
                content: currentContent + '\n' + imageMarkdown + '\n'
            });

        } catch (error: any) {
            console.error('Image upload failed:', error);
            alert('Failed to upload image: ' + (error.message || 'Unknown error'));
        } finally {
            setUploadingImage(false);
            if (e.target) e.target.value = '';
        }
    };

    return (
        <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
            <div className="shrink-0">
                <PageHeader title="Personal Notes" />
            </div>

            <div className="flex-1 flex overflow-hidden relative">

                {/* 1. Sidebar (Notebooks & Sections) */}
                <div
                    className={`
                        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 pointer-events-none md:w-0'} 
                        ${isMobile ? 'absolute inset-y-0 left-0 z-30 bg-background/95 backdrop-blur shadow-xl border-r border-zinc-800' : 'border-r border-zinc-800 bg-zinc-950/30'}
                        flex flex-col transition-all duration-300 ease-in-out shrink-0
                    `}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <span className="font-semibold text-zinc-300">Notebooks</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setCreateNotebookOpen(true)}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Hierarchy Tree */}
                    <div className="flex-1 overflow-y-auto p-2">
                        {/* Quick Notes Special Item */}
                        <div
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer mb-2
                                ${store.activeSectionId === 'quick-notes' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900'}
                            `}
                            onClick={() => { store.setActiveSection('quick-notes'); store.setActiveNotebook(null); if (isMobile) setSidebarOpen(false); }}
                        >
                            <Inbox className="w-4 h-4" />
                            <span className="font-medium text-sm">Quick Notes</span>
                        </div>

                        {store.notebooks.map(nb => (
                            <div key={nb.id} className="mb-1">
                                <div
                                    className={`flex items-center justify-between p-2 rounded cursor-pointer group
                                        ${store.activeNotebookId === nb.id ? 'bg-zinc-900 text-zinc-200' : 'text-zinc-400 hover:bg-zinc-900/50'}
                                    `}
                                    onClick={() => store.setActiveNotebook(nb.id === store.activeNotebookId ? null : nb.id)}
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {store.activeNotebookId === nb.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        <span className="font-medium text-sm truncate">{nb.name}</span>
                                    </div>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="ghost" className="h-5 w-5" title="Rename" onClick={(e) => { e.stopPropagation(); setRenameData({ type: 'notebook', id: nb.id, name: nb.name }); setRenameOpen(true); }}>
                                            <Edit2 className="w-3 h-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-5 w-5" title="Add Section" onClick={(e) => { e.stopPropagation(); setTargetNotebookId(nb.id); setCreateSectionOpen(true); }}>
                                            <Plus className="w-3 h-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-5 w-5 text-red-900 hover:text-red-500" onClick={(e) => { e.stopPropagation(); requestDelete('notebook', nb.id, nb.name); }}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Sections */}
                                {store.activeNotebookId === nb.id && (
                                    <div className="ml-4 border-l border-zinc-800 pl-2 mt-1 space-y-0.5">
                                        {store.sections.filter(s => s.notebook_id === nb.id).map(sec => (
                                            <div
                                                key={sec.id}
                                                className={`flex items-center justify-between p-1.5 rounded cursor-pointer group text-sm
                                                    ${store.activeSectionId === sec.id ? 'bg-blue-900/20 text-blue-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}
                                                `}
                                                onClick={() => { store.setActiveSection(sec.id); if (isMobile) setSidebarOpen(false); }}
                                            >
                                                <span className="truncate flex-1">{sec.name}</span>
                                                <div className="flex items-center opacity-0 group-hover:opacity-100">
                                                    <Button size="icon" variant="ghost" className="h-4 w-4 text-zinc-600 hover:text-zinc-300" onClick={(e) => { e.stopPropagation(); setRenameData({ type: 'section', id: sec.id, name: sec.name }); setRenameOpen(true); }}>
                                                        <Edit2 className="w-3 h-3" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-4 w-4 text-zinc-600 hover:text-red-400" onClick={(e) => { e.stopPropagation(); requestDelete('section', sec.id, sec.name); }}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {store.sections.filter(s => s.notebook_id === nb.id).length === 0 && (
                                            <div className="text-xs text-zinc-600 p-2 italic">No sections</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Note List Column */}
                <div className={`
                    w-72 border-r border-zinc-800 flex flex-col bg-zinc-950/20 shrink-0
                    ${isMobile && !sidebarOpen && !activeNote ? 'w-full' : 'hidden md:flex'}
                    ${activeNote && isMobile ? 'hidden' : ''}
                `}>
                    {/* Toolbar */}
                    <div className="p-3 border-b border-zinc-800 flex flex-col gap-2">
                        {/* Mobile: Back to Menu */}
                        {isMobile && !sidebarOpen && (
                            <div className="flex items-center gap-2 mb-2">
                                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                                    <ArrowLeft className="w-5 h-5 text-zinc-400" />
                                </Button>
                                <span className="font-semibold text-sm">Notes</span>
                            </div>
                        )}
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 w-4 h-4 text-zinc-500" />
                            <Input
                                placeholder="Search all notes..."
                                className="pl-8 bg-zinc-900 border-zinc-800 h-9 text-sm"
                                value={store.searchQuery}
                                onChange={(e) => store.setSearch(e.target.value)}
                            />
                        </div>
                        <Button className="w-full bg-blue-600 hover:bg-blue-500" size="sm" onClick={handleCreateNote}>
                            <Plus className="w-4 h-4 mr-2" /> New Note
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredNotes.length === 0 ? (
                            <div className="text-center py-10 text-zinc-500 text-xs px-4">
                                {store.searchQuery ? 'No matches found.' : 'No notes in this section.'}
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-800/50">
                                {filteredNotes.map(note => (
                                    <div
                                        key={note.id}
                                        onClick={() => store.setActiveNote(note.id)}
                                        className={`
                                            p-3 cursor-pointer transition-all hover:bg-zinc-900/50
                                            ${store.activeNoteId === note.id ? 'bg-zinc-900 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`font-semibold text-sm truncate flex-1 ${!note.title ? 'italic text-zinc-500' : 'text-zinc-200'}`}>
                                                {note.title || 'Untitled Page'}
                                            </span>
                                            <div className="flex gap-1">
                                                {note.is_pinned && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                                                {note.is_locked && <Lock className="w-3 h-3 text-red-400" />}
                                            </div>
                                        </div>
                                        <div className="text-xs text-zinc-500 truncate h-4 mb-2">
                                            {note.is_locked ? 'Locked Content' : (note.content || 'No content')}
                                        </div>
                                        <div className="flex items-center gap-1 flex-wrap">
                                            {note.tags?.slice(0, 3).map(t => (
                                                <span key={t} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">{t}</span>
                                            ))}
                                            <span className="text-[10px] text-zinc-600 ml-auto">{new Date(note.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Editor Column */}
                <div className={`
                    flex-1 flex flex-col bg-background relative z-10
                    ${isMobile && !activeNote ? 'hidden' : 'flex'}
                `}>
                    {/* Mobile Header */}
                    <div className="h-12 border-b border-zinc-800 flex items-center px-4 justify-between md:hidden bg-zinc-950">
                        <Button variant="ghost" size="icon" onClick={() => { if (activeNote) store.setActiveNote(null); else setSidebarOpen(true); }}>
                            <ArrowLeft className="w-5 h-5 text-zinc-400" />
                        </Button>
                        <span className="font-semibold text-sm truncate">{activeNote ? (activeNote.title || 'Untitled') : 'Notes'}</span>
                        <div className="w-8" />
                    </div>

                    {activeNote ? (
                        <>
                            {/* Editor Toolbar */}
                            <div className="h-12 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-950/30">
                                <div className="text-xs text-zinc-600 hidden md:block">
                                    Last edited: {new Date(activeNote.updated_at).toLocaleString()}
                                </div>
                                <div className="flex items-center gap-1 ml-auto">
                                    <Button variant="ghost" size="icon" title={activeNote.is_pinned ? "Unpin" : "Pin"} onClick={() => store.updateNote(activeNote.id, { is_pinned: !activeNote.is_pinned })}>
                                        <Star className={`w-4 h-4 ${activeNote.is_pinned ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-400'}`} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Upload Image"
                                        disabled={uploadingImage}
                                        onClick={() => document.getElementById('note-image-upload')?.click()}
                                    >
                                        <ImageIcon className={`w-4 h-4 ${uploadingImage ? 'text-blue-500 animate-pulse' : 'text-zinc-400'}`} />
                                    </Button>
                                    <input
                                        id="note-image-upload"
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        multiple
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                    <VoiceInput
                                        onTranscript={(text) => {
                                            if (activeNote) {
                                                const currentContent = activeNote.content || '';
                                                store.updateNote(activeNote.id, {
                                                    content: currentContent + '\n' + text
                                                });
                                            }
                                        }}
                                        className="relative"
                                    />
                                    <Button variant="ghost" size="icon" title={activeNote.is_locked ? "Unlock" : "Lock"} onClick={toggleLock}>
                                        {activeNote.is_locked ? <Lock className="w-4 h-4 text-red-500" /> : <Unlock className="w-4 h-4 text-zinc-400" />}
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="w-4 h-4 text-zinc-400" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => requestDelete('note', activeNote.id, activeNote.title)} className="text-red-400">
                                                <Trash2 className="w-4 h-4 mr-2" /> Delete Page
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {/* Main Content */}
                            {activeNote.is_locked ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                                    <Lock className="w-16 h-16 mb-4 text-zinc-700" />
                                    <h3 className="text-lg font-bold mb-2">This note is locked</h3>
                                    <p className="text-sm text-zinc-600 mb-4 max-w-xs text-center">
                                        Locking hides the content from view.
                                        {/* Future: Enter PIN to unlock */}
                                    </p>
                                    <Button onClick={toggleLock} variant="outline">Unlock to view</Button>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col p-6 md:p-10 max-w-4xl mx-auto w-full overflow-y-auto">
                                    {/* Title */}
                                    <input
                                        className="bg-transparent border-none text-4xl font-bold placeholder:text-zinc-600 focus:outline-none mb-6 w-full"
                                        placeholder="Page Title"
                                        value={activeNote.title}
                                        onChange={(e) => store.updateNote(activeNote.id, { title: e.target.value })}
                                    />

                                    {/* Tag Bar */}
                                    <div className="flex flex-wrap items-center gap-2 mb-6">
                                        {activeNote.tags?.map(tag => (
                                            <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-zinc-700" onClick={() => { store.updateNote(activeNote.id, { tags: activeNote.tags.filter(t => t !== tag) }) }}>
                                                {tag} &times;
                                            </Badge>
                                        ))}

                                        <div className="flex items-center gap-1 bg-zinc-900/50 rounded-full px-2 border border-zinc-800 focus-within:border-zinc-600 transition-colors">
                                            <Tag className="w-3 h-3 text-zinc-500" />
                                            <input
                                                className="bg-transparent border-none text-xs w-20 focus:outline-none focus:ring-0 placeholder:text-zinc-600 py-1"
                                                placeholder="Add tag..."
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && tagInput.trim()) { addTag(tagInput.trim()); setTagInput(""); } }}
                                            />
                                        </div>
                                        {/* Presets */}
                                        <div className="flex gap-1 ml-2">
                                            {['Idea', 'Lesson', 'To-Do', 'Important'].map(preset => (
                                                <button key={preset} onClick={() => addTag(preset)} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-500 border border-zinc-800">
                                                    {preset}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Image Gallery */}
                                    {noteImages.length > 0 && (
                                        <div className="mb-6">
                                            <div className="flex items-center gap-2 mb-3">
                                                <ImageIcon className="w-4 h-4 text-zinc-500" />
                                                <span className="text-sm text-zinc-500 font-medium">Images ({noteImages.length})</span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                {noteImages.map((url, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="relative aspect-square rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-blue-500 transition-all group"
                                                        onClick={() => setLightboxImage(url)}
                                                    >
                                                        <img
                                                            src={url}
                                                            alt={`Image ${idx + 1}`}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                            <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Content */}
                                    <Textarea
                                        className="flex-1 resize-none bg-transparent border-none focus-visible:ring-0 text-lg leading-relaxed text-zinc-300 p-0 placeholder:text-zinc-700 min-h-[50vh]"
                                        placeholder="Start typing your notes here..."
                                        value={activeNote.content || ''}
                                        onChange={(e) => store.updateNote(activeNote.id, { content: e.target.value })}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                            <FileText className="w-16 h-16 mb-4 opacity-10" />
                            <p>Select a page or create a new one</p>
                        </div>
                    )}
                </div>

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

            {/* Image Lightbox */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setLightboxImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:text-zinc-300 transition-colors"
                        onClick={() => setLightboxImage(null)}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={lightboxImage}
                        alt="Full size"
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
