import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { codeLabel, assetSegments, rangeCode } from '../../utils/asset.js';
import { fmtDate, fmtDateTime } from '../../utils/format.js';
import { Card, Btn, Badge, Skeleton, EmptyState, inputCls, conditionVariant, statusVariant } from '../ui.jsx';
import { IconSearch, IconClock, IconDownload, IconList } from '../Icon.jsx';
import PageHeader from '../layout/PageHeader.jsx';
import Tag from '../Tag.jsx';
import DateFilter, { ALL_DATES, matchesDateFilter, describeDateFilter, dateFilterSlug } from '../DateFilter.jsx';

const FIELD_LABELS = {
  status: 'Status',
  condition: 'Condition',
  functionalityChecked: 'Functionality',
  accepted: 'Accepted',
  serial: 'Serial No.',
  remarks: 'Remarks',
};

const acceptedBadge = (a) =>
  a === 'Yes' ? 'good' : a === 'No' ? 'damaged' : a === 'Conditional' ? 'pending' : 'neutral';

function SummaryStat({ value, label }) {
  return (
    <div className="bg-white border border-line rounded-xl p-3.5 shadow-card">
      <div className="font-serif text-[22px] text-navy leading-none tnum">{value}</div>
      <div className="text-[11px] text-muted uppercase tracking-[0.05em] mt-1.5">{label}</div>
    </div>
  );
}

function Toggle({ view, setView }) {
  const tabs = [
    { id: 'log', label: 'Activity Log' },
    { id: 'breakdown', label: 'Condition Breakdown' },
  ];
  return (
    <div className="inline-flex p-1 bg-navy/5 rounded-xl">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setView(t.id)}
          className={[
            'px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light',
            view === t.id ? 'bg-white text-navy shadow-card' : 'text-muted hover:text-navy',
          ].join(' ')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function ReportsPage({ assets, loading, reload }) {
  const [view, setView] = useState('log');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(ALL_DATES);

  useEffect(() => {
    reload?.();
  }, [reload]);

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

  // Date filter applies first (the "period"); search then narrows the visible list.
  const dateLogs = useMemo(() => logs.filter((l) => matchesDateFilter(l.at, dateFilter)), [logs, dateFilter]);
  const dateAssets = useMemo(
    () => assets.filter((a) => matchesDateFilter(a.createdAt, dateFilter)),
    [assets, dateFilter]
  );

  const filteredLogs = useMemo(() => {
    if (!q) return dateLogs;
    return dateLogs.filter((l) => {
      const base = `${l.label} ${l.name} ${l.by} ${l.note}`.toLowerCase();
      const inChanges = (l.changes || []).some((c) => `${c.field} ${c.from} ${c.to}`.toLowerCase().includes(q));
      return base.includes(q) || inChanges;
    });
  }, [dateLogs, q]);

  const breakdownAssets = useMemo(() => {
    return dateAssets
      .filter((a) => !q || `${a.code} ${a.name} ${a.location} ${a.department}`.toLowerCase().includes(q))
      .slice()
      .reverse();
  }, [dateAssets, q]);

  function exportLog() {
    if (!filteredLogs.length) return;
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
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activity Log');
    XLSX.writeFile(wb, `CPA_Activity_Log_${dateFilterSlug(dateFilter)}.xlsx`);
  }

  const updatedAssets = new Set(dateLogs.map((l) => l.code)).size;
  const splitBatches = dateAssets.filter((a) => Array.isArray(a.segments) && a.segments.length > 1).length;
  const filterActive = dateFilter.mode !== 'all';

  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="Reports"
        subtitle="Review the status-change audit trail and each batch's condition breakdown."
        actions={
          view === 'log' ? (
            <Btn variant="gold" sm icon={<IconDownload size={15} />} onClick={exportLog} disabled={!filteredLogs.length}>
              Export log
            </Btn>
          ) : null
        }
      />

      <div className="flex items-center justify-between gap-3 flex-wrap mb-3.5">
        <Toggle view={view} setView={setView} />
        <DateFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-3.5">
        {view === 'log' ? (
          <>
            <SummaryStat value={dateLogs.length} label={filterActive ? 'Updates in period' : 'Total updates'} />
            <SummaryStat value={updatedAssets} label="Assets changed" />
            <SummaryStat value={dateLogs[0] ? fmtDate(dateLogs[0].at) : '—'} label="Last activity" />
          </>
        ) : (
          <>
            <SummaryStat value={dateAssets.length} label={filterActive ? 'Entries in period' : 'Logged entries'} />
            <SummaryStat value={splitBatches} label="Split batches" />
            <SummaryStat value={dateAssets.reduce((s, a) => s + (Number(a.qty) || 0), 0)} label="Total units" />
          </>
        )}
      </div>

      <div className="relative mb-3">
        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          className={`${inputCls} !pl-9`}
          placeholder={view === 'log' ? 'Search code, name, person, change…' : 'Search code, name, location…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && !assets.length ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : view === 'log' ? (
        filteredLogs.length === 0 ? (
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
                  {l.note ? (
                    <>
                      {' · '}
                      <span className="italic">“{l.note}”</span>
                    </>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )
      ) : breakdownAssets.length === 0 ? (
        <Card>
          <EmptyState icon={<IconList size={26} />} title={assets.length ? 'No matching assets' : 'No assets yet'}>
            {assets.length
              ? filterActive
                ? `No entries for ${describeDateFilter(dateFilter).toLowerCase()}. Try a different date or search term.`
                : 'Try a different search term.'
              : 'Logged assets and their condition breakdown will appear here.'}
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {breakdownAssets.map((a) => {
            const segs = assetSegments(a);
            return (
              <Card key={a.code} className="!mb-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <Tag code={codeLabel(a)} size="sm" />
                    <div className="text-[13.5px] font-semibold mt-1.5">{a.name}</div>
                    <div className="text-[12px] text-muted mt-0.5">
                      {a.department} · {a.location}
                    </div>
                  </div>
                  {segs.length > 1 && <Badge variant="neutral">{segs.length} groups</Badge>}
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {segs.map((s, i) => (
                    <div key={i} className="bg-cream/60 border border-line rounded-lg px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono text-[12.5px] text-navy tnum">{rangeCode(a, s.from, s.to)}</span>
                        <span className="text-[11.5px] text-muted tnum">{s.to - s.from + 1} unit(s)</span>
                        <div className="flex gap-1.5 flex-wrap">
                          <Badge variant={statusVariant(s.status)} dot>{s.status}</Badge>
                          <Badge variant={conditionVariant(s.condition)} dot>{s.condition}</Badge>
                          <Badge variant={acceptedBadge(s.accepted)} dot>
                            {s.accepted === 'Yes' ? 'Accepted' : s.accepted === 'Pending' ? 'Accept: Pending' : s.accepted}
                          </Badge>
                        </div>
                      </div>
                      {s.remarks ? <div className="text-[11.5px] text-muted mt-1 italic">“{s.remarks}”</div> : null}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
