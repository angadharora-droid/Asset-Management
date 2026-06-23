import { useEffect, useMemo, useState } from 'react';
import { STATUS_OPTIONS } from '../../constants/categories.js';
import { codeLabel, rangeCode, resolveUnitQuery } from '../../utils/asset.js';
import {
  Badge, Card, Skeleton, EmptyState, inputCls, selectCls, statusVariant, conditionVariant,
} from '../ui.jsx';
import { IconSearch, IconChevronRight, IconActivity } from '../Icon.jsx';
import PageHeader from '../layout/PageHeader.jsx';
import Tag from '../Tag.jsx';
import StatusUpdateModal from './StatusUpdateModal.jsx';

export default function StatusBoard({ assets, loading, reload }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(null); // { code, unit }

  useEffect(() => {
    reload?.();
  }, [reload]);

  // Each result carries the specific unit the query targets (or null).
  const filtered = useMemo(() => {
    const out = [];
    for (const a of assets) {
      if (statusFilter && a.status !== statusFilter) continue;
      const { matches, unit } = resolveUnitQuery(a, search);
      if (matches) out.push({ asset: a, unit });
    }
    return out.reverse();
  }, [assets, search, statusFilter]);

  const openAsset = open ? assets.find((a) => a.code === open.code) || null : null;

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Update Status"
        subtitle="Search a tag number (e.g. CPA.BNQ.BCH.0297 or just 297) to update one unit, or open a batch to update a sub-range. Every change is logged."
      />

      <div className="flex gap-2 flex-wrap mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            className={`${inputCls} !pl-9`}
            placeholder="Search tag no, name, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={`${selectCls} !w-auto flex-none`}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading && !assets.length ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconActivity size={26} />}
            title={assets.length ? 'No matching assets' : 'No assets to update yet'}
          >
            {assets.length
              ? 'Try a different tag number, name or status filter.'
              : 'Log assets from New Entry, then update their status here as the handover progresses.'}
          </EmptyState>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(({ asset: e, unit }) => (
            <button
              key={e.code}
              onClick={() => setOpen({ code: e.code, unit })}
              className="text-left bg-white border border-line rounded-xl px-3 py-3 flex items-center gap-3
                         hover:border-gold-light hover:shadow-card transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
            >
              <div className="min-w-0 flex-1">
                <Tag code={codeLabel(e)} size="sm" />
                <div className="text-[14px] font-semibold mt-1.5 truncate">{e.name || '(no description)'}</div>
                <div className="text-[12px] text-muted mt-0.5 truncate">
                  {e.department} · {e.location}
                </div>
                {unit != null && (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-gold">
                    <IconChevronRight size={12} /> Update unit{' '}
                    <span className="font-mono tnum text-navy">{rangeCode(e, unit, unit)}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-none">
                <Badge variant={statusVariant(e.status)} dot>{e.status}</Badge>
                <Badge variant={conditionVariant(e.condition)} dot>{e.condition}</Badge>
              </div>
              <IconChevronRight size={18} className="text-muted flex-none" />
            </button>
          ))}
        </div>
      )}

      {openAsset && (
        <StatusUpdateModal
          asset={openAsset}
          unit={open.unit}
          onClose={() => setOpen(null)}
          onSaved={() => reload?.()}
        />
      )}
    </div>
  );
}
