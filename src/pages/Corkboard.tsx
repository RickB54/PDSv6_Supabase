import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  X, Plus, Trash2, Edit2, Save, PanelLeftClose, PanelLeft, 
  LayoutDashboard, CheckSquare, FileText, Folder, ChevronDown, ChevronRight,
  Search, Settings, Palette, MoreVertical, Copy, ArrowUp, Pin, RefreshCw, Image as ImageIcon
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNotesStore, Note, Section, Notebook } from "@/store/notes";
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
  { id: 'deepblue', bg: 'bg-[#1e3a8a]', border: 'border-[#1e40af]', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'orange', bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'gray', bg: 'bg-zinc-700', border: 'border-zinc-600', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'teal', bg: 'bg-teal-600', border: 'border-teal-500', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'indigo', bg: 'bg-indigo-500', border: 'border-indigo-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'pink', bg: 'bg-pink-400', border: 'border-pink-300', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'cyan', bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'amber', bg: 'bg-amber-400', border: 'border-amber-300', text: 'text-amber-950', tagBg: 'bg-amber-900/20', tagText: 'text-amber-950' },
  { id: 'lime', bg: 'bg-lime-400', border: 'border-lime-300', text: 'text-lime-950', tagBg: 'bg-lime-900/20', tagText: 'text-lime-950' },
  { id: 'fuchsia', bg: 'bg-fuchsia-500', border: 'border-fuchsia-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'violet', bg: 'bg-violet-600', border: 'border-violet-500', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'red', bg: 'bg-red-500', border: 'border-red-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'green', bg: 'bg-green-600', border: 'border-green-500', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'slate', bg: 'bg-slate-600', border: 'border-slate-500', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'sky', bg: 'bg-sky-400', border: 'border-sky-300', text: 'text-sky-950', tagBg: 'bg-sky-900/20', tagText: 'text-sky-950' },
  { id: 'stone', bg: 'bg-stone-500', border: 'border-stone-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'brown', bg: 'bg-[#8B4513]', border: 'border-[#A0522D]', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { id: 'mint', bg: 'bg-[#98FF98]', border: 'border-[#7FFFD4]', text: 'text-[#004d00]', tagBg: 'bg-[#004d00]/20', tagText: 'text-[#004d00]' },
];

const getCleanContent = (content) => {
  if (!content) return "";
  const splitIndex = content.search(/!\[.*?\]\(https?:\/\/[^\)]+\)/);
  if (splitIndex === -1) return content;
  return content.substring(0, splitIndex).trim();
};

const SortableSticky = ({ note, sectionName, onEdit, onDelete, onSendToNotes, onDuplicate, onChangeColor, onToggleCheckboxes, onTogglePin, showTags, showToolbar }: { note: Note, sectionName?: string, onEdit: (n: Note) => void, onDelete: (id: string) => void, onSendToNotes: (n: Note) => void, onDuplicate: (n: Note) => void, onChangeColor: (n: Note, colorId: string) => void, onToggleCheckboxes: (n: Note) => void, onTogglePin: (n: Note) => void, showTags?: boolean, showToolbar?: boolean }) => {
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

      <Button 
        variant="ghost" 
        size="icon" 
        onClick={(e) => { e.stopPropagation(); onTogglePin(note); }} 
        className={`absolute top-2 right-2 h-7 w-7 rounded-full hover:bg-black/10 ${color.text} z-10`}
        title="Pin to Top"
      >
        <Pin className={`w-4 h-4 ${note.is_pinned ? 'fill-current' : ''} ${note.is_pinned ? 'rotate-45' : ''} transition-transform`} />
      </Button>

      <div className="flex-1 mt-4">
        {(() => {
          const tagImages = note.tags?.filter(t => t.startsWith('__img:')).map(t => t.replace('__img:', '')) || [];
          const contentImages = note.content ? [...note.content.matchAll(/!\[.*?\]\((https?:\/\/[^\)]+)\)/g)].map(m => m[1]) : [];
          const images = [...tagImages, ...contentImages];
          if (images.length > 0) {
            return (
              <div className={`grid gap-1 mb-3 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {images.map((img, i) => (
                  <img key={i} src={img} alt="attachment" className="w-full h-24 object-cover rounded shadow-sm bg-white/20" />
                ))}
              </div>
            );
          }
          return null;
        })()}
        <h3 className="font-bold text-lg leading-tight mb-2">
          <span className="line-clamp-2 inline">{note.title}</span>
          <span className="text-[10px] opacity-50 font-normal ml-2 tracking-widest whitespace-nowrap align-middle">
            {new Date(note.created_at || '').toLocaleDateString()} {new Date(note.created_at || '').toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
        </h3>
        <p className="text-sm opacity-80 whitespace-pre-wrap line-clamp-6">{getCleanContent(note.content)}</p>
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
  const [expandAll, setExpandAll] = useState(false);
  const [localNoteOrder, setLocalNoteOrder] = useState<string[]>([]);
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
  const [isSyncing, setIsSyncing] = useState(false);

  const [sortBy, setSortBy] = useState<string>("manual");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Prefs state for live updates
  const [prefs, setPrefs] = useState({
    anim: localStorage.getItem('corkboard_anim') !== 'false',
    tags: localStorage.getItem('corkboard_tags') !== 'false',
    masonry: localStorage.getItem('corkboard_masonry') === 'true',
    isolate: localStorage.getItem('corkboard_isolate') !== 'false',
    toolbar: localStorage.getItem('corkboard_toolbar') !== 'false',
    matchColor: localStorage.getItem('corkboard_match_color') === 'true'
  });

  const updatePref = (key: 'anim' | 'tags' | 'masonry' | 'isolate' | 'toolbar' | 'matchColor', val: boolean) => {
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
    if (!over || active.id === over.id) return;

    setLocalNoteOrder(prev => {
      // Use whichever order list is current
      const base = prev.length > 0 ? prev : notesStore.notes.map(n => n.id);
      const oldIdx = base.indexOf(String(active.id));
      const newIdx = base.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return prev;
      return arrayMove(base, oldIdx, newIdx);
    });
  };

  // Build the ordered list of ALL notes, respecting localNoteOrder if set
  const orderedAllNotes = useMemo(() => {
    const storeNotes = notesStore.notes;
    if (localNoteOrder.length === 0) return storeNotes;
    const orderMap = new Map(localNoteOrder.map((id, i) => [id, i]));
    return [...storeNotes].sort((a, b) => {
      const ai = orderMap.has(a.id) ? orderMap.get(a.id)! : 99999;
      const bi = orderMap.has(b.id) ? orderMap.get(b.id)! : 99999;
      return ai - bi;
    });
  }, [notesStore.notes, localNoteOrder]);

  const activeNotes = useMemo(() => {
    let filtered = orderedAllNotes.filter(n => {
      if (prefs.isolate && !n.tags?.includes('__corkboard__')) return false;
      if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) && !n.content?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedSection) return n.section_id === selectedSection;
      if (selectedNotebook) {
        const sectionIds = notesStore.sections.filter(s => s.notebook_id === selectedNotebook).map(s => s.id);
        return n.section_id && sectionIds.includes(n.section_id);
      }

      if (dateFilter !== "all") {
        const dateStr = n.updated_at || n.created_at;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const now = new Date();
        if (dateFilter === "today") {
          if (d.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "this-week") {
          const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
          if (d < firstDay) return false;
        } else if (dateFilter === "this-month") {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === "this-year") {
          if (d.getFullYear() !== now.getFullYear()) return false;
        }
      }

      return true;
    });

    if (sortBy !== "manual") {
      filtered = [...filtered].sort((a, b) => {
        const d1 = new Date(sortBy.startsWith("created") ? (a.created_at || 0) : (a.updated_at || a.created_at || 0)).getTime();
        const d2 = new Date(sortBy.startsWith("created") ? (b.created_at || 0) : (b.updated_at || b.created_at || 0)).getTime();
        return sortBy.endsWith("asc") ? d1 - d2 : d2 - d1;
      });
    }

    // Always sort pinned to top
    return filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return 0;
    });
  }, [orderedAllNotes, prefs.isolate, searchQuery, selectedSection, selectedNotebook, notesStore.sections, dateFilter, sortBy]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [lineTops, setLineTops] = useState<{index: number, top: number, isList: boolean, status: string, height: number}[]>([]);

  useEffect(() => {
    if (!textareaRef.current || !mirrorRef.current || !isNoteModalOpen || !editingNote) return;
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    
    mirror.style.width = `${ta.clientWidth}px`;

    const lines = editingNote.content.split('\n');
    const tops: any[] = [];
    
    Array.from(mirror.children).forEach((child: any, i) => {
      const lineText = lines[i] || '';
      const isList = /^(\s*)([-*]|\d+\.)\s/.test(lineText.replace(/^[✅⏳⬜❌]\s*/, ''));
      let status = 'none';
      const trimmed = lineText.trim();
      if (trimmed.startsWith('✅')) status = 'done';
      else if (trimmed.startsWith('⏳')) status = 'waiting';
      else if (trimmed.startsWith('❌')) status = 'cancelled';
      else if (trimmed.startsWith('⬜')) status = 'todo';
      
      tops.push({ index: i, top: child.offsetTop, isList, status, height: child.offsetHeight });
    });
    setLineTops(tops);
  }, [editingNote?.content, isNoteModalOpen]);

  const handleSetStatus = (index: number, newStatusIcon: string) => {
    if (!editingNote) return;
    const lines = editingNote.content.split('\n');
    let line = lines[index];
    line = line.replace(/^[✅⏳⬜❌]\s*/, '');
    if (newStatusIcon !== 'none') {
      line = `${newStatusIcon} ${line}`;
    }
    lines[index] = line;
    setEditingNote({ ...editingNote, content: lines.join('\n') });
  };

  const noteHeaders = useMemo(() => {
    if (!editingNote?.content) return [];
    const regex = /^(#{1,6})\s+(.+)$/gm;
    const headers = [];
    let match;
    while ((match = regex.exec(editingNote.content)) !== null) {
      let text = match[2];
      if (text.startsWith('New Section (')) {
        text = text.replace('New Section (', '').replace(/\)$/, '');
      }
      headers.push({ full: match[0], text, index: match.index });
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
      textareaRef.current.setSelectionRange(0, 0);
      textareaRef.current.focus();
    }
  };

  const handleCategorySelect = (action: () => void) => {
    action();
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await notesStore.refresh();
      toast({ title: "Corkboard Synced!" });
    } catch (e) {
      toast({ title: "Sync failed. Try again.", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleNewStickyClick = (extraTags: string[] = []) => {
    let targetSection = selectedSection;
    let sectionName = "";
    if (!targetSection && selectedNotebook) {
      const sections = notesStore.sections.filter(s => s.notebook_id === selectedNotebook);
      if (sections.length > 0) {
        targetSection = sections[0].id;
        sectionName = sections[0].name;
      } else {
        alert("Please add a Category Folder first! (Click the + next to the Folders in the sidebar)");
        return;
      }
    }
    
    if (targetSection) {
      if (!sectionName) sectionName = notesStore.sections.find(s => s.id === targetSection)?.name || "";
      const notebookId = notesStore.sections.find(s => s.id === targetSection)?.notebook_id;
      const notebookName = notesStore.notebooks.find(nb => nb.id === notebookId)?.name || "";
      toast({ title: `Sticky will be created in ${notebookName ? notebookName + ' -> ' : ''}${sectionName}` });
    }
    
    setEditingNote({ id: 'new', title: '', content: '', section_id: targetSection, user_id: '', is_pinned: false, is_locked: false, tags: extraTags, versions: [], created_at: '', updated_at: '' });
    setIsNoteModalOpen(true);
  };

  const handleImageSelect = (isQuickNote = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      
      const base64s = await Promise.all(Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
      }));
      
      const imgTags = base64s.map(b => `__img:${b}`);
      if (isQuickNote) {
        handleNewStickyClick(imgTags);
      } else {
        setEditingNote(prev => prev ? ({ ...prev, tags: [...(prev.tags || []), ...imgTags] }) : null);
      }
    };
    input.click();
  };

  const handleSaveNote = async () => {
    if (editingNote) {
      const sectionId = editingNote.section_id || null;
      if (editingNote.id === 'new') {
        const finalTags = editingNote.tags || [];
        if (!finalTags.includes('__corkboard__')) finalTags.push('__corkboard__');
        const newId = await notesStore.createNote(sectionId, editingNote.title, editingNote.content, finalTags);
        if (editingNote.is_pinned) {
          await notesStore.updateNote(newId, { is_pinned: true });
        }
        toast({ title: "Note Created" });
      } else {
        await notesStore.updateNote(editingNote.id, { 
          section_id: sectionId, 
          title: editingNote.title, 
          content: editingNote.content,
          tags: editingNote.tags 
        });
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

  const handleTogglePin = async (note: Note) => {
    const newPinned = !note.is_pinned;
    await notesStore.updateNote(note.id, { is_pinned: newPinned });

    // Move the note to the correct position in the local order
    setLocalNoteOrder(prev => {
      const base = prev.length > 0 ? [...prev] : notesStore.notes.map(n => n.id);
      // Remove the note from wherever it is
      const without = base.filter(id => id !== note.id);
      if (newPinned) {
        // Pinning: put it at position 0 (top-left)
        return [note.id, ...without];
      } else {
        // Unpinning: put it right after all currently-pinned notes
        const allNotes = notesStore.notes;
        const pinnedIds = new Set(
          allNotes.filter(n => n.id !== note.id && n.is_pinned).map(n => n.id)
        );
        const firstUnpinnedIdx = without.findIndex(id => !pinnedIds.has(id));
        const insertAt = firstUnpinnedIdx === -1 ? without.length : firstUnpinnedIdx;
        without.splice(insertAt, 0, note.id);
        return without;
      }
    });

    toast({ title: newPinned ? "📌 Pinned to Top!" : "Unpinned" });
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

  const handleDeleteNotebook = async (id: string) => {
    if (confirm("Are you sure you want to delete this Category Folder and ALL of its stickies?")) {
      await notesStore.deleteNotebook(id);
    }
  };

  const handleEditNotebook = async (nb: Notebook) => {
    const newName = prompt("Edit Category Name:", nb.name);
    if (newName && newName.trim()) {
      await notesStore.updateNotebook(nb.id, newName.trim());
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (confirm("Are you sure you want to delete this Submenu and ALL of its stickies?")) {
      await notesStore.deleteSection(id);
    }
  };

  const handleEditSection = async (sec: Section) => {
    const newName = prompt("Edit Submenu Name:", sec.name);
    if (newName && newName.trim()) {
      await notesStore.updateSection(sec.id, newName.trim());
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
      <div className="flex-none flex items-center justify-between p-2 sm:p-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Button variant="ghost" size="icon" onClick={handleClose} className="text-zinc-400 hover:text-white shrink-0 h-8 w-8 sm:h-10 sm:w-10">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30 shrink-0">
              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
            </div>
            <div className="hidden min-[380px]:block">
              <h1 className="text-sm sm:text-xl font-black text-white uppercase tracking-wider leading-none mt-1 sm:mt-0">Corkboard</h1>
              <p className="text-[10px] sm:text-xs text-zinc-400 hidden sm:block">Organize your thoughts and tasks</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="Search stickies..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-700 text-white w-64 focus-visible:ring-yellow-500 h-9 sm:h-10"
            />
            {searchQuery && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7 text-zinc-400 hover:text-white" onClick={() => setSearchQuery("")}>
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <select className="bg-zinc-900 text-white text-xs border border-zinc-700 rounded h-9 sm:h-10 px-2 outline-none focus:ring-1 focus:ring-yellow-500" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="this-year">This Year</option>
            </select>
            <select className="bg-zinc-900 text-white text-xs border border-zinc-700 rounded h-9 sm:h-10 px-2 outline-none focus:ring-1 focus:ring-yellow-500" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="manual">Manual Order</option>
              <option value="updated-desc">Recently Updated</option>
              <option value="created-desc">Newest First</option>
              <option value="created-asc">Oldest First</option>
            </select>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSync} disabled={isSyncing} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8 sm:h-10 sm:w-10" title="Sync Stickies">
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8 sm:h-10 sm:w-10" title="Settings">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button 
            onClick={() => handleNewStickyClick()}
            className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold shadow-[0_0_15px_rgba(234,179,8,0.3)] h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">New Sticky</span><span className="sm:hidden">New</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-zinc-400 hover:text-white lg:hidden h-8 w-8 sm:h-10 sm:w-10">
            <PanelLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative bg-[#5c4033]">
        {/* Faint Corkboard Texture Background */}
        <div className="absolute inset-0 opacity-20 mix-blend-multiply pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

        {/* Sidebar Categories */}
        <div className={`
          absolute lg:relative z-20 h-full bg-zinc-950 border-r border-zinc-800 transition-all duration-300 ease-in-out flex flex-col overflow-hidden
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-0'}
        `}>
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between min-w-[16rem]">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="h-6 w-6 text-zinc-400 hover:bg-zinc-800 lg:hidden" title="Close Sidebar">
                <PanelLeftClose className="w-4 h-4" />
              </Button>
              <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">Categories</h2>
              <Button variant="outline" size="sm" onClick={() => setExpandAll(!expandAll)} className="h-5 px-1.5 text-[9px] bg-zinc-900 border-zinc-700 hover:bg-zinc-800 uppercase tracking-widest ml-1">{expandAll ? 'Collapse' : 'Show All'}</Button>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsNotebookModalOpen(true)} className="h-6 w-6 text-emerald-500 hover:bg-emerald-500/20" title="New Category">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 min-w-[16rem]">
            <div className="p-3 space-y-2">
              <button 
                onClick={() => handleCategorySelect(() => { setSelectedSection(null); setSelectedNotebook(null); setExpandedNotebook(null); })}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!selectedSection && !selectedNotebook ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
              >
                <div className="flex items-center gap-3"><LayoutDashboard className="w-4 h-4 shrink-0" /> All Stickies</div>
                <span className="text-xs opacity-50 ml-2">{notesStore.notes.filter(n => !prefs.isolate || n.tags?.includes('__corkboard__')).length}</span>
              </button>
              
              {notesStore.notebooks.map(nb => {
                const nbStickies = notesStore.notes.filter(n => (!prefs.isolate || n.tags?.includes('__corkboard__')) && n.section_id && notesStore.sections.find(s => s.id === n.section_id)?.notebook_id === nb.id).length;
                return (
                <div key={nb.id} className="space-y-1">
                  <div className="flex items-center group">
                    <button 
                      onClick={() => handleCategorySelect(() => { setSelectedNotebook(nb.id); setSelectedSection(null); setExpandedNotebook(expandedNotebook === nb.id ? null : nb.id); })}
                      className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedNotebook === nb.id && !selectedSection ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                    >
                      <div className="flex items-center gap-3 truncate"><Folder className="w-4 h-4 shrink-0" /> <span className="truncate">{nb.name}</span></div>
                      <span className="text-xs opacity-50 ml-2">{nbStickies}</span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 opacity-50 hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white z-[400]">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditNotebook(nb); }}><Edit2 className="w-4 h-4 mr-2"/> Edit Category</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteNotebook(nb.id); }} className="text-red-400 hover:text-red-300 hover:bg-red-400/10"><Trash2 className="w-4 h-4 mr-2"/> Delete Category</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setExpandedNotebook(expandedNotebook === nb.id ? null : nb.id); }}
                      className="p-2 text-zinc-500 hover:text-zinc-300"
                    >
                      {expandedNotebook === nb.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                  {(expandedNotebook === nb.id || expandAll) && (
                    <div className="pl-6 pr-2 space-y-1">
                      {notesStore.sections.filter(s => s.notebook_id === nb.id).map(sec => {
                        const secStickies = notesStore.notes.filter(n => (!prefs.isolate || n.tags?.includes('__corkboard__')) && n.section_id === sec.id).length;
                        return (
                        <div key={sec.id} className="flex items-center group">
                          <button 
                            onClick={() => handleCategorySelect(() => setSelectedSection(sec.id))}
                            className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedSection === sec.id ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 font-medium'}`}
                          >
                            <div className="flex items-center gap-3 truncate"><FileText className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{sec.name}</span></div>
                            <span className="text-xs opacity-50 ml-2">{secStickies}</span>
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 opacity-50 hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-opacity">
                                <MoreVertical className="w-3 h-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white z-[400]">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditSection(sec); }}><Edit2 className="w-4 h-4 mr-2"/> Edit Submenu</DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec.id); }} className="text-red-400 hover:text-red-300 hover:bg-red-400/10"><Trash2 className="w-4 h-4 mr-2"/> Delete Submenu</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )})}
                      <button 
                        onClick={() => { setSelectedNbForNewSection(nb.id); setIsSectionModalOpen(true); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors mt-1"
                      >
                        <Plus className="w-3 h-3" /> Add Submenu
                      </button>
                    </div>
                  )}
                </div>
              )})}
            </div>
          </ScrollArea>
        </div>

        {/* Main Board */}
        <div className="flex-1 overflow-y-auto p-8 relative z-10">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className={`fixed bottom-6 left-6 z-[60] rounded-full shadow-2xl bg-zinc-950 border-zinc-800 text-white hover:bg-zinc-800 ${isSidebarOpen ? 'lg:hidden' : ''}`}
          >
            <PanelLeftClose className={`w-5 h-5 transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`} />
          </Button>

          {/* Quick Note Bar */}
          <div className="mb-8 max-w-2xl mx-auto mt-2">
            <div 
              onClick={() => handleNewStickyClick()}
              className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-xl shadow-lg p-3 sm:p-4 flex items-center justify-between cursor-text transition-colors group"
            >
              <span className="text-zinc-400 font-medium ml-2">Take a note...</span>
              <div className="flex gap-1 sm:gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleImageSelect(true); }} className="h-8 w-8 hover:bg-zinc-800"><ImageIcon className="w-4 h-4 text-zinc-300" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800"><CheckSquare className="w-4 h-4 text-zinc-300" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800"><Palette className="w-4 h-4 text-zinc-300" /></Button>
              </div>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {activeNotes.filter(n => n.is_pinned).length > 0 && (
              <div className="mb-12">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 ml-2">Pinned</h3>
                <SortableContext items={activeNotes.filter(n => n.is_pinned).map(n => n.id)} strategy={rectSortingStrategy}>
                  <div className={`grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${isMasonry ? 'items-start' : 'items-stretch'}`}>
                    {activeNotes.filter(n => n.is_pinned).map(note => {
                      const sectionName = notesStore.sections.find(s => s.id === note.section_id)?.name;
                      return (
                        <SortableSticky 
                          key={`${note.id}-${note.is_pinned}`} 
                          note={note} 
                          sectionName={sectionName}
                          onEdit={handleEditNote} 
                          onDelete={handleDeleteNote} 
                          onSendToNotes={handleSendToNotes} 
                          onDuplicate={handleDuplicateNote}
                          onChangeColor={handleChangeColor}
                          onToggleCheckboxes={handleToggleCheckboxes}
                          onTogglePin={handleTogglePin}
                          showTags={true}
                          showToolbar={prefs.toolbar}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </div>
            )}
            
            {activeNotes.filter(n => !n.is_pinned).length > 0 && (
              <div>
                {activeNotes.filter(n => n.is_pinned).length > 0 && <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 ml-2 mt-8">Others</h3>}
                <SortableContext items={activeNotes.filter(n => !n.is_pinned).map(n => n.id)} strategy={rectSortingStrategy}>
                  <div className={`grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${isMasonry ? 'items-start' : 'items-stretch'}`}>
                    {activeNotes.filter(n => !n.is_pinned).map(note => {
                      const sectionName = notesStore.sections.find(s => s.id === note.section_id)?.name;
                      return (
                        <SortableSticky 
                          key={`${note.id}-${note.is_pinned}`} 
                          note={note} 
                          sectionName={sectionName}
                          onEdit={handleEditNote} 
                          onDelete={handleDeleteNote} 
                          onSendToNotes={handleSendToNotes} 
                          onDuplicate={handleDuplicateNote}
                          onChangeColor={handleChangeColor}
                          onToggleCheckboxes={handleToggleCheckboxes}
                          onTogglePin={handleTogglePin}
                          showTags={true}
                          showToolbar={prefs.toolbar}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </div>
            )}
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
        const outsideColorId = editingNote.tags?.find(t => t.startsWith('__color:'))?.split(':')[1]?.replace('__', '') || STICKY_COLORS[(editingNote.id === 'new' ? 'A' : editingNote.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6]?.id || 'yellow';
        const insideColorTagId = editingNote.tags?.find(t => t.startsWith('__inside_color:'))?.split(':')[1]?.replace('__', '') || 'gray';
        const editColorId = prefs.matchColor ? outsideColorId : insideColorTagId;
        const editColor = STICKY_COLORS.find(c => c.id === editColorId) || STICKY_COLORS.find(c => c.id === 'gray')!;
        
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
              <div className={`px-6 py-3 border-b border-black/10 ${editColor.bg} flex flex-wrap gap-2`}>
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

            <div 
              className="p-6 flex-1 flex flex-col gap-4 overflow-hidden"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                  const newTags = [...(editingNote.tags || [])];
                  Array.from(files).forEach(file => {
                    if (file.type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const base64 = ev.target?.result as string;
                        setEditingNote(prev => prev ? ({ ...prev, tags: [...(prev.tags || []), `__img:${base64}`] }) : null);
                      };
                      reader.readAsDataURL(file);
                    }
                  });
                }
              }}
            >
              {(() => {
                const tagImages = editingNote.tags?.filter(t => t.startsWith('__img:')).map(t => t.replace('__img:', '')) || [];
                const contentImages = editingNote.content ? [...editingNote.content.matchAll(/!\[.*?\]\((https?:\/\/[^\)]+)\)/g)].map(m => m[1]) : [];
                const images = [...tagImages, ...contentImages];
                if (images.length > 0) {
                  return (
                    <div className="shrink-0">
                      <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        {images.map((img, i) => (
                          <div key={i} className="relative group">
                            <img src={img} alt="attachment" className="w-full h-32 sm:h-48 object-cover rounded shadow-sm bg-white/20" />
                            <Button 
                              variant="destructive" 
                              size="icon" 
                              className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                if (img.startsWith('data:')) {
                                  const newTags = editingNote.tags?.filter(t => t !== `__img:${img}`);
                                  setEditingNote({ ...editingNote, tags: newTags });
                                } else {
                                  const imageRegex = new RegExp(`!\\\\[.*?\\\\]\\\\(` + img.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + `\\\\)`, 'g');
                                  const updatedContent = editingNote.content.replace(imageRegex, '');
                                  setEditingNote({ ...editingNote, content: updatedContent });
                                }
                              }}
                              title="Remove Image"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
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
                <div className={`flex-1 relative flex overflow-hidden rounded-md border ${editColor.border} bg-black/5`}>
                  {/* Gutter Background */}
                  <div className={`absolute top-0 bottom-0 left-0 w-8 border-r ${editColor.border} opacity-30 pointer-events-none z-10`} />
                  
                  {/* Gutter Icons */}
                  <div className="absolute top-0 bottom-0 left-0 w-8 overflow-hidden z-20 pointer-events-none">
                    <div style={{ transform: `translateY(-${scrollTop}px)` }}>
                      {lineTops.map(line => (
                        <div key={line.index} className="absolute left-0 right-0 pointer-events-auto flex items-start justify-center group" style={{ top: line.top, height: line.height }}>
                          {(line.isList || line.status !== 'none') ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger className={`mt-[4px] w-6 h-6 flex items-center justify-center rounded hover:bg-black/10 transition-colors ${line.status === 'none' ? 'opacity-40 hover:opacity-100' : ''}`}>
                                 {line.status === 'done' ? '✅' : line.status === 'waiting' ? '⏳' : line.status === 'cancelled' ? '❌' : '⬜'}
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" side="right" className="min-w-0 w-40 bg-zinc-900 border-zinc-800 text-white z-[400]">
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '✅')}><span className="mr-2">✅</span> Done</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '⬜')}><span className="mr-2">⬜</span> To Do</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '⏳')}><span className="mr-2">⏳</span> Waiting</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '❌')}><span className="mr-2">❌</span> Not Done</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800 text-red-400" onClick={() => handleSetStatus(line.index, 'none')}><span className="mr-2 pl-4"></span> Remove Status</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger className="mt-[4px] w-6 h-6 flex items-center justify-center rounded hover:bg-black/10 opacity-0 group-hover:opacity-40 transition-opacity">
                                 ⬜
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" side="right" className="min-w-0 w-40 bg-zinc-900 border-zinc-800 text-white z-[400]">
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '✅')}><span className="mr-2">✅</span> Done</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '⬜')}><span className="mr-2">⬜</span> To Do</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '⏳')}><span className="mr-2">⏳</span> Waiting</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '❌')}><span className="mr-2">❌</span> Not Done</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Textarea 
                    ref={textareaRef}
                    value={getCleanContent(editingNote.content)} 
                    onChange={e => {
                      const newText = e.target.value;
                      const splitIndex = editingNote.content.search(/!\[.*?\]\(https?:\/\/[^\)]+\)/);
                      if (splitIndex === -1) {
                        setEditingNote({ ...editingNote, content: newText });
                      } else {
                        const imagesPart = editingNote.content.substring(splitIndex);
                        setEditingNote({ ...editingNote, content: newText + imagesPart });
                      }
                    }}
                    onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
                    className={`flex-1 resize-none bg-transparent border-none text-inherit placeholder:text-inherit placeholder:opacity-50 focus-visible:ring-0 p-4 pl-10 text-base leading-relaxed`}
                    placeholder="Write something (use # headers to create section links)..."
                  />

                  {/* Mirror Div for height calculations */}
                  <div 
                    ref={mirrorRef} 
                    className="absolute top-0 left-0 p-4 pl-10 text-base leading-relaxed whitespace-pre-wrap break-words opacity-0 pointer-events-none -z-10"
                    aria-hidden
                  >
                    {getCleanContent(editingNote.content).split('\n').map((line, i) => (
                      <div key={i} className="min-h-[1.5em]">{line || ' '}</div>
                    ))}
                  </div>
                </div>
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
                  <option className="bg-zinc-900 text-white" value="">No Category</option>
                  {notesStore.notebooks.map(nb => (
                    <optgroup className="bg-zinc-900 text-zinc-400 font-bold" key={nb.id} label={nb.name}>
                      {notesStore.sections.filter(s => s.notebook_id === nb.id).map(sec => (
                        <option className="bg-zinc-800 text-white" key={sec.id} value={sec.id}>{sec.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
            <div className={`p-4 border-t border-black/10 flex justify-between items-center ${editColor.bg} brightness-95`}>
              <div className="flex gap-2">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className={`h-9 w-9 ${editColor.text} ${editingNote.is_pinned ? 'bg-black/20' : ''} hover:bg-black/10`} 
                  title={editingNote.is_pinned ? "Unpin" : "Pin to Top"}
                  onClick={async () => {
                    const newPinned = !editingNote.is_pinned;
                    setEditingNote({ ...editingNote, is_pinned: newPinned });
                    if (editingNote.id !== 'new') {
                      await handleTogglePin(editingNote);
                    }
                  }}
                >
                  <Pin className={`w-5 h-5 ${editingNote.is_pinned ? 'fill-current' : ''}`} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleImageSelect(false)} className={`h-9 w-9 ${editColor.text} hover:bg-black/10`} title="Add Image">
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className={`h-9 w-9 ${editColor.text} hover:bg-black/10`}>
                      <Palette className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 bg-zinc-900 border-zinc-800 p-2 grid grid-cols-4 gap-2 z-[400]">
                    {STICKY_COLORS.map(c => (
                      <div key={c.id} onClick={() => {
                        let newTags = editingNote.tags?.filter(t => !t.startsWith('__inside_color:')) || [];
                        newTags.push(`__inside_color:${c.id}__`);
                        if (prefs.matchColor) {
                          newTags = newTags.filter(t => !t.startsWith('__color:'));
                          newTags.push(`__color:${c.id}__`);
                        }
                        setEditingNote({...editingNote, tags: newTags});
                      }} className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                        (prefs.matchColor ? editingNote.tags?.includes(`__color:${c.id}__`) : editingNote.tags?.includes(`__inside_color:${c.id}__`)) 
                          ? 'border-white' : 'border-transparent'
                      } ${c.bg}`} />
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
                    <DropdownMenuItem onClick={() => { 
                      if (editingNote.id === 'new') {
                        setIsNoteModalOpen(false);
                      } else {
                        handleDeleteNote(editingNote.id); 
                        setIsNoteModalOpen(false); 
                      }
                    }}>Delete note</DropdownMenuItem>
                    {editingNote.id !== 'new' && (
                      <DropdownMenuItem onClick={() => handleDuplicateNote(editingNote)}>Make a copy</DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(editingNote.content); toast({ title: "Copied to clipboard" }); }}>Copy to Google Docs</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                  <div className="font-bold text-white text-sm">Match Interior Color</div>
                  <div className="text-xs text-zinc-500">Make the open sticky note match its outside color</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={prefs.matchColor} onChange={e => updatePref('matchColor', e.target.checked)} />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">Show Toolbar</div>
                  <div className="text-xs text-zinc-500">Display quick-action menu options on hover</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={prefs.toolbar} onChange={e => updatePref('toolbar', e.target.checked)} />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <Button 
                  variant="destructive" 
                  onClick={async () => {
                    if (activeNotes.length === 0) {
                      toast({ title: "Nothing to clean up!" });
                      return;
                    }
                    const message = selectedSection ? "Delete ALL stickies in this specific category?" 
                                  : selectedNotebook ? "Delete ALL stickies in this entire folder?" 
                                  : "WARNING: Delete ALL stickies currently visible on the board?";
                    if (confirm(message)) {
                      for (const note of activeNotes) {
                        await notesStore.deleteNote(note.id);
                      }
                      toast({ title: "Cleaned up successfully" });
                    }
                  }}
                  className="w-full bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Clean Up Category
                </Button>
                <p className="text-[10px] text-zinc-500 mt-2 text-center">Deletes all stickies currently visible on the board. This action cannot be undone.</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
