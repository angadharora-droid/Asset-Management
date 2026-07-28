import { useMemo, useState } from 'react';
import { codeLabel, assetSegments, rangeCode } from '../../utils/asset.js';
import { Card, Badge, Skeleton, EmptyState, inputCls, conditionVariant, statusVariant } from '../ui.jsx';
import { IconSearch, IconList } from '../Icon.jsx';
import Tag from '../Tag.jsx';
import DateFilter, { ALL_DATES, matchesDateFilter, describeDateFilter } from '../DateFilter.jsx';

const acceptedBadge = (a) =>
  a === 'Yes' ? 'good' : a === 'No' ? 'damaged' : a === 'Conditional' ? 'pending' : 'neutral';

function Stat({ value, label }) {
  return (
    <div className="bg-white border border-line rounded-xl p-3.5 shadow-card">
      <div className="font-serif text-[22px] text-navy leading-none tnum">{value}</div>
      <div className="text-[11px] text-muted uppercase tracking-[0.05em] mt-1.5">{label}</div>
    </div>
  );
}

// Each batch's per-range condition breakdown. Unchanged behaviour, lifted out
// of the old ReportsPage into its own report.
export default function ConditionBreakdownReport({ assets, loading }) {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(ALL_DATES);

  const q = search.trim().toLowerCase();
  const dateAssets = useMemo(
    () => assets.filter((a) => matchesDateFilter(a.createdAt, dateFilter)),
    [assets, dateFilter]
  );
  const breakdownAssets = useMemo(
    () =>
      dateAssets
        .filter((a) => !q || `${a.code} ${a.name} ${a.location} ${a.department}`.toLowerCase().includes(q))
        .slice()
        .reverse(),
    [dateAssets, q]
  );

  const splitBatches = dateAssets.filter((a) => Array.isArray(a.segments) && a.segments.length > 1).length;
  const filterActive = dateFilter.mode !== 'all';

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3.5">
        <DateFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-3.5">
        <Stat value={dateAssets.length} label={filterActive ? 'Entries in period' : 'Logged entries'} />
        <Stat value={splitBatches} label="Split batches" />
        <Stat value={dateAssets.reduce((s, a) => s + (Number(a.qty) || 0), 0)} label="Total units" />
      </div>

      <div className="relative mb-3">
        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          className={`${inputCls} !pl-9`}
          placeholder="Search code, name, location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && !assets.length ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
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
                    <div className="text-[12px] text-muted mt-0.5">{a.department} · {a.location}</div>
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
