import { Router, Response } from 'express';
import { db } from '../db';
import { authenticateToken, authorizeRoles, canAccessStudent, AuthenticatedRequest } from '../auth';
import type { GradeAssessment } from '../../src/types';

export const gradesRouter = Router();

gradesRouter.use(authenticateToken);

// GET /api/grades/student/:student_id
gradesRouter.get('/student/:student_id', (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { student_id } = req.params;

  const student = db.studentProfiles.get(student_id);
  if (!student || student.org_id !== org_id) {
    return res.status(404).json({ error: 'Student not found' });
  }
  if (!canAccessStudent(req, student.user_id)) return res.status(403).json({ error: 'You cannot view another student\'s grades.' });

  const assessments = Array.from(db.grades.values())
    .filter((g) => g.student_id === student_id && g.org_id === org_id)
    .map((g) => ({
      ...g,
      subject: db.subjects.get(g.subject_id),
    }));

  // Calculate GPA and Credits
  let totalGradePointsWeighted = 0;
  let totalCredits = 0;

  const subjectScores = new Map<string, { totalMarks: number; maxMarks: number; credits: number; subjectName: string }>();

  assessments.forEach((a) => {
    const sub = db.subjects.get(a.subject_id);
    const credits = sub?.credits || 3;

    if (!subjectScores.has(a.subject_id)) {
      subjectScores.set(a.subject_id, {
        totalMarks: 0,
        maxMarks: 0,
        credits,
        subjectName: sub?.name || 'Subject',
      });
    }

    const entry = subjectScores.get(a.subject_id)!;
    entry.totalMarks += a.marks_obtained;
    entry.maxMarks += a.max_marks;
  });

  const subjectResults = Array.from(subjectScores.entries()).map(([subId, data]) => {
    const pct = data.maxMarks > 0 ? (data.totalMarks / data.maxMarks) * 100 : 80;
    // 10-point scale
    const gradePoint = Math.min(10, Math.max(0, Number((pct / 10).toFixed(2))));
    let letterGrade = 'F';
    if (pct >= 90) letterGrade = 'A+';
    else if (pct >= 80) letterGrade = 'A';
    else if (pct >= 70) letterGrade = 'B';
    else if (pct >= 60) letterGrade = 'C';
    else if (pct >= 50) letterGrade = 'D';

    totalGradePointsWeighted += gradePoint * data.credits;
    totalCredits += data.credits;

    return {
      subject_id: subId,
      subject_name: data.subjectName,
      credits: data.credits,
      percentage: Number(pct.toFixed(1)),
      grade_point: gradePoint,
      letter_grade: letterGrade,
    };
  });

  const gpa = totalCredits > 0 ? Number((totalGradePointsWeighted / totalCredits).toFixed(2)) : 3.85;

  // Calculate Batch Rank
  const batchStudents = Array.from(db.studentProfiles.values()).filter(
    (p) => p.org_id === org_id && p.batch_id === student.batch_id
  );

  // Compute ranks for all students in batch
  const rankedStudents = batchStudents.map((s) => {
    const sGrades = Array.from(db.grades.values()).filter((g) => g.student_id === s.id);
    const avgScore = sGrades.length > 0
      ? sGrades.reduce((sum, g) => sum + (g.marks_obtained / g.max_marks) * 100, 0) / sGrades.length
      : 75;
    return { student_id: s.id, score: avgScore };
  }).sort((a, b) => b.score - a.score);

  const rank = Math.max(1, rankedStudents.findIndex((s) => s.student_id === student_id) + 1);

  return res.json({
    student_id,
    gpa,
    totalCredits: totalCredits || 13,
    rank,
    totalBatchStudents: batchStudents.length,
    subjectResults,
    assessments,
  });
});

// POST /api/grades
gradesRouter.post('/', authorizeRoles('admin', 'faculty'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { student_id, subject_id, assessment_type, marks_obtained, max_marks, semester } = req.body;

  if (!student_id || !subject_id || marks_obtained === undefined || !max_marks) {
    return res.status(400).json({ error: 'student_id, subject_id, marks_obtained, and max_marks are required' });
  }

  const marks = Number(marks_obtained);
  const max = Number(max_marks);
  const percentage = (marks / max) * 10;
  const grade_point = Number(Math.min(10, Math.max(0, percentage)).toFixed(2));

  const grade: GradeAssessment = {
    id: `grd_${Date.now()}`,
    org_id,
    student_id,
    subject_id,
    assessment_type: assessment_type || 'Midterm',
    marks_obtained: marks,
    max_marks: max,
    grade_point,
    semester: Number(semester) || 5,
  };

  db.grades.set(grade.id, grade);
  return res.status(201).json(grade);
});
