import { Contact, IContact } from '../models/Contact';
import { CreateContactRequest, UpdateContactRequest } from '../types/contact.types';

export class ContactRepository {
  async create(contactData: CreateContactRequest): Promise<IContact> {
    const contact = new Contact(contactData);
    return contact.save();
  }

  async findById(id: string): Promise<IContact | null> {
    return Contact.findById(id);
  }

  async findByUserId(userId: string): Promise<IContact[]> {
    return Contact.find({ userId }).sort({ createdAt: -1 });
  }

  async findByEmailAndUserId(email: string, userId: string): Promise<IContact | null> {
    return Contact.findOne({ email, userId });
  }

  async findAll(userId: string, skip: number = 0, take: number = 10): Promise<IContact[]> {
    return Contact.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take);
  }

  async update(id: string, contactData: UpdateContactRequest): Promise<IContact> {
    const contact = await Contact.findByIdAndUpdate(
      id,
      { ...contactData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!contact) {
      throw new Error('Contact not found');
    }
    
    return contact;
  }

  async delete(id: string): Promise<IContact> {
    const contact = await Contact.findById(id);
    if (!contact) {
      throw new Error('Contact not found');
    }
    
    // Hard delete - remove from database
    await Contact.findByIdAndDelete(id);
    
    return contact;
  }

  async count(userId: string): Promise<number> {
    return Contact.countDocuments({ userId });
  }

  async exists(id: string): Promise<boolean> {
    const contact = await Contact.findById(id).select('_id');
    return !!contact;
  }

  async verify(id: string): Promise<IContact> {
    const contact = await Contact.findByIdAndUpdate(
      id,
      { isVerified: true, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!contact) {
      throw new Error('Contact not found');
    }
    
    return contact;
  }
}

export const contactRepository = new ContactRepository(); 