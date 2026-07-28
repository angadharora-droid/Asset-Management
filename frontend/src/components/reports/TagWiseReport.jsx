import { useMemo, useState } from 'react';
import { Badge, Btn, inputCls, selectCls, EmptyState, statusVariant, conditionVariant } from '../ui.jsx';
import { IconSearch, IconDownload, IconPrinter, IconTag } from '../Icon.jsx';
import { STATUS_OPTIONS, CONDITION_OPTIONS } from '../../constants/categories.js';
import { tagRows, exportSheets } from './reportUtils.js';
import ReportPrint from './ReportPrint.jsx';

// Tag-wise report: every physical tag (unit) in the register as its own row,
// expanded from each entry's condition segments so a split batch shows each
// unit's real status/condition. Filterable by status/condition, searchable by
// code or name, exportable to Excel and printable as a PDF.
export default function TagWiseReport({ assets }) {
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [conditionF, setConditionF] = useState('');

  const rows = useMemo(() => tagRows(assets), [assets]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (statusF && r.status !== statusF) return false;
        if (conditionF && r.condition !== conditionF) return false;
        if (q && !`${r.code} ${r.name} ${r.department} ${r.location} ${r.serial}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    [rows, q, statusF, conditionF]
  );

  function exportExcel() {
    const out = filtered.map((r) => ({
      'Tag Code': r.code,
      'Asset Name': r.name,
      Category: r.category,
      Property: r.property,
      Department: r.department,
      Floor: r.floor,
      Location: r.location,
      Status: r.status,
      Condition: r.condition,
      'Handover': r.accepted,
      'Serial No.': r.serial,
    }));
    exportSheets('Tag_Wise_Report', [{ name: 'Tags', rows: out }]);
  }

  const filtering = q || statusF || conditionF;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5 mb-3.5">
        <Stat value={rows.length} label="Total tags" />
        <Stat value={filtered.length} label={filtering ? 'Tags shown' : 'Listed'} />
        <Stat value={new Set(filtered.map((r) => r.location).filter(Boolean)).size} label="Rooms covered" />
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        <div className="relative flex-1 min-w-[170px]">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            className={`${inputCls} !pl-9 !py-2`}
            placeholder="Search tag code, name, serial…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tags"
          />
        </div>
        <select className={`${selectCls} !py-2 min-w-[120px]`} value={statusF} onChange={(e) => setStatusF(e.target.value)} aria-label="Filter by status">
          <option value="">All status</option>
          {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={`${selectCls} !py-2 min-w-[130px]`} value={conditionF} onChange={(e) => setConditionF(e.target.value)} aria-label="Filter by condition">
          <option value="">All condition</option>
          {CONDITION_OPTIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div className="flex gap-2">
          <Btn variant="ghost" sm icon={<IconPrinter size={15} />} onClick={() => window.print()} disabled={!filtered.length}>PDF</Btn>
          <Btn variant="gold" sm icon={<IconDownload size={15} />} onClick={exportExcel} disabled={!filtered.length}>Excel</Btn>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<IconTag size={26} />} title={rows.length ? 'No matching tags' : 'No tags yet'}>
          {rows.length ? 'Try a different search or clear the filters.' : 'Each registered unit appears here as its own tag.'}
        </EmptyState>
      ) : (
        <div className="border border-line rounded-xl overflow-hidden bg-white">
          {/* Header row (desktop) */}
          <div className="hidden sm:grid grid-cols-[1.4fr_1.6fr_1.2fr_auto] gap-3 px-3.5 py-2 bg-cream/70 border-b border-line text-[10.5px] uppercase tracking-wide text-muted font-semibold">
            <span>Tag code</span>
            <span>Asset</span>
            <span>Location</span>
            <span className="text-right">Status · Condition</span>
          </div>
          <div className="divide-y divide-line/70 max-h-[62vh] overflow-auto">
            {filtered.slice(0, 800).map((r) => (
              <div key={r.code} className="grid sm:grid-cols-[1.4fr_1.6fr_1.2fr_auto] gap-x-3 gap-y-1 px-3.5 py-2 items-center">
                <span className="font-mono text-[11.5px] font-semibold text-navy tnum">{r.code}</span>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium truncate">{r.name || '(no description)'}</div>
                  {r.serial ? <div className="text-[11px] text-muted truncate">S/N {r.serial}</div> : null}
                </div>
                <span className="text-[11.5px] text-muted truncate">{[r.floor, r.location].filter(Boolean).join(' · ') || '—'}</span>
                <div className="flex items-center gap-1.5 flex-wrap sm:justify-end">
                  <Badge variant={statusVariant(r.status)} dot>{r.status}</Badge>
                  <Badge variant={conditionVariant(r.condition)} dot>{r.condition}</Badge>
                </div>
              </div>
            ))}
          </div>
          {filtered.length > 800 && (
            <div className="px-3.5 py-2 text-[11.5px] text-muted bg-cream/50 border-t border-line">
              Showing first 800 of {filtered.length} tags on screen — export to Excel for the full list.
            </div>
          )}
        </div>
      )}

      <ReportPrint
        title="Tag-wise Asset Report"
        meta={`${filtered.length} ${filtered.length === 1 ? 'tag' : 'tags'}${filtering ? ' (filtered)' : ''}`}
      >
        <table className="w-full border-collapse mt-4">
          <thead>
            <tr>
              {['Tag Code', 'Asset', 'Location', 'Status', 'Condition', 'Handover'].map((h) => (
                <th key={h} className="text-left border border-line bg-navy text-white px-2 py-1 text-[9.5px] uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.code}>
                <td className="border border-line px-2 py-1 font-mono tnum whitespace-nowrap">{r.code}</td>
                <td className="border border-line px-2 py-1">{r.name || '—'}</td>
                <td className="border border-line px-2 py-1">{[r.floor, r.location].filter(Boolean).join(' · ') || '—'}</td>
                <td className="border border-line px-2 py-1">{r.status}</td>
                <td className="border border-line px-2 py-1">{r.condition}</td>
                <td className="border border-line px-2 py-1">{r.accepted}</td>
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
