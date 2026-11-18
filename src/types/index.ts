export type UserRole = 'admin' | 'faculty' | 'student';

export type AttendanceStatus = 'Present' | 'Absent' | 'Pending Review';
export type VerificationMethod = 'AI-assisted' | 'Manual';

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  studentId?: string;
  facultyId?: string;
  semester?: number;
  faceEnrolled?: boolean;
  biometricConsent?: boolean;
  isActive: boolean;
}

export interface Student {
  studentId: string;
  ownerUid?: string;
  name: string;
  email: string;
  department: string;
  semester: number;
  classId: string;
  role: 'student';
  faceEnrolled: boolean;
  biometricConsent: boolean;
  consentTimestamp?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Faculty {
  facultyId: string;
  ownerUid?: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  assignedSubjectIds: string[];
  isActive: boolean;
  createdAt: string;
}

export interface Department {
  departmentId: string;
  code: string;
  name: string;
  headName: string;
}

export interface Subject {
  subjectId: string;
  code: string;
  name: string;
  department: string;
  semester: number;
  facultyId?: string;
}

export interface ClassroomClass {
  classId: string;
  name: string;
  department: string;
  semester: number;
  room: string;
}

export interface AttendanceSession {
  sessionId: string;
  department: string;
  semester: number;
  subjectId: string;
  classId: string;
  facultyId: string;
  date: string;
  durationMinutes: number;
  status: 'active' | 'completed';
  mode: 'ai' | 'manual';
  createdAt: string;
  endedAt?: string;
}

export interface AttendanceRecord {
  attendanceId: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  facultyId: string;
  sessionId: string;
  date: string;
  time: string;
  status: AttendanceStatus;
  verificationMethod: VerificationMethod;
  confidence?: number;
  updatedAt: string;
}

export interface NotificationItem {
  notificationId: string;
  recipientUid: string;
  targetRole: UserRole | 'all';
  title: string;
  message: string;
  category: 'recorded' | 'completed' | 'correction' | 'warning' | 'report';
  isRead: boolean;
  createdAt: string;
}

export interface AIRecognitionMatch {
  studentId: string;
  studentName: string;
  confidence: number;
  classification: 'high_confidence' | 'uncertain' | 'unmatched';
  suggestedStatus: AttendanceStatus;
  livenessScore: number;
  rationale: string;
}

export interface AIRecognitionResponse {
  mode: 'ai_vision' | 'demo_simulation';
  isDemo: boolean;
  detectedFacesCount: number;
  livenessStatus: 'pass' | 'warn' | 'fail';
  livenessNote: string;
  matches: AIRecognitionMatch[];
  unmatchedCount: number;
  processedAt: string;
}
