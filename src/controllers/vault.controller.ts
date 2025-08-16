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
  timestamp: v.timestamp,
  delivered_at_date: v.deliveredAtDate,
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
  timestamp: e.timestamp,
  created_at: e.createdAt,
  updated_at: e.updatedAt,
  parent_id: e.parentId ?? null,
});

const toRecipientApi = (r: any) => ({
  id: r.id,
  vault_id: r.vaultId,
  contact_id: r.contactId,
  timestamp: r.timestamp,
  created_at: r.createdAt,
  updated_at: r.updatedAt,
  contacts: r.contact
    ? {
        id: r.contact.id,
        user_id: r.contact.userId,
        name: r.contact.name,
        email: r.contact.email,
        phone: r.contact.phone,
        role: r.contact.role,
        verified: r.contact.verified,
        timestamp: r.contact.timestamp,
        created_at: r.contact.createdAt,
        updated_at: r.contact.updatedAt,
      }
    : null,
});

export const getVaults = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  const { page = 1, limit = 10, search } = req.query as any;
  const skip = (page - 1) * limit;

  // Simplified query for MongoDB - removed deletedAt check
  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [vaults, total] = await Promise.all([
    prisma.vault.findMany({
      where: { ...where, userId: user_id },
      skip,
      take: parseInt(limit),
      orderBy: { timestamp: 'desc' },
      include: {
        entries: {
          take: 5,
          orderBy: { timestamp: 'desc' },
        },
        recipients: {
          include: {
            contact: true,
          },
        },
      },
    }),
    prisma.vault.count({ where: { ...where, userId: user_id } }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Vaults retrieved successfully',
    data: vaults,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
    timestamp: new Date().toISOString(),
  });
});

export const getVaultById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  // Simplified query for MongoDB - removed deletedAt check
  const v = await prisma.vault.findFirst({ where: { id } });
  if (!v) throw new AppError('Vault not found', 404);
  if (v.userId !== user_id) throw new AppError('Unauthorized', 401);

  const vault = await prisma.vault.findFirst({
    where: { id },
    include: {
      entries: {
        orderBy: { timestamp: 'desc' },
      },
      recipients: {
        include: {
          contact: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    message: 'Vault retrieved successfully',
    data: vault,
    timestamp: new Date().toISOString(),
  });
});

export const createVault = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  const { name, description, deliveredAtDate } = req.body as any;

  if (!name) throw new AppError('Vault name is required', 400);

  const vault = await prisma.vault.create({
    data: {
      name,
      description,
      deliveredAtDate: deliveredAtDate ? new Date(deliveredAtDate) : null,
      userId: user_id,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Vault created successfully',
    data: vault,
    timestamp: new Date().toISOString(),
  });
});

export const updateVault = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  const { name, description, deliveredAtDate } = req.body as any;

  const vault = await prisma.vault.findFirst({ where: { id, userId: user_id } });
  if (!vault) throw new AppError('Vault not found', 404);

  const updatedVault = await prisma.vault.update({
    where: { id },
    data: {
      name,
      description,
      deliveredAtDate: deliveredAtDate ? new Date(deliveredAtDate) : null,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Vault updated successfully',
    data: updatedVault,
    timestamp: new Date().toISOString(),
  });
});

export const deleteVault = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  const vault = await prisma.vault.findFirst({ where: { id, userId: user_id } });
  if (!vault) throw new AppError('Vault not found', 404);

  await prisma.vault.delete({ where: { id } });

  res.status(200).json({
    success: true,
    message: 'Vault deleted successfully',
    data: null,
    timestamp: new Date().toISOString(),
  });
});

export const getVaultEntries = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  const vault = await prisma.vault.findFirst({ where: { id, userId: user_id } });
  if (!vault) throw new AppError('Vault not found', 404);

  // Simplified query for MongoDB - removed deletedAt check
  const rows = await prisma.vaultEntry.findMany({ 
    where: { vaultId: id }, 
    orderBy: { timestamp: 'desc' } 
  });

  res.status(200).json({
    success: true,
    message: 'Vault entries retrieved successfully',
    data: rows,
    timestamp: new Date().toISOString(),
  });
});

export const createVaultEntry = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  const { type, content, parent_id } = req.body as any;

  if (!type || !content) throw new AppError('Type and content are required', 400);

  const vault = await prisma.vault.findFirst({ where: { id, userId: user_id } });
  if (!vault) throw new AppError('Vault not found', 404);

  const entry = await prisma.vaultEntry.create({
    data: {
      type,
      content,
      vaultId: id,
      parentId: parent_id || null,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Vault entry created successfully',
    data: entry,
    timestamp: new Date().toISOString(),
  });
});

export const updateVaultEntry = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id, entryId } = req.params;
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  const { content } = req.body as any;

  if (!content) throw new AppError('Content is required', 400);

  const vault = await prisma.vault.findFirst({ where: { id, userId: user_id } });
  if (!vault) throw new AppError('Vault not found', 404);

  const entry = await prisma.vaultEntry.update({
    where: { id: entryId },
    data: { content },
  });

  res.status(200).json({
    success: true,
    message: 'Vault entry updated successfully',
    data: entry,
    timestamp: new Date().toISOString(),
  });
});

export const deleteVaultEntry = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id, entryId } = req.params;
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  const vault = await prisma.vault.findFirst({ where: { id, userId: user_id } });
  if (!vault) throw new AppError('Vault not found', 404);

  await prisma.vaultEntry.delete({ where: { id: entryId } });

  res.status(200).json({
    success: true,
    message: 'Vault entry deleted successfully',
    data: null,
    timestamp: new Date().toISOString(),
  });
});

export const listVaultRecipients = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const rows = await prisma.vaultRecipient.findMany({
    where: { vaultId: id, deletedAt: null },
    orderBy: { timestamp: 'desc' },
    include: { contact: true },
  });
  res.status(200).json({ success: true, message: 'Vault recipients retrieved successfully', data: rows.map(toRecipientApi), timestamp: new Date().toISOString() });
});

export const addVaultRecipient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { contact_id } = req.body as { contact_id: string };
  const rec = await prisma.vaultRecipient.create({ data: { vaultId: id, contactId: contact_id } });

  const v = await prisma.vault.findFirst({ where: { id } });
  if (v) ActivityLogger.logRecipient(v.userId, 'added', { vaultId: id, vaultName: EncryptionUtils.safeDecrypt(v.name, v.userId, id), contactId: contact_id });

  // Fetch with include to return contact in the response
  const created = await prisma.vaultRecipient.findFirst({ where: { id: rec.id }, include: { contact: true } });

  res.status(201).json({ success: true, message: 'Vault recipient added successfully', data: toRecipientApi(created), timestamp: new Date().toISOString() });
});

export const removeVaultRecipient = asyncHandler(async (req: Request, res: Response) => {
  const { recipientId } = req.params as { recipientId: string };
  const rec = await prisma.vaultRecipient.update({ where: { id: recipientId }, data: { deletedAt: new Date() } });

  const v = await prisma.vault.findFirst({ where: { id: rec.vaultId } });
  if (v) ActivityLogger.logRecipient(v.userId, 'removed', { vaultRecipientId: recipientId, vaultId: v.id, vaultName: EncryptionUtils.safeDecrypt(v.name, v.userId, v.id) });

  res.status(200).json({ success: true, message: 'Vault recipient removed successfully', data: null, timestamp: new Date().toISOString() });
});

export const verifyShareToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body as { token: string };
  if (!token) throw new AppError('Token is required', 400);

  const verified = EncryptionUtils.verifyShareToken(token);
  if (!verified) throw new AppError('Invalid or expired share link', 400);

  const { userId, vaultId } = verified;

  const vault = await prisma.vault.findFirst({ where: { id: vaultId, userId, deletedAt: null } });
  if (!vault) throw new AppError('Vault not found', 404);

  res.status(200).json({ success: true, message: 'Share link verified', data: { vault_id: vaultId }, timestamp: new Date().toISOString() });
}); 