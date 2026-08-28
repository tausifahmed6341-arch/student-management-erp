import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { authenticateToken, authorizeRoles, generateToken, AuthenticatedRequest } from '../auth';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  const { email, password, org_id } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Find user
  const user = Array.from(db.users.values()).find((u) => {
    const matchesEmail = u.email.toLowerCase() === email.toLowerCase();
    if (org_id) {
      return matchesEmail && u.org_id === org_id;
    }
    return matchesEmail;
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials or user not found.' });
  }

  // Every login, including demo accounts, must validate against its bcrypt hash.
  if (!password || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid password.' });
  }

  // Check if student
  let studentProfile = undefined;
  if (user.role === 'student') {
    studentProfile = Array.from(db.studentProfiles.values()).find((p) => p.user_id === user.id);
  }

  const organization = db.organizations.get(user.org_id);
  if (!organization) {
    return res.status(404).json({ error: 'Organization not found.' });
  }

  const token = generateToken({
    userId: user.id,
    org_id: user.org_id,
    role: user.role,
    email: user.email,
    name: user.name,
    student_profile_id: studentProfile?.id,
    batch_id: studentProfile?.batch_id,
  });

  const { password_hash, ...userWithoutPassword } = user;

  return res.json({
    token,
    user: userWithoutPassword,
    studentProfile,
    organization,
  });
});

// GET /api/me & GET /api/auth/me
const getMeHandler = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = db.users.get(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const organization = db.organizations.get(user.org_id);
  let studentProfile = undefined;
  if (user.role === 'student') {
    studentProfile = Array.from(db.studentProfiles.values()).find((p) => p.user_id === user.id);
    if (studentProfile) {
      studentProfile.batch = db.batches.get(studentProfile.batch_id);
    }
  }

  const { password_hash, ...userWithoutPassword } = user;

  return res.json({
    user: userWithoutPassword,
    studentProfile,
    organization,
  });
};

authRouter.get('/me', authenticateToken, getMeHandler);

// GET /api/auth/demo-users (Instant role switching for live review)
authRouter.get('/demo-users', (req, res) => {
  const users = Array.from(db.users.values()).map((u) => {
    const org = db.organizations.get(u.org_id);
    let studentProfile = undefined;
    if (u.role === 'student') {
      studentProfile = Array.from(db.studentProfiles.values()).find((p) => p.user_id === u.id);
    }
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      org_id: u.org_id,
      org_name: org?.name || 'University',
      avatar: u.avatar,
      roll_number: studentProfile?.roll_number,
    };
  });

  // Pick top key demo accounts matching ERP Nexus roles
  const demoAccounts = {
    superAdmin: users.find((u) => u.role === 'super_admin') || {
      id: 'usr_superadmin_1',
      email: 'superadmin@nexus.edu',
      name: 'System Super-Admin',
      role: 'super_admin',
      org_id: 'org_apex',
      org_name: 'Nexus Central Governance',
    },
    admin: users.find((u) => u.role === 'admin' && u.org_id === 'org_apex'),
    teacher: users.find((u) => u.role === 'faculty' && u.org_id === 'org_apex'),
    faculty: users.find((u) => u.role === 'faculty' && u.org_id === 'org_apex'),
    student: users.find((u) => u.role === 'student' && u.roll_number === '24CS001'),
    studentNormal: users.find((u) => u.role === 'student' && u.roll_number === '24CS001'),
    studentCritical: users.find((u) => u.role === 'student' && u.roll_number === '24CS004'), // <75% attendance for alert testing
    all: users.slice(0, 15),
  };

  return res.json(demoAccounts);
});

// RBAC Protected Dashboards
authRouter.get('/admin/dashboard', authenticateToken, authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const totalStudents = Array.from(db.studentProfiles.values()).filter((s) => s.org_id === org_id).length;
  const totalFaculty = Array.from(db.users.values()).filter((u) => u.org_id === org_id && u.role === 'faculty').length;
  const totalCourses = Array.from(db.courses.values()).filter((c) => c.org_id === org_id).length;
  const totalDepartments = Array.from(db.departments.values()).filter((d) => d.org_id === org_id).length;

  const totalFeeCollected = Array.from(db.feePayments.values())
    .filter((p) => p.org_id === org_id && p.status === 'Success')
    .reduce((sum, p) => sum + p.amount_paid, 0);

  return res.json({
    status: 'success',
    role: 'admin',
    metrics: {
      totalStudents,
      totalFaculty,
      totalCourses,
      totalDepartments,
      totalFeeCollected,
      activeAcademicYear: '2026-2027',
      biometricDevicesOnline: 4,
    },
  });
});

authRouter.get('/student/dashboard', authenticateToken, authorizeRoles('student', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  let studentProfile = Array.from(db.studentProfiles.values()).find((p) => p.user_id === req.user!.userId);

  // If accessed by an admin previewing or student profile ID in token
  if (!studentProfile) {
    if (req.user!.student_profile_id) {
      studentProfile = db.studentProfiles.get(req.user!.student_profile_id);
    } else {
      // Default to primary demo student in the organization
      studentProfile = Array.from(db.studentProfiles.values()).find((p) => p.org_id === org_id);
    }
  }

  if (!studentProfile) {
    return res.status(404).json({ error: 'Student profile not found' });
  }

  const studentUser = db.users.get(studentProfile.user_id);
  const batch = db.batches.get(studentProfile.batch_id);
  const course = batch ? db.courses.get(batch.course_id) : undefined;
  const department = course ? db.departments.get(course.department_id) : undefined;

  // Student attendance
  const studentLogs = Array.from(db.attendanceLogs.values()).filter((l) => l.student_id === studentProfile!.id);
  const presentCount = studentLogs.filter((l) => l.status === 'Present' || l.status === 'Late').length;
  const totalLogs = studentLogs.length;
  const attendancePercentage = totalLogs > 0 ? Number(((presentCount / totalLogs) * 100).toFixed(1)) : 100;

  // Subject breakdown
  const subjects = Array.from(db.subjects.values()).filter((s) => s.org_id === org_id);
  const subjectsAttendance = subjects.map((sub) => {
    const subLogs = studentLogs.filter((l) => l.subject_id === sub.id);
    const subTotal = subLogs.length;
    const subAttended = subLogs.filter((l) => l.status === 'Present' || l.status === 'Late').length;
    const pct = subTotal > 0 ? Number(((subAttended / subTotal) * 100).toFixed(1)) : 100;
    return {
      subject_id: sub.id,
      subject_code: sub.code,
      subject_name: sub.name,
      credits: sub.credits,
      total_classes: subTotal,
      attended_classes: subAttended,
      percentage: pct,
      is_critical: pct < 75,
    };
  });

  // Student timetable
  const timetable = Array.from(db.timetables.values())
    .filter((t) => t.batch_id === studentProfile!.batch_id)
    .map((t) => ({
      ...t,
      subject: db.subjects.get(t.subject_id),
      faculty: db.users.get(t.faculty_id),
      classroom: db.classrooms.get(t.room_id),
    }));

  // Fees calculation
  const feeStructures = Array.from(db.feeStructures.values()).filter((f) => f.batch_id === studentProfile!.batch_id);
  const totalFeeObligation = feeStructures.reduce((sum, f) => sum + f.total_amount, 0) || 4500;
  const payments = Array.from(db.feePayments.values()).filter((p) => p.student_id === studentProfile!.id && p.status === 'Success');
  const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);
  const pendingBalance = Math.max(0, totalFeeObligation - totalPaid);

  // Grades & GPA
  const assessments = Array.from(db.grades.values()).filter((g) => g.student_id === studentProfile!.id);
  const avgScore = assessments.length > 0
    ? Number((assessments.reduce((sum, g) => sum + (g.marks_obtained / g.max_marks) * 100, 0) / assessments.length).toFixed(1))
    : 85.0;
  const gpa = Number((avgScore / 10).toFixed(2));

  return res.json({
    status: 'success',
    role: 'student',
    user: studentUser ? { id: studentUser.id, name: studentUser.name, email: studentUser.email, avatar: studentUser.avatar } : undefined,
    profile: studentProfile,
    batch,
    course,
    department,
    attendancePercentage,
    totalClasses: totalLogs,
    attendedClasses: presentCount,
    isCriticalAttendance: attendancePercentage < 75,
    subjectsAttendance,
    timetable,
    feeStatus: {
      totalObligation: totalFeeObligation,
      totalPaid,
      pendingBalance,
      isOverdue: pendingBalance > 0,
    },
    academicStatus: {
      gpa,
      avgScore,
      totalCredits: 13,
      rank: 1,
      standing: 'Top 10%',
    },
  });
});

authRouter.get('/faculty/dashboard', authenticateToken, authorizeRoles('faculty', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const facultyId = req.user!.userId;

  // Classes taught
  const facultySlots = Array.from(db.timetables.values())
    .filter((t) => t.faculty_id === facultyId && t.org_id === org_id)
    .map((t) => ({
      ...t,
      batch: db.batches.get(t.batch_id),
      subject: db.subjects.get(t.subject_id),
      classroom: db.classrooms.get(t.room_id),
    }));

  return res.json({
    status: 'success',
    role: 'faculty',
    schedule: facultySlots,
    assignedBatches: Array.from(new Set(facultySlots.map((s) => s.batch_id))),
  });
});
