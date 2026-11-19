import annualDates from './festival-dates.json';
import holidayDates from './work-calendar.json';
import { birthdayGreeting } from './birthday';

const terms = '小寒 大寒 立春 雨水 惊蛰 春分 清明 谷雨 立夏 小满 芒种 夏至 小暑 大暑 立秋 处暑 白露 秋分 寒露 霜降 立冬 小雪 大雪 冬至'.split(' ');
const festivals = ['春节', '元宵节', '端午节', '七夕', '中秋节', '重阳节', '除夕'];
const fixedFestivals: Record<number, { since: number; label: string }> = {
  101: { since: 1912, label: '元旦' }, 501: { since: 1950, label: '劳动节' }, 1001: { since: 1949, label: '国庆节' },
};
const annual: Record<string, number[]> = annualDates;
const schedule: Record<string, string> = holidayDates;

type Kind = 'birthday' | 'work' | 'off' | 'festival' | 'term';
export type CalendarNote = { kind: Kind; label: string };

export function notesForDate(date: Date, birth: Date): CalendarNote[] {
  const year = date.getFullYear();
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  const notes: CalendarNote[] = [];
  const wish = birthdayGreeting(date, birth);
  if (wish) notes.push({ kind: 'birthday', label: wish });

  const dates = annual[year];
  const fixed = fixedFestivals[md];
  if (fixed && year >= fixed.since) notes.push({ kind: 'festival', label: fixed.label });
  const lunarIndex = dates?.indexOf(md, terms.length) ?? -1;
  if (lunarIndex >= 0) notes.push({ kind: 'festival', label: festivals[lunarIndex - terms.length] });
  const termIndex = dates?.indexOf(md) ?? -1;
  if (termIndex >= 0 && termIndex < terms.length) notes.push({ kind: 'term', label: terms[termIndex] });

  const status = schedule[year * 10000 + md];
  if (status) {
    const work = status.endsWith('补班');
    const named = new Set(notes.map(note => note.label === '清明' ? '清明节' : note.label));
    const repeated = !work && status.slice(0, -2).split('、').every(name => named.has(name));
    const label = repeated ? '放假' : status;
    notes.push({ kind: work ? 'work' : 'off', label });
  }
  return notes;
}
