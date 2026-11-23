import './MacroBar.css';

interface MacroBarProps {
  label: string;
  value: number;
  target: number;
  tone: 'protein' | 'carb' | 'fat';
  unit?: string;
}

export function MacroBar({ label, value, target, tone, unit = 'g' }: MacroBarProps) {
  const ratio = target > 0 ? Math.min(1, value / target) : 0;
  const over = target > 0 && value > target;

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
        {Math.round(value)}/{target}
        <span className="macro-bar__unit">{unit}</span>
      </span>
    </div>
  );
}
