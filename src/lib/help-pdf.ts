import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { HelpTopic } from '@/components/help/helpData';

export const exportHelpTopicPDF = (topic: HelpTopic) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // 1. Header Branded Strip
  doc.setFillColor(15, 22, 41); // #0f1629
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Branded Logo/Title
  doc.setTextColor(34, 211, 238); // Cyan-400
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PRIME AUTO DETAIL | OPERATIONS MANUAL', margin, 15);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  const titleLines = doc.splitTextToSize(topic.title.toUpperCase(), contentWidth);
  doc.text(titleLines, margin, 28);

  let currentY = 55;

  // 2. Summary Box
  if (topic.summary) {
    doc.setFillColor(240, 253, 244); // Light Green
    doc.setDrawColor(16, 185, 129); // Emerald-500
    doc.rect(margin, currentY, contentWidth, 20, 'FD');
    
    doc.setTextColor(6, 78, 59); // Dark Green
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    const summaryLines = doc.splitTextToSize(`Summary: ${topic.summary}`, contentWidth - 10);
    doc.text(summaryLines, margin + 5, currentY + 12);
    currentY += 35;
  }

  // 3. Main Content
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  (topic.content || []).forEach((line) => {
    // Check if we need a new page
    if (currentY > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
    }

    if (line === '') {
      currentY += 5;
      return;
    }

    // Handle bold sections (starting with **)
    if (line.startsWith('**')) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // Emerald-500
      const text = line.replace(/\*\*/g, '');
      const splitText = doc.splitTextToSize(text, contentWidth);
      doc.text(splitText, margin, currentY);
      currentY += (splitText.length * 6) + 2;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
    } else {
      // Regular text
      const splitText = doc.splitTextToSize(line, contentWidth);
      doc.text(splitText, margin, currentY);
      currentY += (splitText.length * 6) + 2;
    }
  });

  // Footer
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Prime Auto Detail - Operations Guide | Generated on ${format(new Date(), 'MMMM dd, yyyy')} | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  const filename = `Prime_Operations_${topic.title.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
};
