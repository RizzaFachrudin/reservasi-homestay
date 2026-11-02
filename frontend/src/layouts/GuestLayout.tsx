import React from 'react';
import Navbar from '../components/Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const GuestLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-100 py-8 text-center text-ink text-sm">
        © 2026 Homestay Reservation System.
      </footer>
    </div>
  );
};

export default GuestLayout;
