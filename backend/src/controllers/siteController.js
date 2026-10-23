import { SITES } from '../constants/sites.js';
import { siteModels } from '../config/siteDb.js';

// GET /api/sites — every site with the number of entries in its register, for
// the site picker. A site whose database can't be read reports count: null
// rather than failing the whole list.
export async function listSites(req, res) {
  const sites = await Promise.all(
    SITES.map(async (s) => {
      let count = null;
      try {
        count = await siteModels(s.code).Asset.estimatedDocumentCount();
      } catch (err) {
        console.error(`Could not count assets for ${s.code}:`, err.message);
      }
      return { code: s.code, name: s.name, count };
    })
  );
  res.json(sites);
}
