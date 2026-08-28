import { Router, Response } from 'express';
import { db } from '../db';
import { authenticateToken, authorizeRoles, AuthenticatedRequest } from '../auth';
import type { Subject, SyllabusUnit, Classroom, TimetableSlot } from '../../src/types';

export const academicRouter = Router();

academicRouter.use(authenticateToken);

// --- CLASSROOMS ---
academicRouter.get('/classrooms', (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const classrooms = Array.from(db.classrooms.values()).filter((c) => c.org_id === org_id);
  return res.json(classrooms);
});

academicRouter.post('/classrooms', authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { room_number, building, capacity, type } = req.body;

  if (!room_number) {
    return res.status(400).json({ error: 'Room number is required' });
  }

  const room: Classroom = {
    id: `rm_${Date.now()}`,
    org_id,
    room_number,
    building: building || 'Academic Block',
    capacity: Number(capacity) || 60,
    type: type || 'Lecture Hall',
  };

  db.classrooms.set(room.id, room);
  return res.status(201).json(room);
});

// --- SUBJECTS ---
// GET /api/academic/subjects
academicRouter.get('/subjects', (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const subjects = Array.from(db.subjects.values()).filter((s) => s.org_id === org_id);
  return res.json(subjects);
});

// GET /api/academic/subjects/batch/:batch_id
academicRouter.get('/subjects/batch/:batch_id', (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { batch_id } = req.params;
  const batch = db.batches.get(batch_id);

  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }

  // Return subjects matching batch course_id and semester
  const subjects = Array.from(db.subjects.values()).filter(
    (s) => s.org_id === org_id && s.course_id === batch.course_id && s.semester === batch.current_semester
  );

  return res.json(subjects);
});

// POST /api/academic/subjects
academicRouter.post('/subjects', authorizeRoles('admin', 'faculty'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { course_id, code, name, credits, semester, type } = req.body;

  if (!course_id || !code || !name) {
    return res.status(400).json({ error: 'Course ID, Code and Name are required' });
  }

  const subject: Subject = {
    id: `sub_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
    org_id,
    course_id,
    code: code.toUpperCase(),
    name,
    credits: Number(credits) || 3,
    semester: Number(semester) || 1,
    type: type === 'Lab' ? 'Lab' : 'Theory',
    created_at: new Date().toISOString(),
  };

  db.subjects.set(subject.id, subject);
  return res.status(201).json(subject);
});

// --- SYLLABUS UNITS ---
// GET /api/academic/syllabus/subject/:subject_id
academicRouter.get('/syllabus/subject/:subject_id', (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { subject_id } = req.params;

  const units = Array.from(db.syllabusUnits.values())
    .filter((u) => u.org_id === org_id && u.subject_id === subject_id)
    .sort((a, b) => a.unit_number - b.unit_number);

  return res.json(units);
});

// GET /api/academic/syllabus (all syllabus units with subject info)
academicRouter.get('/syllabus', (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const subjects = Array.from(db.subjects.values()).filter((s) => s.org_id === org_id);

  const syllabusMap = subjects.map((sub) => {
    const units = Array.from(db.syllabusUnits.values())
      .filter((u) => u.subject_id === sub.id)
      .sort((a, b) => a.unit_number - b.unit_number);

    const totalHours = units.reduce((acc, u) => acc + u.total_hours, 0);
    const completedHours = units.reduce((acc, u) => acc + u.completed_hours, 0);
    const progressPercent = totalHours > 0 ? Number(((completedHours / totalHours) * 100).toFixed(1)) : 0;

    return {
      subject: sub,
      units,
      totalHours,
      completedHours,
      progressPercent,
    };
  });

  return res.json(syllabusMap);
});

// POST /api/academic/syllabus
academicRouter.post('/syllabus', authorizeRoles('admin', 'faculty'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { subject_id, unit_number, title, total_hours } = req.body;

  if (!subject_id || !title || !total_hours) {
    return res.status(400).json({ error: 'Subject ID, Title and Total Hours are required' });
  }

  const unit: SyllabusUnit = {
    id: `syl_${Date.now()}`,
    org_id,
    subject_id,
    unit_number: Number(unit_number) || 1,
    title,
    total_hours: Number(total_hours),
    completed_hours: 0,
    status: 'Not Started',
  };

  db.syllabusUnits.set(unit.id, unit);
  return res.status(201).json(unit);
});

// PATCH /api/academic/syllabus/:unit_id/progress (Interactive hour incrementing for faculty)
academicRouter.patch('/syllabus/:unit_id/progress', authorizeRoles('admin', 'faculty'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { unit_id } = req.params;
  const { completed_hours, delta_hours, status } = req.body;

  const unit = db.syllabusUnits.get(unit_id);
  if (!unit || unit.org_id !== org_id) {
    return res.status(404).json({ error: 'Syllabus unit not found' });
  }

  let newCompleted = unit.completed_hours;
  if (typeof completed_hours === 'number') {
    newCompleted = completed_hours;
  } else if (typeof delta_hours === 'number') {
    newCompleted = unit.completed_hours + delta_hours;
  }

  newCompleted = Math.max(0, Math.min(newCompleted, unit.total_hours));

  let newStatus = unit.status;
  if (status) {
    newStatus = status;
  } else {
    if (newCompleted === 0) newStatus = 'Not Started';
    else if (newCompleted >= unit.total_hours) newStatus = 'Completed';
    else newStatus = 'In Progress';
  }

  const updatedUnit: SyllabusUnit = {
    ...unit,
    completed_hours: newCompleted,
    status: newStatus,
  };

  db.syllabusUnits.set(unit_id, updatedUnit);
  return res.json(updatedUnit);
});

// --- TIMETABLE ENGINE & CONFLICT DETECTION ---
// POST /api/academic/timetable with conflict detection (Room, Faculty, Batch collisions return HTTP 409)
academicRouter.post('/timetable', authorizeRoles('admin', 'faculty'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { batch_id, subject_id, faculty_id, room_id, day_of_week, start_time, end_time } = req.body;

  if (!batch_id || !subject_id || !faculty_id || !room_id || !day_of_week || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required timetable slot fields.' });
  }

  // Run Conflict Engine Check
  const conflictResult = db.checkTimetableConflict(org_id, {
    batch_id,
    faculty_id,
    room_id,
    day_of_week,
    start_time,
    end_time,
  });

  if (conflictResult.hasConflict) {
    return res.status(409).json({
      error: 'Conflict Detected (HTTP 409)',
      conflictType: 'TIMETABLE_COLLISION',
      message: conflictResult.reason,
      conflictingSlot: conflictResult.conflictingSlot,
    });
  }

  const slot: TimetableSlot = {
    id: `tt_${Date.now()}`,
    org_id,
    batch_id,
    subject_id,
    faculty_id,
    room_id,
    day_of_week,
    start_time,
    end_time,
  };

  db.timetables.set(slot.id, slot);

  // Return populated slot
  const populated = {
    ...slot,
    batch: db.batches.get(slot.batch_id),
    subject: db.subjects.get(slot.subject_id),
    faculty: db.users.get(slot.faculty_id),
    classroom: db.classrooms.get(slot.room_id),
  };

  return res.status(201).json(populated);
});

// GET /api/academic/timetable/batch/:batch_id
academicRouter.get('/timetable/batch/:batch_id', (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { batch_id } = req.params;

  const slots = Array.from(db.timetables.values())
    .filter((t) => t.org_id === org_id && t.batch_id === batch_id)
    .map((slot) => ({
      ...slot,
      batch: db.batches.get(slot.batch_id),
      subject: db.subjects.get(slot.subject_id),
      faculty: db.users.get(slot.faculty_id),
      classroom: db.classrooms.get(slot.room_id),
    }));

  return res.json(slots);
});

// GET /api/academic/timetable/faculty/me
academicRouter.get('/timetable/faculty/me', authorizeRoles('faculty', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const faculty_id = req.user!.userId;

  const slots = Array.from(db.timetables.values())
    .filter((t) => t.org_id === org_id && t.faculty_id === faculty_id)
    .map((slot) => ({
      ...slot,
      batch: db.batches.get(slot.batch_id),
      subject: db.subjects.get(slot.subject_id),
      faculty: db.users.get(slot.faculty_id),
      classroom: db.classrooms.get(slot.room_id),
    }));

  return res.json(slots);
});

// DELETE /api/academic/timetable/:id
academicRouter.delete('/timetable/:id', authorizeRoles('admin', 'faculty'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { id } = req.params;

  const slot = db.timetables.get(id);
  if (!slot || slot.org_id !== org_id) {
    return res.status(404).json({ error: 'Timetable slot not found' });
  }

  db.timetables.delete(id);
  return res.json({ message: 'Timetable slot deleted successfully', id });
});
