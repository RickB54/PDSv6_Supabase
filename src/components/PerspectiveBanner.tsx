import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, User, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentUser, getRealUser } from '@/lib/auth';
import { useDemoMode } from '@/contexts/DemoContext';
import { contentService } from '@/lib/content';

export const PerspectiveBanner = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = getCurrentUser();
    const realUser = getRealUser();
    const { isDemoMode } = useDemoMode();
    const [businessStatus, setBusinessStatus] = React.useState<any>(() => {
        const cached = contentService.getServiceMetaSync("global_settings");
        return cached?.meta?.businessStatus || null;
    });
    
    React.useEffect(() => {
        (async () => {
            try {
                const meta = await contentService.getServiceMeta("global_settings");
                if (meta?.meta?.businessStatus) {
                    setBusinessStatus(meta.meta.businessStatus);
                }
            } catch {}
        })();
    }, []);

    // Only show if the user is actually an admin trying to see other views
    // We check realUser to ensure the banner doesn't POOF away when mode is active
    const isAdmin = realUser?.role === 'admin' || isDemoMode;
    
    const isViewingAsCustomer = (isAdmin && localStorage.getItem('view_as_mode') === 'customer') || location.pathname.startsWith('/customer-dashboard') || location.pathname.startsWith('/portal') || location.pathname.startsWith('/active-jobs');
    const isViewingAsEmployee = (isAdmin && localStorage.getItem('view_as_mode') === 'employee') || location.pathname.startsWith('/dashboard/employee');
    
    if (!isAdmin) return null;
    if (!isViewingAsCustomer && !isViewingAsEmployee) return null;
    
    const isCustomer = isViewingAsCustomer;
    // Force a re-calculation and use a higher z-index to be absolute
    const hasBusinessBanner = businessStatus?.isTopBannerActive && businessStatus?.bannerText;
    const offset = (isDemoMode ? 40 : 0) + (hasBusinessBanner ? 40 : 0);
    const topStyle = { 
        top: `${offset}px`,
        zIndex: 9999,
        borderTop: '1px solid rgba(255,255,255,0.1)'
    };
    
    return (
        <div 
            style={topStyle}
            className={cn(
            "fixed left-0 right-0 h-10 flex items-center justify-between px-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-top-4 duration-500",
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
                    window.dispatchEvent(new Event('auth-changed'));
                    navigate('/bookings-analytics', { replace: true });
                }}
                className="flex items-center gap-2 px-3 py-1 bg-white text-zinc-900 hover:bg-zinc-100 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 group"
            >
                EXIT Mode
                <X className="w-3 h-3 text-zinc-500 group-hover:text-red-500 transition-colors" />
            </button>
        </div>
    );
};
