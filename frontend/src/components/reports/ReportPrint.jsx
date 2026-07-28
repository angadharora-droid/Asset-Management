import { createPortal } from 'react-dom';
import { fmtDateTime } from '../../utils/format.js';

// Off-screen print surface shared by every report in the hub. Rendered against
// <body> (via a portal) so the page's scroll containers can't clip it; the
// print CSS (#report-print) reveals it only on paper. Pass the report title,
// a one-line meta summary and the printable body (usually <table>s).
export default function ReportPrint({ title, meta, children }) {
  return createPortal(
    <div id="report-print" className="hidden text-ink">
      <h2 className="font-serif text-[20px] text-navy m-0">{title}</h2>
      <div className="text-[11px] mt-1">Centre Point Amravati · Asset Handover Register</div>
      <div className="text-[10px] text-muted mt-0.5 tnum">
        Generated {fmtDateTime(new Date().toISOString())}
        {meta ? ` · ${meta}` : ''}
      </div>
      {children}
    </div>,
    document.body
  );
}
