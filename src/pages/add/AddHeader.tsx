import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

/** 录入流程各页共用的页头：返回箭头 + 标题 + 右侧动作 */
export function AddHeader({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <header className="add__header">
      <button
        type="button"
        className="add__back"
        aria-label="返回"
        onClick={() => (onBack ? onBack() : navigate(-1))}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 5 8 12l7 7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="add__titles">
        <h1 className="add__title">{title}</h1>
        {subtitle ? <p className="add__subtitle">{subtitle}</p> : null}
      </div>
      <div className="add__actions">{right}</div>
    </header>
  );
}
