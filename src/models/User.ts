import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  email: string;
  fullName?: string;
  phone?: string;
  password: string;
  isVerified: boolean;
  isDeleted: boolean;
  lastLogin?: Date;
  inactivityThresholdDays: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  fullName: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  lastLogin: {
    type: Date,
  },
  inactivityThresholdDays: {
    type: Number,
    default: 30,
  },
}, {
  timestamps: true,
  collection: 'users',
});

// Indexes
userSchema.index({ isDeleted: 1 });

export const User = mongoose.model<IUser>('User', userSchema); 