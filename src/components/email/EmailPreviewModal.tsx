import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Mail, Check, X, Shield, Package } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmailPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'confirmation' | 'request' | 'cancelled' | 'reminder' | 'payment-success'
  data: any
}

export function EmailPreviewModal({ open, onOpenChange, type, data }: EmailPreviewModalProps) {
  if (!data) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-zinc-950 border-zinc-800 overflow-hidden flex flex-col rounded-3xl max-h-[92vh]">
        <DialogHeader className="p-6 bg-zinc-900/50 border-b border-zinc-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Mail className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-white uppercase tracking-tight">
                  Email Preview: {
                    type === 'confirmation' ? 'Booking Approved' :
                    type === 'request' ? 'Request Received' :
                    type === 'cancelled' ? 'Job Cancelled' :
                    type === 'reminder' ? '6-Month Follow-up' :
                    'Service Complete'
                  }
                </DialogTitle>
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Administrative Verification Mode</div>
              </div>
            </div>
            <Badge variant="outline" className={cn(
              "px-3 py-1 font-black uppercase tracking-tighter",
              type === 'confirmation' ? "border-green-500 text-green-700 bg-green-500/10" :
              type === 'cancelled' ? "border-red-500 text-red-700 bg-red-500/10" :
              "border-indigo-500 text-indigo-400 bg-indigo-500/10"
            )}>
              {type}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-900/20">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200">
            {/* Header Email Branding */}
            <div className={cn(
              "p-8 text-center text-white",
              type === 'confirmation' ? "bg-gradient-to-r from-blue-800 to-blue-600" :
              type === 'cancelled' ? "bg-gradient-to-r from-red-800 to-red-600" :
              "bg-gradient-to-r from-zinc-800 to-zinc-600"
            )}>
              <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">
                {type === 'confirmation' ? 'Booking Confirmed!' :
                 type === 'cancelled' ? 'Service Cancelled' :
                 'Request Received'}
              </h1>
              <p className="text-blue-100 text-xs font-bold opacity-80 uppercase tracking-widest">Prime Auto Detail • Intelligence Engine</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <p className="text-zinc-800 font-bold">Hello {data.customer || 'Customer'},</p>
                <p className="text-zinc-600 text-sm leading-relaxed">
                  {type === 'confirmation' ? "Great news! Your booking has been approved and scheduled. We're excited to get your vehicle back to its prime condition." :
                   type === 'cancelled' ? "This email is to confirm that your booking has been cancelled as per your request or administrative update." :
                   "We've received your service request. Our team is reviewing the details and will contact you shortly to confirm the appointment."}
                </p>
              </div>

              {/* Service Details Card */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-200 pb-2 mb-2">
                  <Package className="w-4 h-4 text-zinc-400" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Service Itinerary</span>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">Service Package</label>
                    <span className="text-sm font-bold text-zinc-900">{data.service || 'Premium Detail'}</span>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">Vehicle</label>
                    <span className="text-sm font-bold text-zinc-900">{data.vehicle || `${data.vehicleYear || ''} ${data.vehicleMake || ''} ${data.vehicleModel || ''}`}</span>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">Appointment Time</label>
                    <span className="text-sm font-bold text-zinc-900">{data.time || '09:00 AM'}</span>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase block mb-1">Location</label>
                    <span className="text-sm font-bold text-zinc-900 truncate">{data.address || 'Mobile Service'}</span>
                  </div>
                </div>

                {data.addons?.length > 0 && (
                  <div className="pt-2">
                    <label className="text-[9px] font-black text-zinc-400 uppercase block mb-2">Selected Add-ons</label>
                    <div className="flex flex-wrap gap-2">
                      {data.addons.map((addon: any, i: number) => (
                        <span key={i} className="text-[10px] bg-white border border-zinc-200 px-2 py-1 rounded text-zinc-600 font-bold">{addon.name || addon}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Note section */}
              {data.notes && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-3 h-3 text-amber-600" />
                    <span className="text-[9px] font-black text-amber-600 uppercase">Important Client Note</span>
                  </div>
                  <p className="text-xs text-amber-800 italic leading-relaxed">"{data.notes}"</p>
                </div>
              )}

              <div className="pt-8 border-t border-zinc-100 text-center">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mb-4">Prime Auto Detail & Coatings</p>
                <div className="flex justify-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
