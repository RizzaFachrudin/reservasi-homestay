import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Users,
  BedDouble,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Search,
  Loader2,
} from 'lucide-react';
import GuestLayout from '../../layouts/GuestLayout';
import { roomService, Room } from '../../services/room.service';
import { reservationService } from '../../services/reservation.service';
import { useAuth } from '../../context/AuthContext';
import { getFacilityIcon } from '../admin/Facilities';

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

const addDays = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split('T')[0];
};

const Booking: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialCheckIn = searchParams.get('check_in') || searchParams.get('checkIn') || '';
  const initialCheckOut = searchParams.get('check_out') || searchParams.get('checkOut') || '';
  const initialGuests = Math.max(1, parseInt(searchParams.get('guests') || '1', 10) || 1);
  const initialRooms = Math.max(1, parseInt(searchParams.get('rooms') || '1', 10) || 1);

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);
  const [roomCount, setRoomCount] = useState(initialRooms);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isConflictError, setIsConflictError] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!roomId) return;
    setLoading(true);
    roomService
      .getPublicRoomById(roomId)
      .then((data) => {
        setRoom(data);
        const maxRooms = Math.max(1, data.activeUnits ?? 1);
        const rc = Math.min(initialRooms, maxRooms);
        setRoomCount(rc);
        setGuests((g) => Math.min(g, data.capacity * rc));
      })
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

  const safeRoomCount = Number.isNaN(roomCount) || roomCount < 1 ? 1 : roomCount;
  const maxGuests = room ? room.capacity * safeRoomCount : 0;

  const totalPrice = useMemo(() => {
    if (!room || stayNights <= 0) return 0;
    return room.pricePerNight * stayNights * safeRoomCount;
  }, [room, stayNights, safeRoomCount]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;

    setErrorMsg('');
    setIsConflictError(false);

    if (!checkIn || !checkOut) {
      setErrorMsg('Tanggal check-in dan check-out wajib diisi.');
      return;
    }
    if (checkIn < todayStr) {
      setErrorMsg('Tanggal check-in tidak boleh di masa lampau.');
      return;
    }
    if (stayNights < 1) {
      setErrorMsg('Tanggal check-out harus setelah tanggal check-in (minimal 1 malam).');
      return;
    }
    if (!roomCount || roomCount < 1 || roomCount > (room.activeUnits ?? 1)) {
      setErrorMsg(`Jumlah kamar harus antara 1 hingga ${room.activeUnits ?? 1} kamar.`);
      return;
    }
    if (!guests || guests < 1 || guests > maxGuests) {
      setErrorMsg(`Jumlah tamu harus antara 1 hingga maksimal ${maxGuests} orang untuk ${roomCount} kamar.`);
      return;
    }

    setSubmitting(true);
    try {
      const created = await reservationService.createReservation({
        room_id: room.id,
        check_in_date: checkIn,
        check_out_date: checkOut,
        guest_count: guests,
        room_count: roomCount,
      });

      // Redirect to payment page with the created reservation ID (SF-6)
      navigate(`/payment/${created.id}`, { replace: true });
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;

      if (status === 409) {
        setIsConflictError(true);
        setErrorMsg(
          serverMsg ||
            'Maaf, kamar tidak lagi tersedia pada tanggal yang dipilih karena baru saja dipesan oleh tamu lain.'
        );
      } else {
        setErrorMsg(
          serverMsg || 'Gagal memproses pemesanan kamar. Silakan periksa kembali data Anda.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <GuestLayout>
        <div className="py-24 text-center bg-white rounded-3xl border border-stone-100">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sage-dark mx-auto mb-3" />
          <p className="text-sm text-stone-500">Memuat halaman konfirmasi pemesanan...</p>
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
            Kamar Tidak Tersedia
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
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link
            to={`/rooms/${room.id}?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}&rooms=${roomCount}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-wood hover:text-sage-dark transition"
          >
            <ArrowLeft size={16} /> Kembali ke Detail Kamar
          </Link>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-wood mt-2">
            Konfirmasi Pemesanan Kamar
          </h1>
          <p className="text-sm text-ink/70 mt-1">
            Periksa kembali jadwal menginap dan rincian biaya sebelum membuat kode reservasi.
          </p>
        </div>

        {/* 409 Conflict Banner (SF-6 AC Gagal: Kamar sudah diambil tamu lain) */}
        {isConflictError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-serif text-lg font-bold text-red-900">
                  Kamar Tidak Lagi Tersedia
                </h2>
                <p className="text-sm text-red-700 mt-0.5">{errorMsg}</p>
              </div>
            </div>
            <Link
              to={`/rooms?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}&rooms=${roomCount}`}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold px-5 py-3 rounded-2xl transition shrink-0"
            >
              <Search size={16} /> Cari Kamar Lain di Tanggal Ini
            </Link>
          </div>
        )}

        <form
          onSubmit={handleConfirmBooking}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Left Column: Guest Data & Stay Dates */}
          <div className="lg:col-span-7 space-y-6">
            {/* Guest Information */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 space-y-4">
              <h2 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
                <CheckCircle2 size={20} className="text-sage-dark" />
                Data Tamu Pemesan
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm bg-cream/60 p-4 rounded-2xl border border-stone-200/60">
                <div>
                  <span className="block text-xs text-ink/60">Nama Lengkap</span>
                  <span className="font-semibold text-ink">{user?.name || '-'}</span>
                </div>
                <div>
                  <span className="block text-xs text-ink/60">Alamat Email</span>
                  <span className="font-semibold text-ink break-all">{user?.email || '-'}</span>
                </div>
                <div>
                  <span className="block text-xs text-ink/60">Nomor Telepon</span>
                  <span className="font-semibold text-ink">{user?.phone || '-'}</span>
                </div>
              </div>
            </div>

            {/* Stay Schedule Form */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 space-y-5">
              <h2 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
                <Calendar size={20} className="text-sage-dark" />
                Detail Jadwal Menginap
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="bg-cream rounded-2xl p-4 block border border-transparent focus-within:border-sage-dark">
                  <span className="block text-xs text-wood font-semibold mb-1">
                    Tanggal Check-in
                  </span>
                  <input
                    type="date"
                    value={checkIn}
                    min={todayStr}
                    required
                    onChange={(e) => {
                      setCheckIn(e.target.value);
                      setErrorMsg('');
                      setIsConflictError(false);
                    }}
                    className="w-full bg-transparent text-ink text-sm font-bold focus:outline-none"
                  />
                  <span className="block text-[11px] text-ink/60 mt-1">
                    {checkIn ? formatDateID(checkIn) : 'Pilih tanggal masuk'} • Mulai 13:00 WIB
                  </span>
                </label>

                <label className="bg-cream rounded-2xl p-4 block border border-transparent focus-within:border-sage-dark">
                  <span className="block text-xs text-wood font-semibold mb-1">
                    Tanggal Check-out
                  </span>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn ? addDays(checkIn, 1) : addDays(todayStr, 1)}
                    required
                    onChange={(e) => {
                      setCheckOut(e.target.value);
                      setErrorMsg('');
                      setIsConflictError(false);
                    }}
                    className="w-full bg-transparent text-ink text-sm font-bold focus:outline-none"
                  />
                  <span className="block text-[11px] text-ink/60 mt-1">
                    {checkOut ? formatDateID(checkOut) : 'Pilih tanggal keluar'} • 11:00–12:00 WIB
                  </span>
                </label>
              </div>

              <label className="bg-cream rounded-2xl p-4 block border border-transparent focus-within:border-sage-dark">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-wood font-semibold flex items-center gap-1.5">
                    <BedDouble size={15} className="text-sage-dark" /> Jumlah Kamar
                  </span>
                  <span className="text-xs text-ink/60">
                    Tersedia hingga {room.activeUnits ?? 1} kamar
                  </span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, room.activeUnits ?? 1)}
                  value={Number.isNaN(roomCount) ? '' : roomCount}
                  required
                  onChange={(e) => {
                    setRoomCount(parseInt(e.target.value, 10));
                    setErrorMsg('');
                    setIsConflictError(false);
                  }}
                  className="w-full bg-transparent text-ink text-sm font-bold focus:outline-none"
                />
              </label>

              <label className="bg-cream rounded-2xl p-4 block border border-transparent focus-within:border-sage-dark">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-wood font-semibold flex items-center gap-1.5">
                    <Users size={15} className="text-sage-dark" /> Jumlah Tamu
                  </span>
                  <span className="text-xs text-ink/60">
                    Maksimal {maxGuests} orang ({safeRoomCount} kamar × {room.capacity})
                  </span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={maxGuests}
                  value={Number.isNaN(guests) ? '' : guests}
                  required
                  onChange={(e) => {
                    setGuests(parseInt(e.target.value, 10));
                    setErrorMsg('');
                  }}
                  className="w-full bg-transparent text-ink text-sm font-bold focus:outline-none"
                />
              </label>
            </div>
          </div>

          {/* Right Column: Room Summary & Price Breakdown */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-lg border border-stone-200/80 space-y-5 lg:sticky lg:top-24">
            <div className="flex gap-4 items-center border-b border-stone-100 pb-4">
              <img
                src={roomImage}
                alt={room.name}
                className="w-24 h-20 rounded-2xl object-cover shrink-0 bg-sage/20"
              />
              <div>
                <span className="text-[11px] font-semibold text-sage-dark uppercase tracking-wider">
                  Kamar Pilihan
                </span>
                <h3 className="font-serif text-xl font-bold text-wood leading-snug">
                  {room.name}
                </h3>
                <p className="text-xs text-ink/60 mt-0.5">
                  Kapasitas maks. {room.capacity} tamu / kamar
                </p>
              </div>
            </div>

            {room.facilities && room.facilities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-stone-100">
                {room.facilities.slice(0, 5).map((f) => (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1 bg-cream text-ink/80 text-[11px] font-medium px-2.5 py-1 rounded-lg"
                  >
                    <span className="text-sage-dark">{getFacilityIcon(f.icon, 12)}</span>
                    {f.name}
                  </span>
                ))}
              </div>
            )}

            {/* Price Calculation (BR-05) */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-ink/75">
                <span>Harga Kamar per Malam</span>
                <span className="font-medium text-ink">
                  {formatRupiah(room.pricePerNight)}
                </span>
              </div>
              <div className="flex justify-between text-ink/75">
                <span>Durasi Menginap</span>
                <span className="font-semibold text-ink">
                  {stayNights > 0 ? `${stayNights} Malam` : '-'}
                </span>
              </div>
              <div className="flex justify-between text-ink/75">
                <span>Jumlah Kamar</span>
                <span className="font-semibold text-ink">{safeRoomCount} Kamar</span>
              </div>
              <div className="flex justify-between text-ink/75">
                <span>Jumlah Tamu</span>
                <span className="font-semibold text-ink">{guests || 1} Orang</span>
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-baseline justify-between">
                <div>
                  <span className="text-base font-bold text-wood block">
                    Total Pembayaran
                  </span>
                  <span className="text-[11px] text-ink/60">
                    Dihitung otomatis ({stayNights} malam × {safeRoomCount} kamar)
                  </span>
                </div>
                <span className="text-2xl font-bold text-wood">
                  {stayNights > 0 ? formatRupiah(totalPrice) : 'Rp 0'}
                </span>
              </div>
            </div>

            {errorMsg && !isConflictError && (
              <div className="flex items-start gap-2 bg-red-50 text-red-600 text-xs font-medium p-3.5 rounded-2xl">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || stayNights < 1}
              className="w-full flex items-center justify-center gap-2 bg-sage-dark hover:bg-wood disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-2xl transition shadow-md text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Memproses Reservasi...</span>
                </>
              ) : (
                <>
                  <span>Konfirmasi & Lanjutkan Pembayaran</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink/60 pt-1 text-center">
              <ShieldCheck size={14} className="text-sage-dark shrink-0" />
              <span>
                Ketersediaan dikunci otomatis saat konfirmasi. Batas waktu pembayaran 60 menit.
              </span>
            </div>
          </div>
        </form>
      </div>
    </GuestLayout>
  );
};

export default Booking;
