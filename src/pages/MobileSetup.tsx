import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Truck, 
  Package, 
  Wrench, 
  FlaskConical, 
  Plus, 
  Image as ImageIcon, 
  Trash2,
  ChevronRight,
  Info
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
  Chemical, 
  Material, 
  Tool, 
  SetupMedia 
} from "@/lib/inventory-data";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MobileSetup = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<SetupMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  // Quick Add State
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [addType, setAddType] = useState<'chemical' | 'material' | 'tool'>('tool');
  const [newItem, setNewItem] = useState({ name: '', brand: '', category: 'Supplies' });

  const loadData = async () => {
    try {
      const [c, m, t, savedMedia] = await Promise.all([
        getChemicals(),
        getMaterials(),
        getTools(),
        getSetupMedia()
      ]);
      setChemicals(c);
      setMaterials(m);
      setTools(t);
      setMedia(savedMedia || []);
    } catch (err) {
      console.error("Failed to load setup data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });

    let successCount = 0;
    let failCount = 0;

    // Upload all files in parallel
    await Promise.all(
      files.map(async (file) => {
        try {
          const type = file.type.startsWith('video') ? 'video' : 'image';
          const publicUrl = await uploadSetupMedia(file);

          if (!publicUrl) throw new Error(`Failed to get public URL for ${file.name}`);

          const newMedia: SetupMedia = {
            id: crypto.randomUUID(),
            type: type as 'image' | 'video',
            url: publicUrl,
            caption: file.name
          };

          await saveSetupMedia(newMedia);
          successCount++;
        } catch (err: any) {
          console.error(`Upload error for ${file.name}:`, err);
          failCount++;
        } finally {
          setUploadProgress(prev => prev ? { ...prev, done: prev.done + 1 } : null);
        }
      })
    );

    // Refresh gallery after all uploads complete
    const updated = await getSetupMedia();
    setMedia(updated);

    if (successCount > 0 && failCount === 0) {
      toast({
        title: `${successCount} Photo${successCount > 1 ? 's' : ''} Uploaded`,
        description: `Successfully synced to Supabase.`
      });
    } else if (successCount > 0 && failCount > 0) {
      toast({
        title: `Partial Upload`,
        description: `${successCount} succeeded, ${failCount} failed. Check your connection.`,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Upload Failed",
        description: `None of the ${failCount} file(s) could be uploaded.`,
        variant: "destructive"
      });
    }

    setUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = async (id: string) => {
    try {
      await deleteSetupMedia(id);
      setMedia(prev => prev.filter(m => m.id !== id));
      toast({ title: "Media Removed", description: "Successfully deleted from Supabase." });
    } catch (err) {
      toast({ title: "Delete Failed", description: "Could not remove from Supabase.", variant: "destructive" });
    }
  };

  const handleQuickAdd = async () => {
    if (!newItem.name) return;
    try {
      if (addType === 'tool') {
        await saveTool({ 
          name: newItem.name, 
          notes: newItem.brand || '', 
          warranty: '1 Year', 
          purchaseDate: new Date().toISOString().split('T')[0], 
          price: 0, 
          lifeExpectancy: '2 Years' 
        }, true);
      } else if (addType === 'material') {
        await saveMaterial({ 
          name: newItem.name, 
          category: newItem.category || 'Supplies', 
          quantity: 1, 
          costPerItem: 0 
        }, true);
      } else {
        await saveChemical({ 
          name: newItem.name, 
          brand: newItem.brand, 
          bottleSize: '32oz', 
          threshold: 2, 
          currentStock: 1, 
          costPerBottle: 0 
        }, true);
      }
      
      toast({ title: "Inventory Updated", description: `${newItem.name} added to Supabase.` });
      setQuickAddOpen(false);
      loadData(); // Refresh list
      setNewItem({ name: '', brand: '', category: 'Supplies' });
    } catch (err) {
      toast({ title: "Error", description: "Could not add item to inventory.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <PageHeader title="Mobile Setup" />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-12 p-8 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800/50 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80')] opacity-5 bg-cover bg-center" />
          
          <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 group">
            <Truck className="h-10 w-10 text-indigo-400 group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute -inset-1 bg-indigo-500/20 rounded-2xl blur opacity-30 group-hover:opacity-60 transition-opacity" />
          </div>
          
          <div className="flex-1 text-center md:text-left relative">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">F150 Command Center</h1>
            <p className="text-zinc-400 text-lg font-medium max-w-2xl">
              Professional mobile detailing configuration. Real-time equipment inventory and visual setup documentation.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 w-full sm:w-auto mt-4 sm:mt-0">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,video/*"
              multiple
              onChange={handleMediaUpload}
            />
            <Button 
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black italic uppercase tracking-widest px-6 h-12 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all w-full sm:w-auto disabled:opacity-50"
            >
              {uploading && uploadProgress
                ? <><span className="mr-2 animate-bounce">↑</span> Uploading {uploadProgress.done}/{uploadProgress.total}...</>
                : <><Plus className="mr-2 h-5 w-5" />Add Photos</>}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="gallery" className="space-y-8">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-2xl h-14">
            <TabsTrigger value="gallery" className="rounded-xl px-8 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-black uppercase tracking-widest text-[10px]">
              <ImageIcon className="mr-2 h-4 w-4" /> Visual Setup
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-xl px-8 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-black uppercase tracking-widest text-[10px]">
              <Package className="mr-2 h-4 w-4" /> Equipment Pool
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="mt-0">
            {media.length === 0 ? (
              <Card className="bg-zinc-900/30 border-dashed border-zinc-800 p-20 text-center rounded-3xl">
                <div className="bg-zinc-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ImageIcon className="h-8 w-8 text-zinc-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No setup views yet</h3>
                <p className="text-zinc-500 mb-6">Upload photos or walk-around videos of your mobile rig (Synced to Shop PC).</p>
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-zinc-800 text-zinc-400 hover:text-white"
                >
                  Start Building Your Setup
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {media.map((item) => (
                  <Card key={item.id} className="group relative bg-zinc-900 border-zinc-800 border-2 rounded-3xl overflow-hidden aspect-[4/3] shadow-xl hover:shadow-indigo-500/10 transition-all duration-500">
                    {item.type === 'video' ? (
                      <video src={item.url} className="w-full h-full object-cover" controls />
                    ) : (
                      <img src={item.url} alt="Setup" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-white/50">{item.type}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeMedia(item.id)}
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {/* Empty Add Slot */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-800 rounded-3xl aspect-[4/3] flex flex-col items-center justify-center group hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-500"
                >
                  <div className="bg-zinc-900 h-16 w-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Plus className="h-6 w-6 text-zinc-600 group-hover:text-indigo-400" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-500 group-hover:text-indigo-400">Add Slot</span>
                </button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="inventory" className="mt-0">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Tools Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                  <Wrench className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-200">Tools & Hardware</h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 ml-auto hover:bg-indigo-500/20 text-indigo-400"
                    onClick={() => { setAddType('tool'); setQuickAddOpen(true); }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {tools.map(tool => (
                    <Card key={tool.id} className="bg-zinc-900/80 border-zinc-800/50 p-4 hover:border-indigo-500/30 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                          {tool.imageUrl ? (
                            <img src={tool.imageUrl} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <Wrench className="h-5 w-5 text-zinc-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-white truncate">{tool.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{tool.notes || 'No Notes'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {(tool as any).updatedAt && (
                            <span className="text-[8px] font-black uppercase text-zinc-600/60 leading-none">
                              {new Date((tool as any).updatedAt).toLocaleDateString()}
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-indigo-400 transition-colors" />
                        </div>
                      </div>
                    </Card>
                  ))}
                  {tools.length === 0 && <p className="text-xs text-center text-zinc-600 py-10">No tools in inventory</p>}
                </div>
              </div>

              {/* Chemicals Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <FlaskConical className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-200">Fluid Systems</h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 ml-auto hover:bg-emerald-500/20 text-emerald-400"
                    onClick={() => { setAddType('chemical'); setQuickAddOpen(true); }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {chemicals.map(chem => (
                    <Card key={chem.id} className="bg-zinc-900/80 border-zinc-800/50 p-4 hover:border-emerald-500/30 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                          {chem.imageUrl ? (
                            <img src={chem.imageUrl} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <FlaskConical className="h-5 w-5 text-zinc-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-white truncate">{chem.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">{chem.currentStock} in stock</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {(chem as any).updatedAt && (
                            <span className="text-[8px] font-black uppercase text-zinc-600/60 leading-none">
                              {new Date((chem as any).updatedAt).toLocaleDateString()}
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-emerald-400 transition-colors" />
                        </div>
                      </div>
                    </Card>
                  ))}
                  {chemicals.length === 0 && <p className="text-xs text-center text-zinc-600 py-10">No chemicals in inventory</p>}
                </div>
              </div>

              {/* Materials Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <Package className="h-5 w-5 text-amber-400" />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-amber-200">Consumables</h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 ml-auto hover:bg-amber-500/20 text-amber-400"
                    onClick={() => { setAddType('material'); setQuickAddOpen(true); }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {materials.map(mat => (
                    <Card key={mat.id} className="bg-zinc-900/80 border-zinc-800/50 p-4 hover:border-amber-500/30 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-zinc-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-white truncate">{mat.name}</h4>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{mat.category}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {(mat as any).updatedAt && (
                            <span className="text-[8px] font-black uppercase text-zinc-600/60 leading-none">
                              {new Date((mat as any).updatedAt).toLocaleDateString()}
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-amber-400 transition-colors" />
                        </div>
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
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
              Prime Auto Detail Mobile Command Center v1.2
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Supabase Sync: Active
            </span>
          </div>
        </div>
      </footer>

      {/* Quick Add Modal */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-indigo-400">
              Add to {addType.charAt(0).toUpperCase() + addType.slice(1)}s
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Quickly register new equipment into shop inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Item Name</Label>
              <Input 
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                placeholder={`e.g. ${addType === 'tool' ? 'DA Polisher' : addType === 'chemical' ? 'Wheel Cleaner' : 'Microfiber Towels'}`}
                className="bg-zinc-900 border-zinc-800 text-white font-bold h-12"
              />
            </div>
            {addType !== 'material' ? (
               <div className="space-y-2">
                 <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Brand / Notes</Label>
                 <Input 
                   value={newItem.brand}
                   onChange={(e) => setNewItem({...newItem, brand: e.target.value})}
                   placeholder="e.g. Rupes / Meguiars"
                   className="bg-zinc-900 border-zinc-800 text-white font-bold h-12"
                 />
               </div>
            ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Category</Label>
                  <Select value={newItem.category} onValueChange={(val) => setNewItem({...newItem, category: val})}>
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
            <Button onClick={handleQuickAdd} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest px-8">
              Add to Shop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileSetup;
