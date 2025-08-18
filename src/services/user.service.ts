import bcrypt from 'bcryptjs';
import { UserRepository, userRepository } from '../repositories/user.repository';
import { CreateUserRequest, UpdateUserRequest, User } from '../types/user.types';
import { AppError } from '../middleware/error.middleware';
import { PaginationParams } from '../types/common.types';

export class UserService {
  constructor(private userRepo: UserRepository) {}

  async createUser(userData: CreateUserRequest): Promise<Omit<User, 'password'>> {
    const existingUser = await this.userRepo.findByEmail(userData.email);
    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    const { password, ...rest } = userData;
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.userRepo.create({ ...rest, hashedPassword });

    const { password: _, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  async getUserById(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepo.findById(id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user as any;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await this.userRepo.findByEmail(email);
    if (user && !user.isDeleted) {
      return {
        _id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        password: user.password,
        isVerified: user.isVerified,
        isDeleted: user.isDeleted,
        lastLogin: user.lastLogin,
        inactivityThresholdDays: user.inactivityThresholdDays,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    }
    return null;
  }

  async getAllUsers(pagination: PaginationParams) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userRepo.findAll(skip, limit),
      this.userRepo.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateUser(id: string, updateData: UpdateUserRequest): Promise<Omit<User, 'password'>> {
    const user = await this.userRepo.update(id, updateData);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user as any;
  }

  async softDeleteUser(id: string): Promise<void> {
    const user = await this.userRepo.delete(id);
    if (!user) {
      throw new AppError('User not found or already deleted', 404);
    }
  }
}
