// Optional helper: populates the database with a few sample assets so you can
// see the register, dashboard and sign-off sheet working immediately.
//
//   npm run seed
//
// WARNING: this clears the existing Asset and Counter collections first.

import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { connectDB } from './config/db.js';
import Asset from './models/Asset.js';
import Counter from './models/Counter.js';
import { findCategory, COUNTABLE_UOMS } from './constants/categories.js';
import { reserveSequence, buildCode } from './utils/codeGenerator.js';

dotenv.config();

const SAMPLES = [
  {
    categoryCode: 'FFE', itemCode: 'CHR', name: 'Banquet Chair, Gold Velvet',
    brand: 'Durian', department: 'Banquet', location: 'Grand Ballroom', floor: '1st Floor',
    qty: 120, uom: 'Nos', status: 'Found', condition: 'Good',
    estimatedValue: 4500, valueSource: 'Invoice', usefulLifeOver12: 'Yes',
    classification: 'OPEX', verifiedBy: 'A. Sharma', accepted: 'Yes',
  },
  {
    categoryCode: 'ITE', itemCode: 'TVS', name: 'LED Television 55"',
    brand: 'Samsung', model: 'AU8000', serial: 'SN-99812', department: 'Rooms Division',
    location: 'Room 101', floor: '1st Floor', qty: 1, uom: 'Nos',
    status: 'Found', condition: 'Good', estimatedValue: 48000, valueSource: 'Invoice',
    usefulLifeOver12: 'Yes', classification: 'CAPEX', verifiedBy: 'A. Sharma', accepted: 'Yes',
  },
  {
    categoryCode: 'KIT', itemCode: 'OVN', name: 'Combi Oven, 10-tray',
    brand: 'Rational', department: 'Kitchen', location: 'Main Kitchen',
    qty: 1, uom: 'Nos', status: 'Found', condition: 'Damaged',
    remarks: 'Door gasket torn, needs replacement before use.',
    estimatedValue: 350000, valueSource: 'Management Estimate',
    usefulLifeOver12: 'Yes', classification: 'CAPEX', verifiedBy: 'R. Patil', accepted: 'Conditional',
  },
  {
    categoryCode: 'SEC', itemCode: 'CAM', name: 'Dome CCTV Camera',
    brand: 'Hikvision', department: 'Security', location: 'Lobby Entrance',
    qty: 8, uom: 'Nos', status: 'Pending Verification', condition: 'Installed but Not Tested',
    estimatedValue: 6500, valueSource: 'Vendor Estimate', usefulLifeOver12: 'Yes',
    classification: 'Low Value Controlled', verifiedBy: 'S. Khan', accepted: 'Pending',
  },
];

async function run() {
  await connectDB();

  await Asset.deleteMany({});
  await Counter.deleteMany({});
  console.log('🧹 Cleared existing assets and counters.');

  for (const s of SAMPLES) {
    const cat = findCategory(s.categoryCode);
    const n = COUNTABLE_UOMS.includes(s.uom) && (s.qty || 1) > 1 ? Math.floor(s.qty) : 1;
    const { start, end } = await reserveSequence(`${s.categoryCode}.${s.itemCode}`, n);
    const code = buildCode(s.categoryCode, s.itemCode, start);
    const codeEnd = n > 1 ? buildCode(s.categoryCode, s.itemCode, end) : null;
    const segments = [
      {
        from: start, to: end,
        status: s.status || 'Found', condition: s.condition || 'Good',
        functionalityChecked: s.functionalityChecked || 'Not Applicable',
        accepted: s.accepted || 'Pending', remarks: s.remarks || '',
      },
    ];
    await Asset.create({
      ...s, code, codeEnd, seqStart: start, seqEnd: end, segments, category: cat.name,
      scanId: crypto.randomBytes(16).toString('base64url'),
    });
    console.log(`  + ${codeEnd ? `${code}–${String(end).padStart(4, '0')}` : code}  ${s.name}`);
  }

  console.log(`✅ Seeded ${SAMPLES.length} sample assets.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
