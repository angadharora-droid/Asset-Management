import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, STATUS_OPTIONS, itemsForCategory } from '../../constants/categories.js';
import { fmtDate, fmtDateTime } from '../../utils/format.js';
import { needsDetails, codeLabel, codePrefix } from '../../utils/asset.js';
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

// How many physical tags (codes) an entry covers.
const unitCount = (e) => (e.seqStart != null && e.seqEnd != null ? e.seqEnd - e.seqStart + 1 : 1);

function AssetCard({ e, i, onOpen, onPrint }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(e.code)}
      onKeyDown={(ev) => {
        if (ev.target === ev.currentTarget && (ev.key === 'Enter' || ev.key === ' ')) {
          ev.preventDefault();
          onOpen(e.code);
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
              onPrint(e);
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
      <div className="text-[12px] text-muted mt-1 truncate">
        {[e.property, e.department, e.location].filter(Boolean).join(' · ')}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
        <Badge variant={statusVariant(e.status)} dot>{e.status}</Badge>
        <Badge variant={conditionVariant(e.condition)} dot>{e.condition}</Badge>
      </div>
      {!e.labelsPrintedAt && (
        <div className="inline-flex items-center gap-1 text-[11px] text-pending font-semibold mt-2.5 mr-3">
          <IconPrinter size={13} /> Tags not printed
        </div>
      )}
      {needsDetails(e) && (
        <div className="inline-flex items-center gap-1 text-[11px] text-pending font-semibold mt-2.5">
          <IconClock size={13} /> Awaiting value &amp; custody
        </div>
      )}
      <div className="text-[11px] text-muted/70 mt-2 tnum">{fmtDateTime(e.createdAt)}</div>
    </div>
  );
}

export default function Register({ assets, loading, reload }) {
  const showToast = useToast();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openCode, setOpenCode] = useState(null);
  const [printAsset, setPrintAsset] = useState(null);
  const [printBatch, setPrintBatch] = useState(null); // all not-yet-printed entries, printed in one go
  const [collapsed, setCollapsed] = useState({}); // prefix -> true when an umbrella is folded

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
          const hay = `${e.code} ${e.name} ${e.property || ''} ${e.location} ${e.department}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .slice()
      .reverse();
  }, [assets, search, catFilter, statusFilter]);

  // Entries that share the same barcode series (code prefix, e.g. CPA.FFE.CHR)
  // are gathered under one umbrella group. A group keeps the position of its
  // newest entry in the list.
  const groups = useMemo(() => {
    const byPrefix = new Map();
    const out = [];
    for (const e of filtered) {
      const key = codePrefix(e.code) || e.code;
      const g = byPrefix.get(key);
      if (g) {
        g.entries.push(e);
      } else {
        const fresh = { key, entries: [e] };
        byPrefix.set(key, fresh);
        out.push(fresh);
      }
    }
    return out;
  }, [filtered]);

  const umbrellaCount = groups.filter((g) => g.entries.length > 1).length;

  // Entries whose barcode tags have never been printed — oldest first, so a
  // batch print runs in registration order.
  const unprinted = useMemo(() => assets.filter((a) => !a.labelsPrintedAt), [assets]);
  const unprintedTags = unprinted.reduce((s, e) => s + unitCount(e), 0);

  async function exportExcel() {
    if (!assets.length) {
      showToast('No entries to export yet', 'info');
      return;
    }
    const XLSX = await import('xlsx');
    const rows = assets.map((e) => ({
      Code: codeLabel(e), Property: e.property || '', Category: e.category, 'Asset Name': e.name, Brand: e.brand, Model: e.model,
      'Serial No.': e.serial, Size: e.size, Qty: e.qty, UOM: e.uom, Floor: e.floor,
      Department: e.department, Location: e.location, 'Physical Status': e.status, Condition: e.condition,
      'Functionality Checked': e.functionalityChecked, Remarks: e.remarks,
      'Estimated Value': e.estimatedValue ?? '', 'Value Source': e.valueSource,
      Classification: e.classification, 'Temp Custodian': e.tempCustodian, 'Final Custodian': e.finalCustodian,
      'Verified By': e.verifiedBy, 'Hariganga Rep': e.hgaRep, 'CPH Rep': e.cphRep,
      'Handover Accepted': e.accepted,
      Photos: Array.isArray(e.photos) ? e.photos.length : 0,
      Documents: Array.isArray(e.documents) ? e.documents.length : 0,
      'Tags Printed': e.labelsPrintedAt ? fmtDateTime(e.labelsPrintedAt) : 'No',
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
            {unprinted.length > 0 && (
              <Btn variant="ghost" sm icon={<IconPrinter size={15} />} onClick={() => setPrintBatch(unprinted)}>
                Print new tags ({unprintedTags})
              </Btn>
            )}
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
        {loading
          ? 'Loading…'
          : `${filtered.length} ${filtered.length === 1 ? 'asset' : 'assets'}${isFiltering ? ' shown' : ''}${
              umbrellaCount ? ` · ${umbrellaCount} barcode series grouped` : ''
            }`}
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
          {groups.map((g, gi) => {
            if (g.entries.length === 1) {
              const e = g.entries[0];
              return <AssetCard key={e.code} e={e} i={gi} onOpen={setOpenCode} onPrint={setPrintAsset} />;
            }
            const first = g.entries[0];
            const item = itemsForCategory(first.categoryCode).find((x) => x.value === first.itemCode);
            const prefixLabel = g.key.replace(/\.$/, '');
            const tags = g.entries.reduce((s, e) => s + unitCount(e), 0);
            const isFolded = !!collapsed[g.key];
            return (
              <section
                key={g.key}
                className="sm:col-span-2 border border-gold/40 bg-cream/50 rounded-xl overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${Math.min(gi, 10) * 30}ms` }}
                aria-label={`Barcode series ${prefixLabel}`}
              >
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !isFolded }))}
                  aria-expanded={!isFolded}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-cream transition-colors
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[13px] text-navy tracking-wide tnum">{prefixLabel}</span>
                      {item && <span className="text-[12px] font-semibold text-muted">{item.label}</span>}
                    </div>
                    <div className="text-[11.5px] text-muted tnum mt-0.5">
                      Same barcode series · {g.entries.length} entries · {tags} {tags === 1 ? 'tag' : 'tags'}
                    </div>
                  </div>
                  <IconChevronRight
                    size={16}
                    className={`flex-none text-muted transition-transform duration-200 ${isFolded ? '' : 'rotate-90'}`}
                  />
                </button>
                {!isFolded && (
                  <div className="grid gap-2.5 sm:grid-cols-2 px-3 pb-3">
                    {g.entries.map((e, i) => (
                      <AssetCard key={e.code} e={e} i={i} onOpen={setOpenCode} onPrint={setPrintAsset} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {openAsset && (
        <DetailModal asset={openAsset} onClose={() => setOpenCode(null)} onChanged={() => reload?.()} />
      )}
      {printAsset && (
        <LabelSheet asset={printAsset} onClose={() => setPrintAsset(null)} onPrinted={() => reload?.()} />
      )}
      {printBatch && (
        <LabelSheet assets={printBatch} onClose={() => setPrintBatch(null)} onPrinted={() => reload?.()} />
      )}
    </div>
  );
}
