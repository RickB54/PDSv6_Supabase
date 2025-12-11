import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";

type HandbookItem = { title: string; desc: string };
type HandbookSection = { id: string; name: string; items: HandbookItem[] };
type ExamQ = { q: string; options: string[]; correct: number };
const EXAM_CUSTOM_KEY = "training_exam_custom";

// Lightweight reconstruction of handbook sections for cheat sheet generation
const handbookSections: HandbookSection[] = (() => {
  const S: HandbookSection[] = [];
  const add = (id: string, name: string, items: [string, string][]) => {
    S.push({ id, name, items: items.map(([t, d]) => ({ title: t, desc: d })) });
  };
  add("safety", "Safety Protocols", [
    ["PPE", "Gloves, eye protection, respirator as needed."],
    ["Ventilation", "Work in well-ventilated areas; mitigate fumes."],
  ]);
  add("wash", "Exterior Cleaning", [
    ["Two-Bucket Wash", "Separate wash and rinse to reduce scratches."],
    ["Pre-Rinse", "Rinse to remove loose dirt before contact."],
  ]);
  add("decon", "Decontamination", [
    ["Chemical Decon", "Iron remover and tar remover when necessary."],
    ["Mechanical Decon", "Clay bar to remove bonded contaminants."],
  ]);
  add("polish", "Polishing", [["Inspection", "LED/halogen lighting for defects."], ["Test Spot", "Dial in combo before full pass."]]);
  add("coat", "Protection & Coatings", [["IPA Wipe", "Remove polishing oils pre-coat."], ["Level High Spots", "Even out coating during cure."]]);
  add("interior", "Interior Care", [["Vacuuming", "Thorough debris removal before wet work."], ["Steam Clean", "Sanitize and lift embedded dirt."]]);
  add("finishing", "Finishing Touches", [["Tire Dressing", "Apply on dry tires for longevity."], ["Trim Care", "Revive and protect plastics."]]);
  add("professional-practice", "Professional Practice", [["Consistent Technique", "Careful product use and thorough inspections."]]);
  return S;
})();

export function CheatSheetPanel({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'exam' | 'handbook'>('exam');
  const [exam, setExam] = useState<ExamQ[]>([]);
  const rows = useMemo(() => handbookSections.flatMap((s) => s.items.map((it) => ({ section: s.name, ...it }))), []);

  useEffect(() => {
    // Load current exam from localStorage so the cheat sheet always matches it
    try {
      const raw = localStorage.getItem(EXAM_CUSTOM_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setExam(parsed.slice(0, 50));
      }
    } catch {}
  }, []);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    if (mode === 'exam') {
      doc.text("Exam Cheat Sheet — Auto Detailing", 105, 20, { align: "center" });
      doc.setFontSize(11);
      let y = 32;
      const letter = (i: number) => String.fromCharCode(65 + i);
      exam.forEach((q, qi) => {
        doc.setFont(undefined, 'bold');
        doc.text(`${qi + 1}. ${q.q}`.slice(0, 180), 20, y);
        doc.setFont(undefined, 'normal');
        y += 6;
        q.options.forEach((opt, oi) => {
          const mark = q.correct === oi ? '  ✓' : '';
          doc.text(`${letter(oi)}) ${opt}${mark}`.slice(0, 160), 24, y);
          y += 6;
          if (y > 270) { doc.addPage(); y = 20; }
        });
        y += 4;
        if (y > 270) { doc.addPage(); y = 20; }
      });
      const pdfData = doc.output("dataurlstring");
      const fileName = `Exam_Cheat_Sheet_${new Date().toLocaleString().replace(/[\/:]/g, '-')}.pdf`;
      savePDFToArchive('Employee Training' as any, 'admin', `exam_cheat_${Date.now()}`, pdfData, { fileName, path: 'Employee Training/' });
    } else {
      doc.text("Admin Cheat Sheet — Auto Detailing Handbook", 105, 20, { align: "center" });
      doc.setFontSize(12);
      let y = 32;
      handbookSections.forEach((sec) => {
        doc.setFont(undefined, "bold");
        doc.text(sec.name, 20, y);
        doc.setFont(undefined, "normal");
        y += 6;
        sec.items.forEach((it) => {
          doc.text(`• ${it.title} — ${it.desc}`, 24, y);
          y += 6;
          if (y > 270) { doc.addPage(); y = 20; }
        });
        y += 2;
        if (y > 270) { doc.addPage(); y = 20; }
      });
      const pdfData = doc.output("dataurlstring");
      const fileName = `Admin_Cheat_Sheet_${new Date().toLocaleString().replace(/[\/:]/g, '-')}.pdf`;
      savePDFToArchive('Employee Training' as any, 'admin', `cheat_${Date.now()}`, pdfData, { fileName, path: 'Employee Training/' });
    }
  };

  return (
    <Card className="p-4 bg-[#18181b] border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-semibold text-white">Training Cheat Sheet</h1>
        <div className="flex items-center gap-2">
          {!embedded && (<Badge className="bg-purple-700 text-white">Always on Port 6061</Badge>)}
          <Button variant="outline" onClick={() => { try { window.print(); } catch {} }}>Print</Button>
          <Button variant="outline" onClick={downloadPDF}>Save to File Manager</Button>
        </div>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <Button variant={mode === 'exam' ? 'default' : 'outline'} onClick={() => setMode('exam')}>Exam Q&A</Button>
        <Button variant={mode === 'handbook' ? 'default' : 'outline'} onClick={() => setMode('handbook')}>Handbook Summary</Button>
        <Button variant="outline" onClick={() => { try { const raw = localStorage.getItem(EXAM_CUSTOM_KEY); if (raw) setExam(JSON.parse(raw).slice(0,50)); } catch {} }}>Refresh</Button>
      </div>
      {mode === 'exam' ? (
        <div className="space-y-3">
          {exam.map((q, qi) => (
            <div key={qi} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
              <div className="font-semibold text-white">{qi + 1}. {q.q}</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className={`text-sm ${q.correct === oi ? 'text-green-400' : 'text-zinc-300'}`}>
                    {String.fromCharCode(65 + oi)}) {opt} {q.correct === oi ? '✓' : ''}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((r, i) => (
            <div key={i} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
              <div className="text-xs text-zinc-400">{r.section}</div>
              <div className="font-semibold text-white">{r.title}</div>
              <div className="text-sm text-zinc-300">{r.desc}</div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center gap-2">
        <Button className="bg-purple-700 text-white hover:bg-purple-800" onClick={() => navigate('/exam')}>Open Entire Exam</Button>
        <Button className="bg-blue-700 text-white hover:bg-blue-800" onClick={() => navigate('/exam-admin')}>Manage Exam Questions</Button>
      </div>
    </Card>
  );
}

export default function CheatSheet() {
  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <CheatSheetPanel />
    </div>
  );
}
