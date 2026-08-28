import { Router, Response } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { authenticateToken, authorizeRoles, AuthenticatedRequest } from '../auth';
import type { Department, Course, Batch, StudentProfile, User } from '../../src/types';

const upload = multer({ storage: multer.memoryStorage() });

export const orgRouter = Router();

// Apply auth to all org endpoints
orgRouter.use(authenticateToken);

// GET /api/org/departments
orgRouter.get('/departments', (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const depts = Array.from(db.departments.values()).filter((d) => d.org_id === org_id);
  return res.json(depts);
});

// POST /api/org/departments
orgRouter.post('/departments', authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { name, code, head_faculty_id } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Name and Code are required' });
  }

  const dept: Department = {
    id: `dept_${Date.now()}`,
    org_id,
    name,
    code: code.toUpperCase(),
    head_faculty_id,
    created_at: new Date().toISOString(),
  };

  db.departments.set(dept.id, dept);
  return res.status(201).json(dept);
});

// GET /api/org/courses
orgRouter.get('/courses', (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const courses = Array.from(db.courses.values()).filter((c) => c.org_id === org_id);
  return res.json(courses);
});

// POST /api/org/courses
orgRouter.post('/courses', authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { department_id, name, code, total_semesters, degree_type } = req.body;

  if (!name || !code || !department_id) {
    return res.status(400).json({ error: 'Department, Name and Code are required' });
  }

  const course: Course = {
    id: `crs_${Date.now()}`,
    org_id,
    department_id,
    name,
    code: code.toUpperCase(),
    total_semesters: total_semesters || 8,
    degree_type: degree_type || 'B.Tech',
    created_at: new Date().toISOString(),
  };

  db.courses.set(course.id, course);
  return res.status(201).json(course);
});

// GET /api/org/batches
orgRouter.get('/batches', (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const batches = Array.from(db.batches.values()).filter((b) => b.org_id === org_id);
  return res.json(batches);
});

// POST /api/org/batches
orgRouter.post('/batches', authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { course_id, name, start_year, end_year, current_semester, section } = req.body;

  if (!course_id || !name) {
    return res.status(400).json({ error: 'Course and Name are required' });
  }

  const batch: Batch = {
    id: `batch_${Date.now()}`,
    org_id,
    course_id,
    name,
    start_year: Number(start_year) || new Date().getFullYear(),
    end_year: Number(end_year) || new Date().getFullYear() + 4,
    current_semester: Number(current_semester) || 1,
    section: section || 'A',
    created_at: new Date().toISOString(),
  };

  db.batches.set(batch.id, batch);
  return res.status(201).json(batch);
});

// GET /api/org/students
orgRouter.get('/students', (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { batch_id } = req.query;

  let profiles = Array.from(db.studentProfiles.values()).filter((p) => p.org_id === org_id);
  if (batch_id) {
    profiles = profiles.filter((p) => p.batch_id === batch_id);
  }

  const detailedProfiles = profiles.map((p) => {
    const user = db.users.get(p.user_id);
    const batch = db.batches.get(p.batch_id);
    const { password_hash, ...userWithoutPass } = user || {};
    return {
      ...p,
      user: userWithoutPass as User,
      batch,
    };
  });

  return res.json(detailedProfiles);
});

// POST /api/org/students/import-csv (Batch CSV student import endpoint via multer)
orgRouter.post(
  '/students/import-csv',
  authorizeRoles('admin'),
  upload.single('file'),
  (req: AuthenticatedRequest, res: Response) => {
    const org_id = req.user!.org_id;
    let csvContent = '';

    if (req.file) {
      csvContent = req.file.buffer.toString('utf-8');
    } else if (req.body && req.body.csv_text) {
      csvContent = req.body.csv_text;
    } else {
      return res.status(400).json({
        error: 'No CSV file or csv_text payload provided.',
        expectedFormat: 'name,email,roll_number,batch_id,parent_contact',
      });
    }

    const lines = csvContent.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      return res.status(400).json({ error: 'CSV file is empty or only contains headers.' });
    }

    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map((h) => h.trim().replace(/"/g, ''));

    const nameIdx = headers.findIndex((h) => h.includes('name'));
    const emailIdx = headers.findIndex((h) => h.includes('email'));
    const rollIdx = headers.findIndex((h) => h.includes('roll'));
    const batchIdx = headers.findIndex((h) => h.includes('batch'));
    const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('contact'));

    const importedStudents: Array<{ id: string; name: string; email: string; roll_number: string }> = [];
    const errors: Array<{ line: number; error: string }> = [];

    const defaultBatch = Array.from(db.batches.values()).find((b) => b.org_id === org_id);
    const passwordHash = bcrypt.hashSync('Password@123', 8);

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((cell) => cell.trim().replace(/"/g, ''));
      if (row.length < 3) continue;

      const name = row[nameIdx >= 0 ? nameIdx : 0];
      const email = row[emailIdx >= 0 ? emailIdx : 1];
      const rollNumber = row[rollIdx >= 0 ? rollIdx : 2];
      const batchId = (batchIdx >= 0 && row[batchIdx]) ? row[batchIdx] : defaultBatch?.id || 'batch_cse_2024_a';
      const phone = phoneIdx >= 0 ? row[phoneIdx] : '+1 (555) 000-0000';

      if (!name || !email || !rollNumber) {
        errors.push({ line: i + 1, error: 'Missing required field (name, email, or roll_number)' });
        continue;
      }

      // Check if user already exists
      const existingUser = Array.from(db.users.values()).find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.org_id === org_id
      );
      if (existingUser || Array.from(db.studentProfiles.values()).some((p) => p.org_id === org_id && p.roll_number === rollNumber)) {
        errors.push({ line: i + 1, error: 'A student with this email or roll number already exists.' });
        continue;
      }

      const userId = `usr_imp_${Date.now()}_${i}`;
      const user: User & { password_hash: string } = {
        id: userId,
        org_id,
        name,
        email,
        role: 'student',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${rollNumber}`,
        created_at: new Date().toISOString(),
        password_hash: passwordHash,
      };
      db.users.set(user.id, user);

      const profile: StudentProfile = {
        id: `prof_imp_${Date.now()}_${i}`,
        org_id,
        user_id: userId,
        batch_id: batchId,
        roll_number: rollNumber,
        admission_date: new Date().toISOString().split('T')[0],
        parent_contact: phone,
        biometric_id: `BIO-RFID-${rollNumber}`,
      };
      db.studentProfiles.set(profile.id, profile);

      importedStudents.push({
        id: profile.id,
        name: user.name,
        email: user.email,
        roll_number: profile.roll_number,
      });
    }

    return res.status(200).json({
      message: `Successfully processed CSV. Imported ${importedStudents.length} student records.`,
      importedCount: importedStudents.length,
      importedStudents,
      errors,
    });
  }
);
