import { useMemo, useState } from 'react';
import { codeLabel } from '../../utils/asset.js';
import { fmtDate, inr } from '../../utils/format.js';
import { Badge, Btn, inputCls, statusVariant, conditionVariant, EmptyState } from '../ui.jsx';
import { IconSearch, IconDownload, IconMapPin, IconClipboardList } from '../Icon.jsx';
import Modal from '../Modal.jsx';

// How many physical tags an entry covers.
const unitCount = (e) => (e.seqStart != null && e.seqEnd != null ? e.seqEnd - e.seqStart + 1 : 1);

// Room-wise report: every room (exact location) with the entries inside it,
// unit counts and estimated value — searchable, exportable to Excel.
export default function RoomReport({ assets, onClose }) {
  const [search, setSearch] = useState('');

  const rooms = useMemo(() => {
    const map = new Map();
    for (const a of assets) {
      const room = String(a.location || '').trim() || '(no room recorded)';
      const key = room.toLowerCase();
      if (!map.has(key)) map.set(key, { room, entries: [] });
      map.get(key).entries.push(a);
    }
    const list = [...map.values()];
    for (const r of list) {
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
        <Btn variant="gold" block icon={<IconDownload size={16} />} onClick={exportExcel} disabled={!rooms.length}>
          Export room report (Excel)
        </Btn>
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
    </Modal>
  );
}
