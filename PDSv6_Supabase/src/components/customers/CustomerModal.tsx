import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { upsertCustomer } from "@/lib/db";
import api from "@/lib/api";
import { toast } from "sonner";
import { User, Mail, Phone, MapPin, Car, Info, Calendar, Clock } from "lucide-react";

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
  type?: 'customer' | 'prospect';
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Customer | null;
  onSave: (data: Customer) => Promise<void> | void;
  defaultType?: 'customer' | 'prospect';
}

export default function CustomerModal({ open, onOpenChange, initial, onSave, defaultType = 'customer' }: Props) {
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
    type: defaultType,
  });

  const isProspect = form.type === 'prospect';

  useEffect(() => {
    if (initial) {
      setForm({ ...initial, services: initial.services || [], type: initial.type || defaultType });
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
        notes: "",
        type: defaultType
      });
    }
  }, [initial, open, defaultType]);

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
    // Ensure prospect status is saved
    if (!payload.type) payload.type = defaultType;

    try {
      const saved = await api('/api/customers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!saved || (saved && saved.ok === false)) {
        // Fallback: save locally when backend fails or returns null
        const localSaved = await upsertCustomer(payload as any);
        onSave(localSaved as any);
        toast.success(`${isProspect ? 'Prospect' : 'Customer'} saved locally (offline)`);
        onOpenChange(false);
        return;
      }
      onSave(saved as any);
      toast.success(`${isProspect ? 'Prospect' : 'Customer'} saved!`);
      onOpenChange(false);
    } catch (err: any) {
      // Fallback: save locally when backend throws
      try {
        const localSaved = await upsertCustomer(payload as any);
        onSave(localSaved as any);
        toast.success(`${isProspect ? 'Prospect' : 'Customer'} saved locally (offline)`);
        onOpenChange(false);
      } catch (err2: any) {
        toast.error("Save failed: " + (err2?.message || String(err2)));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800 text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {initial?.id ? `Edit ${isProspect ? 'Prospect' : 'Customer'}` : `Add New ${isProspect ? 'Prospect' : 'Customer'}`}
          </DialogTitle>
          <DialogDescription>
            {isProspect
              ? "Track potential client details. Convert to customer later by booking a job."
              : "Manage customer profile and vehicle details."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">

          {/* Contact Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</h3>

            <div className="grid gap-3">
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Full Name"
                  className="pl-9 bg-zinc-900 border-zinc-800"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="Phone"
                    className="pl-9 bg-zinc-900 border-zinc-800"
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    type="email"
                    placeholder="Email"
                    className="pl-9 bg-zinc-900 border-zinc-800"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Address"
                  className="pl-9 bg-zinc-900 border-zinc-800"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-800" />

          {/* Vehicle Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Vehicle Details</h3>

            <div className="grid gap-3">
              <div className="relative">
                <Car className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <select
                  value={form.vehicleType}
                  onChange={(e) => handleChange("vehicleType", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select Vehicle Type</option>
                  <option value="Compact/Sedan">Compact/Sedan</option>
                  <option value="Mid-Size/SUV">Mid-Size/SUV</option>
                  <option value="Truck/Van/Large SUV">Truck/Van/Large SUV</option>
                  <option value="Luxury/High-End">Luxury/High-End</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="RV/Boat">RV/Boat</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Year"
                  className="bg-zinc-900 border-zinc-800"
                  value={form.year}
                  onChange={(e) => handleChange("year", e.target.value)}
                />
                <Input
                  placeholder="Make"
                  className="bg-zinc-900 border-zinc-800"
                  value={form.vehicle}
                  onChange={(e) => handleChange("vehicle", e.target.value)}
                />
                <Input
                  placeholder="Model"
                  className="bg-zinc-900 border-zinc-800"
                  value={form.model}
                  onChange={(e) => handleChange("model", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Color"
                  className="bg-zinc-900 border-zinc-800"
                  value={form.color}
                  onChange={(e) => handleChange("color", e.target.value)}
                />
                <Input
                  placeholder="Mileage (approx)"
                  className="bg-zinc-900 border-zinc-800"
                  value={form.mileage}
                  onChange={(e) => handleChange("mileage", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Textarea
                  placeholder="Condition (Inside)"
                  className="bg-zinc-900 border-zinc-800 min-h-[60px]"
                  value={form.conditionInside}
                  onChange={(e) => handleChange("conditionInside", e.target.value)}
                />
                <Textarea
                  placeholder="Condition (Outside)"
                  className="bg-zinc-900 border-zinc-800 min-h-[60px]"
                  value={form.conditionOutside}
                  onChange={(e) => handleChange("conditionOutside", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-800" />

          {/* Marketing / Source */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Acquisition</h3>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.howFound || ""}
                onChange={(e) => handleChange("howFound", e.target.value)}
                className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">How Found?</option>
                <option value="online">Online</option>
                <option value="in-person">In Person (Casual)</option>
                <option value="on-the-job">On the Job</option>
                <option value="referral">Referral</option>
                <option value="friend-family">Friend/Family</option>
                <option value="pool-league">Pool League</option>
                <option value="other">Other</option>
              </select>
              {form.howFound === "other" && (
                <Input
                  placeholder="Specify..."
                  className="bg-zinc-900 border-zinc-800"
                  value={form.howFoundOther || ""}
                  onChange={(e) => handleChange("howFoundOther", e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Services (Hidden for Prospects unless needed) */}
          {!isProspect && (
            <>
              <div className="h-px bg-zinc-800" />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Service History</h3>
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <Input
                        placeholder="Last Service Date"
                        className="pl-9 bg-zinc-900 border-zinc-800"
                        value={form.lastService}
                        onChange={(e) => handleChange("lastService", e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <Clock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <Input
                        placeholder="Duration"
                        className="pl-9 bg-zinc-900 border-zinc-800"
                        value={form.duration}
                        onChange={(e) => handleChange("duration", e.target.value)}
                      />
                    </div>
                  </div>
                  <Input
                    placeholder="Services (comma separated)"
                    className="bg-zinc-900 border-zinc-800"
                    value={form.services.join(", ")}
                    onChange={(e) => handleChange("services", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="h-px bg-zinc-800" />

          {/* Notes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notes</h3>
            <Textarea
              placeholder="Additional notes about the customer or prospect..."
              className="bg-zinc-900 border-zinc-800 min-h-[80px]"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </div>

        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">Save {isProspect ? 'Prospect' : 'Customer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
