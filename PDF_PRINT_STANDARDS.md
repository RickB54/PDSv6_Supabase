# PDF and Print Generation Standards

**Last Updated:** January 21, 2026

## Overview
This document defines the standard approach for generating PDFs and print-friendly documents in the Prime Auto Detail application.

## Core Principles

### 1. **Use jsPDF Text Formatting (NOT Screenshots)**
- ✅ Build PDFs using `jsPDF` text methods (`pdf.text()`, `pdf.setFont()`, etc.)
- ❌ NEVER use `html2canvas` or screenshot-based approaches
- **Why:** Text-based PDFs are searchable, selectable, professional, and file sizes are smaller

### 2. **Comprehensive Field Coverage**
- Include ALL relevant fields from the data model
- Organize logically with clear section headers
- Use consistent spacing and hierarchy

### 3. **Professional Formatting**

#### Section Headers
```typescript
const addSection = (title: string, color: number[] = [100, 200, 255]) => {
    y += 3;
    pdf.setFillColor(30, 30, 40); // Dark background for PDF
    // OR
    pdf.setFillColor(240, 240, 245); // Light background for print
    pdf.rect(margin, y - 5, pageWidth - 2 * margin, 8, 'F');
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title.toUpperCase(), margin + 2, y);
    y += 8;
};
```

#### Text with Word Wrap
```typescript
const addLine = (text: string, x: number, fontSize = 10, bold = false, color = [255, 255, 255]) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setTextColor(color[0], color[1], color[2]);
    const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin - x);
    pdf.text(lines, x, y);
    y += lines.length * lineHeight * (fontSize / 10);
};
```

#### Automatic Page Breaks
```typescript
const checkNewPage = (neededSpace: number = 40) => {
    if (y + neededSpace > pageHeight - margin) {
        pdf.addPage();
        y = margin;
    }
};
```

### 4. **Color-Coded Information**
- Use colors intentionally to convey meaning:
  - **Blue/Cyan:** General information, headers
  - **Green:** Safe items, positive info
  - **Yellow/Orange:** Warnings, caution items
  - **Red:** Dangers, critical warnings, prohibited items
  - **Purple/Indigo:** Special features, videos

### 5. **PDF vs Print Differences**

#### PDF (Save to File)
- **Background:** Dark/Black (`#09090b` or RGB `9, 9, 11`)
- **Text Colors:** White and bright colors
- **Purpose:** Digital viewing, training materials
- **Filename:** `ChemicalName_Training_Card.pdf`

#### Print Version
- **Background:** WHITE (`255, 255, 255`)
- **Text Colors:** Black and darker colors (to save ink)
- **Section Backgrounds:** Light gray (`240, 240, 245`)
- **Purpose:** Physical printing without wasting ink
- **Action:** Opens in new tab with print dialog (`pdf.autoPrint()`)

### 6. **Standard Page Setup**
```typescript
const pdf = new jsPDF('p', 'mm', 'a4');
const pageWidth = pdf.internal.pageSize.getWidth();
const pageHeight = pdf.internal.pageSize.getHeight();
const margin = 15;
const lineHeight = 7;
let y = margin;
```

### 7. **Theme/Brand Integration**
- Add theme color bar at top if available
- Include company branding in footer
- Professional, consistent styling

### 8. **Footer Information**
```typescript
pdf.setFontSize(8);
pdf.setTextColor(100, 100, 120); // Gray for PDF
// OR
pdf.setTextColor(120, 120, 120); // Gray for print
pdf.text(`Generated: ${new Date().toLocaleDateString()} | Prime Auto Detail`, margin, pageHeight - 10);
```

## Example: Chemical Card Structure

1. **Header** (with theme color bar)
2. **Title & Category**
3. **High-Risk Warning** (if applicable)
4. **Used For** (bulleted list)
5. **What It Is** (description)
6. **When To Use**
7. **Why Use It**
8. **Dilution Ratios** (table format with notes)
9. **Critical Warnings & Risks**
10. **How To Apply** (application guide)
11. **Surface Compatibility** (safe/caution/avoid)
12. **Training Videos** (if available)
13. **Footer**

## Implementation Checklist

When creating a new PDF/Print feature:

- [ ] Use jsPDF text methods (no screenshots)
- [ ] Include all relevant fields
- [ ] Implement section headers with `addSection()`
- [ ] Use `addLine()` for word-wrapped text
- [ ] Add `checkNewPage()` to prevent cutoffs
- [ ] Create TWO versions:
  - [ ] **PDF**: Dark background, bright colors, saves to file
  - [ ] **Print**: White background, dark colors, opens print dialog
- [ ] Add theme/brand color if available
- [ ] Include professional footer with date
- [ ] Test with long content to verify page breaks
- [ ] Verify all colors are readable
- [ ] Ensure print version doesn't waste ink

## Code Reference

See `src/components/chemicals/ChemicalDetail.tsx` for the reference implementation of both `handleDownloadPdf()` and `handlePrint()` functions.

## Benefits of This Approach

✅ **Professional** - Clean, readable, well-organized
✅ **Searchable** - Text can be searched and selected in PDFs
✅ **Accessible** - Screen readers can read text
✅ **Smaller Files** - Text PDFs are much smaller than image-based
✅ **Print-Friendly** - White background version saves ink
✅ **Consistent** - Same layout for PDF and print
✅ **Comprehensive** - Shows ALL information, not just what fits on screen
