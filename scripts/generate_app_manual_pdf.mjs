import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { compileManualContent, getGlossaryTerms, getIndexGroups } from '../src/lib/manual-content.ts';

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

  const glossaryTerms = isSample ? getGlossaryTerms().slice(0, 6) : getGlossaryTerms();
  const indexGroups = getIndexGroups(parts);

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
      font-weight: 900;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .cover-main-title {
      font-size: 38pt;
      font-weight: 900;
      line-height: 1.1;
      letter-spacing: -0.02em;
      text-transform: uppercase;
      margin: 0 0 16px 0;
      color: #ffffff;
    }
    .cover-subtitle {
      font-size: 13pt;
      font-weight: 300;
      line-height: 1.6;
      color: #cbd5e1;
      max-width: 600px;
      margin: 0 0 24px 0;
    }
    .cover-specs {
      display: flex;
      gap: 8px;
    }
    .cover-spec-badge {
      padding: 4px 8px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid #334155;
      border-radius: 4px;
      font-family: monospace;
      font-size: 8pt;
      color: #94a3b8;
    }
    .cover-footer {
      border-top: 1px solid #1e293b;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .author-role {
      font-size: 7.5pt;
      font-weight: 800;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #64748b;
    }
    .author-name {
      font-size: 12pt;
      font-weight: 800;
      color: #ffffff;
    }
    .author-title {
      font-size: 8pt;
      color: #94a3b8;
    }
    .cover-company {
      font-family: monospace;
      font-size: 8pt;
      color: #94a3b8;
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

    /* HOW TO USE THIS MANUAL */
    .intro-page {
      min-height: 100vh;
      page-break-after: always;
      break-after: page;
      padding: 20mm 15mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .intro-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 20px 0;
    }
    .intro-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .intro-card-title {
      font-weight: 800;
      font-size: 9.5pt;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .intro-card-text {
      font-size: 8pt;
      color: #475569;
      line-height: 1.5;
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
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .toc-part-title {
      font-size: 9.5pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.05em;
    }
    .toc-part-count {
      font-size: 8pt;
      font-weight: 800;
      color: #059669;
      font-family: monospace;
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
      gap: 2px 16px;
    }
    .toc-chapter-row {
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      padding: 1px 0;
    }
    .toc-ch-title {
      color: #334155;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 8px;
    }
    .toc-ch-num {
      font-family: monospace;
      color: #94a3b8;
    }
    .toc-ch-target {
      font-family: monospace;
      color: #64748b;
      font-size: 7.5pt;
      flex-shrink: 0;
    }

    /* PART DIVIDER */
    .part-divider {
      min-height: 100vh;
      page-break-before: always;
      break-before: page;
      page-break-after: always;
      break-after: page;
      background-color: #0f172a;
      color: #ffffff;
      padding: 30mm 20mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .part-badge {
      display: inline-block;
      border-top: 3px solid #10b981;
      padding-top: 12px;
      font-size: 8pt;
      font-weight: 900;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: #34d399;
      margin-bottom: 12px;
    }
    .part-title {
      font-size: 32pt;
      font-weight: 900;
      letter-spacing: -0.02em;
      text-transform: uppercase;
      margin: 0 0 10px 0;
      color: #ffffff;
      line-height: 1.1;
    }
    .part-subtitle {
      font-size: 13pt;
      font-weight: 300;
      color: #cbd5e1;
      margin: 0 0 24px 0;
    }
    .part-accent-line {
      width: 60px;
      height: 3px;
      background: #10b981;
      margin-bottom: 24px;
    }
    .part-desc {
      font-size: 11pt;
      color: #94a3b8;
      line-height: 1.7;
      max-width: 600px;
      margin-bottom: 24px;
    }
    .part-meta {
      font-family: monospace;
      font-size: 8.5pt;
      color: #34d399;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid #1e293b;
      padding: 8px 12px;
      border-radius: 6px;
      display: inline-block;
    }

    /* CHAPTER PAGE */
    .chapter-page {
      min-height: 100vh;
      page-break-before: always;
      break-before: page;
      padding: 20mm 15mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .running-header {
      display: flex;
      justify-content: space-between;
      font-family: monospace;
      font-size: 7pt;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 20px;
    }
    .running-footer {
      display: flex;
      justify-content: space-between;
      font-family: monospace;
      font-size: 7pt;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      margin-top: 24px;
    }
    .chapter-header {
      margin-bottom: 14px;
    }
    .chapter-badge {
      display: inline-block;
      padding: 2px 8px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      border-radius: 4px;
      font-family: monospace;
      font-size: 7pt;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .chapter-title {
      font-size: 20pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.02em;
      color: #0f172a;
      margin: 0;
      line-height: 1.2;
    }
    .chapter-summary {
      background: #f8fafc;
      border-left: 3px solid #10b981;
      padding: 8px 12px;
      margin: 12px 0 16px 0;
      border-radius: 0 6px 6px 0;
    }
    .summary-label {
      font-family: monospace;
      font-size: 6.5pt;
      font-weight: 800;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #059669;
      display: block;
      margin-bottom: 2px;
    }
    .summary-text {
      font-size: 8.5pt;
      color: #475569;
      font-style: italic;
      margin: 0;
      line-height: 1.4;
    }
    .chapter-content {
      font-size: 9pt;
      color: #334155;
      line-height: 1.55;
    }
    .paragraph {
      margin: 0 0 8px 0;
    }
    .bullet-item {
      margin: 3px 0 3px 18px;
      list-style-type: disc;
    }
    .numbered-item {
      margin: 4px 0 4px 8px;
      font-weight: 600;
    }
    .callout-box {
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      padding: 8px 12px;
      margin: 12px 0;
      border-radius: 0 6px 6px 0;
      font-size: 8.5pt;
      color: #78350f;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* STRUCTURED TABLES */
    .table-container {
      margin: 16px 0 20px 0;
      page-break-inside: avoid;
      break-inside: avoid;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px;
    }
    .table-title {
      font-size: 9pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .table-desc {
      font-size: 7.5pt;
      color: #64748b;
      margin: 0 0 8px 0;
    }
    .manual-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
    }
    .manual-table th {
      background: #e2e8f0;
      color: #0f172a;
      font-weight: 800;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 6px 8px;
      border-bottom: 2px solid #0f172a;
      text-align: left;
    }
    .manual-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    .row-even {
      background: #ffffff;
    }
    .row-odd {
      background: #f8fafc;
    }
    .spacer {
      height: 6px;
    }

    /* GLOSSARY */
    .glossary-page {
      min-height: 100vh;
      page-break-before: always;
      break-before: page;
      page-break-after: always;
      break-after: page;
      padding: 20mm 15mm;
    }
    .glossary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 20px;
    }
    .glossary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .glossary-term-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }
    .glossary-term {
      font-weight: 800;
      font-size: 9pt;
      color: #0f172a;
    }
    .glossary-cat {
      font-family: monospace;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      background: #dcfce7;
      color: #166534;
      border-radius: 4px;
    }
    .glossary-def {
      font-size: 8pt;
      color: #475569;
      line-height: 1.4;
      margin: 0;
    }

    /* INDEX */
    .index-page {
      min-height: 100vh;
      page-break-before: always;
      break-before: page;
      padding: 20mm 15mm;
    }
    .index-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-top: 20px;
    }
    .index-letter-block {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 16px;
    }
    .index-letter-title {
      font-size: 14pt;
      font-weight: 900;
      font-family: monospace;
      color: #0f172a;
      border-bottom: 2px solid #059669;
      padding-bottom: 2px;
      margin-bottom: 6px;
    }
    .index-item-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 7.5pt;
      padding: 2px 0;
      color: #334155;
    }
    .index-item-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 8px;
    }
    .index-item-meta {
      font-family: monospace;
      font-size: 7pt;
      color: #94a3b8;
      flex-shrink: 0;
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
      <div class="cover-edition-tag">Internal Operations Edition &bull; 2026</div>
      <h1 class="cover-main-title">Application &amp; Operations Manual</h1>
      <p class="cover-subtitle">
        The Comprehensive Standard Operating Procedures, Chemical Dilution Masterclass, CRM Architecture, Rig Logistics, and Business Intelligence Manual.
      </p>
      <div class="cover-specs">
        <span class="cover-spec-badge">Version 6.4</span>
        <span class="cover-spec-badge">8 Parts</span>
        <span class="cover-spec-badge">${totalChapters} Chapters</span>
        <span class="cover-spec-badge">Glossary &amp; Index</span>
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

  <!-- HOW TO USE THIS MANUAL -->
  <section class="intro-page">
    <div>
      <div class="toc-header-bar">
        <span class="toc-eyebrow">Operational Framework</span>
        <h2 class="toc-title">How to Use This Manual</h2>
      </div>

      <p style="font-size: 9pt; color: #334155; line-height: 1.6; margin-bottom: 16px;">
        Welcome to the <strong>Prime Auto Detail Application &amp; Operations Manual</strong>. This document serves as the single source of truth for all operational, technical, financial, and chemical standards within the business. Whether you are an experienced shop manager, an intake specialist, or a field detailing technician, this manual provides clear guidelines for every situation you encounter.
      </p>

      <div class="intro-grid">
        <div class="intro-card">
          <div class="intro-card-title">&#128214; 8 Core Operational Parts</div>
          <div class="intro-card-text">
            Topics are grouped into 8 parts reflecting the natural flow of business operations: from initial customer lead generation through chemical dilution, mobile rig logistics, financial accounting, and platform security.
          </div>
        </div>

        <div class="intro-card">
          <div class="intro-card-title">&#10024; Structured Reference Tables</div>
          <div class="intro-card-text">
            Key chapters feature standardized matrices—such as the Master Chemical Dilution Chart, Package Pricing Tiers, and Vehicle Classifications—designed for fast lookup on the shop floor or in mobile rigs.
          </div>
        </div>

        <div class="intro-card">
          <div class="intro-card-title">&#128640; Interactive In-App Route Badges</div>
          <div class="intro-card-text">
            Every chapter identifies the exact application route (e.g., <code>/availability-manager</code>) where the feature lives in the web app, allowing immediate hands-on practice.
          </div>
        </div>

        <div class="intro-card">
          <div class="intro-card-title">&#128737; Glossary &amp; Subject Index</div>
          <div class="intro-card-text">
            Refer to the Glossary at the back of the manual for precise definitions of app-specific acronyms (IAC, RB Test, Smart Sync, F150 Command Center) and consult the Alphabetical Index for quick topic location.
          </div>
        </div>
      </div>

      <div class="callout-box" style="margin-top: 20px;">
        <strong>💡 Best Practice for Daily Operations:</strong> Keep a printed copy of this manual bound in the shop office and a synchronized PDF on every mobile rig tablet. When onboarding new team members, assign Chapters 1–13 (Operations &amp; Customer Journey) and Chapters 45–68 (Chemical Mastery) as mandatory week-one reading before unsupervised field dispatches.
      </div>
    </div>

    <div class="running-footer" style="margin-top: 16px;">
      <span>PRIME AUTO DETAIL OPERATIONS MANUAL</span>
      <span>INTRODUCTION &bull; GUIDE</span>
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

  <!-- GLOSSARY OF TERMS -->
  <section class="glossary-page">
    <div class="toc-header-bar">
      <span class="toc-eyebrow">Reference &amp; Vocabulary</span>
      <h2 class="toc-title">Glossary of Key Terms</h2>
      <p style="font-size: 8pt; color: #64748b; margin-top: 4px;">
        Definitions of proprietary systems, workflows, formulas, and acronyms used throughout the Prime Auto Detail platform.
      </p>
    </div>

    <div class="glossary-grid">
      ${glossaryTerms.map(g => `
        <div class="glossary-card">
          <div class="glossary-term-row">
            <span class="glossary-term">${escapeHtml(g.term)}</span>
            <span class="glossary-cat">${escapeHtml(g.category)}</span>
          </div>
          <p class="glossary-def">${escapeHtml(g.definition)}</p>
        </div>
      `).join('')}
    </div>

    <div class="running-footer" style="margin-top: 24px;">
      <span>PRIME AUTO DETAIL OPERATIONS MANUAL</span>
      <span>GLOSSARY</span>
    </div>
  </section>

  <!-- SUBJECT & TOPIC INDEX -->
  <section class="index-page">
    <div class="toc-header-bar">
      <span class="toc-eyebrow">Alphabetical Reference</span>
      <h2 class="toc-title">Subject &amp; Topic Index</h2>
      <p style="font-size: 8pt; color: #64748b; margin-top: 4px;">
        Complete alphabetical directory of operational chapters and reference topics.
      </p>
    </div>

    <div class="index-grid">
      ${indexGroups.map(group => `
        <div class="index-letter-block">
          <div class="index-letter-title">${escapeHtml(group.letter)}</div>
          ${group.items.map(item => `
            <div class="index-item-row">
              <span class="index-item-title">${escapeHtml(item.title)}</span>
              <span class="index-item-meta">Ch. ${item.chapterNumber} (P.${item.partNumber})</span>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>

    <div class="running-footer" style="margin-top: 24px;">
      <span>PRIME AUTO DETAIL OPERATIONS MANUAL</span>
      <span>INDEX</span>
    </div>
  </section>

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

  // 1. GENERATE SAMPLE VERIFICATION PDF (Cover + Copyright + How-To + TOC + 3 Chapters with tables + Glossary + Index)
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

  // 2. GENERATE FULL PUBLICATION PDF (All 8 Parts, 137 Chapters, How-To, All Tables, Glossary, Index)
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
