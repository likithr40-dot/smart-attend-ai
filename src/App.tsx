import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, getDashboardPathForRole, useAuth } from './context/AuthContext';
import { AdminDashboard } from './pages/AdminDashboard';
import { AiAttendancePage } from './pages/AiAttendancePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AttendanceHistoryPage } from './pages/AttendanceHistoryPage';
import { ClassManagement } from './pages/ClassManagement';
import { FacultyDashboard } from './pages/FacultyDashboard';
import { FacultyManagement } from './pages/FacultyManagement';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ManualAttendancePage } from './pages/ManualAttendancePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentManagement } from './pages/StudentManagement';
import type { UserRole } from './types';

function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading workspace...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <StudentManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faculty-management"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <FacultyManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classes"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ClassManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/faculty"
              element={
                <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                  <FacultyDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-attendance"
              element={
                <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                  <AiAttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manual-attendance"
              element={
                <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                  <ManualAttendancePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student', 'admin']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <AttendanceHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute allowedRoles={['admin', 'faculty']}>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['admin', 'faculty']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <ProfileSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
