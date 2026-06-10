
export const MOCK_CUSTOMERS = [
  {
    id: "demo-cust-1",
    name: "John Smith",
    email: "john.smith.demo@example.com",
    phone: "555-0101",
    address: "123 Maple Ave, Springfield",
    type: "customer",
    created_at: new Date().toISOString(),
    vehicles: [
      {
        id: "demo-veh-1",
        make: "Tesla",
        model: "Model S",
        year: "2023",
        type: "Luxury Sedan",
        color: "Midnight Silver",
        conditionInside: "Excellent",
        conditionOutside: "Minor swirl marks"
      }
    ],
    notes: "Regular customer in the demo system. Prefers non-scented cleaners.",
    totalSpent: 1250.00
  },
  {
    id: "demo-cust-2",
    name: "Sarah Johnson",
    email: "sarah.j.demo@example.com",
    phone: "555-0102",
    address: "456 Oak Ln, River City",
    type: "customer",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    vehicles: [
      {
        id: "demo-veh-2",
        make: "Ford",
        model: "F-150 Lightning",
        year: "2024",
        type: "Truck",
        color: "Antimatter Blue",
        conditionInside: "Moderate dirt",
        conditionOutside: "Muddy from construction site"
      }
    ],
    notes: "New enthusiast client. Interested in ceramic coating.",
    totalSpent: 2800.00
  }
];

export const MOCK_PROSPECTS = [
  {
    id: "demo-prospect-1",
    name: "Mike Miller",
    email: "mike.m@prospect.demo",
    phone: "555-9001",
    howFound: "Facebook Ads",
    status: "new",
    vehicleType: "SUV",
    created_at: new Date().toISOString()
  },
  {
    id: "demo-prospect-2",
    name: "Emily Davis",
    email: "emily.d@prospect.demo",
    phone: "555-9002",
    howFound: "Word of Mouth",
    status: "contacted",
    vehicleType: "Compact",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString()
  }
];

export const MOCK_ENGAGEMENTS = [
  {
    id: "demo-eng-1",
    customer_id: "demo-cust-1",
    type: "email",
    original_type: "Welcome Email",
    source: "System Outreach",
    title: "Welcome to Prime Auto Detail",
    content: "Hi John,\n\nWelcome to Prime Auto Detail! We are thrilled to have you.",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: "demo-eng-2",
    customer_id: "demo-cust-2",
    type: "sms",
    original_type: "Appointment Reminder",
    source: "Booking System",
    title: "Appointment Reminder",
    content: "Hi Sarah, this is a reminder for your upcoming detailing appointment.",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

export const MOCK_INVENTORY = {
  materials: [
    { id: "mat-1", name: "Premium Car Soap", brand: "Chemical Guys", quantity: 15, lowThreshold: 5, unit: "Gallon", price: 45.00, costPerItem: 45.00 },
    { id: "mat-2", name: "Microfiber Towels (Blue)", brand: "The Rag Company", quantity: 120, lowThreshold: 20, unit: "Pack of 12", price: 29.99, costPerItem: 29.99 },
  ],
  chemicals: [
    { id: "chem-1", name: "Carnauba Wax", brand: "Meguiar's", currentStock: 8, threshold: 10, unit: "16oz Tub", price: 19.95, costPerBottle: 19.95 },
    { id: "chem-2", name: "All Purpose Cleaner", brand: "Koch Chemie", currentStock: 3, threshold: 5, unit: "5L Jug", price: 65.00, costPerBottle: 65.00 }
  ],
  tools: [
    { id: "tool-1", name: "High-Pressure Wash Gun", price: 145.00, cost: 145.00, purchaseDate: new Date().toISOString(), notes: "Standard issue" },
    { id: "tool-2", name: "RUPES LHR15 Mark III", price: 450.00, cost: 450.00, purchaseDate: new Date().toISOString(), notes: "Polisher" }
  ]
};

export const MOCK_TASKS: any[] = [
  { id: "task-1", title: "Clean mobile unit #1", status: "pending", priority: "high", dueDate: new Date().toISOString() },
  { id: "task-2", title: "Order re-stock of microfiber towels", status: "completed", priority: "medium", dueDate: new Date(Date.now() - 86400000).toISOString() },
];

export const MOCK_INVOICES = [
  { id: "demo-inv-1", customerName: "John Smith", total: 249.99, paymentStatus: "paid", createdAt: new Date().toISOString(), invoiceNumber: "INV-5001", paidAmount: 249.99, services: [{ name: "Standard Interior Detail", price: 249.99 }] },
  { id: "demo-inv-2", customerName: "Sarah Johnson", total: 1575.50, paymentStatus: "unpaid", createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), dueDate: new Date(Date.now() + 86400000 * 7).toISOString(), invoiceNumber: "INV-5002", paidAmount: 0, services: [{ name: "Prime Elite Package", price: 1575.50 }] },
];

export const MOCK_EMPLOYEES = [
  { id: "demo-emp-1", name: "Alex Admin", email: "alex@demo.com", role: "admin", status: "Active" },
  { id: "demo-emp-2", name: "Sam Staff", email: "sam@demo.com", role: "employee", status: "Active" }
];

export const MOCK_BOOKINGS = [
  { 
    id: "demo-bk-1", 
    customer: "John Smith", 
    date: new Date().toISOString(), 
    status: "in_progress", 
    vehicleYear: "2023", 
    vehicleMake: "Tesla", 
    vehicleModel: "Model S",
    price: 250.00,
    assignedEmployee: "Sam Staff",
    createdAt: new Date().toISOString(),
    title: "Full Interior Detail",
    source: "Public Website"
  },
  { 
    id: "demo-bk-2", 
    customer: "Sarah Johnson", 
    date: new Date(Date.now() + 86400000).toISOString(), 
    status: "confirmed", 
    vehicleYear: "2024", 
    vehicleMake: "Ford", 
    vehicleModel: "F-150 Lightning",
    price: 1500.00,
    assignedEmployee: "Alex Admin",
    createdAt: new Date().toISOString(),
    title: "Prime Elite Exterior + Ceramic",
    source: "Business Launch Manager"
  },
  { 
    id: "demo-bk-3", 
    customer: "Mike Miller", 
    date: new Date(Date.now() - 86400000).toISOString(), 
    status: "done", 
    vehicleYear: "2022", 
    vehicleMake: "BMW", 
    vehicleModel: "X5",
    price: 450.00,
    assignedEmployee: "Sam Staff",
    createdAt: new Date().toISOString(),
    title: "Engine Bay + Exterior",
    source: "Hybrid Availability System"
  },
  { 
    id: "demo-bk-4", 
    customer: "Emily Davis", 
    date: new Date(Date.now() + 86400000 * 2).toISOString(), 
    status: "pending", 
    vehicleYear: "2021", 
    vehicleMake: "Honda", 
    vehicleModel: "Civic",
    price: 180.00,
    assignedEmployee: null,
    createdAt: new Date().toISOString(),
    title: "Maintenance Wash",
    source: "Manual Entry"
  }
];

export const MOCK_ANALYTICS = {
  revenueThisMonth: 12450.00,
  revenueLastMonth: 10200.00,
  bookingsCount: 42,
  topService: "Full Detail",
  customerSatisfaction: 4.9
};


export const MOCK_ACCOUNTING = {
  income: 12450.50,
  expenses: 4200.75,
  netProfit: 8249.75,
  taxLiability: 1867.50,
  transactions: [
    { id: "tran-1", type: "income", category: "Detailing", amount: 250.00, date: new Date().toISOString(), description: "Full Detail - Model S" },
    { id: "tran-2", type: "expense", category: "Supplies", amount: 157.20, date: new Date(Date.now() - 3600000 * 2).toISOString(), description: "Microfiber Towels & Soap" },
    { id: "tran-3", type: "income", category: "Ceramic Coating", amount: 1200.00, date: new Date(Date.now() - 86400000).toISOString(), description: "Sarah Johnson - Truck Prep" }
  ]
};

export const MOCK_PAYROLL = [
  { id: "pay-1", name: "Sam Staff", grossPay: 1200.00, netPay: 950.00, taxes: 250.00, status: "paid", period: "Bi-Weekly", date: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: "pay-2", name: "Sam Staff", grossPay: 1150.00, netPay: 910.00, taxes: 240.00, status: "pending", period: "Bi-Weekly", date: new Date().toISOString() }
];

export const MOCK_ESTIMATES = [
  { id: "est-1", customer: "Michael Chen", customerName: "Michael Chen", estimateNumber: "EST-6001", service: "Multi-Stage Paint Correction", services: [{ name: "Multi-Stage Paint Correction", price: 850.00 }], total: 850.00, status: "sent", date: new Date().toISOString() },
  { id: "est-2", customer: "Linda Walker", customerName: "Linda Walker", estimateNumber: "EST-6002", service: "Interior Steam Cleaning", services: [{ name: "Interior Steam Cleaning", price: 175.00 }], total: 175.00, status: "converted", date: new Date(Date.now() - 86400000 * 5).toISOString() }
];

export const MOCK_REPORTS = {
  dailySummary: { bookings: 5, newProspects: 3, revenue: 1450.00 },
  topMarketing: [
    { source: "Facebook", count: 12, value: 3400 },
    { source: "Google Search", count: 8, value: 2100 },
    { source: "Referral", count: 15, value: 4500 }
  ]
};

export const MOCK_BUDGET = {
  planned: { operations: 5000, marketing: 2000, equipment: 3000, payroll: 15000 },
  actual: { operations: 4850, marketing: 2200, equipment: 2900, payroll: 14800 },
  forecast: { operations: 5100, marketing: 2100, equipment: 3100, payroll: 15200 }
};

export const MOCK_CHEMICAL_LIBRARY = [
  { 
    id: "chem-lib-1", 
    name: "Gtechniq W6 Iron Remover", 
    category: "Decontamination", 
    dilution: "RTU", 
    sdsUrl: "#", 
    instructions: "Spray on, wait 3-5 mins, rinse thoroughly.",
    hazardRating: 2,
    pdsUrl: "#"
  },
  { 
    id: "chem-lib-2", 
    name: "P&S Brake Buster", 
    category: "Wheels & Tires", 
    dilution: "5:1", 
    sdsUrl: "#", 
    instructions: "Dilute 5:1 for maintenance, RTU for heavy grime.",
    hazardRating: 1,
    pdsUrl: "#"
  }
];
export const MOCK_GALLERY = [
  {
    id: "demo-gal-1",
    title: "Prime Showroom Finish",
    description: "Deep gloss reflection on a black Porsche 911 after multi-stage correction.",
    category: "general_gallery",
    type: "image",
    thumbnail_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800",
    resource_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1200",
    is_published: true,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "demo-gal-2",
    title: "Eco-Friendly Foam Bath",
    description: "Using our signature pH-neutral snow foam for safe dwell time.",
    category: "general_gallery",
    type: "image",
    thumbnail_url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800",
    resource_url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=1200",
    is_published: true,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: "demo-gal-3",
    title: "Clay Bar Decontamination",
    description: "Removing industrial fallout to ensure a smooth bonding surface for coatings.",
    category: "general_gallery",
    type: "image",
    thumbnail_url: "https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=800",
    resource_url: "https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=1200",
    is_published: true,
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];
