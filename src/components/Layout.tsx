import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BookOpen,
  Camera,
  CheckSquare,
  FileSpreadsheet,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanFace,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import type { NotificationItem } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function Layout({
  title,
  breadcrumb,
  actions,
  children,
}: {
  title: string;
  breadcrumb: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    if (user) {
      apiRequest<{ notifications: NotificationItem[] }>('/api/notifications')
        .then((res) => {
          if (active) {
            setUnreadCount(res.notifications.filter((n) => !n.isRead).length);
          }
        })
        .catch(() => {
          // ignore silent badge poll errors
        });
    }
    return () => {
      active = false;
    };
  }, [user, title]);

  const navItems: NavItem[] = React.useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') {
      return [
        { to: '/admin', label: 'Admin Overview', icon: LayoutDashboard },
        { to: '/students', label: 'Student Management', icon: GraduationCap },
        { to: '/faculty-management', label: 'Faculty Management', icon: Users },
        { to: '/classes', label: 'Classes & Subjects', icon: BookOpen },
        { to: '/history', label: 'Attendance History', icon: History },
        { to: '/analytics', label: 'Analytics', icon: BarChart3 },
        { to: '/reports', label: 'Reports', icon: FileSpreadsheet },
        { to: '/notifications', label: 'Notifications', icon: Bell },
        { to: '/settings', label: 'Profile Settings', icon: Settings },
      ];
    }
    if (user.role === 'faculty') {
      return [
        { to: '/faculty', label: 'Faculty Overview', icon: LayoutDashboard },
        { to: '/ai-attendance', label: 'AI Attendance', icon: Camera },
        { to: '/manual-attendance', label: 'Manual Attendance', icon: CheckSquare },
        { to: '/history', label: 'Attendance History', icon: History },
        { to: '/analytics', label: 'Analytics', icon: BarChart3 },
        { to: '/reports', label: 'Reports', icon: FileSpreadsheet },
        { to: '/notifications', label: 'Notifications', icon: Bell },
        { to: '/settings', label: 'Profile Settings', icon: Settings },
      ];
    }
    return [
      { to: '/student', label: 'Student Dashboard', icon: LayoutDashboard },
      { to: '/history', label: 'Attendance History', icon: History },
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/settings', label: 'Profile & Biometrics', icon: Settings },
    ];
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B1120] text-slate-200">
      <div className="px-5 h-16 flex items-center justify-between border-b border-slate-800/80">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-white font-bold tracking-tight whitespace-nowrap shrink-0"
        >
          <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <ScanFace className="w-4 h-4 text-white" aria-hidden="true" />
          </span>
          <span className="text-base">Smart Attend</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary sidebar">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`
              }
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.to === '/notifications' && unreadCount > 0 && (
                <span className="ml-2 text-xs font-mono tabular-nums text-cyan-300">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800/80">
        <div className="mb-3 px-1">
          <p className="text-sm font-medium text-white truncate">{user?.name}</p>
          <p className="text-xs text-slate-400 truncate capitalize">
            {user?.role} · {user?.department || 'Academic'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-800 no-print">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] h-full z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">{breadcrumb}</p>
              <h1 className="text-sm sm:text-lg font-bold text-slate-900 truncate">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {actions && <div className="hidden sm:flex items-center gap-2">{actions}</div>}
            <Link
              to="/notifications"
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label={`Notifications (${unreadCount} unread)`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-mono tabular-nums flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
