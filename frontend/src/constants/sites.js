// The sites whose registers this app keeps — mirror of the server-side list
// (backend/src/constants/sites.js), plus what only the entry form needs:
//   • legalEntities — the entities that own assets at the site; listed first
//     in the "Asset of Legal Entity" dropdown, above every other entity
//   • locations     — the site's floors / blocks / areas for "Floor / Area"
// Each site has its own database; its code prefixes every asset code issued
// there (CPNM.FFE.CHR.0001). CPA is the original register.
export const SITES = [
  {
    code: 'CPA',
    name: 'Centre Point Amravati',
    legalEntities: ['Hariganga LLP', 'Amarjit Fiscal Pvt Ltd'],
    locations: [
      'Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor',
      'Fifth Floor', 'Sixth Floor', 'Terrace', 'Lawn',
    ],
    // The handover this register was built for; other sites print generic
    // outgoing / receiving roles on the sign-off sheet.
    handover: { from: 'Hariganga', to: 'CPH' },
  },
  {
    code: 'CPNM',
    name: 'Centre Point Navi Mumbai',
    legalEntities: ['Vijan Motors Pvt Ltd'],
    locations: ['Pablo', 'Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Terrace', 'Parking Area'],
  },
  {
    code: 'HCP',
    name: 'Centre Point Nagpur',
    legalEntities: ['Hotel Amarjit Pvt Ltd'],
    locations: [
      'Basement 2', 'Basement 1 – Blocks A, B, C',
      'Ground Floor – Block A', 'Ground Floor – Block B', 'Ground Floor – Block C',
      '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor', '6th Floor', '7th Floor',
    ],
  },
  {
    code: 'AJD',
    name: 'Ajni Godown',
    legalEntities: ['ATH'],
    locations: ['Staff Accommodation', 'Godown', 'Nautanki'],
  },
  {
    code: 'PAB',
    name: 'Pablo Civil Lines',
    legalEntities: ['Urban Food Outdoors'],
    locations: ['Basement', 'Ground Floor', 'First Floor', 'Terrace'],
  },
  {
    code: 'DAL',
    name: 'Dali',
    legalEntities: ['Vijan Motors Pvt Ltd'],
    locations: ['Restaurant', 'Kitchen'],
  },
  {
    code: 'MCK',
    name: 'Mickys',
    legalEntities: ['CP Foods Pvt Ltd'],
    locations: ['Factory Shed', 'Admin Block Ground Floor', 'Admin Block First Floor', 'Outdoor Area'],
  },
  {
    code: 'PRS',
    name: 'Puro Soul',
    legalEntities: ['Amarjit Fiscal Pvt Ltd'],
    locations: ['Factory Shed', 'Lab & Office Block', 'Outdoor Area and Terrace'],
  },
];

// Every legal entity across all sites, in first-seen order.
export const LEGAL_ENTITIES = [...new Set(SITES.flatMap((s) => s.legalEntities))];

export function findSite(code) {
  const c = String(code || '').trim().toUpperCase();
  return SITES.find((s) => s.code === c) || null;
}

// The dropdown order for a site: its own entities first, then all the others.
export function legalEntityGroups(site) {
  const own = site?.legalEntities || [];
  return { own, others: LEGAL_ENTITIES.filter((e) => !own.includes(e)) };
}
