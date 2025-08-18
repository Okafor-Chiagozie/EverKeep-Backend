import mongoose from 'mongoose';

export interface Contact {
  _id: string;
  userId: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  phone?: string | null;
  relationship?: string | null;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContactRequest {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  phone?: string | null;
  relationship?: string;
}

export interface UpdateContactRequest {
  fullName?: string;
  email?: string;
  phone?: string | null;
  relationship?: string;
  isVerified?: boolean;
} 