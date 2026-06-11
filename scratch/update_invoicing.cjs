const fs = require('fs');
let content = fs.readFileSync('src/pages/Invoicing.tsx', 'utf8');

// 1. Add state
content = content.replace(
    "const [editDiscountValue, setEditDiscountValue] = useState(0);",
    "const [editDiscountValue, setEditDiscountValue] = useState(0);\n  const [editAdjustmentAmount, setEditAdjustmentAmount] = useState(0);"
);

// 2. Add buildCurrentEditedInvoice
const build_func = `
  const buildCurrentEditedInvoice = (): Invoice => {
    if (!selectedInvoice) return {} as Invoice;
    const subtotal = editServices.reduce((sum, s) => sum + s.price, 0);
    const finalDiscountAmount = editDiscountType === 'percent'
      ? subtotal * (editDiscountValue / 100)
      : editDiscountValue;

    let newTotal = subtotal - finalDiscountAmount - editAdjustmentAmount;
    if (newTotal < 0) newTotal = 0;

    const finalServices = editAdjustmentAmount > 0 
      ? [...editServices, { name: "Adjusted Price", price: -Math.abs(editAdjustmentAmount) }] 
      : editServices;

    const updated: Invoice = { 
      ...selectedInvoice, 
      services: finalServices, 
      vehicle: editVehicle,
      notes: editNotes,
      isSent: editIsSent,
      sentDate: editIsSent && !selectedInvoice.isSent ? new Date().toISOString() : selectedInvoice.sentDate,
      serviceDate: serviceDate,
      total: newTotal,
      discount: finalDiscountAmount > 0 ? {
        type: editDiscountType,
        value: editDiscountValue,
        amount: finalDiscountAmount
      } : undefined
    };

    if (updated.paidAmount && updated.paidAmount >= newTotal) {
      updated.paymentStatus = "paid";
    } else if (updated.paidAmount && updated.paidAmount > 0) {
      updated.paymentStatus = "partially-paid";
    } else if (newTotal === 0) {
      updated.paymentStatus = "paid";
    } else {
      updated.paymentStatus = "unpaid";
    }
    
    return updated;
  };
`;

content = content.replace(
    "const saveEditedInvoice = async () => {",
    build_func + "\n  const saveEditedInvoice = async () => {"
);

// 3. Update saveEditedInvoice
const old_save = `  const saveEditedInvoice = async () => {
    if (!selectedInvoice) return;
    const subtotal = editServices.reduce((sum, s) => sum + s.price, 0);
    
    const finalDiscountAmount = editDiscountType === 'percent'
      ? subtotal * (editDiscountValue / 100)
      : editDiscountValue;

    let newTotal = subtotal - finalDiscountAmount;
    if (newTotal < 0) newTotal = 0;

    const updated: Invoice = { 
      ...selectedInvoice, 
      services: editServices, 
      vehicle: editVehicle,
      notes: editNotes,
      isSent: editIsSent,
      sentDate: editIsSent && !selectedInvoice.isSent ? new Date().toISOString() : selectedInvoice.sentDate,
      serviceDate: serviceDate,
      total: newTotal,
      discount: finalDiscountAmount > 0 ? {
        type: editDiscountType,
        value: editDiscountValue,
        amount: finalDiscountAmount
      } : undefined
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

const new_save = `  const saveEditedInvoice = async () => {
    if (!selectedInvoice) return;
    const updated = buildCurrentEditedInvoice();`;

content = content.replace(old_save, new_save);

// 4. Update handleEditInvoice
const handle_edit_old = `    const services = Array.isArray(inv.services) ? [...inv.services] : [];
    setEditServices(services);
    setEditVehicle(resolvedVehicle);`;
const handle_edit_new = `    const services = Array.isArray(inv.services) ? [...inv.services] : [];
    const adjIdx = services.findIndex(s => s.name === "Adjusted Price");
    if (adjIdx >= 0) {
      setEditAdjustmentAmount(Math.abs(services[adjIdx].price));
      services.splice(adjIdx, 1);
    } else {
      setEditAdjustmentAmount(0);
    }
    setEditServices(services);
    setEditVehicle(resolvedVehicle);`;

content = content.replace(handle_edit_old, handle_edit_new);

// 5. Update the 4 preview buttons
content = content.replace(
    /const currentInv = \{[\s\S]*?total:\s*Math\.max[\s\S]*?\};\s*generatePDF/g,
    "const currentInv = buildCurrentEditedInvoice();\n                        generatePDF"
);
content = content.replace(
    /const currentInv = \{[\s\S]*?total:\s*Math\.max[\s\S]*?\};\s*openEmailModal/g,
    "const currentInv = buildCurrentEditedInvoice();\n                        openEmailModal"
);

// 6. UI calculation update
const total_owed_old = `<span className="text-2xl font-black text-emerald-400">\${Math.max(0, editServices.reduce((sum, s) => sum + s.price, 0) - (editDiscountType === 'percent' ? editServices.reduce((sum, s) => sum + s.price, 0) * (editDiscountValue / 100) : editDiscountValue)).toFixed(2)}</span>`;
const total_owed_new = `<span className="text-2xl font-black text-emerald-400">\${Math.max(0, editServices.reduce((sum, s) => sum + s.price, 0) - (editDiscountType === 'percent' ? editServices.reduce((sum, s) => sum + s.price, 0) * (editDiscountValue / 100) : editDiscountValue) - editAdjustmentAmount).toFixed(2)}</span>`;

content = content.replace(total_owed_old, total_owed_new);

// 7. Insert the UI component
const ui_insert_point = `                  {editDiscountValue > 0 && (
                    <div className="flex justify-between items-center px-2 text-sm text-red-400 font-medium">
                      <span>Discount</span>
                      <span className="font-mono">
                        -\${(editDiscountType === 'percent' 
                          ? editServices.reduce((sum, s) => sum + s.price, 0) * (editDiscountValue / 100) 
                          : editDiscountValue).toFixed(2)}
                      </span>
                    </div>
                  )}`;

const ui_new_code = ui_insert_point + `
                  
                  {editAdjustmentAmount > 0 && (
                    <div className="flex justify-between items-center px-2 text-sm text-red-400 font-medium">
                      <span>Adjusted Price</span>
                      <span className="font-mono">
                        -\${editAdjustmentAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Adjusted Price</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-xs">-$</span>
                      <Input
                        type="number"
                        value={editAdjustmentAmount || ''}
                        onChange={e => setEditAdjustmentAmount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-900 border-zinc-800 text-sm h-9 text-right font-mono focus-visible:ring-0 px-2"
                        placeholder="0.00"
                      />
                    </div>
                  </div>`;

content = content.replace(ui_insert_point, ui_new_code);

fs.writeFileSync('src/pages/Invoicing.tsx', content);
console.log("done");
