import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  FileDown,
  CreditCard,
  Ticket,
  BedDouble,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
} from 'lucide-react';
import GuestLayout from '../../layouts/GuestLayout';
import { reservationService, Reservation } from '../../services/reservation.service';

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const formatDateShortID = (dateStr: string) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

type FilterTab = 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'Semua' },
  { key: 'PENDING', label: 'Menunggu Bayar' },
  { key: 'CONFIRMED', label: 'Terkonfirmasi / Check-in' },
  { key: 'COMPLETED', label: 'Selesai' },
  { key: 'CANCELLED', label: 'Dibatalkan' },
];

const Reservations: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchReservations = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await reservationService.getMyReservations();
      setReservations(data);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message ||
          'Gagal memuat riwayat reservasi. Silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const filteredReservations = useMemo(() => {
    if (activeTab === 'ALL') return reservations;
    if (activeTab === 'PENDING') {
      return reservations.filter((r) => r.status === 'Pending');
    }
    if (activeTab === 'CONFIRMED') {
      return reservations.filter(
        (r) => r.status === 'Confirmed' || r.status === 'Checked-in'
      );
    }
    if (activeTab === 'COMPLETED') {
      return reservations.filter((r) => r.status === 'Completed');
    }
    if (activeTab === 'CANCELLED') {
      return reservations.filter((r) => r.status === 'Cancelled');
    }
    return reservations;
  }, [reservations, activeTab]);

  const handleDownloadInvoice = async (res: Reservation) => {
    setDownloadError('');
    setDownloadingId(res.id);
    try {
      await reservationService.downloadInvoice(res.id, res.bookingCode);
    } catch (err: any) {
      setDownloadError(err?.message || 'Gagal mengunduh invoice PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setDownloadError('');
    setCancelling(true);
    try {
      const updated = await reservationService.cancelReservation(cancelTarget.id);
      setReservations((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setCancelTarget(null);
    } catch (err: any) {
      setDownloadError(
        err?.response?.data?.message || 'Gagal membatalkan pesanan. Silakan coba lagi.'
      );
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  };

  const renderStatusBadge = (status: Reservation['status']) => {
    switch (status) {
      case 'Confirmed':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
            <CheckCircle2 size={13} /> Terkonfirmasi
          </span>
        );
      case 'Checked-in':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
            <CheckCircle2 size={13} /> Sedang Menginap (Checked-in)
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 bg-stone-200 text-stone-800 text-xs font-bold px-3 py-1 rounded-full">
            <CheckCircle2 size={13} /> Selesai (Completed)
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
            <XCircle size={13} /> Dibatalkan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
            <Clock size={13} /> Menunggu Pembayaran
          </span>
        );
    }
  };

  return (
    <GuestLayout>
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-sage-dark text-xs font-semibold uppercase tracking-wider">
              Akun Tamu
            </p>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-wood mt-1">
              Riwayat Reservasi Saya
            </h1>
            <p className="text-sm text-ink/70 mt-1">
              Kelola pesanan kamar, lihat tiket check-in digital, dan unduh invoice resmi Anda.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchReservations}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-dark hover:text-wood bg-white border border-stone-200 px-4 py-2.5 rounded-xl transition self-start sm:self-auto"
          >
            <RefreshCw size={14} /> Muat Ulang
          </button>
        </div>

        {/* Filter Tabs */}
        {reservations.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
            {FILTER_TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition border ${
                    active
                      ? 'bg-sage-dark text-white border-sage-dark shadow-sm'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-sage-dark/50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {downloadError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* Content States */}
        {loading ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-stone-100">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sage-dark mx-auto mb-3" />
            <p className="text-sm text-stone-500 font-medium">
              Memuat daftar riwayat reservasi...
            </p>
          </div>
        ) : errorMsg ? (
          <div className="py-16 px-6 text-center bg-white rounded-3xl border border-red-100">
            <AlertCircle size={40} className="mx-auto mb-3 text-red-500" />
            <h2 className="text-lg font-semibold text-ink mb-1">Gagal Memuat Data</h2>
            <p className="text-sm text-stone-600 mb-5">{errorMsg}</p>
            <button
              onClick={fetchReservations}
              className="inline-flex items-center gap-2 bg-sage-dark hover:bg-wood text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
            >
              <RefreshCw size={15} /> Coba Lagi
            </button>
          </div>
        ) : reservations.length === 0 ? (
          /* SF-8 AC Gagal: Belum punya reservasi */
          <div className="py-20 px-6 text-center bg-white rounded-3xl border border-stone-200/70">
            <div className="w-16 h-16 rounded-full bg-sage/15 text-sage-dark flex items-center justify-center mx-auto mb-4">
              <BedDouble size={32} />
            </div>
            <h2 className="font-serif text-2xl font-bold text-wood mb-2">
              Belum Ada Riwayat Reservasi
            </h2>
            <p className="text-sm text-ink/70 max-w-md mx-auto mb-6">
              Anda belum memiliki riwayat pemesanan kamar di Homestay Kita. Temukan kamar pilihan Anda sekarang!
            </p>
            <Link
              to="/rooms"
              className="inline-flex items-center gap-2 bg-sage-dark hover:bg-wood text-white text-sm font-semibold px-6 py-3.5 rounded-2xl transition shadow-sm"
            >
              <span>Jelajahi Katalog Kamar</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="py-16 px-6 text-center bg-white rounded-3xl border border-stone-200/70">
            <p className="text-sm font-medium text-stone-600 mb-4">
              Tidak ada reservasi dengan status filter yang dipilih.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold px-4 py-2 rounded-xl transition"
            >
              Tampilkan Semua Reservasi
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReservations.map((res) => {
              const roomImage =
                res.room?.primaryImage ||
                `/images/room-${((Number(res.roomId) || 1) % 3) + 1}.jpg`;
              const isSettled = res.payment?.status === 'Settlement';
              const isPending = res.status === 'Pending';
              const isTicketActive =
                res.status === 'Confirmed' ||
                res.status === 'Checked-in' ||
                res.status === 'Completed';

              return (
                <div
                  key={res.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md border border-stone-100 transition flex flex-col md:flex-row gap-5 items-start md:items-center justify-between"
                >
                  {/* Left: Room Image & Reservation Info */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full md:w-auto">
                    <Link
                      to={`/reservations/${res.id}`}
                      className="w-full sm:w-36 h-28 rounded-2xl overflow-hidden bg-sage/20 shrink-0 block"
                    >
                      <img
                        src={roomImage}
                        alt={res.room?.name || 'Kamar Homestay'}
                        className="w-full h-full object-cover hover:scale-105 transition duration-300"
                      />
                    </Link>

                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {res.bookingCode ? (
                          <span className="font-mono text-xs font-bold bg-cream text-wood px-2.5 py-1 rounded-lg border border-stone-200/80">
                            {res.bookingCode}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-stone-100 text-stone-600 px-2.5 py-1 rounded-lg border border-stone-200/80">
                            <Lock size={11} className="text-amber-600" />
                            {res.status === 'Pending'
                              ? 'Kode Check-in Terbit Setelah Bayar'
                              : `Pesanan #${res.id}`}
                          </span>
                        )}
                        {renderStatusBadge(res.status)}
                        {res.payment && (
                          <span className="text-[11px] font-medium text-stone-500">
                            • Bayar: <strong>{res.payment.status}</strong>
                          </span>
                        )}
                      </div>

                      <Link to={`/reservations/${res.id}`}>
                        <h3 className="font-serif text-xl font-bold text-ink hover:text-wood transition mt-1">
                          {res.room?.name || `Kamar #${res.roomId}`}
                        </h3>
                      </Link>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/75">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={14} className="text-sage-dark" />
                          {formatDateShortID(res.checkInDate)} –{' '}
                          {formatDateShortID(res.checkOutDate)} ({res.nights} Malam)
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BedDouble size={14} className="text-sage-dark" />
                          {res.roomCount} Kamar
                          {res.units && res.units.length > 0 && ` (${res.units.map((u) => u.unitNumber).join(', ')})`}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users size={14} className="text-sage-dark" />
                          {res.guestCount} Tamu
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Total Price & Action Buttons */}
                  <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-stone-100 shrink-0">
                    <div className="text-left md:text-right">
                      <span className="block text-[11px] text-ink/60">Total Harga</span>
                      <span className="text-lg font-bold text-wood">
                        {formatRupiah(res.totalPrice)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                      {isPending && (
                        <>
                          <Link
                            to={`/payment/${res.id}`}
                            className="inline-flex items-center gap-1.5 bg-sage-dark hover:bg-wood text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
                          >
                            <CreditCard size={14} /> Bayar Sekarang
                          </Link>
                          <button
                            type="button"
                            onClick={() => setCancelTarget(res)}
                            className="inline-flex items-center gap-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition"
                          >
                            <XCircle size={14} /> Batalkan
                          </button>
                        </>
                      )}

                      {isSettled && (
                        <button
                          type="button"
                          disabled={downloadingId === res.id}
                          onClick={() => handleDownloadInvoice(res)}
                          className="inline-flex items-center gap-1.5 bg-cream hover:bg-stone-200/70 text-wood border border-stone-200 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition disabled:opacity-60"
                        >
                          {downloadingId === res.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <FileDown size={14} />
                          )}
                          <span>Unduh Invoice</span>
                        </button>
                      )}

                      <Link
                        to={`/reservations/${res.id}`}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl transition ${
                          isTicketActive
                            ? 'bg-wood hover:bg-sage-dark text-white shadow-sm'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                        }`}
                      >
                        <Ticket size={14} />
                        <span>{isTicketActive ? 'Lihat Tiket Check-in' : 'Detail'}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Manual Cancel */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertCircle size={26} />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-wood">
                Batalkan Pesanan Ini?
              </h3>
              <p className="text-xs sm:text-sm text-ink/75 mt-1.5 leading-relaxed">
                Apakah Anda yakin ingin membatalkan pesanan kamar{' '}
                <strong>{cancelTarget.room?.name}</strong> untuk tanggal{' '}
                <strong>
                  {formatDateShortID(cancelTarget.checkInDate)} –{' '}
                  {formatDateShortID(cancelTarget.checkOutDate)}
                </strong>
                ? Kuota kamar akan langsung dilepas kembali.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition disabled:opacity-60"
              >
                {cancelling ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Membatalkan...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    <span>Ya, Batalkan Pesanan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </GuestLayout>
  );
};

export default Reservations;
