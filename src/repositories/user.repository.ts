import { PrismaClient, User } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: { id },
      include: {
        contacts: true,
        vaults: true,
        notifications: true,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: { email },
      include: {
        contacts: true,
        vaults: true,
        notifications: true,
      },
    });
  }

  async findAll(): Promise<User[]> {
    return await prisma.user.findMany({
      include: {
        contacts: true,
        vaults: true,
        notifications: true,
      },
    });
  }

  async create(userData: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    isVerified?: boolean;
    inactivityThresholdDays?: number;
  }): Promise<User> {
    return await prisma.user.create({
      data: userData,
    });
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: userData,
    });
  }

  async delete(id: string): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async softDelete(id: string): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async findByEmailAndPassword(email: string, password: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: { email },
    });
  }

  async updateLastLogin(id: string): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }

  async updateVerificationStatus(id: string, isVerified: boolean): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { isVerified },
    });
  }
}
