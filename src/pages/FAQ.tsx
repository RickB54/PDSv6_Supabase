import { useEffect, useState } from "react";
import { EducationalContent } from "@/components/faq/EducationalContent";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageSquare } from "lucide-react";
import api from "@/lib/api";
import { isSupabaseEnabled } from "@/lib/auth";
import faqHeroImg from "@/assets/faq_hero_4k.png";

const FAQ = () => {
  const [faqs, setFaqs] = useState<{ id: string; question: string; answer: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        if (isSupabaseEnabled()) {
          try {
            const { contentService } = await import("@/lib/content");
            const data = await contentService.getFaqs();
            if (data && data.length > 0) {
              if (mounted) {
                setFaqs(data.map(d => ({ id: d.id || `faq-${Math.random()}`, question: d.question, answer: d.answer })));
                setIsLoading(false);
              }
              return;
            }
          } catch (e) { console.error(e); }
        }

        const list = await api('/api/faqs', { method: 'GET' });
        if (mounted) {
          if (Array.isArray(list)) setFaqs(list);
          setIsLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setIsLoading(false);
      }
    };
    load();
    const onChanged = (e: any) => {
      if (e?.detail?.type === 'faqs') load();
    };
    window.addEventListener('content-changed', onChanged as any);
    window.addEventListener('storage', load);
    return () => { mounted = false; window.removeEventListener('content-changed', onChanged as any); window.removeEventListener('storage', load); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background pt-16">
      <Navbar />

      {/* Hero Section */}
      <section className="relative w-full py-20 md:py-24 overflow-hidden bg-black flex items-center justify-center text-center">
        {/* Background Image with Fade Overlay */}
        <div className="absolute inset-0 z-0 opacity-50">
          <img
            src={faqHeroImg}
            alt="FAQ Hero Background"
            className="w-full h-full object-cover grayscale-[20%] brightness-[0.7]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-background" />
        </div>

        <div className="container mx-auto px-4 max-w-7xl relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-black uppercase tracking-[0.2em] mb-4 animate-fade-in">
            <MessageSquare className="w-4 h-4" />
            Help Center
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-[0.9] animate-fade-in">
            Frequently Asked <br />
            <span className="text-blue-500">Questions</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-300 max-w-3xl mx-auto italic font-medium leading-tight animate-fade-in opacity-90">
            Everything you need to know about our premium services
          </p>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl min-h-[50vh] relative -mt-12 z-20">
        <Button variant="ghost" asChild className="mb-8 hover:bg-zinc-100 text-zinc-500 hover:text-black font-bold uppercase tracking-widest text-[10px]">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Link>
        </Button>

        {isLoading ? (
          <div className="space-y-12 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-zinc-50/50 rounded-2xl border border-zinc-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-12 animate-fade-in">
            <Card className="p-8 bg-white border-2 border-blue-50 shadow-2xl rounded-3xl overflow-hidden hover:shadow-blue-600/5 transition-all duration-500">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <AccordionTrigger className={`text-left text-xl font-bold transition-all px-6 py-6 rounded-xl my-1 hover:no-underline
                      ${index % 3 === 0 ? 'text-blue-700 hover:bg-blue-50/50' :
                        index % 3 === 1 ? 'text-zinc-800 hover:bg-zinc-50' :
                          'text-slate-800 hover:bg-slate-50'}
                    `}>
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-zinc-600 px-8 py-6 bg-slate-50/30 rounded-b-2xl border-t border-zinc-50 leading-relaxed text-lg whitespace-pre-line">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>


            <div className="text-center pt-8 bg-zinc-50 rounded-3xl p-12 border border-zinc-100">
              <p className="text-zinc-500 text-xl font-medium mb-6">Still have questions?</p>
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest px-12 h-16 rounded-full shadow-xl hover:shadow-blue-600/20 transition-all active:scale-95 text-lg">
                <Link to="/contact">Contact Our Team →</Link>
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Educational Content Section - Separated from main FAQ */}
      <EducationalContent />

      <Footer />
    </div>
  );
};

export default FAQ;
