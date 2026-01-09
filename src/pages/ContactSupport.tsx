import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser, isSupabaseEnabled } from "@/lib/auth";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import * as contactSvc from "@/services/supabase/contact";
import SuccessMessage from "@/components/SuccessMessage";

const ContactSupport = () => {
    const user = getCurrentUser();
    const [contactInfo, setContactInfo] = useState<{ hours: string; phone: string; address: string; email: string } | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
        phone: "",
        vehicle: "",
        message: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        // Load contact info
        const loadContact = async () => {
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
                        return;
                    }
                } catch (err) {
                    console.error("Supabase contact load failed", err);
                }
            }
            setContactInfo({
                hours: 'Appointments daily 8 AM–6 PM',
                phone: '(555) 123-4567',
                address: 'Methuen, MA',
                email: 'Rick.PrimeAutoDetail@gmail.com'
            });
        };
        loadContact();
    }, []);

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
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            // Generate PDF
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text("Support Request", 105, 20, { align: "center" });
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
            savePDFToArchive("Customer", formData.name, `support_${Date.now()}`, pdfDataUrl);

            // Open Gmail compose
            const subject = `Support Request: ${formData.name}`;
            const body = `Support Request Details\n\nName: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone || 'N/A'}\nVehicle: ${formData.vehicle || 'N/A'}\n\nMessage:\n${formData.message}`;
            const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=Rick.PrimeAutoDetail@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.open(gmailLink, "_blank");

            // Store to Supabase
            if (isSupabaseEnabled()) {
                await contactSvc.create({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    message: formData.message,
                });
            }

            toast({ title: "Request Sent!", description: "We'll get back to you shortly." });
            setSubmitted(true);
            setFormData({ ...formData, message: "" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to send request.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const isValid = () => {
        return (
            formData.name.trim() !== "" &&
            formData.email.trim() !== "" &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
            formData.message.trim() !== ""
        );
    };

    return (
        <div className="min-h-screen bg-background">
            <PageHeader title="Contact Support" />
            <main className="container mx-auto px-4 py-8 max-w-6xl animate-fade-in">
                {/* Business Information Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card className="p-4 bg-gradient-card border-border flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Email</p>
                            <a
                                href={`https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(contactInfo?.email || 'Rick.PrimeAutoDetail@gmail.com')}&su=Support%20Inquiry`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors block"
                            >
                                {contactInfo?.email || 'Loading...'}
                            </a>
                        </div>
                    </Card>

                    <Card className="p-4 bg-gradient-card border-border flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Phone</p>
                            <p className="text-sm font-medium text-foreground">{contactInfo?.phone || 'Loading...'}</p>
                        </div>
                    </Card>

                    <Card className="p-4 bg-gradient-card border-border flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Location</p>
                            <p className="text-sm font-medium text-foreground">{contactInfo?.address || 'Loading...'}</p>
                        </div>
                    </Card>

                    <Card className="p-4 bg-gradient-card border-border flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Hours</p>
                            <p className="text-sm font-medium text-foreground">{contactInfo?.hours || 'Loading...'}</p>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contact Form Column */}
                    <div className="lg:col-span-2">
                        <Card className="p-6 md:p-8 bg-gradient-card border-border relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 pointer-events-none" />
                            <div className="relative z-10">
                                <h2 className="text-2xl font-bold text-foreground mb-6">Send us a message</h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
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
                                        <div className="space-y-2">
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
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone</Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="(555) 123-4567"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="vehicle">Vehicle</Label>
                                            <Input
                                                id="vehicle"
                                                value={formData.vehicle}
                                                onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                                                placeholder="e.g., 2024 Tesla Model 3"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="message">Message *</Label>
                                        <Textarea
                                            id="message"
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            placeholder="How can we help you today?"
                                            rows={6}
                                            required
                                            className={errors.message ? "border-destructive" : ""}
                                        />
                                        {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-gradient-hero min-h-[50px] text-lg font-semibold"
                                        disabled={submitting || !isValid()}
                                    >
                                        {submitting ? "Sending..." : (
                                            <>
                                                <Send className="h-5 w-5 mr-2" />
                                                Send Support Request
                                            </>
                                        )}
                                    </Button>

                                    {submitted && (
                                        <SuccessMessage
                                            title="Message received"
                                            description="Thank you for reaching out. We've received your support request and will respond shortly."
                                        />
                                    )}
                                </form>
                            </div>
                        </Card>
                    </div>

                    {/* Map/Secondary Column */}
                    <div className="space-y-4">
                        <Card className="p-4 bg-gradient-card border-border overflow-hidden h-full min-h-[300px]">
                            <h3 className="text-lg font-bold text-foreground mb-4">Our Service Area</h3>
                            <iframe
                                title="Business Location"
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d47093.99823879164!2d-71.21912523125!3d42.742358!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e30f8b9f0b3f0d%3A0x3e947e3c90c3e0a3!2sMethuen%2C%20MA!5e0!3m2!1sen!2sus!4v1234567890"
                                width="100%"
                                height="85%"
                                style={{ border: 0, borderRadius: '8px' }}
                                allowFullScreen
                                loading="lazy"
                            />
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ContactSupport;

