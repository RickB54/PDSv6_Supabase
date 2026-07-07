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
import { Mail, Phone, MapPin, Clock, ArrowLeft, Info, Star, CarFront, Check, Snowflake, Image as ImageIcon, X, HelpCircle, Tag } from "lucide-react";
import { savePDFToArchive } from "@/lib/pdfArchive";
import jsPDF from "jspdf";
import api from "@/lib/api";
import { isSupabaseEnabled, getCurrentUser } from "@/lib/auth";
import { useDemoMode } from "@/contexts/DemoContext";
import * as contactSvc from "@/services/supabase/contact";
import { upsertSupabaseCustomer } from "@/lib/supa-data";
import { servicePackages as builtInPackages, addOns as builtInAddOns } from "@/lib/services";
import { getCustomServices, getAllPackageMeta, getAllAddOnMeta } from "@/lib/servicesMeta";
import { normalizeVehicleType } from "@/lib/pricingHelpers";
import VehicleSelectorModal from "@/components/vehicles/VehicleSelectorModal";
import logo from "@/assets/logo-primary.png";

export const sanitizeShopOnlyText = (text: string, isShopOnly: boolean) => {
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

const Contact = () => {
  const { isDemoMode } = useDemoMode();
  const user = getCurrentUser();
  const isAdmin = user?.role === 'admin' || isDemoMode;
  const isRickAdmin = user?.email === 'rberube54@gmail.com' || user?.email === 'Rick.PrimeAutoDetail@gmail.com';
  const { toast } = useToast();
  const [showAbout, setShowAbout] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ hours: string; phone: string; address: string; email: string } | null>(null);
  const [liveServices, setLiveServices] = useState<{ id: string, name: string }[]>([]);
  const [showClassificationModal, setShowClassificationModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    vehicleYear: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleColor: "",
    vehicleCondition: "",
    vehicleType: "",
    serviceInterested: "",
    preferredTiming: "",
    howFound: "",
    message: "",
    placeOfService: "Customer's address"
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showBookNow, setShowBookNow] = useState(false);
  const [businessStatus, setBusinessStatus] = useState<any>(null);
  const [lastMailto, setLastMailto] = useState("");

  // Automatically classify the vehicle class based on selected Make & Model
  useEffect(() => {
    if (formData.vehicleMake || formData.vehicleModel) {
      const query = `${formData.vehicleMake} ${formData.vehicleModel}`.trim();
      const detected = normalizeVehicleType(query);
      if (detected) {
        setFormData(prev => ({ ...prev, vehicleType: detected }));
      }
    }
  }, [formData.vehicleMake, formData.vehicleModel]);

  const handleFillTestData = async () => {
    if (window.confirm("Would you like to PURGE all previous 'Rick Berube' test history (bookings, prospects, CRM cards) before auto-filling?")) {
      try {
        if (isSupabaseEnabled()) {
           await supabase.from('bookings').delete().ilike('notes', '%pre-filled test%');
           await supabase.from('customers').delete().ilike('notes', '%pre-filled test%');
           await supabase.from('engagements').delete().ilike('message', '%pre-filled test%');
           toast({ title: "Test History Purged", description: "Previous test records have been permanently removed." });
        }
      } catch (err) {
        console.error("Purge failed:", err);
      }
    }

    const matchedService = liveServices.find(s => s.name.toLowerCase().includes("essential full"))?.name || "Prime Essential Full Detail";

    setFormData({
      name: "Rick Berube",
      email: "rberube54+test@gmail.com",
      phone: "978-764-5047",
      address: "54 Boston Street",
      city: "Methuen",
      vehicleYear: "2018",
      vehicleMake: "Ford",
      vehicleModel: "F-150",
      vehicleColor: "Black",
      vehicleCondition: "Excellent",
      vehicleType: "truck",
      serviceInterested: matchedService,
      preferredTiming: "Flexible",
      howFound: "google",
      message: "This is a pre-filled test inquiry submitted by Rick Berube (Admin) to verify real-time notifications, PDF archiving, bucket photo uploads, and display within the Prospects and Customer CRM galleries.",
      placeOfService: "Shop in Methuen"
    });
    setAttachments([]); // No photos are pre-uploaded
    setErrors({});
    toast({
      title: "🧪 Sandbox Mode Active",
      description: "Pre-filled Rick Berube's test details (without auto-uploading images)!",
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      const imageFiles = newFiles.filter(f => f.type.startsWith("image/"));
      
      setAttachments((prev) => {
        const existingNames = new Set(prev.map(f => f.name));
        const uniqueNewFiles = imageFiles.filter(f => !existingNames.has(f.name));
        return [...prev, ...uniqueNewFiles];
      });
    }
  };

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
    if (formData.placeOfService !== 'Shop in Methuen' && !formData.city.trim()) {
      newErrors.city = "City / Town is required";
    }
    if (!formData.vehicleYear) newErrors.vehicleYear = "Vehicle Year is required";
    if (!formData.vehicleMake) newErrors.vehicleMake = "Vehicle Make is required";
    if (!formData.vehicleModel.trim()) newErrors.vehicleModel = "Vehicle Model is required";
    if (!formData.vehicleColor) newErrors.vehicleColor = "Vehicle Color is required";
    if (!formData.vehicleType) newErrors.vehicleType = "Vehicle Type / Class is required";
    if (!formData.serviceInterested) newErrors.serviceInterested = "Please select a service of interest";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      console.warn("Validation failing on:", newErrors);
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      const fieldList = Object.keys(errors); // This might be stale due to setState, better use newErrors in validateForm but for now:
      toast({
        title: "Missing Information",
        description: "Please check all required fields (Name, Email, Phone, City, Vehicle, Service).",
        variant: "destructive"
      });
      return;
    }

    // 2. Upload Files to Supabase Storage if any
    let fileUrls: string[] = [];
    if (attachments.length > 0 && isSupabaseEnabled()) {
      setSubmitting(true);
      try {
        for (const file of attachments) {
          const filePath = `prospects/${Date.now()}_${file.name}`;
          const { data, error: uploadError } = await supabase.storage
            .from('customer_media')
            .upload(filePath, file);
          
          if (uploadError) {
            console.error("Storage upload error:", uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          if (data) {
            const { data: { publicUrl } } = supabase.storage.from('customer_media').getPublicUrl(filePath);
            fileUrls.push(publicUrl);
          }
        }
      } catch (uploadErr: any) {
        toast({
          title: "Upload Failed",
          description: uploadErr.message || "Could not upload photos. Please try again or submit without photos.",
          variant: "destructive"
        });
        setSubmitting(false);
        return;
      }
    }

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
          generalPhotos: fileUrls,
          beforePhotos: fileUrls,
          vehicles: [
            {
              make: formData.vehicleMake,
              model: formData.vehicleModel,
              year: formData.vehicleYear,
              placeOfService: formData.placeOfService,
              type: formData.vehicleType,
              color: formData.vehicleColor || 'Black',
              conditionOutside: formData.vehicleCondition,
              generalPhotos: fileUrls,
              beforePhotos: fileUrls
            }
          ],
          notes: `[Inquiry] Preferred Timing: ${formData.preferredTiming}\nPlace of Service: ${formData.placeOfService}\n\nVehicle Details: ${formData.vehicleYear} ${formData.vehicleMake} ${formData.vehicleModel}${formData.vehicleColor ? ` (Color: ${formData.vehicleColor})` : ''}${formData.vehicleCondition ? ` (Condition: ${formData.vehicleCondition})` : ''}\nClass: ${formData.vehicleType}\n\nClient Message: ${formData.message}${fileUrls.length > 0 ? `\n\nAttached Photos:\n${fileUrls.join('\n')}` : ''}`
        });

        // Also create a contact record for redundancy and history
        await contactSvc.create({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: `Vehicle: ${formData.vehicleYear} ${formData.vehicleMake} ${formData.vehicleModel} (${formData.vehicleType})${formData.vehicleColor ? `, Color: ${formData.vehicleColor}` : ''}${formData.vehicleCondition ? `\nCondition: ${formData.vehicleCondition}` : ''}\nService: ${formData.serviceInterested}\nTiming: ${formData.preferredTiming}\n\n${formData.message}${fileUrls.length > 0 ? `\n\nAttached Photos:\n${fileUrls.join('\n')}` : ''}`,
        }).catch(() => {});

        // Proactively send a premium formatted HTML email to Rick's email address
        try {
          const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e4e4e7; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
              <div style="background: linear-gradient(135deg, #065f46 0%, #10b981 100%); padding: 40px 24px; text-align: center; color: #ffffff;">
                <div style="font-size: 56px; margin-bottom: 16px;">🚗</div>
                <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">New Vehicle Evaluation Inquiry!</h1>
                <p style="margin: 8px 0 0; font-size: 16px; opacity: 0.9;">A prospect has submitted vehicle details for condition assessment.</p>
              </div>
              <div style="padding: 32px 24px;">
                <h2 style="color: #18181b; margin-top: 0; font-size: 18px; font-weight: 700; border-bottom: 2px solid #f4f4f5; padding-bottom: 12px; text-transform: uppercase; tracking: 0.05em;">Prospect Details</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 28px;">
                  <tr>
                    <td style="padding: 10px 0; color: #71717a; font-weight: 600; width: 140px; font-size: 14px;">Customer Name:</td>
                    <td style="padding: 10px 0; color: #18181b; font-weight: 700; font-size: 14px;">${formData.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #71717a; font-weight: 600; font-size: 14px;">Email Address:</td>
                    <td style="padding: 10px 0; font-size: 14px;"><a href="mailto:${formData.email}" style="color: #10b981; text-decoration: none; font-weight: 700;">${formData.email}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #71717a; font-weight: 600; font-size: 14px;">Phone Number:</td>
                    <td style="padding: 10px 0; font-size: 14px;"><a href="tel:${formData.phone}" style="color: #18181b; text-decoration: none; font-weight: 700;">${formData.phone}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #71717a; font-weight: 600; font-size: 14px;">Location:</td>
                    <td style="padding: 10px 0; color: #18181b; font-weight: 700; font-size: 14px;">${formData.address ? `${formData.address}, ` : ''}${formData.city}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #71717a; font-weight: 600; font-size: 14px;">Place of Service:</td>
                    <td style="padding: 10px 0; color: #18181b; font-weight: 700; font-size: 14px;">${formData.placeOfService}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #71717a; font-weight: 600; font-size: 14px;">Vehicle Spec:</td>
                    <td style="padding: 10px 0; color: #18181b; font-weight: 700; font-size: 14px;">${formData.vehicleYear} ${formData.vehicleMake} ${formData.vehicleModel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #71717a; font-weight: 600; font-size: 14px;">Vehicle Color:</td>
                    <td style="padding: 10px 0; color: #18181b; font-weight: 700; font-size: 14px;">${formData.vehicleColor || 'Not Specified'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #71717a; font-weight: 600; font-size: 14px;">Vehicle Class:</td>
                    <td style="padding: 10px 0; color: #18181b; font-weight: 700; font-size: 14px; text-transform: capitalize;">${formData.vehicleType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #71717a; font-weight: 600; font-size: 14px;">Vehicle Condition:</td>
                    <td style="padding: 10px 0; color: #18181b; font-weight: 700; font-size: 14px;">${formData.vehicleCondition || 'Not Specified'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #71717a; font-weight: 600; font-size: 14px;">Service Desired:</td>
                    <td style="padding: 10px 0; color: #047857; font-weight: 800; font-size: 14px; text-transform: uppercase;">${formData.serviceInterested}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #71717a; font-weight: 600; font-size: 14px;">Preferred Timing:</td>
                    <td style="padding: 10px 0; color: #18181b; font-weight: 700; font-size: 14px;">${formData.preferredTiming}</td>
                  </tr>
                </table>
                
                <h2 style="color: #18181b; margin-top: 0; font-size: 18px; font-weight: 700; border-bottom: 2px solid #f4f4f5; padding-bottom: 12px; text-transform: uppercase; tracking: 0.05em;">Prospect Message</h2>
                <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px; color: #3f3f46; font-style: italic; line-height: 1.6; margin-top: 14px; margin-bottom: 28px; font-size: 14px; border-left: 4px solid #10b981;">
                  "${formData.message || 'No additional questions or comments provided.'}"
                </div>
                
                ${fileUrls.length > 0 ? `
                  <h2 style="color: #18181b; margin-top: 0; font-size: 18px; font-weight: 700; border-bottom: 2px solid #f4f4f5; padding-bottom: 12px; text-transform: uppercase; tracking: 0.05em;">Attached Vehicle Condition Photos (${fileUrls.length})</h2>
                  <div style="margin-top: 16px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                    ${fileUrls.map((url, index) => `
                      <div style="border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; background-color: #fafafa; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                        <a href="${url}" target="_blank" style="text-decoration: none; display: block;">
                          <img src="${url}" alt="Vehicle Attachment ${index + 1}" style="width: 100%; height: 140px; object-fit: cover; display: block; border-bottom: 1px solid #e4e4e7;" />
                          <div style="padding: 10px; text-align: center; color: #10b981; font-weight: 700; font-size: 12px; text-transform: uppercase; tracking: 0.05em; background-color: #ffffff;">View Full Image</div>
                        </a>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
                
                <div style="text-align: center; margin-top: 40px; border-top: 1px solid #f4f4f5; padding-top: 32px;">
                  <a href="${window.location.origin}/prospects?search=${encodeURIComponent(formData.name)}" 
                     style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3); font-size: 14px;">
                     Open in Prospects CRM
                  </a>
                </div>
              </div>
              <div style="background-color: #fafafa; padding: 24px; text-align: center; border-top: 1px solid #f4f4f5;">
                <p style="margin: 0; color: #a1a1aa; font-size: 12px; font-weight: 500;">&copy; ${new Date().getFullYear()} Prime Auto Detail. All rights reserved.</p>
              </div>
            </div>
          `;

          await supabase.functions.invoke('send-booking-email', {
            body: {
              to: 'Rick.PrimeAutoDetail@gmail.com',
              subject: `🔔 NEW VEHICLE EVALUATION: ${formData.name} - ${formData.vehicleType}`,
              customerName: formData.name,
              service: formData.serviceInterested,
              html: emailHtml
            }
          });
        } catch (emailErr) {
          console.warn("Failed to send notification email to Rick:", emailErr);
        }
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
    doc.text(`Vehicle: ${formData.vehicleYear} ${formData.vehicleMake} ${formData.vehicleModel}`, 20, 80);
    doc.text(`Vehicle Color: ${formData.vehicleColor || 'Not Specified'}`, 20, 90);
    doc.text(`Vehicle Class: ${formData.vehicleType}`, 20, 100);
    doc.text(`Vehicle Condition: ${formData.vehicleCondition || 'Not Specified'}`, 20, 110);
    doc.text(`Service: ${formData.serviceInterested}`, 20, 120);
    doc.text(`Desired Timing: ${formData.preferredTiming}`, 20, 130);
    doc.text(`Place of Service: ${formData.placeOfService}`, 20, 140);
    
    let yPos = 155;
    if (fileUrls.length > 0) {
      doc.text("Files Attached:", 20, yPos);
      yPos += 10;
      doc.setFontSize(8);
      fileUrls.forEach(url => {
        doc.text(url, 20, yPos);
        yPos += 5;
      });
      yPos += 5;
      doc.setFontSize(12);
    }

    doc.text("Message:", 20, yPos);
    yPos += 10;

    const lines = doc.splitTextToSize(formData.message, 170);
    doc.text(lines, 20, yPos);

    const pdfDataUrl = doc.output('dataurlstring');
    savePDFToArchive("Prospects", formData.name, `inquiry_${Date.now()}`, pdfDataUrl);

    // Generate Universal mailto link for ALL mail clients (Yahoo, Outlook, Apple, etc.)
    const subject = `Service Inquiry: ${formData.name} [${formData.vehicleYear} ${formData.vehicleMake} ${formData.vehicleModel}]`;
    const body = `New Service Inquiry\n\n` +
      `Name: ${formData.name}\n` +
      `Email: ${formData.email}\n` +
      `Phone: ${formData.phone}\n` +
      `Address: ${formData.address}, ${formData.city}\n` +
      `Vehicle: ${formData.vehicleYear} ${formData.vehicleMake} ${formData.vehicleModel} (${formData.vehicleType})\n` +
      `Color: ${formData.vehicleColor || 'Not Specified'}\n` +
      `Condition: ${formData.vehicleCondition || 'Not Specified'}\n` +
      `Interested In: ${formData.serviceInterested}\n` +
      `Timing: ${formData.preferredTiming}\n\n` +
      (fileUrls.length > 0 ? `ATTACHED PHOTOS (${fileUrls.length}):\n${fileUrls.join('\n')}\n\n` : '') +
      `Message:\n${formData.message}\n\n` +
      `Submitted: ${new Date().toLocaleString()}`;
    
    const mailtoLink = `mailto:Rick.PrimeAutoDetail@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setLastMailto(mailtoLink);
    
    // Instead of forcing a redirect, we set submitted=true and let the user decide if they want to click a 'Send Email Copy' button
    // This allows non-Gmail users to stay on the page and see the success message
    setSubmitted(true);
    setSubmitting(false);

    toast({
      title: "Inquiry Saved!",
      description: "We've received your info and saved it to our system.",
    });

    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      vehicleYear: "",
      vehicleMake: "",
      vehicleModel: "",
      vehicleColor: "",
      vehicleCondition: "",
      vehicleType: "",
      serviceInterested: "",
      preferredTiming: "",
      howFound: "",
      message: "",
      placeOfService: "Customer's address"
    });
    setAttachments([]);
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
            const bs = globalMeta.meta.businessStatus;
            setBusinessStatus(bs);
            if (bs.shopOnly) {
              setFormData(prev => ({
                ...prev,
                placeOfService: "Shop in Methuen",
                address: "54 Boston Street",
                city: "Methuen"
              }));
            }
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
            businessStatus.mode === 'winter-closed' ? 'border-blue-500/50 bg-blue-500/5' : 
            businessStatus.mode === 'marketing' ? 'border-purple-500/50 bg-purple-500/5 shadow-[0_0_25px_rgba(168,85,247,0.15)]' : 'border-blue-500/50 bg-blue-50/30'
          }`}>
             <div className={`${
               businessStatus.mode === 'winter-closed' ? 'bg-blue-600' : 
               businessStatus.mode === 'marketing' ? 'bg-purple-600' : 'bg-blue-600'
             } px-6 py-5 flex items-center gap-4`}>
                <div className="p-2 bg-white/20 rounded-lg">
                  {businessStatus.mode === 'winter-closed' ? <Snowflake className="h-6 w-6 text-white" /> : 
                   businessStatus.mode === 'marketing' ? <Tag className="h-6 w-6 text-white animate-pulse" /> : <Info className="h-6 w-6 text-white" />}
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                  {businessStatus.mode === 'pre-launch' ? 'PRE-LAUNCH CONTACT NOTICE' : sanitizeShopOnlyText(businessStatus.bannerText, !!businessStatus.shopOnly)}
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
                      {sanitizeShopOnlyText(businessStatus.bannerDescription, !!businessStatus.shopOnly)}
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

        <div className="space-y-8">
          {/* Inquiry Form */}
          <Card className="p-6 md:p-8 bg-gradient-card border-border shadow-xl">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-foreground mb-2 uppercase tracking-tight">Service Inquiry Form</h2>
                <p className="text-muted-foreground font-medium italic">Interested in professional detailing? Complete the form below to get started.</p>
              </div>
              {isRickAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFillTestData}
                  className="bg-emerald-950/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/30 text-xs font-black uppercase tracking-wider self-start sm:self-center py-2 px-3 h-auto animate-pulse"
                >
                  🧪 Auto-Fill Rick Berube Test
                </Button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              
              {/* Personal Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-bold">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter your full name"
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
                    <Label htmlFor="placeOfService" className="font-bold">Place of Service{!businessStatus?.shopOnly && " *"}</Label>
                    <Select 
                      value={formData.placeOfService || "Customer's address"} 
                      onValueChange={(val) => {
                        setFormData(prev => ({
                          ...prev,
                          placeOfService: val,
                          address: val === 'Shop in Methuen' ? '54 Boston Street' : (prev.address === '54 Boston Street' ? '' : prev.address),
                          city: val === 'Shop in Methuen' ? 'Methuen' : (prev.city === 'Methuen' ? '' : prev.city)
                        }));
                      }}
                      disabled={!!businessStatus?.shopOnly}
                    >
                      <SelectTrigger className="h-12 bg-background border-input">
                        <SelectValue placeholder="Select service location..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Customer's address">Mobile Detailing (Customer's address)</SelectItem>
                        <SelectItem value="Shop in Methuen">Shop in Methuen (54 Boston Street, Methuen, MA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address" className="font-bold">
                      {formData.placeOfService === 'Shop in Methuen' ? 'Shop Street Address' : 'Street Address (Optional)'}
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Detail Lane"
                      disabled={formData.placeOfService === 'Shop in Methuen'}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="font-bold">
                      {formData.placeOfService === 'Shop in Methuen' ? 'Shop City / Town' : 'City / Town *'}
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Methuen"
                      required={formData.placeOfService !== 'Shop in Methuen'}
                      disabled={formData.placeOfService === 'Shop in Methuen'}
                      className={errors.city && formData.placeOfService !== 'Shop in Methuen' ? "border-destructive h-12" : "h-12"}
                    />
                    {errors.city && formData.placeOfService !== 'Shop in Methuen' && (
                      <p className="text-xs text-red-600 font-bold uppercase tracking-tight mt-1 ml-1">⚠️ {errors.city}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>

                {!!businessStatus?.shopOnly && (
                  <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex gap-3 mt-4">
                    <Info className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5 animate-bounce-subtle" />
                    <div>
                      <p className="text-xs font-black text-purple-800 dark:text-purple-300 uppercase tracking-wider mb-1">📢 Shop-Only Operations Active</p>
                      <p className="text-[11px] text-purple-700 dark:text-purple-200 leading-relaxed font-medium">
                        Currently, all professional detailing services are performed exclusively at our facility located at <strong>54 Boston Street, Methuen, MA</strong> (directly adjacent to our shop). This setup ensures complete access to our specialized detailing equipment, professional-grade utilities, and premium products to deliver the highest quality finish. We are temporarily pausing mobile detailing services, and appreciate your understanding!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Vehicle Information Section */}
              <div className="border-2 border-emerald-500/20 bg-emerald-950/5 rounded-2xl p-6 md:p-8 mt-6 space-y-6 shadow-md transition-all duration-300 hover:border-emerald-500/30">
                <h3 className="text-lg font-black text-emerald-400 mb-2 uppercase tracking-tight flex items-center gap-2">
                  <CarFront className="h-5 w-5 text-emerald-400 animate-pulse" />
                  Vehicle Evaluation Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleYear" className="font-bold">Vehicle Year *</Label>
                    <Select value={formData.vehicleYear} onValueChange={(v) => setFormData({ ...formData, vehicleYear: v })}>
                      <SelectTrigger className={`h-12 ${errors.vehicleYear ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 27 }, (_, i) => String(2026 - i)).concat("Older than 2000").map(y => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.vehicleYear && <p className="text-xs text-red-600 font-bold uppercase tracking-tight mt-1 ml-1">⚠️ {errors.vehicleYear}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleMake" className="font-bold">Vehicle Make *</Label>
                    <Select value={formData.vehicleMake} onValueChange={(v) => setFormData({ ...formData, vehicleMake: v })}>
                      <SelectTrigger className={`h-12 ${errors.vehicleMake ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="Select Manufacturer" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "Acura", "Audi", "BMW", "Cadillac", "Chevrolet", "Chrysler", "Dodge", "Ford", "GMC", "Honda",
                          "Hyundai", "Infiniti", "Jeep", "Kia", "Lexus", "Lincoln", "Mazda", "Mercedes-Benz", "Nissan",
                          "Porsche", "Ram", "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo", "Other"
                        ].map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.vehicleMake && <p className="text-xs text-red-600 font-bold uppercase tracking-tight mt-1 ml-1">⚠️ {errors.vehicleMake}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleModel" className="font-bold">Vehicle Model *</Label>
                    <Input
                      id="vehicleModel"
                      value={formData.vehicleModel}
                      onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                      placeholder="e.g. Civic, F-150, RAV4"
                      required
                      className={errors.vehicleModel ? "border-destructive h-12" : "h-12"}
                    />
                    {errors.vehicleModel && <p className="text-xs text-red-600 font-bold uppercase tracking-tight mt-1 ml-1">⚠️ {errors.vehicleModel}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleCondition" className="font-bold">Vehicle Condition (Optional)</Label>
                    <Select value={formData.vehicleCondition} onValueChange={(v) => setFormData({ ...formData, vehicleCondition: v })}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select General Condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Excellent">Excellent (Fairly Clean, Daily Driver)</SelectItem>
                        <SelectItem value="Good">Good (Light Dust/Debris, No Heavy Stains)</SelectItem>
                        <SelectItem value="Fair">Fair (Pet Hair, Light Stains, Spills)</SelectItem>
                        <SelectItem value="Poor">Poor (Heavy Stains, Odors, Mold/Mildew)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleColor" className="font-bold">Vehicle Color *</Label>
                    <Select value={formData.vehicleColor} onValueChange={(v) => setFormData({ ...formData, vehicleColor: v })}>
                      <SelectTrigger className={`h-12 ${errors.vehicleColor ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="Select Exterior Color" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Black", "White", "Silver", "Gray", "Red", "Blue", "Green", "Brown", "Gold", "Yellow", "Orange", "Other"].map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.vehicleColor && <p className="text-xs text-red-600 font-bold uppercase tracking-tight mt-1 ml-1">⚠️ {errors.vehicleColor}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="vehicleType" className="font-bold">Vehicle Class / Size *</Label>
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setShowClassificationModal(true)}
                        className="h-auto p-0 text-xs font-black uppercase text-emerald-500 hover:text-emerald-600 flex items-center gap-1 shrink-0"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                        Size Finder Guide
                      </Button>
                    </div>
                    <Select value={formData.vehicleType} onValueChange={(v) => setFormData({ ...formData, vehicleType: v })}>
                      <SelectTrigger className={`h-12 ${errors.vehicleType ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="Autodetected size (or choose manually)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact / Sedan</SelectItem>
                        <SelectItem value="midsize">Mid-Size / SUV</SelectItem>
                        <SelectItem value="truck">Truck / Van / Large SUV</SelectItem>
                        <SelectItem value="luxury">Luxury / Specialty</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.vehicleType && <p className="text-xs text-red-600 font-bold uppercase tracking-tight mt-1 ml-1">⚠️ {errors.vehicleType}</p>}
                    <p className="text-[11px] text-zinc-500 italic mt-1 font-medium">
                      ⚡ Auto-classified: Our intelligent system auto-selects this based on your make and model. Feel free to override it.
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailing Preferences Section */}
              <div className="border-t border-border pt-6 mt-6 space-y-4">
                <h3 className="text-lg font-bold text-foreground mb-2 uppercase tracking-tight flex items-center gap-2">
                  <Snowflake className="h-5 w-5 text-emerald-500 animate-spin-slow" />
                  Service & Schedule
                </h3>

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
                        <SelectItem value="First Available">First Available</SelectItem>
                        <SelectItem value="Flexible">Flexible</SelectItem>
                        <SelectItem value="Just inquiring">Just inquiring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="attachments" className="font-bold cursor-pointer flex items-center gap-2">
                    <Star className="h-4 w-4 text-emerald-500 animate-pulse" />
                    Attach Photos of Your Vehicle (Optional)
                  </Label>
                  <span className="text-[10px] uppercase font-black text-muted-foreground italic">Max 5 MB per pic</span>
                </div>
                <div 
                  className={`relative group border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[140px] transition-all duration-300 ${
                    isDragging 
                      ? "border-emerald-500 bg-emerald-500/10 scale-[0.98] ring-2 ring-emerald-500/20" 
                      : "border-zinc-200 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                  }`}
                  onClick={() => document.getElementById("attachments")?.click()}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        setAttachments((prev) => {
                          const existingNames = new Set(prev.map(f => f.name));
                          const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name));
                          return [...prev, ...uniqueNewFiles];
                        });
                      }
                    }}
                    className="hidden"
                  />
                  <ImageIcon className="h-8 w-8 text-zinc-400 group-hover:text-emerald-500 group-hover:scale-110 transition-all duration-300 mb-2" />
                  <p className="text-sm font-bold text-zinc-700 group-hover:text-emerald-600 transition-colors">
                    Click to browse or drag & drop pictures
                  </p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-[340px]">
                    Optional: Attach pictures of your vehicle (exterior and interior) to help us determine its condition and provide an accurate estimate.
                  </p>
                </div>
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {attachments.map((f, i) => (
                      <Badge key={i} variant="secondary" className="bg-emerald-100 text-emerald-700 border-none font-bold py-1 px-2.5 rounded-lg flex items-center gap-1.5 shadow-sm animate-in zoom-in-95 duration-200">
                        <span className="truncate max-w-[150px]">{f.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttachments(prev => prev.filter((_, idx) => idx !== i));
                          }}
                          className="text-emerald-700 hover:text-red-500 transition-colors"
                          title="Remove file"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
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
                  <Card className="p-6 bg-emerald-950/20 border-emerald-500/50 flex flex-col items-center text-center gap-4">
                    <div className="p-2 bg-emerald-500 rounded-full">
                      <Check className="h-6 w-6 text-white" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold text-emerald-400 uppercase tracking-tight">System Logged Successfully</h4>
                      <p className="text-xs text-emerald-500/70 font-black uppercase tracking-widest">Master Database Updated</p>
                    </div>
                    <p className="text-zinc-300 text-sm">
                      We have received your details and added them to our secure prospect system. Rick will review your inquiry shortly.
                    </p>
                    
                    <div className="w-full pt-2 space-y-3">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Optional: Send a copy from your email app</p>
                      <Button 
                        type="button"
                        onClick={() => {
                          if (lastMailto) window.location.href = lastMailto;
                        }}
                        variant="outline" 
                        className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-12"
                      >
                         Dispatch Email Copy (Any App)
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </form>
          </Card>

          {/* Contact Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 bg-gradient-card border-border flex items-start gap-4">
              <div className="p-3 bg-primary/20 rounded-lg shrink-0">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Email</h3>
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(contactInfo?.email || 'Rick.PrimeAutoDetail@gmail.com')}&su=Website%20Inquiry`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm break-all"
                >
                  {contactInfo ? (contactInfo.email || 'Rick.PrimeAutoDetail@gmail.com') : 'Loading contact info...'}
                </a>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-border flex items-start gap-4">
              <div className="p-3 bg-primary/20 rounded-lg shrink-0">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Phone</h3>
                <a
                  href={`tel:${(contactInfo?.phone || '(555) 123-4567').replace(/[^+\d]/g, '')}`}
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  {contactInfo ? (contactInfo.phone || '(555) 123-4567') : 'Loading contact info...'}
                </a>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-border flex items-start gap-4">
              <div className="p-3 bg-primary/20 rounded-lg shrink-0">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Location</h3>
                <p className="text-muted-foreground text-sm">
                  {contactInfo ? (contactInfo.address || 'Methuen, MA') : 'Loading contact info...'}
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-border flex items-start gap-4">
              <div className="p-3 bg-primary/20 rounded-lg shrink-0">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Hours</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {contactInfo ? (contactInfo.hours || 'Appointments daily 8 AM–6 PM') : 'Loading contact info...'}
                </p>
              </div>
            </Card>
          </div>

          {/* Map */}
          <Card className="p-6 bg-gradient-card border-border">
            <iframe
              title="Methuen MA Map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d47093.99823879164!2d-71.21912523125!3d42.742358!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e30f8b9f0b3f0d%3A0x3e947e3c90c3e0a3!2sMethuen%2C%20MA!5e0!3m2!1sen!2sus!4v1234567890"
              width="100%"
              height="350"
              style={{ border: 0, borderRadius: '8px' }}
              allowFullScreen
              loading="lazy"
            />
          </Card>
        </div>
      </main>
      <AboutDialog open={showAbout} onOpenChange={setShowAbout} />
      <VehicleSelectorModal
        open={showClassificationModal}
        onOpenChange={setShowClassificationModal}
        onSelect={(data) => {
          setFormData(prev => ({
            ...prev,
            vehicleType: data.category,
            vehicleMake: data.make,
            vehicleModel: data.model
          }));
          setShowClassificationModal(false);
        }}
      />
      <Footer />
    </div>
  );
};

export default Contact;
