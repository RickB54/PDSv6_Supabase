import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl: string;
  component: React.ComponentType;
  title: string;
  icon?: React.ReactNode;
}

export function PageModal({ isOpen, onClose, initialUrl, component: Component, title, icon }: PageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="dark-theme max-w-[95vw] w-full h-[95vh] p-0 bg-zinc-950 border-zinc-800 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 border-b border-zinc-800 flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            {icon}
            {title}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold text-zinc-400 hover:text-white" onClick={() => {
              window.open(initialUrl, '_blank');
              onClose();
            }}>
              Open Full Page <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
            <DialogClose className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto relative bg-zinc-950">
          {isOpen && (
              <Routes location={{
                  pathname: window.location.pathname,
                  search: initialUrl.includes('?') ? initialUrl.substring(initialUrl.indexOf('?')) : '',
                  hash: '',
                  state: null,
                  key: 'modal'
              }}>
                <Route path="*" element={<Component onModalClose={onClose} />} />
              </Routes>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
