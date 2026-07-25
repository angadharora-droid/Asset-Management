import { useEffect, useMemo, useState } from 'react';
import { updateAsset, updateTagDetails } from '../../api/assetApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { assetSegments, rangeCode, codeLabel } from '../../utils/asset.js';
import { suggestClassification } from '../../utils/classification.js';
import {
  DEPARTMENTS, PROPERTIES, VALUE_SOURCES, CLASSIFICATIONS, ACCEPTED_OPTIONS,
} from '../../constants/categories.js';
import { SectionHead, Label, Btn, Banner, inputCls, selectCls } from '../ui.jsx';
import { IconCheck, IconTag, IconBox, IconMapPin, IconBanknote, IconShield } from '../Icon.jsx';
import Tag from '../Tag.jsx';
import Modal from '../Modal.jsx';

// Whole-entry fields the shared section edits — everything the full editor
// allows. Only the ones that actually changed are sent on save.
const SHARED_KEYS = [
  'name', 'brand', 'model', 'size',
  'property', 'floor', 'department', 'location',
  'estimatedValue', 'valueSource', 'biggerThanMicrowave', 'usefulLifeOver12', 'classification',
  'tempCustodian', 'finalCustodian', 'hgaRep', 'cphRep', 'verifiedBy', 'accepted',
];

// Edit a tag's details. Serial No. and Remarks are saved PER TAG (split out for
// that unit); every other field applies to the whole entry, same as the full
// "Edit details" form. Status / condition are intentionally not edited here —
// they go through the status flow so changes land in the audit trail.
export default function TagDetailsForm({ asset, unit, onClose, onSaved }) {
  const showToast = useToast();
  const lo = asset.seqStart || 1;
  const hi = asset.seqEnd || lo;
  const isBlock = hi > lo;
  const n = unit != null ? unit : lo;
  const tagCode = rangeCode(asset, n, n);

  const seg = useMemo(() => {
    const segs = assetSegments(asset);
    return segs.find((s) => n >= s.from && n <= s.to) || segs[0] || {};
  }, [asset, n]);

  const initial = useMemo(
    () => ({
      serial: seg.serial || asset.serial || '',
      remarks: seg.remarks || '',
      name: asset.name || '',
      brand: asset.brand || '',
      model: asset.model || '',
      size: asset.size || '',
      property: asset.property || '',
      floor: asset.floor || '',
      department: asset.department || '',
      location: asset.location || '',
      estimatedValue: asset.estimatedValue ?? '',
      valueSource: asset.valueSource || 'Unknown',
      biggerThanMicrowave: asset.biggerThanMicrowave || 'Not Applicable',
      usefulLifeOver12: asset.usefulLifeOver12 || 'Unknown',
      classification: asset.classification || 'Pending Review',
      tempCustodian: asset.tempCustodian || '',
      finalCustodian: asset.finalCustodian || '',
      hgaRep: asset.hgaRep || '',
      cphRep: asset.cphRep || '',
      verifiedBy: asset.verifiedBy || '',
      accepted: asset.accepted || 'Pending',
    }),
    [seg, asset]
  );

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const bind = (k) => ({ value: form[k], onChange: (e) => setField(k, e.target.value) });

  const suggestion = suggestClassification({
    estimatedValue: form.estimatedValue,
    usefulLifeOver12: form.usefulLifeOver12,
    categoryCode: asset.categoryCode,
  });

  // Keep classification in sync with the suggestion when its inputs change.
  useEffect(() => {
    setField('classification', suggestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.estimatedValue, form.usefulLifeOver12]);

  async function handleSave() {
    setError('');
    if (!String(form.name).trim()) return setError('Name / Description is required.');
    if (!form.department) return setError('Department / Area is required.');
    if (!String(form.location).trim()) return setError('Exact Location / Room No. is required.');

    // Shared (whole-entry) fields that changed.
    const shared = {};
    for (const k of SHARED_KEYS) {
      if (form[k] === initial[k]) continue;
      shared[k] = typeof form[k] === 'string' ? form[k].trim() : form[k];
    }
    if (shared.estimatedValue !== undefined) {
      shared.estimatedValue = shared.estimatedValue === '' ? null : Number(shared.estimatedValue);
    }

    // Per-tag fields that changed.
    const perTag = {};
    if (form.serial !== initial.serial) perTag.serial = form.serial.trim();
    if (form.remarks !== initial.remarks) perTag.remarks = form.remarks.trim();

    if (!Object.keys(shared).length && !Object.keys(perTag).length) {
      setError('No changes to save.');
      return;
    }

    setSaving(true);
    try {
      if (Object.keys(shared).length) await updateAsset(asset.code, shared);
      if (Object.keys(perTag).length) {
        if (isBlock) perTag.unit = n;
        await updateTagDetails(asset.code, perTag);
      }
      showToast(`Saved · ${isBlock ? tagCode : codeLabel(asset)}`, 'success');
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      ariaLabel={`Edit details ${tagCode}`}
      header={
        <>
          <Tag code={isBlock ? tagCode : codeLabel(asset)} size="sm" />
          <div className="text-ink text-[14px] font-semibold mt-2 truncate">{asset.name}</div>
          {isBlock && <div className="text-[11.5px] text-muted mt-0.5">Individual tag of {codeLabel(asset)}</div>}
        </>
      }
      footer={
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={saving} className="flex-1">
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={handleSave}
            loading={saving}
            icon={!saving && <IconCheck size={16} />}
            className="flex-1"
          >
            {saving ? 'Saving…' : 'Save details'}
          </Btn>
        </div>
      }
    >
      {/* Per-tag identity */}
      <SectionHead icon={<IconTag size={15} />}>{isBlock ? 'This tag only' : 'Tag details'}</SectionHead>
      <Label>Serial No.</Label>
      <input className={inputCls} placeholder="e.g. SN-48821-A" {...bind('serial')} />
      {isBlock && (
        <div className="text-[11.5px] text-muted mt-1">
          Saved for tag <span className="font-mono tnum text-navy">{tagCode}</span> only — other tags are unaffected.
        </div>
      )}
      <Label>Remarks / Note</Label>
      <textarea className={inputCls} placeholder="Any note specific to this tag" {...bind('remarks')} />

      {isBlock && (
        <Banner tone="info" className="mt-4 !mb-0">
          Everything below applies to <b>every tag</b> in this asset. Only the serial number and remarks
          above are saved just for tag <span className="font-mono tnum">{tagCode}</span>.
        </Banner>
      )}

      {/* Shared descriptive fields */}
      <div className="mt-4">
        <SectionHead icon={<IconBox size={15} />}>
          {isBlock ? 'All tags · Description' : 'Description'}
        </SectionHead>
      </div>
      <Label required>Name / Description</Label>
      <input className={inputCls} {...bind('name')} />
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label>Brand</Label>
          <input className={inputCls} {...bind('brand')} />
        </div>
        <div>
          <Label>Model</Label>
          <input className={inputCls} {...bind('model')} />
        </div>
      </div>
      <Label>Size / Capacity</Label>
      <input className={inputCls} {...bind('size')} />

      {/* Where */}
      <div className="mt-4">
        <SectionHead icon={<IconMapPin size={15} />}>Where</SectionHead>
      </div>
      <Label className="!mt-0">Property</Label>
      <select className={selectCls} {...bind('property')}>
        <option value="">Select…</option>
        {PROPERTIES.map((p) => <option key={p}>{p}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label>Floor / Block</Label>
          <input className={inputCls} {...bind('floor')} />
        </div>
        <div>
          <Label required>Department / Area</Label>
          <select className={selectCls} {...bind('department')}>
            <option value="">Select…</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <Label required>Exact Location / Room No. / Outlet</Label>
      <input className={inputCls} {...bind('location')} />

      {/* Value & Classification */}
      <div className="mt-4">
        <SectionHead icon={<IconBanknote size={15} />}>Value &amp; Classification</SectionHead>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label>Estimated Value (₹)</Label>
          <input type="number" min="0" className={inputCls} placeholder="e.g. 45000" {...bind('estimatedValue')} />
        </div>
        <div>
          <Label>Value Source</Label>
          <select className={selectCls} {...bind('valueSource')}>
            {VALUE_SOURCES.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label>Bigger than a microwave?</Label>
          <select className={selectCls} {...bind('biggerThanMicrowave')}>
            <option>Not Applicable</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </div>
        <div>
          <Label>Useful life over 12 months?</Label>
          <select className={selectCls} {...bind('usefulLifeOver12')}>
            <option>Unknown</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </div>
      </div>
      <div className="inline-block mt-1.5 px-2.5 py-[5px] rounded-md text-[12px] font-semibold bg-pending-bg text-pending">
        Suggested: {suggestion}
      </div>
      <Label>Final Classification</Label>
      <select className={selectCls} {...bind('classification')}>
        {CLASSIFICATIONS.map((c) => <option key={c}>{c}</option>)}
      </select>

      {/* Custody */}
      <div className="mt-4">
        <SectionHead icon={<IconShield size={15} />}>Custody &amp; Acceptance</SectionHead>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label>Temporary Custodian</Label>
          <input className={inputCls} placeholder="Handover Committee" {...bind('tempCustodian')} />
        </div>
        <div>
          <Label>Final Department Custodian</Label>
          <input className={inputCls} placeholder="To be assigned" {...bind('finalCustodian')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label>Hariganga Representative</Label>
          <input className={inputCls} {...bind('hgaRep')} />
        </div>
        <div>
          <Label>CPH Representative</Label>
          <input className={inputCls} {...bind('cphRep')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label>Verified By</Label>
          <input className={inputCls} placeholder="Name" {...bind('verifiedBy')} />
        </div>
        <div>
          <Label>Handover Accepted?</Label>
          <select className={selectCls} {...bind('accepted')}>
            {ACCEPTED_OPTIONS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {error && <Banner tone="error" role="alert" className="mt-3 !mb-0">{error}</Banner>}
    </Modal>
  );
}
