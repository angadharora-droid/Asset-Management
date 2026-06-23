// Shared date filter used by the Sign-Off sheet and Reports. Three modes:
//   • all   — no date restriction
//   • today — only entries logged today
//   • on    — only entries logged on a specific picked date
// Filtering is done by day (local), matching how fmtDate groups elsewhere.
import { fmtDate } from '../utils/format.js';
import { IconCalendar } from './Icon.jsx';

export const ALL_DATES = { mode: 'all', date: '' };

export const todayStr = () => fmtDate(new Date().toISOString());

// Does an ISO timestamp fall within the active filter?
export function matchesDateFilter(iso, f) {
  if (!f || f.mode === 'all') return true;
  if (!iso) return false;
  const day = fmtDate(iso);
  if (f.mode === 'today') return day === todayStr();
  if (f.mode === 'on') return !f.date || day === f.date;
  return true;
}

// Human label for the active filter (shown on the printed sheet & in summaries).
export function describeDateFilter(f) {
  if (!f || f.mode === 'all') return 'All dates';
  if (f.mode === 'today') return `Today · ${todayStr()}`;
  if (f.mode === 'on' && f.date) return `On ${f.date}`;
  return 'All dates';
}

// Short slug for filenames, e.g. "all", "today", "2026-06-22".
export function dateFilterSlug(f) {
  if (!f || f.mode === 'all') return 'all';
  if (f.mode === 'today') return todayStr();
  if (f.mode === 'on' && f.date) return f.date;
  return 'all';
}

const TAB =
  'px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light';

export default function DateFilter({ value = ALL_DATES, onChange, className = '' }) {
  const f = value || ALL_DATES;
  const tab = (active) => `${TAB} ${active ? 'bg-white text-navy shadow-card' : 'text-muted hover:text-navy'}`;
  const onDate = f.mode === 'on' && f.date;

  return (
    <div className={`inline-flex items-center gap-2 flex-wrap ${className}`}>
      <div className="inline-flex p-1 bg-navy/5 rounded-xl">
        <button type="button" className={tab(f.mode === 'all')} onClick={() => onChange(ALL_DATES)}>
          All
        </button>
        <button type="button" className={tab(f.mode === 'today')} onClick={() => onChange({ mode: 'today', date: '' })}>
          Today
        </button>
      </div>
      <label
        className={[
          'inline-flex items-center gap-1.5 rounded-lg border-[1.5px] px-2.5 py-[7px] bg-white cursor-pointer transition-colors',
          onDate ? 'border-gold ring-2 ring-gold-light/50' : 'border-line hover:border-gold/60',
        ].join(' ')}
      >
        <IconCalendar size={15} className="text-gold flex-none" />
        <input
          type="date"
          value={f.mode === 'on' ? f.date : ''}
          max={todayStr()}
          onChange={(e) => onChange(e.target.value ? { mode: 'on', date: e.target.value } : ALL_DATES)}
          className="bg-transparent text-[12.5px] text-ink tnum focus:outline-none cursor-pointer w-[122px]"
          aria-label="Filter by specific date"
        />
      </label>
    </div>
  );
}
