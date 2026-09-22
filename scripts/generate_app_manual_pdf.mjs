import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { compileManualContent } from '../src/lib/manual-content.js';

function countPdfPages(pdfPath) {
  try {
    const data = fs.readFileSync(pdfPath);
    // Standard PDF page tree count regex
    const matches = data.toString('latin1').match(/\/Type\s*\/Page\b/g);
    return matches ? matches.length : 'N/A';
  } catch (e) {
    return 'N/A';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMarkdownLine(line) {
  if (!line || !line.trim()) {
    return '<div class="spacer"></div>';
  }

  // Bold section formatting
  let formatted = escapeHtml(line);
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Bullet point
  if (line.startsWith('•') || line.startsWith('- ') || line.startsWith('* ')) {
    const text = formatted.replace(/^[•\-\*]\s*/, '');
    return `<li class="bullet-item">${text}</li>`;
  }

  // Numbered list item
  if (/^\d+\.\s/.test(line)) {
    return `<p class="numbered-item">${formatted}</p>`;
  }

  // Callout Box
  if (line.startsWith('💡') || line.startsWith('⚠️') || line.startsWith('🛡️') || line.startsWith('🔒')) {
    return `<div class="callout-box">${formatted}</div>`;
  }

  return `<p class="paragraph">${formatted}</p>`;
}

function buildHtmlBook(parts, isSample = false) {
  const allParts = compileManualContent();
  const totalChapters = allParts.reduce((acc, p) => acc + p.chapters.length, 0);

  let tocHtml = '';
  for (const part of allParts) {
    tocHtml += `
      <div class="toc-part-block">
        <div class="toc-part-header">
          <span class="toc-part-title">PART ${part.partNumber}: ${escapeHtml(part.title.toUpperCase())}</span>
          <span class="toc-part-count">${part.chapters.length} Chapters</span>
        </div>
        <p class="toc-part-sub">${escapeHtml(part.subtitle)}</p>
        <div class="toc-chapters-grid">
    `;
    for (const ch of part.chapters) {
      tocHtml += `
        <div class="toc-chapter-row">
          <span class="toc-ch-title"><span class="toc-ch-num">${ch.chapterNumber}.</span> ${escapeHtml(ch.title)}</span>
          <span class="toc-ch-target">Ch. ${ch.chapterNumber}</span>
        </div>
      `;
    }
    tocHtml += `
        </div>
      </div>
    `;
  }

  let bodyHtml = '';
  for (const part of parts) {
    bodyHtml += `
      <!-- PART DIVIDER -->
      <section class="part-divider">
        <div class="part-badge">PART ${part.partNumber} OF 8</div>
        <h2 class="part-title">${escapeHtml(part.title)}</h2>
        <h3 class="part-subtitle">${escapeHtml(part.subtitle)}</h3>
        <div class="part-accent-line"></div>
        <p class="part-desc">${escapeHtml(part.description)}</p>
        <p class="part-meta">Contains ${part.chapters.length} structured operational chapters.</p>
      </section>
    `;

    for (const ch of part.chapters) {
      let tableHtml = '';
      if (ch.customTable) {
        tableHtml = `
          <div class="table-container">
            <h4 class="table-title">${escapeHtml(ch.customTable.title)}</h4>
            ${ch.customTable.description ? `<p class="table-desc">${escapeHtml(ch.customTable.description)}</p>` : ''}
            <table class="manual-table">
              <thead>
                <tr>
                  ${ch.customTable.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${ch.customTable.rows.map((row, idx) => `
                  <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
                    ${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      const contentLines = ch.content.map(formatMarkdownLine).join('\n');

      bodyHtml += `
        <!-- CHAPTER -->
        <article class="chapter-page">
          <div class="running-header">
            <span>PRIME AUTO DETAIL OPERATIONS MANUAL</span>
            <span>PART ${part.partNumber} — ${escapeHtml(part.title.toUpperCase())}</span>
          </div>

          <div class="chapter-header">
            <div class="chapter-badge">CHAPTER ${ch.chapterNumber} ${ch.section ? `• ${escapeHtml(ch.section.toUpperCase())}` : ''}</div>
            <h3 class="chapter-title">${escapeHtml(ch.title)}</h3>
          </div>

          ${ch.summary ? `
            <div class="chapter-summary">
              <span class="summary-label">CHAPTER SCOPE &amp; OBJECTIVE:</span>
              <p class="summary-text">${escapeHtml(ch.summary)}</p>
            </div>
          ` : ''}

          ${tableHtml}

          <div class="chapter-content">
            ${contentLines}
          </div>

          <div class="running-footer">
            <span>CONFIDENTIAL &amp; PROPRIETARY — PRIME AUTO DETAIL, LLC</span>
            <span>CHAPTER ${ch.chapterNumber}</span>
          </div>
        </article>
      `;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Prime Auto Detail — Application &amp; Operations Manual</title>
  <style>
    @page {
      size: letter portrait;
      margin: 15mm 15mm 15mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      color: #1e293b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    /* Page-break control */
    .break-before {
      page-break-before: always;
      break-before: page;
    }
    .break-after {
      page-break-after: always;
      break-after: page;
    }
    .break-avoid {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* COVER PAGE */
    .cover-page {
      min-height: 100vh;
      page-break-after: always;
      break-after: page;
      background: linear-gradient(145deg, #090d16 0%, #0f172a 50%, #020617 100%);
      color: #ffffff;
      padding: 40mm 20mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .cover-brand-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cover-logo {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 20px;
      color: #020617;
    }
    .cover-org {
      font-size: 9pt;
      font-weight: 900;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: #34d399;
    }
    .cover-sub-org {
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .cover-title-block {
      margin: auto 0;
      padding: 20mm 0;
    }
    .cover-edition-tag {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 999px;
      color: #6ee7b7;
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    .cover-main-title {
      font-size: 38pt;
      font-weight: 900;
      line-height: 1.05;
      text-transform: uppercase;
      letter-spacing: -0.02em;
      color: #ffffff;
      margin: 0 0 16px 0;
    }
    .cover-subtitle {
      font-size: 13pt;
      font-weight: 300;
      line-height: 1.4;
      color: #cbd5e1;
      max-width: 500px;
      margin: 0 0 28px 0;
    }
    .cover-specs {
      display: flex;
      gap: 8px;
      font-family: monospace;
      font-size: 8pt;
      color: #94a3b8;
    }
    .cover-spec-badge {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid #334155;
      padding: 4px 10px;
      border-radius: 4px;
    }
    .cover-footer {
      border-top: 1px solid #1e293b;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .author-role {
      font-size: 7pt;
      font-weight: 800;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #64748b;
    }
    .author-name {
      font-size: 11pt;
      font-weight: 700;
      color: #ffffff;
      margin: 2px 0;
    }
    .author-title {
      font-size: 8pt;
      color: #94a3b8;
    }
    .cover-company {
      font-size: 8pt;
      font-weight: 600;
      color: #cbd5e1;
      text-align: right;
    }
    .cover-location {
      font-size: 7.5pt;
      color: #64748b;
      text-align: right;
    }

    /* COPYRIGHT PAGE */
    .copyright-page {
      min-height: 100vh;
      page-break-after: always;
      break-after: page;
      padding: 30mm 15mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 8.5pt;
      color: #475569;
      line-height: 1.6;
    }
    .copyright-title {
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #0f172a;
      margin-bottom: 24px;
    }
    .copyright-page p {
      margin: 0 0 12px 0;
    }
    .copyright-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      font-family: monospace;
      font-size: 7.5pt;
      color: #64748b;
    }

    /* TABLE OF CONTENTS */
    .toc-page {
      page-break-after: always;
      break-after: page;
      padding: 10mm 5mm;
    }
    .toc-header-bar {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .toc-eyebrow {
      font-size: 8pt;
      font-weight: 900;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: #059669;
      display: block;
      margin-bottom: 4px;
    }
    .toc-title {
      font-size: 24pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.02em;
      color: #0f172a;
      margin: 0;
    }
    .toc-part-block {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 20px;
    }
    .toc-part-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .toc-part-title {
      font-size: 9.5pt;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #0f172a;
    }
    .toc-part-count {
      font-size: 8pt;
      font-weight: 700;
      font-family: monospace;
      color: #059669;
    }
    .toc-part-sub {
      font-size: 7.5pt;
      color: #64748b;
      font-style: italic;
      margin: 0 0 6px 0;
    }
    .toc-chapters-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 24px;
      row-gap: 2px;
    }
    .toc-chapter-row {
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      padding: 1.5px 0;
      border-bottom: 1px dotted #e2e8f0;
    }
    .toc-ch-title {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #1e293b;
    }
    .toc-ch-num {
      font-family: monospace;
      color: #94a3b8;
      font-size: 7pt;
      margin-right: 4px;
    }
    .toc-ch-target {
      font-family: monospace;
      font-size: 7pt;
      color: #64748b;
      margin-left: 8px;
      flex-shrink: 0;
    }

    /* PART DIVIDER */
    .part-divider {
      min-height: 100vh;
      page-break-before: always;
      break-before: page;
      page-break-after: always;
      break-after: page;
      background-color: #090d16;
      color: #ffffff;
      padding: 40mm 20mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .part-badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(16, 185, 129, 0.5);
      border-radius: 4px;
      color: #34d399;
      font-size: 7.5pt;
      font-weight: 800;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin-bottom: 16px;
      width: fit-content;
    }
    .part-title {
      font-size: 28pt;
      font-weight: 900;
      text-transform: uppercase;
      line-height: 1.1;
      margin: 0 0 8px 0;
      color: #ffffff;
    }
    .part-subtitle {
      font-size: 13pt;
      font-weight: 500;
      color: #6ee7b7;
      margin: 0 0 20px 0;
    }
    .part-accent-line {
      width: 48px;
      height: 3px;
      background-color: #10b981;
      margin-bottom: 20px;
    }
    .part-desc {
      font-size: 10pt;
      color: #cbd5e1;
      line-height: 1.6;
      max-width: 520px;
      margin: 0 0 24px 0;
    }
    .part-meta {
      font-family: monospace;
      font-size: 8pt;
      color: #64748b;
      margin: 0;
    }

    /* CHAPTER PAGE */
    .chapter-page {
      page-break-before: always;
      break-before: page;
      padding: 10mm 5mm 15mm 5mm;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .running-header {
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #94a3b8;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 16px;
    }
    .running-footer {
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
      margin-top: 24px;
    }
    .chapter-header {
      margin-bottom: 14px;
    }
    .chapter-badge {
      font-size: 7.5pt;
      font-weight: 900;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #059669;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 6px;
    }
    .chapter-title {
      font-size: 18pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.01em;
      color: #0f172a;
      margin: 0;
      line-height: 1.2;
    }
    .chapter-summary {
      background: #f8fafc;
      border-left: 4px solid #059669;
      padding: 8px 12px;
      margin-bottom: 14px;
      border-radius: 0 4px 4px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .summary-label {
      font-size: 7pt;
      font-weight: 900;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #0f172a;
      display: block;
      margin-bottom: 2px;
    }
    .summary-text {
      font-size: 8.5pt;
      font-style: italic;
      color: #334155;
      margin: 0;
      line-height: 1.4;
    }

    /* Structured Tables */
    .table-container {
      margin: 14px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .table-title {
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #0f172a;
      margin: 0 0 2px 0;
    }
    .table-desc {
      font-size: 7.5pt;
      color: #64748b;
      margin: 0 0 6px 0;
    }
    .manual-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      line-height: 1.3;
      border: 1px solid #cbd5e1;
    }
    .manual-table thead {
      display: table-header-group;
    }
    .manual-table th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 5px 6px;
      border: 1px solid #1e293b;
      text-align: left;
    }
    .manual-table td {
      padding: 4px 6px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .row-even {
      background-color: #ffffff;
    }
    .row-odd {
      background-color: #f8fafc;
    }

    /* Typography inside Chapter Content */
    .chapter-content {
      flex: 1;
    }
    .paragraph {
      margin: 0 0 6px 0;
      font-size: 9pt;
      line-height: 1.45;
      color: #334155;
    }
    .bullet-item {
      margin: 2px 0 2px 16px;
      font-size: 9pt;
      line-height: 1.45;
      color: #334155;
    }
    .numbered-item {
      margin: 3px 0 3px 8px;
      font-size: 9pt;
      font-weight: 500;
      line-height: 1.45;
      color: #0f172a;
    }
    .callout-box {
      margin: 8px 0;
      padding: 6px 10px;
      background-color: #fffbeb;
      border-left: 3px solid #f59e0b;
      border-radius: 0 4px 4px 0;
      font-size: 8.5pt;
      color: #78350f;
      page-break-inside: avoid;
      break-inside: avoid;
      line-height: 1.4;
    }
    .spacer {
      height: 6px;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <section class="cover-page">
    <div class="cover-brand-row">
      <div class="cover-logo">&#9733;</div>
      <div>
        <div class="cover-org">Prime Auto Detail LLC</div>
        <div class="cover-sub-org">Professional Detailing Operations System</div>
      </div>
    </div>

    <div class="cover-title-block">
      <div class="cover-edition-tag">Commercial Edition &bull; 2026</div>
      <h1 class="cover-main-title">Application &amp; Operations Manual</h1>
      <p class="cover-subtitle">
        The Definitive Standard Operating Procedures, Chemical Dilution Masterclass, CRM Architecture, and Business Intelligence Guide.
      </p>
      <div class="cover-specs">
        <span class="cover-spec-badge">Version 6.0</span>
        <span class="cover-spec-badge">8 Parts</span>
        <span class="cover-spec-badge">${totalChapters} Chapters</span>
        <span class="cover-spec-badge">Amazon KDP Ready</span>
      </div>
    </div>

    <div class="cover-footer">
      <div>
        <div class="author-role">Author &amp; Architect</div>
        <div class="author-name">Rick Berube</div>
        <div class="author-title">Founder &amp; Master Detailer</div>
      </div>
      <div>
        <div class="cover-company">Prime Auto Detail Systems</div>
        <div class="cover-location">Auburn, Maine &bull; primeautodetail.com</div>
      </div>
    </div>
  </section>

  <!-- COPYRIGHT PAGE -->
  <section class="copyright-page">
    <div>
      <div class="copyright-title">Prime Auto Detail &mdash; Application &amp; Operations Manual</div>
      <p>
        <strong>Published by:</strong> Prime Auto Detail Publishing<br />
        Auburn, Maine, USA<br />
        Website: <strong>https://primeautodetail.com</strong>
      </p>
      <p>
        Copyright &copy; 2026 by <strong>Prime Auto Detail, LLC</strong>. All rights reserved.
      </p>
      <p>
        No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.
      </p>
      <p>
        <strong>Trademark Notices:</strong> &ldquo;Prime Auto Detail&rdquo;, &ldquo;PDSv6&rdquo;, &ldquo;Prime Dilution Calculator&rdquo;, &ldquo;Caddy Worksheet&rdquo;, and associated logos are proprietary trademarks of Prime Auto Detail, LLC.
      </p>
      <p>
        <strong>Disclaimer:</strong> The chemical procedures, dilution formulas, and operational guidelines detailed in this manual represent professional detailing standards. Always refer to individual chemical Safety Data Sheets (SDS) and wear appropriate personal protective equipment (PPE) including eye protection and chemical-resistant gloves when handling concentrates.
      </p>
    </div>

    <div class="copyright-footer">
      <div><strong>First Edition:</strong> January 2026 &bull; <strong>Current Revision:</strong> 6.4 (September 2026)</div>
      <div><strong>Document ID:</strong> PDS6-MANUAL-PUBLICATION-2026-REV4</div>
      <div style="margin-top: 4px; color: #94a3b8;">Printed in the United States of America</div>
    </div>
  </section>

  <!-- TABLE OF CONTENTS -->
  <section class="toc-page">
    <div class="toc-header-bar">
      <span class="toc-eyebrow">Navigation &amp; Roadmap</span>
      <h2 class="toc-title">Table of Contents</h2>
    </div>
    ${tocHtml}
  </section>

  <!-- BODY CONTENT (PARTS & CHAPTERS) -->
  ${bodyHtml}

</body>
</html>`;
}

function findBrowserPath() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  if (fs.existsSync(chromePath)) return chromePath;
  if (fs.existsSync(edgePath)) return edgePath;
  throw new Error('Neither Chrome nor Edge was found on this system.');
}

async function run() {
  const browserPath = findBrowserPath();
  console.log(`Using Chromium Engine: ${browserPath}`);

  const allParts = compileManualContent();
  const totalChapters = allParts.reduce((acc, p) => acc + p.chapters.length, 0);
  console.log(`Compiled ${allParts.length} Parts with ${totalChapters} Total Chapters.`);

  const manualsDir = path.resolve('public/manuals');
  if (!fs.existsSync(manualsDir)) {
    fs.mkdirSync(manualsDir, { recursive: true });
  }

  // 1. GENERATE SAMPLE VERIFICATION PDF (Cover + Copyright + TOC + 3 Chapters with tables)
  console.log('\n--- 1. Generating Sample Verification PDF ---');
  const sampleParts = [
    {
      ...allParts[0],
      chapters: allParts[0].chapters.slice(0, 1), // Master Operations Flow
    },
    {
      ...allParts[2],
      chapters: allParts[2].chapters.filter(c => c.id === 'package-pricing').slice(0, 1), // Package Pricing Table
    },
    {
      ...allParts[3],
      chapters: allParts[3].chapters.filter(c => c.id === 'dilution-chart-reference').slice(0, 1), // Dilution Reference Table
    },
  ];

  const sampleHtml = buildHtmlBook(sampleParts, true);
  const sampleHtmlPath = path.resolve('scratch/sample_manual_temp.html');
  fs.writeFileSync(sampleHtmlPath, sampleHtml, 'utf-8');

  const samplePdfPath = path.join(manualsDir, 'Prime_Auto_Detail_App_Manual_Sample.pdf');
  const sampleCmd = `"${browserPath}" --headless=new --disable-gpu --no-sandbox --run-all-compositor-stages-before-draw --print-to-pdf="${samplePdfPath}" --no-pdf-header-footer "file:///${sampleHtmlPath.replace(/\\/g, '/')}"`;
  execSync(sampleCmd, { stdio: 'inherit' });

  if (fs.existsSync(samplePdfPath)) {
    const stat = fs.statSync(samplePdfPath);
    const pages = countPdfPages(samplePdfPath);
    console.log(`[SUCCESS] Sample PDF Generated:`);
    console.log(`  Path: ${samplePdfPath}`);
    console.log(`  File Size: ${(stat.size / 1024).toFixed(2)} KB (${stat.size} bytes)`);
    console.log(`  Page Count: ${pages} pages`);
  }
  if (fs.existsSync(sampleHtmlPath)) fs.unlinkSync(sampleHtmlPath);

  // 2. GENERATE FULL PUBLICATION PDF (All 8 Parts, 137 Chapters, All Tables)
  console.log('\n--- 2. Generating Complete Publication Manual PDF ---');
  const fullHtml = buildHtmlBook(allParts, false);
  const fullHtmlPath = path.resolve('scratch/full_manual_temp.html');
  fs.writeFileSync(fullHtmlPath, fullHtml, 'utf-8');

  const fullPdfPath = path.join(manualsDir, 'Prime_Auto_Detail_App_Manual.pdf');
  const fullCmd = `"${browserPath}" --headless=new --disable-gpu --no-sandbox --run-all-compositor-stages-before-draw --print-to-pdf="${fullPdfPath}" --no-pdf-header-footer "file:///${fullHtmlPath.replace(/\\/g, '/')}"`;
  execSync(fullCmd, { stdio: 'inherit' });

  if (fs.existsSync(fullPdfPath)) {
    const stat = fs.statSync(fullPdfPath);
    const pages = countPdfPages(fullPdfPath);
    console.log(`[SUCCESS] Full Manual PDF Generated:`);
    console.log(`  Path: ${fullPdfPath}`);
    console.log(`  File Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB (${stat.size} bytes)`);
    console.log(`  Page Count: ${pages} pages`);
  }
  if (fs.existsSync(fullHtmlPath)) fs.unlinkSync(fullHtmlPath);

  console.log('\n[COMPLETE] Both Sample and Full Manual PDFs generated and ready in public/manuals/');
}

run().catch(err => {
  console.error('Failed to generate manual PDFs:', err);
  process.exit(1);
});
