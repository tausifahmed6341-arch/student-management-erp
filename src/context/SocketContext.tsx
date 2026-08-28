import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import type { Notification } from '../types';

export interface ToastAlert {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'biometric' | 'schedule';
  timestamp: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  toasts: ToastAlert[];
  dismissToast: (id: string) => void;
  unreadNotifsCount: number;
  setUnreadNotifsCount: React.Dispatch<React.SetStateAction<number>>;
  notifications: Notification[];
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);

  const addToast = (toast: Omit<ToastAlert, 'id' | 'timestamp'>) => {
    const newToast: ToastAlert = {
      ...toast,
      id: `toast_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      dismissToast(newToast.id);
    }, 6000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadNotifsCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadNotifsCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Error marking notif as read:', e);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadNotifsCount(0);
    } catch (e) {
      console.error('Error marking all as read:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token, user]);

  useEffect(() => {
    const socketInstance = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => setIsConnected(true));

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-Time Event: Biometric punch / Attendance updated
    socketInstance.on('attendance:updated', (data: any) => {
      if (data.studentName) {
        addToast({
          title: '📡 Biometric Attendance Stream',
          message: `${data.studentName} (${data.roll_number}) verified at ${data.device_id || 'Terminal'}`,
          type: 'biometric',
        });
      } else {
        addToast({
          title: '📋 Attendance Synchronized',
          message: `Attendance marked for batch on ${data.date || 'today'}.`,
          type: 'info',
        });
      }
      fetchNotifications();
    });

    // Real-Time Event: New notification
    socketInstance.on('notification:new', (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadNotifsCount((prev) => prev + 1);

      addToast({
        title: notif.title,
        message: notif.message,
        type: notif.type === 'low_attendance' ? 'warning' : 'info',
      });
    });

    // Real-Time Event: Announcement broadcast
    socketInstance.on('announcement:new', (data: { title: string; message: string }) => {
      addToast({
        title: `📢 Announcement: ${data.title}`,
        message: data.message,
        type: 'info',
      });
      fetchNotifications();
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user?.id, user?.org_id]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        toasts,
        dismissToast,
        unreadNotifsCount,
        setUnreadNotifsCount,
        notifications,
        refreshNotifications: fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
