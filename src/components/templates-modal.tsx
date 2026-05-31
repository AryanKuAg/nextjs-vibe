"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
      <DialogContent className="sm:max-w-[960px] h-[calc(100vh-170px)] !flex !flex-col bg-[#1c1c1c] border-[#2c2c2c] text-white p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 px-6 border-b border-[#2c2c2c]">
          <DialogTitle className="font-inconsolata text-sm font-normal">Choose a background</DialogTitle>
        </DialogHeader>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-4">
            {TEMPLATES.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={cn(
                  "relative aspect-video rounded-xl overflow-hidden cursor-pointer group border transition-all",
                  selectedTemplate?.id === template.id ? "border-white" : "border-transparent hover:border-[#333]"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={template.coverUrl}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  <div className="w-full py-1.5 bg-white/20 backdrop-blur-md border border-white/20 rounded-lg text-center text-sm font-inconsolata font-medium text-white shadow-sm">
                    Use this
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="p-4 px-6 border-t border-[#2c2c2c] flex flex-row items-center justify-between sm:justify-between w-full">
          <span className="text-[#888] text-sm font-inconsolata">
            Click a template to select it
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-white hover:bg-white/10 hover:text-white font-inconsolata rounded-full h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUseTemplate}
              disabled={!selectedTemplate}
              className="bg-white text-black hover:bg-white/90 font-inconsolata rounded-full h-9 px-4 disabled:opacity-50"
            >
              Use template
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
