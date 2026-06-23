import { useState } from 'react';
import { deleteAsset } from '../../api/assetApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { fmtDateTime, inr } from '../../utils/format.js';
import { needsDetails, codeLabel, assetSegments, rangeCode } from '../../utils/asset.js';
import { Badge, Btn, Banner, statusVariant, conditionVariant } from '../ui.jsx';
import { IconPen, IconTrash, IconFile, IconImage, IconPrinter } from '../Icon.jsx';
import Tag from '../Tag.jsx';
import Modal from '../Modal.jsx';
import EditDetailsForm from './EditDetailsForm.jsx';
import TagWisePanel from './TagWisePanel.jsx';
import TagDetailsForm from './TagDetailsForm.jsx';
import LabelSheet from '../labels/LabelSheet.jsx';

const acceptedBadge = (a) =>
  a === 'Yes' ? 'good' : a === 'No' ? 'damaged' : a === 'Conditional' ? 'pending' : 'neutral';

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-line/70 text-[13px]">
      <span className="text-muted flex-none">{k}</span>
      <span className="font-semibold text-right break-words">{v || '—'}</span>
    </div>
  );
}

export default function DetailModal({ asset, onClose, onChanged }) {
  const showToast = useToast();
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [printing, setPrinting] = useState(false);
  // null = closed; otherwise { unit } where unit is a tag number (or null for
  // the whole single-unit asset).
  const [tagUpdate, setTagUpdate] = useState(null);

  if (!asset) return null;

  // Support both the new array shape and any legacy {front,location,…} objects.
  const photos = Array.isArray(asset.photos)
    ? asset.photos.filter((p) => p?.dataUrl)
    : Object.entries(asset.photos || {})
        .filter(([, v]) => v)
        .map(([k, v]) => ({ dataUrl: v, caption: k }));
  const documents = asset.documents || [];
  const segments = assetSegments(asset);
  const hasBreakdown = Array.isArray(asset.segments) && asset.segments.length > 1;

  // Per-tag serials: show the shared value when uniform, else point to the tags.
  const segSerials = segments.map((s) => s.serial || '');
  const nonEmptySerials = segSerials.filter(Boolean);
  const serialDisplay =
    nonEmptySerials.length === 0
      ? asset.serial
      : new Set(segSerials).size === 1
      ? segSerials[0]
      : 'Multiple — see tags';

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAsset(asset.code);
      showToast('Deleted ' + asset.code, 'success');
      onChanged?.();
      onClose();
    } catch (err) {
      showToast(err.message || 'Could not delete', 'error');
    } finally {
      setDeleting(false);
    }
  }

  const header = (
    <>
      <Tag code={codeLabel(asset)} size="sm" />
      <div className="text-ink text-[14px] font-semibold mt-2 truncate">{asset.name}</div>
    </>
  );

  const footer = editing ? null : (
    <Btn variant="gold" block icon={<IconPen size={16} />} onClick={() => setEditing(true)}>
      {needsDetails(asset) ? 'Add value & custody' : 'Edit value & custody'}
    </Btn>
  );

  return (
    <Modal onClose={onClose} ariaLabel={`Asset ${asset.code}`} header={header} footer={footer}>
      <div className="flex gap-2 mb-3 flex-wrap">
        <Badge variant={statusVariant(asset.status)} dot>{asset.status}</Badge>
        <Badge variant={conditionVariant(asset.condition)} dot>{asset.condition}</Badge>
      </div>

      {editing ? (
        <EditDetailsForm
          asset={asset}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged?.();
          }}
        />
      ) : (
        <>
          <Btn variant="ghost" sm icon={<IconPrinter size={14} />} onClick={() => setPrinting(true)} className="mb-3">
            Print barcode tags
          </Btn>

          <TagWisePanel asset={asset} onEditTag={(unit) => setTagUpdate({ unit })} onChanged={onChanged} />

          {needsDetails(asset) && (
            <Banner tone="info" className="!mb-3">
              Value &amp; custody not entered yet — use the button below to complete it.
            </Banner>
          )}

          <Row k="Category" v={asset.category} />
          <Row
            k="Location"
            v={`${asset.department} · ${asset.location}${asset.floor ? ' (' + asset.floor + ')' : ''}`}
          />
          <Row k="Brand / Model" v={[asset.brand, asset.model].filter(Boolean).join(' ')} />
          <Row k="Serial No." v={serialDisplay} />
          <Row k="Qty" v={`${asset.qty} ${asset.uom}`} />
          <Row k="Functionality Checked" v={asset.functionalityChecked} />

          {hasBreakdown && (
            <div className="mt-3">
              <div className="text-2xs font-bold uppercase tracking-[0.12em] text-gold mb-2">Condition breakdown</div>
              <div className="space-y-1.5">
                {segments.map((s, i) => (
                  <div key={i} className="bg-cream/60 border border-line rounded-lg px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-mono text-[12.5px] text-navy tnum">{rangeCode(asset, s.from, s.to)}</span>
                      <span className="text-[11.5px] text-muted tnum">{s.to - s.from + 1} unit(s)</span>
                      <div className="flex gap-1.5 flex-wrap">
                        <Badge variant={statusVariant(s.status)} dot>{s.status}</Badge>
                        <Badge variant={conditionVariant(s.condition)} dot>{s.condition}</Badge>
                        <Badge variant={acceptedBadge(s.accepted)} dot>
                          {s.accepted === 'Yes' ? 'Accepted' : s.accepted === 'Pending' ? 'Accept: Pending' : s.accepted}
                        </Badge>
                      </div>
                    </div>
                    {s.serial ? (
                      <div className="text-[11.5px] text-navy mt-1">
                        Serial: <span className="font-mono tnum">{s.serial}</span>
                      </div>
                    ) : null}
                    {(s.functionalityChecked && s.functionalityChecked !== 'Not Applicable') || s.remarks ? (
                      <div className="text-[11.5px] text-muted mt-1">
                        {s.functionalityChecked && s.functionalityChecked !== 'Not Applicable'
                          ? `Functionality: ${s.functionalityChecked}`
                          : ''}
                        {s.remarks ? `${s.functionalityChecked && s.functionalityChecked !== 'Not Applicable' ? ' · ' : ''}${s.remarks}` : ''}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {asset.status === 'Missing' && <Row k="Expected Location" v={asset.expectedLocation} />}

          <Row k="Est. Value" v={inr(asset.estimatedValue)} />
          <Row k="Value Source" v={asset.valueSource} />
          <Row k="Classification" v={asset.classification} />
          <Row k="Temp. Custodian" v={asset.tempCustodian} />
          <Row k="Final Custodian" v={asset.finalCustodian} />
          <Row k="Verified By" v={asset.verifiedBy} />
          <Row k="Hariganga Rep." v={asset.hgaRep} />
          <Row k="CPH Rep." v={asset.cphRep} />
          <Row k="Accepted" v={asset.accepted} />
          <Row k="Logged" v={fmtDateTime(asset.createdAt)} />
          {asset.remarks && <Row k="Remarks" v={asset.remarks} />}

          {photos.length > 0 && (
            <div className="mt-4">
              <div className="text-2xs font-bold uppercase tracking-[0.12em] text-gold mb-2">
                Photos · {photos.length}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="rounded-lg border border-line overflow-hidden bg-white">
                    <a href={p.dataUrl} target="_blank" rel="noreferrer" title={p.caption || 'Open photo'} className="block">
                      <img
                        src={p.dataUrl}
                        alt={p.caption || `Photo ${i + 1} of ${asset.name}`}
                        className="w-full h-24 object-cover hover:opacity-90 transition-opacity"
                      />
                    </a>
                    {p.caption && (
                      <div className="text-[10.5px] font-semibold text-navy px-2 py-1 truncate border-t border-line">
                        {p.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {documents.length > 0 && (
            <div className="mt-4">
              <div className="text-2xs font-bold uppercase tracking-[0.12em] text-gold mb-2">
                Documents · {documents.length}
              </div>
              <div className="space-y-2">
                {documents.map((d, i) => {
                  const isPdf = d.mime === 'application/pdf';
                  return (
                    <a
                      key={i}
                      href={d.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 bg-cream/60 border border-line rounded-lg p-2 hover:border-gold transition-colors"
                    >
                      <span className={`w-9 h-9 rounded-md flex items-center justify-center flex-none ${isPdf ? 'bg-damaged-bg text-damaged' : 'bg-navy/8 text-navy'}`}>
                        {isPdf ? <IconFile size={17} /> : <IconImage size={17} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-navy truncate">{d.name || 'Document'}</div>
                        <div className="text-[11px] text-muted">{d.type}</div>
                      </div>
                      <span className="text-[11.5px] text-gold font-semibold flex-none">View</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {photos.length === 0 && documents.length === 0 && (
            <div className="text-muted text-[12.5px] mt-3">No photos or documents attached.</div>
          )}

          {isAdmin && (
          <div className="mt-5 pt-4 border-t border-line">
            {confirming ? (
              <div className="flex items-center gap-2 bg-damaged-bg rounded-lg p-2">
                <span className="text-[13px] text-damaged flex-1 font-medium px-1">Delete permanently?</span>
                <Btn variant="ghost" sm onClick={() => setConfirming(false)} disabled={deleting}>
                  Cancel
                </Btn>
                <Btn variant="danger" sm loading={deleting} onClick={handleDelete}>
                  Delete
                </Btn>
              </div>
            ) : (
              <Btn variant="subtle" sm icon={<IconTrash size={15} />} onClick={() => setConfirming(true)}>
                Delete entry
              </Btn>
            )}
          </div>
          )}
        </>
      )}

      {printing && <LabelSheet asset={asset} onClose={() => setPrinting(false)} />}

      {tagUpdate && (
        <TagDetailsForm
          asset={asset}
          unit={tagUpdate.unit}
          onClose={() => setTagUpdate(null)}
          onSaved={() => onChanged?.()}
        />
      )}
    </Modal>
  );
}
