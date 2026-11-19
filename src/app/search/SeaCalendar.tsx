import { use, useId, useState, useSyncExternalStore } from 'react';
import { addDays, addMonths, differenceInCalendarDays, differenceInCalendarMonths, format, isValid, parseISO } from 'date-fns';
import styles from './atlas.module.css';

const scales = {
  weeks: { label: '四千周', unit: '周', total: 4000, wide: 125, narrow: 80 },
  days: { label: '三万天', unit: '天', total: 30000, wide: 300, narrow: 200 },
  months: { label: '千月', unit: '月', total: 1000, wide: 100, narrow: 50 },
} as const;
type Scale = keyof typeof scales;
const scaleOrder: Scale[] = ['days', 'weeks', 'months'];

function localDay() { return format(new Date(), 'yyyy-MM-dd'); }
function subscribeDay(update: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  function schedule() {
    clearTimeout(timer);
    update();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    timer = setTimeout(schedule, midnight.getTime() - Date.now() + 50);
  }
  schedule();
  document.addEventListener('visibilitychange', schedule);
  return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', schedule); };
}

// One pattern per state keeps even 30,000 individual squares inexpensive to draw.
function CalendarGrid({ total, columns, elapsed, className }: { total: number; columns: number; elapsed: number; className: string }) {
  const id = useId();
  const cell = 10;
  const width = columns * cell;
  const height = total / columns * cell;
  const completed = Math.min(total, elapsed);
  const row = Math.floor(completed / columns) * cell;
  const x = completed % columns * cell;
  return <svg aria-hidden="true" className={className} viewBox={`0 0 ${width} ${height}`}>
    <defs>{['future', 'past'].map(state => <pattern id={`${id}-${state}`} key={state} patternUnits="userSpaceOnUse" width={cell} height={cell}>
      <rect x="1" y="1" width="7.8" height="7.8" rx="1.4" fill={`var(--${state})`} />
    </pattern>)}</defs>
    <rect width={width} height={height} fill={`url(#${id}-future)`} />
    <path d={`M0 0H${width}V${row}H${x}v${completed < total ? cell : 0}H0Z`} fill={`url(#${id}-past)`} />
    {completed < total && <g><circle cx={x + 5} cy={row + 5} r="8" fill="var(--paper)" /><circle cx={x + 5} cy={row + 5} r="5.5" fill="var(--present)" stroke="var(--present)" vectorEffect="non-scaling-stroke" strokeWidth="1.3" /></g>}
  </svg>;
}

export function SeaCalendar({ birthday }: { birthday: Promise<string | null> }) {
  const date = use(birthday);
  const [scale, setScale] = useState<Scale>('weeks');
  const day = useSyncExternalStore(subscribeDay, localDay, () => '');
  const birth = parseISO(date ?? '');
  if (!date || !isValid(birth)) return <p className={styles.note}>暂时读不到出生日期，海历需要用它计算第一格。</p>;
  if (!day) return <p className={styles.note}>正在展开海历…</p>;
  const today = parseISO(day);
  if (birth > today) return <p className={styles.note}>出生日期晚于今天，暂时无法绘制海历。</p>;

  const days = differenceInCalendarDays(today, birth);
  let months = differenceInCalendarMonths(today, birth);
  if (addMonths(birth, months) > today) months--;
  const elapsed = scale === 'weeks' ? Math.floor(days / 7) : scale === 'months' ? months : days;
  const { label, unit, total, wide, narrow } = scales[scale];
  const start = scale === 'weeks' ? addDays(birth, elapsed * 7) : scale === 'months' ? addMonths(birth, months) : today;
  const end = scale === 'weeks' ? addDays(start, 6) : scale === 'months' ? addDays(addMonths(birth, months + 1), -1) : today;
  const range = format(start, 'yyyy.MM.dd') + (scale === 'days' ? '' : ' — ' + format(end, start.getFullYear() === end.getFullYear() ? 'MM.dd' : 'yyyy.MM.dd'));
  const position = (elapsed + 1).toLocaleString('zh-CN');

  return <>
    <div className={styles.scale} role="group" aria-label="海历刻度">{scaleOrder.map(key =>
      <button key={key} type="button" aria-pressed={key === scale} onClick={() => setScale(key)}>{scales[key].label}</button>
    )}</div>
    <div className={styles.chart}>
      <div className={styles.readout} aria-live="polite"><p>第 <strong>{position}</strong> {unit === '月' ? '个月' : unit}</p><span>{range}</span></div>
      <div role="img" aria-label={`${label}，每格一${unit === '月' ? '个月' : unit}，已走过 ${Math.min(total, elapsed)} 格${elapsed < total ? `，当前第 ${position} 格` : '，已走完整张图'}`}>
        <CalendarGrid total={total} elapsed={elapsed} columns={wide} className={styles.wideGrid} />
        <CalendarGrid total={total} elapsed={elapsed} columns={narrow} className={styles.narrowGrid} />
      </div>
      <div className={styles.chartFoot}><span>每格{scale === 'days' ? '一天' : scale === 'weeks' ? '一周' : '一个月'}</span><div className={styles.legend}><span>已走过</span><span>此刻</span><span>未到</span></div></div>
    </div>
  </>;
}
