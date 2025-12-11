export type HelpTopic = {
  id: string;
  title: string;
  summary: string;
  content: string[];
  blockable?: boolean; // If true, topic can be hidden from employees unless granted
  route?: string;
  section?: 'menu' | 'dashboard';
};

// Admin help split into full coverage of slide-out Menu and Admin Dashboard actions
export const adminMenuTopics: HelpTopic[] = [
  {
    id: 'admin-dashboard',
    title: 'Admin Dashboard',
    summary: 'Central control hub for alerts, jobs, KPIs, and quick admin actions.',
    content: [
      'Overview cards show unpaid invoices, inventory alerts, task updates, and file changes.',
      'Quick links provide access to Customer profiles, Invoicing, Accounting, Payroll, Inventory, File Manager, Reports, and more.',
      'Menu Visibility Controls allow hiding or showing dashboard tiles in the sidebar and menus.',
      'User Administration provides full user management: create, update, impersonate, and delete employees.',
      'Employee Management modal focuses on employee operations with search and edit capabilities.',
      'Website Administration integrates vehicle types, FAQs, contact info, and About sections management.',
    ],
    route: '/admin-dashboard',
    section: 'menu',
  },
  {
    id: 'customers',
    title: 'Customers',
    summary: 'Manage customer profiles, search, and related records.',
    content: [
      'Create and update customer profiles including contact details and service history.',
      'Search and link invoices and tasks to customers.',
      'Import and export customer data using provided tools.',
    ],
    route: '/search-customer',
    section: 'menu',
  },
  {
    id: 'invoicing',
    title: 'Invoicing',
    summary: 'Generate and manage invoices, review payment status.',
    content: [
      'Create invoices from jobs; edit line items and taxes.',
      'Track unpaid invoices and follow up via alerts or email.',
      'Export summaries for accounting and reporting needs.',
    ],
    route: '/invoicing',
    section: 'menu',
  },
  {
    id: 'accounting',
    title: 'Accounting',
    summary: 'View revenue reports and reconcile with completed jobs.',
    content: [
      'Review KPIs such as total revenue and job statuses.',
      'Generate period-based summaries for business insights.',
      'Integrate with invoicing data for consistency.',
    ],
    route: '/accounting',
    section: 'menu',
  },
  {
    id: 'payroll',
    title: 'Payroll',
    summary: 'Manage employee payouts, hours, and job-based compensation.',
    content: [
      'Record hours and track job completions that affect pay.',
      'Dismiss related alerts when records are reviewed.',
      'Export payroll summaries.',
    ],
    route: '/payroll',
    section: 'menu',
  },
  {
    id: 'inventory',
    title: 'Inventory Control',
    summary: 'Maintain supply levels, set thresholds, and track usage.',
    content: [
      'Monitor critical inventory counts and restock reminders in alerts.',
      'Update item details and categories with unified modals.',
      'Link inventory usage to jobs for accurate tracking.',
    ],
    route: '/inventory-control',
    section: 'menu',
  },
  {
    id: 'file-manager',
    title: 'File Manager',
    summary: 'Archive PDFs and documents like employee communications and certificates.',
    content: [
      'Save generated PDFs from Employee Contact and Certificates flows.',
      'Use alerts to track new files; dismiss when reviewed.',
      'Organize files by folder paths and metadata for quick retrieval.',
    ],
    route: '/file-manager',
    section: 'menu',
  },
  {
    id: 'tasks',
    title: 'Tasks (Todo)',
    summary: 'Plan work with multi-assignee tasks, comments, statuses, and read receipts.',
    content: [
      'Create tasks via quick add or detailed editor; set priority and due dates.',
      'Assign one or more employees; employees see only their assigned tasks.',
      'Use Kanban, List, or Calendar views and filters like Mine, Overdue, Today, Upcoming.',
      'Employees update status and post comments; admins get alerts on comments and completion.',
      'Read receipts capture who has viewed tasks and when.',
    ],
    route: '/tasks',
    section: 'menu',
  },
  {
    id: 'alerts',
    title: 'Alerts & Notifications',
    summary: 'System alerts for admins and employee notifications underpin proactive workflows.',
    content: [
      'Admin alerts include overdue tasks, todo updates and comments, and file manager events.',
      'Employee notifications deliver direct notice for new/updated task assignments.',
      'Notification Bell shows unread counts and provides quick navigation.',
    ],
    section: 'menu',
  },
  {
    id: 'employees',
    title: 'Company Employees',
    summary: 'Add and manage employees, roles, credentials, and impersonation for testing.',
    content: [
      'Create employees with name/email, edit details, and manage passwords.',
      'Impersonate employees to validate role-based views and flows.',
      'Delete employees with appropriate confirmations.',
    ],
    route: '/company-employees',
    section: 'menu',
  },
  {
    id: 'website-admin',
    title: 'Website Administration',
    summary: 'Manage website-facing content: vehicle types, FAQs, contact info, and About.',
    content: [
      'Edit vehicle type catalog including names, descriptions, and pricing flags.',
      'Maintain FAQ items with question and answer content.',
      'Update contact information for public site and customer communications.',
      'Add About sections to present the company coherently.',
    ],
    route: '/website-admin',
    section: 'menu',
  },
  {
    id: 'website',
    title: 'Website',
    summary: 'Open the public site to view packages, add-ons, and tools.',
    content: [
      'Use this entry to quickly access the public pricing and services pages.',
      'Helpful when discussing options live with customers.',
    ],
    route: '/',
    section: 'menu',
  },
  {
    id: 'training',
    title: 'Training & Exams',
    summary: 'Provide courses, exams, and orientation materials for employees.',
    content: [
      'Orientation modal outlines company overview, policies, and getting started guides.',
      'Training Manual and Exam flows reinforce best practices and certify employees.',
      'Certificates can be generated and archived in File Manager.',
    ],
    route: '/training-manual',
    section: 'menu',
  },
  {
    id: 'discounts',
    title: 'Discount Coupons',
    summary: 'Define and manage coupons to promote services.',
    content: [
      'Create coupons with codes, expirations, and discount amounts.',
      'Track usage and apply to invoices and services where supported.',
    ],
    route: '/discount-coupons',
    section: 'menu',
  },
  {
    id: 'jobs-completed',
    title: 'Jobs Completed',
    summary: 'View jobs completed with revenue and status details.',
    content: [
      'Review finished jobs, dates, and totals to reconcile with accounting.',
      'Dismiss related alerts once items are reviewed and reconciled.',
    ],
    route: '/jobs-completed',
    section: 'menu',
  },
  {
    id: 'settings',
    title: 'Settings',
    summary: 'Configure application preferences and environment parameters.',
    content: [
      'Manage environment toggles in development, mock data, and auth settings.',
      'Adjust features visibility and refine operational defaults.',
    ],
    route: '/settings',
    section: 'menu',
  },
  {
    id: 'reports',
    title: 'Reports',
    summary: 'Generate business reports for performance analysis.',
    content: [
      'Use filters to produce tailored insights and exports.',
      'Cross-link with invoicing and tasks data.',
    ],
    route: '/reports',
    section: 'menu',
  },
  {
    id: 'service-checklist',
    title: 'Service Checklist',
    summary: 'Start a Job, track materials, and finalize services.',
    content: [
      'Launch Start a Job to begin guided checklist steps for a vehicle.',
      'Track materials used; inventory updates on finalize when configured.',
      'Resume in-progress jobs via Active Jobs and mark completion.',
    ],
    route: '/service-checklist',
    section: 'menu',
  },
  {
    id: 'package-pricing',
    title: 'Package Pricing',
    summary: 'Manage service packages, pricing levels, and add-ons.',
    content: [
      'Edit package names, descriptions, and tiered pricing.',
      'Adjust add-ons and seasonal pricing as needed.',
      'Sync updates with website and customer tools where applicable.',
    ],
    route: '/package-pricing',
    section: 'menu',
  },
];

export const adminDashboardTopics: HelpTopic[] = [
  {
    id: 'dashboard-alerts',
    title: 'Real‑time Alerts',
    summary: 'System alerts banner with unread counts and quick actions.',
    content: [
      'Unread alerts show for payroll due, low inventory, new files, and overdue tasks.',
      'Use Dismiss and Dismiss All to clear reviewed alerts.',
      'Alerts sync across tabs; updates trigger badges in the sidebar.',
    ],
    section: 'dashboard',
  },
  {
    id: 'dashboard-cheat-exam',
    title: 'Cheat Sheet & Exam Control',
    summary: 'Compact pill links to Exam Admin and Exam Page.',
    content: [
      'Open Cheat Sheet to generate and archive the handbook reference PDF.',
      'Exam Admin lets you manage questions and generate cheat sheet PDFs.',
      'Exam Page is the employee test; completion unlocks Certificates.',
      'Certificates page saves the training certificate PDFs to File Manager.',
    ],
    section: 'dashboard',
    route: '/exam-admin',
  },
  {
    id: 'dashboard-user-management',
    title: 'User Management',
    summary: 'Admin • Employee rights with create, edit, impersonate, delete.',
    content: [
      'Create and edit users with roles admin/employee.',
      'Impersonate users to validate role-based views.',
      'Delete users with safety confirmations.',
    ],
    section: 'dashboard',
    route: '/user-management',
  },
  {
    id: 'dashboard-settings',
    title: 'Settings (Quick Access)',
    summary: 'Open configuration to manage environment and operational preferences.',
    content: [
      'Adjust inventory, alerts, and development toggles.',
      'Use destructive actions like data deletes with caution.',
    ],
    section: 'dashboard',
    route: '/settings',
  },
  {
    id: 'dashboard-add-customer',
    title: 'Add Customer (Quick Action)',
    summary: 'Open modal to create a customer and link records.',
    content: [
      'Enter core contact data; system deduplicates by email/phone when possible.',
      'Link tasks or invoices immediately after creation.',
    ],
    section: 'dashboard',
    route: '/search-customer',
  },
  {
    id: 'dashboard-menu-visibility',
    title: 'Menu Visibility Controls',
    summary: 'Show/hide sidebar items; syncs across tabs via storage events.',
    content: [
      'Toggle checkboxes to show or hide items like Inventory, File Manager, Tasks, etc.',
      'Changes update the slide-out menu and dashboard tiles instantly.',
    ],
    section: 'dashboard',
  },
];

export const adminTopics: HelpTopic[] = [
  ...adminMenuTopics,
  ...adminDashboardTopics,
];

// Employee topics are organized into two sections per request:
// 1) Menu Items (from the slide-out menu)
// 2) Employee Dashboard items (cards and quick actions)

export const employeeMenuTopics: HelpTopic[] = [
  {
    id: 'website',
    title: 'Website',
    summary: 'View packages, add‑ons, and web tools.',
    content: [
      'Use View Website to open the public site and pricing tools.',
      'Review packages and add‑ons before discussing options with customers.',
    ],
    route: '/services',
    section: 'menu',
  },
  {
    id: 'service-checklist',
    title: 'Service Checklist',
    summary: 'Start jobs and track active work.',
    content: [
      'Start Job to begin a checklist for the current vehicle.',
      'View Active Jobs to monitor progress and ensure consistency.',
    ],
    route: '/service-checklist',
    section: 'menu',
  },
  {
    id: 'tasks',
    title: 'Todo',
    summary: 'Your tasks with status, comments, and calendar.',
    content: [
      'See only tasks assigned to you.',
      'Update status and add comments; admins are notified automatically.',
      'Use Calendar view to plan work by day and time.',
    ],
    route: '/tasks',
    section: 'menu',
  },
  {
    id: 'customers',
    title: 'Customer Profiles',
    summary: 'Search and view customer records.',
    content: [
      'Find customers by name, phone, or email.',
      'Review related tasks, invoices, and files where available.',
    ],
    route: '/search-customer',
    section: 'menu',
  },
  {
    id: 'quick-detailing-manual',
    title: 'Quick Detailing Manual',
    summary: 'Guidelines to maintain consistent quality.',
    content: [
      'Reference process steps and best practices quickly during work.',
      'Use this along with Rick’s Pro Tips for better results.',
    ],
    route: '/training-manual',
    section: 'menu',
  },
  {
    id: 'employee-dashboard',
    title: 'Employee Dashboard',
    summary: 'Home base for jobs, tips, and quick actions.',
    content: [
      'Access Service Checklist, Orientation, Pro Tips, and quick actions in one place.',
      'Check Certified Detailer badge and quick stats when available.',
    ],
    route: '/employee-dashboard',
    section: 'menu',
  },
];

export const employeeDashboardTopics: HelpTopic[] = [
  {
    id: 'dashboard-service-checklist',
    title: 'SERVICE CHECKLIST',
    summary: 'Start Job • View Active Jobs • Active Jobs count.',
    content: [
      'Start Job begins the guided checklist for the current task/vehicle.',
      'View Active Jobs shows in‑progress work and lets you resume tasks.',
      'Active Jobs badge displays how many jobs are currently in progress.',
    ],
    section: 'dashboard',
    route: '/service-checklist',
  },
  {
    id: 'dashboard-orientation',
    title: 'ORIENTATION',
    summary: 'Company overview • Policies • Getting started.',
    content: [
      'Orientation modal introduces company policies and expectations.',
      'Use this as a new employee to learn standards and workflows.',
    ],
    section: 'dashboard',
    route: '/employee-training',
  },
  {
    id: 'dashboard-view-website',
    title: 'VIEW WEBSITE',
    summary: 'Open public site to view package pricelist and tools.',
    content: [
      'Quickly access web pricing and add‑ons to guide the conversation.',
      'Use this with customers to present options clearly.',
    ],
    section: 'dashboard',
    route: '/services',
  },
  {
    id: 'dashboard-pro-tips',
    title: 'RICK’S PRO TIPS',
    summary: 'Quick professional reminders to reduce rework.',
    content: [
      'Check off tips as acknowledged to build consistent habits.',
      'Edit or add personal tips to improve your workflow.',
    ],
    section: 'dashboard',
  },
  {
    id: 'dashboard-quick-todo',
    title: 'Todo (Calendar)',
    summary: 'Open your tasks list and calendar view.',
    content: [
      'Use Mine, Today, Overdue, Upcoming filters to stay organized.',
      'Update status (e.g., Acknowledged) and add comments.',
    ],
    section: 'dashboard',
    route: '/tasks',
  },
  {
    id: 'dashboard-add-customer',
    title: 'ADD CUSTOMER',
    summary: 'Create a new customer record.',
    content: [
      'Enter contact details and preferences.',
      'Link tasks or invoices as needed.',
    ],
    section: 'dashboard',
    route: '/search-customer',
  },
  {
    id: 'dashboard-notify-admin',
    title: 'NOTIFY ADMIN',
    summary: 'Send a priority message; auto‑archives a PDF.',
    content: [
      'Fill subject, priority (URGENT/Normal), and message body.',
      'Sends via email and saves a PDF to File Manager.',
    ],
    section: 'dashboard',
  },
];

export const employeeTopics: HelpTopic[] = [
  ...employeeMenuTopics,
  ...employeeDashboardTopics,
];

export function makeToc(role: 'admin'|'employee', _blockedIds: string[] = []): HelpTopic[] {
  if (role === 'admin') {
    const mainMenu: HelpTopic = {
      id: 'main-menu',
      title: 'Main Menu',
      summary: 'Complete admin guide with all features and routes.',
      content: [
        'Use the table of contents to navigate quickly.',
        'Previous/Next buttons let you read through in order.',
      ],
    };
    return [mainMenu, ...adminTopics];
  }
  // Employees: only show requested items in two sections
  return [...employeeMenuTopics, ...employeeDashboardTopics];
}
