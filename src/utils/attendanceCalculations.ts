import type {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  Department,
  Student,
  Subject,
} from '../types';

export function calculateAttendancePercentage(records: AttendanceRecord[]): number {
  if (records.length === 0) return 0;
  const presentCount = records.filter((r) => r.status === 'Present').length;
  return Number(((presentCount / records.length) * 100).toFixed(1));
}

export function classifyMatchConfidence(confidence: number): {
  classification: 'high_confidence' | 'uncertain' | 'unmatched';
  suggestedStatus: AttendanceStatus;
} {
  if (confidence >= 0.85) {
    return {
      classification: 'high_confidence',
      suggestedStatus: 'Present',
    };
  }
  if (confidence >= 0.6) {
    return {
      classification: 'uncertain',
      suggestedStatus: 'Pending Review',
    };
  }
  return {
    classification: 'unmatched',
    suggestedStatus: 'Absent',
  };
}

export function hasDuplicateAttendanceRecord(
  records: AttendanceRecord[],
  studentId: string,
  subjectId: string,
  sessionId: string
): boolean {
  return records.some(
    (r) =>
      r.studentId === studentId &&
      r.subjectId === subjectId &&
      r.sessionId === sessionId
  );
}

export function computeStudentSummary(
  studentId: string,
  records: AttendanceRecord[],
  subjects: Subject[]
) {
  const studentRecords = records.filter((r) => r.studentId === studentId);
  const totalClasses = studentRecords.length;
  const classesAttended = studentRecords.filter((r) => r.status === 'Present').length;
  const pendingCount = studentRecords.filter((r) => r.status === 'Pending Review').length;
  const absentCount = studentRecords.filter((r) => r.status === 'Absent').length;
  const percentage = calculateAttendancePercentage(studentRecords);

  const subjectMap = new Map<string, AttendanceRecord[]>();
  for (const rec of studentRecords) {
    const list = subjectMap.get(rec.subjectId) ?? [];
    list.push(rec);
    subjectMap.set(rec.subjectId, list);
  }

  const subjectBreakdown = Array.from(subjectMap.entries()).map(([subjectId, recs]) => {
    const subj = subjects.find((s) => s.subjectId === subjectId);
    const present = recs.filter((r) => r.status === 'Present').length;
    return {
      subjectId,
      subjectCode: subj?.code ?? subjectId,
      subjectName: subj?.name ?? subjectId,
      total: recs.length,
      present,
      percentage: calculateAttendancePercentage(recs),
    };
  });

  return {
    totalClasses,
    classesAttended,
    pendingCount,
    absentCount,
    percentage,
    isLowAttendance: totalClasses > 0 && percentage < 75,
    subjectBreakdown,
  };
}

export function computeWeeklyTrend(records: AttendanceRecord[]) {
  const byDate = new Map<string, { present: number; absent: number; pending: number; total: number }>();
  for (const rec of records) {
    const current = byDate.get(rec.date) ?? { present: 0, absent: 0, pending: 0, total: 0 };
    current.total += 1;
    if (rec.status === 'Present') current.present += 1;
    else if (rec.status === 'Absent') current.absent += 1;
    else current.pending += 1;
    byDate.set(rec.date, current);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, stats]) => ({
      date,
      label: date.slice(5),
      present: stats.present,
      absent: stats.absent,
      pending: stats.pending,
      rate: stats.total > 0 ? Number(((stats.present / stats.total) * 100).toFixed(1)) : 0,
    }));
}

export function computeMonthlyTrend(records: AttendanceRecord[]) {
  const byMonth = new Map<string, { present: number; total: number }>();
  for (const rec of records) {
    const month = rec.date.slice(0, 7);
    const current = byMonth.get(month) ?? { present: 0, total: 0 };
    current.total += 1;
    if (rec.status === 'Present') current.present += 1;
    byMonth.set(month, current);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, stats]) => ({
      month,
      present: stats.present,
      total: stats.total,
      rate: stats.total > 0 ? Number(((stats.present / stats.total) * 100).toFixed(1)) : 0,
    }));
}

export function computeDepartmentComparison(
  records: AttendanceRecord[],
  students: Student[],
  departments: Department[]
) {
  const studentDept = new Map(students.map((s) => [s.studentId, s.department]));
  const statsByDept = new Map<string, { present: number; total: number }>();

  for (const dept of departments) {
    statsByDept.set(dept.code, { present: 0, total: 0 });
  }

  for (const rec of records) {
    const deptCode = studentDept.get(rec.studentId);
    if (!deptCode) continue;
    const curr = statsByDept.get(deptCode) ?? { present: 0, total: 0 };
    curr.total += 1;
    if (rec.status === 'Present') curr.present += 1;
    statsByDept.set(deptCode, curr);
  }

  return Array.from(statsByDept.entries()).map(([department, stats]) => ({
    department,
    present: stats.present,
    total: stats.total,
    rate: stats.total > 0 ? Number(((stats.present / stats.total) * 100).toFixed(1)) : 0,
  }));
}

export function computeSubjectComparison(records: AttendanceRecord[], subjects: Subject[]) {
  const bySubj = new Map<string, { present: number; total: number }>();
  for (const subj of subjects) {
    bySubj.set(subj.subjectId, { present: 0, total: 0 });
  }
  for (const rec of records) {
    const curr = bySubj.get(rec.subjectId) ?? { present: 0, total: 0 };
    curr.total += 1;
    if (rec.status === 'Present') curr.present += 1;
    bySubj.set(rec.subjectId, curr);
  }

  return subjects.map((subj) => {
    const stats = bySubj.get(subj.subjectId) ?? { present: 0, total: 0 };
    return {
      subjectId: subj.subjectId,
      code: subj.code,
      name: subj.name,
      present: stats.present,
      total: stats.total,
      rate: stats.total > 0 ? Number(((stats.present / stats.total) * 100).toFixed(1)) : 0,
    };
  });
}

export function findStudentsRequiringReview(
  students: Student[],
  records: AttendanceRecord[],
  thresholdPercent = 75
) {
  return students
    .filter((s) => s.isActive)
    .map((student) => {
      const recs = records.filter((r) => r.studentId === student.studentId);
      const pending = recs.filter((r) => r.status === 'Pending Review').length;
      const percentage = calculateAttendancePercentage(recs);
      return {
        studentId: student.studentId,
        name: student.name,
        department: student.department,
        semester: student.semester,
        totalClasses: recs.length,
        percentage,
        pendingReviews: pending,
      };
    })
    .filter((s) => (s.totalClasses > 0 && s.percentage < thresholdPercent) || s.pendingReviews > 0)
    .sort((a, b) => a.percentage - b.percentage);
}

export function escapeCsvCell(value: string | number | boolean | undefined): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildAttendanceCsv(
  records: AttendanceRecord[],
  sessions: AttendanceSession[],
  subjects: Subject[]
): string {
  const headers = [
    'Attendance ID',
    'Student ID',
    'Student Name',
    'Subject Code',
    'Subject Name',
    'Session ID',
    'Date',
    'Time',
    'Status',
    'Verification Method',
    'Confidence',
  ];
  const rows = records.map((rec) => {
    const subj = subjects.find((s) => s.subjectId === rec.subjectId);
    const sess = sessions.find((s) => s.sessionId === rec.sessionId);
    return [
      rec.attendanceId,
      rec.studentId,
      rec.studentName,
      subj?.code ?? rec.subjectId,
      subj?.name ?? '',
      sess?.sessionId ?? rec.sessionId,
      rec.date,
      rec.time,
      rec.status,
      rec.verificationMethod,
      rec.confidence !== undefined ? `${Math.round(rec.confidence * 100)}%` : '',
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
