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
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function formatDate(d: Date) { return d.toISOString().split('T')[0]; }

export default function Bookings() {
  const { items, add, update, refresh: refreshBookings } = useBookingsStore();
  const [viewDate, setViewDate] = useState(new Date());
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const user = getCurrentUser();
  const canEdit = user?.role === 'admin';

  useEffect(() => {
    refreshBookings();
    const interval = setInterval(refreshBookings, 5000); // Auto refresh for real-time visibility
    return () => clearInterval(interval);
  }, [refreshBookings]);

  const start = startOfMonth(viewDate);
  const end = endOfMonth(viewDate);
  const days = Array.from({ length: end.getDate() }, (_, i) => new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1));

  const filtered = useMemo(() => items.filter(b => filter === "all" || b.status === filter), [items, filter]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>, day: Date) => {
    const id = e.dataTransfer.getData("bookingId");
    const booking = items.find(b => b.id === id);
    if (booking) update(id, { date: formatDate(day) });
  };

  const statusColor = (b: Booking) => {
    if (b.status === "pending" && b.bookedBy === 'Customer Web') return "bg-cyan-200 text-cyan-900 border border-cyan-400";
    return b.status === "pending" ? "bg-yellow-200 text-yellow-800" :
      b.status === "confirmed" ? "bg-blue-200 text-blue-800" :
        b.status === "in_progress" ? "bg-purple-200 text-purple-800" :
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
            <Button variant="outline" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>Prev</Button>
            <Button variant="outline" onClick={() => setViewDate(new Date())}>Today</Button>
            <Button variant="outline" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>Next</Button>
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
                        className={`text-[10px] rounded px-1.5 py-0.5 shadow-sm font-medium ${canEdit ? 'cursor-move' : 'cursor-default'} ${statusColor(b)}`}>
                        <div className="flex justify-between items-center gap-1">
                          <span className="truncate">{b.customer || b.title}</span>
                          {b.status === 'pending' && b.bookedBy === 'Customer Web' && canEdit && (
                            <button
                              onClick={(e) => { e.stopPropagation(); update(b.id, { status: 'confirmed' }); }}
                              className="bg-white/50 hover:bg-white px-1 rounded text-[10px] font-bold text-cyan-900"
                            >
                              OK
                            </button>
                          )}
                        </div>
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
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(b => (
                <div key={b.id} className={`flex items-center justify-between border-b border-border p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer ${b.bookedBy === 'Customer Web' && b.status === 'pending' ? 'bg-cyan-50/50 border-cyan-100' : ''}`} onClick={() => markViewed("booking", b.id)}>
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-2 h-2 rounded-full ${b.status === 'confirmed' ? 'bg-blue-500' : b.status === 'pending' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{b.customer || 'Unknown Customer'}</span>
                      <span className="text-xs text-muted-foreground">{b.title} {b.bookedBy === 'Customer Web' && <span className="text-cyan-600 font-bold ml-1 text-[10px] uppercase">[From Website]</span>}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusColor(b)}`}>{b.status.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground font-medium">{b.date}</div>
                    {b.status === 'pending' && canEdit && (
                      <Button
                        size="sm"
                        variant={b.bookedBy === 'Customer Web' ? "default" : "outline"}
                        className={b.bookedBy === 'Customer Web' ? "bg-cyan-600 hover:bg-cyan-700 h-8" : "h-8"}
                        onClick={(e) => { e.stopPropagation(); update(b.id, { status: 'confirmed' }); }}
                      >
                        {b.bookedBy === 'Customer Web' ? "Approve" : "Confirm"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
