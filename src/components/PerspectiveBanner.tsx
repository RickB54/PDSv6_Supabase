import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, User, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';
import { useDemoMode } from '@/contexts/DemoContext';
import { contentService } from '@/lib/content';

export const PerspectiveBanner = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = getCurrentUser();
    const { isDemoMode } = useDemoMode();
    const [businessStatus, setBusinessStatus] = React.useState<any>(null);
    
    React.useEffect(() => {
        (async () => {
            try {
                const meta = await contentService.getServiceMeta("global_settings");
                if (meta && meta.meta && meta.meta.businessStatus) {
                    setBusinessStatus(meta.meta.businessStatus);
                }
            } catch {}
        })();
    }, []);

    // Only show if the user is actually an admin trying to see other views
    const isAdmin = user?.role === 'admin';
    
    const isViewingAsCustomer = (isAdmin && localStorage.getItem('view_as_mode') === 'customer') || location.pathname.startsWith('/customer-dashboard') || location.pathname.startsWith('/portal') || location.pathname.startsWith('/active-jobs');
    const isViewingAsEmployee = (isAdmin && localStorage.getItem('view_as_mode') === 'employee') || location.pathname.startsWith('/dashboard/employee');
    
    if (!isAdmin) return null;
    if (!isViewingAsCustomer && !isViewingAsEmployee) return null;
    
    const isCustomer = isViewingAsCustomer;
    const offset = (isDemoMode ? 40 : 0) + (businessStatus?.isTopBannerActive ? 40 : 0);
    const topStyle = { top: `${offset}px` };
    
    return (
        <div 
            style={topStyle}
            className={cn(
            "fixed left-0 right-0 z-[110] h-10 flex items-center justify-between px-4 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500",
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
                onClick={() => {
                    localStorage.removeItem('view_as_mode');
                    navigate('/dashboard/admin');
                }}
                className="flex items-center gap-2 px-3 py-1 bg-white text-zinc-900 hover:bg-zinc-100 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 group"
            >
                EXIT Mode
                <X className="w-3 h-3 text-zinc-500 group-hover:text-red-500 transition-colors" />
            </button>
        </div>
    );
};
