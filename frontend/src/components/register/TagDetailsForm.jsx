import { useMemo, useState } from 'react';
import { updateAsset, updateTagDetails } from '../../api/assetApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { assetSegments, rangeCode, codeLabel } from '../../utils/asset.js';
import { SectionHead, Label, Btn, Banner, inputCls } from '../ui.jsx';
import { IconCheck, IconTag, IconBox } from '../Icon.jsx';
import Tag from '../Tag.jsx';
import Modal from '../Modal.jsx';

// Edit a tag's descriptive details. Serial No. and Remarks are saved PER TAG
// (split out for that unit); Name/Brand/Model/Size apply to the whole asset.
// Status / condition are intentionally not edited here.
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
    }),
    [seg, asset]
  );

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const bind = (k) => ({ value: form[k], onChange: (e) => setField(k, e.target.value) });

  async function handleSave() {
    setError('');
    if (!form.name.trim()) {
      setError('Name / Description is required.');
      return;
    }

    // Shared (whole-asset) descriptive fields that changed.
    const shared = {};
    ['name', 'brand', 'model', 'size'].forEach((k) => {
      if (form[k] !== initial[k]) shared[k] = form[k].trim();
    });

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

      {/* Shared descriptive fields */}
      <div className="mt-4">
        <SectionHead icon={<IconBox size={15} />}>
          {isBlock ? 'All tags in this asset' : 'Description'}
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
      <Label>Size</Label>
      <input className={inputCls} {...bind('size')} />

      {isBlock && (
        <Banner tone="info" className="mt-4 !mb-0">
          Name, brand, model &amp; size apply to <b>every tag</b> in this asset. Only the serial number and remarks
          above are saved just for tag <span className="font-mono tnum">{tagCode}</span>.
        </Banner>
      )}

      {error && <Banner tone="error" role="alert" className="mt-3 !mb-0">{error}</Banner>}
    </Modal>
  );
}
