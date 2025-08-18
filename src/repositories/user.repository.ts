import { User, IUser } from '../models/User';
import { CreateUserRequest, UpdateUserRequest } from '../types/user.types';

export class UserRepository {
  async create(userData: Omit<CreateUserRequest, 'password'> & { hashedPassword: string }): Promise<IUser> {
    const { hashedPassword, ...data } = userData;
    const user = new User({
      ...data,
      password: hashedPassword,
    });
    return user.save();
  }

  async findById(id: string): Promise<Omit<IUser, 'password'> | null> {
    const user = await User.findOne({ _id: id, isDeleted: false })
      .select('-password')
      .lean();
    return user;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email, isDeleted: false });
  }

  async findAll(skip: number = 0, take: number = 10): Promise<Array<Omit<IUser, 'password'>>> {
    return User.find({ isDeleted: false })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take)
      .lean();
  }

  async update(id: string, userData: UpdateUserRequest): Promise<Omit<IUser, 'password'>> {
    const user = await User.findByIdAndUpdate(
      id,
      { ...userData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }

  // ✅ Soft delete using isDeleted flag
  async delete(id: string): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      id,
      { isDeleted: true, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }

  async count(): Promise<number> {
    return User.countDocuments({ isDeleted: false });
  }

  async exists(id: string): Promise<boolean> {
    const user = await User.findOne({ _id: id, isDeleted: false }).select('_id');
    return !!user;
  }

  // ✅ Restore soft-deleted user
  async restore(id: string): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      id,
      { isDeleted: false, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
}

export const userRepository = new UserRepository();
