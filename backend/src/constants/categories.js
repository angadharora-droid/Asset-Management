// Canonical asset catalogue — kept server-side so generated codes and category
// names are authoritative (the client sends a category code, the server resolves
// the display name). This mirrors the list used on the frontend.

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

// Units that represent a count of individually taggable items. Only these get
// a reserved block of codes when qty > 1 (e.g. 12 chairs → ...0001–0012).
// Measured units (Kg, Ltr, Other) keep a single code regardless of quantity.
export const COUNTABLE_UOMS = ['Nos', 'Pair', 'Set', 'Box'];

export function findCategory(code) {
  return CATEGORIES.find((c) => c.code === code);
}
