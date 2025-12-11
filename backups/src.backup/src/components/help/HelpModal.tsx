import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { makeToc, HelpTopic } from './helpData';

type HelpModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: 'admin' | 'employee';
};

export default function HelpModal({ open, onOpenChange, role }: HelpModalProps) {
  const [query, setQuery] = useState('');
  const toc = useMemo(() => makeToc(role), [role]);
  const [index, setIndex] = useState(0);

  // no checkbox management for admin; employees see only the allowed sections

  const filteredToc = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return toc;
    return toc.filter(t => (t.title + ' ' + t.summary + ' ' + t.content.join(' ')).toLowerCase().includes(q));
  }, [query, toc]);

  useEffect(() => {
    // Reset index when TOC changes to avoid out-of-range
    if (index >= filteredToc.length) setIndex(0);
  }, [filteredToc, index]);

  const topic: HelpTopic | undefined = filteredToc[index];

  const goPrev = () => setIndex(i => Math.max(0, i - 1));
  const goNext = () => setIndex(i => Math.min(filteredToc.length - 1, i + 1));

  const manageVisibility = false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-300 to-sky-400">Prime Detail Solutions — Help Guide</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-3 bg-gradient-to-br from-[#0b1d2a] to-[#0f0f13] border border-cyan-700/40 rounded-xl lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="font-semibold text-white">Table of Contents ({role === 'admin' ? 'Admin' : 'Employee'})</div>
            </div>
            <Input placeholder="Search help..." value={query} onChange={(e) => setQuery(e.target.value)} className="mb-2" />
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {role === 'employee' ? (
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-wide text-emerald-300/90">Menu Items</div>
                  {filteredToc.filter(t => t.section === 'menu').map((t, i) => {
                    const idx = filteredToc.indexOf(t);
                    return (
                      <button key={t.id} onClick={() => setIndex(idx)} className={`w-full text-left p-2 rounded ${idx === index ? 'bg-emerald-900/40 text-white' : 'hover:bg-emerald-800/30 text-white'}`}>
                        <div className="text-sm font-semibold">{t.title}</div>
                        <div className="text-xs text-white/70">{t.summary}</div>
                      </button>
                    );
                  })}
                  <div className="text-xs uppercase tracking-wide text-sky-300/90 mt-2">Employee Dashboard</div>
                  {filteredToc.filter(t => t.section === 'dashboard').map((t, i) => {
                    const idx = filteredToc.indexOf(t);
                    return (
                      <button key={t.id} onClick={() => setIndex(idx)} className={`w-full text-left p-2 rounded ${idx === index ? 'bg-sky-900/40 text-white' : 'hover:bg-sky-800/30 text-white'}`}>
                        <div className="text-sm font-semibold">{t.title}</div>
                        <div className="text-xs text-white/70">{t.summary}</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                filteredToc.map((t, i) => (
                  <button key={t.id} onClick={() => setIndex(i)} className={`w-full text-left p-2 rounded ${i === index ? 'bg-cyan-900/40 text-white' : 'hover:bg-cyan-800/30 text-white'}`}>
                    <div className="text-sm font-semibold">{t.title}</div>
                    <div className="text-xs text-white/70">{t.summary}</div>
                  </button>
                ))
              )}
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-[#0c1020] via-[#0f1325] to-[#0f0f13] border border-indigo-700/40 rounded-xl lg:col-span-2">
            {topic ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300">{topic.title}</div>
                    {topic.route && (<div className="text-xs text-cyan-300/80">Route: {topic.route}</div>)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={goPrev} className="text-emerald-300">
                      <span className="text-lg">{'<'}</span>
                    </Button>
                    <Button variant="ghost" onClick={goNext} className="text-sky-300">
                      <span className="text-lg">{'>'}</span>
                    </Button>
                    <Button onClick={goPrev} variant="secondary" className="bg-emerald-700/60 hover:bg-emerald-700">Previous</Button>
                    <Button onClick={goNext} variant="secondary" className="bg-sky-700/60 hover:bg-sky-700">Next</Button>
                  </div>
                </div>
                <div className="max-h-[70vh] overflow-y-auto space-y-2 pr-2">
                  {topic.content.map((p, i) => (
                    <p key={i} className="text-sm text-white/90">{p}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No matching topics.</div>
            )}
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
