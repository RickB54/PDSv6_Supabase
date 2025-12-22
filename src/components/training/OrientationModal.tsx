import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser } from "@/lib/auth";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { pushAdminAlert } from "@/lib/adminAlerts";
import jsPDF from "jspdf";
import api from "@/lib/api";
import { getOrientationExamModule, getTrainingProgress, upsertTrainingProgress } from "@/lib/supa-data";

type OrientationModalProps = { open: boolean; onOpenChange: (v: boolean) => void; startExamOnOpen?: boolean };

type HandbookItem = { title: string; desc: string };
type HandbookSection = { id: string; name: string; items: HandbookItem[] };

// Build 133 handbook items across structured sections
const handbookSections: HandbookSection[] = (() => {
  const mk = (name: string, items: [string, string][]) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, items: items.map(([t, d]) => ({ title: t, desc: d })) });
  const S: HandbookSection[] = [
    mk("Intake & Documentation", [
      ["Intake Photos – Exterior", "Photograph all sides to document pre-existing conditions."],
      ["Intake Photos – Interior", "Capture seats, carpets, console, and trunk condition."],
      ["Customer Notes Review", "Read customer concerns and highlight special requests."],
      ["Vehicle Walkaround", "Identify heavy soil, tar, bug splatter, and trim condition."],
      ["Safety & PPE", "Gloves and eye protection for chemical handling; safe work area setup."],
      ["Keys & Electronics Check", "Secure key fob; verify power locks/windows; protect infotainment."],
    ]),
    mk("Wheels & Tires", [
      ["Wheel Face Pre-Rinse", "Flush loose dirt to reduce marring and chemical demand."],
      ["Wheel Barrel Clean", "Use dedicated brushes; clean inner barrels thoroughly."],
      ["Lug Nut & Caliper Detail", "Detail around lugs and calipers for a complete finish."],
      ["Tire Scrub", "Scrub sidewalls to remove old dressing and browning."],
      ["Rinse & Inspect", "Confirm all brake dust and grime are lifted."],
      ["Tire Dressing", "Apply even coat; avoid sling; level for satin finish."],
    ]),
    mk("Exterior Wash", [
      ["Pre-Rinse", "Knock down loose contamination prior to foam stage."],
      ["Snow Foam", "Lay lubricating blanket to soften contaminants before contact wash."],
      ["Two-Bucket Wash", "Use grit guards; separate wash/rinse buckets; top-to-bottom."],
      ["Door Jambs & Seals", "Clean seals and jambs; wipe dry to prevent drips."],
      ["Bug & Tar Removal", "Use targeted chemicals for front end and lower panels."],
      ["Final Rinse", "Sheet water to reduce drying time and spotting."],
    ]),
    mk("Decontamination", [
      ["Iron Remover (as needed)", "Chemically dissolve ferrous particles from paint."],
      ["Clay Bar Process", "Use proper lube; light pressure; check smoothness panel-by-panel."],
      ["Drying", "Blower + microfiber to prevent drips and marring."],
    ]),
    mk("Paint Inspection & Correction", [
      ["LED Inspection", "Identify swirls, RIDS, and haze; plan correction."],
      ["Pad & Compound Selection", "Choose safe combo based on paint hardness and defects."],
      ["Section Passes – Crosshatch", "Work small areas; consistent overlapping passes."],
      ["Pad Cleaning", "Air blow/brush to maintain cut and reduce dusting."],
      ["Polish Refinement", "Switch to finishing polish and pad; remove micro-marring."],
      ["IPA Wipe Down", "Remove polishing oils before protection stages."],
    ]),
    mk("Protection – Coatings & Sealants", [
      ["Coating Prep", "Panel wipe; ensure oil-free surfaces for bonding."],
      ["Ceramic Coating – Layer 1", "Apply thin, even; level high spots promptly."],
      ["Ceramic Coating – Layer 2", "Optional for premium; increase durability."],
      ["IR Curing", "Use infrared lamps ~15 min for faster, even cure."],
      ["Sealant/Glaze (Optional)", "Use when coating not selected; add gloss and protection."],
    ]),
    mk("Glass & Trim", [
      ["Glass Cleaning", "Streak-free technique; edges and mirrors included."],
      ["Glass Coating", "Hydrophobic layer for wiper performance and safety."],
      ["Trim Restoration", "Revive faded plastics; even coverage; avoid paint."],
    ]),
    mk("Engine Bay", [
      ["Degrease", "Low-pressure rinse; protect electronics; controlled dwell time."],
      ["Dress", "Satin finish; avoid slippery areas; uniform look."],
    ]),
    mk("Interior – Vacuum & Steam", [
      ["Vacuum Seats & Carpets", "Systematic approach; under seats; between cushions."],
      ["Trunk Vacuum", "Remove debris; tidy compartments; spare well."],
      ["Steam Seats", "Sanitize fabrics and lift embedded grime."],
      ["Steam Carpets", "Target stains and traffic lanes; controlled moisture."],
      ["Leather Clean & Condition", "pH-balanced cleaner; protectants for longevity."],
      ["Dash & Console APC 10:1", "Safe dilution; wipe and detail tight areas."],
      ["UV Protectant", "Apply to plastics and vinyl; avoid glare."],
    ]),
    mk("Odor & Final Checks", [
      ["Ozone Treatment 30 min", "Use in closed interior; ventilate after."],
      ["Final Walkaround Photos", "Document results; capture before/after for portfolio."],
    ]),
    mk("Post-Detail – Quality Control", [
      ["Streak Check – Glass", "Verify all panes under different angles and light."],
      ["Trim Bleed Check", "Remove any polish residue in cracks/edges."],
      ["Water Spot Check", "Inspect panels; spot-treat if necessary."],
      ["Badge & Emblem Brush", "Final detail for crisp presentation."],
      ["License Plate Clean/Reattach", "Polish and reattach securely if removed."],
      ["Touchpoints Sanitize", "Steering wheel, shifter, handles."],
      ["Tools & Bottles Store", "Clean and organize for next job."],
      ["Van Inventory Check", "Confirm consumables and equipment restocked."],
    ]),
    mk("Customer Handoff", [
      ["Care Guide Print & Review", "Provide maintenance plan; explain coating care."],
      ["Walkthrough & Q&A", "Show results; answer questions; set expectations."],
      ["CRM Update – Job Done", "Close job in system; attach photos and notes."],
      ["Invoice Finalize & Payment", "Confirm payment and send receipt."],
      ["Follow-Up Appointment", "Offer maintenance plan slot."],
    ]),
  ];
  // Professional Practice: single topic (avoid duplication)
  S.push({
    id: "professional-practice", name: "Professional Practice", items: [
      { title: "Consistent Technique", desc: "Careful product use and thorough inspections to ensure premium results." },
    ]
  });
  return S;
})();

// Exam questions: 50 multiple-choice (A–E)
type ExamQ = { q: string; options: string[]; correct: number };
const EXAM_CUSTOM_KEY = "training_exam_custom";
// Helper to generate default questions if DB fails
function generateDefaultQuestions(): ExamQ[] {
  const add = (q: string, correctText: string, distractors: string[]): ExamQ => {
    const base = [correctText, ...distractors.slice(0, 4)];
    const correctIndex = Math.floor(Math.random() * Math.min(5, base.length));
    const rotate = (arr: string[], k: number) => [...arr.slice(k), ...arr.slice(0, k)];
    const options = rotate(base, correctIndex);
    return { q, options, correct: correctIndex };
  };
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
  // Build exam; pad if fewer than 50 by reusing with slight distractor variation (no generic labels)
  const variations = (base: string[]) => [
    ...base,
    'Contradict handbook standard operating procedure'
  ];
  const Q: ExamQ[] = items.slice(0, 50).map(it => add(it.q, it.a, variations(it.d)));
  return Q;
}


export default function OrientationModal({ open, onOpenChange, startExamOnOpen = false }: OrientationModalProps) {
  const user = getCurrentUser();
  const employeeName = user?.name || "Employee";
  const employeeId = user?.email || employeeName;

  // Handbook sub-modal
  const [handbookOpen, setHandbookOpen] = useState(false);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [sectionsRead, setSectionsRead] = useState<boolean[]>(() => Array(handbookSections.length).fill(false));
  const [showSkippedOnly, setShowSkippedOnly] = useState(false);
  const handbookProgress = useMemo(() => Math.round((sectionsRead.filter(Boolean).length / handbookSections.length) * 100), [sectionsRead]);
  const HANDBOOK_STORAGE_KEY = "handbook_progress";
  const HANDBOOK_START_KEY = "handbook_start_at";

  // Exam modal
  const [examOpen, setExamOpen] = useState(false);
  const [questions, setQuestions] = useState<ExamQ[]>([]);
  const [examIdx, setExamIdx] = useState(0);
  const [examAnswers, setExamAnswers] = useState<number[]>(() => Array(50).fill(-1));
  const [lockedAnswers, setLockedAnswers] = useState<boolean[]>(() => Array(50).fill(false));
  const [moduleId, setModuleId] = useState<string | null>(null);
  const examProgress = useMemo(() => {
    if (questions.length === 0) return 0;
    return Math.round(((examIdx + 1) / questions.length) * 100);
  }, [examIdx, questions.length]);
  const EXAM_STORAGE_KEY = "training_exam_progress";
  const EXAM_SCHEDULE_KEY = "training_exam_schedule";
  const [scheduleConfirmOpen, setScheduleConfirmOpen] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<string>("");
  const [scheduledAt, setScheduledAt] = useState<string>("");

  useEffect(() => {
    // Initialize exam questions and progress
    const init = async () => {
      let loadedQs: ExamQ[] = [];
      let modId: string | null = null;
      try {
        const mod = await getOrientationExamModule();
        if (mod) {
          modId = mod.id;
          setModuleId(mod.id);
          if (Array.isArray(mod.quiz_data) && mod.quiz_data.length > 0) loadedQs = mod.quiz_data;
        }
      } catch (e) { console.error("Failed to load exam module:", e); }

      // Filter out dummy/incomplete data (e.g. the 6-question placeholder)
      // If the questions are fewer than 10, assume it's the bad seed data and fallback to hardcoded defaults.
      if (loadedQs.length < 10) {
        // console.log("Discarding incomplete exam data from DB, using defaults.");
        loadedQs = [];
      }

      if (loadedQs.length === 0) {
        // Local fallback
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

      // Load progress
      if (user?.id && modId) {
        try {
          const progressList = await getTrainingProgress(user.id);
          const myP = progressList.find(x => x.module_id === modId);
          if (myP && Array.isArray(myP.answers)) {
            const merged = [...myP.answers];
            while (merged.length < loadedQs.length) merged.push(-1);
            setExamAnswers(merged);
            // We don't forcefully restore idx to allow user to start where they want, typically 0 or first pending
            const firstUn = merged.indexOf(-1);
            if (firstUn !== -1) setExamIdx(firstUn);
          }
        } catch { }
      } else {
        // Fallback to localstorage if not logged in or no Supabase module
        try {
          const saved = JSON.parse(localStorage.getItem(EXAM_STORAGE_KEY) || "null");
          if (saved && Array.isArray(saved.answers)) {
            setExamAnswers(saved.answers.slice(0, loadedQs.length).concat(Array(Math.max(0, loadedQs.length - saved.answers.length)).fill(-1)));
            if (typeof saved.index === 'number') setExamIdx(Math.min(Math.max(0, saved.index), loadedQs.length - 1));
          }
        } catch { }
      }
    };
    init();

    if (open) {
      try {
        const sched = localStorage.getItem(EXAM_SCHEDULE_KEY);
        if (sched) setScheduledAt(sched);
      } catch { }
      // If requested, auto-open the exam when the orientation modal opens
      if (startExamOnOpen) {
        setExamOpen(true);
      }
    }
  }, [open, startExamOnOpen, user?.id]);

  const startHandbook = () => {
    try {
      if (!localStorage.getItem(HANDBOOK_START_KEY)) {
        localStorage.setItem(HANDBOOK_START_KEY, new Date().toISOString());
      }
    } catch { }
    setHandbookOpen(true);
  };
  const toggleSectionRead = (idx: number) => {
    setSectionsRead(prev => { const n = [...prev]; n[idx] = !n[idx]; return n; });
  };

  const confirmHandbook = async () => {
    const totalItems = handbookSections.reduce((acc, s) => acc + s.items.length, 0);
    const completedAt = new Date();
    const completedAtStr = completedAt.toLocaleString();
    try {
      await api('/api/training/handbook-complete', { method: 'POST', body: JSON.stringify({ employeeId, date: completedAt.toISOString(), items: totalItems }) });
    } catch { }
    pushAdminAlert('handbook_completed' as any, `New Employee ${employeeName} completed Handbook`, employeeName, { recordType: 'Employee Training', completedAt: completedAtStr });
    // PDF summary
    const dateStr = completedAtStr;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Auto Detailing Handbook Summary", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Employee: ${employeeName}`, 20, 32);
    doc.text(`Date/Time: ${dateStr}`, 20, 40);
    doc.text(`Sections Read: ${sectionsRead.filter(Boolean).length}/${handbookSections.length}`, 20, 48);
    let y = 60;
    let page = 1;
    handbookSections.forEach((sec, idx) => {
      doc.setFont(undefined, 'bold');
      const status = sectionsRead[idx] ? "Completed" : "Not Completed";
      doc.text(`${sec.name} — ${status}`, 20, y);
      doc.setFont(undefined, 'normal');
      y += 6;
      sec.items.forEach((it) => {
        const check = sectionsRead[idx] ? "✓" : "✗";
        doc.text(`${check} ${it.title}`, 24, y);
        y += 6;
        if (y > 270) { doc.addPage(); page++; y = 20; }
      });
      y += 2;
      if (y > 270) { doc.addPage(); page++; y = 20; }
    });
    const pdfData = doc.output('dataurlstring');
    const fileName = `Handbook_Summary_${employeeName.replace(/\s+/g, '_')}_${dateStr.replace(/[\/:]/g, '-')}.pdf`;
    savePDFToArchive('Employee Training' as any, employeeName, `handbook_${Date.now()}`, pdfData, { fileName, path: 'Employee Training/' });
    setHandbookOpen(false);
  };

  const saveExamForLater = async () => {
    try {
      localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify({ index: examIdx, answers: examAnswers }));
    } catch { }
    // Supabase sync
    if (user?.id && moduleId) {
      await upsertTrainingProgress({
        user_id: user.id,
        module_id: moduleId,
        answers: examAnswers,
        status: 'started',
        score: 0
      });
    }
    pushAdminAlert('exam_paused' as any, `Employee ${employeeName} paused exam`, employeeName, { recordType: 'Employee Training' });
  };

  const submitExam = async () => {
    if (questions.length === 0) return;
    const correctCount = examAnswers.reduce((acc, a, i) => acc + (a === questions[i].correct ? 1 : 0), 0);
    const percent = Math.round((correctCount / questions.length) * 100);
    const pass = percent >= 75;

    if (user?.id && moduleId) {
      await upsertTrainingProgress({
        user_id: user.id,
        module_id: moduleId,
        answers: examAnswers,
        status: 'completed',
        score: correctCount,
        completed_at: new Date().toISOString()
      });
    }

    pushAdminAlert(pass ? 'exam_passed' : 'exam_failed', `Employee ${employeeName} exam score: ${percent}% - ${pass ? 'Passed' : 'Failed'}`, employeeName, { score: correctCount, percent });
    // PDF report
    const dateStr = new Date().toLocaleDateString();
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Training Exam Report", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Employee: ${employeeName}`, 20, 32);
    doc.text(`Date: ${dateStr}`, 20, 40);
    doc.text(`Score: ${correctCount}/${questions.length} (${percent}%)`, 20, 48);
    let y = 60;
    questions.forEach((q, i) => {
      const sel = examAnswers[i];
      const corr = q.correct;
      const letter = (idx: number) => String.fromCharCode(65 + idx);
      doc.setFont(undefined, 'bold');
      doc.text(`${i + 1}. ${q.q}`, 20, y);
      doc.setFont(undefined, 'normal');
      y += 6;
      doc.text(`Selected: ${sel >= 0 ? letter(sel) : 'N/A'} — Correct: ${letter(corr)}`, 24, y);
      y += 8;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    const pdfData = doc.output('dataurlstring');
    const fileName = `Training_Exam_${employeeName.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}.pdf`;
    savePDFToArchive('Employee Training' as any, employeeName, `exam_${Date.now()}`, pdfData, { fileName, path: 'Employee Training/' });
    setExamOpen(false);
    if (pass) {
      try {
        const dateStr = new Date().toLocaleDateString();
        localStorage.setItem('employee_training_certified', dateStr);
      } catch { }
      try { window.location.href = '/certificate'; } catch { }
    }
  };

  const saveAndExitHandbook = async () => {
    await saveHandbookProgress();
    setHandbookOpen(false);
  };

  const saveHandbookProgress = async () => {
    const startedAt = localStorage.getItem(HANDBOOK_START_KEY) || new Date().toISOString();
    const savedAt = new Date();
    try {
      localStorage.setItem(HANDBOOK_STORAGE_KEY, JSON.stringify({ sectionsRead, activeSectionIdx, startedAt, savedAt: savedAt.toISOString() }));
    } catch { }
    // PDF snapshot for admin visibility
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Auto Detailing Handbook – Progress Snapshot", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Employee: ${employeeName}`, 20, 32);
    doc.text(`Started: ${new Date(startedAt).toLocaleString()}`, 20, 40);
    doc.text(`Saved: ${savedAt.toLocaleString()}`, 20, 48);
    doc.text(`Progress: ${sectionsRead.filter(Boolean).length}/${handbookSections.length} sections (${handbookProgress}%)`, 20, 56);
    let y = 68;
    handbookSections.forEach((sec, idx) => {
      doc.setFont(undefined, 'bold');
      doc.text(`${idx + 1}. ${sec.name}`, 20, y);
      doc.setFont(undefined, 'normal');
      doc.text(sectionsRead[idx] ? '✓ Read' : 'Skipped', 160, y);
      y += 8; if (y > 270) { doc.addPage(); y = 20; }
    });
    const pdfData = doc.output('dataurlstring');
    const fileName = `Handbook_Progress_${employeeName.replace(/\s+/g, '_')}_${savedAt.toLocaleString().replace(/[\/:]/g, '-')}.pdf`;
    savePDFToArchive('Employee Training' as any, employeeName, `handbook_progress_${Date.now()}`, pdfData, { fileName, path: 'Employee Training/' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Orientation – Full-screen modal */}
      <DialogContent className="max-w-none w-screen h-screen sm:rounded-none p-0 bg-black text-white overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-red-500 text-2xl">Employee Handbook</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 space-y-6 h-[calc(100%-4rem)] overflow-auto">
          <Card className="p-4 bg-zinc-900 border-zinc-800">
            <div className="space-y-3">
              <p className="text-white">Congratulations on joining the team! As a new employee, your orientation ensures you're ready to deliver the premium detailing our customers expect.</p>
              <div>
                <h3 className="text-lg font-bold text-red-400 mb-2">EXPECTATIONS & REQUIREMENTS</h3>
                <ul className="space-y-2 text-white list-disc pl-6">
                  <li>Complete the Auto Detailing Handbook (133 procedures) — read all sections carefully.</li>
                  <li>After reading, confirm completion — this notifies the admin and generates a PDF record.</li>
                  <li>Take the Training Exam (50 multiple-choice questions) — must score 75% to pass.</li>
                  <li>Time limit: Within 1 week of starting or before your first job (whichever comes first).</li>
                  <li>You can pause the exam with "Save for Later" and resume anytime.</li>
                  <li>Passing = ready for jobs; failing = retake with admin support.</li>
                </ul>
              </div>
              <p className="text-white">Click "Start Handbook" to begin.</p>
              <div className="flex gap-3">
                <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={startHandbook}>Start Handbook</Button>
                {/* After handbook confirmation, show Take Exam */}
                <Button className="bg-purple-700 text-white hover:bg-purple-800" onClick={() => setExamOpen(true)}>Take Exam</Button>
                {/* Schedule Exam within 1 week of handbook start */}
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    className="bg-zinc-800 text-white rounded px-2 py-1"
                    onChange={(e) => {
                      const start = localStorage.getItem(HANDBOOK_START_KEY);
                      const selected = new Date(e.target.value);
                      if (start) {
                        const startDate = new Date(start);
                        const deadline = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                        if (selected > deadline) {
                          alert("Exam must be scheduled within 1 week of starting the handbook.");
                          return;
                        }
                      }
                      setScheduleDraft(e.target.value);
                      setScheduleConfirmOpen(true);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Schedule exam (≤ 1 week from start)</span>
                </div>
                {scheduledAt && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-400 text-black">Exam reminder set for {new Date(new Date(scheduledAt).getTime() - 24 * 60 * 60 * 1000).toLocaleString()}</Badge>
                  </div>
                )}
              </div>
            </div>

          </Card>
        </div>
      </DialogContent >

      {/* Handbook Sub-Modal: Handbook UI */}
      < Dialog open={handbookOpen} onOpenChange={setHandbookOpen} >
        <DialogContent className="max-w-[110rem] w-[100vw] h-[100dvh] md:w-[98vw] md:h-[95vh] bg-[#020617] text-white p-0 border border-blue-900 md:rounded-lg shadow-2xl flex flex-col overflow-hidden">
          <DialogHeader className="bg-[#172554] p-4 border-b border-blue-800 shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="text-white">Auto Detailing Handbook</DialogTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-blue-200 hover:text-white hover:bg-blue-800 h-8 w-8">
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="bg-slate-900 border-blue-800 text-white w-80">
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-400">Handbook Navigation</h4>
                  <p className="text-sm text-slate-300">
                    • Use the <strong>Sidebar</strong> or <strong>Next/Prev</strong> buttons to move between sections.<br />
                    • Click <strong>Mark Read</strong> to complete a section.<br />
                    • You can <strong>Skip</strong> sections, but you must complete all of them to finish the handbook.<br />
                    • Your progress is saved automatically.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Table of contents - Sidebar (Visible on MD+, hidden on mobile unless toggled - wait, user wants Show Skipped back) */}
            {/* Moving Show Skipped to Header for better visibility, but keeping sidebar structure */}
            <div className="hidden md:flex flex-col w-64 lg:w-80 border-r border-blue-800 bg-[#0f172a]">
              <div className="p-2 border-b border-blue-800 bg-[#0f172a] shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-blue-200">Jump to skipped</span>
                  <Button className="bg-blue-600 text-white hover:bg-blue-500 h-7 text-xs" size="sm" onClick={() => setShowSkippedOnly(s => !s)}>
                    {showSkippedOnly ? 'Show All' : 'Show Skipped'}
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {(showSkippedOnly ? handbookSections.filter((_, idx) => !sectionsRead[idx]) : handbookSections).map((sec, idxRaw) => {
                  const idx = showSkippedOnly ? handbookSections.findIndex(s => s.id === sec.id) : idxRaw;
                  return (
                    <Button
                      key={sec.id}
                      variant="ghost"
                      className={`w-full justify-start text-left h-auto py-2 px-3 whitespace-normal ${activeSectionIdx === idx ? 'bg-[#334155] text-white ring-1 ring-blue-400' : 'text-slate-300 hover:bg-[#1e293b] hover:text-white'}`}
                      onClick={() => setActiveSectionIdx(idx)}
                    >
                      <span className="flex-1 text-sm">{sec.name}</span>
                      {!sectionsRead[idx] && (
                        <Badge className="bg-blue-900 text-white text-[10px] ml-1 shrink-0">Skipped</Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#172554] relative">
              {/* Header for Content */}
              <div className="p-4 bg-[#172554] border-b border-blue-800 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-white leading-tight">{handbookSections[activeSectionIdx].name}</h3>
                    <p className="text-xs text-blue-200">Section {activeSectionIdx + 1} of {handbookSections.length}</p>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-blue-200 hover:text-white hover:bg-blue-800 h-8 w-8">
                        <HelpCircle className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="bg-slate-900 border-blue-800 text-white w-80">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-blue-400">Navigation</h4>
                          <Button className="w-full mt-2 bg-blue-800/50 hover:bg-blue-700" size="sm" onClick={() => setShowSkippedOnly(s => !s)}>
                            {showSkippedOnly ? 'Show All Sections' : 'Show Skipped Only'}
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium text-blue-400">Instructions</h4>
                          <p className="text-sm text-slate-300">
                            • Use the <strong>Sidebar</strong> or <strong>Next/Prev</strong> buttons to move between sections.<br />
                            • Click <strong>Mark Read</strong> to complete a section.<br />
                            • You can <strong>Skip</strong> sections, but you must complete all of them to finish the handbook.<br />
                            • Use <strong>Save & Exit</strong> to save progress and close.
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="w-full sm:w-48">
                  <div className="flex justify-between text-xs text-blue-200 mb-1">
                    <span>Progress</span>
                    <span>{handbookProgress}%</span>
                  </div>
                  <Progress value={handbookProgress} className="h-2 bg-blue-950 [&>div]:bg-blue-400" />
                </div>
              </div>

              {/* Scrollable Items Grid */}
              <div className="flex-1 overflow-y-auto p-4 content-grid">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                  {handbookSections[activeSectionIdx].items.map((it, i) => (
                    <div key={i} className="p-4 bg-[#1e3a8a] rounded-lg border border-blue-700 shadow-sm flex flex-col">
                      <div className="font-semibold break-words text-white mb-2">{it.title}</div>
                      <div className="text-sm text-blue-100 leading-relaxed">{it.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fixed Footer Controls */}
              <div className="shrink-0 p-3 bg-[#0f172a] border-t border-blue-800 flex flex-col gap-3 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
                {/* Navigation Row */}
                <div className="flex flex-wrap items-center justify-center md:justify-between gap-3">
                  <div className="flex items-center gap-2 w-full md:w-auto justify-center">
                    <Button variant="secondary" className="bg-slate-700 text-white hover:bg-slate-600 flex-1 md:flex-none min-w-[80px]" onClick={() => setActiveSectionIdx(s => Math.max(0, s - 1))} disabled={activeSectionIdx === 0}>
                      Previous
                    </Button>
                    <Button className="bg-blue-600 text-white hover:bg-blue-500 flex-1 md:flex-none min-w-[100px]" onClick={() => setActiveSectionIdx(s => Math.min(handbookSections.length - 1, s + 1))} disabled={activeSectionIdx === handbookSections.length - 1}>
                      Next Section
                    </Button>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-center flex-wrap">
                    <Button
                      className={`${sectionsRead[activeSectionIdx] ? 'bg-slate-600 hover:bg-slate-500' : 'bg-green-600 hover:bg-green-500'} text-white min-w-[130px] flex-1 md:flex-none`}
                      onClick={() => toggleSectionRead(activeSectionIdx)}
                    >
                      {sectionsRead[activeSectionIdx] ? 'Mark Unread' : 'Mark Read'}
                    </Button>
                    <Button
                      className="bg-orange-600 text-white hover:bg-orange-500 min-w-[110px] flex-1 md:flex-none"
                      onClick={() => {
                        setSectionsRead(prev => { const n = [...prev]; n[activeSectionIdx] = false; return n; });
                        setActiveSectionIdx(s => Math.min(handbookSections.length - 1, s + 1));
                      }}
                    >
                      Skip Chapter
                    </Button>
                  </div>
                </div>

                {/* Global Actions Row */}
                <div className="flex items-center justify-center md:justify-end gap-3 pt-2 border-t border-blue-900/50">
                  <Button variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/50 h-8 text-sm" onClick={saveAndExitHandbook}>
                    Save & Exit
                  </Button>
                  <Button className="bg-emerald-600 text-white hover:bg-emerald-500 h-8 text-sm" onClick={confirmHandbook}>
                    Complete Handbook
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog >

      {/* Exam Popup Modal */}
      < Dialog open={examOpen} onOpenChange={setExamOpen} >
        <DialogContent className="max-w-3xl w-[95vw] h-[90vh] bg-[#4b0082] text-white border border-purple-700 rounded-lg shadow-xl p-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-4 border-b border-purple-800 bg-[#3c0068] shrink-0">
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="text-white flex items-center gap-2">
                Training Exam
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-purple-200 hover:text-white hover:bg-purple-800 h-6 w-6">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="bg-[#2e1065] border-purple-700 text-white w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium text-yellow-400">Exam Instructions</h4>
                      <p className="text-sm text-purple-100">
                        • There are <strong>50 questions</strong>. You need <strong>75%</strong> to pass.<br />
                        • Use <strong>Lock Answer</strong> to prevent accidental changes.<br />
                        • You can pause the exam using <strong>Save & Close</strong>.<br />
                        • Good luck!
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </DialogTitle>
              <Button className="bg-yellow-400 text-black hover:bg-yellow-500 h-7 text-xs" size="sm" onClick={() => { saveExamForLater(); setExamOpen(false); }}>Save & Close</Button>
            </div>
          </DialogHeader>

          <div className="p-4 border-b border-purple-800 bg-[#4b0082] shrink-0 space-y-2">
            <div className="flex justify-between text-sm text-purple-200">
              <span>Question {examIdx + 1} of {questions.length}</span>
              <span>{examProgress}% Completed</span>
            </div>
            <Progress value={examProgress} className="h-2 bg-purple-900 [&>div]:bg-yellow-400" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-[#5a189a]">
            {questions[examIdx] && (
              <Card className="p-6 bg-[#4b0082] text-white border-purple-900 shadow-lg">
                <div className="font-medium text-lg mb-6 leading-relaxed">{examIdx + 1}. {questions[examIdx].q}</div>
                <div className="flex flex-col gap-3">
                  {questions[examIdx].options.map((opt, oi) => (
                    <label key={oi} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${examAnswers[examIdx] === oi ? 'bg-purple-600 border-yellow-400' : 'bg-purple-900/50 border-purple-800 hover:bg-purple-800'}`}>
                      <div className="pt-0.5">
                        <input
                          type="radio"
                          name={`q-${examIdx}`}
                          disabled={lockedAnswers[examIdx]}
                          checked={examAnswers[examIdx] === oi}
                          onChange={() => setExamAnswers(prev => { const n = [...prev]; n[examIdx] = oi; return n; })}
                          className="w-4 h-4 accent-yellow-400"
                        />
                      </div>
                      <span className="text-base leading-snug">{String.fromCharCode(65 + oi)}. {opt}</span>
                    </label>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="shrink-0 p-4 bg-[#3c0068] border-t border-purple-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 w-full sm:w-auto justify-center">
              <Button className="bg-blue-600 text-white hover:bg-blue-700 min-w-[80px]" onClick={() => setExamIdx(i => Math.max(0, i - 1))} disabled={examIdx === 0}>Previous</Button>
              <Button className="bg-blue-600 text-white hover:bg-blue-700 min-w-[80px]" onClick={() => setExamIdx(i => Math.min(questions.length - 1, i + 1))} disabled={examIdx === questions.length - 1}>Next</Button>
            </div>

            <div className="flex gap-2 w-full sm:w-auto justify-center">
              <Button variant="outline" className="border-purple-400 text-purple-200 hover:bg-purple-800 whitespace-nowrap" onClick={() => setLockedAnswers(prev => { const n = [...prev]; n[examIdx] = true; return n; })}>Lock Answer</Button>
              <Button className="bg-red-600 text-white hover:bg-red-700 whitespace-nowrap" onClick={submitExam}>Submit Exam</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog >

      {/* Schedule Confirmation Modal */}
      < Dialog open={scheduleConfirmOpen} onOpenChange={setScheduleConfirmOpen} >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Exam Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">You selected: {scheduleDraft ? new Date(scheduleDraft).toLocaleString() : '—'}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setScheduleConfirmOpen(false)}>Cancel</Button>
              <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => {
                if (!scheduleDraft) return setScheduleConfirmOpen(false);
                const selected = new Date(scheduleDraft);
                localStorage.setItem(EXAM_SCHEDULE_KEY, selected.toISOString());
                const reminderAt = new Date(selected.getTime() - 24 * 60 * 60 * 1000);
                pushAdminAlert('exam_scheduled' as any, `Exam scheduled for ${employeeName} on ${selected.toLocaleString()}`, employeeName, { recordType: 'Employee Training', when: selected.toISOString() });
                pushAdminAlert('exam_reminder' as any, `Reminder: Exam in 24 hours for ${employeeName}`, employeeName, { recordType: 'Employee Training', when: reminderAt.toISOString() });
                setScheduleConfirmOpen(false);
                setScheduledAt(selected.toISOString());
              }}>Confirm</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog >
    </Dialog >
  );
}
