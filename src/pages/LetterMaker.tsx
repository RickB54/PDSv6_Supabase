import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Printer, Save, Sparkles, Loader2, Users, Mail, Calendar, Copy } from "lucide-react";
import { getUnifiedCustomers } from "@/lib/customers";
import { Customer } from "@/lib/supa-data";
import { refineTextWithAI } from "@/lib/ai-refiner";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import logo from "@/assets/pds-final-logo.png";
import { cn } from "@/lib/utils";

interface LetterTemplate {
    id: string;
    name: string;
    category: string;
    subject: string;
    body: string;
}

const DETAILING_TEMPLATES: LetterTemplate[] = [
    {
        id: "new_lead_welcome",
        name: "New Lead Welcome & Intro",
        category: "Lead Acquisition",
        subject: "Thank You for Your Inquiry - Prime Auto Detail",
        body: `Dear {Customer Name},\n\nThank you for reaching out to Prime Auto Detail! We are thrilled to assist you with premium care options for your vehicle.\n\nAt Prime Auto Detail, we specialize in luxury automotive preservation, multi-stage paint correction, and industry-grade ceramic coatings. Whether you are looking to protect a brand-new daily driver or restore the deep, reflective shine of a treasured enthusiast car, we customize each service protocol to fit your exact goals.\n\nWe would love to discuss your detailing needs and provide a tailored estimate. Let us know a convenient time to connect, or feel free to reply with a few photos of your vehicle so we can recommend the best path forward.\n\nBest regards,\n\nRick Berube\nPrime Auto Detail`
    },
    {
        id: "spring_seasonal_promo",
        name: "Spring/Seasonal Paint Prep Promotion",
        category: "Marketing & Promotion",
        subject: "Restore Your Vehicle's Shine This Season!",
        body: `Dear {Customer Name},\n\nWith the change of season, winter's harsh road salt, grime, and environmental contaminants have likely settled on your vehicle's delicate clear coat. Leaving these abrasive contaminants on your paint can lead to premature oxidation, microscopic clear-coat etching, and a loss of clarity.\n\nOur signature Spring Paint Prep and Decontamination Service is designed to safely dissolve deeply embedded metallic iron particles and road film, followed by the application of a high-lubricity synthetic paint sealant. This restores absolute slickness, hydrophobic water-beading performance, and premium UV protection.\n\nSpaces fill up extremely fast during this beautiful time of year. Contact us at 978-566-1008 or book online to secure your session and get your vehicle looking its absolute best!\n\nSincerely,\n\nRick Berube\nPrime Auto Detail`
    },
    {
        id: "ceramic_coating_annual",
        name: "Ceramic Coating Annual Maintenance",
        category: "Client Retention",
        subject: "Time for Your Ceramic Coating Annual Inspection & Reset Wash",
        body: `Dear {Customer Name},\n\nWe hope you have been enjoying the outstanding hydrophobic self-cleaning performance, deep gloss, and high chemical resistance of your premium ceramic coating!\n\nTo ensure your coating continues to perform at its peak and to keep your professional application warranty fully active, we recommend scheduling your annual inspection and decontamination wash. Over the past year, road film and industrial fallout may have clogged the coating's microscopic pores, which can temporarily reduce water-beading.\n\nDuring this specialized inspection service, our team will perform a safe contact-less foam bath, an intensive chemical iron decontamination, and apply an active ceramic silica booster to fully revitalize and recharge your coating.\n\nLet's get your coating inspected and refreshed. Reply to this email or call us to schedule your annual appointment.\n\nBest regards,\n\nRick Berube\nPrime Auto Detail`
    },
    {
        id: "maintenance_membership",
        name: "Maintenance Wash Membership Club",
        category: "Upsell & Recurring",
        subject: "Exclusive Invitation: Join Our Premium Detailing Maintenance Club",
        body: `Dear {Customer Name},\n\nNow that your vehicle has been fully corrected, detailed, and protected, the most critical step is ensuring it is washed safely using high-lubricity wash mitts, grit guards, and premium pH-neutral soaps to prevent introducing unsightly micro-scratches and wash marring.\n\nWe are excited to invite you to join our exclusive Maintenance Wash Club. This program is reserved strictly for clients who have had a full detail or ceramic coating with us. We perform scheduled bi-weekly or monthly touchless and low-contact washes to maintain that pristine showroom gloss year-round at a highly discounted rate.\n\nLet us take the hard work and risk out of keeping your investment clean. Please let us know if you'd like us to set up your custom maintenance plan!\n\nWarm regards,\n\nRick Berube\nPrime Auto Detail`
    },
    {
        id: "post_service_thanks",
        name: "Post-Detail Thank You & Review Request",
        category: "Reputation & Feedback",
        subject: "Thank You for Choosing Prime Auto Detail!",
        body: `Dear {Customer Name},\n\nThank you so much for trusting Prime Auto Detail with your vehicle's recent service! Our ultimate goal is to deliver a showroom-quality finish and absolute surface protection on every detail.\n\nWe hope you are completely thrilled with the final results. As a small, local business dedicated to premium craftsmanship, our reputation relies heavily on word-of-mouth recommendations. If you have a moment, we would be incredibly grateful if you could share your experience by leaving us a brief review.\n\n[Google Review QR Code]\n\nYour feedback helps other luxury car owners discover the difference our meticulous detailing makes.\n\nThank you again for your support, and we look forward to caring for your vehicle in the future!\n\nSincerely,\n\nRick Berube\nPrime Auto Detail`
    },
    {
        id: "lost_client_winback",
        name: "Lost Client Re-Engagement",
        category: "Client Retention",
        subject: "We Miss Seeing Your Vehicle Shine - Exclusive Re-Engagement Offer",
        body: `Dear {Customer Name},\n\nIt has been a while since we last had the pleasure of detailing your vehicle, and we want to make sure it is still maintaining premium protection and that brilliant showroom shine!\n\nRegular environmental exposure to UV rays, acid rain, bird droppings, and industrial fallout can degrade your clear coat over time if left unprotected. We would love to have you back in our shop to perform a comprehensive maintenance detail.\n\nTo make it even easier to return, we are pleased to offer you an exclusive $25 loyalty discount on any signature package booked this month. Just mention this correspondence when scheduling.\n\nLet's get your vehicle looking pristine again. Reply to this letter or contact us at 978-566-1008 to schedule.\n\nWarmly,\n\nRick Berube\nPrime Auto Detail`
    },
    {
        id: "paint_correction_followup",
        name: "Paint Correction Consultation Follow-Up",
        category: "Sales Follow-Up",
        subject: "Your Custom Paint Correction & Enhancement Plan - Prime Auto Detail",
        body: `Dear {Customer Name},\n\nIt was great speaking with you recently about your vehicle and assessing the clear coat condition. As we discussed, clear coat defects like swirls, holographic marring, and microscopic scratches prevent light from reflecting straight back, which results in a dull, hazy appearance.\n\nOur multi-stage machine paint correction process uses professional compounding and polishing to safely shave down sub-micron layers of damaged clear coat, leveling the surface to restore absolute clarity, depth, and mirror-like reflections.\n\nWe recommend pairing this correction service with our professional 2-year or 5-year ceramic coatings to lock in that flawless finish and guard against future oxidation. Please let us know if you would like to move forward with the scheduled correction date or have any additional questions!\n\nBest regards,\n\nRick Berube\nPrime Auto Detail`
    },
    {
        id: "gift_card_holiday",
        name: "Gift Card & Holiday Detailing Promo",
        category: "Marketing & Promotion",
        subject: "Give the Gift of a Showroom Finish - Premium Detail Gift Cards",
        body: `Dear {Customer Name},\n\nWith the upcoming holidays and gift-giving season approaching, finding the perfect present for the automotive enthusiast, business professional, or luxury vehicle owner in your life can be a challenge.\n\nGive a gift that truly stands out: a premium detailing voucher or custom gift card from Prime Auto Detail! From high-end interior detailing to extensive multi-stage paint correction and ceramic coatings, we deliver absolute perfection and premium care.\n\nWe make it exceptionally simple with digital e-gift cards or beautifully printed physical presentation vouchers that can be delivered straight to your door.\n\nContact us today or visit our site at PrimeAutoDetail.net to order the ultimate detailing gift!\n\nWarm regards,\n\nRick Berube\nPrime Auto Detail`
    },
    {
        id: "commercial_fleet_proposal",
        name: "Commercial & Fleet Detailing Proposal",
        category: "Business Development",
        subject: "Commercial Fleet Detailing & Image Maintenance Services",
        body: `Dear {Customer Name},\n\nIn the business world, first impressions are everything, and your company vehicles are mobile billboards that represent your brand to the public every day. A clean, pristine fleet projects professionalism, meticulous care, and premium quality.\n\nPrime Auto Detail offers customized commercial fleet wash and detailing plans designed specifically for local businesses. We provide meticulous care for executive transport cars, service vehicles, and commercial trucks, using professional, paint-safe decontamination protocols that protect your vehicle assets and keep resale values high.\n\nWe offer convenient on-site mobile detailing options or scheduled service days at our shop to keep your downtime to a minimum. Let us know a convenient time to meet and design a fleet package tailored to your company's needs.\n\nSincerely,\n\nRick Berube\nPrime Auto Detail`
    },
    {
        id: "pre_winter_protection",
        name: "Pre-Winter Paint Protection Plan",
        category: "Marketing & Promotion",
        subject: "Is Your Vehicle Protected Against the Upcoming Winter Grime?",
        body: `Dear {Customer Name},\n\nAs temperatures begin to drop, the most brutal season for your vehicle's paintwork is just around the corner. Winter roads mean salt brine, snow plow chemicals, moisture, and road grit, which acts like an abrasive sandpaper on unprotected paint.\n\nWithout a dedicated sacrificial layer of protection, these corrosive chemicals can lead to accelerated surface oxidation and permanent damage to wheels and clear coats.\n\nOur Pre-Winter Protection Service installs a premium, heavy-duty synthetic sealant or a dedicated ceramic boost spray that acts as an impermeable chemical shield. This makes it incredibly easy to rinse off road salt and snow during the winter months, keeping your vehicle safe until spring.\n\nLet's get your paint winter-proofed. Reply to this letter or book online to secure your appointment today!\n\nSincerely,\n\nRick Berube\nPrime Auto Detail`
    }
];

const LetterMaker = () => {
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    
    const initialCustomerId = searchParams.get('customerId') || "";
    const initialSubject = searchParams.get('subject') || "";
    const initialBody = searchParams.get('body') || "";

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState(initialCustomerId);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [subject, setSubject] = useState(initialSubject);
    const [body, setBody] = useState(initialBody);
    const [isRefining, setIsRefining] = useState(false);

    useEffect(() => {
        const loadCustomers = async () => {
            const custs = await getUnifiedCustomers();
            setCustomers(custs as Customer[]);
        };
        loadCustomers();
    }, []);

    const handleTemplateSelect = (templateId: string) => {
        const template = DETAILING_TEMPLATES.find(t => t.id === templateId);
        if (!template) return;
        
        const customer = customers.find(c => c.id === selectedCustomer);
        const customerName = customer ? customer.name : "Valued Customer";
        
        setSubject(template.subject);
        
        let processedBody = template.body.replace(/{Customer Name}/g, customerName);
        setBody(processedBody);
        
        toast({
            title: "Template Loaded",
            description: `"${template.name}" has been loaded and tailored.`
        });
    };

    const handleCustomerChange = (customerId: string) => {
        setSelectedCustomer(customerId);
        const customer = customers.find(c => c.id === customerId);
        const name = customer ? customer.name : "Valued Customer";
        
        if (body.startsWith("Dear ")) {
            const currentGreetingEndIdx = body.indexOf(",\n\n");
            if (currentGreetingEndIdx !== -1) {
                const restOfBody = body.substring(currentGreetingEndIdx);
                setBody(`Dear ${name}${restOfBody}`);
            }
        }
    };

    const handleCopyToClipboard = () => {
        if (!body.trim()) {
            toast({ title: "No text found", description: "There is no letter body to copy.", variant: "destructive" });
            return;
        }
        
        const fullText = `Subject: ${subject}\n\n${body}`;
        navigator.clipboard.writeText(fullText);
        toast({
            title: "Copied to Clipboard!",
            description: "Subject and Letter Body copied to clipboard."
        });
    };

    const handleAIEnhance = async () => {
        if (!body.trim()) {
            toast({ title: "No text found", description: "Please enter some text to enhance.", variant: "destructive" });
            return;
        }
        setIsRefining(true);
        try {
            const refined = await refineTextWithAI(body);
            setBody(refined);
            toast({ title: "Text Polished", description: "Your letter has been professionally enhanced." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to enhance text.", variant: "destructive" });
        } finally {
            setIsRefining(false);
        }
    };

    const generatePDF = (action: 'print' | 'download') => {
        const doc = new jsPDF();
        const customer = customers.find(c => c.id === selectedCustomer);
        
        // Standardized Header (from Estimates/Invoices)
        try {
            const logoWidth = 28;
            const logoHeight = 28;
            doc.addImage(logo, 'PNG', 20, 10, logoWidth, logoHeight);
            
            // Contact Info next to logo
            doc.setFontSize(13);
            doc.setTextColor(16, 185, 129); // Emerald color
            doc.setFont("helvetica", "bold");
            doc.text("Rick Berube", 52, 14);
            
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.setFont("helvetica", "normal");
            doc.text("54 Boston Street, Methuen MA 01844", 52, 19);
            doc.text("Rick.PrimeAutoDetail@gmail.com", 52, 24);
            doc.text("https://PrimeAutoDetail.net", 52, 29);
            doc.text("978-566-1008", 52, 34);
            
            // Company Name on the Right
            doc.setFontSize(14);
            doc.setTextColor(16, 185, 129);
            doc.setFont("helvetica", "bold");
            doc.text("Prime Auto Detail", 190, 14, { align: "right" });
            
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            doc.text("Correspondence", 190, 20, { align: "right" });
        } catch (e) {
            console.warn("Header failed", e);
            doc.setFontSize(16);
            doc.text("Prime Auto Detail", 105, 15, { align: "center" });
        }

        const startY = 50;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);

        // Date
        doc.text(`Date: ${new Date(date).toLocaleDateString()}`, 20, startY);

        // Recipient
        if (customer) {
            doc.setFont("helvetica", "bold");
            doc.text("To:", 20, startY + 10);
            doc.setFont("helvetica", "normal");
            doc.text(customer.name, 30, startY + 10);
            if (customer.address) {
                doc.text(customer.address, 30, startY + 16);
            }
        } else {
            doc.text("To: Valued Customer", 20, startY + 10);
        }

        // Subject
        if (subject) {
            doc.setFont("helvetica", "bold");
            doc.text(`Subject: ${subject}`, 20, startY + 28);
            doc.line(20, startY + 30, 190, startY + 30);
        }

        // Body
        doc.setFont("helvetica", "normal");
        if (body.includes("[Google Review QR Code]")) {
            const parts = body.split("[Google Review QR Code]");
            const beforeText = parts[0];
            const afterText = parts[1];
            
            // Print the first half
            const splitBefore = doc.splitTextToSize(beforeText, 170);
            doc.text(splitBefore, 20, startY + 40);
            
            // Calculate height of beforeText
            const beforeLines = splitBefore.length;
            const scaleFactor = doc.internal.scaleFactor;
            const lineHeightMm = doc.getLineHeight() / scaleFactor;
            const beforeHeight = beforeLines * lineHeightMm;
            
            const qrY = startY + 40 + beforeHeight + 5;
            const qrSize = 45; // 45x45 mm QR Code
            
            try {
                // Add the Google Review QR Code image
                doc.addImage("/Google Review QR Code.png", "PNG", 82, qrY, qrSize, qrSize);
            } catch (e) {
                console.error("Failed to add QR code image to PDF:", e);
                doc.setFont("helvetica", "italic");
                doc.text("[Google Review QR Code Image]", 105, qrY + (qrSize / 2), { align: "center" });
                doc.setFont("helvetica", "normal");
            }
            
            // Print the second half below the QR Code
            const splitAfter = doc.splitTextToSize(afterText, 170);
            doc.text(splitAfter, 20, qrY + qrSize + 8);
        } else {
            const splitText = doc.splitTextToSize(body, 170);
            doc.text(splitText, 20, startY + 40);
        }

        // Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("Prime Auto Detail - Professional Mobile Detailing Services", 105, pageHeight - 15, { align: "center" });

        if (action === 'download') doc.save(`Letter_${customer?.name || 'Customer'}.pdf`);
        else window.open(doc.output('bloburl'), '_blank');
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="Company Letter Maker" />
            <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
                <Card className="p-6 bg-zinc-950 border-zinc-800 shadow-xl">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-zinc-400 flex items-center gap-2">
                                    <Users className="h-4 w-4" /> Recipient (Customer/Prospect)
                                </Label>
                                <select 
                                    className="w-full bg-zinc-900 border-zinc-800 rounded-md p-2 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                                    value={selectedCustomer}
                                    onChange={(e) => handleCustomerChange(e.target.value)}
                                >
                                    <option value="">Select a Recipient...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} {c.type ? `(${c.type})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Letter Date
                                </Label>
                                <Input 
                                    type="date" 
                                    value={date} 
                                    onChange={(e) => setDate(e.target.value)}
                                    className="bg-zinc-900 border-zinc-800 text-white"
                                />
                            </div>
                        </div>

                        {/* TEMPLATE PICKER */}
                        <div className="space-y-2">
                            <Label className="text-zinc-400 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-emerald-400" /> Select Professional Detailing Letter Template (10 Available)
                            </Label>
                            <select 
                                className="w-full bg-zinc-900 border-zinc-800 rounded-md p-2.5 text-white focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-semibold uppercase tracking-tight"
                                onChange={(e) => handleTemplateSelect(e.target.value)}
                            >
                                <option value="">-- Choose Detailing Letter Template --</option>
                                {DETAILING_TEMPLATES.map(t => (
                                    <option key={t.id} value={t.id}>[{t.category}] {t.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-400 flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Subject Line
                            </Label>
                            <Input 
                                placeholder="e.g., Thank You for Your Recent Inquiry" 
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-zinc-400 flex items-center gap-2">
                                    <Mail className="h-4 w-4" /> Letter Body
                                </Label>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleAIEnhance}
                                    disabled={isRefining || !body.trim()}
                                    className="h-8 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20"
                                >
                                    {isRefining ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Sparkles className="h-3 w-3 mr-2" />}
                                    AI Professional Refine
                                </Button>
                            </div>
                            <Textarea 
                                placeholder="Start writing your professional message here..."
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="min-h-[400px] bg-zinc-900 border-zinc-800 text-white leading-relaxed text-base p-4 focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-800">
                            <Button 
                                type="button"
                                variant="outline"
                                onClick={() => window.history.back()}
                                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 px-6 font-bold"
                            >
                                Cancel
                            </Button>
                            
                            <Button 
                                type="button"
                                onClick={handleCopyToClipboard}
                                className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-bold"
                            >
                                <Copy className="h-4 w-4 mr-2 text-indigo-400" /> Copy Letter
                            </Button>

                            <Button 
                                type="button"
                                onClick={() => generatePDF('print')}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-bold"
                            >
                                <Printer className="h-4 w-4 mr-2 text-emerald-400" /> Preview & Print
                            </Button>
                            
                            <Button 
                                type="button"
                                onClick={() => generatePDF('download')}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 font-bold"
                            >
                                <Save className="h-4 w-4 mr-2" /> Download PDF
                            </Button>
                        </div>
                    </div>
                </Card>

                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex gap-4 items-start">
                    <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-500">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="text-emerald-500 font-bold text-sm uppercase tracking-wider">AI Writing Tip</h4>
                        <p className="text-zinc-400 text-sm mt-1">Write your basic thoughts or bullet points first, then use the **AI Professional Refine** button to transform them into a polished corporate letter.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LetterMaker;
