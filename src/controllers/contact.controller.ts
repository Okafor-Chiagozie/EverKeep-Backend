import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';
import { ActivityLogger } from '../services/activityLogger';

const toApi = (c: any) => ({
  id: c.id,
  user_id: c.userId,
  name: c.name,
  email: c.email,
  phone: c.phone,
  role: c.role,
  verified: c.verified,
  timestamp: c.timestamp,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
});

export const listContacts = asyncHandler(async (req: Request, res: Response) => {
  const { pageSize = 10, pageNumber = 1, user_id, role, verified, name, email, search } = req.query as any;
  const take = Number(pageSize);
  const skip = (Number(pageNumber) - 1) * take;

  const where: any = { deletedAt: null };
  if (user_id) where.userId = user_id;
  if (role) where.role = role;
  if (verified !== undefined) where.verified = verified === 'true';
  if (name) where.name = { contains: name, mode: 'insensitive' };
  if (email) where.email = { contains: email, mode: 'insensitive' };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [rows, totalCount] = await Promise.all([
    prisma.contact.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.contact.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Contacts retrieved successfully',
    data: rows.map(toApi),
    totalCount,
    totalPages: Math.ceil(totalCount / take),
    timestamp: new Date().toISOString(),
  });
});

export const getContactById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const contact = await prisma.contact.findFirst({ where: { id, deletedAt: null } });
  if (!contact) throw new AppError('Contact not found', 404);
  res.status(200).json({ success: true, message: 'Contact retrieved successfully', data: toApi(contact), timestamp: new Date().toISOString() });
});

export const createContact = asyncHandler(async (req: Request, res: Response) => {
  const { user_id, name, email, phone, role } = req.body as { user_id: string; name: string; email: string; phone?: string; role: string };
  if (!user_id) throw new AppError('user_id is required', 400);

  const normalizedEmail = email.trim().toLowerCase();

  // Enforce uniqueness per user (excluding soft-deleted contacts)
  const existing = await prisma.contact.findFirst({ where: { userId: user_id, email: normalizedEmail, deletedAt: null } });
  if (existing) {
    throw new AppError('A contact with this email already exists', 409);
  }

  const contact = await prisma.contact.create({
    data: { userId: user_id, fullName: name, email: normalizedEmail, phone: phone ?? null, relationship: role },
  });

  // Log contact added
  ActivityLogger.logContact(user_id, 'added', name);

  res.status(201).json({ success: true, message: 'Contact created successfully', data: toApi(contact), timestamp: new Date().toISOString() });
});

export const updateContact = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { name, email, phone, role, verified } = req.body as { name?: string; email?: string; phone?: string; role?: string; verified?: boolean };

  const existingContact = await prisma.contact.findFirst({ where: { id, deletedAt: null } });
  if (!existingContact) throw new AppError('Contact not found', 404);

  let normalizedEmail: string | undefined = undefined;
  if (email !== undefined) {
    normalizedEmail = email.trim().toLowerCase();
    // Check uniqueness among other active contacts for the same user
    const dup = await prisma.contact.findFirst({ where: { userId: existingContact.userId, email: normalizedEmail, deletedAt: null, NOT: { id } } });
    if (dup) throw new AppError('A contact with this email already exists', 409);
  }

  const contact = await prisma.contact.update({
    where: { id },
    data: { fullName: name, email: normalizedEmail ?? undefined, phone: phone ?? undefined, relationship: role, isVerified: verified },
  });

  // Log contact updated
  ActivityLogger.logContact(contact.userId, 'updated', contact.fullName);

  res.status(200).json({ success: true, message: 'Contact updated successfully', data: toApi(contact), timestamp: new Date().toISOString() });
});

export const deleteContact = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const contact = await prisma.contact.update({ where: { id }, data: { deletedAt: new Date() } });

  // Log contact deleted
  ActivityLogger.logContact(contact.userId, 'deleted', contact.fullName);

  res.status(200).json({ success: true, message: 'Contact deleted successfully', data: null, timestamp: new Date().toISOString() });
});

export const verifyContact = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const contact = await prisma.contact.update({ where: { id }, data: { isVerified: true } });

  // Log contact verified
  ActivityLogger.logContact(contact.userId, 'updated', contact.fullName);

  res.status(200).json({ success: true, message: 'Contact verified successfully', data: toApi(contact), timestamp: new Date().toISOString() });
}); 