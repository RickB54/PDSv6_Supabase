import fs from 'fs';
const file = 'src/components/help/helpData.ts';
let content = fs.readFileSync(file, 'utf8');

// Find the first service-checklist entry and replace it
const startMarker = "    id: 'service-checklist',\r\n    title: 'Professional Service Checklist',\r\n    summary: 'The \"Prime Standard\" SOP for executing a flawless step-by-step detailing job.',";
const endMarker = "    route: '/service-checklist',\r\n    section: 'menu',\r\n  },";

const startIdx = content.indexOf(startMarker);
if (startIdx === -1) { console.error('start marker not found'); process.exit(1); }
const endIdx = content.indexOf(endMarker, startIdx);
if (endIdx === -1) { console.error('end marker not found'); process.exit(1); }

const newEntry = `    id: 'service-checklist',
    title: 'Professional Service Checklist',
    summary: 'The "Prime Standard" SOP for executing a flawless step-by-step detailing job, with pre-vehicle inspection.',
    content: [
      '**The Prime Methodology**: This checklist ensures 100% consistency across every vehicle. Every technician must follow these exact steps from the moment the vehicle arrives until it is delivered.',
      '',
      '🔍 **1. Pre-Vehicle Inspection Checklist (NEW)**',
      '• **What it is**: A structured walkaround form completed BEFORE any service begins. It logs the vehicle\\'s condition at intake to protect the shop from liability.',
      '• **Exterior**: 11 checkable points — Paint/Clear Coat, Front/Rear Bumpers, Headlights, Windshield, Door Panels/Mirrors, Wheels, Tires, Wheel Wells, Taillights, Trunk/Tailgate.',
      '• **Interior**: 7 checkable points — Front/Rear Seats, Carpet/Mats, Dashboard/Console, Odor Check, Trunk/Cargo Area.',
      '• **Cost-Impact Flags**: 6 red-flagged checkboxes — Excessive Pet Hair, Heavy Mud/Dirt, Smoke Odor, Stains Requiring Extraction, Biohazard, Excessive Trash. Checking any triggers a surcharge alert.',
      '• **Ask The Customer**: 4 non-checkable reference questions to guide the intake conversation.',
      '• **Sign-off**: Customer name, Detailer name, and Date fields for digital intake sign-off.',
      '',
      '🏁 **2. Job Initialization & Timer**',
      '• **Customer Link**: Select the customer and vehicle. This pulls in their specific package and add-ons.',
      '• **Master Clock**: The job timer starts automatically when you check your first item.',
      '• **Prep Summary**: Click the "Prep" icon to see every chemical and tool needed for the selected services.',
      '',
      '⏱️ **3. Administrative Time Editing**',
      '• **Correcting Logs**: Admins can click the **Yellow Duration Badge** on any step to manually enter correct time in \`mm:ss\` format.',
      '',
      '🧴 **4. Execution & Chemical SOPs**',
      '• **Step-by-Step Flow**: Follow categories in order: Preparation → Exterior → Interior → Final Inspection.',
      '• **Instruction Guides**: Click the "Info" icon on any step to see the exact Prime Standard procedure.',
      '• **Material Tracking**: Log chemical "fractions" used during the job to keep master inventory accurate.',
      '',
      '⚙️ **5. Master SOP Architect (Admin Mode)**',
      '• **Permanent Standards**: Admins can add, remove, or rename steps globally via the gear icon.',
      '• **Global Update**: Saving changes updates the template for that specific package for all future jobs.',
      '',
      '🏆 **6. Finishing & Post-Payment Popup (NEW)**',
      '• **Finish & Complete**: Clicking "FINISH & COMPLETE JOB" stops the timer and shows a "Job & Payment Complete!" confirmation popup.',
      '• **Invoice Button**: The popup includes a direct "View Invoice" button to jump straight to the invoice.',
      '• **Mobile-Ready Payment**: Use "Collect Payment" for a fully responsive checkout optimized for smartphones and tablets.',
    ],
    route: '/service-checklist',
    section: 'menu',
  },`;

content = content.slice(0, startIdx) + newEntry + content.slice(endIdx + endMarker.length);
fs.writeFileSync(file, content);
console.log('Done! Replaced service-checklist help entry at index', startIdx);
