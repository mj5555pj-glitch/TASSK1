import React, { useState, useEffect } from 'react';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendDevicePushNotification, 
  NotificationStatus 
} from '../utils/notifications';
import { Bell, BellRing, BellOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MaintenanceTask } from '../types';

export const NotificationSettingsBanner: React.FC = () => {
  const [permission, setPermission] = useState<NotificationStatus>('default');
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const handleEnable = async () => {
    setIsRequesting(true);
    const newStatus = await requestNotificationPermission();
    setPermission(newStatus);
    setIsRequesting(false);

    if (newStatus === 'granted') {
      // Send a test notification to demonstrate it's working
      const sampleTask: MaintenanceTask = {
        id: 'test_notification',
        taskNumber: '#TEST-001',
        taskType: 'صيانة',
        subscriberName: 'إشعار تجريبي',
        phone: '07XXXXXXXXX',
        notes: 'تم تفعيل التنبيهات الفورية بنجاح على هذا الجهاز!',
        assignedToId: 'current',
        assignedToName: 'الفني',
        createdBy: 'النظام',
        createdAt: new Date().toISOString(),
        acceptedAt: null,
        completedAt: null,
        durationSeconds: null,
        durationFormatted: null,
        expiresAt: new Date().toISOString(),
        status: 'pending',
      };
      sendDevicePushNotification(sampleTask);
    }
  };

  if (permission === 'granted') {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-emerald-300">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>الإشعارات الفورية مفعّلة على هذا الجهاز — ستصلك كافة المهام الجديدة فور إرسالها من المدير.</span>
        </div>
        <button
          type="button"
          onClick={() => {
            const sampleTask: MaintenanceTask = {
              id: 'test_notification_' + Date.now(),
              taskNumber: '#TEST-' + Math.floor(100 + Math.random() * 900),
              taskType: 'صيانة',
              subscriberName: 'فحص التنبيهات',
              phone: '07700000000',
              notes: 'تأكيد وصول الإشعار الفوري والصوت والاهتزاز بنجاح!',
              assignedToId: 'current',
              assignedToName: 'الفني',
              createdBy: 'المدير',
              createdAt: new Date().toISOString(),
              acceptedAt: null,
              completedAt: null,
              durationSeconds: null,
              durationFormatted: null,
              expiresAt: new Date().toISOString(),
              status: 'pending',
            };
            sendDevicePushNotification(sampleTask);
          }}
          className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white rounded-lg transition-colors font-medium text-[11px]"
        >
          تجربة إشعار فوري
        </button>
      </div>
    );
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
        <span>
          لتصلك مهام الصيانة فور إرسالها بالصوت والاهتزاز حتى أثناء تصغير المتصفح، يرجى تفعيل إشعارات الجهاز.
        </span>
      </div>

      <button
        type="button"
        disabled={isRequesting}
        onClick={handleEnable}
        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors shrink-0 shadow-md flex items-center justify-center gap-1.5"
      >
        <BellRing className="w-3.5 h-3.5" />
        <span>{isRequesting ? 'جاري التفعيل...' : 'تفعيل إشعارات الجهاز الآن'}</span>
      </button>
    </div>
  );
};
