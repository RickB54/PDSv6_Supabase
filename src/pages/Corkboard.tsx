import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  X, Plus, Trash2, Edit2, Save, PanelLeftClose, PanelLeft, 
  LayoutDashboard, CheckSquare, FileText, Folder, ChevronDown, ChevronRight,
  Search, Settings, Palette, MoreVertical, Copy, ArrowUp
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNotesStore, Note, Section } from "@/store/notes";
import { PageHeader } from "@/components/PageHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "@/hooks/use-toast";

// --- Sortable Sticky Note Component ---
const STICKY_COLORS = [
  { id: 'yellow', bg: 'bg-[#fef08a]', border: 'border-[#facc15]', text: 'text-[#5c4033]', tagBg: 'bg-[#eab308]/30', tagText: 'text-[#5c4033]' },
  { id: 'blue', bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'emerald', bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'rose', bg: 'bg-rose-500', border: 'border-rose-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'purple', bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'orange', bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'gray', bg: 'bg-zinc-700', border: 'border-zinc-600', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'teal', bg: 'bg-teal-600', border: 'border-teal-500', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
];

const SortableSticky = ({ note, sectionName, onEdit, onDelete, onSendToNotes, onDuplicate, onChangeColor, onToggleCheckboxes, showTags, showToolbar }: { note: Note, sectionName?: string, onEdit: (n: Note) => void, onDelete: (id: string) => void, onSendToNotes: (n: Note) => void, onDuplicate: (n: Note) => void, onChangeColor: (n: Note, colorId: string) => void, onToggleCheckboxes: (n: Note) => void, showTags?: boolean, showToolbar?: boolean }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  // Generate a random slight rotation based on ID for that natural corkboard look
  const rotation = React.useMemo(() => {
    const hash = note.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 6) - 3; // -3 to 3 degrees
  }, [note.id]);

  const color = React.useMemo(() => {
    const colorTag = note.tags?.find(t => t.startsWith('__color:'));
    if (colorTag) {
      const colorId = colorTag.split(':')[1].replace('__', '');
      const found = STICKY_COLORS.find(c => c.id === colorId);
      if (found) return found;
    }
    const hash = note.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return STICKY_COLORS[hash % 6];
  }, [note.id, note.tags]);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        transform: style.transform ? `${style.transform} rotate(${rotation}deg)` : `rotate(${rotation}deg)`
      }}
      onClick={() => onEdit(note)}
      className={`
        relative group p-5 rounded shadow-lg transition-all duration-200 min-h-[200px] flex flex-col cursor-pointer
        ${isDragging ? 'shadow-2xl scale-105 opacity-90' : 'hover:shadow-xl hover:-translate-y-1'}
        ${color.bg} ${color.border} ${color.text} border
      `}
    >
      <div 
        {...attributes} 
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-0 left-0 right-0 h-6 cursor-grab active:cursor-grabbing flex items-center justify-center"
      >
         <div className="w-12 h-3 bg-black/10 rounded-full mt-2" />
      </div>

      <div className="flex-1 mt-4">
        <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2">{note.title}</h3>
        <p className="text-sm opacity-80 whitespace-pre-wrap line-clamp-6">{note.content}</p>
      </div>
      {showTags && (
        <div className="mt-4 pt-4 border-t border-black/10 flex flex-wrap gap-1">
          {note.tags && note.tags.filter(t => t !== '__corkboard__' && !t.startsWith('__color:')).length > 0 ? note.tags.filter(t => t !== '__corkboard__' && !t.startsWith('__color:')).map(t => (
            <span key={t} className={`text-[9px] uppercase font-bold ${color.tagBg} ${color.tagText} px-1.5 py-0.5 rounded-sm`}>{t}</span>
          )) : (
            <span className={`text-[9px] uppercase font-bold bg-transparent ${color.text} opacity-50 italic px-1.5 py-0.5`}>No Tags</span>
          )}
        </div>
      )}

      {sectionName && (
        <div className="mt-3 text-[10px] font-black opacity-60 uppercase tracking-widest truncate">{sectionName}</div>
      )}

      {showToolbar && (
        <div className="flex justify-between items-center mt-4 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className={`h-8 w-8 ${color.text} hover:bg-black/10`}>
                  <Palette className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-zinc-900 border-zinc-800 p-2 grid grid-cols-4 gap-2 z-[400]">
                {STICKY_COLORS.map(c => (
                  <div key={c.id} onClick={() => onChangeColor(note, c.id)} className={`w-8 h-8 rounded-full cursor-pointer border-2 ${note.tags?.includes(`__color:${c.id}__`) ? 'border-white' : 'border-transparent'} ${c.bg}`} />
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="icon" variant="ghost" className={`h-8 w-8 ${color.text} hover:bg-black/10`} title="Send to Personal Notes" onClick={(e) => { e.stopPropagation(); onSendToNotes(note); }}>
              <FileText className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className={`h-8 w-8 ${color.text} hover:bg-black/10`} onClick={(e) => { e.stopPropagation(); onEdit(note); }}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className={`h-8 w-8 ${color.text} hover:bg-black/10`}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-zinc-300 z-[400]">
                <DropdownMenuItem onClick={() => onDelete(note.id)}>Delete note</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(note)}>Change labels / Category</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast({ title: "Drawing Canvas", description: "This feature will be enabled in a future update." })}>Add drawing</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(note)}>Make a copy</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleCheckboxes(note)}>Show checkboxes</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(note.content); toast({ title: "Copied to clipboard" }); }}>Copy to Google Docs</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast({ title: "Version History", description: `This note has ${note.versions?.length || 0} previous versions.` })}>Version history</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Corkboard() {
  const navigate = useNavigate();
  const notesStore = useNotesStore();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null); // null = All
  const [expandedNotebook, setExpandedNotebook] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsNoteModalOpen(true);
  };

  // New Notebook (Category) Modal
  const [newNotebookName, setNewNotebookName] = useState("");
  const [isNotebookModalOpen, setIsNotebookModalOpen] = useState(false);

  // New Section (Submenu) Modal
  const [newSectionName, setNewSectionName] = useState("");
  const [selectedNbForNewSection, setSelectedNbForNewSection] = useState<string | null>(null);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Prefs state for live updates
  const [prefs, setPrefs] = useState({
    anim: localStorage.getItem('corkboard_anim') !== 'false',
    tags: localStorage.getItem('corkboard_tags') !== 'false',
    masonry: localStorage.getItem('corkboard_masonry') === 'true',
    isolate: localStorage.getItem('corkboard_isolate') !== 'false',
    toolbar: localStorage.getItem('corkboard_toolbar') !== 'false'
  });

  const updatePref = (key: 'anim' | 'tags' | 'masonry' | 'isolate' | 'toolbar', val: boolean) => {
    localStorage.setItem(`corkboard_${key}`, String(val));
    setPrefs(p => ({ ...p, [key]: val }));
  };

  // Fetch data on mount
  useEffect(() => {
    notesStore.refresh();
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      navigate(-1); // Or navigate('/dashboard/admin')
    }, 400);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      // In a real scenario, you'd save the order to the database.
      // For now, since useNotesStore doesn't natively support arbitrary reordering 
      // without an order field, we will just update local state if we had one.
      // To properly do this, we'd add an `order` field to Note.
      toast({ title: "Order Updated", description: "Sticky position saved temporarily." });
    }
  };

  const activeNotes = notesStore.notes.filter(n => {
    if (prefs.isolate && !n.tags?.includes('__corkboard__')) return false;
    if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) && !n.content?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    if (selectedSection) {
      return n.section_id === selectedSection;
    } else if (selectedNotebook) {
      const sectionIds = notesStore.sections.filter(s => s.notebook_id === selectedNotebook).map(s => s.id);
      return n.section_id && sectionIds.includes(n.section_id);
    }
    return true; // All Stickies
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const noteHeaders = useMemo(() => {
    if (!editingNote?.content) return [];
    const regex = /^(#{1,6})\s+(.+)$/gm;
    const headers = [];
    let match;
    while ((match = regex.exec(editingNote.content)) !== null) {
      headers.push({ full: match[0], text: match[2], index: match.index });
    }
    return headers;
  }, [editingNote?.content]);

  const scrollToHeader = (index: number, length: number) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      textarea.setSelectionRange(index, index + length);
      textarea.blur();
      textarea.focus();
    }
  };

  const scrollToTop = () => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = 0;
      textareaRef.current.setSelectionRange(0, 0);
      textareaRef.current.focus();
    }
  };

  const handleSaveNote = async () => {
    if (editingNote) {
      const sectionId = editingNote.section_id || null;
      if (editingNote.id === 'new') {
        await notesStore.createNote(sectionId, editingNote.title, editingNote.content, ['__corkboard__']);
        toast({ title: "Note Created" });
      } else {
        await notesStore.updateNote(editingNote.id, { section_id: sectionId, title: editingNote.title, content: editingNote.content });
        toast({ title: "Note Updated" });
      }
      setIsNoteModalOpen(false);
      setEditingNote(null);
    }
  };

  const handleSendToNotes = async (note: Note) => {
    const tags = note.tags?.filter(t => t !== '__corkboard__') || [];
    await notesStore.updateNote(note.id, { tags });
    toast({ title: "Sent to Personal Notes" });
  };

  const handleDuplicateNote = async (note: Note) => {
    const id = await notesStore.createNote(note.section_id || null, `${note.title} (Copy)`, note.content);
    const tags = note.tags || [];
    if (!tags.includes('__corkboard__')) tags.push('__corkboard__');
    await notesStore.updateNote(id, { tags });
    toast({ title: "Sticky Duplicated" });
  };

  const handleChangeColor = async (note: Note, colorId: string) => {
    const tags = (note.tags || []).filter(t => !t.startsWith('__color:'));
    tags.push(`__color:${colorId}__`);
    await notesStore.updateNote(note.id, { tags });
  };

  const handleToggleCheckboxes = async (note: Note) => {
    const hasCheckboxes = note.content.includes('[ ]') || note.content.includes('[x]');
    if (hasCheckboxes) {
      const newContent = note.content.replace(/^(\s*)-\s+\[[ x]\]\s+/gm, '$1- ');
      await notesStore.updateNote(note.id, { content: newContent });
    } else {
      const newContent = note.content.replace(/^(\s*)-\s+/gm, '$1- [ ] ');
      await notesStore.updateNote(note.id, { content: newContent });
    }
    toast({ title: "Checkboxes Toggled" });
  };

  const handleAddSection = () => {
    if (editingNote && textareaRef.current) {
      const textarea = textareaRef.current;
      const cursorPos = textarea.selectionStart || editingNote.content.length;
      const timestamp = new Date().toLocaleString([], { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' });
      const newSectionText = `\n\n---\n# New Section (${timestamp})\n\n`;
      
      const newContent = editingNote.content.slice(0, cursorPos) + newSectionText + editingNote.content.slice(cursorPos);
      setEditingNote({ ...editingNote, content: newContent });
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorPos + newSectionText.length, cursorPos + newSectionText.length);
      }, 0);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm("Delete this sticky note?")) {
      await notesStore.deleteNote(id);
      toast({ title: "Deleted" });
    }
  };

  const handleCreateNotebook = async () => {
    if (newNotebookName.trim()) {
      const nbId = await notesStore.createNotebook(newNotebookName);
      if (nbId) {
        await notesStore.createSection(nbId, "General");
      }
      setNewNotebookName("");
      setIsNotebookModalOpen(false);
      toast({ title: "Category Created" });
    }
  };

  const handleCreateSection = async () => {
    if (newSectionName.trim() && selectedNbForNewSection) {
      await notesStore.createSection(selectedNbForNewSection, newSectionName);
      setNewSectionName("");
      setIsSectionModalOpen(false);
      toast({ title: "Submenu Created" });
    }
  };

  const enableAnim = prefs.anim;
  const showTags = prefs.tags;
  const isMasonry = prefs.masonry;

  return (
    <div className={`fixed inset-0 z-[200] bg-zinc-950 flex flex-col ${enableAnim ? 'transition-all duration-500 ease-in-out' : ''} ${isExiting && enableAnim ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} ${!isExiting && enableAnim ? 'animate-in zoom-in-95' : ''}`}>
      
      {/* Header */}
      <div className="flex-none flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleClose} className="text-zinc-400 hover:text-white">
            <X className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
              <CheckSquare className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-wider">Corkboard App</h1>
              <p className="text-xs text-zinc-400">Organize your thoughts and tasks</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="Search stickies..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-700 text-white w-64 focus-visible:ring-yellow-500"
            />
            {searchQuery && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7 text-zinc-400 hover:text-white" onClick={() => setSearchQuery("")}>
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800" title="Settings">
            <Settings className="w-5 h-5" />
          </Button>
          <Button 
            onClick={() => {
              setEditingNote({ id: 'new', title: '', content: '', section_id: selectedSection, user_id: '', is_pinned: false, is_locked: false, tags: [], versions: [], created_at: '', updated_at: '' });
              setIsNoteModalOpen(true);
            }}
            className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold shadow-[0_0_15px_rgba(234,179,8,0.3)]"
          >
            <Plus className="w-4 h-4 mr-2" /> New Sticky
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-zinc-400 hover:text-white lg:hidden">
            <PanelLeft className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative bg-[#5c4033]">
        {/* Faint Corkboard Texture Background */}
        <div className="absolute inset-0 opacity-20 mix-blend-multiply pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

        {/* Sidebar Categories */}
        <div className={`
          absolute lg:relative z-20 h-full bg-zinc-950 border-r border-zinc-800 transition-all duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-0'}
        `}>
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between min-w-[16rem]">
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">Categories</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsNotebookModalOpen(true)} className="h-6 w-6 text-emerald-500 hover:bg-emerald-500/20" title="New Category">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 min-w-[16rem]">
            <div className="p-3 space-y-2">
              <button 
                onClick={() => { setSelectedSection(null); setSelectedNotebook(null); setExpandedNotebook(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!selectedSection && !selectedNotebook ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
              >
                <LayoutDashboard className="w-4 h-4" /> All Stickies
              </button>
              
              {notesStore.notebooks.map(nb => (
                <div key={nb.id} className="space-y-1">
                  <button 
                    onClick={() => {
                      setExpandedNotebook(expandedNotebook === nb.id ? null : nb.id);
                      setSelectedNotebook(nb.id);
                      setSelectedSection(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-colors ${selectedNotebook === nb.id && !selectedSection ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-300 hover:bg-zinc-900'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="w-4 h-4 text-emerald-500" /> {nb.name}
                    </div>
                    {expandedNotebook === nb.id ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
                  </button>

                  {expandedNotebook === nb.id && (
                    <div className="pl-6 pr-2 space-y-1 border-l border-zinc-800 ml-5 my-1">
                      {notesStore.sections.filter(s => s.notebook_id === nb.id).map(sec => (
                        <button 
                          key={sec.id}
                          onClick={() => setSelectedSection(sec.id)}
                          className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedSection === sec.id ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 font-medium'}`}
                        >
                          <FileText className="w-3.5 h-3.5" /> {sec.name}
                        </button>
                      ))}
                      <button 
                        onClick={() => { setSelectedNbForNewSection(nb.id); setIsSectionModalOpen(true); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors mt-1"
                      >
                        <Plus className="w-3 h-3" /> Add Submenu
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Board */}
        <div className="flex-1 overflow-y-auto p-8 relative z-10">
          {!isSidebarOpen && (
            <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen(true)} className="fixed bottom-6 left-6 z-50 rounded-full shadow-2xl bg-zinc-950 border-zinc-800 text-white hover:bg-zinc-800">
              <PanelLeftClose className="w-5 h-5 rotate-180" />
            </Button>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={activeNotes.map(n => n.id)} strategy={rectSortingStrategy}>
              <div className={`grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${isMasonry ? 'items-start' : 'items-stretch'}`}>
                {activeNotes.map(note => {
                  const sectionName = notesStore.sections.find(s => s.id === note.section_id)?.name;
                  return (
                    <SortableSticky 
                      key={note.id} 
                      note={note} 
                      sectionName={sectionName}
                      onEdit={handleEditNote} 
                      onDelete={handleDeleteNote} 
                      onSendToNotes={handleSendToNotes} 
                      onDuplicate={handleDuplicateNote}
                      onChangeColor={handleChangeColor}
                      onToggleCheckboxes={handleToggleCheckboxes}
                      showTags={prefs.tags} 
                      showToolbar={prefs.toolbar}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          {activeNotes.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 opacity-50">
              <CheckSquare className="w-16 h-16 mb-4 text-[#facc15]" />
              <p className="text-[#facc15] font-bold text-lg">No stickies in this category</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Note Modal */}
      {editingNote && isNoteModalOpen && (() => {
        const editColorId = editingNote.tags?.find(t => t.startsWith('__color:'))?.split(':')[1]?.replace('__', '') || 'yellow';
        const editColor = STICKY_COLORS.find(c => c.id === editColorId) || STICKY_COLORS[0];
        
        return (
        <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className={`${editColor.bg} w-full max-w-5xl rounded-lg shadow-2xl overflow-hidden border-2 ${editColor.border} flex flex-col h-[95vh]`}>
            <div className={`p-4 border-b border-black/10 flex justify-between items-start ${editColor.bg} brightness-95`}>
              <div className="flex flex-col gap-1">
                <h2 className={`font-bold ${editColor.text}`}>{editingNote.id === 'new' ? 'New Sticky' : 'Edit Sticky'}</h2>
                {editingNote.id !== 'new' && (
                  <div className={`text-[10px] ${editColor.text} opacity-70 uppercase font-bold tracking-wider`}>
                    Created: {new Date(editingNote.created_at || '').toLocaleString()} | Updated: {new Date(editingNote.updated_at || '').toLocaleString()}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsNoteModalOpen(false)} className={`${editColor.text} hover:bg-black/10`}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {noteHeaders.length > 0 && (
              <div className={`px-6 py-3 border-b border-black/10 ${editColor.bg} flex gap-2 overflow-x-auto`}>
                <span className={`text-xs font-bold ${editColor.text} uppercase py-1.5 shrink-0`}>Sections:</span>
                {noteHeaders.map((header, i) => (
                  <Button 
                    key={i} 
                    variant="outline" 
                    size="sm" 
                    onClick={() => scrollToHeader(header.index, header.full.length)}
                    className={`shrink-0 h-7 text-xs ${editColor.border} ${editColor.text} hover:bg-black/10 bg-transparent`}
                  >
                    {header.text}
                  </Button>
                ))}
              </div>
            )}

            <div className="p-6 flex-1 flex flex-col gap-4 overflow-hidden">
              <div className="shrink-0">
                <label className={`text-xs font-bold ${editColor.text} uppercase mb-1 block`}>Title</label>
                <Input 
                  value={editingNote.title} 
                  onChange={e => setEditingNote({...editingNote, title: e.target.value})}
                  className={`bg-black/5 ${editColor.border} ${editColor.text} placeholder:${editColor.text} placeholder:opacity-50 focus-visible:ring-black/20`}
                  placeholder="Sticky title..."
                />
              </div>
              <div className="flex-1 flex flex-col relative">
                <div className="flex justify-between items-end mb-1">
                  <label className={`text-xs font-bold ${editColor.text} uppercase block`}>Content</label>
                  <Button size="sm" variant="ghost" onClick={handleAddSection} className={`h-6 text-[10px] ${editColor.text} hover:bg-black/10 uppercase font-bold tracking-wider`}>
                    <Plus className="w-3 h-3 mr-1" /> Add New Section Here
                  </Button>
                </div>
                <Textarea 
                  ref={textareaRef}
                  value={editingNote.content} 
                  onChange={e => setEditingNote({...editingNote, content: e.target.value})}
                  className={`flex-1 resize-none bg-black/5 ${editColor.border} ${editColor.text} placeholder:${editColor.text} placeholder:opacity-50 focus-visible:ring-black/20 p-4 text-base leading-relaxed`}
                  placeholder="Write something (use # headers to create section links)..."
                />
                <Button 
                  size="icon" 
                  variant="outline" 
                  className={`absolute bottom-4 left-4 rounded-full shadow-lg ${editColor.border} ${editColor.bg} ${editColor.text} hover:brightness-95`}
                  onClick={scrollToTop}
                  title="Scroll to Top"
                >
                  <ArrowUp className="w-5 h-5" />
                </Button>
              </div>
              <div className="shrink-0">
                <label className={`text-xs font-bold ${editColor.text} uppercase mb-1 block`}>Category</label>
                <select 
                  value={editingNote.section_id || ''} 
                  onChange={e => setEditingNote({...editingNote, section_id: e.target.value || null})}
                  className={`w-full p-2 bg-black/5 border ${editColor.border} ${editColor.text} rounded focus-visible:ring-black/20 outline-none`}
                >
                  <option value="">No Category</option>
                  {notesStore.notebooks.map(nb => (
                    <optgroup key={nb.id} label={nb.name}>
                      {notesStore.sections.filter(s => s.notebook_id === nb.id).map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
            <div className={`p-4 border-t border-black/10 flex justify-between items-center ${editColor.bg} brightness-95`}>
              <div className="flex gap-2">
                {editingNote.id !== 'new' && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className={`h-9 w-9 ${editColor.text} hover:bg-black/10`}>
                          <Palette className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48 bg-zinc-900 border-zinc-800 p-2 grid grid-cols-4 gap-2 z-[400]">
                        {STICKY_COLORS.map(c => (
                          <div key={c.id} onClick={() => {
                            const newTags = editingNote.tags?.filter(t => !t.startsWith('__color:')) || [];
                            newTags.push(`__color:${c.id}__`);
                            setEditingNote({...editingNote, tags: newTags});
                            // We don't automatically save to db here, it gets saved when they click Save Sticky
                          }} className={`w-8 h-8 rounded-full cursor-pointer border-2 ${editingNote.tags?.includes(`__color:${c.id}__`) ? 'border-white' : 'border-transparent'} ${c.bg}`} />
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="icon" variant="ghost" className={`h-9 w-9 ${editColor.text} hover:bg-black/10`} title="Send to Personal Notes" onClick={(e) => { 
                      const tags = editingNote.tags?.filter(t => t !== '__corkboard__') || [];
                      setEditingNote({...editingNote, tags});
                      toast({ title: "Will be sent to Personal Notes on save" });
                    }}>
                      <FileText className="w-5 h-5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className={`h-9 w-9 ${editColor.text} hover:bg-black/10`}>
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-zinc-300 z-[400]">
                        <DropdownMenuItem onClick={() => { handleDeleteNote(editingNote.id); setIsNoteModalOpen(false); }}>Delete note</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateNote(editingNote)}>Make a copy</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(editingNote.content); toast({ title: "Copied to clipboard" }); }}>Copy to Google Docs</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsNoteModalOpen(false)} className={`border-black/20 ${editColor.text} hover:bg-black/10 bg-transparent`}>Cancel</Button>
                <Button onClick={handleSaveNote} className={`bg-black/20 ${editColor.text} hover:bg-black/30 border border-black/10`}>
                  <Save className="w-4 h-4 mr-2" /> Save Sticky
                </Button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* New Notebook Modal */}
      {isNotebookModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-white font-bold mb-4">Create Category</h2>
            <Input 
              value={newNotebookName} 
              onChange={e => setNewNotebookName(e.target.value)} 
              placeholder="Category name..."
              className="bg-zinc-950 border-zinc-800 text-white mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsNotebookModalOpen(false)} className="text-zinc-400">Cancel</Button>
              <Button onClick={handleCreateNotebook} className="bg-blue-600 hover:bg-blue-500 text-white">Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* New Section Modal */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-white font-bold mb-4">Create Submenu</h2>
            <Input 
              value={newSectionName} 
              onChange={e => setNewSectionName(e.target.value)} 
              placeholder="Submenu name..."
              className="bg-zinc-950 border-zinc-800 text-white mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsSectionModalOpen(false)} className="text-zinc-400">Cancel</Button>
              <Button onClick={handleCreateSection} className="bg-emerald-600 hover:bg-emerald-500 text-white">Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h2 className="text-white font-bold flex items-center gap-2"><Settings className="w-4 h-4 text-yellow-500"/> Corkboard Settings</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(false)} className="text-zinc-400 hover:text-white h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">Enable Animations</div>
                  <div className="text-xs text-zinc-500">Smooth entry and exit transitions</div>
                </div>
                <input type="checkbox" checked={prefs.anim} onChange={e => updatePref('anim', e.target.checked)} className="w-4 h-4 accent-yellow-500" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">Masonry Layout</div>
                  <div className="text-xs text-zinc-500">Pack stickies tightly instead of uniform rows</div>
                </div>
                <input type="checkbox" checked={prefs.masonry} onChange={e => updatePref('masonry', e.target.checked)} className="w-4 h-4 accent-yellow-500" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">Show Tags</div>
                  <div className="text-xs text-zinc-500">Display labels on the bottom of stickies</div>
                </div>
                <input type="checkbox" checked={prefs.tags} onChange={e => updatePref('tags', e.target.checked)} className="w-4 h-4 accent-yellow-500" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">Isolate Stickies</div>
                  <div className="text-xs text-zinc-500">Only show items with the corkboard tag (hides them from Notes app)</div>
                </div>
                <input type="checkbox" checked={prefs.isolate} onChange={e => updatePref('isolate', e.target.checked)} className="w-4 h-4 accent-yellow-500" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">Show Toolbar</div>
                  <div className="text-xs text-zinc-500">Display quick-action menu options on hover</div>
                </div>
                <input type="checkbox" checked={prefs.toolbar} onChange={e => updatePref('toolbar', e.target.checked)} className="w-4 h-4 accent-yellow-500" />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
