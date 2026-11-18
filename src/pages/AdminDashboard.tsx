import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Users,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { StatCard } from '../components/StatCard';
import { apiRequest } from '../services/api';

interface OverviewResponse {
  totalStudents: number;
  totalFaculty: number;
  totalClasses: number;
  totalSessions: number;
  todaysAttendanceRate: number;
  averageAttendanceRate: number;
  departmentComparison: Array<{ department: string; rate: number; present: number; total: number }>;
  distribution: Array<{ name: string; value: number }>;
  studentsRequiringReview: Array<{
    studentId: string;
    name: string;
    department: string;
    semester: number;
    percentage: number;
    pendingReviews: number;
  }>;
}

const DIST_COLORS = ['#2563EB', '#E11D48', '#D97706'];

export function AdminDashboard() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [weekly, setWeekly] = useState<Array<{ label: string; rate: number; present: number }>>([]);
  const [monthly, setMonthly] = useState<Array<{ month: string; rate: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<OverviewResponse>('/api/analytics/overview'),
      apiRequest<{ weekly: Array<{ label: string; rate: number; present: number }> }>('/api/analytics/weekly'),
      apiRequest<{ monthly: Array<{ month: string; rate: number }> }>('/api/analytics/monthly'),
    ])
      .then(([ov, wk, mo]) => {
        if (!active) return;
        setOverview(ov);
        setWeekly(wk.weekly);
        setMonthly(mo.monthly);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load admin metrics.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Layout
      title="Admin Dashboard"
      breadcrumb="Administration / Overview"
      actions={
        <Link
          to="/students"
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          Manage Students
        </Link>
      }
    >
      {error && (
        <div role="alert" className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading || !overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* 5 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard label="Total Students" value={overview.totalStudents} icon={GraduationCap} tone="blue" detail="Active enrollees" />
            <StatCard label="Total Faculty" value={overview.totalFaculty} icon={Users} tone="cyan" detail="Teaching staff" />
            <StatCard label="Total Classes" value={overview.totalClasses} icon={BookOpen} detail={`${overview.totalSessions} sessions logged`} />
            <StatCard label="Today's Attendance" value={`${overview.todaysAttendanceRate}%`} icon={CalendarCheck} tone="emerald" detail="Live session rate" />
            <StatCard label="Average Attendance" value={`${overview.averageAttendanceRate}%`} icon={Activity} tone="blue" detail="All recorded sessions" />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Weekly Attendance Overview</h2>
              <p className="text-xs text-slate-500 mb-4">Attendance rate (%) across recent class dates</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <Tooltip />
                    <Bar dataKey="rate" name="Attendance %" fill="#2563EB" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Monthly Attendance Trends</h2>
              <p className="text-xs text-slate-500 mb-4">Semester trajectory calculated from verified records</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="rate" name="Rate %" stroke="#0891B2" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Department-wise Attendance</h2>
              <p className="text-xs text-slate-500 mb-4">Percentage comparison across academic departments</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.departmentComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis type="category" dataKey="department" tick={{ fontSize: 12, fill: '#0F172A' }} width={60} />
                    <Tooltip />
                    <Bar dataKey="rate" name="Rate %" fill="#0891B2" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Attendance Distribution</h2>
              <p className="text-xs text-slate-500 mb-4">Present, Absent, and Pending Review breakdown</p>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={overview.distribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {overview.distribution.map((entry, idx) => (
                        <Cell key={entry.name} fill={DIST_COLORS[idx % DIST_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 text-xs text-slate-600 mt-2">
                {overview.distribution.map((d, idx) => (
                  <span key={d.name} className="inline-flex items-center gap-1.5 tabular-nums">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DIST_COLORS[idx] }} />
                    <span>{d.name}: {d.value}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Students Requiring Review */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Students Requiring Attendance Review</h2>
                <p className="text-xs text-slate-500">Below 75% threshold or pending AI verification</p>
              </div>
              <Link to="/reports" className="text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap">
                Export Reports
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-6 font-medium">Student ID</th>
                    <th className="py-3 px-4 font-medium">Name</th>
                    <th className="py-3 px-4 font-medium">Department</th>
                    <th className="py-3 px-4 font-medium text-right">Pending Reviews</th>
                    <th className="py-3 px-6 font-medium text-right">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.studentsRequiringReview.slice(0, 8).map((stu) => (
                    <tr key={stu.studentId} className="hover:bg-slate-50/70">
                      <td className="py-3 px-6 font-mono text-xs text-slate-700">{stu.studentId}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{stu.name}</td>
                      <td className="py-3 px-4 text-slate-600">{stu.department} · Sem {stu.semester}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-700">
                        {stu.pendingReviews}
                      </td>
                      <td className="py-3 px-6 text-right font-mono tabular-nums font-semibold text-rose-700">
                        {stu.percentage}%
                      </td>
                    </tr>
                  ))}
                  {overview.studentsRequiringReview.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                        All active students meet the 75% attendance threshold.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
