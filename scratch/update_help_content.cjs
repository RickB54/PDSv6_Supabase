const fs = require('fs');
const path = 'src/components/help/helpData.ts';
let content = fs.readFileSync(path, 'utf8');

// Define the new topics
const newTopics = `
export const vehicleManagementTopic: HelpTopic = {
  id: 'vehicle-management',
  title: 'Garage & Vehicle Management',
  summary: 'Learn how to manage customer vehicles, edit details, and handle duplicates.',
  content: [
    '**The Customer Garage**: Every client profile includes a "Garage" that stores their specific vehicles. This allows for rapid re-booking and accurate pricing based on vehicle size.',
    '',
    '✏️ **1. Editing Vehicle Details**',
    'You can now modify any vehicle in a customer\\'s garage directly.',
    '• **The Pencil Icon**: Click the blue Pencil icon next to any vehicle in the Garage list. This will open the Customer Modal directly to the Profile tab where you can update the Year, Make, Model, Type, or Color.',
    '• **Immediate Sync**: Saving these changes updates the vehicle across the entire CRM, including any future service checklists.',
    '',
    '🗑️ **2. Deleting & Cleaning Up**',
    '• **Trash Icon**: Use the red Trash icon to remove a vehicle from a customer\\'s garage permanently. This is the best way to handle old vehicles they no longer own or incorrect entries.',
    '• **Safety**: Deleting a vehicle from the garage does NOT delete past service history, but it will remove it as an option for new bookings.',
    '',
    '🔄 **3. Handling Duplicates**',
    'The system now includes an **Automatic Deduplication Engine**. When you save a customer, it scans their vehicles and automatically merges entries that have the same Make, Model, and Year.',
    '• **Manual Cleanup**: If you still see two similar vehicles (e.g., "Ram 1500" and "2024 Ram 1500"), use the Pencil icon to ensure the details match perfectly, or delete the redundant one using the Trash icon.',
    '',
    '💡 **Pro Tip**: Always ensure the **Vehicle Type** (Compact, SUV, Truck) is set correctly. This is the "Master Switch" that controls your automated pricing for that vehicle.',
  ],
  section: 'system',
};

export const manualBookingFlowTopic: HelpTopic = {
  id: 'booking-flow',
  title: 'The Professional Booking Flow',
  summary: 'A step-by-step guide to manual entry and online booking management.',
  content: [
    '**Workflow Mastery**: To maintain professional records, always follow these steps when moving a client from an inquiry to a completed job.',
    '',
    '🌐 **STEP 1: THE ONLINE REQUEST (WEBSITE)**',
    'When a client books through your public website:',
    '1. **Alert**: You will receive a "New Online Booking" alert instantly.',
    '2. **Auto-Prospect**: The system automatically creates a **Prospect** profile and links the booking. The status will be **"Tentative"** (Yellow).',
    '3. **Review**: Open the alert. It will take you to the **Prospects** page. Review their request, vehicle, and notes.',
    '',
    '📞 **STEP 2: THE CONFIRMATION (MANUAL)**',
    '1. **Reach Out**: Call or text the client to confirm the details.',
    '2. **Update Status**: In the Prospects timeline, click the "Edit" pencil on the booking and change status to **"Confirmed"** (Green).',
    '3. **Promote**: Once they are a confirmed client, they are automatically treated as a full **Customer** in your database.',
    '',
    '📝 **STEP 3: MANUAL ENTRY (PHONE CALLS)**',
    'If someone calls you directly:',
    '1. **Start Search**: Go to the **Bookings** page and click "+".',
    '2. **Check CRM**: Type their name. If they are a past client, their info and "Garage" will pop up instantly.',
    '3. **New Client**: If they are new, fill in Name, Phone, and Email. This creates their CRM record on the fly.',
    '4. **Vehicle First**: Add the vehicle to their **Garage** first if possible, then select it for the booking. This ensures the price calculates correctly.',
    '',
    '🏁 **STEP 4: EXECUTION & COMPLETION**',
    '1. **Checklist**: On the day of service, click **"Start Service"** to begin the digital audit trail and job timer.',
    '2. **Photo Documentation**: Take "Before" and "After" photos directly in the checklist. These are saved to the client profile automatically.',
    '3. **Invoice**: Click "Finish Job". The system stops the timer and creates the invoice. Send the receipt via email with one click.',
  ],
  section: 'system',
};
`;

// Append the new topics to the end of the file (before the last array exports)
// Actually, let's find the place where HelpTopic[] is defined and add them there.

content = content.replace(/export const adminMenuTopics: HelpTopic\[\] = \[/, 
    `${newTopics}\nexport const adminMenuTopics: HelpTopic[] = [\n  vehicleManagementTopic,\n  manualBookingFlowTopic,`);

fs.writeFileSync(path, content);
console.log('helpData.ts updated with new topics.');
