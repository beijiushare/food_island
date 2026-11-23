import { useEffect, useRef, useState } from 'react';

import './CalorieRing.css';

interface CalorieRingProps {
  value: number;
  target: number;
  unit?: string;
}

const SIZE = 148;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** 数字补间（设计文档 §6.2：count-up 600ms ease-out） */
function useCountUp(target: number, duration = 600) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + (target - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

export function CalorieRing({ value, target, unit = 'kcal' }: CalorieRingProps) {
  const shown = useCountUp(value);
  const ratio = target > 0 ? value / target : 0;
  const over = ratio > 1;
  const dash = CIRCUMFERENCE * Math.min(ratio, 1);

  return (
    <div className={`calorie-ring${over ? ' calorie-ring--over' : ''}`}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="calorie-ring__track"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          className="calorie-ring__progress"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE - dash}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div className="calorie-ring__center">
        <span className="calorie-ring__value">{Math.round(shown).toLocaleString()}</span>
        <span className="calorie-ring__sub">
          / {target.toLocaleString()} {unit}
        </span>
      </div>
    </div>
  );
}
