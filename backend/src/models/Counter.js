import mongoose from 'mongoose';

// One document per "categoryCode.itemCode" key (e.g. "FFE.CHR").
// `seq` is the last number handed out, incremented atomically when a
// new asset of that type is created — this is the server-side, concurrency-safe
// replacement for the original artifact's client-side counter.
const counterSchema = new mongoose.Schema({
  _id: { type: String }, // the "CAT.ITM" key
  seq: { type: Number, default: 0 },
});

export default mongoose.model('Counter', counterSchema);
