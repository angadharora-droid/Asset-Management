import { useMemo, useState } from 'react';
import { codeLabel } from '../../utils/asset.js';
import { fmtDate, fmtDateTime } from '../../utils/format.js';
import { Card, Btn, Skeleton, EmptyState, inputCls } from '../ui.jsx';
import { IconSearch, IconClock, IconDownload, IconList } from '../Icon.jsx';
import Tag from '../Tag.jsx';
import DateFilter, { ALL_DATES, matchesDateFilter, describeDateFilter, dateFilterSlug } from '../DateFilter.jsx';
import { exportSheets } from './reportUtils.js';

const FIELD_LABELS = {
  status: 'Status',
  condition: 'Condition',
  functionalityChecked: 'Functionality',
  accepted: 'Accepted',
  serial: 'Serial No.',
  remarks: 'Remarks',
};

function Stat({ value, label }) {
  return (
    <div className="bg-white border border-line rounded-xl p-3.5 shadow-card">
      <div className="font-serif text-[22px] text-navy leading-none tnum">{value}</div>
      <div className="text-[11px] text-muted uppercase tracking-[0.05em] mt-1.5">{label}</div>
    </div>
  );
}

// The status-change audit trail — who changed what, when — with a date filter
// and free-text search. Unchanged behaviour, lifted out of the old ReportsPage.
export default function ActivityLogReport({ assets, loading }) {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(ALL_DATES);

  const logs = useMemo(() => {
    const all = [];
    assets.forEach((a) => {
      (a.history || []).forEach((h, idx) => {
        all.push({ ...h, key: `${a.code}-${idx}`, code: a.code, label: codeLabel(a), name: a.name });
      });
    });
    all.sort((x, y) => new Date(y.at) - new Date(x.at));
    return all;
  }, [assets]);

  const q = search.trim().toLowerCase();
  const dateLogs = useMemo(() => logs.filter((l) => matchesDateFilter(l.at, dateFilter)), [logs, dateFilter]);
  const filteredLogs = useMemo(() => {
    if (!q) return dateLogs;
    return dateLogs.filter((l) => {
      const base = `${l.label} ${l.name} ${l.by} ${l.note}`.toLowerCase();
      const inChanges = (l.changes || []).some((c) => `${c.field} ${c.from} ${c.to}`.toLowerCase().includes(q));
      return base.includes(q) || inChanges;
    });
  }, [dateLogs, q]);

  function exportLog() {
    const rows = filteredLogs.map((l) => ({
      'Date / Time': fmtDateTime(l.at),
      Range: l.range || l.label,
      Asset: l.name,
      'Updated By': l.by || '—',
      Changes: (l.changes || [])
        .map((c) => `${FIELD_LABELS[c.field] || c.field}: ${c.from || '—'} → ${c.to || '—'}`)
        .join('; '),
      Note: l.note || '',
    }));
    exportSheets(`Activity_Log_${dateFilterSlug(dateFilter)}`, [{ name: 'Activity Log', rows }]);
  }

  const updatedAssets = new Set(dateLogs.map((l) => l.code)).size;
  const filterActive = dateFilter.mode !== 'all';

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3.5">
        <DateFilter value={dateFilter} onChange={setDateFilter} />
        <Btn variant="gold" sm icon={<IconDownload size={15} />} onClick={exportLog} disabled={!filteredLogs.length}>
          Export log
        </Btn>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-3.5">
        <Stat value={dateLogs.length} label={filterActive ? 'Updates in period' : 'Total updates'} />
        <Stat value={updatedAssets} label="Assets changed" />
        <Stat value={dateLogs[0] ? fmtDate(dateLogs[0].at) : '—'} label="Last activity" />
      </div>

      <div className="relative mb-3">
        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          className={`${inputCls} !pl-9`}
          placeholder="Search code, name, person, change…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && !assets.length ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card>
          <EmptyState icon={<IconList size={26} />} title={logs.length ? 'No matching log entries' : 'No status changes yet'}>
            {logs.length
              ? filterActive
                ? `No updates for ${describeDateFilter(dateFilter).toLowerCase()}. Try a different date or search term.`
                : 'Try a different search term.'
              : 'Updates made from the Status page appear here as a time-stamped audit trail.'}
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((l) => (
            <Card key={l.key} className="!mb-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <Tag code={l.range || l.label} size="sm" />
                  <div className="text-[13.5px] font-semibold mt-1.5">{l.name}</div>
                </div>
                <div className="text-[12px] text-muted flex items-center gap-1.5 flex-none">
                  <IconClock size={13} /> {fmtDateTime(l.at)}
                </div>
              </div>
              {l.changes?.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {l.changes.map((c, ci) => (
                    <span key={ci} className="text-[11.5px] bg-cream border border-line rounded px-1.5 py-0.5">
                      <span className="text-muted">{FIELD_LABELS[c.field] || c.field}:</span> {c.from || '—'} →{' '}
                      <b className="text-navy">{c.to || '—'}</b>
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 text-[12px] text-muted">
                By <span className="font-semibold text-ink">{l.by || '—'}</span>
                {l.note ? <> · <span className="italic">“{l.note}”</span></> : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
