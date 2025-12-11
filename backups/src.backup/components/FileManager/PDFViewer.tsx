import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Download, Printer } from "lucide-react"

export default function PDFViewer({ url, open, onClose }: { url: string; open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[92vh] p-0 bg-black rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-zinc-800">
            <X className="w-6 h-6" />
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(url, "_blank")}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
          </div>
        </div>
        <iframe
          src={`${url}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
          className="w-full h-full bg-black"
          title="PDF Preview"
        />
      </DialogContent>
    </Dialog>
  )
}
