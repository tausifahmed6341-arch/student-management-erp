import bcrypt from 'bcryptjs';
import { PostgresPersistence } from './persistence';
import type {
  Organization,
  User,
  Department,
  Course,
  Batch,
  StudentProfile,
  Subject,
  SyllabusUnit,
  Classroom,
  TimetableSlot,
  AttendanceLog,
  FeeStructure,
  FeePayment,
  GradeAssessment,
  Notification,
} from '../src/types';

type CollectionName =
  | 'organizations' | 'users' | 'departments' | 'courses' | 'batches' | 'studentProfiles'
  | 'subjects' | 'syllabusUnits' | 'classrooms' | 'timetables' | 'attendanceLogs'
  | 'feeStructures' | 'feePayments' | 'grades' | 'notifications';

class PersistentMap<T> extends Map<string, T> {
  constructor(private readonly collection: CollectionName, private readonly save: (collection: CollectionName, id?: string, value?: T, clear?: boolean) => void) { super(); }
  override set(id: string, value: T) { super.set(id, value); this.save(this.collection, id, value); return this; }
  override delete(id: string) { const result = super.delete(id); if (result) this.save(this.collection, id); return result; }
  override clear() { const hadValues = this.size > 0; super.clear(); if (hadValues) this.save(this.collection, undefined, undefined, true); }
  hydrate(entries: Array<[string, T]>) { super.clear(); entries.forEach(([id, value]) => super.set(id, value)); }
}

// PostgreSQL-backed multi-tenant ERP store. Maps preserve existing route contracts.
export class ERPDatabase {
  private persistence?: PostgresPersistence;
  private persistChange = (collection: CollectionName, id?: string, value?: unknown, clear?: boolean) => {
    if (!this.persistence) return;
    void this.persistence.queue({ collection, id, value, clear }).catch((error) => console.error('Failed to persist ERP change:', error));
  };
  organizations = new PersistentMap<Organization>('organizations', this.persistChange);
  users = new PersistentMap<User & { password_hash: string }>('users', this.persistChange);
  departments = new PersistentMap<Department>('departments', this.persistChange);
  courses = new PersistentMap<Course>('courses', this.persistChange);
  batches = new PersistentMap<Batch>('batches', this.persistChange);
  studentProfiles = new PersistentMap<StudentProfile>('studentProfiles', this.persistChange);
  subjects = new PersistentMap<Subject>('subjects', this.persistChange);
  syllabusUnits = new PersistentMap<SyllabusUnit>('syllabusUnits', this.persistChange);
  classrooms = new PersistentMap<Classroom>('classrooms', this.persistChange);
  timetables = new PersistentMap<TimetableSlot>('timetables', this.persistChange);
  attendanceLogs = new PersistentMap<AttendanceLog>('attendanceLogs', this.persistChange);
  feeStructures = new PersistentMap<FeeStructure>('feeStructures', this.persistChange);
  feePayments = new PersistentMap<FeePayment>('feePayments', this.persistChange);
  grades = new PersistentMap<GradeAssessment>('grades', this.persistChange);
  notifications = new PersistentMap<Notification>('notifications', this.persistChange);

  constructor() {
    this.seedDatabase();
  }

  async initialize() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production.');
      console.warn('DATABASE_URL is not set: running ephemeral demo data. Set it to keep records across restarts.');
      return;
    }

    this.persistence = new PostgresPersistence(connectionString);
    await this.persistence.connect();
    const records = await this.persistence.load();
    if (records.length === 0) {
      if (process.env.SEED_DEMO_DATA === 'false') {
        this.collections().forEach(([, map]) => map.hydrate([]));
      }
      for (const [collection, map] of this.collections()) {
        for (const [id, value] of map.entries()) this.persistChange(collection, id, value);
      }
      await this.persistence.flush();
      return;
    }

    const grouped = new Map<CollectionName, Array<[string, unknown]>>();
    records.forEach((record) => {
      if (this.collections().some(([name]) => name === record.collection)) {
        const name = record.collection as CollectionName;
        grouped.set(name, [...(grouped.get(name) || []), [record.id, record.data]]);
      }
    });
    this.collections().forEach(([name, map]) => map.hydrate((grouped.get(name) || []) as Array<[string, never]>));
  }

  async flush() { await this.persistence?.flush(); }
  async close() { await this.persistence?.close(); }

  private collections(): Array<[CollectionName, PersistentMap<any>]> {
    return [
      ['organizations', this.organizations], ['users', this.users], ['departments', this.departments], ['courses', this.courses],
      ['batches', this.batches], ['studentProfiles', this.studentProfiles], ['subjects', this.subjects], ['syllabusUnits', this.syllabusUnits],
      ['classrooms', this.classrooms], ['timetables', this.timetables], ['attendanceLogs', this.attendanceLogs], ['feeStructures', this.feeStructures],
      ['feePayments', this.feePayments], ['grades', this.grades], ['notifications', this.notifications],
    ];
  }

  seedDatabase() {
    this.organizations.clear();
    this.users.clear();
    this.departments.clear();
    this.courses.clear();
    this.batches.clear();
    this.studentProfiles.clear();
    this.subjects.clear();
    this.syllabusUnits.clear();
    this.classrooms.clear();
    this.timetables.clear();
    this.attendanceLogs.clear();
    this.feeStructures.clear();
    this.feePayments.clear();
    this.grades.clear();
    this.notifications.clear();

    const passwordHash = bcrypt.hashSync('Password@123', 8);

    // 1. Organizations
    const org1: Organization = {
      id: 'org_apex',
      name: 'Apex Institute of Technology',
      code: 'APEX',
      domain: 'apextech.edu',
      address: '100 Silicon Valley Blvd, CA',
      phone: '+1 (555) 019-2831',
      created_at: new Date().toISOString(),
    };
    const org2: Organization = {
      id: 'org_metro',
      name: 'Metropolitan University',
      code: 'METRO',
      domain: 'metrouniv.edu',
      address: '45 University Heights, NY',
      phone: '+1 (555) 091-7744',
      created_at: new Date().toISOString(),
    };
    this.organizations.set(org1.id, org1);
    this.organizations.set(org2.id, org2);

    // 2. Users (Super-Admin, Admin, Faculty, Student)
    const superAdminUser: User & { password_hash: string } = {
      id: 'usr_superadmin_1',
      org_id: org1.id,
      email: 'superadmin@nexus.edu',
      name: 'System Super-Admin',
      role: 'super_admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
      password_hash: passwordHash,
    };
    this.users.set(superAdminUser.id, superAdminUser);

    const adminUser: User & { password_hash: string } = {
      id: 'usr_admin_1',
      org_id: org1.id,
      email: 'admin@apextech.edu',
      name: 'Dr. Eleanor Vance (Dean & Admin)',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
      password_hash: passwordHash,
    };
    this.users.set(adminUser.id, adminUser);

    const faculty1: User & { password_hash: string } = {
      id: 'usr_fac_1',
      org_id: org1.id,
      email: 'alan.turing@apextech.edu',
      name: 'Prof. Alan Turing',
      role: 'faculty',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
      password_hash: passwordHash,
    };
    const faculty2: User & { password_hash: string } = {
      id: 'usr_fac_2',
      org_id: org1.id,
      email: 'ada.lovelace@apextech.edu',
      name: 'Dr. Ada Lovelace',
      role: 'faculty',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
      password_hash: passwordHash,
    };
    const faculty3: User & { password_hash: string } = {
      id: 'usr_fac_3',
      org_id: org1.id,
      email: 'claude.shannon@apextech.edu',
      name: 'Prof. Claude Shannon',
      role: 'faculty',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
      password_hash: passwordHash,
    };
    this.users.set(faculty1.id, faculty1);
    this.users.set(faculty2.id, faculty2);
    this.users.set(faculty3.id, faculty3);

    // 3. Departments
    const deptCS: Department = {
      id: 'dept_cs',
      org_id: org1.id,
      name: 'Computer Science & Engineering',
      code: 'CSE',
      head_faculty_id: faculty1.id,
      created_at: new Date().toISOString(),
    };
    const deptECE: Department = {
      id: 'dept_ece',
      org_id: org1.id,
      name: 'Electronics & Communication',
      code: 'ECE',
      head_faculty_id: faculty3.id,
      created_at: new Date().toISOString(),
    };
    this.departments.set(deptCS.id, deptCS);
    this.departments.set(deptECE.id, deptECE);

    // 4. Courses
    const courseBTechCSE: Course = {
      id: 'crs_btech_cse',
      org_id: org1.id,
      department_id: deptCS.id,
      name: 'B.Tech in Computer Science and Engineering',
      code: 'CS101',
      total_semesters: 8,
      degree_type: 'B.Tech',
      created_at: new Date().toISOString(),
    };
    const courseMTechAI: Course = {
      id: 'crs_mtech_ai',
      org_id: org1.id,
      department_id: deptCS.id,
      name: 'M.Tech in Artificial Intelligence & Data Science',
      code: 'AI201',
      total_semesters: 4,
      degree_type: 'M.Tech',
      created_at: new Date().toISOString(),
    };
    this.courses.set(courseBTechCSE.id, courseBTechCSE);
    this.courses.set(courseMTechAI.id, courseMTechAI);

    // 5. Batches
    const batchCSE2024A: Batch = {
      id: 'batch_cse_2024_a',
      org_id: org1.id,
      course_id: courseBTechCSE.id,
      name: 'CSE Class of 2024 - Section A',
      start_year: 2022,
      end_year: 2026,
      current_semester: 5,
      section: 'A',
      created_at: new Date().toISOString(),
    };
    const batchCSE2024B: Batch = {
      id: 'batch_cse_2024_b',
      org_id: org1.id,
      course_id: courseBTechCSE.id,
      name: 'CSE Class of 2024 - Section B',
      start_year: 2022,
      end_year: 2026,
      current_semester: 5,
      section: 'B',
      created_at: new Date().toISOString(),
    };
    this.batches.set(batchCSE2024A.id, batchCSE2024A);
    this.batches.set(batchCSE2024B.id, batchCSE2024B);

    // 6. Subjects for CSE Sem 5
    const subOS: Subject = {
      id: 'sub_os_501',
      org_id: org1.id,
      course_id: courseBTechCSE.id,
      code: 'CS501',
      name: 'Operating Systems & Concurrency',
      credits: 4,
      semester: 5,
      type: 'Theory',
      created_at: new Date().toISOString(),
    };
    const subDBMS: Subject = {
      id: 'sub_dbms_502',
      org_id: org1.id,
      course_id: courseBTechCSE.id,
      code: 'CS502',
      name: 'Database Management & Distributed SQL',
      credits: 4,
      semester: 5,
      type: 'Theory',
      created_at: new Date().toISOString(),
    };
    const subCN: Subject = {
      id: 'sub_cn_503',
      org_id: org1.id,
      course_id: courseBTechCSE.id,
      code: 'CS503',
      name: 'Computer Networks & Protocols',
      credits: 3,
      semester: 5,
      type: 'Theory',
      created_at: new Date().toISOString(),
    };
    const subDBLab: Subject = {
      id: 'sub_dblab_504',
      org_id: org1.id,
      course_id: courseBTechCSE.id,
      code: 'CS504L',
      name: 'Database Systems & SQL Lab',
      credits: 2,
      semester: 5,
      type: 'Lab',
      created_at: new Date().toISOString(),
    };
    this.subjects.set(subOS.id, subOS);
    this.subjects.set(subDBMS.id, subDBMS);
    this.subjects.set(subCN.id, subCN);
    this.subjects.set(subDBLab.id, subDBLab);

    // 7. Syllabus Units
    const syllabusData: SyllabusUnit[] = [
      { id: 'syl_1', org_id: org1.id, subject_id: subOS.id, unit_number: 1, title: 'Process Management, Threads & CPU Scheduling', total_hours: 12, completed_hours: 12, status: 'Completed' },
      { id: 'syl_2', org_id: org1.id, subject_id: subOS.id, unit_number: 2, title: 'Process Synchronization, Semaphores & Deadlocks', total_hours: 14, completed_hours: 10, status: 'In Progress' },
      { id: 'syl_3', org_id: org1.id, subject_id: subOS.id, unit_number: 3, title: 'Memory Management, Paging & Virtual Memory', total_hours: 12, completed_hours: 4, status: 'In Progress' },
      { id: 'syl_4', org_id: org1.id, subject_id: subOS.id, unit_number: 4, title: 'Storage Systems, File System Structure & I/O Systems', total_hours: 10, completed_hours: 0, status: 'Not Started' },
      { id: 'syl_5', org_id: org1.id, subject_id: subDBMS.id, unit_number: 1, title: 'Relational Model, ER Diagrams & Relational Algebra', total_hours: 10, completed_hours: 10, status: 'Completed' },
      { id: 'syl_6', org_id: org1.id, subject_id: subDBMS.id, unit_number: 2, title: 'SQL Queries, Triggers, Views & Normalization (1NF-BCNF)', total_hours: 14, completed_hours: 14, status: 'Completed' },
      { id: 'syl_7', org_id: org1.id, subject_id: subDBMS.id, unit_number: 3, title: 'Transaction Processing, ACID Properties & Concurrency Control', total_hours: 12, completed_hours: 8, status: 'In Progress' },
      { id: 'syl_8', org_id: org1.id, subject_id: subDBMS.id, unit_number: 4, title: 'Distributed Databases, Sharding & NoSQL Systems', total_hours: 10, completed_hours: 0, status: 'Not Started' },
    ];
    syllabusData.forEach((s) => this.syllabusUnits.set(s.id, s));

    // 8. Classrooms
    const rooms: Classroom[] = [
      { id: 'rm_lh_101', org_id: org1.id, room_number: 'LH-101 (Auditorium Hall)', building: 'Main Science Block', capacity: 120, type: 'Lecture Hall' },
      { id: 'rm_lh_202', org_id: org1.id, room_number: 'LH-202 (Tiered Classroom)', building: 'Main Science Block', capacity: 60, type: 'Lecture Hall' },
      { id: 'rm_lab_301', org_id: org1.id, room_number: 'LAB-301 (Turing Computing Center)', building: 'Computing Block', capacity: 45, type: 'Computer Lab' },
      { id: 'rm_sem_401', org_id: org1.id, room_number: 'SEM-401 (Executive Seminar Room)', building: 'Innovation Tower', capacity: 50, type: 'Seminar Hall' },
    ];
    rooms.forEach((r) => this.classrooms.set(r.id, r));

    // 9. Timetables (with realistic week slots)
    const timetableData: TimetableSlot[] = [
      { id: 'tt_1', org_id: org1.id, batch_id: batchCSE2024A.id, subject_id: subOS.id, faculty_id: faculty1.id, room_id: rooms[1].id, day_of_week: 'Monday', start_time: '09:00', end_time: '10:00' },
      { id: 'tt_2', org_id: org1.id, batch_id: batchCSE2024A.id, subject_id: subDBMS.id, faculty_id: faculty2.id, room_id: rooms[1].id, day_of_week: 'Monday', start_time: '10:00', end_time: '11:00' },
      { id: 'tt_3', org_id: org1.id, batch_id: batchCSE2024A.id, subject_id: subCN.id, faculty_id: faculty3.id, room_id: rooms[0].id, day_of_week: 'Monday', start_time: '11:15', end_time: '12:15' },
      { id: 'tt_4', org_id: org1.id, batch_id: batchCSE2024A.id, subject_id: subDBLab.id, faculty_id: faculty2.id, room_id: rooms[2].id, day_of_week: 'Monday', start_time: '13:30', end_time: '15:30' },
      { id: 'tt_5', org_id: org1.id, batch_id: batchCSE2024A.id, subject_id: subOS.id, faculty_id: faculty1.id, room_id: rooms[1].id, day_of_week: 'Tuesday', start_time: '09:00', end_time: '10:00' },
      { id: 'tt_6', org_id: org1.id, batch_id: batchCSE2024A.id, subject_id: subDBMS.id, faculty_id: faculty2.id, room_id: rooms[1].id, day_of_week: 'Tuesday', start_time: '10:00', end_time: '11:00' },
      { id: 'tt_7', org_id: org1.id, batch_id: batchCSE2024A.id, subject_id: subCN.id, faculty_id: faculty3.id, room_id: rooms[0].id, day_of_week: 'Wednesday', start_time: '09:00', end_time: '10:00' },
      { id: 'tt_8', org_id: org1.id, batch_id: batchCSE2024A.id, subject_id: subOS.id, faculty_id: faculty1.id, room_id: rooms[1].id, day_of_week: 'Wednesday', start_time: '10:00', end_time: '11:00' },
      { id: 'tt_9', org_id: org1.id, batch_id: batchCSE2024A.id, subject_id: subDBMS.id, faculty_id: faculty2.id, room_id: rooms[1].id, day_of_week: 'Thursday', start_time: '11:15', end_time: '12:15' },
      { id: 'tt_10', org_id: org1.id, batch_id: batchCSE2024A.id, subject_id: subOS.id, faculty_id: faculty1.id, room_id: rooms[1].id, day_of_week: 'Friday', start_time: '09:00', end_time: '10:00' },
    ];
    timetableData.forEach((tt) => this.timetables.set(tt.id, tt));

    // 10. Fee Structure
    const fee1: FeeStructure = {
      id: 'fee_struct_5',
      org_id: org1.id,
      batch_id: batchCSE2024A.id,
      title: 'Semester 5 Tuition, Lab & Campus Amenities Fee',
      semester: 5,
      total_amount: 4500,
      due_date: '2026-09-30',
      description: 'Covers core tuition, high-performance computing lab access, library subscriptions, and university healthcare.',
    };
    this.feeStructures.set(fee1.id, fee1);

    // 11. 100 Demo Students with real profiles, attendance records, grades & fee payments!
    const studentNames = [
      'Marcus Aurelius Bennett', 'Sophia Chen', 'Rohan Sharma', 'Liam O’Connor', 'Elena Rostova',
      'Alex Rivera', 'Zara Patel', 'Tariq Al-Mansoor', 'Chloe Dubois', 'David Kim',
      'Ananya Iyer', 'Mateo Fernandez', 'Grace Hopper Jones', 'Kavita Reddy', 'Lucas Silva',
      'Maya Lin', 'Arjun Kapoor', 'Fatima Zahra', 'Noah Washington', 'Emily Watson',
      'Gabriel Santos', 'Priya Nair', 'Ethan Walker', 'Hanna Becker', 'Dev Patel',
      'Isabella Rossi', 'Vikram Malhotra', 'Aisha Khan', 'Julian Vance', 'Olivia Taylor',
      'Samuel Jackson', 'Nisha Gupta', 'Alexander Bell', 'Zoe Martin', 'Karan Johar',
      'Camila Rodriguez', 'Aditya Verma', 'Mei Ling', 'Oscar Wilde Jr.', 'Sneha Roy',
      'Benjamin Franklin IV', 'Divya Menon', 'Daniel Craig', 'Amara Okafor', 'Siddharth Rao',
      'Victoria Cruz', 'Harsh Vardhan', 'Layla Hassan', 'Oliver Twist', 'Deepika Padukone',
      'William Shakespeare III', 'Tanvi Joshi', 'James Bond', 'Farhan Akhtar', 'Mia Khalifa',
      'George Orwell', 'Pooja Hegde', 'Henry Ford', 'Anushka Sharma', 'Charles Darwin',
      'Shraddha Kapoor', 'Albert Einstein Jr.', 'Manish Malhotra', 'Marie Curie II', 'Rishi Sunak',
      'Kriti Sanon', 'Isaac Newton', 'Varun Dhawan', 'Rosalind Franklin', 'Ranbir Kapoor',
      'Nikola Tesla', 'Alia Bhatt', 'Thomas Edison', 'Kartik Aaryan', 'Ada Lovelace Jr.',
      'Sanjay Dutt', 'Galileo Galilei', 'Shah Rukh Khan', 'Johannes Kepler', 'Aamir Khan',
      'Stephen Hawking', 'Salman Khan', 'Carl Sagan', 'Ranveer Singh', 'Richard Feynman',
      'Ayushmann Khurrana', 'Niels Bohr', 'Vicky Kaushal', 'Max Planck', 'Rajkummar Rao',
      'Erwin Schrodinger', 'Shahid Kapoor', 'Werner Heisenberg', 'Akshay Kumar', 'Paul Dirac',
      'Hrithik Roshan', 'Enrico Fermi', 'John von Neumann', 'Claude Shannon Jr.', 'Srinivasa Ramanujan'
    ];

    studentNames.forEach((name, index) => {
      const idx = index + 1;
      const rollNo = `24CS${String(idx).padStart(3, '0')}`;
      const email = `student${idx}@apextech.edu`;
      const isPrimaryDemo = idx === 1; // Primary demo student: Marcus Aurelius Bennett

      const studentUser: User & { password_hash: string } = {
        id: `usr_stu_${idx}`,
        org_id: org1.id,
        email: email,
        name: name,
        role: 'student',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${rollNo}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
        created_at: new Date().toISOString(),
        password_hash: passwordHash,
      };
      this.users.set(studentUser.id, studentUser);

      const profile: StudentProfile = {
        id: `prof_stu_${idx}`,
        org_id: org1.id,
        user_id: studentUser.id,
        batch_id: idx <= 50 ? batchCSE2024A.id : batchCSE2024B.id,
        roll_number: rollNo,
        admission_date: '2022-08-15',
        parent_contact: `+1 (555) 010-${String(1000 + idx)}`,
        biometric_id: `BIO-RFID-${rollNo}`,
      };
      this.studentProfiles.set(profile.id, profile);

      // Attendance history generation (last 14 days of classes)
      const pastDates = [
        '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14',
        '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21',
        '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27',
      ];

      pastDates.forEach((date, dIdx) => {
        // give demo student 88% attendance, some students lower (<75%) to demonstrate automated alerts
        const isCriticalStudent = idx === 4 || idx === 8 || idx === 15;
        let status: 'Present' | 'Absent' | 'Late' = 'Present';
        if (isCriticalStudent) {
          status = (dIdx % 2 === 0) ? 'Absent' : 'Present';
        } else if (idx === 1) {
          status = dIdx === 3 ? 'Absent' : dIdx === 7 ? 'Late' : 'Present';
        } else {
          const rand = (idx * 17 + dIdx * 23) % 10;
          status = rand > 8 ? 'Absent' : rand === 8 ? 'Late' : 'Present';
        }

        const logOS: AttendanceLog = {
          id: `att_${idx}_os_${dIdx}`,
          org_id: org1.id,
          student_id: profile.id,
          subject_id: subOS.id,
          date: date,
          status: status,
          marked_by: faculty1.id,
          marked_at: `${date}T09:05:00.000Z`,
        };
        this.attendanceLogs.set(logOS.id, logOS);

        const logDBMS: AttendanceLog = {
          id: `att_${idx}_dbms_${dIdx}`,
          org_id: org1.id,
          student_id: profile.id,
          subject_id: subDBMS.id,
          date: date,
          status: status === 'Absent' && dIdx % 2 === 0 ? 'Absent' : 'Present',
          marked_by: faculty2.id,
          marked_at: `${date}T10:04:00.000Z`,
        };
        this.attendanceLogs.set(logDBMS.id, logDBMS);
      });

      // Fee payments
      if (idx % 3 === 0) {
        // Partial or unpaid
        const payment: FeePayment = {
          id: `pay_${idx}_1`,
          org_id: org1.id,
          student_id: profile.id,
          fee_structure_id: fee1.id,
          amount_paid: 2000,
          payment_date: '2026-08-01',
          payment_method: 'UPI',
          transaction_id: `TXN-UPI-${88000 + idx}`,
          receipt_no: `REC-2026-08-${String(idx).padStart(4, '0')}`,
          status: 'Success',
        };
        this.feePayments.set(payment.id, payment);
      } else if (idx % 3 === 1) {
        // Fully paid
        const payment: FeePayment = {
          id: `pay_${idx}_1`,
          org_id: org1.id,
          student_id: profile.id,
          fee_structure_id: fee1.id,
          amount_paid: 4500,
          payment_date: '2026-07-28',
          payment_method: 'Net Banking',
          transaction_id: `TXN-NB-${99000 + idx}`,
          receipt_no: `REC-2026-07-${String(idx).padStart(4, '0')}`,
          status: 'Success',
        };
        this.feePayments.set(payment.id, payment);
      } // idx % 3 === 2 is unpaid (due)

      // Grades and Assessments
      const gradeOSMid: GradeAssessment = {
        id: `grd_${idx}_os_mid`,
        org_id: org1.id,
        student_id: profile.id,
        subject_id: subOS.id,
        assessment_type: 'Midterm',
        marks_obtained: Math.min(100, 68 + ((idx * 13) % 30)),
        max_marks: 100,
        grade_point: 8.5,
        semester: 5,
      };
      const gradeDBMSMid: GradeAssessment = {
        id: `grd_${idx}_dbms_mid`,
        org_id: org1.id,
        student_id: profile.id,
        subject_id: subDBMS.id,
        assessment_type: 'Midterm',
        marks_obtained: Math.min(100, 72 + ((idx * 17) % 27)),
        max_marks: 100,
        grade_point: 9.0,
        semester: 5,
      };
      const gradeQuiz: GradeAssessment = {
        id: `grd_${idx}_cn_quiz`,
        org_id: org1.id,
        student_id: profile.id,
        subject_id: subCN.id,
        assessment_type: 'Quiz',
        marks_obtained: 22 + ((idx * 7) % 8),
        max_marks: 30,
        grade_point: 8.0,
        semester: 5,
      };
      this.grades.set(gradeOSMid.id, gradeOSMid);
      this.grades.set(gradeDBMSMid.id, gradeDBMSMid);
      this.grades.set(gradeQuiz.id, gradeQuiz);

      // Pre-seed low attendance notification if critical
      if (idx === 4 || idx === 8) {
        const notif: Notification = {
          id: `notif_low_${idx}`,
          org_id: org1.id,
          user_id: studentUser.id,
          title: '⚠️ Academic Warning: Low Attendance (< 75%)',
          message: `Your current cumulative attendance in Operating Systems is 57.1%. University regulations mandate a minimum of 75% to be eligible for end-semester examinations.`,
          type: 'low_attendance',
          is_read: false,
          created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        };
        this.notifications.set(notif.id, notif);
      }
    });

    // Seed welcoming notifications for Admin & Faculty
    const adminNotif: Notification = {
      id: 'notif_adm_welcome',
      org_id: org1.id,
      user_id: adminUser.id,
      title: '🏫 Multi-Tenant ERP Cluster Initialized',
      message: 'System loaded 100 active student records, 4 academic departments, conflict-checked timetables, and biometrics gateway.',
      type: 'system',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    this.notifications.set(adminNotif.id, adminNotif);
  }

  // Conflict Detection for Timetable Scheduling
  // Returns conflict reason if room, faculty, or batch collision exists
  checkTimetableConflict(
    org_id: string,
    slot: {
      id?: string;
      batch_id: string;
      faculty_id: string;
      room_id: string;
      day_of_week: string;
      start_time: string;
      end_time: string;
    }
  ): { hasConflict: boolean; reason?: string; conflictingSlot?: TimetableSlot } {
    const startNum = this.timeToMinutes(slot.start_time);
    const endNum = this.timeToMinutes(slot.end_time);

    if (startNum >= endNum) {
      return { hasConflict: true, reason: 'Invalid time range: start time must precede end time.' };
    }

    const allSlots = Array.from(this.timetables.values()).filter(
      (t) => t.org_id === org_id && t.day_of_week === slot.day_of_week && t.id !== slot.id
    );

    for (const existing of allSlots) {
      const eStart = this.timeToMinutes(existing.start_time);
      const eEnd = this.timeToMinutes(existing.end_time);

      const timesOverlap = Math.max(startNum, eStart) < Math.min(endNum, eEnd);
      if (!timesOverlap) continue;

      // 1. Room collision
      if (existing.room_id === slot.room_id) {
        const room = this.classrooms.get(slot.room_id);
        const roomName = room ? room.room_number : 'Selected Classroom';
        return {
          hasConflict: true,
          reason: `Room Conflict (HTTP 409): ${roomName} is already occupied on ${slot.day_of_week} from ${existing.start_time} to ${existing.end_time}.`,
          conflictingSlot: existing,
        };
      }

      // 2. Faculty collision
      if (existing.faculty_id === slot.faculty_id) {
        const faculty = this.users.get(slot.faculty_id);
        const facName = faculty ? faculty.name : 'Faculty member';
        return {
          hasConflict: true,
          reason: `Faculty Conflict (HTTP 409): ${facName} is already assigned to teach another class on ${slot.day_of_week} from ${existing.start_time} to ${existing.end_time}.`,
          conflictingSlot: existing,
        };
      }

      // 3. Batch collision
      if (existing.batch_id === slot.batch_id) {
        const batch = this.batches.get(slot.batch_id);
        const batchName = batch ? batch.name : 'Batch';
        return {
          hasConflict: true,
          reason: `Batch Collision (HTTP 409): ${batchName} already has another subject scheduled on ${slot.day_of_week} from ${existing.start_time} to ${existing.end_time}.`,
          conflictingSlot: existing,
        };
      }
    }

    return { hasConflict: false };
  }

  private timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
}

export const db = new ERPDatabase();
