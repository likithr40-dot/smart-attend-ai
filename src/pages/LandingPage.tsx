import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Camera,
  Cloud,
  FileSpreadsheet,
  Lock,
  ScanFace,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth, getDashboardPathForRole } from '../context/AuthContext';

function MediaFrame({
  src,
  alt,
  aspectClass,
}: {
  src: string;
  alt: string;
  aspectClass: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${aspectClass} w-full rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 border border-slate-800 flex flex-col items-center justify-center p-8 text-center`}
      >
        <ScanFace className="w-10 h-10 text-cyan-400 mb-3" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-200">{alt}</p>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-900`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export function LandingPage() {
  const { user } = useAuth();
  const dashboardPath = user ? getDashboardPathForRole(user.role) : '/login';

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Smart Attend
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600" aria-label="Landing navigation">
            <a href="#features" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              How It Works
            </a>
            <a href="#ai-engine" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              AI Engine
            </a>
            <a href="#cloud" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Cloud
            </a>
          </nav>

          <div className="shrink-0">
            <Link
              to={dashboardPath}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{user ? 'Open Dashboard' : 'Get Started'}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-semibold tracking-wider text-blue-600 mb-3">
              Smart Campus Attendance Platform
            </p>
            <h1
              className="font-bold tracking-tight text-slate-900 leading-[1.1]"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
            >
              Attendance Management, Made Intelligent.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              An AI-powered cloud attendance platform that simplifies classroom attendance, improves accuracy, and provides real-time academic insights.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to={dashboardPath}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Explore Features</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-6 flex items-stretch">
            <MediaFrame
              src="/src/assets/images/hero_smart_classroom_1795008554578.jpg"
              alt="University smart lecture hall running Smart Attend classroom verification"
              aspectClass="aspect-[16/9] lg:aspect-auto lg:min-h-[380px]"
            />
          </div>
        </div>

        {/* Grounded Capability Strip */}
        <div className="mt-14 pt-10 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">3 Roles</p>
            <p className="mt-1 text-sm text-slate-600">
              Admin, Faculty &amp; Student workspaces with backend RBAC
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">&ge; 85%</p>
            <p className="mt-1 text-sm text-slate-600">
              Confidence threshold before suggesting AI attendance matches
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">AES-256</p>
            <p className="mt-1 text-sm text-slate-600">
              Encrypted biometric templates with consent &amp; erasure controls
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">100%</p>
            <p className="mt-1 text-sm text-slate-600">
              Duplicate record prevention across sessions and subjects
            </p>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="bg-slate-50 border-y border-slate-200 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold text-blue-600 mb-2">Platform Capabilities</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Built for real university workflows from roll call to accreditation reports.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-7 flex flex-col justify-between">
              <div>
                <Camera className="w-6 h-6 text-blue-600 mb-4" aria-hidden="true" />
                <h3 className="text-lg font-bold text-slate-900">
                  Human-in-the-Loop AI Classroom Capture
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-xl">
                  Faculty capture classroom frames directly from the browser camera. High-confidence matches are suggested for rapid verification, while uncertain or occluded faces route to Pending Review instead of guessing.
                </p>
              </div>
              <p className="mt-6 text-xs text-slate-500">
                Anti-spoofing liveness check · Manual override always available · Demo simulation clearly labeled
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-7">
              <ShieldCheck className="w-6 h-6 text-cyan-700 mb-4" aria-hidden="true" />
              <h3 className="text-lg font-bold text-slate-900">
                Consent-First Biometrics
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Students explicitly grant informed biometric consent before enrollment and can permanently erase their encrypted template at any time.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-7">
              <BarChart3 className="w-6 h-6 text-blue-600 mb-4" aria-hidden="true" />
              <h3 className="text-lg font-bold text-slate-900">
                Live Academic Analytics
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Track weekly trends, monthly trajectories, department benchmarks, and students dropping below the 75% attendance requirement.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-7">
              <FileSpreadsheet className="w-6 h-6 text-cyan-700 mb-4" aria-hidden="true" />
              <h3 className="text-lg font-bold text-slate-900">
                Instant CSV &amp; Print Reports
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Filter attendance records by department, subject, and date range, then export audit-ready CSV spreadsheets or print formatted registers.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-7">
              <Users className="w-6 h-6 text-blue-600 mb-4" aria-hidden="true" />
              <h3 className="text-lg font-bold text-slate-900">
                Dedicated Role Portals
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Admins manage departments, classes, faculty, and rosters; Faculty run sessions; Students inspect subject-wise progress and history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl mb-12">
          <p className="text-xs font-semibold text-blue-600 mb-2">Classroom Workflow</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Four steps from enrollment to verified attendance.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01. Consent & Enrollment',
              desc: 'Students review privacy terms, accept informed consent, and register their encrypted face template.',
            },
            {
              step: '02. Session Initialization',
              desc: 'Faculty select department, semester, subject, and class section to launch an active session.',
            },
            {
              step: '03. AI Frame Verification',
              desc: 'Camera frames run liveness checks and confidence scoring; uncertain matches enter Pending Review.',
            },
            {
              step: '04. Cloud Sync & Insights',
              desc: 'Confirmed attendance saves without duplicates, updates dashboards, and triggers low-attendance alerts.',
            },
          ].map((item) => (
            <div key={item.step} className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-bold text-slate-900">{item.step}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Technology & Cloud Integration */}
      <section id="ai-engine" className="bg-[#0B1120] text-slate-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <p className="text-xs font-semibold text-cyan-400 mb-2">AI Recognition Engine</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Responsible biometric verification with anti-spoofing safeguards.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
                Every captured classroom frame undergoes server-side liveness inspection to detect screen glare, printed photo spoofs, or heavy occlusion before evaluating identity confidence. Encrypted templates never leave protected storage or appear in public API responses.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
                <li className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
                  <span>AES-256-GCM encrypted biometric storage with instant deletion</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
                  <span>Uncertain matches never auto-mark Present without faculty approval</span>
                </li>
              </ul>
            </div>
            <div className="lg:col-span-6">
              <MediaFrame
                src="/src/assets/images/ai_vision_podium_1795008556136.jpg"
                alt="Smart classroom podium optical sensor and tablet interface"
                aspectClass="aspect-[4/3]"
              />
            </div>
          </div>

          <div id="cloud" className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <MediaFrame
                src="/src/assets/images/cloud_campus_network_1795008555524.jpg"
                alt="Connected university engineering atrium powered by cloud attendance analytics"
                aspectClass="aspect-[4/3]"
              />
            </div>
            <div className="lg:col-span-6 order-1 lg:order-2">
              <p className="text-xs font-semibold text-cyan-400 mb-2">Cloud Architecture</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Cloud Firestore sync paired with strict JWT role enforcement.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
                Structured collections for students, faculty, departments, subjects, sessions, attendance records, and notifications synchronize reliably while backend middleware enforces role boundaries on every API endpoint.
              </p>
              <div className="mt-6 flex items-center gap-3 text-sm text-slate-300">
                <Cloud className="w-5 h-5 text-cyan-400 shrink-0" aria-hidden="true" />
                <span>Real-time Cloud Firestore integration · Hardened security rules</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p className="font-semibold text-slate-900">Smart Attend</p>
          <p>AI-Powered Cloud Attendance Management System</p>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-slate-900 transition-colors">
              Portal Login
            </Link>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
