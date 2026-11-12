import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Calendar,
  Users,
  CreditCard,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  BedDouble,
} from 'lucide-react';
import GuestLayout from '../../layouts/GuestLayout';
import { reservationService, Reservation } from '../../services/reservation.service';

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

const formatDateTimeID = (isoStr: string) => {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Payment: React.FC = () => {
  const { reservationId } = useParams<{ reservationId: string }>();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  const fetchReservation = async () => {
    if (!reservationId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await reservationService.getReservationById(reservationId);
      setReservation(data);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message ||
          'Data reservasi tidak ditemukan atau Anda tidak memiliki akses.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservation();
  }, [reservationId]);

  // Countdown timer for Pending reservation (BR-08: 60 minutes expiry)
  useEffect(() => {
    if (!reservation || reservation.status !== 'Pending') {
      setRemainingSeconds(0);
      return;
    }

    const updateTimer = () => {
      const expiryTime = new Date(reservation.expiresAt).getTime();
      const diffSec = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setRemainingSeconds(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [reservation]);

  const handleCopyCode = () => {
    if (!reservation) return;
    navigator.clipboard.writeText(reservation.bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <GuestLayout>
        <div className="py-24 text-center bg-white rounded-3xl border border-stone-100 max-w-3xl mx-auto">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sage-dark mx-auto mb-3" />
          <p className="text-sm text-stone-500 font-medium">
            Memuat rincian reservasi & tagihan...
          </p>
        </div>
      </GuestLayout>
    );
  }

  if (errorMsg || !reservation) {
    return (
      <GuestLayout>
        <div className="py-16 px-6 text-center bg-white rounded-3xl border border-red-100 max-w-lg mx-auto">
          <AlertCircle size={40} className="mx-auto mb-3 text-red-500" />
          <h1 className="font-serif text-2xl font-bold text-wood mb-2">
            Reservasi Tidak Ditemukan
          </h1>
          <p className="text-sm text-ink/70 mb-6">{errorMsg}</p>
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
    reservation.room?.primaryImage ||
    `/images/room-${((Number(reservation.roomId) || 1) % 3) + 1}.jpg`;

  const isPending = reservation.status === 'Pending';
  const isExpiredTimer = isPending && remainingSeconds <= 0;

  return (
    <GuestLayout>
      <div className="max-w-4xl mx-auto">
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/rooms"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-wood hover:text-sage-dark transition"
          >
            <ArrowLeft size={16} /> Kembali ke Katalog Kamar
          </Link>
          <button
            type="button"
            onClick={fetchReservation}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-dark hover:text-wood bg-white border border-stone-200 px-3.5 py-2 rounded-xl transition"
          >
            <RefreshCw size={14} /> Perbarui Status
          </button>
        </div>

        {/* Status Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-100 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  reservation.status === 'Confirmed' || reservation.status === 'Checked-in'
                    ? 'bg-emerald-100 text-emerald-700'
                    : reservation.status === 'Cancelled'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {reservation.status === 'Confirmed' || reservation.status === 'Checked-in' ? (
                  <CheckCircle2 size={30} />
                ) : reservation.status === 'Cancelled' ? (
                  <AlertCircle size={30} />
                ) : (
                  <Clock size={30} />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                      reservation.status === 'Confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : reservation.status === 'Cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    Status Reservasi: {reservation.status}
                  </span>
                  {reservation.payment && (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-stone-100 text-stone-700">
                      Pembayaran: {reservation.payment.status}
                    </span>
                  )}
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-wood mt-2">
                  {isPending
                    ? 'Menunggu Pembayaran Anda'
                    : reservation.status === 'Confirmed'
                    ? 'Pembayaran Berhasil & Terkonfirmasi'
                    : 'Detail Reservasi Kamar'}
                </h1>
                <p className="text-xs sm:text-sm text-ink/70 mt-1">
                  Dibuat pada {formatDateTimeID(reservation.createdAt)} WIB
                </p>
              </div>
            </div>

            {/* Booking Code Box (BR-06) */}
            <div className="bg-cream rounded-2xl p-4 border border-stone-200/80 text-left md:text-right shrink-0">
              <span className="block text-[11px] font-semibold text-wood uppercase tracking-wider">
                Kode Booking Unik
              </span>
              <div className="flex items-center md:justify-end gap-2 mt-1">
                <span className="font-mono text-xl font-bold text-ink tracking-wide">
                  {reservation.bookingCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1.5 rounded-lg bg-white hover:bg-sage/20 text-sage-dark border border-stone-200 transition"
                  title="Salin Kode Booking"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
              {copied && (
                <span className="block text-[11px] text-sage-dark font-medium mt-0.5">
                  Kode berhasil disalin!
                </span>
              )}
            </div>
          </div>

          {/* 60-Minute Expiry Countdown Bar (BR-08) */}
          {isPending && (
            <div
              className={`mt-6 pt-5 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-4 ${
                isExpiredTimer
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-amber-50/90 text-amber-900 border border-amber-200/80'
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                <Clock size={18} className="shrink-0 text-amber-600" />
                <span>
                  {isExpiredTimer ? (
                    <strong>Batas waktu pembayaran (60 menit) telah berakhir.</strong>
                  ) : (
                    <>
                      Selesaikan pembayaran sebelum{' '}
                      <strong>{formatDateTimeID(reservation.expiresAt)} WIB</strong> agar
                      reservasi tidak dibatalkan otomatis.
                    </>
                  )}
                </span>
              </div>
              {!isExpiredTimer && (
                <div className="font-mono text-lg font-bold bg-white px-3.5 py-1.5 rounded-xl border border-amber-200 text-amber-900 self-start sm:self-auto shrink-0">
                  {formatCountdown(remainingSeconds)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Room & Schedule Info */}
          <div className="lg:col-span-7 space-y-6">
            {/* Room Info */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
              <h2 className="font-serif text-lg font-bold text-ink mb-4 flex items-center gap-2">
                <BedDouble size={19} className="text-sage-dark" />
                Kamar yang Dipesan
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-cream/60 p-4 rounded-2xl border border-stone-200/60">
                <img
                  src={roomImage}
                  alt={reservation.room?.name || 'Kamar Homestay'}
                  className="w-full sm:w-28 h-24 rounded-xl object-cover shrink-0 bg-sage/20"
                />
                <div>
                  <h3 className="font-serif text-xl font-bold text-wood">
                    {reservation.room?.name || `Kamar #${reservation.roomId}`}
                  </h3>
                  <p className="text-xs text-ink/70 mt-1">
                    Harga: {formatRupiah(reservation.room?.pricePerNight || 0)} / malam •
                    Kapasitas Maks. {reservation.room?.capacity || '-'} tamu
                  </p>
                </div>
              </div>
            </div>

            {/* Stay Schedule & Guest Info */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 space-y-5">
              <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <Calendar size={19} className="text-sage-dark" />
                Jadwal Menginap & Data Tamu
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-cream/60 p-4 rounded-2xl border border-stone-200/50">
                  <span className="block text-xs text-wood font-semibold">Check-in</span>
                  <span className="text-sm font-bold text-ink mt-0.5 block">
                    {formatDateID(reservation.checkInDate)}
                  </span>
                  <span className="text-[11px] text-ink/60">Mulai pukul 14:00 WIB</span>
                </div>
                <div className="bg-cream/60 p-4 rounded-2xl border border-stone-200/50">
                  <span className="block text-xs text-wood font-semibold">Check-out</span>
                  <span className="text-sm font-bold text-ink mt-0.5 block">
                    {formatDateID(reservation.checkOutDate)}
                  </span>
                  <span className="text-[11px] text-ink/60">Maksimal pukul 12:00 WIB</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm bg-sage/15 px-4 py-3 rounded-2xl">
                <span className="flex items-center gap-2 font-medium text-ink">
                  <Users size={16} className="text-sage-dark" /> Jumlah Tamu & Durasi
                </span>
                <span className="font-bold text-wood">
                  {reservation.guestCount} Tamu • {reservation.nights} Malam
                </span>
              </div>

              {reservation.user && (
                <div className="pt-2 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="block text-ink/60">Nama Pemesan</span>
                    <span className="font-semibold text-ink">{reservation.user.name}</span>
                  </div>
                  <div>
                    <span className="block text-ink/60">Email</span>
                    <span className="font-semibold text-ink break-all">
                      {reservation.user.email}
                    </span>
                  </div>
                  <div>
                    <span className="block text-ink/60">Telepon</span>
                    <span className="font-semibold text-ink">{reservation.user.phone}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Payment Summary & Gateway Trigger */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-lg border border-stone-200/80 space-y-5">
            <h2 className="font-serif text-xl font-bold text-ink flex items-center gap-2 border-b border-stone-100 pb-4">
              <CreditCard size={20} className="text-sage-dark" />
              Rincian Tagihan
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-ink/75">
                <span>Kode Order / Booking</span>
                <span className="font-mono font-semibold text-ink">
                  {reservation.bookingCode}
                </span>
              </div>
              <div className="flex justify-between text-ink/75">
                <span>
                  {formatRupiah(
                    reservation.room?.pricePerNight ||
                      reservation.totalPrice / Math.max(1, reservation.nights)
                  )}{' '}
                  × {reservation.nights} malam
                </span>
                <span className="font-semibold text-ink">
                  {formatRupiah(reservation.totalPrice)}
                </span>
              </div>
              <div className="flex justify-between text-ink/75">
                <span>Status Tagihan</span>
                <span className="font-semibold text-amber-700">
                  {reservation.payment?.status || 'Pending'}
                </span>
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-baseline justify-between">
                <span className="text-base font-bold text-wood">Total Tagihan</span>
                <span className="text-2xl font-bold text-wood">
                  {formatRupiah(reservation.payment?.amount ?? reservation.totalPrice)}
                </span>
              </div>
            </div>

            <div className="bg-cream rounded-2xl p-4 border border-stone-200/80 text-xs text-ink/80 space-y-2">
              <p className="font-semibold text-wood">
                Integrasi Payment Gateway (Midtrans Sandbox)
              </p>
              <p>
                Data reservasi (<code className="font-mono">{reservation.bookingCode}</code>)
                dan tagihan berstatus <strong>Pending</strong> telah berhasil dikunci di
                database. Tombol pembayaran interaktif Midtrans Snap akan aktif pada{' '}
                <strong>Milestone 5 (M5)</strong> setelah kredensial{' '}
                <code className="font-mono">MIDTRANS_SERVER_KEY</code> &{' '}
                <code className="font-mono">MIDTRANS_CLIENT_KEY</code> dipasang.
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink/60 pt-1 text-center">
              <ShieldCheck size={14} className="text-sage-dark shrink-0" />
              <span>Transaksi aman & terverifikasi otomatis oleh sistem</span>
            </div>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
};

export default Payment;
