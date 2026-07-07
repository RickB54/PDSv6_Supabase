import React, { useState } from "react";
import { MessageSquareQuote, X, ChevronDown, CheckCircle2, Info, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const VehicleScratchpad = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full max-w-[200px] bg-white text-emerald-700 hover:bg-emerald-50 border-emerald-200 shadow-sm flex items-center justify-center gap-2">
          <FileText className="w-4 h-4" />
          Open Editable Scratchpad
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-slate-50 p-6 shadow-2xl z-[200]">
        <DialogTitle className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          Vehicle Info Scratchpad
        </DialogTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Year / Make / Model</label>
              <input type="text" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white" placeholder="e.g. 2020 Ford F-150" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Color</label>
              <input type="text" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white" placeholder="e.g. Black" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interior Material</label>
              <select className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white transition-all">
                <option value="">Select or type freehand...</option>
                <option value="Leather">Leather</option>
                <option value="Cloth">Cloth</option>
                <option value="Mixed">Mixed / Other</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interior Condition</label>
              <input type="text" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white" placeholder="Pet hair? Stains? Odors?" />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Paint Condition</label>
              <input type="text" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white" placeholder="Swirls? Scratches? Fading?" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Usage & Storage</label>
              <input type="text" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white" placeholder="Daily driver? Garaged?" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Goal / Motivation</label>
              <input type="text" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white" placeholder="Selling? Maintenance?" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Extra Notes</label>
              <textarea className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none h-20 resize-none transition-all bg-white" placeholder="Freehand notes here..."></textarea>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 italic text-center">Note: This scratchpad is temporary. Copy any important info to your actual booking or estimate.</p>
      </DialogContent>
    </Dialog>
  );
};

export function CustomerCommunicationGuide() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<number | null>(0);

  const toggleSection = (idx: number) => {
    setActiveSection(prev => prev === idx ? null : idx);
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
              <li>"If it looks good, you just click 'Accept'. It will ask you a couple quick questions about the vehicle condition just to confirm."</li>
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
      title: "7. Closing / Wrap-Up",
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
      
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white border-slate-200 shadow-2xl">
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
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-slate-500 hover:bg-slate-100 shrink-0">
            <X className="w-5 h-5" />
          </Button>
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
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
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
            
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
