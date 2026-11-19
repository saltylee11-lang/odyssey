// Run with a checkout of https://github.com/NateScarlet/holiday-cn as the argument.
// The 2007–2027 edition uses holiday-cn revision a8a8b4e8e960e1934a8b62aad34663a66a53b578.
// The checked-in JSON is sufficient to build the site; no runtime calendar service is used.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import lunar from 'lunar-javascript';

const archive = process.argv[2];
if (!archive) throw Error('Pass the holiday-cn checkout directory.');
const { Solar, Lunar, HolidayUtil } = lunar;
const output = new URL('../src/lib/calendar/', import.meta.url);
const mmdd = solar => solar.getMonth() * 100 + solar.getDay();
const lunarDates = [[1,1], [1,15], [5,5], [7,7], [8,15], [9,9]];
const years = [];
for (let year = 1901; year <= 2100; year++) {
  const table = Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable();
  const terms = Object.values(table).filter(date => date.getYear() === year).map(mmdd).sort((a,b) => a-b);
  if (new Set(terms).size !== 24) throw Error('Incomplete solar term year ' + year);
  const lunarFestivals = lunarDates.map(([m,d]) => Lunar.fromYmd(year, m, d).getSolar());
  const eve = lunarFestivals[0].next(-1);
  years.push('  "' + year + '": ' + JSON.stringify([...terms, ...lunarFestivals.map(mmdd), mmdd(eve)]));
}
writeFileSync(new URL('festival-dates.json', output), '{\n' + years.join(',\n') + '\n}\n');

const schedule = new Map();
const names = new Map([['元旦节','元旦'], ['“十一”','国庆节'], ['“五一”','劳动节'], ['“五一”国际劳动节','劳动节']]);
function add(date, name, isOffDay) {
  const label = (names.get(name) ?? name) + (isOffDay ? '假期' : '补班');
  schedule.set(date.replaceAll('-', ''), label);
}
for (let year = 2002; year <= 2006; year++) {
  for (const day of HolidayUtil.getHolidays(year)) add(day.getDay(), day.getName(), !day.isWork());
}
for (const file of readdirSync(archive).filter(name => /^\d{4}\.json$/.test(name)).sort()) {
  const report = JSON.parse(readFileSync(join(archive, file), 'utf8'));
  if (!report.days?.length || !report.papers?.length) throw Error('Missing schedule or source for ' + file);
  for (const day of report.days) add(day.date, day.name, day.isOffDay);
}
writeFileSync(new URL('work-calendar.json', output), JSON.stringify(Object.fromEntries(schedule), null, 2) + '\n');
