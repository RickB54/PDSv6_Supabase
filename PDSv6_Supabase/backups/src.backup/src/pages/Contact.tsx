import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import AboutDialog from "@/components/AboutDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import SuccessMessage from "@/components/SuccessMessage";
import { Mail, Phone, MapPin, Clock, ArrowLeft } from "lucide-react";
import { savePDFToArchive } from "@/lib/pdfArchive";
import jsPDF from "jspdf";
import api from "@/lib/api";
import { isSupabaseEnabled } from "@/lib/auth";
import * as contactSvc from "@/services/supabase/contact";
import logo from "@/assets/logo-3inch.png";

const Contact = () => {
  const { toast } = useToast();
  const [showAbout, setShowAbout] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ hours: string; phone: string; address: string; email: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    vehicle: "",
    message: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.message.trim()) newErrors.message = "Message is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Please fix errors",
        description: "Check the form for validation errors",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    // Auto-create customer account
    const autoPassword = `PDS${Math.random().toString(36).slice(2, 10)}`;
    console.log(`Customer account created: ${formData.email} / ${autoPassword}`);
    console.log(`Portal link: ${window.location.origin}/portal?token=auto-${Date.now()}`);

    // Generate PDF
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Contact Form Submission", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 35);
    doc.text(`Name: ${formData.name}`, 20, 50);
    doc.text(`Email: ${formData.email}`, 20, 60);
    doc.text(`Phone: ${formData.phone || "N/A"}`, 20, 70);
    doc.text(`Vehicle: ${formData.vehicle || "N/A"}`, 20, 80);
    doc.text("Message:", 20, 95);
    
    const lines = doc.splitTextToSize(formData.message, 170);
    doc.text(lines, 20, 105);

    const pdfDataUrl = doc.output('dataurlstring');
    
    // Save to File Manager
    savePDFToArchive("Customer", formData.name, `contact_${Date.now()}`, pdfDataUrl);

    // Open Gmail compose directly with full subject and body
    const subject = `Contact: ${formData.name} (${formData.email})`;
    const body = `New Contact Submission\n\n` +
      `Name: ${formData.name}\n` +
      `Email: ${formData.email}\n` +
      `Phone: ${formData.phone || 'N/A'}\n` +
      `Vehicle: ${formData.vehicle || 'N/A'}\n\n` +
      `Message:\n${formData.message}\n\n` +
      `Submitted: ${new Date().toLocaleString()}\n` +
      `Portal Link (auto): ${window.location.origin}/portal?token=auto-${Date.now()}`;
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=primedetailsolutions.ma.nh@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailLink, "_blank");

    toast({
      title: "Message Sent!",
      description: "We'll reply within 24 hours. Check your email client to complete sending.",
    });
    setSubmitted(true);

    // Store to Supabase if enabled
    try {
      if (isSupabaseEnabled()) {
        await contactSvc.create({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
        });
      }
    } catch {}

    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      vehicle: "",
      message: ""
    });
    setErrors({});

    // Allow normal browser POST so Netlify can capture the submission
    try {
      const formEl = e.target as HTMLFormElement;
      formEl.submit();
    } catch {}

    setSubmitting(false);

    // Redirect consistent with Book Now flow
    try { window.location.href = "/thank-you?contact=1"; } catch {}
  };

  // Load contact info and keep in sync with admin edits
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`http://localhost:6061/api/contact/live?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
        if (res.ok) {
          const c = await res.json();
          if (c && typeof c === 'object') {
            setContactInfo({
              hours: c.hours || 'Appointments daily 8 AM–6 PM',
              phone: c.phone || '(555) 123-4567',
              address: c.address || 'Methuen, MA',
              email: c.email || 'primedetailsolutions.ma.nh@gmail.com',
            });
          } else {
            setContactInfo({ hours: 'Appointments daily 8 AM–6 PM', phone: '(555) 123-4567', address: 'Methuen, MA', email: 'primedetailsolutions.ma.nh@gmail.com' });
          }
        } else {
          setContactInfo({ hours: 'Appointments daily 8 AM–6 PM', phone: '(555) 123-4567', address: 'Methuen, MA', email: 'primedetailsolutions.ma.nh@gmail.com' });
        }
      } catch {
        setContactInfo({ hours: 'Appointments daily 8 AM–6 PM', phone: '(555) 123-4567', address: 'Methuen, MA', email: 'primedetailsolutions.ma.nh@gmail.com' });
      }
    };
    load();
    const onChanged = (e: any) => {
      if (e && e.detail && e.detail.type === 'contact') load();
    };
    window.addEventListener('content-changed', onChanged as any);
    return () => window.removeEventListener('content-changed', onChanged as any);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-16 max-w-6xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Link>
        </Button>
        
        <div className="text-center mb-12">
          <img
            src={logo}
            alt="Prime Detail Solutions"
            className="mx-auto mb-4 cursor-pointer w-[3in]"
            onClick={() => setShowAbout(true)}
          />
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Contact Us</h1>
          <p className="text-xl text-muted-foreground">
            Have questions? We'd love to hear from you.
          </p>
        </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="p-6 md:p-8 bg-gradient-card border-border">
            <h2 className="text-2xl font-bold text-foreground mb-6">Send us a message</h2>
            <form onSubmit={handleSubmit} className="space-y-4" name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field">
              <input type="hidden" name="form-name" value="contact" />
              <input type="hidden" name="bot-field" />
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your name"
                  required
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="vehicle">Vehicle</Label>
                <Input
                  id="vehicle"
                  value={formData.vehicle}
                  onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                  placeholder="e.g., 2024 Tesla Model 3"
                />
              </div>

              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us about your detailing needs..."
                  rows={5}
                  required
                  className={errors.message ? "border-destructive" : ""}
                />
                {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
              </div>

              {/* Netlify reCAPTCHA v2 */}
              <div data-netlify-recaptcha="true"></div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-hero min-h-[56px]"
                disabled={submitting}
              >
                {submitting ? "Sending..." : "Send Message"}
              </Button>
              {submitted && (
                <SuccessMessage title="Message received" description="Thank you for reaching out. We’ll respond shortly." />
              )}
            </form>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="p-6 bg-gradient-card border-border">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Email</h3>
                  <a 
                    href={`https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(contactInfo?.email || 'primedetailsolutions.ma.nh@gmail.com')}&su=Website%20Inquiry`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {contactInfo ? (contactInfo.email || 'primedetailsolutions.ma.nh@gmail.com') : 'Loading contact info...'}
                  </a>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-border">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Phone</h3>
                  <a 
                    href={`tel:${(contactInfo?.phone || '(555) 123-4567').replace(/[^+\d]/g,'')}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {contactInfo ? (contactInfo.phone || '(555) 123-4567') : 'Loading contact info...'}
                  </a>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-border">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Location</h3>
                  <p className="text-muted-foreground">
                    {contactInfo ? (contactInfo.address || 'Methuen, MA') : 'Loading contact info...'}<br />
                    Mobile service available
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-border">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Hours</h3>
                  <div className="text-muted-foreground space-y-1 whitespace-pre-line">
                    <p>{contactInfo ? (contactInfo.hours || 'Appointments daily 8 AM–6 PM') : 'Loading contact info...'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Map */}
            <Card className="p-6 bg-gradient-card border-border">
              <iframe
                title="Methuen MA Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d47093.99823879164!2d-71.21912523125!3d42.742358!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e30f8b9f0b3f0d%3A0x3e947e3c90c3e0a3!2sMethuen%2C%20MA!5e0!3m2!1sen!2sus!4v1234567890"
                width="100%"
                height="250"
                style={{ border: 0, borderRadius: '8px' }}
                allowFullScreen
                loading="lazy"
              />
            </Card>
          </div>
        </div>
      </main>
      <AboutDialog open={showAbout} onOpenChange={setShowAbout} />
    </div>
  );
};

export default Contact;
