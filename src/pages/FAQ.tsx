import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { isSupabaseEnabled } from "@/lib/auth";

const FAQ = () => {
  const [faqs, setFaqs] = useState<{ id: string; question: string; answer: string }[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // 1. Try Supabase
      if (isSupabaseEnabled()) {
        try {
          const { contentService } = await import("@/lib/content");
          const data = await contentService.getFaqs();
          if (data && data.length > 0) {
            setFaqs(data.map(d => ({ id: d.id || `faq-${Math.random()}`, question: d.question, answer: d.answer })));
            return;
          }
        } catch (e) { console.error(e); }
      }

      // 2. Fallback
      const list = await api('/api/faqs', { method: 'GET' });
      if (mounted && Array.isArray(list)) setFaqs(list);
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
    <div className="min-h-screen bg-background pt-16">
      <Navbar />

      <main className="container mx-auto px-4 py-2 max-w-4xl">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Link>
        </Button>

        <div className="space-y-6 animate-fade-in">
          <div className="text-center space-y-2 mb-4">
            <h1 className="text-4xl font-black text-blue-900 uppercase tracking-tight">
              Frequently Asked <span className="text-red-700">Questions</span>
            </h1>
            <p className="text-muted-foreground text-lg italic">Everything you need to know about our premium services</p>
          </div>

          <Card className="p-6 bg-white border-2 border-blue-50 shadow-2xl">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <AccordionTrigger className={`text-left text-lg font-bold transition-all px-4 rounded-lg my-1 hover:no-underline
                    ${index % 3 === 0 ? 'text-blue-600 hover:bg-blue-50' :
                      index % 3 === 1 ? 'text-red-600 hover:bg-red-50' :
                        'text-slate-600 hover:bg-slate-50'}
                  `}>
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-zinc-600 px-6 py-4 bg-slate-50/50 rounded-b-lg border-t border-zinc-100 whitespace-pre-line">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>

          <div className="text-center pt-6">
            <p className="text-muted-foreground mb-4">Still have questions?</p>
            <Button asChild className="bg-gradient-hero">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
