import { useEffect, useMemo, useState } from 'react';
import { createAsset, getNextCode } from '../../api/assetApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  CATEGORIES,
  DEPARTMENTS,
  UOM_OPTIONS,
  STATUS_OPTIONS,
  CONDITION_OPTIONS,
  itemsForCategory,
} from '../../constants/categories.js';
import { fmtDateTime } from '../../utils/format.js';
import { codeLabel, blockCount } from '../../utils/asset.js';
import {
  Card, SectionHead, Label, Btn, Banner, ChipGroup,
  inputCls, selectCls, statusVariant, conditionVariant,
} from '../ui.jsx';
import { IconMapPin, IconBox, IconCheckCircle, IconCamera, IconCheck, IconFile, IconPrinter } from '../Icon.jsx';
import Tag from '../Tag.jsx';
import PageHeader from '../layout/PageHeader.jsx';
import PhotoUploader from './PhotoUploader.jsx';
import DocumentUploader from './DocumentUploader.jsx';
import ConditionSplit from './ConditionSplit.jsx';
import LabelSheet from '../labels/LabelSheet.jsx';

const EMPTY = {
  floor: '', department: '', location: '',
  categoryCode: '', itemCode: '', name: '',
  brand: '', model: '', serial: '', size: '', qty: 1, uom: 'Nos',
  status: 'Found', condition: 'Good', expectedLocation: '',
  functionalityChecked: 'Not Applicable', remarks: '',
};

export default function EntryForm({ onSaved }) {
  const showToast = useToast();
  const [form, setForm] = useState(() => ({ ...EMPTY }));
  const [photos, setPhotos] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [split, setSplit] = useState(false);
  const [breakdown, setBreakdown] = useState([
    { qty: 1, status: 'Found', condition: 'Good', functionalityChecked: 'Not Applicable', remarks: '' },
  ]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [lastSaved, setLastSaved] = useState('');
  const [savedAsset, setSavedAsset] = useState(null);
  const [printAsset, setPrintAsset] = useState(null);

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const bind = (name) => ({ value: form[name], onChange: (e) => setField(name, e.target.value) });

  const itemOptions = useMemo(() => itemsForCategory(form.categoryCode), [form.categoryCode]);
  const itemCodeValid = /^[A-Z]{3}$/.test(form.itemCode);
  const isDamaged = form.condition === 'Damaged';
  const isMissing = form.status === 'Missing';
  const photoCount = photos.length;
  const tagCount = blockCount(form.qty, form.uom);
  const previewLabel = preview ? codeLabel(preview) : '';
  const splitting = split && tagCount > 1;
  const anyDamaged = splitting ? breakdown.some((b) => b.condition === 'Damaged') : isDamaged;
  const anyMissing = splitting ? breakdown.some((b) => b.status === 'Missing') : isMissing;

  useEffect(() => {
    let active = true;
    if (form.categoryCode && itemCodeValid) {
      const count = blockCount(form.qty, form.uom);
      getNextCode(form.categoryCode, form.itemCode, count)
        .then((res) => active && setPreview({ code: res.code, codeEnd: res.codeEnd }))
        .catch(() => active && setPreview(null));
    } else {
      setPreview(null);
    }
    return () => {
      active = false;
    };
  }, [form.categoryCode, form.itemCode, itemCodeValid, form.qty, form.uom]);

  function onItemCode(e) {
    setField('itemCode', e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.categoryCode) return setError('Please select an Asset Category.');
    if (!itemCodeValid) return setError('Item Type Code must be exactly 3 letters (e.g. CHR).');
    if (!form.name.trim()) return setError('Asset Name / Description is required.');
    if (!form.department) return setError('Department / Area is required.');
    if (!form.location.trim()) return setError('Exact Location / Room No. is required.');
    if (anyMissing && !form.expectedLocation.trim())
      return setError('Expected Location is required when any unit is Missing.');
    if (splitting) {
      const sum = breakdown.reduce((s, b) => s + Math.max(0, Math.floor(Number(b.qty) || 0)), 0);
      if (sum !== tagCount)
        return setError(`The breakdown (${sum}) must add up to the quantity (${tagCount}).`);
      if (breakdown.some((b) => b.condition === 'Damaged' && !String(b.remarks || '').trim()))
        return setError('Add remarks for each Damaged group.');
    } else if (isDamaged && !form.remarks.trim()) {
      return setError('Remarks are required when condition is Damaged.');
    }
    if (anyDamaged && photos.length === 0)
      return setError('At least one photo is required when any unit is Damaged.');

    setSaving(true);
    try {
      const payload = {
        ...form,
        itemCode: form.itemCode.toUpperCase(),
        qty: Number(form.qty) || 1,
        photos,
        documents,
      };
      if (splitting) {
        payload.breakdown = breakdown
          .map((b) => ({
            qty: Math.max(0, Math.floor(Number(b.qty) || 0)),
            status: b.status,
            condition: b.condition,
            functionalityChecked: b.functionalityChecked,
            remarks: b.remarks || '',
          }))
          .filter((b) => b.qty > 0);
      }
      const saved = await createAsset(payload);
      showToast('Saved as ' + saved.code, 'success');
      setLastSaved(`Last saved ${saved.code} · ${fmtDateTime(saved.createdAt)}`);
      setSavedAsset(saved);
      setForm({ ...EMPTY, department: form.department, floor: form.floor });
      setPhotos([]);
      setDocuments([]);
      setSplit(false);
      setBreakdown([{ qty: 1, status: 'Found', condition: 'Good', functionalityChecked: 'Not Applicable', remarks: '' }]);
      setPreview(null);
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not save this entry. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const submitBtn = (
    <Btn type="submit" variant="primary" block loading={saving} icon={!saving && <IconCheck size={17} />}>
      {saving ? 'Saving…' : 'Save Entry & Generate Code'}
    </Btn>
  );

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        eyebrow="Stage 1 of 2 · Physical Capture"
        title="Log a New Asset"
        subtitle="Record where it is, what it is, its condition and photos. Value, accounting class and custody are added later from the Register."
      />

      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8 lg:items-start">
        {/* MAIN COLUMN */}
        <div>
          {/* 1 — Where */}
          <Card>
            <SectionHead icon={<IconMapPin size={15} />}>Where</SectionHead>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label htmlFor="f-floor">Floor / Block</Label>
                <input id="f-floor" className={inputCls} placeholder="e.g. 2nd Floor" {...bind('floor')} />
              </div>
              <div>
                <Label htmlFor="f-dept" required>Department / Area</Label>
                <select id="f-dept" className={selectCls} {...bind('department')}>
                  <option value="">Select…</option>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <Label htmlFor="f-loc" required>Exact Location / Room No. / Outlet</Label>
            <input id="f-loc" className={inputCls} placeholder="e.g. Room 101, or Main Kitchen" {...bind('location')} />
          </Card>

          {/* 2 — What is it */}
          <Card>
            <SectionHead icon={<IconBox size={15} />}>What is it</SectionHead>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label htmlFor="f-cat" required>Asset Category</Label>
                <select id="f-cat" className={selectCls} {...bind('categoryCode')}>
                  <option value="">Select…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="f-item">
                  Item Type Code <span className="text-damaged" aria-hidden="true">*</span>
                  <span className="block font-normal text-muted text-[11.5px] mt-px">3 letters, e.g. CHR, TBL</span>
                </Label>
                <input
                  id="f-item"
                  className={`${inputCls} uppercase tracking-wide font-mono`}
                  list="item-suggestions"
                  maxLength={3}
                  placeholder="CHR"
                  value={form.itemCode}
                  onChange={onItemCode}
                />
                <datalist id="item-suggestions">
                  {itemOptions.map((it) => <option key={it.value} value={it.value}>{it.label}</option>)}
                </datalist>
              </div>
            </div>

            {/* inline brass preview (mobile only — desktop shows it in the rail) */}
            {preview && (
              <div className="lg:hidden mt-3 animate-scale-in">
                <Tag
                  code={previewLabel}
                  label={tagCount > 1 ? `${tagCount} tags · next available block` : 'Auto-generated code · next available'}
                  size="lg"
                  className="w-full"
                />
              </div>
            )}

            <Label htmlFor="f-name" required>Asset Name / Description</Label>
            <input id="f-name" className={inputCls} placeholder="e.g. Banquet Chair, Gold Velvet" {...bind('name')} />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div><Label>Brand / Make</Label><input className={inputCls} {...bind('brand')} /></div>
              <div><Label>Model</Label><input className={inputCls} {...bind('model')} /></div>
              <div><Label>Serial No.</Label><input className={inputCls} {...bind('serial')} /></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div><Label>Size / Capacity</Label><input className={inputCls} {...bind('size')} /></div>
              <div>
                <Label>Quantity</Label>
                <input type="number" inputMode="numeric" min="1" className={`${inputCls} tnum`} {...bind('qty')} />
              </div>
              <div>
                <Label>Unit</Label>
                <select className={selectCls} {...bind('uom')}>
                  {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </Card>

          {/* 3 — Condition & Verification */}
          <Card>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <SectionHead icon={<IconCheckCircle size={15} />}>Condition &amp; Verification</SectionHead>
              {tagCount > 1 && (
                <label className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-navy cursor-pointer select-none mb-3.5">
                  <input
                    type="checkbox"
                    checked={split}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setSplit(on);
                      if (on)
                        setBreakdown([
                          { qty: tagCount, status: 'Found', condition: 'Good', functionalityChecked: 'Not Applicable', remarks: '' },
                        ]);
                    }}
                    className="w-4 h-4 accent-gold"
                  />
                  Split {tagCount} units into groups
                </label>
              )}
            </div>

            {splitting ? (
              <>
                <ConditionSplit total={tagCount} value={breakdown} onChange={setBreakdown} preview={preview} />
                {anyMissing && (
                  <div className="border-l-[3px] border-pending bg-pending-bg px-3 py-2.5 rounded-r-lg mt-3 animate-fade-in">
                    <Label required className="!mt-0">Expected Location</Label>
                    <input className={inputCls} placeholder="Where were the missing units expected?" {...bind('expectedLocation')} />
                  </div>
                )}
              </>
            ) : (
              <>
                <Label required className="!mt-0">Physical Status</Label>
                <ChipGroup
                  options={STATUS_OPTIONS}
                  value={form.status}
                  onChange={(v) => setField('status', v)}
                  getVariant={statusVariant}
                  ariaLabel="Physical status"
                />

                <div className="mt-3.5">
                  <Label required>Asset Condition</Label>
                  <ChipGroup
                    options={CONDITION_OPTIONS}
                    value={form.condition}
                    onChange={(v) => setField('condition', v)}
                    getVariant={conditionVariant}
                    ariaLabel="Asset condition"
                  />
                </div>

                {isMissing && (
                  <div className="border-l-[3px] border-pending bg-pending-bg px-3 py-2.5 rounded-r-lg mt-3.5 animate-fade-in">
                    <Label required className="!mt-0">Expected Location</Label>
                    <input className={inputCls} placeholder="Where was this expected to be found?" {...bind('expectedLocation')} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 mt-1">
                  <div>
                    <Label>Functionality Checked?</Label>
                    <select className={selectCls} {...bind('functionalityChecked')}>
                      <option>Not Applicable</option><option>Yes</option><option>No</option>
                    </select>
                  </div>
                  <div />
                </div>

                <Label required={isDamaged}>Remarks / Observation</Label>
                <textarea className={inputCls} placeholder="Any notes about condition, access issues, etc." {...bind('remarks')} />
              </>
            )}
          </Card>

          {/* 4 — Photos */}
          <Card>
            <SectionHead icon={<IconCamera size={15} />}>Photos</SectionHead>
            <p className="text-[12.5px] text-muted -mt-1.5 mb-3">
              Add as many as you need — front, in-location, serial plate, damage close-ups.
            </p>
            <PhotoUploader value={photos} onChange={setPhotos} requireOne={anyDamaged} />
          </Card>

          {/* 5 — Documents */}
          <Card>
            <SectionHead icon={<IconFile size={15} />}>Documents</SectionHead>
            <p className="text-[12.5px] text-muted -mt-1.5 mb-3">
              Bills / invoices, warranty cards, AMC contracts, manuals — image or PDF.
            </p>
            <DocumentUploader value={documents} onChange={setDocuments} />
          </Card>

          {error && <Banner tone="error" role="alert">{error}</Banner>}

          {/* mobile floating submit */}
          <div className="lg:hidden sticky bottom-0 -mx-4 px-4 pt-4 pb-3 bg-gradient-to-t from-cream via-cream/95 to-transparent">
            {submitBtn}
            {lastSaved && <div className="text-[11.5px] text-muted text-center pt-2 tnum">{lastSaved}</div>}
            {savedAsset && (
              <Btn variant="ghost" sm block icon={<IconPrinter size={14} />} onClick={() => setPrintAsset(savedAsset)} className="mt-2">
                Print barcode tags
              </Btn>
            )}
          </div>
        </div>

        {/* DESKTOP RAIL */}
        <aside className="hidden lg:block sticky top-8 space-y-4">
          <div className="bg-paper border border-line rounded-xl p-4 shadow-card">
            <div className="text-2xs font-bold uppercase tracking-[0.14em] text-gold mb-3">
              {tagCount > 1 ? `Asset Tags · ${tagCount}` : 'Asset Tag'}
            </div>
            {preview ? (
              <Tag
                code={previewLabel}
                label={tagCount > 1 ? 'Next available block' : 'Next available'}
                size="lg"
                className="w-full animate-scale-in"
              />
            ) : (
              <div className="rounded-xl border border-dashed border-line bg-cream/60 px-4 py-6 text-center text-[12.5px] text-muted">
                Choose a category &amp; 3-letter item code to generate the tag.
              </div>
            )}
            {tagCount > 1 && (
              <div className="mt-2.5 text-[12px] text-pending font-medium">
                {tagCount} sequential tags — one per {form.uom.toLowerCase()}.
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-line space-y-1.5 text-[12px] text-muted">
              <div className="flex items-center justify-between">
                <span>Photos</span>
                <span className="font-mono font-semibold text-navy tnum">{photoCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Documents</span>
                <span className="font-mono font-semibold text-navy tnum">{documents.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-paper border border-line rounded-xl p-4 shadow-card">
            {submitBtn}
            {lastSaved && <div className="text-[11.5px] text-muted text-center pt-2 tnum">{lastSaved}</div>}
            {savedAsset && (
              <Btn variant="ghost" sm block icon={<IconPrinter size={14} />} onClick={() => setPrintAsset(savedAsset)} className="mt-2">
                Print barcode tags
              </Btn>
            )}
          </div>
        </aside>
      </div>

      {printAsset && <LabelSheet asset={printAsset} onClose={() => setPrintAsset(null)} />}
    </form>
  );
}
