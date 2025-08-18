import mongoose, { Document, Schema } from 'mongoose';

export interface IVaultRecipient extends Document {
  _id: string;
  vaultId: mongoose.Types.ObjectId;
  contactId: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vaultRecipientSchema = new Schema<IVaultRecipient>({
  vaultId: {
    type: Schema.Types.ObjectId,
    ref: 'Vault',
    required: true,
  },
  contactId: {
    type: Schema.Types.ObjectId,
    ref: 'Contact',
    required: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  collection: 'vault_recipients',
});

// Indexes
vaultRecipientSchema.index({ vaultId: 1 });
vaultRecipientSchema.index({ contactId: 1 });
vaultRecipientSchema.index({ isDeleted: 1 });

export const VaultRecipient = mongoose.model<IVaultRecipient>('VaultRecipient', vaultRecipientSchema); 