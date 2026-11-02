import React from 'react';
import { useSearchParams } from 'react-router-dom';
import GuestLayout from '../../layouts/GuestLayout';

const Rooms: React.FC = () => {
  const [searchParams] = useSearchParams();

  const checkIn = searchParams.get('checkIn');
  const checkOut = searchParams.get('checkOut');
  const guests = searchParams.get('guests');

  return (
    <GuestLayout>
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold text-wood mb-4">Daftar Kamar</h1>

        {checkIn && checkOut && guests && (
          <div className="max-w-md mx-auto bg-sage/10 rounded-lg p-4 mb-8">
            <p className="text-sm text-ink mb-2">Pencarian untuk:</p>
            <div className="space-y-1 text-sm font-medium text-wood">
              <p>Check-in: {new Date(checkIn).toLocaleDateString('id-ID')}</p>
              <p>Check-out: {new Date(checkOut).toLocaleDateString('id-ID')}</p>
              <p>Jumlah Tamu: {guests} orang</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-8 max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-wood mb-2">
            Coming Soon: Room Listing
          </h2>
          <p className="text-ink/70">
            Halaman daftar kamar akan tersedia di milestone berikutnya (M2: Room Management).
          </p>
        </div>
      </div>
    </GuestLayout>
  );
};

export default Rooms;
