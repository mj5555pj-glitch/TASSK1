import { MaintenanceTask } from '../types';
import { playNewTaskAlertSound, playOverdueAlertSound } from './audio';

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Checks if browser Notification API is supported
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationStatus {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationStatus;
}

/**
 * Request notification permission from browser/device
 */
export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (!isNotificationSupported()) return 'unsupported';

  try {
    const result = await Notification.requestPermission();
    return result as NotificationStatus;
  } catch (e) {
    console.warn('Error requesting notification permission:', e);
    return getNotificationPermission();
  }
}

/**
 * Triggers device hardware vibration (if supported, e.g. on Android/mobile browsers)
 */
export function triggerDeviceVibration(pattern: number[] = [300, 150, 300, 150, 400]) {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore if not supported
  }
}

/**
 * Triggers full device push notification:
 * 1. Web Notification API (OS level system popup)
 * 2. Sound effect chime (Web Audio API)
 * 3. Device physical vibration
 */
export function sendDevicePushNotification(task: MaintenanceTask, onClick?: () => void) {
  // 1. Audio alert
  playNewTaskAlertSound();

  // 2. Hardware vibration
  triggerDeviceVibration();

  // 3. Browser system push notification
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      const title = `🚨 طلب صيانة جديد: ${task.taskType}`;
      const options: NotificationOptions = {
        body: `المشترك: ${task.subscriberName} (${task.phone})\nالفني المكلف: ${task.assignedToName}\n${task.notes ? 'ملاحظة: ' + task.notes : ''}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png',
        tag: `task-${task.id}`,
        requireInteraction: true,
        dir: 'rtl',
        lang: 'ar',
      };

      const notification = new Notification(title, options);

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (onClick) onClick();
      };
    } catch (err) {
      console.warn('Could not launch system notification:', err);
    }
  }
}

/**
 * Triggers alert for manager when a task exceeds 15 minutes without any technician accepting it
 */
export function sendManagerOverdueNotification(
  task: MaintenanceTask,
  elapsedMinutes: number,
  onClick?: () => void
) {
  // 1. Overdue sound alert
  playOverdueAlertSound();

  // 2. Urgent vibration pattern
  triggerDeviceVibration([400, 200, 400, 200, 600]);

  // 3. System Push Notification
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      const title = `🚨 تنبيه للمدير: مهمة صيانة معلقة منذ ${elapsedMinutes} دقيقة!`;
      const options: NotificationOptions = {
        body: `المهمة: ${task.taskNumber} (${task.taskType})\nالمشترك: ${task.subscriberName} (${task.phone})\nلم يقم أي فني بقبولها حتى الآن. اضغط لاتخاذ إجراء فوري.`,
        icon: 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png',
        tag: `overdue-${task.id}`,
        requireInteraction: true,
        dir: 'rtl',
        lang: 'ar',
      };

      const notification = new Notification(title, options);

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (onClick) onClick();
      };
    } catch (err) {
      console.warn('Could not launch overdue notification:', err);
    }
  }
}
