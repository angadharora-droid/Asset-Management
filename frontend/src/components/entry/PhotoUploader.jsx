import { useRef, useState } from 'react';
import { compressImage } from '../../utils/image.js';
import { useToast } from '../../context/ToastContext.jsx';
import { IconCamera, IconClose, IconPlus } from '../Icon.jsx';

// Suggested photo names — auto-assigned in order as photos are added, offered
// as dropdown suggestions, and fully editable (type any custom name).
export const PHOTO_LABELS = [
  'Front',
  'In-Location',
  'Serial / Model Plate',
  'Damage',
  'Interior',
  'Rear',
  'Accessories',
  'Other',
];

const cellInputCls =
  'w-full text-[11.5px] font-semibold text-navy bg-white px-2 py-1.5 border-0 border-t border-line ' +
  'placeholder:text-muted/70 placeholder:font-normal focus:outline-none focus:bg-cream/50 ' +
  'focus-visible:ring-2 focus-visible:ring-gold-light focus-visible:ring-inset';

export default function PhotoUploader({ value = [], onChange, requireOne = false }) {
  const inputRef = useRef(null);
  const showToast = useToast();
  const [busy, setBusy] = useState(false);
  const missing = requireOne && value.length === 0;

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      const added = [];
      for (const f of files) {
        if (!f.type.startsWith('image/')) continue;
        const idx = value.length + added.length;
        added.push({
          dataUrl: await compressImage(f, 1000, 0.7),
          caption: PHOTO_LABELS[idx] || '',
        });
      }
      if (added.length) {
        onChange([...value, ...added]);
        showToast(`${added.length} photo${added.length > 1 ? 's' : ''} added`, 'success');
      }
    } catch {
      showToast('Could not process an image', 'error');
    } finally {
      setBusy(false);
    }
  }

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  const setCaption = (i, caption) =>
    onChange(value.map((p, idx) => (idx === i ? { ...p, caption } : p)));

  return (
    <div>
      {/* shared suggestion list for every photo name field */}
      <datalist id="photo-name-options">
        {PHOTO_LABELS.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-2.5">
          {value.map((p, i) => (
            <div key={i} className="rounded-lg border border-line overflow-hidden bg-white animate-scale-in">
              <div className="relative aspect-[4/3]">
                <img src={p.dataUrl} alt={p.caption || `Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-navy-deep/80 text-white flex items-center justify-center
                             hover:bg-damaged transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
                >
                  <IconClose size={13} />
                </button>
              </div>
              <input
                type="text"
                list="photo-name-options"
                value={p.caption || ''}
                onChange={(e) => setCaption(i, e.target.value)}
                placeholder="Name this photo…"
                aria-label={`Name for photo ${i + 1}`}
                className={cellInputCls}
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={[
          'w-full rounded-lg border-[1.5px] border-dashed py-3 flex items-center justify-center gap-2 text-[13px] font-semibold transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light',
          missing
            ? 'border-damaged bg-damaged-bg text-damaged'
            : 'border-line bg-cream/60 text-navy hover:border-gold hover:bg-cream',
        ].join(' ')}
      >
        {value.length ? <IconPlus size={17} /> : <IconCamera size={18} />}
        {busy ? 'Adding…' : value.length ? 'Add more photos' : 'Add photo'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      {missing && (
        <div className="text-[12px] text-damaged mt-2">
          At least one photo is required because the condition is Damaged.
        </div>
      )}
    </div>
  );
}
