import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { codeLabel } from '../../utils/asset.js';
import { fmtDate, fmtDateTime, inr } from '../../utils/format.js';
import { Badge, Btn, inputCls, statusVariant, conditionVariant, EmptyState } from '../ui.jsx';
import { IconSearch, IconDownload, IconMapPin, IconClipboardList, IconPrinter } from '../Icon.jsx';
import Modal from '../Modal.jsx';

// How many physical tags an entry covers.
const unitCount = (e) => (e.seqStart != null && e.seqEnd != null ? e.seqEnd - e.seqStart + 1 : 1);

// Normalise a typed location so every spelling of the same room lands in ONE
// group: case and spacing are ignored, and a leading "Room / Rm / Room No."
// prefix is dropped when a number follows — "201", "room 201", "Room No. 201"
// and "201 " are all the same room. A prefix before a word is kept, so a
// location genuinely called "Room Service Store" is not mangled.
function roomKey(loc) {
  const s = String(loc || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const m = s.match(/^(?:room|rm)\.?\s*(?:no\.?|number|#)?\s*[:\-#]?\s*(\d.*)$/);
  return (m ? m[1] : s).trim();
}

// Room-wise report: every room (exact location) with the entries inside it,
// unit counts and estimated value — searchable, exportable to Excel.
export default function RoomReport({ assets, onClose }) {
  const [search, setSearch] = useState('');

  const rooms = useMemo(() => {
    const map = new Map();
    for (const a of assets) {
      const raw = String(a.location || '').trim() || '(no room recorded)';
      const key = roomKey(raw);
      if (!map.has(key)) map.set(key, { entries: [], spellings: new Map() });
      const g = map.get(key);
      g.entries.push(a);
      g.spellings.set(raw, (g.spellings.get(raw) || 0) + 1);
    }
    const list = [...map.values()];
    for (const r of list) {
      // Display the spelling the team used most often for this room.
      r.room = [...r.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0];
      r.units = r.entries.reduce((s, e) => s + unitCount(e), 0);
      r.value = r.entries.reduce((s, e) => s + (parseFloat(e.estimatedValue) || 0), 0);
      r.departments = [...new Set(r.entries.map((e) => e.department).filter(Boolean))];
      r.floors = [...new Set(r.entries.map((e) => e.floor).filter(Boolean))];
    }
    list.sort((x, y) => x.room.localeCompare(y.room, undefined, { numeric: true, sensitivity: 'base' }));
    return list;
  }, [assets]);

  // Search matches a room name (whole room kept) or narrows to matching items.
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return rooms;
    return rooms
      .map((r) => {
        if (r.room.toLowerCase().includes(q)) return r;
        const entries = r.entries.filter((e) =>
          `${e.code} ${e.name} ${e.department}`.toLowerCase().includes(q)
        );
        return entries.length ? { ...r, entries } : null;
      })
      .filter(Boolean);
  }, [rooms, q]);

  const totalUnits = rooms.reduce((s, r) => s + r.units, 0);

  async function exportExcel() {
    const XLSX = await import('xlsx');
    const summary = rooms.map((r) => ({
      Room: r.room,
      Floor: r.floors.join(', '),
      Departments: r.departments.join(', '),
      Entries: r.entries.length,
      Units: r.units,
      'Est. Value': r.value || '',
    }));
    const detail = rooms.flatMap((r) =>
      r.entries.map((e) => ({
        Room: r.room,
        Code: codeLabel(e),
        'Asset Name': e.name,
        Qty: e.qty,
        UOM: e.uom,
        Department: e.department,
        Floor: e.floor,
        Property: e.property || '',
        'Physical Status': e.status,
        Condition: e.condition,
        'Est. Value': e.estimatedValue ?? '',
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Room Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), 'Room Detail');
    XLSX.writeFile(wb, `CPA_Room_Report_${fmtDate(new Date().toISOString())}.xlsx`);
  }

  return (
    <Modal
      onClose={onClose}
      size="lg"
      ariaLabel="Room-wise report"
      header={
        <>
          <div className="flex items-center gap-2">
            <IconMapPin size={16} className="text-gold" />
            <span className="font-serif text-[17px] text-navy">Room-wise report</span>
          </div>
          <div className="text-[12px] text-muted mt-1 tnum">
            {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} · {assets.length} entries · {totalUnits} units
          </div>
        </>
      }
      footer={
        <div className="flex gap-2">
          <Btn
            variant="ghost"
            icon={<IconPrinter size={16} />}
            onClick={() => window.print()}
            disabled={!filtered.length}
            className="flex-1"
          >
            Save as PDF
          </Btn>
          <Btn variant="gold" icon={<IconDownload size={16} />} onClick={exportExcel} disabled={!rooms.length} className="flex-1">
            Excel
          </Btn>
        </div>
      }
    >
      <div className="relative mb-3">
        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          className={`${inputCls} !pl-9 !py-2`}
          placeholder="Search room, code, item…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search rooms"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<IconClipboardList size={26} />}
          title={rooms.length ? 'No matching rooms' : 'No assets logged yet'}
        >
          {rooms.length ? 'Try a different search term.' : 'Rooms appear here as entries are registered.'}
        </EmptyState>
      ) : (
        filtered.map((r) => (
          <div key={r.room} className="border border-line rounded-xl overflow-hidden mb-2.5 bg-white">
            <div className="bg-cream/70 px-3.5 py-2.5 flex items-center justify-between gap-2 flex-wrap border-b border-line">
              <div className="min-w-0">
                <div className="text-[13.5px] font-bold text-navy truncate">{r.room}</div>
                <div className="text-[11.5px] text-muted truncate">
                  {[r.floors.join(', '), r.departments.join(', ')].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="text-[11.5px] text-muted tnum flex-none text-right">
                <div>{r.entries.length} {r.entries.length === 1 ? 'entry' : 'entries'} · {r.units} {r.units === 1 ? 'unit' : 'units'}</div>
                {r.value ? <div className="font-semibold text-navy">{inr(r.value)}</div> : null}
              </div>
            </div>
            <div className="divide-y divide-line/70">
              {r.entries.map((e) => (
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
        ))
      )}

      {/* Printed / PDF version — hidden on screen, rendered against <body> so
          the modal's scroll containers can't clip it. Prints the rooms
          currently shown (search applies), one table per room. */}
      {createPortal(
        <div id="roomreport-print" className="hidden text-ink">
          <h2 className="font-serif text-[20px] text-navy m-0">Room-wise Asset Report</h2>
          <div className="text-[11px] mt-1">
            Centre Point Amravati · Asset Handover Register
          </div>
          <div className="text-[10px] text-muted mt-0.5 tnum">
            Generated {fmtDateTime(new Date().toISOString())} · {filtered.length}{' '}
            {filtered.length === 1 ? 'room' : 'rooms'} ·{' '}
            {filtered.reduce((s, r) => s + r.entries.length, 0)} entries ·{' '}
            {filtered.reduce((s, r) => s + r.entries.reduce((u, e) => u + unitCount(e), 0), 0)} units
          </div>
          {filtered.map((r) => (
            <table key={r.room} className="w-full border-collapse mt-4">
              <thead>
                <tr>
                  <th colSpan={6} className="text-left bg-navy text-white px-2 py-1.5 text-[11px]">
                    {r.room}
                    <span className="font-normal">
                      {' '}
                      — {[r.floors.join(', '), r.departments.join(', ')].filter(Boolean).join(' · ')}
                      {' · '}{r.entries.length} {r.entries.length === 1 ? 'entry' : 'entries'} ·{' '}
                      {r.entries.reduce((u, e) => u + unitCount(e), 0)} units
                      {r.value ? ` · ${inr(r.value)}` : ''}
                    </span>
                  </th>
                </tr>
                <tr>
                  {['Code', 'Asset', 'Qty', 'Status', 'Condition', 'Est. Value'].map((h) => (
                    <th key={h} className="text-left border border-line bg-cream px-2 py-1 text-[9.5px] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.entries.map((e) => (
                  <tr key={e.code}>
                    <td className="border border-line px-2 py-1 font-mono tnum whitespace-nowrap">{codeLabel(e)}</td>
                    <td className="border border-line px-2 py-1">{e.name || '—'}</td>
                    <td className="border border-line px-2 py-1 tnum whitespace-nowrap">{e.qty} {e.uom}</td>
                    <td className="border border-line px-2 py-1">{e.status}</td>
                    <td className="border border-line px-2 py-1">{e.condition}</td>
                    <td className="border border-line px-2 py-1 tnum whitespace-nowrap">
                      {e.estimatedValue != null ? inr(e.estimatedValue) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>,
        document.body
      )}
    </Modal>
  );
}
