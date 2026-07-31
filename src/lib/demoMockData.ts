export const MOCK_CUSTOMERS = [
  {
    "id": "demo-cust-1",
    "name": "John Smith",
    "email": "john.smith.demo@example.com",
    "phone": "555-0101",
    "address": "123 Maple Ave, Springfield",
    "type": "customer",
    "created_at": "2026-06-30T04:17:29.827Z",
    "vehicles": [
      {
        "id": "demo-veh-1",
        "make": "Tesla",
        "model": "Model S",
        "year": "2023",
        "type": "Luxury Sedan",
        "color": "Midnight Silver",
        "conditionInside": "Excellent",
        "conditionOutside": "Minor swirl marks"
      }
    ],
    "notes": "Regular customer. Prefers non-scented cleaners.",
    "totalSpent": 1250
  },
  {
    "id": "demo-cust-2",
    "name": "Sarah Johnson",
    "email": "sarah.j.demo@example.com",
    "phone": "555-0102",
    "address": "456 Oak Ln, River City",
    "type": "customer",
    "created_at": "2026-07-15T04:17:29.827Z",
    "vehicles": [
      {
        "id": "demo-veh-2",
        "make": "Ford",
        "model": "F-150 Lightning",
        "year": "2024",
        "type": "Truck",
        "color": "Antimatter Blue",
        "conditionInside": "Moderate dirt",
        "conditionOutside": "Muddy from construction site"
      }
    ],
    "notes": "New enthusiast client.",
    "totalSpent": 2800
  },
  {
    "id": "demo-cust-3",
    "name": "Michael Chen",
    "email": "mchen@example.demo",
    "phone": "555-0103",
    "address": "789 Pine St, Metro",
    "type": "customer",
    "created_at": "2026-07-25T04:17:29.827Z",
    "vehicles": [
      {
        "id": "demo-veh-3",
        "make": "Porsche",
        "model": "911",
        "year": "2022",
        "type": "Coupe",
        "color": "Guards Red",
        "conditionInside": "Pristine",
        "conditionOutside": "Track rubber"
      }
    ],
    "notes": "Track day regular. Wants ceramic maintenance.",
    "totalSpent": 850
  },
  {
    "id": "demo-cust-4",
    "name": "Linda Walker",
    "email": "linda.w@example.demo",
    "phone": "555-0104",
    "address": "321 Elm St, Suburbia",
    "type": "customer",
    "created_at": "2026-07-28T04:17:29.827Z",
    "vehicles": [
      {
        "id": "demo-veh-4",
        "make": "Toyota",
        "model": "Sienna",
        "year": "2021",
        "type": "Minivan",
        "color": "White",
        "conditionInside": "Heavy stains",
        "conditionOutside": "Standard"
      }
    ],
    "notes": "Kids ruined the interior. Needs deep steam clean.",
    "totalSpent": 350
  }
];

export const MOCK_PROSPECTS = [
  {
    "id": "demo-prospect-1",
    "name": "Mike Miller",
    "email": "mike.m@prospect.demo",
    "phone": "555-9001",
    "howFound": "Facebook Ads",
    "status": "new",
    "vehicleType": "SUV",
    "created_at": "2026-07-30T04:17:29.827Z"
  },
  {
    "id": "demo-prospect-2",
    "name": "Emily Davis",
    "email": "emily.d@prospect.demo",
    "phone": "555-9002",
    "howFound": "Word of Mouth",
    "status": "contacted",
    "vehicleType": "Compact",
    "created_at": "2026-07-29T04:17:29.827Z"
  },
  {
    "id": "demo-prospect-3",
    "name": "Robert King",
    "email": "robert.k@prospect.demo",
    "phone": "555-9003",
    "howFound": "Google Search",
    "status": "qualified",
    "vehicleType": "Truck",
    "created_at": "2026-07-28T04:17:29.827Z"
  }
];

export const MOCK_ENGAGEMENTS = [
  {
    "id": "demo-eng-1",
    "customer_id": "demo-cust-1",
    "type": "email",
    "original_type": "Welcome Email",
    "source": "System Outreach",
    "title": "Welcome to Prime Auto Detail",
    "content": "Hi John,\n\nWelcome to Prime Auto Detail!",
    "created_at": "2026-06-30T04:17:29.827Z"
  },
  {
    "id": "demo-eng-2",
    "customer_id": "demo-cust-2",
    "type": "sms",
    "original_type": "Appointment Reminder",
    "source": "Booking System",
    "title": "Appointment Reminder",
    "content": "Hi Sarah, reminder for your appointment.",
    "created_at": "2026-07-29T04:17:29.827Z"
  },
  {
    "id": "demo-eng-3",
    "customer_id": "demo-cust-3",
    "type": "email",
    "original_type": "Follow-up",
    "source": "Manual",
    "title": "Checking in on the ceramic coating",
    "content": "Hi Michael, how is the water beading holding up after your track day?",
    "created_at": "2026-07-28T04:17:29.827Z"
  }
];

export const MOCK_INVENTORY = {
  "materials": [
    {
      "id": "mat-1",
      "name": "Premium Car Soap",
      "brand": "Chemical Guys",
      "category": "Soaps",
      "quantity": 15,
      "lowThreshold": 5,
      "unit": "Gallon",
      "costPerItem": 45,
      "purchaseDate": "2026-07-10T04:17:29.827Z"
    },
    {
      "id": "mat-2",
      "name": "Microfiber Towels (Blue)",
      "brand": "The Rag Company",
      "category": "Towels",
      "quantity": 120,
      "lowThreshold": 20,
      "unit": "Pack of 12",
      "costPerItem": 29.99,
      "purchaseDate": "2026-07-20T04:17:29.827Z"
    },
    {
      "id": "mat-3",
      "name": "Clay Bar Kit",
      "brand": "Meguiars",
      "category": "Decon",
      "quantity": 8,
      "lowThreshold": 4,
      "unit": "Kit",
      "costPerItem": 18.5,
      "purchaseDate": "2026-07-15T04:17:29.827Z"
    },
    {
      "id": "mat-4",
      "name": "Ceramic Coating Applicators",
      "brand": "CarPro",
      "category": "Applicators",
      "quantity": 50,
      "lowThreshold": 10,
      "unit": "Pack of 10",
      "costPerItem": 12,
      "purchaseDate": "2026-06-20T04:17:29.827Z"
    },
    {
      "id": "mat-5",
      "name": "Detailing Brushes",
      "brand": "Detail Factory",
      "category": "Brushes",
      "quantity": 12,
      "lowThreshold": 3,
      "unit": "Set",
      "costPerItem": 25,
      "purchaseDate": "2026-05-31T04:17:29.827Z"
    },
    {
      "id": "mat-6",
      "name": "Nitrile Gloves",
      "brand": "Venom",
      "category": "PPE",
      "quantity": 5,
      "lowThreshold": 2,
      "unit": "Box of 100",
      "costPerItem": 14.99,
      "purchaseDate": "2026-07-25T04:17:29.827Z"
    },
    {
      "id": "mat-7",
      "name": "Glass Cleaning Towels",
      "brand": "TRC",
      "category": "Towels",
      "quantity": 30,
      "lowThreshold": 10,
      "unit": "Pack of 5",
      "costPerItem": 15.99,
      "purchaseDate": "2026-07-15T04:17:29.827Z"
    },
    {
      "id": "mat-8",
      "name": "Tire Dressing Applicators",
      "brand": "Adams",
      "category": "Applicators",
      "quantity": 20,
      "lowThreshold": 5,
      "unit": "Pack of 2",
      "costPerItem": 8.99,
      "purchaseDate": "2026-04-21T04:17:29.827Z"
    },
    {
      "id": "mat-9",
      "name": "Masking Tape",
      "brand": "3M",
      "category": "Supplies",
      "quantity": 15,
      "lowThreshold": 5,
      "unit": "Roll",
      "costPerItem": 4.5,
      "purchaseDate": "2026-06-15T04:17:29.827Z"
    },
    {
      "id": "mat-10",
      "name": "Empty Spray Bottles",
      "brand": "Tolco",
      "category": "Supplies",
      "quantity": 24,
      "lowThreshold": 5,
      "unit": "Bottle",
      "costPerItem": 2.5,
      "purchaseDate": "2026-04-01T04:17:29.827Z"
    }
  ],
  "chemicals": [
    {
      "id": "chem-1",
      "name": "Carnauba Wax",
      "brand": "Meguiars",
      "currentStock": 8,
      "threshold": 10,
      "bottleSize": "16oz Tub",
      "costPerBottle": 19.95,
      "purchaseDate": "2026-07-05T04:17:29.827Z"
    },
    {
      "id": "chem-2",
      "name": "All Purpose Cleaner",
      "brand": "Koch Chemie",
      "currentStock": 3,
      "threshold": 5,
      "bottleSize": "5L Jug",
      "costPerBottle": 65,
      "purchaseDate": "2026-07-15T04:17:29.827Z"
    },
    {
      "id": "chem-3",
      "name": "Iron Remover",
      "brand": "Gtechniq",
      "currentStock": 4,
      "threshold": 2,
      "bottleSize": "1L",
      "costPerBottle": 22,
      "purchaseDate": "2026-07-20T04:17:29.827Z"
    },
    {
      "id": "chem-4",
      "name": "Wheel Cleaner",
      "brand": "P&S",
      "currentStock": 6,
      "threshold": 3,
      "bottleSize": "1 Gallon",
      "costPerBottle": 28,
      "purchaseDate": "2026-07-25T04:17:29.827Z"
    },
    {
      "id": "chem-5",
      "name": "Leather Cleaner",
      "brand": "Colourlock",
      "currentStock": 5,
      "threshold": 2,
      "bottleSize": "500ml",
      "costPerBottle": 24.5,
      "purchaseDate": "2026-07-10T04:17:29.827Z"
    },
    {
      "id": "chem-6",
      "name": "Glass Cleaner",
      "brand": "Stoner",
      "currentStock": 12,
      "threshold": 5,
      "bottleSize": "19oz Aerosol",
      "costPerBottle": 5.99,
      "purchaseDate": "2026-07-22T04:17:29.827Z"
    },
    {
      "id": "chem-7",
      "name": "Ceramic Coating 9H",
      "brand": "CarPro",
      "currentStock": 2,
      "threshold": 1,
      "bottleSize": "50ml",
      "costPerBottle": 75,
      "purchaseDate": "2026-07-28T04:17:29.827Z"
    },
    {
      "id": "chem-8",
      "name": "Tire Shine",
      "brand": "Chemical Guys",
      "currentStock": 4,
      "threshold": 2,
      "bottleSize": "1 Gallon",
      "costPerBottle": 35,
      "purchaseDate": "2026-07-16T04:17:29.827Z"
    },
    {
      "id": "chem-9",
      "name": "Snow Foam Auto Wash",
      "brand": "Gyeon",
      "currentStock": 2,
      "threshold": 2,
      "bottleSize": "4000ml",
      "costPerBottle": 55,
      "purchaseDate": "2026-07-08T04:17:29.827Z"
    },
    {
      "id": "chem-10",
      "name": "Interior Detailer",
      "brand": "P&S",
      "currentStock": 8,
      "threshold": 4,
      "bottleSize": "1 Gallon",
      "costPerBottle": 22,
      "purchaseDate": "2026-06-30T04:17:29.827Z"
    }
  ],
  "tools": [
    {
      "id": "tool-1",
      "name": "High-Pressure Wash Gun",
      "price": 145,
      "purchaseDate": "2026-01-11T04:17:29.827Z",
      "warranty": "1 Year",
      "lifeExpectancy": "2 Years",
      "notes": "Standard issue"
    },
    {
      "id": "tool-2",
      "name": "RUPES LHR15 Mark III",
      "price": 450,
      "purchaseDate": "2026-03-02T04:17:29.827Z",
      "warranty": "3 Years",
      "lifeExpectancy": "5 Years",
      "notes": "Primary polisher"
    },
    {
      "id": "tool-3",
      "name": "McCulloch Steam Cleaner",
      "price": 199.99,
      "purchaseDate": "2026-04-21T04:17:29.827Z",
      "warranty": "1 Year",
      "lifeExpectancy": "3 Years",
      "notes": "For interior deep cleans"
    },
    {
      "id": "tool-4",
      "name": "Shop-Vac 5 Gallon",
      "price": 85,
      "purchaseDate": "2025-10-03T04:17:29.827Z",
      "warranty": "1 Year",
      "lifeExpectancy": "3 Years",
      "notes": "Wet/Dry extraction"
    },
    {
      "id": "tool-5",
      "name": "Deionized Water System",
      "price": 350,
      "purchaseDate": "2026-05-31T04:17:29.827Z",
      "warranty": "2 Years",
      "lifeExpectancy": "10 Years",
      "notes": "Spotless rinse setup"
    },
    {
      "id": "tool-6",
      "name": "Detailing Cart",
      "price": 120,
      "purchaseDate": "2026-04-01T04:17:29.827Z",
      "warranty": "N/A",
      "lifeExpectancy": "10 Years",
      "notes": "Mobile unit organizer"
    },
    {
      "id": "tool-7",
      "name": "Foam Cannon",
      "price": 65,
      "purchaseDate": "2026-05-11T04:17:29.827Z",
      "warranty": "1 Year",
      "lifeExpectancy": "2 Years",
      "notes": "Attached to pressure washer"
    },
    {
      "id": "tool-8",
      "name": "Ozone Generator",
      "price": 110,
      "purchaseDate": "2026-06-15T04:17:29.827Z",
      "warranty": "1 Year",
      "lifeExpectancy": "3 Years",
      "notes": "Odor removal"
    },
    {
      "id": "tool-9",
      "name": "Tornador Classic",
      "price": 135,
      "purchaseDate": "2026-05-01T04:17:29.827Z",
      "warranty": "1 Year",
      "lifeExpectancy": "2 Years",
      "notes": "Air compressor attachment"
    },
    {
      "id": "tool-10",
      "name": "LED Work Light",
      "price": 89.99,
      "purchaseDate": "2026-03-12T04:17:29.827Z",
      "warranty": "1 Year",
      "lifeExpectancy": "5 Years",
      "notes": "For paint correction checks"
    }
  ]
};

export const MOCK_TASKS = [
  {
    "id": "task-1",
    "title": "Clean mobile unit #1",
    "status": "pending",
    "priority": "high",
    "dueDate": "2026-07-30T04:17:29.827Z",
    "customerId": null
  },
  {
    "id": "task-2",
    "title": "Order re-stock of microfiber towels",
    "status": "completed",
    "priority": "medium",
    "dueDate": "2026-07-29T04:17:29.827Z",
    "customerId": null
  },
  {
    "id": "task-3",
    "title": "Follow up on Sarah Johnson ceramic coating",
    "status": "pending",
    "priority": "medium",
    "dueDate": "2026-07-31T04:17:29.827Z",
    "customerId": "demo-cust-2",
    "customerName": "Sarah Johnson"
  },
  {
    "id": "task-4",
    "title": "Send monthly marketing email",
    "status": "pending",
    "priority": "low",
    "dueDate": "2026-08-04T04:17:29.827Z",
    "customerId": null
  }
];

export const MOCK_INVOICES = [
  {
    "id": "demo-inv-1",
    "customerName": "John Smith",
    "customerId": "demo-cust-1",
    "total": 249.99,
    "paymentStatus": "paid",
    "createdAt": "2026-06-30T04:17:29.827Z",
    "invoiceNumber": "INV-5001",
    "paidAmount": 249.99,
    "services": [
      {
        "name": "Standard Interior Detail",
        "price": 249.99
      }
    ]
  },
  {
    "id": "demo-inv-2",
    "customerName": "Sarah Johnson",
    "customerId": "demo-cust-2",
    "total": 1575.5,
    "paymentStatus": "unpaid",
    "createdAt": "2026-07-27T04:17:29.827Z",
    "dueDate": "2026-08-06T04:17:29.827Z",
    "invoiceNumber": "INV-5002",
    "paidAmount": 0,
    "services": [
      {
        "name": "Prime Elite Package",
        "price": 1575.5
      }
    ]
  },
  {
    "id": "demo-inv-3",
    "customerName": "Michael Chen",
    "customerId": "demo-cust-3",
    "total": 850,
    "paymentStatus": "paid",
    "createdAt": "2026-07-25T04:17:29.827Z",
    "invoiceNumber": "INV-5003",
    "paidAmount": 850,
    "services": [
      {
        "name": "Multi-Stage Paint Correction",
        "price": 850
      }
    ]
  },
  {
    "id": "demo-inv-4",
    "customerName": "Linda Walker",
    "customerId": "demo-cust-4",
    "total": 350,
    "paymentStatus": "paid",
    "createdAt": "2026-07-28T04:17:29.827Z",
    "invoiceNumber": "INV-5004",
    "paidAmount": 350,
    "services": [
      {
        "name": "Interior Steam Cleaning",
        "price": 350
      }
    ]
  }
];

export const MOCK_EMPLOYEES = [
  {
    "id": "demo-emp-1",
    "name": "Alex Admin",
    "email": "alex@demo.com",
    "role": "admin",
    "status": "Active"
  },
  {
    "id": "demo-emp-2",
    "name": "Sam Staff",
    "email": "sam@demo.com",
    "role": "employee",
    "status": "Active"
  },
  {
    "id": "demo-emp-3",
    "name": "Marcus Detailer",
    "email": "brandon@demo.com",
    "role": "employee",
    "status": "Active"
  }
];

export const MOCK_BOOKINGS = [
  {
    "id": "demo-bk-1",
    "customer": "John Smith",
    "customerId": "demo-cust-1",
    "date": "2026-07-30T04:17:29.827Z",
    "status": "in_progress",
    "vehicleYear": "2023",
    "vehicleMake": "Tesla",
    "vehicleModel": "Model S",
    "price": 250,
    "assignedEmployee": "Sam Staff",
    "createdAt": "2026-07-25T04:17:29.827Z",
    "title": "Full Interior Detail",
    "source": "Public Website",
    "service_location": "mobile"
  },
  {
    "id": "demo-bk-2",
    "customer": "Sarah Johnson",
    "customerId": "demo-cust-2",
    "date": "2026-07-31T04:17:29.827Z",
    "status": "confirmed",
    "vehicleYear": "2024",
    "vehicleMake": "Ford",
    "vehicleModel": "F-150 Lightning",
    "price": 1500,
    "assignedEmployee": "Alex Admin",
    "createdAt": "2026-07-20T04:17:29.827Z",
    "title": "Prime Elite Exterior + Ceramic",
    "source": "Business Launch Manager",
    "service_location": "shop"
  },
  {
    "id": "demo-bk-3",
    "customer": "Mike Miller",
    "customerId": "demo-prospect-1",
    "date": "2026-07-29T04:17:29.827Z",
    "status": "done",
    "vehicleYear": "2022",
    "vehicleMake": "BMW",
    "vehicleModel": "X5",
    "price": 450,
    "assignedEmployee": "Sam Staff",
    "createdAt": "2026-07-15T04:17:29.827Z",
    "title": "Engine Bay + Exterior",
    "source": "Hybrid Availability System",
    "service_location": "mobile"
  },
  {
    "id": "demo-bk-4",
    "customer": "Emily Davis",
    "customerId": "demo-prospect-2",
    "date": "2026-08-01T04:17:29.827Z",
    "status": "pending",
    "vehicleYear": "2021",
    "vehicleMake": "Honda",
    "vehicleModel": "Civic",
    "price": 180,
    "assignedEmployee": null,
    "createdAt": "2026-07-28T04:17:29.827Z",
    "title": "Maintenance Wash",
    "source": "Manual Entry",
    "service_location": "mobile"
  },
  {
    "id": "demo-bk-5",
    "customer": "Michael Chen",
    "customerId": "demo-cust-3",
    "date": "2026-07-25T04:17:29.827Z",
    "status": "done",
    "vehicleYear": "2022",
    "vehicleMake": "Porsche",
    "vehicleModel": "911",
    "price": 850,
    "assignedEmployee": "Alex Admin",
    "createdAt": "2026-07-18T04:17:29.827Z",
    "title": "Multi-Stage Paint Correction",
    "source": "Phone",
    "service_location": "shop"
  },
  {
    "id": "demo-bk-6",
    "customer": "Linda Walker",
    "customerId": "demo-cust-4",
    "date": "2026-07-28T04:17:29.827Z",
    "status": "done",
    "vehicleYear": "2021",
    "vehicleMake": "Toyota",
    "vehicleModel": "Sienna",
    "price": 350,
    "assignedEmployee": "Marcus Detailer",
    "createdAt": "2026-07-22T04:17:29.827Z",
    "title": "Interior Steam Cleaning",
    "source": "Public Website",
    "service_location": "mobile"
  },
  {
    "id": "demo-bk-7",
    "customer": "Robert King",
    "customerId": "demo-prospect-3",
    "date": "2026-07-27T04:17:29.827Z",
    "status": "done",
    "vehicleYear": "2020",
    "vehicleMake": "Chevrolet",
    "vehicleModel": "Silverado",
    "price": 200,
    "assignedEmployee": "Sam Staff",
    "createdAt": "2026-07-23T04:17:29.827Z",
    "title": "Exterior Wash & Wax",
    "source": "Public Website",
    "service_location": "mobile"
  }
];

export const MOCK_ANALYTICS = {
  "revenueThisMonth": 12450,
  "revenueLastMonth": 10200,
  "bookingsCount": 42,
  "topService": "Full Detail",
  "customerSatisfaction": 4.9
};

export const MOCK_ACCOUNTING = {
  "income": 12450.5,
  "expenses": 4200.75,
  "netProfit": 8249.75,
  "taxLiability": 1867.5,
  "transactions": [
    {
      "id": "tran-1",
      "type": "income",
      "category": "Detailing",
      "amount": 250,
      "date": "2026-07-30T04:17:29.827Z",
      "description": "Full Detail - Model S"
    },
    {
      "id": "tran-2",
      "type": "expense",
      "category": "Supplies",
      "amount": 157.2,
      "date": "2026-07-29T04:17:29.827Z",
      "description": "Microfiber Towels & Soap"
    },
    {
      "id": "tran-3",
      "type": "income",
      "category": "Ceramic Coating",
      "amount": 1200,
      "date": "2026-07-28T04:17:29.827Z",
      "description": "Sarah Johnson - Truck Prep"
    },
    {
      "id": "tran-4",
      "type": "income",
      "category": "Detailing",
      "amount": 850,
      "date": "2026-07-25T04:17:29.827Z",
      "description": "Michael Chen - Paint Correction"
    },
    {
      "id": "tran-5",
      "type": "income",
      "category": "Detailing",
      "amount": 350,
      "date": "2026-07-28T04:17:29.827Z",
      "description": "Linda Walker - Interior Deep Clean"
    },
    {
      "id": "tran-6",
      "type": "expense",
      "category": "Software",
      "amount": 49.99,
      "date": "2026-07-20T04:17:29.827Z",
      "description": "Monthly CRM Subscription"
    },
    {
      "id": "tran-7",
      "type": "expense",
      "category": "Fuel",
      "amount": 85,
      "date": "2026-07-26T04:17:29.827Z",
      "description": "Mobile Unit Gas"
    },
    {
      "id": "tran-8",
      "type": "income",
      "category": "Detailing",
      "amount": 200,
      "date": "2026-07-27T04:17:29.827Z",
      "description": "Robert King - Wash & Wax"
    }
  ]
};

export const MOCK_PAYROLL = [
  {
    "id": "pay-1",
    "name": "Sam Staff",
    "employee_id": "demo-emp-2",
    "grossPay": 1200,
    "netPay": 950,
    "taxes": 250,
    "status": "paid",
    "period": "Bi-Weekly",
    "date": "2026-07-23T04:17:29.827Z"
  },
  {
    "id": "pay-2",
    "name": "Sam Staff",
    "employee_id": "demo-emp-2",
    "grossPay": 1150,
    "netPay": 910,
    "taxes": 240,
    "status": "pending",
    "period": "Bi-Weekly",
    "date": "2026-07-30T04:17:29.827Z"
  },
  {
    "id": "pay-3",
    "name": "Marcus Detailer",
    "employee_id": "demo-emp-3",
    "grossPay": 900,
    "netPay": 720,
    "taxes": 180,
    "status": "paid",
    "period": "Bi-Weekly",
    "date": "2026-07-23T04:17:29.827Z"
  }
];

export const MOCK_ESTIMATES = [
  {
    "id": "est-1",
    "customer": "Michael Chen",
    "customerName": "Michael Chen",
    "customer_id": "demo-cust-3",
    "estimateNumber": "EST-6001",
    "service": "Multi-Stage Paint Correction",
    "services": [
      {
        "name": "Multi-Stage Paint Correction",
        "price": 850
      }
    ],
    "total": 850,
    "status": "sent",
    "date": "2026-07-20T04:17:29.827Z"
  },
  {
    "id": "est-2",
    "customer": "Linda Walker",
    "customerName": "Linda Walker",
    "customer_id": "demo-cust-4",
    "estimateNumber": "EST-6002",
    "service": "Interior Steam Cleaning",
    "services": [
      {
        "name": "Interior Steam Cleaning",
        "price": 350
      }
    ],
    "total": 350,
    "status": "converted",
    "date": "2026-07-25T04:17:29.827Z"
  },
  {
    "id": "est-3",
    "customer": "Sarah Johnson",
    "customerName": "Sarah Johnson",
    "customer_id": "demo-cust-2",
    "estimateNumber": "EST-6003",
    "service": "Prime Elite Package",
    "services": [
      {
        "name": "Prime Elite Package",
        "price": 1575.5
      }
    ],
    "total": 1575.5,
    "status": "converted",
    "date": "2026-07-15T04:17:29.827Z"
  }
];

export const MOCK_REPORTS = {
  "dailySummary": {
    "bookings": 5,
    "newProspects": 3,
    "revenue": 1450
  },
  "topMarketing": [
    {
      "source": "Facebook",
      "count": 12,
      "value": 3400
    },
    {
      "source": "Google Search",
      "count": 8,
      "value": 2100
    },
    {
      "source": "Referral",
      "count": 15,
      "value": 4500
    }
  ]
};

export const MOCK_BUDGET = {
  "planned": {
    "operations": 5000,
    "marketing": 2000,
    "equipment": 3000,
    "payroll": 15000
  },
  "actual": {
    "operations": 4850,
    "marketing": 2200,
    "equipment": 2900,
    "payroll": 14800
  },
  "forecast": {
    "operations": 5100,
    "marketing": 2100,
    "equipment": 3100,
    "payroll": 15200
  }
};

export const MOCK_CHEMICAL_LIBRARY = [
  {
    "id": "chem-lib-1",
    "name": "Gtechniq W6 Iron Remover",
    "category": "Decontamination",
    "dilution": "RTU",
    "sdsUrl": "#",
    "instructions": "Spray on, wait 3-5 mins, rinse thoroughly.",
    "hazardRating": 2,
    "pdsUrl": "#",
    "primary_image_url": "https://m.media-amazon.com/images/I/51rP4y4W9uL._AC_SX679_.jpg"
  },
  {
    "id": "chem-lib-2",
    "name": "P&S Brake Buster",
    "category": "Wheels & Tires",
    "dilution": "5:1",
    "sdsUrl": "#",
    "instructions": "Dilute 5:1 for maintenance, RTU for heavy grime.",
    "hazardRating": 1,
    "pdsUrl": "#",
    "primary_image_url": "https://m.media-amazon.com/images/I/61kF9B2HkPL._AC_SX679_.jpg"
  },
  {
    "id": "chem-lib-3",
    "name": "CarPro Reload",
    "category": "Protection",
    "dilution": "RTU",
    "sdsUrl": "#",
    "instructions": "Spray on microfiber, wipe panel, buff off.",
    "hazardRating": 1,
    "pdsUrl": "#",
    "primary_image_url": "https://m.media-amazon.com/images/I/61lB9yqY2AL._AC_SX679_.jpg"
  },
  {
    "id": "chem-lib-4",
    "name": "Koch Chemie Green Star",
    "category": "APC",
    "dilution": "10:1",
    "sdsUrl": "#",
    "instructions": "Use for interiors 10:1, exteriors 5:1.",
    "hazardRating": 2,
    "pdsUrl": "#",
    "primary_image_url": "https://m.media-amazon.com/images/I/51BqUvE3QBL._AC_SX679_.jpg"
  },
  {
    "id": "chem-lib-5",
    "name": "Meguiars Hyper Wash",
    "category": "Wash",
    "dilution": "400:1",
    "sdsUrl": "#",
    "instructions": "1 oz per 5 gallons of water.",
    "hazardRating": 1,
    "pdsUrl": "#",
    "primary_image_url": "https://m.media-amazon.com/images/I/81M1+hW0mKL._AC_SX679_.jpg"
  },
  {
    "id": "chem-lib-6",
    "name": "Optimum No Rinse (ONR)",
    "category": "Wash",
    "dilution": "256:1",
    "sdsUrl": "#",
    "instructions": "1 oz per 2 gallons of water.",
    "hazardRating": 1,
    "pdsUrl": "#",
    "primary_image_url": "https://m.media-amazon.com/images/I/71YvU0D4+ZL._AC_SX679_.jpg"
  },
  {
    "id": "chem-lib-7",
    "name": "Gyeon WetCoat",
    "category": "Protection",
    "dilution": "RTU",
    "sdsUrl": "#",
    "instructions": "Spray on wet panel, rinse off immediately.",
    "hazardRating": 1,
    "pdsUrl": "#",
    "primary_image_url": "https://m.media-amazon.com/images/I/61M0v4y6H-L._AC_SX679_.jpg"
  },
  {
    "id": "chem-lib-8",
    "name": "Stoner Invisible Glass",
    "category": "Glass",
    "dilution": "RTU",
    "sdsUrl": "#",
    "instructions": "Spray on towel, wipe glass, flip and buff.",
    "hazardRating": 1,
    "pdsUrl": "#"
  }
];

export const MOCK_GALLERY = [
  // --- Gallery Images (category: general_gallery) ---
  {
    "id": "demo-gal-1",
    "title": "Prime Showroom Finish",
    "description": "Deep gloss reflection on a black Porsche 911 after multi-stage correction.",
    "category": "general_gallery",
    "type": "image",
    "thumbnail_url": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800",
    "resource_url": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1200",
    "is_published": true,
    "created_at": "2026-07-29T04:17:29.827Z"
  },
  {
    "id": "demo-gal-2",
    "title": "Eco-Friendly Foam Bath",
    "description": "Using our signature pH-neutral snow foam for safe dwell time.",
    "category": "general_gallery",
    "type": "image",
    "thumbnail_url": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800",
    "resource_url": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=1200",
    "is_published": true,
    "created_at": "2026-07-25T04:17:29.827Z"
  },
  {
    "id": "demo-gal-3",
    "title": "Clay Bar Decontamination",
    "description": "Removing industrial fallout to ensure a smooth bonding surface.",
    "category": "general_gallery",
    "type": "image",
    "thumbnail_url": "https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=800",
    "resource_url": "https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=1200",
    "is_published": true,
    "created_at": "2026-07-28T04:17:29.827Z"
  },
  {
    "id": "demo-gal-4",
    "title": "Interior Detail Mastery",
    "description": "Complete extraction and leather conditioning for a flawless finish.",
    "category": "general_gallery",
    "type": "image",
    "thumbnail_url": "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80&w=800",
    "resource_url": "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80&w=1200",
    "is_published": true,
    "created_at": "2026-07-30T10:00:00.000Z"
  },
  {
    "id": "demo-gal-5",
    "title": "Ceramic Coating Application",
    "description": "Applying a 9H ceramic coating for long-lasting hydrophobic protection.",
    "category": "general_gallery",
    "type": "image",
    "thumbnail_url": "https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?auto=format&fit=crop&q=80&w=800",
    "resource_url": "https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?auto=format&fit=crop&q=80&w=1200",
    "is_published": true,
    "created_at": "2026-07-30T11:00:00.000Z"
  },

  // --- Blog Posts (category: General) ---
  {
    "id": "demo-blog-1",
    "title": "The Ultimate Guide to Ceramic Coatings",
    "description": "Curious about ceramic coatings? We break down the science of 9H hardness, how it protects against UV damage, and why it's the best investment you can make for your vehicle's paint. Say goodbye to waxing!",
    "category": "General",
    "type": "article",
    "thumbnail_url": "https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?auto=format&fit=crop&q=80&w=800",
    "resource_url": "https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?auto=format&fit=crop&q=80&w=1200",
    "is_published": true,
    "is_verified": true,
    "created_by": "demo@primeautodetail.com",
    "created_at": "2026-07-20T10:00:00.000Z"
  },
  {
    "id": "demo-blog-2",
    "title": "Winter Prep: Protecting Your Ride",
    "description": "Winter is tough on cars. From road salt to freezing temperatures, your clear coat takes a beating. Learn our top 5 tips for preparing your vehicle for the cold months, including undercarriage washes and sealant applications.",
    "category": "General",
    "type": "article",
    "thumbnail_url": "https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=800",
    "resource_url": "https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=1200",
    "is_published": true,
    "is_verified": true,
    "created_by": "demo@primeautodetail.com",
    "created_at": "2026-07-25T14:30:00.000Z"
  }
];

export const MOCK_COUPONS = [
  {
    "id": "coup-1",
    "code": "WELCOME10",
    "title": "Welcome Discount",
    "percent": 10,
    "usesLeft": 9999,
    "active": true,
    "start": "2026-06-30T04:17:29.827Z"
  },
  {
    "id": "coup-2",
    "code": "SPRING50",
    "title": "Spring Special",
    "amount": 50,
    "usesLeft": 5,
    "active": true,
    "start": "2026-07-20T04:17:29.827Z"
  },
  {
    "id": "coup-3",
    "code": "CERAMIC20",
    "title": "Ceramic Coating Prep",
    "percent": 20,
    "usesLeft": 2,
    "active": true,
    "start": "2026-07-25T04:17:29.827Z"
  }
];

export const MOCK_PDF_RECORDS = [
  {
    "id": "pdf-1",
    "file_name": "Invoice_Sarah_Johnson.pdf",
    "record_type": "Invoice",
    "customer_name": "Sarah Johnson",
    "date": "2026-07-27T04:17:29.827Z",
    "timestamp": 1785125849827,
    "record_id": "demo-inv-2",
    "pdf_data": "JVBERi0xLjcK",
    "path": null
  },
  {
    "id": "pdf-2",
    "file_name": "Estimate_Michael_Chen.pdf",
    "record_type": "Estimate",
    "customer_name": "Michael Chen",
    "date": "2026-07-20T04:17:29.827Z",
    "timestamp": 1784521049827,
    "record_id": "est-1",
    "pdf_data": "JVBERi0xLjcK",
    "path": null
  },
  {
    "id": "pdf-3",
    "file_name": "Employee_Handbook.pdf",
    "record_type": "Employee Training",
    "customer_name": "Alex Admin",
    "date": "2026-06-30T04:17:29.827Z",
    "timestamp": 1782793049827,
    "record_id": "handbook",
    "pdf_data": "JVBERi0xLjcK",
    "path": null
  },
  {
    "id": "pdf-4",
    "file_name": "Vehicle_Inspection_Ford_Lightning.pdf",
    "record_type": "Vehicle History",
    "customer_name": "Sarah Johnson",
    "date": "2026-07-27T04:17:29.827Z",
    "timestamp": 1785125849827,
    "record_id": "insp-1",
    "pdf_data": "JVBERi0xLjcK",
    "path": null
  },
  {
    "id": "pdf-5",
    "file_name": "Tax_Report_Q2.pdf",
    "record_type": "Admin Updates",
    "customer_name": "Internal",
    "date": "2026-07-15T04:17:29.827Z",
    "timestamp": 1784089049827,
    "record_id": "tax-1",
    "pdf_data": "JVBERi0xLjcK",
    "path": null
  },
  {
    "id": "pdf-6",
    "file_name": "Checklist_John_Smith.pdf",
    "record_type": "Checklist",
    "customer_name": "John Smith",
    "date": "2026-07-30T04:17:29.827Z",
    "timestamp": 1785385049827,
    "record_id": "chk-1",
    "pdf_data": "JVBERi0xLjcK",
    "path": null
  },
  {
    "id": "pdf-7",
    "file_name": "JobCard_Michael_Chen.pdf",
    "record_type": "Job",
    "customer_name": "Michael Chen",
    "date": "2026-07-25T04:17:29.827Z",
    "timestamp": 1784953049827,
    "record_id": "job-1",
    "pdf_data": "JVBERi0xLjcK",
    "path": null
  }
];

export const MOCK_NOTEBOOKS = [
  {
    "id": "nb-1",
    "user_id": "demo-visitor",
    "name": "Detailing Procedures",
    "created_at": "2026-06-30T04:17:29.827Z"
  },
  {
    "id": "nb-2",
    "user_id": "demo-visitor",
    "name": "Admin Notes",
    "created_at": "2026-07-10T04:17:29.827Z"
  },
  {
    "id": "nb-3",
    "user_id": "demo-visitor",
    "name": "Marketing Ideas",
    "created_at": "2026-07-20T04:17:29.827Z"
  }
];

export const MOCK_SECTIONS = [
  {
    "id": "sec-1",
    "notebook_id": "nb-1",
    "user_id": "demo-visitor",
    "name": "Exterior",
    "created_at": "2026-06-30T04:17:29.827Z"
  },
  {
    "id": "sec-2",
    "notebook_id": "nb-1",
    "user_id": "demo-visitor",
    "name": "Interior",
    "created_at": "2026-07-01T04:17:29.827Z"
  },
  {
    "id": "sec-3",
    "notebook_id": "nb-2",
    "user_id": "demo-visitor",
    "name": "Payroll Info",
    "created_at": "2026-07-10T04:17:29.827Z"
  }
];

export const MOCK_NOTES = [
  {
    "id": "note-1",
    "section_id": "sec-1",
    "user_id": "demo-visitor",
    "title": "Paint Correction Steps",
    "content": "1. Decon\n2. Clay\n3. Polish\n4. Protect\n\nUse CarPro Reload after polish.",
    "is_pinned": true,
    "is_locked": false,
    "tags": [
      "paint",
      "exterior"
    ],
    "created_at": "2026-06-30T04:17:29.827Z",
    "updated_at": "2026-06-30T04:17:29.827Z"
  },
  {
    "id": "note-2",
    "section_id": null,
    "user_id": "demo-visitor",
    "title": "Quick Reminder",
    "content": "Call John Smith about his Tesla appointment tomorrow.",
    "is_pinned": false,
    "is_locked": false,
    "tags": [
      "reminder"
    ],
    "created_at": "2026-07-29T04:17:29.827Z",
    "updated_at": "2026-07-29T04:17:29.827Z"
  },
  {
    "id": "note-3",
    "section_id": "sec-2",
    "user_id": "demo-visitor",
    "title": "Stain Removal Recipe",
    "content": "Mix APC 10:1 with warm water. Steam extract if necessary.",
    "is_pinned": false,
    "is_locked": false,
    "tags": [
      "interior",
      "stains"
    ],
    "created_at": "2026-07-05T04:17:29.827Z",
    "updated_at": "2026-07-05T04:17:29.827Z"
  }
];

export const MOCK_LEARNING_LIBRARY = [
  {
    "id": "learn-1",
    "title": "Proper Two-Bucket Wash Method",
    "category": "Training Video",
    "type": "video",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "description": "Step by step guide to washing without scratching.",
    "created_at": "2026-06-30T04:17:29.827Z"
  },
  {
    "id": "learn-2",
    "title": "Employee Onboarding Form",
    "category": "Form",
    "type": "form",
    "url": "#",
    "description": "Standard onboarding checklist for new detailers.",
    "created_at": "2026-07-05T04:17:29.827Z"
  },
  {
    "id": "learn-3",
    "title": "Ceramic Coating Prep Exam",
    "category": "Exam",
    "type": "exam",
    "url": "#",
    "description": "Test your knowledge before applying 9H coatings.",
    "created_at": "2026-07-10T04:17:29.827Z"
  },
  {
    "id": "learn-4",
    "title": "Interior Steam Cleaning Basics",
    "category": "Training Video",
    "type": "video",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "description": "How to safely use a steam cleaner on leather and plastics.",
    "created_at": "2026-07-15T04:17:29.827Z"
  },
  {
    "id": "learn-5",
    "title": "Chemical Dilution Guide",
    "category": "Document",
    "type": "document",
    "url": "#",
    "description": "Reference sheet for diluting APC and degreasers.",
    "created_at": "2026-07-20T04:17:29.827Z"
  },
  {
    "id": "learn-6",
    "title": "Polishing Pad Selection",
    "category": "Training Video",
    "type": "video",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "description": "Choosing between microfiber, wool, and foam pads.",
    "created_at": "2026-07-25T04:17:29.827Z"
  },
  {
    "id": "learn-7",
    "title": "Customer Service Scripts",
    "category": "Document",
    "type": "document",
    "url": "#",
    "description": "How to upsell ceramic coatings over the phone.",
    "created_at": "2026-07-28T04:17:29.827Z"
  },
  {
    "id": "learn-8",
    "title": "Safety & PPE Exam",
    "category": "Exam",
    "type": "exam",
    "url": "#",
    "description": "Mandatory exam on wearing gloves and respirators.",
    "created_at": "2026-07-29T04:17:29.827Z"
  }
];

export const MOCK_MILEAGE = [
  {
    "id": "mile-1",
    "date": "2026-07-30T04:17:29.827Z",
    "vehicle": "Mobile Unit 1",
    "startMiles": 15000,
    "endMiles": 15045,
    "totalMiles": 45,
    "purpose": "Client visits - Springfield route",
    "created_at": "2026-07-30T04:17:29.827Z"
  },
  {
    "id": "mile-2",
    "date": "2026-07-29T04:17:29.827Z",
    "vehicle": "Mobile Unit 2",
    "startMiles": 22000,
    "endMiles": 22060,
    "totalMiles": 60,
    "purpose": "Supply run & Mobile details",
    "created_at": "2026-07-29T04:17:29.827Z"
  },
  {
    "id": "mile-3",
    "date": "2026-07-28T04:17:29.827Z",
    "vehicle": "Mobile Unit 1",
    "startMiles": 14920,
    "endMiles": 15000,
    "totalMiles": 80,
    "purpose": "Out of town corporate fleet job",
    "created_at": "2026-07-28T04:17:29.827Z"
  }
];

