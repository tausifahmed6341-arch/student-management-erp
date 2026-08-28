export type UserRole = 'super_admin' | 'admin' | 'faculty' | 'student';

export interface User {
  id: string;
  org_id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  domain: string;
  address?: string;
  phone?: string;
  created_at: string;
}

export interface Department {
  id: string;
  org_id: string;
  name: string;
  code: string;
  description?: string;
  head_faculty_id?: string;
  created_at: string;
}

export interface Course {
  id: string;
  org_id: string;
  department_id: string;
  name: string;
  code: string;
  total_semesters: number;
  degree_type: 'B.Tech' | 'M.Tech' | 'B.Sc' | 'MBA' | 'BCA';
  created_at: string;
}

export interface Batch {
  id: string;
  org_id: string;
  course_id: string;
  name: string;
  start_year: number;
  end_year: number;
  current_semester: number;
  section: string;
  created_at: string;
}

export interface StudentProfile {
  id: string;
  org_id: string;
  user_id: string;
  batch_id: string;
  roll_number: string;
  admission_date: string;
  parent_contact?: string;
  biometric_id?: string;
  user?: User;
  batch?: Batch;
}

export interface Subject {
  id: string;
  org_id: string;
  course_id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  type: 'Theory' | 'Lab';
  created_at: string;
}

export interface SyllabusUnit {
  id: string;
  org_id: string;
  subject_id: string;
  unit_number: number;
  title: string;
  total_hours: number;
  completed_hours: number;
  topics?: string[];
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface Classroom {
  id: string;
  org_id: string;
  room_number: string;
  building: string;
  capacity: number;
  type: 'Lecture Hall' | 'Computer Lab' | 'Seminar Hall' | 'Workshop';
}

export interface TimetableSlot {
  id: string;
  org_id: string;
  batch_id: string;
  subject_id: string;
  faculty_id: string;
  room_id: string;
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  start_time: string; // e.g. "09:00"
  end_time: string;   // e.g. "10:00"
  batch?: Batch;
  subject?: Subject;
  faculty?: User;
  classroom?: Classroom;
}

export interface AttendanceLog {
  id: string;
  org_id: string;
  student_id: string;
  subject_id: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'Late';
  marked_by: string; // faculty user_id
  marked_at: string;
  device_id?: string;
  student?: StudentProfile;
  subject?: Subject;
}

export interface FeeStructure {
  id: string;
  org_id: string;
  batch_id: string;
  title: string;
  semester: number;
  total_amount: number;
  due_date: string;
  description?: string;
  batch?: Batch;
}

export interface FeePayment {
  id: string;
  org_id: string;
  student_id: string;
  fee_structure_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: 'Card' | 'UPI' | 'Net Banking' | 'Cash' | 'Cheque';
  transaction_id: string;
  receipt_no: string;
  status: 'Success' | 'Pending' | 'Failed';
  student?: StudentProfile;
  fee_structure?: FeeStructure;
}

export interface GradeAssessment {
  id: string;
  org_id: string;
  student_id: string;
  subject_id: string;
  assessment_type: 'Midterm' | 'Final Exam' | 'Quiz' | 'Assignment' | 'Lab Exam';
  marks_obtained: number;
  max_marks: number;
  grade_point: number;
  semester: number;
  student?: StudentProfile;
  subject?: Subject;
}

export interface Notification {
  id: string;
  org_id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'low_attendance' | 'fee_overdue' | 'schedule_change' | 'biometric_punch' | 'system';
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface AuthResponse {
  token: string;
  user: User;
  studentProfile?: StudentProfile;
  organization: Organization;
}

export interface BiometricLogPayload {
  device_id: string;
  student_roll_number: string;
  timestamp: string;
  verification_status: 'SUCCESS' | 'FAILED';
}

export interface StudentAnalytics {
  student_id: string;
  name: string;
  roll_number: string;
  overall_attendance: number;
  subjects_attendance: {
    subject_code: string;
    subject_name: string;
    total_classes: number;
    attended_classes: number;
    percentage: number;
    is_critical: boolean;
  }[];
  gpa: number;
  total_credits: number;
  rank: number;
  total_students: number;
  fee_balance: number;
  assessments: GradeAssessment[];
  ai_risk_score?: 'LOW' | 'MEDIUM' | 'HIGH';
  ai_diagnostic?: string;
}
