import type { Portion } from '../../data/types';
import './SegmentedPortion.css';

const ORDER: Portion[] = ['small', 'medium', 'large'];

interface SegmentedPortionProps {
  value?: Portion;
  labels: Record<Portion, string>;
  onChange: (portion: Portion) => void;
}

export function SegmentedPortion({ value, labels, onChange }: SegmentedPortionProps) {
  return (
    <div className="segmented" role="group">
      {ORDER.map((portion) => (
        <button
          key={portion}
          type="button"
          className={`segmented__item${value === portion ? ' segmented__item--active' : ''}`}
          aria-pressed={value === portion}
          onClick={() => onChange(portion)}
        >
          {labels[portion]}
        </button>
      ))}
    </div>
  );
}
