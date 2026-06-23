// Editorial section header: gold eyebrow rule, large Fraunces title,
// supporting line and optional right-aligned actions.
export default function PageHeader({ eyebrow, title, subtitle, actions, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {eyebrow && (
            <div className="flex items-center gap-2.5 mb-2">
              <span className="gold-rule" />
              <span className="text-2xs font-bold uppercase tracking-[0.18em] text-gold">
                {eyebrow}
              </span>
            </div>
          )}
          <h1 className="font-serif text-[27px] sm:text-[32px] text-navy leading-[1.08]">{title}</h1>
          {subtitle && <p className="text-[13.5px] text-muted mt-2 max-w-xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex gap-2 flex-wrap items-center">{actions}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
      <div className="mt-4 h-px bg-gradient-to-r from-line via-line to-transparent" />
    </div>
  );
}
