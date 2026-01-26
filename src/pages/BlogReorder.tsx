import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getLibraryItems, upsertLibraryItem, LibraryItem } from "@/lib/supa-data";
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
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Save, ArrowLeft, Loader2, Newspaper, Calendar, Pin } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BlogReorder() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setIsLoading(true);
        try {
            const data = await getLibraryItems();
            // Filter out Chemical Training items as they are in a different section
            // Filter out Chemical Training items as they are in a different section
            const blogItems = data.filter(item => item.category !== 'Chemical Training');

            // PRIORITY SORTING:
            // 1. IS_PINNED
            // 2. NO SORT_ORDER
            // 3. SORT_ORDER
            const sortedItems = [...blogItems].sort((a, b) => {
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;
                if (a.sort_order === undefined && b.sort_order === undefined) {
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                }
                if (a.sort_order === undefined) return -1;
                if (b.sort_order === undefined) return 1;
                return a.sort_order - b.sort_order;
            });

            setItems(sortedItems);
        } catch (error) {
            console.error("Failed to load blog items:", error);
            toast({ title: "Error loading blog items", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((prevItems) => {
                const oldIndex = prevItems.findIndex((item) => item.id === active.id);
                const newIndex = prevItems.findIndex((item) => item.id === over.id);
                return arrayMove(prevItems, oldIndex, newIndex);
            });
        }
    };

    const handleSaveOrder = async () => {
        setIsSaving(true);
        try {
            // Update each item with its new sort_order
            const updatePromises = items.map((item, index) => {
                return upsertLibraryItem({
                    ...item,
                    sort_order: index + 1 // 1-based index
                });
            });

            await Promise.all(updatePromises);
            toast({ title: "Order saved successfully", description: "The blog display sequence has been updated." });
        } catch (error) {
            console.error("Failed to save order:", error);
            toast({ title: "Error saving order", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <Navbar />
            <PageHeader title="BLOG REORDERING" />

            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-6">
                    <div className="space-y-2 text-left">
                        <Button
                            variant="ghost"
                            className="text-zinc-500 hover:text-white mb-2 p-0 h-auto"
                            onClick={() => navigate('/section/company-blog')}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> BACK TO DASHBOARD
                        </Button>
                        <h2 className="text-4xl font-black tracking-tighter uppercase italic">
                            VISUAL ARCHITECT
                        </h2>
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
                            DRAG AND DROP TO DEFINE THE FRONT-PAGE EXPERIENCE
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <Button
                            onClick={handleSaveOrder}
                            disabled={isSaving || isLoading}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl h-14 px-8 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5 mr-2" />
                            )}
                            SAVE NEW ORDER
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                        <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Accessing Story Archive...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-32 border-2 border-dashed border-zinc-900 rounded-[40px] bg-zinc-950/30">
                        <Newspaper className="w-16 h-16 text-zinc-800 mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-zinc-700 uppercase italic">No posts to organize</h3>
                        <p className="text-zinc-600 mt-2">Publish your first story to start reordering.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={items.map(i => i.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-3">
                                    {items.map((item) => (
                                        <SortableItem key={item.id} item={item} />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}

function SortableItem({ item }: { item: LibraryItem }) {
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
        zIndex: isDragging ? 50 : 0,
        position: 'relative' as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-4 p-4 rounded-3xl border transition-all duration-300 ${isDragging
                ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_40px_rgba(79,70,229,0.2)] scale-[1.02]'
                : 'bg-zinc-900/30 border-zinc-900 hover:border-zinc-800'
                }`}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-2 hover:bg-white/5 rounded-xl transition-colors"
                title="Drag to reorder"
            >
                <GripVertical className="w-6 h-6 text-zinc-700" />
            </div>

            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black shrink-0 border border-zinc-800">
                {item.type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500 text-xs">VIDEO</div>
                ) : (
                    <img
                        src={item.resource_url}
                        className="w-full h-full object-cover"
                        alt={item.title}
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/logo-3inch.png";
                            target.className = "w-full h-full object-contain p-2 opacity-20 grayscale";
                        }}
                    />
                )}
            </div>

            <div className="flex-1 min-w-0 text-left">
                <h4 className="font-black text-sm text-white truncate uppercase tracking-tighter">{item.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                    {item.is_pinned && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-black border border-indigo-500/20 flex items-center gap-1"><Pin className="w-2.5 h-2.5 fill-indigo-400" /> PINNED</span>}
                    <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{item.category}</span>
                    <span className="text-[10px] text-zinc-600 font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {item.sort_order !== undefined && (
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-black border border-indigo-500/10">
                            ORDER: #{item.sort_order}
                        </span>
                    )}
                </div>
            </div>

            <div className="hidden md:block text-right pr-4">
                {!item.is_published && <span className="text-[9px] font-black text-amber-500 border border-amber-500/20 px-2 py-1 rounded-lg uppercase">Draft</span>}
                {item.is_published && <span className="text-[9px] font-black text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded-lg uppercase">Live</span>}
            </div>
        </div>
    );
}
