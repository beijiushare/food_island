import './Fab.css';

interface FabProps {
  onClick: () => void;
  label?: string;
}

export function Fab({ onClick, label = '记一笔' }: FabProps) {
  return (
    <button type="button" className="fab" onClick={onClick} aria-label={label}>
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 4.5v15M4.5 12h15"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </button>
  );
}
