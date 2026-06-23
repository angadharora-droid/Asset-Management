import { useEffect, useState } from 'react';
import { updateAsset } from '../../api/assetApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { suggestClassification } from '../../utils/classification.js';
import { VALUE_SOURCES, CLASSIFICATIONS, ACCEPTED_OPTIONS } from '../../constants/categories.js';
import { SectionHead, Label, Btn, Banner, inputCls, selectCls } from '../ui.jsx';
import { IconBanknote, IconShield, IconCheck } from '../Icon.jsx';

// Stage 2 — value, accounting class and custody, filled in from the Register
// after the asset has already been physically captured.
export default function EditDetailsForm({ asset, onCancel, onSaved }) {
  const showToast = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState({
    estimatedValue: asset.estimatedValue ?? '',
    valueSource: asset.valueSource || 'Unknown',
    biggerThanMicrowave: asset.biggerThanMicrowave || 'Not Applicable',
    usefulLifeOver12: asset.usefulLifeOver12 || 'Unknown',
    classification: asset.classification || 'Pending Review',
    tempCustodian: asset.tempCustodian || '',
    finalCustodian: asset.finalCustodian || '',
    hgaRep: asset.hgaRep || '',
    cphRep: asset.cphRep || '',
    verifiedBy: asset.verifiedBy || user?.name || '',
    accepted: asset.accepted || 'Pending',
  });
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
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        estimatedValue: form.estimatedValue === '' ? null : Number(form.estimatedValue),
        tempCustodian: form.tempCustodian.trim() || 'Handover Committee',
        finalCustodian: form.finalCustodian.trim() || 'To be assigned',
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
      {/* Value & Classification */}
      <SectionHead icon={<IconBanknote size={15} />}>Value &amp; Classification</SectionHead>
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
          {saving ? 'Saving…' : 'Save value & custody'}
        </Btn>
      </div>
    </div>
  );
}
