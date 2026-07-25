import mongoose from 'mongoose';

// A block of sequence numbers released by a deleted entry, parked for reuse.
// One document per contiguous hole, keyed by the same "CAT.ITM" counter key.
// The next registration of that type whose quantity fits takes the hole
// (lowest numbers first) instead of advancing the counter.
const freedBlockSchema = new mongoose.Schema({
  key: { type: String, required: true, index: true }, // the "CAT.ITM" counter key
  from: { type: Number, required: true },
  to: { type: Number, required: true },
  size: { type: Number, required: true }, // to - from + 1, kept for $gte queries
});

export default mongoose.model('FreedBlock', freedBlockSchema);
