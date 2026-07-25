import { useState, useEffect } from "react";
import { Shield, Printer, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export function EmploymentComplianceGuide() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("compliance_guide_state");
      if (saved) setCheckedItems(JSON.parse(saved));
    } catch {}
  }, []);

  const handleCheck = (id: string, checked: boolean) => {
    const next = { ...checkedItems, [id]: checked };
    setCheckedItems(next);
    try {
      localStorage.setItem("compliance_guide_state", JSON.stringify(next));
    } catch {}
  };

  const printGuide = () => {
    // Radix locks body overflow. We force it visible via print CSS below, 
    // but occasionally window.print needs it immediately.
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "visible";
    setTimeout(() => {
      window.print();
      document.body.style.overflow = originalOverflow;
    }, 100);
  };

  const saveToPDF = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    toast({ title: "Generating PDF Brochure...", description: "Please wait, rendering high quality pages." });

    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      const page1 = document.getElementById("pdf-page-1");
      const page2 = document.getElementById("pdf-page-2");

      if (page1 && page2) {
        // Temporarily make visible for render, html2canvas needs it in viewport/rendered
        const container = document.getElementById("pdf-brochure-container");
        if (container) {
           container.style.left = "0";
           container.style.zIndex = "-1000";
        }

        const canvas1 = await html2canvas(page1, { scale: 2, useCORS: true, backgroundColor: '#09090b' });
        const img1 = canvas1.toDataURL("image/jpeg", 0.95);
        doc.addImage(img1, "JPEG", 0, 0, 595.28, 841.89);

        doc.addPage();
        const canvas2 = await html2canvas(page2, { scale: 2, useCORS: true, backgroundColor: '#09090b' });
        const img2 = canvas2.toDataURL("image/jpeg", 0.95);
        doc.addImage(img2, "JPEG", 0, 0, 595.28, 841.89);

        if (container) {
           container.style.left = "-10000px";
        }

        doc.save("Prime_Auto_Detail_Compliance_Guide.pdf");
        toast({ title: "Success", description: "PDF downloaded successfully!" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog>
      <style>{`
        @media print {
          html, body {
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
          }
          #root {
            display: none !important;
          }
          div[data-radix-portal] {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
          }
          div[role="dialog"] {
            position: absolute !important;
            transform: none !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-amber-500/20 hover:bg-amber-500/10 text-amber-500">
          <Shield className="w-4 h-4 mr-2" /> Compliance Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-zinc-300 print:bg-white print:text-black">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-2xl font-bold text-white print:text-black">Employment Compliance Guide</DialogTitle>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={printGuide} disabled={isGenerating}>
              <Printer className="w-4 h-4 mr-2" /> Print Guide
            </Button>
            <Button variant="default" size="sm" onClick={saveToPDF} disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]">
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              {isGenerating ? "Generating..." : "Save to PDF"}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-8 py-4 print:py-0">
          <p className="text-sm font-semibold text-zinc-400 print:text-black">Prime Auto Detail — For Employer Reference Only</p>

          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg text-amber-500 print:border-black print:text-black">
            <strong>⚠️ Important Disclaimer:</strong> This guide is a general reference only and does not constitute legal advice. Employment law varies by situation and changes over time. Always confirm requirements with a qualified employment attorney or accountant before processing your first payroll. Both Massachusetts and New Hampshire impose penalties for non-compliance.
          </div>

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-indigo-400 border-b border-zinc-800 pb-2 print:border-black print:text-black">BEFORE THE FIRST DAY OF WORK — Required for ALL employees (W-2 and 1099)</h3>
            
            <div className="flex gap-3">
              <Checkbox id="c1" checked={!!checkedItems.c1} onCheckedChange={(c) => handleCheck('c1', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c1" className="font-bold text-white block mb-1 print:text-black">Confirm pay rate and classification in writing</label>
                <p className="text-sm leading-relaxed">Put the pay rate, pay structure (W-2 or 1099), and start date in writing before the employee works their first hour. This protects both parties and is required under MA and NH wage law.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Before first day of work</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c2" checked={!!checkedItems.c2} onCheckedChange={(c) => handleCheck('c2', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c2" className="font-bold text-white block mb-1 print:text-black">Verify identity and work authorization — Form I-9</label>
                <p className="text-sm leading-relaxed">Federal law requires you to complete Section 1 with the employee on or before their first day of work, and complete Section 2 yourself within 3 business days of their first day. You must physically examine the employee's original identity and work authorization documents. Keep the completed I-9 on file for 3 years from hire date or 1 year after termination, whichever is later. Do not send this form to the government — keep it in your records.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Section 1 on or before Day 1 / Section 2 within 3 business days of Day 1</p>
                <a href="https://www.uscis.gov/i-9" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.uscis.gov/i-9</a>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c3" checked={!!checkedItems.c3} onCheckedChange={(c) => handleCheck('c3', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c3" className="font-bold text-white block mb-1 print:text-black">Provide written notice of pay rate (MA W-2 employees only)</label>
                <p className="text-sm leading-relaxed">Massachusetts requires employers to notify employees in writing of their hourly rate or salary, pay schedule, and any deductions before their first day of work. This is required under the Massachusetts Wage Act.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Before first day of work</p>
                <a href="https://www.mass.gov/info-details/massachusetts-wage-act" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.mass.gov/info-details/massachusetts-wage-act</a>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-blue-400 border-b border-zinc-800 pb-2 print:border-black print:text-black">W-2 EMPLOYEES ONLY — Additional federal requirements</h3>
            
            <div className="flex gap-3">
              <Checkbox id="c4" checked={!!checkedItems.c4} onCheckedChange={(c) => handleCheck('c4', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c4" className="font-bold text-white block mb-1 print:text-black">Obtain completed Form W-4 (Federal Withholding)</label>
                <p className="text-sm leading-relaxed">The employee fills this out so you know how much federal income tax to withhold from their paycheck. Keep on file — do not send to the IRS unless requested.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Before or on first paycheck</p>
                <a href="https://www.irs.gov/forms-pubs/about-form-w-4" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.irs.gov/forms-pubs/about-form-w-4</a>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c5" checked={!!checkedItems.c5} onCheckedChange={(c) => handleCheck('c5', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c5" className="font-bold text-white block mb-1 print:text-black">Register as an employer with the IRS (if not already done)</label>
                <p className="text-sm leading-relaxed">You need an Employer Identification Number (EIN) to process payroll. If you don't already have one, apply at IRS.gov — it's free and issued immediately online.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Before first payroll</p>
                <a href="https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online</a>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c6" checked={!!checkedItems.c6} onCheckedChange={(c) => handleCheck('c6', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c6" className="font-bold text-white block mb-1 print:text-black">Set up payroll tax withholding</label>
                <p className="text-sm leading-relaxed">For every W-2 employee paycheck you must withhold: Federal income tax (based on W-4), Social Security (6.2% employee + 6.2% employer), Medicare (1.45% employee + 1.45% employer). You must also pay Federal Unemployment Tax (FUTA) and deposit withheld taxes with the IRS on a regular schedule (monthly or semi-weekly depending on payroll size). Strongly recommended: use a payroll service (e.g. Gusto, QuickBooks Payroll, ADP) to handle this automatically.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Each payroll cycle</p>
                <a href="https://www.irs.gov/businesses/small-businesses-self-employed/employment-taxes" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.irs.gov/businesses/small-businesses-self-employed/employment-taxes</a>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-emerald-400 border-b border-zinc-800 pb-2 print:border-black print:text-black">W-2 EMPLOYEES — Massachusetts specific requirements</h3>

            <div className="flex gap-3">
              <Checkbox id="c7" checked={!!checkedItems.c7} onCheckedChange={(c) => handleCheck('c7', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c7" className="font-bold text-white block mb-1 print:text-black">Obtain completed Form M-4 (MA State Withholding)</label>
                <p className="text-sm leading-relaxed">Massachusetts employees fill this out so you know how much MA state income tax to withhold. Keep on file.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Before or on first paycheck</p>
                <a href="https://www.mass.gov/how-to/complete-the-massachusetts-withholding-exemption-certificate-m-4" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.mass.gov/how-to/complete-the-massachusetts-withholding-exemption-certificate-m-4</a>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c8" checked={!!checkedItems.c8} onCheckedChange={(c) => handleCheck('c8', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c8" className="font-bold text-white block mb-1 print:text-black">Register with Massachusetts Department of Revenue</label>
                <p className="text-sm leading-relaxed">You must register as an employer with MA DOR to remit state income tax withholding.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Before first MA payroll</p>
                <a href="https://www.mass.gov/how-to/register-your-business-with-the-massachusetts-department-of-revenue" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.mass.gov/how-to/register-your-business-with-the-massachusetts-department-of-revenue</a>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c9" checked={!!checkedItems.c9} onCheckedChange={(c) => handleCheck('c9', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c9" className="font-bold text-white block mb-1 print:text-black">MA New Hire Reporting</label>
                <p className="text-sm leading-relaxed">Report every new W-2 hire to the Massachusetts Department of Revenue within 14 days of their first day of work. Submit online at https://www.mass.gov/new-hire-reporting. You will need the employee's name, address, Social Security Number, and their first day of work.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Within 14 days of first day of work — penalties apply for late filing</p>
                <a href="https://www.mass.gov/new-hire-reporting" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.mass.gov/new-hire-reporting</a>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c10" checked={!!checkedItems.c10} onCheckedChange={(c) => handleCheck('c10', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c10" className="font-bold text-white block mb-1 print:text-black">MA Workers Compensation Insurance</label>
                <p className="text-sm leading-relaxed">Massachusetts requires all employers with one or more employees to carry workers compensation insurance. You cannot legally have a W-2 employee in MA without it.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Before first day of work</p>
                <a href="https://www.mass.gov/workers-compensation-insurance-requirements-for-employers" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.mass.gov/workers-compensation-insurance-requirements-for-employers</a>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c11" checked={!!checkedItems.c11} onCheckedChange={(c) => handleCheck('c11', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c11" className="font-bold text-white block mb-1 print:text-black">MA Paid Family and Medical Leave (PFML)</label>
                <p className="text-sm leading-relaxed">Massachusetts employers must withhold PFML contributions from employee wages and remit them quarterly. The contribution rate changes annually — check the current rate at mass.gov.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Each payroll cycle / quarterly remittance</p>
                <a href="https://www.mass.gov/paid-family-and-medical-leave" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.mass.gov/paid-family-and-medical-leave</a>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c12" checked={!!checkedItems.c12} onCheckedChange={(c) => handleCheck('c12', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c12" className="font-bold text-white block mb-1 print:text-black">MA Earned Sick Time</label>
                <p className="text-sm leading-relaxed">Massachusetts employees earn 1 hour of sick time for every 30 hours worked, up to 40 hours per year. For employers with fewer than 11 employees, this sick time may be unpaid. You must provide written notice of this policy to employees.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Notice must be provided at time of hire</p>
                <a href="https://www.mass.gov/earned-sick-time" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.mass.gov/earned-sick-time</a>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c13" checked={!!checkedItems.c13} onCheckedChange={(c) => handleCheck('c13', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c13" className="font-bold text-white block mb-1 print:text-black">Issue W-2 at year end</label>
                <p className="text-sm leading-relaxed">You must provide each W-2 employee with their W-2 form by January 31 of the following year showing their total wages and taxes withheld for the year.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> January 31 each year</p>
                <a href="https://www.irs.gov/forms-pubs/about-form-w-2" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.irs.gov/forms-pubs/about-form-w-2</a>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-cyan-400 border-b border-zinc-800 pb-2 print:border-black print:text-black">W-2 EMPLOYEES — New Hampshire specific requirements</h3>

            <div className="flex gap-3">
              <Checkbox id="c14" checked={!!checkedItems.c14} onCheckedChange={(c) => handleCheck('c14', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c14" className="font-bold text-white block mb-1 print:text-black">NH New Hire Reporting</label>
                <p className="text-sm leading-relaxed">Report every new W-2 hire to the New Hampshire Department of Employment Security within 20 days of their first day of work. Submit online at https://www.nhes.nh.gov. You will need the employee's name, address, Social Security Number, and their start date.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Within 20 days of first day of work</p>
                <a href="https://www.nhes.nh.gov/forms/documents/newhire-employer.pdf" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.nhes.nh.gov/forms/documents/newhire-employer.pdf</a>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c15" checked={!!checkedItems.c15} onCheckedChange={(c) => handleCheck('c15', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c15" className="font-bold text-white block mb-1 print:text-black">NH has no state income tax on wages</label>
                <p className="text-sm leading-relaxed">New Hampshire does not impose a state income tax on earned wages — you do not need to withhold or remit NH state income tax. No NH state withholding form is required.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Note:</strong> Federal withholding (W-4) is still required</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c16" checked={!!checkedItems.c16} onCheckedChange={(c) => handleCheck('c16', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c16" className="font-bold text-white block mb-1 print:text-black">NH Workers Compensation Insurance</label>
                <p className="text-sm leading-relaxed">New Hampshire requires employers with one or more employees to carry workers compensation insurance. Same requirement as Massachusetts — you cannot legally have a W-2 employee in NH without it.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Before first day of work</p>
                <a href="https://www.nh.gov/insurance/consumers/workers-comp.htm" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.nh.gov/insurance/consumers/workers-comp.htm</a>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c17" checked={!!checkedItems.c17} onCheckedChange={(c) => handleCheck('c17', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c17" className="font-bold text-white block mb-1 print:text-black">NH Unemployment Insurance</label>
                <p className="text-sm leading-relaxed">Register with the NH Department of Employment Security and pay NH Unemployment Insurance (NHUI) taxes on employee wages. The tax rate varies based on your experience rating as an employer.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Register before first payroll</p>
                <a href="https://www.nhes.nh.gov/services/employers/index.htm" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.nhes.nh.gov/services/employers/index.htm</a>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-amber-500 border-b border-zinc-800 pb-2 print:border-black print:text-black">EMPLOYEES WORKING IN BOTH NH AND MA</h3>

            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg print:border-black">
              <p className="font-bold text-amber-500 mb-2 print:text-black">⚠️ Cross-border employment requires special attention.</p>
              <p className="text-sm leading-relaxed mb-3">If an employee lives in NH but performs work in Massachusetts, MA income tax withholding likely applies to wages earned while working in Massachusetts — even though the employee is an NH resident. This is a complex area. Key points:</p>
              <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1 mb-3">
                <li>You may need to register as an employer in both states</li>
                <li>You may need to withhold MA state income tax on MA-earned wages even for NH residents</li>
                <li>NH new hire reporting AND MA new hire reporting may both be required</li>
                <li>Workers compensation coverage may need to cover both states</li>
              </ul>
              <p className="text-sm font-semibold text-white print:text-black">Strongly recommended: Consult an accountant or employment attorney familiar with both MA and NH before processing your first payroll for a cross-border employee.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-orange-400 border-b border-zinc-800 pb-2 print:border-black print:text-black">1099 CONTRACTORS ONLY</h3>

            <div className="flex gap-3">
              <Checkbox id="c18" checked={!!checkedItems.c18} onCheckedChange={(c) => handleCheck('c18', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c18" className="font-bold text-white block mb-1 print:text-black">Obtain completed Form W-9 before first payment</label>
                <p className="text-sm leading-relaxed">The contractor fills out a W-9 providing their legal name, business name if applicable, and Tax Identification Number (TIN or SSN). Keep on file — do not send to the IRS. You need this before you make any payment to them.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> Before first payment</p>
                <a href="https://www.irs.gov/forms-pubs/about-form-w-9" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.irs.gov/forms-pubs/about-form-w-9</a>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c19" checked={!!checkedItems.c19} onCheckedChange={(c) => handleCheck('c19', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c19" className="font-bold text-white block mb-1 print:text-black">Track total payments throughout the year</label>
                <p className="text-sm leading-relaxed">Keep a running total of all payments made to each contractor during the calendar year. When total payments reach $600 you are required to issue a 1099-NEC.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> No specific deadline during the year — track ongoing</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c20" checked={!!checkedItems.c20} onCheckedChange={(c) => handleCheck('c20', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c20" className="font-bold text-white block mb-1 print:text-black">Issue Form 1099-NEC at year end (if payments reach $600)</label>
                <p className="text-sm leading-relaxed">If you paid a contractor $600 or more during the calendar year, you must issue them a 1099-NEC by January 31 of the following year AND file a copy with the IRS by the same date.</p>
                <p className="text-sm text-zinc-500 mt-1 print:text-gray-600"><strong>Deadline:</strong> January 31 each year</p>
                <a href="https://www.irs.gov/forms-pubs/about-form-1099-nec" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.irs.gov/forms-pubs/about-form-1099-nec</a>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c21" checked={!!checkedItems.c21} onCheckedChange={(c) => handleCheck('c21', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c21" className="font-bold text-white block mb-1 print:text-black">No state withholding required in NH or MA for contractors</label>
                <p className="text-sm leading-relaxed">Neither New Hampshire nor Massachusetts requires you to withhold state income tax from contractor payments. The contractor is responsible for their own tax payments including self-employment tax (15.3% covering both employer and employee Social Security and Medicare).</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c22" checked={!!checkedItems.c22} onCheckedChange={(c) => handleCheck('c22', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c22" className="font-bold text-white block mb-1 print:text-black">Verify contractor status carefully</label>
                <p className="text-sm leading-relaxed">The IRS uses a multi-factor test to determine whether someone is truly a contractor or should be classified as an employee. Key factors: do you control how the work is done (not just the result)? Do you provide tools and equipment? Do they work exclusively for you? If yes to any of these, they may legally be a W-2 employee regardless of what your agreement says. Misclassification penalties can include back payroll taxes, interest, and fines for all prior years.</p>
                <a href="https://www.irs.gov/businesses/small-businesses-self-employed/independent-contractor-self-employed-or-employee" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline mt-1 block print:hidden">Official source: https://www.irs.gov/businesses/small-businesses-self-employed/independent-contractor-self-employed-or-employee</a>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-purple-400 border-b border-zinc-800 pb-2 print:border-black print:text-black">ONGOING REQUIREMENTS — All employee types</h3>

            <div className="flex gap-3">
              <Checkbox id="c23" checked={!!checkedItems.c23} onCheckedChange={(c) => handleCheck('c23', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c23" className="font-bold text-white block mb-1 print:text-black">Keep records for required retention periods</label>
                <ul className="text-sm list-disc pl-5 space-y-1.5 mt-1 leading-relaxed">
                  <li><strong>I-9 forms:</strong> 3 years from hire date OR 1 year after termination, whichever is later</li>
                  <li><strong>Payroll records:</strong> Minimum 3 years (MA requires 4 years)</li>
                  <li><strong>W-4 and M-4 forms:</strong> 4 years after the tax is due or paid</li>
                  <li><strong>1099 and W-9 forms:</strong> Minimum 4 years</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c24" checked={!!checkedItems.c24} onCheckedChange={(c) => handleCheck('c24', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c24" className="font-bold text-white block mb-1 print:text-black">Display required workplace posters</label>
                <p className="text-sm leading-relaxed">Federal and state law requires employers to display certain posters in the workplace. These are free from the relevant agencies.</p>
                <div className="mt-2 space-y-1">
                  <a href="https://www.dol.gov/general/topics/posters" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline block print:hidden">Federal posters: https://www.dol.gov/general/topics/posters</a>
                  <a href="https://www.mass.gov/required-workplace-postings" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline block print:hidden">Massachusetts posters: https://www.mass.gov/required-workplace-postings</a>
                  <a href="https://www.nh.gov/labor/employer-information/posters.htm" target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline block print:hidden">New Hampshire posters: https://www.nh.gov/labor/employer-information/posters.htm</a>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Checkbox id="c25" checked={!!checkedItems.c25} onCheckedChange={(c) => handleCheck('c25', !!c)} className="mt-1 print:hidden" />
              <div>
                <label htmlFor="c25" className="font-bold text-white block mb-1 print:text-black">Annual tax filings</label>
                <ul className="text-sm list-disc pl-5 space-y-1.5 mt-1 leading-relaxed">
                  <li><strong>W-2 employees:</strong> File W-2s with Social Security Administration and provide copies to employees by January 31</li>
                  <li><strong>1099 contractors:</strong> File 1099-NECs with IRS and provide copies to contractors by January 31</li>
                  <li><strong>Quarterly:</strong> File IRS Form 941 (Employer's Quarterly Federal Tax Return) for W-2 employees</li>
                  <li><strong>Annually:</strong> File IRS Form 940 (FUTA) for W-2 employees</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-rose-400 border-b border-zinc-800 pb-2 print:border-black print:text-black">RECOMMENDED NEXT STEPS FOR PRIME AUTO DETAIL</h3>

            <div className="flex gap-3">
              <Checkbox id="c26" checked={!!checkedItems.c26} onCheckedChange={(c) => handleCheck('c26', !!c)} className="mt-1 print:hidden" />
              <div><label htmlFor="c26" className="text-sm font-medium leading-relaxed">Confirm Brandon's and Paul's correct classification (W-2 vs 1099) with an accountant before processing any payroll</label></div>
            </div>
            <div className="flex gap-3">
              <Checkbox id="c27" checked={!!checkedItems.c27} onCheckedChange={(c) => handleCheck('c27', !!c)} className="mt-1 print:hidden" />
              <div><label htmlFor="c27" className="text-sm font-medium leading-relaxed">Obtain an EIN from IRS.gov if you don't already have one</label></div>
            </div>
            <div className="flex gap-3">
              <Checkbox id="c28" checked={!!checkedItems.c28} onCheckedChange={(c) => handleCheck('c28', !!c)} className="mt-1 print:hidden" />
              <div><label htmlFor="c28" className="text-sm font-medium leading-relaxed">Set up workers compensation insurance in both MA and NH before either employee works their first job</label></div>
            </div>
            <div className="flex gap-3">
              <Checkbox id="c29" checked={!!checkedItems.c29} onCheckedChange={(c) => handleCheck('c29', !!c)} className="mt-1 print:hidden" />
              <div><label htmlFor="c29" className="text-sm font-medium leading-relaxed">Consider using a payroll service (Gusto is popular for small businesses — handles withholding, deposits, new hire reporting, and year-end forms automatically)</label></div>
            </div>
            <div className="flex gap-3">
              <Checkbox id="c30" checked={!!checkedItems.c30} onCheckedChange={(c) => handleCheck('c30', !!c)} className="mt-1 print:hidden" />
              <div><label htmlFor="c30" className="text-sm font-medium leading-relaxed">Complete new hire reporting for both employees in both applicable states</label></div>
            </div>
            <div className="flex gap-3">
              <Checkbox id="c31" checked={!!checkedItems.c31} onCheckedChange={(c) => handleCheck('c31', !!c)} className="mt-1 print:hidden" />
              <div><label htmlFor="c31" className="text-sm font-medium leading-relaxed">Collect I-9, W-4/W-9, and MA M-4 (if W-2) from each employee</label></div>
            </div>
          </section>

        </div>
      </DialogContent>

      {/* Hidden PDF Brochure Template */}
      <div id="pdf-brochure-container" className="fixed -left-[10000px] top-0 bg-zinc-950 text-white w-[794px] pointer-events-none opacity-100 flex flex-col gap-4 print:hidden">
        {/* Page 1 */}
        <div id="pdf-page-1" className="w-[794px] h-[1123px] bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-800 p-10 relative overflow-hidden flex flex-col font-sans">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          
          <h1 className="text-4xl font-black text-white tracking-tight mb-2 uppercase">Employment Compliance Guide</h1>
          <p className="text-indigo-400 font-bold mb-6 text-lg tracking-widest uppercase">Prime Auto Detail</p>
          
          <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-xl text-amber-400 mb-8">
            <p className="text-sm font-semibold leading-relaxed">
              <strong className="text-amber-500 uppercase">⚠️ Important Disclaimer:</strong> This guide is a general reference only and does not constitute legal advice. Employment law varies by situation and changes over time. Always confirm requirements with a qualified employment attorney or accountant before processing your first payroll. Both Massachusetts and New Hampshire impose penalties for non-compliance.
            </p>
          </div>

          <div className="space-y-6 flex-1">
            <section>
              <h3 className="text-xl font-bold text-indigo-400 border-b-2 border-indigo-500/20 pb-2 mb-4 uppercase tracking-wide">BEFORE THE FIRST DAY OF WORK (W-2 & 1099)</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-white text-base">Confirm pay rate and classification in writing</h4>
                  <p className="text-zinc-400 text-sm mt-1">Put the pay rate, pay structure (W-2 or 1099), and start date in writing before the employee works their first hour.</p>
                  <p className="text-indigo-300 text-xs mt-1 font-semibold">Deadline: Before first day of work</p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Verify identity and work authorization — Form I-9</h4>
                  <p className="text-zinc-400 text-sm mt-1">Complete Section 1 with the employee on/before Day 1. Complete Section 2 within 3 business days. Keep on file for 3 years from hire or 1 year after termination.</p>
                  <p className="text-indigo-300 text-xs mt-1 font-semibold">Deadline: Section 1 on/before Day 1 | Section 2 within 3 days</p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Provide written notice of pay rate (MA W-2 only)</h4>
                  <p className="text-zinc-400 text-sm mt-1">MA requires employers to notify employees in writing of their hourly rate/salary, schedule, and deductions before Day 1.</p>
                  <p className="text-indigo-300 text-xs mt-1 font-semibold">Deadline: Before first day of work</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-blue-400 border-b-2 border-blue-500/20 pb-2 mb-4 uppercase tracking-wide">W-2 EMPLOYEES ONLY — FEDERAL</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-white text-base">Obtain Form W-4 & Register EIN</h4>
                  <p className="text-zinc-400 text-sm mt-1">Employee fills out W-4 for federal withholding. Employer needs an EIN from IRS.gov to process payroll.</p>
                  <p className="text-blue-300 text-xs mt-1 font-semibold">Deadline: Before first payroll</p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Set up payroll tax withholding</h4>
                  <p className="text-zinc-400 text-sm mt-1">Withhold Federal income tax, Social Security (6.2%), Medicare (1.45%). Employer pays matching FICA and FUTA. Gusto or ADP highly recommended.</p>
                  <p className="text-blue-300 text-xs mt-1 font-semibold">Deadline: Each payroll cycle</p>
                </div>
              </div>
            </section>
            
            <section>
              <h3 className="text-xl font-bold text-emerald-400 border-b-2 border-emerald-500/20 pb-2 mb-4 uppercase tracking-wide">W-2 EMPLOYEES — MASSACHUSETTS</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <h4 className="font-bold text-white text-sm">Obtain Form M-4 & Register DOR</h4>
                  <p className="text-zinc-400 text-xs mt-1">Keep M-4 on file. Register with MA DOR to remit state income tax.</p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">MA New Hire Reporting</h4>
                  <p className="text-zinc-400 text-xs mt-1">Report every W-2 hire to MA DOR within 14 days of Day 1.</p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Workers Comp & PFML</h4>
                  <p className="text-zinc-400 text-xs mt-1">Workers Comp is legally required before Day 1. Withhold PFML quarterly.</p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Earned Sick Time</h4>
                  <p className="text-zinc-400 text-xs mt-1">1 hour per 30 worked (up to 40/yr). Can be unpaid if under 11 employees.</p>
                </div>
              </div>
            </section>
          </div>
          
          <div className="text-center text-zinc-600 text-xs mt-4">Page 1 of 2 — Prime Auto Detail Administrative Document</div>
        </div>

        {/* Page 2 */}
        <div id="pdf-page-2" className="w-[794px] h-[1123px] bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-800 p-10 relative overflow-hidden flex flex-col font-sans">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          
          <div className="space-y-6 flex-1 pt-4">
            <section>
              <h3 className="text-xl font-bold text-cyan-400 border-b-2 border-cyan-500/20 pb-2 mb-4 uppercase tracking-wide">W-2 EMPLOYEES — NEW HAMPSHIRE</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <h4 className="font-bold text-white text-sm">NH New Hire Reporting</h4>
                  <p className="text-zinc-400 text-xs mt-1">Report to NHES within 20 days of first day of work.</p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">No State Income Tax</h4>
                  <p className="text-zinc-400 text-xs mt-1">NH has no state income tax. No NH withholding form required.</p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Workers Compensation</h4>
                  <p className="text-zinc-400 text-xs mt-1">Legally required in NH before employee works Day 1.</p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">NH Unemployment (NHUI)</h4>
                  <p className="text-zinc-400 text-xs mt-1">Register with NHES and pay NHUI taxes on wages.</p>
                </div>
              </div>
            </section>

            <section>
              <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-amber-500 mb-2 uppercase tracking-wide">⚠️ CROSS-BORDER EMPLOYMENT (NH & MA)</h3>
                <p className="text-zinc-300 text-sm">If an NH resident works in MA, MA income tax withholding likely applies to wages earned in MA. You may need to register as an employer in both states, report new hires to both, and ensure Workers Comp covers both. <strong>Consult an accountant.</strong></p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-orange-400 border-b-2 border-orange-500/20 pb-2 mb-4 uppercase tracking-wide">1099 CONTRACTORS ONLY</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-white text-sm">Form W-9 & Year-End 1099-NEC</h4>
                  <p className="text-zinc-400 text-xs mt-1">Collect W-9 before first payment. Track payments. If total reaches $600/yr, issue 1099-NEC by Jan 31.</p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">No State Withholding</h4>
                  <p className="text-zinc-400 text-xs mt-1">No state tax withholding required in NH or MA. Contractor pays own self-employment taxes (15.3%).</p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Strict Contractor Status Rules</h4>
                  <p className="text-zinc-400 text-xs mt-1">IRS multi-factor test: Do you control the work? Provide tools? Work exclusively for you? If yes, they are likely W-2. Misclassification brings severe penalties.</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-purple-400 border-b-2 border-purple-500/20 pb-2 mb-4 uppercase tracking-wide">ONGOING RECORD KEEPING</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <h4 className="font-bold text-white text-sm">Document Retention</h4>
                  <ul className="text-zinc-400 text-xs mt-1 list-disc pl-4 space-y-1">
                    <li>I-9 forms: 3 yrs from hire or 1 yr after term</li>
                    <li>Payroll records: 4 years (MA rule)</li>
                    <li>Tax forms (W-4, W-9, 1099): 4 years</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Workplace Posters</h4>
                  <p className="text-zinc-400 text-xs mt-1">Must display federal and state (MA/NH) labor law posters. Available free from DOL/state agencies.</p>
                </div>
              </div>
            </section>

            <section className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mt-4 flex-1">
              <h3 className="text-lg font-bold text-rose-400 mb-3 uppercase tracking-wide">RECOMMENDED NEXT STEPS</h3>
              <ul className="text-sm text-zinc-300 list-disc pl-5 space-y-2 font-medium">
                <li>Confirm Brandon's and Paul's classification (W-2 vs 1099) with accountant.</li>
                <li>Obtain an EIN from IRS.gov if you don't already have one.</li>
                <li>Set up workers compensation insurance in MA and NH.</li>
                <li>Consider a payroll service like Gusto for automated compliance.</li>
                <li>Complete new hire reporting for both employees.</li>
                <li>Collect I-9, W-4/W-9, and MA M-4 (if W-2).</li>
              </ul>
            </section>
          </div>

          <div className="text-center text-zinc-600 text-xs mt-4">Page 2 of 2 — Prime Auto Detail Administrative Document</div>
        </div>
      </div>
    </Dialog>
  );
}
