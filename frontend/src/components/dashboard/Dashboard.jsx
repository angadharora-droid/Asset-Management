import { useEffect, useMemo } from 'react';
import { fmtDate, inrPlain } from '../../utils/format.js';
import { needsDetails } from '../../utils/asset.js';
import { Card, SectionHead, Skeleton, EmptyState } from '../ui.jsx';
import PageHeader from '../layout/PageHeader.jsx';
import {
  IconBox, IconBanknote, IconList, IconShield, IconChart, IconClock,
  IconCheckCircle, IconXCircle,
} from '../Icon.jsx';

const TONES = {
  navy: 'bg-navy/10 text-navy',
  damaged: 'bg-damaged-bg text-damaged',
  pending: 'bg-pending-bg text-pending',
  good: 'bg-good-bg text-good',
  gold: 'bg-gold/12 text-gold',
  extra: 'bg-extra-bg text-extra',
};

function StatCard({ icon, value, label, tone = 'navy' }) {
  return (
    <div className="bg-white border border-line rounded-xl p-3.5 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${TONES[tone]}`}>{icon}</div>
      <div className="font-serif text-[26px] font-semibold text-navy leading-none tnum">{value}</div>
      <div className="text-[11.5px] text-muted uppercase tracking-[0.05em] mt-1.5">{label}</div>
    </div>
  );
}

const STATUS_SEGMENTS = [
  { key: 'Found', label: 'Found', color: '#2F6F4E' },
  { key: 'Missing', label: 'Missing', color: '#A8392E' },
  { key: 'Extra Found', label: 'Extra', color: '#5B5BA6' },
  { key: 'Pending Verification', label: 'Pending', color: '#B5811E' },
];

function Donut({ data, size = 150, stroke = 20 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = data.reduce((s, x) => s + x.value, 0);
  let offset = 0;
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDE7D8" strokeWidth={stroke} />
        {total > 0 && data.map((seg) => {
          if (!seg.value) return null;
          const len = (seg.value / total) * c;
          const el = (
            <circle key={seg.label} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={seg.color} strokeWidth={stroke} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif text-[28px] font-semibold text-navy leading-none tnum">{total}</div>
        <div className="text-2xs text-muted uppercase tracking-wider">logged</div>
      </div>
    </div>
  );
}

function BarGroup({ entries }) {
  if (!entries.length) return <div className="text-muted text-[13px]">No data yet.</div>;
  const max = Math.max(...entries.map((e) => e[1]));
  return (
    <div>
      {entries.map(([label, count]) => (
        <div key={label} className="flex items-center gap-2.5 my-2">
          <div className="w-[130px] text-[12.5px] flex-none text-ink truncate" title={label}>{label}</div>
          <div className="flex-1 h-2.5 bg-line rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-gold to-gold-light rounded-full origin-left animate-bar-grow"
              style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <div className="w-7 text-right text-[12px] font-mono text-muted tnum">{count}</div>
        </div>
      ))}
    </div>
  );
}

function HeroStat({ value, label, dot }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {dot && <span className="w-2 h-2 rounded-full" style={{ background: dot }} />}
        <span className="font-serif text-[22px] text-white leading-none tnum">{value}</span>
      </div>
      <div className="text-2xs uppercase tracking-wider text-white/55 mt-1.5">{label}</div>
    </div>
  );
}

function groupCount(list, field) {
  const map = {};
  list.forEach((e) => {
    const k = e[field] || '(blank)';
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export default function Dashboard({ assets, loading, reload }) {
  useEffect(() => {
    reload?.();
  }, [reload]);

  const s = useMemo(() => {
    const capexItems = assets.filter((e) => e.classification === 'CAPEX');
    const capexVal = capexItems.reduce((acc, e) => acc + (parseFloat(e.estimatedValue) || 0), 0);
    return {
      total: assets.length,
      found: assets.filter((e) => e.status === 'Found').length,
      missing: assets.filter((e) => e.status === 'Missing').length,
      damaged: assets.filter((e) => e.condition === 'Damaged' || e.condition === 'Not Working').length,
      awaiting: assets.filter(needsDetails).length,
      capex: capexItems.length,
      capexVal,
      opex: assets.filter((e) => e.classification === 'OPEX').length,
      lvc: assets.filter((e) => e.classification === 'Low Value Controlled').length,
      accepted: assets.filter((e) => e.accepted === 'Yes').length,
      acceptedPending: assets.filter((e) => !e.accepted || e.accepted === 'Pending').length,
      acceptedConditional: assets.filter((e) => e.accepted === 'Conditional').length,
      acceptedNo: assets.filter((e) => e.accepted === 'No').length,
      statusData: STATUS_SEGMENTS.map((seg) => ({ ...seg, value: assets.filter((e) => e.status === seg.key).length })),
      byCategory: groupCount(assets, 'category'),
      byDepartment: groupCount(assets, 'department'),
    };
  }, [assets]);

  const timeline = useMemo(() => {
    const map = {};
    assets.forEach((e) => { map[fmtDate(e.createdAt)] = (map[fmtDate(e.createdAt)] || 0) + 1; });
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [assets]);

  const completion = s.total ? Math.round(((s.total - s.awaiting) / s.total) * 100) : 0;

  if (loading && !assets.length) {
    return (
      <>
        <PageHeader eyebrow="Overview" title="Handover Dashboard" />
        <Skeleton className="h-40 w-full rounded-2xl mb-3.5" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </>
    );
  }

  if (!assets.length) {
    return (
      <>
        <PageHeader eyebrow="Overview" title="Handover Dashboard" />
        <Card>
          <EmptyState icon={<IconChart size={26} />} title="Nothing to chart yet">
            Once assets are logged, you'll see verification status, classification value and
            per-area breakdowns here.
          </EmptyState>
        </Card>
      </>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Handover Dashboard"
        subtitle="Live progress across verification, valuation and custody."
      />

      {/* HERO */}
      <div className="ink-panel rounded-2xl text-white p-6 mb-3.5 shadow-pop relative overflow-hidden">
        <div className="grid md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-center">
          <div>
            <div className="text-2xs font-bold uppercase tracking-[0.16em] text-gold-light mb-2">Total Logged</div>
            <div className="font-serif text-[52px] leading-none text-white tnum">{s.total}</div>
            <div className="text-[12.5px] text-white/55 mt-1.5">assets across {s.byDepartment.length} departments</div>
          </div>
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <HeroStat value={s.found} label="Found" dot="#5BBF8A" />
              <HeroStat value={s.missing} label="Missing" dot="#E0735F" />
              <HeroStat value={s.damaged} label="Damaged" dot="#E0A24E" />
              <HeroStat value={s.awaiting} label="Awaiting value" dot="#D8A94F" />
            </div>
            <div className="mt-5">
              <div className="flex justify-between text-2xs text-white/60 mb-1.5">
                <span className="uppercase tracking-wider">Value &amp; custody completed</span>
                <span className="font-mono tnum text-gold-light">{completion}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-gold to-gold-light rounded-full origin-left animate-bar-grow"
                  style={{ width: `${completion}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification status */}
      <Card>
        <SectionHead icon={<IconChart size={15} />}>Verification Status</SectionHead>
        <div className="flex items-center gap-5 flex-wrap justify-center sm:justify-start">
          <Donut data={s.statusData} />
          <div className="flex-1 min-w-[180px] space-y-1.5" role="img"
            aria-label={s.statusData.map((d) => `${d.label}: ${d.value}`).join(', ')}>
            {s.statusData.map((d) => (
              <div key={d.label} className="flex items-center gap-2.5 text-[13px]">
                <span className="w-3 h-3 rounded-sm flex-none" style={{ background: d.color }} />
                <span className="flex-1 text-ink">{d.label}</span>
                <span className="font-mono font-semibold text-navy tnum">{d.value}</span>
                <span className="text-muted text-[11.5px] tnum w-10 text-right">
                  {s.total ? Math.round((d.value / s.total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Classification */}
      <Card>
        <SectionHead icon={<IconBanknote size={15} />}>Classification</SectionHead>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatCard icon={<IconBanknote size={18} />} value={s.capex} label="CAPEX items" tone="gold" />
          <StatCard icon={<IconBanknote size={18} />} value={inrPlain(s.capexVal)} label="CAPEX value" tone="good" />
          <StatCard icon={<IconList size={18} />} value={s.opex} label="OPEX items" tone="navy" />
          <StatCard icon={<IconShield size={18} />} value={s.lvc} label="Low Value Ctrl." tone="extra" />
        </div>
      </Card>

      {/* Handover acceptance */}
      <Card>
        <SectionHead icon={<IconCheckCircle size={15} />}>Handover Acceptance</SectionHead>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatCard icon={<IconCheckCircle size={18} />} value={s.accepted} label="Accepted" tone="good" />
          <StatCard icon={<IconClock size={18} />} value={s.acceptedPending} label="Pending handover" tone="pending" />
          <StatCard icon={<IconShield size={18} />} value={s.acceptedConditional} label="Conditional" tone="extra" />
          <StatCard icon={<IconXCircle size={18} />} value={s.acceptedNo} label="Declined" tone="damaged" />
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-3.5">
        <Card className="!mb-0">
          <SectionHead icon={<IconList size={15} />}>By Category</SectionHead>
          <BarGroup entries={s.byCategory} />
        </Card>
        <Card className="!mb-0">
          <SectionHead icon={<IconBox size={15} />}>By Department</SectionHead>
          <BarGroup entries={s.byDepartment} />
        </Card>
      </div>

      <Card className="mt-3.5">
        <SectionHead icon={<IconClock size={15} />}>Handover Timeline</SectionHead>
        {timeline.map(([date, count]) => (
          <div key={date} className="flex justify-between items-center py-2.5 border-b border-line/70 last:border-0">
            <div>
              <div className="font-mono text-[13px] font-semibold text-navy tnum">{date}</div>
              <div className="text-[11.5px] text-muted">{count} asset(s) logged</div>
            </div>
            <div className="font-serif text-[20px] text-gold tnum">{count}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
