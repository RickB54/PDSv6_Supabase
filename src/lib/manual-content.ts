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

export interface GlossaryTerm {
  term: string;
  category: string;
  definition: string;
  relatedChapterId?: string;
}

export interface IndexGroup {
  letter: string;
  items: Array<{
    title: string;
    chapterNumber: number;
    partNumber: number;
    section?: string;
  }>;
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
      ['Iron Decon / Fallout Remover', 'RTU (1:0)', '32.0 oz', '0.0 oz', 'Paint decontamination, brake dust release'],
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

// Rich operational expansions for complex or thin topics (using authentic in-app logic)
export const EXPANDED_CHAPTERS: Record<string, string[]> = {
  'availability-manager': [
    '**Multi-Tier Hybrid Architecture**: The Prime Availability Engine coordinates three distinct operational layers to ensure absolute scheduling precision, zero double-bookings, and uninterrupted field technician productivity.',
    '',
    '📅 **Layer 1: Real-Time Google Calendar Synchronization**',
    '• **Bidirectional Handshake**: The system continuously queries Google Calendar via secure OAuth 2.0 endpoints and token-based FreeBusy API queries.',
    '• **Personal Event Masking**: Any personal, medical, or administrative event created on a manager\'s personal Google Calendar (e.g., "Doctor Appointment" or "Lunch Meeting") is recognized and converted into an automated blackout block on the customer booking portal.',
    '• **Privacy Preservation**: The customer-facing website never sees the title, description, or guests of personal calendar events; it simply renders the affected time window as "Unavailable".',
    '',
    '🔒 **Layer 2: Administrative Manual Overrides & Time Painting**',
    '• **Direct Time Painting**: The Availability Manager interface allows dispatchers to click and drag across any date or hour column to paint instant blocks.',
    '• **Granular Block Types**: Supports custom tagging for shop equipment maintenance, mobile rig detailing service, severe weather stand-downs, and bay renovations.',
    '• **CRM Override Privilege**: While manual blocks immediately prevent online public customers from booking that slot, authorized administrators retain the ability to schedule emergency or VIP appointments directly inside the Bookings CRM.',
    '',
    '🔄 **Layer 3: Recurring Rules, Holidays & Weekly Cadence**',
    '• **Shop Closure Defaults**: Pre-configure standard non-operational days (e.g., closed Sundays or half-day Mondays) to automatically protect weekends without daily manual entry.',
    '• **Federal & Custom Holidays**: Built-in holiday schedules (Christmas Day, Thanksgiving, New Year\'s Day, Memorial Day) ensure bays remain locked off.',
    '• **Buffer Windows & Transit Allowances**: Configurable 30-minute to 60-minute travel and cleanup buffers between bookings to accommodate mobile rig relocation and bay sanitation.',
    '',
    '⚙️ **Capacity & Multi-Bay Concurrency**',
    '• **Slot Density**: Define how many vehicles can be serviced simultaneously during a given time block based on active technician staffing and physical bay capacity.',
    '• **Minimum Lead Time**: Enforce mandatory advance notice rules (default: 24 hours) preventing customers from scheduling "surprise" same-day services without prior dispatcher review.',
    '',
    '💡 **Troubleshooting & Health Diagnostics**: The real-time connection badge in the calendar header displays current sync health (Green = Live Sync Active, Amber = Token Refresh Pending, Red = Re-authentication Required). Clicking "Force Refresh" instantly re-queries Google FreeBusy endpoints.',
  ],

  'chemical-decision-system': [
    '**The Prime Chemical Diagnostic Protocol**: Automotive surface care requires strict chemical compatibility. Using the wrong pH or surfactant chemistry on sensitive substrates can cause permanent clear coat etching, leather drying, or plastic discoloration. This system enforces a rigorous 4-stage decision tree.',
    '',
    '🔬 **Phase 1: Substrate & Clear Coat Identification**',
    '• **Modern Clear Coats**: Factory finishes have varying hardness levels (e.g., German ceramic clears vs. softer Japanese clear coats). Soft clears scratch easily during mechanical agitation and require high-lubricity pre-washes.',
    '• **Specialty Surfaces**: Matte/satin paint and vinyl wraps strictly prohibit gloss-enhancing polymers, carnuba waxes, or abrasive compounds. Anodized aluminum trim and unlacquered polished metals require neutral pH (6.5–7.5) to prevent cloudy chemical oxidation.',
    '• **Interior Substrates**: Semi-aniline and protected leather require non-alkaline, moisture-balanced cleaners (pH 7.0–8.0). Uncoated plastics require solvent-free cleaners to prevent surfactant leaching and chalky white residue.',
    '',
    '🧪 **Phase 2: Contamination Chemistry Classification**',
    '• **Organic Contaminants (Bugs, Bird Droppings, Tree Sap)**: Composed of acidic proteins and sticky resins. Treated using alkaline pre-washes (pH 10.0–11.5) that saponify fats and dissolve protein bonds before contact washing.',
    '• **Inorganic Mineral Deposits (Hard Water Spots, Calcium Carbonate, Road Salt)**: Alkaline cleaners cannot dissolve minerals. Requires acidic descaling washes (pH 2.0–3.5) with citric or sulfamic acids to chelate mineral deposits without harming clear coats.',
    '• **Petroleum & Bitumen Contaminants (Asphalt, Road Tar, Exhaust Soot)**: Hydrophobic petroleum binds tightly to paint. Requires d-limonene citrus solvents or specialized hydrocarbon tar removers to break molecular bitumen bonds.',
    '• **Ferrous Iron Fallout (Brake Dust, Industrial Rail Dust)**: Microscopic metallic particles embedded in the clear coat. Requires sodium thioglycolate neutralizers that chemically react with iron particles, turning purple as they dissolve the fallout into water-soluble complexes.',
    '',
    '📦 **Phase 3: Inventory Matching & Dynamic Dilution Curve**',
    '• **Automated Stock Scanning**: The Decision Engine automatically cross-references diagnosed contamination against your active on-hand shop inventory cards.',
    '• **Severity Curves**: Select Light, Moderate, or Severe soil levels. The system dynamically computes the required dilution ratio (e.g., Light = 1:20, Moderate = 1:10, Severe = 1:4) and calculates the exact fluid ounces needed for your target bottle volume.',
    '',
    '🛡️ **Phase 4: Dwell Time, Agitation & Rinse Protocols**',
    '• **Dwell Limits**: Chemical dwell time must never exceed 3–5 minutes on exterior panels, and chemicals must never be allowed to dry in direct sunlight.',
    '• **Mechanical Agitation Rules**: Always utilize ultra-soft boar\'s hair or synthetic flag-tipped brushes for emblem crevicing, and dual-bucket micro-chenille wash mitts for panel contact.',
    '• **Mandatory PPE**: Technicians must wear nitrile gloves (minimum 5-mil thickness) and ANSI Z87.1 splash-rated eye protection whenever measuring or dispensing chemical concentrates.',
  ],

  'logic-inspector': [
    '**Algorithmic Transparency Engine**: The Smart Mission Logic Inspector eliminates "black-box" mystery from customer outreach. Rather than relying on static calendar alerts, the retention engine executes a continuous predictive model evaluating customer lifetime value, days since service, and quote age.',
    '',
    '🎯 **The Mathematical Decision Tree**',
    '• **Maintenance Window (Due Soon)**: Triggered when `daysRemaining` falls between 0 and +14 days. Suggests a friendly preventative maintenance reminder.',
    '• **Action Required (Moderately Overdue)**: Triggered when `daysRemaining < -30 days`. Indicates a high-priority risk of losing the customer to a competitor. Recommended action: Direct phone call or personalized SMS.',
    '• **Reactivation Campaign (Lost Client Recovery)**: Triggered when `daysRemaining < -90 days`. The client has crossed the critical churn threshold. System generates a reactivation offer or promotional discount to recapture the account.',
    '• **Quote Recovery (Lead Nurturing)**: Evaluates prospect records created between 1 and 30 days ago with zero recorded bookings. If lead age is <= 7 days, priority is flagged as High/Urgent.',
    '',
    '🔍 **The Inspector Drawer HUD**',
    '• **Header Status Counters**: Displays real-time counts of Total Active Missions, Action Required emergencies, Lead Recoveries pending, and Reactivations.',
    '• **Underlying Metric Feed**: Clicking the "Logic Inspector" button in the Retention Hub opens the system breakdown for each customer card, showing: exact days overdue, previous package tier, total vehicle count, and the exact code rule that triggered the mission.',
    '• **Priority Ribbon Coding**: Red ribbons signify Urgent Action Required (< -30 days), Amber indicates Reactivations (< -90 days), and Blue indicates Standard Maintenance.',
    '',
    '⚡ **Direct Operator Action Controls**',
    '• **Launch Action**: Opens the contextual email or SMS composer pre-populated with tailored message copy matching the customer\'s specific trigger reason.',
    '• **Unified Timeline**: Opens the complete historical customer ledger, displaying every quote, appointment, vehicle service record, and communication timestamp in chronological sequence.',
    '• **Dismiss / Done**: Clears the active mission upon successful contact and updates the CRM audit log.',
  ],

  'package-selection': [
    '**Strategic Package Architecture**: The Package Comparison Tool provides a structured, side-by-side presentation of detailing tiers to eliminate price shopping and highlight value.',
    '',
    '💎 **Tier 1: Express Clean & Protect**',
    '• **Target Customer**: Regular maintenance clients or fleet vehicles needing rapid turnaround.',
    '• **Scope**: 100% hand wash, bug removal, wheel and wheel-well cleaning, tire dressing, interior vacuum, wipe-down of dash and console, interior/exterior streak-free glass.',
    '• **Duration & Pricing Baseline**: 1.5 to 2.0 hours. Baseline price: $129 (Coupe) to $179 (Full-Size Truck).',
    '',
    '🛡️ **Tier 2: Interior Deep Sanctuary**',
    '• **Target Customer**: Vehicles with heavy family use, pet hair, spilled beverages, or stained fabric/leather.',
    '• **Scope**: High-temperature steam cleaning and sanitization of vents, cup holders, and crevices; hot-water extraction of floor carpets and cloth upholstery; deep leather scrub and conditioning; headliner spot treatment; UV protection on all dash and vinyl surfaces.',
    '• **Duration & Pricing Baseline**: 2.5 to 3.5 hours. Baseline price: $199 (Coupe) to $269 (Full-Size Truck).',
    '',
    '✨ **Tier 3: Exterior Precision Gloss**',
    '• **Target Customer**: Enthusiasts wanting maximum exterior gloss, road grime removal, and long-term surface protection.',
    '• **Scope**: Dual-stage foam pre-soak, 2-bucket hand wash, chemical iron decontamination, synthetic clay bar mechanical paint decontamination, single-stage machine gloss enhancement polish, 6-month ceramic spray sealant, wheel ceramic seal.',
    '• **Duration & Pricing Baseline**: 2.0 to 3.0 hours. Baseline price: $189 (Coupe) to $259 (Full-Size Truck).',
    '',
    '🏆 **Tier 4: Full Prime Essential**',
    '• **Target Customer**: Complete bumper-to-bumper transformation combining both interior sanctuary and exterior precision gloss.',
    '• **Scope**: Comprehensive interior deep clean plus complete exterior paint decon and gloss protection.',
    '• **Duration & Pricing Baseline**: 4.0 to 5.5 hours. Baseline price: $329 (Coupe) to $429 (Full-Size Truck).',
    '',
    '👑 **Tier 5: Signature Ceramic Coating Master**',
    '• **Target Customer**: New vehicle owners, luxury vehicles, or clients wanting multi-year paint preservation.',
    '• **Scope**: Multi-stage paint correction removing 85%+ of swirl marks, followed by professional 9H ceramic coating (3-year or 5-year warranty) applied to clear coat, glass, trim, and wheel faces.',
    '• **Duration & Pricing Baseline**: 6.0 to 8.0 hours. Baseline price: $649 (Coupe) to $849+ (Full-Size Truck/SUV).',
    '',
    '💡 **In-Person Upselling Psychology**: Use the tool directly on a mobile tablet during intake. Showing the customer that the step between Express and Essential includes deep steam and clay decon makes the higher tier an effortless upgrade choice.',
  ],

  'master-ratio': [
    '**The Prime Dilution Mathematics**: In commercial detailing operations, chemical concentrate misuse is the #1 cause of profit leakage and surface damage. The Master Ratio system establishes an unalterable formula for calculating dilution ratios across any bottle size.',
    '',
    '📐 **The Universal Formula**',
    'When diluting a chemical expressed as **1:X** (e.g., 1:10), the total number of parts is always **(1 + X)**.',
    '• **Concentrate Volume (oz)** = `Total Container Ounces / (Ratio + 1)`',
    '• **Water Volume (oz)** = `Total Container Ounces - Concentrate Volume`',
    '',
    '📊 **Standard Container Output Reference (32 oz Bottle)**',
    '• **1:1 Ratio (1 part chemical, 1 part water)**: 16.0 oz Chemical + 16.0 oz Water',
    '• **1:4 Ratio (Heavy Duty / Degreasing)**: 6.4 oz Chemical + 25.6 oz Water',
    '• **1:10 Ratio (Medium Duty / All-Purpose)**: 2.9 oz Chemical + 29.1 oz Water',
    '• **1:16 Ratio (Light Interior / Cockpit)**: 1.9 oz Chemical + 30.1 oz Water',
    '• **1:20 Ratio (Delicate Leather / Fabric)**: 1.5 oz Chemical + 30.5 oz Water',
    '• **1:64 Ratio (Clay Lube / Rinseless)**: 0.5 oz Chemical + 31.5 oz Water',
    '',
    '💧 **The Golden Rule: Pour Water First!**',
    'Always fill the bottle with cold water up to the designated water line before adding chemical concentrate. Adding chemical concentrate first causes violent foaming when water is injected, creating artificial volume displacement, inaccurate dilution ratios, and wasted product.',
    '',
    '🔒 **Quality Assurance & Safety**: Technicians must verify bottle labeling matches OSHA GHS standards with secondary container labels displaying product name, target dilution ratio, date filled, and primary hazard warnings.',
  ],

  'iac-guide': [
    '**Standard Operating Procedure: Inventory Auditing**: The Inventory Audit Checklist (IAC) is Prime Auto Detail\'s standard physical count and variance reconciliation protocol performed bi-weekly or at monthly accounting close.',
    '',
    '📋 **1. Physical Stock Verification Protocol**',
    '• **Bulk Jugs & Concentrates (Gallons / Pails)**: Weigh or visually inspect remaining gallon containers. For opaque jugs, use calibrated tare scales or backlight illumination to verify precise gallon fractions (0.25, 0.50, 0.75 gal).',
    '• **Ready-to-Use Spray Bottles (16oz / 32oz)**: Account for active mobile caddy bottles. Any bottle with >= 50% fluid is tallied as active inventory.',
    '• **Consumables & Towels**: Audit microfiber inventory separated by grade (Grade A Paint towels, Grade B Interior towels, Grade C Wheel/Engine towels) and retire stained towels to Grade C.',
    '',
    '⚖️ **2. Variance Thresholds & Discrepancy Reconciliation**',
    '• **Acceptable Shrinkage Threshold**: Chemical usage variance within +/- 5% of calculated job consumption is within acceptable operational tolerance.',
    '• **Excessive Variance Investigation**: Any product showing > 10% discrepancy between logged usage and physical shelf count triggers an immediate internal audit to rule out dispensing leaks, unlogged technician jobs, or faulty dilution dispensing valves.',
    '',
    '💾 **3. System Revaluation & Cost Basis Updates**',
    '• Upon completing the physical audit, enter verified counts directly into the Inventory Control modal. The system automatically recalculates total asset value on hand and adjusts COGS (Cost of Goods Sold) for accurate profit reporting.',
  ],

  'prospect-vs-customer': [
    '**Lifecycle Architecture: Prospects vs. Customers**: To maintain spotless database integrity, Prime Auto Detail strictly isolates prospective leads from confirmed paying clients.',
    '',
    '🌱 **Prospects: The Inbound Lead Pipeline**',
    '• **Source Origins**: Generated from website quote forms, Yelp/Google messaging, inbound telephone inquiries, or manual intake entries.',
    '• **Entity Characteristics**: Prospects possess contact information (Name, Email, Phone) and requested vehicle/service details, but have **zero recorded completed jobs or paid invoices**.',
    '• **Nurturing Lifecycle**: Managed within the Prospects workspace and tracked by the Smart Mission Workflow for timed follow-ups (Days 1–7 = High Urgency, Days 8–30 = Standard Nurturing).',
    '',
    '🚗 **Customers: Active Lifetime Accounts**',
    '• **Conversion Milestone**: A prospect automatically transitions to "Customer" status the instant their first appointment is confirmed in the Bookings CRM.',
    '• **Data Inheritance**: Upon graduation, all previous vehicle records, communication notes, quote history, and intake photos permanently bind to the new Customer Master Profile.',
    '• **Retention & Garage Integration**: Customers gain full access to the Garage management module, service maintenance cycle tracking, and historical invoice ledgers.',
    '',
    '🛡️ **Duplicate Prevention Rule**: Never create a new customer profile when an active prospect record exists for that individual. Instead, locate the prospect and click "Convert to Customer / Book Appointment" to prevent split customer history.',
  ],

  'hosted-estimate-portal': [
    '**The Frictionless Client Acceptance Portal**: The Hosted Estimate Portal transforms static quote delivery into an interactive, digital closing experience designed to maximize close rates without client login friction.',
    '',
    '🌐 **Cryptographic Token Security Model**',
    '• **No Password Required**: Each estimate generates a secure, collision-resistant UUID URL (e.g., `primeautodetail.com/estimate/a1b2c3d4-e5f6...`).',
    '• **Encrypted Access**: Customers click directly from email or SMS without creating an account or remembering login credentials, removing all barrier to entry.',
    '',
    '📝 **The 3-Step Customer Approval Flow**',
    '• **1. Service & Pricing Review**: The customer views an interactive, branded breakdown of their requested package, add-ons, and pricing summary with tax transparency.',
    '• **2. Mandatory Pre-Service Condition Disclosure**: Before accepting, the customer must review and toggle acknowledgments regarding personal belongings removal, pre-existing paint condition, rock chips, and ceramic coating cure windows.',
    '• **3. Digital Signature Sign-Off**: The customer executes their digital signature on screen, validating acceptance of terms and legal authorization to service the vehicle.',
    '',
    '⚡ **Real-Time CRM Synchronization**',
    '• Instantly flips the estimate status from "Sent" to "Accepted" in the Estimates dashboard.',
    '• Sends immediate push alerts to the shop administrator and auto-generates the confirmed appointment on the Bookings calendar.',
  ],

  'hosted-invoice-portal': [
    '**Rapid Frictionless Payment Settlement**: The Hosted Invoice Payment Portal allows customers to settle detailing balances instantly from their smartphone, tablet, or desktop computer.',
    '',
    '💳 **Multi-Channel Payment Processing**',
    '• **Stripe Integration**: Secure SSL-encrypted credit card processing supporting Visa, MasterCard, American Express, Apple Pay, and Google Pay.',
    '• **Tip Addition Interface**: Built-in gratuity selectors (15%, 20%, 25%, or custom dollar amount) allow satisfied customers to easily tip detailing technicians.',
    '• **Zero Convenience Surcharge**: Transparent line-item ledger showing exact service subtotal, state sales tax, applied promo discounts, and balance due.',
    '',
    '🧾 **Instant Digital Receipting & Financial Reconciliation**',
    '• **Automated Paid Status**: Upon successful charge authorization, the invoice status changes in real time to "Paid" in the Accounting ledger.',
    '• **Digital PDF Receipt**: Automatically dispatches a formal tax receipt to the client\'s verified email address with detailed line items and payment authorization codes.',
    '• **Revenue Allocation**: Automatically credits the job revenue to the assigned technician\'s payroll profile for commission and bonus tracking.',
  ],

  'smart-sync-duplicates': [
    '**Database Integrity & Deep Merge Protocol**: Over time, repeat customers may enter different phone formats, alternate email addresses, or typos when booking online. The Smart Sync engine reconciles duplicate entities without data loss.',
    '',
    '🔍 **Detection Algorithms & Matching Rules**',
    '• **E.164 Phone Normalization**: Strips all dashes, spaces, and parentheses to compare raw 10-digit phone strings.',
    '• **Case-Insensitive Email Matching**: Trims whitespace and normalizes email strings to lowercase.',
    '• **Fuzzy Name Matching**: Detects matching first and last names with minor spelling discrepancies.',
    '',
    '🧬 **The Deep Merge Hierarchy**',
    'When duplicates are resolved, Smart Sync preserves all historical records:',
    '• **Vehicles**: Merges all registered garage vehicles under the master customer ID.',
    '• **Service History**: Consolidates all past bookings, checklists, and technician notes.',
    '• **Financials**: Unifies invoice histories, outstanding balances, and payment records.',
    '• **Communications**: Combines email logs, timeline events, and outreach history into a single continuous ledger.',
    '',
    '🛡️ **Safe Pruning**: The orphaned duplicate profile is safely retired only after all relational database keys are successfully transferred to the master account.',
  ],

  'mobile-setup-f150': [
    '**Mobile Command Center: F150 Rig Architecture**: Operating a high-performance mobile detailing unit requires strict equipment staging, weight distribution, and utility management.',
    '',
    '⚖️ **Payload Weight & Balance Management**',
    '• **Water Weight Calculation**: Water weighs 8.34 lbs per gallon. A full 50-gallon tank adds 417 lbs directly over the rear axle. Tanks must be baffled and anchored with heavy-duty ratchet straps to prevent dynamic load shifting.',
    '• **Equipment Placement**: Mount the commercial pressure washer and 3,500W generator/inverter on opposite sides of the truck bed to maintain lateral balance.',
    '• **Payload Limits**: Always keep total mobile payload (water, generator, pressure washer, extractors, chemicals, tools) below the vehicle\'s GVWR (Gross Vehicle Weight Rating).',
    '',
    '🔌 **Power & Water Supply Protocols**',
    '• **Generator Operation**: Run 120V commercial generators only in open-air environments with exhaust routed away from vehicle intake vents and client homes.',
    '• **Water Filtration (TDS Standards)**: Onboard deionizing (DI) resin filters must produce water with Total Dissolved Solids (TDS) under 50 ppm (optimal: 0–10 ppm) to ensure 100% spot-free drying in direct sunlight.',
    '',
    '❄️ **Winterization Emergency Stand-Down**',
    '• **Freezing Temperatures (< 32°F)**: Water remaining in pressure washer pumps, hoses, or chemical lines will expand and crack internal brass manifolds. In winter months, pump non-toxic RV antifreeze through pumps and reels, or dock the mobile unit inside a climate-controlled bay overnight.',
  ],

  'break-even-analysis': [
    '**Financial Viability & Unit Economics**: The Break-Even Analysis engine computes the exact number of jobs and revenue dollars required to cover total operational expenses before achieving net profit.',
    '',
    '📊 **The Core Financial Equation**',
    '• **Break-Even Revenue ($)** = `Fixed Overhead Costs / Gross Contribution Margin %`',
    '• **Break-Even Job Volume** = `Fixed Overhead Costs / (Average Job Revenue - Variable Cost Per Job)`',
    '',
    '🏢 **Fixed Overhead vs. Variable Cost Allocation**',
    '• **Fixed Costs**: Facility rent, vehicle leases, insurance premiums, software subscriptions, base marketing budgets, and equipment depreciation (expenses incurred regardless of job volume).',
    '• **Variable Costs**: Chemical consumption ($5–$12/job), gas/mileage allowances ($0.67/mile), disposable towels, machine pads, and hourly/commission labor.',
    '',
    '🎯 **Target Contribution Margin: 80%+**',
    'A healthy automotive detailing business targets a minimum contribution margin of 75%–85%. If variable costs creep above 25%, review chemical dilution discipline and technician labor efficiency immediately.',
    '',
    '💡 **The "Days to Black" Benchmark**: In the financial dashboard, track the day of the month when cumulative revenue exceeds monthly fixed costs. High-performing shops reach the "Black" by the 10th to 14th day of each month, leaving the remaining 16+ days as pure operating profit.',
  ],
};

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Caddy Worksheet',
    category: 'Operations',
    definition: 'Standardized organizational matrix defining the 6 core spray bottles, chemical dilutions, and trigger types carried in mobile technician detailing caddies.',
    relatedChapterId: 'caddy-worksheet',
  },
  {
    term: 'Chemical Decision System',
    category: 'Chemicals',
    definition: 'Multi-phase diagnostic protocol identifying surface substrate, contaminant chemistry (organic, mineral, petroleum, ferrous), and prescribing optimal chemical matches.',
    relatedChapterId: 'chemical-decision-system',
  },
  {
    term: 'Dilution Ratio (1:X)',
    category: 'Chemicals',
    definition: 'Standard volumetric ratio where 1 part chemical concentrate is blended with X parts water. Total parts in calculation equal (1 + X).',
    relatedChapterId: 'dilution-chart-reference',
  },
  {
    term: 'Elite Story Master',
    category: 'Marketing',
    definition: 'Visual showcase management tool sequencing before-and-after vehicle transformation photo galleries for public marketing.',
    relatedChapterId: 'story-master',
  },
  {
    term: 'F150 Command Center',
    category: 'Fleet & Rig',
    definition: 'Specialized mobile detailing truck configuration interface managing water tank weight distribution, generator capacity, chemical load, and winterization.',
    relatedChapterId: 'mobile-setup-f150',
  },
  {
    term: 'Hosted Acceptance Portal',
    category: 'CRM & Sales',
    definition: 'Tokenized client-facing web page allowing customers to review, customize add-ons, and digitally sign off on estimates without password authentication.',
    relatedChapterId: 'hosted-estimate-portal',
  },
  {
    term: 'Hosted Payment Portal',
    category: 'Financials',
    definition: 'Secure client-facing web portal for invoice payment settlement via credit card, Apple Pay, Google Pay, or digital bank transfer.',
    relatedChapterId: 'hosted-invoice-portal',
  },
  {
    term: 'Hybrid Availability',
    category: 'Scheduling',
    definition: 'Multi-layer scheduling engine combining real-time Google Calendar sync, recurring shop holiday/closure rules, and admin manual time blocks.',
    relatedChapterId: 'availability-manager',
  },
  {
    term: 'IAC (Inventory Audit Checklist)',
    category: 'Inventory',
    definition: 'Systematic physical count and variance reconciliation protocol performed bi-weekly to verify on-hand chemical concentrates, tools, and consumables.',
    relatedChapterId: 'iac-guide',
  },
  {
    term: 'Logic Inspector',
    category: 'Retention',
    definition: 'Transparency tool inside the Retention Hub that displays the underlying mathematical rules, timestamps, and decay formulas used to flag customer follow-ups.',
    relatedChapterId: 'logic-inspector',
  },
  {
    term: 'Master Operations Flow',
    category: 'Operations',
    definition: 'Standardized six-phase detailing procedure governing customer intake, booking commitment, rig prep, job execution, billing, and retention.',
    relatedChapterId: 'operations-flow',
  },
  {
    term: 'Master Ratio',
    category: 'Chemicals',
    definition: 'Single source of truth dilution formula calculating precise chemical concentrate versus water volume based on container ounces.',
    relatedChapterId: 'master-ratio',
  },
  {
    term: 'Quick Pay',
    category: 'Financials',
    definition: 'Rapid point-of-sale interface enabling instant credit card, cash, or mobile checkout at vehicle delivery.',
    relatedChapterId: 'quick-pay',
  },
  {
    term: 'RB Test',
    category: 'System & Admin',
    definition: 'Designated administrative sandbox user profile utilized for non-destructive system verification, live feature testing, and validation without impacting customer data.',
    relatedChapterId: 'test-customer-workflow',
  },
  {
    term: 'Service Checklist',
    category: 'Operations',
    definition: 'Mobile-optimized digital workflow guiding technicians through mandatory step-by-step vehicle inspection, execution, and chemical logging.',
    relatedChapterId: 'service-checklist',
  },
  {
    term: 'Smart Mission Logic',
    category: 'Retention',
    definition: 'Predictive algorithm calculating customer follow-up trigger milestones based on elapsed days since service, vehicle wear cycles, and previous spend.',
    relatedChapterId: 'smart-mission-logic',
  },
  {
    term: 'Smart Sync',
    category: 'CRM & Admin',
    definition: 'Automated deduplication utility that normalizes phone numbers and emails to merge duplicate customer records while preserving complete historical ledgers.',
    relatedChapterId: 'smart-sync-duplicates',
  },
  {
    term: 'Temporal Scan',
    category: 'Reporting',
    definition: 'Dynamic date filtering system allowing multi-range financial reporting across daily, weekly, monthly, quarterly, and custom fiscal windows.',
    relatedChapterId: 'temporal-scan',
  },
];

// Explicit Part Category Assignments
const PART_TOPIC_MAPPINGS: Record<number, string[]> = {
  1: [
    'operations-flow',
    'booking-flow',
    'intake-workflows',
    'customer-lifecycle',
    'prospect-vs-customer',
    'retention-hub',
    'smart-mission-logic',
    'logic-inspector',
    'test-customer-workflow',
    'deleting-records',
    'client-experience-preview',
    'customer-management-booking-flow',
    'testimonials-management',
  ],
  2: [
    'customer-database',
    'customer-profiles-history',
    'prospect-lead-management',
    'garage-management',
    'multi-vehicle-bookings',
    'vehicle-type-management',
    'vehicle-classification',
    'availability-manager',
    'booking-appointment-manager',
    'booking-test-mode',
    'quotes-estimates',
    'hosted-estimate-portal',
    'service-checklist',
    'checklist-tools-guide',
    'checklist-final-steps',
    'client-evaluation',
    'shop-tasks-reminders',
    'upsell-scripts',
  ],
  3: [
    'service-package-pricing',
    'package-pricing',
    'package-selection',
    'service-disclaimers',
    'invoicing-payments',
    'hosted-invoice-portal',
    'quick-pay',
    'business-accounting',
    'time-profitability-dashboard',
    'net-profit-valuation',
    'break-even-analysis',
    'financial-summary-valuation',
    'tax-preparation',
    'tax-sales-summary',
    'full-accounting-report',
    'discount-coupons',
    'promo-codes-marketing',
    'jobs-completed',
  ],
  4: [
    'master-ratio',
    'chemical-masterclass',
    'chemical-decision-system',
    'dilution-chart-reference',
    'interactive-dilution-manager',
    'chemical-cards-kb',
    'chemical-knowledge-cards',
    'chemical-description-tips',
    'chemical-documentation-v3',
    'chemical-workflow',
    'ai-chemical-assistant',
    'checklist-chemical-management',
    'chemical-inventory-modal',
    'master-inventory-control',
    'inventory-control',
    'inventory-audit-checklist',
    'iac-guide',
    'caddy-worksheet',
    'chemical-label-maker',
    'materials-equipment-usage-log',
    'materials-usage-report',
    'inventory-value-reports',
    'chemical-ratio-modal',
  ],
  5: [
    'mobile-setup-f150',
    'mobile-unit-configuration',
    'vendor-supplier-management',
    'mileage-tracker',
    'photo-media-system',
    'media-library',
    'contact-form-photos',
    'business-card-qr-generator',
    'business-drive-files',
    'business-launch-manager',
    'winter-seasonal-closures',
    'phone-assistant-utility',
  ],
  6: [
    'employee-training-hub',
    'training-exams',
    'technician-certification',
    'detailing-learning-library',
    'new-employee-orientation',
    'cheat-sheet-exam-control',
    'company-employees',
    'staff-profiles-compensation',
    'compensation-calculator',
    'employee-payroll',
    'staff-scheduling-shifts',
    'secure-team-communication',
    'technician-performance-analytics',
    'guided-training-demo',
    'rick-tips-admin-controls',
    'users-roles',
    'user-management-tips',
    'users-permissions',
  ],
  7: [
    'website-administration',
    'website-content-management',
    'home-page-content',
    'about-page-content',
    'faqs-management',
    'contact-control',
    'footer-content',
    'main-menu-header-control',
    'blog-management',
    'story-master',
    'menu-visibility-controls',
    'main-menu-help',
    'understanding-links-vs-cards',
    'personal-notes-journal',
    'sticky-notes',
    'website',
    'settings-quick-access',
    'add-customer-quick',
    'user-management',
    'settings',
  ],
  8: [
    'master-settings',
    'admin-dashboard',
    'shop-setup-config',
    'my-profile-notifications',
    'alerts-notifications',
    'real-time-alerts',
    'smart-sync-duplicates',
    'reports-analytics-hub',
    'reports-masterclass',
    'customer-data-reports',
    'invoice-payment-audits',
    'estimate-quote-performance',
    'booking-calendar-analytics',
    'temporal-scan',
    'intelligent-logic-grouping',
  ],
};

export const PART_DEFINITIONS = [
  {
    partNumber: 1,
    title: 'Master Operations & The Customer Journey',
    subtitle: 'End-to-End Detailing Lifecycle & Relationship Engineering',
    description: 'The definitive architectural walkthrough of client acquisition, intake workflows, transparent retention automation, data hygiene, and lifecycle management.',
  },
  {
    partNumber: 2,
    title: 'Core Customer, Garage & Appointment Architecture',
    subtitle: 'Data Records, Scheduling Matrices & Production Execution',
    description: 'Deep dives into customer master profiles, multi-vehicle garages, hybrid availability rules, estimate acceptance portals, and mobile field checklists.',
  },
  {
    partNumber: 3,
    title: 'Packages, Services & Financial Engineering',
    subtitle: 'Pricing Tiers, Invoicing Infrastructure & Business Health',
    description: 'Systematic breakdowns of service menu structures, time/profitability analytics, point-of-sale rapid checkout, tax ledgers, and break-even forecasting.',
  },
  {
    partNumber: 4,
    title: 'Chemical Mastery, Dilutions & Inventory Control',
    subtitle: 'Surface Science, Concentrates & Asset Accounting',
    description: 'Precision chemistry diagnosis, the universal dilution ratio formula, secondary container labeling, mobile caddy staging, and physical inventory auditing.',
  },
  {
    partNumber: 5,
    title: 'Fleet, Equipment & Mobile Command Operations',
    subtitle: 'F150 Rig Architecture, Logistics & Digital Assets',
    description: 'Engineering mobile detailing vehicles, payload distribution, water filtration standards, mileage tracking, winterization, and media drive asset management.',
  },
  {
    partNumber: 6,
    title: 'Human Resources, Compensation & Training Academy',
    subtitle: 'Staff Development, Certification & Performance Analytics',
    description: 'Standard operating procedures for hiring, onboarding exams, technician certification, performance tracking, payroll formulas, and team communication.',
  },
  {
    partNumber: 7,
    title: 'Digital Presence, Marketing & Web Administration',
    subtitle: 'Customer Portals, CMS Controls & Brand Presentation',
    description: 'Managing public-facing website copy, interactive comparison sliders, promotional discounts, testimonials, transformations, and SEO metadata.',
  },
  {
    partNumber: 8,
    title: 'Enterprise Settings, System Audits & Security Controls',
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
        const resolvedContent = EXPANDED_CHAPTERS[topic.id] || topic.content || [];
        partChapters.push({
          id: topic.id,
          chapterNumber: globalChapterCounter++,
          title: topic.title,
          summary: topic.summary,
          content: resolvedContent,
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
      const resolvedContent = EXPANDED_CHAPTERS[topic.id] || topic.content || [];
      part.chapters.push({
        id: topic.id,
        chapterNumber: globalChapterCounter++,
        title: topic.title,
        summary: topic.summary,
        content: resolvedContent,
        route: topic.route,
        section: topic.section,
        customTable: REFERENCE_TABLES[topic.id],
      });
    }
  }

  return parts;
}

export function getGlossaryTerms(): GlossaryTerm[] {
  return [...GLOSSARY_TERMS].sort((a, b) => a.term.localeCompare(b.term));
}

export function getIndexGroups(parts: ManualPart[]): IndexGroup[] {
  const allChapters = parts.flatMap(p => 
    p.chapters.map(c => ({
      title: c.title,
      chapterNumber: c.chapterNumber,
      partNumber: p.partNumber,
      section: c.section,
    }))
  );

  // Group by first letter
  const groupsMap = new Map<string, Array<{ title: string; chapterNumber: number; partNumber: number; section?: string }>>();

  for (const item of allChapters) {
    const firstChar = item.title.trim()[0]?.toUpperCase() || '#';
    const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
    if (!groupsMap.has(letter)) {
      groupsMap.set(letter, []);
    }
    groupsMap.get(letter)!.push(item);
  }

  const sortedLetters = Array.from(groupsMap.keys()).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });

  return sortedLetters.map(letter => ({
    letter,
    items: groupsMap.get(letter)!.sort((a, b) => a.title.localeCompare(b.title)),
  }));
}

export function getManualStats() {
  const parts = compileManualContent();
  const totalChapters = parts.reduce((acc, p) => acc + p.chapters.length, 0);
  let totalWordCount = 0;

  for (const part of parts) {
    for (const ch of part.chapters) {
      totalWordCount += ch.title.split(/\s+/).filter(Boolean).length;
      totalWordCount += ch.summary.split(/\s+/).filter(Boolean).length;
      for (const line of ch.content) {
        totalWordCount += line.split(/\s+/).filter(Boolean).length;
      }
    }
  }

  // Add glossary words
  for (const g of GLOSSARY_TERMS) {
    totalWordCount += g.term.split(/\s+/).filter(Boolean).length;
    totalWordCount += g.definition.split(/\s+/).filter(Boolean).length;
  }

  // An average print page contains ~300-380 words including headers, tables, and margins
  const estimatedPages = Math.round(totalWordCount / 340) + 14; // +14 for cover, copyright, intro, TOC, part dividers, glossary, index

  return {
    totalParts: parts.length,
    totalChapters,
    totalWordCount,
    estimatedPages,
  };
}
