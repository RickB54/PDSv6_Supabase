import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { contentService, type SupaContact } from "@/lib/content";

export const Footer = () => {
    const [contact, setContact] = useState<SupaContact | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const info = await contentService.getContact();
                setContact(info);
            } catch { }
        };
        load();
    }, []);

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
                        animation: footer-marquee 20s linear infinite;
                    }
                `}</style>
                <div className="animate-footer-marquee">
                    {[...Array(15)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-2 text-2xl md:text-3xl font-black uppercase italic tracking-tighter">
                            <span className="text-[#ff3b30]">Precision.</span>
                            <span className="text-white">Protection.</span>
                            <span className="text-[#007aff]">Perfection.</span>
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
                            Prime Auto Detail
                        </h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                            <span>Precision</span>
                            <span className="text-red-600">•</span>
                            <span>Protection</span>
                            <span className="text-blue-600">•</span>
                            <span>Perfection</span>
                        </div>
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
                            © {new Date().getFullYear()} Prime Auto Detail. All Rights Reserved.
                        </p>
                        {contact?.email && <p className="text-[9px] text-zinc-700 font-bold">{contact.email}</p>}
                    </div>
                </div>
            </div>
        </footer>
    );
};
