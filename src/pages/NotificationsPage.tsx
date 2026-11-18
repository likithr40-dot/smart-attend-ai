import { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { Layout } from '../components/Layout';
import { apiRequest } from '../services/api';
import type { NotificationItem } from '../types';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ notifications: NotificationItem[] }>('/api/notifications');
      setNotifications(res.notifications);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    await apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((prev) =>
      prev.map((n) => (n.notificationId === id ? { ...n, isRead: true } : n))
    );
  };

  return (
    <Layout title="Notifications" breadcrumb="Activity / Alerts & Updates">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-10 text-center">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700">No notifications yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((item) => (
              <li
                key={item.notificationId}
                className={`p-5 flex items-start justify-between gap-4 ${
                  item.isRead ? 'bg-white' : 'bg-blue-50/40'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-blue-700 capitalize">{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {item.createdAt.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">{item.title}</h2>
                  <p className="text-xs text-slate-600 mt-1">{item.message}</p>
                </div>

                {!item.isRead && (
                  <button
                    type="button"
                    onClick={() => markAsRead(item.notificationId)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Mark read</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
