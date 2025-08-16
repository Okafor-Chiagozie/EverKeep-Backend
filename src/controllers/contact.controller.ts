import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';
import { ActivityLogger } from '../services/activityLogger';

const toApi = (c: any) => ({
  id: c.id,
  user_id: c.userId,
  fullName: c.fullName,
  email: c.email,
  phone: c.phone,
  relationship: c.relationship,
  isVerified: c.isVerified,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
});

export const listContacts = asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🔍 listContacts called with query:', req.query);
    
    // Test database connection first
    try {
      await prisma.$connect();
      console.log('✅ Database connection successful');
    } catch (dbError: any) {
      console.error('❌ Database connection failed:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database connection failed',
        data: null,
        error: dbError.message,
        created_at: new Date().toISOString(),
      });
    }
    
    const { pageSize = '10', pageNumber = '1', user_id, relationship, isVerified, fullName, email, search } = req.query as any;
    
    // Convert string parameters to integers
    const pageSizeInt = parseInt(pageSize as string, 10);
    const pageNumberInt = parseInt(pageNumber as string, 10);
    
    const where: any = { isDeleted: false };
    
    if (user_id) where.userId = user_id;
    if (relationship) where.relationship = relationship;
    if (isVerified !== undefined) where.isVerified = isVerified === 'true';
    if (fullName) where.fullName = { contains: fullName, mode: 'insensitive' };
    if (email) where.email = { contains: email, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    console.log('🔍 Where clause:', JSON.stringify(where, null, 2));
    console.log('🔍 Pagination:', { pageSizeInt, pageNumberInt, skip: (pageNumberInt - 1) * pageSizeInt, take: pageSizeInt });

    const [rows, count] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNumberInt - 1) * pageSizeInt,
        take: pageSizeInt,
      }),
      prisma.contact.count({ where }),
    ]);

    console.log('✅ Found contacts:', rows.length, 'Total count:', count);

    res.status(200).json({
      success: true,
      message: 'Contacts retrieved successfully',
      data: rows.map(toApi),
      totalCount: count,
      totalPages: Math.ceil(count / pageSizeInt),
      created_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error in listContacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve contacts',
      data: null,
      error: error.message,
      created_at: new Date().toISOString(),
    });
  }
});

export const getContactById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const contact = await prisma.contact.findFirst({ where: { id, isDeleted: false } });
  if (!contact) throw new AppError('Contact not found', 404);
  res.status(200).json({ success: true, message: 'Contact retrieved successfully', data: toApi(contact), created_at: new Date().toISOString() });
});

export const createContact = asyncHandler(async (req: Request, res: Response) => {
  const { user_id, fullName, email, phone, relationship } = req.body as { user_id: string; fullName: string; email: string; phone?: string; relationship: string };

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // Check if contact already exists for this user
  const existing = await prisma.contact.findFirst({
    where: { userId: user_id, email: normalizedEmail, isDeleted: false },
  });

  if (existing) {
    throw new AppError('Contact with this email already exists', 400);
  }

  const contact = await prisma.contact.create({
    data: { userId: user_id, fullName, email: normalizedEmail, phone: phone ?? null, relationship },
  });

  res.status(201).json({
    success: true,
    message: 'Contact created successfully',
    data: toApi(contact),
    created_at: new Date().toISOString(),
  });
});

export const updateContact = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { fullName, email, phone, relationship, isVerified } = req.body as { fullName?: string; email?: string; phone?: string; relationship?: string; isVerified?: boolean };

  const existing = await prisma.contact.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new AppError('Contact not found', 404);

  // If email is being updated, check for duplicates
  if (email && email !== existing.email) {
    const normalizedEmail = email.toLowerCase().trim();
    const duplicate = await prisma.contact.findFirst({
      where: { userId: existing.userId, email: normalizedEmail, isDeleted: false, id: { not: id } },
    });
    if (duplicate) throw new AppError('Contact with this email already exists', 400);
  }

  const updated = await prisma.contact.update({
    where: { id },
    data: { fullName, email: email ? email.toLowerCase().trim() : undefined, phone: phone ?? undefined, relationship, isVerified },
  });

  res.status(200).json({
    success: true,
    message: 'Contact updated successfully',
    data: toApi(updated),
    created_at: new Date().toISOString(),
  });
});

export const deleteContact = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const contact = await prisma.contact.update({ where: { id }, data: { isDeleted: true } });

  // Log contact deleted
  ActivityLogger.logContact(contact.userId, 'deleted', contact.fullName);

  res.status(200).json({ success: true, message: 'Contact deleted successfully', data: null, created_at: new Date().toISOString() });
});

export const verifyContact = asyncHandler(async (req: Request, res: Response) => {
  const { contact_id } = req.params as { contact_id: string };
  const contact = await prisma.contact.update({ where: { id: contact_id }, data: { isVerified: true } });

  // Log contact verified
  ActivityLogger.logContact(contact.userId, 'updated', contact.fullName);

  res.status(200).json({ success: true, message: 'Contact verified successfully', data: toApi(contact), created_at: new Date().toISOString() });
}); 