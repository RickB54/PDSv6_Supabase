import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { Booking } from "@/store/bookings";
import { pushAdminAlert, dismissAlertsForRecord } from "@/lib/adminAlerts";
import { toast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
import { formatETDate, formatETTime } from "@/lib/utils";

function formatFileName(dateISO: string, customer: string, service: string) {
  const d = new Date(dateISO);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const mins = String(d.getMinutes()).padStart(2, '0');
  const name = `${yyyy}-${mm}-${dd}_${hours}-${mins}${ampm}_${customer.replace(/\s/g, '-')}_${service.replace(/\s/g, '-')}.pdf`;
  return name;
}

export function generateBookingPDF(booking: Booking, details?: {
  vehicle?: string;
  service?: string;
  price?: number;
  tech?: string;
  notes?: string;
}): string {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Prime Auto Detail", 20, 20);
  doc.setFontSize(12);
  doc.text("BOOKING CONFIRMATION", 20, 30);
  doc.text(`Created: ${new Date().toLocaleString()}`, 20, 40);
  doc.text(`Customer: ${booking.customer || 'N/A'}`, 20, 55);
  doc.text(`Service: ${details?.service || booking.title}`, 20, 65);
  doc.text(`Scheduled: ${new Date(booking.date).toLocaleString()}`, 20, 75);
  if (details?.vehicle) doc.text(`Vehicle: ${details.vehicle}`, 20, 85);
  if (typeof details?.price === 'number') doc.text(`Price: $${details.price.toFixed(2)}`, 20, 95);
  if (details?.tech) doc.text(`Tech: ${details.tech}`, 20, 105);
  if (details?.notes) {
    doc.text("Notes:", 20, 115);
    const lines = doc.splitTextToSize(details.notes, 170);
    doc.text(lines, 20, 125);
  }
  return doc.output('dataurlstring');
}

export async function uploadToFileManager(fileDataUrl: string, path: string, booking: Booking, details?: { service?: string; price?: number }) {
  const fileName = formatFileName(booking.date, booking.customer || 'Customer', (details?.service || booking.title || 'Service'));
  savePDFToArchive("Bookings", booking.customer || "Customer", booking.id, fileDataUrl, { fileName, path });
  // Flag latest booking event for lightweight real-time UI cues
  localStorage.setItem('lastBookingEvent', JSON.stringify({ id: booking.id, ts: Date.now(), price: details?.price }));

  toast({
    title: "File Saved",
    description: `Booking PDF saved to File Manager: ${fileName}`,
  });
}

export async function onBookingCreated(booking: Booking) {
  try {
    const pdf = generateBookingPDF(booking, { service: booking.title });
    const d = new Date(booking.date);
    const year = d.getFullYear();
    const monthName = d.toLocaleString(undefined, { month: 'long' });
    const path = `Bookings ${year}/${monthName}/`;
    await uploadToFileManager(pdf, path, booking, { service: booking.title });
    // Emit admin alert for new booking
    pushAdminAlert(
      'booking_created',
      `New booking: ${booking.title} — ${booking.customer || ''}`.trim(),
      'system',
      { id: booking.id, when: booking.date, customer: booking.customer, recordType: 'Bookings' }
    );
  } catch (e) {
    console.error('Failed to generate/upload booking PDF', e);
  }
}

// Generate a lightweight PDF and alert when booking status changes
export async function onBookingStatusChanged(booking: Booking, prevStatus: string, nextStatus: string) {
  try {
    // 1. Basic status update PDF & Alert (Universal)
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Prime Detail Solutions", 20, 20);
    doc.setFontSize(12);
    doc.text("BOOKING UPDATE", 20, 30);
    doc.text(`Updated: ${new Date().toLocaleString()}`, 20, 40);
    doc.text(`Customer: ${booking.customer || 'N/A'}`, 20, 55);
    doc.text(`Service: ${booking.title}`, 20, 65);
    doc.text(`Scheduled: ${new Date(booking.date).toLocaleString()}`, 20, 75);
    doc.text(`Status: ${prevStatus} → ${nextStatus}`, 20, 90);
    const dataUrl = doc.output('dataurlstring');
    const d = new Date(booking.date);
    const year = d.getFullYear();
    const monthName = d.toLocaleString(undefined, { month: 'long' });
    const path = `Bookings ${year}/${monthName}/`;
    uploadToFileManager(dataUrl, path, booking, { service: booking.title });

    // 2. SPECIAL LOGIC: When confirmed, send professional email to customer
    if (nextStatus === 'confirmed') {
      // Clear any pending created alerts for this booking so red badge goes down
      dismissAlertsForRecord('Bookings', booking.id);

      if (booking.customerEmail) {
        console.log(`🚀 Booking confirmed! Sending email to: ${booking.customerEmail}`);

        const formattedDate = formatETDate(booking.date);
        const formattedTime = formatETTime(booking.date);

        // Professional HTML Template
        const customerHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 20px; text-align: center; color: #ffffff;">
            <div style="font-size: 48px; margin-bottom: 15px;">🚗</div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">Booking Confirmed!</h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">We've officially set your appointment.</p>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 18px; color: #111827; margin-top: 0;">Hi <strong>${booking.customer}</strong>,</p>
            <p style="color: #4b5563; line-height: 1.6;">Great news! Your booking for <strong>${booking.title}</strong> has been confirmed. Our team is excited to service your vehicle and provide a premium experience.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 25px; margin: 25px 0;">
              <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b;">Appointment Details</h3>
              
              <div style="display: flex; margin-bottom: 12px;">
                <span style="color: #94a3b8; width: 30px;">📅</span>
                <span style="color: #334155; font-weight: 600;">${formattedDate}</span>
              </div>
              
              <div style="display: flex; margin-bottom: 12px;">
                <span style="color: #94a3b8; width: 30px;">⏰</span>
                <span style="color: #334155; font-weight: 600;">${formattedTime}</span>
              </div>
              
              <div style="display: flex; margin-bottom: 12px;">
                <span style="color: #94a3b8; width: 30px;">🔧</span>
                <span style="color: #334155; font-weight: 600;">${booking.title}</span>
              </div>

              ${booking.vehicleYear ? `
              <div style="display: flex; margin-bottom: 12px;">
                <span style="color: #94a3b8; width: 30px;">🚙</span>
                <span style="color: #334155; font-weight: 600;">${booking.vehicleYear} ${booking.vehicleMake} ${booking.vehicleModel}</span>
              </div>
              ` : ''}
              
              <div style="border-top: 1px dashed #e2e8f0; margin: 15px 0; padding-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b; font-weight: 500;">Total Estimate:</span>
                <span style="color: #10b981; font-size: 20px; font-weight: 800;">$${booking.price?.toLocaleString() || '0.00'}</span>
              </div>
            </div>
            
            <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
              <p style="margin: 0; font-size: 14px; color: #854d0e; line-height: 1.5;">
                <strong>Note:</strong> If you need to make any changes or cancel your appointment, please contact us at least 24 hours in advance.
              </p>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">We look forward to seeing you soon!</p>
            
            <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 30px;">
              <p style="margin: 0; color: #111827; font-weight: 700;">Prime Auto Detail</p>
              <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Professional Detailing Solutions</p>
              <div style="margin-top: 20px;">
                <a href="#" style="text-decoration: none; color: #3b82f6; font-size: 14px; margin: 0 10px;">Website</a>
                <a href="#" style="text-decoration: none; color: #3b82f6; font-size: 14px; margin: 0 10px;">Contact Support</a>
              </div>
            </div>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">&copy; ${new Date().getFullYear()} Prime Auto Detail. All rights reserved.</p>
          </div>
        </div>
      `;

        const { data, error } = await supabase.functions.invoke('send-booking-email', {
          body: {
            to: booking.customerEmail,
            subject: `✅ Confirmed: Your Booking with Prime Auto Detail`,
            customerName: booking.customer,
            service: booking.title,
            date: formattedDate,
            time: formattedTime,
            price: booking.price?.toFixed(2) || '0.00',
            html: customerHtml
          }
        });

        if (!error) {
          // success! Push alert & confirmation PDF
          pushAdminAlert(
            'admin_email_sent',
            `Confirmation email sent to ${booking.customer} (${booking.customerEmail})`,
            'system',
            { id: booking.id, recordId: booking.id, recordType: 'Email Logs', email: booking.customerEmail }
          );

          // Save secondary "Log" PDF for the email record
          const logDoc = new jsPDF();
          logDoc.setFontSize(18);
          logDoc.text("Email Dispatch Log", 20, 20);
          logDoc.setFontSize(12);
          logDoc.text(`Timestamp: ${new Date().toLocaleString()}`, 20, 35);
          logDoc.text(`Message Category: Customer Booking Confirmation`, 20, 45);
          logDoc.text(`Recipient: ${booking.customer}`, 20, 60);
          logDoc.text(`Email: ${booking.customerEmail}`, 20, 70);
          logDoc.text(`Booking ID: ${booking.id}`, 20, 80);
          logDoc.text(`Status: SUCCESSFULLY SENT via Resend`, 20, 95);

          const logDataUrl = logDoc.output('dataurlstring');
          const logFileName = `EMAIL_CONFIRMATION_${booking.customer.replace(/\s/g, '_')}_${Date.now()}.pdf`;
          uploadToFileManager(logDataUrl, `Email Logs/${year}/${monthName}/`, booking, { service: "Email Confirmation Log" });

          toast({
            title: "Confirmation Sent",
            description: `A professional email has been sent to ${booking.customer}.`,
          });
        } else {
          console.error("Failed to send customer confirmation email:", error);
        }
      }
    }
  } catch (e) {
    console.error('Failed to generate/upload status change PDF', e);
  }
}
