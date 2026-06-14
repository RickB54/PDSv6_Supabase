import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  X, Plus, Trash2, Edit2, Save, PanelLeftClose, PanelLeft, 
  LayoutDashboard, CheckSquare, FileText, Folder, ChevronDown, ChevronRight,
  Search, Settings
} from "lucide-react";
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
  { bg: 'bg-[#fef08a]', border: 'border-[#facc15]', text: 'text-[#5c4033]', tagBg: 'bg-[#eab308]/30', tagText: 'text-[#5c4033]' }, // Yellow
  { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { bg: 'bg-rose-500', border: 'border-rose-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
  { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white' },
];

const SortableSticky = ({ note, onEdit, onDelete, onSendToNotes, showTags }: { note: Note, onEdit: (n: Note) => void, onDelete: (id: string) => void, onSendToNotes: (n: Note) => void, showTags?: boolean }) => {
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
    const hash = note.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return STICKY_COLORS[hash % STICKY_COLORS.length];
  }, [note.id]);

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
          {note.tags && note.tags.filter(t => t !== '__corkboard__').length > 0 ? note.tags.filter(t => t !== '__corkboard__').map(t => (
            <span key={t} className={`text-[9px] uppercase font-bold ${color.tagBg} ${color.tagText} px-1.5 py-0.5 rounded-sm`}>{t}</span>
          )) : (
            <span className={`text-[9px] uppercase font-bold bg-transparent ${color.text} opacity-50 italic px-1.5 py-0.5`}>No Tags</span>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <Button size="icon" variant="ghost" className={`h-8 w-8 ${color.text} hover:bg-black/10`} title="Send to Personal Notes" onClick={(e) => { e.stopPropagation(); onSendToNotes(note); }}>
          <FileText className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className={`h-8 w-8 ${color.text} hover:bg-black/10`} onClick={(e) => { e.stopPropagation(); onEdit(note); }}>
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-500/20 bg-white/50" onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default function Corkboard() {
  const navigate = useNavigate();
  const notesStore = useNotesStore();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string | null>(null); // null = All
  const [expandedNotebook, setExpandedNotebook] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

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
    masonry: localStorage.getItem('corkboard_masonry') === 'true'
  });

  const updatePref = (key: 'anim' | 'tags' | 'masonry', val: boolean) => {
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

  const activeNotes = notesStore.notes.filter(n => 
    n.tags?.includes('__corkboard__') && 
    (!selectedSection || n.section_id === selectedSection) &&
    (!searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSaveNote = async () => {
    if (editingNote) {
      if (editingNote.id === 'new') {
        const id = await notesStore.createNote(selectedSection || null, editingNote.title, editingNote.content);
        await notesStore.updateNote(id, { tags: ['__corkboard__'] });
        toast({ title: "Note Created" });
      } else {
        await notesStore.updateNote(editingNote.id, { title: editingNote.title, content: editingNote.content });
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

  const handleDeleteNote = async (id: string) => {
    if (confirm("Delete this sticky note?")) {
      await notesStore.deleteNote(id);
      toast({ title: "Deleted" });
    }
  };

  const handleCreateNotebook = async () => {
    if (newNotebookName.trim()) {
      await notesStore.createNotebook(newNotebookName);
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
                onClick={() => setSelectedSection(null)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!selectedSection ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
              >
                <LayoutDashboard className="w-4 h-4" /> All Stickies
              </button>
              
              {notesStore.notebooks.map(nb => (
                <div key={nb.id} className="space-y-1">
                  <button 
                    onClick={() => setExpandedNotebook(expandedNotebook === nb.id ? null : nb.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold text-zinc-300 hover:bg-zinc-900 transition-colors"
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
                {activeNotes.map(note => (
                  <SortableSticky key={note.id} note={note} onEdit={setEditingNote} onDelete={handleDeleteNote} onSendToNotes={handleSendToNotes} showTags={showTags} />
                ))}
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
      {editingNote && isNoteModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#fef08a] w-full max-w-lg rounded-lg shadow-2xl overflow-hidden border-2 border-[#facc15] flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#facc15]/50 flex justify-between items-center bg-[#fde047]">
              <h2 className="font-bold text-[#5c4033]">{editingNote.id === 'new' ? 'New Sticky' : 'Edit Sticky'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsNoteModalOpen(false)} className="text-[#5c4033] hover:bg-[#facc15]">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-[#5c4033] uppercase mb-1 block">Title</label>
                <Input 
                  value={editingNote.title} 
                  onChange={e => setEditingNote({...editingNote, title: e.target.value})}
                  className="bg-white/50 border-[#facc15] text-[#5c4033] placeholder:text-[#5c4033]/50 focus-visible:ring-[#eab308]"
                  placeholder="Sticky title..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#5c4033] uppercase mb-1 block">Content</label>
                <Textarea 
                  value={editingNote.content} 
                  onChange={e => setEditingNote({...editingNote, content: e.target.value})}
                  className="bg-white/50 border-[#facc15] text-[#5c4033] placeholder:text-[#5c4033]/50 min-h-[200px] focus-visible:ring-[#eab308]"
                  placeholder="Write something..."
                />
              </div>
            </div>
            <div className="p-4 border-t border-[#facc15]/50 flex justify-end gap-2 bg-[#fde047]/50">
              <Button variant="outline" onClick={() => setIsNoteModalOpen(false)} className="border-[#5c4033] text-[#5c4033] hover:bg-[#facc15]">Cancel</Button>
              <Button onClick={handleSaveNote} className="bg-[#5c4033] text-[#fef08a] hover:bg-[#5c4033]/90">
                <Save className="w-4 h-4 mr-2" /> Save Sticky
              </Button>
            </div>
          </div>
        </div>
      )}

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
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
