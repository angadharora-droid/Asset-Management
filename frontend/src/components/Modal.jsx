import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from './Icon.jsx';

const WIDTHS = {
  sm: 'max-w-[440px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[680px]',
};

// Shared dialog shell.
// The panel is centered on every screen and capped at 88vh, so it can never be
// taller than the viewport. Inside, it's a flex column: header + footer are
// pinned (flex-none) and ONLY the body scrolls (flex-1 + min-h-0). That min-h-0
// is essential — without it the body refuses to shrink and the panel overflows,
// clipping the header.
export default function Modal({ onClose, header, footer, size = 'md', ariaLabel, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Render into document.body so `position: fixed` resolves against the
  // viewport — not against any ancestor that has a transform/filter (e.g. the
  // page's fade-in animation), which would otherwise trap and clip the dialog.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      {/* scrim */}
      <div className="absolute inset-0 bg-navy-deep/55 backdrop-blur-[3px]" aria-hidden="true" onClick={onClose} />

      {/* panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`relative w-full ${WIDTHS[size]} max-h-[88vh] flex flex-col min-h-0 outline-none
                    bg-paper rounded-2xl shadow-modal ring-1 ring-navy/5 overflow-hidden animate-scale-in`}
      >
        {/* header (pinned) */}
        {header && (
          <div className="flex-none flex items-start justify-between gap-3 px-5 pt-4 pb-3.5
                          border-b border-line bg-gradient-to-b from-cream/60 to-white">
            <div className="min-w-0">{header}</div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex-none w-8 h-8 rounded-full text-muted hover:bg-cream hover:text-navy transition-colors
                         flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
            >
              <IconClose size={18} />
            </button>
          </div>
        )}

        {/* body (the only scrolling region) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>

        {/* footer (pinned) */}
        {footer && (
          <div className="flex-none px-5 py-3.5 border-t border-line bg-white">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
