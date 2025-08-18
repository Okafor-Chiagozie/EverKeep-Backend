import { VaultRecipient, IVaultRecipient } from '../models/VaultRecipient';
import { Contact, IContact } from '../models/Contact';

export class VaultRecipientRepository {
  async create(vaultId: string, contactId: string): Promise<IVaultRecipient> {
    const recipient = new VaultRecipient({
      vaultId,
      contactId,
    });
    return recipient.save();
  }

  async findById(id: string): Promise<IVaultRecipient | null> {
    return VaultRecipient.findOne({ _id: id, isDeleted: false });
  }

  async findByVaultId(vaultId: string): Promise<IVaultRecipient[]> {
    return VaultRecipient.find({ vaultId, isDeleted: false });
  }

  async findByContactId(contactId: string): Promise<IVaultRecipient[]> {
    return VaultRecipient.find({ contactId, isDeleted: false });
  }

  async findWithContact(vaultId: string): Promise<any[]> {
    const recipients = await VaultRecipient.find({ vaultId, isDeleted: false });
    const recipientsWithContacts = await Promise.all(
      recipients.map(async (recipient) => {
        const contact = await Contact.findById(recipient.contactId);
        return { ...recipient.toObject(), contact: contact as IContact };
      })
    );
    return recipientsWithContacts;
  }

  async findByVaultAndContact(vaultId: string, contactId: string): Promise<IVaultRecipient | null> {
    return VaultRecipient.findOne({ vaultId, contactId, isDeleted: false });
  }

  async update(id: string, updateData: Partial<IVaultRecipient>): Promise<IVaultRecipient> {
    const recipient = await VaultRecipient.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!recipient) {
      throw new Error('Vault recipient not found');
    }
    
    return recipient;
  }

  async delete(id: string): Promise<IVaultRecipient> {
    const recipient = await VaultRecipient.findByIdAndUpdate(
      id,
      { isDeleted: true, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!recipient) {
      throw new Error('Vault recipient not found');
    }
    
    return recipient;
  }

  async count(vaultId: string): Promise<number> {
    return VaultRecipient.countDocuments({ vaultId, isDeleted: false });
  }

  async exists(id: string): Promise<boolean> {
    const recipient = await VaultRecipient.findOne({ _id: id, isDeleted: false }).select('_id');
    return !!recipient;
  }

  async restore(id: string): Promise<IVaultRecipient> {
    const recipient = await VaultRecipient.findByIdAndUpdate(
      id,
      { isDeleted: false, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!recipient) {
      throw new Error('Vault recipient not found');
    }
    
    return recipient;
  }

  async deleteByVaultId(vaultId: string): Promise<void> {
    await VaultRecipient.updateMany(
      { vaultId },
      { isDeleted: true, updatedAt: new Date() }
    );
  }

  async deleteByContactId(contactId: string): Promise<void> {
    // Hard delete all vault recipients for this contact
    await VaultRecipient.deleteMany({ contactId });
  }
}

export const vaultRecipientRepository = new VaultRecipientRepository(); 