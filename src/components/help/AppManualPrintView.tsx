import React, { useMemo } from 'react';
import { compileManualContent, getGlossaryTerms, getIndexGroups, ManualPart } from '@/lib/manual-content';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Download, BookOpen, Layers, CheckCircle2, ShieldCheck, Sparkles, Bookmark, Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AppManualPrintViewProps {
  sampleMode?: boolean; // If true, only renders Cover, Copyright, How-To, TOC, and 3 sample chapters
}

export const AppManualPrintView: React.FC<AppManualPrintViewProps> = ({ sampleMode = false }) => {
  const navigate = useNavigate();
  const allParts = useMemo(() => compileManualContent(), []);

  // In sample mode, take Part 1, Part 3, and Part 4 with 1 chapter each
  const parts: ManualPart[] = useMemo(() => {
    if (!sampleMode) return allParts;
    return [
      {
        ...allParts[0],
        chapters: allParts[0].chapters.slice(0, 1), // Master Operations Flow (includes table)
      },
      {
        ...allParts[2],
        chapters: allParts[2].chapters.filter(c => c.id === 'package-pricing').slice(0, 1), // Package Pricing (includes table)
      },
      {
        ...allParts[3],
        chapters: allParts[3].chapters.filter(c => c.id === 'dilution-chart-reference').slice(0, 1), // Dilution Reference Chart (includes table)
      },
    ];
  }, [allParts, sampleMode]);

  const totalChapters = useMemo(() => {
    return allParts.reduce((acc, p) => acc + p.chapters.length, 0);
  }, [allParts]);

  const glossaryTerms = useMemo(() => {
    const all = getGlossaryTerms();
    return sampleMode ? all.slice(0, 6) : all;
  }, [sampleMode]);

  const indexGroups = useMemo(() => {
    return getIndexGroups(sampleMode ? parts : allParts);
  }, [parts, allParts, sampleMode]);

  const handlePrint = () => {
    window.print();
  };

  const renderContentLine = (line: string, index: number) => {
    if (!line.trim()) {
      return <div key={index} className="h-3" />;
    }

    // Bold section header (e.g., **The Prime Methodology** or 🚀 **PHASE 1**)
    if (line.includes('**')) {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={index} className="text-zinc-800 text-[13px] leading-relaxed my-1.5 font-normal">
          {parts.map((p, i) => {
            if (p.startsWith('**') && p.endsWith('**')) {
              return (
                <strong key={i} className="font-bold text-slate-950">
                  {p.slice(2, -2)}
                </strong>
              );
            }
            return p;
          })}
        </p>
      );
    }

    // Bullet point
    if (line.startsWith('•') || line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.replace(/^[•\-\*]\s*/, '');
      return (
        <li key={index} className="text-zinc-700 text-[13px] leading-relaxed my-1 ml-4 list-disc">
          {text}
        </li>
      );
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      return (
        <p key={index} className="text-zinc-800 text-[13px] leading-relaxed my-1.5 font-medium pl-2">
          {line}
        </p>
      );
    }

    // Callout / Pro Tip / Warning
    if (line.startsWith('💡') || line.startsWith('⚠️') || line.startsWith('🛡️') || line.startsWith('🔒')) {
      return (
        <div key={index} className="my-3 p-3 bg-amber-50/80 border-l-4 border-amber-500 rounded-r-md text-[12.5px] text-amber-950 break-inside-avoid">
          {line}
        </div>
      );
    }

    // Standard paragraph
    return (
      <p key={index} className="text-zinc-700 text-[13px] leading-relaxed my-1.5">
        {line}
      </p>
    );
  };

  return (
    <div className="bg-zinc-100 min-h-screen text-zinc-900 font-sans antialiased print:bg-white print:p-0">
      {/* Top Floating Control Bar (Hidden when printing) */}
      <header className="no-print sticky top-0 z-50 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 text-white px-4 py-3 shadow-xl">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2 bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200"
            >
              <ArrowLeft className="w-4 h-4" /> Back to App
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <div>
                <h1 className="text-sm font-bold tracking-wide text-white">
                  Prime Auto Detail — Operations &amp; Application Manual
                </h1>
                <p className="text-[11px] text-zinc-400">
                  {sampleMode ? 'Verification Sample View' : `Complete Internal Edition • 8 Parts • ${totalChapters} Chapters • Glossary & Index`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/manuals/Prime_Auto_Detail_App_Manual.pdf"
              download="Prime_Auto_Detail_App_Manual.pdf"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 transition-colors shadow-sm"
              title="Download pre-compiled vector PDF"
            >
              <Download className="w-3.5 h-3.5" /> Download Pre-built PDF
            </a>
            <Button
              onClick={handlePrint}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 shadow-lg"
            >
              <Printer className="w-4 h-4" /> Print / Save to PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Main Printable Document Canvas */}
      <main className="max-w-[850px] mx-auto my-8 bg-white shadow-2xl rounded-sm print:shadow-none print:m-0 print:max-w-none print:w-full print:rounded-none">
        
        {/* ========================================================================= */}
        {/* PAGE 1: COVER PAGE                                                         */}
        {/* ========================================================================= */}
        <section className="page-cover min-h-[1050px] p-16 flex flex-col justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-zinc-950 text-white relative overflow-hidden break-after-page">
          {/* Subtle Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 p-0.5 shadow-lg">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
              <div>
                <span className="text-xs uppercase font-black tracking-[0.25em] text-emerald-400">
                  Prime Auto Detail LLC
                </span>
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                  Professional Detailing &amp; Operations System
                </p>
              </div>
            </div>
            <div className="w-24 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full" />
          </div>

          {/* Book Title & Subtitle */}
          <div className="my-auto relative z-10 py-16">
            <span className="inline-block px-3 py-1 mb-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-black uppercase tracking-widest text-emerald-300">
              Internal Operations Manual • 2026 Edition
            </span>
            <h1 className="text-5xl font-black tracking-tight text-white mb-6 uppercase leading-[1.1]">
              Application &amp; Operations Manual
            </h1>
            <p className="text-lg font-light text-zinc-300 max-w-xl leading-relaxed mb-8">
              The Comprehensive Standard Operating Procedures, Chemical Dilution Masterclass, CRM Architecture, Rig Logistics, and Business Intelligence Manual.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono text-zinc-400">
              <span className="px-2.5 py-1 bg-zinc-900/80 border border-zinc-800 rounded">Version 6.4</span>
              <span className="px-2.5 py-1 bg-zinc-900/80 border border-zinc-800 rounded">8 Parts</span>
              <span className="px-2.5 py-1 bg-zinc-900/80 border border-zinc-800 rounded">{totalChapters} Chapters</span>
              <span className="px-2.5 py-1 bg-zinc-900/80 border border-zinc-800 rounded">Glossary &amp; Index</span>
            </div>
          </div>

          {/* Cover Footer */}
          <div className="border-t border-zinc-800/80 pt-8 relative z-10 flex justify-between items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Author &amp; Architect</p>
              <p className="text-sm font-semibold text-white">Rick Berube</p>
              <p className="text-[11px] text-zinc-500">Founder &amp; Master Detailer</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-mono text-zinc-400">Prime Auto Detail Systems</p>
              <p className="text-[10px] text-zinc-500">Auburn, Maine • primeautodetail.com</p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PAGE 2: COPYRIGHT & EDITION NOTICE                                         */}
        {/* ========================================================================= */}
        <section className="page-copyright min-h-[1050px] p-16 flex flex-col justify-between text-zinc-600 text-xs leading-relaxed break-after-page border-b print:border-none">
          <div className="pt-12">
            <h2 className="text-base font-bold text-zinc-900 uppercase tracking-widest mb-6">
              Prime Auto Detail — Application &amp; Operations Manual
            </h2>
            <p className="mb-4">
              <strong>Published by:</strong> Prime Auto Detail Publishing<br />
              Auburn, Maine, USA<br />
              Website: <span className="font-mono text-zinc-800">https://primeautodetail.com</span>
            </p>
            <p className="mb-4">
              Copyright &copy; 2026 by <strong>Prime Auto Detail, LLC</strong>. All rights reserved.
            </p>
            <p className="mb-4">
              No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.
            </p>
            <p className="mb-4">
              <strong>Trademark Notices:</strong> "Prime Auto Detail", "PDSv6", "Prime Dilution Calculator", "Caddy Worksheet", and associated logos are proprietary trademarks of Prime Auto Detail, LLC. All other trademarks, service marks, and trade names referenced in this manual are the property of their respective owners.
            </p>
            <p className="mb-4">
              <strong>Disclaimer:</strong> The chemical procedures, dilution formulas, and operational guidelines detailed in this manual represent professional detailing standards. Always refer to individual chemical Safety Data Sheets (SDS) and wear appropriate personal protective equipment (PPE) including eye protection and chemical-resistant gloves when handling concentrates.
            </p>
          </div>

          <div className="border-t border-zinc-200 pt-6 font-mono text-[11px] space-y-1">
            <p><strong>First Edition:</strong> January 2026</p>
            <p><strong>Current Revision:</strong> 6.4 (September 2026)</p>
            <p><strong>Document ID:</strong> PDS6-MANUAL-PUBLICATION-2026-REV4</p>
            <p className="pt-2 text-zinc-400">Printed in the United States of America</p>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PAGE 3: HOW TO USE THIS MANUAL                                            */}
        {/* ========================================================================= */}
        <section className="page-intro min-h-[1050px] p-16 flex flex-col justify-between break-after-page border-b print:border-none">
          <div>
            <div className="border-b-2 border-slate-900 pb-4 mb-8">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">
                Operational Framework
              </span>
              <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tight">
                How to Use This Manual
              </h2>
            </div>
            
            <p className="text-sm text-zinc-700 leading-relaxed mb-6">
              Welcome to the <strong>Prime Auto Detail Application &amp; Operations Manual</strong>. This document serves as the single source of truth for all operational, technical, financial, and chemical standards within the business. Whether you are an experienced shop manager, an intake specialist, or a field detailing technician, this manual provides clear, actionable instructions for every situation you encounter.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2 font-bold text-slate-950 text-sm mb-2">
                  <Bookmark className="w-4 h-4 text-emerald-600" />
                  <span>8 Core Operational Parts</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Topics are grouped into 8 logical parts reflecting the natural flow of business operations: from initial customer lead generation through chemical dilution, mobile rig logistics, financial accounting, and platform security.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2 font-bold text-slate-950 text-sm mb-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Structured Reference Tables</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Key chapters feature standardized matrices—such as the Master Chemical Dilution Chart, Package Pricing Tiers, and Vehicle Classifications—designed for fast lookup on the shop floor or inside mobile rigs.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2 font-bold text-slate-950 text-sm mb-2">
                  <ArrowRight className="w-4 h-4 text-emerald-600" />
                  <span>Interactive In-App Route Badges</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Every chapter identifies the exact application route (e.g. <code className="bg-zinc-200 px-1 py-0.5 rounded text-[10px] font-mono">/availability-manager</code>) where the feature lives in the web app, allowing immediate hands-on practice.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2 font-bold text-slate-950 text-sm mb-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Glossary &amp; Subject Index</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Refer to the Glossary at the back of the manual for precise definitions of app-specific acronyms (IAC, RB Test, Smart Sync, F150 Command Center) and consult the Alphabetical Index for quick topic location.
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-xs text-amber-950 leading-relaxed my-4">
              <strong>💡 Best Practice for Daily Operations:</strong> Keep a printed copy of this manual bound in the shop office and a synchronized PDF on every mobile rig tablet. When onboarding new team members, assign Chapters 1–13 (Operations &amp; Customer Journey) and Chapters 45–68 (Chemical Mastery) as mandatory week-one reading before unsupervised field dispatches.
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-4 flex justify-between items-center text-[10px] uppercase font-mono text-zinc-400">
            <span>Prime Auto Detail — Operations Standard</span>
            <span>Introduction • Guide</span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PAGE 4: TABLE OF CONTENTS                                                  */}
        {/* ========================================================================= */}
        <section className="page-toc min-h-[1050px] p-16 break-after-page border-b print:border-none">
          <div className="border-b-2 border-slate-900 pb-4 mb-8">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">
              Navigation &amp; Roadmap
            </span>
            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tight">
              Table of Contents
            </h2>
          </div>

          <div className="space-y-8">
            {allParts.map((part) => (
              <div key={part.partNumber} className="break-inside-avoid">
                <div className="flex items-baseline justify-between border-b border-zinc-300 pb-1 mb-2">
                  <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wide">
                    Part {part.partNumber}: {part.title}
                  </h3>
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    {part.chapters.length} Chapters
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 italic mb-2">
                  {part.subtitle}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  {part.chapters.map((ch) => (
                    <div key={ch.id} className="flex items-center justify-between text-[11.5px] py-0.5">
                      <span className="text-zinc-800 truncate mr-2">
                        <span className="font-mono text-zinc-400 text-[10px] mr-1.5">{ch.chapterNumber}.</span>
                        {ch.title}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                        {ch.route || ch.section || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-200 pt-4 mt-8 flex justify-between items-center text-[10px] uppercase font-mono text-zinc-400">
            <span>Prime Auto Detail — Operations Standard</span>
            <span>Table of Contents</span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* DOCUMENT BODY: 8 PARTS & CHAPTERS                                          */}
        {/* ========================================================================= */}
        {parts.map((part) => (
          <React.Fragment key={part.partNumber}>
            {/* Part Title Divider Page */}
            <section className="page-part-divider min-h-[900px] p-16 flex flex-col justify-between bg-slate-900 text-white break-before-page break-after-page">
              <div className="border-t-4 border-emerald-500 pt-8">
                <span className="text-xs font-mono uppercase tracking-[0.3em] text-emerald-400 font-bold">
                  Section Division • Part {part.partNumber}
                </span>
                <h2 className="text-4xl font-black uppercase tracking-tight text-white mt-4 mb-2">
                  {part.title}
                </h2>
                <p className="text-lg text-zinc-300 font-light max-w-xl">
                  {part.subtitle}
                </p>
              </div>

              <div className="my-auto py-12 max-w-2xl">
                <p className="text-base text-zinc-300 leading-relaxed">
                  {part.description}
                </p>
                <div className="mt-8 flex items-center gap-4 text-xs font-mono text-emerald-400 bg-slate-800/80 border border-slate-700 p-4 rounded-lg">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <span>Contains {part.chapters.length} specialized operational chapters</span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 flex justify-between items-center text-[10px] uppercase tracking-widest text-zinc-500">
                <span>Prime Auto Detail Operations Standard</span>
                <span>Part {part.partNumber} Overview</span>
              </div>
            </section>

            {/* Part Chapters */}
            {part.chapters.map((chapter) => (
              <article
                key={chapter.id}
                className="page-chapter min-h-[1050px] p-16 flex flex-col justify-between break-before-page border-b print:border-none relative"
              >
                {/* Chapter Running Header */}
                <div>
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-6 text-[10px] uppercase font-mono tracking-widest text-zinc-500">
                    <span>Part {part.partNumber}: {part.title}</span>
                    <span className="font-bold text-emerald-700">Chapter {chapter.chapterNumber}</span>
                  </div>

                  {/* Chapter Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold uppercase tracking-wider">
                        Topic ID: {chapter.id}
                      </span>
                      {chapter.route && (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono font-bold uppercase tracking-wider">
                          Route: {chapter.route}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tight mb-2">
                      {chapter.title}
                    </h2>
                    {chapter.summary && (
                      <p className="text-xs font-medium text-zinc-600 italic bg-zinc-50 border-l-2 border-emerald-600 pl-3 py-1.5 my-3">
                        {chapter.summary}
                      </p>
                    )}
                  </div>

                  {/* Built-in Custom Reference Table (If Present) */}
                  {chapter.customTable && (
                    <div className="my-6 p-4 bg-slate-50 border border-slate-300 rounded-lg break-inside-avoid">
                      <div className="mb-3">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          {chapter.customTable.title}
                        </h4>
                        {chapter.customTable.description && (
                          <p className="text-[11px] text-zinc-500">
                            {chapter.customTable.description}
                          </p>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b-2 border-slate-900 bg-slate-200/80">
                              {chapter.customTable.headers.map((h, idx) => (
                                <th key={idx} className="p-2 font-bold text-slate-950 uppercase tracking-wider text-[11px]">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 text-[11px]">
                            {chapter.customTable.rows.map((row, rIdx) => (
                              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-2 text-zinc-800 font-medium">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Chapter Body Content */}
                  <div className="space-y-1.5">
                    {chapter.content.map((line, idx) => renderContentLine(line, idx))}
                  </div>
                </div>

                {/* Running Footer (Print Only) */}
                <div className="hidden print:flex justify-between items-center text-[9px] uppercase tracking-widest text-zinc-400 border-t border-zinc-200 pt-2 mt-12">
                  <span>Confidential — Prime Auto Detail, LLC</span>
                  <span>Chapter {chapter.chapterNumber}</span>
                </div>
              </article>
            ))}
          </React.Fragment>
        ))}

        {/* ========================================================================= */}
        {/* GLOSSARY OF APP-SPECIFIC TERMS                                            */}
        {/* ========================================================================= */}
        <section className="page-glossary min-h-[1050px] p-16 break-before-page break-after-page border-b print:border-none">
          <div className="border-b-2 border-slate-900 pb-4 mb-8">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">
              Reference &amp; Vocabulary
            </span>
            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tight">
              Glossary of Key Terms
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Definitions of proprietary systems, workflows, formulas, and acronyms used throughout the Prime Auto Detail platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {glossaryTerms.map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg break-inside-avoid">
                <div className="flex items-baseline justify-between mb-1.5">
                  <h3 className="text-sm font-bold text-slate-950">{item.term}</h3>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {item.definition}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-200 pt-4 mt-8 flex justify-between items-center text-[10px] uppercase font-mono text-zinc-400">
            <span>Prime Auto Detail — Operations Standard</span>
            <span>Glossary</span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* COMPREHENSIVE TOPIC & SYSTEM INDEX                                        */}
        {/* ========================================================================= */}
        <section className="page-index min-h-[1050px] p-16 break-before-page border-b print:border-none">
          <div className="border-b-2 border-slate-900 pb-4 mb-8">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">
              Alphabetical Reference
            </span>
            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tight">
              Subject &amp; Topic Index
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Complete alphabetical directory of operational chapters and reference topics.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {indexGroups.map((group) => (
              <div key={group.letter} className="break-inside-avoid">
                <div className="border-b-2 border-emerald-600 pb-0.5 mb-2">
                  <span className="text-lg font-black text-slate-950 font-mono">{group.letter}</span>
                </div>
                <ul className="space-y-1 text-xs">
                  {group.items.map((item, i) => (
                    <li key={i} className="flex items-baseline justify-between text-zinc-700 hover:text-slate-950">
                      <span className="truncate mr-2 font-medium">{item.title}</span>
                      <span className="font-mono text-[10px] text-zinc-400 shrink-0">
                        Ch. {item.chapterNumber} (P.{item.partNumber})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-200 pt-4 mt-12 flex justify-between items-center text-[10px] uppercase font-mono text-zinc-400">
            <span>Prime Auto Detail — Operations Standard</span>
            <span>Index</span>
          </div>
        </section>
      </main>

      {/* Global Print Stylesheet */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
            line-height: 1.5 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: letter portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          .break-before-page {
            page-break-before: always !important;
            break-before: page !important;
          }
          .break-after-page {
            page-break-after: always !important;
            break-after: page !important;
          }
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          h1, h2, h3, h4 {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};
export default AppManualPrintView;
