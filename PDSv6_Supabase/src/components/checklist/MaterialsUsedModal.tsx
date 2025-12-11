import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ChemItem = { id: string; name: string };
type MatItem = { id: string; name: string };

type ChemRow = { chemicalId: string; fraction: '1/8'|'1/4'|'3/8'|'1/2'|'5/8'|'3/4'|'7/8'|'1'|''; notes?: string };
type MatRow = { materialId: string; quantityNote: string };

export default function MaterialsUsedModal({
  open,
  onOpenChange,
  chemicalsList,
  materialsList,
  initialChemRows,
  initialMatRows,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  chemicalsList: ChemItem[];
  materialsList: MatItem[];
  initialChemRows: ChemRow[];
  initialMatRows: MatRow[];
  onSave: (chemRows: ChemRow[], matRows: MatRow[]) => void;
}) {
  const FRACTIONS: ChemRow['fraction'][] = ['1/8','1/4','3/8','1/2','5/8','3/4','7/8','1'];
  const [chemRows, setChemRows] = useState<ChemRow[]>([]);
  const [matRows, setMatRows] = useState<MatRow[]>([]);

  useEffect(() => {
    if (open) {
      setChemRows(initialChemRows?.length ? initialChemRows : []);
      setMatRows(initialMatRows?.length ? initialMatRows : []);
    }
  }, [open, initialChemRows, initialMatRows]);

  const addChemicalRow = () => setChemRows(prev => ([...prev, { chemicalId: '', fraction: '', notes: '' }]));
  const updateChemicalRow = (idx: number, patch: Partial<ChemRow>) => setChemRows(prev => {
    const next = [...prev];
    next[idx] = { ...next[idx], ...patch };
    return next;
  });
  const removeChemicalRow = (idx: number) => setChemRows(prev => prev.filter((_, i) => i !== idx));

  const addMaterialRow = () => setMatRows(prev => ([...prev, { materialId: '', quantityNote: '' }]));
  const updateMaterialRow = (idx: number, patch: Partial<MatRow>) => setMatRows(prev => {
    const next = [...prev];
    next[idx] = { ...next[idx], ...patch };
    return next;
  });
  const removeMaterialRow = (idx: number) => setMatRows(prev => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    onSave(chemRows, matRows);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Materials Used</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Chemicals (fractional)</h3>
            <p className="text-sm text-muted-foreground">Select chemical and fraction used. Add notes if needed.</p>
            <div className="space-y-3 mt-3">
              {chemRows.map((row, idx) => (
                <div key={`chem-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-4">
                    <Label>Chemical</Label>
                    <select
                      value={row.chemicalId}
                      onChange={(e) => updateChemicalRow(idx, { chemicalId: e.target.value })}
                      className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                    >
                      <option value="">Select a chemical...</option>
                      {chemicalsList.map(it => (<option key={it.id} value={it.id}>{it.name}</option>))}
                    </select>
                  </div>
                  <div className="md:col-span-6">
                    <Label>Quantity Used</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {FRACTIONS.map(f => (
                        <label key={f} className="flex items-center gap-1 text-sm px-2 py-1 rounded border">
                          <input type="checkbox" checked={row.fraction === f} onChange={() => updateChemicalRow(idx, { fraction: row.fraction === f ? '' : f })} />
                          <span>{f}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Notes</Label>
                    <Input type="text" value={row.notes || ''} onChange={(e) => updateChemicalRow(idx, { notes: e.target.value })} placeholder="Optional note" />
                  </div>
                  <div className="md:col-span-12 flex justify-end">
                    <Button variant="outline" onClick={() => removeChemicalRow(idx)}>Remove</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addChemicalRow}>Add Chemical</Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Materials (note-based)</h3>
            <p className="text-sm text-muted-foreground">Add materials used (e.g., 5 rags, 2 brushes).</p>
            <div className="space-y-3 mt-3">
              {matRows.map((row, idx) => (
                <div key={`mat-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5">
                    <Label>Material</Label>
                    <select
                      value={row.materialId}
                      onChange={(e) => updateMaterialRow(idx, { materialId: e.target.value })}
                      className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                    >
                      <option value="">Select a material...</option>
                      {materialsList.map(it => (<option key={it.id} value={it.id}>{it.name}</option>))}
                    </select>
                  </div>
                  <div className="md:col-span-6">
                    <Label>Quantity Used</Label>
                    <Input type="text" value={row.quantityNote} onChange={(e) => updateMaterialRow(idx, { quantityNote: e.target.value })} placeholder="e.g., 5 rags, 2 brushes" />
                  </div>
                  <div className="md:col-span-12 flex justify-end">
                    <Button variant="outline" onClick={() => removeMaterialRow(idx)}>Remove</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addMaterialRow}>Add Material</Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button className="bg-gradient-hero" onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

