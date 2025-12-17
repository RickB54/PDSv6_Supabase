import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import localforage from "localforage"; // Still used for Pro Tips (User request: "Pro Tips")
import { getCurrentUser } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Lightbulb, UserCheck, Video, MonitorPlay, Pencil, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  getTrainingModules, upsertTrainingModule, deleteTrainingModule,
  getTrainingProgress, upsertTrainingProgress,
  type TrainingModule, type TrainingProgress
} from "@/lib/supa-data";

interface ProTip {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

interface QuizQuestion {
  question: string;
  options: string[]; // 4 options usually
  correctIndex: number;
}

const YoutubeEmbed = ({ url, title, onEnded }: { url: string, title: string, onEnded?: () => void }) => {
  const getId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };
  const videoId = getId(url);

  if (!videoId) return <div className="w-full aspect-video bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800"><p className="text-zinc-500">Invalid URL</p></div>;

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-black">
      <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`} title={title} allowFullScreen />
    </div>
  );
};

const TrainingManual = () => {
  const { toast } = useToast();
  const user = getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const userId = user?.id || 'guest';

  // State
  const [tipsOpen, setTipsOpen] = useState(false);
  const [tips, setTips] = useState<ProTip[]>([]);

  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [progress, setProgress] = useState<TrainingProgress[]>([]);

  // Active states
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // Editor State
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
  const [modTitle, setModTitle] = useState("");
  const [modUrl, setModUrl] = useState("");
  const [modDesc, setModDesc] = useState("");
  const [modCat, setModCat] = useState<string>("Exterior");

  // Quiz Editor State
  const [modQuiz, setModQuiz] = useState<QuizQuestion[]>([]);
  const [newQuizQ, setNewQuizQ] = useState("");
  const [newQuizOpts, setNewQuizOpts] = useState(["", "", "", ""]);
  const [newQuizCorrect, setNewQuizCorrect] = useState(0);

  // Quiz Runner State
  const [quizRunOpen, setQuizRunOpen] = useState(false);
  const [activeQuizModule, setActiveQuizModule] = useState<TrainingModule | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<{ passed: boolean, score: number } | null>(null);

  useEffect(() => {
    loadTips();
    loadModules();
  }, [userId]);

  const loadTips = async () => {
    const saved = await localforage.getItem<ProTip[]>("rick_pro_tips");
    if (saved) setTips(saved);
    else {
      // Seed default tips
      const defaults: ProTip[] = [
        { id: '1', title: 'Always Verify Water Source', content: 'Run spigot 10s before hooking up.', createdAt: Date.now() },
        { id: '2', title: 'Emblem Cleaning', content: 'Use soft boar hair brush while foamed.', createdAt: Date.now() }
      ];
      setTips(defaults); localforage.setItem("rick_pro_tips", defaults);
    }
  };

  const loadModules = async () => {
    const data = await getTrainingModules();
    setModules(data);
    if (userId !== 'guest') {
      const prog = await getTrainingProgress(userId);
      setProgress(prog);
    }
  };

  // --- MODULE ACTIONS ---
  const openVideoAdd = () => {
    setEditingModule(null);
    setModTitle(""); setModUrl(""); setModDesc(""); setModCat("Exterior");
    setModQuiz([]);
    setVideoModalOpen(true);
  };

  const openVideoEdit = (m: TrainingModule) => {
    setEditingModule(m);
    setModTitle(m.title); setModUrl(m.video_url); setModDesc(m.description); setModCat(m.category);
    setModQuiz((m.quiz_data as QuizQuestion[]) || []);
    setVideoModalOpen(true);
  };

  const saveModule = async () => {
    if (!modTitle.trim() || !modUrl.trim()) return;

    try {
      await upsertTrainingModule({
        id: editingModule?.id,
        title: modTitle,
        category: modCat,
        video_url: modUrl,
        description: modDesc,
        quiz_data: modQuiz
      });
      toast({ title: "Module Saved", description: "Training content updated." });
      loadModules();
      setVideoModalOpen(false);
    } catch (e) {
      toast({ title: "Error", description: "Failed to save module.", variant: "destructive" });
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm("Delete this module?")) return;
    await deleteTrainingModule(id);
    loadModules();
  };

  // --- QUIZ EDITOR ---
  const addQuestion = () => {
    if (!newQuizQ || newQuizOpts.some(o => !o)) return alert("Fill all fields");
    setModQuiz([...modQuiz, { question: newQuizQ, options: [...newQuizOpts], correctIndex: newQuizCorrect }]);
    setNewQuizQ(""); setNewQuizOpts(["", "", "", ""]);
  };
  const removeQuestion = (idx: number) => {
    setModQuiz(modQuiz.filter((_, i) => i !== idx));
  };

  // --- QUIZ RUNNER ---
  const startQuiz = (m: TrainingModule) => {
    if (!m.quiz_data || m.quiz_data.length === 0) {
      // No quiz, just mark complete
      markComplete(m, 100);
      return;
    }
    setActiveQuizModule(m);
    setQuizAnswers(new Array(m.quiz_data.length).fill(-1));
    setQuizResult(null);
    setQuizRunOpen(true);
  };

  const submitQuiz = () => {
    if (!activeQuizModule) return;
    const questions = activeQuizModule.quiz_data as QuizQuestion[];
    let correct = 0;
    questions.forEach((q, i) => {
      if (quizAnswers[i] === q.correctIndex) correct++;
    });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= 80;

    setQuizResult({ passed, score });

    if (passed) {
      markComplete(activeQuizModule, score);
    }
  };

  const markComplete = async (m: TrainingModule, score: number) => {
    if (userId === 'guest') return;
    await upsertTrainingProgress({
      user_id: userId,
      module_id: m.id,
      status: 'completed',
      score: score,
      completed_at: new Date().toISOString()
    });
    setProgress(await getTrainingProgress(userId));
    if (!activeQuizModule) toast({ title: "Completed!", description: "Module marked as done." });
  };

  const filteredModules = activeCategory === "All" ? modules : modules.filter(m => m.category === activeCategory);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Prime Training Center" />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Prime Training Center</h1>
            <p className="text-zinc-400">Employee Certification & SOP Library</p>
          </div>
          <div className="flex gap-2">

            {isAdmin && (
              <Button onClick={openVideoAdd} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" /> New Module
              </Button>
            )}
            <Button onClick={() => setTipsOpen(true)} variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-200">
              <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" /> Pro Tips
            </Button>
          </div>
        </div>

        <Tabs defaultValue="videos" className="w-full space-y-6">
          <TabsList className="flex flex-wrap h-auto w-full bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
            <TabsTrigger value="videos" className="flex-1 min-w-[120px] data-[state=active]:bg-purple-600 data-[state=active]:text-white"><Video className="w-4 h-4 mr-2" />Video Courses</TabsTrigger>
            <TabsTrigger value="process" className="flex-1 min-w-[120px]">Standard SOPs</TabsTrigger>
            <TabsTrigger value="hardware" className="flex-1 min-w-[120px]">Hardware</TabsTrigger>
            <TabsTrigger value="chemicals" className="flex-1 min-w-[120px]">Chemicals</TabsTrigger>
            <TabsTrigger value="mobile" className="flex-1 min-w-[120px]">Mobile Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {["All", "Exterior", "Interior", "Paint", "Business", "Other"].map(cat => (
                <Button key={cat} variant={activeCategory === cat ? "default" : "outline"} onClick={() => setActiveCategory(cat)} className={`rounded-full ${activeCategory === cat ? 'bg-white text-black' : 'border-zinc-700 text-zinc-400'}`} size="sm">
                  {cat}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModules.length === 0 ? (
                <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                  <MonitorPlay className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No training modules found.</p>
                </div>
              ) : (
                filteredModules.map(m => {
                  const prog = progress.find(p => p.module_id === m.id);
                  const isCompleted = prog?.status === 'completed';
                  return (
                    <Card key={m.id} className={`bg-zinc-900 border-zinc-800 overflow-hidden flex flex-col transition-all ${isCompleted ? 'border-green-500/30' : ''}`}>
                      <div className="relative group aspect-video bg-black">
                        <YoutubeEmbed url={m.video_url} title={m.title} />
                        {isCompleted && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center shadow-lg">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> PASSED ({prog?.score}%)
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">{m.category}</Badge>
                          {isAdmin && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => openVideoEdit(m)}><Pencil className="w-3 h-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-500" onClick={() => handleDeleteModule(m.id)}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          )}
                        </div>
                        <h3 className="font-bold text-lg text-white mb-2 leading-tight">{m.title}</h3>
                        <p className="text-sm text-zinc-400 line-clamp-2 mb-4 flex-1">{m.description || "No description provided."}</p>

                        <Button
                          onClick={() => startQuiz(m)}
                          variant={isCompleted ? "secondary" : "default"}
                          className={`w-full ${isCompleted ? 'bg-zinc-800 text-green-400 hover:bg-zinc-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                        >
                          {isCompleted ? "Retake Quiz" : "Take Quiz & Complete"}
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Standard SOPs Tab (Preserving Content) */}
          <TabsContent value="process" className="space-y-6">
            <ScrollArea className="h-[65vh] pr-4">
              <div className="relative pl-6 border-l-2 border-zinc-700 space-y-10 py-2">
                {[
                  { step: 1, title: "Wheels & Tires First", desc: "Always start here. Clean barrel -> Face -> Lug nuts -> Tire wall. Rinse thoroughly.", alert: "Don't let cleaner dry on hot wheels." },
                  { step: 2, title: "Pre-Wash & Foam", desc: "Rinse loose dirt. Apply foam. Agitate emblems/grilles with soft brush while foamed. Rinse.", alert: "Removes 90% of dirt before you touch paint." },
                  { step: 3, title: "Contact Wash (2 Bucket)", desc: "Top down. Roof -> Glass -> Hood -> Sides -> Lower Panels. Rinse wash mitt after every panel.", alert: "Save dirtiest lower rocker panels for last." },
                  { step: 4, title: "Chemical Decon", desc: "Spray Iron Remover on wet paint. Let turn purple (3 min). Rinse. Apply Tar remover if needed.", alert: "Do not do this in direct sun." },
                  { step: 5, title: "Mechanical Decon (Clay)", desc: "Use lubricant. Light pressure. Put hand in plastic bag to feel smoothness.", alert: "If you drop the clay, THROW IT AWAY." },
                  { step: 6, title: "Dry & Blow", desc: "Use drying aid. Blow out side mirrors, handles, and grille with air.", alert: "Water drips ruin the finish later." },
                  { step: 7, title: "Protection", desc: "Apply wax sealant. Crosshatch pattern. Buff off with clean plush towel.", alert: "Avoid wax on black plastic trim." },
                  { step: 8, title: "Interior Deep Clean", desc: "Trash -> Vacuum -> Shampoo -> Steam -> Plastics -> Glass. Work Top to Bottom.", alert: "Clean glass last to remove overspray." }
                ].map(s => (
                  <div key={s.step} className="relative">
                    <span className="absolute -left-[2.1rem] top-0 flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-600 font-bold text-sm text-white">{s.step}</span>
                    <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                      <h4 className="text-xl font-bold text-white mb-2">{s.title}</h4>
                      <p className="text-zinc-300 mb-2">{s.desc}</p>
                      {s.alert && <p className="text-xs text-orange-400 bg-orange-950/20 p-2 rounded inline-block">⚠️ {s.alert}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Other Tabs (Hardware/Chemicals/Mobile) - simplified to render existing content structure */}
          <TabsContent value="hardware" className="space-y-6">
            <ScrollArea className="h-[65vh] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "Pressure Washer", spec: "1,600–2,000 PSI", use: "Rinsing, Foam Cannon", tip: "Use 40° (White) or 25° (Green) nozzle." },
                  { name: "Foam Cannon", spec: "Wide neck", use: "Pre-soak", tip: "Mix soap with warm water." },
                  { name: "DA Polisher", spec: "Random Orbital", use: "Correction", tip: "Keep pad flat." },
                  { name: "Shop Vac", spec: "5+ HP Peak", use: "Extraction", tip: "Clean filter daily." },
                  { name: "Air Compressor", spec: "110+ PSI", use: "Blow out", tip: "Tape nozzle tip." },
                ].map((item, i) => (
                  <div key={i} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                    <h4 className="font-bold text-lg text-white">{item.name}</h4>
                    <p className="text-sm text-zinc-400 font-mono mb-2">{item.spec}</p>
                    <p className="text-sm text-zinc-300"><strong>Use:</strong> {item.use}</p>
                    <div className="bg-blue-500/10 text-blue-300 text-xs p-2 rounded mt-2">Pro Tip: {item.tip}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chemicals" className="space-y-6">
            <ScrollArea className="h-[65vh] pr-4">
              <div className="space-y-4">
                <div className="bg-red-950/30 border border-red-900/50 p-4 rounded-xl mb-4">
                  <h3 className="text-lg font-bold text-red-500">⚠️ Safety Warning</h3>
                  <p className="text-zinc-300 text-sm">Always wear PPE. Never mix products. Do not spray on hot surfaces.</p>
                </div>
                {[
                  { name: "Car Shampoo", type: "pH Neutral", dilution: "1-2oz per bucket" },
                  { name: "Wheel Cleaner", type: "Acid/Alkaline", dilution: "4:1" },
                  { name: "APC", type: "Alkaline", dilution: "10:1 (Delicate) / 4:1 (Tires)" },
                  { name: "Iron Remover", type: "Decon", dilution: "Ready to Use" },
                  { name: "Interior Cleaner", type: "Mild", dilution: "1:1" },
                  { name: "Glass Cleaner", type: "Alcohol Based", dilution: "10:1" },
                ].map((c, i) => (
                  <div key={i} className="flex justify-between bg-zinc-900/30 p-3 rounded-lg border border-zinc-800">
                    <div><span className="font-bold text-white">{c.name}</span> <span className="text-xs text-zinc-500">({c.type})</span></div>
                    <div className="text-sm text-purple-400 font-mono">{c.dilution}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="mobile" className="space-y-6">
            <ScrollArea className="h-[65vh] pr-4">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white">Truck Setup Zones</h3>
                <div className="grid gap-3">
                  <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800"><span className="text-blue-400 font-bold">Zone 1 (Tailgate):</span> Immediate access items. Chemicals, Buckets, Cords.</div>
                  <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800"><span className="text-blue-400 font-bold">Zone 2 (Middle):</span> Heavy equipment. Generator (Exhaust OUT), Pressure Washer.</div>
                  <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800"><span className="text-blue-400 font-bold">Zone 3 (Cab):</span> Water tank, Bulk refills, Backups.</div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>

      {/* MODULE EDITOR MODAL (Admin) */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingModule ? "Edit Video Module" : "Add New Training Video"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Video Title</label>
                  <Input value={modTitle} onChange={e => setModTitle(e.target.value)} placeholder="Lesson Title" className="bg-zinc-900 border-zinc-700" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Category</label>
                  <Select value={modCat} onValueChange={setModCat}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">{["Exterior", "Interior", "Paint", "Business", "Other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">YouTube URL</label>
                <Input value={modUrl} onChange={e => setModUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="bg-zinc-900 border-zinc-700 font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Description</label>
                <Textarea value={modDesc} onChange={e => setModDesc(e.target.value)} placeholder="Summary..." className="bg-zinc-900 border-zinc-700 min-h-[60px]" />
              </div>

              <div className="border-t border-zinc-800 pt-4 mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-lg text-purple-400">Quiz Builder</h3>
                  <span className="text-xs text-zinc-500">{modQuiz.length} Questions</span>
                </div>

                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 space-y-3">
                  <Input value={newQuizQ} onChange={e => setNewQuizQ(e.target.value)} placeholder="Question? (e.g. Which nozzle is safe for paint?)" className="bg-black/40 border-zinc-700" />
                  <div className="grid grid-cols-2 gap-2">
                    {newQuizOpts.map((opt, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input type="radio" checked={newQuizCorrect === i} onChange={() => setNewQuizCorrect(i)} name="correct-opt" className="accent-purple-500" />
                        <Input value={opt} onChange={e => { const n = [...newQuizOpts]; n[i] = e.target.value; setNewQuizOpts(n); }} placeholder={`Option ${i + 1}`} className={`h-8 bg-black/40 ${newQuizCorrect === i ? 'border-purple-500' : 'border-zinc-700'}`} />
                      </div>
                    ))}
                  </div>
                  <Button onClick={addQuestion} size="sm" variant="secondary" className="w-full h-8 text-xs">Add Question</Button>
                </div>

                <div className="space-y-2 mt-4">
                  {modQuiz.map((q, i) => (
                    <div key={i} className="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded">
                      <span className="text-sm truncate flex-1">{i + 1}. {q.question}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeQuestion(i)} className="text-red-500 hover:text-red-400 h-6 w-6"><XCircle className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setVideoModalOpen(false)}>Cancel</Button>
            <Button onClick={saveModule} className="bg-purple-600 hover:bg-purple-700">Save Content</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QUIZ RUNNER MODAL (Employee) */}
      <Dialog open={quizRunOpen} onOpenChange={setQuizRunOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-purple-500" />
              Quiz: {activeQuizModule?.title}
            </DialogTitle>
            <DialogDescription>Answer incorrectly to relearn. Pass with 80% to complete.</DialogDescription>
          </DialogHeader>

          {!quizResult ? (
            <div className="space-y-6 py-4">
              {(activeQuizModule?.quiz_data as QuizQuestion[] || []).map((q, qIdx) => (
                <div key={qIdx} className="space-y-2">
                  <p className="font-semibold text-zinc-200">{qIdx + 1}. {q.question}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <Button
                        key={oIdx}
                        variant="outline"
                        onClick={() => { const n = [...quizAnswers]; n[qIdx] = oIdx; setQuizAnswers(n); }}
                        className={`justify-start text-left h-auto py-2 px-3 ${quizAnswers[qIdx] === oIdx ? 'bg-purple-600 text-white border-purple-500' : 'bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-900'}`}
                      >
                        <span className="mr-2 opacity-50">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              {quizResult.passed ? (
                <>
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500"><CheckCircle2 className="w-8 h-8" /></div>
                  <h3 className="text-2xl font-bold text-white">Quiz Passed!</h3>
                  <p className="text-zinc-400">You scored {quizResult.score}%</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500"><XCircle className="w-8 h-8" /></div>
                  <h3 className="text-2xl font-bold text-white">Let's Try Again</h3>
                  <p className="text-zinc-400">You scored {quizResult.score}%. Need 80% to pass.</p>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            {!quizResult ? (
              <Button onClick={submitQuiz} disabled={quizAnswers.includes(-1)} className="w-full bg-purple-600 hover:bg-purple-700">Submit Answers</Button>
            ) : (
              <Button onClick={() => { if (quizResult.passed) setQuizRunOpen(false); else { setQuizResult(null); setQuizAnswers(new Array(activeQuizModule?.quiz_data?.length).fill(-1)); } }} className="w-full" variant={quizResult.passed ? "outline" : "default"}>
                {quizResult.passed ? "Close" : "Retake Quiz"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TIPS MODAL (Preserved from original) */}
      <Dialog open={tipsOpen} onOpenChange={setTipsOpen}>
        <DialogContent className="sm:max-w-[700px] bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle><Lightbulb className="w-6 h-6 text-yellow-400 inline mr-2" /> Rick's Pro Tips</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-2">
            <div className="space-y-4">
              {tips.map((tip) => (
                <div key={tip.id} className="relative bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                  <h4 className="font-bold text-purple-200">{tip.title}</h4>
                  <p className="text-zinc-300 text-sm mt-1">{tip.content}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainingManual;
