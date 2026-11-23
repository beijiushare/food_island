import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import './Sheet.css';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}

const EXIT_MS = 200;

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (open || !mounted) return;
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className={`sheet${open ? ' sheet--open' : ''}`} role="dialog" aria-modal="true">
      <div className="sheet__mask" onClick={onClose} />
      <div className="sheet__panel">
        <div className="sheet__handle" aria-hidden="true" />
        {title ? <h2 className="sheet__title">{title}</h2> : null}
        <div className="sheet__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
