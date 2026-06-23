import { NAV_ITEMS } from './navItems.js';
import { needsDetails } from '../../utils/asset.js';

// Mobile bottom navigation (desktop uses the Sidebar).
export default function BottomNav({ active, onChange, assets = [] }) {
  const pending = assets.filter(needsDetails).length;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 ink-panel border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Sections"
    >
      <div className="flex">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          const showBadge = id === 'register' && pending > 0;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'relative flex-1 flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 text-[11px] font-semibold',
                'transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light focus-visible:ring-inset',
                isActive ? 'text-gold-light' : 'text-white/55',
              ].join(' ')}
            >
              <span className="relative">
                <Icon size={20} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-gold text-navy-deep text-[9px] font-bold flex items-center justify-center tnum">
                    {pending > 99 ? '99+' : pending}
                  </span>
                )}
              </span>
              {label}
              {isActive && <span className="absolute top-0 w-8 h-0.5 rounded-full bg-gold" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
