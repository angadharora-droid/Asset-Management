// Asset code chip — flat and editorial (hairline border, gold tag glyph,
// crisp navy monospace). No gradients/gloss. Two forms:
//   • inline chip (default) for register cards, modal header
//   • labelled panel (pass `label`) for the entry-form preview
import { IconTag } from './Icon.jsx';

const SIZES = {
  sm: { code: 'text-[12px]', pad: 'pl-2 pr-2.5 py-1', icon: 12, gap: 'gap-1.5' },
  md: { code: 'text-[13px]', pad: 'pl-2.5 pr-3 py-1.5', icon: 13, gap: 'gap-1.5' },
  lg: { code: 'text-[15px]', pad: 'pl-3 pr-3.5 py-2', icon: 15, gap: 'gap-2' },
};

export default function Tag({ code, label, size = 'md', className = '' }) {
  const s = SIZES[size] || SIZES.md;

  // Labelled panel variant (entry preview)
  if (label) {
    return (
      <div
        className={`relative inline-flex items-center gap-3 rounded-lg border border-line bg-white pl-4 pr-4 py-2.5 ${className}`}
      >
        <span className="absolute left-0 inset-y-2 w-[3px] rounded-full bg-gold" />
        <IconTag size={16} className="text-gold flex-none" />
        <div className="min-w-0">
          <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-gold/90">{label}</div>
          <div className="font-mono font-semibold text-navy tnum tracking-tight text-[16px] leading-tight truncate">
            {code}
          </div>
        </div>
      </div>
    );
  }

  // Inline chip variant
  return (
    <span
      className={`inline-flex items-center ${s.gap} ${s.pad} rounded-md border border-line bg-navy/[0.04] ${className}`}
    >
      <IconTag size={s.icon} className="text-gold flex-none" />
      <span className={`font-mono font-semibold text-navy tnum tracking-tight ${s.code}`}>{code}</span>
    </span>
  );
}
