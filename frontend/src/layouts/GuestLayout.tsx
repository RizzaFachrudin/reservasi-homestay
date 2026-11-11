import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail } from 'lucide-react';
import Navbar from '../components/Navbar';

interface LayoutProps {
  children: React.ReactNode;
  /** Render konten tanpa pembatas lebar (untuk landing page dengan hero penuh). */
  fullWidth?: boolean;
}

const GuestLayout: React.FC<LayoutProps> = ({ children, fullWidth = false }) => {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar />
      {fullWidth ? (
        <main className="flex-1">{children}</main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      )}
      <footer className="bg-ink text-cream/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="font-serif text-2xl text-white mb-3">
              Homestay <span className="text-sage">Kita</span>
            </p>
            <p className="text-sm leading-relaxed">
              Penginapan hangat dengan nuansa lokal. Pesan kamar, bayar online, dan check-in dengan mudah.
            </p>
          </div>
          <div>
            <p className="font-semibold text-white mb-3">Tautan</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-sage transition">Beranda</Link></li>
              <li><Link to="/rooms" className="hover:text-sage transition">Daftar Kamar</Link></li>
              <li><Link to="/reservations" className="hover:text-sage transition">Riwayat Reservasi</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white mb-3">Kontak</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><MapPin size={16} /> Jl. Contoh No. 1, Indonesia</li>
              <li className="flex items-center gap-2"><Phone size={16} /> +62 812 3456 7890</li>
              <li className="flex items-center gap-2"><Mail size={16} /> halo@homestaykita.id</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-cream/60">
          © 2026 Homestay Kita. Seluruh hak dilindungi.
        </div>
      </footer>
    </div>
  );
};

export default GuestLayout;
