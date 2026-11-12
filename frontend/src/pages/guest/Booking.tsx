import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Users,
  BedDouble,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import GuestLayout from '../../layouts/GuestLayout';
import { roomService, Room } from '../../services/room.service';
import { useAuth } from '../../context/AuthContext';

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const formatDateID = (dateStr: string) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const Booking: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const checkIn = searchParams.get('check_in') || searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('check_out') || searchParams.get('checkOut') || '';
  const guests = Math.max(1, parseInt(searchParams.get('guests') || '1', 10) || 1);

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    setLoading(true);
    roomService
      .getPublicRoomById(roomId)
      .then(setRoom)
      .catch(() => setRoom(null))
      .finally(() => setLoading(false));
  }, [roomId]);

  const stayNights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const inTime = new Date(`${checkIn}T00:00:00Z`).getTime();
    const outTime = new Date(`${checkOut}T00:00:00Z`).getTime();
    const diff = Math.round((outTime - inTime) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const totalPrice = useMemo(() => {
    if (!room || stayNights <= 0) return 0;
    return room.pricePerNight * stayNights;
  }, [room, stayNights]);

  if (loading) {
    return (
      <GuestLayout>
        <div className="py-24 text-center bg-white rounded-3xl border border-stone-100">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sage-dark mx-auto mb-3" />
          <p className="text-sm text-stone-500">Memuat ringkasan pemesanan...</p>
        </div>
      </GuestLayout>
    );
  }

  if (!room) {
    return (
      <GuestLayout>
        <div className="py-16 px-6 text-center bg-white rounded-3xl border border-stone-200 max-w-lg mx-auto">
          <BedDouble size={36} className="mx-auto mb-3 text-red-500" />
          <h1 className="font-serif text-2xl font-bold text-wood mb-2">
            Kamar Tidak Ditemukan
          </h1>
          <p className="text-sm text-ink/70 mb-6">
            Kamar yang ingin Anda pesan tidak ditemukan atau sedang tidak tersedia.
          </p>
          <Link
            to="/rooms"
            className="inline-flex items-center gap-2 bg-sage-dark hover:bg-wood text-white text-sm font-semibold px-6 py-3 rounded-2xl transition"
          >
            <ArrowLeft size={16} /> Kembali ke Katalog Kamar
          </Link>
        </div>
      </GuestLayout>
    );
  }

  const roomImage =
    room.primaryImage || `/images/room-${((Number(room.id) || 1) % 3) + 1}.jpg`;

  return (
    <GuestLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            to={`/rooms/${room.id}?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-wood hover:text-sage-dark transition"
          >
            <ArrowLeft size={16} /> Kembali ke Detail Kamar
          </Link>
          <h1 className="font-serif text-3xl font-bold text-wood mt-2">
            Ringkasan Pemesanan Kamar
          </h1>
          <p className="text-sm text-ink/70">
            Periksa kembali detail tanggal menginap dan data pemesan Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left: Guest & Stay Details */}
          <div className="md:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 space-y-4">
              <h2 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
                <CheckCircle2 size={20} className="text-sage-dark" />
                Data Pemesan (Terautentikasi)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-cream/60 p-4 rounded-2xl">
                <div>
                  <span className="block text-xs text-ink/60">Nama Lengkap</span>
                  <span className="font-semibold text-ink">{user?.name || '-'}</span>
                </div>
                <div>
                  <span className="block text-xs text-ink/60">Email</span>
                  <span className="font-semibold text-ink">{user?.email || '-'}</span>
                </div>
                <div>
                  <span className="block text-xs text-ink/60">Nomor Telepon</span>
                  <span className="font-semibold text-ink">{user?.phone || '-'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 space-y-4">
              <h2 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
                <Calendar size={20} className="text-sage-dark" />
                Jadwal Menginap
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-cream/60 p-4 rounded-2xl">
                  <span className="block text-xs text-wood font-semibold">Check-in</span>
                  <span className="text-sm font-bold text-ink mt-0.5 block">
                    {formatDateID(checkIn)}
                  </span>
                  <span className="text-[11px] text-ink/60">Mulai pukul 14:00 WIB</span>
                </div>
                <div className="bg-cream/60 p-4 rounded-2xl">
                  <span className="block text-xs text-wood font-semibold">Check-out</span>
                  <span className="text-sm font-bold text-ink mt-0.5 block">
                    {formatDateID(checkOut)}
                  </span>
                  <span className="text-[11px] text-ink/60">Maksimal pukul 12:00 WIB</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm bg-sage/15 px-4 py-3 rounded-2xl">
                <span className="flex items-center gap-2 font-medium text-ink">
                  <Users size={16} className="text-sage-dark" /> Jumlah Tamu
                </span>
                <span className="font-bold text-wood">
                  {guests} Orang (Maks. {room.capacity})
                </span>
              </div>
            </div>
          </div>

          {/* Right: Room & Price Card */}
          <div className="md:col-span-5 bg-white rounded-3xl p-6 shadow-md border border-stone-200/80 space-y-5">
            <div className="flex gap-3.5 items-center border-b border-stone-100 pb-4">
              <img
                src={roomImage}
                alt={room.name}
                className="w-20 h-16 rounded-2xl object-cover shrink-0 bg-sage/20"
              />
              <div>
                <span className="text-[11px] font-semibold text-sage-dark uppercase tracking-wider">
                  Kamar Dipilih
                </span>
                <h3 className="font-serif text-lg font-bold text-wood leading-snug">
                  {room.name}
                </h3>
                <p className="text-xs text-ink/60">
                  {formatRupiah(room.pricePerNight)} / malam
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-ink/75">
                <span>Durasi Menginap</span>
                <span className="font-semibold text-ink">{stayNights} Malam</span>
              </div>
              <div className="flex justify-between text-ink/75">
                <span>
                  {formatRupiah(room.pricePerNight)} × {stayNights} malam
                </span>
                <span className="font-semibold text-ink">{formatRupiah(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-wood pt-3 border-t border-stone-200">
                <span>Total Pembayaran</span>
                <span>{formatRupiah(totalPrice)}</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <Clock size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <span>
                Pembuatan transaksi reservasi (`POST /api/reservations`) & integrasi pembayaran akan diaktifkan pada <strong>Milestone 4 (Booking Engine)</strong>.
              </span>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink/60 pt-1">
              <ShieldCheck size={14} className="text-sage-dark" />
              <span>Sesi login & parameter pemesanan berhasil diverifikasi</span>
            </div>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
};

export default Booking;
