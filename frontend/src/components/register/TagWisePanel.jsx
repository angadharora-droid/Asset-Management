import { useRef, useState } from 'react';
import { updateAsset } from '../../api/assetApi.js';
import { compressImage } from '../../utils/image.js';
import { useToast } from '../../context/ToastContext.jsx';
import { rangeCode } from '../../utils/asset.js';
import { Btn } from '../ui.jsx';
import { IconPen, IconCamera, IconTag } from '../Icon.jsx';

const MAX_PHOTOS = 24; // mirror of the server-side limit

// Normalise to the array shape regardless of legacy {label: url} photo objects,
// so we never drop existing photos when appending a new one.
function normalizePhotos(asset) {
  return Array.isArray(asset.photos)
    ? asset.photos.filter((p) => p?.dataUrl).map((p) => ({ dataUrl: p.dataUrl, caption: p.caption || '' }))
    : Object.entries(asset.photos || {})
        .filter(([, v]) => v)
        .map(([k, v]) => ({ dataUrl: v, caption: k }));
}

// Lets the user act on a single tag (unit) within an asset: change just that
// unit's status/condition (via the status update flow) or attach a photo
// captioned with the tag's code.
export default function TagWisePanel({ asset, onEditTag, onChanged }) {
  const showToast = useToast();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const lo = asset.seqStart || 1;
  const hi = asset.seqEnd || lo;
  const isBlock = hi > lo;
  const [unit, setUnit] = useState(lo);

  const clampedUnit = Math.max(lo, Math.min(Math.floor(Number(unit) || lo), hi));
  const tagCode = rangeCode(asset, clampedUnit, clampedUnit);
  const photoCount = normalizePhotos(asset).length;

  async function handleFiles(e) {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error');
      return;
    }
    if (photoCount >= MAX_PHOTOS) {
      showToast(`Photo limit reached (max ${MAX_PHOTOS})`, 'error');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await compressImage(file, 1000, 0.7);
      const photos = [...normalizePhotos(asset), { dataUrl, caption: tagCode }];
      await updateAsset(asset.code, { photos });
      showToast(`Photo added for ${tagCode}`, 'success');
      onChanged?.();
    } catch (err) {
      showToast(err.message || 'Could not add photo', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-line rounded-xl p-3.5 bg-cream/40 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <IconTag size={14} className="text-gold" />
        <span className="text-2xs font-bold uppercase tracking-[0.12em] text-gold">Tag-wise update</span>
      </div>
      <p className="text-[12px] text-muted mb-3">
        {isBlock
          ? 'Pick a single tag to edit its details (serial no., remarks…) or attach a photo for it.'
          : 'Edit this tag’s details (serial no., remarks…) or attach a photo for it.'}
      </p>

      {isBlock && (
        <div className="flex items-end gap-2 mb-3">
          <div className="flex-none">
            <label htmlFor="tagwise-unit" className="block text-[11px] font-semibold text-navy mb-1">
              Tag no. <span className="text-muted font-normal tnum">({lo}–{hi})</span>
            </label>
            <input
              id="tagwise-unit"
              type="number"
              min={lo}
              max={hi}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              onBlur={() => setUnit(clampedUnit)}
              className="w-24 px-2.5 py-2 border-[1.5px] border-line rounded-lg text-[14px] tnum bg-white
                         focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold-light/60"
              aria-label="Tag number to target"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-muted mb-1">Targeting</div>
            <div className="font-mono text-[13px] text-navy tnum bg-white border border-line rounded-lg px-2.5 py-2 truncate">
              {tagCode}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Btn sm variant="primary" icon={<IconPen size={14} />} onClick={() => onEditTag(isBlock ? clampedUnit : null)}>
          Edit details
        </Btn>
        <Btn sm variant="ghost" icon={<IconCamera size={14} />} loading={busy} onClick={() => fileRef.current?.click()}>
          {busy ? 'Adding…' : 'Add photo'}
        </Btn>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFiles} />
      </div>
    </div>
  );
}
