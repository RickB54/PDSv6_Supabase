import React from 'react';
import { useDemoMode } from '@/contexts/DemoContext';
import { contentService } from '@/lib/content';
import { cn } from '@/lib/utils';

export const BusinessBanner = () => {
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

    const hasBanner = businessStatus?.isTopBannerActive && businessStatus?.bannerText;
    if (!hasBanner) return null;

    const offset = isDemoMode ? 40 : 0;

    return (
        <div 
            style={{ top: `${offset}px`, zIndex: 160 }}
            className={cn(
                "fixed left-0 right-0 h-10 flex items-center justify-center px-4 shadow-lg border-b border-white/10 text-white text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]",
                businessStatus.mode === 'winter-closed' ? 'bg-blue-600' : 
                businessStatus.mode === 'spring-prep' ? 'bg-emerald-600' :
                businessStatus.mode === 'emergency' ? 'bg-red-600' :
                'bg-red-600'
            )}
        >
            <div className="flex items-center gap-2 truncate">
                <span className="hidden sm:inline opacity-70 shrink-0">///</span>
                <span className="truncate">{businessStatus.bannerText}</span>
                <span className="hidden sm:inline opacity-70 shrink-0">///</span>
            </div>
        </div>
    );
};
