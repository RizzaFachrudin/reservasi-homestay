import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GuestLayout from '../../layouts/GuestLayout';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [error, setError] = useState('');

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!checkInDate || !checkOutDate) {
      setError('Tanggal check-in dan check-out harus diisi');
      return;
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (checkOut <= checkIn) {
      setError('Tanggal check-out harus setelah check-in');
      return;
    }

    if (guestCount < 1) {
      setError('Jumlah tamu minimal 1 orang');
      return;
    }

    // Navigate to rooms page with search params (standardized to snake_case per PRD BR-19 & §9.2)
    const params = new URLSearchParams({
      check_in: checkInDate,
      check_out: checkOutDate,
      guests: guestCount.toString()
    });

    navigate(`/rooms?${params.toString()}`);
  };

  return (
    <GuestLayout>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-sage/10 to-wood/10 rounded-2xl overflow-hidden mb-12">
        <div className="relative z-10 px-8 py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-wood mb-4">
            Temukan Homestay Impian Anda
          </h1>
          <p className="text-lg text-ink/80 max-w-2xl mx-auto mb-8">
            Nikmati pengalaman menginap yang nyaman dan berkesan di homestay pilihan kami
          </p>

          {/* Search Form */}
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Check-in Date */}
                <div className="text-left">
                  <label htmlFor="checkIn" className="block text-sm font-medium text-ink mb-2">
                    Check-in
                  </label>
                  <input
                    id="checkIn"
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    min={today}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage"
                  />
                </div>

                {/* Check-out Date */}
                <div className="text-left">
                  <label htmlFor="checkOut" className="block text-sm font-medium text-ink mb-2">
                    Check-out
                  </label>
                  <input
                    id="checkOut"
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    min={checkInDate || today}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage"
                  />
                </div>

                {/* Guest Count */}
                <div className="text-left">
                  <label htmlFor="guests" className="block text-sm font-medium text-ink mb-2">
                    Jumlah Tamu
                  </label>
                  <input
                    id="guests"
                    type="number"
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value))}
                    min={1}
                    max={10}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full md:w-auto px-8 py-3 bg-sage text-white font-medium rounded-lg hover:bg-sage-dark transition shadow-md hover:shadow-lg"
              >
                Cari Kamar Tersedia
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="text-center p-6 bg-white rounded-xl shadow-sm">
          <div className="w-12 h-12 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-wood mb-2">Kamar Nyaman</h3>
          <p className="text-sm text-ink/70">Berbagai pilihan kamar dengan fasilitas lengkap</p>
        </div>

        <div className="text-center p-6 bg-white rounded-xl shadow-sm">
          <div className="w-12 h-12 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-wood mb-2">Booking Mudah</h3>
          <p className="text-sm text-ink/70">Proses reservasi yang cepat dan aman</p>
        </div>

        <div className="text-center p-6 bg-white rounded-xl shadow-sm">
          <div className="w-12 h-12 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-wood mb-2">Harga Terjangkau</h3>
          <p className="text-sm text-ink/70">Dapatkan harga terbaik untuk pengalaman menginap</p>
        </div>
      </div>
    </GuestLayout>
  );
};

export default Home;
