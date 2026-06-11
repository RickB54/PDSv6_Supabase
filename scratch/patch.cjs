const fs = require('fs');
let content = fs.readFileSync('src/pages/Invoicing.tsx', 'utf-8');

const target1 = `  const [serviceCategory, setServiceCategory] = useState<"package" | "addon" | "custom">("custom");
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editServices, setEditServices] = useState<{ name: string; price: number }[]>([]);`;

const repl1 = `  const [serviceCategory, setServiceCategory] = useState<"package" | "addon" | "custom">("custom");
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editServices, setEditServices] = useState<{ name: string; price: number }[]>([]);
  const [editDiscountMethod, setEditDiscountMethod] = useState<"coupon" | "custom">("custom");
  const [editDiscountCode, setEditDiscountCode] = useState("");
  const [editDiscountType, setEditDiscountType] = useState<"percent" | "fixed">("percent");
  const [editDiscountValue, setEditDiscountValue] = useState<number>(0);
  const [editAdjustmentAmount, setEditAdjustmentAmount] = useState<number>(0);`;

if (!content.includes(target1)) {
    console.error('Chunk 1 not found');
    process.exit(1);
}
content = content.replace(target1, repl1);

const target2 = `  const handleEditInvoice = (inv: Invoice) => {
    // Fallback to customer's vehicle if invoice vehicle is missing or 'Unknown'
    let resolvedVehicle = inv.vehicle || "";
    if (!resolvedVehicle || resolvedVehicle === "Unknown" || resolvedVehicle === "Unknown Vehicle") {
      const cust = customers.find(c => c.id === inv.customerId);
      if (cust) {
        resolvedVehicle = \`\${cust.year || ''} \${cust.vehicle || ''} \${cust.model || ''}\`.trim();
      }
    }
    if (!resolvedVehicle) resolvedVehicle = "Unknown";

    const enrichedInv = { ...inv, vehicle: resolvedVehicle };
    setSelectedInvoice(enrichedInv);
    const services = Array.isArray(inv.services) ? [...inv.services] : [];
    setEditServices(services);
    setEditVehicle(resolvedVehicle);
    setEditNotes(inv.notes || "");
    setEditIsSent(inv.isSent || false);
    setServiceDate(inv.serviceDate || inv.date || new Date().toISOString().split('T')[0]);
    setIsEditingInvoice(true);
  };`;

const repl2 = `  const handleEditInvoice = (inv: Invoice) => {
    // Fallback to customer's vehicle if invoice vehicle is missing or 'Unknown'
    let resolvedVehicle = inv.vehicle || "";
    if (!resolvedVehicle || resolvedVehicle === "Unknown" || resolvedVehicle === "Unknown Vehicle") {
      const cust = customers.find(c => c.id === inv.customerId);
      if (cust) {
        resolvedVehicle = \`\${cust.year || ''} \${cust.vehicle || ''} \${cust.model || ''}\`.trim();
      }
    }
    if (!resolvedVehicle) resolvedVehicle = "Unknown";

    const enrichedInv = { ...inv, vehicle: resolvedVehicle };
    setSelectedInvoice(enrichedInv);
    
    // Extract adjustment amount from services
    let adjAmount = 0;
    const services = Array.isArray(inv.services) ? inv.services.filter(s => {
      if (s.name === "Adjusted") {
        adjAmount = Math.abs(s.price);
        return false;
      }
      return true;
    }) : [];
    
    setEditServices(services);
    setEditAdjustmentAmount(adjAmount);
    
    if (inv.discount) {
      setEditDiscountMethod(inv.discount.type === 'percent' || inv.discount.type === 'fixed' ? 'custom' : 'custom'); 
      setEditDiscountType(inv.discount.type);
      setEditDiscountValue(inv.discount.value);
    } else {
      setEditDiscountMethod('custom');
      setEditDiscountType('percent');
      setEditDiscountValue(0);
      setEditDiscountCode('');
    }

    setEditVehicle(resolvedVehicle);
    setEditNotes(inv.notes || "");
    setEditIsSent(inv.isSent || false);
    setServiceDate(inv.serviceDate || inv.date || new Date().toISOString().split('T')[0]);
    setIsEditingInvoice(true);
  };`;

if (!content.includes(target2)) {
    console.error('Chunk 2 not found');
    process.exit(1);
}
content = content.replace(target2, repl2);

const target3 = `  const saveEditedInvoice = async () => {
    if (!selectedInvoice) return;
    const subtotal = editServices.reduce((sum, s) => sum + s.price, 0);
    let newTotal = subtotal;
    if (selectedInvoice.discount) {
      newTotal -= selectedInvoice.discount.amount;
    }
    if (newTotal < 0) newTotal = 0;

    const updated: Invoice = { 
      ...selectedInvoice, 
      services: editServices, 
      vehicle: editVehicle,
      notes: editNotes,
      isSent: editIsSent,
      sentDate: editIsSent && !selectedInvoice.isSent ? new Date().toISOString() : selectedInvoice.sentDate,
      serviceDate: serviceDate,
      total: newTotal 
    };
    
    // Auto-update status if total changed
    if (updated.paidAmount && updated.paidAmount >= newTotal) {
      updated.paymentStatus = "paid";
    } else if (updated.paidAmount && updated.paidAmount > 0) {
      updated.paymentStatus = "partially-paid";
    } else if (newTotal === 0) {
      updated.paymentStatus = "paid";
    } else {
      updated.paymentStatus = "unpaid";
    }`;

const repl3 = `  const saveEditedInvoice = async () => {
    if (!selectedInvoice) return;
    const updated = buildCurrentEditedInvoice();`;

if (!content.includes(target3)) {
    console.error('Chunk 3 not found');
    process.exit(1);
}
content = content.replace(target3, repl3);

fs.writeFileSync('src/pages/Invoicing.tsx', content, 'utf-8');
console.log('Success');
