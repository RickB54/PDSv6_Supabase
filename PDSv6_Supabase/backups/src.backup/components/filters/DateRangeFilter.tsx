import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateRangeValue {
  from?: Date;
  to?: Date;
}

interface Props {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  storageKey?: string;
  className?: string;
}

export default function DateRangeFilter({ value, onChange, storageKey, className }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        onChange({
          from: parsed.from ? new Date(parsed.from) : undefined,
          to: parsed.to ? new Date(parsed.to) : undefined,
        });
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    const payload = JSON.stringify({ from: value.from?.toISOString(), to: value.to?.toISOString() });
    localStorage.setItem(storageKey, payload);
  }, [value, storageKey]);

  const label = value.from && value.to
    ? `${value.from.toLocaleDateString()} - ${value.to.toLocaleDateString()}`
    : "Custom Range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("whitespace-nowrap", className)}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from: value.from, to: value.to } as any}
          onSelect={(range: any) => onChange({ from: range?.from, to: range?.to })}
          numberOfMonths={2}
          className={cn("p-3 pointer-events-auto")}
        />
        <div className="flex justify-between items-center p-2 border-t">
          <Button variant="ghost" size="sm" onClick={() => onChange({})}>Clear</Button>
          <Button size="sm" onClick={() => setOpen(false)}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
