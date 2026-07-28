import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LetterMaker from '@/pages/LetterMaker';
import { PenTool } from 'lucide-react';

interface LetterMakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
}

export function LetterMakerModal({ isOpen, onClose, customerId }: LetterMakerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 bg-zinc-950 border-zinc-800 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 border-b border-zinc-800 flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <PenTool className="w-5 h-5 text-blue-500" />
            Letter Maker
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto relative">
          {isOpen && (
              <Routes location={{
                  pathname: window.location.pathname,
                  search: `?customerId=${customerId}`,
                  hash: '',
                  state: null,
                  key: 'letter-maker-modal'
              }}>
                <Route path="*" element={<LetterMaker />} />
              </Routes>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
