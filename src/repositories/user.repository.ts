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
      where: { id, isDeleted: false },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as any;
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email, isDeleted: false },
    });
  }

  async findAll(skip: number = 0, take: number = 10): Promise<Array<Omit<User, 'password'>>> {
    return prisma.user.findMany({
      where: { isDeleted: false },
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
      },
    }) as any;
  }

  // ✅ Soft delete using isDeleted flag
  async delete(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async count(): Promise<number> {
    return prisma.user.count({
      where: { isDeleted: false },
    });
  }

  async exists(id: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    });
    return !!user;
  }

  // ✅ Restore soft-deleted user
  async restore(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { isDeleted: false },
    });
  }
}

export const userRepository = new UserRepository();
