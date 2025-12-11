import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { savePDFToArchive } from "@/lib/pdfArchive";
import jsPDF from "jspdf";

const CERT_STORAGE_KEY = "employee_training_certified";

const Certificate = () => {
  const user = getCurrentUser();
  const employeeName = user?.name || "Employee";
  const [certDate, setCertDate] = useState<string | null>(null);

  useEffect(() => {
    const d = localStorage.getItem(CERT_STORAGE_KEY);
    setCertDate(d);
  }, []);

  const printableTitle = useMemo(() => "CERTIFIED DETAILER", []);

  const handlePrint = () => {
    try { window.print(); } catch {}
  };

  const handleDownloadPdf = () => {
    const dateStr = certDate || new Date().toLocaleDateString();
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("Prime Detail Solutions", 105, 25, { align: "center" });
    doc.setFontSize(16);
    doc.text(printableTitle, 105, 40, { align: "center" });
    doc.setFontSize(12);
    doc.text(`${employeeName} has passed the certification exam.`, 105, 55, { align: "center" });
    doc.text(`Date: ${dateStr}`, 105, 71, { align: "center" });
    const pdfDataUrl = doc.output("dataurlstring");
    savePDFToArchive("Employee Training" as any, employeeName, `CERT-${Date.now()}`, String(pdfDataUrl));
    alert("Certificate PDF saved to File Manager.");
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Certificate" />
      <main className="p-6">
        <Card className="p-8 max-w-2xl mx-auto text-center bg-white">
          {certDate ? (
            <div className="space-y-4">
              <div className="text-2xl font-bold">Prime Detail Solutions</div>
              <div className="text-xl">Certification of Completion</div>
              <div className="mt-4 text-3xl font-extrabold">{printableTitle}</div>
              <div className="mt-2 text-lg">Awarded to</div>
              <div className="text-2xl font-semibold">{employeeName}</div>
              <div className="mt-2 text-muted-foreground">Date: {certDate}</div>
              <div className="mt-4">
                <Badge className="bg-green-600">Verified</Badge>
              </div>
              <div className="mt-6 flex items-center justify-center gap-3 print:hidden">
                <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handlePrint}>Print</Button>
                <Button variant="outline" onClick={handleDownloadPdf}>Save to File Manager</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xl font-semibold">No certification record found</div>
              <p className="text-muted-foreground">Pass the exam to unlock your certificate.</p>
              <div>
                <Button asChild className="bg-purple-700 text-white hover:bg-purple-800">
                  <a href="/employee-training">Go to Training</a>
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Certificate;

