export interface User {
  _id: string;
  email: string;
  fullName?: string | null;
  phone?: string | null;
  password: string;
  isVerified: boolean;
  isDeleted: boolean;
  lastLogin?: Date | null;
  inactivityThresholdDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName?: string | null;
  phone?: string | null;
}

export interface UpdateUserRequest {
  fullName?: string | null;
  phone?: string | null;
  isVerified?: boolean;
  password?: string;
  lastLogin?: Date;
}