import { useEffect } from 'react';

import './Toast.css';

interface ToastProps {
  message: string | null;
  onDone: () => void;
}

export function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDone, 2200);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div className="toast" role="status">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M3.2 8.4 6.4 11.6 12.8 4.8"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}
