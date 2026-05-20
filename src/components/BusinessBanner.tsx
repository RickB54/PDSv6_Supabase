import React from 'react';
import { useDemoMode } from '@/contexts/DemoContext';
import { contentService } from '@/lib/content';
import { cn } from '@/lib/utils';

const sanitizeShopOnlyText = (text: string, isShopOnly: boolean) => {
  if (!text || !isShopOnly) return text;
  return text
    .replace(/PREMIUM MOBILE DETAILING/g, 'PREMIUM SHOP-ONLY DETAILING')
    .replace(/premium mobile detailing/gi, 'premium shop detailing')
    .replace(/at your driveway/gi, 'at our shop facility')
    .replace(/to your driveway/gi, 'at our Methuen facility')
    .replace(/mobile units are active/gi, 'shop facility is fully active')
    .replace(/mobile units are/gi, 'shop facility is')
    .replace(/mobile detailing/gi, 'shop detailing')
    .replace(/mobile/gi, 'shop-only');
};

const stripAddressForTopBanner = (text: string) => {
  if (!text) return text;
  return text
    .replace(/at 54 Boston Street, Methuen, MA/gi, '')
    .replace(/located at 54 Boston Street, Methuen, MA/gi, '')
    .replace(/located at 54 Boston Street/gi, '')
    .replace(/at 54 Boston Street/gi, '')
    .replace(/54 Boston Street, Methuen, MA/gi, 'Methuen, MA')
    .replace(/54 Boston Street/gi, '');
};

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

    const isPublicPage = ['/', '/about', '/contact', '/faq', '/services', '/book', '/book-now', '/availability', '/blog', '/thank-you', '/checkout', '/payment-success', '/portal', '/f150-setup', '/contact-support'].includes(window.location.pathname.toLowerCase().replace(/\/+/g, '/')) || window.location.pathname.startsWith('/blog/');
    const hasBanner = businessStatus?.isTopBannerActive && businessStatus?.bannerText;
    if (!hasBanner || isPublicPage) return null;

    const offset = isDemoMode ? 40 : 0;

    return (
        <div 
            style={{ top: `${offset}px`, zIndex: 160 }}
            className={cn(
                "fixed left-0 right-0 h-10 flex items-center justify-center px-4 shadow-lg border-b border-white/10 text-white text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]",
                businessStatus.mode === 'winter-closed' ? 'bg-blue-600' : 
                businessStatus.mode === 'spring-prep' ? 'bg-emerald-600' :
                businessStatus.mode === 'emergency' ? 'bg-red-600' :
                businessStatus.mode === 'marketing' ? 'bg-purple-600 font-black' :
                'bg-red-600'
            )}
        >
            <div className="flex items-center gap-2 truncate">
                <span className="hidden sm:inline opacity-70 shrink-0">///</span>
                <span className="truncate">{stripAddressForTopBanner(sanitizeShopOnlyText(businessStatus.topBannerText || businessStatus.bannerText, !!businessStatus.shopOnly))}</span>
                <span className="hidden sm:inline opacity-70 shrink-0">///</span>
            </div>
        </div>
    );
};
