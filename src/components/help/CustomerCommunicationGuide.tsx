import React, { useState, useEffect } from "react";
import { MessageSquareQuote, X, ChevronDown, CheckCircle2, Info, FileText, ClipboardCheck, Download } from "lucide-react";
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const VehicleScratchpad = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    year: "", make: "", model: "", color: "", type: "", condition: "", dailyDriver: "", 
    reasonForDetail: "", interiorCondition: "", seatMaterial: "", paintCondition: "", garaged: "", notes: ""
  });

  React.useEffect(() => {
    if (open) {
      // Pull latest from local storage (Phone Assistant)
      const savedStr = localStorage.getItem("phone_assistant_draft_vehicles");
      const activeId = localStorage.getItem("phone_assistant_draft_active_id");
      if (savedStr) {
        try {
          const vehicles = JSON.parse(savedStr);
          const active = vehicles.find((v: any) => v.id === activeId) || vehicles[0];
          if (active) {
            setFormData({
              year: active.year || "",
              make: active.make || "",
              model: active.model || "",
              color: active.color || "",
              type: active.type || "",
              condition: active.condition || "",
              dailyDriver: active.dailyDriver !== undefined ? active.dailyDriver.toString() : "",
              reasonForDetail: active.reasonForDetail || "",
              interiorCondition: active.interiorCondition || "",
              seatMaterial: active.seatMaterial || "",
              paintCondition: active.paintCondition || "",
              garaged: active.garaged || "",
              notes: active.notes || ""
            });
          }
        } catch (e) {
          console.error("Failed to parse vehicle draft from local storage", e);
        }
      }
    }
  }, [open]);

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // Sync all form data to the underlying Call Assistant at once
    Object.entries(formData).forEach(([key, val]) => {
      let finalVal = val;
      if (key === 'dailyDriver') {
        if (val === 'true') finalVal = true;
        else if (val === 'false') finalVal = false;
        else finalVal = undefined; // Do not overwrite if unselected
      }
      
      // Dispatch one by one or all at once? The listener merges updates, so one big update is better.
    });

    // Actually, we can dispatch all keys in a single event
    const payload = { ...formData };
    if (payload.dailyDriver === 'true') payload.dailyDriver = true;
    else if (payload.dailyDriver === 'false') payload.dailyDriver = false;
    else delete payload.dailyDriver;

    window.dispatchEvent(new CustomEvent('update-call-assistant-vehicle', {
      detail: payload
    }));
    
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full max-w-[200px] bg-white text-emerald-700 hover:bg-emerald-50 border-emerald-200 shadow-sm flex items-center justify-center gap-2">
          <FileText className="w-4 h-4" />
          Open Editable Scratchpad
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl bg-slate-50 p-6 shadow-2xl z-[200] max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          Vehicle Info Scratchpad
        </DialogTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Year / Make / Model</label>
              <div className="flex gap-2">
                <input type="text" value={formData.year} onChange={(e) => handleChange('year', e.target.value)} className="w-1/4 border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" placeholder="Year" />
                <input type="text" value={formData.make} onChange={(e) => handleChange('make', e.target.value)} className="w-2/4 border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" placeholder="Make" />
                <input type="text" value={formData.model} onChange={(e) => handleChange('model', e.target.value)} className="w-1/4 border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" placeholder="Model" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Color</label>
              <input type="text" value={formData.color} onChange={(e) => handleChange('color', e.target.value)} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" placeholder="e.g. Black" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vehicle Class</label>
              <select value={formData.type} onChange={(e) => handleChange('type', e.target.value)} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                <option value="">Select...</option>
                <option value="compact">Compact / Sedan</option>
                <option value="midsize">Midsize / SUV</option>
                <option value="truck">Truck / Van / Large SUV</option>
                <option value="luxury">Luxury / XL</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dirt Level</label>
              <select value={formData.condition} onChange={(e) => handleChange('condition', e.target.value)} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                <option value="">Select...</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="heavy">Heavy</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Usage</label>
              <select value={formData.dailyDriver} onChange={(e) => handleChange('dailyDriver', e.target.value)} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                <option value="">Select...</option>
                <option value="true">Daily Driver</option>
                <option value="false">Weekend / Occasional</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Goal / Motivation</label>
              <select value={formData.reasonForDetail} onChange={(e) => handleChange('reasonForDetail', e.target.value)} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                <option value="">Select...</option>
                <option value="maintenance">Maintenance</option>
                <option value="selling">Selling</option>
                <option value="purchase">Just Purchased</option>
                <option value="protection">Protection</option>
                <option value="restoration">Restoration</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interior Condition</label>
              <select value={formData.interiorCondition} onChange={(e) => handleChange('interiorCondition', e.target.value)} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                <option value="">Select...</option>
                <option value="normal">Normal</option>
                <option value="pethair">Pet Hair</option>
                <option value="stains">Stains / Odors</option>
                <option value="kids">Child Seats</option>
                <option value="neglected">Very Dirty</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seat Material</label>
              <select value={formData.seatMaterial} onChange={(e) => handleChange('seatMaterial', e.target.value)} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                <option value="">Select...</option>
                <option value="cloth">Cloth</option>
                <option value="leather">Leather</option>
                <option value="synthetic">Synthetic</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Paint Condition</label>
              <select value={formData.paintCondition} onChange={(e) => handleChange('paintCondition', e.target.value)} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                <option value="">Select...</option>
                <option value="good">Good</option>
                <option value="swirls">Swirls / Scratches</option>
                <option value="neglected">Oxidized / Faded</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Storage</label>
              <select value={formData.garaged} onChange={(e) => handleChange('garaged', e.target.value)} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                <option value="">Select...</option>
                <option value="Garaged">Garaged</option>
                <option value="Outdoors">Outdoors</option>
                <option value="Carport">Carport</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Extra Notes</label>
              <textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none h-16 resize-none bg-white" placeholder="Freehand notes here..."></textarea>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex flex-col items-center border-t border-slate-200 pt-4">
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Save & Sync to Assistant
          </Button>
          <p className="text-[10px] text-slate-400 mt-2 italic text-center">Your selections will securely transfer to the active Phone Assistant in the background.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function CustomerCommunicationGuide({ showTrigger = true }: { showTrigger?: boolean } = {}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<number | null>(0);

  const handleSavePDF = () => {
    toast({ title: "Generating PDF", description: "Preparing the Customer Communication Guide..." });
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxY = pageHeight - 10; // Reduced margin to fit section 4 on page 1
    let currentY = 20;

    const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > maxY) {
            doc.addPage();
            currentY = 20;
        }
    };

    // Draw Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("PRIME AUTO DETAILING", 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont("helvetica", "normal");
    doc.text(`Customer Communication Guide | Date: ${new Date().toLocaleDateString()}`, 14, 23);
    currentY = 36;
    
    // Main Section Header
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text("COMMUNICATION SCRIPTS & REFERENCE GUIDE", 14, currentY);
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
    currentY += 10;

    const printSection = (title: string, contents: { type: 'bold' | 'normal' | 'bullet' | 'italic', text: string }[]) => {
        // Enforce specific page breaks
        if (title.startsWith("5.") || title.startsWith("7.")) {
            doc.addPage();
            currentY = 20;
        }

        // title
        checkPageBreak(12);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(title, 14, currentY);
        currentY += 6;

        contents.forEach(item => {
            doc.setFontSize(9.5);
            if (item.type === 'bold') doc.setFont("helvetica", "bold");
            else if (item.type === 'italic') doc.setFont("helvetica", "italic");
            else doc.setFont("helvetica", "normal");

            doc.setTextColor(51, 65, 85);
            
            const indent = item.type === 'bullet' ? 18 : 14;
            
            const splitText = doc.splitTextToSize(item.text, pageWidth - indent - 14);
            const estimatedHeight = (splitText.length * 5) + 2;
            checkPageBreak(estimatedHeight);
            
            splitText.forEach((line: string, i: number) => {
                checkPageBreak(6);
                if (i === 0 && item.type === 'bullet') {
                    doc.text("•", 14, currentY);
                }
                doc.text(line, indent, currentY);
                currentY += 5;
            });
            currentY += 2;
        });
        currentY += 4;
    };

    const pdfSections = [
        {
            title: "1. Opening / Warm-Up",
            contents: [
                { type: 'bold', text: "Goal: Start the conversation naturally and warmly without sounding overly scripted." },
                { type: 'normal', text: "Sample Greetings:" },
                { type: 'bullet', text: "\"Hi there, this is Rick from Prime Auto Detail. How's your day going?\"" },
                { type: 'bullet', text: "\"Hey! I saw your inquiry come through. Thanks for reaching out. What can I help you with today?\"" },
                { type: 'bullet', text: "(If delayed) \"Hi, thanks for your patience! I was just wrapping up a detail. I saw you were looking for some info on our services?\"" },
                { type: 'italic', text: "Note: Keep it brief. Let the customer guide the initial direction before diving into questions." }
            ]
        },
        {
            title: "2. Collecting Vehicle Info",
            contents: [
                { type: 'bold', text: "Goal: Gather all necessary details to provide an accurate estimate. Let the customer talk first, then gently ask follow-ups." },
                { type: 'normal', text: "Conversational Prompts:" },
                { type: 'bullet', text: "Basic Info: \"What kind of vehicle are we looking at? Year, make, model, and color?\"" },
                { type: 'bullet', text: "Interior: \"For the inside, do you have cloth or leather seats? Any pet hair, tough stains, or odors we should know about?\"" },
                { type: 'bullet', text: "Exterior: \"How's the paint holding up? Any noticeable scratches, swirls, or fading?\"" },
                { type: 'bullet', text: "Usage: \"Is this your daily driver, or mostly a weekend car? Does it stay in a garage?\"" },
                { type: 'bullet', text: "Goal: \"What's the main goal for the detail? Just general upkeep, getting ready to sell, or a special occasion?\"" }
            ]
        },
        {
            title: "3. Explaining Services & Shop Location",
            contents: [
                { type: 'bold', text: "If they ask \"How much is it?\" right away:" },
                { type: 'italic', text: "\"I'd love to give you an accurate price. Since every vehicle is different, do you mind if I ask a few quick questions about the car's condition first? That way I don't misquote you.\"" },
                { type: 'bold', text: "Mobile vs. In-Shop:" },
                { type: 'bullet', text: "When to require In-Shop: \"For full interior details or heavy paint correction, I require the vehicle to be brought into my shop. It allows me to use specialized equipment, control the lighting and climate, and ensures you get the absolute best result possible.\"" },
                { type: 'bullet', text: "When Mobile is okay: \"If you're just looking for a maintenance wash or a basic exterior detail, I can absolutely come to you, as long as you have water and power access.\"" }
            ]
        },
        {
            title: "4. Explaining the Estimate Process",
            contents: [
                { type: 'bold', text: "Goal: Set clear expectations on how they will receive their quote and how to move forward." },
                { type: 'italic', text: "\"Based on what you've told me, here is how we'll proceed:\"" },
                { type: 'bullet', text: "\"I'm going to build a customized estimate for you (one for each vehicle if multiple).\"" },
                { type: 'bullet', text: "\"I'll email you a secure link where you can review the proposed services and the exact price breakdown.\"" },
                { type: 'bullet', text: "\"You don't need an account or any paperwork. You can just review it on your phone.\"" },
                { type: 'bullet', text: "\"Once you accept, it notifies me, and I'll reach right back out to lock in your appointment date and time.\"" }
            ]
        },
        {
            title: "5. Likely Questions & Answers (FAQ)",
            contents: [
                { type: 'bold', text: "Q: Do I need to create an account to book?" },
                { type: 'normal', text: "A: \"Nope! Everything is handled via simple secure links sent to your email or phone.\"" },
                { type: 'bold', text: "Q: How do you determine vehicle size/category?" },
                { type: 'normal', text: "A: \"We base it on the actual size and surface area. For example, a large truck or van requires significantly more time and product than a 2-door coupe, so the pricing reflects that.\"" },
                { type: 'bold', text: "Q: How long does a detail take?" },
                { type: 'normal', text: "A: \"It varies heavily by condition. A standard full detail is usually 2.5-5 hours. If we are dealing with heavy pet hair or severe staining, I might need it for the full day.\"" },
                { type: 'bold', text: "Q: I have three cars, can you do them all in one day?" },
                { type: 'normal', text: "A: \"Typically, I focus on one or two cars per day to ensure the highest quality. We can schedule them across a couple of days, or back-to-back depending on exactly what services they need.\"" },
                { type: 'bold', text: "Handling Price Pushback - Objection: \"That seems expensive / high\"" },
                { type: 'italic', text: "Response: \"I completely understand. Our pricing reflects the level of detail, professional-grade equipment, and time we dedicate to your vehicle. We focus on high-quality, lasting results rather than a quick surface wash...\"" },
                { type: 'bold', text: "Handling Price Pushback - Objection: \"Do you offer a discount for multiple vehicles?\"" },
                { type: 'italic', text: "Response: \"We price each vehicle based on its individual size, condition, and the work required to get it right. Because our costs for time and premium materials don't decrease with volume, we don't typically offer multi-car discounts...\"" },
                { type: 'bold', text: "Handling Price Pushback - Objection: \"The shop down the street is cheaper\"" },
                { type: 'italic', text: "Response: \"There are definitely cheaper options out there! Many high-volume shops compete on price by rushing through cars. We compete on quality. We take the time needed to safely and thoroughly care for your vehicle...\"" }
            ]
        },
        {
            title: "6. Must-Have Info Checklist",
            contents: [
                { type: 'bold', text: "CRITICAL (Do Not Skip):" },
                { type: 'bullet', text: "Year, Make, Model" },
                { type: 'bullet', text: "Service Wanted (Int/Ext/Both)" },
                { type: 'bullet', text: "Interior Material (Cloth vs Leather)" },
                { type: 'bullet', text: "Overall Dirt/Condition Level" },
                { type: 'bullet', text: "Customer Name" },
                { type: 'bullet', text: "Email or Phone (to send estimate)" },
                { type: 'bold', text: "Optional (Nice to Have):" },
                { type: 'bullet', text: "Vehicle Color" },
                { type: 'bullet', text: "Daily vs. Weekend Usage" },
                { type: 'bullet', text: "Garage vs. Outside Storage" },
                { type: 'bullet', text: "Last Professional Detail Date" },
                { type: 'bullet', text: "Specific Motivation for service" }
            ]
        },
        {
            title: "7. Voicemail / No-Answer Follow-Up Text",
            contents: [
                { type: 'bold', text: "Goal: Confirm receipt of a new online booking via text message when a live phone call goes to voicemail." },
                { type: 'bold', text: "Sample Greetings (New Booking / Prospect):" },
                { type: 'bullet', text: "\"Hello, this is Rick from Prime Auto Detail. I saw your booking come through and tried calling but it went to voicemail. No rush, just wanted to confirm we got it and answer any questions before we get started. Also, so I will be fully prepped, what's the general condition inside and out (any stains, pet hair, heavy dirt/mud, smoke odor)? And roughly when was it last detailed, if ever? That's all I need for now, feel free to call or text back anytime!\"" },
                { type: 'bold', text: "Shorter Version (Repeat / Existing Customers):" },
                { type: 'bullet', text: "\"Hello, this is Rick from Prime Auto Detail! I saw your new booking come through and tried giving you a quick call, but hit voicemail. Just confirming we received it and locking things in. Feel free to text back or call anytime if you have any questions!\"" }
            ]
        },
        {
            title: "8. Closing / Wrap-Up",
            contents: [
                { type: 'bold', text: "Goal: End the conversation naturally, confirm next steps, and set clear expectations on timing." },
                { type: 'normal', text: "Sample Sign-Offs:" },
                { type: 'bullet', text: "\"I've got all the notes I need. I'll put together that customized estimate and email it over to you within the next couple of hours. Keep an eye out for it!\"" },
                { type: 'bullet', text: "\"Thanks so much for taking the time to chat. I'll have that estimate over to you within a day or so. If it looks good, just click accept and we'll get you on the schedule.\"" },
                { type: 'bullet', text: "\"I appreciate you reaching out! I'll get to work on this quote right away. If you have any other questions in the meantime, feel free to text or call this number back.\"" },
                { type: 'italic', text: "Important Note on Google Reviews: Do not ask for a Google review during this initial intake conversation. The review ask happens later, after the service is completed and payment is successful." }
            ]
        }
    ];

    pdfSections.forEach(sec => printSection(sec.title, sec.contents as any));

    doc.save(`Prime_Customer_Comm_Guide_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('open-comm-guide', handleOpen);
    return () => window.removeEventListener('open-comm-guide', handleOpen);
  }, []);

  const toggleSection = (idx: number) => {
    if (activeSection === idx) {
      setActiveSection(null);
      // Scroll back to top
      const container = document.getElementById('comm-guide-scroll-container');
      if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      setActiveSection(idx);
      // Small delay to allow the accordion to render open before calculating height
      setTimeout(() => {
        const el = document.getElementById(`comm-guide-section-${idx}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  const sections = [
    {
      title: "1. Opening / Warm-Up",
      content: (
        <div className="space-y-4 text-sm text-slate-700">
          <p><strong>Goal:</strong> Start the conversation naturally and warmly without sounding overly scripted.</p>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p className="font-medium text-blue-900 mb-2">Sample Greetings:</p>
            <ul className="list-disc pl-5 space-y-2 text-blue-800">
              <li>"Hi there, this is Rick from Prime Auto Detail. How's your day going?"</li>
              <li>"Hey! I saw your inquiry come through. Thanks for reaching out. What can I help you with today?"</li>
              <li><em>(If delayed)</em> "Hi, thanks for your patience! I was just wrapping up a detail. I saw you were looking for some info on our services?"</li>
            </ul>
          </div>
          <p className="italic text-xs text-slate-500">Note: Keep it brief. Let the customer guide the initial direction before diving into questions.</p>
        </div>
      )
    },
    {
      title: "2. Collecting Vehicle Info",
      content: (
        <div className="space-y-6 text-sm text-slate-700">
          <p><strong>Goal:</strong> Gather all necessary details to provide an accurate estimate. Let the customer talk first, then gently ask follow-ups to fill in the blanks.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900">Conversational Prompts</h4>
              <ul className="space-y-2">
                <li><span className="font-medium">Basic Info:</span> "What kind of vehicle are we looking at? Year, make, model, and color?"</li>
                <li><span className="font-medium">Interior:</span> "For the inside, do you have cloth or leather seats? Any pet hair, tough stains, or odors we should know about?"</li>
                <li><span className="font-medium">Exterior:</span> "How's the paint holding up? Any noticeable scratches, swirls, or fading?"</li>
                <li><span className="font-medium">Usage:</span> "Is this your daily driver, or mostly a weekend car? Does it stay in a garage?"</li>
                <li><span className="font-medium">Goal:</span> "What's the main goal for the detail? Just general upkeep, getting ready to sell, or a special occasion?"</li>
              </ul>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Vehicle Info Card (Fillable)
              </h4>
              <div className="flex flex-col items-center justify-center py-6 bg-white rounded border border-slate-200 text-center shadow-inner">
                <FileText className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs text-slate-500 mb-4 px-4">Click below to open a fillable scratchpad overlay while you are on the phone.</p>
                <VehicleScratchpad />
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "3. Explaining Services & Shop Location",
      content: (
        <div className="space-y-4 text-sm text-slate-700">
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 mb-4">
            <h4 className="font-medium text-emerald-900 mb-2">If they ask "How much is it?" right away:</h4>
            <p className="text-emerald-800 italic">"I'd love to give you an accurate price. Since every vehicle is different, do you mind if I ask a few quick questions about the car's condition first? That way I don't misquote you."</p>
          </div>

          <h4 className="font-semibold text-slate-900">Mobile vs. In-Shop</h4>
          <ul className="space-y-3">
            <li>
              <span className="font-medium">When to require In-Shop:</span><br/>
              <span className="italic text-slate-600">"For full interior details or heavy paint correction, I require the vehicle to be brought into my shop. It allows me to use specialized equipment, control the lighting and climate, and ensures you get the absolute best result possible."</span>
            </li>
            <li>
              <span className="font-medium">When Mobile is okay:</span><br/>
              <span className="italic text-slate-600">"If you're just looking for a maintenance wash or a basic exterior detail, I can absolutely come to you, as long as you have water and power access."</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      title: "4. Explaining the Estimate Process",
      content: (
        <div className="space-y-4 text-sm text-slate-700">
          <p><strong>Goal:</strong> Set clear expectations on how they will receive their quote and how to move forward.</p>
          
          <div className="border-l-4 border-blue-500 pl-4 py-1">
            <p className="italic font-medium text-slate-800 mb-2">"Based on what you've told me, here is how we'll proceed:"</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>"I'm going to build a customized estimate for you (one for each vehicle if multiple)."</li>
              <li>"I'll email you a secure link where you can review the proposed services and the exact price breakdown."</li>
              <div className="my-2 p-3 bg-blue-100 rounded border border-blue-200 text-blue-900 text-xs shadow-inner">
                <strong>For your reference:</strong> To send this link, go to the <strong>Estimates</strong> page, create a new Estimate, save it, and then click the <strong>Send</strong> button. The system will automatically generate and email the secure link to the customer.
              </div>
              <li>"You don't need an account or any paperwork. You can just review it on your phone."</li>

              <li>"Once you accept, it notifies me, and I'll reach right back out to lock in your appointment date and time."</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "5. Likely Questions & Answers (FAQ)",
      content: (
        <div className="space-y-4 text-sm text-slate-700">
          <div className="grid grid-cols-1 gap-3">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <p className="font-bold text-slate-800">Q: Do I need to create an account to book?</p>
              <p className="text-slate-600 mt-1">A: "Nope! Everything is handled via simple secure links sent to your email or phone."</p>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <p className="font-bold text-slate-800">Q: How do you determine vehicle size/category?</p>
              <p className="text-slate-600 mt-1">A: "We base it on the actual size and surface area. For example, a large truck or van requires significantly more time and product than a 2-door coupe, so the pricing reflects that."</p>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <p className="font-bold text-slate-800">Q: How long does a detail take?</p>
              <p className="text-slate-600 mt-1">A: "It varies heavily by condition. A standard full detail is usually 2.5-5 hours. If we are dealing with heavy pet hair or severe staining, I might need it for the full day."</p>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <p className="font-bold text-slate-800">Q: I have three cars, can you do them all in one day?</p>
              <p className="text-slate-600 mt-1">A: "Typically, I focus on one or two cars per day to ensure the highest quality. We can schedule them across a couple of days, or back-to-back depending on exactly what services they need."</p>
            </div>
            
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mt-2">
              <h4 className="font-bold text-amber-900 mb-3">Handling Price Pushback</h4>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-amber-800 text-xs uppercase tracking-wider mb-1">Objection: "That seems expensive / high"</p>
                  <p className="text-amber-900 italic text-sm">"I completely understand. Our pricing reflects the level of detail, professional-grade equipment, and time we dedicate to your vehicle. We focus on high-quality, lasting results rather than a quick surface wash, ensuring you get the best value for your investment. In fact, our pricing is highly competitive and often below the local average for this level of premium detailing, so you're getting top-tier quality without the typical high-end markup."</p>
                </div>
                <div>
                  <p className="font-semibold text-amber-800 text-xs uppercase tracking-wider mb-1">Objection: "Do you offer a discount for multiple vehicles?"</p>
                  <p className="text-amber-900 italic text-sm">"We price each vehicle based on its individual size, condition, and the work required to get it right. Because our costs for time and premium materials don't decrease with volume, we don't typically offer multi-car discounts. However, we ensure every vehicle receives the highest standard of care."</p>
                </div>
                <div>
                  <p className="font-semibold text-amber-800 text-xs uppercase tracking-wider mb-1">Objection: "The shop down the street is cheaper"</p>
                  <p className="text-amber-900 italic text-sm">"There are definitely cheaper options out there! Many high-volume shops compete on price by rushing through cars. We compete on quality. We take the time needed to safely and thoroughly care for your vehicle using premium products, so you won't leave with missed spots or new scratches."</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "6. Must-Have Info Checklist",
      content: (
        <div className="space-y-4 text-sm text-slate-700">
          <p>If the conversation is rushed, make sure you <strong>never hang up without these 6 pieces of info</strong> to build an accurate estimate:</p>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-red-50 p-4 rounded-lg border border-red-100">
              <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                CRITICAL (Do Not Skip)
              </h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-500"/> Year, Make, Model</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-500"/> Service Wanted (Int/Ext/Both)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-500"/> Interior Material (Cloth vs Leather)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-500"/> Overall Dirt/Condition Level</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-500"/> Customer Name</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-500"/> Email or Phone (to send estimate)</li>
              </ul>
            </div>
            
            <div className="flex-1 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-700 mb-2">Optional (Nice to Have)</h4>
              <ul className="space-y-2 text-slate-500">
                <li>• Vehicle Color</li>
                <li>• Daily vs. Weekend Usage</li>
                <li>• Garage vs. Outside Storage</li>
                <li>• Last Professional Detail Date</li>
                <li>• Specific Motivation for service</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "7. Voicemail / No-Answer Follow-Up Text",
      content: (
        <div className="space-y-4 text-sm text-slate-700">
          <p><strong>Goal:</strong> Confirm receipt of a new online booking via text message when a live phone call goes to voicemail, without sounding like a robocall — copy-paste ready for any prospect or vehicle type.</p>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-4">
            <div>
              <p className="font-medium text-blue-900 mb-2">Sample Greetings (New Booking / Prospect):</p>
              <ul className="list-disc pl-5 space-y-2 text-blue-800">
                <li>"Hello, this is Rick from Prime Auto Detail. I saw your booking come through and tried calling but it went to voicemail. No rush, just wanted to confirm we got it and answer any questions before we get started. Also, so I will be fully prepped, what's the general condition inside and out (any stains, pet hair, heavy dirt/mud, smoke odor)? And roughly when was it last detailed, if ever? That's all I need for now, feel free to call or text back anytime!"</li>
              </ul>
            </div>

            <div className="pt-2 border-t border-blue-200/60">
              <p className="font-medium text-blue-900 mb-2">Shorter Version (Repeat / Existing Customers):</p>
              <ul className="list-disc pl-5 space-y-2 text-blue-800">
                <li>"Hello, this is Rick from Prime Auto Detail! I saw your new booking come through and tried giving you a quick call, but hit voicemail. Just confirming we received it and locking things in. Feel free to text back or call anytime if you have any questions!"</li>
              </ul>
            </div>
          </div>
          
          <p className="italic text-xs text-slate-500">Note: Copy and paste directly to text/SMS without editing — generic enough for any prospect, with no name placeholders or job location assumptions required.</p>
        </div>
      )
    },
    {
      title: "8. Closing / Wrap-Up",
      content: (
        <div className="space-y-4 text-sm text-slate-700">
          <p><strong>Goal:</strong> End the conversation naturally, confirm next steps, and set clear expectations on timing.</p>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p className="font-medium text-blue-900 mb-2">Sample Sign-Offs:</p>
            <ul className="list-disc pl-5 space-y-2 text-blue-800">
              <li>"I've got all the notes I need. I'll put together that customized estimate and email it over to you within the next couple of hours. Keep an eye out for it!"</li>
              <li>"Thanks so much for taking the time to chat. I'll have that estimate over to you within a day or so. If it looks good, just click accept and we'll get you on the schedule."</li>
              <li>"I appreciate you reaching out! I'll get to work on this quote right away. If you have any other questions in the meantime, feel free to text or call this number back."</li>
            </ul>
          </div>
          <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 mt-4 text-sm">
            <p className="font-semibold text-slate-800 flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 text-slate-500" />
              Important Note on Google Reviews:
            </p>
            <p className="text-slate-600">Do not ask for a Google review during this initial intake conversation. The review ask happens later, <strong>after</strong> the service is completed and payment is successful (see the Payment Workflow Help guide for that script).</p>
          </div>
        </div>
      )
    }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 shadow-sm flex items-center gap-2 whitespace-nowrap"
            title="Open Customer Communication Guide"
          >
            <MessageSquareQuote className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">Comm. Guide</span>
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent id="comm-guide-scroll-container" className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white border-slate-200 shadow-2xl">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <MessageSquareQuote className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Customer Communication Guide</h2>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">General Reference & Scripts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSavePDF} className="hidden sm:flex text-slate-600 hover:text-slate-900">
               <Download className="w-4 h-4 mr-2" />
               Save PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-slate-500 hover:bg-slate-100 shrink-0">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 bg-slate-50/50 min-h-[50vh]">
          <div className="max-w-3xl mx-auto space-y-4">
            <p className="text-sm text-slate-600 mb-6">
              Use this guide during phone calls, texts, or emails to ensure a smooth, professional, and thorough conversation. Click any section below to expand.
            </p>

            <div className="space-y-3">
              {sections.map((section, idx) => {
                const isActive = activeSection === idx;
                return (
                  <div key={idx} id={`comm-guide-section-${idx}`} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-200 scroll-mt-24">
                    <button
                      onClick={() => toggleSection(idx)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 focus:outline-none focus:bg-slate-50 transition-colors"
                    >
                      <span className="font-bold text-slate-900 text-lg">{section.title}</span>
                      <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isActive && (
                      <div className="p-4 pt-0 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="pt-4">
                          {section.content}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-8 pb-4 border-t border-slate-200 mt-8 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="bg-purple-100 p-3 rounded-full">
                <ClipboardCheck className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Ready to build their customized estimate?</h3>
              <p className="text-sm text-slate-600 max-w-lg">
                Use the Client Evaluation tool to input the information you've gathered, generate service recommendations, and get a customized closing script.
              </p>
              <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 px-6 mt-2">
                <Link to="/client-evaluation" onClick={() => setOpen(false)}>
                  Go to Client Evaluation
                </Link>
              </Button>
            </div>
            
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
