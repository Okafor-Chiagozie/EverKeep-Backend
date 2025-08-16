export interface User {
  id: string;
  email: string;
  fullName?: string | null;
  phone?: string | null;
  isVerified: boolean;
  isDeleted: boolean;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  inactivityThresholdDays?: number;
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