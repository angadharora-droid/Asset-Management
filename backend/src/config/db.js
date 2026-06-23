import mongoose from 'mongoose';

export async function connectDB() {
  const uri =
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cpa_asset_handover';

  mongoose.set('strictQuery', true);

  mongoose.connection.on('disconnected', () =>
    console.warn('⚠️  MongoDB disconnected')
  );
  mongoose.connection.on('error', (err) =>
    console.error('MongoDB error:', err.message)
  );

  await mongoose.connect(uri);
  console.log(
    `🗄️  MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`
  );
  return mongoose.connection;
}
