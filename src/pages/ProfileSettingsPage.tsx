import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Cloud, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { syncSnapshotToFirestore } from '../services/firebase';
import type { AttendanceRecord, AttendanceSession, Department, Student, Subject } from '../types';

export function ProfileSettingsPage() {
  const { user, firebaseUser, connectCloudSync, disconnectCloudSync, refreshUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(user?.studentId || 'STU001');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [capturedFace, setCapturedFace] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [syncMsg, setSyncMsg] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    apiRequest<{ students: Student[] }>('/api/students')
      .then((res) => {
        setStudents(res.students);
        if (user?.studentId) {
          setSelectedStudentId(user.studentId);
        } else if (res.students.length > 0) {
          setSelectedStudentId(res.students[0].studentId);
        }
      })
      .catch(() => {});

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [user]);

  const startCamera = async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {
      setErrorMsg('Camera unavailable. Upload a clear portrait image instead.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 480;
    canvas.height = videoRef.current.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setCapturedFace(canvas.toDataURL('image/jpeg', 0.85));
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setCapturedFace(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleEnrollFace = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    if (!consentAccepted) {
      setErrorMsg('You must read and accept the informed biometric consent agreement.');
      return;
    }
    if (!capturedFace) {
      setErrorMsg('Please capture or upload a clear face portrait first.');
      return;
    }

    try {
      const res = await apiRequest<{ qualityNotes: string }>('/api/ai/register-face', {
        method: 'POST',
        body: JSON.stringify({
          studentId: selectedStudentId,
          imageBase64: capturedFace,
          consentAccepted,
        }),
      });
      setStatusMsg(`Biometric template encrypted and enrolled for ${selectedStudentId}. ${res.qualityNotes}`);
      await refreshUser();
      const updated = await apiRequest<{ students: Student[] }>('/api/students');
      setStudents(updated.students);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Enrollment failed.');
    }
  };

  const handleDeleteTemplate = async () => {
    setErrorMsg('');
    setStatusMsg('');
    try {
      await apiRequest(`/api/ai/face-template/${selectedStudentId}`, { method: 'DELETE' });
      setStatusMsg(`Biometric template permanently erased for ${selectedStudentId}.`);
      setCapturedFace('');
      setConsentAccepted(false);
      await refreshUser();
      const updated = await apiRequest<{ students: Student[] }>('/api/students');
      setStudents(updated.students);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Deletion failed.');
    }
  };

  const handleCloudSync = async () => {
    setSyncMsg('');
    setErrorMsg('');
    try {
      if (!firebaseUser) {
        await connectCloudSync();
      }
      const [acad, stu, ses, rec] = await Promise.all([
        apiRequest<{ departments: Department[]; subjects: Subject[] }>('/api/academics'),
        apiRequest<{ students: Student[] }>('/api/students'),
        apiRequest<{ sessions: AttendanceSession[] }>('/api/attendance/sessions'),
        apiRequest<{ records: AttendanceRecord[] }>('/api/attendance/records'),
      ]);
      await syncSnapshotToFirestore({
        departments: acad.departments,
        subjects: acad.subjects,
        students: stu.students,
        sessions: ses.sessions,
        records: rec.records,
      });
      setSyncMsg('Successfully synced campus attendance datasets to Cloud Firestore.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Cloud Firestore sync failed.');
    }
  };

  const activeStudent = students.find((s) => s.studentId === selectedStudentId);

  return (
    <Layout title="Profile & Biometric Settings" breadcrumb="Account / Privacy & Cloud Sync">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Account & Cloud Sync */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-900">Account Profile</h2>
            <div className="text-sm space-y-2 pt-2">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Name</span>
                <span className="font-medium text-slate-900">{user?.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Email</span>
                <span className="font-medium text-slate-900">{user?.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Role</span>
                <span className="font-semibold text-blue-700 capitalize">{user?.role}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Department</span>
                <span className="font-medium text-slate-900">{user?.department || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Cloud className="w-5 h-5 text-blue-600" aria-hidden="true" />
              <h2 className="text-base font-bold text-slate-900">Cloud Firestore Sync</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Connect your Google Firebase account to synchronize academic rosters, sessions, and attendance records directly to your Cloud Firestore database.
            </p>
            {firebaseUser && (
              <p className="text-xs text-emerald-700 font-medium">
                Connected as {firebaseUser.email}
              </p>
            )}
            {syncMsg && (
              <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                {syncMsg}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCloudSync}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                {firebaseUser ? 'Sync Now to Firestore' : 'Connect Google & Sync Firestore'}
              </button>
              {firebaseUser && (
                <button
                  type="button"
                  onClick={() => void disconnectCloudSync()}
                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Biometric Enrollment & Informed Consent */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Biometric Face Template Enrollment
              </h2>
              <p className="text-xs text-slate-500">
                Protected with AES-256-GCM encryption, explicit consent, and instant erasure.
              </p>
            </div>
            {activeStudent?.faceEnrolled && (
              <button
                type="button"
                onClick={handleDeleteTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Delete Biometric Data</span>
              </button>
            )}
          </div>

          {errorMsg && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              {errorMsg}
            </div>
          )}
          {statusMsg && (
            <div role="status" className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>{statusMsg}</span>
            </div>
          )}

          {user?.role !== 'student' && students.length > 0 && (
            <div>
              <label htmlFor="bio-student" className="block text-xs font-medium text-slate-700 mb-1">
                Target Student
              </label>
              <select
                id="bio-student"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {students.map((s) => (
                  <option key={s.studentId} value={s.studentId}>
                    {s.studentId} — {s.name} ({s.faceEnrolled ? 'Enrolled' : 'Not Enrolled'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />
              {!cameraActive && capturedFace && (
                <img src={capturedFace} alt="Enrollment portrait" className="w-full h-full object-cover" />
              )}
              {!cameraActive && !capturedFace && (
                <p className="text-xs text-slate-400 px-4 text-center">
                  No capture yet. Open webcam or upload a clear front-facing photo.
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={startCamera}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
              >
                <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Open Camera</span>
              </button>
              {cameraActive && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-full py-2 px-3 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                >
                  Capture Enrollment Photo
                </button>
              )}
              <label className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 cursor-pointer">
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Upload Portrait</span>
                <input type="file" accept="image/*" onChange={handleUpload} className="sr-only" />
              </label>
            </div>
          </div>

          <form onSubmit={handleEnrollFace} className="space-y-4 pt-2 border-t border-slate-100">
            <label className="flex items-start gap-3 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600"
              />
              <span>
                <strong>Informed Biometric Consent:</strong> I voluntarily consent to Smart Attend encrypting and storing my facial reference template strictly for academic attendance verification. My biometric data is never exposed via public APIs and may be permanently deleted at any time.
              </span>
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
            >
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Encrypt &amp; Save Face Template</span>
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
