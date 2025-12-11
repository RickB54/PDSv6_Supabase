import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser } from "@/lib/auth";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { pushAdminAlert } from "@/lib/adminAlerts";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import jsPDF from "jspdf";
import OrientationModal from "@/components/training/OrientationModal";

// 113-step training flow, no duplicates, ordered top-to-bottom
const TRAINING_STEPS: string[] = [
  "INTAKE PHOTOS – EXTERIOR WALKAROUND",
  "INTAKE PHOTOS – INTERIOR WALKAROUND",
  "PRE-RINSE & SNOW FOAM",
  "WHEELS & TIRES – CLEAN BARRELS",
  "WHEELS & TIRES – DRESSING",
  "TWO-BUCKET WASH – TOP TO BOTTOM",
  "DOOR JAMBS & SEALS",
  "CLAY BAR DECONTAMINATION",
  "DRY WITH BLOWER + MICROFIBER",
  "PAINT INSPECTION UNDER LED",
  "COMPOUND STAGE 1 (HEAVY DEFECTS)",
  "POLISH STAGE 2 (SWIRL REMOVAL)",
  "IPA WIPE DOWN",
  "CERAMIC COATING PREP",
  "CERAMIC COATING APPLICATION – 1ST LAYER",
  "CERAMIC COATING – 2ND LAYER (GOLD PASS)",
  "INFRARED CURE 15 MIN",
  "GLASS CLEANING + COATING",
  "TRIM RESTORATION",
  "ENGINE BAY DEGREASE",
  "ENGINE BAY DRESSING",
  "INTERIOR VACUUM – SEATS & CARPET",
  "INTERIOR VACUUM – TRUNK",
  "STEAM CLEAN – SEATS",
  "STEAM CLEAN – CARPETS",
  "LEATHER CLEAN & CONDITION",
  "DASH & CONSOLE APC 10:1",
  "UV PROTECTANT APPLICATION",
  "ODOR ELIMINATION – OZONE 30 MIN",
  "FINAL WALKAROUND PHOTOS",
  // Extended unique steps to reach 113 items
  "FLOOR MATS – SHAMPOO",
  "FLOOR MATS – DRY & GROOM",
  "HEADLINER – GENTLE SPOT CLEAN",
  "SEAT TRACKS – DETAIL BRUSH",
  "CUPHOLDERS – DEEP CLEAN",
  "DOOR PANELS – CLEAN & CONDITION",
  "VENTS – AIR BLOW & WIPE",
  "INFOTAINMENT SCREEN – GLASS SAFE",
  "STEERING WHEEL – SANITIZE",
  "SEATBELTS – SPOT CLEAN",
  "CARPET LINES – GROOM",
  "TRUNK ORGANIZER – CLEAN",
  "SPARE WELL – VACUUM",
  "SUN VISORS – WIPE",
  "MIRRORS – POLISH",
  "WINDOW SEALS – CLEAN",
  "BADGES & EMBLEMS – DETAIL BRUSH",
  "FUEL DOOR – CLEAN",
  "EXHAUST TIPS – POLISH",
  "PAINT EDGE – TAPE & CHECK",
  "ROOF RAILS – CLEAN",
  "WHEEL WELLS – DRESS",
  "TIRE LETTERING – CLEAN",
  "CALIPERS – DETAIL",
  "WINDSHIELD – DECONTAM",
  "BUG REMOVAL – FRONT END",
  "TAR REMOVAL – LOWER PANELS",
  "PLASTIC ARCHES – RESTORE",
  "CHROME TRIM – POLISH",
  "ALUMINUM TRIM – POLISH",
  "SOFT TOP – CLEAN & PROTECT",
  "DOOR SILL – POLISH",
  "PAINT THICKNESS – MEASURE",
  "CORRECTION PAD – SELECT",
  "PAD PRIMING – COMPOUND",
  "SECTION PASSES – CROSSHATCH",
  "PAD CLEAN – AIR/BRUSH",
  "POLISH PAD – SWITCH",
  "FINAL INSPECTION – LED",
  "GLAZE – OPTIONAL",
  "SEALANT – OPTIONAL",
  "CERAMIC EDGE CHECK",
  "COATING HIGH SPOT – LEVEL",
  "CURING – FINAL CHECK",
  "GLASS – RAIN REPEL",
  "WIPER BLADES – CLEAN",
  "MIRROR FOLD – CLEAN",
  "LICENSE PLATE – CLEAN",
  "LICENSE PLATE – REATTACH",
  "INTERIOR ODOR – VERIFY",
  "FABRIC PROTECTOR – APPLY",
  "LEATHER PROTECTOR – APPLY",
  "PLASTIC UV – APPLY",
  "SEAT RAILS – LUBE",
  "DOOR HINGES – LUBE",
  "KEY FOB – CLEAN",
  "OWNER ITEMS – ORGANIZE",
  "TRASH REMOVED – VERIFY",
  "STREAK CHECK – GLASS",
  "MICROFIBERS – COUNT & STORE",
  "PAD INVENTORY – CLEAN",
  "BOTTLES – WIPE & STORE",
  "PRESSURE WASHER – STORE",
  "FOAM CANNON – RINSE",
  "BUCKETS – RINSE & STORE",
  "BRUSHES – RINSE & DRY",
  "TARP/FLOOR – CLEAN",
  "LIGHTS – OFF & STORE",
  "VAN CHECK – INVENTORY",
  "PHOTOS – BEFORE/AFTER COLLAGE",
  "SOCIAL POST – OPTIONAL",
  "EMAIL CUSTOMER – READY",
  "CRM UPDATE – JOB DONE",
  "INVOICE – FINALIZE",
  "PAYMENT – CONFIRM",
  "APPOINTMENT – FOLLOW-UP",
  "MAINTENANCE PLAN – OFFER",
  "WARRANTY – DOCUMENT",
  "CARE GUIDE – PRINT",
  "CARE GUIDE – REVIEW",
  "PRESENTATION – WALKTHROUGH",
  "CUSTOMER QUESTIONS – ANSWER",
  "PANEL GAP – VISUAL CHECK",
  "HANDWASH MARKS – VERIFY",
  "WATER SPOTS – CHECK",
  "TRIM BLEED – CHECK",
  "POLISH DUST – REMOVE",
  "TAPE RESIDUE – REMOVE",
  "EDGE BUFFER – SAFE",
  "LOGO PLACEMENT – VERIFY",
  "FINAL FLOOR VAC – QUICK",
  "ODOUR – FINAL PASS",
  "WINDOW TINT – SAFE CLEAN",
  "HEADLIGHTS – POLISH (IF ADDED)",
  "TAILLIGHTS – POLISH (IF ADDED)",
  "RIMS – FINAL BUFF",
  "TIRE SHINE – FINAL PASS",
  "DRIP CHECK – ALL PANELS",
  "TOUCHPOINTS – SANITIZE",
  "TOOLS – KIT SECURED",
  "SHOP AREA – CLEAN",
  "DOCUMENTS – FILE",
  "CUSTOMER HANDOFF & VIDEO WALKTHROUGH",
];

type SavedProgress = {
  currentStep: number;
  checked: boolean[];
  notes: Record<number, string>;
  tipsChecked: boolean[];
};

const STORAGE_KEY = "employee_training_progress";
const CERT_STORAGE_KEY = "employee_training_certified";

const EmployeeTrainingCourse = () => {
  const user = getCurrentUser();
  const [orientationOpen, setOrientationOpen] = useState(false);
  const total = TRAINING_STEPS.length;
  const [currentStep, setCurrentStep] = useState(0);
  const [checked, setChecked] = useState<boolean[]>(() => Array(total).fill(false));
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [tipsChecked, setTipsChecked] = useState<boolean[]>(() => Array(6).fill(false));
  const [examStarted, setExamStarted] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examScore, setExamScore] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>(Array(25).fill(-1));
  // Simple exam mode (original look)
  const [certified, setCertified] = useState<string | null>(() => localStorage.getItem(CERT_STORAGE_KEY));

  const progress = useMemo(() => {
    return Math.round((currentStep / 113) * 100);
  }, [currentStep]);

  useEffect(() => {
    const savedRaw = localStorage.getItem(STORAGE_KEY);
    if (savedRaw) {
      try {
        const saved: SavedProgress = JSON.parse(savedRaw);
        if (typeof saved.currentStep === "number" && Array.isArray(saved.checked)) {
          setCurrentStep(Math.min(Math.max(saved.currentStep, 0), total - 1));
          const safeChecked = saved.checked.slice(0, total);
          setChecked(safeChecked.length === total ? safeChecked : [...safeChecked, ...Array(total - safeChecked.length).fill(false)]);
          setNotes(saved.notes || {});
          if (Array.isArray(saved.tipsChecked)) {
            const t = saved.tipsChecked.slice(0, 6);
            setTipsChecked(t.length === 6 ? t : [...t, ...Array(6 - t.length).fill(false)]);
          }
        }
      } catch {}
    }
  }, [total]);

  const toggleChecked = (index: number) => {
    setChecked(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, total - 1));
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSaveForLater = () => {
    const payload: SavedProgress = { currentStep, checked, notes, tipsChecked };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    alert("Progress saved. You can resume later.");
  };

  const allChecked = useMemo(() => checked.every(Boolean) && checked.length === total, [checked, total]);

  const handleFinishTraining = () => {
    if (!allChecked) {
      alert("Please complete all 113 steps before finishing.");
      return;
    }
    const employeeName = user?.name || "Jane Doe";
    const today = new Date();
    const dateStr = today.toLocaleDateString().replace(/\//g, "-");
    const fileName = `Certificate – ${employeeName} – Full Detail Master – ${dateStr}.pdf`;

    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("Prime Detail Solutions", 105, 25, { align: "center" });
    doc.setFontSize(16);
    doc.text("Certification of Completion", 105, 40, { align: "center" });
    doc.setFontSize(12);
    doc.text(`This certifies that ${employeeName} has successfully completed`, 105, 55, { align: "center" });
    doc.text("the 113-Step Full Detailing Master Course.", 105, 63, { align: "center" });
    doc.text(`Date: ${today.toLocaleDateString()}`, 105, 80, { align: "center" });
    doc.text("Instructor: Rick", 105, 88, { align: "center" });
    doc.text("—", 105, 100, { align: "center" });
    doc.text("Course Steps Completed:", 20, 115);
    TRAINING_STEPS.slice(0, 25).forEach((s, i) => {
      doc.text(`• ${s}`, 20, 125 + i * 6);
    });
    const pdfDataUrl = doc.output("dataurlstring");
    savePDFToArchive("Employee Training" as any, employeeName, `CERT-${Date.now()}`, String(pdfDataUrl));
    alert("Training finished! Certificate saved to File Manager.");
  };

  const currentTitle = TRAINING_STEPS[currentStep];

  // Rick's Pro Tips
  const PRO_TIPS = [
    "Always pre-rinse heavily soiled areas to prevent marring.",
    "Use dedicated wheel buckets to avoid cross-contamination.",
    "Work small sections; check results under proper lighting.",
    "Prime pads correctly; clean pads frequently for consistent cut.",
    "Decontam thoroughly before correction; coating requires perfect prep.",
    "Customer handoff: demonstrate care guide to reduce comebacks.",
  ];

  // Exam questions (25)
  type Question = { q: string; options: string[]; correct: number };
  const EXAM: Question[] = [
    { q: "Why use a two-bucket wash?", options: ["More soap", "Reduce scratches", "Faster wash", "Dry faster"], correct: 1 },
    { q: "Clay bar purpose?", options: ["Polish", "Remove bonded contaminants", "Sealant", "Wax"], correct: 1 },
    { q: "Best lighting for paint inspection?", options: ["Incandescent", "LED", "Candle", "Sunlight only"], correct: 1 },
    { q: "IPA wipe is used to?", options: ["Add gloss", "Remove polishing oils", "Remove wax", "Cool paint"], correct: 1 },
    { q: "Ceramic coating needs?", options: ["Dirty surface", "Proper prep & leveling", "Thick layer", "No curing"], correct: 1 },
    { q: "Wheel cleaning first helps because?", options: ["Looks fun", "Avoids re-contamination", "Faster", "Saves soap"], correct: 1 },
    { q: "Dress tires after?", options: ["Pre-rinse", "Final dry", "Foam", "Engine bay"], correct: 1 },
    { q: "Steam cleaning seats does?", options: ["Adds chemicals", "Sanitizes & lifts dirt", "Damages leather", "Removes coating"], correct: 1 },
    { q: "Pad priming benefits?", options: ["More dust", "Consistent cut", "More heat", "Less work"], correct: 1 },
    { q: "Cross-hatch passes ensure?", options: ["Randomness", "Even coverage", "Fast work", "Thick polish"], correct: 1 },
    { q: "High spots on coating are?", options: ["Bubbles", "Unleveled coating", "Dust", "Wax dots"], correct: 1 },
    { q: "UV protectant on interior does?", options: ["Sticky", "Protects from sun", "Smells bad", "Coats glass"], correct: 1 },
    { q: "Avoid marring by?", options: ["Dry dusting", "Gentle wash media", "Metal sponge", "Paper towels"], correct: 1 },
    { q: "Engine bay dressing applied?", options: ["On hot surfaces", "After dry", "During rinse", "Before soap"], correct: 1 },
    { q: "Leather care best practice?", options: ["Strong APC", "pH-balanced cleaner", "Only water", "No cleaning"], correct: 1 },
    { q: "Glass coating benefit?", options: ["Tint", "Water repellency", "Scratch proof", "Color change"], correct: 1 },
    { q: "Trim restoration helps?", options: ["Make matte glossy", "Revive faded plastics", "Remove rust", "Lubricate hinges"], correct: 1 },
    { q: "Final LED inspection checks?", options: ["Music", "Defects & finish", "Heat", "Battery"], correct: 1 },
    { q: "Why measure paint thickness?", options: ["Curiosity", "Choose safe correction", "Warranty", "Faster work"], correct: 1 },
    { q: "Cheat sheet purpose?", options: ["Marketing only", "Quick reference of steps", "Billing", "Legal"], correct: 1 },
    { q: "Foam cannon use?", options: ["Decoration", "Lubricates & pre-soaks", "Paint stripper", "Wax"], correct: 1 },
    { q: "Ozone treatment does?", options: ["Clean paint", "Eliminate odors", "Dry carpets", "Tint windows"], correct: 1 },
    { q: "Best way to avoid swirls?", options: ["Dirty towels", "Proper wash technique", "Dry brushing", "No rinse"], correct: 1 },
    { q: "Curing coatings with IR helps?", options: ["Melts paint", "Speed & consistency", "Dust removal", "Color change"], correct: 1 },
    { q: "Customer handoff key?", options: ["No talk", "Explain care guide", "Upsell only", "Skip questions"], correct: 1 },
  ];

  const startExam = () => {
    setExamStarted(true);
  };

  // Removed per-question finalize & sounds for classic exam experience

  const submitExam = () => {
    const correctCount = answers.reduce((acc, a, i) => acc + (a === EXAM[i].correct ? 1 : 0), 0);
    setExamSubmitted(true);
    setExamScore(correctCount);
    const employeeName = user?.name || "Employee";
    const pass = correctCount >= 19; // 75%
    if (pass) {
      const dateStr = new Date().toLocaleDateString();
      localStorage.setItem(CERT_STORAGE_KEY, dateStr);
      setCertified(dateStr);

      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text("Prime Detail Solutions", 105, 25, { align: "center" });
      doc.setFontSize(16);
      doc.text("CERTIFIED DETAILER", 105, 40, { align: "center" });
      doc.setFontSize(12);
      doc.text(`${employeeName} has passed the certification exam.`, 105, 55, { align: "center" });
      doc.text(`Score: ${correctCount}/25`, 105, 63, { align: "center" });
      doc.text(`Date: ${dateStr}`, 105, 71, { align: "center" });
      const pdfDataUrl = doc.output("dataurlstring");
      savePDFToArchive("Employee Training" as any, employeeName, `DIPLOMA-${Date.now()}`, String(pdfDataUrl));
      const pct = Math.round((correctCount / 25) * 100);
      pushAdminAlert("exam_passed", `${employeeName.toUpperCase()} PASSED — ${correctCount}/25 (${pct}%) — CERTIFIED DETAILER`, employeeName, { score: correctCount, percent: pct });
    } else {
      // Do not push alerts for failed attempts; only final completion alerts are desired
    }
  };

  const downloadCheatSheet = () => {
    const employeeName = user?.name || "Employee";
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Prime Detail – 113-Step Cheat Sheet", 105, 20, { align: "center" });
    doc.setFontSize(10);
    // Render in 3 columns per page (25 items per column). When we reach the
    // 4th column, start a new page to avoid overlapping.
    let currentPage = 1;
    const xPositions = [10, 75, 140];
    const rowsPerColumn = 25;
    TRAINING_STEPS.forEach((s, i) => {
      const columnIndex = Math.floor(i / rowsPerColumn); // 0..4
      const pageIndex = Math.floor(columnIndex / 3); // 0 for first page, 1 for second, etc.
      const colOnPage = columnIndex % 3; // 0..2
      const x = xPositions[colOnPage] || xPositions[0];
      const y = 30 + (i % rowsPerColumn) * 6;
      // If we moved to a new page, add it
      if (pageIndex + 1 > currentPage) {
        doc.addPage();
        currentPage = pageIndex + 1;
        // Reprint title on subsequent pages for clarity
        doc.setFontSize(14);
        doc.text("113-Step Cheat Sheet (cont.)", 105, 18, { align: "center" });
        doc.setFontSize(10);
      }
      // Write item number + text; keep maxWidth to avoid accidental wrap overflow
      doc.text(`${i + 1}. ${s}`, x, y, { maxWidth: 60 });
    });
    const pdfDataUrl = doc.output("dataurlstring");
    savePDFToArchive("Employee Training" as any, employeeName, `CHEATSHEET-${Date.now()}`, String(pdfDataUrl));
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Employee Training Course" />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex justify-end mb-4">
          <Button className="bg-red-600 text-white" onClick={() => setOrientationOpen(true)}>Orientation</Button>
        </div>
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Step {currentStep + 1} of 113</h2>
              <p className="text-muted-foreground">{currentTitle}</p>
            </div>
            <div className="text-sm text-muted-foreground">Progress: {currentStep + 1}/113</div>
          </div>
          <Progress value={progress} className="h-3" />

          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded">
            <Checkbox checked={checked[currentStep]} onCheckedChange={() => toggleChecked(currentStep)} />
            <span className={checked[currentStep] ? "line-through text-muted-foreground" : ""}>Mark this step as completed</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes for this step</label>
            <Textarea
              placeholder="Write any notes or reminders..."
              value={notes[currentStep] || ""}
              onChange={(e) => setNotes(prev => ({ ...prev, [currentStep]: e.target.value }))}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handlePrev} variant="outline">Previous</Button>
            <Button onClick={handleNext}>Next Step</Button>
            <Button onClick={handleSaveForLater} variant="outline">Save for Later</Button>
            <Button onClick={downloadCheatSheet} variant="ghost">Download Cheat Sheet PDF</Button>
            <Button onClick={handleFinishTraining} className="bg-gradient-hero" disabled={!allChecked}>
              Finish Training
            </Button>
          </div>
        </Card>

        <Card className="p-6 mt-6">
          <h3 className="text-xl font-bold mb-3">All Steps</h3>
          <div className="space-y-2">
            {TRAINING_STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                <Checkbox checked={checked[i]} onCheckedChange={() => toggleChecked(i)} />
                <span className={checked[i] ? "line-through text-muted-foreground" : ""}>
                  {i + 1}. {s}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Rick's Pro Tips */}
        <Card className="p-6 mt-6">
          <h3 className="text-xl font-bold mb-3">Rick’s Pro Tips</h3>
          <Accordion type="single" collapsible className="w-full">
            {PRO_TIPS.map((tip, i) => (
              <AccordionItem value={`tip-${i}`} key={i}>
                <AccordionTrigger>
                  <span className="w-full text-left">{tip}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={tipsChecked[i]}
                      onCheckedChange={(v) => {
                        const next = [...tipsChecked];
                        next[i] = Boolean(v);
                        setTipsChecked(next);
                      }}
                    />
                    <span className="text-sm">Got it!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Professional guidance to reduce rework and improve finish quality.</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        {/* Exam section after step 113 */}
        {currentStep === total - 1 && (
          <Card className="p-6 mt-6">
            <h3 className="text-xl font-bold mb-3">Final Certification Exam</h3>
            {!examStarted ? (
              <Button className="bg-primary" onClick={startExam}>Start Exam</Button>
            ) : (
              <div className="space-y-4">
                {EXAM.map((q, qi) => (
                  <Card key={qi} className="p-4">
                    <div className="font-medium mb-2">{qi + 1}. {q.q}</div>
                    <div className="grid gap-2">
                      {q.options.map((opt, oi) => (
                        <label key={oi} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`q-${qi}`}
                            checked={answers[qi] === oi}
                            onChange={() => setAnswers(prev => { const n = [...prev]; n[qi] = oi; return n; })}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </Card>
                ))}
                <Button onClick={submitExam}>Submit Exam</Button>
              </div>
            )}

            {examSubmitted && (
              <div className="space-y-2 mt-4">
                <div className="text-lg">Result: {examScore}/25 correct</div>
                {examScore !== null && examScore >= 19 ? (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600">CERTIFIED DETAILER</Badge>
                    <span>Diploma PDF saved to File Manager.</span>
                  </div>
                ) : (
                  <div className="text-destructive">Did not meet 75% threshold. Please review and retry.</div>
                )}
              </div>
            )}
          </Card>
        )}
      </main>
      {/* Orientation Modal (new feature, course untouched) */}
      <OrientationModal open={orientationOpen} onOpenChange={setOrientationOpen} />
    </div>
  );
};

export default EmployeeTrainingCourse;
