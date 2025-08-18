import mongoose, { Document, Schema } from 'mongoose';

export interface IVaultEntry extends Document {
  _id: string;
  vaultId: mongoose.Types.ObjectId;
  type: string; // 'text', 'image', 'video', 'audio', 'document'
  content: string;
  parentId?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vaultEntrySchema = new Schema<IVaultEntry>({
  vaultId: {
    type: Schema.Types.ObjectId,
    ref: 'Vault',
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'image', 'video', 'audio', 'document'],
  },
  content: {
    type: String,
    required: true,
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'VaultEntry',
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  collection: 'vault_entries',
});

// Indexes
vaultEntrySchema.index({ vaultId: 1 });
vaultEntrySchema.index({ parentId: 1 });
vaultEntrySchema.index({ isDeleted: 1 });
vaultEntrySchema.index({ type: 1 });

export const VaultEntry = mongoose.model<IVaultEntry>('VaultEntry', vaultEntrySchema); 