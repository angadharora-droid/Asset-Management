import { useMemo, useState } from 'react';
import { inr } from '../../utils/format.js';
import { Badge, Btn, inputCls, EmptyState, statusVariant, conditionVariant } from '../ui.jsx';
import { IconSearch, IconDownload, IconPrinter, IconClipboardList } from '../Icon.jsx';
import { groupAssets, distribution, totalUnits, totalValue, exportSheets, codeLabel } from './reportUtils.js';
import ReportPrint from './ReportPrint.jsx';

// A distribution bar (status or condition mix within a group).
function MixBar({ counts, variantFor }) {
  const rows = distribution(counts);
  if (!rows.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {rows.map((r) => (
        <Badge key={r.label} variant={variantFor(r.label)} dot>
          {r.label} · {r.value}
        </Badge>
      ))}
    </div>
  );
}

// Generic "group the register by one field" report. Drives the Category,
// Department, Floor, Room, Property/Ownership, Classification, Custodian,
// Status, Condition and Acceptance reports — they differ only in config.
//
// config: { title, icon, keyFn, labelFn?, fallback?, groupNoun, mix }
//   mix: 'status' | 'condition' — which distribution to show per group.
export default function GroupedReport({ assets, config }) {
  const [search, setSearch] = useState('');
  const variantFor = config.mix === 'condition' ? conditionVariant : statusVariant;
  const mixKey = config.mix === 'condition' ? 'condition' : 'status';

  const groups = useMemo(
    () => groupAssets(assets, { keyFn: config.keyFn, labelFn: config.labelFn, fallback: config.fallback }),
    [assets, config]
  );

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => {
        if (g.label.toLowerCase().includes(q)) return g;
        const entries = g.entries.filter((e) =>
          `${codeLabel(e)} ${e.name} ${e.department} ${e.location}`.toLowerCase().includes(q)
        );
        return entries.length ? { ...g, entries } : null;
      })
      .filter(Boolean);
  }, [groups, q]);

  function exportExcel() {
    const summary = groups.map((g) => ({
      [config.groupNoun]: g.label,
      Entries: g.entries.length,
      Units: g.units,
      'Est. Value': g.value || '',
      ...Object.fromEntries(distribution(g[mixKey]).map((r) => [r.label, r.value])),
    }));
    const detail = groups.flatMap((g) =>
      g.entries.map((e) => ({
        [config.groupNoun]: g.label,
        Code: codeLabel(e),
        'Asset Name': e.name,
        Qty: e.qty,
        UOM: e.uom,
        Property: e.property || '',
        Department: e.department,
        Floor: e.floor || '',
        Location: e.location,
        Status: e.status,
        Condition: e.condition,
        'Est. Value': e.estimatedValue ?? '',
      }))
    );
    exportSheets(config.fileBase || config.groupNoun.replace(/\W+/g, '_'), [
      { name: `${config.groupNoun} Summary`, rows: summary },
      { name: 'Detail', rows: detail },
    ]);
  }

  const units = totalUnits(assets);
  const value = totalValue(assets);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5 mb-3.5">
        <Stat value={groups.length} label={config.groupNoun + (groups.length === 1 ? '' : 's')} />
        <Stat value={units} label="Total units" />
        <Stat value={value ? inr(value) : '—'} label="Est. value" />
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            className={`${inputCls} !pl-9 !py-2`}
            placeholder={`Search ${config.groupNoun.toLowerCase()}, code, item…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={`Search ${config.groupNoun}`}
          />
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" sm icon={<IconPrinter size={15} />} onClick={() => window.print()} disabled={!filtered.length}>
            PDF
          </Btn>
          <Btn variant="gold" sm icon={<IconDownload size={15} />} onClick={exportExcel} disabled={!groups.length}>
            Excel
          </Btn>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<IconClipboardList size={26} />} title={groups.length ? 'No matches' : 'Nothing to report yet'}>
          {groups.length ? 'Try a different search term.' : 'Register some assets and this report fills in automatically.'}
        </EmptyState>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((g) => (
            <div key={g.key} className="border border-line rounded-xl overflow-hidden bg-white">
              <div className="bg-cream/70 px-3.5 py-2.5 flex items-center justify-between gap-2 flex-wrap border-b border-line">
                <div className="min-w-0">
                  <div className="text-[13.5px] font-bold text-navy truncate">{g.label}</div>
                  <MixBar counts={g[mixKey]} variantFor={variantFor} />
                </div>
                <div className="text-[11.5px] text-muted tnum flex-none text-right">
                  <div>
                    {g.entries.length} {g.entries.length === 1 ? 'entry' : 'entries'} · {g.units} {g.units === 1 ? 'unit' : 'units'}
                  </div>
                  {g.value ? <div className="font-semibold text-navy">{inr(g.value)}</div> : null}
                </div>
              </div>
              <div className="divide-y divide-line/70">
                {g.entries.map((e) => (
                  <div key={e.code} className="px-3.5 py-2 flex items-center justify-between gap-x-3 gap-y-1 flex-wrap">
                    <div className="min-w-0">
                      <span className="font-mono text-[11.5px] font-semibold text-navy tnum">{codeLabel(e)}</span>
                      <div className="text-[12.5px] font-medium truncate">{e.name || '(no description)'}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap flex-none">
                      <span className="text-[11.5px] text-muted tnum">{e.qty} {e.uom}</span>
                      <Badge variant={statusVariant(e.status)} dot>{e.status}</Badge>
                      <Badge variant={conditionVariant(e.condition)} dot>{e.condition}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ReportPrint
        title={config.title}
        meta={`${filtered.length} ${filtered.length === 1 ? config.groupNoun.toLowerCase() : config.groupNoun.toLowerCase() + 's'} · ${filtered.reduce((s, g) => s + g.entries.length, 0)} entries · ${filtered.reduce((s, g) => s + g.units, 0)} units`}
      >
        {filtered.map((g) => (
          <table key={g.key} className="w-full border-collapse mt-4">
            <thead>
              <tr>
                <th colSpan={5} className="text-left bg-navy text-white px-2 py-1.5 text-[11px]">
                  {g.label}
                  <span className="font-normal">
                    {' '}— {g.entries.length} {g.entries.length === 1 ? 'entry' : 'entries'} · {g.units} units
                    {g.value ? ` · ${inr(g.value)}` : ''}
                  </span>
                </th>
              </tr>
              <tr>
                {['Code', 'Asset', 'Qty', 'Status', 'Condition'].map((h) => (
                  <th key={h} className="text-left border border-line bg-cream px-2 py-1 text-[9.5px] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {g.entries.map((e) => (
                <tr key={e.code}>
                  <td className="border border-line px-2 py-1 font-mono tnum whitespace-nowrap">{codeLabel(e)}</td>
                  <td className="border border-line px-2 py-1">{e.name || '—'}</td>
                  <td className="border border-line px-2 py-1 tnum whitespace-nowrap">{e.qty} {e.uom}</td>
                  <td className="border border-line px-2 py-1">{e.status}</td>
                  <td className="border border-line px-2 py-1">{e.condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </ReportPrint>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="bg-white border border-line rounded-xl p-3.5 shadow-card">
      <div className="font-serif text-[22px] text-navy leading-none tnum truncate">{value}</div>
      <div className="text-[11px] text-muted uppercase tracking-[0.05em] mt-1.5">{label}</div>
    </div>
  );
}
