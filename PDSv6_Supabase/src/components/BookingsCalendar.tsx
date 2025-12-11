import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBookingsStore, BookingStatus } from "@/store/bookings";
import { markViewed } from "@/lib/viewTracker";

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function formatDate(d: Date) { return d.toISOString().split('T')[0]; }

export interface BookingsCalendarProps {
  readOnly?: boolean;
  initialDate?: Date;
  showControls?: boolean;
  filterDefault?: BookingStatus | "all";
}

export function BookingsCalendar({ readOnly = false, initialDate, showControls = true, filterDefault = "all" }: BookingsCalendarProps) {
  const { items, add, update } = useBookingsStore();
  const [viewDate, setViewDate] = useState<Date>(initialDate || new Date());
  const [filter, setFilter] = useState<BookingStatus | "all">(filterDefault);

  // Do not seed demo bookings; calendar should reflect real data only

  const start = startOfMonth(viewDate);
  const end = endOfMonth(viewDate);
  const days = Array.from({ length: end.getDate() }, (_, i) => new Date(viewDate.getFullYear(), viewDate.getMonth(), i+1));

  const filtered = useMemo(() => items.filter(b => filter === "all" || b.status === filter), [items, filter]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>, day: Date) => {
    if (readOnly) return;
    const id = e.dataTransfer.getData("bookingId");
    const booking = items.find(b => b.id === id);
    if (booking) update(id, { date: formatDate(day) });
  };

  const statusColor = (s: BookingStatus) => {
    return s === "pending" ? "bg-yellow-200 text-yellow-800" :
           s === "confirmed" ? "bg-blue-200 text-blue-800" :
           s === "in_progress" ? "bg-purple-200 text-purple-800" :
           "bg-green-200 text-green-800";
  };

  return (
    <div className="space-y-3">
      {showControls && (
        <Card className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1))}>Prev</Button>
            <Button variant="outline" onClick={() => setViewDate(new Date())}>Today</Button>
            <Button variant="outline" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1))}>Next</Button>
            <select className="border border-border rounded p-2 text-sm bg-popover text-foreground" value={filter} onChange={e => setFilter(e.target.value as any)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </Card>
      )}

      <Card className="p-2">
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const dayStr = formatDate(day);
            const dayBookings = filtered.filter(b => b.date === dayStr);
            return (
              <div key={dayStr}
                   onDragOver={(e) => !readOnly && e.preventDefault()}
                   onDrop={(e) => onDrop(e, day)}
                   className="border border-border rounded min-h-[110px] p-2">
                <div className="text-xs font-semibold text-muted-foreground">{day.getDate()}</div>
                <div className="space-y-1 mt-1">
                  {dayBookings.map(b => (
                    <div key={b.id}
                         draggable={!readOnly}
                         onDragStart={(e) => !readOnly && e.dataTransfer.setData("bookingId", b.id)}
                         onClick={() => markViewed("booking", b.id)}
                         className={`text-xs rounded px-2 py-1 ${readOnly ? 'cursor-default' : 'cursor-move'} ${statusColor(b.status)}`}>
                      {b.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
