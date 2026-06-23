// Create or reset an admin account from the command line — handy if the
// auto-generated first-boot password was lost.
//
//   npm run set-admin -- you@example.com YourStrongPassword
//
// or set ADMIN_EMAIL / ADMIN_PASSWORD in .env and run `npm run set-admin`.

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';

dotenv.config();

const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || '';
const name = process.env.ADMIN_NAME || 'Administrator';

if (!email || !password) {
  console.error('Usage: npm run set-admin -- <email> <password>   (or set ADMIN_EMAIL / ADMIN_PASSWORD)');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

async function run() {
  await connectDB();
  const passwordHash = await User.hashPassword(password);
  const existing = await User.findOne({ email });

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = 'admin';
    existing.active = true;
    if (!existing.name) existing.name = name;
    await existing.save();
    console.log(`✅ Reset admin password for: ${email}`);
  } else {
    await User.create({ name, email, passwordHash, role: 'admin', active: true });
    console.log(`✅ Created admin: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
