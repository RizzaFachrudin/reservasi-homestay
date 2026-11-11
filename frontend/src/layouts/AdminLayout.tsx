import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BedDouble,
  Sparkles,
  CalendarDays,
  UserCheck,
  FileBarChart,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title, subtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/rooms', label: 'Kelola Kamar', icon: BedDouble },
    { to: '/admin/facilities', label: 'Kelola Fasilitas', icon: Sparkles },
    { to: '/admin/reservations', label: 'Reservasi Masuk', icon: CalendarDays, comingSoon: true },
    { to: '/admin/checkin', label: 'Check-in & Check-out', icon: UserCheck, comingSoon: true },
    { to: '/admin/reports', label: 'Laporan Pendapatan', icon: FileBarChart, comingSoon: true },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-stone-100">
          <Link to="/admin" className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold text-wood">Homestay</span>
            <span className="font-serif text-xl font-bold text-sage-dark">Kita</span>
            <span className="ml-1 text-[10px] font-semibold tracking-wider bg-sage/20 text-sage-dark px-2 py-0.5 rounded-full uppercase">
              Admin
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-stone-400 hover:text-stone-700 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p className="px-3 text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
            Menu Utama
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            if (item.comingSoon) {
              return (
                <div
                  key={item.to}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-stone-400 text-sm font-medium cursor-not-allowed select-none"
                  title="Akan tersedia pada milestone berikutnya"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded">
                    Segera
                  </span>
                </div>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-sage-dark text-white shadow-sm'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-stone-100 space-y-2">
          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition"
          >
            <span className="flex items-center gap-2">
              <ExternalLink size={14} /> Lihat Website Publik
            </span>
          </Link>
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between px-2">
            <div className="truncate pr-2">
              <p className="text-xs font-semibold text-stone-800 truncate">{user?.name}</p>
              <p className="text-[11px] text-stone-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Keluar"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Header */}
        <header className="h-16 bg-white border-b border-stone-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-stone-600 hover:bg-stone-100 rounded-lg lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-stone-800">{title || 'Dashboard'}</h1>
              {subtitle && <p className="text-xs text-stone-500">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-wood text-white flex items-center justify-center font-semibold text-xs shadow-sm">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
