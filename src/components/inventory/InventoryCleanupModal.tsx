import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Trash2, AlertCircle, RefreshCw, Calendar, Search } from "lucide-react";
import { getChemicals, getTools, getMaterials, deleteChemical, deleteTool, deleteMaterial } from "@/lib/inventory-data";
import { Input } from "@/components/ui/input";

interface InventoryCleanupModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function InventoryCleanupModal({ open, onOpenChange }: InventoryCleanupModalProps) {
    const [activeTab, setActiveTab] = useState<"chemicals" | "tools" | "materials">("chemicals");
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selection, setSelection] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (open) {
            loadItems();
            setSelection(new Set());
            setSearchQuery("");
        }
    }, [open, activeTab]);

    const loadItems = async () => {
        setLoading(true);
        try {
            let data: any[] = [];
            if (activeTab === "chemicals") data = await getChemicals();
            else if (activeTab === "tools") data = await getTools();
            else if (activeTab === "materials") data = await getMaterials();

            // Sort by createdAt desc (newest first)
            data.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });

            setItems(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load items");
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selection);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelection(newSet);
    };

    const toggleAll = (select: boolean) => {
        if (select) {
            const newSet = new Set<string>();
            filteredItems.forEach(i => newSet.add(i.id));
            setSelection(newSet);
        } else {
            setSelection(new Set());
        }
    };

    const handleDelete = async () => {
        if (selection.size === 0) return;
        if (!confirm(`Are you sure you want to permanently delete ${selection.size} items?`)) return;

        setLoading(true);
        try {
            const ids = Array.from(selection);
            if (activeTab === "chemicals") {
                await Promise.all(ids.map(id => deleteChemical(id)));
            } else if (activeTab === "tools") {
                await Promise.all(ids.map(id => deleteTool(id)));
            } else if (activeTab === "materials") {
                await Promise.all(ids.map(id => deleteMaterial(id)));
            }
            toast.success(`Deleted ${selection.size} items.`);
            setSelection(new Set());
            loadItems();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete items.");
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "Unknown Date";
        return new Date(dateStr).toLocaleString();
    };

    const isToday = (dateStr?: string) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        Bulk Delete Inventory
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-4">
                        <TabsList className="grid w-[400px] grid-cols-3">
                            <TabsTrigger value="chemicals">Chemicals</TabsTrigger>
                            <TabsTrigger value="materials">Materials</TabsTrigger>
                            <TabsTrigger value="tools">Tools</TabsTrigger>
                        </TabsList>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => toggleAll(true)} className="text-xs">All</Button>
                            <Button variant="outline" size="sm" onClick={() => toggleAll(false)} className="text-xs">None</Button>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search items..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center px-3 border rounded-md bg-muted/50 text-xs font-semibold whitespace-nowrap text-muted-foreground">
                            {items.length} {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                        </div>
                    </div>

                    <div className="bg-muted/30 border rounded-t-md p-2 grid grid-cols-[30px_1fr_150px] gap-4 text-xs font-semibold text-muted-foreground">
                        <div className="pl-2"></div>
                        <div>Name</div>
                        <div>Created At</div>
                    </div>

                    <div className="flex-1 overflow-y-auto border rounded-b-md bg-background min-h-0">
                        <div className="divide-y relative min-h-[300px]">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <RefreshCw className="w-6 h-6 animate-spin" />
                                        <span className="text-xs">Loading items...</span>
                                    </div>
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    No items found.
                                </div>
                            ) : (
                                <>
                                    {/* Created Today Section */}
                                    {filteredItems.some(i => isToday(i.createdAt)) && (
                                        <>
                                            <div className="bg-muted/50 px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-widest sticky top-0 backdrop-blur-sm z-10 border-b">
                                                Created Today (New Imports)
                                            </div>
                                            {filteredItems.filter(i => isToday(i.createdAt)).map((item) => (
                                                <div key={item.id} className={`grid grid-cols-[30px_1fr_150px] gap-4 p-3 items-center hover:bg-muted/20 transition-colors ${selection.has(item.id) ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                                    <Checkbox
                                                        checked={selection.has(item.id)}
                                                        onCheckedChange={() => toggleSelection(item.id)}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{item.name}</span>
                                                        <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                                            <Calendar className="w-3 h-3" /> New
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {formatDate(item.createdAt)}
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* Older Items Section */}
                                    {filteredItems.some(i => !isToday(i.createdAt)) && (
                                        <>
                                            <div className="bg-muted/50 px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-widest sticky top-0 backdrop-blur-sm z-10 border-b border-t mt-0">
                                                Older Items
                                            </div>
                                            {filteredItems.filter(i => !isToday(i.createdAt)).map((item) => (
                                                <div key={item.id} className={`grid grid-cols-[30px_1fr_150px] gap-4 p-3 items-center hover:bg-muted/20 transition-colors ${selection.has(item.id) ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                                    <Checkbox
                                                        checked={selection.has(item.id)}
                                                        onCheckedChange={() => toggleSelection(item.id)}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{item.name}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {formatDate(item.createdAt)}
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </Tabs>

                <DialogFooter className="mt-4 sm:justify-between">
                    <div className="flex items-center text-sm text-muted-foreground">
                        {selection.size} items selected
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={selection.size === 0 || loading}
                            className="gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> Delete Selected
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
