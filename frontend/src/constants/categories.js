// Mirror of the server-side catalogue. The client uses it to drive the
// category/item dropdowns and the live code preview; the server is still the
// source of truth for the final generated code.

export const UNIT_PREFIX = 'CPA';

export const CATEGORIES = [
  { name: 'Kitchen Equipment', code: 'KIT', items: ['OVN:Oven', 'GRL:Grill/Griddle', 'FRZ:Freezer', 'FRD:Fridge', 'MIX:Mixer', 'DSH:Dishwasher', 'STV:Stove/Range', 'BLN:Blender'] },
  { name: 'Furniture, Fixtures & Equipment (FF&E)', code: 'FFE', items: ['CHR:Chair', 'TBL:Table', 'SOF:Sofa', 'BED:Bed', 'WRD:Wardrobe', 'MIR:Mirror', 'LMP:Lamp', 'CRT:Curtain', 'DSK:Desk', 'STL:Stool', 'CAB:Cabinet'] },
  { name: 'IT & Electronics', code: 'ITE', items: ['TVS:Television', 'LAP:Laptop', 'CPU:Desktop CPU', 'MON:Monitor', 'PRN:Printer', 'POS:POS Machine', 'PRJ:Projector', 'TAB:Tablet', 'RTR:Router', 'UPS:UPS Unit'] },
  { name: 'Plant & Machinery', code: 'PNM', items: ['CHL:Chiller', 'DGS:DG Set', 'HVC:HVAC Unit', 'PMP:Pump', 'BLR:Boiler', 'COM:Compressor', 'ELV:Elevator/Lift'] },
  { name: 'Engineering Equipment', code: 'ENG', items: ['TLS:Tool Set', 'LDR:Ladder', 'WLD:Welding Machine', 'DRL:Drill Machine', 'GEN:Generator'] },
  { name: 'Housekeeping Equipment', code: 'HSK', items: ['VAC:Vacuum Cleaner', 'TRL:Trolley', 'SCR:Scrubber Machine', 'MOP:Mop Set'] },
  { name: 'Laundry Equipment', code: 'LDY', items: ['WSH:Washing Machine', 'DRY:Dryer', 'IRN:Ironing Machine', 'FLD:Folding Machine', 'PRS:Press Machine'] },
  { name: 'F&B Service Equipment', code: 'FNB', items: ['CRK:Crockery Set', 'CTL:Cutlery Set', 'GLW:Glassware', 'TRY:Tray', 'CHF:Chafing Dish'] },
  { name: 'Banquet Equipment', code: 'BNQ', items: ['BCH:Banquet Chair', 'BTB:Banquet Table', 'STG:Stage Unit', 'PDM:Podium', 'SCN:Screen'] },
  { name: 'Security / CCTV / Fire Safety', code: 'SEC', items: ['CAM:CCTV Camera', 'DVR:DVR/NVR Unit', 'FEX:Fire Extinguisher', 'ALM:Alarm Panel', 'SMK:Smoke Detector'] },
  { name: 'Operating Equipment (OE)', code: 'OPE', items: ['UNF:Uniform Set', 'LIN:Linen Set', 'TWL:Towel Set'] },
  { name: 'Low Value Controlled Items', code: 'LVC', items: ['MSC:Misc Small Item'] },
  { name: 'Vehicles', code: 'VEH', items: ['CAR:Car', 'VAN:Van', 'BUS:Staff Bus', 'BIK:Bike/Scooter'] },
  { name: 'Other', code: 'OTH', items: ['OTH:Other Item'] },
];

export const SENSITIVE_CATS = ['ITE', 'SEC', 'PNM', 'ENG'];

export const DEPARTMENTS = [
  'Front Office', 'Housekeeping', 'Food & Beverage', 'Kitchen', 'Engineering',
  'Security', 'Admin / Back Office', 'Banquet', 'Spa / Recreation',
  'Rooms Division', 'Other',
];

export const UOM_OPTIONS = ['Nos', 'Set', 'Pair', 'Kg', 'Ltr', 'Box', 'Other'];

// Units counted as individually taggable items — qty > 1 reserves a block of
// codes (e.g. 12 chairs → ...0001–0012). Must match the backend list.
export const COUNTABLE_UOMS = ['Nos', 'Pair', 'Set', 'Box'];
export const STATUS_OPTIONS = ['Found', 'Missing', 'Extra Found', 'Pending Verification'];
export const CONDITION_OPTIONS = ['Good', 'Damaged', 'Not Working', 'Installed but Not Tested', 'Scrap / Not Usable'];
export const VALUE_SOURCES = ['Unknown', 'Invoice', 'Management Estimate', 'Vendor Estimate'];
export const CLASSIFICATIONS = ['Pending Review', 'CAPEX', 'OPEX', 'Low Value Controlled'];
export const ACCEPTED_OPTIONS = ['Pending', 'Yes', 'No', 'Conditional'];

export function findCategory(code) {
  return CATEGORIES.find((c) => c.code === code);
}

export function itemsForCategory(code) {
  const cat = findCategory(code);
  if (!cat) return [];
  return cat.items.map((it) => {
    const [value, label] = it.split(':');
    return { value, label };
  });
}
