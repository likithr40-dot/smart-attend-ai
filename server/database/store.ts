import fs from 'node:fs';
import path from 'node:path';
import { hashPassword } from '../core/security';
import type { DatabaseState, StoredUser } from '../types';
import type {
  AttendanceRecord,
  AttendanceSession,
  ClassroomClass,
  Department,
  Faculty,
  NotificationItem,
  Student,
  Subject,
} from '../../src/types';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'smart-attend-db.json');

function createSeedData(): DatabaseState {
  const now = '2026-11-18T08:00:00.000Z';

  const departments: Department[] = [
    {
      departmentId: 'DEPT_CSE',
      code: 'CSE',
      name: 'Computer Science & Engineering',
      headName: 'Dr. Ananya Rao',
    },
    {
      departmentId: 'DEPT_ECE',
      code: 'ECE',
      name: 'Electronics & Communication Engineering',
      headName: 'Prof. Kavita Iyer',
    },
  ];

  const faculty: Faculty[] = [
    {
      facultyId: 'FAC01',
      ownerUid: 'uid_fac_01',
      name: 'Dr. Ananya Rao',
      email: 'ananya.rao@smartattend.edu',
      department: 'CSE',
      designation: 'Associate Professor',
      assignedSubjectIds: ['SUB_CS501'],
      isActive: true,
      createdAt: '2026-08-15T09:00:00.000Z',
    },
    {
      facultyId: 'FAC02',
      ownerUid: 'uid_fac_02',
      name: 'Prof. Rohan Menon',
      email: 'rohan.menon@smartattend.edu',
      department: 'CSE',
      designation: 'Assistant Professor',
      assignedSubjectIds: ['SUB_CS502'],
      isActive: true,
      createdAt: '2026-08-15T09:00:00.000Z',
    },
    {
      facultyId: 'FAC03',
      ownerUid: 'uid_fac_03',
      name: 'Prof. Kavita Iyer',
      email: 'kavita.iyer@smartattend.edu',
      department: 'ECE',
      designation: 'Professor & Chair',
      assignedSubjectIds: ['SUB_EC501', 'SUB_EC601'],
      isActive: true,
      createdAt: '2026-08-15T09:00:00.000Z',
    },
  ];

  const subjects: Subject[] = [
    {
      subjectId: 'SUB_CS501',
      code: 'CS501',
      name: 'Machine Learning Systems',
      department: 'CSE',
      semester: 5,
      facultyId: 'FAC01',
    },
    {
      subjectId: 'SUB_CS502',
      code: 'CS502',
      name: 'Cloud Computing & Architecture',
      department: 'CSE',
      semester: 5,
      facultyId: 'FAC02',
    },
    {
      subjectId: 'SUB_EC501',
      code: 'EC501',
      name: 'Digital Signal Processing',
      department: 'ECE',
      semester: 5,
      facultyId: 'FAC03',
    },
    {
      subjectId: 'SUB_EC601',
      code: 'EC601',
      name: 'VLSI & Embedded Systems',
      department: 'ECE',
      semester: 6,
      facultyId: 'FAC03',
    },
  ];

  const classes: ClassroomClass[] = [
    {
      classId: 'CLS_CSE_5A',
      name: 'CSE-5A',
      department: 'CSE',
      semester: 5,
      room: 'Block A-301',
    },
    {
      classId: 'CLS_CSE_5B',
      name: 'CSE-5B',
      department: 'CSE',
      semester: 5,
      room: 'Block A-302',
    },
    {
      classId: 'CLS_ECE_5A',
      name: 'ECE-5A',
      department: 'ECE',
      semester: 5,
      room: 'Block B-204',
    },
    {
      classId: 'CLS_ECE_6A',
      name: 'ECE-6A',
      department: 'ECE',
      semester: 6,
      room: 'Block B-305',
    },
  ];

  const studentNames = [
    ['Aarav Sharma', 'CSE', 5, 'CLS_CSE_5A', true],
    ['Diya Patel', 'CSE', 5, 'CLS_CSE_5A', true],
    ['Vihaan Kulkarni', 'CSE', 5, 'CLS_CSE_5A', true],
    ['Anika Verma', 'CSE', 5, 'CLS_CSE_5A', true],
    ['Kabir Nair', 'CSE', 5, 'CLS_CSE_5A', false],
    ['Meera Krishnan', 'CSE', 5, 'CLS_CSE_5B', true],
    ['Arjun Reddy', 'CSE', 5, 'CLS_CSE_5B', true],
    ['Saanvi Deshpande', 'CSE', 5, 'CLS_CSE_5B', true],
    ['Reyansh Gupta', 'CSE', 5, 'CLS_CSE_5B', false],
    ['Ishita Bose', 'CSE', 5, 'CLS_CSE_5B', true],
    ['Aditya Joshi', 'ECE', 5, 'CLS_ECE_5A', true],
    ['Nandini Rao', 'ECE', 5, 'CLS_ECE_5A', true],
    ['Pranav Hegde', 'ECE', 5, 'CLS_ECE_5A', false],
    ['Tanvi Malhotra', 'ECE', 5, 'CLS_ECE_5A', true],
    ['Siddharth Menon', 'ECE', 5, 'CLS_ECE_5A', true],
    ['Riya Chatterjee', 'ECE', 6, 'CLS_ECE_6A', true],
    ['Devansh Tiwari', 'ECE', 6, 'CLS_ECE_6A', true],
    ['Zoya Khan', 'ECE', 6, 'CLS_ECE_6A', false],
    ['Karthik Subramanian', 'ECE', 6, 'CLS_ECE_6A', true],
    ['Pooja Bhat', 'ECE', 6, 'CLS_ECE_6A', false],
  ] as const;

  const students: Student[] = studentNames.map(([name, dept, sem, classId, enrolled], idx) => {
    const num = String(idx + 1).padStart(3, '0');
    const slug = name.toLowerCase().replace(/\s+/g, '.');
    return {
      studentId: `STU${num}`,
      ownerUid: `uid_stu_${num}`,
      name,
      email: `${slug}@smartattend.edu`,
      department: dept,
      semester: sem,
      classId,
      role: 'student',
      faceEnrolled: enrolled,
      biometricConsent: enrolled,
      consentTimestamp: enrolled ? '2026-09-02T10:00:00.000Z' : undefined,
      isActive: true,
      createdAt: '2026-08-20T09:00:00.000Z',
    };
  });

  const adminPass = hashPassword('Admin@123');
  const facultyPass = hashPassword('Faculty@123');
  const studentPass = hashPassword('Student@123');

  const users: StoredUser[] = [
    {
      uid: 'uid_admin_01',
      name: 'Dr. Vikram Deshmukh',
      email: 'admin@smartattend.edu',
      passwordHash: adminPass,
      role: 'admin',
      department: 'ADMIN',
      isActive: true,
      createdAt: now,
    },
    ...faculty.map((f) => ({
      uid: f.ownerUid || `uid_${f.facultyId}`,
      name: f.name,
      email: f.email,
      passwordHash: facultyPass,
      role: 'faculty' as const,
      department: f.department,
      facultyId: f.facultyId,
      isActive: true,
      createdAt: now,
    })),
    ...students.map((s) => ({
      uid: s.ownerUid || `uid_${s.studentId}`,
      name: s.name,
      email: s.email,
      passwordHash: studentPass,
      role: 'student' as const,
      department: s.department,
      studentId: s.studentId,
      isActive: true,
      createdAt: now,
    })),
  ];

  const sessions: AttendanceSession[] = [
    { sessionId: 'SES_001', department: 'CSE', semester: 5, subjectId: 'SUB_CS501', classId: 'CLS_CSE_5A', facultyId: 'FAC01', date: '2026-10-12', durationMinutes: 60, status: 'completed', mode: 'ai', createdAt: '2026-10-12T09:00:00.000Z', endedAt: '2026-10-12T10:00:00.000Z' },
    { sessionId: 'SES_002', department: 'CSE', semester: 5, subjectId: 'SUB_CS502', classId: 'CLS_CSE_5A', facultyId: 'FAC02', date: '2026-10-19', durationMinutes: 60, status: 'completed', mode: 'ai', createdAt: '2026-10-19T10:00:00.000Z', endedAt: '2026-10-19T11:00:00.000Z' },
    { sessionId: 'SES_003', department: 'CSE', semester: 5, subjectId: 'SUB_CS501', classId: 'CLS_CSE_5B', facultyId: 'FAC01', date: '2026-10-26', durationMinutes: 60, status: 'completed', mode: 'manual', createdAt: '2026-10-26T09:00:00.000Z', endedAt: '2026-10-26T10:00:00.000Z' },
    { sessionId: 'SES_004', department: 'ECE', semester: 5, subjectId: 'SUB_EC501', classId: 'CLS_ECE_5A', facultyId: 'FAC03', date: '2026-11-02', durationMinutes: 60, status: 'completed', mode: 'ai', createdAt: '2026-11-02T11:00:00.000Z', endedAt: '2026-11-02T12:00:00.000Z' },
    { sessionId: 'SES_005', department: 'CSE', semester: 5, subjectId: 'SUB_CS501', classId: 'CLS_CSE_5A', facultyId: 'FAC01', date: '2026-11-11', durationMinutes: 60, status: 'completed', mode: 'ai', createdAt: '2026-11-11T09:00:00.000Z', endedAt: '2026-11-11T10:00:00.000Z' },
    { sessionId: 'SES_006', department: 'CSE', semester: 5, subjectId: 'SUB_CS502', classId: 'CLS_CSE_5A', facultyId: 'FAC02', date: '2026-11-12', durationMinutes: 60, status: 'completed', mode: 'ai', createdAt: '2026-11-12T10:00:00.000Z', endedAt: '2026-11-12T11:00:00.000Z' },
    { sessionId: 'SES_007', department: 'ECE', semester: 6, subjectId: 'SUB_EC601', classId: 'CLS_ECE_6A', facultyId: 'FAC03', date: '2026-11-13', durationMinutes: 60, status: 'completed', mode: 'manual', createdAt: '2026-11-13T14:00:00.000Z', endedAt: '2026-11-13T15:00:00.000Z' },
    { sessionId: 'SES_008', department: 'CSE', semester: 5, subjectId: 'SUB_CS501', classId: 'CLS_CSE_5B', facultyId: 'FAC01', date: '2026-11-16', durationMinutes: 60, status: 'completed', mode: 'ai', createdAt: '2026-11-16T09:00:00.000Z', endedAt: '2026-11-16T10:00:00.000Z' },
    { sessionId: 'SES_009', department: 'ECE', semester: 5, subjectId: 'SUB_EC501', classId: 'CLS_ECE_5A', facultyId: 'FAC03', date: '2026-11-17', durationMinutes: 60, status: 'completed', mode: 'ai', createdAt: '2026-11-17T11:00:00.000Z', endedAt: '2026-11-17T12:00:00.000Z' },
    { sessionId: 'SES_010', department: 'CSE', semester: 5, subjectId: 'SUB_CS501', classId: 'CLS_CSE_5A', facultyId: 'FAC01', date: '2026-11-18', durationMinutes: 60, status: 'active', mode: 'ai', createdAt: '2026-11-18T09:00:00.000Z' },
  ];

  const records: AttendanceRecord[] = [];
  let recCounter = 1;

  for (const session of sessions) {
    const classStudents = students.filter((s) => s.classId === session.classId);
    classStudents.forEach((student, sIdx) => {
      // Skip seeding records for the active SES_010 so faculty can mark live in AI/Manual Attendance,
      // except leave 1 sample Pending Review record to showcase verification!
      if (session.sessionId === 'SES_010') {
        if (sIdx === 0) {
          records.push({
            attendanceId: `ATT_${String(recCounter++).padStart(4, '0')}`,
            studentId: student.studentId,
            studentName: student.name,
            subjectId: session.subjectId,
            facultyId: session.facultyId,
            sessionId: session.sessionId,
            date: session.date,
            time: '09:08',
            status: 'Present',
            verificationMethod: 'AI-assisted',
            confidence: 0.94,
            updatedAt: `${session.date}T09:08:00.000Z`,
          });
        } else if (sIdx === 4) {
          records.push({
            attendanceId: `ATT_${String(recCounter++).padStart(4, '0')}`,
            studentId: student.studentId,
            studentName: student.name,
            subjectId: session.subjectId,
            facultyId: session.facultyId,
            sessionId: session.sessionId,
            date: session.date,
            time: '09:09',
            status: 'Pending Review',
            verificationMethod: 'AI-assisted',
            confidence: 0.71,
            updatedAt: `${session.date}T09:09:00.000Z`,
          });
        }
        return;
      }

      const deterministicHash = (recCounter + sIdx * 3) % 10;
      let status: AttendanceRecord['status'] = 'Present';
      if (student.studentId === 'STU005' || student.studentId === 'STU013') {
        status = deterministicHash < 5 ? 'Present' : 'Absent';
      } else if (deterministicHash === 9) {
        status = 'Pending Review';
      } else if (deterministicHash >= 7) {
        status = 'Absent';
      }

      const method = session.mode === 'ai' ? 'AI-assisted' : 'Manual';
      records.push({
        attendanceId: `ATT_${String(recCounter++).padStart(4, '0')}`,
        studentId: student.studentId,
        studentName: student.name,
        subjectId: session.subjectId,
        facultyId: session.facultyId,
        sessionId: session.sessionId,
        date: session.date,
        time: session.createdAt.slice(11, 16),
        status,
        verificationMethod: method,
        confidence: method === 'AI-assisted' ? (status === 'Pending Review' ? 0.74 : 0.93) : undefined,
        updatedAt: session.createdAt,
      });
    });
  }

  const notifications: NotificationItem[] = [
    {
      notificationId: 'NOTIF_001',
      recipientUid: 'uid_fac_01',
      targetRole: 'faculty',
      title: 'Uncertain match flagged for review',
      message: 'Kabir Nair (STU005) returned 71% confidence in CS501 session SES_010 and requires manual confirmation.',
      category: 'recorded',
      isRead: false,
      createdAt: '2026-11-18T09:10:00.000Z',
    },
    {
      notificationId: 'NOTIF_002',
      recipientUid: 'uid_stu_001',
      targetRole: 'student',
      title: 'Attendance recorded for CS501',
      message: 'Your attendance was verified as Present for Machine Learning Systems on 2026-11-18.',
      category: 'recorded',
      isRead: false,
      createdAt: '2026-11-18T09:08:00.000Z',
    },
    {
      notificationId: 'NOTIF_003',
      recipientUid: 'uid_stu_005',
      targetRole: 'student',
      title: 'Low attendance warning',
      message: 'Your current attendance across registered sessions is below the 75% institutional threshold.',
      category: 'warning',
      isRead: false,
      createdAt: '2026-11-17T16:30:00.000Z',
    },
    {
      notificationId: 'NOTIF_004',
      recipientUid: 'uid_admin_01',
      targetRole: 'admin',
      title: 'Monthly attendance report ready',
      message: 'November department-wise attendance analytics for CSE and ECE are ready for export.',
      category: 'report',
      isRead: false,
      createdAt: '2026-11-17T18:00:00.000Z',
    },
    {
      notificationId: 'NOTIF_005',
      recipientUid: 'uid_fac_03',
      targetRole: 'faculty',
      title: 'Attendance session completed',
      message: 'Session SES_009 for EC501 (Digital Signal Processing) was finalized and archived.',
      category: 'completed',
      isRead: true,
      createdAt: '2026-11-17T12:05:00.000Z',
    },
  ];

  return {
    users,
    students,
    faculty,
    departments,
    subjects,
    classes,
    sessions,
    records,
    faceTemplates: [],
    notifications,
  };
}

let memoryState: DatabaseState | null = null;

export function getDb(): DatabaseState {
  if (memoryState) return memoryState;

  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      memoryState = JSON.parse(raw) as DatabaseState;
      return memoryState;
    }
  } catch (err) {
    console.warn('Could not read persisted DB file, re-seeding:', err);
  }

  memoryState = createSeedData();
  persistDb();
  return memoryState;
}

export function persistDb(): void {
  if (!memoryState) return;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryState, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to persist DB state to disk:', err);
  }
}

export function resetDbForTesting(): DatabaseState {
  memoryState = createSeedData();
  persistDb();
  return memoryState;
}
