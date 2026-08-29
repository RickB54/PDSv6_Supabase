import React from "react";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { HelpCircle, Sparkles, X, BookOpen } from "lucide-react";

export interface HelpInstructionStep {
  title: string;
  desc: string;
}

export interface HelpTooltipPopupProps {
  title: string;
  subtitle?: string;
  badge?: string;
  steps: HelpInstructionStep[];
  triggerLabel?: string;
  iconSize?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export const HelpTooltipPopup: React.FC<HelpTooltipPopupProps> = ({
  title,
  subtitle,
  badge = "GUIDE",
  steps,
  triggerLabel,
  iconSize = "h-4 w-4",
  side = "bottom",
  align = "start",
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {triggerLabel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-white h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider gap-1.5 transition-all shadow-sm shrink-0"
          >
            <HelpCircle className={`${iconSize} text-indigo-400`} />
            <span>{triggerLabel}</span>
          </Button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center justify-center h-6 w-6 rounded-full text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/30 border border-indigo-500/20 transition-all shrink-0 active:scale-95 focus:outline-none"
            title={`Click for ${title} instructions`}
          >
            <HelpCircle className={iconSize} />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-80 sm:w-96 bg-zinc-950/98 border-zinc-800 text-zinc-100 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl rounded-2xl z-[300] border-t-indigo-500/50"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-xs uppercase tracking-widest text-white">{title}</h4>
                  {badge && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {badge}
                    </span>
                  )}
                </div>
                {subtitle && <p className="text-[11px] text-zinc-400 font-medium mt-0.5 leading-tight">{subtitle}</p>}
              </div>
            </div>
            <PopoverClose className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800">
              <X className="h-4 w-4" />
            </PopoverClose>
          </div>

          {/* Steps List */}
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 hover:border-indigo-500/30 transition-all">
                <div className="h-5 w-5 rounded-md bg-indigo-500/20 text-indigo-400 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="text-xs leading-relaxed">
                  <span className="font-bold text-zinc-200 block text-[11px] mb-0.5 uppercase tracking-wide">{step.title}</span>
                  <span className="text-zinc-400 text-[11px] block">{step.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1 text-indigo-400">
              <Sparkles className="h-3 w-3" /> PDS v6 Setup Help
            </span>
            <PopoverClose asChild>
              <Button size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded-lg">
                Got it
              </Button>
            </PopoverClose>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
