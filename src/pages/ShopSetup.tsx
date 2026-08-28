import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/auth";
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
  Truck,
  Globe,
  ExternalLink,
  Eye,
  Search,
} from "lucide-react";
import { PhotoGalleryLightbox } from "@/components/gallery/PhotoGalleryLightbox";
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
import { useDemoMode } from "@/contexts/DemoContext";
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
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { isDemoMode } = useDemoMode();
  const isAdmin = user?.role === 'admin' || isDemoMode;
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
  const [activeTab, setActiveTab] = useState("gallery");

  // Business Documents (formerly Paperwork)
  const [docUploadOpen, setDocUploadOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUrl, setDocUrl] = useState("");
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<SetupMedia | null>(null);
  const [docSearch, setDocSearch] = useState("");

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
      // Default to "all" to show the full list in natural order
      if (selectedCategoryForUpload === "none") {
        setSelectedCategoryForUpload("all");
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

  const handleDocUpload = async () => {
    if (!docName.trim()) return;
    if (!isUrlMode && !docFile) return;
    if (isUrlMode && !docUrl.trim()) return;

    setUploading(true);
    try {
      let finalUrl = docUrl;
      let type: "pdf" | "image" | "video" = "pdf";

      if (!isUrlMode && docFile) {
        const publicUrl = await uploadSetupMedia(docFile);
        if (!publicUrl) throw new Error("Upload failed");
        finalUrl = publicUrl;
      } else {
        // If it's a Google Doc, ensure it's in preview mode for embedding
        if (finalUrl.includes('docs.google.com')) {
          if (finalUrl.includes('/edit')) {
            finalUrl = finalUrl.replace(/\/edit.*$/, '/preview');
          } else if (!finalUrl.endsWith('/preview')) {
            finalUrl = finalUrl.split('?')[0].replace(/\/$/, '') + '/preview';
          }
        }
      }

      const newMedia: SetupMedia = {
        id: crypto.randomUUID(),
        type: "pdf", // Treat all docs as pdf/document for categorization
        url: finalUrl,
        caption: docName.trim(),
        createdAt: new Date().toISOString()
      };

      await saveSetupMedia(newMedia, CONTEXT_KEY);
      const updated = await getSetupMedia(CONTEXT_KEY);
      setMedia(updated || []);
      
      setDocUploadOpen(false);
      setDocName("");
      setDocFile(null);
      setDocUrl("");
      setActiveTab("paperwork");
      toast({ title: "Document Saved", description: "Added to Business Documents." });
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
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
    if (isDemoMode) {
      toast({ title: "Permission Denied", description: "Read-only mode active.", variant: "destructive" });
      return;
    }
    try {
      if (!confirm("Are you sure you want to delete this media from the shop setup?")) return;
      await deleteSetupMedia(id, CONTEXT_KEY);
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

    if (!window.confirm(`Are you sure you want to delete the category "${cat.name}"? This action cannot be undone.`)) {
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
    <div className="min-h-screen bg-[#030303] text-zinc-100 selection:bg-indigo-500/30 overflow-x-hidden w-full max-w-[100vw]">
      <PageHeader title="Shop Setup Center" />

      <main className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-1000">

        {/* Hero Header */}
        <div className="relative mb-10 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800/50 shadow-2xl overflow-hidden p-6 md:p-10">
          <div className="absolute inset-0 bg-[url('/shop.jpg')] opacity-50 bg-cover bg-[position:center_20%]" />
          
          <div className="relative z-10 flex flex-col items-center text-center xl:text-left xl:items-start xl:flex-row gap-6 md:gap-8">
            <div className="relative h-16 w-16 md:h-20 md:w-20 flex items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 group shrink-0">
              <Warehouse className="h-8 w-8 md:h-10 md:w-10 text-indigo-400 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute -inset-1 bg-indigo-500/20 rounded-2xl blur opacity-30 group-hover:opacity-60 transition-opacity" />
            </div>

            <div className="flex-1 w-full min-w-[250px]">
              <h1 className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter text-white mb-2 md:mb-3 leading-tight">Shop Setup Center</h1>
              <p className="text-zinc-400 text-xs sm:text-sm md:text-lg font-medium max-w-2xl mx-auto xl:mx-0 leading-relaxed">
                Professional shop floor configuration. Real-time fixed inventory and visual organization documentation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center xl:justify-start gap-3 md:gap-4 w-full xl:w-auto">
              {isAdmin && (
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:text-white hover:border-indigo-400 gap-2 h-12 md:h-14 px-6 font-bold uppercase tracking-wider bg-black/40 backdrop-blur-sm flex-1 sm:flex-none"
                  onClick={(e) => { e.stopPropagation(); setCatManagerOpen(true); }}
                >
                  <FolderOpen className="h-4 w-4 md:h-5 md:w-5" /> Manage Categories
                </Button>
              )}
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:text-white hover:border-indigo-400 gap-2 h-12 md:h-14 px-6 font-bold uppercase tracking-wider bg-black/40 backdrop-blur-sm w-full sm:w-auto"
                onClick={() => navigate("/mobile-setup")}
              >
                <Truck className="h-4 w-4 md:h-5 md:w-5" /> Switch to Mobile
              </Button>
              {isAdmin && (
                <Button
                  disabled={uploading}
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black italic uppercase tracking-widest px-8 md:px-10 h-12 md:h-14 shadow-xl shadow-indigo-600/40 active:scale-95 transition-all flex-1 sm:flex-none"
                >
                  {uploading && uploadProgress
                    ? <><span className="mr-2 animate-bounce">⏳</span> {uploadProgress.done}/{uploadProgress.total}</>
                    : <><Plus className="mr-2 h-5 w-5 md:h-6 md:w-6" />Add Shop Photos</>
                  }
                </Button>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-2xl h-12 md:h-14 w-full justify-start sm:justify-center overflow-x-auto overflow-y-hidden custom-scrollbar">
            <TabsTrigger value="gallery" className="rounded-xl px-3 sm:px-8 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px] shrink-0">
              <ImageIcon className="mr-2 h-4 w-4" /> Visual Organization
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-xl px-3 sm:px-8 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px] shrink-0">
              <Package className="mr-2 h-4 w-4" /> Shop Inventory
            </TabsTrigger>
            <TabsTrigger value="paperwork" className="rounded-xl px-3 sm:px-8 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px] shrink-0">
              <FileText className="mr-2 h-4 w-4" /> Business Documents
            </TabsTrigger>
          </TabsList>

          {/* ── GALLERY TAB ─────────────────────────────── */}
          <TabsContent value="gallery" className="mt-0 space-y-12">

            {/* Upload controls bar */}
            <div className="flex flex-col md:flex-row items-center gap-4 p-5 md:p-6 bg-zinc-900/60 border border-zinc-800 rounded-3xl w-full relative z-10">
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Facility Filter:</span>
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-indigo-400 hover:text-white bg-indigo-500/10 border border-indigo-500/20"
                    onClick={() => setCatManagerOpen(true)}
                    title="Manage Shop Categories"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
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
                    <SelectItem value="none" className="text-sm text-zinc-500">— General Area —</SelectItem>
                  </SelectContent>
                </Select>
                {isAdmin && (
                  <Button
                    size="lg"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-black uppercase tracking-widest text-[11px] h-12 w-full md:w-auto border border-zinc-800"
                  >
                    {uploading ? `Processing ${uploadProgress?.done}...` : "Select From Device"}
                  </Button>
                )}
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
            {/* If no media at all */}
            {media.length === 0 && (
              <Card className="bg-zinc-900/30 border-dashed border-zinc-800 p-20 text-center rounded-3xl">
                <div className="bg-zinc-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ImageIcon className="h-8 w-8 text-zinc-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Facility Documentation Empty</h3>
                <p className="text-zinc-500 mb-6 font-medium">Start capturing your workspace organization for the team.</p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-wider h-12 px-8 rounded-xl"
                >
                  Begin Visual Setup
                </Button>
              </Card>
            )}

            {displayCategories.map((cat) => {
              const isUncategorized = cat.id === 'none';
              const catMedia = isUncategorized ? uncategorized : getMediaForCat(cat.id);
              const catIdx = isUncategorized ? -1 : categories.findIndex(c => c.id === cat.id);
              
              return (
                <section key={cat.id} className="space-y-4">
                  {/* Category Header - Indigo Theme matched to Inventory */}
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
                    <h2 className={`text-xs sm:text-sm font-black uppercase tracking-[0.2em] ${isUncategorized ? 'text-zinc-400' : 'text-indigo-200'}`}>
                      {isUncategorized ? 'General Area' : cat.name}
                    </h2>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${isUncategorized ? 'text-zinc-600 bg-zinc-800' : 'text-indigo-500/60 bg-indigo-500/10'}`}>
                      {catMedia.length}
                    </span>
                    {!isUncategorized && (
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
                          title="Move Up"
                          onClick={() => moveCat(catIdx, -1)}
                          disabled={catIdx === 0}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-indigo-400/50 hover:text-white"
                          title="Move Down"
                          onClick={() => moveCat(catIdx, 1)}
                          disabled={catIdx === categories.length - 1}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Grid layout instead of horizontal scroll for mobile stability */}
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
                            onDelete={isAdmin ? removeMedia : undefined}
                            onReassign={isAdmin ? handleReassign : undefined}
                            onOpenGallery={() => openLightbox(item.id)}
                            setViewingDoc={setViewingDoc}
                          />
                        </div>
                      );
                    })}
                    {/* Add-to-this-category slot */}
                    {!isUncategorized && isAdmin && (
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
            })}          </TabsContent>

          {/* ── INVENTORY TAB ──────────────────────────── */}
          <TabsContent value="inventory" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tools Link Card */}
              <Card 
                onClick={() => navigate('/inventory-control?section=tools')}
                className="group relative bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-zinc-800 hover:border-indigo-500/50 p-8 rounded-3xl cursor-pointer transition-all duration-300 shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white text-indigo-400 transition-all duration-300">
                    <Wrench className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-wider text-white mb-2 group-hover:text-indigo-400 transition-colors">Shop Tools</h3>
                    <p className="text-zinc-400 text-xs font-medium leading-relaxed">Direct access to equipment inventory category page, machinery, polishers, and hardware specs.</p>
                  </div>
                </div>
                <div className="pt-6 mt-6 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">View Equipment Page</span>
                  <ChevronRight className="h-5 w-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>

              {/* Chemical Feed Link Card */}
              <Card 
                onClick={() => navigate('/inventory-control?section=chemicals')}
                className="group relative bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-zinc-800 hover:border-emerald-500/50 p-8 rounded-3xl cursor-pointer transition-all duration-300 shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white text-emerald-400 transition-all duration-300">
                    <FlaskConical className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-wider text-white mb-2 group-hover:text-emerald-400 transition-colors">Shop Chemical Feed</h3>
                    <p className="text-zinc-400 text-xs font-medium leading-relaxed">Direct access to chemical inventory category page, stock levels, dilution ratios, and SDS cards.</p>
                  </div>
                </div>
                <div className="pt-6 mt-6 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">View Chemical Page</span>
                  <ChevronRight className="h-5 w-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>

              {/* Shop Supplies Link Card */}
              <Card 
                onClick={() => navigate('/inventory-control?section=supplies')}
                className="group relative bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-zinc-800 hover:border-amber-500/50 p-8 rounded-3xl cursor-pointer transition-all duration-300 shadow-xl hover:shadow-amber-500/10 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white text-amber-400 transition-all duration-300">
                    <Package className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-wider text-white mb-2 group-hover:text-amber-400 transition-colors">Shop Supplies</h3>
                    <p className="text-zinc-400 text-xs font-medium leading-relaxed">Direct access to supplies inventory category page, microfiber towels, pads, and shop consumables.</p>
                  </div>
                </div>
                <div className="pt-6 mt-6 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">View Supplies Page</span>
                  <ChevronRight className="h-5 w-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="paperwork" className="mt-0 space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-zinc-900/60 border border-zinc-800 p-8 rounded-3xl relative z-10 shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] -mr-32 -mt-32 rounded-full" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-400/30 shadow-[0_0_20px_rgba(79,70,229,0.3)] animate-pulse">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-widest text-white italic">Business Documents</h3>
                  <p className="text-zinc-400 text-sm font-medium">Digital repository for MSDS sheets, shop procedures, and equipment manuals.</p>
                </div>
              </div>
              {isAdmin && (
                <Button
                  size="lg"
                  onClick={() => setDocUploadOpen(true)}
                  className="relative z-10 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[11px] h-12 w-full md:w-auto shadow-lg shadow-indigo-600/40 active:scale-95 transition-all"
                >
                  <Plus className="mr-2 h-5 w-5" /> Add Business Document
                </Button>
              )}
            </div>

            {/* Document Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Search SOPs, manuals, procedures, reference sheets..."
                  className="bg-zinc-950 border-zinc-800 text-white pl-10 h-10 font-medium text-xs focus:border-indigo-500"
                />
                {docSearch && (
                  <button onClick={() => setDocSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 shrink-0">
                {media.filter(m => m.type === 'pdf' && (!docSearch || (m.caption || '').toLowerCase().includes(docSearch.toLowerCase()))).length} Documents Filtered
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {media.filter(m => m.type === 'pdf' && (!docSearch || (m.caption || '').toLowerCase().includes(docSearch.toLowerCase()))).length === 0 ? (
                <div className="col-span-full py-24 text-center bg-zinc-900/40 border border-dashed border-zinc-800 rounded-[32px] group hover:border-indigo-500/30 transition-all">
                  <div className="bg-zinc-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
                    <FileText className="h-8 w-8 text-zinc-600" />
                  </div>
                  <div className="text-zinc-400 font-black uppercase tracking-[0.4em] text-xs mb-3">No Matching Documents</div>
                  <p className="text-zinc-600 text-sm max-w-sm mx-auto font-medium">Try searching with a different term or upload new shop paperwork.</p>
                </div>
              ) : (
                media.filter(m => m.type === 'pdf' && (!docSearch || (m.caption || '').toLowerCase().includes(docSearch.toLowerCase()))).map(doc => {
                  const isGoogleDoc = doc.url.includes('docs.google.com');
                  return (
                    <Card 
                      key={doc.id} 
                      className="group relative bg-zinc-950/40 border-zinc-800/60 hover:border-indigo-500/50 transition-all duration-500 overflow-hidden cursor-pointer aspect-[3/4] flex flex-col shadow-2xl hover:shadow-indigo-500/10"
                      onClick={() => setViewingDoc(doc)}
                    >
                      {/* Document Preview Decor (Thumbnail-ish) */}
                      <div className="relative flex-1 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black overflow-hidden flex flex-col">
                        {/* Decorative "Paper" effect */}
                        <div className="absolute inset-x-6 top-6 bottom-4 bg-zinc-900/50 rounded-sm border border-zinc-800/50 shadow-inner group-hover:translate-y-[-2px] transition-transform duration-500 overflow-hidden">
                           <div className="p-4 space-y-2 opacity-20">
                             <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                             <div className="h-2 w-full bg-white/10 rounded-full" />
                             <div className="h-2 w-5/6 bg-white/10 rounded-full" />
                             <div className="pt-4 h-2 w-1/2 bg-white/10 rounded-full" />
                             <div className="h-2 w-full bg-white/10 rounded-full" />
                             {/* Mock table */}
                             <div className="mt-4 grid grid-cols-3 gap-1">
                               <div className="h-3 bg-white/5 rounded-sm" />
                               <div className="h-3 bg-white/5 rounded-sm" />
                               <div className="h-3 bg-white/5 rounded-sm" />
                             </div>
                           </div>
                        </div>
                        
                        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Status Icon */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
                          <div className={`p-4 rounded-[2rem] ${isGoogleDoc ? 'bg-blue-600/20 text-blue-400' : 'bg-red-600/20 text-red-400'} border ${isGoogleDoc ? 'border-blue-500/30' : 'border-red-500/30'} group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                            {isGoogleDoc ? <Globe className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 bg-black/60 px-3 py-1 rounded-full border border-zinc-800 backdrop-blur-md">
                            {isGoogleDoc ? 'Google Doc' : 'PDF Source'}
                          </span>
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                           <Button 
                             onClick={(e) => { e.stopPropagation(); setViewingDoc(doc); }}
                             className="bg-white text-black font-black uppercase italic tracking-tighter text-[11px] h-9 px-6 rounded-none hover:bg-zinc-200 active:scale-95 transition-all"
                           >
                             <Eye className="mr-2 h-4 w-4" /> Open Doc
                           </Button>
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950 flex-none">
                        <h4 className="text-[12px] font-black uppercase tracking-wider text-zinc-100 truncate mb-1 leading-tight group-hover:text-indigo-400 transition-colors">{doc.caption || 'Untitled Document'}</h4>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{new Date(doc.createdAt || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-white transition-colors">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white min-w-[140px] shadow-2xl">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewingDoc(doc); }} className="text-xs font-bold gap-2 cursor-pointer hover:bg-white/5 transition-colors">
                                <Eye className="h-3.5 w-3.5 text-indigo-400" /> View Full screen
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(doc.url, '_blank'); }} className="text-xs font-bold gap-2 cursor-pointer hover:bg-white/5 transition-colors">
                                <ExternalLink className="h-3.5 w-3.5 text-zinc-400" /> Open Original
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-zinc-800" />
                              <DropdownMenuItem 
                                onClick={(e) => { e.stopPropagation(); removeMedia(doc.id); }} 
                                className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2 cursor-pointer transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete Document
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </Card>
                  );
                })
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
        isAdmin={isAdmin}
        onDelete={isAdmin ? (idx) => {
          const item = visualMedia[idx];
          if (item && confirm('Delete this photo?')) {
            removeMedia(item.id);
            setLightboxOpen(false);
          }
        } : undefined}
      />

      {/* ── DOCUMENT UPLOAD DIALOG (Updated) ────────────────── */}
      <Dialog open={docUploadOpen} onOpenChange={setDocUploadOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 rounded-full" />
          
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-indigo-400 flex items-center gap-2">
              <FileText className="h-6 w-6" /> Add Document
            </DialogTitle>
            <DialogDescription className="text-zinc-500">Add equipment manuals, shop procedures, or Google Docs.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Mode Toggle */}
            <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
               <button 
                 onClick={() => setIsUrlMode(false)}
                 className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!isUrlMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
               >
                 <FileText className="h-3.5 w-3.5" /> File Upload
               </button>
               <button 
                 onClick={() => setIsUrlMode(true)}
                 className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isUrlMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
               >
                 <Globe className="h-3.5 w-3.5" /> Google Link
               </button>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Document Label</Label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. My Shop Procedures"
                className="bg-zinc-900 border-zinc-800 text-white h-12 font-bold focus:ring-indigo-500/50"
              />
            </div>

            {isUrlMode ? (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-indigo-400">Google Doc / Web URL</Label>
                <div className="relative">
                  <Input
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="https://docs.google.com/document/d/..."
                    className="bg-zinc-900 border-zinc-800 text-white h-12 font-bold pl-10"
                  />
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                </div>
                <p className="text-[10px] text-zinc-600 font-medium">Make sure the document is shared as 'Anyone with the link can view'.</p>
              </div>
            ) : (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className={`h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all relative overflow-hidden ${
                  docFile ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-zinc-800 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/5'
                }`}>
                  {!docFile ? (
                    <>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setDocFile(file);
                          if (file && !docName.trim()) {
                            // Strip extension for the label
                            const name = file.name.replace(/\.[^/.]+$/, "");
                            setDocName(name);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="h-12 w-12 rounded-2xl bg-zinc-800 text-zinc-500 flex items-center justify-center mb-2 shadow-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <FileText className="h-6 w-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-indigo-400">Tap to browse PDF</span>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="text-center px-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block truncate max-w-[200px] mb-1">
                          {docFile.name}
                        </span>
                        <div className="flex items-center justify-center gap-4">
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              const blobUrl = URL.createObjectURL(docFile);
                              setViewingDoc({ id: 'preview', url: blobUrl, caption: docFile.name + " (Preview)", type: 'pdf' });
                            }}
                            className="text-[9px] text-indigo-400 uppercase font-black hover:text-indigo-300 p-0 h-auto flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> Preview
                          </Button>
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={() => { setDocFile(null); setDocName(""); }}
                            className="text-[9px] text-zinc-500 uppercase font-black hover:text-red-400 p-0 h-auto"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 flex flex-col gap-2">
            {!docName.trim() && (docFile || docUrl) && (
              <p className="text-center text-[10px] font-black uppercase tracking-widest text-red-500 animate-pulse">
                Please enter a Document Label above
              </p>
            )}
            <Button
              onClick={handleDocUpload}
              disabled={uploading || (!isUrlMode && !docFile) || (isUrlMode && !docUrl.trim()) || !docName.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black italic uppercase tracking-widest h-14 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
            >
              {uploading ? "Locking into Database..." : "Complete Registry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── FULL SCREEN DOCUMENT VIEWER ──────────────────── */}
      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-[95vw] w-[1400px] h-[95vh] p-0 bg-[#030303] border-zinc-800 overflow-hidden flex flex-col shadow-2xl rounded-3xl">
          <div className="flex items-center justify-between p-4 bg-zinc-900/50 border-b border-zinc-800 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-4">
               <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${viewingDoc?.url.includes('docs.google.com') ? 'bg-blue-600/20 text-blue-400' : 'bg-red-600/20 text-red-400'} border border-white/5`}>
                 {viewingDoc?.url.includes('docs.google.com') ? <Globe className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
               </div>
               <div>
                 <h2 className="text-sm font-black uppercase tracking-widest text-white leading-none mb-1">{viewingDoc?.caption || 'Business Document'}</h2>
                 <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Digital Registry • {new Date(viewingDoc?.createdAt || '').toLocaleDateString()}</p>
               </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white h-10 px-4 font-bold uppercase tracking-widest text-[10px]"
                onClick={() => window.open(viewingDoc?.url, '_blank')}
              >
                <ExternalLink className="mr-2 h-3.5 w-3.5" /> Source
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 text-zinc-500 hover:text-white hover:bg-white/5"
                onClick={() => setViewingDoc(null)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          <div className="flex-1 w-full bg-zinc-950 relative group">
             {(() => {
               let displayUrl = viewingDoc?.url || "";
               if (displayUrl.includes('docs.google.com')) {
                 if (displayUrl.includes('/edit')) {
                   displayUrl = displayUrl.replace(/\/edit.*$/, '/preview');
                 } else if (!displayUrl.endsWith('/preview')) {
                   displayUrl = displayUrl.split('?')[0].replace(/\/$/, '') + '/preview';
                 }
               }
               return (
                 <iframe
                   key={displayUrl}
                   src={displayUrl}
                   className="w-full h-full border-none bg-white animate-in zoom-in-95 duration-500"
                   title="Document Viewer"
                   style={{ colorScheme: 'light' }}
                 />
               );
             })()}
             
             {/* Loading Overlay (hidden when iframe loads) */}
             <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-zinc-950 z-[-1]">
                <div className="flex flex-col items-center gap-4">
                   <div className="h-12 w-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                   <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Initializing Reader...</span>
                </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

// ... Sub-components ...
function MediaCard({ item, categories, onDelete, onReassign, onOpenGallery, setViewingDoc }: any) {
  return (
    <div className="relative group rounded-2xl overflow-hidden border-2 border-zinc-800 bg-zinc-900 aspect-[4/3] shadow-lg hover:border-indigo-500/40 hover:shadow-indigo-500/20 transition-all duration-300">
      <div 
        className="absolute inset-0 z-10 cursor-pointer" 
                 onClick={(e) => {
          e.stopPropagation();
          if (item.type === 'pdf') {
            setViewingDoc(item);
          } else {
            onOpenGallery();
          }
        }}
      >
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg p-1.5 backdrop-blur-sm border border-white/10">
          <Maximize2 className="h-4 w-4 text-white" />
        </div>
      </div>

      {item.type === 'pdf' ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 gap-4 p-8">
          <div className="h-16 w-16 bg-red-600/20 rounded-2xl flex items-center justify-center border border-red-500/30">
            <FileText className="h-8 w-8 text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-100 truncate max-w-[120px]">{item.caption || "Document"}</p>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tight">PDF • Registry Access</span>
          </div>
        </div>
      ) : (
        <img src={item.url} alt={item.caption || "Setup photo"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      )}

      {/* Overlay controls - Using pointer-events-none to let clicks pass through to the gallery trigger below, except for the buttons */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black flex flex-col justify-end p-2 h-20 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all z-20 pointer-events-none">
        <span className="text-[8px] font-black uppercase tracking-widest text-white/50 truncate max-w-[80%] mb-1">
          {categories.find((c: any) => c.id === item.category)?.name || "General Area"}
        </span>

        <div className="flex gap-0.5 shrink-0 pointer-events-auto">
          {onReassign && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => { e.stopPropagation(); }}>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="bg-zinc-900 border-zinc-800 text-white text-xs min-w-[160px]"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Move to area</p>
                <DropdownMenuSeparator className="bg-zinc-800" />
                {categories.map((cat: any) => (
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
          )}

          {onDelete && (
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
          )}
        </div>
      </div>
    </div>
  );
}

export default ShopSetup;
