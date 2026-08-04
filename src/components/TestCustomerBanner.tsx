import React, { useEffect, useState, useRef } from 'react';
import supabase from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, RefreshCw, HelpCircle, CheckCircle2, FileText } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { deleteSupabaseCustomer, auditTestCustomer } from '@/lib/supa-data';
import { savePDFToArchive } from '@/lib/pdfArchive';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const TestCustomerBanner = () => {
  const [rickId, setRickId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [wipeResult, setWipeResult] = useState<{ msg: string; details: string | null } | null>(null);
  const navigate = useNavigate();

  // Dragging state
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  
  const isDemoMode = localStorage.getItem('demo_mode_active') === 'true';

  const handlePointerDown = (e: React.PointerEvent) => {
    // Prevent dragging if clicking a button
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[role="dialog"]')) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: offset.x,
      initialY: offset.y
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({
      x: dragStart.current.initialX + dx,
      y: dragStart.current.initialY + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (isDemoMode) return;
    const checkTestAccount = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, full_name')
          .ilike('full_name', '%Rick Berube%')
          .limit(1)
          .maybeSingle();
        
        if (data) {
          setRickId(data.id);
        } else {
          setRickId(null);
        }
      } catch (err) {
        console.error('Failed to check for test account:', err);
      }
    };

    checkTestAccount();
    
    // Listen for customer additions/updates to recheck
    const interval = setInterval(checkTestAccount, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleWipe = async () => {
    if (!rickId) return;
    setIsDeleting(true);
    toast({ title: "Wiping Test Data", description: "Executing specialized wipeout sequence..." });
    try {
      const res = await deleteSupabaseCustomer(rickId);
      setRickId(null);
      
      let msg = "All test data successfully wiped. Analytics restored.";
      let details = null;
      if (res?.affectedData) {
        const { bookings, estimates, invoices, vehicles, engagements, manual_income, expenses, payments, payroll, type } = res.affectedData;
        const parts = [];
        if (bookings > 0) parts.push(`${bookings} bookings`);
        if (estimates > 0) parts.push(`${estimates} estimates`);
        if (invoices > 0) parts.push(`${invoices} invoices`);
        if (vehicles > 0) parts.push(`${vehicles} vehicles`);
        if (engagements > 0) parts.push(`${engagements} engagements`);
        if (manual_income > 0) parts.push(`${manual_income} manual income entries`);
        if (expenses > 0) parts.push(`${expenses} expenses`);
        if (payments > 0) parts.push(`${payments} payments`);
        if (payroll > 0) parts.push(`${payroll} payroll records`);
        if (parts.length > 0) {
            details = `The following test data were ${type}: ${parts.join(', ')}.`;
        }
      }
      
      // Clean up localStorage checklist_sessions just in case
      try {
        const sessions = JSON.parse(localStorage.getItem('checklist_sessions') || '[]');
        const filtered = sessions.filter((s: any) => s.customerName !== 'Rick Berube Test' && s.customerName !== 'Rick Berube' && s.customerName !== 'Unknown Customer' && s.customerName !== 'Walk-In Customer');
        localStorage.setItem('checklist_sessions', JSON.stringify(filtered));
      } catch(e) {}

      setWipeResult({ msg, details });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to wipe data", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAudit = async () => {
    if (!rickId) return;
    setIsAuditing(true);
    toast({ title: "Generating Audit...", description: "Scanning test data footprint..." });
    try {
      const data = await auditTestCustomer(rickId);
      
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(220, 38, 38); // Red
      doc.text("RBT Sandbox Audit Log", 105, 20, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 28, { align: "center" });
      doc.text(`Customer Name: ${data.customerName}`, 105, 34, { align: "center" });

      autoTable(doc, {
        startY: 45,
        head: [['Data Type', 'Records Created']],
        body: [
          ['Bookings', data.bookings],
          ['Estimates', data.estimates],
          ['Invoices', data.invoices],
          ['Vehicles', data.vehicles],
          ['Engagements', data.engagements],
          ['Manual Income', data.manual_income],
          ['Company Expenses', data.expenses],
          ['Employee Payments', data.payments],
          ['Payroll Records', data.payroll],
        ],
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] }
      });

      const pdfDataUrl = doc.output('datauristring');
      
      savePDFToArchive(
        "Admin Updates", // use Admin Updates so it doesn't trigger a UI alert
        data.customerName,
        rickId,
        pdfDataUrl,
        { fileName: `RBT_Audit_Log_${new Date().toISOString().slice(0,10)}.pdf`, silent: true }
      );

      toast({ title: "Audit Complete", description: "Audit PDF saved to File Manager (Admin Updates folder)." });
    } catch (err: any) {
      toast({ title: "Audit Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsAuditing(false);
    }
  };

  if (!rickId || isDemoMode) return null;

  return (
    <>
      <AlertDialog open={isDeleting}>
        <AlertDialogContent className="bg-black/95 border border-red-500/50 shadow-2xl flex flex-col items-center justify-center py-12 z-[100000]">
          <RefreshCw className="h-16 w-16 animate-spin text-red-500 mb-6" />
          <h2 className="text-3xl font-black uppercase tracking-widest text-red-400 text-center mb-2">Wiping Test Data</h2>
          <p className="text-zinc-400 text-center font-medium text-lg">Please wait while the sandbox is completely cleared...</p>
          <p className="text-red-500/80 text-sm mt-4 animate-pulse font-bold">DO NOT CLOSE THIS PAGE</p>
        </AlertDialogContent>
      </AlertDialog>
      <style>
      {`
        @keyframes slow-glow {
          0%, 100% { box-shadow: 0 0 10px rgba(220, 38, 38, 0.3); }
          50% { box-shadow: 0 0 25px rgba(220, 38, 38, 0.7); }
        }
        .animate-slow-glow {
          animation: slow-glow 4s ease-in-out infinite;
        }
      `}
      </style>
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        className={`fixed bottom-6 left-6 z-[9999] bg-red-600/95 backdrop-blur-md border border-red-400 rounded-xl p-3 flex flex-col gap-2.5 text-white w-[280px] animate-slow-glow ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'} touch-none transition-shadow`}
      >
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 bg-red-900/50 rounded-full shrink-0">
            <AlertTriangle className="h-4 w-4 text-white" />
          </div>
          <div className="pr-1 flex-1">
            <h3 className="font-black text-xs uppercase tracking-wider text-white mb-0.5 whitespace-nowrap">🧪 Test Data Active</h3>
            <p className="text-[10px] text-red-100 font-medium leading-tight">
              Test account is altering analytics.
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            disabled={isAuditing}
            onClick={(e) => { e.stopPropagation(); handleAudit(); }}
            className="h-6 px-2 bg-black/20 hover:bg-black/40 text-[9px] font-bold text-white border border-white/20 shrink-0 transition-colors"
          >
            {isAuditing ? <RefreshCw className="h-2 w-2 mr-1 animate-spin" /> : <FileText className="h-2 w-2 mr-1" />}
            Audit
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              const event = new CustomEvent('open-help', { detail: 'test-customer-workflow' });
              window.dispatchEvent(event);
            }}
            className="hover:bg-red-500/50 text-white rounded-md h-8 w-8 shrink-0 transition-colors"
            title="Learn how the test workflow operates"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                disabled={isDeleting}
                size="sm"
                className="bg-black/40 hover:bg-black/60 border border-white/20 text-white font-bold rounded-lg text-xs h-8 w-full shadow-md transition-all"
              >
                {isDeleting ? <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1.5 text-red-400" />}
                {isDeleting ? "Wiping..." : "Wipe Test Data"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-900 border border-red-500/30 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Confirm Test Data Wipe
                </AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">
                  Are you sure you want to completely erase the "Rick Berube" test account? This will permanently delete all associated test estimates, invoices, bookings, and vehicles.
                  Your real analytics will immediately return to normal.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700 hover:text-white">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleWipe} className="bg-red-600 text-white hover:bg-red-500">
                  Yes, Wipe Test Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Wipe Result Dialog */}
      <AlertDialog open={wipeResult !== null} onOpenChange={() => {
        setWipeResult(null);
        navigate(0); // Refresh after acknowledgement
      }}>
        <AlertDialogContent className="bg-zinc-950 border border-blue-500/30 shadow-2xl z-[10000]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-emerald-400 flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-6 w-6" />
              Test Data Wiped
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300 text-base mt-2">
              {wipeResult?.msg}
            </AlertDialogDescription>
            {wipeResult?.details && (
              <div className="mt-4 bg-blue-900/20 border border-blue-800/30 p-4 rounded-lg text-blue-200">
                <strong>Impact Report:</strong><br />
                {wipeResult.details}
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction onClick={() => {
              setWipeResult(null);
              navigate(0); // Refresh after acknowledgement
            }} className="bg-blue-600 hover:bg-blue-500 text-white font-bold w-full">
              Acknowledge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
