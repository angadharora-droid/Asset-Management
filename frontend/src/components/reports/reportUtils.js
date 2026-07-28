// Shared helpers for the Reports hub. Everything here is derived purely from
// the assets already in memory — no extra API calls — so every report stays in
// sync with the live register.
import { assetSegments, codeLabel, rangeCode } from '../../utils/asset.js';

// How many physical tags (codes) an entry covers.
export const unitCount = (e) =>
  e.seqStart != null && e.seqEnd != null ? e.seqEnd - e.seqStart + 1 : 1;

// Per-segment unit counts for one asset, so a "Mixed" batch (0001–0296 Good,
// 0297–0300 Damaged) contributes the right units to each status/condition
// bucket instead of a single lumped "Mixed".
export function segmentUnits(asset) {
  return assetSegments(asset).map((s) => ({
    status: s.status || asset.status,
    condition: s.condition || asset.condition,
    accepted: s.accepted || asset.accepted || 'Pending',
    functionalityChecked: s.functionalityChecked || 'Not Applicable',
    units: Math.max(1, (s.to || 0) - (s.from || 0) + 1),
  }));
}

// Normalise a typed location so every spelling of the same room lands in ONE
// group — mirrors the logic in RoomReport so both agree. "201", "room 201" and
// "Room No. 201" collapse together; a genuine "Room Service Store" is kept.
export function roomKey(loc) {
  const s = String(loc || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const m = s.match(/^(?:room|rm)\.?\s*(?:no\.?|number|#)?\s*[:\-#]?\s*(\d.*)$/);
  return (m ? m[1] : s).trim();
}

const num = (v) => parseFloat(v) || 0;

// Group assets by an arbitrary key, aggregating the numbers every report needs:
// entry count, physical units, estimated value, and per-tag status/condition
// distributions. `keyFn` returns the grouping key; `labelFn` (optional) the
// display label; `fallback` labels blank keys.
export function groupAssets(assets, { keyFn, labelFn, fallback = '(not recorded)' } = {}) {
  const map = new Map();
  for (const a of assets) {
    const rawKey = keyFn(a);
    const key = rawKey == null || rawKey === '' ? '' : String(rawKey);
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: '',
        labels: new Map(), // spelling -> count, to show the most common form
        entries: [],
        units: 0,
        value: 0,
        status: {},
        condition: {},
      });
    }
    const g = map.get(key);
    const shown = (labelFn ? labelFn(a) : rawKey) || fallback;
    g.labels.set(shown, (g.labels.get(shown) || 0) + 1);
    g.entries.push(a);
    g.units += unitCount(a);
    g.value += num(a.estimatedValue);
    for (const seg of segmentUnits(a)) {
      g.status[seg.status] = (g.status[seg.status] || 0) + seg.units;
      g.condition[seg.condition] = (g.condition[seg.condition] || 0) + seg.units;
    }
  }
  const list = [...map.values()];
  for (const g of list) {
    g.label = [...g.labels.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || fallback;
  }
  // Biggest groups first (by units) — that's what a reviewer scans for.
  list.sort((a, b) => b.units - a.units || a.label.localeCompare(b.label, undefined, { numeric: true }));
  return list;
}

// One row per physical tag, expanded from each entry's condition segments, so a
// block of 300 chairs becomes 300 individually-addressable rows.
export function tagRows(assets) {
  const rows = [];
  for (const a of assets) {
    const segs = assetSegments(a);
    for (const s of segs) {
      const from = s.from || a.seqStart || 1;
      const to = s.to || a.seqEnd || from;
      for (let n = from; n <= to; n++) {
        rows.push({
          code: rangeCode(a, n, n),
          seq: n,
          name: a.name,
          category: a.category,
          property: a.property || '',
          department: a.department || '',
          floor: a.floor || '',
          location: a.location || '',
          status: s.status || a.status,
          condition: s.condition || a.condition,
          accepted: s.accepted || a.accepted || 'Pending',
          serial: s.serial || (segs.length === 1 ? a.serial : '') || '',
          value: num(a.estimatedValue),
          createdAt: a.createdAt,
          asset: a,
        });
      }
    }
  }
  return rows;
}

// Sum helpers for headline stats.
export const totalUnits = (assets) => assets.reduce((s, a) => s + unitCount(a), 0);
export const totalValue = (assets) => assets.reduce((s, a) => s + num(a.estimatedValue), 0);

// Turn a {label: count} map into a sorted, percentage-annotated array for bars.
export function distribution(counts) {
  const total = Object.values(counts).reduce((s, n) => s + n, 0) || 1;
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value, pct: Math.round((value / total) * 100) }))
    .sort((a, b) => b.value - a.value);
}

// Excel export shared by every report: named sheets from row arrays.
export async function exportSheets(fileBase, sheets) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    if (!rows?.length) continue;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name.slice(0, 31));
  }
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `CPA_${fileBase}_${stamp}.xlsx`);
}

export { codeLabel };
