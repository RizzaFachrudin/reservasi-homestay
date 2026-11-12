import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ticket,
  FileDown,
  CreditCard,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  BedDouble,
  ShieldCheck,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import GuestLayout from '../../layouts/GuestLayout';
import { reservationService, Reservation } from '../../services/reservation.service';
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

const ReservationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setErrorMsg('');

    reservationService
      .getReservationById(id, true)
      .then(setReservation)
      .catch((err) => {
        setErrorMsg(
          err?.response?.data?.message ||
            'Data reservasi tidak ditemukan atau Anda tidak memiliki akses.'
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopyCode = () => {
    if (!reservation) return;
    navigator.clipboard.writeText(reservation.bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadInvoice = async () => {
    if (!reservation) return;
    setDownloadError('');
    setDownloading(true);
    try {
      await reservationService.downloadInvoice(
        reservation.id,
        reservation.bookingCode
      );
    } catch (err: any) {
      setDownloadError(
        err?.message || 'Invoice belum tersedia karena pembayaran belum lunas.'
      );
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <GuestLayout>
        <div className="py-24 text-center bg-white rounded-3xl border border-stone-100 max-w-3xl mx-auto">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sage-dark mx-auto mb-3" />
          <p className="text-sm text-stone-500 font-medium">
            Memuat detail reservasi & tiket check-in...
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
            to="/reservations"
            className="inline-flex items-center gap-2 bg-sage-dark hover:bg-wood text-white text-sm font-semibold px-6 py-3 rounded-2xl transition"
          >
            <ArrowLeft size={16} /> Kembali ke Riwayat Reservasi
          </Link>
        </div>
      </GuestLayout>
    );
  }

  const isTicketActive =
    reservation.status === 'Confirmed' ||
    reservation.status === 'Checked-in' ||
    reservation.status === 'Completed';
  const isSettled = reservation.payment?.status === 'Settlement';
  const isPending = reservation.status === 'Pending';
  const isCancelled = reservation.status === 'Cancelled';

  const roomImage =
    reservation.room?.primaryImage ||
    `/images/room-${((Number(reservation.roomId) || 1) % 3) + 1}.jpg`;

  return (
    <GuestLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back link & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/reservations"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-wood hover:text-sage-dark transition"
          >
            <ArrowLeft size={16} /> Kembali ke Riwayat Reservasi
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            {isPending && (
              <Link
                to={`/payment/${reservation.id}`}
                className="inline-flex items-center gap-2 bg-sage-dark hover:bg-wood text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-2xl transition shadow-sm"
              >
                <CreditCard size={16} /> Lanjutkan Pembayaran
              </Link>
            )}

            {isSettled ? (
              <button
                type="button"
                disabled={downloading}
                onClick={handleDownloadInvoice}
                className="inline-flex items-center gap-2 bg-wood hover:bg-sage-dark text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-2xl transition shadow-sm disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileDown size={16} />
                )}
                <span>Unduh Invoice PDF</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-500 text-xs font-medium px-3.5 py-2 rounded-xl">
                <AlertCircle size={14} /> Invoice tersedia setelah pembayaran lunas
              </span>
            )}
          </div>
        </div>

        {downloadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* DIGITAL CHECK-IN TICKET CARD (SF-8) */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-md border border-stone-200/80">
          {/* Ticket Top Header */}
          <div
            className={`px-6 sm:px-8 py-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isTicketActive
                ? 'bg-gradient-to-r from-wood to-sage-dark'
                : isCancelled
                ? 'bg-red-700'
                : 'bg-amber-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <Ticket size={24} />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-widest opacity-85 font-semibold block">
                  {isTicketActive
                    ? 'Tiket Check-in Resmi • Homestay Kita'
                    : isCancelled
                    ? 'Tiket Tidak Berlaku (Reservasi Dibatalkan)'
                    : 'Tiket Belum Aktif (Menunggu Pembayaran)'}
                </span>
                <h1 className="font-serif text-xl sm:text-2xl font-bold">
                  {reservation.room?.name || `Kamar #${reservation.roomId}`}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="bg-white/20 backdrop-blur px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                Status: {reservation.status}
              </span>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left 8 Cols: Stay & Guest Info */}
              <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-cream/70 p-4 rounded-2xl border border-stone-200/60">
                    <span className="text-xs font-semibold text-wood uppercase tracking-wider block">
                      Jadwal Check-in
                    </span>
                    <span className="font-serif text-lg font-bold text-ink mt-1 block">
                      {formatDateID(reservation.checkInDate)}
                    </span>
                    <span className="text-xs text-ink/60">Mulai pukul 14:00 WIB</span>
                  </div>

                  <div className="bg-cream/70 p-4 rounded-2xl border border-stone-200/60">
                    <span className="text-xs font-semibold text-wood uppercase tracking-wider block">
                      Jadwal Check-out
                    </span>
                    <span className="font-serif text-lg font-bold text-ink mt-1 block">
                      {formatDateID(reservation.checkOutDate)}
                    </span>
                    <span className="text-xs text-ink/60">Maksimal pukul 12:00 WIB</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs sm:text-sm pt-2 border-t border-stone-100">
                  <div>
                    <span className="block text-ink/60 text-xs">Nama Tamu</span>
                    <span className="font-bold text-ink">
                      {reservation.user?.name || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-ink/60 text-xs">Jumlah Tamu</span>
                    <span className="font-bold text-ink">
                      {reservation.guestCount} Orang
                    </span>
                  </div>
                  <div>
                    <span className="block text-ink/60 text-xs">Durasi Menginap</span>
                    <span className="font-bold text-ink">
                      {reservation.nights} Malam
                    </span>
                  </div>
                  <div>
                    <span className="block text-ink/60 text-xs">Status Bayar</span>
                    <span
                      className={`font-bold ${
                        isSettled
                          ? 'text-emerald-700'
                          : isCancelled
                          ? 'text-red-600'
                          : 'text-amber-700'
                      }`}
                    >
                      {reservation.payment?.status || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right 4 Cols: Perforated Booking Code Stub */}
              <div className="lg:col-span-4 lg:border-l-2 lg:border-dashed lg:border-stone-200 lg:pl-6 flex flex-col items-center justify-center text-center bg-cream/50 lg:bg-transparent p-5 lg:p-0 rounded-2xl">
                <span className="text-[11px] font-bold uppercase tracking-widest text-wood">
                  Kode Reservasi Check-in
                </span>
                <div className="my-2 bg-cream border-2 border-sage-dark/30 rounded-2xl px-4 py-3 w-full flex items-center justify-center gap-2">
                  <span className="font-mono text-xl sm:text-2xl font-bold text-ink tracking-wider">
                    {reservation.bookingCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1.5 rounded-lg bg-white hover:bg-sage/20 text-sage-dark border border-stone-200 transition"
                    title="Salin Kode Reservasi"
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </div>
                {copied && (
                  <span className="text-[11px] text-sage-dark font-semibold mb-1">
                    Kode disalin!
                  </span>
                )}

                {isTicketActive ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full mt-1">
                    <CheckCircle2 size={14} /> Tiket Aktif & Terverifikasi
                  </div>
                ) : isPending ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-full mt-1">
                    <Clock size={14} /> Selesaikan Pembayaran
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 px-3 py-1.5 rounded-full mt-1">
                    <AlertCircle size={14} /> Tidak Berlaku
                  </div>
                )}

                <p className="text-[11px] text-ink/60 mt-2">
                  {isTicketActive
                    ? 'Tunjukkan kode ini kepada resepsionis saat tiba di lokasi.'
                    : isPending
                    ? 'Tiket check-in dan invoice PDF aktif otomatis setelah pembayaran Settlement.'
                    : 'Reservasi ini telah dibatalkan.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lower Grid: Room Details & Payment Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Room Card */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-stone-100 space-y-4">
            <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <BedDouble size={19} className="text-sage-dark" />
              Informasi Kamar
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <img
                src={roomImage}
                alt={reservation.room?.name || 'Kamar'}
                className="w-full sm:w-36 h-28 rounded-2xl object-cover bg-sage/20 shrink-0"
              />
              <div className="space-y-1.5">
                <h3 className="font-serif text-xl font-bold text-wood">
                  {reservation.room?.name || `Kamar #${reservation.roomId}`}
                </h3>
                <p className="text-xs text-ink/70 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Users size={13} className="text-sage-dark" /> Maks.{' '}
                    {reservation.room?.capacity || '-'} Tamu
                  </span>
                  <span>•</span>
                  <span>
                    {formatRupiah(reservation.room?.pricePerNight || 0)} / malam
                  </span>
                </p>
                {reservation.room?.facilities &&
                  reservation.room.facilities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {reservation.room.facilities.map((fac) => (
                        <span
                          key={fac.id}
                          className="inline-flex items-center gap-1 bg-cream text-ink/80 text-[11px] font-medium px-2.5 py-1 rounded-lg"
                        >
                          <span className="text-sage-dark">
                            {getFacilityIcon(fac.icon, 12)}
                          </span>
                          {fac.name}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Payment & Invoice Card */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-sm border border-stone-100 space-y-4">
            <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2 border-b border-stone-100 pb-3">
              <CreditCard size={19} className="text-sage-dark" />
              Rincian Pembayaran
            </h2>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between text-ink/75">
                <span>Waktu Pemesanan</span>
                <span className="font-medium text-ink">
                  {formatDateTimeID(reservation.createdAt)} WIB
                </span>
              </div>
              <div className="flex justify-between text-ink/75">
                <span>Metode Pembayaran</span>
                <span className="font-semibold text-ink uppercase">
                  {reservation.payment?.paymentType
                    ? reservation.payment.paymentType.replace(/_/g, ' ')
                    : '-'}
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
              <div className="pt-2.5 border-t border-stone-200 flex justify-between items-baseline">
                <span className="text-sm font-bold text-wood">Total Pembayaran</span>
                <span className="text-xl font-bold text-wood">
                  {formatRupiah(reservation.totalPrice)}
                </span>
              </div>
            </div>

            {isSettled ? (
              <button
                type="button"
                disabled={downloading}
                onClick={handleDownloadInvoice}
                className="w-full flex items-center justify-center gap-2 bg-sage-dark hover:bg-wood text-white text-sm font-semibold py-3.5 px-5 rounded-2xl transition shadow-sm disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileDown size={16} />
                )}
                <span>Unduh Invoice Resmi (PDF)</span>
              </button>
            ) : isPending ? (
              <div className="space-y-2.5">
                <div className="bg-amber-50 border border-amber-200/80 text-amber-900 text-xs p-3 rounded-xl">
                  Invoice belum tersedia. Silakan selesaikan pembayaran Anda terlebih dahulu.
                </div>
                <Link
                  to={`/payment/${reservation.id}`}
                  className="w-full flex items-center justify-center gap-2 bg-sage-dark hover:bg-wood text-white text-sm font-semibold py-3.5 px-5 rounded-2xl transition shadow-sm"
                >
                  <CreditCard size={16} />
                  <span>Bayar Sekarang</span>
                </Link>
              </div>
            ) : (
              <Link
                to={`/rooms/${reservation.roomId}?check_in=${reservation.checkInDate}&check_out=${reservation.checkOutDate}&guests=${reservation.guestCount}`}
                className="w-full flex items-center justify-center gap-2 bg-wood hover:bg-sage-dark text-white text-sm font-semibold py-3.5 px-5 rounded-2xl transition"
              >
                <RotateCcw size={16} />
                <span>Pesan Ulang Kamar</span>
              </Link>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink/60 pt-1">
              <ShieldCheck size={14} className="text-sage-dark" />
              <span>Bukti reservasi sah Homestay Kita</span>
            </div>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
};

export default ReservationDetail;
