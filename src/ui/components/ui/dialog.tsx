import * as React from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {cn} from '../../lib/utils';
import {X} from 'lucide-react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({open, onOpenChange, children}: DialogProps) {
  // Close on Escape key
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            transition={{duration: 0.2}}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          {/* Content */}
          <div className="fixed inset-0 flex items-center justify-center p-4">{children}</div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

export function DialogContent({children, className, onClose}: DialogContentProps) {
  return (
    <motion.div
      initial={{opacity: 0, scale: 0.95, y: 10}}
      animate={{opacity: 1, scale: 1, y: 0}}
      exit={{opacity: 0, scale: 0.95, y: 10}}
      transition={{type: 'spring', duration: 0.3, bounce: 0.1}}
      className={cn(
        'relative bg-surface rounded-xl shadow-xl border border-border w-full max-w-md max-h-[85vh] overflow-auto',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full bg-background-subtle text-foreground-muted transition-all duration-fast hover:bg-muted hover:text-foreground focus:outline-none focus:shadow-glow"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
      {children}
    </motion.div>
  );
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogHeader({children, className}: DialogHeaderProps) {
  return <div className={cn('flex flex-col space-y-2 p-6 pb-0', className)}>{children}</div>;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogTitle({children, className}: DialogTitleProps) {
  return <h2 className={cn('text-xl font-semibold text-foreground', className)}>{children}</h2>;
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogDescription({children, className}: DialogDescriptionProps) {
  return <p className={cn('text-sm text-foreground-muted', className)}>{children}</p>;
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogFooter({children, className}: DialogFooterProps) {
  return (
    <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end gap-3 p-6 pt-4', className)}>{children}</div>
  );
}
