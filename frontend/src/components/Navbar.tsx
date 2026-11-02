import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-wood">Homestay</span>
              <span className="text-2xl font-bold text-sage ml-1">Kita</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/rooms" className="text-ink hover:text-sage font-medium px-3 py-2 transition">
              Kamar
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link to="/reservations" className="text-ink hover:text-sage font-medium px-3 py-2 transition">
                  Riwayat
                </Link>

                {user?.role === 'Admin' && (
                  <Link to="/admin" className="bg-wood text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition">
                    Dashboard Admin
                  </Link>
                )}

                <div className="flex items-center space-x-2 border-l pl-4 border-gray-200">
                  <span className="text-sm font-medium text-ink hidden md:block">
                    Halo, {user?.name.split(' ')[0]}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-2 transition"
                  >
                    Keluar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-ink hover:text-sage font-medium px-4 py-2 transition"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="bg-sage text-white px-4 py-2 rounded-lg hover:bg-sage-dark transition shadow-sm"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
