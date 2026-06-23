import Counter from '../models/Counter.js';
import { UNIT_PREFIX } from '../constants/categories.js';

export function pad(n) {
  return String(n).padStart(4, '0');
}

export function buildCode(categoryCode, itemCode, seq) {
  return `${UNIT_PREFIX}.${categoryCode}.${itemCode}.${pad(seq)}`;
}

// Atomically reserve a BLOCK of `count` sequential numbers for a category.item
// key and return { start, end }. A single $inc by `count` is atomic, so two
// simultaneous saves can never overlap their ranges.
export async function reserveSequence(key, count = 1) {
  const n = Math.max(1, Math.floor(count));
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: n } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const end = doc.seq;
  return { start: end - n + 1, end };
}

// Peek the next start number WITHOUT reserving it (for the live UI preview).
export async function peekSequence(key) {
  const doc = await Counter.findById(key).lean();
  return (doc?.seq || 0) + 1;
}
