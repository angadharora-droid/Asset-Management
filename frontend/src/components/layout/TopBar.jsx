import { IconUsers, IconLogout, IconSwitch } from '../Icon.jsx';

// Compact mobile top bar (desktop uses the Sidebar instead).
export default function TopBar({ assets, user, isAdmin, onLogout, onManageUsers, site, onSwitchSite }) {
  return (
    <div className="lg:hidden ink-panel text-white sticky top-0 z-30 shadow-card">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="gold-rule !w-5" />
            <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-gold-light">
              Centre Point Hospitality
            </span>
          </div>
          <h1 className="font-serif text-[17px] text-white leading-tight mt-0.5 truncate">
            Asset Handover Register
          </h1>
          {site && (
            <button
              onClick={onSwitchSite}
              title="Switch to another site"
              className="max-w-full inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-gold-light mt-0.5
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light rounded"
            >
              <IconSwitch size={13} className="flex-none" />
              <span className="truncate">{site.code} · {site.name}</span>
            </button>
          )}
          {user && <div className="text-[11px] text-white/55 truncate">{user.name} · {user.role}</div>}
        </div>

        <div className="flex items-center gap-1 flex-none">
          <div className="text-right mr-1">
            <div className="font-serif text-[20px] text-gold-light leading-none tnum">{assets.length}</div>
            <div className="text-[9px] uppercase tracking-wider text-white/55">logged</div>
          </div>
          {isAdmin && (
            <button
              onClick={onManageUsers}
              aria-label="Manage users"
              className="w-9 h-9 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
            >
              <IconUsers size={18} />
            </button>
          )}
          <button
            onClick={onLogout}
            aria-label="Log out"
            className="w-9 h-9 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
          >
            <IconLogout size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
