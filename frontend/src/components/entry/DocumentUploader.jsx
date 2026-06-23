import { useRef, useState } from 'react';
import { compressImage } from '../../utils/image.js';
import { useToast } from '../../context/ToastContext.jsx';
import { IconFile, IconImage, IconClose, IconPlus, IconCamera } from '../Icon.jsx';
import { selectCls } from '../ui.jsx';
import CameraCapture from './CameraCapture.jsx';

export const DOC_TYPES = ['Invoice / Bill', 'Warranty', 'AMC', 'Manual / Datasheet', 'Other'];
const MAX_PDF_MB = 5;

// Rough byte size of a base64 data URL, for the file-size label on scans.
function dataUrlSize(dataUrl = '') {
  const i = dataUrl.indexOf(',');
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.round((b64.length * 3) / 4);
}

function guessType(name = '') {
  const n = name.toLowerCase();
  if (n.includes('warrant')) return 'Warranty';
  if (n.includes('amc')) return 'AMC';
  if (n.includes('manual') || n.includes('datasheet') || n.includes('spec')) return 'Manual / Datasheet';
  if (n.includes('invoice') || n.includes('bill') || n.includes('receipt')) return 'Invoice / Bill';
  return 'Invoice / Bill';
}

function readAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function fmtSize(bytes) {
  if (!bytes) return '';
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

// Attach bills/invoices, warranty cards, AMC contracts and manuals (image or PDF).
export default function DocumentUploader({ value = [], onChange }) {
  const inputRef = useRef(null);
  const showToast = useToast();
  const [busy, setBusy] = useState(false);
  const [camOpen, setCamOpen] = useState(false);

  // Camera shots come back as compressed JPEG data URLs — wrap each as an
  // image document so scanned bills/warranties sit alongside uploaded files.
  function appendScans(urls) {
    if (!urls.length) return;
    const added = urls.map((dataUrl, k) => ({
      name: `Scan ${value.length + k + 1}.jpg`,
      type: 'Invoice / Bill',
      mime: 'image/jpeg',
      size: dataUrlSize(dataUrl),
      dataUrl,
    }));
    onChange([...value, ...added]);
    showToast(`${added.length} scan${added.length > 1 ? 's' : ''} added`, 'success');
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      const added = [];
      for (const f of files) {
        const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
        const isImg = f.type.startsWith('image/');
        if (!isPdf && !isImg) {
          showToast(`Skipped ${f.name}: only images or PDF`, 'error');
          continue;
        }
        if (isPdf && f.size > MAX_PDF_MB * 1024 * 1024) {
          showToast(`${f.name} is over ${MAX_PDF_MB} MB`, 'error');
          continue;
        }
        const dataUrl = isImg ? await compressImage(f, 1600, 0.72) : await readAsDataUrl(f);
        added.push({
          name: f.name,
          type: guessType(f.name),
          mime: isPdf ? 'application/pdf' : 'image/jpeg',
          size: f.size,
          dataUrl,
        });
      }
      if (added.length) {
        onChange([...value, ...added]);
        showToast(`${added.length} document${added.length > 1 ? 's' : ''} added`, 'success');
      }
    } catch {
      showToast('Could not read a file', 'error');
    } finally {
      setBusy(false);
    }
  }

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  const setType = (i, t) => onChange(value.map((d, idx) => (idx === i ? { ...d, type: t } : d)));

  return (
    <div>
      {value.length > 0 && (
        <div className="space-y-2 mb-2.5">
          {value.map((d, i) => {
            const isPdf = d.mime === 'application/pdf';
            return (
              <div key={i} className="flex items-center gap-2.5 bg-cream/60 border border-line rounded-lg p-2 animate-fade-in">
                <span className={`w-9 h-9 rounded-md flex items-center justify-center flex-none ${isPdf ? 'bg-damaged-bg text-damaged' : 'bg-navy/8 text-navy'}`}>
                  {isPdf ? <IconFile size={17} /> : <IconImage size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={d.dataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[13px] font-semibold text-navy truncate hover:underline"
                    title={`Open ${d.name}`}
                  >
                    {d.name || 'Document'}
                  </a>
                  <div className="text-[11px] text-muted">
                    {isPdf ? 'PDF' : 'Image'}
                    {d.size ? ` · ${fmtSize(d.size)}` : ''}
                  </div>
                </div>
                <select
                  value={d.type}
                  onChange={(e) => setType(i, e.target.value)}
                  aria-label={`Type of ${d.name}`}
                  className={`${selectCls} !w-auto !py-1.5 !text-[12px] max-w-[130px] flex-none`}
                >
                  {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove ${d.name}`}
                  className="flex-none w-7 h-7 rounded-full text-muted hover:bg-damaged-bg hover:text-damaged flex items-center justify-center
                             transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
                >
                  <IconClose size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-[11.5px] text-muted mb-2">Photograph a bill, warranty or AMC — or upload an image / PDF.</div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setCamOpen(true)}
          disabled={busy}
          className="rounded-lg border-[1.5px] border-dashed border-line bg-cream/60 text-navy hover:border-gold hover:bg-cream
                     transition-colors py-3 flex items-center justify-center gap-2 text-[13px] font-semibold
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light disabled:opacity-50"
        >
          <IconCamera size={18} /> Scan
        </button>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-lg border-[1.5px] border-dashed border-line bg-cream/60 text-navy hover:border-gold hover:bg-cream
                     transition-colors py-3 flex items-center justify-center gap-2 text-[13px] font-semibold
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light disabled:opacity-50"
        >
          <IconPlus size={17} /> {busy ? 'Adding…' : 'Upload file'}
        </button>
      </div>

      <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleFiles} />

      {camOpen && <CameraCapture onCapture={appendScans} onClose={() => setCamOpen(false)} />}
    </div>
  );
}
