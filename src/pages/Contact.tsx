import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { Footer } from "@/components/Footer";
import AboutDialog from "@/components/AboutDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import SuccessMessage from "@/components/SuccessMessage";
import { Mail, Phone, MapPin, Clock, ArrowLeft, Info, Star, CarFront, Check, Snowflake } from "lucide-react";
import { savePDFToArchive } from "@/lib/pdfArchive";
import jsPDF from "jspdf";
import api from "@/lib/api";
import { isSupabaseEnabled } from "@/lib/auth";
import * as contactSvc from "@/services/supabase/contact";
import { upsertSupabaseCustomer } from "@/lib/supa-data";
import { servicePackages as builtInPackages, addOns as builtInAddOns } from "@/lib/services";
import { getCustomServices, getAllPackageMeta, getAllAddOnMeta } from "@/lib/servicesMeta";
import logo from "@/assets/logo-primary.png";

const Contact = () => {
  const { toast } = useToast();
  const [showAbout, setShowAbout] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ hours: string; phone: string; address: string; email: string } | null>(null);
  const [liveServices, setLiveServices] = useState<{ id: string, name: string }[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    vehicleType: "",
    serviceInterested: "",
    preferredTiming: "",
    howFound: "",
    message: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showBookNow, setShowBookNow] = useState(false);
  const [businessStatus, setBusinessStatus] = useState<any>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Full Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email Address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone Number is required";
    }
    if (!formData.city.trim()) newErrors.city = "City / Town is required";
    if (!formData.vehicleType) newErrors.vehicleType = "Vehicle Type is required";
    if (!formData.serviceInterested) newErrors.serviceInterested = "Please select a service of interest";

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

    // Save to Prospects Database
    try {
      if (isSupabaseEnabled()) {
        await upsertSupabaseCustomer({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: `${formData.address}${formData.city ? `, ${formData.city}` : ''}`,
          type: 'prospect',
          vehicleType: formData.vehicleType,
          howFound: formData.howFound,
          services: [formData.serviceInterested],
          notes: `[Inquiry] Preferred Timing: ${formData.preferredTiming}\n\nClient Message: ${formData.message}`
        });

        // Also create a contact record for redundancy and history
        await contactSvc.create({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: `Vehicle: ${formData.vehicleType}\nService: ${formData.serviceInterested}\nTiming: ${formData.preferredTiming}\n\n${formData.message}`,
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to save prospect", err);
    }

    // Generate PDF for Archive
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Future Service Inquiry", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 35);
    doc.text(`Name: ${formData.name}`, 20, 50);
    doc.text(`Email: ${formData.email}`, 20, 60);
    doc.text(`Phone: ${formData.phone}`, 20, 70);
    doc.text(`Vehicle Type: ${formData.vehicleType}`, 20, 80);
    doc.text(`Service: ${formData.serviceInterested}`, 20, 90);
    doc.text(`Desired Timing: ${formData.preferredTiming}`, 20, 100);
    doc.text("Message:", 20, 115);

    const lines = doc.splitTextToSize(formData.message, 170);
    doc.text(lines, 20, 125);

    const pdfDataUrl = doc.output('dataurlstring');
    savePDFToArchive("Prospects", formData.name, `inquiry_${Date.now()}`, pdfDataUrl);

    // Open Gmail compose with refined wording
    const subject = `Pre-Launch Inquiry: ${formData.name}`;
    const body = `New Pre-Launch Service Inquiry\n\n` +
      `Name: ${formData.name}\n` +
      `Email: ${formData.email}\n` +
      `Phone: ${formData.phone}\n` +
      `Address: ${formData.address}, ${formData.city}\n` +
      `Vehicle Type: ${formData.vehicleType}\n` +
      `Interested In: ${formData.serviceInterested}\n` +
      `Timing: ${formData.preferredTiming}\n\n` +
      `Message:\n${formData.message}\n\n` +
      `Submitted: ${new Date().toLocaleString()}`;
    
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=Rick.PrimeAutoDetail@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailLink, "_blank");

    setSubmitted(true);
    setSubmitting(false);

    // No hard redirect - stay on page to show success message clearly
    toast({
      title: "Inquiry Received!",
      description: "Thank you for your interest in Prime Auto Detail.",
    });

    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      vehicleType: "",
      serviceInterested: "",
      preferredTiming: "",
      howFound: "",
      message: ""
    });
    setErrors({});
  };

  // Load contact info and keep in sync with admin edits
  useEffect(() => {
    const load = async () => {
      // 1. Fetch contact info
      if (isSupabaseEnabled()) {
        try {
          const { contentService } = await import("@/lib/content");
          const supaContact = await contentService.getContact();
          if (supaContact) {
            setContactInfo({
              hours: supaContact.hours || 'Appointments daily 8 AM–6 PM',
              phone: supaContact.phone || '(555) 123-4567',
              address: supaContact.address || 'Methuen, MA',
              email: supaContact.email || 'Rick.PrimeAutoDetail@gmail.com',
            });
          }
        } catch {}
      }

      // 2. Fetch Live Services for Dynamic Dropdown
      try {
        const pkgMeta = getAllPackageMeta();
        const addonMeta = getAllAddOnMeta();
        const customPkgs = getCustomServices().filter((s: any) => s.type === 'package' || !s.type);
        
        const allPkgs = [...builtInPackages, ...customPkgs]
          .filter(p => {
            const meta = pkgMeta[p.id];
            return meta ? (meta.visible !== false && meta.deleted !== true) : true;
          })
          .map(p => ({ id: p.id, name: p.name }));

        setLiveServices(allPkgs);
      } catch (err) {
        console.error("Failed to load services for contact form", err);
      }

      // 3. Load Global Settings
      try {
        const { data: globalMeta } = await supabase.from('content_services_meta').select('*').eq('key', 'global_settings').single();
        if (globalMeta && globalMeta.meta) {
          setShowBookNow(globalMeta.meta.showBookNow !== false);
          if (globalMeta.meta.businessStatus) {
            setBusinessStatus(globalMeta.meta.businessStatus);
          }
        }
      } catch {}
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navbar />

      <main className="container mx-auto px-4 py-2 max-w-6xl">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Link>
        </Button>

        {/* Dynamic Business Status Banner */}
        {businessStatus && !!businessStatus.isContactBannerActive && (
          <Card className={`mb-12 border-2 overflow-hidden shadow-2xl animate-fade-in ${
            businessStatus.mode === 'winter-closed' ? 'border-blue-500/50 bg-blue-500/5' : 'border-blue-500/50 bg-blue-50/30'
          }`}>
             <div className={`${businessStatus.mode === 'winter-closed' ? 'bg-blue-600' : 'bg-blue-600'} px-6 py-5 flex items-center gap-4`}>
                <div className="p-2 bg-white/20 rounded-lg">
                  {businessStatus.mode === 'winter-closed' ? <Snowflake className="h-6 w-6 text-white" /> : <Info className="h-6 w-6 text-white" />}
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                  {businessStatus.mode === 'pre-launch' ? 'PRE-LAUNCH CONTACT NOTICE' : businessStatus.bannerText}
                </h2>
             </div>
             <div className="p-8 space-y-6">
                {businessStatus.mode === 'pre-launch' ? (
                  <>
                    <h3 className="text-2xl font-black text-foreground">Thank you for your interest in Prime Auto Detail.</h3>
                    <div className="space-y-4">
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        We are currently in the <span className="font-black text-zinc-700">final preparation phase</span> before officially opening for active detailing appointments. At this time, we are not yet scheduling live service appointments, but we are welcoming future service inquiries, pricing questions, service area questions, and early customer interest.
                      </p>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        If you would like to get in touch, please complete the inquiry form below. This helps us stay organized and ensures all inquiries are properly tracked as we prepare for launch.
                      </p>
                    </div>
                    <div className="pt-4">
                       <Badge className="bg-blue-100 text-blue-600 border-none px-4 py-2 flex items-center gap-2 w-fit rounded-full shadow-sm">
                          <Star className="h-3 w-3 fill-blue-600" />
                          <span className="text-[10px] uppercase font-black tracking-widest">Launching Soon</span>
                       </Badge>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-foreground">Important Status Update</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {businessStatus.bannerDescription}
                    </p>
                    {businessStatus.showContact ? (
                       <p className="text-lg text-muted-foreground leading-relaxed italic">
                         Our inquiry portal remains open. Please use the form below to connect with us.
                       </p>
                    ) : (
                       <p className="text-lg font-bold text-red-500 uppercase tracking-tighter">
                         Our inquiry portal is temporarily paused. Please check back soon or try calling us.
                       </p>
                    )}
                  </>
                )}
             </div>
          </Card>
        )}

        <div className="text-center mb-12">
          <img
            src={logo}
            alt="Prime Auto Detail"
            className="mx-auto mb-4 cursor-pointer h-48 w-48 md:h-60 md:w-60 aspect-square object-contain"
            onClick={() => setShowAbout(true)}
          />
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4 uppercase tracking-tight">Contact Us</h1>
          {(!showBookNow || (businessStatus && !businessStatus.showBooking)) && (
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto italic">
              Connecting you to premium preservation as we prepare for our official opening.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Inquiry Form */}
          <Card className="p-6 md:p-8 bg-gradient-card border-border shadow-xl">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-foreground mb-2 uppercase tracking-tight">Service Inquiry Form</h2>
              <p className="text-muted-foreground font-medium italic">Interested in professional detailing? Complete the form below to get started.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" name="contact-prelaunch" method="POST" data-netlify="true" netlify-honeypot="bot-field" noValidate>
              <input type="hidden" name="form-name" value="contact-prelaunch" />
              <input type="hidden" name="bot-field" />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-bold">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your legal name"
                    required
                    className={errors.name ? "border-destructive h-12" : "h-12"}
                  />
                  {errors.name && <p className="text-xs text-red-600 font-bold uppercase tracking-tight mt-1 ml-1">⚠️ {errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-bold">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    required
                    className={errors.email ? "border-destructive h-12" : "h-12"}
                  />
                  {errors.email && <p className="text-xs text-red-600 font-bold uppercase tracking-tight mt-1 ml-1">⚠️ {errors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-bold">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    required
                    className={errors.phone ? "border-destructive h-12" : "h-12"}
                  />
                  {errors.phone && <p className="text-xs text-red-600 font-bold uppercase tracking-tight mt-1 ml-1">⚠️ {errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="font-bold">Street Address (Optional)</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Detail Lane"
                    className="h-12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="font-bold">City / Town *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Methuen, MA"
                    required
                    className={errors.city ? "border-destructive h-12" : "h-12"}
                  />
                  {errors.city && <p className="text-xs text-red-600 font-bold uppercase tracking-tight mt-1 ml-1">⚠️ {errors.city}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicleType" className="font-bold">Vehicle Type *</Label>
                  <Select value={formData.vehicleType} onValueChange={(v) => setFormData({ ...formData, vehicleType: v })}>
                    <SelectTrigger className={`h-12 ${errors.vehicleType ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact / Sedan</SelectItem>
                      <SelectItem value="midsize">Mid-Size / SUV</SelectItem>
                      <SelectItem value="truck">Truck / Van / Large SUV</SelectItem>
                      <SelectItem value="luxury">Luxury / Specialty</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.vehicleType && <p className="text-xs text-red-600 font-bold uppercase tracking-tight mt-1 ml-1">⚠️ {errors.vehicleType}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service" className="font-bold">Service Interested In *</Label>
                  <Select value={formData.serviceInterested} onValueChange={(v) => setFormData({ ...formData, serviceInterested: v })}>
                    <SelectTrigger className={`h-12 ${errors.serviceInterested ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {liveServices.map(s => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      ))}
                      <SelectItem value="Other / Multiple">Other / Multiple</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.serviceInterested && <p className="text-xs text-red-600 font-bold uppercase tracking-tight mt-1 ml-1">⚠️ {errors.serviceInterested}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timing" className="font-bold">Preferred Timing</Label>
                  <Select value={formData.preferredTiming} onValueChange={(v) => setFormData({ ...formData, preferredTiming: v })}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="When do you need service?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Immediately upon launch">Immediately upon launch</SelectItem>
                      <SelectItem value="Within a month of launch">Within a month of launch</SelectItem>
                      <SelectItem value="Flexible / Just inquiring">Flexible / Just inquiring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="howFound" className="font-bold">How Did You Hear About Us?</Label>
                <Select value={formData.howFound} onValueChange={(v) => setFormData({ ...formData, howFound: v })}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Referral source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="google">Google Search</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="referral">Word of Mouth / Referral</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="font-bold">Message / Questions (Optional)</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Any specific questions or detailing needs?"
                  rows={4}
                  className="bg-background"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-hero min-h-[56px] text-lg font-black uppercase tracking-widest shadow-lg hover:shadow-primary/20"
                disabled={submitting}
              >
                {submitting ? "Processing..." : "Submit Inquiry"}
              </Button>

              {submitted && (
                <div className="animate-in fade-in zoom-in duration-500">
                  <Card className="p-6 bg-emerald-950/20 border-emerald-500/50 flex flex-col items-center text-center gap-3">
                    <div className="p-2 bg-emerald-500 rounded-full">
                      <Check className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-emerald-400">Thank you for your message!</h4>
                    <p className="text-zinc-300">
                      {showBookNow 
                        ? "Your inquiry has been received. We appreciate you reaching out to Prime Auto Detail and will be in touch with you shortly."
                        : "Prime Auto Detail is currently in pre-launch / final preparation. Your information has been received and added to our prospect list. We appreciate your interest and will be in touch as we move closer to launch."
                      }
                    </p>
                  </Card>
                </div>
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
                    href={`https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(contactInfo?.email || 'Rick.PrimeAutoDetail@gmail.com')}&su=Website%20Inquiry`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {contactInfo ? (contactInfo.email || 'Rick.PrimeAutoDetail@gmail.com') : 'Loading contact info...'}
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
                    href={`tel:${(contactInfo?.phone || '(555) 123-4567').replace(/[^+\d]/g, '')}`}
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
      <Footer />
    </div>
  );
};

export default Contact;
