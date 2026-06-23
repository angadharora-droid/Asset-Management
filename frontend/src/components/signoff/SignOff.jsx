import { useEffect, useMemo, useState } from 'react';
import { fmtDate, fmtDateTime } from '../../utils/format.js';
import { rangeCode, assetSegments } from '../../utils/asset.js';
import { Btn, conditionVariant, statusVariant } from '../ui.jsx';
import { IconPrinter } from '../Icon.jsx';
import PageHeader from '../layout/PageHeader.jsx';
import DateFilter, { ALL_DATES, matchesDateFilter, describeDateFilter } from '../DateFilter.jsx';

const acceptedVariant = (a) =>
  a === 'Yes' ? 'good' : a === 'No' ? 'damaged' : a === 'Conditional' ? 'pending' : 'neutral';

const DOT = {
  good: 'bg-good',
  damaged: 'bg-damaged',
  pending: 'bg-pending',
  extra: 'bg-extra',
  scrap: 'bg-scrap',
  neutral: 'bg-navy/60',
};

// Compact status/condition cell — a colour dot + label. Prints cleanly (the dot
// is vector) where filled badges would otherwise drop their background.
function Pill({ variant, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`w-1.5 h-1.5 rounded-full flex-none ${DOT[variant] || DOT.neutral}`} />
      {children}
    </span>
  );
}

function SummaryCell({ value, label, accent }) {
  return (
    <div className="bg-white border border-line rounded-lg px-3 py-2.5 text-[12.5px] flex-1 min-w-[96px] text-center">
      <b className={`block font-serif text-[20px] tnum ${accent || 'text-navy'}`}>{value}</b>
      <span className="text-muted">{label}</span>
    </div>
  );
}

// Formal letterhead for the printable document.
function SheetHeader({ generatedAt, periodLabel }) {
  return (
    <div className="flex items-start justify-between gap-6 flex-wrap pb-4 mb-5 border-b-2 border-navy">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-lg bg-navy text-gold-light flex items-center justify-center font-serif text-[17px] font-bold flex-none tracking-tight">
          CPA
        </div>
        <div>
          <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-gold">Final · Acceptance</div>
          <h2 className="text-[20px] leading-tight mt-0.5">Asset Handover Sign-Off Sheet</h2>
          <div className="text-[11.5px] text-muted">Centre Point Amravati · Hariganga → CPH Transition</div>
        </div>
      </div>
      <table className="border-collapse text-[11px] [&_td]:py-[3px] [&_td:first-child]:pr-3 [&_td:first-child]:text-muted [&_td:first-child]:uppercase [&_td:first-child]:tracking-[0.05em] [&_td:first-child]:text-[9px] [&_td:first-child]:font-bold [&_td:first-child]:align-top">
        <tbody>
          <tr>
            <td>Document</td>
            <td className="font-mono tnum text-navy">CPA/HANDOVER/SIGN-OFF</td>
          </tr>
          <tr>
            <td>Generated</td>
            <td className="tnum">{generatedAt}</td>
          </tr>
          <tr>
            <td>Period</td>
            <td className="tnum">{periodLabel}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function LegendItem({ variant, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${DOT[variant] || DOT.neutral}`} />
      {children}
    </span>
  );
}

function SigBox({ role }) {
  return (
    <div className="sig-block">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold mb-1">{role}</div>
      <div className="text-[10.5px] text-muted mb-4">
        I certify the assets listed above were jointly verified and the recorded condition is accurate.
      </div>
      {['Name', 'Designation', 'Signature', 'Date'].map((f) => (
        <div key={f} className="mb-3.5">
          <div className="h-7 border-b border-ink/70" />
          <div className="text-[9px] text-muted uppercase tracking-[0.08em] mt-1">{f}</div>
        </div>
      ))}
    </div>
  );
}

export default function SignOff({ assets, reload }) {
  const [dateFilter, setDateFilter] = useState(ALL_DATES);
  const generatedAt = useMemo(() => fmtDateTime(new Date().toISOString()), []);

  useEffect(() => {
    reload?.();
  }, [reload]);

  const filtered = useMemo(
    () => assets.filter((a) => matchesDateFilter(a.createdAt, dateFilter)),
    [assets, dateFilter]
  );

  // Unit-weighted counts (more meaningful on a detailed, per-condition sheet).
  const counts = useMemo(() => {
    const c = { entries: filtered.length, units: 0, found: 0, missing: 0, damaged: 0, accepted: 0 };
    filtered.forEach((a) => {
      assetSegments(a).forEach((s) => {
        const u = Math.max(1, (s.to ?? 0) - (s.from ?? 0) + 1);
        c.units += u;
        if (s.status === 'Found') c.found += u;
        if (s.status === 'Missing') c.missing += u;
        if (s.condition === 'Damaged' || s.condition === 'Not Working') c.damaged += u;
        if (s.accepted === 'Yes') c.accepted += u;
      });
    });
    return c;
  }, [filtered]);

  const periodLabel = describeDateFilter(dateFilter);

  return (
    <div>
      <div className="no-print">
        <PageHeader
          eyebrow="Final · Acceptance"
          title="Sign-Off Sheet"
          subtitle="Generated live from the register — each condition group is listed on its own line. Print or save as PDF when ready for physical signatures."
          actions={
            <Btn variant="gold" sm icon={<IconPrinter size={16} />} onClick={() => window.print()}>
              Print / Save as PDF
            </Btn>
          }
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <DateFilter value={dateFilter} onChange={setDateFilter} />
            <span className="text-[12px] text-muted">
              Showing <b className="text-navy tnum">{counts.entries}</b> entr{counts.entries === 1 ? 'y' : 'ies'} ·{' '}
              <b className="text-navy tnum">{counts.units}</b> unit{counts.units === 1 ? '' : 's'} · {periodLabel}
            </span>
          </div>
        </PageHeader>
      </div>

      <div
        id="signoff-print"
        className="bg-white border border-line rounded-xl p-5 sm:p-7 shadow-card print:border-0 print:shadow-none print:p-0"
      >
        <SheetHeader generatedAt={generatedAt} periodLabel={periodLabel} />

        <div className="flex flex-wrap gap-2.5 mb-5">
          <SummaryCell value={counts.entries} label="Entries" />
          <SummaryCell value={counts.units} label="Total Units" />
          <SummaryCell value={counts.found} label="Found" accent="text-good" />
          <SummaryCell value={counts.missing} label="Missing" accent="text-damaged" />
          <SummaryCell value={counts.damaged} label="Damaged" accent="text-damaged" />
          <SummaryCell value={counts.accepted} label="Accepted" accent="text-good" />
        </div>

        <div className="overflow-x-auto signoff-tablewrap">
          <table className="signoff-table w-full border-collapse text-[11.5px] min-w-[780px]">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[13%]" />
              <col className="w-[5%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
            </colgroup>
            <thead>
              <tr className="[&>th]:border [&>th]:border-navy-light [&>th]:bg-navy [&>th]:text-white [&>th]:p-2 [&>th]:text-left [&>th]:text-[9.5px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.05em]">
                <th>Code / Range</th>
                <th>Description</th>
                <th>Location</th>
                <th className="!text-center">Qty</th>
                <th>Status</th>
                <th>Condition</th>
                <th>Class.</th>
                <th>Accepted</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, ai) => {
                const segs = assetSegments(a);
                const groupBg = ai % 2 ? 'bg-[#FAF8F3]' : 'bg-white';
                return segs.map((s, i) => (
                  <tr
                    key={`${a.code}-${i}`}
                    className={[
                      groupBg,
                      i === 0 ? 'border-t-2 border-navy/20' : '',
                      '[&>td]:border [&>td]:border-line [&>td]:p-2 [&>td]:align-top',
                    ].join(' ')}
                  >
                    <td className="font-mono tnum whitespace-nowrap text-navy">{rangeCode(a, s.from, s.to)}</td>
                    {i === 0 && (
                      <td rowSpan={segs.length} className="font-medium">
                        {a.name}
                        {(a.brand || a.model) && (
                          <span className="block text-[10px] text-muted font-normal">
                            {[a.brand, a.model].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </td>
                    )}
                    {i === 0 && (
                      <td rowSpan={segs.length}>
                        {a.department}
                        <span className="block text-[10px] text-muted">{a.location}</span>
                      </td>
                    )}
                    <td className="text-center tnum">{Math.max(1, (s.to ?? 0) - (s.from ?? 0) + 1)}</td>
                    <td>
                      <Pill variant={statusVariant(s.status)}>{s.status}</Pill>
                    </td>
                    <td>
                      <Pill variant={conditionVariant(s.condition)}>{s.condition}</Pill>
                      {s.remarks ? (
                        <div className="text-[10px] text-muted italic mt-0.5">“{s.remarks}”</div>
                      ) : null}
                    </td>
                    {i === 0 && (
                      <td rowSpan={segs.length} className="whitespace-nowrap">
                        {a.classification}
                      </td>
                    )}
                    <td>
                      <Pill variant={acceptedVariant(s.accepted)}>{s.accepted}</Pill>
                    </td>
                    {i === 0 && (
                      <td rowSpan={segs.length} className="tnum whitespace-nowrap">
                        {fmtDate(a.createdAt)}
                      </td>
                    )}
                  </tr>
                ));
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="border border-line p-4 text-center text-muted">
                    No assets logged for {periodLabel.toLowerCase()}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-muted">
          <span className="font-bold uppercase tracking-[0.08em] text-navy">Condition</span>
          <LegendItem variant="good">Good</LegendItem>
          <LegendItem variant="pending">Installed · Not Tested</LegendItem>
          <LegendItem variant="damaged">Damaged · Not Working</LegendItem>
          <LegendItem variant="scrap">Scrap · Not Usable</LegendItem>
          <span className="text-line">|</span>
          <span className="italic">Batches are split into one line per condition group.</span>
        </div>

        {/* Acceptance & authorisation */}
        <div className="sig-block mt-9">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold mb-1">Acceptance &amp; Authorisation</div>
          <div className="h-px bg-line mb-5" />
          <div className="grid grid-cols-2 gap-8">
            <SigBox role="Hariganga Representative (Outgoing)" />
            <SigBox role="CPH Representative (Receiving)" />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-7 pt-3 border-t border-line text-[9px] text-muted flex justify-between flex-wrap gap-2">
          <span>Confidential · System-generated from the live asset register; subject to physical verification.</span>
          <span className="tnum">Centre Point Amravati · Asset Handover Register · {generatedAt}</span>
        </div>
      </div>
    </div>
  );
}
