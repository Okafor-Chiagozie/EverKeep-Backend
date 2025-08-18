import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  type: string; // 'email', 'system', 'vault', etc.
  title: string;
  message: string;
  timestamp: Date; // Add timestamp field for the actual event time
  isRead: boolean;
  metadata?: any;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now, // Default to current time if not specified
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  metadata: {
    type: Schema.Types.Mixed,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  collection: 'notifications',
});

// Indexes
notificationSchema.index({ userId: 1 });
notificationSchema.index({ isDeleted: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ timestamp: 1 }); // Add index for timestamp

export const Notification = mongoose.model<INotification>('Notification', notificationSchema); 