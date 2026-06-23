import { COUNTABLE_UOMS } from '../constants/categories.js';

// Stage 2 (value + custody) is considered "pending" until a value or a real
// classification has been entered. Shared by the Register list, the tab badge
// and the detail modal so they all agree.
export function needsDetails(asset) {
  return asset.estimatedValue == null || asset.classification === 'Pending Review';
}

// Display label for an asset code. When a block was reserved (qty > 1) it shows
// the range, e.g. "CPA.FFE.CHR.0001–0012"; otherwise just the single code.
export function codeLabel(a) {
  if (!a || !a.code) return '';
  if (a.codeEnd) return `${a.code}–${a.codeEnd.split('.').pop()}`;
  return a.code;
}

// How many codes an entry will consume given quantity + unit.
export function blockCount(qty, uom) {
  const n = Math.max(1, Math.floor(Number(qty) || 1));
  return COUNTABLE_UOMS.includes(uom) && n > 1 ? n : 1;
}

const pad4 = (n) => String(n).padStart(4, '0');

// The URL a scanned tag opens — uses the asset's unguessable scan token (not
// the human code, which is sequential and enumerable). A hash route so it works
// on any static host. Optionally targets a specific unit.
export function scanUrl(asset, unit) {
  const base = `${window.location.origin}/#/scan/${asset?.scanId || ''}`;
  return unit != null ? `${base}/${unit}` : base;
}

// The code prefix ("CPA.BNQ.BCH.") from an asset's start code.
export function codePrefix(code = '') {
  const i = code.lastIndexOf('.');
  return i >= 0 ? code.slice(0, i + 1) : '';
}

// Full code (or range) for a sub-range of an asset, e.g. CPA.BNQ.BCH.0297–0300.
export function rangeCode(asset, from, to) {
  const prefix = codePrefix(asset?.code || '');
  return from === to ? `${prefix}${pad4(from)}` : `${prefix}${pad4(from)}–${pad4(to)}`;
}

// Match an asset against a search query, recognising individual tag numbers.
// Returns { matches, unit } where `unit` is the specific sequence number the
// query targets within this asset (e.g. "CPA.BNQ.BCH.0297" or "297"), or null
// for a plain text match.
export function resolveUnitQuery(asset, rawQuery) {
  const q = String(rawQuery || '').trim();
  if (!q) return { matches: true, unit: null };

  const hay = `${asset.code} ${codeLabel(asset)} ${asset.name} ${asset.location} ${asset.department}`.toLowerCase();
  const textMatch = hay.includes(q.toLowerCase());

  let unit = null;
  const up = q.toUpperCase();
  const m = up.match(/(\d+)\s*$/);
  if (m && asset.seqStart != null && asset.seqEnd != null) {
    const n = parseInt(m[1], 10);
    const headLetters = up.slice(0, m.index).replace(/[^A-Z]/g, '');
    const prefixLetters = codePrefix(asset.code || '').toUpperCase().replace(/[^A-Z]/g, '');
    const headOk = !headLetters || prefixLetters.includes(headLetters);
    if (headOk && n >= asset.seqStart && n <= asset.seqEnd) unit = n;
  }

  return { matches: textMatch || unit != null, unit };
}

// The asset's condition segments, falling back to a single synthetic segment
// for legacy assets created before the breakdown feature.
export function assetSegments(asset) {
  if (Array.isArray(asset?.segments) && asset.segments.length) return asset.segments;
  const from = asset?.seqStart || 1;
  const to = asset?.seqEnd || from;
  return [
    {
      from,
      to,
      status: asset?.status,
      condition: asset?.condition,
      functionalityChecked: asset?.functionalityChecked || 'Not Applicable',
      accepted: asset?.accepted || 'Pending',
      remarks: asset?.remarks || '',
    },
  ];
}
