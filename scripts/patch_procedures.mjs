import fs from 'fs';
const file = 'src/pages/ProceduresBooklet.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `          {
            title: "1-Click Cascading Wipeout",
            content: "Surgically deletes test invoices, bookings, and customer records to restore true accounting totals.",
            icon: Zap
          }
        ]
      }
    ],
    proTips: [
      "Perform digital walkaround photo capture on every vehicle before water or chemicals touch the paint.",
      "Use the 1-Click Wipeout button immediately after finishing live test sessions to clean accounting ledgers."
    ],
    warnings: [
      "Skipping pre-service damage documentation leaves the shop liable for pre-existing scratches or curb rash.",
      "Test data temporarily increases accounting totals until the Wipe Test Data protocol is executed."
    ]
  }
];`;

const replacement = `          {
            title: "1-Click Cascading Wipeout",
            content: "Surgically deletes test invoices, bookings, and customer records to restore true accounting totals.",
            icon: Zap
          }
        ]
      },
      {
        title: "Pre-Vehicle Inspection Checklist (Prime Standard)",
        content: "The Pre-Vehicle Inspection Checklist is completed BEFORE any service begins. It establishes a documented record of the vehicle's condition at intake, protecting the shop from liability for pre-existing damage and ensuring transparent communication with the customer. The checklist is embedded in the Service Checklist page and auto-populates with the customer name, date, service, and vehicle year/make/model.",
        subsections: [
          {
            title: "11-Point Exterior Inspection",
            content: "Technician checks: Paint/Clear Coat, Front Bumper, Headlights/Foglights, Windshield, Door Panels/Mirrors, Wheels, Tires, Wheel Wells, Rear Bumper, Taillights, Trunk/Tailgate. Each item is individually checkable in green to confirm condition is logged.",
            icon: CheckCircle2
          },
          {
            title: "7-Point Interior Inspection",
            content: "Technician checks: Front Seats, Front Carpet/Floor Mats, Dashboard/Center Console, Odor Check, Rear Seats, Rear Carpet/Floor, Trunk/Cargo Area. Each item is individually checkable in blue.",
            icon: ClipboardList
          },
          {
            title: "6 Cost-Impact Flags",
            content: "Red-flagged checkboxes for conditions that warrant a surcharge: Excessive Pet Hair, Heavy Mud/Dirt Buildup, Smoke Odor, Stains Requiring Extraction, Biohazard/Bodily Fluid, Excessive Trash. Checking ANY of these triggers a red pulsing alert — a reminder to discuss an up-charge with the customer before starting.",
            icon: AlertTriangle
          },
          {
            title: "Ask The Customer — Intake Reference",
            content: "4 non-checkable intake questions displayed as a reference panel: (1) When was the vehicle last professionally detailed? (2) Are there specific problem areas to focus on? (3) Are pets or smokers regular passengers? (4) Are there fragile or valuable items in the vehicle?",
            icon: Info
          },
          {
            title: "Digital Sign-Off",
            content: "Three fields at the bottom of the form: Customer Signature, Detailer Signature, and Sign-off Date. This creates a mutual acknowledgment record of the vehicle's pre-service condition.",
            icon: CheckCircle2
          }
        ]
      }
    ],
    proTips: [
      "Perform digital walkaround photo capture on every vehicle before water or chemicals touch the paint.",
      "Use the 1-Click Wipeout button immediately after finishing live test sessions to clean accounting ledgers.",
      "Always check the Cost-Impact Flags section before quoting final pricing — catching Pet Hair or Biohazard conditions upfront prevents pricing disputes after the job."
    ],
    warnings: [
      "Skipping pre-service damage documentation leaves the shop liable for pre-existing scratches or curb rash.",
      "Test data temporarily increases accounting totals until the Wipe Test Data protocol is executed.",
      "A Cost-Impact Flag that is checked but NOT discussed with the customer before starting is a liability risk — always confirm any surcharges verbally and via the sign-off field."
    ]
  }
];`;

if (!content.includes(target)) {
  console.error('Target not found. First 300 chars near end:');
  console.error(content.slice(-800).slice(0, 300));
  process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Done! Updated ProceduresBooklet.tsx');
