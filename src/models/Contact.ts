import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  phone?: string;
  relationship?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  relationship: {
    type: String,
    trim: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  collection: 'contacts',
});

// Indexes
contactSchema.index({ userId: 1, email: 1 }, { unique: true });

export const Contact = mongoose.model<IContact>('Contact', contactSchema); 