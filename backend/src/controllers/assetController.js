import crypto from 'crypto';
import Asset from '../models/Asset.js';
import { findCategory, COUNTABLE_UOMS } from '../constants/categories.js';
import { reserveSequence, peekSequence, buildCode, pad } from '../utils/codeGenerator.js';

// Unguessable token used in public scan links (so codes can't be enumerated).
export const newScanId = () => crypto.randomBytes(16).toString('base64url');

// Backfill scanIds for any assets created before this feature.
export async function ensureScanIds() {
  const missing = await Asset.find({
    $or: [{ scanId: { $exists: false } }, { scanId: null }, { scanId: '' }],
  }).select('_id');
  for (const doc of missing) {
    await Asset.updateOne({ _id: doc._id }, { $set: { scanId: newScanId() } });
  }
  if (missing.length) console.log(`🔖 Backfilled scan tokens for ${missing.length} asset(s).`);
}

const CONDITION_VALUES = ['Good', 'Damaged', 'Not Working', 'Installed but Not Tested', 'Scrap / Not Usable'];
const STATUS_VALUES = ['Found', 'Missing', 'Extra Found', 'Pending Verification'];
const FUNC_VALUES = ['Not Applicable', 'Yes', 'No'];
const ACCEPTED_VALUES = ['Pending', 'Yes', 'No', 'Conditional'];

// Resource limits to prevent abuse (large code blocks / oversized inline blobs).
const MAX_QTY = 10000;
const MAX_PHOTOS = 24;
const MAX_DOCS = 24;
const MAX_DATAURL_LEN = 7_000_000; // ~5 MB decoded per attachment

// Validate inline attachments: array sizes, per-item size, and data-URL type.
function attachmentError(data) {
  if (data.photos !== undefined) {
    if (!Array.isArray(data.photos)) return 'Photos must be a list.';
    if (data.photos.length > MAX_PHOTOS) return `Too many photos (max ${MAX_PHOTOS}).`;
    for (const p of data.photos) {
      if (!p || typeof p.dataUrl !== 'string' || !p.dataUrl.startsWith('data:image/')) {
        return 'Each photo must be an image.';
      }
      if (p.dataUrl.length > MAX_DATAURL_LEN) return 'A photo is too large.';
    }
  }
  if (data.documents !== undefined) {
    if (!Array.isArray(data.documents)) return 'Documents must be a list.';
    if (data.documents.length > MAX_DOCS) return `Too many documents (max ${MAX_DOCS}).`;
    for (const d of data.documents) {
      if (!d || typeof d.dataUrl !== 'string') return 'Invalid document.';
      if (!/^data:(image\/|application\/pdf)/.test(d.dataUrl)) return 'Documents must be an image or PDF.';
      if (d.dataUrl.length > MAX_DATAURL_LEN) return 'A document is too large.';
    }
  }
  return null;
}

// Human-readable code range for an asset sub-range, e.g. CPA.BNQ.BCH.0297–0300.
function rangeStr(asset, from, to) {
  const startCode = buildCode(asset.categoryCode, asset.itemCode, from);
  return from === to ? startCode : `${startCode}–${pad(to)}`;
}

// Collapse a list of segments to a single top-level value, or 'Mixed'.
function deriveTop(segments, field) {
  const set = [...new Set(segments.map((s) => s[field]))];
  return set.length === 1 ? set[0] : 'Mixed';
}

// Merge adjacent segments that are contiguous and identical, so splitting out
// a single unit (and later reverting it) doesn't fragment the breakdown.
function coalesce(segments) {
  const sorted = [...segments].sort((a, b) => a.from - b.from);
  const out = [];
  for (const s of sorted) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.to + 1 === s.from &&
      prev.status === s.status &&
      prev.condition === s.condition &&
      prev.functionalityChecked === s.functionalityChecked &&
      prev.accepted === s.accepted &&
      (prev.remarks || '') === (s.remarks || '') &&
      (prev.serial || '') === (s.serial || '')
    ) {
      prev.to = s.to;
    } else {
      out.push({
        from: s.from, to: s.to,
        status: s.status, condition: s.condition,
        functionalityChecked: s.functionalityChecked, accepted: s.accepted,
        remarks: s.remarks || '',
        serial: s.serial || '',
      });
    }
  }
  return out;
}

// How many sequential codes an entry consumes: one per unit for countable
// units (Nos/Pair/Set/Box) when qty > 1, otherwise a single code.
function blockCount(qty, uom) {
  const n = Math.max(1, Math.floor(Number(qty) || 1));
  return COUNTABLE_UOMS.includes(uom) && n > 1 ? n : 1;
}

// Fields a client is allowed to set/update. `code`, `category`, `categoryCode`,
// `itemCode` and timestamps are controlled by the server.
const WRITABLE = [
  'name', 'brand', 'model', 'serial', 'size', 'qty', 'uom',
  'floor', 'department', 'location',
  'status', 'condition', 'expectedLocation', 'functionalityChecked', 'remarks',
  'estimatedValue', 'valueSource', 'biggerThanMicrowave', 'usefulLifeOver12', 'classification',
  'tempCustodian', 'finalCustodian', 'hgaRep', 'cphRep', 'verifiedBy', 'accepted',
  'photos', 'documents',
];

function pick(body, keys) {
  const out = {};
  for (const k of keys) if (body[k] !== undefined) out[k] = body[k];
  return out;
}

function normalizeNumbers(obj) {
  if (obj.estimatedValue === '' || obj.estimatedValue === null || obj.estimatedValue === undefined) {
    obj.estimatedValue = null;
  } else {
    obj.estimatedValue = Number(obj.estimatedValue);
  }
  if (obj.qty !== undefined) obj.qty = Number(obj.qty) || 1;
  return obj;
}

// Shared business rules — also enforced on the client, repeated here so the
// API is safe regardless of who calls it.
function validateBusinessRules(data) {
  if (data.status === 'Missing' && !String(data.expectedLocation || '').trim()) {
    return 'Expected Location is required when status is "Missing".';
  }
  if (data.condition === 'Damaged' && !String(data.remarks || '').trim()) {
    return 'Remarks are required when condition is "Damaged".';
  }
  if (data.condition === 'Damaged' && (!Array.isArray(data.photos) || data.photos.length === 0)) {
    return 'At least one photo is required when condition is "Damaged".';
  }
  return null;
}

// GET /api/assets  — full register, oldest first (matches the original ordering)
export async function listAssets(req, res) {
  const assets = await Asset.find().sort({ createdAt: 1 }).lean();
  res.json(assets);
}

// GET /api/assets/:code
export async function getAsset(req, res) {
  const asset = await Asset.findOne({ code: req.params.code }).lean();
  if (!asset) return res.status(404).json({ message: 'Asset not found' });
  res.json(asset);
}

// GET /api/assets/meta/next-code?categoryCode=FFE&itemCode=CHR  — preview only
export async function nextCode(req, res) {
  const categoryCode = String(req.query.categoryCode || '').toUpperCase();
  const itemCode = String(req.query.itemCode || '').toUpperCase();

  if (!findCategory(categoryCode) || !/^[A-Z]{3}$/.test(itemCode)) {
    return res.status(400).json({ message: 'A valid categoryCode and 3-letter itemCode are required.' });
  }
  const count = Math.max(1, Math.floor(Number(req.query.count) || 1));
  const start = await peekSequence(`${categoryCode}.${itemCode}`);
  const end = start + count - 1;
  res.json({
    code: buildCode(categoryCode, itemCode, start),
    codeEnd: count > 1 ? buildCode(categoryCode, itemCode, end) : null,
    preview: true,
  });
}

// POST /api/assets
export async function createAsset(req, res) {
  const body = req.body || {};
  const categoryCode = String(body.categoryCode || '').toUpperCase();
  const itemCode = String(body.itemCode || '').toUpperCase();

  const cat = findCategory(categoryCode);
  if (!cat) return res.status(400).json({ message: 'Please select a valid Asset Category.' });
  if (!/^[A-Z]{3}$/.test(itemCode)) {
    return res.status(400).json({ message: 'Item Type Code must be exactly 3 letters (e.g. CHR).' });
  }

  const data = normalizeNumbers(pick(body, WRITABLE));

  if (!String(data.name || '').trim()) return res.status(400).json({ message: 'Asset Name / Description is required.' });
  if (!data.department) return res.status(400).json({ message: 'Department / Area is required.' });
  if (!String(data.location || '').trim()) return res.status(400).json({ message: 'Exact Location is required.' });
  if (Number(data.qty) > MAX_QTY) {
    return res.status(400).json({ message: `Quantity is too large (max ${MAX_QTY}).` });
  }
  const attachErr = attachmentError(data);
  if (attachErr) return res.status(400).json({ message: attachErr });

  // Reserve a unique sequential block atomically (one code per countable unit).
  const count = blockCount(data.qty, data.uom);
  const { start, end } = await reserveSequence(`${categoryCode}.${itemCode}`, count);
  const code = buildCode(categoryCode, itemCode, start);
  const codeEnd = count > 1 ? buildCode(categoryCode, itemCode, end) : null;

  // Build the verification breakdown (segments). A client may send `breakdown`
  // = [{qty, status, condition, functionalityChecked, remarks}] that must add up
  // to the block count; otherwise the whole block is one segment.
  let segments;
  const breakdown = Array.isArray(body.breakdown) ? body.breakdown : null;
  if (breakdown && count > 1) {
    const items = breakdown
      .map((b) => ({
        qty: Math.max(0, Math.floor(Number(b.qty) || 0)),
        status: String(b.status || 'Found'),
        condition: String(b.condition || '').trim(),
        functionalityChecked: String(b.functionalityChecked || 'Not Applicable'),
        remarks: String(b.remarks || '').trim(),
      }))
      .filter((b) => b.qty > 0);
    if (!items.length) return res.status(400).json({ message: 'Add at least one group.' });
    for (const it of items) {
      if (!CONDITION_VALUES.includes(it.condition)) {
        return res.status(400).json({ message: `Invalid condition "${it.condition}" in the breakdown.` });
      }
      if (!STATUS_VALUES.includes(it.status)) {
        return res.status(400).json({ message: `Invalid status "${it.status}" in the breakdown.` });
      }
      if (!FUNC_VALUES.includes(it.functionalityChecked)) {
        return res.status(400).json({ message: `Invalid functionality value "${it.functionalityChecked}" in the breakdown.` });
      }
    }
    const sum = items.reduce((s, b) => s + b.qty, 0);
    if (sum !== count) {
      return res.status(400).json({ message: `The breakdown (${sum}) must add up to the quantity (${count}).` });
    }
    let cursor = start;
    segments = items.map((it) => {
      const segFrom = cursor;
      const segTo = cursor + it.qty - 1;
      cursor = segTo + 1;
      return {
        from: segFrom, to: segTo,
        status: it.status, condition: it.condition,
        functionalityChecked: it.functionalityChecked,
        accepted: 'Pending', remarks: it.remarks,
      };
    });
  } else {
    segments = [{
      from: start, to: end,
      status: data.status || 'Found',
      condition: data.condition || 'Good',
      functionalityChecked: data.functionalityChecked || 'Not Applicable',
      accepted: data.accepted || 'Pending',
      remarks: String(data.remarks || '').trim(),
    }];
  }

  // Cross-segment business rules.
  if (segments.some((s) => s.status === 'Missing') && !String(data.expectedLocation || '').trim()) {
    return res.status(400).json({ message: 'Expected Location is required when any unit is Missing.' });
  }
  const anyDamaged = segments.some((s) => s.condition === 'Damaged');
  if (anyDamaged && (!Array.isArray(data.photos) || data.photos.length === 0)) {
    return res.status(400).json({ message: 'At least one photo is required when any unit is Damaged.' });
  }
  if (segments.some((s) => s.condition === 'Damaged' && !s.remarks) && !String(data.remarks || '').trim()) {
    return res.status(400).json({ message: 'Remarks are required for each Damaged group.' });
  }

  data.status = deriveTop(segments, 'status');
  data.condition = deriveTop(segments, 'condition');
  data.functionalityChecked = deriveTop(segments, 'functionalityChecked');
  data.accepted = deriveTop(segments, 'accepted');

  const asset = await Asset.create({
    ...data,
    code,
    codeEnd,
    seqStart: start,
    seqEnd: end,
    segments,
    categoryCode,
    itemCode,
    category: cat.name,
    createdBy: req.user?.name || '',
    scanId: newScanId(),
  });

  res.status(201).json(asset);
}

// PUT /api/assets/:code  — edit an existing asset (identity stays fixed)
export async function updateAsset(req, res) {
  const data = normalizeNumbers(pick(req.body || {}, WRITABLE));
  // Quantity is fixed once a code block is reserved — changing it would
  // desync the range, so it can't be edited after creation.
  delete data.qty;

  const attachErr = attachmentError(data);
  if (attachErr) return res.status(400).json({ message: attachErr });

  const existing = await Asset.findOne({ code: req.params.code });
  if (!existing) return res.status(404).json({ message: 'Asset not found' });

  const merged = { ...existing.toObject(), ...data };
  const ruleError = validateBusinessRules(merged);
  if (ruleError) return res.status(400).json({ message: ruleError });

  Object.assign(existing, data);
  // Acceptance set from the whole-asset edit applies to every sub-range.
  if (data.accepted !== undefined && Array.isArray(existing.segments) && existing.segments.length) {
    existing.segments.forEach((s) => {
      s.accepted = data.accepted;
    });
    existing.markModified('segments');
  }
  await existing.save();
  res.json(existing);
}

// PATCH /api/assets/:code/status — update live state and log the change.
// Targets, in priority order:
//   • body.unit         → a single tag number (splits its segment out)
//   • body.segmentIndex → an existing sub-range segment
//   • neither           → legacy assets with no segments (asset-level)
// status / condition / functionalityChecked / accepted are all per-range.
const STATUS_FIELDS = ['status', 'condition', 'functionalityChecked', 'accepted'];

export async function updateStatus(req, res) {
  const asset = await Asset.findOne({ code: req.params.code });
  if (!asset) return res.status(404).json({ message: 'Asset not found' });

  const body = req.body || {};

  // Reject any out-of-vocabulary status value before touching segments.
  const ALLOWED = { status: STATUS_VALUES, condition: CONDITION_VALUES, functionalityChecked: FUNC_VALUES, accepted: ACCEPTED_VALUES };
  for (const f of STATUS_FIELDS) {
    if (body[f] !== undefined && !ALLOWED[f].includes(body[f])) {
      return res.status(400).json({ message: `Invalid value for ${f}.` });
    }
  }

  const noPhotos = !Array.isArray(asset.photos) || asset.photos.length === 0;
  if (body.condition === 'Damaged' && noPhotos) {
    return res.status(400).json({
      message: 'At least one photo is required to mark a unit Damaged — add one from the entry first.',
    });
  }

  const changes = [];
  let range = '';
  const applyTo = (obj) => {
    for (const f of STATUS_FIELDS) {
      if (body[f] === undefined || body[f] === obj[f]) continue;
      changes.push({ field: f, from: String(obj[f] ?? ''), to: String(body[f]) });
      obj[f] = body[f];
    }
  };

  const hasSegments = Array.isArray(asset.segments) && asset.segments.length > 0;

  if (hasSegments) {
    // Work on plain objects, then write back.
    let segs = asset.segments.map((s) => ({
      from: s.from, to: s.to,
      status: s.status, condition: s.condition,
      functionalityChecked: s.functionalityChecked, accepted: s.accepted,
      remarks: s.remarks || '',
      serial: s.serial || '',
    }));

    if (body.unit !== undefined && body.unit !== null) {
      // Update a single tag number — split its containing segment.
      const n = Math.floor(Number(body.unit));
      const lo = asset.seqStart ?? segs[0].from;
      const hi = asset.seqEnd ?? segs[segs.length - 1].to;
      if (!Number.isFinite(n) || n < lo || n > hi) {
        return res.status(400).json({ message: 'That tag number is not part of this asset.' });
      }
      const idx = segs.findIndex((s) => n >= s.from && n <= s.to);
      if (idx === -1) return res.status(400).json({ message: 'Could not locate that unit.' });
      const seg = segs[idx];
      const unitSeg = { ...seg, from: n, to: n };
      applyTo(unitSeg);
      range = rangeStr(asset, n, n);
      const pieces = [];
      if (seg.from <= n - 1) pieces.push({ ...seg, to: n - 1 });
      pieces.push(unitSeg);
      if (n + 1 <= seg.to) pieces.push({ ...seg, from: n + 1 });
      segs.splice(idx, 1, ...pieces);
    } else {
      const i = body.segmentIndex == null ? 0 : Number(body.segmentIndex);
      const seg = segs[i];
      if (!seg) return res.status(400).json({ message: 'Invalid sub-range selected.' });
      range = rangeStr(asset, seg.from, seg.to);
      applyTo(seg);
    }

    const note = String(body.note || '').trim();
    if (!changes.length && !note) {
      return res.status(400).json({ message: 'No changes to save — adjust a field or add a note.' });
    }

    segs = coalesce(segs);
    asset.segments = segs;
    asset.markModified('segments');
    asset.status = deriveTop(segs, 'status');
    asset.condition = deriveTop(segs, 'condition');
    asset.functionalityChecked = deriveTop(segs, 'functionalityChecked');
    asset.accepted = deriveTop(segs, 'accepted');
    asset.history.push({ by: req.user?.name || '—', note, range, changes });
    await asset.save();
    return res.json(asset);
  }

  // Legacy assets with no segments — apply at the asset level.
  applyTo(asset);
  const note = String(body.note || '').trim();
  if (!changes.length && !note) {
    return res.status(400).json({ message: 'No changes to save — adjust a field or add a note.' });
  }
  asset.history.push({ by: req.user?.name || '—', note, range, changes });
  await asset.save();
  res.json(asset);
}

// PATCH /api/assets/:code/tag — edit a SINGLE tag's descriptive details
// (per-unit serial number + remarks). Splits the unit out of its segment, like
// the status update, and logs the change. Status/condition are NOT touched here.
export async function updateTagDetails(req, res) {
  const asset = await Asset.findOne({ code: req.params.code });
  if (!asset) return res.status(404).json({ message: 'Asset not found' });

  const body = req.body || {};
  const hasSegments = Array.isArray(asset.segments) && asset.segments.length > 0;

  const lo = asset.seqStart ?? (hasSegments ? asset.segments[0].from : 1);
  const hi = asset.seqEnd ?? (hasSegments ? asset.segments[asset.segments.length - 1].to : lo);

  // Target unit: an explicit tag number, else the whole single-unit asset.
  let n;
  if (body.unit !== undefined && body.unit !== null) {
    n = Math.floor(Number(body.unit));
    if (!Number.isFinite(n) || n < lo || n > hi) {
      return res.status(400).json({ message: 'That tag number is not part of this asset.' });
    }
  } else {
    n = lo;
  }

  const wantSerial = body.serial !== undefined;
  const wantRemarks = body.remarks !== undefined;
  if (!wantSerial && !wantRemarks) {
    return res.status(400).json({ message: 'Nothing to update.' });
  }
  const newSerial = String(body.serial ?? '').trim();
  const newRemarks = String(body.remarks ?? '').trim();

  // Working copy. Backfill each segment's serial from the legacy asset-level
  // serial so an un-edited tag keeps its original number after a split.
  let segs = hasSegments
    ? asset.segments.map((s) => ({
        from: s.from, to: s.to,
        status: s.status, condition: s.condition,
        functionalityChecked: s.functionalityChecked, accepted: s.accepted,
        remarks: s.remarks || '',
        serial: s.serial || asset.serial || '',
      }))
    : [{
        from: lo, to: hi,
        status: asset.status, condition: asset.condition,
        functionalityChecked: asset.functionalityChecked, accepted: asset.accepted,
        remarks: asset.remarks || '',
        serial: asset.serial || '',
      }];

  const idx = segs.findIndex((s) => n >= s.from && n <= s.to);
  if (idx === -1) return res.status(400).json({ message: 'Could not locate that unit.' });
  const seg = segs[idx];
  const unitSeg = { ...seg, from: n, to: n };

  const changes = [];
  if (wantSerial && newSerial !== (seg.serial || '')) {
    changes.push({ field: 'serial', from: String(seg.serial || ''), to: newSerial });
    unitSeg.serial = newSerial;
  }
  if (wantRemarks && newRemarks !== (seg.remarks || '')) {
    changes.push({ field: 'remarks', from: String(seg.remarks || ''), to: newRemarks });
    unitSeg.remarks = newRemarks;
  }
  if (!changes.length) {
    return res.status(400).json({ message: 'No changes to save.' });
  }

  const pieces = [];
  if (seg.from <= n - 1) pieces.push({ ...seg, to: n - 1 });
  pieces.push(unitSeg);
  if (n + 1 <= seg.to) pieces.push({ ...seg, from: n + 1 });
  segs.splice(idx, 1, ...pieces);

  segs = coalesce(segs);
  asset.segments = segs;
  asset.markModified('segments');

  // Keep the asset-level serial as a representative value only when every unit
  // shares the same non-empty serial.
  const distinct = [...new Set(segs.map((s) => s.serial || ''))];
  if (distinct.length === 1 && distinct[0] !== '') asset.serial = distinct[0];

  const range = rangeStr(asset, n, n);
  asset.history.push({ by: req.user?.name || '—', note: String(body.note || '').trim(), range, changes });
  await asset.save();
  res.json(asset);
}

// DELETE /api/assets/:code
export async function deleteAsset(req, res) {
  const asset = await Asset.findOneAndDelete({ code: req.params.code });
  if (!asset) return res.status(404).json({ message: 'Asset not found' });
  res.json({ message: 'Deleted', code: req.params.code });
}
