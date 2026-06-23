// Small presentational primitives + shared class strings. Keeping the long
// Tailwind class lists here keeps the feature components readable.
import { IconSpinner, IconInfo, IconCheckCircle, IconAlert, IconBox } from './Icon.jsx';

export const inputCls =
  'w-full px-[11px] py-2.5 border-[1.5px] border-line rounded-lg text-[14.5px] bg-white text-ink ' +
  'transition-colors duration-150 placeholder:text-muted/70 hover:border-gold/50 ' +
  'focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold-light/60';

export const selectCls = `${inputCls} select-field cursor-pointer`;

const CHIP_SELECTED = {
  good: 'bg-good text-white border-good shadow-sm',
  damaged: 'bg-damaged text-white border-damaged shadow-sm',
  pending: 'bg-pending text-white border-pending shadow-sm',
  extra: 'bg-extra text-white border-extra shadow-sm',
  scrap: 'bg-scrap text-white border-scrap shadow-sm',
  navy: 'bg-navy text-white border-navy shadow-sm',
};

export function ChipGroup({ options, value, onChange, getVariant, ariaLabel }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => {
        const selected = value === opt;
        const variant = (getVariant && getVariant(opt)) || 'navy';
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt)}
            className={[
              'px-3 py-2 rounded-full text-[12.5px] font-semibold border-[1.5px] transition-all duration-150 active:scale-[0.97]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light',
              selected
                ? CHIP_SELECTED[variant] || CHIP_SELECTED.navy
                : 'bg-white text-ink border-line hover:border-gold/60 hover:bg-cream',
            ].join(' ')}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export const labelCls = 'block text-[12.5px] font-semibold text-navy mt-2.5 mb-1';

export function Req() {
  return <span className="text-damaged" aria-hidden="true">*</span>;
}

export function Label({ children, required, htmlFor, className = '' }) {
  return (
    <label htmlFor={htmlFor} className={`${labelCls} ${className}`}>
      {children} {required && <Req />}
    </label>
  );
}

export function Card({ children, className = '', interactive = false }) {
  return (
    <div
      className={[
        'bg-paper border border-line rounded-xl p-4 mb-3.5 shadow-card',
        interactive
          ? 'transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5'
          : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export function SectionHead({ num, icon, children }) {
  return (
    <div className="flex items-center gap-2.5 mb-3.5 text-[11px] uppercase tracking-[0.1em] text-gold font-bold">
      <span className="w-7 h-7 rounded-lg bg-navy text-gold-light flex items-center justify-center flex-none">
        {icon ? icon : <span className="text-[10.5px] font-mono text-white">{num}</span>}
      </span>
      {children}
    </div>
  );
}

const BTN_VARIANTS = {
  primary: 'bg-navy text-white shadow-pop hover:bg-navy-light focus-visible:ring-gold-light',
  gold: 'bg-gold text-white shadow-gold-glow hover:bg-gold-light focus-visible:ring-gold',
  ghost: 'bg-white text-navy border-[1.5px] border-line hover:border-gold/60 hover:bg-cream focus-visible:ring-gold-light',
  subtle: 'bg-navy/5 text-navy hover:bg-navy/10 focus-visible:ring-gold-light',
  danger: 'bg-damaged text-white hover:brightness-110 focus-visible:ring-damaged',
};

export function Btn({
  variant = 'ghost',
  sm = false,
  block = false,
  loading = false,
  icon = null,
  className = '',
  children,
  disabled,
  ...props
}) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 border-0 rounded-lg font-semibold cursor-pointer font-sans select-none',
        'transition-all duration-150 active:scale-[0.97]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none',
        sm ? 'px-3 py-2 text-[12.5px]' : 'px-[18px] py-3 text-sm',
        block ? 'w-full' : '',
        BTN_VARIANTS[variant] || BTN_VARIANTS.ghost,
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <IconSpinner size={sm ? 15 : 17} /> : icon}
      {children}
    </button>
  );
}

const BADGE_VARIANTS = {
  good: 'bg-good-bg text-good',
  damaged: 'bg-damaged-bg text-damaged',
  pending: 'bg-pending-bg text-pending',
  extra: 'bg-extra-bg text-extra',
  scrap: 'bg-scrap-bg text-scrap',
  neutral: 'bg-navy/8 text-navy',
};

const DOT_COLORS = {
  good: 'bg-good',
  damaged: 'bg-damaged',
  pending: 'bg-pending',
  extra: 'bg-extra',
  scrap: 'bg-scrap',
  neutral: 'bg-navy',
};

export function Badge({ variant = 'good', dot = false, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-[0.03em] ${
        BADGE_VARIANTS[variant] || BADGE_VARIANTS.good
      }`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[variant] || DOT_COLORS.good}`} />}
      {children}
    </span>
  );
}

export function statusVariant(status) {
  if (status === 'Missing') return 'damaged';
  if (status === 'Extra Found') return 'extra';
  if (status === 'Pending Verification') return 'pending';
  if (status === 'Mixed') return 'neutral';
  return 'good';
}

export function conditionVariant(c) {
  if (c === 'Damaged' || c === 'Not Working') return 'damaged';
  if (c === 'Scrap / Not Usable') return 'scrap';
  if (c === 'Installed but Not Tested') return 'pending';
  if (c === 'Mixed') return 'neutral';
  return 'good';
}

const BANNER_TONES = {
  info: { cls: 'bg-[#EAF1F4] text-navy-light', Icon: IconInfo },
  success: { cls: 'bg-good-bg text-good', Icon: IconCheckCircle },
  error: { cls: 'bg-damaged-bg text-damaged', Icon: IconAlert },
};

export function Banner({ tone = 'info', className = '', role, children }) {
  const { cls, Icon } = BANNER_TONES[tone] || BANNER_TONES.info;
  return (
    <div role={role} className={`flex items-start gap-2.5 px-3.5 py-3 rounded-lg text-[13px] mb-3 ${cls} ${className}`}>
      <Icon size={17} className="flex-none mt-px" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-navy/5 text-navy/40 flex items-center justify-center mb-4">
        {icon || <IconBox size={26} />}
      </div>
      <h3 className="text-muted text-base mb-1.5">{title}</h3>
      {children && <div className="text-[13px] text-muted max-w-xs">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
