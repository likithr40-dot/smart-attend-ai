import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FlaskConical,
  ScanFace,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { StatusIndicator } from '../components/StatusIndicator';
import { apiRequest } from '../services/api';
import type {
  AIRecognitionMatch,
  AIRecognitionResponse,
  AttendanceSession,
  AttendanceStatus,
  Subject,
} from '../types';

export function AiAttendancePage() {
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState(
    searchParams.get('sessionId') || ''
  );

  const [mode, setMode] = useState<'ai' | 'demo'>('ai');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [result, setResult] = useState<AIRecognitionResponse | null>(null);
  const [editableStatuses, setEditableStatuses] = useState<Record<string, AttendanceStatus>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<{ sessions: AttendanceSession[] }>('/api/attendance/sessions'),
      apiRequest<{ subjects: Subject[] }>('/api/academics'),
    ]).then(([sesRes, acadRes]) => {
      setSessions(sesRes.sessions);
      setSubjects(acadRes.subjects);
      if (!selectedSessionId && sesRes.sessions.length > 0) {
        const activeOne = sesRes.sessions.find((s) => s.status === 'active') || sesRes.sessions[0];
        setSelectedSessionId(activeOne.sessionId);
      }
    });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedSessionId]);

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch {
      setCameraError(
        'Camera access was denied or unavailable in this browser. You can upload a classroom photo or use Demo Simulation Mode.'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureFromWebcam = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const runRecognition = async (overrideMode?: 'ai' | 'demo') => {
    const activeMode = overrideMode || mode;
    if (!selectedSessionId) {
      setError('Select an attendance session first.');
      return;
    }
    if (activeMode === 'ai' && !capturedImage) {
      setError('Capture a classroom frame or upload an image before running AI recognition.');
      return;
    }

    setProcessing(true);
    setError('');
    setSaveSuccess('');
    try {
      const res = await apiRequest<AIRecognitionResponse>('/api/ai/recognize', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: selectedSessionId,
          imageBase64: capturedImage || undefined,
          mode: activeMode,
        }),
      });
      setResult(res);
      const initialStatuses: Record<string, AttendanceStatus> = {};
      for (const m of res.matches) {
        // Uncertain matches stay Pending Review until faculty confirms
        initialStatuses[m.studentId] =
          m.classification === 'uncertain' ? 'Pending Review' : m.suggestedStatus;
      }
      setEditableStatuses(initialStatuses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI recognition failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!result || !selectedSessionId) return;
    setSaving(true);
    setError('');
    try {
      const verifications = result.matches.map((m) => ({
        studentId: m.studentId,
        status: editableStatuses[m.studentId] || m.suggestedStatus,
        confidence: m.confidence,
      }));
      const res = await apiRequest<{ saved: unknown[] }>('/api/ai/verify', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: selectedSessionId,
          verifications,
        }),
      });
      setSaveSuccess(`Verified and saved ${res.saved.length} attendance records for session ${selectedSessionId}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save verified attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout
      title="AI Face Recognition Attendance"
      breadcrumb="Faculty / AI Verification"
    >
      <div className="space-y-6">
        {/* Session & Mode Controls */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label htmlFor="ai-session-select" className="block text-xs font-medium text-slate-700 mb-1.5">
              Active Attendance Session
            </label>
            <select
              id="ai-session-select"
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {sessions.map((s) => {
                const subj = subjects.find((sub) => sub.subjectId === s.subjectId);
                return (
                  <option key={s.sessionId} value={s.sessionId}>
                    {s.sessionId} · {subj?.code || s.subjectId} ({s.date}) — {s.status}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg self-start lg:self-end">
            <button
              type="button"
              onClick={() => setMode('ai')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
                mode === 'ai' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Live AI Vision Mode
            </button>
            <button
              type="button"
              onClick={() => setMode('demo')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
                mode === 'demo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Demo Simulation Mode
            </button>
          </div>
        </div>

        {mode === 'demo' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900">
            <FlaskConical className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs">
              <p className="font-bold">DEMO MODE — Simulated Biometric Matching</p>
              <p className="mt-0.5 text-amber-800">
                Simulated sample confidence scores are generated for classroom verification workflow testing without real facial recognition. Switch to Live AI Vision Mode for real frame analysis.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>{saveSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Camera & Capture Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Classroom Camera Feed</h2>
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Open Camera</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Stop Camera
                </button>
              )}
            </div>

            {cameraError && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                {cameraError}
              </p>
            )}

            <div className="aspect-[4/3] w-full rounded-xl bg-slate-900 overflow-hidden border border-slate-200 flex items-center justify-center relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />
              {!cameraActive && capturedImage && (
                <img
                  src={capturedImage}
                  alt="Captured classroom frame"
                  className="w-full h-full object-cover"
                />
              )}
              {!cameraActive && !capturedImage && (
                <div className="text-center px-6">
                  <ScanFace className="w-10 h-10 text-slate-500 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-xs text-slate-400">
                    Open the webcam or upload a classroom image to run AI face detection and anti-spoofing checks.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {cameraActive && (
                <button
                  type="button"
                  onClick={captureFromWebcam}
                  className="flex-1 py-2 px-3 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
                >
                  Capture Frame
                </button>
              )}

              <label className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 cursor-pointer">
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Upload Image</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="sr-only" />
              </label>
            </div>

            <button
              type="button"
              disabled={processing}
              onClick={() => runRecognition()}
              className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {processing
                ? 'Analyzing Classroom Frame...'
                : mode === 'demo'
                ? 'Run Demo Simulation'
                : 'Analyze Frame with AI Vision'}
            </button>
          </div>

          {/* Recognition & Faculty Verification Panel */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Verification Queue</h2>
                <p className="text-xs text-slate-500">
                  High-confidence matches are suggested; uncertain faces require manual confirmation.
                </p>
              </div>
              {result && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleConfirmAndSave}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  {saving ? 'Saving...' : 'Confirm & Save Verified Attendance'}
                </button>
              )}
            </div>

            {result ? (
              <div className="flex-1 flex flex-col">
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {result.livenessStatus === 'pass' ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                    )}
                    <span className="font-semibold text-slate-800 whitespace-nowrap shrink-0">
                      Liveness: {result.livenessStatus.toUpperCase()}
                    </span>
                    <span className="text-slate-500">· {result.livenessNote}</span>
                  </div>
                  <span className="font-mono tabular-nums text-slate-700 whitespace-nowrap shrink-0">
                    Faces Detected: {result.detectedFacesCount}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-5 font-medium">Student</th>
                        <th className="py-2.5 px-4 font-medium">Confidence</th>
                        <th className="py-2.5 px-4 font-medium">Suggested</th>
                        <th className="py-2.5 px-5 font-medium text-right">Faculty Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.matches.map((match: AIRecognitionMatch) => {
                        const currentStatus =
                          editableStatuses[match.studentId] || match.suggestedStatus;
                        return (
                          <tr key={match.studentId} className="hover:bg-slate-50/70">
                            <td className="py-3 px-5">
                              <p className="font-medium text-slate-900">
                                {match.studentName}{' '}
                                <span className="font-mono text-xs text-slate-500">
                                  ({match.studentId})
                                </span>
                              </p>
                              <p className="text-xs text-slate-500">{match.rationale}</p>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-700">
                              {Math.round(match.confidence * 100)}%
                            </td>
                            <td className="py-3 px-4">
                              <StatusIndicator status={match.suggestedStatus} />
                            </td>
                            <td className="py-3 px-5 text-right">
                              <select
                                aria-label={`Set attendance status for ${match.studentName}`}
                                value={currentStatus}
                                onChange={(e) =>
                                  setEditableStatuses((prev) => ({
                                    ...prev,
                                    [match.studentId]: e.target.value as AttendanceStatus,
                                  }))
                                }
                                className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white"
                              >
                                <option value="Present">Present</option>
                                <option value="Pending Review">Pending Review</option>
                                <option value="Absent">Absent</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center text-sm text-slate-500 flex-1 flex flex-col items-center justify-center">
                <ScanFace className="w-8 h-8 text-slate-300 mb-3" aria-hidden="true" />
                <p className="font-medium text-slate-700">No frame processed yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Capture a frame in Live AI Vision Mode or run Demo Simulation Mode to populate student verification rows.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
