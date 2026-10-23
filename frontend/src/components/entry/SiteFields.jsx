import { useEffect, useState } from 'react';
import { legalEntityGroups } from '../../constants/sites.js';
import { inputCls, selectCls } from '../ui.jsx';

const OTHER = '__other__';

// "Asset of Legal Entity" — every legal entity, with the open site's own
// entities always listed first. A value recorded before legal entities existed
// (older CPA entries say "Centre Point" / "Hariganga") stays selectable, so
// editing such an entry never silently changes its owner.
export function LegalEntitySelect({ id, site, value, onChange }) {
  const { own, others } = legalEntityGroups(site);
  const legacy = !!value && !own.includes(value) && !others.includes(value);
  return (
    <select id={id} className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select…</option>
      <optgroup label={`${site.name} (${site.code})`}>
        {own.map((e) => <option key={e}>{e}</option>)}
      </optgroup>
      <optgroup label="Other legal entities">
        {others.map((e) => <option key={e}>{e}</option>)}
      </optgroup>
      {legacy && (
        <optgroup label="Recorded earlier">
          <option>{value}</option>
        </optgroup>
      )}
    </select>
  );
}

// "Floor / Area" — the open site's location list, plus "Other" to type a spot
// that isn't listed. Values typed before the list existed open in "Other" with
// their text intact.
export function SiteLocationSelect({ id, site, value, onChange }) {
  const listed = site.locations.includes(value);
  const [other, setOther] = useState(false);
  useEffect(() => {
    if (listed) setOther(false);
  }, [listed]);
  const custom = other || (!!value && !listed);

  return (
    <>
      <select
        id={id}
        className={selectCls}
        value={custom ? OTHER : value}
        onChange={(e) => {
          const v = e.target.value;
          setOther(v === OTHER);
          onChange(v === OTHER ? '' : v);
        }}
      >
        <option value="">Select…</option>
        {site.locations.map((l) => <option key={l}>{l}</option>)}
        <option value={OTHER}>Other — type it…</option>
      </select>
      {custom && (
        <input
          className={`${inputCls} mt-2`}
          placeholder="Type the floor / area"
          aria-label="Floor / area (not in the list)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </>
  );
}
