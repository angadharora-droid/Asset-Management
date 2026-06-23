import { STATUS_OPTIONS, CONDITION_OPTIONS } from '../../constants/categories.js';
import { selectCls, inputCls } from '../ui.jsx';
import { IconPlus, IconClose } from '../Icon.jsx';

const pad4 = (n) => String(n).padStart(4, '0');
const tinyLabel = 'block text-[10.5px] font-bold uppercase tracking-[0.04em] text-muted mb-1';

// Split a countable batch into groups that add up to the total. Each group
// carries its own status, condition, functionality and remarks (the whole
// Condition & Verification section), and gets a sequential code sub-range.
export default function ConditionSplit({ total, value, onChange, preview }) {
  let prefix = '';
  let start = 1;
  if (preview?.code) {
    const code = preview.code;
    const i = code.lastIndexOf('.');
    prefix = code.slice(0, i + 1);
    start = Number(code.slice(i + 1)) || 1;
  }

  const allocated = value.reduce((s, r) => s + Math.max(0, Math.floor(Number(r.qty) || 0)), 0);
  const remaining = total - allocated;

  let cursor = start;
  const ranges = value.map((r) => {
    const q = Math.max(0, Math.floor(Number(r.qty) || 0));
    if (q <= 0) return null;
    const from = cursor;
    const to = cursor + q - 1;
    cursor = to + 1;
    return { from, to };
  });

  const setRow = (i, patch) => onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    onChange([
      ...value,
      {
        qty: remaining > 0 ? remaining : 1,
        status: 'Found',
        condition: 'Damaged',
        functionalityChecked: 'Not Applicable',
        remarks: '',
      },
    ]);
  const removeRow = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2.5">
      {value.map((r, i) => {
        const rng = ranges[i];
        return (
          <div key={i} className="rounded-xl border border-line bg-cream/50 p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <input
                type="number"
                min="1"
                value={r.qty}
                onChange={(e) => setRow(i, { qty: e.target.value })}
                aria-label={`Quantity for group ${i + 1}`}
                className="w-16 px-2 py-1.5 border-[1.5px] border-line rounded-lg text-[14px] text-center tnum bg-white
                           focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold-light/60"
              />
              <span className="text-[11.5px] text-muted">units</span>
              {rng && (
                <span className="ml-auto font-mono text-[11.5px] text-navy tnum">
                  {prefix}
                  {pad4(rng.from)}
                  {rng.from !== rng.to ? `–${pad4(rng.to)}` : ''}
                </span>
              )}
              {value.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  aria-label={`Remove group ${i + 1}`}
                  className="w-7 h-7 rounded-full text-muted hover:bg-damaged-bg hover:text-damaged flex items-center justify-center flex-none
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
                >
                  <IconClose size={15} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={tinyLabel}>Status</label>
                <select className={`${selectCls} !py-2`} value={r.status} onChange={(e) => setRow(i, { status: e.target.value })}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={tinyLabel}>Condition</label>
                <select className={`${selectCls} !py-2`} value={r.condition} onChange={(e) => setRow(i, { condition: e.target.value })}>
                  {CONDITION_OPTIONS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className={tinyLabel}>Functionality</label>
                <select
                  className={`${selectCls} !py-2`}
                  value={r.functionalityChecked}
                  onChange={(e) => setRow(i, { functionalityChecked: e.target.value })}
                >
                  <option>Not Applicable</option>
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
              <div>
                <label className={tinyLabel}>
                  Remarks {r.condition === 'Damaged' && <span className="text-damaged">*</span>}
                </label>
                <input
                  className={`${inputCls} !py-2`}
                  placeholder="Notes"
                  value={r.remarks}
                  onChange={(e) => setRow(i, { remarks: e.target.value })}
                />
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-navy hover:text-gold
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light rounded"
        >
          <IconPlus size={14} /> Add group
        </button>
        <span className={`text-[12px] font-semibold tnum ${remaining === 0 ? 'text-good' : 'text-damaged'}`}>
          {allocated}/{total} allocated
          {remaining !== 0 ? ` · ${remaining > 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}` : ''}
        </span>
      </div>
    </div>
  );
}
