import type {
  AttendanceRecord,
  AttendanceSession,
  ClassroomClass,
  Department,
  Faculty,
  NotificationItem,
  Student,
  Subject,
  UserRole,
} from '../src/types';

export interface StoredUser {
  uid: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  department?: string;
  studentId?: string;
  facultyId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface StoredFaceTemplate {
  templateId: string;
  studentId: string;
  encryptedTemplate: string;
  digest: string;
  consentGranted: boolean;
  consentTimestamp: string;
  createdAt: string;
}

export interface DatabaseState {
  users: StoredUser[];
  students: Student[];
  faculty: Faculty[];
  departments: Department[];
  subjects: Subject[];
  classes: ClassroomClass[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  faceTemplates: StoredFaceTemplate[];
  notifications: NotificationItem[];
}
