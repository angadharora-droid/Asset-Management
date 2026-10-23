import mongoose from 'mongoose';
import Asset, { assetSchema } from '../models/Asset.js';
import Counter, { counterSchema } from '../models/Counter.js';
import FreedBlock, { freedBlockSchema } from '../models/FreedBlock.js';
import { DEFAULT_SITE, findSite } from '../constants/sites.js';

// Every site keeps its register (assets + code counters) in its own database.
// The default site (CPA) uses the main connection's database exactly as before;
// each other site gets a sibling database on the same connection pool, named
// "<main database>_<site code>" (e.g. cpa_asset_handover_cpnm). Users stay in
// the main database and work across all sites.
const cache = new Map();

export function siteDbName(code) {
  return `${mongoose.connection.name}_${code.toLowerCase()}`;
}

// { Asset, Counter, FreedBlock } bound to the site's database, or null for an
// unknown site code. Call only after connectDB() has resolved.
export function siteModels(code) {
  const site = findSite(code);
  if (!site) return null;
  if (!cache.has(site.code)) {
    if (site.code === DEFAULT_SITE) {
      cache.set(site.code, { Asset, Counter, FreedBlock });
    } else {
      const conn = mongoose.connection.useDb(siteDbName(site.code), { useCache: true });
      cache.set(site.code, {
        Asset: conn.model('Asset', assetSchema),
        Counter: conn.model('Counter', counterSchema),
        FreedBlock: conn.model('FreedBlock', freedBlockSchema),
      });
    }
  }
  return cache.get(site.code);
}
