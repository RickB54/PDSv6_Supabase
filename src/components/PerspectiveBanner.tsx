import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, User, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';

export const PerspectiveBanner = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = getCurrentUser();
    
    // Only show if the user is actually an admin trying to see other views
    // If they are a real customer, they don't need an "Exit Mode" banner
    const isAdmin = user?.role === 'admin';
    
    const isViewingAsCustomer = location.pathname.startsWith('/customer-dashboard') || location.pathname.startsWith('/portal') || location.pathname.startsWith('/active-jobs');
    const isViewingAsEmployee = location.pathname.startsWith('/dashboard/employee');
    
    if (!isAdmin) return null;
    if (!isViewingAsCustomer && !isViewingAsEmployee) return null;
    
    const isCustomer = isViewingAsCustomer;
    
    return (
        <div className={cn(
            "fixed top-0 left-0 right-0 z-[110] h-10 flex items-center justify-between px-4 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500",
            isCustomer ? "bg-purple-600 text-white" : "bg-blue-600 text-white"
        )}>
            <div className="flex items-center gap-3">
                <div className="bg-zinc-950/40 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-white/20">
                    {isCustomer ? 'Customer View' : 'Employee View'}
                </div>
                <div className="flex items-center gap-2">
                    {isCustomer ? <User className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                    <p className="text-xs font-bold">
                        Simulation Mode Active 
                        <span className="hidden md:inline opacity-80 font-medium ml-2">
                            — You are seeing the app exactly as {isCustomer ? 'a client' : 'staff'} would.
                        </span>
                    </p>
                </div>
            </div>
            
            <button 
                onClick={() => navigate('/dashboard/admin')}
                className="flex items-center gap-2 px-3 py-1 bg-white text-zinc-900 hover:bg-zinc-100 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 group"
            >
                EXIT Mode
                <X className="w-3 h-3 text-zinc-500 group-hover:text-red-500 transition-colors" />
            </button>
        </div>
    );
};
