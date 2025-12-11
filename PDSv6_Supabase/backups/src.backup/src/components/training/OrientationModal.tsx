import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser } from "@/lib/auth";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { pushAdminAlert } from "@/lib/adminAlerts";
import jsPDF from "jspdf";
import api from "@/lib/api";

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
  S.push({ id: "professional-practice", name: "Professional Practice", items: [
    { title: "Consistent Technique", desc: "Careful product use and thorough inspections to ensure premium results." },
  ] });
  return S;
})();

// Exam questions: 50 multiple-choice (A–E)
type ExamQ = { q: string; options: string[]; correct: number };
const EXAM_CUSTOM_KEY = "training_exam_custom";
const EXAM_QUESTIONS: ExamQ[] = (() => {
  // If admin customized the exam, use that
  try {
    const custom = JSON.parse(localStorage.getItem(EXAM_CUSTOM_KEY) || "null");
    if (custom && Array.isArray(custom) && custom.every((c: any) => typeof c.q === 'string' && Array.isArray(c.options) && typeof c.correct === 'number')) {
      return custom.slice(0, 50);
    }
  } catch {}
  // Build 50 hard questions directly tied to handbook chapters
  const all = handbookSections.flatMap((sec) => sec.items.map((it) => ({ sec: sec.name, title: it.title, desc: it.desc })));
  const N = all.length;
  const pickIdx = (i: number) => Math.abs((i * 37 + 13) % N); // deterministic spread
  const qs: ExamQ[] = [];
  for (let i = 0; i < 50; i++) {
    const idx = pickIdx(i * Math.max(1, Math.floor(N / 50)));
    const item = all[idx];
    const distractorIdxs = [idx + 7, idx + 13, idx + 23, idx + 31].map(j => j % N);
    const distractors = distractorIdxs.map(j => all[j].desc).filter(d => d !== item.desc);
    while (distractors.length < 4) distractors.push("Unrelated technique not recommended in this chapter.");
    const baseOptions = [item.desc, distractors[0], distractors[1], distractors[2], distractors[3]];
    // Rotate options deterministically to avoid always 'A'
    const shift = (idx * 7) % 5;
    const options = baseOptions.map((_, k) => baseOptions[(k + shift) % 5]);
    const correct = (5 - shift) % 5; // index of original first element after rotation
    qs.push({
      q: `In "${item.sec}", what is the primary purpose of "${item.title}"?`,
      options,
      correct,
    });
  }
  return qs;
})();

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
  const [examIdx, setExamIdx] = useState(0);
  const [examAnswers, setExamAnswers] = useState<number[]>(() => Array(EXAM_QUESTIONS.length).fill(-1));
  const [lockedAnswers, setLockedAnswers] = useState<boolean[]>(() => Array(EXAM_QUESTIONS.length).fill(false));
  const examProgress = useMemo(() => Math.round(((examIdx + 1) / EXAM_QUESTIONS.length) * 100), [examIdx]);
  const EXAM_STORAGE_KEY = "training_exam_progress";
  const EXAM_SCHEDULE_KEY = "training_exam_schedule";
  const [scheduleConfirmOpen, setScheduleConfirmOpen] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<string>("");
  const [scheduledAt, setScheduledAt] = useState<string>("");

  useEffect(() => {
    if (open) {
      try {
        const saved = JSON.parse(localStorage.getItem(EXAM_STORAGE_KEY) || "null");
        if (saved && Array.isArray(saved.answers) && typeof saved.index === "number") {
          setExamAnswers(saved.answers.slice(0, EXAM_QUESTIONS.length).concat(Array(Math.max(0, EXAM_QUESTIONS.length - saved.answers.length)).fill(-1)));
          setExamIdx(Math.min(Math.max(0, saved.index), EXAM_QUESTIONS.length - 1));
        }
      } catch {}
      try {
        const sched = localStorage.getItem(EXAM_SCHEDULE_KEY);
        if (sched) setScheduledAt(sched);
      } catch {}
      // If requested, auto-open the exam when the orientation modal opens
      if (startExamOnOpen) {
        setExamOpen(true);
      }
    }
  }, [open, startExamOnOpen]);

  const startHandbook = () => {
    try {
      if (!localStorage.getItem(HANDBOOK_START_KEY)) {
        localStorage.setItem(HANDBOOK_START_KEY, new Date().toISOString());
      }
    } catch {}
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
    } catch {}
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
    const fileName = `Handbook_Summary_${employeeName.replace(/\s+/g,'_')}_${dateStr.replace(/[\/:]/g,'-')}.pdf`;
    savePDFToArchive('Employee Training' as any, employeeName, `handbook_${Date.now()}`, pdfData, { fileName, path: 'Employee Training/' });
    setHandbookOpen(false);
  };

  const saveExamForLater = async () => {
    try {
      localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify({ index: examIdx, answers: examAnswers }));
    } catch {}
    try {
      await api('/api/training/exam-progress', { method: 'POST', body: JSON.stringify({ employeeId, index: examIdx, answers: examAnswers }) });
    } catch {}
    pushAdminAlert('exam_paused' as any, `Employee ${employeeName} paused exam`, employeeName, { recordType: 'Employee Training' });
  };

  const submitExam = async () => {
    const correctCount = examAnswers.reduce((acc, a, i) => acc + (a === EXAM_QUESTIONS[i].correct ? 1 : 0), 0);
    const percent = Math.round((correctCount / EXAM_QUESTIONS.length) * 100);
    const pass = percent >= 75;
    try {
      await api('/api/training/exam-submit', { method: 'POST', body: JSON.stringify({ employeeId, answers: examAnswers, score: correctCount, percent, pass }) });
    } catch {}
    pushAdminAlert(pass ? 'exam_passed' : 'exam_failed', `Employee ${employeeName} exam score: ${percent}% - ${pass ? 'Passed' : 'Failed'}`, employeeName, { score: correctCount, percent });
    // PDF report
    const dateStr = new Date().toLocaleDateString();
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Training Exam Report", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Employee: ${employeeName}`, 20, 32);
    doc.text(`Date: ${dateStr}`, 20, 40);
    doc.text(`Score: ${correctCount}/${EXAM_QUESTIONS.length} (${percent}%)`, 20, 48);
    let y = 60;
    EXAM_QUESTIONS.forEach((q, i) => {
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
    const fileName = `Training_Exam_${employeeName.replace(/\s+/g,'_')}_${dateStr.replace(/\//g,'-')}.pdf`;
    savePDFToArchive('Employee Training' as any, employeeName, `exam_${Date.now()}`, pdfData, { fileName, path: 'Employee Training/' });
    setExamOpen(false);
    if (pass) {
      try {
        const dateStr = new Date().toLocaleDateString();
        localStorage.setItem('employee_training_certified', dateStr);
      } catch {}
      try { window.location.href = '/certificate'; } catch {}
    }
  };

  const saveHandbookProgress = async () => {
    const startedAt = localStorage.getItem(HANDBOOK_START_KEY) || new Date().toISOString();
    const savedAt = new Date();
    try {
      localStorage.setItem(HANDBOOK_STORAGE_KEY, JSON.stringify({ sectionsRead, activeSectionIdx, startedAt, savedAt: savedAt.toISOString() }));
    } catch {}
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
    const fileName = `Handbook_Progress_${employeeName.replace(/\s+/g,'_')}_${savedAt.toLocaleString().replace(/[\/:]/g,'-')}.pdf`;
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
                    <Badge className="bg-yellow-400 text-black">Exam reminder set for {new Date(new Date(scheduledAt).getTime() - 24*60*60*1000).toLocaleString()}</Badge>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>

      {/* Handbook Sub-Modal: Handbook UI */}
      <Dialog open={handbookOpen} onOpenChange={setHandbookOpen}>
      <DialogContent className="max-w-[110rem] w-[100vw] h-[98vh] bg-purple-900 text-white overflow-hidden border border-purple-700 rounded-lg shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Auto Detailing Handbook</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 h-[90vh]">
          {/* Table of contents */}
          <div className="md:col-span-2 overflow-y-auto overflow-x-hidden pr-4 min-w-[300px] border-r border-purple-800">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 mb-3 sticky top-0 bg-purple-900 py-2 px-2 z-10 border-b border-purple-700">
                <span className="text-xs">Jump to skipped sections</span>
                <Button className="bg-blue-600 text-white hover:bg-blue-700 shrink-0 whitespace-nowrap" size="sm" onClick={() => setShowSkippedOnly(s => !s)}>{showSkippedOnly ? 'Show All' : 'Show Skipped'}</Button>
              </div>
                {(showSkippedOnly ? handbookSections.filter((_, idx) => !sectionsRead[idx]) : handbookSections).map((sec, idxRaw) => {
                  const idx = showSkippedOnly ? handbookSections.findIndex(s => s.id === sec.id) : idxRaw;
                  return (
                    <Button
                      key={sec.id}
                      className={`w-full bg-blue-600 hover:bg-blue-700 text-white ${activeSectionIdx === idx ? 'ring-2 ring-white' : ''} flex items-center justify-between gap-2 text-left rounded px-4 py-3 text-sm leading-tight whitespace-normal break-words min-h-[48px] overflow-hidden`}
                      onClick={() => setActiveSectionIdx(idx)}
                    >
                      <span className="w-full pr-2 break-words">{sec.name}</span>
                      {!sectionsRead[idx] && (
                        <Badge className="bg-blue-900 text-white text-[10px] px-3 py-1 leading-none rounded text-center min-w-[64px]">Skipped</Badge>
                      )}
                    </Button>
                  );
                })}
            </div>
          </div>
          {/* Content */}
          <div className="md:col-span-4 bg-purple-800 rounded-lg p-4 overflow-y-auto overflow-x-hidden relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{handbookSections[activeSectionIdx].name} ({activeSectionIdx + 1}/{handbookSections.length})</h3>
                <div className="w-64">
                <Progress value={handbookProgress} className="h-2 bg-yellow-200 [&>div]:bg-yellow-400" />
                </div>
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-2 pb-40 content-grid">
              {handbookSections[activeSectionIdx].items.map((it, i) => (
                <div key={i} className="p-3 bg-purple-700 rounded w-full">
                  <div className="font-semibold break-words">{it.title}</div>
                  <div className="text-sm break-words">{it.desc}</div>
                </div>
              ))}
            </div>
            {/* Stationary footer with all controls */}
            <div className="sticky bottom-0 left-0 w-full bg-purple-800/95 pt-3 backdrop-blur supports-[backdrop-filter]:bg-purple-800/90">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between border-t border-purple-700 pt-3 px-2 gap-3">
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                  <Button className="bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto" onClick={() => setActiveSectionIdx(s => Math.max(0, s - 1))}>Previous</Button>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto" onClick={() => setActiveSectionIdx(s => Math.min(handbookSections.length - 1, s + 1))}>Next Section</Button>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto" onClick={() => toggleSectionRead(activeSectionIdx)}>{sectionsRead[activeSectionIdx] ? 'Mark as Unread' : 'Mark Section Read'}</Button>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto" onClick={() => {
                    setSectionsRead(prev => { const n = [...prev]; n[activeSectionIdx] = false; return n; });
                    setActiveSectionIdx(s => Math.min(handbookSections.length - 1, s + 1));
                  }}>Skip Chapter</Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button className="bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto" onClick={saveHandbookProgress}>Save Progress</Button>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto" onClick={confirmHandbook}>Confirm Completion</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      </Dialog>

      {/* Exam Popup Modal */}
      <Dialog open={examOpen} onOpenChange={setExamOpen}>
        <DialogContent className="max-w-3xl h-[85vh] overflow-hidden bg-[#4b0082] text-white border border-purple-700 rounded-lg shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Training Exam</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-white">Answer all 50 questions (A–E). 75% to pass. Save for Later to pause.</div>
            <Button className="bg-yellow-400 text-black hover:bg-yellow-500" onClick={saveExamForLater}>Save for Later</Button>
          </div>
          <Progress value={examProgress} className="h-2 mb-3 bg-yellow-200 [&>div]:bg-yellow-400" />
          <div className="space-y-4 h-[64vh] overflow-auto">
            <Card className="p-4 bg-[#5a189a] text-white border-purple-900">
              <div className="font-medium mb-2">{examIdx + 1}. {EXAM_QUESTIONS[examIdx].q}</div>
              <div className="grid gap-2">
                {EXAM_QUESTIONS[examIdx].options.map((opt, oi) => (
                  <label key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q-${examIdx}`}
                      disabled={lockedAnswers[examIdx]}
                      checked={examAnswers[examIdx] === oi}
                      onChange={() => setExamAnswers(prev => { const n = [...prev]; n[examIdx] = oi; return n; })}
                    />
                    <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                  </label>
                ))}
              </div>
            </Card>
          </div>
          <div className="flex items-center justify-between mt-3 sticky bottom-0 bg-[#4b0082] py-2">
            <div className="flex gap-2">
              <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setExamIdx(i => Math.max(0, i - 1))}>Previous</Button>
              <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setExamIdx(i => Math.min(EXAM_QUESTIONS.length - 1, i + 1))}>Next</Button>
              <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setLockedAnswers(prev => { const n = [...prev]; n[examIdx] = true; return n; })}>{`Is this your final answer for question number ${examIdx + 1}?`}</Button>
            </div>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={submitExam}>Submit Exam</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Confirmation Modal */}
      <Dialog open={scheduleConfirmOpen} onOpenChange={setScheduleConfirmOpen}>
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
                const reminderAt = new Date(selected.getTime() - 24*60*60*1000);
                pushAdminAlert('exam_scheduled' as any, `Exam scheduled for ${employeeName} on ${selected.toLocaleString()}`, employeeName, { recordType: 'Employee Training', when: selected.toISOString() });
                pushAdminAlert('exam_reminder' as any, `Reminder: Exam in 24 hours for ${employeeName}`, employeeName, { recordType: 'Employee Training', when: reminderAt.toISOString() });
                setScheduleConfirmOpen(false);
                setScheduledAt(selected.toISOString());
              }}>Confirm</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
