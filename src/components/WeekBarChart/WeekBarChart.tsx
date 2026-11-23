import './WeekBarChart.css';

export interface ChartBar {
  label: string;
  value: number;
  hasData: boolean;
}

interface WeekBarChartProps {
  bars: ChartBar[];
  target: number;
  /** 说明文案，比如「每格是这一周的平均每日热量」 */
  caption?: string;
}

export function WeekBarChart({ bars, target, caption }: WeekBarChartProps) {
  const peak = Math.max(target * 1.2, ...bars.map((bar) => bar.value), 1);
  const targetBottom = Math.min(100, (target / peak) * 100);

  return (
    <div className="chart">
      <div className="chart__area">
        <div className="chart__target" style={{ bottom: `${targetBottom}%` }} aria-hidden="true">
          <span className="chart__target-label">{Math.round(target)}</span>
        </div>

        {bars.map((bar, index) => {
          const height = Math.min(100, (bar.value / peak) * 100);
          const over = bar.value > target;
          const tone = !bar.hasData ? 'empty' : over ? 'over' : 'ok';
          return (
            <div className="chart__col" key={`${bar.label}-${index}`}>
              <div className="chart__track">
                <span
                  className={`chart__bar chart__bar--${tone}`}
                  style={{ height: `${height}%`, animationDelay: `${index * 40}ms` }}
                  title={`${bar.label} ${Math.round(bar.value)} kcal`}
                />
              </div>
              <span className="chart__label">{bar.label}</span>
            </div>
          );
        })}
      </div>

      {caption ? <p className="chart__caption">{caption}</p> : null}
    </div>
  );
}
