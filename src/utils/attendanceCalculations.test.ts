import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAttendanceCsv,
  calculateAttendancePercentage,
  classifyMatchConfidence,
  computeDepartmentComparison,
  computeStudentSummary,
  findStudentsRequiringReview,
  hasDuplicateAttendanceRecord,
} from './attendanceCalculations';
import type { AttendanceRecord, AttendanceSession, Department, Student, Subject } from '../types';

const sampleSubjects: Subject[] = [
  { subjectId: 'SUB01', code: 'CS501', name: 'Machine Learning', department: 'CSE', semester: 5, facultyId: 'FAC01' },
  { subjectId: 'SUB02', code: 'CS502', name: 'Cloud Computing', department: 'CSE', semester: 5, facultyId: 'FAC02' },
];

const sampleDepts: Department[] = [
  { departmentId: 'DEPT_CSE', code: 'CSE', name: 'Computer Science', headName: 'Dr. Rao' },
  { departmentId: 'DEPT_ECE', code: 'ECE', name: 'Electronics', headName: 'Dr. Nair' },
];

const sampleStudents: Student[] = [
  {
    studentId: 'STU001',
    name: 'Aarav Sharma',
    email: 'aarav@example.edu',
    department: 'CSE',
    semester: 5,
    classId: 'CLS_CSE_5A',
    role: 'student',
    faceEnrolled: true,
    biometricConsent: true,
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    studentId: 'STU002',
    name: 'Diya Patel',
    email: 'diya@example.edu',
    department: 'ECE',
    semester: 5,
    classId: 'CLS_ECE_5A',
    role: 'student',
    faceEnrolled: false,
    biometricConsent: false,
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
];

const sampleRecords: AttendanceRecord[] = [
  {
    attendanceId: 'ATT_1',
    studentId: 'STU001',
    studentName: 'Aarav Sharma',
    subjectId: 'SUB01',
    facultyId: 'FAC01',
    sessionId: 'SES_1',
    date: '2026-11-10',
    time: '09:15',
    status: 'Present',
    verificationMethod: 'AI-assisted',
    confidence: 0.94,
    updatedAt: '2026-11-10T09:15:00.000Z',
  },
  {
    attendanceId: 'ATT_2',
    studentId: 'STU001',
    studentName: 'Aarav Sharma',
    subjectId: 'SUB02',
    facultyId: 'FAC02',
    sessionId: 'SES_2',
    date: '2026-11-11',
    time: '10:15',
    status: 'Absent',
    verificationMethod: 'Manual',
    updatedAt: '2026-11-11T10:15:00.000Z',
  },
  {
    attendanceId: 'ATT_3',
    studentId: 'STU002',
    studentName: 'Diya Patel',
    subjectId: 'SUB01',
    facultyId: 'FAC01',
    sessionId: 'SES_1',
    date: '2026-11-10',
    time: '09:15',
    status: 'Pending Review',
    verificationMethod: 'AI-assisted',
    confidence: 0.72,
    updatedAt: '2026-11-10T09:15:00.000Z',
  },
];

test('calculateAttendancePercentage computes accurate rounded percentage', () => {
  assert.equal(calculateAttendancePercentage([]), 0);
  assert.equal(calculateAttendancePercentage(sampleRecords), 33.3);
  assert.equal(calculateAttendancePercentage([sampleRecords[0]]), 100);
});

test('classifyMatchConfidence prevents auto-marking uncertain faces as Present', () => {
  assert.deepEqual(classifyMatchConfidence(0.92), {
    classification: 'high_confidence',
    suggestedStatus: 'Present',
  });
  assert.deepEqual(classifyMatchConfidence(0.75), {
    classification: 'uncertain',
    suggestedStatus: 'Pending Review',
  });
  assert.deepEqual(classifyMatchConfidence(0.45), {
    classification: 'unmatched',
    suggestedStatus: 'Absent',
  });
});

test('hasDuplicateAttendanceRecord prevents duplicate student+subject+session entries', () => {
  assert.equal(hasDuplicateAttendanceRecord(sampleRecords, 'STU001', 'SUB01', 'SES_1'), true);
  assert.equal(hasDuplicateAttendanceRecord(sampleRecords, 'STU001', 'SUB01', 'SES_99'), false);
});

test('computeStudentSummary calculates subject breakdown and low attendance warning', () => {
  const summary = computeStudentSummary('STU001', sampleRecords, sampleSubjects);
  assert.equal(summary.totalClasses, 2);
  assert.equal(summary.classesAttended, 1);
  assert.equal(summary.percentage, 50);
  assert.equal(summary.isLowAttendance, true);
  assert.equal(summary.subjectBreakdown.length, 2);
});

test('computeDepartmentComparison and findStudentsRequiringReview compute real metrics', () => {
  const deptComp = computeDepartmentComparison(sampleRecords, sampleStudents, sampleDepts);
  assert.equal(deptComp.find((d) => d.department === 'CSE')?.rate, 50);
  assert.equal(deptComp.find((d) => d.department === 'ECE')?.rate, 0);

  const reviewList = findStudentsRequiringReview(sampleStudents, sampleRecords, 75);
  assert.equal(reviewList.length, 2);
  assert.equal(reviewList[0].studentId, 'STU002');
});

test('buildAttendanceCsv escapes values and outputs valid CSV lines', () => {
  const sessions: AttendanceSession[] = [
    {
      sessionId: 'SES_1',
      department: 'CSE',
      semester: 5,
      subjectId: 'SUB01',
      classId: 'CLS_CSE_5A',
      facultyId: 'FAC01',
      date: '2026-11-10',
      durationMinutes: 60,
      status: 'completed',
      mode: 'ai',
      createdAt: '2026-11-10T09:00:00.000Z',
    },
  ];
  const csv = buildAttendanceCsv(sampleRecords.slice(0, 1), sessions, sampleSubjects);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith('Attendance ID,Student ID'));
  assert.ok(lines[1].includes('CS501,Machine Learning'));
});
