import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  /** Id of the element naming this dialog. */
  labelledBy?: string;
  className?: string;
}

/**
 * The dialog shell both modals share.
 *
 * Fixes three things the hand-rolled overlays got wrong: Escape did nothing,
 * clicking the backdrop did nothing, and the page behind kept scrolling under
 * the dialog.
 */
export function Modal({ onClose, children, labelledBy, className = 'max-w-3xl' }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onMouseDown={(event) => {
        // Only a press that starts on the backdrop closes, so a drag that ends
        // outside the panel does not dismiss it.
        if (!panel.current?.contains(event.target as Node)) onClose();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-ink-950/80 p-4 backdrop-blur-sm"
    >
      <div ref={panel} className={`panel my-8 w-full ${className}`}>
        {children}
      </div>
    </div>
  );
}
