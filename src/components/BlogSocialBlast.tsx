import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Facebook, Instagram, Music, Rocket, Settings, CheckCircle2, AlertCircle, Loader2, X, Plus, Trash2, Globe, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import localforage from "localforage";
import { LibraryItem } from "@/lib/supa-data";

interface SocialAccount {
    id: string;
    platform: 'facebook' | 'instagram' | 'tiktok' | 'custom';
    name: string;
    handle: string;
    isConnected: boolean;
    isBusinessPage?: boolean;
}

interface BlogSocialBlastProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    item: LibraryItem | null;
}

export function BlogSocialBlast({ isOpen, onOpenChange, item }: BlogSocialBlastProps) {
    const { toast } = useToast();
    const [accounts, setAccounts] = useState<SocialAccount[]>([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isBlasting, setIsBlasting] = useState(false);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

    const saveSocialAccounts = (updated: SocialAccount[]) => {
        setAccounts(updated);
        localforage.setItem('prime_social_accounts', updated);
    };

    useEffect(() => {
        localforage.getItem<SocialAccount[]>('prime_social_accounts').then(data => {
            if (data) setAccounts(data);
            else {
                const initial: SocialAccount[] = [
                    { id: '1', platform: 'facebook', name: 'Prime Business Page', handle: '@primeautodetail', isConnected: true, isBusinessPage: true },
                    { id: '2', platform: 'instagram', name: 'Prime Official IG', handle: '@prime_auto_detail', isConnected: false },
                    { id: '3', platform: 'tiktok', name: 'Prime Detailing', handle: '@prime_official', isConnected: false }
                ];
                setAccounts(initial);
                localforage.setItem('prime_social_accounts', initial);
            }
        });
    }, []);

    const handleBlast = async () => {
        if (!item || selectedAccounts.length === 0) return;
        
        setIsBlasting(true);
        // Simulate multi-platform blast logic
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        toast({
            title: "Multi-Platform Blast Successful 🚀",
            description: `Story synced to ${selectedAccounts.length} accounts including Facebook Business Page.`,
        });
        setIsBlasting(false);
        onOpenChange(false);
    };

    const toggleAccount = (id: string, connected: boolean) => {
        const updated = accounts.map(a => a.id === id ? { ...a, isConnected: connected } : a);
        setAccounts(updated);
        localforage.setItem('prime_social_accounts', updated);
    };

    const addAccount = () => {
        const newAcc: SocialAccount = {
            id: crypto.randomUUID(),
            platform: 'custom',
            name: 'New Platform',
            handle: '@handle',
            isConnected: true
        };
        const updated = [...accounts, newAcc];
        setAccounts(updated);
        localforage.setItem('prime_social_accounts', updated);
    };

    const removeAccount = (id: string) => {
        const updated = accounts.filter(a => a.id !== id);
        setAccounts(updated);
        localforage.setItem('prime_social_accounts', updated);
    };

    if (!item) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[600px] rounded-[40px] p-0 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                    <DialogHeader className="p-8 pb-0">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <DialogTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                                    <Rocket className="w-8 h-8 text-indigo-500 animate-pulse" />
                                    SOCIAL BLAST ENGINE
                                </DialogTitle>
                                <DialogDescription className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                                    Multi-Platform Synchronization v3.0
                                </DialogDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="rounded-2xl bg-zinc-900 border border-zinc-800 h-14 w-14 hover:bg-zinc-800">
                                <Settings className="w-6 h-6 text-indigo-400" />
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className="p-8 space-y-8">
                        {/* Preview Area */}
                        <div className="bg-zinc-900/50 rounded-[32px] border border-zinc-800 p-6 flex gap-6 items-center">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-zinc-700 shrink-0">
                                <img src={item.resource_url} className="w-full h-full object-cover" alt="Preview" />
                            </div>
                            <div className="space-y-2">
                                <Badge className="bg-indigo-600 text-white border-none uppercase text-[9px] font-black tracking-widest px-2">Outgoing Story</Badge>
                                <h4 className="text-lg font-black line-clamp-1 uppercase tracking-tight">{item.title}</h4>
                                <p className="text-xs text-zinc-500 line-clamp-2 font-medium">{item.description}</p>
                            </div>
                        </div>

                        <Separator className="bg-zinc-800" />

                        <div className="space-y-4">
                            <Label className="uppercase text-[10px] font-black tracking-[0.2em] text-zinc-500 ml-1">Targets & Destinations</Label>
                            <div className="grid grid-cols-1 gap-3">
                                {accounts.filter(a => a.isConnected).map(acc => (
                                    <div 
                                        key={acc.id}
                                        onClick={() => {
                                            setSelectedAccounts(prev => 
                                                prev.includes(acc.id) ? prev.filter(id => id !== acc.id) : [...prev, acc.id]
                                            );
                                        }}
                                        className={`flex items-center justify-between p-5 rounded-[24px] border transition-all cursor-pointer ${selectedAccounts.includes(acc.id) ? 'bg-indigo-600/10 border-indigo-500' : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800">
                                                {acc.platform === 'facebook' && <Facebook className="w-5 h-5 text-[#1877F2]" />}
                                                {acc.platform === 'instagram' && <Instagram className="w-5 h-5 text-[#E4405F]" />}
                                                {acc.platform === 'tiktok' && <Music className="w-5 h-5 text-white" />}
                                                {acc.platform === 'custom' && <Globe className="w-5 h-5 text-zinc-400" />}
                                            </div>
                                            <div>
                                                <p className="font-black text-sm uppercase tracking-tight">{acc.name}</p>
                                                <p className="text-[10px] font-bold text-zinc-500 tracking-widest">{acc.handle}</p>
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedAccounts.includes(acc.id) ? 'bg-indigo-500 border-indigo-500 scale-110' : 'border-zinc-700'}`}>
                                            {selectedAccounts.includes(acc.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        </div>
                                    </div>
                                ))}
                                {accounts.filter(a => a.isConnected).length === 0 && (
                                    <div className="p-8 text-center bg-zinc-900/30 rounded-[32px] border border-dashed border-zinc-800 space-y-4">
                                        <AlertCircle className="w-12 h-12 text-zinc-700 mx-auto" />
                                        <p className="text-zinc-500 font-black uppercase text-xs">No accounts connected yet. Link your Facebook Page or Instagram in settings.</p>
                                        <Button variant="outline" onClick={() => setIsSettingsOpen(true)} className="rounded-2xl border-zinc-700 h-10 px-8 text-[10px] font-black uppercase tracking-widest">Connect Accounts</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-8 pt-0 mt-auto">
                        <Button 
                            disabled={selectedAccounts.length === 0 || isBlasting}
                            onClick={handleBlast}
                            className="w-full h-16 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-[24px] shadow-2xl shadow-indigo-500/20 group relative overflow-hidden"
                        >
                            {isBlasting ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin mr-3" />
                                    <span className="animate-pulse">SYNCHRONIZING CLOUD DATA...</span>
                                </>
                            ) : (
                                <>
                                    <Rocket className="w-6 h-6 mr-3 group-hover:animate-bounce" />
                                    INITIATE MULTI-PLATFORM BLAST
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/20 px-3 py-1 rounded-xl text-[10px]">
                                        {selectedAccounts.length} TARGETS
                                    </div>
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Social Management Settings */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[500px] rounded-[40px] p-0 overflow-hidden shadow-2xl">
                    <DialogHeader className="p-8 pb-4">
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                            <Settings className="w-6 h-6 text-indigo-400" />
                            COMMAND CENTER
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                            Manage Linked Social Credentials
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh] p-8 pt-0">
                        <div className="space-y-6">
                            {accounts.map(acc => (
                                <div key={acc.id} className="p-6 rounded-[28px] bg-zinc-900/50 border border-zinc-800/50 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {acc.platform === 'facebook' && <Facebook className="w-5 h-5 text-indigo-400" />}
                                            {acc.platform === 'instagram' && <Instagram className="w-5 h-5 text-indigo-400" />}
                                            {acc.platform === 'tiktok' && <Music className="w-5 h-5 text-indigo-400" />}
                                            {acc.platform === 'custom' && <Globe className="w-5 h-5 text-zinc-400" />}
                                            <span className="font-black text-xs uppercase tracking-widest">{acc.platform} {acc.isBusinessPage ? '(Business Page)' : ''}</span>
                                        </div>
                                        <Switch 
                                            checked={acc.isConnected} 
                                            onCheckedChange={(v) => toggleAccount(acc.id, v)}
                                            className="data-[state=checked]:bg-indigo-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-[9px] font-black text-zinc-500 uppercase ml-1">Account Display</Label>
                                            <Input 
                                                value={acc.name} 
                                                onChange={(e) => {
                                                    const updated = accounts.map(a => a.id === acc.id ? { ...a, name: e.target.value } : a);
                                                    saveSocialAccounts(updated);
                                                }}
                                                className="bg-zinc-950 border-zinc-800 rounded-xl h-10 text-xs font-bold" 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] font-black text-zinc-500 uppercase ml-1">Handle / ID</Label>
                                            <Input 
                                                value={acc.handle}
                                                onChange={(e) => {
                                                    const updated = accounts.map(a => a.id === acc.id ? { ...a, handle: e.target.value } : a);
                                                    saveSocialAccounts(updated);
                                                }}
                                                className="bg-zinc-950 border-zinc-800 rounded-xl h-10 text-xs font-bold" 
                                            />
                                        </div>
                                    </div>
                                    {acc.platform === 'custom' && (
                                        <Button variant="ghost" size="sm" onClick={() => removeAccount(acc.id)} className="w-full h-8 rounded-xl text-[9px] font-black text-red-400 hover:text-red-500 hover:bg-red-500/5">
                                            <Trash2 className="w-3 h-3 mr-2" /> DISCONNECT PERMANENTLY
                                        </Button>
                                    )}
                                </div>
                            ))}
                            
                            <Button variant="outline" onClick={addAccount} className="w-full h-14 border-dashed border-zinc-800 bg-transparent hover:bg-zinc-900 rounded-[24px] text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-[1.02]">
                                <Plus className="w-4 h-4 mr-2" /> ADD NEW GROWTH CHANNEL
                            </Button>
                        </div>
                    </ScrollArea>

                    <div className="p-8">
                        <Button onClick={() => setIsSettingsOpen(false)} className="w-full h-12 bg-zinc-100 hover:bg-white text-black font-black rounded-2xl">
                            SAVE CHANGES
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
