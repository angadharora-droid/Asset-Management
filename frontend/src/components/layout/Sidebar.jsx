import { NAV_ITEMS } from './navItems.js';
import { needsDetails } from '../../utils/asset.js';
import { fmtDate } from '../../utils/format.js';
import { IconUsers, IconLogout } from '../Icon.jsx';

function dayLine(assets) {
  if (!assets.length) return 'Day 1 · awaiting first entry';
  const dates = assets.map((e) => fmtDate(e.createdAt)).sort();
  const start = new Date(dates[0]);
  const dayNum = Math.max(1, Math.floor((new Date() - start) / 86400000) + 1);
  return `Day ${dayNum} · started ${dates[0]}`;
}

export default function Sidebar({ active, onChange, assets = [], user, isAdmin, onLogout }) {
  const pending = assets.filter(needsDetails).length;

  return (
    <aside className="hidden lg:flex flex-col ink-panel text-white sticky top-0 h-dvh w-[264px] border-r border-white/5">
      {/* Brand */}
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="gold-rule" />
          <span className="text-2xs font-bold uppercase tracking-[0.18em] text-gold-light">
            Centre Point Hospitality
          </span>
        </div>
        <h1 className="font-serif text-[22px] text-white leading-tight">
          Asset Handover<br />Register
        </h1>
        <div className="text-[12px] text-white/55 mt-2">Hariganga → CPH · CPA</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1" aria-label="Sections">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          const showBadge = id === 'register' && pending > 0;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'group relative w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13.5px] font-semibold',
                'transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light',
                isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-gold transition-all duration-200',
                  isActive ? 'h-7 opacity-100' : 'h-0 opacity-0',
                ].join(' ')}
              />
              <Icon size={19} className={isActive ? 'text-gold-light' : ''} />
              <span className="flex-1 text-left">{label}</span>
              {showBadge && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-gold text-navy-deep text-[10px] font-bold flex items-center justify-center tnum">
                  {pending > 99 ? '99+' : pending}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer: stat + account */}
      <div className="px-5 py-4 border-t border-white/8 space-y-3">
        <div className="px-1">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-[26px] text-gold-light leading-none tnum">{assets.length}</span>
            <span className="text-2xs uppercase tracking-wider text-white/55">assets logged</span>
          </div>
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-2xs text-white/50 font-mono tnum">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-light animate-pulse" />
            {dayLine(assets)}
          </div>
        </div>

        {user && (
          <div className="rounded-xl bg-white/5 p-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gold/20 text-gold-light flex items-center justify-center font-semibold text-[13px] flex-none">
                {(user.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold text-white truncate">{user.name}</div>
                <div className="text-2xs text-white/50 uppercase tracking-wider">{user.role}</div>
              </div>
            </div>
            <div className="flex gap-1.5 mt-2.5">
              {isAdmin && (
                <button
                  onClick={() => onChange('users')}
                  className={[
                    'flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-semibold transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light',
                    active === 'users' ? 'bg-white/15 text-white' : 'bg-white/5 text-white/70 hover:text-white',
                  ].join(' ')}
                >
                  <IconUsers size={15} /> Users
                </button>
              )}
              <button
                onClick={onLogout}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-semibold
                           bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
              >
                <IconLogout size={15} /> Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
