import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { contentService, type SupaContact } from "@/lib/content";
import { Facebook } from "lucide-react";

export const Footer = () => {
    const [contact, setContact] = useState<SupaContact | null>(null);
    const [footerData, setFooterData] = useState<any>({
        brandName: 'Prime Auto Detail',
        marqueeText: 'Precision. Protection. Perfection.',
        copyrightText: `© ${new Date().getFullYear()} Prime Auto Detail. All Rights Reserved.`
    });

    const loadData = async () => {
        try {
            const info = await contentService.getContact();
            setContact(info);

            const meta = await contentService.getServiceMeta('footer_content');
            if (meta && meta.meta) {
                setFooterData(meta.meta);
            }
        } catch { }
    };

    useEffect(() => {
        loadData();
        const handleContentChange = (e: any) => {
            if (e.detail?.kind === 'footer' || e.detail?.kind === 'contact') {
                loadData();
            }
        };
        window.addEventListener('content-changed', handleContentChange as any);
        return () => window.removeEventListener('content-changed', handleContentChange as any);
    }, []);

    // Create marquee items array with safety check
    const marqueeText = footerData?.marqueeText || 'Precision. Protection. Perfection.';
    const marqueeItems = String(marqueeText).split('.').filter(Boolean).map(s => s.trim() + '.');

    return (
        <footer className="bg-zinc-950 text-white border-t border-zinc-900 select-none overflow-hidden">
            {/* Scrolling Marquee */}
            <div className="relative w-full bg-black py-8 border-b border-white/5">
                <style>{`
                    @keyframes footer-marquee {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                    .animate-footer-marquee {
                        display: flex;
                        width: max-content;
                        animation: footer-marquee 25s linear infinite;
                    }
                `}</style>
                <div className="animate-footer-marquee">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-4 text-2xl md:text-3xl font-black uppercase italic tracking-tighter">
                            {marqueeItems.map((item, idx) => (
                                <span key={idx} className={idx % 3 === 0 ? "text-[#ff3b30]" : idx % 3 === 1 ? "text-white" : "text-[#007aff]"}>
                                    {item}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Footer Content */}
            <div className="container mx-auto px-4 py-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
                    {/* Branding */}
                    <div className="flex flex-col items-center md:items-start gap-3">
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">
                            {footerData.brandName}
                        </h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                            {marqueeItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4">
                                    <span>{item.replace('.', '')}</span>
                                    {idx < marqueeItems.length - 1 && <span className={idx === 0 ? "text-red-600" : "text-blue-600"}>•</span>}
                                </div>
                            ))}
                        </div>
                        {footerData.facebookUrl && (
                          <a 
                            href={footerData.facebookUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-2 flex items-center gap-2 text-zinc-400 hover:text-[#1877F2] transition-colors"
                          >
                            <Facebook className="h-5 w-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none mt-0.5">Facebook Page</span>
                          </a>
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="flex flex-wrap justify-center gap-8 text-[11px] font-black uppercase tracking-widest text-zinc-400">
                        <Link to="/about" className="hover:text-red-600 transition-all hover:translate-y-[-1px]">Our Story</Link>
                        <Link to="/services" className="hover:text-red-600 transition-all hover:translate-y-[-1px]">Services</Link>
                        <Link to="/availability" className="hover:text-red-600 transition-all hover:translate-y-[-1px]">Availability</Link>
                        <Link to="/contact" className="hover:text-red-600 transition-all hover:translate-y-[-1px]">Contact</Link>
                    </div>

                    {/* Copyright & Info */}
                    <div className="flex flex-col items-center md:items-end gap-2 text-center md:text-right">
                        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                            {footerData.copyrightText}
                        </p>
                        {contact?.email && <p className="text-[9px] text-zinc-700 font-bold">{contact.email}</p>}
                    </div>
                </div>
            </div>
        </footer>
    );
};
