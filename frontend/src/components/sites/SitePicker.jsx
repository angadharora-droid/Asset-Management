import { useEffect, useState } from 'react';
import { getSites } from '../../api/assetApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSite } from '../../context/SiteContext.jsx';
import { SITES } from '../../constants/sites.js';
import { IconChevronRight, IconLogout, IconMapPin, IconBuilding } from '../Icon.jsx';
import PageHeader from '../layout/PageHeader.jsx';

function SiteCard({ site, count, i, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(site.code)}
      style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
      className="group flex flex-col text-left bg-white border border-line rounded-xl p-4 shadow-card
                 hover:shadow-card-hover hover:-translate-y-0.5 hover:border-gold/60 transition-all duration-200
                 animate-fade-in-up focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono font-bold text-[13px] text-navy tracking-wide px-2 py-1 rounded-md border border-line bg-navy/[0.04]">
          {site.code}
        </span>
        <IconChevronRight size={16} className="text-line group-hover:text-gold group-hover:translate-x-0.5 transition-all mt-1" />
      </div>
      <div className="font-serif text-[19px] text-navy leading-snug mt-3">{site.name}</div>
      <div className="text-[12px] text-muted mt-1 leading-snug">{site.legalEntities.join(' · ')}</div>
      <div className="mt-auto pt-3">
        <div className="pt-2.5 border-t border-line/70 flex items-center gap-3 text-[11.5px] text-muted tnum">
          <span>
            <b className="text-navy font-semibold">{count ?? '—'}</b> {count === 1 ? 'entry' : 'entries'}
          </span>
          <span className="inline-flex items-center gap-1">
            <IconMapPin size={12} /> {site.locations.length} locations
          </span>
        </div>
      </div>
    </button>
  );
}

// Landing screen after sign-in: one card per site. Opening a site loads its
// own register (its own database); the whole app then works on that site until
// the user switches from the sidebar / top bar.
export default function SitePicker() {
  const { user, logout } = useAuth();
  const { selectSite } = useSite();
  const [counts, setCounts] = useState({});

  // Entry counts are a nicety — if they can't load, the cards show "—".
  useEffect(() => {
    let active = true;
    getSites()
      .then((list) => active && setCounts(Object.fromEntries(list.map((s) => [s.code, s.count]))))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-dvh paper-bg">
      <header className="ink-panel text-white">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-10 py-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="gold-rule !w-5" />
              <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-gold-light">
                Centre Point Hospitality
              </span>
            </div>
            <div className="font-serif text-[17px] leading-tight mt-0.5 truncate">Asset Handover Register</div>
          </div>
          <div className="flex items-center gap-3 flex-none">
            {user && (
              <div className="hidden sm:block text-right">
                <div className="text-[12.5px] font-semibold truncate max-w-[200px]">{user.name}</div>
                <div className="text-2xs text-white/50 uppercase tracking-wider">{user.role}</div>
              </div>
            )}
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold
                         bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
            >
              <IconLogout size={15} /> Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 lg:pt-10 pb-14">
        <PageHeader
          eyebrow="Sites"
          title="Choose a site"
          subtitle="Each site keeps its own register. Open one to log, track and report its assets — you can switch sites any time from the menu."
        />
        <div className="text-[12.5px] text-muted mb-3 inline-flex items-center gap-1.5">
          <IconBuilding size={14} /> {SITES.length} sites
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SITES.map((s, i) => (
            <SiteCard key={s.code} site={s} count={counts[s.code]} i={i} onOpen={selectSite} />
          ))}
        </div>
      </main>
    </div>
  );
}
