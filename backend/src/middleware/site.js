import { DEFAULT_SITE, findSite } from '../constants/sites.js';
import { siteModels } from '../config/siteDb.js';

// Resolve which site's register a request works on from the X-Site header and
// attach req.site + req.models ({ Asset, Counter, FreedBlock } for that site).
// A request without the header stays on the default site, so older clients
// keep working on the CPA register.
export function withSite(req, res, next) {
  const site = findSite(req.get('x-site') || DEFAULT_SITE);
  if (!site) return res.status(400).json({ message: 'Unknown site.' });
  req.site = site;
  req.models = siteModels(site.code);
  next();
}
