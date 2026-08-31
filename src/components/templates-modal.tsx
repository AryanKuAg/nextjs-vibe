"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Image from "next/image";

import { type TemplateManifest } from "@/lib/templates/registry";

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: TemplateManifest[];
}

export function TemplatesModal({ isOpen, onClose, templates }: TemplatesModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Templates are taken away and run elsewhere rather than started here, so
  // the only thing this modal does with a selection is hand over its source.
  // The response is an attachment, so navigating leaves the modal where it is.
  const handleDownload = () => {
    if (!selectedTemplate) return;
    window.location.assign(`/api/templates/${encodeURIComponent(selectedTemplate)}/download`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-grey-bg rounded-[16px] w-full max-w-[992px] h-[680px] max-h-[85vh] border-[0.5px] border-white-12 relative flex flex-col"
            style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-[0.5px] border-white-8">
              <h3 className="text-sm font-medium leading-[20px] text-white-50">
                Choose a template
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-white/40 hover:text-white transition-colors h-7 w-7 hover:bg-white-8 rounded-[6px] flex items-center justify-center group"
              >
                <i className="ri-close-line text-[20px] group-hover:text-white-85" />
              </button>
            </div>

            {/* Content (Grid) */}
            <div className="p-4 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => {
                  const isSelected = selectedTemplate === template.id;
                  return (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`relative aspect-[16/9] rounded-[8px] overflow-hidden cursor-pointer border ${isSelected ? 'border-white' : 'border-white-8'} hover:border-white/50 transition-colors bg-[#1c1c1c]`}
                    >
                      <Image
                        src={template.homescreenImgSrc}
                        alt={template.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t-[0.5px] border-white-8 mt-auto shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!selectedTemplate}
                className="shrink-0 px-2 rounded-[6px] border-[0.5px] border-white-12 bg-transparent text-white-85 text-[14px] hover:bg-white-8  disabled:opacity-50 h-[28px] font-medium leading-[20px]"
              >
                Download template
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
