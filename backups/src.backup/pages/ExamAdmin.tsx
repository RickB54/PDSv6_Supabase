import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { pushAdminAlert } from "@/lib/adminAlerts";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";

type ExamQ = { q: string; options: string[]; correct: number };
const EXAM_CUSTOM_KEY = "training_exam_custom";

export default function ExamAdmin() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<ExamQ[]>([]);
  const [issues, setIssues] = useState<Record<number, string[]>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EXAM_CUSTOM_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setQuestions(parsed);
          return;
        }
      }
    } catch {}
    // Seed with detailed 50-question exam derived from Auto Detailing Handbook
    const defaults = generateDefaultQuestions();
    setQuestions(defaults);
    try { localStorage.setItem(EXAM_CUSTOM_KEY, JSON.stringify(defaults)); } catch {}
  }, []);

  const save = () => {
    // Validate with guardrails before saving
    const result = validateExam(questions);
    setIssues(result.issuesByIndex);
    if (!result.valid) {
      pushAdminAlert('exam_validation_failed', 'Exam validation failed — fix highlighted issues', 'admin', { problems: result.totalIssues });
      toast({ title: 'Validation failed', description: 'Fix highlighted issues (no generic SOP phrasing, 5 non-empty options, no near-duplicate options, valid correct index).', variant: 'destructive' });
      return;
    }
    // Optionally balance correct letters if skewed
    const finalQs = result.skewedCorrectLetters ? enforceCorrectVariety(questions) : questions;
    try {
      localStorage.setItem(EXAM_CUSTOM_KEY, JSON.stringify(finalQs));
      pushAdminAlert('admin_message' as any, 'Exam updated by admin', 'admin', { count: finalQs.length });
      toast({ title: "Saved", description: result.skewedCorrectLetters ? "Saved and balanced correct answers across A–E." : "Custom exam saved. Employees will see updated questions." });
    } catch {
      toast({ title: "Error", description: "Failed to save exam.", variant: "destructive" });
    }
  };

  const addQuestion = () => setQuestions(prev => [...prev, { q: `Question ${prev.length + 1}`, options: ["Option A","Option B","Option C","Option D","Option E"], correct: 0 }]);

  const randomize = () => {
    setQuestions(prev => {
      // Deep copy
      const arr: ExamQ[] = prev.map(q => ({ q: q.q, options: [...q.options], correct: q.correct }));
      // Shuffle question order
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      // Shuffle options per question and recompute correct indices
      const distribution: number[] = [0,0,0,0,0];
      arr.forEach((q, qi) => {
        const opts = [...q.options];
        const indices = [0,1,2,3,4];
        // Fisher-Yates shuffle for options
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const newOpts = indices.map(k => opts[k]);
        const newCorrect = indices.indexOf(q.correct);
        q.options = newOpts;
        q.correct = newCorrect;
        distribution[newCorrect]++;
      });
      // If distribution is too skewed (e.g., all same letter), rotate some to spread correct indices
      const allSame = distribution.some(c => c === arr.length) || distribution.filter(c => c > 0).length === 1;
      if (allSame) {
        arr.forEach((q, i) => {
          const shift = i % 5; // guarantees variety across A–E
          if (shift > 0) {
            const rotated = [...q.options.slice(shift), ...q.options.slice(0, shift)];
            q.options = rotated;
            q.correct = (q.correct - shift + 5) % 5;
          }
        });
      }
      try { localStorage.setItem(EXAM_CUSTOM_KEY, JSON.stringify(arr)); } catch {}
      pushAdminAlert('exam_randomized', 'Exam questions and answers randomized by admin', 'admin', { count: arr.length });
      toast({ title: 'Randomized', description: 'Questions and answer letters shuffled to prevent patterns.' });
      return arr;
    });
  };

  const generateCheatSheetPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Exam Cheat Sheet — Auto Detailing', 105, 20, { align: 'center' });
      doc.setFontSize(11);
      let y = 32;
      const letter = (i: number) => String.fromCharCode(65 + i);
      questions.forEach((q, qi) => {
        doc.setFont(undefined, 'bold');
        doc.text(`${qi + 1}. ${q.q}`.slice(0, 180), 20, y);
        doc.setFont(undefined, 'normal');
        y += 6;
        q.options.forEach((opt, oi) => {
          const isCorrect = q.correct === oi;
          const text = `${letter(oi)}) ${opt}${isCorrect ? '  ✓' : ''}`;
          doc.text(text.slice(0, 160), 24, y);
          y += 6;
          if (y > 270) { doc.addPage(); y = 20; }
        });
        y += 4;
        if (y > 270) { doc.addPage(); y = 20; }
      });
      const pdfData = doc.output('dataurlstring');
      const fileName = `Exam_Cheat_Sheet_${new Date().toLocaleString().replace(/[\/:]/g, '-')}.pdf`;
      savePDFToArchive('Employee Training' as any, 'admin', `exam_cheat_${Date.now()}`, pdfData, { fileName, path: 'Employee Training/' });
      toast({ title: 'Cheat Sheet Saved', description: 'PDF saved to File Manager to match current question order.' });
      pushAdminAlert('cheat_sheet_generated', 'Exam cheat sheet generated', 'admin', {});
    } catch {
      toast({ title: 'Error', description: 'Failed generating cheat sheet.', variant: 'destructive' });
    }
  };

  function generateDefaultQuestions(): ExamQ[] {
    // Derived from Auto Detailing Handbook items; consistent phrasing and varied correct index
    const add = (q: string, correctText: string, distractors: string[]): ExamQ => {
      const base = [correctText, ...distractors.slice(0,4)];
      // Start with varied correct index across adds to avoid patterns
      const correctIndex = Math.floor(Math.random() * Math.min(5, base.length));
      // Rotate array so correct lands at chosen index
      const rotate = (arr: string[], k: number) => [...arr.slice(k), ...arr.slice(0, k)];
      const options = rotate(base, correctIndex);
      return { q, options, correct: correctIndex };
    };
    const items: { q: string; a: string; d: string[] }[] = [
      { q: 'Intake photos — exterior purpose?', a: 'Document pre-existing vehicle condition consistently', d: ['Speed up washing for time savings','Social media content for marketing','Warm panels for polishing work','Replace customer notes entirely'] },
      { q: 'Intake photos — interior purpose?', a: 'Record seats, carpets, console, and trunk condition', d: ['Plan steam cleaner purchase only','Skip customer walkthrough process','Confirm customer address data','Reset infotainment settings'] },
      { q: 'Customer notes review purpose?', a: 'Highlight specific requests and concerns before work', d: ['Upsell coatings regardless of needs','Eliminate maintenance plans entirely','Ignore unusual odors and stains','Disable owner reminders'] },
      { q: 'Vehicle walkaround identifies?', a: 'Heavy soil, tar, bug splatter, trim condition', d: ['Wheel alignment problems','Engine ECU faults','Ozone level inside cabin','Insurance claim eligibility'] },
      { q: 'Safety & PPE requirement?', a: 'Use gloves, eye protection; respirator when needed', d: ['Open-toe footwear near machines','No gloves to improve feel','Use acid without ventilation','Skip eyewear to save time'] },
      { q: 'Keys & electronics check objective?', a: 'Secure keys and protect locks/windows from product', d: ['Pair phones with Bluetooth','Reset radio presets for customer','Replace fuses proactively','Disable automatic windows'] },
      { q: 'Pre-rinse benefit?', a: 'Remove loose dirt to reduce marring risk', d: ['Dry vehicle faster without towels','Warm paint for faster polishing','Harden bugs prior to washing','Strip coatings unintentionally'] },
      { q: 'Two-bucket method achieves?', a: 'Separate rinse and wash to reduce grit transfer', d: ['Double soap concentration always','Dramatically increase foam thickness','Shorten rinse steps only','Polish wheels automatically'] },
      { q: 'Foam pre-wash provides?', a: 'Lubrication and dwell to soften contaminants', d: ['Tinted coating layer','Rapid panel heating','Drying without towels','Decontamination of interior glass'] },
      { q: 'Iron remover purpose?', a: 'Dissolve ferrous particles like rail/brake dust', d: ['Add gloss to coatings','Fix scratching instantly','Clean leather pores','Remove window stickers'] },
      { q: 'Clay bar function?', a: 'Mechanical decon for bonded contaminants', d: ['Chemical oxidation removal only','Add permanent sealant','Repair clear coat cracks','Remove high spots from coating'] },
      { q: 'Test spot goal?', a: 'Safely dial pad/polish combo before full pass', d: ['Warm panels for wax','Check towel inventory','Skip taping sensitive trim','Speed up product cure'] },
      { q: 'Inspection lighting reveals?', a: 'Swirls, RIDS, holograms and defects clearly', d: ['Mileage on odometer','Ozone quantity in cabin','Brake dust composition','Surface temperature gradients only'] },
      { q: 'Masking trim prevents?', a: 'Staining and edge damage during polishing', d: ['Pad saturation only','Battery drain during curing','Wheel face pitting','Carpet wicking under seats'] },
      { q: 'IPA wipe before coating?', a: 'Removes oils to improve bonding to paint', d: ['Adds long-term protection','Creates immediate high spots','Removes clear coat entirely','Levels coatings using heat'] },
      { q: 'Level high spots ensures?', a: 'Uniform finish and proper coating curing', d: ['Faster carpet drying','Dust attraction for ammonia','Sticker residue removal','Matte finish on trim'] },
      { q: 'Vacuum first because?', a: 'Remove loose debris prior to wet work', d: ['Dry seats quickly','Polish leather safely','Replace steaming entirely','Add fragrance coverage'] },
      { q: 'Steam used to?', a: 'Sanitize and lift embedded interior dirt', d: ['Tint windows permanently','Dry carpets without fans','Melt plastic trim','Remove clear coat'] },
      { q: 'Ozone treatment for?', a: 'Eliminate persistent interior odors', d: ['Correct paint defects','Remove wax residues','Polish window glass','Clean brake components'] },
      { q: 'Leather care best practice?', a: 'Use pH-appropriate cleaner and protectant', d: ['Use harsh solvent routinely','Bleach for dye transfer','Sandpaper on scuffs','Dry brushing only method'] },
      { q: 'Tire dressing longevity improves when?', a: 'Applied to dry, clean tires evenly', d: ['Applied onto wet tire sidewalls','Sprayed over brake discs','Mixed with wax product','Put on rubber floor mats'] },
      { q: 'Trim care objective?', a: 'Revive and protect exterior plastics', d: ['Make trim intentionally slippery','Clean wheels automatically','Add swirl marks to paint','Soften clear coat layers'] },
      { q: 'Final inspection purpose?', a: 'Confirm quality under proper lighting', d: ['Skip when schedule tight','Perform in total darkness','Only check interior panels','Only inspect wheels quickly'] },
      { q: 'Touchpoints sanitize includes?', a: 'Steering wheel, shifter, door handles', d: ['Exhaust tips only','Exterior paint panels','Only window glass','Only tires and rims'] },
      { q: 'Tools & bottles storage after job?', a: 'Clean and organize for next job', d: ['Ignore spills intentionally','Leave in customer vehicle','Seal wet pads in bags','Throw away all chemicals'] },
      { q: 'Inventory check ensures?', a: 'Consumables and equipment are restocked', d: ['Customer buys products','Only towels are counted','Random items ordered','Polish stock ignored'] },
      { q: 'Care guide review purpose?', a: 'Educate customer on maintenance and care', d: ['Upsell coatings exclusively','Skip all questions asked','Discuss unrelated services','Verify VIN and title'] },
      { q: 'CRM update helps?', a: 'Keep records with photos and notes', d: ['Erase job history','Change warranty terms','Auto-send spam emails','Hide service outcomes'] },
      { q: 'Invoice finalize requires?', a: 'Confirm payment and send receipt', d: ['Guess totals loosely','Delay 30 days always','Cash-only policy enforced','Ignore tax calculations'] },
      { q: 'Follow-up appointment offers?', a: 'Maintenance plan slot to keep results', d: ['Paint removal service','Nothing additional offered','Interior replacement service','Brake inspection program'] },
      { q: 'Measure paint thickness to?', a: 'Choose safe correction strategy', d: ['Tint windows faster','Wax panels quickly','Remove clear coat','Change vehicle color'] },
      { q: 'Avoid swirls during washing by?', a: 'Proper technique using clean tools', d: ['Use dirty towels','Dry brushing panels','No-rinse always','Steel wool mitt method'] },
      { q: 'Manage panel temperature to?', a: 'Avoid overheating and paint damage', d: ['Keep panels always hot','Freeze panels between sets','Only interior matters','Skip thermal checks'] },
      { q: 'Clean wheels order typically?', a: 'Wheels/tires first to prevent splatter', d: ['Body first always','Interior first for speed','Coating first immediately','Trim first every time'] },
      { q: 'Glass cleaning tip?', a: 'Use clean towel and streak-free cleaner', d: ['Use greasy dressing','Use clay bar only','Skip entirely for time','Use wax for shine'] },
      { q: 'Coating maintenance requires?', a: 'pH-neutral shampoo and gentle technique', d: ['Abrasives weekly on panels','Brake cleaner on paint','Strong acid on clearcoat','Heat gun curing daily'] },
      { q: 'Pad cleaning during polishing?', a: 'Clean or swap pads to maintain cut', d: ['Never needed at all','Only wash end of day','Dress pads with oils','Vacuum pads constantly'] },
      { q: 'Rinse after iron remover to?', a: 'Remove residues before next steps', d: ['Add contamination back','Dry panels instantly','Melt tires nearby','Polish glass quickly'] },
      { q: 'Decon order generally?', a: 'Chemical then mechanical for thoroughness', d: ['Mechanical then chemical','Coating then polish','Polish then wash','Wax then clay only'] },
      { q: 'Taping trim requires?', a: 'Protect edges and sensitive areas', d: ['Cover vents only','Use no tape anywhere','Use duct tape only','Apply tape when wet'] },
      { q: 'Dedicated interior tools help?', a: 'Prevent cross-contamination and damage', d: ['Make kit heavier','Slow team intentionally','Increase swirl marks','Reduce working time drastically'] },
      { q: 'Final walkaround lets you?', a: 'Show results and answer questions', d: ['Hide defects strategically','Skip customer handoff','Demand tips outright','Upsell only relentlessly'] },
      { q: 'Pre-rinse + foam combo goal?', a: 'Lubricate and lift grime before contact', d: ['Polish glass immediately','Dry vehicle without towels','Generate colored foam patterns','Warm panels for wax layer'] },
      { q: 'Trim protection after wash?', a: 'Revive color and shield UV exposure', d: ['Promote slickness on handles','Protect wheels from brake dust','Create matte on glass','Seal exhaust tips'] },
      { q: 'Interior odor remediation uses?', a: 'Ozone treatment post-cleaning if needed', d: ['Brake cleaner mist','Solvent dressing spray','Panel wipe solutions','Wax vapor trials'] },
      { q: 'Customer Q&A during handoff?', a: 'Explain care and answer maintenance questions', d: ['Avoid technical topics','Skip discussion entirely','Focus on upsell only','Discuss unrelated repairs'] },
      { q: 'Coating high spot check?', a: 'Level uneven areas during cure', d: ['Force-cure with heat gun','Ignore until next visit','Sand without light','Apply dressing on paint'] },
      { q: 'Photo documentation helps?', a: 'Evidence of condition and results', d: ['Social media only use','Warranty transfer only','Replace invoice document','Remove customer notes'] },
      { q: 'Steam and vacuum sequencing?', a: 'Vacuum first then targeted steam', d: ['Steam first on loose debris','Skip vacuum entirely','Dry carpets with steam','Wax fabric after steam'] },
      { q: 'Wheel/tire prep before dress?', a: 'Clean and dry thoroughly first', d: ['Dress on wet rubber','Dress on dirty wheels','Use wax as dressing','Skip drying completely'] },
    ];
    // Build exam; pad if fewer than 50 by reusing with slight distractor variation (no generic labels)
    const variations = (base: string[]) => [
      ...base,
      'Contradict handbook standard operating procedure'
    ];
    const Q: ExamQ[] = items.slice(0, 50).map(it => add(it.q, it.a, variations(it.d)));
    return Q;
  }

  // Guardrails: validation and balancing functions
  const bannedPhrases = [
    'general best practice',
    'follow handbook sop',
    'ignore sop',
    'sop for safety and quality'
  ];
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const jaccard = (a: string, b: string) => {
    const A = new Set(normalize(a).split(' ').filter(Boolean));
    const B = new Set(normalize(b).split(' ').filter(Boolean));
    if (A.size === 0 && B.size === 0) return 1;
    const inter = new Set([...A].filter(x => B.has(x))).size;
    const union = new Set([...A, ...B]).size;
    return inter / union;
  };
  const containsBanned = (s: string) => {
    const n = normalize(s);
    return bannedPhrases.some(p => n.includes(p));
  };
  function validateExam(qs: ExamQ[]) {
    const issuesByIndex: Record<number, string[]> = {};
    let total = 0;
    const dist = [0,0,0,0,0];
    qs.forEach((q, qi) => {
      const msgs: string[] = [];
      if (!q.q || normalize(q.q).length < 12) msgs.push('Question must be self-explanatory (min ~12 chars).');
      if (/^\s*general\s+best\s+practice\b/i.test(q.q)) msgs.push('Remove placeholder like "General best practice #".');
      if (containsBanned(q.q)) msgs.push('Question contains banned generic SOP phrasing.');
      if (!Array.isArray(q.options) || q.options.length !== 5) msgs.push('Provide exactly 5 options (A–E).');
      const opts = (q.options || []).map(o => o?.trim() || '');
      if (opts.some(o => o.length < 3)) msgs.push('Options must be non-empty and descriptive.');
      for (let i = 0; i < opts.length; i++) {
        for (let j = i + 1; j < opts.length; j++) {
          if (normalize(opts[i]) === normalize(opts[j])) msgs.push('Duplicate options detected.');
          if (jaccard(opts[i], opts[j]) > 0.85) msgs.push('Options too similar; rephrase to avoid easy guessing.');
        }
        if (containsBanned(opts[i])) msgs.push('Option contains banned SOP phrasing.');
      }
      if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 4) msgs.push('Correct index must be 0–4.');
      if (opts[q.correct] === '' || opts[q.correct] == null) msgs.push('Correct option must be non-empty.');
      if (msgs.length) { issuesByIndex[qi] = msgs; total += msgs.length; }
      dist[q.correct] = (dist[q.correct] || 0) + 1;
    });
    const lettersUsed = dist.filter(c => c > 0).length;
    const skewed = lettersUsed <= 2 || Math.max(...dist) > Math.ceil(qs.length * 0.6);
    return { valid: total === 0, totalIssues: total, issuesByIndex, skewedCorrectLetters: skewed };
  }
  function enforceCorrectVariety(qs: ExamQ[]): ExamQ[] {
    const n = qs.length;
    const target = Array(5).fill(Math.floor(n / 5));
    for (let i = 0; i < n % 5; i++) target[i]++;
    const current = [0,0,0,0,0];
    const result = qs.map(q => ({ q: q.q, options: [...q.options], correct: q.correct }));
    result.forEach(r => { current[r.correct]++; });
    const need: number[] = target.map((t, i) => Math.max(0, t - current[i]));
    result.forEach(r => {
      if (current[r.correct] > target[r.correct]) {
        const k = need.findIndex(v => v > 0);
        if (k !== -1) {
          const shift = (r.correct - k + 5) % 5; // rotate so correct becomes k
          if (shift !== 0) {
            r.options = [...r.options.slice(shift), ...r.options.slice(0, shift)];
            current[r.correct]--;
            r.correct = k;
            need[k]--;
            current[k]++;
          }
        }
      }
    });
    return result;
  }

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <Card className="p-4 bg-[#18181b] border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-semibold text-white">Exam Administration</h1>
          <div className="flex items-center gap-2">
            <Button className="bg-purple-700 text-white hover:bg-purple-800" onClick={generateCheatSheetPDF}>Generate Cheat Sheet</Button>
            <Button className="bg-blue-700 text-white hover:bg-blue-800" onClick={randomize}>Randomize Questions</Button>
            <Button className="bg-teal-700 text-white hover:bg-teal-800" onClick={() => {
              try {
                const doc = new jsPDF();
                doc.setFontSize(14);
                doc.text('Full Exam — Auto Detailing', 105, 15, { align: 'center' });
                doc.setFontSize(11);
                const qs = (questions && questions.length ? questions : []);
                let y = 25;
                const margin = 12;
                const lineHeight = 6;
                qs.slice(0, 50).forEach((q, qi) => {
                  const num = qi + 1;
                  const questionText = `${num}. ${q.q}`;
                  const split = doc.splitTextToSize(questionText, 180);
                  split.forEach((line:string) => { doc.text(line, margin, y); y += lineHeight; });
                  q.options.forEach((opt, oi) => {
                    const optText = `${String.fromCharCode(65 + oi)}) ${opt}`;
                    const splitOpt = doc.splitTextToSize(optText, 170);
                    splitOpt.forEach((line:string) => { doc.text(line, margin + 6, y); y += lineHeight; });
                  });
                  y += 4; // extra spacing between questions
                  if (y > 274) { doc.addPage(); y = 15; }
                });
                const pdfData = doc.output('dataurlstring');
                const fileName = `Full_Exam_${new Date().toLocaleString().replace(/[\/:]/g, '-')}.pdf`;
                savePDFToArchive('Employee Training' as any, 'admin', `exam_full_${Date.now()}`, pdfData, { fileName, path: 'Employee Training/' });
                toast({ title: 'Exam Saved', description: 'Full 50-question exam saved to File Manager.' });
              } catch (err:any) {
                toast({ title: 'Error', description: err?.message || 'Failed to generate exam PDF.', variant: 'destructive' });
              }
            }}>Save New Exam (PDF)</Button>
          </div>
        </div>
        <p className="text-sm text-zinc-400 mb-4">Edit questions, options, and correct answers. Saved changes take effect immediately. Randomize keeps each question with its options and correct answer as a unit.</p>
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <Card key={qi} className="p-3 bg-zinc-900 border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-zinc-400">#{qi + 1}</span>
                <Input value={q.q} onChange={(e) => {
                  const val = e.target.value; setQuestions(prev => { const n = [...prev]; n[qi] = { ...n[qi], q: val }; return n; });
                }} className="bg-zinc-800 text-white" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {q.options.map((opt, oi) => (
                  <Textarea key={oi} value={opt} onChange={(e) => {
                    const val = e.target.value; setQuestions(prev => { const n = [...prev]; const opts = [...n[qi].options]; opts[oi] = val; n[qi] = { ...n[qi], options: opts }; return n; });
                  }} className="bg-zinc-800 text-white" />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-zinc-400">Correct index:</span>
                <Input type="number" min={0} max={4} value={q.correct} onChange={(e) => {
                  const val = Math.min(4, Math.max(0, parseInt(e.target.value || '0', 10))); setQuestions(prev => { const n = [...prev]; n[qi] = { ...n[qi], correct: val }; return n; });
                }} className="w-24 bg-zinc-800 text-white" />
              </div>
              {issues[qi]?.length ? (
                <div className="mt-2 text-xs text-red-400 space-y-1">
                  {issues[qi].map((m, mi) => (<div key={mi}>• {m}</div>))}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button className="bg-blue-700 text-white hover:bg-blue-800" onClick={addQuestion}>Add Question</Button>
          <Button className="bg-purple-700 text-white hover:bg-purple-800" onClick={save}>Save</Button>
        </div>
      </Card>
    </div>
  );
}
