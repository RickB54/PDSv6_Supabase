import React, { useEffect, useState } from 'react';
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-red-600/95 backdrop-blur-md border-2 border-red-400 shadow-[0_0_30px_rgba(220,38,38,0.5)] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-10 w-[95%] max-w-3xl text-white">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-900/50 rounded-full shrink-0 animate-pulse">
          <AlertTriangle className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="font-black text-sm uppercase tracking-widest text-white mb-0.5">🧪 Test Data Active</h3>
          <p className="text-xs text-red-100 font-medium pr-2">
            The "Rick Berube" test account is currently altering your analytics and system metrics. 
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => {
            const event = new CustomEvent('open-help', { detail: 'test-customer-workflow' });
            window.dispatchEvent(event);
          }}
          className="hover:bg-red-500/50 text-white rounded-full h-10 w-10 shrink-0 transition-colors"
          title="Learn how the test workflow operates"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              disabled={isDeleting}
              className="bg-black/40 hover:bg-black/60 border border-white/20 text-white font-bold rounded-xl whitespace-nowrap shadow-xl transition-all"
            >
              {isDeleting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2 text-red-400" />}
              {isDeleting ? "Wiping..." : "Wipe Test Data Now"}
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
  );
};
