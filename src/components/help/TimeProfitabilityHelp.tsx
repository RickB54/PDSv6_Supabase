import React from "react";
import { HelpCircle, CheckCircle2, TrendingUp } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function TimeProfitabilityHelp() {
  const steps = [
    {
      title: "1. The Summary Widgets",
      desc: "Shows your average Revenue, Net Payout (after Stripe fees), and Profit per hour. Use the Date and Customer filters to slice the data."
    },
    {
      title: "2. The Drag List (Red Section)",
      desc: "Highlights your absolute lowest $/Hour performing jobs. Review these constantly to identify services taking too long or priced too low."
    },
    {
      title: "3. Backfill Historical Data",
      desc: "Click the blue 'Backfill' button to view a list of all past jobs missing 'hours worked' data. Rapidly enter the hours for each to instantly correct your historical analytics."
    },
    {
      title: "4. Stripe Fee Tracking",
      desc: "For jobs paid via Stripe, the exact fee is deducted from Net Payout. A red badge will appear on the breakdown rows showing exactly how much was lost to fees."
    }
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center justify-center rounded-full w-8 h-8 bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shrink-0"
          aria-label="Time & Profitability Help"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[450px] p-0 shadow-2xl border-blue-200 overflow-hidden" align="end">
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-bold text-lg text-slate-900 leading-tight">
              Time & Profitability Guide
            </h4>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Cheat Sheet</p>
          </div>
        </div>
        
        <div className="p-5 space-y-5 bg-white max-h-[60vh] overflow-y-auto">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm mb-1">{step.title}</p>
                <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
