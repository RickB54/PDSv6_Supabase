import { makeToc, HelpTopic } from '../components/help/helpData';

export interface ManualChapter {
  id: string;
  chapterNumber: number;
  title: string;
  summary: string;
  content: string[];
  route?: string;
  section?: string;
  customTable?: {
    title: string;
    description?: string;
    headers: string[];
    rows: string[][];
  };
}

export interface ManualPart {
  partNumber: number;
  title: string;
  subtitle: string;
  description: string;
  chapters: ManualChapter[];
}

// Built-in Tabular Data for naturally tabular topics
export const REFERENCE_TABLES: Record<string, { title: string; description?: string; headers: string[]; rows: string[][] }> = {
  'operations-flow': {
    title: 'Master Operations Workflow Matrix',
    description: 'Summary of the six operational phases governing the Prime Auto Detail lifecycle.',
    headers: ['Phase', 'Trigger / Event', 'Primary Tool / View', 'Core Action', 'Resulting Record'],
    rows: [
      ['1. Lead Capture', 'Inquiry from phone/form', 'Prospects Page', 'Create contact record', 'Prospect Profile'],
      ['2. The Commitment', 'Client confirms booking', 'Bookings Calendar', 'Assign vehicle & package', 'Confirmed Appointment'],
      ['3. Rig Preparation', 'Day of service setup', 'Prep Summary Tool', 'Gather chemical caddy & gear', 'Ready Rig Checklist'],
      ['4. Job Execution', 'Service start', 'Service Checklist', 'Digital inspection & timer', 'Completed Steps Audit'],
      ['5. Billing & Close', 'Service completed', 'Invoicing / Quick Pay', 'Collect card/cash/check', 'Paid Taxable Invoice'],
      ['6. Retention Cycle', '4-8 weeks post-service', 'Follow-Up Center', 'Send maintenance reminder', 'Repeat Client Booking'],
    ],
  },
  'dilution-chart-reference': {
    title: 'Prime Master Chemical Dilution Reference Table',
    description: 'Standard dilution ratios for high-volume detailing chemicals used in shop and mobile operations.',
    headers: ['Chemical / Product', 'Ratio', 'Ounces per 32oz Bottle', 'Water Fill Line', 'Target Surfaces & Purpose'],
    rows: [
      ['All-Purpose Cleaner (Heavy)', '1:4', '6.4 oz', '25.6 oz', 'Wheels, tires, engine bay, heavy grease'],
      ['All-Purpose Cleaner (Medium)', '1:10', '2.9 oz', '29.1 oz', 'Door jambs, rubber floor mats, pedals'],
      ['Interior Cockpit Cleaner', '1:16', '1.9 oz', '30.1 oz', 'Dashboard, console, vinyl door cards'],
      ['Leather Cleaner (Gentle)', '1:20', '1.5 oz', '30.5 oz', 'Coated leather, stitch seams, steering wheels'],
      ['Glass Cleaner Concentrate', '1:10', '2.9 oz', '29.1 oz', 'Streak-free tint-safe glass & mirrors'],
      ['Iron Decon / Fallot Remover', 'RTU (1:0)', '32.0 oz', '0.0 oz', 'Paint decontamination, brake dust release'],
      ['Clay Lube / Rinseless Wash', '1:64', '0.5 oz', '31.5 oz', 'Mechanical clay bar lubrication, dry dusting'],
      ['Ceramic Spray Sealant', 'RTU (1:0)', '32.0 oz', '0.0 oz', 'Gloss enhancement, hydrophobicity layer'],
    ],
  },
  'package-pricing': {
    title: 'Service Package Matrix & Vehicle Sizing Tiers',
    description: 'Tiered service packages with vehicle category multiplier baselines.',
    headers: ['Package Name', 'Est. Time', 'Coupe / Compact', 'Sedan / Mid SUV', 'Full Truck / 3-Row', 'Luxury / Exotic'],
    rows: [
      ['Express Clean & Protect', '1.5 - 2 hrs', '$129.00', '$149.00', '$179.00', '$199.00'],
      ['Interior Deep Sanctuary', '2.5 - 3.5 hrs', '$199.00', '$229.00', '$269.00', '$299.00'],
      ['Exterior Precision Gloss', '2.0 - 3.0 hrs', '$189.00', '$219.00', '$259.00', '$289.00'],
      ['Full Prime Essential', '4.0 - 5.5 hrs', '$329.00', '$369.00', '$429.00', '$489.00'],
      ['Signature Ceramic Package', '6.0 - 8.0 hrs', '$649.00', '$729.00', '$849.00', '$999.00'],
    ],
  },
  'vehicle-classification': {
    title: 'Standard Vehicle Classification Reference',
    description: 'Guidelines for vehicle size classification to ensure consistent pricing calculation.',
    headers: ['Class Code', 'Category Name', 'Typical Examples', 'Pricing Multiplier', 'Surface Area Notes'],
    rows: [
      ['CLASS-1', 'Compact / Coupe', 'Mazda Miata, Porsche 911, Honda Civic 2D', '1.0x (Base)', 'Standard 2-door or compact footprint'],
      ['CLASS-2', 'Mid-Size Sedan / Small SUV', 'Toyota Camry, BMW 3/5 Series, Toyota RAV4', '1.15x', '4-door sedans, 2-row crossovers'],
      ['CLASS-3', 'Full-Size Truck / 3-Row SUV', 'Ford F-150, Chevy Tahoe, Toyota Highlander', '1.30x', 'Extended cabs, 3rd row seating, truck beds'],
      ['CLASS-4', 'Heavy Duty / Commercial', 'Ford F-350 Dually, Mercedes Sprinter Van', '1.60x', 'High roofs, dual rear wheels, heavy cargo area'],
      ['CLASS-5', 'Exotic / Bespoke', 'Ferrari, Lamborghini, Rolls-Royce Phantom', '1.50x - 2.0x', 'Delicate materials, carbon fiber, soft paint'],
    ],
  },
  'break-even-analysis': {
    title: 'Financial Health & Break-Even Metric Model',
    description: 'Key business metrics tracked by the financial analytics engine.',
    headers: ['Financial Metric', 'Target Formula', 'Optimal Shop Benchmark', 'Mobile Unit Benchmark'],
    rows: [
      ['Gross Profit Margin', '(Revenue - COGS) / Revenue', '75% - 85%', '80% - 90%'],
      ['Labor Efficiency Ratio', 'Labor Revenue / Total Labor Cost', '3.5x - 4.5x', '4.0x - 5.0x'],
      ['Chemical Cost Per Job', 'Chemical Usage / Completed Jobs', '$4.50 - $8.00', '$6.00 - $11.00'],
      ['Drive Cost Allowance', 'IRS Standard Mileage Rate x Miles', 'N/A (Fixed Facility)', '$0.67 / mile tracked'],
      ['Monthly Break-Even Point', 'Fixed Overhead / Gross Margin %', '$4,500 - $6,500', '$2,500 - $3,800'],
    ],
  },
};

// Explicit Part Category Assignments
const PART_TOPIC_MAPPINGS: Record<number, string[]> = {
  1: [
    'operations-flow',
    'booking-flow',
    'intake-workflows',
    'prospect-vs-customer',
    'customers',
    'search-customer',
    'prospects',
    'vehicle-management',
    'multi-vehicle-booking',
    'retention-hub',
    'customer-view',
    'customer-management-flow',
    'main-menu',
    'main-menu-management',
  ],
  2: [
    'bookings',
    'availability-manager',
    'staff-schedule',
    'service-checklist',
    'checklist-tools-guide',
    'checklist-final-steps',
    'client-evaluation',
    'tasks',
    'mobile-setup-command-center',
    'mobile-setup',
    'shop-setup',
  ],
  3: [
    'estimates',
    'hosted-estimate-portal',
    'invoicing',
    'hosted-invoice-portal',
    'quick-pay',
    'accounting',
    'accounting-summary',
    'net-profit-explanation',
    'payroll',
    'compensation-payroll',
    'time-profitability-guide',
    'company-budget',
    'break-even-analysis',
    'taxes',
    'reports-tax',
    'package-pricing',
    'package-selection',
    'vehicle-classification',
    'addon-upsell-script',
    'phone-assistant',
    'mileage',
  ],
  4: [
    'inventory-control',
    'inventory',
    'chemical-description',
    'chemical-docs-v3',
    'dilution-source-of-truth',
    'dilution-chart-reference',
    'prime-dilution-calculator',
    'dilution-calc',
    'prime-dilution-masterclass',
    'dilution-chart-interactive',
    'dilution-chart-modal',
    'dilution-reference-chart',
    'chemical-decision-system',
    'ai-chemical-assistant',
    'chemical-cards',
    'chemical-cards-guide',
    'inventory-chemicals',
    'chemical-inventory-modal',
    'static-caddy-worksheet',
    'chemical-label-maker',
    'chemical-workflow',
    'inventory-audit',
    'usage-report',
    'materials-usage-log-modal',
    'detailing-vendors',
  ],
  5: [
    'employee-dashboard',
    'employee-certification',
    'learn-lib',
    'orientation',
    'company-employees',
    'employees',
    'team-chat',
    'dashboard-cheat-exam',
    'training',
    'interactive-training-demo',
    'links-vs-cards',
    'ricks-tips',
  ],
  6: [
    'analytics',
    'admin-dashboard',
    'bookings-analytics',
    'reports-dashboard',
    'reports-global-summary',
    'reports-temporal-scan',
    'reports-logic-grouping',
    'reports-customers',
    'reports-invoices',
    'reports-inventory',
    'reports-employee',
    'reports-estimates',
    'reports-accounting',
    'logic-inspector',
    'jobs-completed',
  ],
  7: [
    'website-admin',
    'website',
    'website-content',
    'home-content-management',
    'about-content-management',
    'faqs-management',
    'contact-control',
    'contact-media-uploads',
    'footer-content-management',
    'testimonials-management',
    'blog',
    'blog-reorder',
    'discount-coupons',
    'discounts',
    'sticker-maker',
    'vehicle-types-management',
    'services-disclaimer-management',
    'business-launch-manager',
    'winter-mode-management',
    'booking-test-mode',
  ],
  8: [
    'application-settings',
    'settings',
    'dashboard-settings',
    'user-mgmt',
    'users-roles',
    'user-management-quick-tips',
    'dashboard-user-management',
    'user-profile',
    'inventory-cleanup-tool',
    'deleting-records',
    'test-customer-workflow',
    'photo-system',
    'media-library',
    'file-manager',
    'sticky-notes',
    'personal-notes',
    'letter-maker',
    'alerts',
    'dashboard-alerts',
    'dashboard-add-customer',
    'dashboard-menu-visibility',
  ],
};

const PART_DEFINITIONS = [
  {
    partNumber: 1,
    title: 'Core Operations & Customer Lifecycle',
    subtitle: 'The CRM-First Philosophy & Customer Master Record Architecture',
    description: 'Fundamental operating doctrines, customer relationship management, vehicle garage administration, prospect conversion pathways, and the end-to-end booking lifecycle.',
  },
  {
    partNumber: 2,
    title: 'Appointments, Scheduling & Field Service',
    subtitle: 'Service Checklist, Rig Management & Physical Execution',
    description: 'Calendar management, hybrid staff availability, digital multi-point inspection workflows, mobile detailing unit configurations, and offline field checklist execution.',
  },
  {
    partNumber: 3,
    title: 'Financials, Pricing, Invoicing & Payroll',
    subtitle: 'Commercial Operations, Bookkeeping & Profit Maximization',
    description: 'Estimates, payment acceptance portals, break-even financial models, tax accounting, service package tiering, job-cost analysis, and technician compensation calculators.',
  },
  {
    partNumber: 4,
    title: 'Chemicals, Dilution & Inventory Control',
    subtitle: 'Chemical Science, Safety, Ratios & Supply Chain',
    description: 'The master source-of-truth dilution engine, chemical decision matrix, automated label maker, inventory audit checklists, and materials consumption tracking.',
  },
  {
    partNumber: 5,
    title: 'Staff, Training, Certification & Communications',
    subtitle: 'Workforce Development, Examinations & Internal Channels',
    description: 'New technician onboarding, standard operating procedures (SOPs), knowledge library, certification examinations, team dispatch chat, and high-fidelity training simulations.',
  },
  {
    partNumber: 6,
    title: 'Business Intelligence, Analytics & Reports',
    subtitle: 'Data Architecture, Performance Tracking & Executive Summaries',
    description: 'Executive dashboards, temporal date filtering scans, logic grouping engines, employee productivity KPIs, invoice audit reporting, and business valuation modeling.',
  },
  {
    partNumber: 7,
    title: 'Website Content, Marketing & Public Portals',
    subtitle: 'Client Touchpoints, Digital Marketing & Online Experience',
    description: 'Customer-facing website administration, content block management, blog publishing, promotional discount systems, testimonial curation, and seasonal operation modes.',
  },
  {
    partNumber: 8,
    title: 'System Administration, Security & Master Settings',
    subtitle: 'Security Policies, Role Access & Platform Utility',
    description: 'Multi-tenant role permissions, data sanitization, sandbox environments, media drive storage, secure internal journals, automated dispatch alerts, and global app settings.',
  },
];

export function compileManualContent(): ManualPart[] {
  const rawToc = makeToc('admin');
  
  // Deduplicate by both ID and Title
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const uniqueTopics: HelpTopic[] = [];

  for (const t of rawToc) {
    const idKey = t.id.toLowerCase().trim();
    const titleKey = t.title.toLowerCase().trim();
    if (seenIds.has(idKey) || seenTitles.has(titleKey)) continue;
    seenIds.add(idKey);
    seenTitles.add(titleKey);
    uniqueTopics.push(t);
  }

  // Track which topic IDs have been assigned to parts
  const assignedIds = new Set<string>();
  let globalChapterCounter = 1;

  const parts: ManualPart[] = PART_DEFINITIONS.map(def => {
    const targetIds = PART_TOPIC_MAPPINGS[def.partNumber] || [];
    const partChapters: ManualChapter[] = [];

    for (const topicId of targetIds) {
      const topic = uniqueTopics.find(t => t.id.toLowerCase() === topicId.toLowerCase());
      if (topic && !assignedIds.has(topic.id)) {
        assignedIds.add(topic.id);
        partChapters.push({
          id: topic.id,
          chapterNumber: globalChapterCounter++,
          title: topic.title,
          summary: topic.summary,
          content: topic.content || [],
          route: topic.route,
          section: topic.section,
          customTable: REFERENCE_TABLES[topic.id],
        });
      }
    }

    return {
      partNumber: def.partNumber,
      title: def.title,
      subtitle: def.subtitle,
      description: def.description,
      chapters: partChapters,
    };
  });

  // Catch any unassigned topics and append them to logical matching parts
  for (const topic of uniqueTopics) {
    if (!assignedIds.has(topic.id)) {
      assignedIds.add(topic.id);
      const text = `${topic.id} ${topic.title} ${topic.summary}`.toLowerCase();
      
      let targetPartNumber = 8; // Default to Settings & Admin
      if (text.includes('chemical') || text.includes('dilution') || text.includes('inventory')) {
        targetPartNumber = 4;
      } else if (text.includes('invoice') || text.includes('pay') || text.includes('accounting') || text.includes('budget')) {
        targetPartNumber = 3;
      } else if (text.includes('book') || text.includes('schedule') || text.includes('checklist')) {
        targetPartNumber = 2;
      } else if (text.includes('customer') || text.includes('prospect')) {
        targetPartNumber = 1;
      } else if (text.includes('report') || text.includes('analytics')) {
        targetPartNumber = 6;
      } else if (text.includes('training') || text.includes('employee') || text.includes('exam')) {
        targetPartNumber = 5;
      } else if (text.includes('web') || text.includes('blog') || text.includes('marketing')) {
        targetPartNumber = 7;
      }

      const part = parts.find(p => p.partNumber === targetPartNumber) || parts[parts.length - 1];
      part.chapters.push({
        id: topic.id,
        chapterNumber: globalChapterCounter++,
        title: topic.title,
        summary: topic.summary,
        content: topic.content || [],
        route: topic.route,
        section: topic.section,
        customTable: REFERENCE_TABLES[topic.id],
      });
    }
  }

  return parts;
}

export function getManualStats() {
  const parts = compileManualContent();
  const totalChapters = parts.reduce((acc, p) => acc + p.chapters.length, 0);
  let totalWordCount = 0;

  for (const part of parts) {
    for (const ch of part.chapters) {
      totalWordCount += ch.title.split(/\s+/).length;
      totalWordCount += ch.summary.split(/\s+/).length;
      for (const line of ch.content) {
        totalWordCount += line.split(/\s+/).length;
      }
    }
  }

  // An average print page contains ~350-450 words including headers and margins
  const estimatedPages = Math.round(totalWordCount / 380) + 12; // +12 for cover, copyright, TOC, part title pages

  return {
    totalParts: parts.length,
    totalChapters,
    totalWordCount,
    estimatedPages,
  };
}
