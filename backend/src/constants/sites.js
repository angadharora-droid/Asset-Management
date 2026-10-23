// The sites whose registers this app keeps. Each site has its own database
// (see config/siteDb.js) and its code prefixes every asset code issued there,
// e.g. CPNM.FFE.CHR.0001. CPA is the original register and keeps its database
// exactly as it was. Mirrored on the frontend, which also carries each site's
// legal entities and locations for the entry form.
export const SITES = [
  { code: 'CPA', name: 'Centre Point Amravati' },
  { code: 'CPNM', name: 'Centre Point Navi Mumbai' },
  { code: 'HCP', name: 'Centre Point Nagpur' },
  { code: 'AJD', name: 'Ajni Godown' },
  { code: 'PAB', name: 'Pablo Civil Lines' },
  { code: 'DAL', name: 'Dali' },
  { code: 'MCK', name: 'Mickys' },
  { code: 'PRS', name: 'Puro Soul' },
];

// Requests that name no site (e.g. an older cached frontend) work on this one.
export const DEFAULT_SITE = 'CPA';

export function findSite(code) {
  const c = String(code || '').trim().toUpperCase();
  return SITES.find((s) => s.code === c);
}
