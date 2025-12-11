import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import supabase from "@/lib/supabase";
import { getCurrentUser, isSupabaseEnabled } from "@/lib/auth";

type Profile = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  notes?: string;
};

export default function CustomerProfile() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Partial<Profile>>({});

  useEffect(() => {
    if (!isSupabaseEnabled()) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('customers').select('*').eq('id', (await supabase.auth.getUser()).data.user?.id || '').maybeSingle();
        if (!error && data) {
          setProfile(data as Profile);
          setForm({
            name: (data as any).name || '',
            phone: (data as any).phone || '',
            vehicle_make: (data as any).vehicle_make || '',
            vehicle_model: (data as any).vehicle_model || '',
            vehicle_year: (data as any).vehicle_year || '',
            notes: (data as any).notes || '',
          });
          try { localStorage.setItem('customerProfile', JSON.stringify(data)); } catch {}
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const save = async () => {
    if (!isSupabaseEnabled()) { return; }
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const payload = {
        id: uid,
        email: user?.email || '',
        name: form.name || '',
        phone: form.phone || '',
        vehicle_make: form.vehicle_make || '',
        vehicle_model: form.vehicle_model || '',
        vehicle_year: form.vehicle_year || '',
        notes: form.notes || '',
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('customers').upsert(payload, { onConflict: 'id' });
      if (!error) {
        try { localStorage.setItem('customerProfile', JSON.stringify(payload)); } catch {}
        try { window.dispatchEvent(new CustomEvent('customer-profile-changed', { detail: payload })); } catch {}
      }
    } finally { setLoading(false); }
  };

  if (!isSupabaseEnabled()) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Profile" />
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <Card className="p-6">
            <p className="text-muted-foreground">Profile editing requires Supabase mode. Please enable Supabase in settings.</p>
            <Button className="mt-4" onClick={() => navigate('/settings')}>Go to Settings</Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="My Profile" />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input name="name" value={form.name || ''} onChange={onChange} className="w-full rounded-md border px-3 py-2 bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input name="phone" value={form.phone || ''} onChange={onChange} className="w-full rounded-md border px-3 py-2 bg-background" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Make</label>
              <input name="vehicle_make" value={form.vehicle_make || ''} onChange={onChange} className="w-full rounded-md border px-3 py-2 bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <input name="vehicle_model" value={form.vehicle_model || ''} onChange={onChange} className="w-full rounded-md border px-3 py-2 bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <input name="vehicle_year" value={form.vehicle_year || ''} onChange={onChange} className="w-full rounded-md border px-3 py-2 bg-background" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea name="notes" value={form.notes || ''} onChange={onChange} className="w-full rounded-md border px-3 py-2 bg-background min-h-[120px]" />
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
