export interface User {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  isVerified: boolean;
  isDeleted: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}

export interface UpdateUserRequest {
  fullName?: string;
  phone?: string;
  isVerified?: boolean;
}