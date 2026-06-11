const fs = require('fs');
let content = fs.readFileSync('src/pages/Invoicing.tsx', 'utf8');

// 1. Add state for adjustment and edit discount
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
      ? [...editServices, { name: "Adjusted", price: -Math.abs(editAdjustmentAmount) }] 
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
content = content.replace(
    /const saveEditedInvoice = async \(\) => \{[\s\S]*?const updated: Invoice = \{[\s\S]*?\};\s*(?:if \(updated\.paidAmount[\s\S]*?\}\s*)?try \{/m,
    "const saveEditedInvoice = async () => {\n    if (!selectedInvoice) return;\n    const updated = buildCurrentEditedInvoice();\n\n    try {"
);

// 4. Update handleEditInvoice
const handle_edit_old = `    const services = Array.isArray(inv.services) ? [...inv.services] : [];
    setEditServices(services);
    setEditVehicle(resolvedVehicle);`;
const handle_edit_new = `    const services = Array.isArray(inv.services) ? [...inv.services] : [];
    const adjIdx = services.findIndex(s => s.name === "Adjusted");
    if (adjIdx >= 0) {
      setEditAdjustmentAmount(Math.abs(services[adjIdx].price));
      services.splice(adjIdx, 1);
    } else {
      setEditAdjustmentAmount(0);
    }
    setEditServices(services);
    setEditVehicle(resolvedVehicle);`;

content = content.replace(handle_edit_old, handle_edit_new);

// 5. Update the preview buttons to use buildCurrentEditedInvoice
content = content.replace(
    /const currentInv = \{[\s\S]*?serviceDate:\s*serviceDate\s*\};\s*generatePDF/g,
    "const currentInv = buildCurrentEditedInvoice();\n                        generatePDF"
);
content = content.replace(
    /const currentInv = \{[\s\S]*?serviceDate:\s*serviceDate\s*\};\s*openEmailModal/g,
    "const currentInv = buildCurrentEditedInvoice();\n                        openEmailModal"
);

// 6. UI insertion for Apply Discount + Adjustment
const subtotal_old = `                  <div className="flex justify-between items-center px-2">
                     <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Subtotal Owed</span>
                     <span className="text-xl font-bold text-emerald-500">\${editServices.reduce((sum, s) => sum + s.price, 0).toFixed(2)}</span>
                  </div>`;

const ui_new_code = `                  <div className="flex justify-between items-center px-2">
                     <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Subtotal</span>
                     <span className="text-xl font-bold text-emerald-500">\${editServices.reduce((sum, s) => sum + s.price, 0).toFixed(2)}</span>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Apply Discount</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Select 
                        value={editDiscountMethod} 
                        onValueChange={(val: 'coupon' | 'custom') => {
                          setEditDiscountMethod(val);
                          if (val === 'coupon') {
                            const first = coupons.find(c => c.active)?.code || '';
                            setEditDiscountCode(first);
                            const matched = coupons.find(c => c.code === first);
                            if (matched) {
                              setEditDiscountType(matched.percent ? 'percent' : 'fixed');
                              setEditDiscountValue(matched.percent || matched.amount || 0);
                            }
                          } else {
                            setEditDiscountCode('');
                            setEditDiscountType('fixed');
                            setEditDiscountValue(0);
                          }
                        }}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="coupon">Coupon</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>

                      {editDiscountMethod === 'coupon' ? (
                        <div className="col-span-2">
                          <Select
                            value={(editDiscountCode && coupons.some(c => c.code === editDiscountCode)) ? editDiscountCode : (editDiscountCode ? 'CUSTOM_CODE' : '')}
                            onValueChange={(val) => {
                              if (val === 'CUSTOM_CODE') {
                                setEditDiscountCode('CUSTOM');
                                setEditDiscountType('fixed');
                                setEditDiscountValue(0);
                              } else {
                                setEditDiscountCode(val);
                                const matched = coupons.find(c => c.code === val);
                                if (matched) {
                                  setEditDiscountType(matched.percent ? 'percent' : 'fixed');
                                  setEditDiscountValue(matched.percent || matched.amount || 0);
                                }
                              }
                            }}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                              <SelectValue placeholder="Select Coupon..." />
                            </SelectTrigger>
                            <SelectContent>
                              {coupons.filter(c => c.active).map(c => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.code} ({c.percent ? \`\${c.percent}% Off\` : \`\$\${c.amount} Off\`})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="col-span-2 flex gap-2">
                          <Select 
                            value={editDiscountType} 
                            onValueChange={(val: 'percent' | 'fixed') => setEditDiscountType(val)}>
                            <SelectTrigger className="w-24 bg-zinc-950 border-zinc-800 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percent">%</SelectItem>
                              <SelectItem value="fixed">$</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            className="bg-zinc-950 border-zinc-800 h-9 text-right font-mono"
                            placeholder="0.00"
                            value={editDiscountValue || ''}
                            onChange={e => setEditDiscountValue(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {editDiscountValue > 0 && (
                    <div className="flex justify-between items-center px-2 text-sm text-red-400 font-medium">
                      <span>Discount</span>
                      <span className="font-mono">
                        -\${(editDiscountType === 'percent' 
                          ? editServices.reduce((sum, s) => sum + s.price, 0) * (editDiscountValue / 100) 
                          : editDiscountValue).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <Label className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Adjustment</Label>
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
                  </div>

                  {editAdjustmentAmount > 0 && (
                    <div className="flex justify-between items-center px-2 text-sm text-red-400 font-medium">
                      <span>Adjusted</span>
                      <span className="font-mono">
                        -\${editAdjustmentAmount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center px-2 mt-2 pt-2 border-t border-zinc-800/50">
                     <span className="text-sm text-zinc-200 font-bold uppercase tracking-wider">Total Owed</span>
                     <span className="text-2xl font-black text-emerald-400">\${Math.max(0, editServices.reduce((sum, s) => sum + s.price, 0) - (editDiscountType === 'percent' ? editServices.reduce((sum, s) => sum + s.price, 0) * (editDiscountValue / 100) : editDiscountValue) - editAdjustmentAmount).toFixed(2)}</span>
                  </div>`;

if (content.includes(subtotal_old)) {
  content = content.replace(subtotal_old, ui_new_code);
  console.log("UI insertion success!");
} else {
  console.log("Could not find subtotal_old!");
}

fs.writeFileSync('src/pages/Invoicing.tsx', content);
console.log("done");
