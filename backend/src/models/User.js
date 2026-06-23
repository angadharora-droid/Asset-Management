import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Shape returned to clients — never exposes the password hash.
userSchema.methods.toSafe = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    active: this.active,
    createdAt: this.createdAt,
  };
};

userSchema.statics.hashPassword = (password) => bcrypt.hash(password, 12);

export default mongoose.model('User', userSchema);
