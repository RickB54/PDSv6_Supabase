import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo } from "react";
import { useCallback } from "react";

type ChecklistTask = { id: string; name: string; category: 'preparation'|'exterior'|'interior'|'final'; checked: boolean };

type ChecklistRecord = {
  id: string;
  packageId: string;
  vehicleType: string;
  vehicleTypeNote?: string;
  addons: string[];
  tasks: ChecklistTask[];
  progress: number;
  employeeId?: string;
  estimatedTime?: string;
  customerId?: string;
  jobId?: string;
  createdAt?: string;
};

type JobPdf = {
  id: string;
  fileName: string;
  date: string;
  timestamp: string;
  recordId: string; // checklistId
  customerName: string;
  pdfData: string;
};

export default function JobHistoryModal({ open, onOpenChange, jobPdf, checklist, adminUpdatesPdf }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobPdf: JobPdf | null;
  checklist: ChecklistRecord | null;
  adminUpdatesPdf?: { id: string; fileName: string; pdfData?: string } | null;
}) {
  const groupedTasks = useMemo(() => {
    const categories: Record<string, ChecklistTask[]> = { preparation: [], exterior: [], interior: [], final: [] };
    (checklist?.tasks || []).forEach(t => { (categories[t.category] ||= []).push(t); });
    return categories;
  }, [checklist]);

  const handlePayEmployee = useCallback(() => {
    try {
      const employee = (checklist?.employeeId || '').trim();
      const jobId = String(checklist?.id || jobPdf?.recordId || '');
      const url = `/payroll?employee=${encodeURIComponent(employee || '')}&jobId=${encodeURIComponent(jobId)}&modal=1`;
      window.open(url, 'pay_employee', 'width=720,height=640');
    } catch {}
  }, [checklist, jobPdf]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-background border-border max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Job Details</DialogTitle>
        </DialogHeader>
        {!checklist && (
          <p className="text-sm text-muted-foreground">No checklist details found for this job.</p>
        )}
        {checklist && (
          <div className="space-y-4">
            <Card className="p-4 bg-gradient-card border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="text-foreground font-medium">{jobPdf?.customerName || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Completed</p>
                  <p className="text-foreground font-medium">{jobPdf?.date || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vehicle Type</p>
                  <p className="text-foreground font-medium">{checklist.vehicleType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Employee</p>
                  <p className="text-foreground font-medium">{checklist.employeeId || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estimated Time</p>
                  <p className="text-foreground font-medium">{checklist.estimatedTime || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Progress</p>
                  <p className="text-foreground font-medium">{Math.round(checklist.progress || 0)}%</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-card border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Selected Services</h3>
              <div className="text-sm">
                <p><span className="text-muted-foreground">Package:</span> <span className="text-foreground">{checklist.packageId}</span></p>
                <p className="mt-1"><span className="text-muted-foreground">Add-ons:</span> <span className="text-foreground">{(checklist.addons || []).join(', ') || '(none)'}</span></p>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-card border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Checklist Items</h3>
              {(['preparation','exterior','interior','final'] as const).map(section => (
                <div key={section} className="mb-3">
                  <p className="text-sm font-medium text-foreground mb-1">{section === 'final' ? 'Final Inspection' : section.charAt(0).toUpperCase() + section.slice(1)}</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60%]">Item</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(groupedTasks[section] || []).map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-foreground">{t.name}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${t.checked ? 'bg-green-700 text-white' : 'bg-zinc-700 text-zinc-200'}`}>{t.checked ? 'Done' : 'Pending'}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </Card>

            <div className="flex items-center gap-3">
              {jobPdf && jobPdf.pdfData && (
                <Button asChild variant="secondary">
                  <a href={jobPdf.pdfData} download={jobPdf.fileName}>Download Job PDF</a>
                </Button>
              )}
              {adminUpdatesPdf && adminUpdatesPdf.pdfData && (
                <Button asChild variant="secondary">
                  <a href={adminUpdatesPdf.pdfData} download={adminUpdatesPdf.fileName}>Admin Updates PDF</a>
                </Button>
              )}
              {checklist?.employeeId && (
                <Button className="bg-red-700 hover:bg-red-800" onClick={handlePayEmployee}>Pay Employee</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
