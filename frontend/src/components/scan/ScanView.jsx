import { useEffect, useState } from 'react';
import { getPublicAsset } from '../../api/assetApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { codeLabel, rangeCode } from '../../utils/asset.js';
import { fmtDateTime } from '../../utils/format.js';
import { Badge, Btn, Banner, Skeleton, statusVariant, conditionVariant } from '../ui.jsx';
import { IconLock, IconChevronRight } from '../Icon.jsx';
import Tag from '../Tag.jsx';

function Row({ k, v }) {
  if (!v && v !== 0) return null;
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-line/70 text-[13px]">
      <span className="text-muted flex-none">{k}</span>
      <span className="font-semibold text-right break-words">{v}</span>
    </div>
  );
}

export default function ScanView({ scanId, unit }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getPublicAsset(scanId, unit)
      .then((d) => active && (setData(d), setLoading(false)))
      .catch((e) => active && (setError(e.message || 'Tag not found.'), setLoading(false)));
    return () => {
      active = false;
    };
  }, [scanId, unit]);

  const goToApp = () => {
    window.location.hash = '';
  };

  const asset = data?.asset;
  const seg = data?.segment;
  const status = seg?.status || asset?.status;
  const condition = seg?.condition || asset?.condition;
  const photos = Array.isArray(asset?.photos) ? asset.photos.filter((p) => p?.dataUrl) : [];
  const displayCode = asset
    ? data?.unit != null
      ? rangeCode(asset, data.unit, data.unit)
      : codeLabel(asset)
    : '';

  return (
    <div className="min-h-dvh paper-bg">
      {/* Header */}
      <div className="ink-panel text-white px-5 py-3.5">
        <div className="max-w-[560px] mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="gold-rule !w-5" />
              <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-gold-light">
                Centre Point Hospitality
              </span>
            </div>
            <div className="font-serif text-[16px] leading-tight mt-0.5">Asset Tag</div>
          </div>
          <Btn variant="ghost" sm onClick={goToApp} className="!bg-white/10 !text-white !border-white/20">
            {user ? 'Open register' : 'Sign in'}
          </Btn>
        </div>
      </div>

      <div className="max-w-[560px] mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-48 rounded-lg" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : error ? (
          <Banner tone="error">{error}</Banner>
        ) : asset ? (
          <div className="bg-paper border border-line rounded-2xl shadow-card p-5">
            <Tag code={displayCode} size="lg" className="w-full" />
            <div className="text-ink text-[16px] font-semibold mt-3">{asset.name}</div>

            <div className="flex gap-2 my-3 flex-wrap">
              {status && <Badge variant={statusVariant(status)} dot>{status}</Badge>}
              {condition && <Badge variant={conditionVariant(condition)} dot>{condition}</Badge>}
            </div>

            <Row k="Category" v={asset.category} />
            <Row
              k="Location"
              v={`${asset.department || ''} · ${asset.location || ''}${asset.floor ? ' (' + asset.floor + ')' : ''}`}
            />
            <Row k="Brand / Model" v={[asset.brand, asset.model].filter(Boolean).join(' ')} />
            <Row k="Serial No." v={asset.serial} />
            {data.unit == null && <Row k="Qty" v={`${asset.qty} ${asset.uom}`} />}
            <Row k="Functionality" v={seg?.functionalityChecked || asset.functionalityChecked} />
            {seg?.remarks && <Row k="Remarks" v={seg.remarks} />}
            <Row k="Logged" v={fmtDateTime(asset.createdAt)} />

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {photos.map((p, i) => (
                  <img key={i} src={p.dataUrl} alt={p.caption || ''} className="w-full h-20 object-cover rounded-lg border border-line" />
                ))}
              </div>
            )}

            <div className="mt-5">
              {user ? (
                <Btn variant="gold" block icon={<IconChevronRight size={16} />} onClick={goToApp}>
                  Open in register to update
                </Btn>
              ) : (
                <Banner tone="info" className="!mb-0">
                  <span className="inline-flex items-center gap-1.5">
                    <IconLock size={15} /> This is a read-only view. Sign in to update this asset.
                  </span>
                </Banner>
              )}
            </div>
          </div>
        ) : null}

        <div className="text-center text-2xs text-muted mt-5 uppercase tracking-wider">
          Centre Point Amravati · Asset Handover Register
        </div>
      </div>
    </div>
  );
}
