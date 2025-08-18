export interface Notification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: any;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationRequest {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
}

export interface UpdateNotificationRequest {
  type?: string;
  title?: string;
  message?: string;
  isRead?: boolean;
  metadata?: any;
} 