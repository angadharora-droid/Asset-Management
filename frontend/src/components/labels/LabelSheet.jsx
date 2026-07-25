import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { rangeCode, codeLabel, scanUrl } from '../../utils/asset.js';
import { markLabelsPrinted } from '../../api/assetApi.js';
import { Btn } from '../ui.jsx';
import { IconPrinter, IconClose } from '../Icon.jsx';
import Qr from '../Qr.jsx';

const MAX = 120; // labels rendered at a time

// The physical label stock, in mm. THIS IS THE ONLY PLACE THE SIZE IS SET —
// the @page rule, the tag box, the QR and the type all derive from it, so they
// cannot drift apart and strand a small tag on an over-sized page. It must
// equal the paper size selected in the printer driver: if it matches nothing
// the driver knows, Chrome falls back to its default paper and rotates the page
// 90°, laying the tag along the roll and printing across the die-cut gaps.
const LABEL = { w: 50, h: 25 };

// Blank margin kept clear of every edge, in mm. THIS is the safety knob: a
// millimetre or two of feed drift or die-cut tolerance otherwise lands ink on
// the gap between labels. Never shrink LABEL for margin instead — a page size
// the driver does not recognise makes Chrome fall back to its default paper and
// rotate the tag 90°, printing it along the roll and across the gaps.
const INSET = 2.5;

// Everything below is derived from the live area so the artwork fills the stock
// at any size, rather than being a fixed drawing floating on it. The QR grows to
// the full live height (bigger QR = more reliable scan) but never past 45% of
// the width, or a squarish label would leave the text nothing to sit in.
const LIVE = { w: LABEL.w - INSET * 2, h: LABEL.h - INSET * 2 };
const GAP = LIVE.h * 0.06;
const QR_MM = Math.min(LIVE.h, LIVE.w * 0.45);
const COL_MM = LIVE.w - QR_MM - GAP; // the text takes all the rest

const MM_PT = 72 / 25.4;
const PX_MM = 96 / 25.4;
// Type ramp as multiples of the code's size, and the stacked height of all six
// lines at leading-tight (1.25) — code, name, department, location, the
// "Property of <owner>" line, and the hotel name.
const RAMP = { code: 1, name: 1, detail: 0.94, brand: 0.69 };
const STACK = 1.25 * (RAMP.code + RAMP.name + RAMP.detail * 2 + RAMP.brand * 2);

// How many physical tags an entry covers.
const unitsOf = (a) => (a?.seqStart != null && a?.seqEnd != null ? a.seqEnd - a.seqStart + 1 : 1);

// Printable barcode (QR) tags, sized to LABEL for the portable thermal label
// printer (one tag per page; see the `labels` @page rule). Each QR opens the
// unit's read-only scan page; the label prints the key details.
//
// Accepts either a single entry (`asset`, with a unit-range picker) or a batch
// (`assets`) so every not-yet-printed entry can be printed in one go. After a
// print run the covered entries are marked printed on the server (best-effort)
// and `onPrinted` fires so the register can refresh its "not printed" state.
export default function LabelSheet({ asset, assets, onClose, onPrinted }) {
  const list = useMemo(
    () => (Array.isArray(assets) && assets.length ? assets : asset ? [asset] : []),
    [asset, assets]
  );
  const single = list.length === 1 ? list[0] : null;

  const lo = single ? single.seqStart || 1 : 1;
  const hi = single ? single.seqEnd || lo : 1;
  const totalTags = list.reduce((s, a) => s + unitsOf(a), 0);
  const [from, setFrom] = useState(lo);
  const [to, setTo] = useState(Math.min(hi, lo + MAX - 1));

  // `@page { size }` cannot read a CSS variable, so the page rule is generated
  // here from LABEL instead of being hard-coded in index.css. That is what keeps
  // the paper and the artwork on a single knob.
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = `@page labels { size: ${LABEL.w}mm ${LABEL.h}mm; margin: 0; }`;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Tells the print stylesheet to hide the app behind this sheet, so the tags
    // print in normal flow (see the `labels-open` rules in index.css).
    document.body.classList.add('labels-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      document.body.classList.remove('labels-open');
    };
  }, [onClose]);

  if (!list.length) return null;

  // The code is the widest fixed-width thing on the tag, so it sets the type
  // scale: as large as fills the column, but never so large the six-line stack
  // outgrows the label height (which a long, short stock would otherwise do).
  // 0.6em is IBM Plex Mono's advance width; the code length is constant across
  // entries (fixed prefix + 4-digit unit). The 0.96 keeps a little slack, so a
  // metric difference — or the webfont simply not having loaded, leaving a
  // fallback mono — cannot ellipsis away part of the identifier.
  const ref = list[0];
  const codeChars = rangeCode(ref, ref.seqStart || 1, ref.seqStart || 1).length;
  const codePt = Math.min(
    (COL_MM * 0.96 * MM_PT) / (codeChars * 0.6),
    (LIVE.h * MM_PT) / STACK
  );
  const ptOf = (r) => `${+(codePt * r).toFixed(2)}pt`;

  // The tags to render: a chosen sub-range for a single entry, or every unit of
  // every entry in a batch, capped at MAX per print run.
  const items = [];
  if (single) {
    const start = Math.max(lo, Math.min(Number(from) || lo, hi));
    const end = Math.max(start, Math.min(Number(to) || hi, hi));
    for (let n = start; n <= end && items.length < MAX; n += 1) items.push({ a: single, n });
  } else {
    for (const a of list) {
      const alo = a.seqStart || 1;
      const ahi = a.seqEnd || alo;
      for (let n = alo; n <= ahi && items.length < MAX; n += 1) items.push({ a, n });
      if (items.length >= MAX) break;
    }
  }
  const truncated = single ? undefined : totalTags > items.length;
  const singleTruncated = single && hi - lo + 1 > MAX;

  // Entries whose tags are ALL in this print run — only those get marked
  // printed, so a batch cut off at MAX keeps its unfinished entries pending.
  const perCode = new Map();
  for (const it of items) perCode.set(it.a.code, (perCode.get(it.a.code) || 0) + 1);
  const covered = single ? [single] : list.filter((a) => perCode.get(a.code) === unitsOf(a));

  async function handlePrint() {
    window.print();
    try {
      await markLabelsPrinted(covered.map((a) => a.code));
      onPrinted?.();
    } catch {
      // best-effort — the tags are printed either way
    }
  }

  return createPortal(
    <div id="labels-root" className="fixed inset-0 z-50 bg-cream overflow-y-auto">
      {/* Toolbar (not printed) */}
      <div className="no-print sticky top-0 ink-panel text-white px-4 py-3 flex items-center justify-between gap-3 z-10">
        <div className="min-w-0">
          <div className="font-serif text-[16px] leading-tight">Print barcode tags</div>
          <div className="text-[12px] text-white/60 truncate">
            {single
              ? `${codeLabel(single)} · ${single.name}`
              : `${list.length} entries · ${totalTags} tags`}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-none">
          {single && hi - lo + 1 > 1 && (
            <div className="hidden sm:flex items-center gap-1.5 text-[12px]">
              <span className="text-white/60">Units</span>
              <input
                type="number" min={lo} max={hi} value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-16 px-2 py-1 rounded text-ink tnum text-[13px]"
                aria-label="From unit"
              />
              <span className="text-white/60">–</span>
              <input
                type="number" min={lo} max={hi} value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-16 px-2 py-1 rounded text-ink tnum text-[13px]"
                aria-label="To unit"
              />
            </div>
          )}
          <Btn variant="gold" sm icon={<IconPrinter size={15} />} onClick={handlePrint}>
            Print
          </Btn>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full text-white/70 hover:bg-white/10 flex items-center justify-center
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
          >
            <IconClose size={18} />
          </button>
        </div>
      </div>

      <div className="no-print max-w-[820px] mx-auto px-4 pt-3 space-y-1">
        <div className="text-[12.5px] text-muted">
          Tags print at {LABEL.w} × {LABEL.h} mm, one per label. In the print dialog you must pick
          the matching {LABEL.w} × {LABEL.h} mm paper, with margins None and scale 100% — on any
          other paper size the tag prints rotated, across the gaps between labels.
        </div>
        {singleTruncated && (
          <div className="text-[12.5px] text-pending">
            Showing {MAX} tags at a time — adjust the unit range above to print the rest.
          </div>
        )}
        {truncated && (
          <div className="text-[12.5px] text-pending">
            Showing the first {items.length} of {totalTags} tags — print these, then open
            “Print new tags” again for the rest (finished entries won’t repeat).
          </div>
        )}
      </div>

      {/* Printable labels — each box is exactly one physical tag. */}
      <div id="labels-print" className="max-w-[820px] mx-auto p-4 flex flex-wrap gap-3 justify-center">
        {items.map(({ a, n }) => {
          const code = rangeCode(a, n, n);
          return (
            <div
              key={`${a.code}:${n}`}
              className="tag border border-line rounded-md bg-white flex items-center overflow-hidden"
              style={{
                // The tag IS the page — never smaller, or it floats on the stock.
                width: `${LABEL.w}mm`,
                height: `${LABEL.h}mm`,
                padding: `${INSET}mm`,
                gap: `${GAP.toFixed(2)}mm`,
                // The thermal head is 1-bit — the brand navy/grey would dither to
                // mush at this size, so every line prints solid black.
                color: '#000',
                breakInside: 'avoid',
              }}
            >
              <Qr
                value={scanUrl(a, n)}
                size={Math.round(QR_MM * PX_MM)}
                res={4}
                className="flex-none"
              />
              <div className="min-w-0 leading-tight">
                <div className="font-mono font-bold tnum truncate" style={{ fontSize: ptOf(RAMP.code) }}>
                  {code}
                </div>
                <div className="font-semibold truncate" style={{ fontSize: ptOf(RAMP.name) }}>
                  {a.name}
                </div>
                <div className="truncate" style={{ fontSize: ptOf(RAMP.detail) }}>{a.department}</div>
                <div className="truncate" style={{ fontSize: ptOf(RAMP.detail) }}>{a.location}</div>
                {a.property && (
                  <div
                    className="uppercase tracking-wider truncate"
                    style={{ fontSize: ptOf(RAMP.brand), marginTop: `${(INSET * 0.16).toFixed(2)}mm` }}
                  >
                    Property of {a.property}
                  </div>
                )}
                <div
                  className="uppercase tracking-wider truncate"
                  style={{
                    fontSize: ptOf(RAMP.brand),
                    marginTop: a.property ? 0 : `${(INSET * 0.16).toFixed(2)}mm`,
                  }}
                >
                  Centre Point Amravati
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
