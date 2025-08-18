import mongoose, { Document, Schema } from 'mongoose';

export interface IVault extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string | null;
  isActive: boolean;
  deadmanTrigger?: Date;
  encryptionKey?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vaultSchema = new Schema<IVault>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  deadmanTrigger: {
    type: Date,
  },
  encryptionKey: {
    type: String,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  collection: 'vaults',
});

// Indexes
vaultSchema.index({ userId: 1 });
vaultSchema.index({ isDeleted: 1 });
vaultSchema.index({ isActive: 1 });

export const Vault = mongoose.model<IVault>('Vault', vaultSchema); 