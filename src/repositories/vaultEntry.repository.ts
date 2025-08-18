import { VaultEntry, IVaultEntry } from '../models/VaultEntry';
import { CreateVaultEntryRequest, UpdateVaultEntryRequest } from '../types/vault.types';

export class VaultEntryRepository {
  async create(entryData: CreateVaultEntryRequest): Promise<IVaultEntry> {
    const entry = new VaultEntry(entryData);
    return entry.save();
  }

  async findById(id: string): Promise<IVaultEntry | null> {
    return VaultEntry.findOne({ _id: id, isDeleted: false });
  }

  async findByVaultId(vaultId: string): Promise<IVaultEntry[]> {
    return VaultEntry.find({ vaultId, isDeleted: false }).sort({ createdAt: 1 });
  }

  async findByParentId(parentId: string): Promise<IVaultEntry[]> {
    return VaultEntry.find({ parentId, isDeleted: false }).sort({ createdAt: 1 });
  }

  async findAll(vaultId: string, skip: number = 0, take: number = 10): Promise<IVaultEntry[]> {
    return VaultEntry.find({ vaultId, isDeleted: false })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(take);
  }

  async update(id: string, entryData: UpdateVaultEntryRequest): Promise<IVaultEntry> {
    const entry = await VaultEntry.findByIdAndUpdate(
      id,
      { ...entryData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!entry) {
      throw new Error('Vault entry not found');
    }
    
    return entry;
  }

  async delete(id: string): Promise<IVaultEntry> {
    const entry = await VaultEntry.findByIdAndUpdate(
      id,
      { isDeleted: true, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!entry) {
      throw new Error('Vault entry not found');
    }
    
    return entry;
  }

  async count(vaultId: string): Promise<number> {
    return VaultEntry.countDocuments({ vaultId, isDeleted: false });
  }

  async exists(id: string): Promise<boolean> {
    const entry = await VaultEntry.findOne({ _id: id, isDeleted: false }).select('_id');
    return !!entry;
  }

  async restore(id: string): Promise<IVaultEntry> {
    const entry = await VaultEntry.findByIdAndUpdate(
      id,
      { isDeleted: false, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!entry) {
      throw new Error('Vault entry not found');
    }
    
    return entry;
  }

  async findByType(vaultId: string, type: string): Promise<IVaultEntry[]> {
    return VaultEntry.find({ vaultId, type, isDeleted: false }).sort({ createdAt: 1 });
  }

  async deleteByVaultId(vaultId: string): Promise<void> {
    await VaultEntry.updateMany(
      { vaultId },
      { isDeleted: true, updatedAt: new Date() }
    );
  }
}

export const vaultEntryRepository = new VaultEntryRepository(); 