import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCouponsStore, Coupon } from "@/store/coupons";
import { TicketPercent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DiscountCoupons() {
  const { toast } = useToast();
  const { items, add, update, remove, toggle } = useCouponsStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", title: "", type: "percent", value: 10, usesLeft: 100 } as any);

  const createCoupon = async () => {
    console.log('[DiscountCoupons] Create button clicked', { form });
    const code = String(form.code || '').trim().toUpperCase();
    const val = Number(form.value);
    if (!code) {
      toast({ title: "Code required", description: "Enter a coupon code", variant: "destructive" });
      return;
    }
    if (!val || val <= 0) {
      toast({ title: "Value required", description: "Enter a value greater than 0", variant: "destructive" });
      return;
    }
    const c: Coupon = {
      id: `coupon_${Date.now()}`,
      code,
      title: String(form.title || code),
      percent: form.type === "percent" ? val : undefined,
      amount: form.type === "amount" ? val : undefined,
      usesLeft: Number(form.usesLeft) || 0,
      active: true,
    };
    try {
      // Do not allow any upstream stall to block UX; add is optimistic now
      add(c);
      setOpen(false);
      toast({ title: "Coupon created", description: `${code} is now active` });
    } catch (err) {
      console.error('[DiscountCoupons] add failed', err);
      toast({ title: "Could not save coupon", description: "Please try again", variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader title="Discount Coupons" />
      <div className="p-4 space-y-4">
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TicketPercent className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold">Create New Coupon</h2>
          </div>
          <Button type="button" onClick={() => setOpen(true)}>Create Coupon</Button>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">All Coupons</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="p-2">Code</th>
                  <th className="p-2">Title</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Value</th>
                  <th className="p-2">Uses Left</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-2 font-mono">{c.code}</td>
                    <td className="p-2">{c.title}</td>
                    <td className="p-2">{c.percent ? "Percent" : "Amount"}</td>
                    <td className="p-2">{c.percent ?? c.amount}</td>
                    <td className="p-2">{c.usesLeft}</td>
                    <td className="p-2">{c.active ? "Active" : "Inactive"}</td>
                    <td className="p-2 space-x-2">
                      <Button variant="outline" size="sm" onClick={() => toggle(c.id)}>Toggle</Button>
                      <Button variant="destructive" size="sm" onClick={() => remove(c.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Coupon</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Code</label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Title</label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent</SelectItem>
                      <SelectItem value="amount">Dollar Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Value</label>
                  <Input type="number" value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Uses Left</label>
                  <Input type="number" value={form.usesLeft} onChange={e => setForm({ ...form, usesLeft: Number(e.target.value) })} />
                </div>
              </div>
              <Button type="button" onClick={createCoupon} className="w-full">Create Coupon</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
