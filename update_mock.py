import os
import json

MOCK_DATA_TS = """
// Centralized Mock Data for Demo Mode 
// Used by supa-data.ts when isDemoActive() is true

const IS_DEMO = true;

// -------------------------------------------------------------
// Core Shared Entities
// -------------------------------------------------------------
export const MOCK_CUSTOMERS = [
  { id: 'cust_1', name: 'John Smith', email: 'john.smith@example.com', phone: '555-0101', status: 'Active', created_at: '2023-01-15T10:00:00Z', total_spent: 1250, lifetime_visits: 4, type: 'Retail' },
  { id: 'cust_2', name: 'Sarah Johnson', email: 'sarah.j@example.com', phone: '555-0102', status: 'Active', created_at: '2023-03-22T14:30:00Z', total_spent: 3400, lifetime_visits: 8, type: 'VIP' },
  { id: 'cust_3', name: 'Mike Miller', email: 'mike.miller@example.com', phone: '555-0103', status: 'Active', created_at: '2023-06-10T09:15:00Z', total_spent: 850, lifetime_visits: 2, type: 'Retail' },
  { id: 'cust_4', name: 'Emily Davis', email: 'emily.d@example.com', phone: '555-0104', status: 'Active', created_at: '2023-08-05T16:45:00Z', total_spent: 2100, lifetime_visits: 5, type: 'Retail' },
  { id: 'cust_5', name: 'Robert Chen', email: 'robert.chen@example.com', phone: '555-0105', status: 'Active', created_at: '2023-11-12T11:20:00Z', total_spent: 5600, lifetime_visits: 12, type: 'Fleet' }
];

export const MOCK_PROSPECTS = [
  { id: 'pros_1', name: 'Amanda White', email: 'amanda.w@example.com', phone: '555-0201', vehicle: '2023 Tesla Model Y', status: 'Hot', interest: 'Ceramic Coating', last_contact: '2024-05-10T10:00:00Z', follow_up_date: '2024-05-15T10:00:00Z', notes: 'Wants 5-year coating.' },
  { id: 'pros_2', name: 'David Lee', email: 'david.lee@example.com', phone: '555-0202', vehicle: '2020 Ford F-150', status: 'Warm', interest: 'Interior Detail', last_contact: '2024-05-08T14:30:00Z', follow_up_date: '2024-05-12T14:30:00Z', notes: 'Waiting for paycheck.' },
  { id: 'pros_3', name: 'Lisa Taylor', email: 'lisa.t@example.com', phone: '555-0203', vehicle: '2022 BMW 330i', status: 'Cold', interest: 'Paint Correction', last_contact: '2024-04-20T09:15:00Z', follow_up_date: '2024-06-01T09:15:00Z', notes: 'Decided to wait.' }
];

export const MOCK_EMPLOYEES = [
  { id: 'emp_1', full_name: 'Alex Admin', role: 'admin', type: 'W-2', status: 'Active', pay_rate: 25.00, hire_date: '2021-01-10T00:00:00Z' },
  { id: 'emp_2', full_name: 'Sam Staff', role: 'staff', type: '1099', status: 'Active', pay_rate: 35.00, hire_date: '2022-03-15T00:00:00Z', commission_rate: 40 },
  { id: 'emp_3', full_name: 'Taylor Tech', role: 'staff', type: 'W-2', status: 'Active', pay_rate: 20.00, hire_date: '2023-06-01T00:00:00Z', commission_rate: 30 }
];

export const MOCK_VEHICLES = [
  { id: 'veh_1', customer_id: 'cust_1', make: 'Honda', model: 'Civic', year: '2019', color: 'Silver', type: 'Sedan/Coupe' },
  { id: 'veh_2', customer_id: 'cust_2', make: 'Porsche', model: '911', year: '2022', color: 'Black', type: 'Exotic/Supercar' },
  { id: 'veh_3', customer_id: 'cust_3', make: 'Toyota', model: 'Highlander', year: '2021', color: 'White', type: 'Mid-size SUV' },
  { id: 'veh_4', customer_id: 'cust_4', make: 'Subaru', model: 'Outback', year: '2020', color: 'Green', type: 'Mid-size SUV' },
  { id: 'veh_5', customer_id: 'cust_5', make: 'Ford', model: 'F-250', year: '2023', color: 'Blue', type: 'Truck/Van/Large SUV' }
];

export const MOCK_SERVICES = [
  { id: 'svc_1', name: 'Prime Signature Detail', price: 249.99, duration: 180, category: 'Packages' },
  { id: 'svc_2', name: 'Ceramic Coating (5-Year)', price: 999.99, duration: 480, category: 'Ceramics' },
  { id: 'svc_3', name: 'Interior Deep Clean', price: 149.99, duration: 120, category: 'Interior' }
];

// -------------------------------------------------------------
// Transactional Data
// -------------------------------------------------------------
export const MOCK_BOOKINGS = [
  { id: 'bk_1', date: '2024-05-11', time: '09:00', status: 'Confirmed', customer_name: 'John Smith', customer_phone: '555-0101', customer_email: 'john.smith@example.com', service: 'Prime Signature Detail', package_price: 249.99, vehicle: '2019 Honda Civic', add_ons: 'Pet Hair Removal', location: '123 Main St' },
  { id: 'bk_2', date: '2024-05-12', time: '13:00', status: 'Pending', customer_name: 'Sarah Johnson', customer_phone: '555-0102', customer_email: 'sarah.j@example.com', service: 'Ceramic Coating (5-Year)', package_price: 999.99, vehicle: '2022 Porsche 911', add_ons: 'Wheel Coating', location: 'Drop-off' },
  { id: 'bk_3', date: '2024-05-13', time: '10:00', status: 'Confirmed', customer_name: 'Mike Miller', customer_phone: '555-0103', customer_email: 'mike.miller@example.com', service: 'Interior Deep Clean', package_price: 149.99, vehicle: '2021 Toyota Highlander', add_ons: '', location: '456 Oak Ave' },
  { id: 'bk_4', date: '2024-05-14', time: '08:30', status: 'Completed', customer_name: 'Emily Davis', customer_phone: '555-0104', customer_email: 'emily.d@example.com', service: 'Prime Signature Detail', package_price: 249.99, vehicle: '2020 Subaru Outback', add_ons: 'Ozone Treatment', location: 'Drop-off' }
];

export const MOCK_INVOICES = [
  { id: 'inv_1', invoiceNumber: '1001', customerName: 'John Smith', customerEmail: 'john.smith@example.com', serviceDate: '2024-05-01', total: 299.99, status: 'paid', service: 'Prime Signature Detail', vehicle: '2019 Honda Civic', hoursWorked: 3, productCost: 25 },
  { id: 'inv_2', invoiceNumber: '1002', customerName: 'Sarah Johnson', customerEmail: 'sarah.j@example.com', serviceDate: '2024-05-03', total: 1199.99, status: 'paid', service: 'Ceramic Coating (5-Year)', vehicle: '2022 Porsche 911', hoursWorked: 8, productCost: 150 },
  { id: 'inv_3', invoiceNumber: '1003', customerName: 'Emily Davis', customerEmail: 'emily.d@example.com', serviceDate: '2024-05-05', total: 249.99, status: 'pending', service: 'Prime Signature Detail', vehicle: '2020 Subaru Outback', hoursWorked: 2.5, productCost: 20 },
  { id: 'inv_4', invoiceNumber: '1004', customerName: 'Robert Chen', customerEmail: 'robert.chen@example.com', serviceDate: '2024-05-07', total: 599.99, status: 'paid', service: 'Fleet Wash & Detail', vehicle: '2023 Ford F-250', hoursWorked: 5, productCost: 50 }
];

export const MOCK_ESTIMATES = [
  { id: 'est_1', estimateNumber: 'EST-1001', customerName: 'David Lee', customerEmail: 'david.lee@example.com', date: '2024-05-08', total: 450.00, status: 'pending', service: 'Interior Detail + Paint Correction', vehicle: '2020 Ford F-150', validUntil: '2024-06-08' },
  { id: 'est_2', estimateNumber: 'EST-1002', customerName: 'Lisa Taylor', customerEmail: 'lisa.t@example.com', date: '2024-05-09', total: 899.99, status: 'approved', service: 'Ceramic Coating', vehicle: '2022 BMW 330i', validUntil: '2024-06-09' }
];

// -------------------------------------------------------------
// CRM & Tasks
// -------------------------------------------------------------
export const MOCK_TASKS = [
  { id: 'tsk_1', title: 'Order Microfiber Towels', description: 'Need 500 GSM edgeless towels from Rag Company.', status: 'pending', due_date: '2024-05-15', priority: 'high', assigned_to: 'emp_1' },
  { id: 'tsk_2', title: 'Follow up with Sarah Johnson', description: 'Check on ceramic coating curing process.', status: 'completed', due_date: '2024-05-10', priority: 'medium', assigned_to: 'emp_2' },
  { id: 'tsk_3', title: 'Update Quickbooks', description: 'Reconcile April expenses.', status: 'pending', due_date: '2024-05-20', priority: 'low', assigned_to: 'emp_1' }
];

export const MOCK_ENGAGEMENTS = [
  { id: 'eng_1', customer_name: 'John Smith', customer_phone: '555-0101', type: 'call', notes: 'Called to confirm appointment for tomorrow.', date: '2024-05-10T14:00:00Z', status: 'completed' },
  { id: 'eng_2', customer_name: 'Amanda White', customer_phone: '555-0201', type: 'email', notes: 'Sent quote for ceramic coating.', date: '2024-05-09T10:30:00Z', status: 'completed' },
  { id: 'eng_3', customer_name: 'David Lee', customer_phone: '555-0202', type: 'text', notes: 'Texted reminder about estimate.', date: '2024-05-11T09:00:00Z', status: 'pending' }
];

export const MOCK_STICKY_NOTES = {
  notebooks: [{ id: 'nb_1', user_id: 'demo', name: 'General', created_at: '2024-01-01T00:00:00Z' }],
  sections: [{ id: 'sec_1', notebook_id: 'nb_1', user_id: 'demo', name: 'Follow-ups', created_at: '2024-01-01T00:00:00Z' }],
  notes: [
    { id: 'note_1', section_id: 'sec_1', user_id: 'demo', title: 'Call Sarah Johnson back', content: 'She wanted to know about ceramic coating prices for her husband\\'s car.', is_pinned: true, tags: ['__color:yellow__'], created_at: '2024-05-10T00:00:00Z', updated_at: '2024-05-10T00:00:00Z' },
    { id: 'note_2', section_id: 'sec_1', user_id: 'demo', title: 'Order supplies', content: 'We need more APC and Iron Remover.', is_pinned: false, tags: ['__color:blue__'], created_at: '2024-05-11T00:00:00Z', updated_at: '2024-05-11T00:00:00Z' }
  ]
};

// -------------------------------------------------------------
// Inventory & Materials
// -------------------------------------------------------------
export const MOCK_INVENTORY = [
  { id: 'inv_i_1', name: 'Meguiar\\'s APC', category: 'Chemicals', current_stock: 3, minimum_stock: 5, unit: 'Gallon', unit_cost: 18.99, last_reordered: '2024-04-15' },
  { id: 'inv_i_2', name: 'Gyeon Iron Remover', category: 'Chemicals', current_stock: 1, minimum_stock: 2, unit: 'Liter', unit_cost: 25.50, last_reordered: '2024-04-10' },
  { id: 'inv_i_3', name: 'Microfiber Towels (500 GSM)', category: 'Supplies', current_stock: 45, minimum_stock: 20, unit: 'Pack (10)', unit_cost: 15.00, last_reordered: '2024-03-20' },
  { id: 'inv_i_4', name: 'Rupes Yellow Pads', category: 'Pads', current_stock: 8, minimum_stock: 10, unit: 'Individual', unit_cost: 12.99, last_reordered: '2024-05-01' },
  { id: 'inv_i_5', name: 'Ceramic Coating Kit (5Yr)', category: 'Coatings', current_stock: 5, minimum_stock: 3, unit: 'Kit', unit_cost: 85.00, last_reordered: '2024-05-05' }
];

export const MOCK_CHEMICAL_LIBRARY = [
  { id: 'chem_1', name: 'All Purpose Cleaner (APC)', brand: 'Meguiar\\'s', type: 'Cleaner', dilution_ratios: '10:1 (Interior), 4:1 (Exterior)', ph_level: 10, safety_notes: 'Wear gloves. Do not let dry on paint.', tips: 'Great for tires and wheel wells.' },
  { id: 'chem_2', name: 'Iron X', brand: 'CarPro', type: 'Decontaminant', dilution_ratios: 'RTU (Ready to Use)', ph_level: 7, safety_notes: 'Strong odor. Use in well-ventilated area.', tips: 'Spray on wheels and paint before claying.' },
  { id: 'chem_3', name: 'Hyper Wash', brand: 'Meguiar\\'s', type: 'Soap', dilution_ratios: '400:1', ph_level: 7, safety_notes: 'Safe for all surfaces.', tips: 'Excellent suds in a foam cannon.' }
];

// -------------------------------------------------------------
// Learning & Gallery
// -------------------------------------------------------------
export const MOCK_GALLERY = [
  { id: 'gal_1', title: 'Porsche 911 Ceramic', description: '5-year coating applied after 2-step correction.', image_url: 'https://images.unsplash.com/photo-1503376713959-1e5f8cb4dfdc?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', before_url: null, category: 'Ceramic Coatings' },
  { id: 'gal_2', title: 'Subaru Outback Interior', description: 'Deep clean and extraction on cloth seats.', image_url: 'https://images.unsplash.com/photo-1550524410-1c3fa681f26f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', before_url: null, category: 'Interiors' },
  { id: 'gal_3', title: 'F-250 Wash & Wax', description: 'Maintenance wash and spray wax.', image_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', before_url: null, category: 'Exteriors' }
];

export const MOCK_LEARNING_LIBRARY = [
  { id: 'lrn_1', title: 'Proper Wash Techniques', description: 'Learn the two-bucket method and safe wash practices.', type: 'video', category: 'Basics', resource_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnail_url: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=500&q=80', created_at: '2024-01-10T00:00:00Z' },
  { id: 'lrn_2', title: 'Interior Detailing Guide', description: 'Comprehensive guide to interior cleaning.', type: 'pdf', category: 'Interiors', resource_url: '#', created_at: '2024-02-15T00:00:00Z' },
  { id: 'lrn_3', title: 'Ceramic Coating Application', description: 'Step-by-step coating application tutorial.', type: 'video', category: 'Advanced', resource_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnail_url: 'https://images.unsplash.com/photo-1522273400909-fd1a8f77637e?w=500&q=80', created_at: '2024-03-20T00:00:00Z' }
];

// -------------------------------------------------------------
// Financials
// -------------------------------------------------------------
export const MOCK_PAYROLL = [
  { id: 'pay_1', employee: 'Sam Staff', period_start: '2024-04-15', period_end: '2024-04-30', total_pay: 1450.00, status: 'Paid' },
  { id: 'pay_2', employee: 'Taylor Tech', period_start: '2024-04-15', period_end: '2024-04-30', total_pay: 1120.00, status: 'Paid' },
  { id: 'pay_3', employee: 'Sam Staff', period_start: '2024-05-01', period_end: '2024-05-15', total_pay: 1600.00, status: 'Pending' },
  { id: 'pay_4', employee: 'Taylor Tech', period_start: '2024-05-01', period_end: '2024-05-15', total_pay: 1250.00, status: 'Pending' }
];

export const MOCK_MILEAGE = [
  { id: 'mil_1', date: '2024-05-10', miles_driven: 45.5, purpose: 'Customer job', start_location: 'Shop', end_location: '123 Main St', is_business: true, customerName: 'John Smith' },
  { id: 'mil_2', date: '2024-05-11', miles_driven: 12.0, purpose: 'Supplies', start_location: 'Shop', end_location: 'AutoZone', is_business: true, customerName: null },
  { id: 'mil_3', date: '2024-05-12', miles_driven: 68.2, purpose: 'Customer job', start_location: 'Shop', end_location: '456 Oak Ave', is_business: true, customerName: 'Mike Miller' }
];

export const MOCK_COUPONS = [
  { id: 'coup_1', code: 'WELCOME10', title: 'New Customer 10% Off', percent: 10, usesLeft: 45, active: true },
  { id: 'coup_2', code: 'SPRING50', title: 'Spring Cleaning $50 Off', amount: 50, usesLeft: 12, active: true },
  { id: 'coup_3', code: 'VIP20', title: 'VIP Customer 20% Off', percent: 20, usesLeft: 5, active: true }
];

export const MOCK_ACCOUNTING = {
  transactions: [
    { id: 'txn_1', date: '2024-05-01', description: 'Invoice 1001 (John Smith)', amount: 299.99, type: 'Income', category: 'Services' },
    { id: 'txn_2', date: '2024-05-03', description: 'Invoice 1002 (Sarah Johnson)', amount: 1199.99, type: 'Income', category: 'Services' },
    { id: 'txn_3', date: '2024-05-04', description: 'Supplies (AutoZone)', amount: -85.50, type: 'Expense', category: 'Supplies' },
    { id: 'txn_4', date: '2024-05-05', description: 'Software Subscription', amount: -49.99, type: 'Expense', category: 'Software' },
    { id: 'txn_5', date: '2024-05-07', description: 'Invoice 1004 (Robert Chen)', amount: 599.99, type: 'Income', category: 'Services' }
  ]
};

export const MOCK_FILES = [
  { id: 'file_1', name: 'Liability Insurance 2024.pdf', size: '2.4 MB', type: 'pdf', uploaded_at: '2024-01-15T00:00:00Z', category: 'Documents' },
  { id: 'file_2', name: 'Logo_HighRes.png', size: '5.1 MB', type: 'image', uploaded_at: '2023-11-20T00:00:00Z', category: 'Marketing' },
  { id: 'file_3', name: 'Spring Flyer.pdf', size: '1.8 MB', type: 'pdf', uploaded_at: '2024-03-01T00:00:00Z', category: 'Marketing' },
  { id: 'file_4', name: 'W9_Template.pdf', size: '400 KB', type: 'pdf', uploaded_at: '2024-01-05T00:00:00Z', category: 'HR' }
];

// Re-export specific sets for legacy compatibility if needed
export const getMockData = (type: string) => {
  switch (type) {
    case 'customers': return MOCK_CUSTOMERS;
    case 'employees': return MOCK_EMPLOYEES;
    case 'bookings': return MOCK_BOOKINGS;
    case 'invoices': return MOCK_INVOICES;
    case 'estimates': return MOCK_ESTIMATES;
    case 'tasks': return MOCK_TASKS;
    case 'gallery': return MOCK_GALLERY;
    case 'learning': return MOCK_LEARNING_LIBRARY;
    case 'mileage': return MOCK_MILEAGE;
    default: return [];
  }
};
"""

with open("src/lib/demoMockData.ts", "w") as f:
    f.write(MOCK_DATA_TS)

print("demoMockData.ts updated successfully")
