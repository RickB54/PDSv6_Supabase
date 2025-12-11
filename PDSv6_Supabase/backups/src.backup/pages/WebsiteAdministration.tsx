import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { postFullSync, getAllPackageMeta, setPackageMeta, getCustomPackages, getCustomServices } from "@/lib/servicesMeta";
import { servicePackages as builtInPackages } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";

export default function WebsiteAdministration() {
  const { toast } = useToast();
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [contactInfo, setContactInfo] = useState<{ hours: string; phone: string; address: string; email: string }>({ hours: '', phone: '', address: '', email: '' });
  const [aboutSections, setAboutSections] = useState<any[]>([]);
  const [aboutFeatures, setAboutFeatures] = useState<{ expertTeam: string; ecoFriendly: string; satisfactionGuarantee: string }>({ expertTeam: '', ecoFriendly: '', satisfactionGuarantee: '' });
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [servicesDisclaimer, setServicesDisclaimer] = useState<string>('');
  const [learnMoreEdit, setLearnMoreEdit] = useState<Record<string, { description: string; stepIds: string[] }>>({});
  const [allStepOptions, setAllStepOptions] = useState<{ id: string; name: string }[]>([]);
  const [editTestimonial, setEditTestimonial] = useState<any | null>(null);
  const [newTestimonialOpen, setNewTestimonialOpen] = useState(false);
  const [newTestimonialName, setNewTestimonialName] = useState('');
  const [newTestimonialQuote, setNewTestimonialQuote] = useState('');

  const [editVehicle, setEditVehicle] = useState<any | null>(null);
  const [newVehicleOpen, setNewVehicleOpen] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehicleDesc, setNewVehicleDesc] = useState('');
  const [newVehicleMultiplier, setNewVehicleMultiplier] = useState<string>('100');

  const [editFaq, setEditFaq] = useState<any | null>(null);
  const [newFaqOpen, setNewFaqOpen] = useState(false);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');

  const [editAbout, setEditAbout] = useState<any | null>(null);
  const [newAboutOpen, setNewAboutOpen] = useState(false);
  const [newAboutSection, setNewAboutSection] = useState('');
  const [newAboutContent, setNewAboutContent] = useState('');

  const loadWA = async () => {
    try {
      const vt = await api('/api/vehicle-types', { method: 'GET' });
      setVehicleTypes(Array.isArray(vt) ? vt : []);
    } catch { setVehicleTypes([]); }
    try {
      const f = await api('/api/faqs', { method: 'GET' });
      const items = Array.isArray(f) ? f : (Array.isArray((f as any)?.items) ? (f as any).items : []);
      setFaqs(items);
    } catch { setFaqs([]); }
    try {
      const c = await api('/api/contact', { method: 'GET' });
      if (c && typeof c === 'object') setContactInfo({
        hours: (c as any).hours || '',
        phone: (c as any).phone || '',
        address: (c as any).address || '',
        email: (c as any).email || '',
      });
    } catch {}
    try {
      const a = await api('/api/about', { method: 'GET' });
      setAboutSections(Array.isArray(a) ? a : []);
    } catch { setAboutSections([]); }
    try {
      const af = await api('/api/about/features', { method: 'GET' });
      if (af && typeof af === 'object') setAboutFeatures({
        expertTeam: (af as any).expertTeam || '',
        ecoFriendly: (af as any).ecoFriendly || '',
        satisfactionGuarantee: (af as any).satisfactionGuarantee || ''
      });
    } catch {}
    try {
      const t = await api('/api/testimonials', { method: 'GET' });
      setTestimonials(Array.isArray(t) ? t : []);
    } catch { setTestimonials([]); }
    try {
      const s = await api('/api/services', { method: 'GET' });
      if (s && typeof s === 'object') setServicesDisclaimer(String((s as any).disclaimer || ''));
    } catch {}

    // Build Learn More editor state from built-in + custom packages and meta overrides
    try {
      const customPkgs = getCustomPackages();
      const allPkgs: any[] = [...builtInPackages, ...customPkgs];
      const metaMap = getAllPackageMeta();
      const initial: Record<string, { description: string; stepIds: string[] }> = {};
      allPkgs.forEach((p: any) => {
        const meta = metaMap[p.id] || {} as any;
        const defaultStepIds = (p.steps || []).map((s: any) => (typeof s === 'string' ? s : s.id));
        initial[p.id] = {
          description: (meta.descriptionOverride ?? p.description) || '',
          stepIds: Array.isArray(meta.stepIds) && meta.stepIds.length > 0 ? meta.stepIds : defaultStepIds,
        };
      });
      setLearnMoreEdit(initial);
      // Build global step options (union of built-in steps + custom services)
      const builtSteps = builtInPackages.flatMap(p => p.steps).map((s: any) => ({ id: s.id, name: s.name }));
      const customServices = getCustomServices().map(s => ({ id: s.id, name: s.name }));
      // Deduplicate by id, preserve first name
      const unionMap: Record<string, string> = {};
      [...builtSteps, ...customServices].forEach(s => { if (!unionMap[s.id]) unionMap[s.id] = s.name; });
      setAllStepOptions(Object.entries(unionMap).map(([id, name]) => ({ id, name })));
    } catch {}
  };

  useEffect(() => {
    loadWA();
    const onChanged = (e: any) => {
      const tag = (e && e.detail && (e.detail.kind ?? e.detail.type)) || '';
      if (['vehicle-types','faqs','contact','about','aboutFeatures','testimonials','services'].includes(tag)) loadWA();
    };
    window.addEventListener('content-changed', onChanged as any);
    return () => window.removeEventListener('content-changed', onChanged as any);
  }, []);

  return (
    <div>
      <PageHeader title="Website Administration" />
      <div className="p-4 space-y-6 max-w-screen-xl mx-auto">
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">Website Admin</h3>
            <span className="text-xs text-zinc-400">Content management</span>
          </div>

          <Accordion type="single" collapsible>
            {/* Vehicle Types */}
            <AccordionItem value="vehicle-types">
              <AccordionTrigger>Vehicle Types</AccordionTrigger>
              <AccordionContent>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Vehicle Types</h4>
                  <Button className="bg-red-700 hover:bg-red-800" onClick={() => setNewVehicleOpen(true)}>Add New</Button>
                </div>
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-zinc-300">Name</TableHead>
                        <TableHead className="text-zinc-300">Description</TableHead>
                        <TableHead className="text-zinc-300">Edit</TableHead>
                        <TableHead className="text-zinc-300">Delete</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicleTypes.map((vt: any) => (
                        <TableRow key={vt.id}>
                          <TableCell className="text-white">{vt.name}</TableCell>
                          <TableCell className="text-zinc-300">{vt.description || '—'}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditVehicle(vt)}>Edit</Button>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" disabled={vt.protected} onClick={async () => {
                              if (!confirm('Delete this vehicle type? (removes from all dropdowns + pricing)')) return;
                              await api(`/api/vehicle-types/${vt.id}`, { method: 'DELETE' });
                              const updated = await api('/api/vehicle-types', { method: 'GET' });
                              setVehicleTypes(Array.isArray(updated) ? updated : []);
                              try {
                                await fetch('http://localhost:6061/api/vehicle-types/live', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(Array.isArray(updated) ? updated : []),
                                });
                              } catch {}
                              try { await postFullSync(); } catch {}
                              try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'vehicle-types' } })); } catch {}
                              try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'packages' } })); } catch {}
                              try { localStorage.setItem('force-refresh', String(Date.now())); } catch {}
                              toast({ title: 'Vehicle type deleted', description: vt.name });
                            }}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {vehicleTypes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-zinc-400 py-6">No vehicle types</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* FAQs */}
            <AccordionItem value="faqs">
              <AccordionTrigger>FAQs</AccordionTrigger>
              <AccordionContent>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">FAQs</h4>
                  <Button className="bg-red-700 hover:bg-red-800" onClick={() => setNewFaqOpen(true)}>Add New</Button>
                </div>
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-zinc-300">Question</TableHead>
                        <TableHead className="text-zinc-300">Answer</TableHead>
                        <TableHead className="text-zinc-300">Edit</TableHead>
                        <TableHead className="text-zinc-300">Delete</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {faqs.map((fq: any) => (
                        <TableRow key={fq.id}>
                          <TableCell className="text-white">{fq.question}</TableCell>
                          <TableCell className="text-zinc-300">{fq.answer}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditFaq(fq)}>Edit</Button>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={async () => {
                              if (!confirm('Delete this FAQ?')) return;
                              await api(`/api/faqs/${fq.id}`, { method: 'DELETE' });
                              const updated = await api('/api/faqs', { method: 'GET' });
                              setFaqs(Array.isArray(updated) ? updated : (Array.isArray((updated as any)?.items) ? (updated as any).items : []));
                              try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'faqs' } })); } catch {}
                              toast({ title: 'FAQ deleted' });
                            }}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {faqs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-zinc-400 py-6">No FAQs</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Contact */}
            <AccordionItem value="contact">
              <AccordionTrigger>Contact</AccordionTrigger>
              <AccordionContent>
                <h4 className="font-semibold mb-2">Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-300">Hours</Label>
                    <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={contactInfo.hours} onChange={(e) => setContactInfo({ ...contactInfo, hours: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Phone</Label>
                    <Input className="bg-zinc-800 border-zinc-700 text-white" value={contactInfo.phone} onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Address</Label>
                    <Input className="bg-zinc-800 border-zinc-700 text-white" value={contactInfo.address} onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Email</Label>
                    <Input className="bg-zinc-800 border-zinc-700 text-white" value={contactInfo.email} onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })} />
                  </div>
                </div>
                <div className="mt-3">
                  <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                    await api('/api/contact/update', { method: 'POST', body: JSON.stringify(contactInfo) });
                    try {
                      await fetch('http://localhost:6061/api/contact/live', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(contactInfo),
                      });
                    } catch {}
                    try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'contact' } })); } catch {}
                    toast({ title: 'Contact updated', description: 'Synced live on port 6061' });
                  }}>Save Contact</Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* About */}
            <AccordionItem value="about">
              <AccordionTrigger>About</AccordionTrigger>
              <AccordionContent>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">About Sections</h4>
                  <Button className="bg-red-700 hover:bg-red-800" onClick={() => setNewAboutOpen(true)}>Add New</Button>
                </div>
                <div className="w-full overflow-x-auto mb-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-zinc-300">Section</TableHead>
                        <TableHead className="text-zinc-300">Content</TableHead>
                        <TableHead className="text-zinc-300">Edit</TableHead>
                        <TableHead className="text-zinc-300">Delete</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aboutSections.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-white">{s.section}</TableCell>
                          <TableCell className="text-zinc-300">{s.content}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditAbout(s)}>Edit</Button>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={async () => {
                              if (!confirm('Delete this section?')) return;
                              await api(`/api/about/${s.id}`, { method: 'DELETE' });
                              const updated = await api('/api/about', { method: 'GET' });
                              setAboutSections(Array.isArray(updated) ? updated : []);
                              toast({ title: 'Section deleted' });
                            }}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {aboutSections.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-zinc-400 py-6">No sections</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* About Features editing */}
                <div className="space-y-3 mb-6">
                  <h4 className="font-semibold">About Features</h4>
                  <div>
                    <Label className="text-zinc-300">Expert Team</Label>
                    <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-20" value={aboutFeatures.expertTeam} onChange={(e) => setAboutFeatures({ ...aboutFeatures, expertTeam: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Eco-Friendly Products</Label>
                    <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-20" value={aboutFeatures.ecoFriendly} onChange={(e) => setAboutFeatures({ ...aboutFeatures, ecoFriendly: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-zinc-300">100% Satisfaction Guarantee</Label>
                    <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-20" value={aboutFeatures.satisfactionGuarantee} onChange={(e) => setAboutFeatures({ ...aboutFeatures, satisfactionGuarantee: e.target.value })} />
                  </div>
                  <div className="flex justify-end">
                    <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                      await api('/api/about/features', { method: 'POST', body: JSON.stringify(aboutFeatures) });
                      try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'aboutFeatures' } })); } catch {}
                      toast({ title: 'About features updated' });
                    }}>Save Features</Button>
                  </div>
                </div>

                {/* Testimonials */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">What Our Customers Say</h4>
                    <Button className="bg-red-700 hover:bg-red-800" onClick={() => setNewTestimonialOpen(true)}>Add Testimonial</Button>
                  </div>
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-zinc-300">Name</TableHead>
                          <TableHead className="text-zinc-300">Quote</TableHead>
                          <TableHead className="text-zinc-300">Edit</TableHead>
                          <TableHead className="text-zinc-300">Delete</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {testimonials.map((t: any) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-white">{t.name}</TableCell>
                            <TableCell className="text-zinc-300">{t.quote}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditTestimonial(t)}>Edit</Button>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={async () => {
                                if (!confirm('Delete this testimonial?')) return;
                                await api(`/api/testimonials/${t.id}`, { method: 'DELETE' });
                                const updated = await api('/api/testimonials', { method: 'GET' });
                                setTestimonials(Array.isArray(updated) ? updated : []);
                                try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'testimonials' } })); } catch {}
                                toast({ title: 'Testimonial deleted' });
                              }}>Delete</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {testimonials.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-zinc-400 py-6">No testimonials</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Services */}
            <AccordionItem value="services">
              <AccordionTrigger>Services</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <h4 className="font-semibold">Services</h4>
                  <div>
                    <Label className="text-zinc-300">Disclaimer</Label>
                    <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-24" value={servicesDisclaimer} onChange={(e) => setServicesDisclaimer(e.target.value)} />
                  </div>
                  <div className="flex justify-end">
                    <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                      await api('/api/services', { method: 'POST', body: JSON.stringify({ disclaimer: servicesDisclaimer }) });
                      try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'services' } })); } catch {}
                      try {
                        await fetch('http://localhost:6061/api/services/live', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ disclaimer: servicesDisclaimer }),
                        });
                      } catch {}
                      toast({ title: 'Services updated', description: 'Disclaimer saved (port 6061)' });
                    }}>Save Services</Button>
                  </div>

                  {/* Learn More Modal Content Editor */}
                  <div className="mt-8 space-y-6">
                    <h4 className="font-semibold">Learn More Content</h4>
                    <p className="text-sm text-zinc-400">Edit the description and what's included list for each pricing package. This controls the Learn More modal on the Services page.</p>
                    <div className="space-y-5">
                      {[...builtInPackages, ...getCustomPackages()].map((pkg: any) => (
                        <Card key={pkg.id} className="p-4 bg-zinc-900 border-zinc-800">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-semibold text-white">{pkg.name.replace(' (BEST VALUE)', '')}</h5>
                            <span className="text-xs text-zinc-500">ID: {pkg.id}</span>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-zinc-300">Description (Why Choose This Package?)</Label>
                              <textarea
                                className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-20"
                                value={learnMoreEdit[pkg.id]?.description || ''}
                                onChange={(e) => setLearnMoreEdit(prev => ({ ...prev, [pkg.id]: { ...(prev[pkg.id] || { description: '', stepIds: [] }), description: e.target.value } }))}
                              />
                            </div>
                            <div>
                              <Label className="text-zinc-300">What's Included (select steps)</Label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-zinc-800 border border-zinc-700 rounded-md">
                                {allStepOptions.map(opt => {
                                  const checked = (learnMoreEdit[pkg.id]?.stepIds || []).includes(opt.id);
                                  return (
                                    <label key={`${pkg.id}-${opt.id}`} className="flex items-center gap-2 text-sm text-white">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          setLearnMoreEdit(prev => {
                                            const current = prev[pkg.id] || { description: '', stepIds: [] };
                                            const nextIds = new Set(current.stepIds);
                                            if (e.target.checked) nextIds.add(opt.id); else nextIds.delete(opt.id);
                                            return { ...prev, [pkg.id]: { ...current, stepIds: Array.from(nextIds) } };
                                          });
                                        }}
                                      />
                                      <span>{opt.name}</span>
                                      <span className="text-xs text-zinc-400">({opt.id})</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 button-group-responsive">
                              <Button
                                variant="outline"
                                className="border-red-700 text-red-700 hover:bg-red-700/10"
                                onClick={() => {
                                  const defaultStepIds = (pkg.steps || []).map((s: any) => (typeof s === 'string' ? s : s.id));
                                  setLearnMoreEdit(prev => ({ ...prev, [pkg.id]: { description: pkg.description || '', stepIds: defaultStepIds } }));
                                }}
                              >
                                Reset to defaults
                              </Button>
                              <Button
                                className="bg-red-700 hover:bg-red-800"
                                onClick={async () => {
                                  const current = learnMoreEdit[pkg.id] || { description: '', stepIds: [] };
                                  setPackageMeta(pkg.id, { descriptionOverride: current.description, stepIds: current.stepIds });
                                  try { await postFullSync(); } catch {}
                                  try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'packages' } })); } catch {}
                                  try { localStorage.setItem('force-refresh', String(Date.now())); } catch {}
                                  toast({ title: 'Learn More updated', description: pkg.name.replace(' (BEST VALUE)', '') });
                                }}
                              >
                                Save Learn More
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Testimonial Edit Modal */}
        <Dialog open={!!editTestimonial} onOpenChange={(o) => !o && setEditTestimonial(null)}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Edit Testimonial</DialogTitle>
            </DialogHeader>
            {editTestimonial && (
              <div className="space-y-3">
                <Input className="bg-zinc-800 border-zinc-700 text-white" value={editTestimonial.name} onChange={(e) => setEditTestimonial({ ...editTestimonial, name: e.target.value })} placeholder="Name" />
                <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={editTestimonial.quote} onChange={(e) => setEditTestimonial({ ...editTestimonial, quote: e.target.value })} placeholder="Quote" />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditTestimonial(null)}>Cancel</Button>
                  <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                    await api(`/api/testimonials/${editTestimonial.id}`, { method: 'PUT', body: JSON.stringify({ name: editTestimonial.name, quote: editTestimonial.quote }) });
                    const updated = await api('/api/testimonials', { method: 'GET' });
                    setTestimonials(Array.isArray(updated) ? updated : []);
                    try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'testimonials' } })); } catch {}
                    setEditTestimonial(null);
                    toast({ title: 'Testimonial updated' });
                  }}>Save</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Testimonial Add Modal */}
        <Dialog open={newTestimonialOpen} onOpenChange={setNewTestimonialOpen}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Add Testimonial</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input className="bg-zinc-800 border-zinc-700 text-white" value={newTestimonialName} onChange={(e) => setNewTestimonialName(e.target.value)} placeholder="Name" />
              <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={newTestimonialQuote} onChange={(e) => setNewTestimonialQuote(e.target.value)} placeholder="Quote" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setNewTestimonialOpen(false)}>Cancel</Button>
                <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                  const name = (newTestimonialName || '').trim();
                  const quote = (newTestimonialQuote || '').trim();
                  if (!name || !quote) { toast({ title: 'Name and Quote required' }); return; }
                  await api('/api/testimonials', { method: 'POST', body: JSON.stringify({ name, quote }) });
                  const updated = await api('/api/testimonials', { method: 'GET' });
                  setTestimonials(Array.isArray(updated) ? updated : []);
                  try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'testimonials' } })); } catch {}
                  setNewTestimonialName('');
                  setNewTestimonialQuote('');
                  setNewTestimonialOpen(false);
                  toast({ title: 'Testimonial added' });
                }}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Vehicle Type Edit Modal */}
        <Dialog open={!!editVehicle} onOpenChange={(o) => !o && setEditVehicle(null)}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Edit Vehicle Type</DialogTitle>
            </DialogHeader>
            {editVehicle && (
              <div className="space-y-3">
                <Input className="bg-zinc-800 border-zinc-700 text-white" value={editVehicle.name} onChange={(e) => setEditVehicle({ ...editVehicle, name: e.target.value })} placeholder="Name" />
                <Input className="bg-zinc-800 border-zinc-700 text-white" value={editVehicle.description || ''} onChange={(e) => setEditVehicle({ ...editVehicle, description: e.target.value })} placeholder="Description" />
                <div>
                  <label className="text-sm text-zinc-400">$ Amount — Multiplier for packages/add-ons</label>
                  <Input
                    type="number"
                    step={1}
                    min={0}
                    max={10000}
                    className="bg-zinc-800 border-red-700 text-white placeholder:text-white"
                    value={(editVehicle as any)?.multiplier ?? ''}
                    onChange={(e) => setEditVehicle({ ...editVehicle, multiplier: e.target.value })}
                    placeholder="$150"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditVehicle(null)}>Cancel</Button>
                  <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                    await api(`/api/vehicle-types/${editVehicle.id}`, { method: 'PUT', body: JSON.stringify({ name: editVehicle.name, description: editVehicle.description }) });
                    // If a multiplier was provided, re-seed prices for this type
                    const rawMult = Math.round(Number((editVehicle as any)?.multiplier ?? NaN));
                    if (Number.isFinite(rawMult) && rawMult >= 0 && rawMult <= 10000) {
                      await api('/api/packages/apply-vehicle-multiplier', { method: 'POST', body: JSON.stringify({ vehicleTypeId: editVehicle.id, multiplier: rawMult }) });
                    }
                    const updated = await api('/api/vehicle-types', { method: 'GET' });
                    setVehicleTypes(Array.isArray(updated) ? updated : []);
                    // Push live vehicle types to server so all dropdowns reflect edits immediately
                    try {
                      await fetch('http://localhost:6061/api/vehicle-types/live', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(Array.isArray(updated) ? updated : []),
                      });
                    } catch {}
                    try { await postFullSync(); } catch {}
                    try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'vehicle-types' } })); } catch {}
                    try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'packages' } })); } catch {}
                    // Force refresh Service and Book Now pages in other tabs
                    try { localStorage.setItem('force-refresh', String(Date.now())); } catch {}
                    setEditVehicle(null);
                    toast({ title: 'Vehicle type updated' });
                  }}>Save</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Vehicle Type Add Modal */}
        <Dialog open={newVehicleOpen} onOpenChange={setNewVehicleOpen}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Add Vehicle Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input className="bg-zinc-800 border-zinc-700 text-white" value={newVehicleName} onChange={(e) => setNewVehicleName(e.target.value)} placeholder="Name" />
              <Input className="bg-zinc-800 border-zinc-700 text-white" value={newVehicleDesc} onChange={(e) => setNewVehicleDesc(e.target.value)} placeholder="Description" />
              <div>
                <label className="text-sm text-zinc-400">$ Amount — Multiplier for packages/add-ons (e.g. 100 for Compact, 150 for Luxury)</label>
                <Input
                  type="number"
                  step={1}
                  min={0}
                  max={10000}
                  className="bg-zinc-800 border-red-700 text-white placeholder:text-white"
                  value={newVehicleMultiplier}
                  onChange={(e) => setNewVehicleMultiplier(e.target.value)}
                  onBlur={() => {
                    const raw = Number(newVehicleMultiplier);
                    if (Number.isFinite(raw)) {
                      const rounded = Math.round(raw);
                      if (rounded !== raw) {
                        setNewVehicleMultiplier(String(rounded));
                        toast({ title: `Rounded to $${rounded}` });
                      }
                    }
                  }}
                  placeholder="$150"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setNewVehicleOpen(false)}>Cancel</Button>
                <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                  const safeName = (newVehicleName || '').trim();
                  if (!safeName) {
                    toast({ title: 'Name required', description: 'Please enter a vehicle type name.' });
                    return;
                  }
                  const slug = safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `vt_${Date.now()}`;
                  await api('/api/vehicle-types', { method: 'POST', body: JSON.stringify({ id: slug, name: safeName, description: newVehicleDesc, hasPricing: true }) });
                  let amt = Math.round(Number(newVehicleMultiplier || '100'));
                  if (!Number.isFinite(amt) || amt < 0 || amt > 10000) {
                    toast({ title: 'Invalid $ Amount', description: 'Enter a whole number between 0 and 10000.' , variant: 'destructive'});
                    return;
                  }
                  if (String(amt) !== String(newVehicleMultiplier)) {
                    toast({ title: `Rounded to $${amt}` });
                  }
                  if (!confirm('Update all packages? (affects live site)')) {
                    return;
                  }
                  await api('/api/packages/apply-vehicle-multiplier', { method: 'POST', body: JSON.stringify({ vehicleTypeId: slug, multiplier: amt }) });
                  const updated = await api('/api/vehicle-types', { method: 'GET' });
                  setVehicleTypes(Array.isArray(updated) ? updated : []);
                  // Push live vehicle types to server for immediate dropdown sync
                  try {
                    await fetch('http://localhost:6061/api/vehicle-types/live', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(Array.isArray(updated) ? updated : []),
                    });
                  } catch {}
                  try { await postFullSync(); } catch {}
                  try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'vehicle-types' } })); } catch {}
                  try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'packages' } })); } catch {}
                  // Force refresh Service and Book Now pages in other tabs
                  try { localStorage.setItem('force-refresh', String(Date.now())); } catch {}
                  setNewVehicleName('');
                  setNewVehicleDesc('');
                  setNewVehicleMultiplier('100');
                  setNewVehicleOpen(false);
                  toast({ title: 'Vehicle type added', description: `Seeded pricing: $ Amount × base compact` });
                }}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* FAQ Edit Modal */}
        <Dialog open={!!editFaq} onOpenChange={(o) => !o && setEditFaq(null)}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Edit FAQ</DialogTitle>
            </DialogHeader>
            {editFaq && (
              <div className="space-y-3">
                <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-24" value={editFaq.question} onChange={(e) => setEditFaq({ ...editFaq, question: e.target.value })} placeholder="Question" />
                <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={editFaq.answer} onChange={(e) => setEditFaq({ ...editFaq, answer: e.target.value })} placeholder="Answer" />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditFaq(null)}>Cancel</Button>
                  <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                    await api(`/api/faqs/${editFaq.id}`, { method: 'PUT', body: JSON.stringify({ question: editFaq.question, answer: editFaq.answer }) });
                    const updated = await api('/api/faqs', { method: 'GET' });
                    setFaqs(Array.isArray(updated) ? updated : (Array.isArray((updated as any)?.items) ? (updated as any).items : []));
                    try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'faqs' } })); } catch {}
                    setEditFaq(null);
                    toast({ title: 'FAQ updated' });
                  }}>Save</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* FAQ Add Modal */}
        <Dialog open={newFaqOpen} onOpenChange={setNewFaqOpen}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Add FAQ</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-24" value={newFaqQ} onChange={(e) => setNewFaqQ(e.target.value)} placeholder="Question" />
              <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={newFaqA} onChange={(e) => setNewFaqA(e.target.value)} placeholder="Answer" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setNewFaqOpen(false)}>Cancel</Button>
                <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                  if (!newFaqQ.trim() || !newFaqA.trim()) {
                    toast({ title: 'Question and Answer required' });
                    return;
                  }
                  await api('/api/faqs', { method: 'POST', body: JSON.stringify({ question: newFaqQ, answer: newFaqA }) });
                  const updated = await api('/api/faqs', { method: 'GET' });
                  setFaqs(Array.isArray(updated) ? updated : (Array.isArray((updated as any)?.items) ? (updated as any).items : []));
                  try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'faqs' } })); } catch {}
                  setNewFaqQ('');
                  setNewFaqA('');
                  setNewFaqOpen(false);
                  toast({ title: 'FAQ added' });
                }}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* About Edit Modal */}
        <Dialog open={!!editAbout} onOpenChange={(o) => !o && setEditAbout(null)}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Edit Section</DialogTitle>
            </DialogHeader>
            {editAbout && (
              <div className="space-y-3">
                <Input className="bg-zinc-800 border-zinc-700 text-white" value={editAbout.section} onChange={(e) => setEditAbout({ ...editAbout, section: e.target.value })} placeholder="Section name" />
                <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={editAbout.content} onChange={(e) => setEditAbout({ ...editAbout, content: e.target.value })} placeholder="Content" />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setEditAbout(null)}>Cancel</Button>
                  <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                    await api(`/api/about/${editAbout.id}`, { method: 'PUT', body: JSON.stringify({ section: editAbout.section, content: editAbout.content }) });
                    const updated = await api('/api/about', { method: 'GET' });
                    setAboutSections(Array.isArray(updated) ? updated : []);
                    setEditAbout(null);
                    toast({ title: 'Section updated' });
                  }}>Save</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* About Add Modal */}
        <Dialog open={newAboutOpen} onOpenChange={setNewAboutOpen}>
          <DialogContent className="bg-black text-white">
            <DialogHeader>
              <DialogTitle>Add Section</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input className="bg-zinc-800 border-zinc-700 text-white" value={newAboutSection} onChange={(e) => setNewAboutSection(e.target.value)} placeholder="Section" />
              <textarea className="w-full rounded-md bg-zinc-800 border-zinc-700 text-white p-2 h-28" value={newAboutContent} onChange={(e) => setNewAboutContent(e.target.value)} placeholder="Content" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-700/10" onClick={() => setNewAboutOpen(false)}>Cancel</Button>
                <Button className="bg-red-700 hover:bg-red-800" onClick={async () => {
                  if (!newAboutSection.trim() || !newAboutContent.trim()) {
                    toast({ title: 'Section and Content required' });
                    return;
                  }
                  await api('/api/about', { method: 'POST', body: JSON.stringify({ section: newAboutSection, content: newAboutContent }) });
                  const updated = await api('/api/about', { method: 'GET' });
                  setAboutSections(Array.isArray(updated) ? updated : []);
                  setNewAboutSection('');
                  setNewAboutContent('');
                  setNewAboutOpen(false);
                  toast({ title: 'Section added' });
                }}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
