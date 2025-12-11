import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";

const FAQ = () => {
  const [faqs, setFaqs] = useState<{ id: string; question: string; answer: string }[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Link>
        </Button>

        <div className="space-y-6 animate-fade-in">
          <div className="text-center space-y-4 mb-8">
            <h1 className="text-4xl font-bold text-foreground">Frequently Asked Questions</h1>
            <p className="text-muted-foreground text-lg">Everything you need to know about our services</p>
          </div>

          <Card className="p-6 bg-gradient-card border-border">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-lg font-semibold">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground whitespace-pre-line">
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
    </div>
  );
};

export default FAQ;
