import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getDb, persistDb } from './server/database/store';
import {
  createBiometricDigest,
  encryptBiometricPayload,
  hashPassword,
  signJwt,
  verifyPassword,
} from './server/core/security';
import { requireAuth, requireRole, type AuthenticatedRequest } from './server/middleware/auth';
import { analyzeEnrollmentFrame, recognizeClassroomFrame } from './server/services/aiService';
import {
  buildAttendanceCsv,
  calculateAttendancePercentage,
  computeDepartmentComparison,
  computeMonthlyTrend,
  computeStudentSummary,
  computeSubjectComparison,
  computeWeeklyTrend,
  findStudentsRequiringReview,
  hasDuplicateAttendanceRecord,
} from './src/utils/attendanceCalculations';
import type {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  AuthUser,
  NotificationItem,
  Student,
  UserRole,
} from './src/types';

dotenv.config();

const PORT = 3000;

function toPublicAuthUser(user: ReturnType<typeof getDb>['users'][number]): AuthUser {
  const db = getDb();
  const student = user.studentId
    ? db.students.find((s) => s.studentId === user.studentId)
    : undefined;
  return {
    uid: user.uid,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    studentId: user.studentId,
    facultyId: user.facultyId,
    semester: student?.semester,
    faceEnrolled: student?.faceEnrolled,
    biometricConsent: student?.biometricConsent,
    isActive: user.isActive,
  };
}

function addNotification(
  recipientUid: string,
  targetRole: UserRole | 'all',
  title: string,
  message: string,
  category: NotificationItem['category']
) {
  const db = getDb();
  const notif: NotificationItem = {
    notificationId: `NOTIF_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    recipientUid,
    targetRole,
    title,
    message,
    category,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      aiVisionConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      timestamp: new Date().toISOString(),
    });
  });

  // --- AUTHENTICATION ---
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const db = getDb();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' });
      return;
    }

    const token = signJwt({
      uid: user.uid,
      email: user.email,
      role: user.role,
      name: user.name,
      studentId: user.studentId,
      facultyId: user.facultyId,
    });

    res.json({ token, user: toPublicAuthUser(user) });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, department, semester } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      department?: string;
      semester?: number;
    };

    if (!name || name.trim().length < 2 || !email || !password || password.length < 6) {
      res.status(400).json({
        error: 'Valid name, email, and password (minimum 6 characters) are required.',
      });
      return;
    }

    const db = getDb();
    const normalizedEmail = email.trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const nextNum = String(db.students.length + 1).padStart(3, '0');
    const studentId = `STU${nextNum}`;
    const uid = `uid_stu_${Date.now()}`;
    const dept = department || 'CSE';
    const sem = Number(semester) || 5;
    const matchedClass =
      db.classes.find((c) => c.department === dept && c.semester === sem) ?? db.classes[0];
    const now = new Date().toISOString();

    const newStudent: Student = {
      studentId,
      ownerUid: uid,
      name: name.trim(),
      email: normalizedEmail,
      department: dept,
      semester: sem,
      classId: matchedClass?.classId ?? 'CLS_CSE_5A',
      role: 'student',
      faceEnrolled: false,
      biometricConsent: false,
      isActive: true,
      createdAt: now,
    };

    const newUser = {
      uid,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      role: 'student' as const,
      department: dept,
      studentId,
      isActive: true,
      createdAt: now,
    };

    db.students.push(newStudent);
    db.users.push(newUser);
    persistDb();

    const token = signJwt({
      uid: newUser.uid,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
      studentId,
    });

    res.status(201).json({ token, user: toPublicAuthUser(newUser) });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body as { email?: string };
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    res.json({
      message:
        'If an account matches this email, password reset instructions have been queued by the institution administrator.',
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.uid === req.user?.uid);
    if (!user) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }
    res.json({ user: toPublicAuthUser(user) });
  });

  // --- STUDENTS ---
  app.get('/api/students', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { department, semester, search, classId } = req.query as Record<string, string | undefined>;
    let list = db.students;

    if (req.user?.role === 'student') {
      list = list.filter((s) => s.studentId === req.user?.studentId);
    }

    if (department && department !== 'ALL') {
      list = list.filter((s) => s.department === department);
    }
    if (semester && semester !== 'ALL') {
      list = list.filter((s) => s.semester === Number(semester));
    }
    if (classId && classId !== 'ALL') {
      list = list.filter((s) => s.classId === classId);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }

    res.json({ students: list });
  });

  app.post('/api/students', requireAuth, requireRole('admin'), (req, res) => {
    const { studentId, name, email, department, semester, classId, password } = req.body as {
      studentId?: string;
      name?: string;
      email?: string;
      department?: string;
      semester?: number;
      classId?: string;
      password?: string;
    };

    if (!name || name.trim().length < 2 || !email || !department) {
      res.status(400).json({ error: 'Name, email, and department are required.' });
      return;
    }

    const db = getDb();
    const normalizedEmail = email.trim().toLowerCase();
    if (db.students.some((s) => s.email.toLowerCase() === normalizedEmail)) {
      res.status(409).json({ error: 'A student with this email already exists.' });
      return;
    }

    const finalId =
      studentId && studentId.trim()
        ? studentId.trim().toUpperCase()
        : `STU${String(db.students.length + 1).padStart(3, '0')}`;

    if (db.students.some((s) => s.studentId === finalId)) {
      res.status(409).json({ error: `Student ID ${finalId} already exists.` });
      return;
    }

    const sem = Number(semester) || 5;
    const resolvedClass =
      classId ||
      db.classes.find((c) => c.department === department && c.semester === sem)?.classId ||
      'CLS_CSE_5A';
    const uid = `uid_stu_${Date.now()}`;
    const now = new Date().toISOString();

    const student: Student = {
      studentId: finalId,
      ownerUid: uid,
      name: name.trim(),
      email: normalizedEmail,
      department,
      semester: sem,
      classId: resolvedClass,
      role: 'student',
      faceEnrolled: false,
      biometricConsent: false,
      isActive: true,
      createdAt: now,
    };

    db.students.push(student);
    db.users.push({
      uid,
      name: student.name,
      email: student.email,
      passwordHash: hashPassword(password || 'Student@123'),
      role: 'student',
      department: student.department,
      studentId: student.studentId,
      isActive: true,
      createdAt: now,
    });
    persistDb();

    res.status(201).json({ student });
  });

  app.get('/api/students/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const student = db.students.find((s) => s.studentId === req.params.id);
    if (!student) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    if (req.user?.role === 'student' && req.user.studentId !== student.studentId) {
      res.status(403).json({ error: 'Access denied to other student records.' });
      return;
    }
    res.json({ student });
  });

  app.put('/api/students/:id', requireAuth, requireRole('admin'), (req, res) => {
    const db = getDb();
    const student = db.students.find((s) => s.studentId === req.params.id);
    if (!student) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    const { name, email, department, semester, classId, isActive } = req.body as Partial<Student>;
    if (name !== undefined && name.trim().length >= 2) student.name = name.trim();
    if (email !== undefined && email.includes('@')) student.email = email.trim().toLowerCase();
    if (department !== undefined) student.department = department;
    if (semester !== undefined) student.semester = Number(semester);
    if (classId !== undefined) student.classId = classId;
    if (isActive !== undefined) student.isActive = Boolean(isActive);

    const linkedUser = db.users.find((u) => u.studentId === student.studentId);
    if (linkedUser) {
      linkedUser.name = student.name;
      linkedUser.email = student.email;
      linkedUser.department = student.department;
      linkedUser.isActive = student.isActive;
    }

    persistDb();
    res.json({ student });
  });

  app.delete('/api/students/:id', requireAuth, requireRole('admin'), (req, res) => {
    const db = getDb();
    const idx = db.students.findIndex((s) => s.studentId === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    const [removed] = db.students.splice(idx, 1);
    db.users = db.users.filter((u) => u.studentId !== removed.studentId);
    db.faceTemplates = db.faceTemplates.filter((t) => t.studentId !== removed.studentId);
    persistDb();
    res.json({ deleted: true, studentId: removed.studentId });
  });

  // --- FACULTY ---
  app.get('/api/faculty', requireAuth, (_req, res) => {
    const db = getDb();
    res.json({ faculty: db.faculty });
  });

  app.post('/api/faculty', requireAuth, requireRole('admin'), (req, res) => {
    const { name, email, department, designation, assignedSubjectIds, password } = req.body as {
      name?: string;
      email?: string;
      department?: string;
      designation?: string;
      assignedSubjectIds?: string[];
      password?: string;
    };

    if (!name || name.trim().length < 2 || !email || !department) {
      res.status(400).json({ error: 'Name, email, and department are required.' });
      return;
    }

    const db = getDb();
    const normalizedEmail = email.trim().toLowerCase();
    if (db.faculty.some((f) => f.email.toLowerCase() === normalizedEmail)) {
      res.status(409).json({ error: 'A faculty member with this email already exists.' });
      return;
    }

    const facultyId = `FAC${String(db.faculty.length + 1).padStart(2, '0')}`;
    const uid = `uid_fac_${Date.now()}`;
    const now = new Date().toISOString();
    const subjIds = Array.isArray(assignedSubjectIds) ? assignedSubjectIds : [];

    const newFaculty = {
      facultyId,
      ownerUid: uid,
      name: name.trim(),
      email: normalizedEmail,
      department,
      designation: designation || 'Assistant Professor',
      assignedSubjectIds: subjIds,
      isActive: true,
      createdAt: now,
    };

    db.faculty.push(newFaculty);
    for (const sid of subjIds) {
      const subj = db.subjects.find((s) => s.subjectId === sid);
      if (subj) subj.facultyId = facultyId;
    }

    db.users.push({
      uid,
      name: newFaculty.name,
      email: newFaculty.email,
      passwordHash: hashPassword(password || 'Faculty@123'),
      role: 'faculty',
      department: newFaculty.department,
      facultyId,
      isActive: true,
      createdAt: now,
    });

    persistDb();
    res.status(201).json({ faculty: newFaculty });
  });

  app.put('/api/faculty/:id', requireAuth, requireRole('admin'), (req, res) => {
    const db = getDb();
    const fac = db.faculty.find((f) => f.facultyId === req.params.id);
    if (!fac) {
      res.status(404).json({ error: 'Faculty member not found.' });
      return;
    }

    const { name, department, designation, assignedSubjectIds, isActive } = req.body as {
      name?: string;
      department?: string;
      designation?: string;
      assignedSubjectIds?: string[];
      isActive?: boolean;
    };

    if (name !== undefined) fac.name = name.trim();
    if (department !== undefined) fac.department = department;
    if (designation !== undefined) fac.designation = designation;
    if (isActive !== undefined) fac.isActive = Boolean(isActive);
    if (Array.isArray(assignedSubjectIds)) {
      fac.assignedSubjectIds = assignedSubjectIds;
      for (const subj of db.subjects) {
        if (assignedSubjectIds.includes(subj.subjectId)) {
          subj.facultyId = fac.facultyId;
        } else if (subj.facultyId === fac.facultyId) {
          subj.facultyId = undefined;
        }
      }
    }

    persistDb();
    res.json({ faculty: fac });
  });

  // --- DEPARTMENTS, SUBJECTS, CLASSES ---
  app.get('/api/academics', requireAuth, (_req, res) => {
    const db = getDb();
    res.json({
      departments: db.departments,
      subjects: db.subjects,
      classes: db.classes,
      faculty: db.faculty,
    });
  });

  app.post('/api/departments', requireAuth, requireRole('admin'), (req, res) => {
    const { code, name, headName } = req.body as { code?: string; name?: string; headName?: string };
    if (!code || !name) {
      res.status(400).json({ error: 'Department code and name are required.' });
      return;
    }
    const db = getDb();
    const upperCode = code.trim().toUpperCase();
    if (db.departments.some((d) => d.code === upperCode)) {
      res.status(409).json({ error: 'Department code already exists.' });
      return;
    }
    const dept = {
      departmentId: `DEPT_${upperCode}`,
      code: upperCode,
      name: name.trim(),
      headName: headName?.trim() || 'TBA',
    };
    db.departments.push(dept);
    persistDb();
    res.status(201).json({ department: dept });
  });

  app.post('/api/subjects', requireAuth, requireRole('admin'), (req, res) => {
    const { code, name, department, semester, facultyId } = req.body as {
      code?: string;
      name?: string;
      department?: string;
      semester?: number;
      facultyId?: string;
    };
    if (!code || !name || !department) {
      res.status(400).json({ error: 'Subject code, name, and department are required.' });
      return;
    }
    const db = getDb();
    const upperCode = code.trim().toUpperCase();
    const subjectId = `SUB_${upperCode}`;
    if (db.subjects.some((s) => s.subjectId === subjectId)) {
      res.status(409).json({ error: 'Subject code already exists.' });
      return;
    }
    const subject = {
      subjectId,
      code: upperCode,
      name: name.trim(),
      department,
      semester: Number(semester) || 5,
      facultyId: facultyId || undefined,
    };
    db.subjects.push(subject);
    if (facultyId) {
      const fac = db.faculty.find((f) => f.facultyId === facultyId);
      if (fac && !fac.assignedSubjectIds.includes(subjectId)) {
        fac.assignedSubjectIds.push(subjectId);
      }
    }
    persistDb();
    res.status(201).json({ subject });
  });

  app.post('/api/classes', requireAuth, requireRole('admin'), (req, res) => {
    const { name, department, semester, room } = req.body as {
      name?: string;
      department?: string;
      semester?: number;
      room?: string;
    };
    if (!name || !department) {
      res.status(400).json({ error: 'Class name and department are required.' });
      return;
    }
    const db = getDb();
    const classId = `CLS_${name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
    if (db.classes.some((c) => c.classId === classId)) {
      res.status(409).json({ error: 'Class already exists.' });
      return;
    }
    const cls = {
      classId,
      name: name.trim(),
      department,
      semester: Number(semester) || 5,
      room: room?.trim() || 'Room 101',
    };
    db.classes.push(cls);
    persistDb();
    res.status(201).json({ classItem: cls });
  });

  // --- ATTENDANCE SESSIONS & RECORDS ---
  app.post(
    '/api/attendance/sessions',
    requireAuth,
    requireRole('admin', 'faculty'),
    (req: AuthenticatedRequest, res) => {
      const { department, semester, subjectId, classId, date, durationMinutes, mode } =
        req.body as Partial<AttendanceSession>;

      if (!department || !subjectId || !classId || !date) {
        res.status(400).json({
          error: 'Department, subject, class, and session date are required.',
        });
        return;
      }

      const db = getDb();
      const facultyId =
        req.user?.facultyId ||
        db.subjects.find((s) => s.subjectId === subjectId)?.facultyId ||
        'FAC01';

      const sessionId = `SES_${String(db.sessions.length + 1).padStart(3, '0')}`;
      const newSession: AttendanceSession = {
        sessionId,
        department,
        semester: Number(semester) || 5,
        subjectId,
        classId,
        facultyId,
        date,
        durationMinutes: Number(durationMinutes) || 60,
        status: 'active',
        mode: mode === 'manual' ? 'manual' : 'ai',
        createdAt: new Date().toISOString(),
      };

      db.sessions.unshift(newSession);
      persistDb();
      res.status(201).json({ session: newSession });
    }
  );

  app.get('/api/attendance/sessions', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    let sessions = db.sessions;
    if (req.user?.role === 'faculty' && req.user.facultyId) {
      sessions = sessions.filter((s) => s.facultyId === req.user?.facultyId);
    }
    res.json({ sessions });
  });

  app.patch(
    '/api/attendance/sessions/:id/end',
    requireAuth,
    requireRole('admin', 'faculty'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const session = db.sessions.find((s) => s.sessionId === req.params.id);
      if (!session) {
        res.status(404).json({ error: 'Attendance session not found.' });
        return;
      }
      session.status = 'completed';
      session.endedAt = new Date().toISOString();

      const subj = db.subjects.find((s) => s.subjectId === session.subjectId);
      addNotification(
        req.user?.uid || 'uid_admin_01',
        'faculty',
        'Attendance session completed',
        `Session ${session.sessionId} (${subj?.code || session.subjectId}) on ${session.date} has been finalized.`,
        'completed'
      );

      persistDb();
      res.json({ session });
    }
  );

  app.post(
    '/api/attendance/mark',
    requireAuth,
    requireRole('admin', 'faculty'),
    (req: AuthenticatedRequest, res) => {
      const { sessionId, entries, allowUpdate } = req.body as {
        sessionId?: string;
        entries?: Array<{
          studentId: string;
          status: AttendanceStatus;
          verificationMethod?: 'AI-assisted' | 'Manual';
          confidence?: number;
        }>;
        allowUpdate?: boolean;
      };

      if (!sessionId || !Array.isArray(entries) || entries.length === 0) {
        res.status(400).json({ error: 'sessionId and non-empty entries array are required.' });
        return;
      }

      const db = getDb();
      const session = db.sessions.find((s) => s.sessionId === sessionId);
      if (!session) {
        res.status(404).json({ error: 'Attendance session not found.' });
        return;
      }

      const now = new Date();
      const timeStr = now.toISOString().slice(11, 16);
      const saved: AttendanceRecord[] = [];
      const duplicates: string[] = [];

      for (const entry of entries) {
        const student = db.students.find((s) => s.studentId === entry.studentId);
        if (!student) continue;

        const existing = db.records.find(
          (r) =>
            r.studentId === entry.studentId &&
            r.subjectId === session.subjectId &&
            r.sessionId === session.sessionId
        );

        if (existing) {
          if (!allowUpdate) {
            duplicates.push(entry.studentId);
            continue;
          }
          existing.status = entry.status;
          existing.verificationMethod = entry.verificationMethod || 'Manual';
          if (entry.confidence !== undefined) existing.confidence = entry.confidence;
          existing.updatedAt = now.toISOString();
          saved.push(existing);

          if (student.ownerUid) {
            addNotification(
              student.ownerUid,
              'student',
              'Attendance record updated',
              `Your attendance for ${session.subjectId} on ${session.date} was updated to ${entry.status}.`,
              'correction'
            );
          }
        } else {
          if (
            hasDuplicateAttendanceRecord(
              db.records,
              entry.studentId,
              session.subjectId,
              session.sessionId
            )
          ) {
            duplicates.push(entry.studentId);
            continue;
          }

          const record: AttendanceRecord = {
            attendanceId: `ATT_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            studentId: student.studentId,
            studentName: student.name,
            subjectId: session.subjectId,
            facultyId: session.facultyId,
            sessionId: session.sessionId,
            date: session.date,
            time: timeStr,
            status: entry.status,
            verificationMethod: entry.verificationMethod || 'Manual',
            confidence: entry.confidence,
            updatedAt: now.toISOString(),
          };
          db.records.unshift(record);
          saved.push(record);

          if (student.ownerUid) {
            addNotification(
              student.ownerUid,
              'student',
              'Attendance recorded',
              `Marked as ${entry.status} (${record.verificationMethod}) for session ${session.sessionId}.`,
              'recorded'
            );
          }
        }
      }

      if (duplicates.length > 0 && saved.length === 0) {
        res.status(409).json({
          error: `Duplicate attendance prevented for student(s): ${duplicates.join(', ')}`,
          duplicates,
        });
        return;
      }

      if (req.user?.uid) {
        addNotification(
          req.user.uid,
          req.user.role,
          'Attendance successfully recorded',
          `Saved ${saved.length} attendance record(s) for session ${session.sessionId}.`,
          'recorded'
        );
      }

      persistDb();
      res.status(201).json({ saved, duplicates });
    }
  );

  app.get('/api/attendance/records', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { subjectId, date, sessionId, status } = req.query as Record<string, string | undefined>;
    let records = db.records;

    if (req.user?.role === 'student' && req.user.studentId) {
      records = records.filter((r) => r.studentId === req.user?.studentId);
    } else if (req.user?.role === 'faculty' && req.user.facultyId) {
      records = records.filter((r) => r.facultyId === req.user?.facultyId);
    }

    if (subjectId && subjectId !== 'ALL') records = records.filter((r) => r.subjectId === subjectId);
    if (date) records = records.filter((r) => r.date === date);
    if (sessionId && sessionId !== 'ALL') records = records.filter((r) => r.sessionId === sessionId);
    if (status && status !== 'ALL') records = records.filter((r) => r.status === status);

    res.json({ records });
  });

  app.get('/api/attendance/student/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const studentId = req.params.id;
    if (req.user?.role === 'student' && req.user.studentId !== studentId) {
      res.status(403).json({ error: 'Students may only view their own attendance records.' });
      return;
    }

    const student = db.students.find((s) => s.studentId === studentId);
    if (!student) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    const records = db.records.filter((r) => r.studentId === studentId);
    const summary = computeStudentSummary(studentId, db.records, db.subjects);
    const monthlyTrend = computeMonthlyTrend(records);

    res.json({
      student,
      summary,
      monthlyTrend,
      records,
      subjects: db.subjects,
      faculty: db.faculty,
    });
  });

  app.get(
    '/api/attendance/reports',
    requireAuth,
    requireRole('admin', 'faculty'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const { department, subjectId, startDate, endDate, format } = req.query as Record<
        string,
        string | undefined
      >;

      let records = db.records;
      if (req.user?.role === 'faculty' && req.user.facultyId) {
        records = records.filter((r) => r.facultyId === req.user?.facultyId);
      }

      if (department && department !== 'ALL') {
        const deptStudentIds = new Set(
          db.students.filter((s) => s.department === department).map((s) => s.studentId)
        );
        records = records.filter((r) => deptStudentIds.has(r.studentId));
      }
      if (subjectId && subjectId !== 'ALL') {
        records = records.filter((r) => r.subjectId === subjectId);
      }
      if (startDate) {
        records = records.filter((r) => r.date >= startDate);
      }
      if (endDate) {
        records = records.filter((r) => r.date <= endDate);
      }

      if (format === 'csv') {
        const csv = buildAttendanceCsv(records, db.sessions, db.subjects);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="smart-attend-report.csv"');
        res.send(csv);
        return;
      }

      const overallRate = calculateAttendancePercentage(records);
      res.json({
        records,
        overallRate,
        totalRecords: records.length,
        presentCount: records.filter((r) => r.status === 'Present').length,
        absentCount: records.filter((r) => r.status === 'Absent').length,
        pendingCount: records.filter((r) => r.status === 'Pending Review').length,
      });
    }
  );

  // --- AI FACE RECOGNITION ---
  app.post('/api/ai/register-face', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { studentId, imageBase64, consentAccepted } = req.body as {
      studentId?: string;
      imageBase64?: string;
      consentAccepted?: boolean;
    };

    if (!consentAccepted) {
      res.status(400).json({ error: 'Informed biometric consent must be explicitly accepted.' });
      return;
    }
    if (!studentId || !imageBase64) {
      res.status(400).json({ error: 'studentId and captured imageBase64 are required.' });
      return;
    }

    if (req.user?.role === 'student' && req.user.studentId !== studentId) {
      res.status(403).json({ error: 'You may only enroll your own biometric template.' });
      return;
    }

    const db = getDb();
    const student = db.students.find((s) => s.studentId === studentId);
    if (!student) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    const analysis = await analyzeEnrollmentFrame(imageBase64);
    if (analysis.usedAiVision && analysis.livenessStatus === 'fail') {
      res.status(422).json({
        error: `Biometric enrollment rejected by anti-spoofing check: ${analysis.qualityNotes}`,
      });
      return;
    }

    const encryptedTemplate = encryptBiometricPayload(imageBase64);
    const digest = createBiometricDigest(imageBase64);
    const now = new Date().toISOString();

    db.faceTemplates = db.faceTemplates.filter((t) => t.studentId !== studentId);
    db.faceTemplates.push({
      templateId: `TPL_${studentId}`,
      studentId,
      encryptedTemplate,
      digest,
      consentGranted: true,
      consentTimestamp: now,
      createdAt: now,
    });

    student.faceEnrolled = true;
    student.biometricConsent = true;
    student.consentTimestamp = now;
    persistDb();

    res.status(201).json({
      enrolled: true,
      studentId,
      livenessStatus: analysis.livenessStatus,
      qualityNotes: analysis.qualityNotes,
      usedAiVision: analysis.usedAiVision,
      consentTimestamp: now,
    });
  });

  app.post(
    '/api/ai/recognize',
    requireAuth,
    requireRole('admin', 'faculty'),
    async (req, res) => {
      const { sessionId, imageBase64, mode } = req.body as {
        sessionId?: string;
        imageBase64?: string;
        mode?: 'ai' | 'demo';
      };

      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required.' });
        return;
      }

      const db = getDb();
      const session = db.sessions.find((s) => s.sessionId === sessionId);
      if (!session) {
        res.status(404).json({ error: 'Attendance session not found.' });
        return;
      }

      const classStudents = db.students.filter(
        (s) => s.classId === session.classId && s.isActive
      );

      try {
        const result = await recognizeClassroomFrame({
          imageBase64,
          mode: mode === 'demo' ? 'demo' : 'ai',
          classStudents,
          storedTemplates: db.faceTemplates,
        });
        res.json(result);
      } catch (err) {
        res.status(503).json({
          error: err instanceof Error ? err.message : 'AI Vision recognition failed.',
        });
      }
    }
  );

  app.post(
    '/api/ai/verify',
    requireAuth,
    requireRole('admin', 'faculty'),
    (req: AuthenticatedRequest, res) => {
      const { sessionId, verifications } = req.body as {
        sessionId?: string;
        verifications?: Array<{
          studentId: string;
          status: AttendanceStatus;
          confidence?: number;
        }>;
      };

      if (!sessionId || !Array.isArray(verifications) || verifications.length === 0) {
        res.status(400).json({ error: 'sessionId and verifications array are required.' });
        return;
      }

      const db = getDb();
      const session = db.sessions.find((s) => s.sessionId === sessionId);
      if (!session) {
        res.status(404).json({ error: 'Attendance session not found.' });
        return;
      }

      const now = new Date();
      const timeStr = now.toISOString().slice(11, 16);
      const saved: AttendanceRecord[] = [];

      for (const item of verifications) {
        const student = db.students.find((s) => s.studentId === item.studentId);
        if (!student) continue;

        const existing = db.records.find(
          (r) =>
            r.studentId === item.studentId &&
            r.subjectId === session.subjectId &&
            r.sessionId === session.sessionId
        );

        if (existing) {
          existing.status = item.status;
          existing.verificationMethod = 'AI-assisted';
          if (item.confidence !== undefined) existing.confidence = item.confidence;
          existing.updatedAt = now.toISOString();
          saved.push(existing);
        } else {
          const record: AttendanceRecord = {
            attendanceId: `ATT_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            studentId: student.studentId,
            studentName: student.name,
            subjectId: session.subjectId,
            facultyId: session.facultyId,
            sessionId: session.sessionId,
            date: session.date,
            time: timeStr,
            status: item.status,
            verificationMethod: 'AI-assisted',
            confidence: item.confidence,
            updatedAt: now.toISOString(),
          };
          db.records.unshift(record);
          saved.push(record);
        }
      }

      if (req.user?.uid) {
        addNotification(
          req.user.uid,
          req.user.role,
          'AI attendance verified',
          `Confirmed ${saved.length} AI-assisted attendance record(s) for session ${session.sessionId}.`,
          'recorded'
        );
      }

      persistDb();
      res.json({ saved });
    }
  );

  app.delete('/api/ai/face-template/:studentId', requireAuth, (req: AuthenticatedRequest, res) => {
    const { studentId } = req.params;
    if (req.user?.role === 'student' && req.user.studentId !== studentId) {
      res.status(403).json({ error: 'You may only delete your own biometric template.' });
      return;
    }

    const db = getDb();
    const student = db.students.find((s) => s.studentId === studentId);
    if (!student) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    db.faceTemplates = db.faceTemplates.filter((t) => t.studentId !== studentId);
    student.faceEnrolled = false;
    student.biometricConsent = false;
    student.consentTimestamp = undefined;
    persistDb();

    res.json({ deleted: true, studentId });
  });

  // --- ANALYTICS ---
  app.get('/api/analytics/overview', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { department, subjectId } = req.query as Record<string, string | undefined>;
    let filteredRecords = db.records;

    if (req.user?.role === 'faculty' && req.user.facultyId) {
      filteredRecords = filteredRecords.filter((r) => r.facultyId === req.user?.facultyId);
    }

    if (department && department !== 'ALL') {
      const deptStudents = new Set(
        db.students.filter((s) => s.department === department).map((s) => s.studentId)
      );
      filteredRecords = filteredRecords.filter((r) => deptStudents.has(r.studentId));
    }
    if (subjectId && subjectId !== 'ALL') {
      filteredRecords = filteredRecords.filter((r) => r.subjectId === subjectId);
    }

    const today = '2026-11-18';
    const todaysRecords = filteredRecords.filter((r) => r.date === today);

    const distribution = [
      { name: 'Present', value: filteredRecords.filter((r) => r.status === 'Present').length },
      { name: 'Absent', value: filteredRecords.filter((r) => r.status === 'Absent').length },
      { name: 'Pending Review', value: filteredRecords.filter((r) => r.status === 'Pending Review').length },
    ];

    res.json({
      totalStudents: db.students.filter((s) => s.isActive).length,
      totalFaculty: db.faculty.filter((f) => f.isActive).length,
      totalClasses: db.classes.length,
      totalSessions: db.sessions.length,
      todaysAttendanceRate: calculateAttendancePercentage(
        todaysRecords.length > 0 ? todaysRecords : filteredRecords.slice(0, 10)
      ),
      averageAttendanceRate: calculateAttendancePercentage(filteredRecords),
      departmentComparison: computeDepartmentComparison(
        filteredRecords,
        db.students,
        db.departments
      ),
      subjectComparison: computeSubjectComparison(filteredRecords, db.subjects),
      distribution,
      studentsRequiringReview: findStudentsRequiringReview(db.students, filteredRecords, 75),
    });
  });

  app.get('/api/analytics/weekly', requireAuth, (_req, res) => {
    const db = getDb();
    res.json({ weekly: computeWeeklyTrend(db.records) });
  });

  app.get('/api/analytics/monthly', requireAuth, (_req, res) => {
    const db = getDb();
    res.json({ monthly: computeMonthlyTrend(db.records) });
  });

  // --- NOTIFICATIONS ---
  app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const list = db.notifications.filter(
      (n) =>
        n.recipientUid === req.user?.uid ||
        n.targetRole === req.user?.role ||
        n.targetRole === 'all' ||
        req.user?.role === 'admin'
    );
    res.json({ notifications: list });
  });

  app.patch('/api/notifications/:id/read', requireAuth, (req, res) => {
    const db = getDb();
    const notif = db.notifications.find((n) => n.notificationId === req.params.id);
    if (!notif) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }
    notif.isRead = true;
    persistDb();
    res.json({ notification: notif });
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Attend server listening on http://localhost:${PORT}`);
  });
}

// Start server only when executed directly (allows unit testing createApp without binding port)
if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  startServer();
}
