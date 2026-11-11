import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition ${isActive ? 'text-sage-dark' : 'text-ink hover:text-sage-dark'}`;

  const links = (
    <>
      <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>Beranda</NavLink>
      <NavLink to="/rooms" className={linkClass} onClick={() => setOpen(false)}>Kamar</NavLink>
      {isAuthenticated && (
        <NavLink to="/reservations" className={linkClass} onClick={() => setOpen(false)}>Riwayat Reservasi</NavLink>
      )}
      {user?.role === 'Admin' && (
        <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>Dashboard Admin</NavLink>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 bg-cream/90 backdrop-blur border-b border-wood/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="font-serif text-2xl font-bold text-wood">
            Homestay <span className="text-sage-dark">Kita</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">{links}</div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-ink">Halo, {user?.name.split(' ')[0]}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium px-4 py-2 rounded-full border border-wood/30 text-wood hover:bg-wood hover:text-white transition"
                >
                  Keluar
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-ink hover:text-sage-dark px-3 py-2 transition">
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium px-5 py-2 rounded-full bg-sage-dark text-white hover:bg-wood transition shadow-sm"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 text-ink"
            onClick={() => setOpen(!open)}
            aria-label="Buka menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-wood/10 bg-cream px-4 py-4 flex flex-col gap-4">
          {links}
          {isAuthenticated ? (
            <button onClick={handleLogout} className="text-left text-sm font-medium text-red-600">
              Keluar ({user?.name.split(' ')[0]})
            </button>
          ) : (
            <div className="flex gap-3">
              <Link to="/login" onClick={() => setOpen(false)} className="flex-1 text-center py-2 rounded-full border border-wood/30 text-wood text-sm font-medium">Masuk</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="flex-1 text-center py-2 rounded-full bg-sage-dark text-white text-sm font-medium">Daftar</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
