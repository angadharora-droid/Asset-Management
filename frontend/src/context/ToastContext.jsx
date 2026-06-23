import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { IconCheckCircle, IconAlert, IconInfo } from '../components/Icon.jsx';

const ToastContext = createContext(() => {});

const TONES = {
  success: { cls: 'border-good/30', Icon: IconCheckCircle, color: 'text-good' },
  error: { cls: 'border-damaged/30', Icon: IconAlert, color: 'text-damaged' },
  info: { cls: 'border-gold-light/40', Icon: IconInfo, color: 'text-gold-light' },
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  // showToast('message')  or  showToast('message', 'error')
  const showToast = useCallback((message, tone = 'success') => {
    setToast({ message, tone, id: (timer.now = (timer.now || 0) + 1) });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const t = toast ? TONES[toast.tone] || TONES.success : null;

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[80] pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toast && t && (
          <div
            key={toast.id}
            className={`flex items-center gap-2.5 bg-navy-deep text-white pl-3.5 pr-4 py-3 rounded-xl text-[13.5px] font-medium shadow-modal border ${t.cls} animate-sheet-up`}
          >
            <t.Icon size={18} className={t.color} />
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
