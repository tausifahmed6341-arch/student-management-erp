import { Router, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { db } from '../db';
import { authenticateToken, authorizeRoles, canAccessStudent, AuthenticatedRequest } from '../auth';
import type { AttendanceLog, Notification, BiometricLogPayload } from '../../src/types';

export const attendanceRouter = Router();

let socketIoInstance: SocketIOServer | null = null;
export function setAttendanceSocketIo(io: SocketIOServer) {
  socketIoInstance = io;
}

// GET /api/attendance/stats
attendanceRouter.get('/stats', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const allLogs = Array.from(db.attendanceLogs.values()).filter((l) => l.org_id === org_id);

  const total = allLogs.length;
  const present = allLogs.filter((l) => l.status === 'Present').length;
  const late = allLogs.filter((l) => l.status === 'Late').length;
  const absent = allLogs.filter((l) => l.status === 'Absent').length;

  const percentage = total > 0 ? Number((((present + late) / total) * 100).toFixed(1)) : 100;

  return res.json({
    totalLogs: total,
    present,
    late,
    absent,
    overallPercentage: percentage,
  });
});

// GET /api/attendance/student/:student_id
attendanceRouter.get('/student/:student_id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { student_id } = req.params;

  const student = db.studentProfiles.get(student_id);
  if (!student || student.org_id !== org_id) {
    return res.status(404).json({ error: 'Student not found' });
  }
  if (!canAccessStudent(req, student.user_id)) return res.status(403).json({ error: 'You cannot view another student\'s attendance.' });

  const logs = Array.from(db.attendanceLogs.values())
    .filter((l) => l.student_id === student_id && l.org_id === org_id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Subject-wise breakdown
  const subjects = Array.from(db.subjects.values()).filter((s) => s.org_id === org_id);
  const subjectBreakdown = subjects.map((sub) => {
    const subLogs = logs.filter((l) => l.subject_id === sub.id);
    const subTotal = subLogs.length;
    const subAttended = subLogs.filter((l) => l.status === 'Present' || l.status === 'Late').length;
    const percent = subTotal > 0 ? Number(((subAttended / subTotal) * 100).toFixed(1)) : 100;

    return {
      subject_id: sub.id,
      subject_code: sub.code,
      subject_name: sub.name,
      total_classes: subTotal,
      attended_classes: subAttended,
      percentage: percent,
      is_critical: percent < 75,
    };
  });

  const totalLogs = logs.length;
  const attendedCount = logs.filter((l) => l.status === 'Present' || l.status === 'Late').length;
  const overallPercentage = totalLogs > 0 ? Number(((attendedCount / totalLogs) * 100).toFixed(1)) : 100;

  return res.json({
    student,
    overallPercentage,
    totalLogs,
    attendedCount,
    is_critical: overallPercentage < 75,
    logs: logs.slice(0, 50),
    subjectBreakdown,
  });
});

// GET /api/attendance/batch/:batch_id
attendanceRouter.get('/batch/:batch_id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { batch_id } = req.params;
  const { date, subject_id } = req.query;

  const students = Array.from(db.studentProfiles.values()).filter(
    (p) => p.org_id === org_id && p.batch_id === batch_id
  );

  const queryDate = (date as string) || new Date().toISOString().split('T')[0];

  const studentAttendanceList = students.map((stu) => {
    const user = db.users.get(stu.user_id);
    // Find log for this date and subject
    const log = Array.from(db.attendanceLogs.values()).find(
      (l) =>
        l.student_id === stu.id &&
        l.date === queryDate &&
        (!subject_id || l.subject_id === subject_id)
    );

    // Also calculate cumulative percentage
    const allStuLogs = Array.from(db.attendanceLogs.values()).filter((l) => l.student_id === stu.id);
    const attended = allStuLogs.filter((l) => l.status === 'Present' || l.status === 'Late').length;
    const cumulativePercent = allStuLogs.length > 0 ? Number(((attended / allStuLogs.length) * 100).toFixed(1)) : 100;

    return {
      student_id: stu.id,
      user_id: stu.user_id,
      roll_number: stu.roll_number,
      name: user?.name || 'Student',
      avatar: user?.avatar,
      status: log ? log.status : 'Present', // default proposed
      is_marked: Boolean(log),
      log_id: log?.id,
      cumulative_attendance: cumulativePercent,
      is_critical: cumulativePercent < 75,
    };
  });

  return res.json({
    batch_id,
    date: queryDate,
    students: studentAttendanceList,
  });
});

// POST /api/attendance/bulk (Bulk batch marking checklist for faculty)
attendanceRouter.post('/bulk', authenticateToken, authorizeRoles('faculty', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const faculty_id = req.user!.userId;
  const { batch_id, subject_id, date, records } = req.body;

  if (!batch_id || !subject_id || !date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'batch_id, subject_id, date, and records array are required' });
  }

  const createdLogs: AttendanceLog[] = [];
  const subject = db.subjects.get(subject_id);

  for (const record of records) {
    const { student_id, status } = record;
    if (!student_id || !status) continue;

    // Check if existing log for date & subject
    const existingKey = Array.from(db.attendanceLogs.entries()).find(
      ([, l]) => l.student_id === student_id && l.subject_id === subject_id && l.date === date
    );

    const logId = existingKey ? existingKey[0] : `att_${Date.now()}_${student_id.slice(-4)}`;
    const log: AttendanceLog = {
      id: logId,
      org_id,
      student_id,
      subject_id,
      date,
      status: status as 'Present' | 'Absent' | 'Late',
      marked_by: faculty_id,
      marked_at: new Date().toISOString(),
    };

    db.attendanceLogs.set(log.id, log);
    createdLogs.push(log);

    // Calculate student cumulative attendance and trigger low attendance alert if <75%
    const allStuLogs = Array.from(db.attendanceLogs.values()).filter((l) => l.student_id === student_id);
    const attended = allStuLogs.filter((l) => l.status === 'Present' || l.status === 'Late').length;
    const percentage = Number(((attended / allStuLogs.length) * 100).toFixed(1));

    const studentProfile = db.studentProfiles.get(student_id);
    if (studentProfile && percentage < 75 && status === 'Absent') {
      const alertNotif: Notification = {
        id: `notif_low_${Date.now()}_${student_id.slice(-4)}`,
        org_id,
        user_id: studentProfile.user_id,
        title: '⚠️ Low Attendance Notice (< 75%)',
        message: `Your cumulative attendance in ${subject?.name || 'Class'} is now ${percentage}%. Please meet your faculty advisor.`,
        type: 'low_attendance',
        is_read: false,
        created_at: new Date().toISOString(),
      };
      db.notifications.set(alertNotif.id, alertNotif);

      if (socketIoInstance) {
        socketIoInstance.to(`room:user_${studentProfile.user_id}`).emit('notification:new', alertNotif);
      }
    }
  }

  // Real-time broadcast via WebSockets
  if (socketIoInstance) {
    socketIoInstance.to(`room:org_${org_id}`).emit('attendance:updated', {
      batch_id,
      subject_id,
      date,
      count: createdLogs.length,
      timestamp: new Date().toISOString(),
    });
    socketIoInstance.to(`room:batch_${batch_id}`).emit('attendance:batch_updated', {
      batch_id,
      subject_id,
      date,
    });
  }

  return res.json({
    message: `Successfully saved attendance for ${createdLogs.length} students.`,
    count: createdLogs.length,
    logs: createdLogs,
  });
});

// POST /api/biometric/log (Layer 6 Hardware Bridge)
// Accepts { device_id, student_roll_number, timestamp, verification_status }
attendanceRouter.post('/biometric/log', authenticateToken, authorizeRoles('admin', 'faculty'), (req: AuthenticatedRequest, res: Response) => {
  const { device_id, student_roll_number, timestamp, verification_status } = req.body as BiometricLogPayload;

  if (!student_roll_number) {
    return res.status(400).json({ error: 'student_roll_number is required' });
  }

  // Look up student by roll number
  const student = Array.from(db.studentProfiles.values()).find(
    (p) => p.roll_number.toLowerCase() === student_roll_number.toLowerCase()
  );

  if (!student) {
    return res.status(404).json({
      error: 'Student roll number not found in university directory',
      roll_number: student_roll_number,
    });
  }

  const user = db.users.get(student.user_id);
  const org_id = student.org_id;
  const today = (timestamp ? timestamp.split('T')[0] : new Date().toISOString().split('T')[0]);

  // Find active subject for today or default to first subject of batch
  const batchSubjects = Array.from(db.subjects.values()).filter((s) => s.org_id === org_id);
  const activeSubject = batchSubjects[0];

  const logStatus: 'Present' | 'Absent' = verification_status === 'FAILED' ? 'Absent' : 'Present';

  const logId = `bio_log_${Date.now()}`;
  const log: AttendanceLog = {
    id: logId,
    org_id,
    student_id: student.id,
    subject_id: activeSubject ? activeSubject.id : 'sub_general',
    date: today,
    status: logStatus,
    marked_by: 'BIOMETRIC_HARDWARE_BRIDGE',
    marked_at: timestamp || new Date().toISOString(),
    device_id: device_id || 'GATE_01_OPTICAL_SCANNER',
  };

  db.attendanceLogs.set(log.id, log);

  // Create biometric punch notification
  const notif: Notification = {
    id: `notif_bio_${Date.now()}`,
    org_id,
    user_id: student.user_id,
    title: verification_status === 'SUCCESS' ? '📡 Biometric Verification Confirmed' : '⚠️ Biometric Verification Failed',
    message: `Biometric sensor (${device_id || 'Terminal 1'}) recorded check-in at ${new Date(log.marked_at).toLocaleTimeString()}. Status: ${verification_status || 'SUCCESS'}.`,
    type: 'biometric_punch',
    is_read: false,
    created_at: new Date().toISOString(),
  };
  db.notifications.set(notif.id, notif);

  // Emit WebSocket events to room:org_<id>, room:user_<id>, room:batch_<id>
  if (socketIoInstance) {
    const payload = {
      event: 'attendance:updated',
      log,
      studentName: user?.name,
      roll_number: student.roll_number,
      device_id: device_id || 'GATE_SCANNER',
      verification_status: verification_status || 'SUCCESS',
      timestamp: log.marked_at,
    };

    socketIoInstance.to(`room:org_${org_id}`).emit('attendance:updated', payload);
    socketIoInstance.to(`room:user_${student.user_id}`).emit('attendance:updated', payload);
    socketIoInstance.to(`room:user_${student.user_id}`).emit('notification:new', notif);
    socketIoInstance.to(`room:batch_${student.batch_id}`).emit('attendance:updated', payload);
  }

  return res.status(200).json({
    status: 'success',
    message: 'Biometric log processed and real-time event streamed to socket rooms.',
    student: {
      id: student.id,
      name: user?.name,
      roll_number: student.roll_number,
      batch_id: student.batch_id,
    },
    log,
  });
});
