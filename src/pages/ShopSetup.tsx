import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Warehouse,
  Package,
  Wrench,
  FlaskConical,
  Plus,
  Image as ImageIcon,
  Trash2,
  ChevronRight,
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
  SHOP_SETUP_KEY
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
const ShopSetup = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const CONTEXT_KEY = SHOP_SETUP_KEY;

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
  const [selectedCategoryForUpload, setSelectedCategoryForUpload] = useState<string>("none");

  // Modals
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [addType, setAddType] = useState<"chemical" | "material" | "tool">("tool");
  const [newItem, setNewItem] = useState({ name: "", brand: "", category: "Supplies" });

  // Category Manager
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<SetupCategory | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [savingCats, setSavingCats] = useState(false);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // ─── Load ─────────────────────────────────────────────
  const loadData = async () => {
    try {
      const [c, m, t, savedMedia, savedCats] = await Promise.all([
        getChemicals(),
        getMaterials(),
        getTools(),
        getSetupMedia(CONTEXT_KEY),
        getSetupCategories(CONTEXT_KEY),
      ]);
      setChemicals(c);
      setMaterials(m);
      setTools(t);
      setMedia(savedMedia || []);
      setCategories(savedCats || []);
      if (selectedCategoryForUpload === "none" && savedCats.length > 0) {
        setSelectedCategoryForUpload(savedCats[0].id);
      }
    } catch (err) {
      console.error("Failed to load shop setup data", err);
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

          await saveSetupMedia(newMedia, CONTEXT_KEY);
          successCount++;
        } catch (err: any) {
          console.error(`Upload error for ${file.name}:`, err);
          failCount++;
        } finally {
          setUploadProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : null));
        }
      })
    );

    const updated = await getSetupMedia(CONTEXT_KEY);
    setMedia(updated);

    if (successCount > 0 && failCount === 0) {
      toast({ title: `${successCount} Photo${successCount > 1 ? "s" : ""} Uploaded`, description: "Synced to Shop Gallery." });
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
      await updateSetupMediaCategory(mediaId, newCatId, CONTEXT_KEY);
      setMedia((prev) => prev.map((m) => (m.id === mediaId ? { ...m, category: newCatId } : m)));
    } catch {
      toast({ title: "Error", description: "Could not reassign category.", variant: "destructive" });
    }
  };

  // ─── Remove media ─────────────────────────────────────
  const removeMedia = async (id: string) => {
    try {
      if (!confirm("Are you sure you want to delete this media from the shop setup?")) return;
      await deleteSetupMedia(id, CONTEXT_KEY);
      setMedia((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Photo Removed", description: "Deleted from Supabase." });
    } catch {
      toast({ title: "Delete Failed", variant: "destructive" });
    }
  };

  const openLightbox = (index: number) => {
    setCurrentMediaIndex(index);
    setLightboxOpen(true);
  };

  const nextMedia = () => setCurrentMediaIndex((prev) => (prev + 1) % media.length);
  const prevMedia = () => setCurrentMediaIndex((prev) => (prev - 1 + media.length) % media.length);

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
      await saveSetupCategories(updated, CONTEXT_KEY);
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
      await saveSetupCategories(updated, CONTEXT_KEY);
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
    setSavingCats(true);
    try {
      const updated = categories.filter((c) => c.id !== cat.id).map((c, i) => ({ ...c, order: i }));
      await saveSetupCategories(updated, CONTEXT_KEY);
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
    await saveSetupCategories(reordered, CONTEXT_KEY);
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
      toast({ title: "Inventory Updated", description: `${newItem.name} added to Shop.` });
      setQuickAddOpen(false);
      loadData();
      setNewItem({ name: "", brand: "", category: "Supplies" });
    } catch {
      toast({ title: "Error", description: "Could not add item.", variant: "destructive" });
    }
  };

  // ─── Derived: media grouped by category ──────────────
  const uncategorized = media.filter((m) => !m.category || !categories.find((c) => c.id === m.category));

  const getMediaForCat = (catId: string) => media.filter((m) => m.category === catId);

  // ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 selection:bg-indigo-500/30">
      <PageHeader title="Shop Setup" />

      <main className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-1000">

        {/* Hero Header */}
        <div className="relative mb-10 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800/50 shadow-2xl overflow-hidden p-6 md:p-10">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80')] opacity-10 bg-cover bg-center" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
            <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 group shrink-0">
              <Warehouse className="h-10 w-10 text-indigo-400 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute -inset-1 bg-indigo-500/20 rounded-2xl blur opacity-30 group-hover:opacity-60 transition-opacity" />
            </div>

            <div className="flex-1 text-center lg:text-left min-w-0 px-1">
              <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter text-white mb-3 leading-none break-words">Shop Setup Center</h1>
              <p className="text-zinc-400 text-sm md:text-lg font-medium max-w-2xl mx-auto lg:mx-0">
                Professional shop floor configuration. Real-time fixed inventory and visual organization documentation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:text-white hover:border-indigo-400 gap-2 h-14 px-6 font-bold uppercase tracking-wider bg-black/40 backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); setCatManagerOpen(true); }}
              >
                <FolderOpen className="h-5 w-5" /> Manage Categories
              </Button>
              <Button
                disabled={uploading}
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black italic uppercase tracking-widest px-10 h-14 shadow-xl shadow-indigo-600/40 active:scale-95 transition-all"
              >
                {uploading && uploadProgress
                  ? <><span className="mr-2 animate-bounce">↑</span> {uploadProgress.done}/{uploadProgress.total}</>
                  : <><Plus className="mr-2 h-6 w-6" />Add Shop Photos</>}
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="gallery" className="space-y-8">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-2xl h-14 w-full justify-start sm:justify-center overflow-x-auto overflow-y-hidden custom-scrollbar">
            <TabsTrigger value="gallery" className="rounded-xl px-3 sm:px-8 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px] shrink-0">
              <ImageIcon className="mr-2 h-4 w-4" /> Visual Organization
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-xl px-3 sm:px-8 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px] shrink-0">
              <Package className="mr-2 h-4 w-4" /> Shop Inventory
            </TabsTrigger>
            <TabsTrigger value="paperwork" className="rounded-xl px-3 sm:px-8 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px] shrink-0">
              <FileText className="mr-2 h-4 w-4" /> Related Paperwork
            </TabsTrigger>
          </TabsList>

          {/* ── GALLERY TAB ─────────────────────────────── */}
          <TabsContent value="gallery" className="mt-0 space-y-12">

            {/* Upload controls bar */}
            <div className="flex flex-col md:flex-row items-center gap-4 p-5 md:p-6 bg-zinc-900/60 border border-zinc-800 rounded-3xl w-full relative z-10">
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Shop Filter:</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-zinc-600 hover:text-indigo-400 bg-black/20"
                  onClick={() => setCatManagerOpen(true)}
                  title="Manage Shop Categories"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 w-full flex flex-col sm:flex-row gap-4 items-center">
                <Select value={selectedCategoryForUpload} onValueChange={setSelectedCategoryForUpload}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-sm font-bold h-12 w-full md:w-72">
                    <SelectValue placeholder="Pick a shop area" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-sm font-bold">{c.name}</SelectItem>
                    ))}
                    <SelectItem value="none" className="text-sm text-zinc-500">— General Area —</SelectItem>
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
                <h3 className="text-xl font-bold text-white mb-2">Shop organization is empty</h3>
                <p className="text-zinc-500 mb-6">Upload photos of your workstations, chemical racks, or tool boards.</p>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="border-zinc-800 text-zinc-400 hover:text-white">
                  Document Your Shop
                </Button>
              </Card>
            )}

            {/* Category rows */}
            {categories.map((cat, catIdx) => {
              const catMedia = getMediaForCat(cat.id);
              return (
                <section key={cat.id}>
                  {/* Row header */}
                  <div className="flex items-center gap-3 mb-4">
                    <FolderOpen className="h-5 w-5 text-indigo-400 shrink-0" />
                    <h2 className="text-base font-black uppercase tracking-widest text-white">{cat.name}</h2>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest bg-zinc-800 px-2 py-0.5 rounded-full">
                      {catMedia.length}
                    </span>
                    <div className="ml-auto flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-600 hover:text-white"
                        title="Move area up"
                        onClick={() => moveCat(catIdx, -1)}
                        disabled={catIdx === 0}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-600 hover:text-white"
                        title="Move area down"
                        onClick={() => moveCat(catIdx, 1)}
                        disabled={catIdx === categories.length - 1}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Horizontal scrolling row */}
                  {catMedia.length === 0 ? (
                    <div
                      onClick={() => {
                        setSelectedCategoryForUpload(cat.id);
                        fileInputRef.current?.click();
                      }}
                      className="h-44 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
                    >
                      <Plus className="h-6 w-6 text-zinc-600" />
                      <span className="text-xs text-zinc-600 font-bold uppercase tracking-widest">Add to {cat.name}</span>
                    </div>
                  ) : (
                    <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent snap-x">
                      {catMedia.map((item) => {
                        const globalIndex = media.findIndex(m => m.id === item.id);
                        return (
                          <MediaCard
                            key={item.id}
                            item={item}
                            categories={categories}
                            onDelete={removeMedia}
                            onReassign={handleReassign}
                            onOpenGallery={() => openLightbox(globalIndex)}
                          />
                        );
                      })}
                      {/* Add-to-this-category slot */}
                      <button
                        onClick={() => {
                          setSelectedCategoryForUpload(cat.id);
                          fileInputRef.current?.click();
                        }}
                        className="shrink-0 w-48 h-36 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
                      >
                        <Plus className="h-5 w-5 text-zinc-700 group-hover:text-indigo-400" />
                        <span className="text-[10px] text-zinc-600 group-hover:text-indigo-400 font-bold uppercase tracking-widest">Add Area View</span>
                      </button>
                    </div>
                  )}
                </section>
              );
            })}

            {/* Uncategorized section */}
            {uncategorized.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <ImageIcon className="h-5 w-5 text-zinc-500 shrink-0" />
                  <h2 className="text-base font-black uppercase tracking-widest text-zinc-500">Uncategorized Views</h2>
                  <span className="text-[10px] font-bold text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">{uncategorized.length}</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent snap-x">
                  {uncategorized.map((item) => {
                    const globalIndex = media.findIndex(m => m.id === item.id);
                    return (
                      <MediaCard
                        key={item.id}
                        item={item}
                        categories={categories}
                        onDelete={removeMedia}
                        onReassign={handleReassign}
                        onOpenGallery={() => openLightbox(globalIndex)}
                      />
                    );
                  })}
                </div>
              </section>
            )}

          </TabsContent>

          {/* ── INVENTORY TAB ──────────────────────────── */}
          <TabsContent value="inventory" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Tools */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                  <Wrench className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-200">Shop Tools</h3>
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
                </div>
              </div>

              {/* Chemicals */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <FlaskConical className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-200">Shop Chemical Feed</h3>
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
                </div>
              </div>

              {/* Materials */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <Package className="h-5 w-5 text-amber-400" />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-amber-200">Fixed Inventory</h3>
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
                </div>
              </div>
            </div>
          </TabsContent>
          {/* ── PAPERWORK TAB ─────────────────────────────── */}
          <TabsContent value="paperwork" className="mt-0 space-y-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-zinc-900/60 border border-zinc-800 p-8 rounded-3xl relative z-10">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                  <FileText className="h-8 w-8 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-widest text-white">Shop Documentation</h3>
                  <p className="text-zinc-500 text-sm">Upload MSDS sheets, equipment manuals, and shop procedures.</p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-widest text-xs px-8 h-14 border border-zinc-700"
              >
                <Plus className="mr-2 h-5 w-5" /> Upload PDF Document
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {media.filter(m => m.type === 'pdf').length === 0 ? (
                <div className="col-span-full py-20 text-center bg-zinc-950/30 border border-dashed border-zinc-800 rounded-3xl">
                   <div className="text-zinc-700 font-black uppercase tracking-[0.3em] text-xs mb-2">Reference Library Empty</div>
                   <p className="text-zinc-600 text-sm">No PDF documents found in your shop registry.</p>
                </div>
              ) : (
                media.filter(m => m.type === 'pdf').map(doc => (
                  <Card key={doc.id} className="group relative bg-zinc-900/50 border-zinc-800 hover:border-indigo-500/40 transition-all overflow-hidden p-6 hover:shadow-2xl hover:shadow-indigo-500/10">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform">
                        <FileText className="h-7 w-7 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black uppercase tracking-wider text-zinc-100 truncate mb-1">{doc.caption || 'Untitled Document'}</h4>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">{new Date(doc.createdAt || '').toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 h-9 font-bold uppercase tracking-widest text-[10px]"
                        onClick={() => window.open(doc.url, '_blank')}
                      >
                        <Maximize2 className="mr-2 h-3 w-3" /> View Full
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-zinc-600 hover:text-red-400 hover:bg-red-400/10"
                        onClick={() => removeMedia(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ── CATEGORY MANAGER MODAL ─────────────────────── */}
      <Dialog open={catManagerOpen} onOpenChange={setCatManagerOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-indigo-400 flex items-center gap-2">
              <FolderPlus className="h-6 w-6" /> Shop Areas
            </DialogTitle>
            <DialogDescription className="text-zinc-500">Define different workstation or storage areas in your shop.</DialogDescription>
          </DialogHeader>

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
                      placeholder="Area name..."
                    />
                  ) : (
                    <span className="flex-1 text-sm font-bold text-white truncate">{cat.name}</span>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-zinc-800 pt-3 sm:pt-0">
                  <span className="text-[10px] text-zinc-600 font-bold shrink-0">{getMediaForCat(cat.id).length} photos</span>
                  <div className="flex gap-1">
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
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <Label className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2 block">New Workstation Name</Label>
            <div className="flex gap-2">
              <Input
                value={newCatName && !editingCat ? newCatName : ""}
                onChange={(e) => { if (!editingCat) setNewCatName(e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !editingCat) handleAddCategory(); }}
                placeholder="e.g. Wash Bay"
                className="bg-zinc-900 border-zinc-800 text-white font-bold h-10 flex-1"
              />
              <Button onClick={handleAddCategory} disabled={savingCats || !newCatName.trim() || !!editingCat} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-widest h-10 px-4 gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setCatManagerOpen(false)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest px-8">Save Shop Areas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QUICK ADD INVENTORY MODAL ──────────────────── */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
          {/* ... exactly the same as Mobile Setup ... */}
          <DialogHeader>
             <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-indigo-400">Add Shop Inventory</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Item Name</Label>
                <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="bg-zinc-900 border-zinc-800 text-white" />
             </div>
          </div>
          <DialogFooter>
             <Button onClick={handleQuickAdd} className="bg-indigo-600 text-white">Add to Shop</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── LIGHTBOX ───────────────────────────────────── */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[100vw] h-[100vh] p-0 bg-black/95 border-none flex flex-col justify-center items-center">
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <Button variant="ghost" size="icon" className="text-white" onClick={() => {
              const link = document.createElement('a'); link.href = media[currentMediaIndex].url; link.download = 'shop-view.jpg'; link.click();
            }}><Download className="h-6 w-6" /></Button>
            <Button variant="ghost" size="icon" className="text-white" onClick={() => setLightboxOpen(false)}><X className="h-6 w-6" /></Button>
          </div>
          {media.length > 0 && (
            <div className="relative w-full h-full flex items-center justify-center">
              <button onClick={prevMedia} className="absolute left-4 z-50 p-3 rounded-full bg-zinc-900/50 text-white"><ChevronLeft className="h-8 w-8" /></button>
              <div className="flex flex-col items-center gap-6">
                 {media[currentMediaIndex].type === 'video' ? <video src={media[currentMediaIndex].url} autoPlay controls className="max-h-[70vh]" /> : <img src={media[currentMediaIndex].url} className="max-h-[70vh] object-contain" />}
                 <h2 className="text-2xl font-black uppercase text-white">{media[currentMediaIndex].caption}</h2>
              </div>
              <button onClick={nextMedia} className="absolute right-4 z-50 p-3 rounded-full bg-zinc-900/50 text-white"><ChevronRight className="h-8 w-8" /></button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

// ... Sub-components ...
function MediaCard({ item, categories, onDelete, onReassign, onOpenGallery }: any) {
  return (
    <div className="shrink-0 w-64 md:w-80 relative group rounded-2xl overflow-hidden border-2 border-zinc-800 bg-zinc-900 aspect-[4/3] shadow-lg snap-center">
      <div className="absolute inset-0 z-10 cursor-pointer" onClick={onOpenGallery}>
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg p-1.5"><Maximize2 className="h-4 w-4 text-white" /></div>
      </div>
      <img src={item.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black p-4 opacity-0 group-hover:opacity-100 transition-all z-20">
        <div className="flex justify-between items-center">
           <span className="text-[10px] font-black uppercase text-white/50">{categories.find((c: any) => c.id === item.category)?.name || "General"}</span>
           <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="h-8 w-8 text-red-400"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

export default ShopSetup;
