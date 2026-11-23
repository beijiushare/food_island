import './Stepper.css';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 2000,
  step = 10,
  unit = 'g',
}: StepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next)));
  const minusDisabled = value <= min;
  const plusDisabled = value >= max;

  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(clamp(value - step))}
        disabled={minusDisabled}
        aria-label="减少"
      >
        −
      </button>
      <span className="stepper__value">
        {value}
        <span className="stepper__unit">{unit}</span>
      </span>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(clamp(value + step))}
        disabled={plusDisabled}
        aria-label="增加"
      >
        +
      </button>
    </div>
  );
}
