import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhotoGalleryLightbox } from "@/components/gallery/PhotoGalleryLightbox";
import {
  Truck,
  Package,
  Wrench,
  FlaskConical,
  Plus,
  Image as ImageIcon,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronsUp,
  Info,
  FolderOpen,
  Pencil,
  GripVertical,
  MoreVertical,
  FolderPlus,
  ArrowUp,
  ArrowDown,
  X,
  Maximize2,
  ChevronLeft,
  ZoomIn,
  Download,
  ArrowLeft,
  FileText,
  Warehouse,
} from "lucide-react";
import {
  getChemicals,
  getMaterials,
  getTools,
  saveChemical,
  saveMaterial,
  saveTool,
  getSetupMedia,
  saveSetupMedia,
  deleteSetupMedia,
  uploadSetupMedia,
  getSetupCategories,
  saveSetupCategories,
  updateSetupMediaCategory,
  Chemical,
  Material,
  Tool,
  SetupMedia,
  SetupCategory,
} from "@/lib/inventory-data";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────
const MobileSetup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<SetupMedia[]>([]);
  const [categories, setCategories] = useState<SetupCategory[]>([]);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [selectedCategoryForUpload, setSelectedCategoryForUpload] = useState<string>("all");

  // Modals
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [addType, setAddType] = useState<"chemical" | "material" | "tool">("tool");
  const [newItem, setNewItem] = useState({ name: "", brand: "", category: "Supplies" });

  // Category Manager
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<SetupCategory | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [savingCats, setSavingCats] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Derived: visual media in display order (exclude PDFs for the photo lightbox)
  const visualMedia = useMemo(() => {
    const result: SetupMedia[] = [];
    const sortedCats = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // 1. Items in sorted categories
    sortedCats.forEach(cat => {
      const catMedia = media.filter(m => m.category === cat.id && m.type !== 'pdf');
      result.push(...catMedia);
    });
    
    // 2. Uncategorized items (no category, 'none', or missing category)
    const uncategorizedItems = media.filter(m => 
      m.type !== 'pdf' && 
      (!m.category || m.category === 'none' || !categories.find(c => c.id === m.category))
    );
    result.push(...uncategorizedItems);
    
    return result;
  }, [media, categories]);

  const toggleCatCollapse = (catId: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const moveCatToTop = async (idx: number) => {
    if (idx <= 0) return;
    const updated = [...categories];
    const [cat] = updated.splice(idx, 1);
    updated.unshift(cat);
    const reordered = updated.map((c, i) => ({ ...c, order: i }));
    setCategories(reordered);
    await saveSetupCategories(reordered);
  };

  // ─── Load ─────────────────────────────────────────────
  const loadData = async () => {
    try {
      const [c, m, t, savedMedia, savedCats] = await Promise.all([
        getChemicals(),
        getMaterials(),
        getTools(),
        getSetupMedia(),
        getSetupCategories(),
      ]);
      setChemicals(c);
      setMaterials(m);
      setTools(t);
      setMedia(savedMedia || []);
      setCategories(savedCats || []);
      // Default to "all" to show the full list in natural order
      if (selectedCategoryForUpload === "none") {
        setSelectedCategoryForUpload("all");
      }
    } catch (err) {
      console.error("Failed to load setup data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ─── Upload Multiple ──────────────────────────────────
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });

    let successCount = 0;
    let failCount = 0;

    await Promise.all(
      files.map(async (file) => {
        try {
          const isPdf = file.type === "application/pdf";
          const type = isPdf ? "pdf" : file.type.startsWith("video") ? "video" : "image";
          const publicUrl = await uploadSetupMedia(file);
          if (!publicUrl) throw new Error(`No URL for ${file.name}`);

          const newMedia: SetupMedia = {
            id: crypto.randomUUID(),
            type: type as "image" | "video" | "pdf",
            url: publicUrl,
            caption: file.name,
            category: selectedCategoryForUpload === "none" ? undefined : selectedCategoryForUpload,
            createdAt: new Date().toISOString()
          };

          await saveSetupMedia(newMedia);
          successCount++;
        } catch (err: any) {
          console.error(`Upload error for ${file.name}:`, err);
          failCount++;
        } finally {
          setUploadProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : null));
        }
      })
    );

    const updated = await getSetupMedia();
    setMedia(updated);

    if (successCount > 0 && failCount === 0) {
      toast({ title: `${successCount} Photo${successCount > 1 ? "s" : ""} Uploaded`, description: "Synced to Supabase." });
    } else if (successCount > 0) {
      toast({ title: "Partial Upload", description: `${successCount} ok, ${failCount} failed.`, variant: "destructive" });
    } else {
      toast({ title: "Upload Failed", description: `${failCount} file(s) could not upload.`, variant: "destructive" });
    }

    setUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Reassign category ────────────────────────────────
  const handleReassign = async (mediaId: string, newCatId: string) => {
    try {
      await updateSetupMediaCategory(mediaId, newCatId);
      setMedia((prev) => prev.map((m) => (m.id === mediaId ? { ...m, category: newCatId } : m)));
    } catch {
      toast({ title: "Error", description: "Could not reassign category.", variant: "destructive" });
    }
  };

  // ─── Remove media ─────────────────────────────────────
  const removeMedia = async (id: string) => {
    try {
      if (!confirm("Are you sure you want to delete this media?")) return;
      await deleteSetupMedia(id);
      setMedia((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Photo Removed", description: "Deleted from Supabase." });
    } catch {
      toast({ title: "Delete Failed", variant: "destructive" });
    }
  };

  const openLightbox = (id: string) => {
    const index = visualMedia.findIndex(m => m.id === id);
    if (index !== -1) {
      setCurrentMediaIndex(index);
      setLightboxOpen(true);
    }
  };

  const nextMedia = () => setCurrentMediaIndex((prev) => (prev + 1) % visualMedia.length);
  const prevMedia = () => setCurrentMediaIndex((prev) => (prev - 1 + visualMedia.length) % visualMedia.length);

  // ─── Category CRUD ────────────────────────────────────
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setSavingCats(true);
    try {
      const newCat: SetupCategory = {
        id: `cat_${Date.now()}`,
        name: newCatName.trim(),
        order: categories.length,
      };
      const updated = [...categories, newCat];
      await saveSetupCategories(updated);
      setCategories(updated);
      setNewCatName("");
      toast({ title: "Category Added", description: newCat.name });
    } catch {
      toast({ title: "Error", description: "Could not add category.", variant: "destructive" });
    } finally {
      setSavingCats(false);
    }
  };

  const handleRenameCategory = async () => {
    if (!editingCat || !newCatName.trim()) return;
    setSavingCats(true);
    try {
      const updated = categories.map((c) =>
        c.id === editingCat.id ? { ...c, name: newCatName.trim() } : c
      );
      await saveSetupCategories(updated);
      setCategories(updated);
      setEditingCat(null);
      setNewCatName("");
      toast({ title: "Renamed", description: newCatName });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSavingCats(false);
    }
  };

  const handleDeleteCategory = async (cat: SetupCategory) => {
    const usedCount = media.filter((m) => m.category === cat.id).length;
    if (usedCount > 0) {
      toast({
        title: "Cannot Delete",
        description: `Move or delete the ${usedCount} photo(s) in "${cat.name}" first.`,
        variant: "destructive",
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the category "${cat.name}"? This action cannot be undone.`)) {
      return;
    }

    setSavingCats(true);
    try {
      const updated = categories.filter((c) => c.id !== cat.id).map((c, i) => ({ ...c, order: i }));
      await saveSetupCategories(updated);
      setCategories(updated);
      toast({ title: `"${cat.name}" deleted` });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSavingCats(false);
    }
  };

  const moveCat = async (idx: number, dir: -1 | 1) => {
    const updated = [...categories];
    const swap = idx + dir;
    if (swap < 0 || swap >= updated.length) return;
    [updated[idx], updated[swap]] = [updated[swap], updated[idx]];
    const reordered = updated.map((c, i) => ({ ...c, order: i }));
    setCategories(reordered);
    await saveSetupCategories(reordered);
  };

  // ─── Quick Add inventory ──────────────────────────────
  const handleQuickAdd = async () => {
    if (!newItem.name) return;
    try {
      if (addType === "tool") {
        await saveTool({ name: newItem.name, notes: newItem.brand || "", warranty: "1 Year", purchaseDate: new Date().toISOString().split("T")[0], price: 0, lifeExpectancy: "2 Years" }, true);
      } else if (addType === "material") {
        await saveMaterial({ name: newItem.name, category: newItem.category || "Supplies", quantity: 1, costPerItem: 0 }, true);
      } else {
        await saveChemical({ name: newItem.name, brand: newItem.brand, bottleSize: "32oz", threshold: 2, currentStock: 1, costPerBottle: 0 }, true);
      }
      toast({ title: "Inventory Updated", description: `${newItem.name} added to Supabase.` });
      setQuickAddOpen(false);
      loadData();
      setNewItem({ name: "", brand: "", category: "Supplies" });
    } catch {
      toast({ title: "Error", description: "Could not add item.", variant: "destructive" });
    }
  };

  // ─── Derived: media grouped by category (Excluding PDFs for Visual Gallery) ──────────────
  const uncategorized = media.filter((m) => 
    m.type !== 'pdf' && (!m.category || !categories.find((c) => c.id === m.category))
  );

  const getMediaForCat = (catId: string) => media.filter((m) => m.category === catId && m.type !== 'pdf');

  const displayCategories = useMemo(() => {
    // Basic list of categories
    let list = [...categories];
    
    // Add "Uncategorized" to the list if there are any uncategorized items
    if (uncategorized.length > 0) {
      list.push({ id: 'none', name: 'General Area', order: 999 });
    }

    if (!selectedCategoryForUpload || selectedCategoryForUpload === 'all') return list;
    
    const selected = list.find(c => c.id === selectedCategoryForUpload);
    if (!selected) return list;
    
    const others = list.filter(c => c.id !== selectedCategoryForUpload);
    return [selected, ...others];
  }, [categories, selectedCategoryForUpload, uncategorized.length]);

  // ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 selection:bg-indigo-500/30 w-full overflow-x-hidden">
      <PageHeader title="F150 Command Center" />

      <main className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-1000">

        {/* Hero Header */}
        <div className="relative mb-10 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800/50 shadow-2xl overflow-hidden p-6 md:p-10">
          <div className="absolute inset-0 bg-[url('/MoblieSetup.jpg')] opacity-50 bg-cover bg-[position:center_40%]" />
          
          <div className="relative z-10 flex flex-col items-center text-center lg:text-left lg:items-start lg:flex-row gap-6 md:gap-8">
            <div className="relative h-16 w-16 md:h-20 md:w-20 flex items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 group shrink-0">
              <Truck className="h-8 w-8 md:h-10 md:w-10 text-indigo-400 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute -inset-1 bg-indigo-500/20 rounded-2xl blur opacity-30 group-hover:opacity-60 transition-opacity" />
            </div>

            <div className="flex-1 w-full min-w-0">
              <h1 className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter text-white mb-2 md:mb-3 leading-tight break-words">F150 Command Center</h1>
              <p className="text-zinc-400 text-xs sm:text-sm md:text-lg font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Professional mobile detailing configuration. Real-time equipment inventory and visual setup documentation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full lg:w-auto">
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:text-white hover:border-indigo-400 gap-2 h-12 md:h-14 px-6 font-bold uppercase tracking-wider bg-black/40 backdrop-blur-sm w-full sm:w-auto"
                onClick={(e) => { e.stopPropagation(); setCatManagerOpen(true); }}
              >
                <FolderOpen className="h-4 w-4 md:h-5 md:w-5" /> Manage Categories
              </Button>
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:text-white hover:border-emerald-400 gap-2 h-12 md:h-14 px-6 font-bold uppercase tracking-wider bg-black/40 backdrop-blur-sm w-full sm:w-auto"
                onClick={() => navigate("/shop-setup")}
              >
                <Warehouse className="h-4 w-4 md:h-5 md:w-5" /> Switch to Shop
              </Button>
              <Button
                disabled={uploading}
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black italic uppercase tracking-widest px-8 md:px-10 h-12 md:h-14 shadow-xl shadow-indigo-600/40 active:scale-95 transition-all w-full sm:w-auto"
              >
                {uploading && uploadProgress
                  ? <><span className="mr-2 animate-bounce">↑</span> {uploadProgress.done}/{uploadProgress.total}</>
                  : <><Plus className="mr-2 h-5 w-5 md:h-6 md:w-6" />Add Rig Photos</>}
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="gallery" className="space-y-8">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-2xl h-14 w-full justify-start sm:justify-center overflow-x-auto overflow-y-hidden custom-scrollbar">
            <TabsTrigger value="gallery" className="rounded-xl px-3 sm:px-8 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px] shrink-0">
              <ImageIcon className="mr-2 h-4 w-4" /> Visual Setup
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-xl px-3 sm:px-8 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px] shrink-0">
              <Package className="mr-2 h-4 w-4" /> Equipment Pool
            </TabsTrigger>
          </TabsList>

          {/* ── GALLERY TAB ─────────────────────────────── */}
          <TabsContent value="gallery" className="mt-0 space-y-12">

            <div className="flex flex-col md:flex-row items-center gap-4 p-5 md:p-6 bg-zinc-900/60 border border-zinc-800 rounded-3xl w-full relative z-10">
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Quick Gear Tag:</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-zinc-600 hover:text-indigo-400 bg-black/20"
                  onClick={() => setCatManagerOpen(true)}
                  title="Manage Categories"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 w-full flex flex-col sm:flex-row gap-4 items-center">
                <Select value={selectedCategoryForUpload} onValueChange={setSelectedCategoryForUpload}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-sm font-bold h-12 w-full md:w-72">
                    <SelectValue placeholder="Filter by area" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectItem value="all" className="text-sm font-bold">Show All Areas</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-sm font-bold">{c.name}</SelectItem>
                    ))}
                    <SelectItem value="none" className="text-sm text-zinc-500">— Uncategorized —</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="lg"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-black uppercase tracking-widest text-[11px] h-12 w-full md:w-auto border border-zinc-800"
                >
                  {uploading ? `Processing ${uploadProgress?.done}...` : "Select From Device"}
                </Button>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,video/*,application/pdf"
              multiple
              onChange={handleMediaUpload}
            />

            {/* If no media at all */}
            {media.length === 0 && (
              <Card className="bg-zinc-900/30 border-dashed border-zinc-800 p-20 text-center rounded-3xl">
                <div className="bg-zinc-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ImageIcon className="h-8 w-8 text-zinc-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No setup views yet</h3>
                <p className="text-zinc-500 mb-6">Upload photos or walk-around videos of your mobile rig.</p>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="border-zinc-800 text-zinc-400 hover:text-white">
                  Start Building Your Setup
                </Button>
              </Card>
            )}

            {/* Category rows mapped to vertical grid */}
            {displayCategories.map((cat) => {
              const isUncategorized = cat.id === 'none';
              const catMedia = isUncategorized ? uncategorized : getMediaForCat(cat.id);
              const catIdx = isUncategorized ? -1 : categories.findIndex(c => c.id === cat.id);
              return (
                <section key={cat.id} className="space-y-4">
                  {/* Category Header - Indigo Theme to match Equipment Pool */}
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${isUncategorized ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-indigo-500/10 border-indigo-500/20'}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-indigo-400 hover:text-white"
                      onClick={() => toggleCatCollapse(cat.id)}
                    >
                      {collapsedCats.has(cat.id) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    {isUncategorized ? <ImageIcon className="h-5 w-5 text-zinc-500 shrink-0" /> : <FolderOpen className="h-5 w-5 text-indigo-400 shrink-0" />}
                    <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-indigo-200">
                      {isUncategorized ? 'General Area' : cat.name}
                    </h2>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${isUncategorized ? 'text-zinc-600 bg-zinc-800' : 'text-indigo-500/60 bg-indigo-500/10'}`}>
                      {catMedia.length}
                    </span>
                    <div className="ml-auto flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-indigo-400/50 hover:text-white"
                        title="Move To Top"
                        onClick={() => moveCatToTop(catIdx)}
                        disabled={catIdx === 0}
                      >
                        <ChevronsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-indigo-400/50 hover:text-white"
                        title="Move up"
                        onClick={() => moveCat(catIdx, -1)}
                        disabled={catIdx === 0}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-indigo-400/50 hover:text-white"
                        title="Move down"
                        onClick={() => moveCat(catIdx, 1)}
                        disabled={catIdx === categories.length - 1}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Vertical Grid for Photos */}
                  <div className={collapsedCats.has(cat.id) 
                    ? "flex overflow-x-auto pb-2 gap-3 custom-scrollbar" 
                    : "grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3"
                  }>
                    {catMedia.map((item) => {
                      const globalIndex = media.findIndex(m => m.id === item.id);
                      return (
                        <div key={item.id} className={collapsedCats.has(cat.id) ? "min-w-[120px] max-w-[120px] sm:min-w-[150px] sm:max-w-[150px]" : ""}>
                          <MediaCard
                            item={item}
                            categories={categories}
                            onDelete={removeMedia}
                            onReassign={handleReassign}
                            onOpenGallery={() => openLightbox(item.id)}
                          />
                        </div>
                      );
                    })}
                    {/* Add-to-this-category slot */}
                    {!isUncategorized && (
                      <button
                        onClick={() => {
                          setSelectedCategoryForUpload(cat.id);
                          fileInputRef.current?.click();
                        }}
                        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group ${
                          collapsedCats.has(cat.id) ? "min-w-[120px] h-[90px] sm:min-w-[150px] sm:h-[112px]" : "aspect-[4/3]"
                        }`}
                      >
                        <Plus className="h-4 w-4 text-zinc-700 group-hover:text-indigo-400" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-indigo-400">Add View</span>
                      </button>
                    )}
                  </div>
                </section>
              );
            })}


          </TabsContent>

          {/* ── INVENTORY TAB ──────────────────────────── */}
          <TabsContent value="inventory" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Tools */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                  <Wrench className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-200">Tools & Hardware</h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto hover:bg-indigo-500/20 text-indigo-400" onClick={() => { setAddType("tool"); setQuickAddOpen(true); }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {tools.map((tool) => (
                    <Card key={tool.id} className="bg-zinc-900/80 border-zinc-800/50 p-4 hover:border-indigo-500/30 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                          {tool.imageUrl ? <img src={tool.imageUrl} className="w-full h-full object-cover rounded-xl" /> : <Wrench className="h-5 w-5 text-zinc-600" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-white truncate">{tool.name}</h4>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{tool.notes || "No Notes"}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-indigo-400 transition-colors" />
                      </div>
                    </Card>
                  ))}
                  {tools.length === 0 && <p className="text-xs text-center text-zinc-600 py-10">No tools in inventory</p>}
                </div>
              </div>

              {/* Chemicals */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <FlaskConical className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-200">Fluid Systems</h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto hover:bg-emerald-500/20 text-emerald-400" onClick={() => { setAddType("chemical"); setQuickAddOpen(true); }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {chemicals.map((chem) => (
                    <Card key={chem.id} className="bg-zinc-900/80 border-zinc-800/50 p-4 hover:border-emerald-500/30 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                          {chem.imageUrl ? <img src={chem.imageUrl} className="w-full h-full object-cover rounded-xl" /> : <FlaskConical className="h-5 w-5 text-zinc-600" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-white truncate">{chem.name}</h4>
                          <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">{chem.currentStock} in stock</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-emerald-400 transition-colors" />
                      </div>
                    </Card>
                  ))}
                  {chemicals.length === 0 && <p className="text-xs text-center text-zinc-600 py-10">No chemicals in inventory</p>}
                </div>
              </div>

              {/* Materials */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <Package className="h-5 w-5 text-amber-400" />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-amber-200">Consumables</h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto hover:bg-amber-500/20 text-amber-400" onClick={() => { setAddType("material"); setQuickAddOpen(true); }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {materials.map((mat) => (
                    <Card key={mat.id} className="bg-zinc-900/80 border-zinc-800/50 p-4 hover:border-amber-500/30 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-zinc-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-white truncate">{mat.name}</h4>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{mat.category}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-amber-400 transition-colors" />
                      </div>
                    </Card>
                  ))}
                  {materials.length === 0 && <p className="text-xs text-center text-zinc-600 py-10">No materials in inventory</p>}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="container mx-auto px-4 py-12 border-t border-zinc-900">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 opacity-40 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-4">
            <Info className="h-5 w-5 text-zinc-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Prime Auto Detail Mobile Command Center v2.0</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Supabase Sync: Active</span>
          </div>
        </div>
      </footer>

      {/* ── CATEGORY MANAGER MODAL ─────────────────────── */}
      <Dialog open={catManagerOpen} onOpenChange={setCatManagerOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-indigo-400 flex items-center gap-2">
              <FolderPlus className="h-6 w-6" /> Manage Categories
            </DialogTitle>
            <DialogDescription className="text-zinc-500">Add, rename, reorder, or delete your photo categories.</DialogDescription>
          </DialogHeader>

          {/* Existing categories */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 my-4">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-3 group">
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="h-4 w-4 text-zinc-700 shrink-0" />
                  {editingCat?.id === cat.id ? (
                    <Input
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRenameCategory(); if (e.key === "Escape") { setEditingCat(null); setNewCatName(""); } }}
                      className="h-9 bg-zinc-800 border-zinc-700 text-white text-sm font-bold flex-1"
                      autoFocus
                      placeholder="New name..."
                    />
                  ) : (
                    <span className="flex-1 text-sm font-bold text-white truncate">{cat.name}</span>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-zinc-800 pt-3 sm:pt-0">
                  <span className="text-[10px] text-zinc-600 font-bold shrink-0">{getMediaForCat(cat.id).length} photos</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-400/50 hover:text-white" onClick={() => moveCatToTop(idx)} disabled={idx === 0} title="Move to Top"><ChevronsUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 hover:text-white" onClick={() => moveCat(idx, -1)} disabled={idx === 0}><ArrowUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 hover:text-white" onClick={() => moveCat(idx, 1)} disabled={idx === categories.length - 1}><ArrowDown className="h-4 w-4" /></Button>

                    {editingCat?.id === cat.id ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400 hover:text-emerald-300" onClick={handleRenameCategory} disabled={savingCats}>✓</Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500" onClick={() => { setEditingCat(null); setNewCatName(""); }}><X className="h-4 w-4" /></Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 hover:text-white" onClick={() => { setEditingCat(cat); setNewCatName(cat.name); }}><Pencil className="h-4 w-4" /></Button>
                    )}

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-700 hover:text-red-400" onClick={() => handleDeleteCategory(cat)} disabled={savingCats}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-xs text-center text-zinc-600 py-6">No categories yet. Add one below.</p>
            )}
          </div>

          {/* Add new category */}
          <div className="border-t border-zinc-800 pt-4">
            <Label className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2 block">New Category Name</Label>
            <div className="flex gap-2">
              <Input
                value={newCatName && !editingCat ? newCatName : ""}
                onChange={(e) => { if (!editingCat) setNewCatName(e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !editingCat) handleAddCategory(); }}
                placeholder="e.g. Water Tank Setup"
                className="bg-zinc-900 border-zinc-800 text-white font-bold h-10 flex-1"
              />
              <Button
                onClick={handleAddCategory}
                disabled={savingCats || !newCatName.trim() || !!editingCat}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-widest h-10 px-4 gap-1"
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setCatManagerOpen(false)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest px-8">Save & Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QUICK ADD INVENTORY MODAL ──────────────────── */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-indigo-400">
              Add to {addType.charAt(0).toUpperCase() + addType.slice(1)}s
            </DialogTitle>
            <DialogDescription className="text-zinc-500">Quickly register new equipment into shop inventory.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Item Name</Label>
              <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder={`e.g. ${addType === "tool" ? "DA Polisher" : addType === "chemical" ? "Wheel Cleaner" : "Microfiber Towels"}`} className="bg-zinc-900 border-zinc-800 text-white font-bold h-12" />
            </div>
            {addType !== "material" ? (
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Brand / Notes</Label>
                <Input value={newItem.brand} onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })} placeholder="e.g. Rupes / Meguiars" className="bg-zinc-900 border-zinc-800 text-white font-bold h-12" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Category</Label>
                <Select value={newItem.category} onValueChange={(val) => setNewItem({ ...newItem, category: val })}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white font-bold h-12 uppercase text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="Tires">Tires</SelectItem>
                    <SelectItem value="Towels">Towels</SelectItem>
                    <SelectItem value="Brushes">Brushes</SelectItem>
                    <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuickAddOpen(false)} className="text-zinc-500">Cancel</Button>
            <Button onClick={handleQuickAdd} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest px-8">Add to Shop</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PhotoGalleryLightbox
        photos={visualMedia.map(m => ({ url: m.url, label: m.caption, type: m.type as "image" | "video" }))}
        initialIndex={currentMediaIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        isAdmin={true}
        onDelete={(idx) => {
          const item = visualMedia[idx];
          if (item && confirm('Delete this photo?')) {
            removeMedia(item.id);
            setLightboxOpen(false);
          }
        }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Media Card Sub-Component
// ─────────────────────────────────────────────────────────
function MediaCard({
  item,
  categories,
  onDelete,
  onReassign,
  onOpenGallery,
}: {
  item: SetupMedia;
  categories: SetupCategory[];
  onDelete: (id: string) => void;
  onReassign: (id: string, catId: string) => void;
  onOpenGallery: () => void;
}) {
  return (
    <div className="relative group rounded-2xl overflow-hidden border-2 border-zinc-800 bg-zinc-900 aspect-[4/3] shadow-lg hover:border-indigo-500/40 hover:shadow-indigo-500/20 transition-all duration-300">
      <div 
        className="absolute inset-0 z-10 cursor-pointer" 
        onClick={(e) => {
          e.stopPropagation();
          if (item.type === 'pdf') {
            window.open(item.url, '_blank');
          } else {
            onOpenGallery();
          }
        }}
      >
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg p-1.5 backdrop-blur-sm border border-white/10">
          <Maximize2 className="h-4 w-4 text-white" />
        </div>
      </div>

      {item.type === "pdf" ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 gap-4 p-8">
          <div className="h-16 w-16 bg-red-600/20 rounded-2xl flex items-center justify-center border border-red-500/30">
            <FileText className="h-8 w-8 text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-100 truncate max-w-[120px]">{item.caption || "Document"}</p>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tight">PDF • View Source</span>
          </div>
        </div>
      ) : item.type === "video" ? (
        <video src={item.url} className="w-full h-full object-cover pointer-events-none" />
      ) : (
        <img src={item.url} alt={item.caption || "Setup photo"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      )}

      {/* Overlay controls - Using pointer-events-none to let clicks pass through to the gallery trigger below, except for the buttons */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black flex flex-col justify-end p-2 h-20 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all z-20 pointer-events-none">
        <span className="text-[8px] font-black uppercase tracking-widest text-white/50 truncate max-w-[80%] mb-1">
          {categories.find((c) => c.id === item.category)?.name || "Uncategorized"}
        </span>

        <div className="flex gap-0.5 shrink-0 pointer-events-auto">
          {/* Move to category menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="bg-zinc-900 border-zinc-800 text-white text-xs min-w-[160px]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Move to category</p>
              <DropdownMenuSeparator className="bg-zinc-800" />
              {categories.map((cat) => (
                <DropdownMenuItem
                  key={cat.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReassign(item.id, cat.id);
                  }}
                  className={`cursor-pointer font-bold text-xs ${item.category === cat.id ? "text-indigo-400" : "text-white"}`}
                >
                  {item.category === cat.id && "✓ "}{cat.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onReassign(item.id, "none");
                }} 
                className="text-zinc-500 cursor-pointer text-xs"
              >
                — Uncategorized
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MobileSetup;
