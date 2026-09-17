import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Beaker, Wrench, Lightbulb, CheckCircle2, ChevronRight } from 'lucide-react';
import { sopService, MasterSOPItem } from '@/lib/sop-service';

interface SOPTooltipProps {
  sopIdOrCode?: string;
  category?: 'exterior' | 'interior';
  stepNumber?: number;
  title?: string;
  variant?: 'icon' | 'badge' | 'button';
  customLabel?: string;
}

export const SOPTooltip: React.FC<SOPTooltipProps> = ({
  sopIdOrCode,
  category,
  stepNumber,
  title,
  variant = 'icon',
  customLabel
}) => {
  const [sops, setSops] = useState<MasterSOPItem[]>([]);
  const [item, setItem] = useState<MasterSOPItem | undefined>(undefined);

  useEffect(() => {
    sopService.getMasterSOPs().then(loaded => {
      setSops(loaded);
    });
  }, []);

  useEffect(() => {
    let found: MasterSOPItem | undefined;
    if (sopIdOrCode) {
      found = sopService.getSOPByIdOrCode(sopIdOrCode, sops);
    }
    if (!found && category && stepNumber) {
      found = sops.find(s => s.category === category && s.stepNumber === stepNumber);
    }
    if (!found && title) {
      const lower = title.toLowerCase();
      found = sops.find(s => s.title.toLowerCase().includes(lower) || lower.includes(s.title.toLowerCase()));
    }
    setItem(found);
  }, [sopIdOrCode, category, stepNumber, title, sops]);

  if (!item) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {variant === 'badge' ? (
          <Badge 
            variant="outline" 
            className="cursor-pointer bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20 text-[10px] uppercase font-bold flex items-center gap-1 transition-all"
          >
            <HelpCircle className="h-3 w-3" />
            {customLabel || item.code}
          </Badge>
        ) : variant === 'button' ? (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 font-bold"
          >
            <HelpCircle className="h-3.5 w-3.5 mr-1" />
            {customLabel || 'SOP Tips'}
          </Button>
        ) : (
          <button 
            type="button"
            className="inline-flex items-center justify-center h-5 w-5 rounded-full text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all ml-1.5"
            title={`View SOP ${item.code} Guide & Tips`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 bg-zinc-950 border border-purple-500/30 text-white p-4 shadow-2xl rounded-xl z-[100] animate-in zoom-in-95">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-600 text-white font-extrabold text-[10px] uppercase tracking-wider">
                  {item.code}
                </Badge>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Step {item.stepNumber} • {item.category}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1 leading-snug">{item.title}</h4>
            </div>
          </div>

          {/* Short Summary */}
          <p className="text-xs text-zinc-300 italic bg-zinc-900/80 p-2.5 rounded-lg border border-white/5">
            "{item.shortSummary}"
          </p>

          {/* Detailed Instructions */}
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Master Standard Operating Procedure
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed bg-black/40 p-2.5 rounded-lg border border-zinc-800">
              {item.detailedInstructions}
            </p>
          </div>

          {/* Rick's Pro Tips */}
          {item.ricksTips && (
            <div className="space-y-1 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg">
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1">
                <Lightbulb className="h-3.5 w-3.5" /> Rick's Pro Tip
              </div>
              <p className="text-xs text-amber-200/90 font-medium">
                {item.ricksTips}
              </p>
            </div>
          )}

          {/* Dilution & Tools Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800 text-[10px]">
            {item.dilutionRatio && (
              <div className="flex items-center gap-1 text-emerald-400 font-bold">
                <Beaker className="h-3 w-3" /> Ratio: {item.dilutionRatio}
              </div>
            )}
            {item.tools && item.tools.length > 0 && (
              <div className="flex items-center gap-1 text-blue-400 font-semibold truncate max-w-[200px]">
                <Wrench className="h-3 w-3 shrink-0" /> {item.tools.join(', ')}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
