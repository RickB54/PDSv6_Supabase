import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { Booking } from "@/store/bookings";
import { pushAdminAlert, dismissAlertsForRecord } from "@/lib/adminAlerts";
import { toast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
import { formatETDate, formatETTime } from "@/lib/utils";

function formatFileName(dateISO: string, customer: string, service: string) {
  const d = dateISO ? new Date(dateISO) : new Date();
  if (isNaN(d.getTime())) return `${new Date().toISOString().split('T')[0]}_${customer.replace(/\s/g, '-')}_${service.replace(/\s/g, '-')}.pdf`;
  
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
    doc.text("Prime Auto Detail", 20, 20);
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
            
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 25px; margin: 25px 0;">
              <h3 style="margin-top: 0; font-size: 16px; color: #166534;">💳 Secure Payment Options</h3>
              <p style="font-size: 14px; color: #166534; margin: 10px 0;">You have the flexibility to pay for your service however you prefer:</p>
              <div style="font-size: 14px; color: #166534; line-height: 1.5;">
                • <strong>Pay in Full:</strong> Settle the balance now for a contactless experience.<br>
                • <strong>Partial Deposit:</strong> Pay any amount now to secure your spot.<br>
                • <strong>Pay Later:</strong> No pressure! You can pay in person once the job is completed to your satisfaction.
              </div>
              <div style="text-align: center; margin-top: 25px;">
                <a href="${window.location.origin}/checkout?bookingId=${booking.id}&email=${encodeURIComponent(booking.customerEmail || '')}&amount=${booking.price || ''}" 
                   style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">
                   View Payment Options
                </a>
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

export async function onBookingCancelled(booking: Booking, reason: string) {
  try {
    const formattedDate = formatETDate(booking.date);
    const formattedTime = formatETTime(booking.date);
    const year = new Date().getFullYear();

    if (booking.customerEmail) {
      console.log(`🚀 Sending cancellation email to: ${booking.customerEmail}`);

      const cancellationHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #fee2e2; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); padding: 40px 20px; text-align: center; color: #ffffff;">
          <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">Appointment Cancelled</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Notification regarding your upcoming service.</p>
        </div>
        
        <div style="padding: 30px;">
          <p style="font-size: 18px; color: #111827; margin-top: 0;">Hi <strong>${booking.customer}</strong>,</p>
          <p style="color: #4b5563; line-height: 1.6;">This email is to inform you that your scheduled appointment for <strong>${booking.title}</strong> has been cancelled.</p>
          
          <div style="background-color: #fffaf0; border: 1px solid #feebc8; border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #c05621;">Reason for Cancellation</h3>
            <p style="color: #744210; font-weight: 500; font-style: italic; margin-bottom: 0;">"${reason}"</p>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b;">Original Appointment Info</h3>
            
            <div style="display: flex; margin-bottom: 12px;">
              <span style="color: #94a3b8; width: 30px;">📅</span>
              <span style="color: #334155;">Original Date: <strong>${formattedDate}</strong></span>
            </div>
            
            <div style="display: flex; margin-bottom: 12px;">
              <span style="color: #94a3b8; width: 30px;">⏰</span>
              <span style="color: #334155;">Original Time: <strong>${formattedTime}</strong></span>
            </div>
            
            <div style="display: flex; margin-bottom: 12px;">
              <span style="color: #94a3b8; width: 30px;">🔧</span>
              <span style="color: #334155;">Service: <strong>${booking.title}</strong></span>
            </div>

            <div style="border-top: 1px dashed #e2e8f0; margin: 15px 0; padding-top: 15px; display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748b; font-weight: 500;">Original Estimate:</span>
              <span style="color: #111827; font-size: 18px; font-weight: 800;">$${booking.price?.toLocaleString() || '0.00'}</span>
            </div>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6;">If you would like to reschedule or have any questions, please reply to this email or call us directly.</p>
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">We apologize for the inconvenience and hope to serve you in the future.</p>
          
          <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 30px;">
            <p style="margin: 0; color: #111827; font-weight: 700;">Prime Auto Detail</p>
            <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Professional Detailing Solutions</p>
          </div>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">&copy; ${year} Prime Auto Detail. All rights reserved.</p>
        </div>
      </div>
    `;

      await supabase.functions.invoke('send-booking-email', {
        body: {
          to: booking.customerEmail,
          subject: `⚠️ Cancellation: Your Booking with Prime Auto Detail`,
          html: cancellationHtml
        }
      });
      
      console.log(`✅ Cancellation email sent to ${booking.customerEmail}`);
    }
  } catch (e) {
    console.error('Failed to process booking cancellation sync', e);
  }
}

export async function onSendReminderEmail(booking: Booking, frequencyLabel: string, options?: { customNote?: string; couponCode?: string; discountLabel?: string; bccMe?: boolean }) {
  try {
    const year = new Date().getFullYear();

    if (booking.customerEmail) {
      console.log(`🚀 Sending personalized follow-up reminder to: ${booking.customerEmail}`);

      const reminderHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center; color: #ffffff;">
          <div style="font-size: 48px; margin-bottom: 15px;">✨</div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">A Personalized Note from Prime</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Professional Maintenance Reminder</p>
        </div>
        
        <div style="padding: 30px;">
          <p style="font-size: 18px; color: #111827; margin-top: 0;">Hi <strong>${booking.customer}</strong>,</p>
          
          ${options?.customNote ? `
            <div style="background-color: #f8fafc; border-left: 4px solid #1d4ed8; padding: 20px; margin: 20px 0; color: #334155; font-style: italic; line-height: 1.6;">
              "${options.customNote}"
            </div>
          ` : `
            <p style="color: #4b5563; line-height: 1.6;">It has been <strong>${frequencyLabel}</strong> since your last professional detail with us, and we wanted to check in to see how your vehicle is looking.</p>
          `}
          
          <div style="background-color: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 12px; padding: 25px; margin: 25px 0;">
             <p style="margin: 0; color: #0369a1; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Your Last Service:</p>
             <p style="margin: 5px 0 0; color: #0c4a6e; font-weight: 700; font-size: 18px;">${booking.title}</p>
             <p style="margin: 2px 0 0; color: #64748b; font-size: 13px;">Completed on ${new Date(booking.date).toLocaleDateString()}</p>
          </div>

          ${options?.couponCode ? `
            <div style="background: linear-gradient(to right, #fdf2f2, #fff); border: 2px dashed #f87171; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
              <p style="margin: 0; color: #991b1b; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: 0.1em;">Special Loyalty Offer</p>
              <h2 style="margin: 10px 0; color: #dc2626; font-size: 28px; font-weight: 900;">${options.discountLabel || 'SPECIAL DISCOUNT'}</h2>
              <div style="display: inline-block; background-color: #ffffff; border: 1px solid #fee2e2; padding: 8px 20px; border-radius: 6px; font-family: monospace; font-size: 20px; font-weight: bold; color: #b91c1c; margin-top: 5px;">
                ${options.couponCode}
              </div>
              <p style="margin: 15px 0 0; color: #7f1d1d; font-size: 13px;">Use this code at checkout to claim your offer!</p>
            </div>
          ` : ''}

          <p style="color: #4b5563; line-height: 1.6;">Regular maintenance is the key to preserving your vehicle's value and aesthetic. To keep your vehicle in showroom condition, we recommend a refresh every ${frequencyLabel}.</p>
          
          <p style="color: #4b5563; font-weight: 600; margin-top: 25px; margin-bottom: 10px;">Our Premium Add-ons for returning clients:</p>
          <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px; margin-bottom: 30px;">
            <li>🛡️ <strong>Ceramic Maintenance:</strong> Boost your coating's hydrophobicity.</li>
            <li>🧼 <strong>Engine Bay Detailing:</strong> Keep the heart of your car looking new.</li>
            <li>💡 <strong>Headlight Restoration:</strong> Restore clarity and safety.</li>
          </ul>

          <div style="text-align: center; margin: 35px 0;">
            <a href="${window.location.origin}/services" 
               style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 16px 36px; border-radius: 8px; text-decoration: none; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 6px rgba(29, 78, 216, 0.2);">
               Book Your Re-Appointment
            </a>
          </div>

          <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 30px; margin-top: 40px;">
            <p style="margin: 0; color: #111827; font-weight: 700;">Prime Auto Detail Team</p>
            <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">"Your Vehicle, Our Passion"</p>
          </div>
        </div>
        
        <div style="background-color: #f9fafb; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.5;">This maintenance reminder is part of your professional detailing journey with Prime Auto Detail. If you have any questions about your vehicle's care, simply reply to this email.</p>
          <p style="margin: 8px 0 0; color: #9ca3af; font-size: 11px;">&copy; ${year} Prime Auto Detail. All rights reserved.</p>
        </div>
      </div>
    `;

      // Generate a PDF record of this outreach for the archive
      try {
        const doc = new jsPDF();
        const year = new Date().getFullYear();
        const monthName = new Date().toLocaleString('default', { month: 'long' });
        
        // PDF Header
        doc.setFillColor(30, 58, 138); // Dark Blue
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('OUTREACH RECORD', 20, 20);
        
        // Body Content
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(10);
        doc.text(`SENT ON: ${new Date().toLocaleString()}`, 140, 20);
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`TO: ${booking.customer} (${booking.customerEmail})`, 20, 45);
        doc.text(`SUBJECT: Maintenance Reminder - ${booking.title}`, 20, 55);
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 60, 190, 60);
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        let currentY = 70;
        
        if (options?.customNote) {
          doc.setFont(undefined, 'bold');
          doc.text('PERSONAL NOTE:', 20, currentY);
          currentY += 7;
          doc.setFont(undefined, 'normal');
          const lines = doc.splitTextToSize(options.customNote, 170);
          doc.text(lines, 20, currentY);
          currentY += (lines.length * 5) + 10;
        }
        
        if (options?.couponCode) {
          doc.setFont(undefined, 'bold');
          doc.text(`INCENTIVE: ${options.discountLabel || 'Special Discount'}`, 20, currentY);
          currentY += 7;
          doc.setFont(undefined, 'normal');
          doc.text(`CODE: ${options.couponCode}`, 20, currentY);
          currentY += 10;
        }
        
        doc.setFont(undefined, 'bold');
        doc.text('FULL MESSAGE CONTENT:', 20, currentY);
        currentY += 7;
        doc.setFont(undefined, 'normal');
        
        // Strip HTML for the log PDF - BETTER VERSION
        let textContent = reminderHtml
          .replace(/<style[^>]*>.*<\/style>/gms, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII characters (emojis) that break jsPDF
          .replace(/\s+/g, ' ')
          .trim();
          
        const contentLines = doc.splitTextToSize(textContent, 170);
        doc.text(contentLines, 20, currentY);
        
        const dataUrl = doc.output('dataurlstring');
        const fileName = `OUTREACH_${booking.customer.replace(/\s/g, '_')}_${Date.now()}.pdf`;
        await uploadToFileManager(dataUrl, `Outreach Logs/${year}/${monthName}/`, booking, { 
          service: "Maintenance Outreach"
        });
        
        console.log('✅ Outreach PDF archived to File Manager');
      } catch (pdfErr) {
        console.error('❌ Failed to archive outreach PDF:', pdfErr);
      }

      // Log engagement BEFORE sending email to ensure audit trail exists even if email fails
      try {
        await supabase.from('engagements').insert({
          customer_name: booking.customer,
          customer_email: booking.customerEmail,
          type: 'retention',
          note: options?.customNote || `${booking.title} maintenance follow-up`,
          coupon_code: options?.couponCode
        });
      } catch (logErr) {
        console.error('Engagement logging failed', logErr);
      }

      const { data, error } = await supabase.functions.invoke('send-booking-email', {
        body: {
          to: booking.customerEmail,
          bcc: options?.bccMe ? "cleanyourroofandmore@gmail.com" : undefined, // User's email from notes
          subject: options?.couponCode 
            ? `🎁 A Special Gift from Prime Auto Detail for ${booking.customer}`
            : `✨ Time for a Refresh? Your Prime Auto Detail Maintenance Reminder`,
          customerName: booking.customer,
          service: booking.title,
          price: (booking.price || 0).toFixed(2),
          html: reminderHtml,
          // Explicitly flag this as a retention email so the edge function doesn't use the 'Request Received' fallback
          type: 'retention'
        }
      });

      if (error) throw error;
      return data;
    }
  } catch (e) {
    console.error('Failed to send follow-up reminder', e);
  }
}

export async function onSendProspectEmail(prospect: any, options?: { customNote?: string; couponCode?: string; discountLabel?: string; bccMe?: boolean }) {
  try {
    const year = new Date().getFullYear();

    if (prospect.email) {
      console.log(`🚀 Sending professional intro to prospect: ${prospect.email}`);

      const prospectHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 45px 20px; text-align: center; color: #ffffff;">
          <div style="font-size: 48px; margin-bottom: 20px;">💎</div>
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">Welcome to Prime</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Professional Detailing Solutions</p>
        </div>
        
        <div style="padding: 35px 30px;">
          <p style="font-size: 19px; color: #111827; margin-top: 0;">Hi <strong>${prospect.name}</strong>,</p>
          
          <p style="color: #4b5563; line-height: 1.7; font-size: 15px;">Thank you for your interest in <strong>Prime Auto Detail</strong>. We pride ourselves on delivering a showroom-quality finish and absolute protection for every vehicle we touch.</p>

          ${options?.customNote ? `
            <div style="background-color: #f5f3ff; border-left: 4px solid #7c3aed; padding: 25px; margin: 30px 0; color: #4338ca; font-style: italic; font-size: 17px; line-height: 1.6; border-radius: 4px;">
              "${options.customNote}"
            </div>
          ` : `
            <p style="color: #4b5563; line-height: 1.7; font-size: 15px;">I noticed you were looking for premium car care, and I'd love to discuss how our signature detailing and ceramic protection packages can keep your vehicle looking its absolute best.</p>
          `}
          
          <div style="background-color: #fafafa; border: 1px solid #f3f4f6; border-radius: 16px; padding: 25px; margin: 30px 0;">
             <h3 style="margin-top: 0; font-size: 15px; color: #1f2937; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #6366f1; display: inline-block; padding-bottom: 4px;">The Prime Difference:</h3>
             <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr; gap: 12px;">
                <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 15px;">
                  <span style="font-size: 18px;">✨</span>
                  <div>
                    <strong style="color: #111827; display: block;">Precision Detailing:</strong>
                    <span style="color: #6b7280; font-size: 13px;">Advanced techniques for an immaculate finish, inside and out.</span>
                  </div>
                </div>
                <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 15px;">
                  <span style="font-size: 18px;">🛡️</span>
                  <div>
                    <strong style="color: #111827; display: block;">Superior Protection:</strong>
                    <span style="color: #6b7280; font-size: 13px;">Ceramic coatings and paint sealants that defy the elements.</span>
                  </div>
                </div>
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                  <span style="font-size: 18px;">👨‍🔧</span>
                  <div>
                    <strong style="color: #111827; display: block;">Expert Craftsmanship:</strong>
                    <span style="color: #6b7280; font-size: 13px;">Highly trained specialists who treat every car like their own.</span>
                  </div>
                </div>
             </div>
          </div>

          ${options?.couponCode ? `
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 16px; padding: 35px; margin: 40px 0; text-align: center; color: #ffffff;">
              <p style="margin: 0; font-weight: 800; text-transform: uppercase; font-size: 13px; letter-spacing: 0.15em; opacity: 0.9;">Exclusive First-Time Offer</p>
              <h2 style="margin: 15px 0; font-size: 32px; font-weight: 900; letter-spacing: -0.02em;">${options.discountLabel || 'SPECIAL OFFER'}</h2>
              <div style="display: inline-block; background-color: rgba(255,255,255,0.2); border: 2px solid #ffffff; padding: 12px 30px; border-radius: 10px; font-family: 'Courier New', Courier, monospace; font-size: 26px; font-weight: bold; margin-top: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                ${options.couponCode}
              </div>
              <p style="margin: 20px 0 0; font-size: 14px; font-weight: 500;">Enter this code when booking to claim your welcome discount.</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 40px 0;">
            <a href="${window.location.origin}/book" 
               style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 18px 45px; border-radius: 12px; text-decoration: none; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4);">
               Secure Your Appointment
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center; margin-top: 40px;">If you have any questions about our processes or what your vehicle might need, I'm here to help.</p>

          <div style="text-align: center; border-top: 1px solid #f3f4f6; padding-top: 35px; margin-top: 45px;">
            <p style="margin: 0; color: #111827; font-weight: 800; font-size: 17px;">Prime Auto Detail Team</p>
            <p style="margin: 5px 0 0; color: #9ca3af; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Your Vehicle, Reimagined</p>
            <div style="margin-top: 25px;">
              <a href="${window.location.origin}" style="text-decoration: none; color: #4f46e5; font-size: 13px; font-weight: 700; margin: 0 15px;">View Gallery</a>
              <a href="${window.location.origin}/faq" style="text-decoration: none; color: #4f46e5; font-size: 13px; font-weight: 700; margin: 0 15px;">How It Works</a>
            </div>
          </div>
        </div>
        
        <div style="background-color: #111827; padding: 30px; text-align: center; color: #6b7280;">
          <p style="margin: 0; font-size: 11px; line-height: 1.5;">You are receiving this introductory outreach because you've expressed interest in Prime Auto Detail services. We value your privacy and our relationship.</p>
          <p style="margin: 10px 0 0; color: #4b5563; font-size: 11px;">&copy; ${year} Prime Auto Detail. All rights reserved.</p>
        </div>
      </div>
      `;

      // Generate PDF record
      try {
        const doc = new jsPDF();
        const year = new Date().getFullYear();
        const monthName = new Date().toLocaleString('default', { month: 'long' });
        
        doc.setFillColor(79, 70, 229); // Indigo
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('WELCOME OUTREACH RECORD', 20, 20);
        
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`PROSPECT: ${prospect.name} (${prospect.email})`, 20, 45);
        
        doc.setFont(undefined, 'normal');
        
        // Better text stripping for Prospect PDF
        let textContent = prospectHtml
          .replace(/<style[^>]*>.*<\/style>/gms, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/[^\x00-\x7F]/g, "") 
          .replace(/\s+/g, ' ')
          .trim();
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        const contentLines = doc.splitTextToSize(textContent, 170);
        doc.text(contentLines, 20, 65);
        
        const dataUrl = doc.output('dataurlstring');
        const fileName = `WELCOME_PROSPECT_${prospect.name.replace(/\s/g, '_')}_${Date.now()}.pdf`;
        await uploadToFileManager(dataUrl, `Welcome Outreach/${year}/${monthName}/`, { customer: prospect.name, date: new Date().toISOString() } as any, { 
          service: "Welcome Outreach"
        });
      } catch (pdfErr) {
        console.warn('PDF archive failed', pdfErr);
      }

      // Log engagement
      try {
        await supabase.from('engagements').insert({
          customer_name: prospect.name,
          customer_email: prospect.email,
          type: 'initial',
          note: `Welcome outreach sent to ${prospect.name}`
        });
      } catch (logErr) {
        console.error('Engagement logging failed', logErr);
      }

      const { data, error } = await supabase.functions.invoke('send-booking-email', {
        body: {
          to: prospect.email,
          bcc: options?.bccMe ? "cleanyourroofandmore@gmail.com" : undefined,
          subject: `✨ A Special Welcome to Prime Auto Detail for ${prospect.name}`,
          customerName: prospect.name,
          service: "Initial Welcome",
          html: prospectHtml,
          type: 'initial'
        }
      });
      
      if (error) throw error;
      return data;
      
      console.log(`✅ Professional prospect intro sent to ${prospect.email}`);
    }
  } catch (e) {
    console.error('Failed to send prospect outreach', e);
  }
}
