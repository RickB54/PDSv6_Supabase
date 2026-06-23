import React, { useEffect, useState, useRef, useMemo } from "react";
import { 
  X, Plus, Trash2, Edit2, Save, PanelLeftClose, PanelLeft, 
  LayoutDashboard, CheckSquare, Square, FileText, Folder, ChevronDown, ChevronRight, ChevronUp,
  Search, Settings, Palette, MoreVertical, Copy, ArrowUp, Pin, RefreshCw, Image as ImageIcon,
  GripVertical, LayoutGrid, List, Sliders, HelpCircle, Bell, Clock, ArrowLeft, Tag, Type,
  Archive, Mic, MicOff, Eye, PinOff
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNotesStore, Note, Section, Notebook } from "@/store/notes";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "@/hooks/use-toast";

// --- Sortable Sticky Note Component ---
const STICKY_COLORS = [
  { id: 'yellow', bg: 'bg-[#fef08a]', border: 'border-[#facc15]', text: 'text-[#5c4033]', tagBg: 'bg-[#eab308]/30', tagText: 'text-[#5c4033]', textRing: '#5c4033' },
  { id: 'blue', bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'emerald', bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'rose', bg: 'bg-rose-500', border: 'border-rose-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'purple', bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'deepblue', bg: 'bg-[#1e3a8a]', border: 'border-[#1e40af]', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'orange', bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'gray', bg: 'bg-zinc-700', border: 'border-zinc-600', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'teal', bg: 'bg-teal-600', border: 'border-teal-500', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'indigo', bg: 'bg-indigo-500', border: 'border-indigo-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'pink', bg: 'bg-pink-400', border: 'border-pink-300', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'cyan', bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'amber', bg: 'bg-amber-400', border: 'border-amber-300', text: 'text-amber-950', tagBg: 'bg-amber-900/20', tagText: 'text-amber-950', textRing: '#451a03' },
  { id: 'lime', bg: 'bg-lime-400', border: 'border-lime-300', text: 'text-lime-950', tagBg: 'bg-lime-900/20', tagText: 'text-lime-950', textRing: '#1a2e05' },
  { id: 'fuchsia', bg: 'bg-fuchsia-500', border: 'border-fuchsia-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'violet', bg: 'bg-violet-600', border: 'border-violet-500', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'red', bg: 'bg-red-500', border: 'border-red-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'green', bg: 'bg-green-600', border: 'border-green-500', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'slate', bg: 'bg-slate-600', border: 'border-slate-500', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'sky', bg: 'bg-sky-400', border: 'border-sky-300', text: 'text-sky-950', tagBg: 'bg-sky-900/20', tagText: 'text-sky-950', textRing: '#0c4a6e' },
  { id: 'stone', bg: 'bg-stone-500', border: 'border-stone-400', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'brown', bg: 'bg-[#8B4513]', border: 'border-[#A0522D]', text: 'text-white', tagBg: 'bg-white/30', tagText: 'text-white', textRing: '#ffffff' },
  { id: 'mint', bg: 'bg-[#98FF98]', border: 'border-[#7FFFD4]', text: 'text-[#004d00]', tagBg: 'bg-[#004d00]/20', tagText: 'text-[#004d00]', textRing: '#004d00' },
  { id: 'black', bg: 'bg-black', border: 'border-zinc-700', text: 'text-white', tagBg: 'bg-white/20', tagText: 'text-white', textRing: '#ffffff' },
];


const STATUS_MARKERS: Record<string, string> = {
  '✅': '\u200B\u200C\u200D\u200E',
  '⬜': '\u200B\u200C\u200D\u200F',
  '⏳': '\u200B\u200C\u200E\u200F',
  '❌': '\u200B\u200D\u200E\u200F',
};
const INVISIBLE_REGEX = /^(\u200B\u200C\u200D\u200E|\u200B\u200C\u200D\u200F|\u200B\u200C\u200E\u200F|\u200B\u200D\u200E\u200F)/;

const getCleanContent = (content: string) => {
  if (!content) return "";
  const splitIndex = content.search(/!\[.*?\]\(https?:\/\/[^\)]+\)/);
  if (splitIndex === -1) return content;
  return content.substring(0, splitIndex).trim();
};

const getBoardDisplayContent = (content: string) => {
  if (!content) return "";
  const cleaned = getCleanContent(content);
  return cleaned.split('\n').map(line => {
    if (line.startsWith(STATUS_MARKERS['✅'])) return '✅ ' + line.substring(4);
    if (line.startsWith(STATUS_MARKERS['⬜'])) return '⬜ ' + line.substring(4);
    if (line.startsWith(STATUS_MARKERS['⏳'])) return '⏳ ' + line.substring(4);
    if (line.startsWith(STATUS_MARKERS['❌'])) return '❌ ' + line.substring(4);
    return line;
  }).join('\n');
};

export const getReminderData = (note: Note) => {
  const tag = note.tags?.find(t => t.startsWith('__reminder:'));
  if (!tag) return null;
  const content = tag.substring(11, tag.length - 2); // strip __reminder: and __
  const [date, time, repeat, sound, popup] = content.split('|');
  return { date, time, repeat: repeat || 'none', sound: sound !== 'false', popup: popup !== 'false' };
};

export const getFullSectionName = (notesStore: any, secId: string) => {
  const sec = notesStore.sections.find((s: any) => s.id === secId);
  if (!sec) return "";
  const nb = notesStore.notebooks.find((n: any) => n.id === sec.notebook_id);
  if (!nb || nb.name === sec.name) return sec.name;
  return `${nb.name} / ${sec.name}`;
};

const formatAmPm = (timeStr: string) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour}:${m} ${ampm}`;
};

const SortableSticky = React.memo(({ note, animClass, sectionName, isMasonry, onEdit, onDelete, onSendToNotes, onDuplicate, onChangeColor, onToggleCheckboxes, onTogglePin, onImageClick, showTags, showToolbar, onChangeLabels, onOpenSettings }: { note: Note, animClass?: string, sectionName?: string, isMasonry?: boolean, onEdit: (n: Note) => void, onDelete: (id: string) => void, onSendToNotes: (n: Note) => void, onDuplicate: (n: Note) => void, onChangeColor: (n: Note, colorId: string) => void, onToggleCheckboxes: (n: Note) => void, onTogglePin: (n: Note) => void, onImageClick: (img: string) => void, showTags?: boolean, showToolbar?: boolean, onChangeLabels?: (n: Note) => void, onOpenSettings?: () => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: note.id });
  const notesStore = useNotesStore();

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
    // Default: black
    return STICKY_COLORS.find(c => c.id === 'black') || STICKY_COLORS[0];
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
        relative group p-5 rounded shadow-lg transition-all duration-200 flex flex-col cursor-pointer
        ${isDragging ? 'shadow-2xl scale-105 opacity-90' : 'hover:shadow-xl hover:-translate-y-1'}
        ${color.bg} ${color.border} ${color.text} border
        ${animClass || ''}
        ${isMasonry ? 'break-inside-avoid mb-8' : ''}
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
                  <img 
                    key={i} 
                    src={img} 
                    alt="attachment" 
                    className="w-full h-24 object-cover rounded shadow-sm bg-white/20 cursor-zoom-in hover:brightness-95 transition-all" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageClick(img);
                    }}
                  />
                ))}
              </div>
            );
          }
          return null;
        })()}
        <h3 className="font-bold text-xl leading-tight mb-2">
          <span
            className="line-clamp-3 inline"
            title={note.title && note.title.length > 80 ? note.title : undefined}
          >{note.title}</span>
          <span className="text-[10px] opacity-50 font-normal ml-2 tracking-widest whitespace-nowrap align-middle">
            {new Date(note.created_at || '').toLocaleDateString()} {new Date(note.created_at || '').toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
        </h3>
        <p className="text-base opacity-80 whitespace-pre-wrap line-clamp-[12] max-h-[320px] overflow-hidden">{getBoardDisplayContent(note.content)}</p>
      </div>
      {(() => {
        const reminder = getReminderData(note);
        const cardSections = [
          ...(note.section_id ? [note.section_id] : []),
          ...(note.tags?.filter(t => t.startsWith('__section:')).map(t => t.replace('__section:', '')) || [])
        ];
        const uniqueCardSections = Array.from(new Set(cardSections));
        
        return (
          <>
            {reminder && (
              <div className={`mt-2 flex items-center gap-1.5 text-[10px] font-bold ${color.text} opacity-75`}>
                <Bell className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span>
                  {reminder.date} {formatAmPm(reminder.time)}
                  {reminder.repeat !== 'none' && ` (${reminder.repeat})`}
                </span>
              </div>
            )}
            {(showTags && (note.tags?.filter(t => !t.startsWith('__') || t === '__archived__').length > 0 || (uniqueCardSections.length === 0 && !note.section_id))) || uniqueCardSections.length > 0 || sectionName ? (
              <div className="mt-4 pt-4 border-t border-black/10 flex flex-wrap items-center gap-1">
                {note.tags?.includes('__archived__') && (
                  <span className={`text-[9px] uppercase font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-sm`}>Archived</span>
                )}
                {uniqueCardSections.length > 0 ? (
                  uniqueCardSections.map(secId => {
                    const sec = notesStore.sections.find(s => s.id === secId);
                    if (!sec) return null;
                    return (
                      <span key={secId} className={`inline-flex items-center text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border border-black/15 bg-black/5 ${color.text} select-none`}>
                        {getFullSectionName(notesStore, secId)}
                      </span>
                    );
                  })
                ) : sectionName ? (
                  <span className={`inline-flex items-center text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border border-black/15 bg-black/5 ${color.text} select-none`}>{sectionName}</span>
                ) : null}
                {showTags && note.tags && note.tags.filter(t => !t.startsWith('__')).length > 0 && note.tags.filter(t => !t.startsWith('__')).map(t => (
                  <span key={t} className={`text-[9px] uppercase font-bold ${color.tagBg} ${color.tagText} px-1.5 py-0.5 rounded-sm`}>{t}</span>
                ))}
                {showTags && (!note.tags || note.tags.filter(t => !t.startsWith('__')).length === 0) && !note.tags?.includes('__archived__') && uniqueCardSections.length === 0 && !sectionName && (
                  <span className={`text-[9px] uppercase font-bold bg-transparent ${color.text} opacity-50 italic px-1.5 py-0.5`}>No Tags</span>
                )}
              </div>
            ) : null}
          </>
        );
      })()}

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
                  <div
                    key={c.id}
                    onClick={() => onChangeColor(note, c.id)}
                    className={`w-8 h-8 rounded-full cursor-pointer ${c.bg}`}
                    style={{
                      outline: note.tags?.includes(`__color:${c.id}__`) ? '2px solid white' : 'none',
                      outlineOffset: '2px',
                      boxShadow: `0 0 0 3px ${c.textRing || '#fff'}`
                    }}
                    title={c.id}
                  />
                ))}

              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="icon" variant="ghost" className={`h-8 w-8 ${color.text} hover:bg-black/10`} title="Send to Personal Notes" onClick={(e) => { e.stopPropagation(); onSendToNotes(note); }}>
              <FileText className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className={`h-8 w-8 ${color.text} hover:bg-black/10`} title="Open Settings" onClick={(e) => { e.stopPropagation(); onOpenSettings?.(); }}>
              <Settings className="w-4 h-4" />
            </Button>
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
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onChangeLabels?.(note); }}>Change tags</DropdownMenuItem>
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
});

// --- Sortable List Row Component ---
const SortableListRow = React.memo(({ 
  note, 
  animClass,
  sectionName, 
  onEdit, 
  onDelete, 
  onSendToNotes, 
  onDuplicate, 
  onChangeColor, 
  onTogglePin, 
  showToolbar,
  onChangeLabels,
  onOpenSettings
}: { 
  note: Note, 
  animClass?: string,
  sectionName?: string, 
  onEdit: (n: Note) => void, 
  onDelete: (id: string) => void, 
  onSendToNotes: (n: Note) => void, 
  onDuplicate: (n: Note) => void, 
  onChangeColor: (n: Note, colorId: string) => void, 
  onTogglePin: (n: Note) => void, 
  showToolbar?: boolean,
  onChangeLabels?: (n: Note) => void,
  onOpenSettings?: () => void
}) => {
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

  const color = React.useMemo(() => {
    const colorTag = note.tags?.find(t => t.startsWith('__color:'));
    if (colorTag) {
      const colorId = colorTag.split(':')[1].replace('__', '');
      const found = STICKY_COLORS.find(c => c.id === colorId);
      if (found) return found;
    }
    return STICKY_COLORS.find(c => c.id === 'black') || STICKY_COLORS[0];

  }, [note.id, note.tags]);

  const timestamp = React.useMemo(() => {
    const dateStr = note.updated_at || note.created_at;
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }, [note.updated_at, note.created_at]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit(note)}
      className={`
        relative group flex items-center gap-3 p-3 rounded-lg bg-zinc-900/90 border border-zinc-800/80 transition-all duration-200 cursor-pointer select-none
        ${isDragging ? 'shadow-2xl scale-[1.01] opacity-90 border-zinc-700 bg-zinc-800' : 'hover:bg-zinc-800/50 hover:border-zinc-700'}
        ${animClass || ''}
      `}
    >
      {/* Sticky color vertical accent bar */}
      <div className={`w-1.5 self-stretch rounded-full ${color.bg} shrink-0`} style={{ minHeight: '1.75rem' }} />

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: 'none' }}
        className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Title & Timestamp content area */}
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
        {/* Title: 1 or 2 lines */}
        <h4 className="font-semibold text-zinc-100 text-base leading-tight line-clamp-2">
          {note.title || <span className="italic opacity-50 text-zinc-400">Untitled Sticky</span>}
        </h4>
        
        {/* Timestamp & Section */}
        <div className="flex items-center gap-2 shrink-0">
          {note.tags?.includes('__archived__') && (
            <span className="text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Archived
            </span>
          )}
          {(() => {
            const reminder = getReminderData(note);
            return reminder ? (
              <span className="flex items-center gap-1 text-[9px] font-bold bg-zinc-850 text-yellow-500 border border-yellow-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                <Bell className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                {reminder.date} {formatAmPm(reminder.time)}
              </span>
            ) : null;
          })()}
          {sectionName && (
            <span className="text-[9px] font-bold bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase tracking-wider max-w-[120px] truncate">
              {sectionName}
            </span>
          )}
          <span className="text-xs text-zinc-500 whitespace-nowrap">
            {timestamp}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Pin button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onTogglePin(note)} 
          className="h-8 w-8 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          title="Pin to Top"
        >
          <Pin className={`w-4 h-4 ${note.is_pinned ? 'fill-current text-yellow-500 rotate-45' : ''}`} />
        </Button>

        {/* More Options Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-zinc-300 z-[400]">
            <DropdownMenuItem onClick={() => onEdit(note)}>
              <Edit2 className="w-4 h-4 mr-2" /> Edit Sticky
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onChangeLabels?.(note); }}>
              <Tag className="w-4 h-4 mr-2" /> Change tags
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(note)}>
              <Copy className="w-4 h-4 mr-2" /> Make a copy
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSendToNotes(note)}>
              <FileText className="w-4 h-4 mr-2" /> Send to Personal Notes
            </DropdownMenuItem>
            <div className="border-t border-zinc-800 my-1" />
            <div className="px-2 py-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Change Color</div>
            <div className="px-2 py-1.5 grid grid-cols-5 gap-1.5">
              {STICKY_COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => onChangeColor(note, c.id)}
                  className={`w-6 h-6 rounded-full ${c.bg}`}
                  style={{
                    outline: note.tags?.includes(`__color:${c.id}__`) ? '2px solid white' : 'none',
                    outlineOffset: '1px',
                    boxShadow: `0 0 0 2px ${c.textRing || '#fff'}`
                  }}
                  title={c.id}
                />
              ))}

            </div>
            <div className="border-t border-zinc-800 my-1" />
            <DropdownMenuItem onClick={() => onDelete(note.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

const getAnimClass = (enabled: boolean, style: string, neonBurst = false) => {
  if (!enabled) return '';
  let cls = '';
  switch (style) {
    case 'smooth': cls = 'animate-in zoom-in-95 fade-in duration-700 ease-out'; break;
    case 'pop':    cls = 'animate-in zoom-in-50 fade-in duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]'; break;
    case 'bounce': cls = 'animate-in slide-in-from-top-16 fade-in duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]'; break;
    case 'slide':  cls = 'animate-in slide-in-from-left-16 fade-in duration-700 ease-out'; break;
    case 'flip':   cls = 'slh-flip-in-3d'; break;
    default:       cls = 'animate-in zoom-in-95 fade-in duration-500'; break;
  }
  if (neonBurst) cls += ' drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] saturate-200';
  return cls;
};

export default function StickyNotes({ setActivePage }: { setActivePage: (page: string) => void }) {
  const notesStore = useNotesStore();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null); // null = All
  const [expandedNotebook, setExpandedNotebook] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  const [localNoteOrder, setLocalNoteOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sticky_notes_note_order');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isExiting, setIsExiting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('sticky_notes_view_mode') as 'grid' | 'list') || 'grid');

  const toggleViewMode = () => {
    const next = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(next);
    localStorage.setItem('sticky_notes_view_mode', next);
  };

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [originalNoteSnapshot, setOriginalNoteSnapshot] = useState<Note | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const [isReminderMenuOpen, setIsReminderMenuOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reminderTime, setReminderTime] = useState('18:00');
  const [reminderRepeat, setReminderRepeat] = useState('none');
  const [reminderSound, setReminderSound] = useState(true);
  const [reminderPopup, setReminderPopup] = useState(true);

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setOriginalNoteSnapshot(note);
    setIsReminderMenuOpen(false);

    const rem = getReminderData(note);
    if (rem) {
      setReminderDate(rem.date);
      setReminderTime(rem.time);
      setReminderRepeat(rem.repeat);
      setReminderSound(rem.sound !== undefined ? rem.sound : true);
      setReminderPopup(rem.popup !== undefined ? rem.popup : true);
    } else {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 1);
      setReminderDate(now.toISOString().split('T')[0]);
      setReminderTime(now.toTimeString().split(' ')[0].substring(0, 5));
      setReminderRepeat('none');
      setReminderSound(true);
      setReminderPopup(true);
    }
    setIsNoteModalOpen(true);
  };


  const handleRemoveReminder = () => {
    if (!editingNote) return;
    const tags = (editingNote.tags || []).filter(t => !t.startsWith('__reminder:'));
    setEditingNote({ ...editingNote, tags });
    setIsReminderMenuOpen(false);
    toast({ title: "Reminder removed" });
  };

  const handleSaveCustomReminder = () => {
    if (!editingNote) return;
    const tags = (editingNote.tags || []).filter(t => !t.startsWith('__reminder:'));
    tags.push(`__reminder:${reminderDate}|${reminderTime}|${reminderRepeat}|${reminderSound}|${reminderPopup}__`);

    // Remove from triggered list
    const triggeredStr = localStorage.getItem('sticky_notes_triggered_reminders') || '[]';
    try {
      const triggered = JSON.parse(triggeredStr).filter((id: string) => id !== editingNote.id);
      localStorage.setItem('sticky_notes_triggered_reminders', JSON.stringify(triggered));
    } catch {}

    setEditingNote({ ...editingNote, tags });
    setIsReminderMenuOpen(false);
    toast({ title: `Reminder configured. Make sure to Save Sticky to apply!`, duration: 4000 });
  };

  // New Notebook (Category) Modal
  const [newNotebookName, setNewNotebookName] = useState("");
  const [isNotebookModalOpen, setIsNotebookModalOpen] = useState(false);

  // New Section (Submenu) Modal
  const [newSectionName, setNewSectionName] = useState("");
  const [selectedNbForNewSection, setSelectedNbForNewSection] = useState<string | null>(null);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState(false);
  const [labelSearchText, setLabelSearchText] = useState("");

  const notesWithReminders = useMemo(() => notesStore.notes.filter(n => getReminderData(n) !== null), [notesStore.notes]);

  type DeletePromptState = {
    isOpen: boolean;
    type: 'notebook' | 'section';
    id: string;
    name: string;
    noteCount: number;
  } | null;
  const [deletePrompt, setDeletePrompt] = useState<DeletePromptState>(null);

  const handleAddLabel = async () => {
    const trimmed = labelSearchText.trim();
    if (!trimmed || !editingNote) return;

    const existing = notesStore.sections.find(s => s.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      const newTags = [...(editingNote.tags || [])];
      if (!newTags.includes(`__section:${existing.id}`)) {
        newTags.push(`__section:${existing.id}`);
      }
      const newSectionId = editingNote.section_id || existing.id;
      setEditingNote({ ...editingNote, section_id: newSectionId, tags: newTags });
      setLabelSearchText("");
      return;
    }

    try {
      let targetNbId = notesStore.notebooks[0]?.id;
      if (!targetNbId) {
        const newNb = await notesStore.createNotebook("General");
        targetNbId = newNb.id;
      }
      const newSec = await notesStore.createSection(targetNbId, trimmed);
      if (newSec) {
        const newTags = [...(editingNote.tags || [])];
        if (!newTags.includes(`__section:${newSec.id}`)) {
          newTags.push(`__section:${newSec.id}`);
        }
        const newSectionId = editingNote.section_id || newSec.id;
        setEditingNote({ ...editingNote, section_id: newSectionId, tags: newTags });
      }
      setLabelSearchText("");
      toast({ title: `Label "${trimmed}" created` });
    } catch (err) {
      toast({ title: "Failed to create label", variant: "destructive" });
    }
  };

  const handleToggleLabel = (secId: string) => {
    if (!editingNote) return;
    const isChecked = editingNote.section_id === secId || editingNote.tags?.includes(`__section:${secId}`);
    let newTags = [...(editingNote.tags || [])];
    let newSectionId = editingNote.section_id;

    if (isChecked) {
      newTags = newTags.filter(t => t !== `__section:${secId}`);
      if (newSectionId === secId) {
        const otherSecTag = newTags.find(t => t.startsWith('__section:'));
        if (otherSecTag) {
          newSectionId = otherSecTag.replace('__section:', '');
        } else {
          newSectionId = null;
        }
      }
    } else {
      if (!newTags.includes(`__section:${secId}`)) {
        newTags.push(`__section:${secId}`);
      }
      if (!newSectionId) {
        newSectionId = secId;
      }
    }

    setEditingNote({ ...editingNote, tags: newTags, section_id: newSectionId });
  };

  const handleDeleteLabelFromPopup = async (secId: string) => {
    if (!editingNote) return;
    if (confirm("Are you sure you want to delete this label? This will delete the label category and ALL stickies associated with it.")) {
      await notesStore.deleteSection(secId);
      let newTags = (editingNote.tags || []).filter(t => t !== `__section:${secId}`);
      let newSectionId = editingNote.section_id === secId ? null : editingNote.section_id;
      if (newSectionId === null) {
        const otherSecTag = newTags.find(t => t.startsWith('__section:'));
        if (otherSecTag) {
          newSectionId = otherSecTag.replace('__section:', '');
        }
      }
      setEditingNote({ ...editingNote, tags: newTags, section_id: newSectionId });
      toast({ title: "Tag deleted successfully" });
    }
  };

  const [sortBy, setSortBy] = useState<string>("manual");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");

  const [archiveFilter, setArchiveFilter] = useState<'active'|'archived'|'both'>('active');
  const [pinnedFilter, setPinnedFilter] = useState<'all'|'pinned'|'unpinned'>('all');
  const cyclePinnedFilter = () => {
    if (pinnedFilter === 'all') setPinnedFilter('pinned');
    else if (pinnedFilter === 'pinned') setPinnedFilter('unpinned');
    else setPinnedFilter('all');
  };

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Prefs state for live updates
  const [prefs, setPrefs] = useState({
    anim: localStorage.getItem('sticky_notes_anim') !== 'false',
    tags: localStorage.getItem('sticky_notes_tags') !== 'false',
    masonry: localStorage.getItem('sticky_notes_masonry') === 'true',
    isolate: localStorage.getItem('sticky_notes_isolate') === 'true',
    toolbar: localStorage.getItem('sticky_notes_toolbar') === null ? true : localStorage.getItem('sticky_notes_toolbar') !== 'false',
    matchColor: localStorage.getItem('sticky_notes_match_color') === 'true',
    darkTheme: localStorage.getItem('sticky_notes_dark_theme') === null ? true : localStorage.getItem('sticky_notes_dark_theme') !== 'false',
    showReturnMarkers: localStorage.getItem('sticky_notes_return_markers') === 'true',
    autoLineNumbers: localStorage.getItem('sticky_notes_auto_line_numbers') === 'true',
    showCheckboxes: localStorage.getItem('sticky_notes_show_checkboxes') !== 'false',
    textSize: localStorage.getItem('sticky_notes_text_size') ? parseInt(localStorage.getItem('sticky_notes_text_size')!) : 20,
    lineHeight: localStorage.getItem('sticky_notes_line_height') ? parseFloat(localStorage.getItem('sticky_notes_line_height')!) : 1.625,
  });


  // Animation style: 'smooth' (default), 'pop', 'bounce', 'slide', 'flip'
  const [animStyle, setAnimStyle] = useState<string>(() => localStorage.getItem('sticky_notes_anim_style') || 'smooth');
  // Neon Burst: additive glow effect on top of any animation
  const [neonBurst, setNeonBurst] = useState<boolean>(() => localStorage.getItem('sticky_notes_neon_burst') === 'true');
  // Tick incremented on style change to force card remount and replay animation
  const [animTick, setAnimTick] = useState(0);

  const [excludedNotebooks, setExcludedNotebooks] = useState<string[]>(() => {
    try {
      const val = localStorage.getItem('sticky_notes_excluded_notebooks');
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  });

  const [excludedSections, setExcludedSections] = useState<string[]>(() => {
    try {
      const val = localStorage.getItem('sticky_notes_excluded_sections');
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const nbVal = localStorage.getItem('sticky_notes_excluded_notebooks');
        setExcludedNotebooks(nbVal ? JSON.parse(nbVal) : []);
        
        const secVal = localStorage.getItem('sticky_notes_excluded_sections');
        setExcludedSections(secVal ? JSON.parse(secVal) : []);
      } catch {}
    };
    window.addEventListener('storage', handleStorageChange);

    const handleOpenStickyNote = (e: any) => {
      if (e.detail && e.detail.note) {
        handleEditNote(e.detail.note);
      }
    };
    window.addEventListener('open-sticky-note', handleOpenStickyNote);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('open-sticky-note', handleOpenStickyNote);
    };
  }, []);

  useEffect(() => {
    if (selectedNotebook && excludedNotebooks.includes(selectedNotebook)) {
      setSelectedNotebook(null);
    }
    if (selectedSection && excludedSections.includes(selectedSection)) {
      setSelectedSection(null);
    }
  }, [excludedNotebooks, excludedSections, selectedNotebook, selectedSection]);

  const updatePref = (key: 'anim' | 'tags' | 'masonry' | 'isolate' | 'toolbar' | 'matchColor' | 'darkTheme' | 'showReturnMarkers' | 'autoLineNumbers' | 'showCheckboxes' | 'textSize' | 'lineHeight', val: boolean | number) => {
    const keyMap: Record<string, string> = {
      darkTheme: 'sticky_notes_dark_theme',
      showReturnMarkers: 'sticky_notes_return_markers',
      autoLineNumbers: 'sticky_notes_auto_line_numbers',
      showCheckboxes: 'sticky_notes_show_checkboxes',
      textSize: 'sticky_notes_text_size',
      lineHeight: 'sticky_notes_line_height',
    };
    const storageKey = keyMap[key] || `sticky_notes_${key}`;
    localStorage.setItem(storageKey, String(val));
    setPrefs(p => ({ ...p, [key]: val }));
  };


  // Fetch data on mount
  useEffect(() => {
    notesStore.refresh();
  }, []);



  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setActivePage("dashboard");
    }, 400);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
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
      const next = arrayMove(base, oldIdx, newIdx);
      localStorage.setItem('corkboard_note_order', JSON.stringify(next));
      return next;
    });
  };

  // Filter out notes from excluded notebooks or sections
  const visibleNotes = useMemo(() => {
    return notesStore.notes.filter(n => {
      if (n.section_id) {
        if (excludedSections.includes(n.section_id)) return false;
        const s = notesStore.sections.find(sec => sec.id === n.section_id);
        if (s && excludedNotebooks.includes(s.notebook_id)) return false;
      }
      return true;
    });
  }, [notesStore.notes, notesStore.sections, excludedNotebooks, excludedSections]);

  // Build the ordered list of ALL notes, respecting localNoteOrder if set
  const orderedAllNotes = useMemo(() => {
    const storeNotes = visibleNotes;
    if (localNoteOrder.length === 0) return storeNotes;
    const orderMap = new Map(localNoteOrder.map((id, i) => [id, i]));
    return [...storeNotes].sort((a, b) => {
      const ai = orderMap.has(a.id) ? orderMap.get(a.id)! : 99999;
      const bi = orderMap.has(b.id) ? orderMap.get(b.id)! : 99999;
      return ai - bi;
    });
  }, [visibleNotes, localNoteOrder]);

  const activeNotes = useMemo(() => {
    let filtered = orderedAllNotes.filter(n => {
      if (archiveFilter === 'active' && n.tags?.includes('__archived__')) return false;
      if (archiveFilter === 'archived' && !n.tags?.includes('__archived__')) return false;
      if (pinnedFilter === 'pinned' && !n.is_pinned) return false;
      if (pinnedFilter === 'unpinned' && n.is_pinned) return false;
      if (prefs.isolate && !n.tags?.includes('__sticky-notes__')) return false;
      if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) && !n.content?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedSection) {
        return n.section_id === selectedSection || n.tags?.includes(`__section:${selectedSection}`);
      }
      if (selectedNotebook) {
        const sectionIds = notesStore.sections.filter(s => s.notebook_id === selectedNotebook).map(s => s.id);
        return (n.section_id && sectionIds.includes(n.section_id)) || n.tags?.some(t => t.startsWith('__section:') && sectionIds.includes(t.replace('__section:', '')));
      }

      if (dateFilter !== "all") {
        const dateStr = n.updated_at || n.created_at;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const now = new Date();
        if (dateFilter === "today") {
          if (d.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "this-week") {
          const nowRef = new Date();
          const firstDay = new Date(nowRef.setDate(nowRef.getDate() - nowRef.getDay()));
          firstDay.setHours(0,0,0,0);
          if (d < firstDay) return false;
        } else if (dateFilter === "last-week") {
          const nowRef = new Date();
          const firstDayOfThisWeek = new Date(nowRef.setDate(nowRef.getDate() - nowRef.getDay()));
          firstDayOfThisWeek.setHours(0,0,0,0);
          const lastDayOfLastWeek = new Date(firstDayOfThisWeek.getTime() - 1);
          const firstDayOfLastWeek = new Date(lastDayOfLastWeek.getTime() - 6 * 24 * 60 * 60 * 1000);
          firstDayOfLastWeek.setHours(0,0,0,0);
          if (d < firstDayOfLastWeek || d > lastDayOfLastWeek) return false;
        } else if (dateFilter === "this-month") {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === "last-month") {
          const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          if (d.getMonth() !== lastMonth || d.getFullYear() !== lastMonthYear) return false;
        } else if (dateFilter === "this-year") {
          if (d.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === "last-year") {
          if (d.getFullYear() !== now.getFullYear() - 1) return false;
        } else if (dateFilter === "custom-range") {
          if (dateFilterStart) {
            const startD = new Date(dateFilterStart);
            startD.setHours(0,0,0,0);
            if (d < startD) return false;
          }
          if (dateFilterEnd) {
            const endD = new Date(dateFilterEnd);
            endD.setHours(23,59,59,999);
            if (d > endD) return false;
          }
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
  }, [orderedAllNotes, archiveFilter, pinnedFilter, prefs.isolate, searchQuery, selectedSection, selectedNotebook, notesStore.sections, dateFilter, dateFilterStart, dateFilterEnd, sortBy]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [lineTops, setLineTops] = useState<{index: number, top: number, isList: boolean, status: string, height: number}[]>([]);
  const [showScrollTopBtn, setShowScrollTopBtn] = useState(false);
  const mainBoardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!textareaRef.current || !mirrorRef.current || !isNoteModalOpen || !editingNote) return;
    
    const updateTops = () => {
      const ta = textareaRef.current;
      const mirror = mirrorRef.current;
      if (!ta || !mirror) return;

      mirror.style.width = `${ta.clientWidth}px`;

      const lines = editingNote.content.split('\n');
      const tops: any[] = [];
      
      Array.from(mirror.children).forEach((child: any, i) => {
        const lineText = lines[i] || '';
        const trimmed = lineText.trim();
        
        let status = 'none';
        if (trimmed.startsWith('✅') || trimmed.startsWith(STATUS_MARKERS['✅'])) status = 'done';
        else if (trimmed.startsWith('⏳') || trimmed.startsWith(STATUS_MARKERS['⏳'])) status = 'waiting';
        else if (trimmed.startsWith('❌') || trimmed.startsWith(STATUS_MARKERS['❌'])) status = 'cancelled';
        else if (trimmed.startsWith('⬜') || trimmed.startsWith(STATUS_MARKERS['⬜'])) status = 'todo';
        else if (trimmed.startsWith('☐')) status = 'todo';
        else if (trimmed.startsWith('☑')) status = 'done';

        const isList = /^(\s*)([-*]|\d+\.)\s/.test(lineText.replace(/^[✅⏳⬜❌☐☑]\s*/, '').replace(INVISIBLE_REGEX, '')) || status !== 'none';
        
        tops.push({ index: i, top: child.offsetTop, isList, status, height: child.offsetHeight });
      });
      setLineTops(tops);
    };

    updateTops();
    const observer = new ResizeObserver(() => updateTops());
    observer.observe(textareaRef.current);
    
    return () => observer.disconnect();
  }, [editingNote?.content, isNoteModalOpen]);

  const handleSetStatus = (index: number, newStatusIcon: string) => {
    if (!editingNote) return;
    const lines = editingNote.content.split('\n');
    let line = lines[index];
    line = line.replace(/^[✅⏳⬜❌☐☑]\s*/, '').replace(INVISIBLE_REGEX, '');
    if (newStatusIcon !== 'none' && STATUS_MARKERS[newStatusIcon]) {
      line = `${STATUS_MARKERS[newStatusIcon]}${line}`;
    }
    lines[index] = line;
    setEditingNote({ ...editingNote, content: lines.join('\n') });
  };

  const handleSetStatusForBlock = (index: number, newStatusIcon: string) => {
    if (!editingNote) return;
    const lines = editingNote.content.split('\n');
    let startIdx = index;
    let endIdx = index;
    while (startIdx > 0 && lines[startIdx - 1].trim() !== '') {
      startIdx--;
    }
    while (endIdx < lines.length - 1 && lines[endIdx + 1].trim() !== '') {
      endIdx++;
    }
    for (let i = startIdx; i <= endIdx; i++) {
      let line = lines[i];
      line = line.replace(/^[✅⏳⬜❌☐☑]\s*/, '').replace(INVISIBLE_REGEX, '');
      if (newStatusIcon !== 'none' && STATUS_MARKERS[newStatusIcon]) {
        line = `${STATUS_MARKERS[newStatusIcon]}${line}`;
      }
      lines[i] = line;
    }
    setEditingNote({ ...editingNote, content: lines.join('\n') });
  };

  const handleRemoveAllStatuses = () => {
    if (!editingNote) return;
    if (!window.confirm("Are you sure you want to remove all status checkboxes from this note?")) return;
    const lines = editingNote.content.split('\n');
    const newLines = lines.map(line => line.replace(/^[✅⏳⬜❌☐☑]\s*/, '').replace(INVISIBLE_REGEX, ''));
    setEditingNote({ ...editingNote, content: newLines.join('\n') });
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
        alert("Please add a Tag Folder first! (Click the + next to the Labels in the sidebar)");
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
    setIsReminderMenuOpen(false);
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    setReminderDate(now.toISOString().split('T')[0]);
    setReminderTime(now.toTimeString().split(' ')[0].substring(0, 5));
    setReminderRepeat('none');
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
      const hasTag = !!editingNote.section_id || (editingNote.tags || []).some(t => !t.startsWith('__') || t.startsWith('__section:'));
      if (!hasTag) {
        if (!window.confirm("Save without a tag? If you are in a submenu, it will auto tag the note to that menu item name.")) {
          setIsLabelModalOpen(true);
          return;
        }
      }

      const sectionId = editingNote.section_id || null;
      if (editingNote.id === 'new') {
        const finalTags = editingNote.tags || [];
        if (!finalTags.includes('__sticky-notes__')) finalTags.push('__sticky-notes__');
        const newId = await notesStore.createNote(sectionId, editingNote.title, editingNote.content, finalTags);
        if (editingNote.is_pinned) {
          await notesStore.updateNote(newId, { is_pinned: true });
        }
        toast({ title: "Note Created" });
      } else {
        // Only write to DB if something actually changed to avoid bumping updated_at
        const snap = originalNoteSnapshot;
        const changed = !snap ||
          snap.title !== editingNote.title ||
          snap.content !== editingNote.content ||
          snap.section_id !== editingNote.section_id ||
          JSON.stringify(snap.tags) !== JSON.stringify(editingNote.tags);
        if (changed) {
          await notesStore.updateNote(editingNote.id, {
            section_id: sectionId,
            title: editingNote.title,
            content: editingNote.content,
            tags: editingNote.tags
          });
          toast({ title: "Note Updated" });
        } else {
          toast({ title: "No changes" });
        }
      }
      setIsNoteModalOpen(false);
      setEditingNote(null);
      setOriginalNoteSnapshot(null);
    }
  };


  const handleSendToNotes = async (note: Note) => {
    const tags = note.tags?.filter(t => t !== '__sticky-notes__') || [];
    await notesStore.updateNote(note.id, { tags });
    toast({ title: "Sent to Personal Notes" });
  };

  const handleDuplicateNote = async (note: Note) => {
    const id = await notesStore.createNote(note.section_id || null, `${note.title} (Copy)`, note.content);
    const tags = note.tags || [];
    if (!tags.includes('__sticky-notes__')) tags.push('__sticky-notes__');
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
      
      let prefix = '\n\n';
      if (cursorPos === 0) {
        prefix = '';
      } else if (editingNote.content[cursorPos - 1] === '\n') {
        prefix = '\n';
        if (cursorPos > 1 && editingNote.content[cursorPos - 2] === '\n') {
          prefix = '';
        }
      }
      
      const newSectionText = `${prefix}---\n# New Section (${timestamp})\n\n`;
      
      const newContent = editingNote.content.slice(0, cursorPos) + newSectionText + editingNote.content.slice(cursorPos);
      setEditingNote({ ...editingNote, content: newContent });
      
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = cursorPos + newSectionText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.blur();
        textarea.focus();
      }, 0);
    }
  };

  const handleDeleteNote = async (id: string) => {
    setTimeout(async () => {
      if (window.confirm("Delete this sticky note?")) {
        await notesStore.deleteNote(id);
        toast({ title: "Deleted" });
      }
    }, 10);
  };

  const handleCreateNotebook = async () => {
    if (newNotebookName.trim()) {
      const nb = await notesStore.createNotebook(newNotebookName);
      if (nb?.id) {
        await notesStore.createSection(nb.id, newNotebookName.trim());
      }
      setNewNotebookName("");
      setIsNotebookModalOpen(false);
      toast({ title: "Category Created" });
    }
  };

  const handleDeleteNotebook = async (id: string) => {
    const nb = notesStore.notebooks.find(n => n.id === id);
    if (!nb) return;
    const sectionIds = notesStore.sections.filter(s => s.notebook_id === id).map(s => s.id);
    const notesInNb = notesStore.notes.filter(n => sectionIds.includes(n.section_id!) || n.tags?.some(t => t.startsWith('__section:') && sectionIds.includes(t.replace('__section:', ''))));
    
    if (notesInNb.length > 0) {
      setDeletePrompt({ isOpen: true, type: 'notebook', id, name: nb.name, noteCount: notesInNb.length });
    } else {
      if (confirm(`Are you sure you want to delete the category "${nb.name}"?`)) {
        await notesStore.deleteNotebook(id);
        toast({ title: "Category deleted successfully" });
      }
    }
  };

  const handleEditNotebook = async (nb: Notebook) => {
    const newName = prompt("Edit Tag Group Name:", nb.name);
    if (newName && newName.trim()) {
      await notesStore.updateNotebook(nb.id, newName.trim());
    }
  };

  const handleDeleteSection = async (id: string) => {
    const sec = notesStore.sections.find(s => s.id === id);
    if (!sec) return;
    const notesInSec = notesStore.notes.filter(n => n.section_id === id || n.tags?.includes(`__section:${id}`));
    
    if (notesInSec.length > 0) {
      setDeletePrompt({ isOpen: true, type: 'section', id, name: sec.name, noteCount: notesInSec.length });
    } else {
      if (confirm(`Are you sure you want to delete the submenu "${sec.name}"?`)) {
        await notesStore.deleteSection(id);
        toast({ title: "Submenu deleted successfully" });
      }
    }
  };

  const handleEditSection = async (sec: Section) => {
    const newName = prompt("Edit Submenu Name:", sec.name);
    if (newName && newName.trim()) {
      await notesStore.updateSection(sec.id, newName.trim());
    }
  };

  const handleRemoveAllStatusesInSection = async (sectionId: string) => {
    if (!window.confirm("Are you sure you want to remove ALL status checkboxes from ALL notes in this section? This cannot be undone.")) return;
    
    const notesInSection = notesStore.notes.filter(n => n.section_id === sectionId || n.tags?.includes(`__section:${sectionId}`));
    
    let count = 0;
    for (const note of notesInSection) {
      const lines = note.content.split('\n');
      const newLines = lines.map(line => line.replace(/^[✅⏳⬜❌☐☑]\s*/, '').replace(INVISIBLE_REGEX, ''));
      const newContent = newLines.join('\n');
      if (newContent !== note.content) {
        await notesStore.updateNote(note.id, { content: newContent });
        count++;
      }
    }
    toast({ title: `Removed statuses from ${count} note(s)` });
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

  const renderPinned = activeNotes.filter(n => n.is_pinned && !n.tags?.includes('__archived__'));
  const renderOthers = activeNotes.filter(n => !n.is_pinned && !n.tags?.includes('__archived__'));
  const renderArchived = activeNotes.filter(n => n.tags?.includes('__archived__'));

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast({ title: "Speech recognition not supported in this browser.", variant: "destructive" });
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setEditingNote(prev => {
            if (!prev) return prev;
            const cursor = textareaRef.current?.selectionStart || prev.content.length;
            const newContent = prev.content.substring(0, cursor) + finalTranscript + prev.content.substring(cursor);
            return { ...prev, content: newContent };
          });
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      toast({ title: "Listening..." });
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 relative">

      {/* Animation Style Keyframes */}
      {prefs.anim && (
        <style>{`
          @keyframes sn-smooth { from { opacity:0; transform:scale(0.92) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
          @keyframes sn-pop    { 0%{opacity:0;transform:scale(0.6);} 70%{transform:scale(1.12);} 100%{opacity:1;transform:scale(1);} }
          @keyframes sn-bounce { 0%{opacity:0;transform:translateY(-40px);} 60%{transform:translateY(10px);} 80%{transform:translateY(-5px);} 100%{opacity:1;transform:translateY(0);} }
          @keyframes sn-slide  { from{opacity:0;transform:translateX(-60px);} to{opacity:1;transform:translateX(0);} }
          @keyframes sn-flip   { from{opacity:0;transform:perspective(600px) rotateY(-90deg);} to{opacity:1;transform:perspective(600px) rotateY(0deg);} }
          .sn-anim-smooth { animation: sn-smooth 0.35s cubic-bezier(0.34,1.3,0.64,1) both; }
          .sn-anim-pop    { animation: sn-pop    0.40s cubic-bezier(0.34,1.56,0.64,1) both; }
          .sn-anim-bounce { animation: sn-bounce 0.55s ease both; }
          .sn-anim-slide  { animation: sn-slide  0.35s ease both; }
          .sn-anim-flip   { animation: sn-flip   0.45s ease both; }
          @keyframes slh-flip-in  { from{opacity:0;transform:perspective(1200px) rotateX(-90deg) scale(0.95);} to{opacity:1;transform:perspective(1200px) rotateX(0deg) scale(1);} }
          @keyframes slh-flip-out { from{opacity:1;transform:perspective(1200px) rotateX(0deg) scale(1);} to{opacity:0;transform:perspective(1200px) rotateX(90deg) scale(0.95);} }
          .slh-flip-in-3d  { animation: slh-flip-in  0.55s cubic-bezier(0.34,1.1,0.64,1) both; transform-origin: center top; }
          .slh-flip-out-3d { animation: slh-flip-out 0.25s ease-in both; transform-origin: center top; }
        `}</style>
      )}
      
      {/* Header */}
      <div className="flex-none flex flex-col 2xl:flex-row 2xl:items-center justify-between p-2 sm:p-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-10 gap-4">
        {/* Row 1: Title and mobile action triggers */}
        <div className="flex flex-wrap items-center justify-between w-full 2xl:w-auto gap-2">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Button variant="ghost" size="icon" onClick={handleClose} className="text-zinc-400 hover:text-white shrink-0 h-8 w-8 sm:h-10 sm:w-10">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30 shrink-0">
                <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              </div>
              <div className="hidden min-[380px]:block">
                <h1 className="text-sm sm:text-xl font-black text-white uppercase tracking-wider leading-none mt-1 sm:mt-0 flex items-center gap-1.5">
                  Sticky Notes
                  <button
                    title="Sticky Notes Help"
                    className="text-zinc-500 hover:text-yellow-400 transition-colors"
                    style={{ lineHeight: 0 }}
                    onClick={() => {
                      const ev = new CustomEvent('slh_open_help', { detail: { pageId: 'type-sticky-notes' } });
                      window.dispatchEvent(ev);
                    }}
                  >
                    <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] sm:text-xs text-zinc-400 hidden sm:block">Organize your thoughts and tasks</p>
                  {prefs.anim && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-400/60 transition-all cursor-pointer"
                          title="Click to change transition style"
                        >
                          {animStyle === 'smooth' ? '✨' : animStyle === 'pop' ? '🎯' : animStyle === 'bounce' ? '🏀' : animStyle === 'slide' ? '➡️' : animStyle === 'flip' ? '🃏' : '✨'}
                          {animStyle}{neonBurst ? ' + ⚡' : ''}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-44 bg-zinc-900 border-zinc-700 text-zinc-200 z-[400] p-1">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 px-2 pt-1 pb-0.5">Transition Style</div>
                        {[
                          { id: 'smooth', label: '✨ Smooth Zoom' },
                          { id: 'pop',    label: '🎯 Pop' },
                          { id: 'bounce', label: '🏀 Bounce' },
                          { id: 'slide',  label: '➡️ Slide In' },
                          { id: 'flip',   label: '🃏 3D Flip' },
                        ].map(s => (
                          <DropdownMenuItem
                            key={s.id}
                            onClick={() => { setAnimStyle(s.id); localStorage.setItem('sticky_notes_anim_style', s.id); setAnimTick(t => t + 1); }}
                            className={`text-xs cursor-pointer flex items-center justify-between ${animStyle === s.id ? 'text-yellow-400 bg-yellow-500/10' : 'hover:bg-zinc-800'}`}
                          >
                            {s.label}
                            {animStyle === s.id && <span className="text-yellow-400 text-[10px]">✓</span>}
                          </DropdownMenuItem>
                        ))}
                        <div className="border-t border-zinc-700 my-1" />
                        <DropdownMenuItem
                          onClick={() => { const next = !neonBurst; setNeonBurst(next); localStorage.setItem('sticky_notes_neon_burst', String(next)); }}
                          className="text-xs cursor-pointer flex items-center justify-between hover:bg-zinc-800"
                        >
                          <span>⚡ Neon Burst</span>
                          <span className={`text-[10px] font-bold ${neonBurst ? 'text-yellow-400' : 'text-zinc-600'}`}>{neonBurst ? 'ON' : 'OFF'}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          </div>
 
          {/* Compact actions only visible on Mobile (<md) */}
          <div className="flex flex-wrap items-center justify-end gap-1 md:hidden mt-2 sm:mt-0 w-full min-[400px]:w-auto">
            <Button variant="ghost" size="icon" onClick={handleSync} disabled={isSyncing} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8" title="Sync Stickies">
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsVisibilityOpen(true)} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8" title="Sticky Notes Visibility">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-8 w-8 border ${
                    archiveFilter === 'active' ? 'text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                    archiveFilter === 'archived' ? 'text-red-500 hover:text-red-400 bg-red-500/10 border-red-500/30' :
                    'text-zinc-400 hover:text-white bg-zinc-900 border-zinc-800'
                  }`} 
                  title={
                    archiveFilter === 'active' ? 'Showing Active Notes Only' :
                    archiveFilter === 'archived' ? 'Showing Archived Notes Only' :
                    'Showing Active & Archived Notes'
                  }
                >
                  <Archive className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white z-[400]">
                <DropdownMenuItem onClick={() => setArchiveFilter('active')} className={archiveFilter === 'active' ? 'text-emerald-400 font-bold' : ''}>Active</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setArchiveFilter('archived')} className={archiveFilter === 'archived' ? 'text-red-400 font-bold' : ''}>Archived</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setArchiveFilter('both')} className={archiveFilter === 'both' ? 'text-zinc-400 font-bold' : ''}>Both</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8" title="Settings">
              <Settings className="w-3.5 h-3.5" />
            </Button>
            <Button 
              onClick={() => handleNewStickyClick()}
              className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold shadow-[0_0_15px_rgba(234,179,8,0.3)] h-8 px-2 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" /> New
            </Button>
          </div>
        </div>

        {/* Row 2: Search, Filters, and viewMode Toggle */}
        <div className="flex flex-wrap items-center justify-start 2xl:justify-end gap-2 w-full 2xl:w-auto 2xl:flex-1">
          {/* Active Reminders Button */}
          <Button 
            variant="outline" 
            className="h-9 px-3 gap-2 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 relative hidden sm:flex shrink-0"
            onClick={() => setIsRemindersModalOpen(true)}
            title="View Active Reminders"
          >
            <Bell className={`w-4 h-4 ${notesWithReminders.length > 0 ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-500'}`} />
            <span className="text-xs font-semibold text-zinc-300">Reminders</span>
            {notesWithReminders.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-1 ring-black">
                {notesWithReminders.length}
              </span>
            )}
          </Button>
          
          {/* Active Reminders Button Mobile */}
          <Button 
            variant="outline" 
            className="h-9 w-9 p-0 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 relative sm:hidden shrink-0 flex items-center justify-center"
            onClick={() => setIsRemindersModalOpen(true)}
            title="View Active Reminders"
          >
            <Bell className={`w-4 h-4 ${notesWithReminders.length > 0 ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-500'}`} />
            {notesWithReminders.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-1 ring-black">
                {notesWithReminders.length}
              </span>
            )}
          </Button>

          {/* Search bar */}
          <div className="relative flex-grow sm:flex-grow-0 sm:w-56 min-w-[150px]">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400" />
            <Input 
              placeholder="Search stickies..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 bg-zinc-900 border-zinc-700 text-white focus-visible:ring-yellow-500 h-9 text-xs"
            />
            {searchQuery && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7 text-zinc-400 hover:text-white" onClick={() => setSearchQuery("")}>
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Dates Filter - now fully visible on mobile */}
            <div className="flex flex-wrap items-center gap-1">
              <select 
                className="bg-zinc-900 text-white text-[10px] sm:text-xs border border-zinc-700 rounded h-9 px-1.5 sm:px-2 outline-none focus:ring-1 focus:ring-yellow-500 max-w-[85px] sm:max-w-none" 
                value={dateFilter} 
                onChange={e => setDateFilter(e.target.value)}
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="this-week">This Week</option>
                <option value="last-week">Last Week</option>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="this-year">This Year</option>
                <option value="last-year">Last Year</option>
                <option value="custom-range">Custom Range</option>
              </select>

              {dateFilter === "custom-range" && (
                <div className="flex items-center gap-1">
                  <input 
                    type="date" 
                    className="bg-zinc-900 text-white text-[10px] sm:text-xs border border-zinc-700 rounded h-9 px-1.5 outline-none focus:ring-1 focus:ring-yellow-500"
                    value={dateFilterStart}
                    onChange={e => setDateFilterStart(e.target.value)}
                  />
                  <span className="text-zinc-500">-</span>
                  <input 
                    type="date" 
                    className="bg-zinc-900 text-white text-[10px] sm:text-xs border border-zinc-700 rounded h-9 px-1.5 outline-none focus:ring-1 focus:ring-yellow-500"
                    value={dateFilterEnd}
                    onChange={e => setDateFilterEnd(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Sort Filter - fully visible on mobile */}
            <select 
              className="bg-zinc-900 text-white text-[10px] sm:text-xs border border-zinc-700 rounded h-9 px-1.5 sm:px-2 outline-none focus:ring-1 focus:ring-yellow-500 max-w-[85px] sm:max-w-none" 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="manual">Manual</option>
              <option value="updated-desc">Recent</option>
              <option value="created-desc">Newest</option>
              <option value="created-asc">Oldest</option>
            </select>

            {/* View Mode Toggle Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleViewMode} 
              className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-9 w-9 shrink-0" 
              title={viewMode === 'grid' ? "Switch to List View" : "Switch to Grid View"}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4 sm:w-5 sm:h-5" /> : <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />}
            </Button>
          </div>

          {/* Desktop-only action buttons */}
          <div className="hidden md:flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 ml-auto 2xl:ml-0">
            <Button variant="ghost" size="icon" onClick={handleSync} disabled={isSyncing} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8 sm:h-10 sm:w-10" title="Sync Stickies">
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsVisibilityOpen(true)} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8 sm:h-10 sm:w-10" title="Sticky Notes Visibility">
              <Sliders className="w-4 h-4 text-blue-400" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-8 w-8 sm:h-10 sm:w-10 border ${
                    archiveFilter === 'active' ? 'text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                    archiveFilter === 'archived' ? 'text-red-500 hover:text-red-400 bg-red-500/10 border-red-500/30' :
                    'text-zinc-400 hover:text-white bg-zinc-900 border-zinc-800'
                  }`} 
                  title={
                    archiveFilter === 'active' ? 'Showing Active Notes Only' :
                    archiveFilter === 'archived' ? 'Showing Archived Notes Only' :
                    'Showing Active & Archived Notes'
                  }
                >
                  <Archive className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white z-[400]">
                <DropdownMenuItem onClick={() => setArchiveFilter('active')} className={archiveFilter === 'active' ? 'text-emerald-400 font-bold' : ''}>Active</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setArchiveFilter('archived')} className={archiveFilter === 'archived' ? 'text-red-400 font-bold' : ''}>Archived</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setArchiveFilter('both')} className={archiveFilter === 'both' ? 'text-zinc-400 font-bold' : ''}>Both</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={cyclePinnedFilter} 
              className={`h-8 w-8 sm:h-10 sm:w-10 border ${pinnedFilter !== 'all' ? 'bg-red-500 text-white border-red-500 hover:bg-red-600' : 'text-zinc-400 hover:text-white bg-zinc-900 border-zinc-800'}`} 
              title={pinnedFilter === 'all' ? "Showing All Notes" : pinnedFilter === 'pinned' ? "Showing Pinned Notes" : "Showing Un-pinned Notes"}
            >
              {pinnedFilter === 'all' ? <Eye className="w-4 h-4" /> : pinnedFilter === 'pinned' ? <Pin className="w-4 h-4" fill="currentColor" /> : <PinOff className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 h-8 w-8 sm:h-10 sm:w-10" title="Settings">
              <Settings className="w-4 h-4" />
            </Button>
            
            <div className="h-6 w-px bg-zinc-800 mx-1 hidden min-[400px]:block" />
            
            <Button onClick={() => handleNewStickyClick()} className="bg-yellow-500 hover:bg-yellow-400 text-[#5c4033] font-bold text-xs sm:text-sm h-8 sm:h-10 rounded-lg px-2 sm:px-4 shadow-lg shadow-yellow-500/10 shrink-0">
              <Plus className="w-4 h-4 mr-1 sm:mr-2 inline" /> New Sticky
            </Button>
          </div>
        </div>
      </div>

      {/* Main Sticky Notes Area */}
      <div className={`flex-1 flex overflow-hidden relative ${prefs.darkTheme ? 'bg-zinc-950' : 'bg-[#5c4033]'}`}>
        {/* Faint Sticky Notes Texture Background */}
        <div className={`absolute inset-0 ${prefs.darkTheme ? 'opacity-10 mix-blend-overlay' : 'opacity-20 mix-blend-multiply'} pointer-events-none`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

        {/* Sidebar Labels */}
        <div className={`
          absolute lg:relative z-20 h-full bg-zinc-950 border-r border-zinc-800 transition-all duration-300 ease-in-out flex flex-col overflow-hidden
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-0'}
        `}>
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between min-w-[16rem]">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="h-6 w-6 text-zinc-400 hover:bg-zinc-800 lg:hidden" title="Close Sidebar">
                <PanelLeftClose className="w-4 h-4" />
              </Button>
              <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">Tags</h2>
              <Button variant="outline" size="sm" onClick={() => setExpandAll(!expandAll)} className="h-5 px-1.5 text-[9px] bg-zinc-900 border-zinc-700 hover:bg-zinc-800 uppercase tracking-widest ml-1">{expandAll ? 'Collapse' : 'Expand'}</Button>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsNotebookModalOpen(true)} className="h-6 w-6 text-emerald-500 hover:bg-emerald-500/20" title="New Tag Folder">
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
                <div className="flex items-center gap-1 text-xs">
                  {(() => {
                    const allNotes = visibleNotes.filter(n => !prefs.isolate || n.tags?.includes('__sticky-notes__'));
                    const activeCount = allNotes.filter(n => !n.tags?.includes('__archived__')).length;
                    const archivedCount = allNotes.filter(n => n.tags?.includes('__archived__')).length;
                    return (
                      <>
                        {activeCount > 0 && <span className="opacity-50">{activeCount}</span>}
                        {archivedCount > 0 && <span className="text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded-md" title={`${archivedCount} Archived`}>{archivedCount}</span>}
                        {activeCount === 0 && archivedCount === 0 && <span className="opacity-50">0</span>}
                      </>
                    );
                  })()}
                </div>
              </button>
              
              {notesStore.notebooks.filter(nb => !excludedNotebooks.includes(nb.id)).map(nb => {
                const nbNotes = visibleNotes.filter(n => {
                  if (prefs.isolate && !n.tags?.includes('__sticky-notes__')) return false;
                  const sectionIds = notesStore.sections.filter(s => s.notebook_id === nb.id).map(s => s.id);
                  return (n.section_id && sectionIds.includes(n.section_id)) || n.tags?.some(t => t.startsWith('__section:') && sectionIds.includes(t.replace('__section:', '')));
                });
                const nbActiveCount = nbNotes.filter(n => !n.tags?.includes('__archived__')).length;
                const nbArchivedCount = nbNotes.filter(n => n.tags?.includes('__archived__')).length;
                return (
                <div key={nb.id} className="space-y-1">
                  <div className="flex items-center group">
                    <button 
                      onClick={() => handleCategorySelect(() => { setSelectedNotebook(nb.id); setSelectedSection(null); setExpandedNotebook(expandedNotebook === nb.id ? null : nb.id); })}
                      className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedNotebook === nb.id && !selectedSection ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                    >
                      <div className="flex items-center gap-3 truncate"><Folder className="w-4 h-4 shrink-0" /> <span className="truncate">{nb.name}</span></div>
                      <div className="flex items-center gap-1 text-xs">
                        {nbActiveCount > 0 && <span className="opacity-50">{nbActiveCount}</span>}
                        {nbArchivedCount > 0 && <span className="text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded-md" title={`${nbArchivedCount} Archived`}>{nbArchivedCount}</span>}
                        {nbActiveCount === 0 && nbArchivedCount === 0 && <span className="opacity-50">0</span>}
                      </div>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white z-[400]">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditNotebook(nb); }}><Edit2 className="w-4 h-4 mr-2"/> Edit Tag Group</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteNotebook(nb.id); }} className="text-red-400 hover:text-red-300 hover:bg-red-400/10"><Trash2 className="w-4 h-4 mr-2"/> Delete Tag Group</DropdownMenuItem>
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
                      {notesStore.sections.filter(s => s.notebook_id === nb.id && !excludedSections.includes(s.id)).map(sec => {
                        const secNotes = visibleNotes.filter(n => (!prefs.isolate || n.tags?.includes('__sticky-notes__')) && (n.section_id === sec.id || n.tags?.includes(`__section:${sec.id}`)));
                        const secActiveCount = secNotes.filter(n => !n.tags?.includes('__archived__')).length;
                        const secArchivedCount = secNotes.filter(n => n.tags?.includes('__archived__')).length;
                        return (
                        <div key={sec.id} className="flex items-center group">
                          <button 
                            onClick={() => handleCategorySelect(() => setSelectedSection(sec.id))}
                            className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedSection === sec.id ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 font-medium'}`}
                          >
                            <div className="flex items-center gap-3 truncate"><FileText className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{sec.name}</span></div>
                            <div className="flex items-center gap-1 text-xs">
                              {secActiveCount > 0 && <span className="opacity-50">{secActiveCount}</span>}
                              {secArchivedCount > 0 && <span className="text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded-md" title={`${secArchivedCount} Archived`}>{secArchivedCount}</span>}
                              {secActiveCount === 0 && secArchivedCount === 0 && <span className="opacity-50">0</span>}
                            </div>
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer">
                                <MoreVertical className="w-3 h-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white z-[400]">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditSection(sec); }}><Edit2 className="w-4 h-4 mr-2"/> Edit Submenu</DropdownMenuItem>
                              <div className="border-t border-zinc-800 my-1" />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRemoveAllStatusesInSection(sec.id); }} className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10"><CheckSquare className="w-4 h-4 mr-2"/> Remove All Statuses</DropdownMenuItem>
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

        {/* Scroll to Top Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => mainBoardRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`absolute bottom-6 right-6 z-[60] rounded-full shadow-2xl bg-zinc-950 border-zinc-800 text-yellow-500 hover:text-yellow-400 hover:bg-zinc-800 transition-all duration-300 ${showScrollTopBtn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
          title="Scroll to Top"
        >
          <ChevronUp className="w-5 h-5" />
        </Button>

        {/* Main Board */}
        <div 
          ref={mainBoardRef}
          onScroll={(e) => setShowScrollTopBtn(e.currentTarget.scrollTop > 300)}
          className="flex-1 overflow-y-auto p-8 relative z-10 scroll-smooth"
        >
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className={`absolute top-4 left-4 z-[60] h-8 w-8 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded shadow ${isSidebarOpen ? 'text-yellow-500 hover:text-yellow-400' : ''}`}
            title={isSidebarOpen ? "Hide Tags" : "Show Tags"}
          >
            <PanelLeft className="w-5 h-5" />
          </Button>

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
            {renderPinned.length > 0 && (
              <div className="mb-12">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 ml-2">Pinned</h3>
                <SortableContext 
                  items={renderPinned.map(n => n.id)} 
                  strategy={viewMode === 'list' ? verticalListSortingStrategy : rectSortingStrategy}
                >
                  {viewMode === 'list' ? (
                    <div className="flex flex-col gap-3 max-w-4xl mx-auto">
                      {renderPinned.map(note => {
                        const sectionName = notesStore.sections.find(s => s.id === note.section_id)?.name;
                        return (
                          <SortableListRow
                            key={`${note.id}-${note.is_pinned}-${animTick}`}
                            note={note}
                            animClass={getAnimClass(prefs.anim, animStyle, neonBurst)}
                            sectionName={sectionName}
                            onEdit={handleEditNote}
                            onDelete={handleDeleteNote}
                            onSendToNotes={handleSendToNotes}
                            onDuplicate={handleDuplicateNote}
                            onChangeColor={handleChangeColor}
                            onTogglePin={handleTogglePin}
                            showToolbar={prefs.toolbar}
                            onChangeLabels={(n) => { setEditingNote(n); setIsLabelModalOpen(true); }}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className={isMasonry ? "columns-1 sm:columns-2 md:columns-3 xl:columns-4 2xl:columns-5 gap-8 space-y-8" : "grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 items-stretch"}>
                      {renderPinned.map(note => {
                        const sectionName = notesStore.sections.find(s => s.id === note.section_id)?.name;
                        return (
                          <SortableSticky 
                            key={`${note.id}-${note.is_pinned}-${animTick}`} 
                            note={note} 
                            isMasonry={isMasonry}
                            animClass={getAnimClass(prefs.anim, animStyle, neonBurst)}
                            sectionName={sectionName}
                            onEdit={handleEditNote} 
                            onDelete={handleDeleteNote} 
                            onSendToNotes={handleSendToNotes} 
                            onDuplicate={handleDuplicateNote}
                            onChangeColor={handleChangeColor}
                            onToggleCheckboxes={handleToggleCheckboxes}
                            onTogglePin={handleTogglePin}
                            onImageClick={setLightboxImage}
                            showTags={true}
                            showToolbar={prefs.toolbar}
                            onChangeLabels={(n) => { setEditingNote(n); setIsLabelModalOpen(true); }}
                            onOpenSettings={() => setIsSettingsOpen(true)}
                          />
                        );
                      })}
                    </div>
                  )}
                </SortableContext>
              </div>
            )}
            
            {renderOthers.length > 0 && (
              <div>
                {renderPinned.length > 0 && <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 ml-2 mt-8">Others</h3>}
                <SortableContext 
                  items={renderOthers.map(n => n.id)} 
                  strategy={viewMode === 'list' ? verticalListSortingStrategy : rectSortingStrategy}
                >
                  {viewMode === 'list' ? (
                    <div className="flex flex-col gap-3 max-w-4xl mx-auto">
                      {renderOthers.map(note => {
                        const sectionName = notesStore.sections.find(s => s.id === note.section_id)?.name;
                        return (
                          <SortableListRow
                            key={`${note.id}-${note.is_pinned}-${animTick}`}
                            note={note}
                            animClass={getAnimClass(prefs.anim, animStyle, neonBurst)}
                            sectionName={sectionName}
                            onEdit={handleEditNote}
                            onDelete={handleDeleteNote}
                            onSendToNotes={handleSendToNotes}
                            onDuplicate={handleDuplicateNote}
                            onChangeColor={handleChangeColor}
                            onTogglePin={handleTogglePin}
                            showToolbar={prefs.toolbar}
                            onChangeLabels={(n) => { setEditingNote(n); setIsLabelModalOpen(true); }}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className={isMasonry ? "columns-1 sm:columns-2 md:columns-3 xl:columns-4 2xl:columns-5 gap-8 space-y-8" : "grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 items-stretch"}>
                      {renderOthers.map(note => {
                        const sectionName = notesStore.sections.find(s => s.id === note.section_id)?.name;
                        return (
                          <SortableSticky 
                            key={`${note.id}-${note.is_pinned}-${animTick}`} 
                            note={note} 
                            isMasonry={isMasonry}
                            animClass={getAnimClass(prefs.anim, animStyle, neonBurst)}
                            sectionName={sectionName}
                            onEdit={handleEditNote} 
                            onDelete={handleDeleteNote} 
                            onSendToNotes={handleSendToNotes} 
                            onDuplicate={handleDuplicateNote}
                            onChangeColor={handleChangeColor}
                            onToggleCheckboxes={handleToggleCheckboxes}
                            onTogglePin={handleTogglePin}
                            onImageClick={setLightboxImage}
                            showTags={true}
                            showToolbar={prefs.toolbar}
                            onChangeLabels={(n) => { setEditingNote(n); setIsLabelModalOpen(true); }}
                            onOpenSettings={() => setIsSettingsOpen(true)}
                          />
                        );
                      })}
                    </div>
                  )}
                </SortableContext>
              </div>
            )}

            {renderArchived.length > 0 && (
              <div className="mt-12 border-t border-zinc-800/50 pt-8">
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4 ml-2">Archives</h3>
                <SortableContext 
                  items={renderArchived.map(n => n.id)} 
                  strategy={viewMode === 'list' ? verticalListSortingStrategy : rectSortingStrategy}
                >
                  {viewMode === 'list' ? (
                    <div className="flex flex-col gap-3 max-w-4xl mx-auto">
                      {renderArchived.map(note => {
                        const sectionName = notesStore.sections.find(s => s.id === note.section_id)?.name;
                        return (
                          <SortableListRow
                            key={`${note.id}-${note.is_pinned}-${animTick}`}
                            note={note}
                            animClass={getAnimClass(prefs.anim, animStyle, neonBurst)}
                            sectionName={sectionName}
                            onEdit={handleEditNote}
                            onDelete={handleDeleteNote}
                            onSendToNotes={handleSendToNotes}
                            onDuplicate={handleDuplicateNote}
                            onChangeColor={handleChangeColor}
                            onTogglePin={handleTogglePin}
                            showToolbar={prefs.toolbar}
                            onChangeLabels={(n) => { setEditingNote(n); setIsLabelModalOpen(true); }}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className={isMasonry ? "columns-1 sm:columns-2 md:columns-3 xl:columns-4 2xl:columns-5 gap-8 space-y-8" : "grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 items-stretch"}>
                      {renderArchived.map(note => {
                        const sectionName = notesStore.sections.find(s => s.id === note.section_id)?.name;
                        return (
                          <SortableSticky 
                            key={`${note.id}-${note.is_pinned}-${animTick}`} 
                            note={note} 
                            isMasonry={isMasonry}
                            animClass={getAnimClass(prefs.anim, animStyle, neonBurst)}
                            sectionName={sectionName}
                            onEdit={handleEditNote} 
                            onDelete={handleDeleteNote} 
                            onSendToNotes={handleSendToNotes} 
                            onDuplicate={handleDuplicateNote}
                            onChangeColor={handleChangeColor}
                            onToggleCheckboxes={handleToggleCheckboxes}
                            onTogglePin={handleTogglePin}
                            onImageClick={setLightboxImage}
                            showTags={true}
                            showToolbar={prefs.toolbar}
                            onChangeLabels={(n) => { setEditingNote(n); setIsLabelModalOpen(true); }}
                            onOpenSettings={() => setIsSettingsOpen(true)}
                          />
                        );
                      })}
                    </div>
                  )}
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
        const outsideColorId = editingNote.tags?.find(t => t.startsWith('__color:'))?.split(':')[1]?.replace('__', '') || 'black';
        const insideColorTagId = editingNote.tags?.find(t => t.startsWith('__inside_color:'))?.split(':')[1]?.replace('__', '') || 'black';

        const editColorId = prefs.matchColor ? outsideColorId : insideColorTagId;
        const editColor = STICKY_COLORS.find(c => c.id === editColorId) || STICKY_COLORS.find(c => c.id === 'gray')!;
        
        const isFlip = animStyle === 'flip';
        return (
        <div
          onClick={() => { setIsNoteModalOpen(false); setEditingNote(null); setOriginalNoteSnapshot(null); }}
          className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4 animate-in fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`${editColor.bg} w-full max-w-5xl rounded-lg shadow-2xl overflow-hidden border-2 ${editColor.border} flex flex-col h-[95vh] cursor-default ${getAnimClass(prefs.anim, animStyle, neonBurst)}`}
          >
            <div className={`p-4 border-b border-black/10 flex justify-between items-start ${editColor.bg} brightness-95`}>
              <div className="flex flex-col gap-1">
                <h2 className={`font-bold ${editColor.text}`}>{editingNote.id === 'new' ? 'New Sticky' : 'Edit Sticky'}</h2>
                {editingNote.id !== 'new' && (
                  <div className={`text-[10px] ${editColor.text} opacity-70 uppercase font-bold tracking-wider`}>
                    Created: {new Date(editingNote.created_at || '').toLocaleString()} | Updated: {new Date(editingNote.updated_at || '').toLocaleString()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className={`${editColor.text} hover:bg-black/10`} title="Note Settings">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setIsNoteModalOpen(false); setEditingNote(null); setOriginalNoteSnapshot(null); }} className={`${editColor.text} hover:bg-black/10`}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

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
                            <img 
                              src={img} 
                              alt="attachment" 
                              className="w-full h-32 sm:h-48 object-cover rounded shadow-sm bg-white/20 cursor-zoom-in hover:brightness-95 transition-all" 
                              onClick={() => setLightboxImage(img)}
                            />
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
                <Textarea 
                  value={editingNote.title} 
                  onChange={e => setEditingNote({...editingNote, title: e.target.value})}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = el.scrollHeight + 'px';
                    }
                  }}
                  className={`bg-black/5 ${editColor.border} ${editColor.text} placeholder:${editColor.text} placeholder:opacity-50 focus-visible:ring-black/20 font-bold resize-none overflow-hidden min-h-[42px] py-2`}
                  style={{ fontSize: `${Math.round(prefs.textSize * 1.2)}px` }}
                  placeholder="Sticky title..."
                  rows={1}
                />
              </div>
              <div className="flex-1 flex flex-col relative">
                <div className="flex justify-between items-end mb-1">
                  <label className={`text-xs font-bold ${editColor.text} uppercase block`}>Content</label>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={toggleListening} className={`h-6 px-2 text-[10px] ${editColor.text} ${isListening ? 'bg-red-500/20 text-red-500' : 'hover:bg-black/10'} uppercase font-bold tracking-wider`}>
                      {isListening ? <MicOff className="w-3 h-3 mr-1 animate-pulse" /> : <Mic className="w-3 h-3 mr-1" />}
                      {isListening ? "Listening..." : "Dictate"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleAddSection} className={`h-6 text-[10px] ${editColor.text} hover:bg-black/10 uppercase font-bold tracking-wider`}>
                      <Plus className="w-3 h-3 mr-1" /> Add New Section Here
                    </Button>
                  </div>
                </div>
                <div className={`flex-1 relative flex flex-col overflow-hidden rounded-md border ${editColor.border} bg-black/5`}>
                  {/* Gutter Background */}
                  {prefs.showCheckboxes && <div className={`absolute top-0 bottom-0 left-0 w-8 border-r ${editColor.border} opacity-30 pointer-events-none z-10`} />}
                  
                  {/* Gutter Icons */}
                  {prefs.showCheckboxes && (
                    <div className="absolute inset-y-0 left-0 right-0 z-20 pointer-events-none">
                    <div style={{ transform: `translateY(-${scrollTop}px)` }}>
                      {lineTops.map(line => (
                        <div key={line.index} className="absolute left-0 w-8 pointer-events-auto" style={{ top: line.top, height: line.height }}>
                          {line.status !== 'none' ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger className={`absolute left-[6px] top-0 w-[22px] h-[22px] flex items-center justify-center rounded hover:bg-black/10 transition-colors ${editColor.bg}`}>
                                 {line.status === 'done' ? '✅' : line.status === 'waiting' ? '⏳' : line.status === 'cancelled' ? '❌' : '⬜'}
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" side="bottom" className="min-w-0 w-40 bg-zinc-900 border-zinc-800 text-white z-[400]">
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '✅')}><span className="mr-2">✅</span> Done</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '⬜')}><span className="mr-2">⬜</span> To Do</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '⏳')}><span className="mr-2">⏳</span> Waiting</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '❌')}><span className="mr-2">❌</span> Not Done</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800 text-red-400" onClick={() => handleSetStatus(line.index, 'none')}><span className="mr-2 pl-4"></span> Remove Status</DropdownMenuItem>
                                <div className="border-t border-zinc-800 my-1" />
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800 text-blue-400" onClick={() => handleSetStatusForBlock(line.index, '⬜')}><span className="mr-2">⬜</span> Apply 'To Do' to Block</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800 text-blue-400" onClick={() => handleSetStatusForBlock(line.index, '✅')}><span className="mr-2">✅</span> Apply 'Done' to Block</DropdownMenuItem>
                                <div className="border-t border-zinc-800 my-1" />
                                <DropdownMenuItem className="cursor-pointer hover:bg-red-900/20 text-red-400" onClick={handleRemoveAllStatuses}><span className="mr-2 pl-4"></span> Remove All Statuses</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger className="absolute left-[6px] top-0 w-[22px] h-[22px] flex items-center justify-center rounded hover:bg-black/10 opacity-0 hover:opacity-100 transition-opacity">
                                 ⬜
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" side="bottom" className="min-w-0 w-40 bg-zinc-900 border-zinc-800 text-white z-[400]">
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '✅')}><span className="mr-2">✅</span> Done</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '⬜')}><span className="mr-2">⬜</span> To Do</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '⏳')}><span className="mr-2">⏳</span> Waiting</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800" onClick={() => handleSetStatus(line.index, '❌')}><span className="mr-2">❌</span> Not Done</DropdownMenuItem>
                                <div className="border-t border-zinc-800 my-1" />
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800 text-blue-400" onClick={() => handleSetStatusForBlock(line.index, '⬜')}><span className="mr-2">⬜</span> Apply 'To Do' to Block</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-800 text-blue-400" onClick={() => handleSetStatusForBlock(line.index, '✅')}><span className="mr-2">✅</span> Apply 'Done' to Block</DropdownMenuItem>
                                <div className="border-t border-zinc-800 my-1" />
                                <DropdownMenuItem className="cursor-pointer hover:bg-red-900/20 text-red-400" onClick={handleRemoveAllStatuses}><span className="mr-2 pl-4"></span> Remove All Statuses</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

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
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey && editingNote) {
                        const ta = e.currentTarget;
                        const pos = ta.selectionStart;
                        const val = ta.value;
                        const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
                        const currentLine = val.substring(lineStart, pos);
                        const trimmed = currentLine.trimStart();

                        // Auto line numbers: only if pref enabled AND line starts with N.
                        if (prefs.autoLineNumbers && /^\d+\.\s+/.test(trimmed)) {
                          const restOfLine = trimmed.replace(/^\d+\.\s*/, '');
                          if (!restOfLine.trim()) {
                            // Empty numbered line — stop numbering, clear prefix
                            e.preventDefault();
                            const newContent = val.substring(0, lineStart) + val.substring(pos);
                            setEditingNote({ ...editingNote, content: newContent });
                            setTimeout(() => { ta.selectionStart = ta.selectionEnd = lineStart; }, 0);
                            return;
                          }
                          e.preventDefault();
                          const num = parseInt(trimmed.match(/^(\d+)\./)?.[1] || '0', 10);
                          const nextLine = `${num + 1}. `;
                          const newContent = val.substring(0, pos) + '\n' + nextLine + val.substring(pos);
                          setEditingNote({ ...editingNote, content: newContent });
                          setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos + 1 + nextLine.length; }, 0);
                          return;
                        }

                        // Checkbox continuation: ONLY if current line itself starts with ☐ or ☑
                        if (trimmed.startsWith('☐') || trimmed.startsWith('☑')) {
                          e.preventDefault();
                          const restOfLine = trimmed.replace(/^[☐☑]\s*/, '');
                          if (!restOfLine.trim()) {
                            // Empty checkbox line → exit checkbox mode (clear prefix)
                            const newContent = val.substring(0, lineStart) + val.substring(pos);
                            setEditingNote({ ...editingNote, content: newContent });
                            setTimeout(() => { ta.selectionStart = ta.selectionEnd = lineStart; }, 0);
                          } else {
                            // Continue checkbox on next line
                            const newContent = val.substring(0, pos) + '\n☐ ' + val.substring(pos);
                            setEditingNote({ ...editingNote, content: newContent });
                            setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos + 3; }, 0);
                          }
                          return;
                        }

                        // Default: normal newline — do NOT intercept
                      }
                    }}
                    onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
                    className={`flex-1 resize-none bg-transparent border-none text-inherit placeholder:text-inherit placeholder:opacity-50 focus-visible:ring-0 p-4 ${prefs.showCheckboxes ? 'pl-12' : ''}`}
                    style={{ fontSize: `${prefs.textSize}px`, lineHeight: prefs.lineHeight }}
                    placeholder="Write something (use # headers to create section links)..."
                  />



                  {/* Mirror Div for height calculations */}
                  <div 
                    ref={mirrorRef} 
                    className={`absolute top-0 left-0 p-4 whitespace-pre-wrap break-words opacity-0 pointer-events-none -z-10 ${prefs.showCheckboxes ? 'pl-12' : ''}`}
                    style={{ fontSize: `${prefs.textSize}px`, lineHeight: prefs.lineHeight }}
                    aria-hidden
                  >
                    {getCleanContent(editingNote.content).split('\n').map((line: string, i: number) => (
                      <div key={i} className="relative" style={{ minHeight: `${prefs.lineHeight}em` }}>
                        {line || ' '}
                        {prefs.showReturnMarkers && line && (
                          <span className="text-[10px] opacity-30 select-none ml-0.5">¶</span>
                        )}
                      </div>
                    ))}

                  </div>

                  {(() => {
                    const cardSections = [
                      ...(editingNote.section_id ? [editingNote.section_id] : []),
                      ...(editingNote.tags?.filter(t => t.startsWith('__section:')).map(t => t.replace('__section:', '')) || [])
                    ];
                    const uniqueCardSections = Array.from(new Set(cardSections));
                    
                    if (uniqueCardSections.length === 0) return null;
                    
                    return (
                      <div className="px-4 pb-3 pl-10 pt-1 shrink-0 flex flex-wrap gap-1.5 z-10">
                        {uniqueCardSections.map(secId => {
                          const sec = notesStore.sections.find(s => s.id === secId);
                          if (!sec) return null;
                          return (
                            <div key={secId} className="inline-flex items-center text-[10px] sm:text-xs font-bold px-2.5 py-0.5 sm:py-1 rounded-full border border-black/25 bg-black/5 text-inherit select-none">
                              {getFullSectionName(notesStore, secId)}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <Button 
                    size="icon" 
                    variant="outline" 
                    className={`absolute bottom-3 right-3 rounded-full shadow-lg ${editColor.border} ${editColor.bg} ${editColor.text} hover:brightness-95 z-30`}
                    onClick={scrollToTop}
                    title="Scroll to Top"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                </div>
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
                <DropdownMenu open={isReminderMenuOpen} onOpenChange={setIsReminderMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className={`h-9 w-9 ${editColor.text} ${getReminderData(editingNote) ? 'bg-yellow-500/20 text-yellow-500' : ''} hover:bg-black/10`} 
                      title="Set a Reminder"
                    >
                      <Bell className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72 bg-zinc-900 border-zinc-800 text-zinc-300 p-3 z-[400] space-y-3">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Custom Reminder
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-zinc-500">Date</label>
                          <Input 
                            type="date" 
                            value={reminderDate} 
                            onChange={e => setReminderDate(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 text-white text-xs h-8 focus-visible:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-zinc-500">Time</label>
                          <Input 
                            type="time" 
                            value={reminderTime} 
                            onChange={e => setReminderTime(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 text-white text-xs h-8 focus-visible:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-zinc-500">Repeat</label>
                          <select 
                            value={reminderRepeat} 
                            onChange={e => setReminderRepeat(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs h-8 focus-visible:ring-blue-500 text-white focus:outline-none"
                          >
                            <option value="none">Does not repeat</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <label className="text-[10px] uppercase font-bold text-zinc-500">Play Sound</label>
                          <input type="checkbox" checked={reminderSound} onChange={e => setReminderSound(e.target.checked)} className="accent-blue-500" />
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <label className="text-[10px] uppercase font-bold text-zinc-500">Show Popup</label>
                          <input type="checkbox" checked={reminderPopup} onChange={e => setReminderPopup(e.target.checked)} className="accent-blue-500" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          {getReminderData(editingNote) && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleRemoveReminder}
                              className="text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 mr-auto"
                            >
                              Remove
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            onClick={handleSaveCustomReminder}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className={`h-9 w-9 ${editColor.text} hover:bg-black/10`}>
                      <Palette className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 bg-zinc-900 border-zinc-800 p-2 grid grid-cols-4 gap-2 z-[400]">
                    {STICKY_COLORS.map(c => {
                      const isActive = prefs.matchColor
                        ? editingNote.tags?.includes(`__color:${c.id}__`)
                        : editingNote.tags?.includes(`__inside_color:${c.id}__`);
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            let newTags = editingNote.tags?.filter(t => !t.startsWith('__inside_color:')) || [];
                            newTags.push(`__inside_color:${c.id}__`);
                            if (prefs.matchColor) {
                              newTags = newTags.filter(t => !t.startsWith('__color:'));
                              newTags.push(`__color:${c.id}__`);
                            }
                            setEditingNote({...editingNote, tags: newTags});
                          }}
                          className={`w-8 h-8 rounded-full cursor-pointer ${c.bg}`}
                          style={{
                            outline: isActive ? '2px solid white' : 'none',
                            outlineOffset: '2px',
                            boxShadow: `0 0 0 3px ${c.textRing || '#fff'}`
                          }}
                        />
                      );
                    })}

                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="icon" variant="ghost" className={`h-9 w-9 ${editColor.text} hover:bg-black/10`} title="Send to Personal Notes" onClick={(e) => { 
                  const tags = editingNote.tags?.filter(t => t !== '__corkboard__') || [];
                  setEditingNote({...editingNote, tags});
                  toast({ title: "Will be sent to Personal Notes on save" });
                }}>
                  <FileText className="w-5 h-5" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="icon" variant="ghost" className={`h-9 w-9 ${editColor.text} hover:bg-black/10`} title="Adjust Text Size">
                      <Type className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="center" className="w-64 bg-zinc-900 border-zinc-800 text-white z-[400] p-4">
                    <h4 className="font-bold text-sm mb-3 text-zinc-300">Text Size</h4>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[16, 20, 24].map(size => (
                        <Button 
                          key={size} 
                          variant="outline" 
                          size="sm" 
                          onClick={() => updatePref('textSize', size)}
                          className={`border-zinc-700 hover:bg-zinc-800 ${prefs.textSize === size ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'text-zinc-400'}`}
                        >
                          {size}px
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 font-bold uppercase">Custom:</span>
                      <Input 
                        type="number" 
                        value={prefs.textSize} 
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val >= 10 && val <= 100) {
                            updatePref('textSize', val);
                          }
                        }}
                        className="h-8 bg-black/20 border-zinc-700 text-white w-20"
                      />
                      <span className="text-xs text-zinc-500">px</span>
                    </div>

                    <h4 className="font-bold text-sm mb-3 text-zinc-300 mt-4 border-t border-zinc-800 pt-3">Line Spacing</h4>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[1.0, 1.5, 2.0].map(size => (
                        <Button 
                          key={size} 
                          variant="outline" 
                          size="sm" 
                          onClick={() => updatePref('lineHeight', size)}
                          className={`border-zinc-700 hover:bg-zinc-800 ${prefs.lineHeight === size ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'text-zinc-400'}`}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 font-bold uppercase">Custom:</span>
                      <Input 
                        type="number" 
                        step="0.1"
                        value={prefs.lineHeight} 
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 0.5 && val <= 5.0) {
                            updatePref('lineHeight', val);
                          }
                        }}
                        className="h-8 bg-black/20 border-zinc-700 text-white w-20"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
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
                    <DropdownMenuItem onClick={() => setIsLabelModalOpen(true)}>Change tags</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const tags = editingNote.tags || [];
                      const isArchived = tags.includes('__archived__');
                      setEditingNote({ 
                        ...editingNote, 
                        tags: isArchived ? tags.filter(t => t !== '__archived__') : [...tags, '__archived__'],
                        is_pinned: isArchived ? editingNote.is_pinned : false
                      });
                    }}>
                      {editingNote.tags?.includes('__archived__') ? 'Unarchive note' : 'Archive note'}
                    </DropdownMenuItem>
                    {editingNote.id !== 'new' && (
                      <DropdownMenuItem onClick={() => handleDuplicateNote(editingNote)}>Make a copy</DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => updatePref('showCheckboxes', !prefs.showCheckboxes)}>
                      {prefs.showCheckboxes ? 'Hide checkboxes' : 'Show checkboxes'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(editingNote.content); toast({ title: "Copied to clipboard" }); }}>Copy to Google Docs</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex gap-2 font-semibold">
                <Button variant="outline" onClick={() => { setIsNoteModalOpen(false); setEditingNote(null); setOriginalNoteSnapshot(null); }} className={`border-black/20 ${editColor.text} hover:bg-black/10 bg-transparent px-2.5 sm:px-4 text-xs sm:text-sm`}>Cancel</Button>

                <Button onClick={handleSaveNote} className={`bg-black/20 ${editColor.text} hover:bg-black/30 border border-black/10 px-3 sm:px-4`}>
                  <Save className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Save Sticky</span>
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
            <h2 className="text-white font-bold mb-4">Create Tag Group</h2>
            <Input 
              value={newNotebookName} 
              onChange={e => setNewNotebookName(e.target.value)} 
              placeholder="Tag Group name..."
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
        <div 
          onClick={() => setIsSettingsOpen(false)}
          className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4 animate-in fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md overflow-hidden shadow-2xl cursor-default"
          >
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h2 className="text-white font-bold flex items-center gap-2"><Settings className="w-4 h-4 text-yellow-500"/> Sticky Notes Settings</h2>
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
              {/* Animation Style Picker */}
              {prefs.anim && (
                <div className="ml-1 space-y-2">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Animation Style</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'smooth', label: '✨ Smooth Zoom', desc: 'Gentle fade & scale' },
                      { id: 'pop',    label: '🎯 Pop',         desc: 'Springy overshoot' },
                      { id: 'bounce', label: '🏀 Bounce',      desc: 'Drop from top' },
                      { id: 'slide',  label: '➡️ Slide In',    desc: 'Sweep from left' },
                      { id: 'flip',   label: '🃏 3D Flip',     desc: 'Perspective rotate' },
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setAnimStyle(s.id); localStorage.setItem('sticky_notes_anim_style', s.id); }}
                        className={`p-2 rounded-lg border text-left transition-all ${animStyle === s.id ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500'}`}
                      >
                        <div className="text-xs font-bold leading-tight">{s.label}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                  {/* Neon Burst: additive option on top of any style */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <div className="text-xs font-bold text-zinc-300">⚡ Neon Burst</div>
                      <div className="text-[10px] text-zinc-500">Add glow effect to any transition</div>
                    </div>
                    <input type="checkbox" checked={neonBurst} onChange={e => { setNeonBurst(e.target.checked); localStorage.setItem('sticky_notes_neon_burst', String(e.target.checked)); }} className="w-4 h-4 accent-yellow-500" />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">List View Mode</div>
                  <div className="text-xs text-zinc-500">Show stickies as a list instead of a grid</div>
                </div>
                <input type="checkbox" checked={viewMode === 'list'} onChange={e => {
                  const next = e.target.checked ? 'list' : 'grid';
                  setViewMode(next);
                  localStorage.setItem('sticky_notes_view_mode', next);
                }} className="w-4 h-4 accent-yellow-500" />
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
                  <div className="text-xs text-zinc-500">Only show items with the sticky-notes tag (hides them from Notes app)</div>
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
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">Dark Theme</div>
                  <div className="text-xs text-zinc-500">Show only dark mode background</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={prefs.darkTheme} onChange={e => updatePref('darkTheme', e.target.checked)} />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">Show Return Markers</div>
                  <div className="text-xs text-zinc-500">Show ¶ at end of hard-return lines inside open notes (like formatting marks)</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={prefs.showReturnMarkers} onChange={e => updatePref('showReturnMarkers', e.target.checked)} />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">Automatic Line Numbers</div>
                  <div className="text-xs text-zinc-500">Starting a line with "1." auto-continues numbering on each Enter. Press Enter on empty line to stop.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={prefs.autoLineNumbers} onChange={e => updatePref('autoLineNumbers', e.target.checked)} />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <Button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full bg-zinc-100 hover:bg-white text-zinc-900 border border-transparent font-bold mt-4"
                >
                  <Save className="w-4 h-4 mr-2" /> Save Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visibility Modal */}
      {isVisibilityOpen && (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950 shrink-0">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-500"/> Sticky Notes Visibility Settings
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setIsVisibilityOpen(false)} className="text-zinc-400 hover:text-white h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-4">
                {notesStore.notebooks.map(nb => {
                  const isNbChecked = !excludedNotebooks.includes(nb.id);
                  const sections = notesStore.sections.filter(s => s.notebook_id === nb.id);
                  
                  return (
                    <div key={nb.id} className="space-y-2 border-b border-zinc-800 pb-3 last:border-b-0">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm font-semibold text-zinc-200">
                          <input
                            type="checkbox"
                            checked={isNbChecked}
                            onChange={() => {
                              setExcludedNotebooks(prev => {
                                let next;
                                if (prev.includes(nb.id)) {
                                  next = prev.filter(id => id !== nb.id);
                                } else {
                                  next = [...prev, nb.id];
                                }
                                localStorage.setItem('sticky_notes_excluded_notebooks', JSON.stringify(next));
                                setTimeout(() => window.dispatchEvent(new Event('storage')), 0);
                                return next;
                              });
                            }}
                            className="h-4.5 w-4.5 rounded border-zinc-800 bg-zinc-950 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                          <Folder className="w-4 h-4 text-zinc-500 shrink-0" />
                          <span>{nb.name}</span>
                        </label>
                      </div>
                      
                      {sections.length > 0 && (
                        <div className="ml-7 space-y-2">
                          {sections.map(sec => {
                            const isSecChecked = !excludedSections.includes(sec.id);
                            return (
                              <label key={sec.id} className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-zinc-400 hover:text-zinc-300">
                                <input
                                  type="checkbox"
                                  checked={isSecChecked && isNbChecked}
                                  disabled={!isNbChecked}
                                  onChange={() => {
                                    setExcludedSections(prev => {
                                      let next;
                                      if (prev.includes(sec.id)) {
                                        next = prev.filter(id => id !== sec.id);
                                      } else {
                                        next = [...prev, sec.id];
                                      }
                                      localStorage.setItem('sticky_notes_excluded_sections', JSON.stringify(next));
                                      setTimeout(() => window.dispatchEvent(new Event('storage')), 0);
                                      return next;
                                    });
                                  }}
                                  className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
                                />
                                <FileText className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                                <span>{sec.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {notesStore.notebooks.length === 0 && (
                  <div className="text-center py-6 text-zinc-600 text-xs">
                    No notebooks found.
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-between gap-3 shrink-0">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setExcludedNotebooks([]);
                  setExcludedSections([]);
                  localStorage.removeItem('sticky_notes_excluded_notebooks');
                  localStorage.removeItem('sticky_notes_excluded_sections');
                  setTimeout(() => window.dispatchEvent(new Event('storage')), 0);
                  toast({ title: "Reset visibility to all folders" });
                }}
                className="text-zinc-400 hover:bg-zinc-800 text-xs h-9"
              >
                Reset to All
              </Button>
              <Button 
                onClick={() => setIsVisibilityOpen(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9 px-6 rounded-lg font-semibold"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reminders Modal */}
      {isRemindersModalOpen && (
        <div 
          className="fixed inset-0 z-[450] bg-black/60 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsRemindersModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-yellow-500" />
                Active Reminders ({notesWithReminders.length})
              </h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsRemindersModalOpen(false)} 
                className="h-8 w-8 text-zinc-400 hover:text-white rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-2">
              {notesWithReminders.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">
                  <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No active reminders.</p>
                  <p className="text-xs mt-1 opacity-60">Set a reminder on a sticky note to see it here.</p>
                </div>
              ) : (
                notesWithReminders.map(note => {
                  const rem = getReminderData(note);
                  return (
                    <div 
                      key={note.id}
                      onClick={() => {
                        setIsRemindersModalOpen(false);
                        handleEditNote(note);
                      }}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 cursor-pointer transition-all group"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="text-white text-sm font-semibold truncate">
                          {note.title || getCleanContent(note.content).substring(0, 30) || 'Untitled Note'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 opacity-70">
                          <span className="text-xs text-yellow-500 font-medium">
                            {rem?.date} {rem?.time && formatAmPm(rem.time)}
                          </span>
                          {rem?.repeat && rem.repeat !== 'none' && (
                            <span className="text-[10px] bg-zinc-700 px-1.5 rounded text-zinc-300">
                              {rem.repeat}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Label note Popup */}
      {isLabelModalOpen && editingNote && (
        <div 
          className="fixed inset-0 z-[450] bg-black/60 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsLabelModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h3 className="font-bold text-white text-base">Tag note</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsLabelModalOpen(false)} 
                className="h-8 w-8 text-zinc-400 hover:text-white rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter label name"
                  value={labelSearchText}
                  onChange={(e) => setLabelSearchText(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      await handleAddLabel();
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 text-sm focus:outline-none focus:border-blue-500 placeholder:text-zinc-500"
                />
                <Button 
                  onClick={handleAddLabel}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 rounded-lg font-semibold h-9 shrink-0"
                >
                  Add
                </Button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {notesStore.sections.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-2">No labels created yet</p>
                ) : (
                  notesStore.sections
                    .filter(sec => 
                      !labelSearchText || 
                      sec.name.toLowerCase().includes(labelSearchText.toLowerCase())
                    )
                    .map(sec => {
                      const isChecked = editingNote.section_id === sec.id || editingNote.tags?.includes(`__section:${sec.id}`);
                      return (
                        <div key={sec.id} className="flex items-center justify-between group px-2 py-1 transition-colors rounded-lg hover:bg-zinc-800/50">
                          <label className="flex items-center gap-3 flex-1 cursor-pointer text-zinc-300 hover:text-white transition-colors">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleLabel(sec.id)}
                              className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900 focus:ring-offset-2"
                            />
                            <span className="text-sm font-medium">{getFullSectionName(notesStore, sec.id)}</span>
                          </label>
                          <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => { e.stopPropagation(); setIsLabelModalOpen(false); handleEditSection(sec); }}
                              className="h-7 w-7 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded"
                              title="Edit Tag"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => { e.stopPropagation(); handleDeleteLabelFromPopup(sec.id); }}
                              className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                              title="Delete Tag"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex justify-end">
              <Button 
                onClick={() => setIsLabelModalOpen(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 px-6 rounded-lg font-semibold"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Prompt Modal */}
      {deletePrompt?.isOpen && (
        <div className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-white font-bold mb-2 flex items-center gap-2 text-lg">
              <span className="text-red-500">⚠️</span> Warning
            </h2>
            <p className="text-zinc-300 text-sm mb-6 leading-relaxed">
              You are deleting the {deletePrompt.type === 'notebook' ? 'Category' : 'Submenu'} <strong>"{deletePrompt.name}"</strong>, which contains <strong>{deletePrompt.noteCount}</strong> sticky note{deletePrompt.noteCount > 1 ? 's' : ''}.<br/><br/>
              What would you like to do with these notes?
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                variant="outline" 
                className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 font-semibold"
                onClick={async () => {
                  // Keep notes (untag them)
                  const isNb = deletePrompt.type === 'notebook';
                  let sectionIds = isNb ? notesStore.sections.filter(s => s.notebook_id === deletePrompt.id).map(s => s.id) : [deletePrompt.id];
                  const notesToUpdate = notesStore.notes.filter(n => sectionIds.includes(n.section_id!) || n.tags?.some(t => t.startsWith('__section:') && sectionIds.includes(t.replace('__section:', ''))));
                  
                  // Unlink notes sequentially
                  for (const n of notesToUpdate) {
                    const newTags = n.tags?.filter(t => !sectionIds.some(sid => t === `__section:${sid}`)) || [];
                    let newSectionId = n.section_id;
                    if (newSectionId && sectionIds.includes(newSectionId)) {
                      newSectionId = newTags.find(t => t.startsWith('__section:'))?.replace('__section:', '') || null;
                    }
                    await notesStore.updateNote(n.id, { section_id: newSectionId, tags: newTags });
                  }

                  if (isNb) {
                    await notesStore.deleteNotebook(deletePrompt.id);
                  } else {
                    await notesStore.deleteSection(deletePrompt.id);
                  }
                  toast({ title: `${isNb ? 'Category' : 'Submenu'} deleted, notes kept` });
                  setDeletePrompt(null);
                }}
              >
                Keep Notes (Un-tag)
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-500 text-white font-semibold"
                onClick={async () => {
                  // Delete notes sequentially (to ensure no orphaned UI state if Supabase cascade takes a moment)
                  const isNb = deletePrompt.type === 'notebook';
                  let sectionIds = isNb ? notesStore.sections.filter(s => s.notebook_id === deletePrompt.id).map(s => s.id) : [deletePrompt.id];
                  const notesToDelete = notesStore.notes.filter(n => sectionIds.includes(n.section_id!) || n.tags?.some(t => t.startsWith('__section:') && sectionIds.includes(t.replace('__section:', ''))));
                  
                  for (const n of notesToDelete) {
                    await notesStore.deleteNote(n.id);
                  }

                  if (isNb) {
                    await notesStore.deleteNotebook(deletePrompt.id);
                  } else {
                    await notesStore.deleteSection(deletePrompt.id);
                  }
                  toast({ title: `${isNb ? 'Category' : 'Submenu'} and notes deleted` });
                  setDeletePrompt(null);
                }}
              >
                Delete Notes & Menu
              </Button>
              <Button 
                variant="ghost" 
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                onClick={() => setDeletePrompt(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[500] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-full max-h-[90vh] flex items-center justify-center">
            <img 
              src={lightboxImage} 
              alt="attachment preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200" 
            />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLightboxImage(null)} 
              className="absolute -top-12 right-0 text-white hover:bg-white/10 rounded-full h-10 w-10 z-10"
              title="Close Fullscreen"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
          <div className="mt-4 text-xs text-zinc-400 font-semibold bg-zinc-950/80 px-3 py-1.5 rounded-full border border-zinc-800 backdrop-blur-sm pointer-events-none select-none">
            Click anywhere to exit fullscreen view
          </div>
        </div>
      )}

    </div>
  );
}
