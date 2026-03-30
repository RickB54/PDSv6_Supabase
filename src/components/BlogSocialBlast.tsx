import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
    Facebook, Instagram, Music, Globe, Rocket, Settings, CheckCircle2,
    AlertCircle, Loader2, ExternalLink, Key, HelpCircle, Copy, Plus,
    Trash2, Send, Edit2, Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import localforage from "localforage";
import { LibraryItem } from "@/lib/supa-data";

// ─── Types ───────────────────────────────────────────────────────────────────
interface FacebookConfig { pageId: string; accessToken: string; pageName: string; }
interface CustomPlatform { id: string; name: string; url: string; icon: string; }

interface BlogSocialBlastProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    item: LibraryItem | null;
}

// ─── Platform Tabs ────────────────────────────────────────────────────────────
const PLATFORMS = [
    { id: 'facebook', label: 'Facebook', color: '#1877F2' },
    { id: 'instagram', label: 'Instagram', color: '#E4405F' },
    { id: 'tiktok', label: 'TikTok', color: '#010101' },
    { id: 'custom', label: 'Other', color: '#6366f1' },
];

function PlatformIcon({ id, size = 20 }: { id: string; size?: number }) {
    const s = `w-${size === 20 ? 5 : 4} h-${size === 20 ? 5 : 4}`;
    if (id === 'facebook') return <Facebook className={s} style={{ color: '#1877F2' }} />;
    if (id === 'instagram') return <Instagram className={s} style={{ color: '#E4405F' }} />;
    if (id === 'tiktok') return <Music className={s} />;
    return <Globe className={s} style={{ color: '#6366f1' }} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function BlogSocialBlast({ isOpen, onOpenChange, item }: BlogSocialBlastProps) {
    const { toast } = useToast();
    const [activePlatform, setActivePlatform] = useState('facebook');
    const [fbConfig, setFbConfig] = useState<FacebookConfig>({ pageId: '', accessToken: '', pageName: '' });
    const [fbConfigured, setFbConfigured] = useState(false);
    const [postAsDraft, setPostAsDraft] = useState(true); // Default: save as draft for review
    const [isPosting, setIsPosting] = useState(false);
    const [postSuccess, setPostSuccess] = useState<null | { platform: string; draftUrl?: string }>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [showFbSetup, setShowFbSetup] = useState(false);
    const [tempFb, setTempFb] = useState<FacebookConfig>({ pageId: '', accessToken: '', pageName: '' });
    const [postText, setPostText] = useState('');
    const [customPlatforms, setCustomPlatforms] = useState<CustomPlatform[]>([]);
    const [newPlatform, setNewPlatform] = useState({ name: '', url: '' });
    const [showAddPlatform, setShowAddPlatform] = useState(false);

    // Load saved config
    useEffect(() => {
        localforage.getItem<FacebookConfig>('prime_fb_config').then(d => {
            if (d?.pageId && d?.accessToken) { setFbConfig(d); setFbConfigured(true); }
        });
        localforage.getItem<CustomPlatform[]>('prime_custom_platforms').then(d => {
            if (d) setCustomPlatforms(d);
        });
    }, []);

    // Build default post text when item changes
    useEffect(() => {
        if (item && isOpen) {
            setPostSuccess(null);
            const siteUrl = window.location.origin + '/blog';
            setPostText([
                item.title ? `✨ ${item.title}` : '',
                '',
                item.description || '',
                '',
                `📖 Read the full story: ${siteUrl}`,
                '',
                '#PrimeAutoDetail #AutoDetailing #CeramicCoating #CarCare #DetailingLife'
            ].filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n'));
        }
    }, [item, isOpen]);

    const saveFbConfig = async () => {
        if (!tempFb.pageId || !tempFb.accessToken) {
            toast({ title: "Missing fields", description: "Page ID and Access Token are required.", variant: "destructive" });
            return;
        }
        await localforage.setItem('prime_fb_config', tempFb);
        setFbConfig(tempFb);
        setFbConfigured(true);
        setShowFbSetup(false);
        toast({ title: "Facebook Connected ✅", description: `${tempFb.pageName || 'Your page'} is ready.` });
    };

    // ── Post to Facebook (as draft or published) ──────────────────────────────
    const postToFacebook = async () => {
        if (!fbConfigured) { setShowFbSetup(true); return; }
        setIsPosting(true);
        try {
            const body: Record<string, string | boolean> = {
                message: postText,
                access_token: fbConfig.accessToken,
                published: !postAsDraft,          // false = save as draft
            };
            if (postAsDraft) body.scheduled_publish_time = ''; // signal draft mode

            const res = await fetch(`https://graph.facebook.com/v19.0/${fbConfig.pageId}/feed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.id) {
                const draftUrl = postAsDraft
                    ? `https://www.facebook.com/${fbConfig.pageId}?sk=scheduled_posts`
                    : `https://www.facebook.com/${data.id.replace('_', '/posts/')}`;
                setPostSuccess({ platform: 'Facebook', draftUrl });
                toast({
                    title: postAsDraft ? "Saved to Facebook Drafts! 📝" : "Posted to Facebook! 🎉",
                    description: postAsDraft
                        ? "Review and publish from your Facebook Business Suite."
                        : "Your post is live on your Business Page.",
                });
            } else {
                throw new Error(data?.error?.message || 'Facebook API error');
            }
        } catch (err: any) {
            toast({ title: "Post Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsPosting(false);
        }
    };

    // ── Copy + open for Instagram / TikTok / custom ───────────────────────────
    const copyAndOpen = (platformUrl: string) => {
        navigator.clipboard.writeText(postText).then(() => {
            toast({ title: "Post copied! 📋", description: "Your post is copied. Now opening the platform to paste it." });
            setTimeout(() => window.open(platformUrl, '_blank'), 600);
            setPostSuccess({ platform: activePlatform });
        });
    };

    const addCustomPlatform = async () => {
        if (!newPlatform.name || !newPlatform.url) return;
        const updated = [...customPlatforms, { id: crypto.randomUUID(), ...newPlatform, icon: 'globe' }];
        setCustomPlatforms(updated);
        await localforage.setItem('prime_custom_platforms', updated);
        setNewPlatform({ name: '', url: '' });
        setShowAddPlatform(false);
        toast({ title: "Platform added!", description: `${newPlatform.name} has been added to your list.` });
    };

    const removePlatform = async (id: string) => {
        const updated = customPlatforms.filter(p => p.id !== id);
        setCustomPlatforms(updated);
        await localforage.setItem('prime_custom_platforms', updated);
    };

    if (!item) return null;

    const allPlatforms = [
        ...PLATFORMS.filter(p => p.id !== 'custom'),
        ...customPlatforms.map(p => ({ id: p.id, label: p.name, color: '#6366f1', isCustom: true, url: p.url })),
        { id: 'custom', label: '+ Add', color: '#3f3f46' }
    ];

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[600px] w-[95vw] max-h-[90vh] rounded-[40px] p-0 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col">
                    {/* Header */}
                    <DialogHeader className="p-6 pb-0 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                                    <Rocket className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Social Blast Engine</DialogTitle>
                                    <DialogDescription className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">
                                        Multi-Platform Publishing
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowHelp(h => !h)}
                                    className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center transition-all" title="How it works">
                                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                                </button>
                                <button onClick={() => { setTempFb(fbConfig); setShowFbSetup(true); }}
                                    className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center transition-all" title="Facebook Settings">
                                    <Settings className="w-4 h-4 text-zinc-400" />
                                </button>
                            </div>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="flex-1 overflow-auto">
                        <div className="p-8 space-y-6">

                            {/* Help Panel */}
                            {showHelp && (
                                <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-[24px] p-5 space-y-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-indigo-300 flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4" /> How Social Blast Works
                                    </p>
                                    {[
                                        { n: '1', t: 'Select which platform tab you want to post to (Facebook, Instagram, TikTok, or custom).' },
                                        { n: '2', t: 'Facebook: Enter your Page ID + Access Token in ⚙️ Settings. Posts save as DRAFT by default so you can review before publishing.' },
                                        { n: '3', t: 'Instagram & TikTok: Your post message is copied to clipboard, then the app opens so you can paste and post.' },
                                        { n: '4', t: 'Edit the message below before sending — hashtags, link, and content are pre-filled for you.' },
                                        { n: '5', t: 'Hit the platform button to send. For Facebook drafts, visit Facebook Business Suite to review and publish.' },
                                    ].map(({ n, t }) => (
                                        <div key={n} className="flex gap-3 items-start">
                                            <div className="w-5 h-5 rounded-full bg-indigo-600 text-[9px] font-black text-white flex items-center justify-center shrink-0 mt-0.5">{n}</div>
                                            <p className="text-xs text-zinc-300 leading-relaxed">{t}</p>
                                        </div>
                                    ))}
                                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest pt-2 border-t border-indigo-500/10">
                                        💡 TIP: Use the AI Content Strategist (✨) to generate a viral hook before blasting!
                                    </p>
                                </div>
                            )}

                            {/* Platform Tabs */}
                            <div className="flex flex-wrap gap-2">
                                {allPlatforms.map(p => {
                                    const isAdd = p.id === 'custom' && !('isCustom' in p);
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => isAdd ? setShowAddPlatform(true) : setActivePlatform(p.id)}
                                            className={`flex items-center gap-2 px-4 h-10 rounded-2xl border text-xs font-black uppercase tracking-tight transition-all ${
                                                activePlatform === p.id && !isAdd
                                                    ? 'border-indigo-500 bg-indigo-600/20 text-white'
                                                    : isAdd
                                                    ? 'border-dashed border-zinc-700 bg-transparent text-zinc-500 hover:border-zinc-500'
                                                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600'
                                            }`}
                                        >
                                            {!isAdd && <PlatformIcon id={p.id} size={16} />}
                                            {isAdd ? <><Plus className="w-3 h-3" /> Add Platform</> : p.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Post preview */}
                            <div className="bg-zinc-900/50 rounded-[24px] border border-zinc-800 p-4 flex gap-4 items-center">
                                {item.resource_url && (
                                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-700 shrink-0">
                                        <img src={item.resource_url} className="w-full h-full object-cover" alt="" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="font-black text-sm uppercase tracking-tight line-clamp-1">{item.title}</p>
                                    <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{item.description}</p>
                                </div>
                            </div>

                            {/* ── FACEBOOK PANEL ── */}
                            {activePlatform === 'facebook' && (
                                <div className="space-y-4">
                                    {!fbConfigured ? (
                                        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-4">
                                            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                            <div className="space-y-2">
                                                <p className="text-sm font-black text-amber-300">Facebook Page Not Connected</p>
                                                <p className="text-xs text-zinc-400 leading-relaxed">Enter your Page ID and Access Token to enable real posting to your Business Page.</p>
                                                <Button onClick={() => { setTempFb(fbConfig); setShowFbSetup(true); }}
                                                    className="h-9 bg-[#1877F2] hover:bg-blue-500 text-white font-black rounded-xl text-xs px-4">
                                                    <Key className="w-3.5 h-3.5 mr-2" /> Connect My Facebook Page
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between bg-green-950/30 border border-green-500/20 rounded-2xl px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                                                <span className="text-xs font-black text-green-300 uppercase tracking-wider">
                                                    {fbConfig.pageName || fbConfig.pageId}
                                                </span>
                                            </div>
                                            <button onClick={() => { setTempFb(fbConfig); setShowFbSetup(true); }}
                                                className="text-[9px] font-black text-zinc-500 uppercase tracking-widest hover:text-zinc-300">
                                                Change
                                            </button>
                                        </div>
                                    )}

                                    {/* Draft toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                                        <div>
                                            <p className="text-sm font-black text-white">Save as Draft First</p>
                                            <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                                                {postAsDraft
                                                    ? "Post goes to Drafts — you review and publish in Facebook Business Suite"
                                                    : "Post publishes IMMEDIATELY to your public page"}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={postAsDraft}
                                            onCheckedChange={setPostAsDraft}
                                            className="data-[state=checked]:bg-indigo-500"
                                        />
                                    </div>

                                    {!postAsDraft && (
                                        <div className="flex items-center gap-2 bg-red-950/30 border border-red-500/20 rounded-2xl px-4 py-2">
                                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                            <p className="text-[10px] text-red-300 font-bold">This will post LIVE instantly. Toggle on "Save as Draft" to review first.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── INSTAGRAM PANEL ── */}
                            {activePlatform === 'instagram' && (
                                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Instagram className="w-4 h-4 text-pink-400" />
                                        <p className="text-xs font-black uppercase tracking-widest text-pink-300">Instagram Posting</p>
                                    </div>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Your post message will be copied to clipboard and Instagram will open so you can paste and share it as a caption.
                                    </p>
                                </div>
                            )}

                            {/* ── TIKTOK PANEL ── */}
                            {activePlatform === 'tiktok' && (
                                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Music className="w-4 h-4 text-zinc-300" />
                                        <p className="text-xs font-black uppercase tracking-widest text-zinc-300">TikTok Posting</p>
                                    </div>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Your post message will be copied to clipboard and TikTok will open so you can paste it into your video caption before uploading.
                                    </p>
                                </div>
                            )}

                            {/* ── CUSTOM PLATFORM PANELS ── */}
                            {customPlatforms.map(cp => activePlatform === cp.id && (
                                <div key={cp.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-indigo-400" />
                                            <p className="text-xs font-black uppercase tracking-widest text-indigo-300">{cp.name}</p>
                                        </div>
                                        <button onClick={() => removePlatform(cp.id)} className="text-[9px] text-red-400 font-black uppercase hover:text-red-300">Remove</button>
                                    </div>
                                    <p className="text-xs text-zinc-400">Opens: <span className="text-indigo-400">{cp.url}</span></p>
                                </div>
                            ))}

                            {/* Add Platform form */}
                            {showAddPlatform && (
                                <div className="bg-zinc-900/50 border border-dashed border-indigo-500/30 rounded-2xl p-5 space-y-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-indigo-300">Add New Platform</p>
                                    <Input value={newPlatform.name} onChange={e => setNewPlatform(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Platform name (e.g. Twitter)" className="bg-zinc-800 border-zinc-700 rounded-xl h-10 text-sm" />
                                    <Input value={newPlatform.url} onChange={e => setNewPlatform(p => ({ ...p, url: e.target.value }))}
                                        placeholder="URL to open (e.g. https://twitter.com/compose)" className="bg-zinc-800 border-zinc-700 rounded-xl h-10 text-sm" />
                                    <div className="flex gap-2">
                                        <Button onClick={addCustomPlatform} className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black">
                                            <Plus className="w-3 h-3 mr-1" /> Add
                                        </Button>
                                        <Button variant="ghost" onClick={() => setShowAddPlatform(false)} className="h-9 rounded-xl text-xs">Cancel</Button>
                                    </div>
                                </div>
                            )}

                            {/* Editable post message */}
                            <div className="space-y-2">
                                <Label className="uppercase text-[10px] font-black tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                                    <Edit2 className="w-3 h-3" /> Edit Your Post Message
                                </Label>
                                <Textarea
                                    value={postText}
                                    onChange={e => setPostText(e.target.value)}
                                    rows={7}
                                    className="bg-zinc-900 border-zinc-700 rounded-2xl text-sm resize-none focus:border-indigo-500/50"
                                />
                                <p className="text-[10px] text-zinc-600">{postText.length} characters</p>
                            </div>

                            {/* Success state */}
                            {postSuccess && (
                                <div className="bg-green-950/40 border border-green-500/30 rounded-2xl p-5 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        <p className="font-black text-sm text-green-300 uppercase">
                                            {activePlatform === 'facebook' && postAsDraft ? 'Saved to Facebook Drafts!' : 'Post Sent!'}
                                        </p>
                                    </div>
                                    {postSuccess.draftUrl && (
                                        <a href={postSuccess.draftUrl} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-xs text-blue-400 font-black uppercase hover:text-blue-300">
                                            <Eye className="w-3.5 h-3.5" />
                                            Review &amp; Publish in Facebook Business Suite
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Action Button - always pinned at bottom */}
                    <div className="p-6 pt-0 shrink-0">
                        {activePlatform === 'facebook' && (
                            <Button disabled={isPosting || !postText.trim()}
                                onClick={postToFacebook}
                                className="w-full h-16 bg-[#1877F2] hover:bg-blue-500 text-white font-black rounded-[24px] shadow-2xl shadow-blue-500/20 group">
                                {isPosting
                                    ? <><Loader2 className="w-6 h-6 animate-spin mr-3" />PUBLISHING...</>
                                    : <><Facebook className="w-6 h-6 mr-3" />
                                        {postAsDraft ? 'SAVE TO FACEBOOK DRAFTS' : 'PUBLISH TO FACEBOOK NOW'}
                                        <Send className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" /></>
                                }
                            </Button>
                        )}
                        {activePlatform === 'instagram' && (
                            <Button onClick={() => copyAndOpen('https://www.instagram.com/')}
                                className="w-full h-16 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:opacity-90 text-white font-black rounded-[24px] shadow-2xl group">
                                <Instagram className="w-6 h-6 mr-3" />
                                COPY &amp; OPEN INSTAGRAM
                                <ExternalLink className="w-4 h-4 ml-3" />
                            </Button>
                        )}
                        {activePlatform === 'tiktok' && (
                            <Button onClick={() => copyAndOpen('https://www.tiktok.com/upload')}
                                className="w-full h-16 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-[24px] shadow-2xl group border border-zinc-700">
                                <Music className="w-6 h-6 mr-3" />
                                COPY &amp; OPEN TIKTOK
                                <ExternalLink className="w-4 h-4 ml-3" />
                            </Button>
                        )}
                        {customPlatforms.some(cp => cp.id === activePlatform) && (() => {
                            const cp = customPlatforms.find(p => p.id === activePlatform)!;
                            return (
                                <Button onClick={() => copyAndOpen(cp.url)}
                                    className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-[24px] shadow-2xl group">
                                    <Globe className="w-6 h-6 mr-3" />
                                    COPY &amp; OPEN {cp.name.toUpperCase()}
                                    <ExternalLink className="w-4 h-4 ml-3" />
                                </Button>
                            );
                        })()}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Facebook Setup Dialog ── */}
            <Dialog open={showFbSetup} onOpenChange={setShowFbSetup}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[480px] rounded-[40px] p-0 overflow-hidden shadow-2xl">
                    <DialogHeader className="p-8 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#1877F2] flex items-center justify-center">
                                <Key className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tighter">Facebook Page Setup</DialogTitle>
                                <DialogDescription className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">One-time configuration — stored on this device only</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="p-8 pt-0 space-y-5">
                        <div className="bg-blue-950/30 border border-blue-500/20 rounded-2xl p-4 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">Where to get these</p>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                <strong className="text-zinc-200">Page ID:</strong> Facebook Business Page → About → scroll to Page ID
                            </p>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                <strong className="text-zinc-200">Access Token:</strong>{' '}
                                <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline inline-flex items-center gap-1">
                                    Graph API Explorer <ExternalLink className="w-3 h-3" />
                                </a>
                                {' '}→ Select your App → Select your Page → Generate Token → grant pages_manage_posts permission
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Page Name (display only)</Label>
                            <Input value={tempFb.pageName} onChange={e => setTempFb(p => ({ ...p, pageName: e.target.value }))}
                                placeholder="e.g. Prime Auto Detail" className="bg-zinc-900 border-zinc-700 rounded-xl h-11 text-sm" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Facebook Page ID *</Label>
                            <Input value={tempFb.pageId} onChange={e => setTempFb(p => ({ ...p, pageId: e.target.value }))}
                                placeholder="e.g. 123456789012345" className="bg-zinc-900 border-zinc-700 rounded-xl h-11 text-sm font-mono" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Page Access Token *</Label>
                            <Input value={tempFb.accessToken} onChange={e => setTempFb(p => ({ ...p, accessToken: e.target.value }))}
                                placeholder="EAAxxxxxxxxxxxxx..." type="password" className="bg-zinc-900 border-zinc-700 rounded-xl h-11 text-sm font-mono" />
                            <p className="text-[10px] text-zinc-600">Saved locally on this device only. Never sent to our servers.</p>
                        </div>
                        <Button onClick={saveFbConfig} className="w-full h-12 bg-[#1877F2] hover:bg-blue-500 text-white font-black rounded-2xl">
                            <CheckCircle2 className="w-4 h-4 mr-2" /> SAVE &amp; CONNECT PAGE
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
