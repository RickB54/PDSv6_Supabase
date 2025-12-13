import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCouponsStore, Coupon } from "@/store/coupons";
import { TicketPercent, Plus, Hash, DollarSign, Percent, ToggleLeft, ToggleRight, Trash2, Tag, Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function DiscountCoupons() {
  const { toast } = useToast();
  const { items, add, update, remove, toggle } = useCouponsStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", title: "", type: "percent", value: 10, usesLeft: 100 } as any);

  const createCoupon = async () => {
    const code = String(form.code || '').trim().toUpperCase();
    const val = Number(form.value);

    if (!code) {
      toast({ title: "Validation Error", description: "Coupon code is required.", variant: "destructive" });
      return;
    }
    if (!val || val <= 0) {
      toast({ title: "Validation Error", description: "Value must be greater than 0.", variant: "destructive" });
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
      add(c);
      setOpen(false);
      setForm({ code: "", title: "", type: "percent", value: 10, usesLeft: 100 });
      toast({ title: "Coupon created", description: `${code} is now active and ready for use.` });
    } catch (err) {
      console.error('[DiscountCoupons] add failed', err);
      toast({ title: "Error", description: "Could not save coupon. Please try again.", variant: "destructive" });
    }
  };

  const activeCount = items.filter(i => i.active).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Discount Coupons" subtitle="Admin • Promotional Codes" />

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">

        {/* Stats & Actions */}
        <div className="flex flex-col md:flex-row gap-4">
          <Card className="flex-1 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/20">
                <TicketPercent className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{items.length}</div>
                <div className="text-sm text-zinc-400">Total Coupons</div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 bg-zinc-900 border-zinc-800 shadow-xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <Tag className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{activeCount}</div>
                <div className="text-sm text-zinc-400">Active Promos</div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-[1.5] bg-zinc-900 border-zinc-800 shadow-xl flex items-center justify-center p-6 md:p-0">
            <Button onClick={() => setOpen(true)} className="w-full md:w-auto md:px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 shadow-lg shadow-blue-900/20">
              <Plus className="w-5 h-5 mr-2" /> Create New Coupon
            </Button>
          </Card>
        </div>

        {/* Coupons List */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
          <CardHeader className="border-b border-zinc-800/50 pb-4">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-zinc-400" />
              <CardTitle className="text-white text-lg">Manage Coupons</CardTitle>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950/50">
                <tr className="text-left text-zinc-400">
                  <th className="p-4 font-medium uppercase text-xs tracking-wider">Code</th>
                  <th className="p-4 font-medium uppercase text-xs tracking-wider">Description</th>
                  <th className="p-4 font-medium uppercase text-xs tracking-wider">Type</th>
                  <th className="p-4 font-medium uppercase text-xs tracking-wider">Value</th>
                  <th className="p-4 font-medium uppercase text-xs tracking-wider">Uses Left</th>
                  <th className="p-4 font-medium uppercase text-xs tracking-wider">Status</th>
                  <th className="p-4 font-medium uppercase text-xs tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500 italic">No coupons created yet.</td>
                  </tr>
                ) : (
                  items.map(c => (
                    <tr key={c.id} className="group hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-bold text-amber-500 bg-amber-950/30 px-2 py-1 rounded border border-amber-900/50">{c.code}</span>
                      </td>
                      <td className="p-4 text-zinc-300 font-medium">{c.title}</td>
                      <td className="p-4 text-zinc-400">{c.percent ? "Percentage" : "Flat Amount"}</td>
                      <td className="p-4 text-white font-bold">
                        {c.percent ? `${c.percent}%` : `$${c.amount?.toFixed(2)}`}
                      </td>
                      <td className="p-4 text-zinc-400">
                        <span className={`px-2 py-0.5 rounded ${c.usesLeft < 10 ? 'bg-red-950/30 text-red-400 border border-red-900/30' : 'bg-zinc-800 border border-zinc-700'}`}>
                          {c.usesLeft}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={`${c.active ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                          {c.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggle(c.id)}
                          className={`h-8 w-8 p-0 ${c.active ? 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-950/30' : 'text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800'}`}
                          title={c.active ? "Deactivate" : "Activate"}
                        >
                          {c.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(c.id)}
                          className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-950/30"
                          title="Delete Coupon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Create Coupon Modal */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-600/10 rounded-full border border-blue-600/20">
                  <Plus className="w-5 h-5 text-blue-500" />
                </div>
                <DialogTitle className="text-xl">Create Coupon</DialogTitle>
              </div>
              <DialogDescription className="text-zinc-400">Add a new discount code for customers.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-bold uppercase">Coupon Code</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="bg-zinc-900 border-zinc-700 text-white pl-9 font-mono uppercase placeholder:normal-case"
                    placeholder="SUMMER2024"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-bold uppercase">Internal Title / Description</label>
                <Input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="bg-zinc-900 border-zinc-700 text-white"
                  placeholder="Summer Sale Campaign"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 font-bold uppercase">Discount Type</label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                      <SelectItem value="amount">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 font-bold uppercase">Value</label>
                  <div className="relative">
                    {form.type === 'percent' ?
                      <Percent className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" /> :
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    }
                    <Input
                      type="number"
                      value={form.value}
                      onChange={e => setForm({ ...form, value: Number(e.target.value) })}
                      className="bg-zinc-900 border-zinc-700 text-white pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-bold uppercase">Usage Limit</label>
                <Input
                  type="number"
                  value={form.usesLeft}
                  onChange={e => setForm({ ...form, usesLeft: Number(e.target.value) })}
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
                <p className="text-xs text-zinc-500">Number of times this coupon can be redeemed.</p>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">Cancel</Button>
              <Button onClick={createCoupon} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">Create Coupon</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
