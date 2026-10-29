import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { HelpCircle, Clock, Bell, Calendar, Zap, ShieldAlert, Sparkles, CheckCircle2, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface HowFollowUpsWorkGuideProps {
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function HowFollowUpsWorkGuide({
  className,
  side = "bottom",
  align = "end"
}: HowFollowUpsWorkGuideProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-8 text-[10px] font-black text-amber-400 hover:text-white border-amber-500/20 bg-amber-500/5 hover:bg-amber-500 px-3 rounded-lg transition-all gap-1.5 whitespace-nowrap",
            className
          )}
          title="How Follow-Ups Work (Quick Guide)"
          onClick={(e) => e.stopPropagation()}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>How Follow-Ups Work</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-[360px] sm:w-[440px] max-h-[82vh] overflow-y-auto bg-zinc-900 border border-zinc-700 text-white p-4 sm:p-5 shadow-2xl z-[350] rounded-xl space-y-4 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-3">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 shrink-0">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white">How Follow-Ups Work</h4>
            <p className="text-[9px] text-zinc-400 uppercase font-semibold">Logging, Tiers, Reminders & Prospect Rules</p>
          </div>
        </div>

        {/* Section A: Logging an Activity */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>1. Logging an Activity (Step-by-Step)</span>
          </div>
          <div className="text-[11px] text-zinc-300 space-y-1 pl-5 leading-relaxed">
            <p>
              • <strong className="text-white">Time:</strong> Defaults to current time. For past calls or texts (e.g. from Google Voice), click the field to pick the exact historical date/time. The CRM will order it chronologically.
            </p>
            <p>
              • <strong className="text-white">Type:</strong> Select Outgoing/Incoming Call, Text Message, Email, Contact Attempt, or General Note.
            </p>
            <p>
              • <strong className="text-white">Note:</strong> Enter details of what was discussed, promised, or quoted.
            </p>
            <p>
              • <strong className="text-white">Saving:</strong> Saves immediately to the engagement log, updates the customer timeline, and <span className="text-blue-300 font-semibold">advances the customer's last-activity clock</span>.
            </p>
          </div>
        </div>

        {/* Section B: Alerts Toggle, Tiers & Badges */}
        <div className="space-y-1.5 border-t border-zinc-800/80 pt-3">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
            <Bell className="w-3.5 h-3.5 shrink-0" />
            <span>2. Follow-Up Alerts Toggle & Tier Badges</span>
          </div>
          <div className="text-[11px] text-zinc-300 space-y-1 pl-5 leading-relaxed">
            <p>
              • <strong className="text-white">Follow-Up Alerts (ON/OFF):</strong> Clicking this toggles a <code className="text-zinc-400">[NO_FOLLOWUP]</code> tag on the customer profile. Turn OFF to silence reminders for fleet, internal, or one-off accounts.
            </p>
            <p>
              • <strong className="text-white">Automatic Tier Detection:</strong> Determined by their latest completed booking:
            </p>
            <div className="bg-zinc-950/70 p-2 rounded-lg border border-zinc-800 space-y-0.5 text-[10px] my-1">
              <div>• <strong className="text-amber-300">Ceramic (12M Tier):</strong> Due 12 months after latest service.</div>
              <div>• <strong className="text-blue-300">Full Detail (6M Tier):</strong> Due 6 months after latest service.</div>
              <div>• <strong className="text-emerald-300">Maintenance (3M Tier):</strong> Due 3 months after latest service.</div>
            </div>
            <p>
              • <strong className="text-white">Due Date Calculation:</strong> Calculated from the latest activity (completed booking, logged call/text, or note) plus the tier threshold.
            </p>
            <p>
              • <strong className="text-white">Badges:</strong> Shows green <span className="text-emerald-400 font-semibold">[DUE IN X DAYS]</span> or pulsing red <span className="text-red-400 font-semibold">[X WKS OVERDUE]</span>. Clicking the badge opens their record in the Follow-Up Center.
            </p>
            <p className="text-[10px] text-zinc-400 italic">
              * Note: Follow-up alerts are automatically silenced during winter off-season (Dec, Jan, Feb).
            </p>
          </div>
        </div>

        {/* Section C: Automated Reminders & Due Clock */}
        <div className="space-y-1.5 border-t border-zinc-800/80 pt-3">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>3. How Reminders Work & Due Clock Resets</span>
          </div>
          <div className="text-[11px] text-zinc-300 space-y-1 pl-5 leading-relaxed">
            <p>
              • <strong className="text-white">Where They Show Up:</strong> In the Follow-Up Center under Overdue, Due This Week, and Due This Month tabs, as well as on Customer Cards.
            </p>
            <p>
              • <strong className="text-white">Does Logging Reset the Clock?</strong> <span className="text-amber-300 font-bold">YES.</span> Any logged activity with a newer date pushes the last-activity timestamp forward and resets the due countdown.
            </p>
            <p>
              • <strong className="text-white">Background Execution:</strong> <span className="text-amber-200 bg-amber-500/10 px-1 py-0.5 rounded font-semibold">NOTHING runs in the background when the app is closed.</span> There are no background bots or closed-browser push alerts. Reminders calculate live inside the browser when you open the app.
            </p>
          </div>
        </div>

        {/* Section D: For Prospects */}
        <div className="space-y-1.5 border-t border-zinc-800/80 pt-3">
          <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold">
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span>4. For Prospects (What Applies)</span>
          </div>
          <div className="text-[11px] text-zinc-300 space-y-1 pl-5 leading-relaxed">
            <p>
              • <strong className="text-white">Activity Logging:</strong> You can log calls, texts, and notes for prospects just like customers, including the historical Time field.
            </p>
            <p>
              • <strong className="text-white">No Service Tiers:</strong> 3M/6M/12M completed-service tier badges do <span className="text-purple-300 font-semibold">NOT</span> apply to prospects (they display a purple "Prospect" badge).
            </p>
            <p>
              • <strong className="text-white">Prospect Conversion:</strong> When a prospect books their first detail, they convert to a customer profile, activating the automatic service-tier follow-up engine.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
