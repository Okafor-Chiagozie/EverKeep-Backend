import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';
import { ActivityLogger } from '../services/activityLogger';
import EncryptionUtils from '../utils/encryptionUtils';
import { AuthenticatedRequest } from '../types/auth.types';

const toApi = (v: any) => ({
  id: v.id,
  user_id: v.userId,
  name: v.name,
  description: v.description,
  created_at: v.createdAt,
  updated_at: v.updatedAt,
});

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

const toEntryApi = (e: any) => ({
  id: e.id,
  vault_id: e.vaultId,
  type: e.type,
  content: e.content,
  created_at: e.createdAt,
  updated_at: e.updatedAt,
  parent_id: e.parentId ?? null,
});

const toRecipientApi = (r: any) => ({
  id: r.id,
  vault_id: r.vaultId,
  contact_id: r.contactId,
  created_at: r.createdAt,
  updated_at: r.updatedAt,
  contact: r.contact
    ? {
        id: r.contact.id,
        user_id: r.contact.userId,
        fullName: r.contact.fullName,
        email: r.contact.email,
        phone: r.contact.phone,
        relationship: r.contact.relationship,
        isVerified: r.contact.isVerified,
        created_at: r.contact.createdAt,
        updated_at: r.contact.updatedAt,
      }
    : null,
});

export const listVaults = asyncHandler(async (req: Request, res: Response) => {
  const { pageSize = 10, pageNumber = 1, user_id, search } = req.query as any;
  const take = Number(pageSize);
  const skip = (Number(pageNumber) - 1) * take;

  const where: any = { isDeleted: false };
  if (user_id) where.userId = user_id;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [rows, totalCount] = await Promise.all([
    prisma.vault.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.vault.count({ where }),
  ]);

  // Decrypt names/descriptions for response with fallback for legacy data
  const decrypted = await Promise.all(rows.map(async (v) => ({
    ...v,
    name: await decryptWithFallback(v.name, v.userId, v.id),
    description: await decryptWithFallback(v.description, v.userId, v.id),
  })));

  res.status(200).json({
    success: true,
    message: 'Vaults retrieved successfully',
    data: decrypted.map(toApi),
    totalCount,
    totalPages: Math.ceil(totalCount / take),
    created_at: new Date().toISOString(),
  });
});

export const getVaultById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const v = await prisma.vault.findFirst({ where: { id, isDeleted: false } });
  if (!v) throw new AppError('Vault not found', 404);

  const decrypted = {
    ...v,
    name: await decryptWithFallback(v.name, v.userId, v.id),
    description: await decryptWithFallback(v.description, v.userId, v.id),
  };

  res.status(200).json({ success: true, message: 'Vault retrieved successfully', data: toApi(decrypted), created_at: new Date().toISOString() });
});

export const createVault = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description } = req.body as { name: string; description?: string };
  const userId = req.user!.userId;

  // Encrypt name/description at rest (temporary using placeholder vault id)
  const encryptedName = EncryptionUtils.encryptText(name, userId, 'new');
  const encryptedDescription = description ? EncryptionUtils.encryptText(description, userId, 'new') : null;

  const v = await prisma.vault.create({ data: { userId, name: encryptedName, description: encryptedDescription } });

  // Re-encrypt using the actual vault ID so future decrypts work
  const correctEncryptedName = EncryptionUtils.encryptText(name, userId, v.id);
  const correctEncryptedDescription = description ? EncryptionUtils.encryptText(description, userId, v.id) : null;
  if (correctEncryptedName !== encryptedName || correctEncryptedDescription !== encryptedDescription) {
    await prisma.vault.update({
      where: { id: v.id },
      data: {
        name: correctEncryptedName,
        description: correctEncryptedDescription,
      },
    });
  }

  ActivityLogger.logVault(userId, 'created', { vaultId: v.id, name });

  // Return decrypted values to client
  const responseVault = { ...v, name, description: description ?? null };

  res.status(201).json({ success: true, message: 'Vault created successfully', data: toApi(responseVault), created_at: new Date().toISOString() });
});

export const updateVault = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { name, description } = req.body as { name?: string; description?: string };

  const existing = await prisma.vault.findFirst({ where: { id } });
  if (!existing) throw new AppError('Vault not found', 404);

  const encryptedUpdate: any = {};
  if (name !== undefined) encryptedUpdate.name = EncryptionUtils.encryptText(name, existing.userId, id);
  if (description !== undefined) encryptedUpdate.description = description ? EncryptionUtils.encryptText(description, existing.userId, id) : null;

  const v = await prisma.vault.update({ where: { id }, data: encryptedUpdate });

  ActivityLogger.logVault(v.userId, 'updated', { vaultId: v.id, name: name ?? undefined });

  // Return decrypted view
  const responseVault = {
    ...v,
    name: name ?? (EncryptionUtils.safeDecrypt(v.name, v.userId, v.id) || v.name),
    description: description ?? (v.description ? (EncryptionUtils.safeDecrypt(v.description, v.userId, v.id) || v.description) : null),
  };

  res.status(200).json({ success: true, message: 'Vault updated successfully', data: toApi(responseVault), created_at: new Date().toISOString() });
});

export const deleteVault = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const v = await prisma.vault.update({ where: { id }, data: { isDeleted: true } });
  await prisma.vaultEntry.updateMany({ where: { vaultId: id }, data: { isDeleted: true } });
  await prisma.vaultRecipient.updateMany({ where: { vaultId: id }, data: { isDeleted: true } });

  ActivityLogger.logVault(v.userId, 'deleted', { vaultId: v.id });

  res.status(200).json({ success: true, message: 'Vault deleted successfully', data: null, created_at: new Date().toISOString() });
});

export const listVaultEntries = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const rows = await prisma.vaultEntry.findMany({ where: { vaultId: id, isDeleted: false }, orderBy: { createdAt: 'asc' } });

  // decrypt entries for response using vault.userId
  const vault = await prisma.vault.findFirst({ where: { id } });
  const userId = vault?.userId || '';
  const decrypted = rows.map(e => ({ ...e, content: e.content ? EncryptionUtils.safeDecrypt(e.content, userId, id) : e.content }));

  res.status(200).json({ success: true, message: 'Vault entries retrieved successfully', data: decrypted.map(toEntryApi), created_at: new Date().toISOString() });
});

export const createVaultEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { type, content, parent_id } = req.body as { type: string; content: string; parent_id?: string };

  // Encrypt content before storing
  const vault = await prisma.vault.findFirst({ where: { id } });
  if (!vault) throw new AppError('Vault not found', 404);
  const encrypted = EncryptionUtils.encryptText(content, vault.userId, id);

  const entry = await prisma.vaultEntry.create({ data: { vaultId: id, type, content: encrypted, parentId: parent_id ?? null } });

  if (vault) ActivityLogger.logEntry(vault.userId, 'added', { entryType: type, vaultId: id, vaultName: EncryptionUtils.safeDecrypt(vault.name, vault.userId, id) });

  // Return original content to client
  const responseEntry = { ...entry, content } as any;

  res.status(201).json({ success: true, message: 'Vault entry created successfully', data: toEntryApi(responseEntry), created_at: new Date().toISOString() });
});

export const deleteVaultEntry = asyncHandler(async (req: Request, res: Response) => {
  const { entryId } = req.params as { entryId: string };
  const entry = await prisma.vaultEntry.update({ where: { id: entryId }, data: { isDeleted: true } });

  const v = await prisma.vault.findFirst({ where: { id: entry.vaultId } });
  if (v) ActivityLogger.logEntry(v.userId, 'deleted', { entryType: entry.type, vaultId: v.id, vaultName: EncryptionUtils.safeDecrypt(v.name, v.userId, v.id) });

  res.status(200).json({ success: true, message: 'Vault entry deleted successfully', data: null, created_at: new Date().toISOString() });
});

export const updateVaultEntry = asyncHandler(async (req: Request, res: Response) => {
  const { entryId } = req.params as { entryId: string };
  const { content } = req.body as { content: string };

  const existing = await prisma.vaultEntry.findFirst({ where: { id: entryId, isDeleted: false } });
  if (!existing) throw new AppError('Entry not found', 404);

  const vault = await prisma.vault.findFirst({ where: { id: existing.vaultId } });
  if (!vault) throw new AppError('Vault not found', 404);

  const encrypted = EncryptionUtils.encryptText(content, vault.userId, existing.vaultId);
  const updated = await prisma.vaultEntry.update({ where: { id: entryId }, data: { content: encrypted } });

  res.status(200).json({ success: true, message: 'Vault entry updated successfully', data: { ...updated, content }, created_at: new Date().toISOString() });
});

export const listVaultRecipients = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const rows = await prisma.vaultRecipient.findMany({
    where: { vaultId: id, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    include: { contact: true },
  });
  res.status(200).json({ success: true, message: 'Vault recipients retrieved successfully', data: rows.map(toRecipientApi), created_at: new Date().toISOString() });
});

export const addVaultRecipient = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { contact_id } = req.body as { contact_id: string };
    
    console.log('🔍 addVaultRecipient called with:', { vaultId: id, contactId: contact_id });
    
    // Validate input
    if (!contact_id) {
      console.log('❌ Contact ID is missing');
      throw new AppError('Contact ID is required', 400);
    }
    
    // Check if vault exists
    const v = await prisma.vault.findFirst({ where: { id, isDeleted: false } });
    if (!v) {
      console.log('❌ Vault not found:', id);
      throw new AppError('Vault not found', 404);
    }
    
    console.log('✅ Vault found:', { vaultId: v.id });
    
    // Check if contact exists
    const contact = await prisma.contact.findFirst({ where: { id: contact_id, isDeleted: false } });
    if (!contact) {
      console.log('❌ Contact not found:', contact_id);
      throw new AppError('Contact not found', 404);
    }
    
    console.log('✅ Contact found:', { contactId: contact.id, contactName: contact.fullName });
    
    // Check if recipient already exists (including soft-deleted ones)
    const existingRecipient = await prisma.vaultRecipient.findFirst({
      where: { vaultId: id, contactId: contact_id }
    });
    
    if (existingRecipient) {
      if (existingRecipient.isDeleted) {
        // If it exists but is soft-deleted, restore it instead of creating a new one
        console.log('✅ Found soft-deleted recipient, restoring it...');
        const restored = await prisma.vaultRecipient.update({
          where: { id: existingRecipient.id },
          data: { isDeleted: false }
        });
        
        // Fetch with include to return contact in the response
        const restoredWithContact = await prisma.vaultRecipient.findFirst({ 
          where: { id: restored.id }, 
          include: { contact: true } 
        });
        
        console.log('✅ Recipient restored successfully');
        
        res.status(200).json({ 
          success: true, 
          message: 'Vault recipient restored successfully', 
          data: toRecipientApi(restoredWithContact), 
          created_at: new Date().toISOString() 
        });
        return;
      } else {
        console.log('❌ Recipient already exists and is active');
        throw new AppError('Contact is already a recipient of this vault', 400);
      }
    }
    
    console.log('✅ No existing recipient found, creating new one...');
    
    // Create the recipient
    const rec = await prisma.vaultRecipient.create({ data: { vaultId: id, contactId: contact_id } });
    
    console.log('✅ Vault recipient created:', { recipientId: rec.id, vaultId: rec.vaultId, contactId: rec.contactId });

    // Fetch with include to return contact in the response
    const created = await prisma.vaultRecipient.findFirst({ where: { id: rec.id }, include: { contact: true } });
    
    console.log('✅ Final response prepared with contact data');

    res.status(201).json({ 
      success: true, 
      message: 'Vault recipient added successfully', 
      data: toRecipientApi(created), 
      created_at: new Date().toISOString() 
    });
    
  } catch (error) {
    console.error('❌ Error in addVaultRecipient:', error);
    throw error; // Re-throw to let the error middleware handle it
  }
});

export const removeVaultRecipient = asyncHandler(async (req: Request, res: Response) => {
  const { recipientId } = req.params as { recipientId: string };
  
  // Check if recipient exists
  const rec = await prisma.vaultRecipient.findFirst({ where: { id: recipientId, isDeleted: false } });
  if (!rec) throw new AppError('Vault recipient not found', 404);
  
  // Soft delete the recipient
  await prisma.vaultRecipient.update({ where: { id: recipientId }, data: { isDeleted: true } });

  // Log the action safely
  try {
    const v = await prisma.vault.findFirst({ where: { id: rec.vaultId } });
    if (v) {
      const vaultName = v.name ? EncryptionUtils.safeDecrypt(v.name, v.userId, rec.vaultId) : 'Unknown Vault';
      ActivityLogger.logRecipient(v.userId, 'removed', { vaultRecipientId: recipientId, vaultId: v.id, vaultName });
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

  const vault = await prisma.vault.findFirst({ where: { id: vaultId, userId, isDeleted: false } });
  if (!vault) throw new AppError('Vault not found', 404);

  res.status(200).json({ success: true, message: 'Share link verified', data: { vault_id: vaultId }, created_at: new Date().toISOString() });
}); 