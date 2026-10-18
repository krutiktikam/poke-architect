import React from 'react';
import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useBackToClose } from '../../hooks/useBackToClose';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  maxWidth?: string; // e.g. 'max-w-2xl', 'max-w-4xl'
  id?: string;
  hideCloseButton?: boolean;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-2xl',
  id,
  hideCloseButton = false,
}) => {
  // Android / Browser Back-button to close
  useBackToClose({ isOpen, onClose, id });

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            {/* Backdrop Overlay with quality-responsive blur */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm [html[data-quality='low']_&]:backdrop-blur-none [html[data-quality='low']_&]:bg-black/90"
              />
            </Dialog.Overlay>

            {/* Modal / Bottom Sheet Content */}
            <Dialog.Content asChild>
              <div className="fixed inset-0 z-50 pointer-events-none flex items-end md:items-center justify-center p-0 md:p-6">
                <motion.div
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  drag="y"
                  dragConstraints={{ top: 0 }}
                  dragElastic={{ top: 0, bottom: 0.6 }}
                  onDragEnd={(_e, info) => {
                    if (info.offset.y > 100 || info.velocity.y > 400) {
                      onClose();
                    }
                  }}
                  className={`pointer-events-auto w-full ${maxWidth} max-h-[90vh] md:max-h-[85vh] flex flex-col rounded-t-[2.5rem] md:rounded-[2rem] border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.8)] overflow-hidden bg-[#161927] [html[data-quality='high']_&]:backdrop-blur-2xl [html[data-quality='high']_&]:bg-[#161927]/95 [html[data-quality='low']_&]:bg-[#161927] pb-[max(1rem,env(safe-area-inset-bottom))]`}
                >
                  {/* Mobile Drag Indicator */}
                  <div className="md:hidden pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
                    <div className="w-12 h-1.5 rounded-full bg-white/20" />
                  </div>

                  {/* Header */}
                  {(title || !hideCloseButton) && (
                    <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 shrink-0">
                      <div>
                        {title && (
                          <Dialog.Title asChild>
                            <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white m-0">
                              {title}
                            </h2>
                          </Dialog.Title>
                        )}
                        {description && (
                          <Dialog.Description asChild>
                            <p className="text-xs text-slate-400 mt-0.5 m-0 font-medium">
                              {description}
                            </p>
                          </Dialog.Description>
                        )}
                      </div>

                      {!hideCloseButton && (
                        <Dialog.Close asChild>
                          <button
                            type="button"
                            aria-label="Close dialog"
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          >
                            <X size={20} />
                          </button>
                        </Dialog.Close>
                      )}
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {children}
                  </div>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

export default Sheet;
