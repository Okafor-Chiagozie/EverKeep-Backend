import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';
import { ActivityLogger } from '../services/activityLogger';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

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

export const getContacts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  const { pageSize = 10, pageNumber = 1, search } = req.query as any;
  const take = Number(pageSize);
  const skip = (Number(pageNumber) - 1) * take;

  // Simplified query for MongoDB - removed deletedAt check
  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [rows, totalCount] = await Promise.all([
    prisma.contact.findMany({
      where: { ...where, userId: user_id },
      skip,
      take,
      orderBy: { timestamp: 'desc' },
    }),
    prisma.contact.count({ where: { ...where, userId: user_id } }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Contacts retrieved successfully',
    data: rows,
    totalCount,
    totalPages: Math.ceil(totalCount / take),
    timestamp: new Date().toISOString(),
  });
});

export const getContactById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  // Simplified query for MongoDB - removed deletedAt check
  const contact = await prisma.contact.findFirst({ where: { id } });
  if (!contact) throw new AppError('Contact not found', 404);
  if (contact.userId !== user_id) throw new AppError('Unauthorized', 401);

  res.status(200).json({
    success: true,
    message: 'Contact retrieved successfully',
    data: contact,
    timestamp: new Date().toISOString(),
  });
});

export const createContact = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  const { name, email, phone, role } = req.body as any;

  if (!name || !email) throw new AppError('Name and email are required', 400);

  const normalizedEmail = email.toLowerCase().trim();

  // Simplified query for MongoDB - removed deletedAt check
  const existing = await prisma.contact.findFirst({ 
    where: { userId: user_id, email: normalizedEmail } 
  });
  if (existing) throw new AppError('Contact with this email already exists', 409);

  const contact = await prisma.contact.create({
    data: {
      name,
      email: normalizedEmail,
      phone,
      role,
      userId: user_id,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Contact created successfully',
    data: contact,
    timestamp: new Date().toISOString(),
  });
});

export const updateContact = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  const { name, email, phone, role } = req.body as any;

  // Simplified query for MongoDB - removed deletedAt check
  const existingContact = await prisma.contact.findFirst({ where: { id } });
  if (!existingContact) throw new AppError('Contact not found', 404);
  if (existingContact.userId !== user_id) throw new AppError('Unauthorized', 401);

  if (email && email !== existingContact.email) {
    const normalizedEmail = email.toLowerCase().trim();
    // Simplified query for MongoDB - removed deletedAt check
    const dup = await prisma.contact.findFirst({ 
      where: { userId: existingContact.userId, email: normalizedEmail, NOT: { id } } 
    });
    if (dup) throw new AppError('Contact with this email already exists', 409);
  }

  const updatedContact = await prisma.contact.update({
    where: { id },
    data: { name, email: email?.toLowerCase().trim(), phone, role },
  });

  res.status(200).json({
    success: true,
    message: 'Contact updated successfully',
    data: updatedContact,
    timestamp: new Date().toISOString(),
  });
});

export const deleteContact = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  const contact = await prisma.contact.findFirst({ where: { id } });
  if (!contact) throw new AppError('Contact not found', 404);
  if (contact.userId !== user_id) throw new AppError('Unauthorized', 401);

  await prisma.contact.delete({ where: { id } });

  res.status(200).json({
    success: true,
    message: 'Contact deleted successfully',
    data: null,
    timestamp: new Date().toISOString(),
  });
});

export const verifyContact = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const contact = await prisma.contact.update({ where: { id }, data: { verified: true } });

  // Log contact verified
  ActivityLogger.logContact(contact.userId, 'updated', contact.name);

  res.status(200).json({ success: true, message: 'Contact verified successfully', data: toApi(contact), timestamp: new Date().toISOString() });
}); 