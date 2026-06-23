import Asset from '../models/Asset.js';

// GET /api/public/asset/:scanId?unit=N  — PUBLIC, read-only.
// Looked up ONLY by the unguessable scan token (never by the human code), so
// sequential asset codes can't be enumerated by unauthenticated callers.
// Returns a trimmed payload: physical + condition info for verifying a tag,
// but NOT financials, custody, audit history or document files.
export async function getPublicAsset(req, res) {
  const scanId = String(req.params.scanId || '').trim();
  if (!scanId) return res.status(404).json({ message: 'Tag not found.' });

  const asset = await Asset.findOne({ scanId }).lean();
  if (!asset) return res.status(404).json({ message: 'Tag not found.' });

  // Resolve the targeted unit (defaults to the first), validated to the range.
  let unit = asset.seqStart || null;
  const u = parseInt(req.query.unit, 10);
  if (Number.isFinite(u) && u >= (asset.seqStart || 1) && u <= (asset.seqEnd || u)) {
    unit = u;
  }

  let segment = null;
  if (unit != null && Array.isArray(asset.segments)) {
    segment = asset.segments.find((s) => unit >= s.from && unit <= s.to) || null;
  }

  // Explicit allow-list — never leak value, custody, history or documents.
  const pub = {
    code: asset.code,
    codeEnd: asset.codeEnd,
    scanId: asset.scanId,
    seqStart: asset.seqStart,
    seqEnd: asset.seqEnd,
    category: asset.category,
    categoryCode: asset.categoryCode,
    itemCode: asset.itemCode,
    name: asset.name,
    brand: asset.brand,
    model: asset.model,
    serial: asset.serial,
    size: asset.size,
    qty: asset.qty,
    uom: asset.uom,
    floor: asset.floor,
    department: asset.department,
    location: asset.location,
    status: asset.status,
    condition: asset.condition,
    functionalityChecked: asset.functionalityChecked,
    // Data-minimisation: expose at most one photo (no caption) for visual
    // verification — the rest stay behind authentication.
    photos: Array.isArray(asset.photos) && asset.photos[0]?.dataUrl
      ? [{ dataUrl: asset.photos[0].dataUrl }]
      : [],
    createdAt: asset.createdAt,
  };

  const seg = segment
    ? {
        from: segment.from,
        to: segment.to,
        status: segment.status,
        condition: segment.condition,
        functionalityChecked: segment.functionalityChecked,
        remarks: segment.remarks,
      }
    : null;

  res.json({ asset: pub, unit, segment: seg });
}
