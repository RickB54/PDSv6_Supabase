import React, { useEffect, useState, useRef } from 'react';
import supabase from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { deleteSupabaseCustomer } from '@/lib/supa-data';
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
  const navigate = useNavigate();

  // Dragging state
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

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
    const checkTestAccount = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, full_name')
          .or('full_name.ilike.%Rick Berube%,email.ilike.%rberube54+test@gmail.com%')
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
      await deleteSupabaseCustomer(rickId);
      setRickId(null);
      toast({ title: "Success", description: "All test data successfully wiped. Analytics restored.", variant: "default" });
      navigate(0); // Refresh the page to reset analytics visually
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to wipe data", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!rickId) return null;

  return (
    <>
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
          <div className="pr-1">
            <h3 className="font-black text-xs uppercase tracking-wider text-white mb-0.5">🧪 Test Data Active</h3>
            <p className="text-[10px] text-red-100 font-medium leading-tight">
              Test account is altering analytics.
            </p>
          </div>
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
    </>
  );
};
