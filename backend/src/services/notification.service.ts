import { Database } from '../db/database';
import { AppNotification } from '../types';

export class NotificationService {
  private db = Database.getInstance();

  public async notify(params: {
    userId: string;
    title: string;
    message: string;
    type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
    link?: string;
  }): Promise<AppNotification> {
    const notif: AppNotification = {
      id: `NOTIF-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || 'INFO',
      isRead: false,
      link: params.link,
      createdAt: new Date().toISOString()
    };
    return this.db.createNotification(notif);
  }

  public async getForUser(userId: string): Promise<AppNotification[]> {
    return this.db.getNotifications(userId);
  }

  public async markAsRead(id: string): Promise<boolean> {
    return this.db.markNotificationAsRead(id);
  }

  public async markAllAsRead(userId?: string): Promise<boolean> {
    return this.db.markAllNotificationsAsRead(userId);
  }
}

export const notificationService = new NotificationService();
