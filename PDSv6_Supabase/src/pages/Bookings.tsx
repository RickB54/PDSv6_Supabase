import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, Circle, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { markViewed } from "@/lib/viewTracker";
import { useBookingsStore, Booking, BookingStatus } from "@/store/bookings";
import { getCurrentUser } from "@/lib/auth";

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function formatDate(d: Date) { return d.toISOString().split('T')[0]; }

export default function Bookings() {
  const { items, add, update } = useBookingsStore();
  const [viewDate, setViewDate] = useState(new Date());
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const user = getCurrentUser();
  const canEdit = user?.role === 'admin';

  // Remove sample booking seeding; show empty state until real bookings are added

  const start = startOfMonth(viewDate);
  const end = endOfMonth(viewDate);
  const days = Array.from({ length: end.getDate() }, (_, i) => new Date(viewDate.getFullYear(), viewDate.getMonth(), i+1));

  const filtered = useMemo(() => items.filter(b => filter === "all" || b.status === filter), [items, filter]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>, day: Date) => {
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
    <div>
      <PageHeader title="Bookings" />
      <div className="p-4 space-y-6">
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold">Calendar</h2>
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
            {canEdit && (
              <Button asChild className="bg-gradient-hero">
                <Link to="/book">
                  <Plus className="h-4 w-4 mr-2" /> New Booking
                </Link>
              </Button>
            )}
          </div>
        </Card>

        {/* Month grid with drag-to-reschedule */}
        <Card className="p-2">
  <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {days.map(day => {
              const dayStr = formatDate(day);
              const dayBookings = filtered.filter(b => b.date === dayStr);
              return (
                <div key={dayStr}
                     onDragOver={(e) => canEdit && e.preventDefault()}
                     onDrop={(e) => canEdit ? onDrop(e, day) : undefined}
                     className="border border-border rounded min-h-[110px] p-2">
                  <div className="text-xs font-semibold text-muted-foreground">{day.getDate()}</div>
                  <div className="space-y-1 mt-1">
                    {dayBookings.map(b => (
                      <div key={b.id}
                           draggable={canEdit}
                           onDragStart={(e) => canEdit && e.dataTransfer.setData("bookingId", b.id)}
                           onClick={() => markViewed("booking", b.id)}
                           className={`text-xs rounded px-2 py-1 ${canEdit ? 'cursor-move' : 'cursor-default'} ${statusColor(b.status)}`}>
                        {b.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* List view */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">List View</h3>
          <div className="space-y-2">
            {[...filtered]
              .sort((a,b) => b.date.localeCompare(a.date))
              .map(b => (
              <div key={b.id} className="flex items-center justify-between border-b border-border pb-2 cursor-pointer" onClick={() => markViewed("booking", b.id)}>
                <div className="flex items-center gap-2">
                  <Circle className="h-3 w-3" />
                  <span className="text-sm font-medium">{b.title}</span>
                  <span className={`text-xs px-2 py-1 rounded ${statusColor(b.status)}`}>{b.status.replace('_', ' ')}</span>
                </div>
                <div className="text-sm text-muted-foreground">{b.date}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
