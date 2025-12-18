import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import localforage from "localforage";
import { getCurrentUser } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Lightbulb, Video, MonitorPlay, Pencil, CheckCircle2, ShieldCheck, XCircle, Lock, PlayCircle, Eye, FileText, AlertTriangle, RefreshCw, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    getTrainingModules, upsertTrainingModule, deleteTrainingModule,
    getTrainingProgress, upsertTrainingProgress, getTrainingBadges,
    type TrainingModule, type TrainingProgress, type TrainingBadge
} from "@/lib/supa-data";

interface ProTip { id: string; title: string; content: string; createdAt: number; }
interface QuizQuestion { question: string; options: string[]; correctIndex: number; }

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

const YoutubePlayer = ({ url, title, initialTime = 0, onProgress, onEnded }: {
    url: string, title: string, initialTime?: number,
    onProgress?: (time: number) => void, onEnded?: () => void
}) => {
    const getId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };
    const videoId = getId(url);
    const playerRef = useRef<any>(null);

    // Initialize YouTube API
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

        const initPlayer = () => {
            if (!videoId) return;
            playerRef.current = new window.YT.Player(`yt-player-${videoId}`, {
                videoId: videoId,
                playerVars: {
                    start: Math.floor(initialTime),
                    modestbranding: 1,
                    rel: 0
                },
                events: {
                    'onStateChange': (event: any) => {
                        if (event.data === 0) onEnded?.(); // Ended
                    }
                }
            });
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            window.onYouTubeIframeAPIReady = initPlayer;
        }

        // Interval to track progress
        const interval = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime) {
                const time = playerRef.current.getCurrentTime();
                if (time > 0) onProgress?.(time);
            }
        }, 5000); // Update every 5s

        return () => clearInterval(interval);
        return () => clearInterval(interval);
    }, [videoId]);

    // Handle late-arriving initialTime (Resume Fix)
    useEffect(() => {
        if (playerRef.current && playerRef.current.seekTo && initialTime > 0) {
            const current = playerRef.current.getCurrentTime();
            // Only seek if we are at the beginning (haven't watched yet)
            if (current < 5) {
                playerRef.current.seekTo(initialTime);
            }
        }
    }, [initialTime]);

    if (!videoId) return <div className="aspect-video bg-zinc-900 rounded-xl flex items-center justify-center border-zinc-800 text-zinc-500">Invalid URL</div>;

    return (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-black">
            <div id={`yt-player-${videoId}`} className="w-full h-full" />
        </div>
    );
};

const TrainingManual = () => {
    const { toast } = useToast();
    // Use state for user to allow updates
    const [currentUser, setCurrentUser] = useState(getCurrentUser());
    const user = currentUser; // Alias for existing code
    const isAdmin = user?.role === 'admin';
    const userId = user?.id || 'guest';

    // Force refresh user on mount to ensure we have the latest session
    useEffect(() => {
        const checkUser = () => {
            const u = getCurrentUser();
            console.log("TrainingManual checkUser:", u);
            if (u && u.id !== currentUser?.id) {
                setCurrentUser(u);
            }
        };
        checkUser();
        // Add listener for storage events (if login happens in another tab/window)
        window.addEventListener('storage', checkUser);

        // Also a small timeout to catch race conditions on initial load
        const t = setTimeout(checkUser, 1000);
        return () => {
            window.removeEventListener('storage', checkUser);
            clearTimeout(t);
        };
    }, []);

    // Data State
    const [modules, setModules] = useState<TrainingModule[]>([]);
    const [progress, setProgress] = useState<TrainingProgress[]>([]);
    const [badges, setBadges] = useState<TrainingBadge[]>([]);
    const [tips, setTips] = useState<ProTip[]>([]);

    // UI State
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") || "videos";
    const [activeCategory, setActiveCategory] = useState<string>("All");
    const [videoModalOpen, setVideoModalOpen] = useState(false);

    // Editor State
    const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
    const [modForm, setModForm] = useState<{
        title: string; url: string; desc: string; cat: string;
        sop: string; isSafety: boolean; isOptional: boolean; badgeId: string; prereqs: string[];
        quiz: QuizQuestion[];
    }>({ title: "", url: "", desc: "", cat: "Exterior", sop: "", isSafety: false, isOptional: false, badgeId: "none", prereqs: [], quiz: [] });

    // Quiz Editor Temporary State
    const [newQuizQ, setNewQuizQ] = useState("");
    const [newQuizOpts, setNewQuizOpts] = useState(["", "", "", ""]);
    const [newQuizCorrect, setNewQuizCorrect] = useState(0);

    // Runner State
    const [activeModule, setActiveModule] = useState<TrainingModule | null>(null);
    const [quizRunOpen, setQuizRunOpen] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
    const [quizResult, setQuizResult] = useState<{ passed: boolean, score: number } | null>(null);

    // Safety Acknowledge State
    const [safetyOpen, setSafetyOpen] = useState(false);
    const [safetyAck, setSafetyAck] = useState(false);
    const [pendingSafetyModule, setPendingSafetyModule] = useState<TrainingModule | null>(null);

    // Tips State
    const [tipsOpen, setTipsOpen] = useState(false);

    useEffect(() => { loadData(); }, [userId]);

    const loadData = async () => {
        const [mods, uBadges] = await Promise.all([getTrainingModules(), getTrainingBadges()]);
        setModules(mods);
        setBadges(uBadges);

        if (userId !== 'guest') {
            const prog = await getTrainingProgress(userId);
            setProgress(prog);
        }

        // Load Tips
        const savedTips = await localforage.getItem<ProTip[]>("rick_pro_tips");
        if (savedTips) setTips(savedTips);
        else {
            // Seed default checks if empty
            const defaults: ProTip[] = [
                { id: '1', title: 'Always Verify Water Source', content: 'Run spigot 10s before hooking up.', createdAt: Date.now() },
                { id: '2', title: 'Emblem Cleaning', content: 'Use soft boar hair brush while foamed.', createdAt: Date.now() }
            ];
            // Only set if truly empty/null to avoid overwrite
            if (savedTips === null) {
                setTips(defaults); localforage.setItem("rick_pro_tips", defaults);
            }
        }
    };

    // --- LOGIC: LOCKING & PROGRESS ---
    const isLocked = (m: TrainingModule) => {
        if (!m.prerequisite_ids || m.prerequisite_ids.length === 0) return false;
        // Check if ALL prereqs are completed
        return !m.prerequisite_ids.every(pid => {
            const p = progress.find(prog => prog.module_id === pid);
            return p?.status === 'completed';
        });
    };

    const saveProgress = async (mId: string, Position: number) => {
        if (userId === 'guest') return;
        await upsertTrainingProgress({
            user_id: userId, module_id: mId, video_position: Position, status: 'started'
        });
    };

    // --- EDITOR ACTIONS ---
    const openEditor = (m?: TrainingModule) => {
        if (m) {
            setEditingModule(m);
            setModForm({
                title: m.title, url: m.video_url, desc: m.description, cat: m.category,
                sop: m.sop_link || "", isSafety: m.is_safety || false,
                isOptional: (m as any).is_optional || false,
                badgeId: m.badge_reward_id || "none",
                prereqs: m.prerequisite_ids || [],
                quiz: (m.quiz_data as QuizQuestion[]) || []
            });
        } else {
            setEditingModule(null);
            setModForm({ title: "", url: "", desc: "", cat: "Exterior", sop: "", isSafety: false, isOptional: false, badgeId: "none", prereqs: [], quiz: [] });
        }
        setVideoModalOpen(true);
    };

    const saveMod = async () => {
        // Basic Validation
        if (!modForm.title.trim()) {
            toast({ title: "Error", description: "Title is required.", variant: "destructive" });
            return;
        }
        if (!modForm.url.trim()) {
            toast({ title: "Error", description: "Video URL is required.", variant: "destructive" });
            return;
        }

        const payload: Partial<TrainingModule> & { is_optional?: boolean } = {
            id: editingModule?.id,
            title: modForm.title, category: modForm.cat, video_url: modForm.url, description: modForm.desc,
            sop_link: modForm.sop, is_safety: modForm.isSafety,
            badge_reward_id: (!modForm.badgeId || modForm.badgeId === "none") ? undefined : modForm.badgeId,
            prerequisite_ids: modForm.prereqs,
            quiz_data: modForm.quiz,
            is_optional: modForm.isOptional
        };

        try {
            const { error } = await upsertTrainingModule(payload);
            if (error) throw error;
            setVideoModalOpen(false);
            loadData();
            toast({ title: "Saved", description: "Module updated successfully." });
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Error Saving Module",
                description: "Details: " + (e.message || JSON.stringify(e) || "Unknown Error"),
                variant: "destructive",
                duration: 10000
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete module?")) {
            await deleteTrainingModule(id);
            loadData();
        }
    };

    // --- QUIZ EDITOR ---
    const addQuestion = () => {
        if (!newQuizQ || newQuizOpts.some(o => !o)) return alert("Fill all fields");
        setModForm(prev => ({ ...prev, quiz: [...prev.quiz, { question: newQuizQ, options: [...newQuizOpts], correctIndex: newQuizCorrect }] }));
        setNewQuizQ(""); setNewQuizOpts(["", "", "", ""]);
    };

    // --- QUIZ RUNNER ---
    const handleTakeQuiz = (m: TrainingModule) => {
        if (isLocked(m)) return;

        // Safety Check
        if (m.is_safety) {
            const p = progress.find(pr => pr.module_id === m.id);
            if (!p?.acknowledged_at) {
                setPendingSafetyModule(m);
                setSafetyOpen(true);
                setSafetyAck(false);
                return;
            }
        }

        // Open Quiz
        setActiveModule(m);
        setQuizAnswers(new Array(m.quiz_data?.length || 0).fill(-1));
        setQuizResult(null);
        setQuizRunOpen(true);
    };

    const confirmSafety = async () => {
        if (!pendingSafetyModule || !safetyAck) return;
        if (userId === 'guest') {
            toast({ title: "Login Required", description: "You must be logged in to save progress.", variant: "destructive" });
            return;
        }

        try {
            // Save acknowledgement
            await upsertTrainingProgress({
                user_id: userId,
                module_id: pendingSafetyModule.id,
                acknowledged_at: new Date().toISOString(),
                status: 'started' // Ensure status exists
            });

            // Refresh progress local
            const p = await getTrainingProgress(userId);
            setProgress(p);

            setSafetyOpen(false);

            // Short timeout to ensure state settles before opening quiz
            setTimeout(() => {
                handleTakeQuiz(pendingSafetyModule);
            }, 100);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Safety Save Failed",
                description: "Error: " + (e.message || JSON.stringify(e)),
                variant: "destructive",
                duration: 5000
            });
        }
    };

    const submitQuiz = async () => {
        if (!activeModule) return;
        const questions = activeModule.quiz_data as QuizQuestion[];
        if (!questions || questions.length === 0) {
            completeModule(activeModule, 100);
            return;
        }

        let correct = 0;
        questions.forEach((q, i) => { if (quizAnswers[i] === q.correctIndex) correct++; });
        const score = Math.round((correct / questions.length) * 100);
        const passed = score >= 80;

        setQuizResult({ passed, score });
        if (passed) completeModule(activeModule, score);
    };

    const completeModule = async (m: TrainingModule, score: number) => {
        await upsertTrainingProgress({
            user_id: userId, module_id: m.id, status: 'completed', score: score, completed_at: new Date().toISOString()
        });
        loadData();
        if (!activeModule?.quiz_data?.length) toast({ title: "Completed", description: "Module marked as done." });
    };

    const certModules = modules.filter(m => !(m as any).is_optional);
    const learningModules = modules.filter(m => (m as any).is_optional);

    const currentList = activeCategory === "All" ? certModules : certModules.filter(m => m.category === activeCategory);
    const learningList = activeCategory === "All" ? learningModules : learningModules.filter(m => m.category === activeCategory);

    // Combine logic for display
    const VideoGrid = ({ list, isLearning = false }: { list: TrainingModule[], isLearning?: boolean }) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.length === 0 && <p className="col-span-full text-zinc-500 text-center py-8">No modules found in this category.</p>}
            {list.map(m => {
                const prog = progress.find(p => p.module_id === m.id);
                const isCompleted = prog?.status === 'completed';
                const locked = isLearning ? false : isLocked(m); // Never lock optional modules

                return (
                    <Card key={m.id} className={`bg-zinc-900 border-zinc-800 overflow-hidden flex flex-col transition-all ${isCompleted ? 'border-green-500/30' : locked ? 'opacity-70 blur-[1px] hover:blur-0' : ''}`}>
                        <div className="relative group aspect-video bg-black">
                            {locked ? (
                                <div
                                    className={`absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 ${isAdmin ? 'cursor-pointer hover:bg-black/70' : ''}`}
                                    onClick={() => {
                                        if (isAdmin) {
                                            toast({ title: "Admin Bypass", description: "Opening locked module..." });
                                            setActiveModule(m);
                                            setVideoModalOpen(true);
                                        }
                                    }}
                                >
                                    {isAdmin ? <Lock className="w-8 h-8 mb-2 text-yellow-500" /> : <Lock className="w-8 h-8 mb-2 text-zinc-500" />}
                                    <span className={`text-xs uppercase font-bold tracking-wider ${isAdmin ? 'text-yellow-500' : 'text-zinc-500'}`}>
                                        {isAdmin ? "Admin Access" : "Locked"}
                                    </span>
                                    {!isAdmin && m.prerequisite_ids && m.prerequisite_ids.length > 0 && (
                                        <div className="mt-2 px-4 text-center">
                                            <p className="text-[10px] text-zinc-600 uppercase font-bold">Requires:</p>
                                            <p className="text-xs text-zinc-500">
                                                {m.prerequisite_ids.map(pid => modules.find(mod => mod.id === pid)?.title).filter(Boolean).join(", ")}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <YoutubePlayer
                                    url={m.video_url} title={m.title}
                                    initialTime={prog?.video_position}
                                    onProgress={(t) => saveProgress(m.id, t)}
                                />
                            )}
                            {isCompleted && <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center shadow-lg pointer-events-none z-20"><CheckCircle2 className="w-3 h-3 mr-1" /> PASSED</div>}
                        </div>

                        <div className="p-4 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">{m.category}</Badge>
                                {isAdmin && (
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500" onClick={() => openEditor(m)}><Pencil className="w-3 h-3" /></Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-500" onClick={() => handleDelete(m.id)}><Trash2 className="w-3 h-3" /></Button>
                                    </div>
                                )}
                            </div>
                            <h3 className="font-bold text-lg text-white mb-2">{m.title}</h3>
                            {!isLearning && m.badge && (
                                <div className={`mb-2 flex items-center text-xs ${isCompleted ? 'text-green-500' : 'text-yellow-500'}`}>
                                    <ShieldCheck className="w-3 h-3 mr-1" />
                                    {isCompleted ? "Earned: " : "Reward: "}{m.badge.title}
                                </div>
                            )}
                            <p className="text-sm text-zinc-400 line-clamp-2 mb-4 flex-1">{m.description}</p>

                            <div className="flex gap-2">
                                {m.sop_link && (
                                    <Button variant="outline" size="sm" className="flex-1 border-zinc-700" onClick={() => window.open(m.sop_link, '_blank')}>
                                        <FileText className="w-3 h-3 mr-2" /> SOP
                                    </Button>
                                )}
                                {locked && isAdmin ? (
                                    <div className="flex gap-1 flex-1">
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black font-bold"
                                            onClick={() => {
                                                toast({ title: "Admin Bypass", description: "Opening video..." });
                                                setActiveModule(m);
                                                setVideoModalOpen(true);
                                            }}
                                        >
                                            <Lock className="w-3 h-3 mr-1" /> Bypass
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                                            onClick={() => handleTakeQuiz(m)}
                                        >
                                            Test Quiz
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={() => {
                                            if (locked && isAdmin) {
                                                // Fallback (redundant due to above, but safe)
                                                setActiveModule(m);
                                                setVideoModalOpen(true);
                                            } else {
                                                handleTakeQuiz(m);
                                            }
                                        }}
                                        disabled={locked && !isAdmin}
                                        className={`flex-1 ${isCompleted ? 'bg-zinc-800 text-green-400' : isLearning ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                                    >
                                        {isCompleted ? "Retake" : (locked && !isAdmin) ? "Locked" : isLearning ? "Mark Complete" : "Start Quiz"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="Prime Training Center" />

            <main className="container mx-auto px-4 py-6 max-w-7xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-2">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Prime Training Center</h1>
                            <p className="text-zinc-400">Employee Certification & SOP Library</p>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white" title="Master Guide"><HelpCircle className="w-5 h-5" /></Button>
                            </DialogTrigger>
                            <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-4xl max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                        <ShieldCheck className="w-6 h-6 text-purple-500" />
                                        Prime Training Center Master Guide
                                    </DialogTitle>
                                    <DialogDescription className="text-zinc-400">
                                        Everything you need to know about certification and system management.
                                    </DialogDescription>
                                </DialogHeader>
                                
                                <Tabs defaultValue="employee" className="mt-4">
                                    <TabsList className="bg-zinc-900 border border-zinc-800 w-full justify-start">
                                        <TabsTrigger value="employee" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                                            User / Employee Guide
                                        </TabsTrigger>
                                        {isAdmin && (
                                            <TabsTrigger value="admin" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                                                Admin Master Class
                                            </TabsTrigger>
                                        )}
                                    </TabsList>

                                    <TabsContent value="employee" className="space-y-6 mt-6">
                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex flex-col items-center text-center">
                                                <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400 mb-3">
                                                    <PlayCircle className="w-6 h-6" />
                                                </div>
                                                <h3 className="font-bold text-lg mb-1">1. Watch & Learn</h3>
                                                <p className="text-sm text-zinc-400">Watch the training video completely. You must acknowledge the safety protocol popup before starting.</p>
                                            </div>
                                            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex flex-col items-center text-center">
                                                <div className="w-12 h-12 rounded-full bg-purple-900/30 flex items-center justify-center text-purple-400 mb-3">
                                                    <FileText className="w-6 h-6" />
                                                </div>
                                                <h3 className="font-bold text-lg mb-1">2. Take the Quiz</h3>
                                                <p className="text-sm text-zinc-400">After the video, click "Start Quiz". You need a passing score (usually 100%) to complete the module.</p>
                                            </div>
                                            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex flex-col items-center text-center">
                                                <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center text-green-400 mb-3">
                                                    <ShieldCheck className="w-6 h-6" />
                                                </div>
                                                <h3 className="font-bold text-lg mb-1">3. Get Certified</h3>
                                                <p className="text-sm text-zinc-400">Completing modules earns you tracking progress. Completing specific Exam modules awards **Badges**.</p>
                                            </div>
                                        </div>

                                        <div className="bg-zinc-900 p-5 rounded-lg border border-zinc-800">
                                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Lock className="w-5 h-5 text-yellow-500" /> Why is a module locked?</h3>
                                            <p className="text-zinc-400 text-sm mb-2">The system enforces a strict learning path:</p>
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
                                                <li><span className="text-white font-semibold">Sequential Order:</span> You cannot skip ahead. You must complete "Basic Wash" before "Advanced Paint Correction".</li>
                                                <li><span className="text-white font-semibold">Prerequisites:</span> Some modules require a specific Badge (e.g., "Chemicals Expert") before they unlock.</li>
                                            </ul>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="admin" className="space-y-8 mt-6">
                                        <section>
                                            <h3 className="text-xl font-bold text-white mb-4 border-b border-zinc-800 pb-2">Admin Superpowers</h3>
                                            <div className="grid gap-4">
                                                <div className="flex gap-4 items-start">
                                                    <div className="p-2 bg-red-900/20 rounded text-red-400"><Lock className="w-5 h-5" /></div>
                                                    <div>
                                                        <h4 className="font-bold text-zinc-200">Bypass Locks</h4>
                                                        <p className="text-xs text-zinc-500">
                                                            As an Admin, you can see all modules. If a module is locked for normal users, you see a <span className="text-yellow-500 font-mono">Bypass</span> button.
                                                            Clicking it forces the video to open for preview. You also see a <span className="text-purple-500 font-mono">Test Quiz</span> button to dry-run the exam.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 items-start">
                                                    <div className="p-2 bg-blue-900/20 rounded text-blue-400"><Plus className="w-5 h-5" /></div>
                                                    <div>
                                                        <h4 className="font-bold text-zinc-200">Creating & Editing Content</h4>
                                                        <p className="text-xs text-zinc-500">
                                                            Click <span className="text-white font-mono">New Module</span> or the <span className="text-white font-mono">Edit (Pencil)</span> icon on any card.
                                                            This opens the **Module Editor** where you can set the Title, Description, YouTube URL, and attached Badge.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 items-start">
                                                    <div className="p-2 bg-purple-900/20 rounded text-purple-400"><HelpCircle className="w-5 h-5" /></div>
                                                    <div>
                                                        <h4 className="font-bold text-zinc-200">Quiz Builder</h4>
                                                        <p className="text-xs text-zinc-500">
                                                            Inside the Module Editor, use the **Quiz Builder** tab.
                                                            <br/>1. Click "Add Question".
                                                            <br/>2. Type the Question and 4 options.
                                                            <br/>3. <span className="text-red-400 font-bold underline">CRITICAL:</span> You MUST select the Correct Answer using the radio button next to the option.
                                                            <br/>4. Click "Save Quiz" to lock it in.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                                            <h3 className="font-bold text-zinc-300 mb-2">Pro Tips for Admins</h3>
                                            <ul className="space-y-2 text-xs text-zinc-400">
                                                <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> Use <strong>YouTube Unlisted</strong> videos so public users can't find your training content.</li>
                                                <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> Keep quizzes short (3-5 questions) to keep engagement high.</li>
                                                <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> Use the <strong>"Users & Roles"</strong> page to see who has earned which badges.</li>
                                            </ul>
                                        </section>
                                    </TabsContent>
                                </Tabs>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="flex gap-2">
                        {isAdmin && <Button onClick={() => openEditor()} className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-2" /> New Module</Button>}
                        <Button onClick={() => setTipsOpen(true)} variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-200"><Lightbulb className="w-4 h-4 mr-2 text-yellow-500" /> Pro Tips</Button>
                    </div>
                </div>

                <div className="mb-6 flex items-center justify-between bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent flex items-center gap-3">
                            Welcome, {currentUser?.name || "Guest"}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs border-zinc-700 bg-zinc-800 text-zinc-400"
                                onClick={async () => {
                                    toast({ title: "Refreshing Session...", description: "Connecting to Supabase..." });
                                    try {
                                        // Dynamic import to avoid circular dependencies if any, or just import at top if safe.
                                        // Using global 'supabase' from window if checking raw, but better to use auth lib.
                                        // We'll just trigger the same checkUser logic but harder:
                                        const { data } = await import("@/lib/supa-data").then(m => m.supabase.auth.getSession());
                                        if (data.session?.user) {
                                            const { finalizeSupabaseSession } = await import("@/lib/auth");
                                            const u = await finalizeSupabaseSession(data.session.user);
                                            setCurrentUser(u);
                                            // Explicitly reload badges/progress too
                                            loadData();
                                            toast({ title: "Session Refreshed", description: `Logged in as: ${u?.name} (${u?.role})` });
                                        } else {
                                            toast({ title: "No Active Session", description: "Supabase says you are logged out.", variant: "destructive" });
                                        }
                                    } catch (e: any) {
                                        toast({ title: "Refresh Error", description: e.message, variant: "destructive" });
                                    }
                                }}
                            >
                                <RefreshCw className="w-3 h-3 mr-1" /> Fix Login
                            </Button>
                        </h1>
                        <p className="text-zinc-400 text-sm">
                            {currentUser ? "Continue your certification journey." : "Please log in to track your progress and earn badges."}
                        </p>
                    </div>
                </div>

                {/* User Badges Display */}
                {userId !== 'guest' && (
                    <div className="mb-8">
                        <h3 className="text-sm uppercase text-zinc-500 font-bold mb-3 tracking-wider">Your Certifications</h3>
                        <div className="flex flex-wrap gap-3">
                            {modules.filter(m => {
                                const p = progress.find(pr => pr.module_id === m.id);
                                return p?.status === 'completed' && m.badge_reward_id;
                            }).map(m => {
                                const badge = m.badge; // joined
                                if (!badge) return null;
                                return (
                                    <div key={m.id} className={`flex items-center gap-2 px-3 py-2 rounded-full border bg-${badge.color}-500/10 border-${badge.color}-500/30 text-${badge.color}-400`}>
                                        <ShieldCheck className="w-4 h-4" />
                                        <span className="text-sm font-bold">{badge.title}</span>
                                    </div>
                                );
                            })}
                            {/* Fallback for no badges */}
                            {!modules.some(m => progress.some(p => p.module_id === m.id && p.status === 'completed') && m.badge_reward_id) &&
                                <p className="text-zinc-600 text-sm italic">Complete training modules to earn badges.</p>
                            }
                        </div>
                    </div>
                )}

                <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="w-full space-y-6">
                    <TabsList className="flex flex-wrap h-auto w-full bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
                        <TabsTrigger value="videos" className="flex-1 min-w-[120px] data-[state=active]:bg-purple-600 data-[state=active]:text-white"><Video className="w-4 h-4 mr-2" />Certification</TabsTrigger>
                        <TabsTrigger value="library" className="flex-1 min-w-[120px] data-[state=active]:bg-blue-600 data-[state=active]:text-white"><PlayCircle className="w-4 h-4 mr-2" />Learning Lib</TabsTrigger>
                        <TabsTrigger value="process" className="flex-1 min-w-[120px]">SOPs</TabsTrigger>
                        <TabsTrigger value="hardware" className="flex-1 min-w-[120px]">Hardware</TabsTrigger>
                        <TabsTrigger value="chemicals" className="flex-1 min-w-[120px]">Chemicals</TabsTrigger>
                        <TabsTrigger value="materials" className="flex-1 min-w-[120px]">Materials</TabsTrigger>
                    </TabsList>

                    <TabsContent value="videos" className="space-y-6">
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {["All", "Exterior", "Interior", "Paint", "Business", "Hardware", "Chemicals", "Materials"].map(cat => (
                                <Button key={cat} variant={activeCategory === cat ? "default" : "outline"} onClick={() => setActiveCategory(cat)} className={`rounded-full ${activeCategory === cat ? 'bg-white text-black' : 'border-zinc-700 text-zinc-400'}`} size="sm">{cat}</Button>
                            ))}
                        </div>
                        <VideoGrid list={currentList} />
                    </TabsContent>

                    <TabsContent value="library" className="space-y-6">
                        <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-xl mb-4">
                            <h3 className="text-blue-400 font-bold flex items-center gap-2"><Lightbulb className="w-5 h-5" /> Learning Library</h3>
                            <p className="text-zinc-400 text-sm">Optional resources for ongoing learning. These do not affect your certification status.</p>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {["All", "Exterior", "Interior", "Paint", "Business", "Hardware", "Chemicals", "Materials"].map(cat => (
                                <Button key={cat} variant={activeCategory === cat ? "default" : "outline"} onClick={() => setActiveCategory(cat)} className={`rounded-full ${activeCategory === cat ? 'bg-white text-black' : 'border-zinc-700 text-zinc-400'}`} size="sm">{cat}</Button>
                            ))}
                        </div>
                        <VideoGrid list={learningList} isLearning={true} />
                    </TabsContent>


                    <TabsContent value="process" className="space-y-6">
                        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 text-center text-zinc-500">
                            <p>Standard Operating Procedures content goes here...</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="materials" className="space-y-6">
                        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 text-center text-zinc-500">
                            <p>Materials reference content goes here...</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            {/* ADMIN EDITOR */}
            <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
                <DialogContent
                    className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] h-[80vh] flex flex-col"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader><DialogTitle>{editingModule ? "Edit Module" : "New Training Module"}</DialogTitle></DialogHeader>
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-4 py-4">
                            <Input value={modForm.title} onChange={e => setModForm({ ...modForm, title: e.target.value })} placeholder="Title" className="bg-zinc-900 border-zinc-700" />
                            <div className="grid grid-cols-2 gap-4">
                                <Select value={modForm.cat} onValueChange={v => setModForm({ ...modForm, cat: v })}>
                                    <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800">{["Exterior", "Interior", "Paint", "Business", "Hardware", "Chemicals", "Materials"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                                <Input value={modForm.url} onChange={e => setModForm({ ...modForm, url: e.target.value })} placeholder="YouTube URL" className="bg-zinc-900 border-zinc-700 font-mono text-xs" />
                            </div>
                            <Textarea value={modForm.desc} onChange={e => setModForm({ ...modForm, desc: e.target.value })} placeholder="Description" className="bg-zinc-900 border-zinc-700" />

                            <div className="grid grid-cols-2 gap-4 bg-zinc-900/50 p-4 rounded border border-zinc-800">
                                <div className="space-y-2">
                                    <label className="text-xs text-zinc-400">Badge Reward</label>
                                    <Select value={modForm.badgeId} onValueChange={v => setModForm({ ...modForm, badgeId: v })}>
                                        <SelectTrigger className="bg-zinc-900 border-zinc-700 h-8 text-xs"><SelectValue placeholder="No Badge" /></SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-800">
                                            <SelectItem value="none">No Badge</SelectItem>
                                            {badges.map(b => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-zinc-400">Attributes</label>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <Checkbox checked={modForm.isSafety} onCheckedChange={(c: any) => setModForm({ ...modForm, isSafety: !!c })} className="border-zinc-600" />
                                            <span className="text-sm">Safety Module (Requires Ack)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Checkbox checked={modForm.isOptional} onCheckedChange={(c: any) => setModForm({ ...modForm, isOptional: !!c })} className="border-zinc-600" />
                                            <span className="text-sm">Optional (Learning Library)</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs text-zinc-400">SOP Link (Optional)</label>
                                    <Input value={modForm.sop} onChange={e => setModForm({ ...modForm, sop: e.target.value })} placeholder="https://docs.google.com/..." className="bg-zinc-900 border-zinc-700 h-8 text-xs font-mono" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs text-zinc-400">Prerequisites (Module IDs)</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {modules.map(m => (
                                            <div key={m.id}
                                                onClick={() => {
                                                    const has = modForm.prereqs.includes(m.id);
                                                    const newP = has ? modForm.prereqs.filter(id => id !== m.id) : [...modForm.prereqs, m.id];
                                                    setModForm({ ...modForm, prereqs: newP });
                                                }}
                                                className={`text-xs px-2 py-1 rounded cursor-pointer border ${modForm.prereqs.includes(m.id) ? 'bg-purple-600 border-purple-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
                                            >
                                                {m.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Quiz Builder Simplified */}
                            <div className="border-t border-zinc-800 pt-4">
                                <h3 className="font-bold mb-2">Quiz Questions ({modForm.quiz.length})</h3>

                                {/* EXISTING QUESTIONS LIST */}
                                {modForm.quiz.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {modForm.quiz.map((q: any, i: number) => (
                                            <div key={i} className="bg-zinc-900 border border-zinc-800 p-3 rounded flex justify-between items-start gap-2">
                                                <div className="flex-1">
                                                    <div className="font-bold text-sm text-zinc-200 mb-1"><span className="text-purple-400">Q{i + 1}:</span> {q.question}</div>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                        {q.options.map((o: string, oi: number) => (
                                                            <div key={oi} className={`text-xs ${oi === q.correctIndex ? 'text-green-400 font-bold' : 'text-zinc-500'}`}>
                                                                {String.fromCharCode(65 + oi)}. {o} {oi === q.correctIndex && '(Correct)'}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-400 hover:text-white"
                                                        onClick={() => {
                                                            // Load into editor
                                                            setNewQuizQ(q.question);
                                                            setNewQuizOpts(q.options);
                                                            setNewQuizCorrect(q.correctIndex);
                                                            // Remove from list (effectively "moving" to editor)
                                                            setModForm(prev => ({ ...prev, quiz: prev.quiz.filter((_, idx) => idx !== i) }));
                                                        }}
                                                        title="Edit Question"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-900 hover:text-red-500 hover:bg-red-900/20"
                                                        onClick={() => {
                                                            if (confirm("Delete this question?")) {
                                                                setModForm(prev => ({ ...prev, quiz: prev.quiz.filter((_, idx) => idx !== i) }));
                                                            }
                                                        }}
                                                        title="Delete Question"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="bg-zinc-900 p-4 rounded gap-3 grid border border-zinc-800">
                                    <div className="space-y-2">
                                        <label className="text-xs text-zinc-400 font-bold">Question Text</label>
                                        <Input value={newQuizQ} onChange={e => setNewQuizQ(e.target.value)} placeholder="e.g. What is the first step?" className="bg-black border-zinc-700" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {newQuizOpts.map((opt, i) => (
                                            <div key={i}
                                                className={`space-y-1 p-2 rounded border transition-colors ${newQuizCorrect === i ? 'bg-green-900/20 border-green-500/50' : 'bg-transparent border-transparent'}`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className={`text-[10px] uppercase font-bold ${newQuizCorrect === i ? 'text-green-400' : 'text-zinc-500'}`}>
                                                        Option {String.fromCharCode(65 + i)} {newQuizCorrect === i && "(Correct)"}
                                                    </label>
                                                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => setNewQuizCorrect(i)}>
                                                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${newQuizCorrect === i ? 'border-green-500' : 'border-zinc-600'}`}>
                                                            {newQuizCorrect === i && <div className="w-2 h-2 rounded-full bg-green-500" />}
                                                        </div>
                                                        <span className={`text-[10px] ${newQuizCorrect === i ? 'text-green-400' : 'text-zinc-600'}`}>Correct?</span>
                                                    </div>
                                                </div>

                                                <Input
                                                    value={opt}
                                                    onChange={e => {
                                                        const n = [...newQuizOpts];
                                                        n[i] = e.target.value;
                                                        setNewQuizOpts(n);
                                                    }}
                                                    placeholder={`Answer ${String.fromCharCode(65 + i)}`}
                                                    className={`bg-zinc-950 h-9 text-xs border-zinc-700 focus-visible:ring-1 ${newQuizCorrect === i ? 'border-green-500 ring-green-500' : ''}`}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <Button onClick={addQuestion} size="sm" className="bg-zinc-800 hover:bg-zinc-700 w-full mt-2 border border-zinc-700 text-zinc-300">
                                        <Plus className="w-4 h-4 mr-2" /> Add Question to Quiz
                                    </Button>
                                    <p className="text-[10px] text-zinc-500 text-center mt-1">Make sure to fill all fields and select the correct answer.</p>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        {editingModule && <Button variant="ghost" className="text-red-500 mr-auto" onClick={() => handleDelete(editingModule.id)}>Delete</Button>}
                        <Button variant="ghost" onClick={() => setVideoModalOpen(false)}>Cancel</Button>
                        <Button onClick={saveMod} className="bg-purple-600">Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* SAFETY ACK MODAL */}
            <Dialog open={safetyOpen} onOpenChange={setSafetyOpen}>
                <DialogContent className="bg-red-950 border-red-900 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-500"><AlertTriangle className="w-6 h-6" /> Safety Acknowledgment</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        {userId === 'guest' && (
                            <div className="mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded flex items-center gap-2 text-red-200">
                                <XCircle className="w-5 h-5 text-red-500" />
                                <div className="text-sm font-bold">You are currently logged out (Guest).</div>
                            </div>
                        )}
                        <p className="mb-4">This module contains critical safety information. By continuing, you acknowledge that you have watched the video entirely and understand the risks linked to this task.</p>
                        <div className="flex items-center gap-3 bg-black/30 p-4 rounded border border-red-900/50">
                            <Checkbox id="safe-ack" checked={safetyAck} onCheckedChange={(c: any) => setSafetyAck(!!c)} className="border-red-500 data-[state=checked]:bg-red-600" />
                            <label htmlFor="safe-ack" className="text-sm font-bold cursor-pointer select-none">I HAVE WATCHED AND UNDERSTOOD THE SAFETY PROTOCOLS.</label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSafetyOpen(false)}>Cancel</Button>
                        <Button onClick={confirmSafety} disabled={!safetyAck || userId === 'guest'} className="bg-red-600 hover:bg-red-700">
                            {userId === 'guest' ? "Login Required" : "Confirm & Start Quiz"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* QUIZ RUNNER */}
            <Dialog open={quizRunOpen} onOpenChange={setQuizRunOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[600px]">
                    <DialogHeader><DialogTitle>Quiz: {activeModule?.title}</DialogTitle></DialogHeader>
                    {!quizResult ? (
                        <div className="space-y-6 py-4">
                            {(activeModule?.quiz_data as QuizQuestion[])?.length > 0 ? (
                                (activeModule?.quiz_data as QuizQuestion[] || []).map((q, i) => (
                                    <div key={i} className="space-y-2">
                                        <p className="font-semibold">{i + 1}. {q.question}</p>
                                        <div className="grid gap-2">
                                            {q.options.map((o, oi) => (
                                                <Button key={oi} variant="outline"
                                                    onClick={() => { const A = [...quizAnswers]; A[i] = oi; setQuizAnswers(A); }}
                                                    className={`justify-start ${quizAnswers[i] === oi ? 'bg-purple-600 border-purple-500' : 'bg-transparent border-zinc-700'}`}
                                                >
                                                    {o}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-zinc-400">
                                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No questions for this module.</p>
                                    <p className="text-sm">Click Submit below to mark it as complete.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            {quizResult.passed ? <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" /> : <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />}
                            <h3 className="text-2xl font-bold">{quizResult.passed ? "Passed!" : "Try Again"}</h3>
                            <p className="text-zinc-400">Score: {quizResult.score}%</p>
                        </div>
                    )}
                    <DialogFooter>
                        {!quizResult ? (
                            <Button onClick={submitQuiz} className="w-full bg-purple-600">Submit</Button>
                        ) : (
                            <Button onClick={() => setQuizRunOpen(false)} variant="outline" className="w-full">Close</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* PRO TIPS (Simple Viewer) */}
            <Dialog open={tipsOpen} onOpenChange={setTipsOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white"><DialogTitle>Pro Tips</DialogTitle>
                    <ScrollArea className="h-[50vh]">
                        {tips.map(t => (
                            <div key={t.id} className="mb-4 bg-zinc-900 p-3 rounded border border-zinc-800">
                                <h4 className="font-bold text-yellow-500">{t.title}</h4>
                                <p className="text-zinc-300 text-sm">{t.content}</p>
                            </div>
                        ))}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TrainingManual;
