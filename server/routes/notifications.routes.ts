import { Router, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { db } from '../db';
import { authenticateToken, authorizeRoles, AuthenticatedRequest } from '../auth';
import type { Notification } from '../../src/types';

export const notificationsRouter = Router();

let socketIoInstance: SocketIOServer | null = null;
export function setNotificationsSocketIo(io: SocketIOServer) {
  socketIoInstance = io;
}

notificationsRouter.use(authenticateToken);

// GET /api/notifications
notificationsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const org_id = req.user!.org_id;

  const notifs = Array.from(db.notifications.values())
    .filter((n) => n.org_id === org_id && n.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  return res.json({
    notifications: notifs,
    unreadCount,
  });
});

// PATCH /api/notifications/:id/read
notificationsRouter.patch('/:id/read', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const notif = db.notifications.get(id);

  if (!notif) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  if (notif.org_id !== req.user!.org_id || notif.user_id !== req.user!.userId) {
    return res.status(403).json({ error: 'You cannot modify another user\'s notification.' });
  }

  notif.is_read = true;
  db.notifications.set(id, notif);

  return res.json(notif);
});

// POST /api/notifications/mark-all-read
notificationsRouter.post('/mark-all-read', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const org_id = req.user!.org_id;

  Array.from(db.notifications.values())
    .filter((n) => n.org_id === org_id && n.user_id === userId)
    .forEach((n) => {
      n.is_read = true;
      db.notifications.set(n.id, n);
    });

  return res.json({ message: 'All notifications marked as read' });
});

// POST /api/notifications/broadcast (Admin broadcast to organization or batch)
notificationsRouter.post('/broadcast', authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { title, message, target_batch_id, type } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  // Find target users
  let targetUsers = Array.from(db.users.values()).filter((u) => u.org_id === org_id);
  if (target_batch_id) {
    const studentProfiles = Array.from(db.studentProfiles.values()).filter(
      (p) => p.org_id === org_id && p.batch_id === target_batch_id
    );
    const userIds = new Set(studentProfiles.map((p) => p.user_id));
    targetUsers = targetUsers.filter((u) => userIds.has(u.id));
  }

  const createdNotifications: Notification[] = [];

  targetUsers.forEach((u) => {
    const notif: Notification = {
      id: `notif_${Date.now()}_${u.id.slice(-4)}`,
      org_id,
      user_id: u.id,
      title,
      message,
      type: type || 'system',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    db.notifications.set(notif.id, notif);
    createdNotifications.push(notif);

    if (socketIoInstance) {
      socketIoInstance.to(`room:user_${u.id}`).emit('notification:new', notif);
    }
  });

  if (socketIoInstance) {
    if (target_batch_id) {
      socketIoInstance.to(`room:batch_${target_batch_id}`).emit('announcement:new', { title, message });
    } else {
      socketIoInstance.to(`room:org_${org_id}`).emit('announcement:new', { title, message });
    }
  }

  return res.json({
    message: `Broadcast sent to ${targetUsers.length} recipients.`,
    count: targetUsers.length,
  });
});

// POST /api/notifications/trigger-audit (Scans system and emits low attendance (<75%) & fee overdue alerts)
notificationsRouter.post('/trigger-audit', authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const students = Array.from(db.studentProfiles.values()).filter((s) => s.org_id === org_id);

  let lowAttendanceCount = 0;
  let feeOverdueCount = 0;

  students.forEach((stu) => {
    const logs = Array.from(db.attendanceLogs.values()).filter((l) => l.student_id === stu.id);
    const attended = logs.filter((l) => l.status === 'Present' || l.status === 'Late').length;
    const pct = logs.length > 0 ? (attended / logs.length) * 100 : 100;

    if (pct < 75) {
      lowAttendanceCount++;
      const notif: Notification = {
        id: `notif_audit_att_${Date.now()}_${stu.id}`,
        org_id,
        user_id: stu.user_id,
        title: '🚨 Academic Alert: Attendance Below 75%',
        message: `Your cumulative attendance is ${pct.toFixed(1)}%. Remedial classes are required to maintain exam eligibility.`,
        type: 'low_attendance',
        is_read: false,
        created_at: new Date().toISOString(),
      };
      db.notifications.set(notif.id, notif);
      if (socketIoInstance) {
        socketIoInstance.to(`room:user_${stu.user_id}`).emit('notification:new', notif);
      }
    }

    // Fee check
    const feeStructs = Array.from(db.feeStructures.values()).filter((f) => f.batch_id === stu.batch_id);
    const totalDue = feeStructs.reduce((sum, f) => sum + f.total_amount, 0);
    const totalPaid = Array.from(db.feePayments.values())
      .filter((p) => p.student_id === stu.id && p.status === 'Success')
      .reduce((sum, p) => sum + p.amount_paid, 0);

    if (totalDue > totalPaid) {
      feeOverdueCount++;
      const notif: Notification = {
        id: `notif_audit_fee_${Date.now()}_${stu.id}`,
        org_id,
        user_id: stu.user_id,
        title: '⚠️ Financial Services: Outstanding Fee Balance',
        message: `You have an unpaid balance of $${totalDue - totalPaid} for the current semester. Please clear dues before the deadline.`,
        type: 'fee_overdue',
        is_read: false,
        created_at: new Date().toISOString(),
      };
      db.notifications.set(notif.id, notif);
      if (socketIoInstance) {
        socketIoInstance.to(`room:user_${stu.user_id}`).emit('notification:new', notif);
      }
    }
  });

  return res.json({
    message: 'Audit executed.',
    lowAttendanceAlertsSent: lowAttendanceCount,
    feeOverdueAlertsSent: feeOverdueCount,
  });
});
