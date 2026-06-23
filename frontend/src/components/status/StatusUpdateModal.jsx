import { useEffect, useState } from 'react';
import { updateStatus } from '../../api/assetApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { STATUS_OPTIONS, CONDITION_OPTIONS, ACCEPTED_OPTIONS } from '../../constants/categories.js';
import { codeLabel, assetSegments, rangeCode } from '../../utils/asset.js';
import { fmtDateTime } from '../../utils/format.js';
import { Btn, Banner, Label, Badge, ChipGroup, inputCls, selectCls, statusVariant, conditionVariant } from '../ui.jsx';
import { IconCheck, IconClock } from '../Icon.jsx';
import Tag from '../Tag.jsx';
import Modal from '../Modal.jsx';

function acceptedVariant(a) {
  if (a === 'Yes') return 'good';
  if (a === 'No') return 'damaged';
  if (a === 'Conditional') return 'pending';
  return 'navy';
}

const FIELD_LABELS = {
  status: 'Status',
  condition: 'Condition',
  functionalityChecked: 'Functionality',
  accepted: 'Accepted',
  serial: 'Serial No.',
  remarks: 'Remarks',
};

export default function StatusUpdateModal({ asset, unit = null, onClose, onSaved }) {
  const showToast = useToast();
  const { user } = useAuth();
  const segs = assetSegments(asset);
  const unitMode = unit != null;
  const multi = !unitMode && Array.isArray(asset.segments) && asset.segments.length > 1;

  const [segIdx, setSegIdx] = useState(0);
  const baseSeg = unitMode
    ? segs.find((s) => unit >= s.from && unit <= s.to) || segs[0]
    : segs[segIdx] || segs[0];

  const [form, setForm] = useState(() => ({
    status: baseSeg.status || asset.status,
    condition: baseSeg.condition || asset.condition,
    functionalityChecked: baseSeg.functionalityChecked || asset.functionalityChecked || 'Not Applicable',
    accepted: baseSeg.accepted || asset.accepted || 'Pending',
    note: '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const setField = (n, v) => setForm((f) => ({ ...f, [n]: v }));

  // Load the target's current values when the targeted unit or sub-range changes.
  useEffect(() => {
    const s = unitMode ? segs.find((x) => unit >= x.from && unit <= x.to) || segs[0] : segs[segIdx];
    if (s) {
      setForm((f) => ({
        ...f,
        status: s.status,
        condition: s.condition,
        functionalityChecked: s.functionalityChecked || 'Not Applicable',
        accepted: s.accepted || 'Pending',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, segIdx]);

  const cur = baseSeg || {};
  const dirty =
    form.status !== cur.status ||
    form.condition !== cur.condition ||
    form.functionalityChecked !== (cur.functionalityChecked || 'Not Applicable') ||
    form.accepted !== (cur.accepted || 'Pending');

  const targetLabel = unitMode
    ? rangeCode(asset, unit, unit)
    : multi
    ? rangeCode(asset, cur.from, cur.to)
    : '';
  const suffix = targetLabel ? ` · ${targetLabel}` : '';

  async function handleSave() {
    setError('');
    if (!dirty && !form.note.trim()) {
      setError('Change a field or add a note before saving.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        status: form.status,
        condition: form.condition,
        functionalityChecked: form.functionalityChecked,
        accepted: form.accepted,
        note: form.note,
      };
      if (unitMode) payload.unit = unit;
      else if (Array.isArray(asset.segments) && asset.segments.length) payload.segmentIndex = segIdx;
      await updateStatus(asset.code, payload);
      showToast('Status updated · ' + (unitMode ? targetLabel : asset.code), 'success');
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not update status.');
    } finally {
      setSaving(false);
    }
  }

  const history = [...(asset.history || [])].reverse();
  const rangeFor = (s) => rangeCode(asset, s.from, s.to);

  return (
    <Modal
      onClose={onClose}
      ariaLabel={`Update status ${asset.code}`}
      header={
        unitMode ? (
          <>
            <Tag code={targetLabel} size="sm" />
            <div className="text-ink text-[14px] font-semibold mt-2 truncate">{asset.name}</div>
            <div className="text-[11.5px] text-muted mt-0.5">Individual unit of {codeLabel(asset)}</div>
          </>
        ) : (
          <>
            <Tag code={codeLabel(asset)} size="sm" />
            <div className="text-ink text-[14px] font-semibold mt-2 truncate">{asset.name}</div>
          </>
        )
      }
      footer={
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={saving} className="flex-1">
            Cancel
          </Btn>
          <Btn variant="primary" onClick={handleSave} loading={saving} icon={!saving && <IconCheck size={16} />} className="flex-1">
            {saving ? 'Saving…' : unitMode ? 'Save unit update' : 'Save update'}
          </Btn>
        </div>
      }
    >
      {unitMode && (
        <Banner tone="info" className="!mb-4">
          Updating just unit <b className="font-mono tnum">{targetLabel}</b> — it will be split out from its
          group without affecting the others.
        </Banner>
      )}

      {multi && (
        <div className="mb-4">
          <Label className="!mt-0">Sub-range to update</Label>
          <div className="space-y-1.5">
            {segs.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSegIdx(i)}
                className={[
                  'w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light',
                  i === segIdx ? 'border-gold bg-gold/5' : 'border-line bg-white hover:border-gold/50',
                ].join(' ')}
              >
                <span className="font-mono text-[12.5px] text-navy tnum">{rangeFor(s)}</span>
                <Badge variant={conditionVariant(s.condition)} dot>{s.condition}</Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      <Label className={multi || unitMode ? '' : '!mt-0'}>Physical Status{suffix}</Label>
      <ChipGroup
        options={STATUS_OPTIONS}
        value={form.status}
        onChange={(v) => setField('status', v)}
        getVariant={statusVariant}
        ariaLabel="Physical status"
      />

      <div className="mt-3.5">
        <Label>Asset Condition{suffix}</Label>
        <ChipGroup
          options={CONDITION_OPTIONS}
          value={form.condition}
          onChange={(v) => setField('condition', v)}
          getVariant={conditionVariant}
          ariaLabel="Asset condition"
        />
      </div>

      <div className="mt-3.5">
        <Label>Handover Accepted?{suffix}</Label>
        <ChipGroup
          options={ACCEPTED_OPTIONS}
          value={form.accepted}
          onChange={(v) => setField('accepted', v)}
          getVariant={acceptedVariant}
          ariaLabel="Handover accepted"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 mt-1">
        <div>
          <Label>Functionality Checked?</Label>
          <select
            className={selectCls}
            value={form.functionalityChecked}
            onChange={(e) => setField('functionalityChecked', e.target.value)}
          >
            <option>Not Applicable</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </div>
        <div>
          <Label>Updated by</Label>
          <div className={`${inputCls} bg-cream/60 flex items-center text-muted`} aria-readonly="true">
            {user?.name || '—'}
          </div>
        </div>
      </div>

      <Label>Note (optional)</Label>
      <textarea
        className={inputCls}
        placeholder="Reason / observation for this update"
        value={form.note}
        onChange={(e) => setField('note', e.target.value)}
      />

      {error && <Banner tone="error" role="alert" className="mt-3 !mb-0">{error}</Banner>}

      {history.length > 0 && (
        <div className="mt-6">
          <div className="text-2xs font-bold uppercase tracking-[0.12em] text-gold mb-3">Change history</div>
          <ol className="relative border-l border-line ml-1.5 space-y-4">
            {history.map((h, i) => (
              <li key={i} className="pl-4 relative">
                <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-gold ring-2 ring-white" />
                <div className="text-[12px] text-muted flex items-center gap-1.5 flex-wrap">
                  <IconClock size={12} /> {fmtDateTime(h.at)} · {h.by || '—'}
                  {h.range && <span className="font-mono text-navy tnum">· {h.range}</span>}
                </div>
                {h.changes?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {h.changes.map((c, ci) => (
                      <span key={ci} className="text-[11px] bg-cream border border-line rounded px-1.5 py-0.5">
                        <span className="text-muted">{FIELD_LABELS[c.field] || c.field}:</span> {c.from || '—'} →{' '}
                        <b className="text-navy">{c.to || '—'}</b>
                      </span>
                    ))}
                  </div>
                )}
                {h.note && <div className="text-[12.5px] text-ink mt-1.5 italic">“{h.note}”</div>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </Modal>
  );
}
