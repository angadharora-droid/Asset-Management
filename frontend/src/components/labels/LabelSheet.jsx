import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { rangeCode, codeLabel, scanUrl, assetSegments } from '../../utils/asset.js';
import { Btn } from '../ui.jsx';
import { IconPrinter, IconClose } from '../Icon.jsx';
import Qr from '../Qr.jsx';

const MAX = 120; // labels rendered per sheet

// Printable barcode (QR) tags — one per unit. Each QR opens the unit's
// read-only scan page; the label also prints the key details.
export default function LabelSheet({ asset, onClose }) {
  const lo = asset.seqStart || 1;
  const hi = asset.seqEnd || lo;
  const total = hi - lo + 1;
  const [from, setFrom] = useState(lo);
  const [to, setTo] = useState(Math.min(hi, lo + MAX - 1));

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const segs = assetSegments(asset);
  const segFor = (n) => segs.find((s) => n >= s.from && n <= s.to);

  const start = Math.max(lo, Math.min(Number(from) || lo, hi));
  const end = Math.max(start, Math.min(Number(to) || hi, hi));
  const units = [];
  for (let n = start; n <= end && units.length < MAX; n += 1) units.push(n);
  const truncated = end - start + 1 > MAX;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-cream overflow-y-auto">
      {/* Toolbar (not printed) */}
      <div className="no-print sticky top-0 ink-panel text-white px-4 py-3 flex items-center justify-between gap-3 z-10">
        <div className="min-w-0">
          <div className="font-serif text-[16px] leading-tight">Print barcode tags</div>
          <div className="text-[12px] text-white/60 truncate">{codeLabel(asset)} · {asset.name}</div>
        </div>
        <div className="flex items-center gap-2 flex-none">
          {total > 1 && (
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
          <Btn variant="gold" sm icon={<IconPrinter size={15} />} onClick={() => window.print()}>
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

      {truncated && (
        <div className="no-print max-w-[820px] mx-auto px-4 pt-3 text-[12.5px] text-pending">
          Showing {MAX} tags per sheet — adjust the unit range above to print the rest.
        </div>
      )}

      {/* Printable label grid */}
      <div id="labels-print" className="max-w-[820px] mx-auto p-4 grid grid-cols-2 gap-3">
        {units.map((n) => {
          const code = rangeCode(asset, n, n);
          const seg = segFor(n);
          return (
            <div
              key={n}
              className="border border-line rounded-lg p-3 flex gap-3 items-center bg-white"
              style={{ breakInside: 'avoid' }}
            >
              <Qr value={scanUrl(asset, n)} size={92} className="flex-none" />
              <div className="min-w-0">
                <div className="font-mono font-semibold text-navy text-[13px] tnum truncate">{code}</div>
                <div className="text-[12px] font-semibold text-ink truncate">{asset.name}</div>
                <div className="text-[11px] text-muted truncate">{asset.category}</div>
                <div className="text-[11px] text-muted truncate">
                  {asset.department} · {asset.location}
                </div>
                {seg && <div className="text-[10.5px] text-muted mt-0.5">{seg.status} · {seg.condition}</div>}
                <div className="text-[9px] text-muted mt-1 uppercase tracking-wider">
                  Centre Point Amravati · scan to view
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
