"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TEMPLATES, Template } from "@/lib/templates";
import { cn } from "@/lib/utils";

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: Template) => void;
}

export const TemplatesModal = ({ isOpen, onClose, onSelect }: TemplatesModalProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="rounded-2xl sm:max-w-[960px] h-[calc(100vh-170px)] !flex !flex-col bg-[#212121] border-0 text-white p-0 gap-0 overflow-hidden shadow-2xl ">
        <DialogHeader className="p-4 border-b border-[#2c2c2c] h-[64px]!">
          <DialogTitle className="font-inconsolata text-sm font-normal translate-y-[7px]">Choose a background</DialogTitle>
          <DialogClose className="absolute top-[25px] right-4  transition-opacity w-4 h-4 flex items-center justify-center">
            <i className="ri-close-line text-[16px] leading-none text-[#737373] hover:text-white" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-4">
            {TEMPLATES.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={cn(
                  "relative aspect-video rounded-[16px] overflow-hidden cursor-pointer group border transition-all",
                  selectedTemplate?.id === template.id ? "border-white border-2" : "border-transparent hover:border-[#333] hover:opacity-60"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={template.coverUrl}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />


              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-[#2c2c2c] flex flex-row items-center justify-between sm:justify-between w-full  h-[64px]!">
          <span className="text-[#737373] text-sm font-inconsolata">
            Click a template to select it
          </span>
          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              className="text-white hover:text-white font-inconsolata rounded-[8px] h-9 px-3 border border-[#2c2c2c] hover:bg-white/5 bg-[#212121]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUseTemplate}
              disabled={!selectedTemplate}
              className="bg-white text-black hover:bg-white/90 font-inconsolata rounded-[8px] h-9 px-3 disabled:opacity-50"
            >
              Use template
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
