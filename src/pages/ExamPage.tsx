import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getOrientationExamModule, getTrainingProgress, upsertTrainingProgress } from "@/lib/supa-data";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ExamQ = { q: string; options: string[]; correct: number };
const EXAM_CUSTOM_KEY = "training_exam_custom";

export default function ExamPage() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<ExamQ[]>([]);
  const [examIdx, setExamIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(50).fill(-1));
  const [lockedAnswers, setLockedAnswers] = useState<boolean[]>(Array(50).fill(false));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [submitWarningOpen, setSubmitWarningOpen] = useState(false);
  const [user] = useState(getCurrentUser());
  const [moduleId, setModuleId] = useState<string | null>(null);

  const examProgress = useMemo(() => {
    if (questions.length === 0) return 0;
    return Math.round(((examIdx + 1) / questions.length) * 100);
  }, [examIdx, questions.length]);

  useEffect(() => {
    const init = async () => {
      // 1. Load Questions
      let loadedQs: ExamQ[] = [];
      let modId: string | null = null;
      try {
        const mod = await getOrientationExamModule();
        if (mod) {
          modId = mod.id;
          setModuleId(mod.id);
          if (Array.isArray(mod.quiz_data) && mod.quiz_data.length > 0) {
            loadedQs = mod.quiz_data;
          }
        }
      } catch (e) {
        console.error("Failed to load exam module:", e);
      }

      if (loadedQs.length === 0) {
        // Fallback to local
        try {
          const raw = localStorage.getItem(EXAM_CUSTOM_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) loadedQs = parsed;
          }
        } catch { }
      }
      if (loadedQs.length === 0) loadedQs = generateDefaultQuestions();

      setQuestions(loadedQs);

      // 2. Load Progress from Supabase if user logged in
      if (user?.id && modId) {
        try {
          const progressList = await getTrainingProgress(user.id);
          const myP = progressList.find(x => x.module_id === modId);
          if (myP) {
            if (myP.status === 'completed') {
              setSubmitted(true);
              setScore(myP.score || 0);
            }
            if (Array.isArray(myP.answers) && myP.answers.length > 0) {
              const merged = [...myP.answers];
              while (merged.length < loadedQs.length) merged.push(-1);
              setAnswers(merged);
              const firstUnanswered = merged.indexOf(-1);
              setExamIdx(firstUnanswered !== -1 ? firstUnanswered : 0);
            } else {
              setAnswers(Array(loadedQs.length).fill(-1));
            }
          } else {
            setAnswers(Array(loadedQs.length).fill(-1));
          }
        } catch { }
      } else {
        setAnswers(Array(loadedQs.length).fill(-1));
      }
      setLockedAnswers(Array(loadedQs.length).fill(false));
    };
    init();
  }, [user]);

  const syncProgress = async (currentAnswers: number[], isComplete = false, finalScore = 0) => {
    if (!user?.id || !moduleId) {
      // Fallback logic could be here if needed, but per request "everything to Supabase"
      return;
    }
    try {
      await upsertTrainingProgress({
        user_id: user.id,
        module_id: moduleId,
        answers: currentAnswers,
        status: isComplete ? 'completed' : 'started',
        score: finalScore,
        completed_at: isComplete ? new Date().toISOString() : undefined
      });
    } catch (e) { console.error("Save failed", e); }
  };

  const submit = async () => {
    const correctCount = answers.reduce((acc, a, i) => acc + (questions[i] && a === questions[i].correct ? 1 : 0), 0);
    setSubmitted(true);
    setScore(correctCount);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await syncProgress(answers, true, correctCount);
    toast({ title: "Exam Submitted", description: "Your results have been saved to Supabase." });
  };

  const saveAndExit = async () => {
    await syncProgress(answers, false, 0);
    toast({ title: "Saved", description: "Exam progress saved to Supabase. You can resume later." });
    window.history.back();
  };

  if (questions.length === 0) return <div className="min-h-screen bg-background flex items-center justify-center text-zinc-500">Loading Exam...</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Employee Final Exam" />
      <main className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Result View */}
        {submitted && score !== null ? (
          <Card className={`p-6 mb-8 border-2 ${score >= 38 ? 'border-green-500 bg-green-950/20' : 'border-red-500 bg-red-950/20'}`}>
            <h2 className="text-2xl font-bold text-white mb-2">{score >= 38 ? '🎉 Passed!' : '❌ Failed'}</h2>
            <p className="text-lg text-zinc-200">You scored <span className="font-bold">{score}/50</span> ({Math.round((score / 50) * 100)}%)</p>
            <p className="text-zinc-400 mt-2">{score >= 38 ? 'Great job! You are certified.' : 'Please review the training modules and try again.'}</p>
            <Button onClick={() => { setSubmitted(false); setAnswers(Array(questions.length).fill(-1)); setScore(null); setExamIdx(0); setLockedAnswers(Array(questions.length).fill(false)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="mt-4" variant="outline">Retake Exam</Button>
          </Card>
        ) : (
          // Wizard View
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Certification Exam</h1>
                <p className="text-zinc-400 text-sm">Question {examIdx + 1} of {questions.length}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={saveAndExit} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Save & Close</Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                      <HelpCircle className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="bg-zinc-900 border-zinc-700 text-white w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium text-yellow-500">Exam Help</h4>
                      <p className="text-sm text-zinc-300">
                        • 75% required to pass.<br />
                        • Use <strong>Lock Answer</strong> to prevent accidental changes.<br />
                        • Progress is saved automatically.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Progress</span>
                <span>{examProgress}%</span>
              </div>
              <Progress value={examProgress} className="h-2 bg-zinc-800 [&>div]:bg-purple-600" />
            </div>

            <Card className="p-6 bg-zinc-900 border-zinc-800 shadow-xl min-h-[400px] flex flex-col">
              <div className="font-medium text-xl text-white mb-6 leading-relaxed flex-1">
                <span className="text-zinc-500 mr-2 text-lg">#{examIdx + 1}</span>
                {questions[examIdx].q}
              </div>

              <div className="grid gap-3">
                {questions[examIdx].options.map((opt, oi) => (
                  <label key={oi} className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${answers[examIdx] === oi
                    ? 'bg-purple-600/20 border-purple-500 shadow-[0_0_15px_-3px_rgba(168,85,247,0.3)]'
                    : 'bg-zinc-950/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                    } ${lockedAnswers[examIdx] ? 'opacity-90' : ''}`}>
                    <input
                      type="radio"
                      name={`q-${examIdx}`}
                      checked={answers[examIdx] === oi}
                      disabled={lockedAnswers[examIdx]}
                      onChange={() => setAnswers(prev => { const n = [...prev]; n[examIdx] = oi; return n; })}
                      className="mt-1 w-4 h-4 accent-purple-500 cursor-pointer"
                    />
                    <span className={`text-base leading-snug ${answers[examIdx] === oi ? 'text-white font-medium' : 'text-zinc-300'}`}>{opt}</span>
                  </label>
                ))}
              </div>
            </Card>

            <div className="flex items-center justify-between pt-4">
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="min-w-[100px] bg-zinc-800 text-white hover:bg-zinc-700"
                  onClick={() => setExamIdx(i => Math.max(0, i - 1))}
                  disabled={examIdx === 0}
                >
                  Previous
                </Button>
                <Button
                  className="min-w-[120px] bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20"
                  onClick={() => setExamIdx(i => Math.min(questions.length - 1, i + 1))}
                  disabled={examIdx === questions.length - 1}
                >
                  Next
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className={`border-zinc-700 ${lockedAnswers[examIdx] ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50' : 'text-zinc-400 hover:text-white'}`}
                  onClick={() => setLockedAnswers(prev => { const n = [...prev]; n[examIdx] = !n[examIdx]; return n; })}
                >
                  {lockedAnswers[examIdx] ? 'Answer Locked' : 'Lock Answer'}
                </Button>

                <Button
                  className="bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20"
                  onClick={() => {
                    const unanswered = answers.filter(a => a === -1).length;
                    if (unanswered > 0) {
                      setSubmitWarningOpen(true);
                    } else {
                      submit();
                    }
                  }}
                >
                  Submit Exam
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <AlertDialog open={submitWarningOpen} onOpenChange={setSubmitWarningOpen}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">Incomplete Exam</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              You have {answers.filter(a => a === -1).length} unanswered questions.
              Are you sure you want to submit? Unanswered questions will be marked incorrect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800 hover:text-white">Keep Working</AlertDialogCancel>
            <AlertDialogAction onClick={submit} className="bg-red-600 text-white hover:bg-red-700">Submit Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function generateDefaultQuestions(): ExamQ[] {
  const add = (q: string, correctText: string, distractors: string[]): ExamQ => {
    const base = [correctText, ...distractors.slice(0, 4)];
    // Simple rotation based on length to distribute answers
    const correctIndex = base.length % 5;
    // Rotate array 
    const rotate = (arr: string[], k: number) => [...arr.slice(k), ...arr.slice(0, k)];
    // actually let's just use regular options order but ensure correct is tracked
    const finalOpts = [correctText, ...distractors].slice(0, 5);
    // Shuffle
    for (let i = finalOpts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalOpts[i], finalOpts[j]] = [finalOpts[j], finalOpts[i]];
    }
    return { q, options: finalOpts, correct: finalOpts.indexOf(correctText) };
  };

  // Default Content (Same as ExamAdmin)
  const items: { q: string; a: string; d: string[] }[] = [
    { q: 'Intake photos — exterior purpose?', a: 'Document pre-existing vehicle condition consistently', d: ['Speed up washing for time savings', 'Social media content for marketing', 'Warm panels for polishing work', 'Replace customer notes entirely'] },
    { q: 'Intake photos — interior purpose?', a: 'Record seats, carpets, console, and trunk condition', d: ['Plan steam cleaner purchase only', 'Skip customer walkthrough process', 'Confirm customer address data', 'Reset infotainment settings'] },
    { q: 'Customer notes review purpose?', a: 'Highlight specific requests and concerns before work', d: ['Upsell coatings regardless of needs', 'Eliminate maintenance plans entirely', 'Ignore unusual odors and stains', 'Disable owner reminders'] },
    { q: 'Vehicle walkaround identifies?', a: 'Heavy soil, tar, bug splatter, trim condition', d: ['Wheel alignment problems', 'Engine ECU faults', 'Ozone level inside cabin', 'Insurance claim eligibility'] },
    { q: 'Safety & PPE requirement?', a: 'Use gloves, eye protection; respirator when needed', d: ['Open-toe footwear near machines', 'No gloves to improve feel', 'Use acid without ventilation', 'Skip eyewear to save time'] },
    { q: 'Keys & electronics check objective?', a: 'Secure keys and protect locks/windows from product', d: ['Pair phones with Bluetooth', 'Reset radio presets for customer', 'Replace fuses proactively', 'Disable automatic windows'] },
    { q: 'Pre-rinse benefit?', a: 'Remove loose dirt to reduce marring risk', d: ['Dry vehicle faster without towels', 'Warm paint for faster polishing', 'Harden bugs prior to washing', 'Strip coatings unintentionally'] },
    { q: 'Two-bucket method achieves?', a: 'Separate rinse and wash to reduce grit transfer', d: ['Double soap concentration always', 'Dramatically increase foam thickness', 'Shorten rinse steps only', 'Polish wheels automatically'] },
    { q: 'Foam pre-wash provides?', a: 'Lubrication and dwell to soften contaminants', d: ['Tinted coating layer', 'Rapid panel heating', 'Drying without towels', 'Decontamination of interior glass'] },
    { q: 'Iron remover purpose?', a: 'Dissolve ferrous particles like rail/brake dust', d: ['Add gloss to coatings', 'Fix scratching instantly', 'Clean leather pores', 'Remove window stickers'] },
    { q: 'Clay bar function?', a: 'Mechanical decon for bonded contaminants', d: ['Chemical oxidation removal only', 'Add permanent sealant', 'Repair clear coat cracks', 'Remove high spots from coating'] },
    { q: 'Test spot goal?', a: 'Safely dial pad/polish combo before full pass', d: ['Warm panels for wax', 'Check towel inventory', 'Skip taping sensitive trim', 'Speed up product cure'] },
    { q: 'Inspection lighting reveals?', a: 'Swirls, RIDS, holograms and defects clearly', d: ['Mileage on odometer', 'Ozone quantity in cabin', 'Brake dust composition', 'Surface temperature gradients only'] },
    { q: 'Masking trim prevents?', a: 'Staining and edge damage during polishing', d: ['Pad saturation only', 'Battery drain during curing', 'Wheel face pitting', 'Carpet wicking under seats'] },
    { q: 'IPA wipe before coating?', a: 'Removes oils to improve bonding to paint', d: ['Adds long-term protection', 'Creates immediate high spots', 'Removes clear coat entirely', 'Levels coatings using heat'] },
    { q: 'Level high spots ensures?', a: 'Uniform finish and proper coating curing', d: ['Faster carpet drying', 'Dust attraction for ammonia', 'Sticker residue removal', 'Matte finish on trim'] },
    { q: 'Vacuum first because?', a: 'Remove loose debris prior to wet work', d: ['Dry seats quickly', 'Polish leather safely', 'Replace steaming entirely', 'Add fragrance coverage'] },
    { q: 'Steam used to?', a: 'Sanitize and lift embedded interior dirt', d: ['Tint windows permanently', 'Dry carpets without fans', 'Melt plastic trim', 'Remove clear coat'] },
    { q: 'Ozone treatment for?', a: 'Eliminate persistent interior odors', d: ['Correct paint defects', 'Remove wax residues', 'Polish window glass', 'Clean brake components'] },
    { q: 'Leather care best practice?', a: 'Use pH-appropriate cleaner and protectant', d: ['Use harsh solvent routinely', 'Bleach for dye transfer', 'Sandpaper on scuffs', 'Dry brushing only method'] },
    { q: 'Tire dressing longevity improves when?', a: 'Applied to dry, clean tires evenly', d: ['Applied onto wet tire sidewalls', 'Sprayed over brake discs', 'Mixed with wax product', 'Put on rubber floor mats'] },
    { q: 'Trim care objective?', a: 'Revive and protect exterior plastics', d: ['Make trim intentionally slippery', 'Clean wheels automatically', 'Add swirl marks to paint', 'Soften clear coat layers'] },
    { q: 'Final inspection purpose?', a: 'Confirm quality under proper lighting', d: ['Skip when schedule tight', 'Perform in total darkness', 'Only check interior panels', 'Only inspect wheels quickly'] },
    { q: 'Touchpoints sanitize includes?', a: 'Steering wheel, shifter, door handles', d: ['Exhaust tips only', 'Exterior paint panels', 'Only window glass', 'Only tires and rims'] },
    { q: 'Tools & bottles storage after job?', a: 'Clean and organize for next job', d: ['Ignore spills intentionally', 'Leave in customer vehicle', 'Seal wet pads in bags', 'Throw away all chemicals'] },
    { q: 'Inventory check ensures?', a: 'Consumables and equipment are restocked', d: ['Customer buys products', 'Only towels are counted', 'Random items ordered', 'Polish stock ignored'] },
    { q: 'Care guide review purpose?', a: 'Educate customer on maintenance and care', d: ['Upsell coatings exclusively', 'Skip all questions asked', 'Discuss unrelated services', 'Verify VIN and title'] },
    { q: 'CRM update helps?', a: 'Keep records with photos and notes', d: ['Erase job history', 'Change warranty terms', 'Auto-send spam emails', 'Hide service outcomes'] },
    { q: 'Invoice finalize requires?', a: 'Confirm payment and send receipt', d: ['Guess totals loosely', 'Delay 30 days always', 'Cash-only policy enforced', 'Ignore tax calculations'] },
    { q: 'Follow-up appointment offers?', a: 'Maintenance plan slot to keep results', d: ['Paint removal service', 'Nothing additional offered', 'Interior replacement service', 'Brake inspection program'] },
    { q: 'Measure paint thickness to?', a: 'Choose safe correction strategy', d: ['Tint windows faster', 'Wax panels quickly', 'Remove clear coat', 'Change vehicle color'] },
    { q: 'Avoid swirls during washing by?', a: 'Proper technique using clean tools', d: ['Use dirty towels', 'Dry brushing panels', 'No-rinse always', 'Steel wool mitt method'] },
    { q: 'Manage panel temperature to?', a: 'Avoid overheating and paint damage', d: ['Keep panels always hot', 'Freeze panels between sets', 'Only interior matters', 'Skip thermal checks'] },
    { q: 'Clean wheels order typically?', a: 'Wheels/tires first to prevent splatter', d: ['Body first always', 'Interior first for speed', 'Coating first immediately', 'Trim first every time'] },
    { q: 'Glass cleaning tip?', a: 'Use clean towel and streak-free cleaner', d: ['Use greasy dressing', 'Use clay bar only', 'Skip entirely for time', 'Use wax for shine'] },
    { q: 'Coating maintenance requires?', a: 'pH-neutral shampoo and gentle technique', d: ['Abrasives weekly on panels', 'Brake cleaner on paint', 'Strong acid on clearcoat', 'Heat gun curing daily'] },
    { q: 'Pad cleaning during polishing?', a: 'Clean or swap pads to maintain cut', d: ['Never needed at all', 'Only wash end of day', 'Dress pads with oils', 'Vacuum pads constantly'] },
    { q: 'Rinse after iron remover to?', a: 'Remove residues before next steps', d: ['Add contamination back', 'Dry panels instantly', 'Melt tires nearby', 'Polish glass quickly'] },
    { q: 'Decon order generally?', a: 'Chemical then mechanical for thoroughness', d: ['Mechanical then chemical', 'Coating then polish', 'Polish then wash', 'Wax then clay only'] },
    { q: 'Taping trim requires?', a: 'Protect edges and sensitive areas', d: ['Cover vents only', 'Use no tape anywhere', 'Use duct tape only', 'Apply tape when wet'] },
    { q: 'Dedicated interior tools help?', a: 'Prevent cross-contamination and damage', d: ['Make kit heavier', 'Slow team intentionally', 'Increase swirl marks', 'Reduce working time drastically'] },
    { q: 'Final walkaround lets you?', a: 'Show results and answer questions', d: ['Hide defects strategically', 'Skip customer handoff', 'Demand tips outright', 'Upsell only relentlessly'] },
    { q: 'Pre-rinse + foam combo goal?', a: 'Lubricate and lift grime before contact', d: ['Polish glass immediately', 'Dry vehicle without towels', 'Generate colored foam patterns', 'Warm panels for wax layer'] },
    { q: 'Trim protection after wash?', a: 'Revive color and shield UV exposure', d: ['Promote slickness on handles', 'Protect wheels from brake dust', 'Create matte on glass', 'Seal exhaust tips'] },
    { q: 'Interior odor remediation uses?', a: 'Ozone treatment post-cleaning if needed', d: ['Brake cleaner mist', 'Solvent dressing spray', 'Panel wipe solution', 'Wax vapor trials'] },
    { q: 'Customer Q&A during handoff?', a: 'Explain care and answer maintenance questions', d: ['Avoid technical topics', 'Skip discussion entirely', 'Focus on upsell only', 'Discuss unrelated repairs'] },
    { q: 'Coating high spot check?', a: 'Level uneven areas during cure', d: ['Force-cure with heat gun', 'Ignore until next visit', 'Sand without light', 'Apply dressing on paint'] },
    { q: 'Photo documentation helps?', a: 'Evidence of condition and results', d: ['Social media only use', 'Warranty transfer only', 'Replace invoice document', 'Remove customer notes'] },
    { q: 'Steam and vacuum sequencing?', a: 'Vacuum first then targeted steam', d: ['Steam first on loose debris', 'Skip vacuum entirely', 'Dry carpets with steam', 'Wax fabric after steam'] },
    { q: 'Wheel/tire prep before dress?', a: 'Clean and dry thoroughly first', d: ['Dress on wet rubber', 'Dress on dirty wheels', 'Use wax as dressing', 'Skip drying completely'] },
  ];

  // Fill to 50 if needed
  const variations = (base: string[]) => [
    ...base,
    'Contradict handbook standard operating procedure'
  ];
  const Q: ExamQ[] = items.slice(0, 50).map(it => add(it.q, it.a, variations(it.d)));
  return Q;
}
