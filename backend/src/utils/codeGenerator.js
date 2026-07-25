import Counter from '../models/Counter.js';
import FreedBlock from '../models/FreedBlock.js';
import Asset from '../models/Asset.js';
import { UNIT_PREFIX } from '../constants/categories.js';

export function pad(n) {
  return String(n).padStart(4, '0');
}

export function buildCode(categoryCode, itemCode, seq) {
  return `${UNIT_PREFIX}.${categoryCode}.${itemCode}.${pad(seq)}`;
}

// Atomically reserve a BLOCK of `count` sequential numbers for a category.item
// key and return { start, end }.
//
// Numbers released by deleted entries are reused first: the lowest parked hole
// big enough for the block is claimed (findOneAndDelete is atomic, so two
// simultaneous saves can never grab the same hole). Only when no hole fits does
// the tail counter advance — a single $inc, so concurrent saves never overlap.
export async function reserveSequence(key, count = 1) {
  const n = Math.max(1, Math.floor(count));

  const hole = await FreedBlock.findOneAndDelete(
    { key, size: { $gte: n } },
    { sort: { from: 1 } }
  );
  if (hole) {
    if (hole.size > n) {
      // Park the unused remainder of the hole again.
      await FreedBlock.create({ key, from: hole.from + n, to: hole.to, size: hole.size - n });
    }
    return { start: hole.from, end: hole.from + n - 1 };
  }

  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: n } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const end = doc.seq;
  return { start: end - n + 1, end };
}

// Peek the next start number WITHOUT reserving it (for the live UI preview).
// Mirrors reserveSequence: a parked hole that fits wins over the tail counter.
export async function peekSequence(key, count = 1) {
  const n = Math.max(1, Math.floor(count));
  const hole = await FreedBlock.findOne({ key, size: { $gte: n } }).sort({ from: 1 }).lean();
  if (hole) return hole.from;
  const doc = await Counter.findById(key).lean();
  return (doc?.seq || 0) + 1;
}

// Rebuild every counter and the parked holes from the assets that actually
// exist. Runs at startup so gaps left by deletions made BEFORE the reuse
// feature existed (when nothing recorded them) become reusable too, and any
// key whose entries were all deleted starts again from 0001.
export async function reconcileSequences() {
  const assets = await Asset.find()
    .select('code codeEnd seqStart seqEnd categoryCode itemCode')
    .lean();
  const numOf = (c) => parseInt(String(c || '').split('.').pop(), 10);

  const occupied = new Map(); // key -> [[from, to], ...]
  for (const a of assets) {
    const key = `${a.categoryCode}.${a.itemCode}`;
    const from = a.seqStart ?? numOf(a.code);
    const to = a.seqEnd ?? (a.codeEnd ? numOf(a.codeEnd) : from);
    if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
    if (!occupied.has(key)) occupied.set(key, []);
    occupied.get(key).push([from, to]);
  }

  // Also visit keys that only exist as counters/holes (all entries deleted).
  const keys = new Set(occupied.keys());
  for (const c of await Counter.find().select('_id').lean()) keys.add(c._id);
  for (const k of await FreedBlock.distinct('key')) keys.add(k);

  let changed = 0;
  for (const key of keys) {
    const ranges = (occupied.get(key) || []).sort((a, b) => a[0] - b[0]);
    const holes = [];
    let cursor = 1; // lowest number not known to be occupied
    let max = 0;
    for (const [from, to] of ranges) {
      if (from > cursor) holes.push([cursor, from - 1]);
      cursor = Math.max(cursor, to + 1);
      max = Math.max(max, to);
    }
    const before = await Counter.findById(key).lean();
    if ((before?.seq || 0) !== max) changed += 1;
    await Counter.updateOne({ _id: key }, { $set: { seq: max } }, { upsert: true });
    await FreedBlock.deleteMany({ key });
    if (holes.length) {
      await FreedBlock.insertMany(
        holes.map(([from, to]) => ({ key, from, to, size: to - from + 1 }))
      );
    }
  }
  if (changed) console.log(`🔢 Reconciled ${changed} code counter(s) to match the register.`);
}

// Release a deleted entry's block [from, to] so its numbers are reused.
// First merge with any parked holes touching either side. If the merged block
// ends at the counter tail, rewind the counter instead of parking — the next
// entry then starts from `from` again — and keep absorbing holes that newly
// touch the tail. Otherwise the block is parked for reserveSequence to refill.
export async function releaseSequence(key, from, to) {
  from = Math.floor(Number(from));
  to = Math.floor(Number(to));
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < from) return;

  let lo = from;
  let hi = to;
  const left = await FreedBlock.findOneAndDelete({ key, to: lo - 1 });
  if (left) lo = left.from;
  const right = await FreedBlock.findOneAndDelete({ key, from: hi + 1 });
  if (right) hi = right.to;

  // Conditional update: only rewinds when `hi` really is the tail, so a
  // concurrent reservation can never be undone.
  let rolled = await Counter.findOneAndUpdate(
    { _id: key, seq: hi },
    { $set: { seq: lo - 1 } },
    { new: true }
  );
  if (!rolled) {
    await FreedBlock.create({ key, from: lo, to: hi, size: hi - lo + 1 });
    return;
  }
  for (;;) {
    const tail = await FreedBlock.findOneAndDelete({ key, to: rolled.seq });
    if (!tail) break;
    const next = await Counter.findOneAndUpdate(
      { _id: key, seq: tail.to },
      { $set: { seq: tail.from - 1 } },
      { new: true }
    );
    if (!next) {
      // Someone reserved from the tail in between — put the hole back.
      await FreedBlock.create({ key, from: tail.from, to: tail.to, size: tail.size });
      break;
    }
    rolled = next;
  }
}
