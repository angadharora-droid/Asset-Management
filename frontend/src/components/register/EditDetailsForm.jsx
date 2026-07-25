import { useEffect, useState } from 'react';
import { updateAsset } from '../../api/assetApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { suggestClassification } from '../../utils/classification.js';
import { codeLabel } from '../../utils/asset.js';
import {
  DEPARTMENTS, PROPERTIES, VALUE_SOURCES, CLASSIFICATIONS, ACCEPTED_OPTIONS,
} from '../../constants/categories.js';
import { SectionHead, Label, Btn, Banner, inputCls, selectCls } from '../ui.jsx';
import { IconBox, IconMapPin, IconBanknote, IconShield, IconCamera, IconFile, IconCheck } from '../Icon.jsx';
import PhotoUploader from '../entry/PhotoUploader.jsx';
import DocumentUploader from '../entry/DocumentUploader.jsx';

// Edit an existing entry from the Register. Everything is editable except the
// identity (code / category / item type — the barcode is already issued) and
// the quantity (its code block is already reserved). Status & condition are
// updated from the status flow so every change lands in the audit trail.
export default function EditDetailsForm({ asset, onCancel, onSaved }) {
  const showToast = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState({
    // What it is
    name: asset.name || '',
    brand: asset.brand || '',
    model: asset.model || '',
    serial: asset.serial || '',
    size: asset.size || '',
    // Where
    property: asset.property || '',
    floor: asset.floor || '',
    department: asset.department || '',
    location: asset.location || '',
    expectedLocation: asset.expectedLocation || '',
    remarks: asset.remarks || '',
    // Value & classification
    estimatedValue: asset.estimatedValue ?? '',
    valueSource: asset.valueSource || 'Unknown',
    biggerThanMicrowave: asset.biggerThanMicrowave || 'Not Applicable',
    usefulLifeOver12: asset.usefulLifeOver12 || 'Unknown',
    classification: asset.classification || 'Pending Review',
    // Custody
    tempCustodian: asset.tempCustodian || '',
    finalCustodian: asset.finalCustodian || '',
    hgaRep: asset.hgaRep || '',
    cphRep: asset.cphRep || '',
    verifiedBy: asset.verifiedBy || user?.name || '',
    accepted: asset.accepted || 'Pending',
  });
  // Attachments — normalise any legacy {front, location, …} photo objects.
  const [photos, setPhotos] = useState(() =>
    Array.isArray(asset.photos)
      ? asset.photos.filter((p) => p?.dataUrl)
      : Object.entries(asset.photos || {})
          .filter(([, v]) => v)
          .map(([k, v]) => ({ dataUrl: v, caption: k }))
  );
  const [documents, setDocuments] = useState(() => (Array.isArray(asset.documents) ? asset.documents : []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const bind = (name) => ({ value: form[name], onChange: (e) => setField(name, e.target.value) });

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
    if (!form.name.trim()) return setError('Asset Name / Description is required.');
    if (!form.department) return setError('Department / Area is required.');
    if (!form.location.trim()) return setError('Exact Location / Room No. is required.');

    setSaving(true);
    try {
      const payload = {
        ...form,
        estimatedValue: form.estimatedValue === '' ? null : Number(form.estimatedValue),
        tempCustodian: form.tempCustodian.trim() || 'Handover Committee',
        finalCustodian: form.finalCustodian.trim() || 'To be assigned',
        photos,
        documents,
      };
      await updateAsset(asset.code, payload);
      showToast('Updated ' + asset.code, 'success');
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* What it is */}
      <SectionHead icon={<IconBox size={15} />}>What is it</SectionHead>
      <div className="text-[12px] text-muted -mt-1.5 mb-1">
        Code <span className="font-mono font-semibold text-navy tnum">{codeLabel(asset)}</span> ·{' '}
        {asset.qty} {asset.uom} — the barcode, category and quantity are fixed once issued.
      </div>
      <Label required>Asset Name / Description</Label>
      <input className={inputCls} {...bind('name')} />
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label>Brand / Make</Label>
          <input className={inputCls} {...bind('brand')} />
        </div>
        <div>
          <Label>Model</Label>
          <input className={inputCls} {...bind('model')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label>Serial No.</Label>
          <input className={inputCls} {...bind('serial')} />
        </div>
        <div>
          <Label>Size / Capacity</Label>
          <input className={inputCls} {...bind('size')} />
        </div>
      </div>
      <Label>Remarks / Observation</Label>
      <textarea className={inputCls} {...bind('remarks')} />

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
      {(asset.status === 'Missing' || form.expectedLocation) && (
        <>
          <Label>Expected Location</Label>
          <input className={inputCls} placeholder="Where was this expected to be found?" {...bind('expectedLocation')} />
        </>
      )}

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
            {VALUE_SOURCES.map((v) => (
              <option key={v}>{v}</option>
            ))}
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
        {CLASSIFICATIONS.map((c) => (
          <option key={c}>{c}</option>
        ))}
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
            {ACCEPTED_OPTIONS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Attachments */}
      <div className="mt-4">
        <SectionHead icon={<IconCamera size={15} />}>Photos</SectionHead>
      </div>
      <PhotoUploader value={photos} onChange={setPhotos} requireOne={asset.condition === 'Damaged'} />

      <div className="mt-4">
        <SectionHead icon={<IconFile size={15} />}>Documents</SectionHead>
      </div>
      <DocumentUploader value={documents} onChange={setDocuments} />

      {error && <Banner tone="error" role="alert" className="mt-3">{error}</Banner>}

      <div className="flex gap-2 mt-5">
        <Btn variant="ghost" onClick={onCancel} disabled={saving} className="flex-1">
          Cancel
        </Btn>
        <Btn
          variant="primary"
          onClick={handleSave}
          loading={saving}
          icon={!saving && <IconCheck size={16} />}
          className="flex-1"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </Btn>
      </div>
    </div>
  );
}
