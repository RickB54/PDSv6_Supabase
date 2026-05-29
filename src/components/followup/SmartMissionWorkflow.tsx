import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, Mail, MessageSquare, CheckCircle2, Clock, 
  Calendar, History, ShieldAlert, Sparkles, AlertTriangle, Zap, Check
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Booking } from '@/store/bookings';
import { Customer } from '@/lib/supa-data';
import { cn } from '@/lib/utils';
import { UnifiedCustomerTimeline } from '@/components/customers/UnifiedCustomerTimeline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SmartMissionWorkflowProps {
  customerFollowUps: any[];
  prospects: Customer[];
  allBookings: Booking[];
  onOpenFollowUp: (customer: any) => void;
  onOpenProspect: (prospect: Customer) => void;
  onMarkComplete: (missionId: string) => void;
}

type MissionType = 'action_required' | 'maintenance' | 'quote_recovery' | 'reactivation';

export interface Mission {
  id: string;
  type: MissionType;
  title: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  vehicle: string;
  lastServiceDate?: Date;
  daysInactive: number;
  priority: 'high' | 'medium' | 'low';
  recommendedAction: string;
  originalRecord: any;
}

export function SmartMissionWorkflow({ 
  customerFollowUps, 
  prospects, 
  allBookings,
  onOpenFollowUp,
  onOpenProspect,
  onMarkComplete
}: SmartMissionWorkflowProps) {
  const [selectedCustomerTimeline, setSelectedCustomerTimeline] = useState<any>(null);

  const missions = useMemo(() => {
    const list: Mission[] = [];
    const today = new Date();

    // 1. Process Customers (Maintenance & Reactivation & Action Required)
    customerFollowUps.forEach(c => {
      const daysSinceLast = differenceInDays(today, new Date(c.lastServiceDate));
      
      let type: MissionType = 'maintenance';
      let priority: 'high' | 'medium' | 'low' = 'low';
      let recommendedAction = 'Send Maintenance Reminder';
      
      if (c.isDue) {
        if (c.daysRemaining < -90) {
          type = 'reactivation';
          priority = 'medium';
          recommendedAction = 'Send Reactivation Offer / Discount';
        } else if (c.daysRemaining < -30) {
          type = 'action_required';
          priority = 'high';
          recommendedAction = 'Call or Send Urgent Reminder';
        } else {
          type = 'maintenance';
          priority = 'medium';
          recommendedAction = 'Send Standard Reminder';
        }

        const vehicleStr = c.vehicleMake 
          ? `${c.vehicleYear || ''} ${c.vehicleMake} ${c.vehicleModel || ''}`.trim() 
          : c.vehicle || 'Unknown Vehicle';

        list.push({
          id: `cust_${c.id}`,
          type,
          title: type === 'reactivation' ? 'Lost Client Recovery' : type === 'action_required' ? 'Overdue Maintenance' : 'Due for Maintenance',
          customerName: c.customer,
          customerEmail: c.customerEmail,
          customerPhone: c.customerPhone,
          vehicle: vehicleStr,
          lastServiceDate: c.lastServiceDate,
          daysInactive: daysSinceLast,
          priority,
          recommendedAction,
          originalRecord: c
        });
      }
    });

    // 2. Process Prospects (Quote Recovery / Lead Nurturing)
    prospects.forEach(p => {
      // Basic heuristic: if prospect is older than 2 days and no booking exists
      const createdDate = (p as any).created_at ? new Date((p as any).created_at) : new Date();
      const daysSinceLead = differenceInDays(today, createdDate);
      
      // Check if they already have a booking (maybe they converted)
      const hasBooking = allBookings.some(b => 
        (b.customerEmail && b.customerEmail.toLowerCase() === p.email?.toLowerCase()) ||
        (b.customer && b.customer.toLowerCase() === p.name.toLowerCase())
      );

      if (!hasBooking && daysSinceLead > 1 && daysSinceLead < 30) {
        const vehicleStr = typeof p.vehicle === 'string' ? p.vehicle : 
                           typeof p.vehicle_info === 'object' ? `${p.vehicle_info?.make || ''} ${p.vehicle_info?.model || ''}` : 'Unknown';
        
        list.push({
          id: `prospect_${p.id}`,
          type: 'quote_recovery',
          title: 'Lead Nurturing',
          customerName: p.name,
          customerEmail: p.email || '',
          customerPhone: p.phone,
          vehicle: vehicleStr,
          daysInactive: daysSinceLead,
          priority: daysSinceLead > 7 ? 'medium' : 'high',
          recommendedAction: 'Send Follow-Up / Welcome Offer',
          originalRecord: p
        });
      }
    });

    // Sort by priority then days inactive
    return list.sort((a, b) => {
      const pMap = { high: 3, medium: 2, low: 1 };
      if (pMap[a.priority] !== pMap[b.priority]) {
        return pMap[b.priority] - pMap[a.priority];
      }
      return b.daysInactive - a.daysInactive;
    });
  }, [customerFollowUps, prospects, allBookings]);

  const stats = {
    total: missions.length,
    high: missions.filter(m => m.priority === 'high').length,
    reactivation: missions.filter(m => m.type === 'reactivation').length,
    leads: missions.filter(m => m.type === 'quote_recovery').length,
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const getIcon = (type: MissionType) => {
    switch (type) {
      case 'action_required': return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'maintenance': return <Sparkles className="h-5 w-5 text-blue-400" />;
      case 'quote_recovery': return <Zap className="h-5 w-5 text-purple-400" />;
      case 'reactivation': return <ShieldAlert className="h-5 w-5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HUD Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2">Total Missions</p>
            <div className="text-4xl font-black text-white">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/20 backdrop-blur-xl">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase text-red-500 tracking-widest mb-2">Action Required</p>
            <div className="text-4xl font-black text-red-500">{stats.high}</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5 border-purple-500/20 backdrop-blur-xl">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase text-purple-500 tracking-widest mb-2">Lead Recovery</p>
            <div className="text-4xl font-black text-purple-500">{stats.leads}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20 backdrop-blur-xl">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-2">Reactivation</p>
            <div className="text-4xl font-black text-amber-500">{stats.reactivation}</div>
          </CardContent>
        </Card>
      </div>

      {/* Mission Feed */}
      <div className="space-y-4">
        <h2 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" /> Today's Action Items
        </h2>
        
        {missions.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-3xl">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4 opacity-50" />
            <h3 className="text-2xl font-black text-zinc-600 uppercase italic">All Clear</h3>
            <p className="text-zinc-500 font-medium">No pending follow-up missions for today.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {missions.map(mission => (
              <div 
                key={mission.id} 
                className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col lg:flex-row gap-6 hover:bg-zinc-800/80 transition-colors shadow-xl relative overflow-hidden group"
              >
                {/* Priority Ribbon */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1.5",
                  mission.priority === 'high' ? 'bg-red-500' : mission.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                )} />

                <div className="flex-1 flex flex-col md:flex-row gap-6">
                  {/* Left: Identity */}
                  <div className="min-w-[250px]">
                    <div className="flex items-center gap-2 mb-2">
                      {getIcon(mission.type)}
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{mission.title}</span>
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-1 truncate">{mission.customerName}</h3>
                    <p className="text-xs font-bold text-zinc-500 flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5" /> {mission.customerEmail || 'No Email'}
                    </p>
                    {mission.customerPhone && (
                      <p className="text-xs font-bold text-zinc-500 flex items-center gap-1.5 mt-1 truncate">
                        <Phone className="h-3.5 w-3.5" /> {mission.customerPhone}
                      </p>
                    )}
                  </div>

                  {/* Middle: Details */}
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Vehicle</p>
                      <p className="text-sm font-black text-zinc-300 truncate">{mission.vehicle}</p>
                    </div>
                    <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Status</p>
                      <p className="text-sm font-black text-zinc-300">Inactive {mission.daysInactive} Days</p>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 justify-center min-w-[200px]">
                  <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest w-fit lg:mx-auto mb-2", getPriorityColor(mission.priority))}>
                    {mission.priority} Priority
                  </Badge>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        if (mission.type === 'quote_recovery') {
                          onOpenProspect(mission.originalRecord);
                        } else {
                          onOpenFollowUp(mission.originalRecord);
                        }
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase"
                    >
                      Action
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setSelectedCustomerTimeline({
                        id: mission.type === 'quote_recovery' ? mission.originalRecord.id : mission.originalRecord.customerId,
                        name: mission.customerName,
                        email: mission.customerEmail,
                        phone: mission.customerPhone
                      })}
                      className="flex-1 bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300 text-xs font-black uppercase"
                    >
                      <History className="h-4 w-4 mr-1.5" /> Timeline
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => onMarkComplete(mission.id)}
                    className="w-full text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold"
                  >
                    <Check className="h-4 w-4 mr-1.5" /> Dismiss / Done
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Timeline Modal */}
      <Dialog open={!!selectedCustomerTimeline} onOpenChange={(open) => !open && setSelectedCustomerTimeline(null)}>
        <DialogContent className="max-w-4xl bg-zinc-950 border-zinc-800 p-0 h-[85vh] flex flex-col">
          <DialogHeader className="p-6 border-b border-zinc-800 shrink-0">
            <DialogTitle className="text-xl font-black uppercase italic flex items-center gap-3">
              <History className="h-5 w-5 text-blue-500" />
              Unified Timeline: <span className="text-blue-500">{selectedCustomerTimeline?.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            {selectedCustomerTimeline && (
              <UnifiedCustomerTimeline 
                customer={selectedCustomerTimeline} 
                allBookings={allBookings} 
                handlePreviewEmailForBooking={() => {}} 
                navigate={() => {}} 
                toast={(msg) => console.log(msg)} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
