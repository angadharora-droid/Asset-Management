export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
}

// YYYY-MM-DD (local-safe enough for grouping by day)
export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOffset).toISOString().slice(0, 10);
}

export function inr(value) {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return '—';
  return '₹' + n.toLocaleString('en-IN');
}

export function inrPlain(value) {
  const n = Number(value) || 0;
  return '₹' + n.toLocaleString('en-IN');
}
