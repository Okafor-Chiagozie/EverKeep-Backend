import { Vault, IVault } from '../models/Vault';
import { CreateVaultRequest, UpdateVaultRequest } from '../types/vault.types';

export class VaultRepository {
  async create(vaultData: CreateVaultRequest): Promise<IVault> {
    const vault = new Vault(vaultData);
    return vault.save();
  }

  async findById(id: string): Promise<IVault | null> {
    return Vault.findOne({ _id: id, isDeleted: false });
  }

  async findByUserId(userId: string): Promise<IVault[]> {
    return Vault.find({ userId, isDeleted: false }).sort({ createdAt: -1 });
  }

  async findAll(userId: string, skip: number = 0, take: number = 10): Promise<IVault[]> {
    return Vault.find({ userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take);
  }

  async update(id: string, vaultData: UpdateVaultRequest): Promise<IVault> {
    const vault = await Vault.findByIdAndUpdate(
      id,
      { ...vaultData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!vault) {
      throw new Error('Vault not found');
    }
    
    return vault;
  }

  async delete(id: string): Promise<IVault> {
    const vault = await Vault.findByIdAndUpdate(
      id,
      { isDeleted: true, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!vault) {
      throw new Error('Vault not found');
    }
    
    return vault;
  }

  async count(userId: string): Promise<number> {
    return Vault.countDocuments({ userId, isDeleted: false });
  }

  async exists(id: string): Promise<boolean> {
    const vault = await Vault.findOne({ _id: id, isDeleted: false }).select('_id');
    return !!vault;
  }

  async restore(id: string): Promise<IVault> {
    const vault = await Vault.findByIdAndUpdate(
      id,
      { isDeleted: false, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!vault) {
      throw new Error('Vault not found');
    }
    
    return vault;
  }

  async findActiveVaults(userId: string): Promise<IVault[]> {
    return Vault.find({ userId, isActive: true, isDeleted: false }).sort({ createdAt: -1 });
  }

  async findInactiveVaults(userId: string): Promise<IVault[]> {
    return Vault.find({ userId, isActive: false, isDeleted: false }).sort({ createdAt: -1 });
  }
}

export const vaultRepository = new VaultRepository(); 