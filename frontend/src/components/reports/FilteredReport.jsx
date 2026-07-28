import { useMemo, useState } from 'react';
import { fmtDateTime } from '../../utils/format.js';
import { Badge, Btn, inputCls, EmptyState, statusVariant, conditionVariant } from '../ui.jsx';
import { IconSearch, IconDownload, IconPrinter, IconAlert } from '../Icon.jsx';
import { unitCount, exportSheets, codeLabel } from './reportUtils.js';
import ReportPrint from './ReportPrint.jsx';

// A report that is a focused list of entries needing attention — the predicate
// decides which entries qualify and `reason` explains why each one is flagged.
// Drives Exceptions (missing/damaged/scrap), Pending Details and Tags Not
// Printed. config: { title, icon, predicate, reason, empty }
export default function FilteredReport({ assets, config }) {
  const [search, setSearch] = useState('');

  const flagged = useMemo(() => assets.filter(config.predicate).slice().reverse(), [assets, config]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      !q
        ? flagged
        : flagged.filter((e) => `${codeLabel(e)} ${e.name} ${e.department} ${e.location}`.toLowerCase().includes(q)),
    [flagged, q]
  );

  const units = filtered.reduce((s, e) => s + unitCount(e), 0);

  function exportExcel() {
    const rows = filtered.map((e) => ({
      Code: codeLabel(e),
      'Asset Name': e.name,
      Reason: config.reason(e),
      Qty: e.qty,
      UOM: e.uom,
      Department: e.department,
      Floor: e.floor || '',
      Location: e.location,
      Status: e.status,
      Condition: e.condition,
      Remarks: e.remarks || '',
      'Logged At': fmtDateTime(e.createdAt),
    }));
    exportSheets(config.fileBase || 'Report', [{ name: config.title.slice(0, 31), rows }]);
  }

  const Icon = config.icon || IconAlert;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5 mb-3.5">
        <Stat value={flagged.length} label="Flagged entries" />
        <Stat value={units} label="Units affected" />
        <Stat value={new Set(flagged.map((e) => e.location).filter(Boolean)).size} label="Rooms involved" />
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            className={`${inputCls} !pl-9 !py-2`}
            placeholder="Search code, name, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search flagged entries"
          />
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" sm icon={<IconPrinter size={15} />} onClick={() => window.print()} disabled={!filtered.length}>PDF</Btn>
          <Btn variant="gold" sm icon={<IconDownload size={15} />} onClick={exportExcel} disabled={!filtered.length}>Excel</Btn>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Icon size={26} />} title={flagged.length ? 'No matches' : config.empty?.title || 'All clear'}>
          {flagged.length ? 'Try a different search term.' : config.empty?.body || 'Nothing needs attention right now.'}
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <div key={e.code} className="bg-white border border-line rounded-xl p-3.5 shadow-card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <span className="font-mono text-[11.5px] font-semibold text-navy tnum">{codeLabel(e)}</span>
                  <div className="text-[13.5px] font-semibold mt-0.5 truncate">{e.name || '(no description)'}</div>
                  <div className="text-[12px] text-muted mt-0.5 truncate">
                    {[e.department, e.floor, e.location].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <Badge variant="pending">{config.reason(e)}</Badge>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                <span className="text-[11.5px] text-muted tnum">{e.qty} {e.uom}</span>
                <Badge variant={statusVariant(e.status)} dot>{e.status}</Badge>
                <Badge variant={conditionVariant(e.condition)} dot>{e.condition}</Badge>
              </div>
              {e.remarks ? <div className="text-[11.5px] text-muted mt-2 italic">“{e.remarks}”</div> : null}
            </div>
          ))}
        </div>
      )}

      <ReportPrint title={config.title} meta={`${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'} · ${units} units`}>
        <table className="w-full border-collapse mt-4">
          <thead>
            <tr>
              {['Code', 'Asset', 'Reason', 'Location', 'Status', 'Condition'].map((h) => (
                <th key={h} className="text-left border border-line bg-navy text-white px-2 py-1 text-[9.5px] uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.code}>
                <td className="border border-line px-2 py-1 font-mono tnum whitespace-nowrap">{codeLabel(e)}</td>
                <td className="border border-line px-2 py-1">{e.name || '—'}</td>
                <td className="border border-line px-2 py-1">{config.reason(e)}</td>
                <td className="border border-line px-2 py-1">{[e.floor, e.location].filter(Boolean).join(' · ') || '—'}</td>
                <td className="border border-line px-2 py-1">{e.status}</td>
                <td className="border border-line px-2 py-1">{e.condition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportPrint>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="bg-white border border-line rounded-xl p-3.5 shadow-card">
      <div className="font-serif text-[22px] text-navy leading-none tnum">{value}</div>
      <div className="text-[11px] text-muted uppercase tracking-[0.05em] mt-1.5">{label}</div>
    </div>
  );
}
