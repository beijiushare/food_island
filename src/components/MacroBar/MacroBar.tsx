import './MacroBar.css';

interface MacroBarProps {
  label: string;
  value: number;
  target: number;
  tone: 'protein' | 'carb' | 'fat';
  unit?: string;
  /** 营养构成里只显示百分比，不显示 x/目标 */
  showTarget?: boolean;
}

export function MacroBar({
  label,
  value,
  target,
  tone,
  unit = 'g',
  showTarget = true,
}: MacroBarProps) {
  const ratio = showTarget ? (target > 0 ? Math.min(1, value / target) : 0) : Math.min(1, value / 100);
  const over = showTarget && target > 0 && value > target;

  return (
    <div className={`macro-bar${over ? ' macro-bar--over' : ''}`}>
      <span className="macro-bar__label">{label}</span>
      <span className="macro-bar__track" role="presentation">
        <span
          className={`macro-bar__fill macro-bar__fill--${tone}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
      <span className="macro-bar__value">
        {showTarget ? (
          <>
            {Math.round(value)}/{target}
            <span className="macro-bar__unit">{unit}</span>
          </>
        ) : (
          <>
            {Math.round(value)}
            <span className="macro-bar__unit">{unit}</span>
          </>
        )}
      </span>
    </div>
  );
}
