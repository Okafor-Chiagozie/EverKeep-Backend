import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { ActivityLogger } from '../services/activityLogger';
import EncryptionUtils from '../utils/encryptionUtils';
import { AuthenticatedRequest } from '../types/auth.types';
import { vaultRepository, vaultEntryRepository, vaultRecipientRepository, contactRepository } from '../repositories';

const toApi = (v: any) => {
  // Handle both encrypted and decrypted data structures
  const doc = v._doc || v;
  
  const result = {
    id: doc._id?.toString() || doc._id,
    user_id: doc.userId?.toString() || doc.userId,
    name: v.name || doc.name, // Use decrypted name if available, fallback to doc.name
    description: v.description !== undefined ? v.description : doc.description, // Use decrypted description if available
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
    timestamp: doc.createdAt, // Add timestamp for frontend compatibility
  };
  
  return result;
};

// Decrypt helper with fallback for legacy records encrypted with placeholder vault id 'new'
async function decryptWithFallback(value: string | null, userId: string, vaultId: string): Promise<string | null> {
  if (!value) return value;
  const primary = EncryptionUtils.safeDecrypt(value, userId, vaultId) || value;
  if (primary !== value) return primary;
  if (!EncryptionUtils.isEncrypted(value)) return value;
  try {
    const legacyPlain = EncryptionUtils.decryptText(value, userId, 'new');
    return legacyPlain || value;
  } catch {
    return value;
  }
}

const toEntryApi = (e: any) => {
  const doc = e._doc || e;
  return {
    id: doc._id?.toString() || doc._id,
    vault_id: doc.vaultId?.toString() || doc.vaultId,
    type: doc.type,
    content: e.content || doc.content, // Use decrypted content if available, fallback to doc.content
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
    parent_id: doc.parentId?.toString() || doc.parentId || null,
    timestamp: doc.createdAt, // Add timestamp for frontend compatibility
  };
};

const toRecipientApi = (r: any) => {
  const doc = r._doc || r;
  return {
    id: doc._id?.toString() || doc._id,
    vault_id: doc.vaultId?.toString() || doc.vaultId,
    contact_id: doc.contactId?.toString() || doc.contactId,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
    timestamp: doc.createdAt, // Add timestamp for frontend compatibility
    contact: doc.contact
      ? {
          id: doc.contact._id?.toString() || doc.contact._id,
          user_id: doc.contact.userId?.toString() || doc.contact.userId,
          fullName: doc.contact.fullName,
          email: doc.contact.email,
          phone: doc.contact.phone,
          relationship: doc.contact.relationship,
          isVerified: doc.contact.isVerified,
          created_at: doc.contact.createdAt,
          updated_at: doc.contact.updatedAt,
        }
      : null,
  };
};

export const listVaults = asyncHandler(async (req: Request, res: Response) => {
  const { pageSize = 10, pageNumber = 1, user_id, search } = req.query as any;
  const take = Number(pageSize);
  const skip = (Number(pageNumber) - 1) * take;

  if (!user_id) {
    throw new AppError('User ID is required', 400);
  }

  // Validate user_id format (should be a valid MongoDB ObjectId)
  if (!user_id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new AppError('Invalid user ID format', 400);
  }

  const [rows, totalCount] = await Promise.all([
    vaultRepository.findAll(user_id, skip, take),
    vaultRepository.count(user_id),
  ]);

  // If no vaults found, return empty array with proper structure
  if (rows.length === 0) {
    res.status(200).json({
      success: true,
      message: 'No vaults found for this user',
      data: [],
      totalCount: 0,
      totalPages: 0,
      created_at: new Date().toISOString(),
    });
    return;
  }

  // Decrypt names/descriptions for response with fallback for legacy data
  const decrypted = await Promise.all(rows.map(async (v: any) => {
    const doc = v._doc || v;
    const decryptedName = await decryptWithFallback(doc.name, doc.userId.toString(), doc._id.toString());
    const decryptedDescription = await decryptWithFallback(doc.description === undefined ? null : doc.description, doc.userId.toString(), doc._id.toString());
    
    return {
      ...v,
      name: decryptedName,
      description: decryptedDescription,
    };
  }));

  const apiResponse = decrypted.map(toApi);

  res.status(200).json({
    success: true,
    message: 'Vaults retrieved successfully',
    data: apiResponse,
    totalCount,
    totalPages: Math.ceil(totalCount / take),
    created_at: new Date().toISOString(),
  });
});

export const getVaultById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const v = await vaultRepository.findById(id);
  if (!v) throw new AppError('Vault not found', 404);

  const doc = (v as any)._doc || v;
  const decryptedName = await decryptWithFallback(doc.name, doc.userId.toString(), doc._id.toString());
  const decryptedDescription = await decryptWithFallback(doc.description === undefined ? null : doc.description, doc.userId.toString(), doc._id.toString());
  
  const decrypted = {
    ...v,
    name: decryptedName,
    description: decryptedDescription,
  };

  res.status(200).json({ success: true, message: 'Vault retrieved successfully', data: toApi(decrypted), created_at: new Date().toISOString() });
});

export const createVault = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description } = req.body as { name: string; description?: string };
  const userId = req.user!.userId;

  // Encrypt name/description at rest (temporary using placeholder vault id)
  const encryptedName = EncryptionUtils.encryptText(name, userId, 'new');
  const encryptedDescription = description ? EncryptionUtils.encryptText(description, userId, 'new') : null;

  const v = await vaultRepository.create({ 
    userId: new (require('mongoose').Types.ObjectId)(userId), 
    name: encryptedName, 
    description: encryptedDescription 
  });

  // Re-encrypt using the actual vault ID so future decrypts work
  const correctEncryptedName = EncryptionUtils.encryptText(name, userId, v._id.toString());
  const correctEncryptedDescription = description ? EncryptionUtils.encryptText(description, userId, v._id.toString()) : null;
  if (correctEncryptedName !== encryptedName || correctEncryptedDescription !== encryptedDescription) {
    await vaultRepository.update(v._id.toString(), {
      name: correctEncryptedName,
      description: correctEncryptedDescription,
    });
  }

  ActivityLogger.logVault(userId, 'created', { vaultId: v._id.toString(), name });

  // Return decrypted values to client
  const responseVault = { ...v, name, description: description ?? null };

  res.status(201).json({ success: true, message: 'Vault created successfully', data: toApi(responseVault), created_at: new Date().toISOString() });
});

export const updateVault = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { name, description } = req.body as { name?: string; description?: string };

  const existing = await vaultRepository.findById(id);
  if (!existing) throw new AppError('Vault not found', 404);

  const existingDoc = (existing as any)._doc || existing;
  const encryptedUpdate: any = {};
  if (name !== undefined) encryptedUpdate.name = EncryptionUtils.encryptText(name, existingDoc.userId.toString(), id);
  if (description !== undefined) encryptedUpdate.description = description ? EncryptionUtils.encryptText(description, existingDoc.userId.toString(), id) : null;

  const v = await vaultRepository.update(id, encryptedUpdate);
  const vDoc = (v as any)._doc || v;

  ActivityLogger.logVault(vDoc.userId.toString(), 'updated', { vaultId: vDoc._id.toString(), name: name ?? undefined });

  // Return decrypted view
  const responseVault = {
    ...v,
    name: name ?? (EncryptionUtils.safeDecrypt(vDoc.name, vDoc.userId.toString(), vDoc._id.toString()) || vDoc.name),
    description: description ?? (vDoc.description ? (EncryptionUtils.safeDecrypt(vDoc.description, vDoc.userId.toString(), vDoc._id.toString()) || vDoc.description) : null),
  };

  res.status(200).json({ success: true, message: 'Vault updated successfully', data: toApi(responseVault), created_at: new Date().toISOString() });
});

export const deleteVault = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const v = await vaultRepository.delete(id);
  const vDoc = (v as any)._doc || v;
  await vaultEntryRepository.deleteByVaultId(id);
  await vaultRecipientRepository.deleteByVaultId(id);

  ActivityLogger.logVault(vDoc.userId.toString(), 'deleted', { vaultId: vDoc._id.toString() });

  res.status(200).json({ success: true, message: 'Vault deleted successfully', data: null, created_at: new Date().toISOString() });
});

export const listVaultEntries = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  
  // Validate vault ID
  if (!id || id === 'undefined') {
    throw new AppError('Valid vault ID is required', 400);
  }
  
  const rows = await vaultEntryRepository.findByVaultId(id);

  // decrypt entries for response using vault.userId
  const vault = await vaultRepository.findById(id);
  if (!vault) throw new AppError('Vault not found', 404);
  
  const vaultDoc = (vault as any)._doc || vault;
  const userId = vaultDoc.userId.toString();
  
  const decrypted = await Promise.all(rows.map(async (e: any) => {
    const eDoc = e._doc || e;
    const decryptedContent = await decryptWithFallback(eDoc.content, userId, id);
    
    return { 
      ...e, 
      content: decryptedContent
    };
  }));

  res.status(200).json({ success: true, message: 'Vault entries retrieved successfully', data: decrypted.map(toEntryApi), created_at: new Date().toISOString() });
});

export const createVaultEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  
  // Validate vault ID
  if (!id || id === 'undefined') {
    throw new AppError('Valid vault ID is required', 400);
  }
  
  const { type, content, parent_id } = req.body as { type: string; content: string; parent_id?: string };

  // Encrypt content before storing
  const vault = await vaultRepository.findById(id);
  if (!vault) throw new AppError('Vault not found', 404);
  
  const vaultDoc = (vault as any)._doc || vault;
  const encrypted = EncryptionUtils.encryptText(content, vaultDoc.userId.toString(), id);

  const entry = await vaultEntryRepository.create({ 
    vaultId: new (require('mongoose').Types.ObjectId)(id), 
    type, 
    content: encrypted, 
    parentId: parent_id ? new (require('mongoose').Types.ObjectId)(parent_id) : null 
  });

  if (vault) ActivityLogger.logEntry(vaultDoc.userId.toString(), 'added', { entryType: type, vaultId: id, vaultName: await decryptWithFallback(vaultDoc.name, vaultDoc.userId.toString(), vaultDoc._id.toString()) || undefined });

  // Return original content to client
  const responseEntry = { ...entry, content } as any;

  res.status(201).json({ success: true, message: 'Vault entry created successfully', data: toEntryApi(responseEntry), created_at: new Date().toISOString() });
});

export const deleteVaultEntry = asyncHandler(async (req: Request, res: Response) => {
  const { entryId } = req.params as { entryId: string };
  
  // Validate entry ID
  if (!entryId || entryId === 'undefined') {
    throw new AppError('Valid entry ID is required', 400);
  }
  
  const entry = await vaultEntryRepository.delete(entryId);
  const entryDoc = (entry as any)._doc || entry;

  const v = await vaultRepository.findById(entryDoc.vaultId.toString());
  if (v) {
    const vDoc = (v as any)._doc || v;
    ActivityLogger.logEntry(vDoc.userId.toString(), 'deleted', { entryType: entryDoc.type, vaultId: vDoc._id.toString(), vaultName: await decryptWithFallback(vDoc.name, vDoc.userId.toString(), vDoc._id.toString()) || undefined });
  }

  res.status(200).json({ success: true, message: 'Vault entry deleted successfully', data: null, created_at: new Date().toISOString() });
});

export const updateVaultEntry = asyncHandler(async (req: Request, res: Response) => {
  const { entryId } = req.params as { entryId: string };
  
  // Validate entry ID
  if (!entryId || entryId === 'undefined') {
    throw new AppError('Valid entry ID is required', 400);
  }
  
  const { content } = req.body as { content: string };

  const existing = await vaultEntryRepository.findById(entryId);
  if (!existing) throw new AppError('Entry not found', 404);
  const existingDoc = (existing as any)._doc || existing;

  const vault = await vaultRepository.findById(existingDoc.vaultId.toString());
  if (!vault) throw new AppError('Vault not found', 404);
  const vaultDoc = (vault as any)._doc || vault;

  const encrypted = EncryptionUtils.encryptText(content, vaultDoc.userId.toString(), existingDoc.vaultId.toString());
  const updated = await vaultEntryRepository.update(entryId, { content: encrypted });

  res.status(200).json({ success: true, message: 'Vault entry updated successfully', data: { ...updated, content }, created_at: new Date().toISOString() });
});

export const listVaultRecipients = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  
  // Validate vault ID
  if (!id || id === 'undefined') {
    throw new AppError('Valid vault ID is required', 400);
  }
  
  const rows = await vaultRecipientRepository.findWithContact(id);
  res.status(200).json({ success: true, message: 'Vault recipients retrieved successfully', data: rows.map(toRecipientApi), created_at: new Date().toISOString() });
});

export const addVaultRecipient = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    
    // Validate vault ID
    if (!id || id === 'undefined') {
      throw new AppError('Valid vault ID is required', 400);
    }
    
    const { contact_id } = req.body as { contact_id: string };
    
    // Validate input
    if (!contact_id) {
      throw new AppError('Contact ID is required', 400);
    }
    
    // Check if vault exists
    const v = await vaultRepository.findById(id);
    if (!v) {
      throw new AppError('Vault not found', 404);
    }
    
    // Check if contact exists
    const contact = await contactRepository.findById(contact_id);
    if (!contact) {
      throw new AppError('Contact not found', 404);
    }
    
    // Check if recipient already exists (including soft-deleted ones)
    const existingRecipient = await vaultRecipientRepository.findByVaultAndContact(id, contact_id);
    
    if (existingRecipient) {
      if (existingRecipient.isDeleted) {
        // If it exists but is soft-deleted, restore it instead of creating a new one
        const restored = await vaultRecipientRepository.restore(existingRecipient._id.toString());
        
        // Fetch with contact to return in the response
        const restoredWithContact = await vaultRecipientRepository.findWithContact(id);
        const restoredRecipient = restoredWithContact.find(r => r._id.toString() === restored._id.toString());
        
        res.status(200).json({ 
          success: true, 
          message: 'Vault recipient restored successfully', 
          data: toRecipientApi(restoredRecipient), 
          created_at: new Date().toISOString() 
        });
        return;
      } else {
        throw new AppError('Contact is already a recipient of this vault', 400);
      }
    }
    
    // Create the recipient
    const rec = await vaultRecipientRepository.create(id, contact_id);
    
    // Fetch with contact to return in the response
    const createdWithContact = await vaultRecipientRepository.findWithContact(id);
    const created = createdWithContact.find(r => r._id.toString() === rec._id.toString());
    
    // Log the recipient addition
    try {
      const vaultName = v.name ? EncryptionUtils.safeDecrypt(v.name, v.userId.toString(), id) : 'Unknown Vault';
      const contactName = contact.fullName;
      await ActivityLogger.logRecipient(v.userId.toString(), 'added', { 
        vaultId: id, 
        vaultName, 
        contactId: contact_id, 
        contactName 
      });
      console.log('✅ Recipient addition logged successfully');
    } catch (logError) {
      console.warn('Failed to log recipient addition:', logError);
      // Don't fail the operation if logging fails
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Vault recipient added successfully', 
      data: toRecipientApi(created), 
      created_at: new Date().toISOString() 
    });
    
  } catch (error) {
    throw error; // Re-throw to let the error middleware handle it
  }
});

export const removeVaultRecipient = asyncHandler(async (req: Request, res: Response) => {
  const { recipientId } = req.params as { recipientId: string };
  
  // Validate recipient ID
  if (!recipientId || recipientId === 'undefined') {
    throw new AppError('Valid recipient ID is required', 400);
  }
  
  // Check if recipient exists
  const rec = await vaultRecipientRepository.findById(recipientId);
  if (!rec) throw new AppError('Vault recipient not found', 404);
  
  // Soft delete the recipient
  await vaultRecipientRepository.delete(recipientId);

  // Log the action safely
  try {
    const v = await vaultRepository.findById(rec.vaultId.toString());
    if (v) {
      const vaultName = v.name ? EncryptionUtils.safeDecrypt(v.name, v.userId.toString(), rec.vaultId.toString()) : 'Unknown Vault';
      
      // Get contact name for logging
      const contact = await contactRepository.findById(rec.contactId.toString());
      const contactName = contact?.fullName || 'Unknown Contact';
      
      await ActivityLogger.logRecipient(v.userId.toString(), 'removed', { 
        vaultRecipientId: recipientId, 
        vaultId: v._id.toString(), 
        vaultName,
        contactId: rec.contactId.toString(),
        contactName
      });
      console.log('✅ Recipient removal logged successfully');
    }
  } catch (logError) {
    console.warn('Failed to log recipient removal:', logError);
    // Don't fail the operation if logging fails
  }

  res.status(200).json({ success: true, message: 'Vault recipient removed successfully', data: null, created_at: new Date().toISOString() });
});

export const verifyShareToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body as { token: string };
  if (!token) throw new AppError('Token is required', 400);

  const verified = EncryptionUtils.verifyShareToken(token);
  if (!verified) throw new AppError('Invalid or expired share link', 400);

  const { userId, vaultId } = verified;

  const vault = await vaultRepository.findById(vaultId);
  if (!vault || vault.userId.toString() !== userId || vault.isDeleted) throw new AppError('Vault not found', 404);

  res.status(200).json({ success: true, message: 'Share link verified', data: { vault_id: vaultId }, created_at: new Date().toISOString() });
}); 