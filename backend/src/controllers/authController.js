import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken } from '../utils/jwt.js';

const MIN_PASSWORD = 8;

// A valid bcrypt hash to compare against when an email isn't found, so a failed
// login takes the same time whether or not the account exists (no timing enum).
const DUMMY_HASH = bcrypt.hashSync('unused-placeholder-password', 12);

// POST /api/auth/login
export async function login(req, res) {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  const user = await User.findOne({ email });
  const ok = user ? await user.verifyPassword(password) : await bcrypt.compare(password, DUMMY_HASH);
  // Uniform response whether the user is missing or the password is wrong.
  if (!user || !ok) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  if (!user.active) {
    return res.status(403).json({ message: 'This account has been disabled.' });
  }
  res.json({ token: signToken(user), user: user.toSafe() });
}

// GET /api/auth/me
export async function me(req, res) {
  res.json({ user: req.user.toSafe() });
}

// GET /api/auth/users  (admin)
export async function listUsers(req, res) {
  const users = await User.find().sort({ createdAt: 1 });
  res.json(users.map((u) => u.toSafe()));
}

// POST /api/auth/users  (admin)
export async function createUser(req, res) {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  const role = req.body.role === 'admin' ? 'admin' : 'member';

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }
  if (password.length < MIN_PASSWORD) {
    return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters.` });
  }
  if (await User.findOne({ email })) {
    return res.status(409).json({ message: 'A user with this email already exists.' });
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash, role });
  res.status(201).json(user.toSafe());
}

// PATCH /api/auth/users/:id  (admin)
export async function updateUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const body = req.body || {};
  const isSelf = String(user._id) === String(req.user._id);

  // Guard against an admin locking themselves out.
  if (isSelf && body.active === false) {
    return res.status(400).json({ message: "You can't disable your own account." });
  }
  if (isSelf && body.role && body.role !== 'admin') {
    return res.status(400).json({ message: "You can't remove your own admin role." });
  }

  // Keep at least one active admin in the system.
  const willDemote = body.role !== undefined && body.role !== 'admin' && user.role === 'admin';
  const willDisable = body.active === false && user.active && user.role === 'admin';
  if (willDemote || willDisable) {
    const activeAdmins = await User.countDocuments({ role: 'admin', active: true });
    if (activeAdmins <= 1) {
      return res.status(400).json({ message: 'At least one active admin must remain.' });
    }
  }

  if (body.name !== undefined) user.name = String(body.name).trim() || user.name;
  if (body.role !== undefined) user.role = body.role === 'admin' ? 'admin' : 'member';
  if (body.active !== undefined) user.active = !!body.active;
  if (body.password) {
    if (String(body.password).length < MIN_PASSWORD) {
      return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters.` });
    }
    user.passwordHash = await User.hashPassword(String(body.password));
  }

  await user.save();

  // Re-check after the write to close the read-modify-write race window: if a
  // concurrent change left zero active admins, revert this one.
  if (willDemote || willDisable) {
    const remaining = await User.countDocuments({ role: 'admin', active: true });
    if (remaining < 1) {
      user.role = 'admin';
      user.active = true;
      await user.save();
      return res.status(409).json({ message: 'At least one active admin must remain.' });
    }
  }

  res.json(user.toSafe());
}

// Create a first admin on startup if the database has no users yet.
// If ADMIN_PASSWORD isn't provided, a strong random one is generated and printed
// once — there is no well-known default password.
export async function ensureAdminUser() {
  const count = await User.countDocuments();
  if (count > 0) return;

  const name = process.env.ADMIN_NAME || 'Administrator';
  const email = (process.env.ADMIN_EMAIL || 'admin@centrepoint.local').toLowerCase();
  const generated = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
  const passwordHash = await User.hashPassword(password);
  await User.create({ name, email, passwordHash, role: 'admin' });

  if (generated) {
    console.log(
      `\n🔑 First admin created: ${email}\n   Temporary password (shown once): ${password}\n   Log in and change it immediately.\n`
    );
  } else {
    console.log(`👤 First admin created: ${email} (using ADMIN_PASSWORD from env).`);
  }
}
