import { useEffect, useState } from 'react';
import { needsDetails, assetSegments } from '../../utils/asset.js';
import PageHeader from '../layout/PageHeader.jsx';
import { Btn } from '../ui.jsx';
import {
  IconActivity, IconList, IconMapPin, IconBox, IconUsers, IconShield, IconClipboardList,
  IconBanknote, IconUser, IconTag, IconAlert, IconClock, IconPrinter, IconChevronRight, IconCheckCircle,
} from '../Icon.jsx';
import { roomKey } from './reportUtils.js';
import GroupedReport from './GroupedReport.jsx';
import TagWiseReport from './TagWiseReport.jsx';
import FilteredReport from './FilteredReport.jsx';
import ActivityLogReport from './ActivityLogReport.jsx';
import ConditionBreakdownReport from './ConditionBreakdownReport.jsx';

const DAMAGED = ['Damaged', 'Not Working', 'Scrap / Not Usable'];

// One config object per grouped report — GroupedReport does the rest.
const grouped = (extra) => ({ render: (p) => <GroupedReport assets={p.assets} config={extra} /> });

const exceptionReason = (a) => {
  const set = new Set();
  for (const s of assetSegments(a)) {
    if ((s.status || a.status) === 'Missing') set.add('Missing');
    const c = s.condition || a.condition;
    if (DAMAGED.includes(c)) set.add(c);
  }
  return [...set].join(' · ') || 'Needs review';
};
const isException = (a) =>
  assetSegments(a).some((s) => (s.status || a.status) === 'Missing' || DAMAGED.includes(s.condition || a.condition));

// The full catalogue. Each report knows how to render itself from the shared
// `assets` list — nothing here hits the network.
const SECTIONS = [
  {
    title: 'Overview & audit trail',
    items: [
      {
        id: 'log', label: 'Activity Log', icon: IconActivity,
        desc: 'Every status change, who made it and when.',
        render: (p) => <ActivityLogReport assets={p.assets} loading={p.loading} />,
      },
      {
        id: 'breakdown', label: 'Condition Breakdown', icon: IconList,
        desc: 'Each batch split into its condition sub-ranges.',
        render: (p) => <ConditionBreakdownReport assets={p.assets} loading={p.loading} />,
      },
      {
        id: 'tagwise', label: 'Tag-wise Report', icon: IconTag,
        desc: 'Every physical tag as its own row — status, condition, serial.',
        render: (p) => <TagWiseReport assets={p.assets} />,
      },
    ],
  },
  {
    title: 'Location & ownership',
    items: [
      {
        id: 'room', label: 'Room-wise Report', icon: IconMapPin,
        desc: 'Assets grouped by the room they live in.',
        ...grouped({ title: 'Room-wise Report', groupNoun: 'Room', mix: 'status', fallback: '(no room recorded)', fileBase: 'Room_Report', keyFn: (a) => roomKey(a.location), labelFn: (a) => String(a.location || '').trim() }),
      },
      {
        id: 'floor', label: 'Floor-wise Report', icon: IconBox,
        desc: 'Assets grouped by floor / level.',
        ...grouped({ title: 'Floor-wise Report', groupNoun: 'Floor', mix: 'condition', fileBase: 'Floor_Report', keyFn: (a) => a.floor }),
      },
      {
        id: 'department', label: 'Department-wise Report', icon: IconUsers,
        desc: 'Assets grouped by owning department.',
        ...grouped({ title: 'Department-wise Report', groupNoun: 'Department', mix: 'status', fileBase: 'Department_Report', keyFn: (a) => a.department }),
      },
      {
        id: 'property', label: 'Ownership Report', icon: IconShield,
        desc: 'Split by property / owner (Centre Point vs Hariganga).',
        ...grouped({ title: 'Ownership Report', groupNoun: 'Property', mix: 'condition', fileBase: 'Ownership_Report', keyFn: (a) => a.property }),
      },
    ],
  },
  {
    title: 'Classification & value',
    items: [
      {
        id: 'category', label: 'Category-wise Report', icon: IconClipboardList,
        desc: 'Assets grouped by asset category.',
        ...grouped({ title: 'Category-wise Report', groupNoun: 'Category', mix: 'condition', fileBase: 'Category_Report', keyFn: (a) => a.category }),
      },
      {
        id: 'classification', label: 'CAPEX / OPEX Report', icon: IconBanknote,
        desc: 'Grouped by CAPEX / OPEX / Low-Value classification.',
        ...grouped({ title: 'Classification Report', groupNoun: 'Classification', mix: 'condition', fileBase: 'Classification_Report', keyFn: (a) => a.classification }),
      },
      {
        id: 'valueSource', label: 'Value Source Report', icon: IconBanknote,
        desc: 'How each valuation was arrived at (invoice, estimate…).',
        ...grouped({ title: 'Value Source Report', groupNoun: 'Value source', mix: 'condition', fileBase: 'Value_Source_Report', keyFn: (a) => a.valueSource }),
      },
      {
        id: 'custodian', label: 'Custodian Report', icon: IconUser,
        desc: 'Assets grouped by their final custodian.',
        ...grouped({ title: 'Custodian Report', groupNoun: 'Custodian', mix: 'status', fileBase: 'Custodian_Report', keyFn: (a) => a.finalCustodian }),
      },
    ],
  },
  {
    title: 'Status, condition & handover',
    items: [
      {
        id: 'status', label: 'Status Summary', icon: IconActivity,
        desc: 'Units by physical status — Found, Missing, Extra…',
        ...grouped({ title: 'Status Summary', groupNoun: 'Status', mix: 'condition', fileBase: 'Status_Summary', keyFn: (a) => a.status }),
      },
      {
        id: 'condition', label: 'Condition Summary', icon: IconCheckCircle,
        desc: 'Units by condition — Good, Damaged, Scrap…',
        ...grouped({ title: 'Condition Summary', groupNoun: 'Condition', mix: 'status', fileBase: 'Condition_Summary', keyFn: (a) => a.condition }),
      },
      {
        id: 'acceptance', label: 'Handover Acceptance', icon: IconCheckCircle,
        desc: 'What the receiving side has accepted, rejected or held.',
        ...grouped({ title: 'Handover Acceptance', groupNoun: 'Handover status', mix: 'condition', fileBase: 'Handover_Acceptance', keyFn: (a) => a.accepted }),
      },
    ],
  },
  {
    title: 'Exceptions & follow-ups',
    items: [
      {
        id: 'exceptions', label: 'Exceptions Report', icon: IconAlert,
        desc: 'Missing, damaged, not-working and scrap items.',
        render: (p) => (
          <FilteredReport
            assets={p.assets}
            config={{ title: 'Exceptions Report', fileBase: 'Exceptions', icon: IconAlert, predicate: isException, reason: exceptionReason, empty: { title: 'No exceptions', body: 'No missing, damaged or scrap items right now.' } }}
          />
        ),
      },
      {
        id: 'pending', label: 'Pending Details', icon: IconClock,
        desc: 'Entries still awaiting value & custody.',
        render: (p) => (
          <FilteredReport
            assets={p.assets}
            config={{ title: 'Pending Details Report', fileBase: 'Pending_Details', icon: IconClock, predicate: needsDetails, reason: () => 'Awaiting value & custody', empty: { title: 'Nothing pending', body: 'Every entry has its value & custody filled in.' } }}
          />
        ),
      },
      {
        id: 'notprinted', label: 'Tags Not Printed', icon: IconPrinter,
        desc: 'Entries whose barcode tags were never printed.',
        render: (p) => (
          <FilteredReport
            assets={p.assets}
            config={{ title: 'Tags Not Printed Report', fileBase: 'Tags_Not_Printed', icon: IconPrinter, predicate: (a) => !a.labelsPrintedAt, reason: () => 'Tags not printed', empty: { title: 'All tags printed', body: 'Every entry has had its barcode tags printed.' } }}
          />
        ),
      },
    ],
  },
];

const ALL = SECTIONS.flatMap((s) => s.items);

function ReportCard({ item, onOpen, i }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
      className="group text-left bg-white border border-line rounded-xl p-4 shadow-card hover:shadow-card-hover
                 hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="w-9 h-9 rounded-lg bg-navy text-gold-light flex items-center justify-center flex-none">
          <Icon size={17} />
        </span>
        <IconChevronRight size={16} className="text-line group-hover:text-gold group-hover:translate-x-0.5 transition-all mt-1" />
      </div>
      <div className="text-[14px] font-semibold text-navy mt-3">{item.label}</div>
      <div className="text-[12px] text-muted mt-1 leading-snug">{item.desc}</div>
    </button>
  );
}

export default function ReportsPage({ assets, loading, reload }) {
  const [active, setActive] = useState(null);

  useEffect(() => {
    reload?.();
  }, [reload]);

  const current = active ? ALL.find((r) => r.id === active) : null;

  if (current) {
    return (
      <div>
        <PageHeader
          eyebrow="Reports"
          title={current.label}
          subtitle={current.desc}
          actions={
            <Btn variant="ghost" sm icon={<IconChevronRight size={15} className="rotate-180" />} onClick={() => setActive(null)}>
              All reports
            </Btn>
          }
        />
        <div key={current.id} className="animate-fade-in-up">
          {current.render({ assets, loading })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="Reports"
        subtitle="Every view of the handover register — pick a report to drill in, then export to Excel or PDF."
      />
      <div className="text-[12.5px] text-muted tnum mb-4">
        {ALL.length} reports available · {assets.length} {assets.length === 1 ? 'entry' : 'entries'} in the register
      </div>

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-[11px] uppercase tracking-[0.12em] text-gold font-bold mb-2.5">{section.title}</h2>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item, i) => (
                <ReportCard key={item.id} item={item} onOpen={setActive} i={i} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
