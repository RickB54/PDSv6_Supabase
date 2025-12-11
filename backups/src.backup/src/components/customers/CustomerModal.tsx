import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { upsertCustomer } from "@/lib/db";
import api from "@/lib/api";
import { toast } from "sonner";

export interface Customer {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  vehicle: string;
  model: string;
  year: string;
  color: string;
  mileage: string;
  vehicleType: string;
  conditionInside: string;
  conditionOutside: string;
  services: string[];
  lastService: string;
  duration: string;
  notes: string;
  howFound?: string;
  howFoundOther?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Customer | null;
  onSave: (data: Customer) => Promise<void> | void;
}

export default function CustomerModal({ open, onOpenChange, initial, onSave }: Props) {
  const [form, setForm] = useState<Customer>({
    id: undefined,
    name: "",
    address: "",
    phone: "",
    email: "",
    vehicle: "",
    model: "",
    year: "",
    color: "",
    mileage: "",
    vehicleType: "",
    conditionInside: "",
    conditionOutside: "",
    services: [],
    lastService: "",
    duration: "",
    notes: "",
    howFound: "",
    howFoundOther: "",
  });

  useEffect(() => {
    if (initial) {
      setForm({ ...initial, services: initial.services || [] });
    } else {
      setForm({ 
        id: undefined, 
        name: "", 
        address: "",
        phone: "", 
        email: "",
        vehicle: "", 
        model: "", 
        year: "", 
        color: "",
        mileage: "",
        vehicleType: "",
        conditionInside: "",
        conditionOutside: "",
        services: [], 
        lastService: "", 
        duration: "", 
        notes: "" 
      });
    }
  }, [initial, open]);

  const handleChange = (key: keyof Customer, value: string) => {
    if (key === "services") {
      setForm((f) => ({ ...f, services: value.split(",").map((s) => s.trim()).filter(Boolean) }));
    } else {
      setForm((f) => ({ ...f, [key]: value } as Customer));
    }
  };

  const handleSubmit = async () => {
    const payload = { ...form };
    if (!payload.id) {
      payload.id = String(Date.now());
    }
    try {
      const saved = await api('/api/customers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!saved || (saved && saved.ok === false)) {
        // Fallback: save locally when backend fails or returns null
        const localSaved = await upsertCustomer(payload as any);
        onSave(localSaved as any);
        toast.success("Customer added locally (offline)");
        onOpenChange(false);
        return;
      }
      onSave(saved as any);
      toast.success("Customer added!");
      onOpenChange(false);
    } catch (err: any) {
      // Fallback: save locally when backend throws
      try {
        const localSaved = await upsertCustomer(payload as any);
        onSave(localSaved as any);
        toast.success("Customer added locally (offline)");
        onOpenChange(false);
      } catch (err2: any) {
        toast.error("Customer save failed: " + (err2?.message || String(err2)));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Customer" : "Add Customer"}</DialogTitle>
          <DialogDescription>Update customer details and service history.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehicle Make</Label>
            <Input id="vehicle" value={form.vehicle} onChange={(e) => handleChange("vehicle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" value={form.model} onChange={(e) => handleChange("model", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input id="year" value={form.year} onChange={(e) => handleChange("year", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input id="color" value={form.color} onChange={(e) => handleChange("color", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mileage">Approximate Mileage</Label>
            <Input id="mileage" value={form.mileage} onChange={(e) => handleChange("mileage", e.target.value)} placeholder="e.g., 45000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Vehicle Type</Label>
            <select
              id="vehicleType"
              value={form.vehicleType}
              onChange={(e) => handleChange("vehicleType", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select Type</option>
              <option value="Compact/Sedan">Compact/Sedan</option>
              <option value="Mid-Size/SUV">Mid-Size/SUV</option>
              <option value="Truck/Van/Large SUV">Truck/Van/Large SUV</option>
              <option value="Luxury/High-End">Luxury/High-End</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="conditionInside">Condition (Inside)</Label>
            <Textarea id="conditionInside" value={form.conditionInside} onChange={(e) => handleChange("conditionInside", e.target.value)} className="min-h-[60px]" placeholder="Describe interior condition" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conditionOutside">Condition (Outside)</Label>
            <Textarea id="conditionOutside" value={form.conditionOutside} onChange={(e) => handleChange("conditionOutside", e.target.value)} className="min-h-[60px]" placeholder="Describe exterior condition" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="services">Services (comma separated)</Label>
            <Input id="services" value={form.services.join(", ")} onChange={(e) => handleChange("services", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastService">Last Service Date</Label>
            <Input id="lastService" value={form.lastService} onChange={(e) => handleChange("lastService", e.target.value)} placeholder="MM/DD/YYYY" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Input id="duration" value={form.duration} onChange={(e) => handleChange("duration", e.target.value)} placeholder="e.g., 2 hours" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="howFound">How Customer Was Found</Label>
            <select
              id="howFound"
              value={form.howFound || ""}
              onChange={(e) => handleChange("howFound", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select...</option>
              <option value="online">Online</option>
              <option value="in-person">In Person</option>
              <option value="on-the-job">On the Job</option>
              <option value="other">Other</option>
            </select>
          </div>
          {form.howFound === "other" && (
            <div className="space-y-2">
              <Label htmlFor="howFoundOther">Please Specify</Label>
              <Input 
                id="howFoundOther" 
                value={form.howFoundOther || ""} 
                onChange={(e) => handleChange("howFoundOther", e.target.value)} 
                placeholder="How did you find us?"
              />
            </div>
          )}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} className="min-h-[80px]" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} className="bg-gradient-hero">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
