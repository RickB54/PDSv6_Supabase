import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, Printer, AlertTriangle, ShieldCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';

interface CRMSOPModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CRMSOPModal: React.FC<CRMSOPModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [activePage, setActivePage] = useState<number>(0); // 0 = All Pages, 1-5 = Page N

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 15;

      const addHeader = (title: string, sub: string) => {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(title, 14, currentY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(sub, 14, currentY + 5);
        doc.setDrawColor(226, 232, 240);
        doc.line(14, currentY + 8, pageWidth - 14, currentY + 8);
        return currentY + 14;
      };

      currentY = addHeader('CRM Standard Operating Procedures', 'Version 3 | June 2026 | Generated from Gemini code analysis');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('UNIVERSAL RULES (apply to ALL four channels)', 14, currentY);
      currentY += 7;

      const rules = [
        '1. Always search before booking. Go to Customer Profiles and search by name, phone, or email before creating any booking.',
        '2. Always book from the customer card. Use the green Book Job button on the customer card to guarantee perfect database link.',
        '3. Booking Lifecycle panel is your confirmation. Verify the right panel shows the job after creating any booking.',
        '4. Log Activity is your default. For 90% of daily interactions (calls, texts, voicemails), use Log Activity. One line is enough.'
      ];

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      rules.forEach(r => {
        const split = doc.splitTextToSize(r, pageWidth - 28);
        doc.text(split, 14, currentY);
        currentY += split.length * 4.5 + 2;
      });

      doc.save('CRM_Standard_Operating_Procedures_v3.pdf');
      toast({ title: 'PDF Exported', description: 'CRM Standard Operating Procedures downloaded successfully.' });
    } catch (e: any) {
      toast({ title: 'Export Failed', description: 'Could not generate PDF download.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] bg-zinc-950 border-purple-500/30 text-white shadow-2xl rounded-2xl p-0 overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <DialogHeader className="p-4 md:p-6 bg-zinc-900/90 border-b border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                <FileText className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg md:text-xl font-black text-white tracking-tight">
                CRM Standard Operating Procedures
              </DialogTitle>
              <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 bg-indigo-950/40 text-[10px] font-bold">
                Version 3 | June 2026
              </Badge>
            </div>
            <DialogDescription className="text-xs text-zinc-400 mt-1">
              Official reference guide for customer profile lookup, job booking channels, activity logging, and duplicate cleanup.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPDF}
              className="h-8 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 font-semibold"
            >
              <Download className="h-3.5 w-3.5 mr-1 text-indigo-400" /> Save PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="h-8 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 font-semibold"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-purple-400" /> Print
            </Button>
          </div>
        </DialogHeader>

        {/* Page Filter Bar */}
        <div className="bg-zinc-900/50 border-b border-zinc-800 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActivePage(0)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                activePage === 0 ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              Full Document (5 Pages)
            </button>
            {[1, 2, 3, 4, 5].map(p => (
              <button
                key={p}
                onClick={() => setActivePage(p)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  activePage === p ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                Page {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 shrink-0 text-xs text-zinc-400 font-semibold">
            <span>Viewing: {activePage === 0 ? 'All 5 Pages' : `Page ${activePage} of 5`}</span>
          </div>
        </div>

        {/* Document Content Scroll View */}
        <ScrollArea className="flex-1 p-4 md:p-8 bg-zinc-950 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-8 pb-8">

            {/* PAGE 1 */}
            {(activePage === 0 || activePage === 1) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">CRM Standard Operating Procedures</h1>
                    <p className="text-xs text-zinc-400 mt-1 font-mono">Version 3 | June 2026 | Generated from Gemini code analysis</p>
                  </div>
                  <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 font-mono text-xs">PAGE 1 OF 5</Badge>
                </div>

                {/* Universal Rules */}
                <div className="space-y-4">
                  <h2 className="text-lg font-black text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> UNIVERSAL RULES (apply to ALL four channels)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-1">
                      <span className="text-xs font-bold text-indigo-400 uppercase block">Rule 1 — Always Search First</span>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Go to <strong>Customer Profiles</strong> and search by name, phone, or email before creating any booking. This prevents duplicate records.
                      </p>
                    </div>

                    <div className="bg-zinc-950 p-4 rounded-xl border border-emerald-500/30 space-y-1">
                      <span className="text-xs font-bold text-emerald-400 uppercase block">Rule 2 — Book From Customer Card</span>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Use the green <strong>Book Job</strong> button on the customer card—never go to the Bookings page directly for a known customer. Booking from the card pre-fills their exact database ID.
                      </p>
                    </div>

                    <div className="bg-zinc-950 p-4 rounded-xl border border-blue-500/30 space-y-1">
                      <span className="text-xs font-bold text-blue-400 uppercase block">Rule 3 — Lifecycle Panel Confirmation</span>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        After any booking is created, check the <strong>Booking Lifecycle panel</strong> on the right side of the customer card to verify the job is linked correctly.
                      </p>
                    </div>

                    <div className="bg-zinc-950 p-4 rounded-xl border border-purple-500/30 space-y-1">
                      <span className="text-xs font-bold text-purple-400 uppercase block">Rule 4 — Log Activity is Default</span>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        For 90% of daily interactions (calls, texts, voicemails, notes), use <strong>Log Activity</strong> on the customer card. One line is enough.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Channel 1 */}
                <div className="space-y-3 pt-4 border-t border-zinc-800">
                  <h2 className="text-lg font-black text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    CHANNEL 1 — PHONE CALL INTAKE
                  </h2>
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <span className="text-xs font-bold text-blue-300 block">Recommended Flow (Best Way):</span>
                    <ol className="text-xs text-zinc-300 space-y-1.5 list-decimal pl-5 leading-relaxed">
                      <li>Go to <strong>Customer Profiles</strong> → search by name, phone, or email.</li>
                      <li>If found → open their card. If not found → click <strong>+ Add</strong>, create profile, save it.</li>
                      <li>On their card → tap <strong>Log Activity</strong> → enter quick note (e.g. <em>"Inbound call — wants full interior Thursday"</em>).</li>
                      <li>On their card → tap the green <strong>Book Job</strong> button.</li>
                      <li>Fill in date, service, vehicle, price → add a booking note for anything job-specific → <strong>Save</strong>.</li>
                      <li>Verify the <strong>Booking Lifecycle panel</strong> on the right shows the job.</li>
                    </ol>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-400 uppercase text-[10px] block">Rush Flow Warning:</strong>
                      If creating directly from Admin Bookings page, system auto-matches by Email → Name → Phone. If customer uses a different email/phone than on file, a duplicate prospect is created.
                    </div>
                  </div>

                  <div className="bg-blue-950/40 border border-blue-500/30 p-3 rounded-xl text-center text-xs font-mono text-blue-300">
                    <strong>The Rule:</strong> Search → open card → Log Activity → Book Job button → confirm Booking Lifecycle panel
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 2 */}
            {(activePage === 0 || activePage === 2) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Channels 2 & 3 Procedures</h2>
                  <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 font-mono text-xs">PAGE 2 OF 5</Badge>
                </div>

                {/* Channel 2 */}
                <div className="space-y-3">
                  <h3 className="text-lg font-black text-purple-400 uppercase tracking-wider flex items-center gap-2">
                    CHANNEL 2 — WEBSITE / EMAIL INQUIRY
                  </h3>
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <span className="text-xs font-bold text-purple-300 block">Recommended Flow (Best Way):</span>
                    <ol className="text-xs text-zinc-300 space-y-1.5 list-decimal pl-5 leading-relaxed">
                      <li>Read the inquiry fully — note name, vehicle, service interest, date preference, contact info.</li>
                      <li>Go to <strong>Customer Profiles</strong> → search by name AND by email.</li>
                      <li>If found → open their card. If not → create new.</li>
                      <li>Tap <strong>Log Activity</strong> → note the inquiry (e.g. <em>"Inbound email — wants full detail, prefers Thursday"</em>).</li>
                      <li>Reply via <strong>Engagement Hub</strong> — offer 1–2 available time slots (auto-logs reply in Correspondences).</li>
                      <li>Once customer confirms → tap green <strong>Book Job</strong> button on their card.</li>
                      <li>Fill in job details → save → tap <strong>Log Activity</strong> again → <em>"Customer confirmed — booked for [date]"</em>.</li>
                    </ol>
                  </div>
                  <div className="bg-purple-950/40 border border-purple-500/30 p-2.5 rounded-xl text-center text-xs font-mono text-purple-300">
                    <strong>The Rule:</strong> Search → Log Activity (inquiry) → Engagement Hub (reply) → Book Job button → Log Activity (confirmation)
                  </div>
                </div>

                {/* Channel 3 */}
                <div className="space-y-3 pt-4 border-t border-zinc-800">
                  <h3 className="text-lg font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    CHANNEL 3 — DIRECT / ADMIN BOOKING
                  </h3>
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <span className="text-xs font-bold text-emerald-300 block">Recommended Flow (Best Way):</span>
                    <ol className="text-xs text-zinc-300 space-y-1.5 list-decimal pl-5 leading-relaxed">
                      <li>Go to <strong>Customer Profiles</strong> → search first, even if you're certain who it is.</li>
                      <li>Open their card → tap green <strong>Book Job</strong> button.</li>
                      <li>Fill in service, date, vehicle, price → add a booking note if anything unusual applies → <strong>Save</strong>.</li>
                      <li>Verify the <strong>Booking Lifecycle panel</strong> shows the job.</li>
                      <li>Tap <strong>Log Activity</strong> → note how the booking came in (e.g. <em>"Walk-in"</em>, <em>"Outbound call — booked full detail Friday"</em>).</li>
                    </ol>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-xs text-red-200">
                    <strong>⚠️ WARNING:</strong> Never start a booking from the Admin Bookings page for a known customer. The Book Job button on their card is the ONLY guaranteed way to link the booking correctly in the database.
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 3 */}
            {(activePage === 0 || activePage === 3) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Channel 4 & Customer Card Guide</h2>
                  <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 font-mono text-xs">PAGE 3 OF 5</Badge>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    CHANNEL 4 — ONLINE BOOKING (AUTOMATIC)
                  </h3>
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <span className="text-xs font-bold text-cyan-300 block">3-Tier Cascade Match System:</span>
                    <ul className="text-xs text-zinc-300 space-y-1 list-disc pl-5">
                      <li><strong>Tier 1:</strong> Exact email match</li>
                      <li><strong>Tier 2:</strong> Name match (if no email match)</li>
                      <li><strong>Tier 3:</strong> Phone number match, strips formatting (if no name match)</li>
                    </ul>
                    <p className="text-xs text-zinc-400 pt-1">
                      If any match succeeds, booking links automatically. Your only actions: confirm calendar landing, check Lifecycle panel, and optionally Log Activity.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-zinc-800">
                  <h3 className="text-lg font-black text-amber-400 uppercase tracking-wider">Customer Card Timeline Tabs</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-zinc-300 border border-zinc-800">
                      <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-800">
                        <tr>
                          <th className="p-2.5">Tab</th>
                          <th className="p-2.5">What It Shows</th>
                          <th className="p-2.5">Database Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-400">All Data</td>
                          <td className="p-2.5">Everything combined — bookings AND engagements. Always keep on this tab.</td>
                          <td className="p-2.5 font-mono text-zinc-400">bookings + engagements</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-emerald-400">Bookings</td>
                          <td className="p-2.5">Only booking records linked to this customer.</td>
                          <td className="p-2.5 font-mono text-zinc-400">bookings table</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-purple-400">Notes</td>
                          <td className="p-2.5">Only Admin Directives permanent notes. Must click Save Customer.</td>
                          <td className="p-2.5 font-mono text-zinc-400">customers.notes</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-blue-400">Correspondences</td>
                          <td className="p-2.5">Only entries made via Engagement Hub (formal emails/messages).</td>
                          <td className="p-2.5 font-mono text-zinc-400">engagements table</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-cyan-400">Activities</td>
                          <td className="p-2.5">Only entries made via Log Activity (calls, texts, voicemails).</td>
                          <td className="p-2.5 font-mono text-zinc-400">engagements table</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 4 */}
            {(activePage === 0 || activePage === 4) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Feature Matrix & Daily Order of Operations</h2>
                  <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 font-mono text-xs">PAGE 4 OF 5</Badge>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-black text-indigo-400 uppercase tracking-wider">Feature Use Cases</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <strong className="text-purple-400 block mb-1">Engagement Hub</strong>
                      Sending detailed email or formal message to customer. Feeds into Correspondences tab.
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <strong className="text-blue-400 block mb-1">Log Activity</strong>
                      Any quick touchpoint (calls, texts, voicemails). Default 90% of the time. Feeds into Activities tab.
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <strong className="text-amber-400 block mb-1">Admin Directives & Notes</strong>
                      Permanent must-see rules (gate codes, special instructions). Feeds into Notes tab.
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <strong className="text-emerald-400 block mb-1">Write Letter</strong>
                      Generating formal PDF letterhead document (rare). PDF output only.
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-zinc-800">
                  <h3 className="text-lg font-black text-emerald-400 uppercase tracking-wider">Every Time You Open a Customer Card</h3>
                  <ol className="text-xs text-zinc-300 space-y-2 list-decimal pl-5 leading-relaxed">
                    <li><strong>Check Admin Directives first</strong> — read any permanent warnings or rules before doing anything else.</li>
                    <li><strong>Glance at Booking Lifecycle panel (right side)</strong> — confirms whether a booking is properly linked.</li>
                    <li><strong>Keep timeline on "All Data"</strong> — full chronological story.</li>
                    <li><strong>Tap Log Activity for any call, text, or touchpoint</strong> — one line, your default action.</li>
                    <li><strong>Use Engagement Hub only for formal emails</strong> (more than two sentences sent to customer).</li>
                    <li><strong>Always use Book Job button</strong> to create bookings — never the Bookings page directly.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* PAGE 5 */}
            {(activePage === 0 || activePage === 5) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Fixing Issues & Cleanup Procedures</h2>
                  <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 font-mono text-xs">PAGE 5 OF 5</Badge>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-black text-red-400 uppercase tracking-wider">Fixing Empty Timeline Tabs</h3>
                  
                  <div className="bg-zinc-950 p-4 rounded-xl border border-red-500/30 space-y-2 text-xs">
                    <strong className="text-red-400 block">Issue: Bookings tab is empty</strong>
                    <p className="text-zinc-300">The booking was created from the Bookings page directly, not via Book Job on the card — database link is broken.</p>
                    <p className="text-emerald-400 font-semibold">
                      <strong>Fix:</strong> Open booking → Edit → use "Select Customer" dropdown → choose correct customer → save.
                    </p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-amber-500/30 space-y-2 text-xs">
                    <strong className="text-amber-400 block">Issue: Notes tab is empty</strong>
                    <p className="text-zinc-300">The Notes tab only shows Admin Directives. Log Activity entries do NOT appear here.</p>
                    <p className="text-emerald-400 font-semibold">
                      <strong>Fix:</strong> Click "+ Add Note" in Admin Directives section → type note → click Save Customer.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-zinc-800">
                  <h3 className="text-lg font-black text-purple-400 uppercase tracking-wider">Duplicate Customer Cleanup Procedure</h3>
                  <p className="text-xs text-zinc-400">If a duplicate record was created for any reason:</p>
                  <ol className="text-xs text-zinc-300 space-y-1.5 list-decimal pl-5 leading-relaxed">
                    <li>Open the orphaned booking.</li>
                    <li>Click <strong>Edit</strong> → use <strong>Select Customer</strong> dropdown → choose correct master profile → save.</li>
                    <li>Go to <strong>Customer Profiles</strong> → find the duplicate Prospect record.</li>
                    <li>Verify it has no other data you want to keep → <strong>Delete</strong> it.</li>
                  </ol>
                </div>

                <div className="pt-6 border-t border-zinc-800 text-center text-xs text-zinc-500 font-mono">
                  Prime Auto Detailing Systems | CRM SOP v3 | June 2026 Procedures verified against app code
                </div>
              </div>
            )}

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
