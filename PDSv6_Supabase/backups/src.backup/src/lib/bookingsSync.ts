import jsPDF from "jspdf";
import { savePDFToArchive } from "@/lib/pdfArchive";
import { Booking } from "@/store/bookings";
import { pushAdminAlert } from "@/lib/adminAlerts";

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
  doc.text("Prime Detail Solutions", 20, 20);
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

export function uploadToFileManager(fileDataUrl: string, path: string, booking: Booking, details?: { service?: string; price?: number }) {
  const fileName = formatFileName(booking.date, booking.customer || 'Customer', (details?.service || booking.title || 'Service'));
  savePDFToArchive("Bookings", booking.customer || "Customer", booking.id, fileDataUrl, { fileName, path });
  // Flag latest booking event for lightweight real-time UI cues
  localStorage.setItem('lastBookingEvent', JSON.stringify({ id: booking.id, ts: Date.now(), price: details?.price }));
}

export function onBookingCreated(booking: Booking) {
  try {
    const pdf = generateBookingPDF(booking, { service: booking.title });
    const d = new Date(booking.date);
    const year = d.getFullYear();
    const monthName = d.toLocaleString(undefined, { month: 'long' });
    const path = `Bookings ${year}/${monthName}/`;
    uploadToFileManager(pdf, path, booking, { service: booking.title });
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
export function onBookingStatusChanged(booking: Booking, prevStatus: string, nextStatus: string) {
  try {
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
  } catch (e) {
    console.error('Failed to generate/upload status change PDF', e);
  }
}
