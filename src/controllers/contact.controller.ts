import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { ActivityLogger } from '../services/activityLogger';
import { contactRepository, vaultRecipientRepository } from '../repositories';

const toApi = (c: any) => {
  const doc = c._doc || c;
  return {
    id: doc._id?.toString() || doc._id,
    user_id: doc.userId?.toString() || doc.userId,
    fullName: doc.fullName,
    email: doc.email,
    phone: doc.phone,
    relationship: doc.relationship,
    isVerified: doc.isVerified,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  };
};

export const listContacts = asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🔍 listContacts called with query:', req.query);
    
    const { pageSize = '10', pageNumber = '1', user_id, relationship, isVerified, fullName, email, search } = req.query as any;
    
    // Convert string parameters to integers
    const pageSizeInt = parseInt(pageSize as string, 10);
    const pageNumberInt = parseInt(pageNumber as string, 10);
    
    // For now, we'll implement basic filtering
    // TODO: Implement more advanced filtering with Mongoose
    const skip = (pageNumberInt - 1) * pageSizeInt;
    const take = pageSizeInt;

    console.log('🔍 Pagination:', { pageSizeInt, pageNumberInt, skip, take });

    // For now, get all contacts for the user if user_id is provided
    let rows: any[] = [];
    let count = 0;
    
    if (user_id) {
      rows = await contactRepository.findAll(user_id, skip, take);
      count = await contactRepository.count(user_id);
    }

    console.log('✅ Found contacts:', rows.length, 'Total count:', count);

    return res.status(200).json({
      success: true,
      message: 'Contacts retrieved successfully',
      data: rows.map(toApi),
      totalCount: count,
      totalPages: Math.ceil(count / pageSizeInt),
      created_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error in listContacts:', error);
    return res.status(500).json({
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
  const contact = await contactRepository.findById(id);
  if (!contact) throw new AppError('Contact not found', 404);
  res.status(200).json({ success: true, message: 'Contact retrieved successfully', data: toApi(contact), created_at: new Date().toISOString() });
});

export const createContact = asyncHandler(async (req: Request, res: Response) => {
  const { user_id, fullName, email, phone, relationship } = req.body as { user_id: string; fullName: string; email: string; phone?: string; relationship: string };

  // Validate required fields
  if (!user_id || !fullName || !email || !relationship) {
    throw new AppError('Missing required fields: user_id, fullName, email, and relationship are required', 400);
  }

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new AppError('Please enter a valid email address', 400);
  }

  try {
    // Check if contact already exists for this user
    const existing = await contactRepository.findByEmailAndUserId(normalizedEmail, user_id);

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Contact already exists',
        error: `A contact with the email "${normalizedEmail}" already exists in your contacts list.`,
        data: null,
        created_at: new Date().toISOString(),
      });
    }

    const contact = await contactRepository.create({
      userId: new mongoose.Types.ObjectId(user_id),
      fullName,
      email: normalizedEmail,
      phone: phone ?? null,
      relationship,
    });

    // Log contact creation
    try {
      await ActivityLogger.logContact(contact.userId.toString(), 'added', contact.fullName);
      console.log('✅ Contact creation logged successfully');
    } catch (error) {
      console.error('❌ Failed to log contact creation:', error);
      // Don't fail the contact creation if logging fails
    }

    return res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: toApi(contact),
      created_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Contact creation error:', error);
    
    // Handle specific database errors
    if (error.code === 11000) {
      // MongoDB duplicate key error
      return res.status(400).json({
        success: false,
        message: 'Contact already exists',
        error: `A contact with the email "${normalizedEmail}" already exists in your contacts list.`,
        data: null,
        created_at: new Date().toISOString(),
      });
    }
    
    // Handle other database errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact data',
        error: 'Please check the contact information and try again.',
        data: null,
        created_at: new Date().toISOString(),
      });
    }
    
    // Generic error fallback
    throw new AppError('Failed to create contact. Please try again.', 500);
  }
});

export const updateContact = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { fullName, email, phone, relationship, isVerified } = req.body as { fullName?: string; email?: string; phone?: string; relationship?: string; isVerified?: boolean };

  const existing = await contactRepository.findById(id);
  if (!existing) throw new AppError('Contact not found', 404);

  // If email is being updated, check for duplicates
  if (email && email !== existing.email) {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new AppError('Please enter a valid email address', 400);
    }
    
    const duplicate = await contactRepository.findByEmailAndUserId(normalizedEmail, existing.userId.toString());
    if (duplicate && duplicate._id.toString() !== id) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
        error: `A contact with the email "${normalizedEmail}" already exists in your contacts list.`,
        data: null,
        created_at: new Date().toISOString(),
      });
    }
  }

  const updateData: any = {};
  if (fullName !== undefined) updateData.fullName = fullName;
  if (email !== undefined) updateData.email = email.toLowerCase().trim();
  if (phone !== undefined) updateData.phone = phone;
  if (relationship !== undefined) updateData.relationship = relationship;
  if (isVerified !== undefined) updateData.isVerified = isVerified;

  try {
    const updated = await contactRepository.update(id, updateData);

    // Log contact update
    try {
      await ActivityLogger.logContact(updated.userId.toString(), 'updated', updated.fullName);
      console.log('✅ Contact update logged successfully');
    } catch (error) {
      console.error('❌ Failed to log contact update:', error);
      // Don't fail the contact update if logging fails
    }

    return res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      data: toApi(updated),
      created_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Contact update error:', error);
    
    // Handle specific database errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
        error: `A contact with the email "${email}" already exists in your contacts list.`,
        data: null,
        created_at: new Date().toISOString(),
      });
    }
    
    // Handle other database errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact data',
        error: 'Please check the contact information and try again.',
        data: null,
        created_at: new Date().toISOString(),
      });
    }
    
    // Generic error fallback
    throw new AppError('Failed to update contact. Please try again.', 500);
  }
});

export const deleteContact = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const contact = await contactRepository.findById(id);
  if (!contact) throw new AppError('Contact not found', 404);

  try {
    // Disconnect contact from all vaults by removing all vault recipients
    await vaultRecipientRepository.deleteByContactId(id);
    console.log('✅ Contact disconnected from all vaults');

    // Hard delete the contact from database
    await contactRepository.delete(id);
    console.log('✅ Contact hard deleted from database');

    // Log contact deleted
    try {
      await ActivityLogger.logContact(contact.userId.toString(), 'deleted', contact.fullName);
      console.log('✅ Contact deletion logged successfully');
    } catch (error) {
      console.error('❌ Failed to log contact deletion:', error);
      // Don't fail the contact deletion if logging fails
    }

    res.status(200).json({ 
      success: true, 
      message: 'Contact deleted successfully and disconnected from all vaults', 
      data: null, 
      created_at: new Date().toISOString() 
    });
  } catch (error) {
    console.error('❌ Error deleting contact:', error);
    throw new AppError('Failed to delete contact. Please try again.', 500);
  }
});

export const verifyContact = asyncHandler(async (req: Request, res: Response) => {
  const { contact_id } = req.params as { contact_id: string };
  const contact = await contactRepository.verify(contact_id);

  // Log contact verified
  try {
    await ActivityLogger.logContact(contact.userId.toString(), 'updated', contact.fullName);
    console.log('✅ Contact verification logged successfully');
  } catch (error) {
    console.error('❌ Failed to log contact verification:', error);
    // Don't fail the contact verification if logging fails
  }

  res.status(200).json({ success: true, message: 'Contact verified successfully', data: toApi(contact), created_at: new Date().toISOString() });
}); 