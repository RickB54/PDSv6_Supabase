import { useState, useEffect, useRef } from "react";
import { getLibraryItems, upsertLibraryItem, deleteLibraryItem, LibraryItem, supabase } from "@/lib/supa-data";
import { 
    Save, Trash2, ArrowUp, ArrowDown, RefreshCw, Loader2, Database, 
    Sparkles, Rocket, Pencil, Star, Globe, Lock, History, Search, 
    X, Filter, ChevronRight, CheckCircle2, Wand2, Info, GripVertical,
    FileText, Calendar, Clock, Share2, Facebook, Instagram, Music, AlertTriangle,
    ChevronDown, ChevronUp, Play
} from "lucide-react";
import { BlogSocialBlast } from "@/components/BlogSocialBlast";
import { BlogAIAssistant } from "@/components/BlogAIAssistant";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/storage-utils";

// DND Kit Imports
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * ELITE STORY MASTER v4.4 - "MOBILE OPTIMIZED COMMAND CENTER"
 * 
 * FEATURES:
 * 1. Accordion Layout: Each post is collapsed by default for maximum screen real estate.
 * 2. Visual First: 1.5x larger thumbnails with responsive multi-line titles.
 * 3. Mobile Optimized: No horizontal scrolling; action buttons expand when needed.
 * 4. Drag & Drop: Grab handles remain active for quick reordering.
 * 5. Full Context: Expanded view shows all meta-controls (AI, Social, Stats).
 */

interface HistoryItem {
    id: string;
    timestamp: string;
    action: 'Edit' | 'Social Blast' | 'Publication' | 'Pin' | 'Delete' | 'Reorder' | 'AI Write';
    itemTitle: string;
    details: string;
}

// --- Sortable Item Component ---
function SortablePostCard({ 
    item, 
    idx, 
    isLast, 
    onMove, 
    onDelete, 
    onEdit, 
    onAI, 
    onSocial, 
    onTogglePin, 
    onTogglePublish 
}: { 
    item: LibraryItem; 
    idx: number; 
    isLast: boolean;
    onMove: (idx: number, dir: 'up' | 'down') => void;
    onDelete: (item: LibraryItem) => void;
    onEdit: (item: LibraryItem) => void;
    onAI: (item: LibraryItem) => void;
    onSocial: (item: LibraryItem) => void;
    onTogglePin: (item: LibraryItem) => void;
    onTogglePublish: (item: LibraryItem) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isDragging ? '#111' : '#050505',
        boxShadow: isDragging ? '0 20px 40px rgba(0,0,0,0.5)' : 'none',
        borderRadius: '20px', 
        border: isDragging ? '1px solid #3b82f6' : '1px solid #111',
        marginBottom: '10px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column' as const
    };

    return (
        <div ref={setNodeRef} style={style}>
            {/* --- COLLAPSED HEADER (SUMMARY) --- */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '15px 20px', 
                    gap: '15px', 
                    cursor: 'pointer',
                    background: isExpanded ? '#080808' : 'transparent',
                    borderBottom: isExpanded ? '1px solid #111' : 'none',
                    transition: 'background 0.2s'
                }}
            >
                {/* GRIP HANDLE */}
                <div 
                    {...attributes} 
                    {...listeners} 
                    onClick={e => e.stopPropagation()} 
                    style={{ cursor: 'grab', color: '#1a1a1a', padding: '10px 5px' }}
                >
                    <GripVertical size={20} />
                </div>

                {/* THUMBNAIL (75px) */}
                <div style={{ width: '75px', height: '75px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#020202', border: '1px solid #111', flexShrink: 0, position: 'relative' }}>
                    {item.resource_url ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <img 
                                src={item.resource_url} 
                                alt={item.title} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "/logo-3inch.png";
                                    target.style.padding = "15px";
                                    target.style.opacity = "0.2";
                                }}
                            />
                            {item.type === 'video' && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        <Play size={14} fill="white" color="white" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>
                            <FileText size={24} />
                        </div>
                    )}
                </div>

                {/* TITLE & CATEGORY */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '9px', fontWeight: '900', color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.category || 'General'}</span>
                        {item.is_pinned && <div style={{ backgroundColor: '#f59e0b', color: 'black', fontSize: '8px', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>FEATURED</div>}
                        {!item.is_published && <div style={{ backgroundColor: '#111', color: '#555', fontSize: '8px', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>DRAFT</div>}
                    </div>
                    <div style={{ 
                        fontSize: '16px', 
                        fontWeight: '900', 
                        textTransform: 'uppercase', 
                        color: isExpanded ? '#3b82f6' : '#fff', 
                        fontStyle: 'italic',
                        lineHeight: 1.2,
                        wordWrap: 'break-word' as const,
                        whiteSpace: 'normal' as const
                    }}>
                        {item.title}
                    </div>
                </div>

                {/* ACCORDION INDICATOR */}
                <div style={{ color: isExpanded ? '#3b82f6' : '#111', marginLeft: '5px' }}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>

            {/* --- EXPANDED CONTROLS --- */}
            {isExpanded && (
                <div style={{ padding: '20px', backgroundColor: '#030303', borderTop: '1px solid #000' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between' }}>
                        
                        {/* PRECISION REORDERING */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0a0a0a', padding: '8px 15px', borderRadius: '12px', border: '1px solid #151515' }}>
                            <button 
                                onClick={e => { e.stopPropagation(); onMove(idx, 'up'); }} 
                                disabled={idx === 0}
                                style={{ background: 'none', border: 'none', color: idx === 0 ? '#111' : '#555', cursor: 'pointer' }}
                            ><ArrowUp size={16} /></button>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#3b82f6', minWidth: '20px', textAlign: 'center' }}>{idx + 1}</span>
                            <button 
                                onClick={e => { e.stopPropagation(); onMove(idx, 'down'); }} 
                                disabled={isLast}
                                style={{ background: 'none', border: 'none', color: isLast ? '#111' : '#555', cursor: 'pointer' }}
                            ><ArrowDown size={16} /></button>
                        </div>

                        {/* STATUS TOGGLES */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={e => { e.stopPropagation(); onTogglePublish(item); }}
                                style={{ 
                                    background: item.is_published ? '#064e3b' : '#18181b', 
                                    border: 'none', 
                                    padding: '10px 15px', 
                                    borderRadius: '10px', 
                                    color: item.is_published ? '#34d399' : '#52525b',
                                    fontSize: '10px',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    textTransform: 'uppercase'
                                }}
                            >
                                {item.is_published ? <Globe size={12} /> : <Lock size={12} />}
                                {item.is_published ? 'Public' : 'Private'}
                            </button>
                            <button 
                                onClick={e => { e.stopPropagation(); onTogglePin(item); }}
                                style={{ 
                                    background: item.is_pinned ? '#78350f' : '#18181b', 
                                    border: 'none', 
                                    padding: '10px 15px', 
                                    borderRadius: '10px', 
                                    color: item.is_pinned ? '#fbbf24' : '#52525b',
                                    fontSize: '10px',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    textTransform: 'uppercase'
                                }}
                            >
                                <Star size={12} style={{ fill: item.is_pinned ? '#fbbf24' : 'none' }} />
                                {item.is_pinned ? 'Pinned' : 'Pin'}
                            </button>
                        </div>

                        {/* CORE ACTION BUTTONS */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                onClick={e => { e.stopPropagation(); onAI(item); }}
                                style={{ background: '#1e1b4b', border: '1px solid #312e81', color: '#818cf8', padding: '12px', borderRadius: '12px', cursor: 'pointer' }}
                                title="AI Strategist"
                            ><Sparkles size={18} /></button>
                            <button 
                                onClick={e => { e.stopPropagation(); onSocial(item); }}
                                style={{ background: '#172554', border: '1px solid #1e3a8a', color: '#60a5fa', padding: '12px', borderRadius: '12px', cursor: 'pointer' }}
                                title="Social Blast"
                            ><Rocket size={18} /></button>
                            <button 
                                onClick={e => { e.stopPropagation(); onEdit(item); }}
                                style={{ background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa', padding: '12px', borderRadius: '12px', cursor: 'pointer' }}
                                title="Edit Metadata"
                            ><Pencil size={18} /></button>
                            <button 
                                onClick={e => { e.stopPropagation(); onDelete(item); }}
                                style={{ background: '#450a0a', border: '1px solid #7f1d1d', color: '#f87171', padding: '12px', borderRadius: '12px', cursor: 'pointer' }}
                                title="Delete Permanently"
                            ><Trash2 size={18} /></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Main Component ---
export default function EliteMaster() {
    const { toast } = useToast();
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [status, setStatus] = useState("Initializing System...");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("custom");
    
    // Modals & Panels
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isAIOpen, setIsAIOpen] = useState(false);
    const [isSocialOpen, setIsSocialOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    
    // Active Item States
    const [activeItem, setActiveItem] = useState<LibraryItem | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [editFormData, setEditFormData] = useState({ title: '', category: '', description: '', resource_url: '' });
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        loadData();
        loadHistory();
    }, []);

    const loadData = async () => {
        setStatus("ACCESSING DATABASE...");
        try {
            const data = await getLibraryItems();
            const list = Array.isArray(data) ? data : [];
            // Filter: Only show items that are verified for the blog.
            // Internal Learning Library items are NOT verified by default.
            // When an item is "sent to blog", it becomes verified.
            const blogOnly = list.filter(i => i && i.is_verified === true);
            
            const sorted = blogOnly.sort((a, b) => {
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;
                return (a.sort_order || 0) - (b.sort_order || 0);
            });
            
            setItems(sorted);
            setStatus(`READY: ${sorted.length} ARCHIVES.`);
        } catch (e: any) {
            setError("SYNC FAILED");
            setStatus("ERROR.");
        }
    };

    const loadHistory = () => {
        const saved = localStorage.getItem('elite_story_history');
        if (saved) {
            try { setHistory(JSON.parse(saved)); } catch { setHistory([]); }
        }
    };

    const logAction = (action: HistoryItem['action'], itemTitle: string, details: string) => {
        const newItem: HistoryItem = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            action,
            itemTitle,
            details
        };
        const updated = [newItem, ...history].slice(0, 50);
        setHistory(updated);
        localStorage.setItem('elite_story_history', JSON.stringify(updated));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);
                return newItems;
            });
            setStatus("LAYOUT ADJUSTED (PENDING SAVE)");
        }
    };

    const handleMove = (idx: number, dir: 'up' | 'down') => {
        const nextIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (nextIdx < 0 || nextIdx >= items.length) return;
        const newItems = [...items];
        [newItems[idx], newItems[nextIdx]] = [newItems[nextIdx], newItems[idx]];
        setItems(newItems);
        setStatus("LAYOUT ADJUSTED (PENDING SAVE)");
    };

    const handleSaveOrder = async () => {
        setIsSaving(true);
        setStatus("LOCKING SEQUENCE...");
        try {
            // Bulk upsert for performance
            const payloads = items.map((it, i) => ({
                id: it.id,
                title: it.title,
                content: it.description,
                description: it.description,
                type: it.type,
                category: it.category,
                thumbnail_url: it.thumbnail_url,
                resource_url: it.resource_url,
                is_published: it.is_published,
                is_pinned: it.is_pinned,
                sort_order: i + 1,
                updated_at: new Date().toISOString()
            }));

            const { error } = await (supabase as any)
                .from('learning_library_items')
                .upsert(payloads);

            if (error) throw error;

            setStatus("SEQUENCE SECURED.");
            logAction('Reorder', 'Multiple Posts', `New sequence locked for ${items.length} items`);
            setTimeout(() => setStatus(`STABLE: ${items.length} ARCHIVES.`), 2000);
            toast({ title: "Sequence Locked", description: "The new blog layout is now live." });
        } catch (e) {
            console.error("Save Error:", e);
            setError("SYNC FAILED.");
            toast({ title: "Sync Error", description: "Could not persist order to database.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const togglePin = async (item: LibraryItem) => {
        try {
            const updated = { ...item, is_pinned: !item.is_pinned };
            await upsertLibraryItem(updated);
            setItems(prev => prev.map(it => it.id === item.id ? updated : it));
            logAction('Pin', item.title, updated.is_pinned ? 'Pinned to spotlight' : 'Removed from spotlight');
            toast({ title: updated.is_pinned ? "Pinned" : "Unpinned", description: `"${item.title}" position adjusted.` });
        } catch (e) {
            toast({ title: "Error", description: "Failed to update pin state.", variant: "destructive" });
        }
    };

    const togglePublish = async (item: LibraryItem) => {
        try {
            const updated = { ...item, is_published: !item.is_published };
            await upsertLibraryItem(updated);
            setItems(prev => prev.map(it => it.id === item.id ? updated : it));
            logAction('Publication', item.title, updated.is_published ? 'Post Made Public' : 'Post Set to Private');
            toast({ title: updated.is_published ? "Published" : "Hidden", description: `Visibility updated for "${item.title}".` });
        } catch (e) {
            toast({ title: "Error", description: "Failed to update visibility.", variant: "destructive" });
        }
    };

    const openEdit = (item: LibraryItem) => {
        setActiveItem(item);
        setEditFormData({ title: item.title || '', category: item.category || '', description: item.description || '', resource_url: item.resource_url || '' });
        setIsEditOpen(true);
    };

    const handleEditSubmit = async () => {
        if (!activeItem) return;
        try {
            const updated = { ...activeItem, ...editFormData };
            await upsertLibraryItem(updated);
            setItems(prev => prev.map(it => it.id === activeItem.id ? updated : it));
            logAction('Edit', updated.title, 'Metadata manually updated');
            setIsEditOpen(false);
            toast({ title: "Post Updated", description: "Changes saved successfully." });
        } catch (e) {
            toast({ title: "Error", description: "Failed to save edits.", variant: "destructive" });
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingImage(true);
        try {
            const url = await uploadFile('blog-media', file);
            setEditFormData(prev => ({ ...prev, resource_url: url }));
            toast({ title: "Image Uploaded", description: "Image successfully uploaded and link generated." });
        } catch (error) {
            toast({ title: "Upload Failed", description: "Failed to upload image.", variant: "destructive" });
        } finally {
            setIsUploadingImage(false);
            e.target.value = ''; // Reset input
        }
    };

    const triggerDelete = (item: LibraryItem) => {
        setActiveItem(item);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!activeItem) return;
        try {
            setStatus("PURGING...");
            const success = await deleteLibraryItem(activeItem.id);
            if (success) {
                setItems(prev => prev.filter(i => i.id !== activeItem.id));
                logAction('Delete', activeItem.title, 'Post purged from database');
                setStatus("PURGED.");
                toast({ title: "Deleted", description: `"${activeItem.title}" has been removed.` });
            } else {
                throw new Error("Delete failed");
            }
        } catch (e) {
            setError("PURGE FAILED.");
            toast({ title: "Error", description: "Could not remove post from database.", variant: "destructive" });
        } finally {
            setIsDeleteOpen(false);
            setActiveItem(null);
        }
    };

    const handleApplyAI = async (text: string, image?: string) => {
        if (!activeItem) return;
        try {
            const updated = { ...activeItem, description: text };
            if (image) updated.thumbnail_url = image;
            await upsertLibraryItem(updated);
            setItems(prev => prev.map(it => it.id === activeItem.id ? updated : it));
            logAction('AI Write', activeItem.title, 'AI content and visual applied');
            toast({ title: "AI Applied", description: "New content integrated into post." });
        } catch (e) {
            toast({ title: "Error", description: "Failed to apply AI content.", variant: "destructive" });
        }
    };

    const filteredItems = items.filter(it => 
        it.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        it.category.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.created_at || b.updated_at || 0).getTime() - new Date(a.created_at || a.updated_at || 0).getTime();
        if (sortBy === 'oldest') return new Date(a.created_at || a.updated_at || 0).getTime() - new Date(b.created_at || b.updated_at || 0).getTime();
        if (sortBy === 'a-z') return (a.title || '').localeCompare(b.title || '');
        if (sortBy === 'z-a') return (b.title || '').localeCompare(a.title || '');
        return 0; // custom order relies on items array which is pre-sorted
    });

    return (
        <div style={{ 
            backgroundColor: '#020202', 
            color: '#ffffff', 
            minHeight: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* --- ISOLATED HEADER --- */}
            <header style={{ 
                padding: '15px 30px', 
                borderBottom: '1px solid #111', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: '#050505',
                position: 'sticky',
                top: 0,
                zIndex: 50
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '36px', height: '36px', backgroundColor: '#3b82f6', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                        <Database size={18} color="white" />
                    </div>
                    <div>
                        <span style={{ fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', fontSize: '16px', letterSpacing: '-1px', display: 'block', lineHeight: 1 }}>
                            Elite <span style={{ color: '#3b82f6' }}>Story Master</span>
                        </span>
                        <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#333', textTransform: 'uppercase', letterSpacing: '2px' }}>Command Center v4.4</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ fontSize: '9px', fontWeight: '900', color: error ? '#ef4444' : '#3b82f6', letterSpacing: '2px', textTransform: 'uppercase' }}>
                        {status}
                    </div>
                    <button 
                        onClick={() => setIsHistoryOpen(true)}
                        style={{ background: '#111', border: '1px solid #222', color: '#fff', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: 'bold' }}
                    >
                        <History size={14} className="text-amber-400" /> HISTORY
                    </button>
                </div>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main style={{ flex: 1, width: '100%', maxWidth: '900px', margin: '0 auto', padding: '40px 15px' }}>
                
                {/* TOOLBAR */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                        <Search style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#333' }} size={16} />
                        <input 
                            placeholder="SEARCH ARCHIVES..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ 
                                width: '100%', 
                                backgroundColor: '#0a0a0a', 
                                border: '1px solid #151515', 
                                padding: '12px 45px 12px 45px', 
                                borderRadius: '15px',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                style={{ 
                                    position: 'absolute', 
                                    right: '15px', 
                                    top: '50%', 
                                    transform: 'translateY(-50%)', 
                                    color: '#333',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{
                                backgroundColor: '#0a0a0a',
                                border: '1px solid #151515',
                                padding: '12px',
                                borderRadius: '12px',
                                color: '#aaa',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            <option value="custom">Sort: Manual</option>
                            <option value="newest">Sort: Newest</option>
                            <option value="oldest">Sort: Oldest</option>
                            <option value="a-z">Sort: A-Z</option>
                            <option value="z-a">Sort: Z-A</option>
                        </select>
                        <button 
                            onClick={loadData}
                            style={{ background: '#0a0a0a', border: '1px solid #151515', color: '#444', padding: '12px', borderRadius: '12px', cursor: 'pointer' }}
                            title="Refresh Sync"
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button 
                            onClick={handleSaveOrder}
                            disabled={isSaving || items.length === 0}
                            style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '15px',
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                fontStyle: 'italic',
                                cursor: 'pointer',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            SAVE SEQUENCE
                        </button>
                    </div>
                </div>

                {/* ITEMS LIST (SORTABLE) */}
                {filteredItems.length === 0 && !error ? (
                    <div style={{ padding: '100px 0', textAlign: 'center', color: '#222', border: '2px dashed #111', borderRadius: '40px', marginTop: '20px' }}>
                        <Loader2 size={40} style={{ animation: 'spin 2s linear infinite', marginBottom: '20px' }} />
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>ACCESSING SECURE ARCHIVES...</div>
                    </div>
                ) : (
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext 
                            items={filteredItems.map(i => i.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div style={{ marginTop: '10px' }}>
                                {filteredItems.map((item, idx) => (
                                    <SortablePostCard 
                                        key={item.id} 
                                        item={item} 
                                        idx={idx} 
                                        isLast={idx === filteredItems.length - 1}
                                        onMove={handleMove}
                                        onDelete={triggerDelete}
                                        onEdit={openEdit}
                                        onAI={(it) => { setActiveItem(it); setIsAIOpen(true); }}
                                        onSocial={(it) => { setActiveItem(it); setIsSocialOpen(true); }}
                                        onTogglePin={togglePin}
                                        onTogglePublish={togglePublish}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </main>

            <footer style={{ padding: '40px', textAlign: 'center', color: '#111', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '4px' }}>
                PRIME SYSTEMS // ELITE MASTER v4.4 // MOBILE ACCORDION BUILD
            </footer>

            {/* --- MODALS --- */}

            {/* ACTIVITY HISTORY MODAL */}
            {isHistoryOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '100%', maxWidth: '500px', backgroundColor: '#050505', height: '100%', borderLeft: '1px solid #111', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.3s ease-out' }}>
                        <div style={{ padding: '30px', borderBottom: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase' }}>Activity <span style={{ color: '#f59e0b' }}>History</span></h2>
                                <p style={{ fontSize: '10px', color: '#333', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>System Audit Log</p>
                            </div>
                            <button onClick={() => setIsHistoryOpen(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                            {history.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '100px 20px', color: '#222' }}>
                                    <History size={40} style={{ marginBottom: '20px' }} />
                                    <p style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>No entries recorded yet.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {history.map(entry => (
                                        <div key={entry.id} style={{ backgroundColor: '#0a0a0a', padding: '15px', borderRadius: '12px', border: '1px solid #111' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '9px', fontWeight: '900', backgroundColor: '#111', padding: '2px 8px', borderRadius: '4px', color: '#f59e0b' }}>{entry.action}</span>
                                                <span style={{ fontSize: '9px', color: '#333' }}>{new Date(entry.timestamp).toLocaleString()}</span>
                                            </div>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>{entry.itemTitle}</div>
                                            <div style={{ fontSize: '11px', color: '#555' }}>{entry.details}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* QUICK EDIT MODAL */}
            {isEditOpen && activeItem && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ width: '100%', maxWidth: '800px', backgroundColor: '#0a0a0a', borderRadius: '32px', border: '1px solid #222', padding: '40px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase' }}>Edit <span style={{ color: '#3b82f6' }}>Post Content</span></h2>
                                <p style={{ fontSize: '10px', color: '#444', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '5px' }}>Prime Archive Editor v4.3</p>
                            </div>
                            <button onClick={() => setIsEditOpen(false)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer' }}><X size={32} /></button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Post Title</label>
                                    <input 
                                        value={editFormData.title}
                                        onChange={e => setEditFormData({...editFormData, title: e.target.value})}
                                        style={{ width: '100%', backgroundColor: '#050505', border: '1px solid #222', padding: '15px', borderRadius: '12px', color: 'white', fontSize: '14px', fontWeight: 'bold' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Category</label>
                                    <input 
                                        value={editFormData.category}
                                        onChange={e => setEditFormData({...editFormData, category: e.target.value})}
                                        style={{ width: '100%', backgroundColor: '#050505', border: '1px solid #222', padding: '15px', borderRadius: '12px', color: 'white', fontSize: '14px', fontWeight: 'bold' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Image / Resource URL</span>
                                    <label style={{ cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {isUploadingImage ? <Loader2 size={12} className="animate-spin" /> : null}
                                        {isUploadingImage ? 'UPLOADING...' : 'UPLOAD NEW FILE'}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={handleImageUpload} 
                                            disabled={isUploadingImage}
                                            style={{ display: 'none' }} 
                                        />
                                    </label>
                                </label>
                                <input 
                                    value={editFormData.resource_url}
                                    onChange={e => setEditFormData({...editFormData, resource_url: e.target.value})}
                                    style={{ width: '100%', backgroundColor: '#050505', border: '1px solid #222', padding: '15px', borderRadius: '12px', color: 'white', fontSize: '14px', fontWeight: 'bold' }}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Story Content / Body Text</label>
                                <textarea 
                                    value={editFormData.description}
                                    onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                                    rows={12}
                                    style={{ 
                                        width: '100%', 
                                        backgroundColor: '#050505', 
                                        border: '1px solid #222', 
                                        padding: '20px', 
                                        borderRadius: '16px', 
                                        color: '#ccc', 
                                        fontSize: '15px', 
                                        lineHeight: '1.6',
                                        fontFamily: 'inherit',
                                        resize: 'vertical'
                                    }}
                                    placeholder="Write your story here..."
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                <button 
                                    onClick={() => setIsEditOpen(false)}
                                    style={{ flex: 1, padding: '18px', borderRadius: '16px', background: '#111', color: '#fff', border: '1px solid #222', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase' }}
                                >CANCEL</button>
                                <button 
                                    onClick={handleEditSubmit}
                                    style={{ 
                                        flex: 2, 
                                        padding: '18px', 
                                        borderRadius: '16px', 
                                        background: '#3b82f6', 
                                        color: '#fff', 
                                        border: 'none', 
                                        fontWeight: 'black', 
                                        cursor: 'pointer', 
                                        fontStyle: 'italic',
                                        textTransform: 'uppercase',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)'
                                    }}
                                >
                                    <Save size={18} />
                                    SAVE ARCHIVE UPDATES
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE WARNING DIALOG */}
            {isDeleteOpen && activeItem && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.98)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#0a0a0a', borderRadius: '32px', border: '1px solid #7f1d1d', padding: '40px', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', backgroundColor: '#450a0a', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <AlertTriangle size={32} color="#ef4444" />
                        </div>
                        <h2 style={{ margin: '0 0 12px', fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', color: '#fff' }}>Confirm <span style={{ color: '#ef4444' }}>Erase</span></h2>
                        <p style={{ color: '#555', fontSize: '14px', marginBottom: '32px', lineHeight: 1.5 }}>
                            You are about to permanently delete <span style={{ color: '#fff', fontWeight: 'bold' }}>"{activeItem.title}"</span>. This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button 
                                onClick={confirmDelete}
                                style={{ width: '100%', padding: '15px', borderRadius: '16px', background: '#ef4444', color: '#fff', border: 'none', fontWeight: '900', cursor: 'pointer', textTransform: 'uppercase' }}
                            >YES, DELETE FOREVER</button>
                            <button 
                                onClick={() => setIsDeleteOpen(false)}
                                style={{ width: '100%', padding: '15px', borderRadius: '16px', background: '#111', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase' }}
                            >NO, KEEP POST</button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXTERNAL MODALS */}
            {activeItem && !isDeleteOpen && (
                <>
                    <BlogSocialBlast 
                        isOpen={isSocialOpen} 
                        onOpenChange={setIsSocialOpen} 
                        item={activeItem} 
                    />
                    <BlogAIAssistant 
                        isOpen={isAIOpen} 
                        onOpenChange={setIsAIOpen} 
                        onApplySuggestion={handleApplyAI}
                        currentTitle={activeItem.title}
                        currentDescription={activeItem.description}
                    />
                </>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: #050505; }
                ::-webkit-scrollbar-thumb { background: #111; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #222; }
            `}</style>
        </div>
    );
}
