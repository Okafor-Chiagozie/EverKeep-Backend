export interface Vault {
  _id: string;
  userId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  deadmanTrigger?: Date | null;
  encryptionKey?: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVaultRequest {
  userId: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  deadmanTrigger?: Date;
  encryptionKey?: string;
}

export interface UpdateVaultRequest {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  deadmanTrigger?: Date;
  encryptionKey?: string;
}

export interface VaultEntry {
  _id: string;
  vaultId: string;
  type: string;
  content: string;
  parentId?: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVaultEntryRequest {
  vaultId: string;
  type: string;
  content: string;
  parentId?: string;
}

export interface UpdateVaultEntryRequest {
  type?: string;
  content?: string;
  parentId?: string;
}

export interface VaultRecipient {
  _id: string;
  vaultId: string;
  contactId: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
} 