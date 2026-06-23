import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, STATUS_OPTIONS } from '../../constants/categories.js';
import { fmtDate, fmtDateTime } from '../../utils/format.js';
import { needsDetails, codeLabel } from '../../utils/asset.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Badge, Btn, inputCls, selectCls, statusVariant, conditionVariant, Skeleton, EmptyState,
} from '../ui.jsx';
import {
  IconSearch, IconRefresh, IconDownload, IconClock, IconChevronRight, IconClipboardList, IconPrinter,
} from '../Icon.jsx';
import Tag from '../Tag.jsx';
import PageHeader from '../layout/PageHeader.jsx';
import DetailModal from './DetailModal.jsx';
import LabelSheet from '../labels/LabelSheet.jsx';

const STRIPE = {
  damaged: 'bg-damaged',
  extra: 'bg-extra',
  pending: 'bg-pending',
  good: 'bg-good',
};

export default function Register({ assets, loading, reload }) {
  const showToast = useToast();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openCode, setOpenCode] = useState(null);
  const [printAsset, setPrintAsset] = useState(null);

  useEffect(() => {
    reload?.();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return assets
      .filter((e) => {
        if (catFilter && e.categoryCode !== catFilter) return false;
        if (statusFilter && e.status !== statusFilter) return false;
        if (q) {
          const hay = `${e.code} ${e.name} ${e.location} ${e.department}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .slice()
      .reverse();
  }, [assets, search, catFilter, statusFilter]);

  async function exportExcel() {
    if (!assets.length) {
      showToast('No entries to export yet', 'info');
      return;
    }
    const XLSX = await import('xlsx');
    const rows = assets.map((e) => ({
      Code: codeLabel(e), Category: e.category, 'Asset Name': e.name, Brand: e.brand, Model: e.model,
      'Serial No.': e.serial, Size: e.size, Qty: e.qty, UOM: e.uom, Floor: e.floor,
      Department: e.department, Location: e.location, 'Physical Status': e.status, Condition: e.condition,
      'Functionality Checked': e.functionalityChecked, Remarks: e.remarks,
      'Estimated Value': e.estimatedValue ?? '', 'Value Source': e.valueSource,
      Classification: e.classification, 'Temp Custodian': e.tempCustodian, 'Final Custodian': e.finalCustodian,
      'Verified By': e.verifiedBy, 'Hariganga Rep': e.hgaRep, 'CPH Rep': e.cphRep,
      'Handover Accepted': e.accepted,
      Photos: Array.isArray(e.photos) ? e.photos.length : 0,
      Documents: Array.isArray(e.documents) ? e.documents.length : 0,
      'Logged At': fmtDateTime(e.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Handover Register');
    XLSX.writeFile(wb, `CPA_Asset_Handover_Register_${fmtDate(new Date().toISOString())}.xlsx`);
    showToast('Excel exported', 'success');
  }

  const openAsset = assets.find((a) => a.code === openCode) || null;
  const isFiltering = search || catFilter || statusFilter;

  return (
    <div>
      <PageHeader
        eyebrow="Shared · Live"
        title="Asset Register"
        subtitle="Every logged asset, visible to the whole handover team in real time."
        actions={
          <>
            <Btn variant="ghost" sm icon={<IconRefresh size={15} />} onClick={() => reload?.()}>Refresh</Btn>
            <Btn variant="gold" sm icon={<IconDownload size={15} />} onClick={exportExcel}>Export</Btn>
          </>
        }
      >
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[170px]">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              className={`${inputCls} pl-9 !py-2`}
              placeholder="Search code, name, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search assets"
            />
          </div>
          <select className={`${selectCls} flex-1 min-w-[130px] !py-2`} value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Filter by category">
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          <select className={`${selectCls} flex-1 min-w-[130px] !py-2`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </PageHeader>

      <div className="text-[12.5px] text-muted tnum mb-3">
        {loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'asset' : 'assets'}${isFiltering ? ' shown' : ''}`}
      </div>

      {loading && !assets.length ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-line rounded-xl p-4">
              <Skeleton className="h-7 w-32 mb-3" />
              <Skeleton className="h-4 w-44 mb-2" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconClipboardList size={26} />}
          title={isFiltering ? 'No matching assets' : 'No assets logged yet'}
          action={isFiltering ? (
            <Btn sm variant="ghost" onClick={() => { setSearch(''); setCatFilter(''); setStatusFilter(''); }}>Clear filters</Btn>
          ) : null}
        >
          {isFiltering
            ? 'Try a different search term or clear the filters.'
            : 'Entries saved from the New Entry tab will show up here for the whole team.'}
        </EmptyState>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {filtered.map((e, i) => (
            <div
              key={e.code}
              role="button"
              tabIndex={0}
              onClick={() => setOpenCode(e.code)}
              onKeyDown={(ev) => {
                if (ev.target === ev.currentTarget && (ev.key === 'Enter' || ev.key === ' ')) {
                  ev.preventDefault();
                  setOpenCode(e.code);
                }
              }}
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
              className="group relative text-left bg-white border border-line rounded-xl p-4 cursor-pointer overflow-hidden
                         shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
            >
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${STRIPE[statusVariant(e.status)] || 'bg-good'}`} />
              <div className="flex items-start justify-between gap-3">
                <Tag code={codeLabel(e)} size="sm" />
                <div className="flex items-center gap-0.5 flex-none -mt-0.5 -mr-1">
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setPrintAsset(e);
                    }}
                    aria-label={`Print barcode tags for ${codeLabel(e)}`}
                    title="Print barcode tags"
                    className="w-8 h-8 rounded-full text-muted hover:text-navy hover:bg-cream flex items-center justify-center
                               transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
                  >
                    <IconPrinter size={15} />
                  </button>
                  <IconChevronRight size={16} className="text-line group-hover:text-gold group-hover:translate-x-0.5 transition-all mt-1" />
                </div>
              </div>
              <div className="text-[14.5px] font-semibold mt-2.5 leading-snug">{e.name || '(no description)'}</div>
              <div className="text-[12px] text-muted mt-1 truncate">{e.department} · {e.location}</div>
              <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                <Badge variant={statusVariant(e.status)} dot>{e.status}</Badge>
                <Badge variant={conditionVariant(e.condition)} dot>{e.condition}</Badge>
              </div>
              {needsDetails(e) && (
                <div className="inline-flex items-center gap-1 text-[11px] text-pending font-semibold mt-2.5">
                  <IconClock size={13} /> Awaiting value &amp; custody
                </div>
              )}
              <div className="text-[11px] text-muted/70 mt-2 tnum">{fmtDateTime(e.createdAt)}</div>
            </div>
          ))}
        </div>
      )}

      {openAsset && (
        <DetailModal asset={openAsset} onClose={() => setOpenCode(null)} onChanged={() => reload?.()} />
      )}
      {printAsset && <LabelSheet asset={printAsset} onClose={() => setPrintAsset(null)} />}
    </div>
  );
}
