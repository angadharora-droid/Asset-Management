import mongoose from 'mongoose';

// A photo is a compressed base64 image with an optional caption.
const photoSchema = new mongoose.Schema(
  {
    dataUrl: { type: String, required: true },
    caption: { type: String, default: '' },
  },
  { _id: false }
);

// A document is a bill/invoice, warranty, AMC contract, manual, etc.
// Stored inline as a base64 data URL (image or PDF).
const documentSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    type: { type: String, default: 'Other' }, // Invoice / Bill, Warranty, AMC, Manual / Datasheet, Other
    mime: { type: String, default: '' },
    size: { type: Number, default: 0 },
    dataUrl: { type: String, required: true },
  },
  { _id: false }
);

// A condition segment: a sub-range of the reserved code block sharing one
// status + condition (e.g. units 0001–0296 Good, 0297–0300 Damaged).
const segmentSchema = new mongoose.Schema(
  {
    from: { type: Number, required: true }, // absolute seq start
    to: { type: Number, required: true }, // absolute seq end
    status: { type: String, enum: ['Found', 'Missing', 'Extra Found', 'Pending Verification'], default: 'Found' },
    condition: {
      type: String,
      enum: ['Good', 'Damaged', 'Not Working', 'Installed but Not Tested', 'Scrap / Not Usable'],
      default: 'Good',
    },
    functionalityChecked: { type: String, enum: ['Not Applicable', 'Yes', 'No'], default: 'Not Applicable' },
    accepted: { type: String, enum: ['Pending', 'Yes', 'No', 'Conditional'], default: 'Pending' },
    remarks: { type: String, default: '' },
    serial: { type: String, default: '' }, // per-tag serial number (differs per physical unit)
  },
  { _id: false }
);

// One entry per status update — an audit trail of who changed what, when.
const historySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    by: { type: String, default: '' },
    note: { type: String, default: '' },
    range: { type: String, default: '' }, // code range affected, if a sub-range
    changes: [
      {
        _id: false,
        field: String,
        from: String,
        to: String,
      },
    ],
  },
  { _id: false }
);

const assetSchema = new mongoose.Schema(
  {
    // Identity (server-generated, immutable)
    code: { type: String, required: true, unique: true, index: true }, // first/start code
    codeEnd: { type: String, default: null }, // last code when a block was reserved (qty > 1)
    seqStart: { type: Number, default: null }, // numeric start of the reserved block
    seqEnd: { type: Number, default: null }, // numeric end of the reserved block
    scanId: { type: String, unique: true, sparse: true, index: true }, // unguessable token for public scan links
    category: { type: String, required: true },
    categoryCode: { type: String, required: true },
    itemCode: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },

    // What it is
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: '', trim: true },
    model: { type: String, default: '', trim: true },
    serial: { type: String, default: '', trim: true },
    size: { type: String, default: '', trim: true },
    qty: { type: Number, default: 1, min: 1, max: 100000 },
    uom: { type: String, default: 'Nos' },

    // Where
    floor: { type: String, default: '', trim: true },
    department: { type: String, required: true },
    location: { type: String, required: true, trim: true },

    // Condition & verification
    // Top-level status/condition — the single value when uniform, else 'Mixed'
    // (the per-range detail lives in `segments`).
    status: {
      type: String,
      enum: ['Found', 'Missing', 'Extra Found', 'Pending Verification', 'Mixed'],
      default: 'Found',
    },
    condition: {
      type: String,
      enum: ['Good', 'Damaged', 'Not Working', 'Installed but Not Tested', 'Scrap / Not Usable', 'Mixed'],
      default: 'Good',
    },
    expectedLocation: { type: String, default: '', trim: true },
    functionalityChecked: {
      type: String,
      enum: ['Not Applicable', 'Yes', 'No', 'Mixed'],
      default: 'Not Applicable',
    },
    remarks: { type: String, default: '', trim: true },

    // Value & classification
    estimatedValue: { type: Number, default: null, min: 0 },
    valueSource: {
      type: String,
      enum: ['Unknown', 'Invoice', 'Management Estimate', 'Vendor Estimate'],
      default: 'Unknown',
    },
    biggerThanMicrowave: {
      type: String,
      enum: ['Not Applicable', 'Yes', 'No'],
      default: 'Not Applicable',
    },
    usefulLifeOver12: {
      type: String,
      enum: ['Unknown', 'Yes', 'No'],
      default: 'Unknown',
    },
    classification: {
      type: String,
      enum: ['Pending Review', 'CAPEX', 'OPEX', 'Low Value Controlled'],
      default: 'Pending Review',
    },

    // Custody
    tempCustodian: { type: String, default: 'Handover Committee', trim: true },
    finalCustodian: { type: String, default: 'To be assigned', trim: true },
    hgaRep: { type: String, default: '', trim: true },
    cphRep: { type: String, default: '', trim: true },
    verifiedBy: { type: String, default: '', trim: true },
    accepted: {
      type: String,
      enum: ['Pending', 'Yes', 'No', 'Conditional', 'Mixed'],
      default: 'Pending',
    },

    // Who logged this entry (captured from the authenticated user).
    createdBy: { type: String, default: '' },

    // Per-range condition breakdown (always at least one segment covering the
    // whole block; multiple when a batch is split by condition).
    segments: { type: [segmentSchema], default: [] },

    // Attachments
    photos: { type: [photoSchema], default: [] }, // unlimited photos
    documents: { type: [documentSchema], default: [] }, // bills / warranty / AMC / manuals

    // Status-change audit trail
    history: { type: [historySchema], default: [] },
  },
  {
    timestamps: true, // createdAt / updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default mongoose.model('Asset', assetSchema);
