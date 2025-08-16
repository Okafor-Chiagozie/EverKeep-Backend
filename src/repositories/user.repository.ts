import { User } from '@prisma/client';
import { CreateUserRequest, UpdateUserRequest } from '../types/user.types';
import { prisma } from '../config/database';

export class UserRepository {
  async create(userData: Omit<CreateUserRequest, 'password'> & { hashedPassword: string }): Promise<User> {
    const { hashedPassword, ...data } = userData;
    return prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async findById(id: string): Promise<Omit<User, 'password'> | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    }) as any;
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findAll(skip: number = 0, take: number = 10): Promise<Array<Omit<User, 'password'>>> {
    return prisma.user.findMany({
      where: { deletedAt: null },
      skip,
      take,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as any;
  }

  async update(id: string, userData: UpdateUserRequest): Promise<Omit<User, 'password'>> {
    return prisma.user.update({
      where: { id },
      data: userData,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    }) as any;
  }

  // ✅ Soft delete instead of hard delete
  async delete(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(): Promise<number> {
    return prisma.user.count({
      where: { deletedAt: null },
    });
  }

  async exists(id: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    return !!user;
  }

  // ✅ Optional: Restore soft-deleted user
  async restore(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}

export const userRepository = new UserRepository();
