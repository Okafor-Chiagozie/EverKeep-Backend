import { Notification, INotification } from '../models/Notification';

export class NotificationRepository {
  async create(notificationData: Partial<INotification>): Promise<INotification> {
    const notification = new Notification(notificationData);
    return notification.save();
  }

  async findById(id: string): Promise<INotification | null> {
    return Notification.findOne({ _id: id, isDeleted: false });
  }

  async findByUserId(userId: string): Promise<INotification[]> {
    return Notification.find({ userId, isDeleted: false }).sort({ createdAt: -1 });
  }

  async findAll(userId: string, skip: number = 0, take: number = 10): Promise<INotification[]> {
    return Notification.find({ userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take);
  }

  async update(id: string, updateData: Partial<INotification>): Promise<INotification> {
    const notification = await Notification.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    return notification;
  }

  async delete(id: string): Promise<INotification> {
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isDeleted: true, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    return notification;
  }

  async count(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, isDeleted: false });
  }

  async countUnread(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, isRead: false, isDeleted: false });
  }

  async exists(id: string): Promise<boolean> {
    const notification = await Notification.findOne({ _id: id, isDeleted: false }).select('_id');
    return !!notification;
  }

  async restore(id: string): Promise<INotification> {
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isDeleted: false, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    return notification;
  }

  async markAsRead(id: string): Promise<INotification> {
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    return notification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { userId, isRead: false, isDeleted: false },
      { isRead: true, updatedAt: new Date() }
    );
  }

  async findByType(userId: string, type: string): Promise<INotification[]> {
    return Notification.find({ userId, type, isDeleted: false }).sort({ createdAt: -1 });
  }
}

export const notificationRepository = new NotificationRepository(); 