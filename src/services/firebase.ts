import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { AttendanceRecord, AttendanceSession, Department, Student, Subject } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

void testConnection();

export async function signInWithGoogleFirebase() {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;
  const path = `users/${fbUser.uid}`;
  try {
    await setDoc(
      doc(db, 'users', fbUser.uid),
      {
        uid: fbUser.uid,
        name: fbUser.displayName || 'Smart Attend User',
        email: fbUser.email || '',
        role: fbUser.email === 'likithr40@gmail.com' ? 'admin' : 'student',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
  return fbUser;
}

export async function signOutGoogleFirebase() {
  await signOut(auth);
}

export async function syncSnapshotToFirestore(payload: {
  departments: Department[];
  subjects: Subject[];
  students: Student[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
}) {
  if (!auth.currentUser) {
    throw new Error('Sign in with Google Cloud Sync before pushing records to Firestore.');
  }

  const batch = writeBatch(db);
  for (const dept of payload.departments.slice(0, 10)) {
    batch.set(doc(db, 'departments', dept.departmentId), dept, { merge: true });
  }
  for (const subj of payload.subjects.slice(0, 20)) {
    batch.set(doc(db, 'subjects', subj.subjectId), subj, { merge: true });
  }
  for (const stu of payload.students.slice(0, 50)) {
    batch.set(doc(db, 'students', stu.studentId), stu, { merge: true });
  }
  for (const ses of payload.sessions.slice(0, 25)) {
    batch.set(doc(db, 'attendance_sessions', ses.sessionId), ses, { merge: true });
  }
  for (const rec of payload.records.slice(0, 100)) {
    batch.set(doc(db, 'attendance_records', rec.attendanceId), rec, { merge: true });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch_sync');
  }
}
