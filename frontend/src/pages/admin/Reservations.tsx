import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Search,
  RefreshCw,
  Eye,
  FileDown,
  UserCheck,
  LogOut,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  BedDouble,
  Users,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Filter,
} from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import {
  reservationService,
  Reservation,
  AdminReservationsResponse,
} from '../../services/reservation.service';

const formatRupiah = (amount: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

const formatDateID = (dateStr: string): string => {
  if (!dateStr) return '-';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTimeID = (isoStr: string): string => {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusBadgeStyle = (status: Reservation['status']) => {
  switch (status) {
    case 'Pending':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Confirmed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Checked-in':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Completed':
      return 'bg-stone-200 text-stone-800 border-stone-300';
    case 'Cancelled':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-stone-100 text-stone-700 border-stone-200';
  }
};

const statusLabel = (status: Reservation['status']) => {
  switch (status) {
    case 'Pending':
      return 'Pending';
    case 'Confirmed':
      return 'Confirmed';
    case 'Checked-in':
      return 'Checked-in';
    case 'Completed':
      return 'Completed';
    case 'Cancelled':
      return 'Cancelled';
    default:
      return status;
  }
};

const paymentBadgeStyle = (status?: string) => {
  switch (status) {
    case 'Settlement':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Expire':
    case 'Cancel':
      return 'bg-red-50 text-red-600 border-red-200';
    default:
      return 'bg-stone-50 text-stone-600 border-stone-200';
  }
};

const AdminReservations: React.FC = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<AdminReservationsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  // Detail modal state
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await reservationService.getAdminReservations({
        status: statusFilter,
        from: fromDate || undefined,
        to: toDate || undefined,
        search: appliedSearch || undefined,
        page,
        limit,
      });
      setData(res);
      setSelectedReservation((prev) => {
        if (!prev) return null;
        return res.items.find((i) => i.id === prev.id) || prev;
      });
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message || 'Gagal memuat daftar reservasi masuk.'
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, fromDate, toDate, appliedSearch, page]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setStatusFilter('All');
    setFromDate('');
    setToDate('');
    setSearchInput('');
    setAppliedSearch('');
    setPage(1);
  };

  const handleQuickCheckIn = async (res: Reservation) => {
    setActionError('');
    setActionSuccess('');
    setProcessingId(res.id);
    try {
      const result = await reservationService.checkInReservation(res.id);
      setActionSuccess(
        `Check-in berhasil untuk kode ${result.reservation.bookingCode} (${
          result.reservation.user?.name || 'Tamu'
        }). Status kini Checked-in.`
      );
      if (selectedReservation?.id === res.id) {
        setSelectedReservation({
          ...result.reservation,
          eligibility: result.eligibility,
        });
      }
      await fetchReservations();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || 'Gagal memproses Check-in tamu.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuickCheckOut = async (res: Reservation) => {
    setActionError('');
    setActionSuccess('');
    setProcessingId(res.id);
    try {
      const result = await reservationService.checkOutReservation(res.id);
      setActionSuccess(
        `Check-out berhasil untuk kode ${result.reservation.bookingCode} (${
          result.reservation.user?.name || 'Tamu'
        }). Status kini Completed.`
      );
      if (selectedReservation?.id === res.id) {
        setSelectedReservation({
          ...result.reservation,
          eligibility: result.eligibility,
        });
      }
      await fetchReservations();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || 'Gagal memproses Check-out tamu.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadInvoice = async (res: Reservation) => {
    setDownloadingId(res.id);
    setActionError('');
    try {
      await reservationService.downloadInvoice(res.id, res.bookingCode);
    } catch (err: any) {
      setActionError(err?.message || 'Gagal mengunduh Invoice PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const summary = data?.summary || {
    total: 0,
    pending: 0,
    confirmed: 0,
    checkedIn: 0,
    completed: 0,
    cancelled: 0,
    arrivingToday: 0,
  };
  const todayWib = data?.todayWib || '';

  const statusTabs = [
    { key: 'All', label: 'Semua Reservasi Masuk', count: summary.total },
    { key: 'Pending', label: 'Pending', count: summary.pending },
    { key: 'Confirmed', label: 'Confirmed', count: summary.confirmed },
    { key: 'Checked-in', label: 'Checked-in', count: summary.checkedIn },
    { key: 'Completed', label: 'Completed', count: summary.completed },
    { key: 'Cancelled', label: 'Riwayat Batal', count: summary.cancelled, isArchive: true },
  ];

  return (
    <AdminLayout
      title="Reservasi Masuk"
      subtitle="Pantau seluruh pesanan kamar, alokasi nomor unit, dan status pembayaran tamu (SF-15)"
    >
      {/* Top Operational Banner */}
      <div className="bg-gradient-to-r from-wood to-sage-dark rounded-3xl p-5 sm:p-6 text-white shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full mb-2">
            <Clock size={13} /> Jam Operasional Resepsionis
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold">
            Monitoring Reservasi & Alokasi Unit Kamar
          </h2>
          <p className="text-xs sm:text-sm text-white/85 mt-1">
            Waktu Check-in mulai pukul <strong>13:00 WIB</strong> • Waktu Check-out pukul{' '}
            <strong>11:00 – 12:00 WIB</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/admin/checkin"
            className="inline-flex items-center gap-2 bg-white text-wood hover:bg-cream font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-2xl transition shadow-sm"
          >
            <UserCheck size={16} /> Buka Meja Check-in & Check-out
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Total Reservasi Masuk
          </span>
          <p className="text-2xl font-bold text-stone-900 mt-1">{summary.total}</p>
          <p className="text-[11px] text-stone-500 mt-0.5">Pesanan aktif & selesai</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
            Menunggu Bayar
          </span>
          <p className="text-2xl font-bold text-amber-800 mt-1">{summary.pending}</p>
          <p className="text-[11px] text-amber-700/80 mt-0.5">Batas waktu 60 menit</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            Terkonfirmasi
          </span>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{summary.confirmed}</p>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
            {summary.arrivingToday} jadwal tiba hari ini
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-blue-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
            Sedang Menginap
          </span>
          <p className="text-2xl font-bold text-blue-800 mt-1">{summary.checkedIn}</p>
          <p className="text-[11px] text-blue-700/80 mt-0.5">Status Checked-in aktif</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Selesai Menginap
          </span>
          <p className="text-2xl font-bold text-stone-800 mt-1">{summary.completed}</p>
          <p className="text-[11px] text-stone-500 mt-0.5">Tamu telah Check-out</p>
        </div>
      </div>

      {/* Feedback Alerts */}
      {actionSuccess && (
        <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess('')}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {(errorMsg || actionError) && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600 shrink-0" />
            <span>{actionError || errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setActionError('');
              setErrorMsg('');
            }}
            className="text-red-600 hover:text-red-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter & Search Card */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm mb-6 space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-stone-100 pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {statusTabs.map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <React.Fragment key={tab.key}>
                  {tab.isArchive && (
                    <span className="hidden sm:inline-block h-5 w-px bg-stone-200 mx-1" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.key);
                      setPage(1);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                      active
                        ? tab.isArchive
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-sage-dark text-white shadow-sm'
                        : tab.isArchive
                        ? 'bg-red-50/70 text-red-700 hover:bg-red-100 border border-red-200/60'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        active
                          ? 'bg-white/20 text-white'
                          : tab.isArchive
                          ? 'bg-white text-red-700'
                          : 'bg-white text-stone-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <button
            type="button"
            onClick={fetchReservations}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-wood bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-xl transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Muat Ulang</span>
          </button>
        </div>

        {/* Search & Date Range Filter */}
        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end"
        >
          <div className="lg:col-span-5">
            <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
              Cari Kode Booking / Tamu / Kamar
            </label>
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Contoh: HSR-2026..., nama tamu, atau email"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-sage-dark"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
              Check-in Dari
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-sage-dark"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
              Check-in Sampai
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-sage-dark"
            />
          </div>

          <div className="lg:col-span-3 flex gap-2">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-wood hover:bg-sage-dark text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition"
            >
              <Filter size={14} /> Terapkan
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold py-2.5 px-3.5 rounded-xl transition"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500 text-sm">
            Memuat data reservasi...
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CalendarDays size={36} className="mx-auto text-stone-300" />
            <p className="text-sm font-semibold text-stone-700">
              Tidak ada data reservasi yang ditemukan
            </p>
            <p className="text-xs text-stone-500">
              Coba ubah filter status, rentang tanggal Check-in, atau kata kunci pencarian.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Kode Booking</th>
                    <th className="py-3.5 px-4">Data Tamu</th>
                    <th className="py-3.5 px-4">Tipe Kamar & Unit</th>
                    <th className="py-3.5 px-4">Jadwal Menginap</th>
                    <th className="py-3.5 px-4">Total & Pembayaran</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs sm:text-sm">
                  {data.items.map((res) => {
                    const isTodayCheckIn = res.checkInDate === todayWib;
                    const isProcessing = processingId === res.id;

                    return (
                      <tr
                        key={res.id}
                        className="hover:bg-stone-50/80 transition align-top"
                      >
                        {/* Booking Code */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-stone-900 block">
                            {res.bookingCode || `#${res.id}`}
                          </span>
                          <span className="text-[11px] text-stone-400 block mt-0.5">
                            {formatDateTimeID(res.createdAt)}
                          </span>
                          {isTodayCheckIn && res.status === 'Confirmed' && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Jadwal Tiba Hari Ini
                            </span>
                          )}
                        </td>

                        {/* Guest Info */}
                        <td className="py-4 px-4">
                          <p className="font-semibold text-stone-900">
                            {res.user?.name || '-'}
                          </p>
                          <p className="text-xs text-stone-500 break-all">
                            {res.user?.email || '-'}
                          </p>
                          <p className="text-xs text-stone-500">
                            {res.user?.phone || '-'}
                          </p>
                        </td>

                        {/* Room Type & Units */}
                        <td className="py-4 px-4">
                          <p className="font-semibold text-wood">
                            {res.room?.name || `Kamar #${res.roomId}`}
                          </p>
                          <p className="text-xs text-stone-600 mt-0.5">
                            {res.roomCount} Kamar • {res.guestCount} Tamu
                          </p>
                          {res.units && res.units.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {res.units.map((u) => (
                                <span
                                  key={u.id}
                                  className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold bg-cream text-wood border border-stone-200 px-2 py-0.5 rounded-lg"
                                >
                                  <DoorOpen size={11} className="text-sage-dark" />
                                  Unit {u.unitNumber}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Stay Dates */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="text-xs">
                            <span className="text-stone-400">In: </span>
                            <span className="font-semibold text-stone-800">
                              {formatDateID(res.checkInDate)}
                            </span>
                            <span className="text-[10px] text-stone-400 ml-1">
                              (13:00)
                            </span>
                          </div>
                          <div className="text-xs mt-0.5">
                            <span className="text-stone-400">Out: </span>
                            <span className="font-semibold text-stone-800">
                              {formatDateID(res.checkOutDate)}
                            </span>
                            <span className="text-[10px] text-stone-400 ml-1">
                              (11:00–12:00)
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-500 block mt-0.5">
                            Durasi {res.nights} malam
                          </span>
                        </td>

                        {/* Total & Payment */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <p className="font-bold text-stone-900">
                            {formatRupiah(res.totalPrice)}
                          </p>
                          <span
                            className={`inline-block mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${paymentBadgeStyle(
                              res.payment?.status
                            )}`}
                          >
                            Bayar: {res.payment?.status || 'Pending'}
                          </span>
                        </td>

                        {/* Reservation Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${statusBadgeStyle(
                              res.status
                            )}`}
                          >
                            {statusLabel(res.status)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedReservation(res)}
                              className="inline-flex items-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition"
                              title="Lihat Detail Reservasi"
                            >
                              <Eye size={14} /> Detail
                            </button>

                            {res.eligibility?.canCheckIn && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleQuickCheckIn(res)}
                                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition disabled:opacity-50"
                                title="Konfirmasi Check-in Tamu (BR-10)"
                              >
                                <UserCheck size={14} />
                                {isProcessing ? '...' : 'Check-in'}
                              </button>
                            )}

                            {res.eligibility?.canCheckOut && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleQuickCheckOut(res)}
                                className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition disabled:opacity-50"
                                title="Proses Check-out Tamu (BR-11)"
                              >
                                <LogOut size={14} />
                                {isProcessing ? '...' : 'Check-out'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-600">
              <div>
                Menampilkan <strong>{data.items.length}</strong> dari{' '}
                <strong>{data.pagination.total}</strong> reservasi (Halaman{' '}
                <strong>{data.pagination.page}</strong> dari{' '}
                <strong>{data.pagination.totalPages}</strong>)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-stone-200 font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-40 transition"
                >
                  <ChevronLeft size={14} /> Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(data.pagination.totalPages, p + 1))
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-stone-200 font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-40 transition"
                >
                  Berikutnya <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Reservation Detail Modal */}
      {selectedReservation && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-xl border border-stone-200 space-y-6 my-8">
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border ${statusBadgeStyle(
                      selectedReservation.status
                    )}`}
                  >
                    {statusLabel(selectedReservation.status)}
                  </span>
                  <span className="font-mono text-sm font-bold text-stone-700">
                    {selectedReservation.bookingCode || `#${selectedReservation.id}`}
                  </span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-wood mt-2">
                  Detail Reservasi Tamu
                </h3>
                <p className="text-xs text-stone-500">
                  Dibuat pada {formatDateTimeID(selectedReservation.createdAt)} WIB
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReservation(null)}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Guest & Room Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70 space-y-2">
                <h4 className="text-xs font-bold text-wood uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} className="text-sage-dark" /> Data Tamu Pemesan
                </h4>
                <div className="text-xs space-y-1 text-stone-700">
                  <p>
                    <span className="text-stone-400">Nama: </span>
                    <strong className="text-stone-900">
                      {selectedReservation.user?.name || '-'}
                    </strong>
                  </p>
                  <p>
                    <span className="text-stone-400">Email: </span>
                    <strong className="text-stone-900 break-all">
                      {selectedReservation.user?.email || '-'}
                    </strong>
                  </p>
                  <p>
                    <span className="text-stone-400">Telepon: </span>
                    <strong className="text-stone-900">
                      {selectedReservation.user?.phone || '-'}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70 space-y-2">
                <h4 className="text-xs font-bold text-wood uppercase tracking-wider flex items-center gap-1.5">
                  <BedDouble size={14} className="text-sage-dark" /> Kamar & Alokasi Unit
                </h4>
                <div className="text-xs space-y-1 text-stone-700">
                  <p className="font-bold text-stone-900 text-sm">
                    {selectedReservation.room?.name ||
                      `Kamar #${selectedReservation.roomId}`}
                  </p>
                  <p>
                    Jumlah: <strong>{selectedReservation.roomCount} Kamar</strong> •{' '}
                    <strong>{selectedReservation.guestCount} Tamu</strong>
                  </p>
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {selectedReservation.units &&
                    selectedReservation.units.length > 0 ? (
                      selectedReservation.units.map((u) => (
                        <span
                          key={u.id}
                          className="inline-flex items-center gap-1 font-mono text-xs font-bold bg-cream text-wood border border-stone-300 px-2.5 py-1 rounded-lg"
                        >
                          <DoorOpen size={12} className="text-sage-dark" />
                          Unit {u.unitNumber}
                        </span>
                      ))
                    ) : (
                      <span className="text-stone-400 italic">
                        Tidak ada unit teralokasi
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stay Schedule & Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-cream/60 rounded-2xl p-4 border border-stone-200/70 space-y-1.5 text-xs">
                <span className="font-bold text-wood uppercase tracking-wider block">
                  Jadwal Menginap ({selectedReservation.nights} Malam)
                </span>
                <p className="text-stone-700">
                  Check-in:{' '}
                  <strong className="text-stone-900">
                    {formatDateID(selectedReservation.checkInDate)}
                  </strong>{' '}
                  <span className="text-stone-500">(Mulai 13:00 WIB)</span>
                </p>
                <p className="text-stone-700">
                  Check-out:{' '}
                  <strong className="text-stone-900">
                    {formatDateID(selectedReservation.checkOutDate)}
                  </strong>{' '}
                  <span className="text-stone-500">(11:00–12:00 WIB)</span>
                </p>
              </div>

              <div className="bg-cream/60 rounded-2xl p-4 border border-stone-200/70 space-y-1.5 text-xs">
                <span className="font-bold text-wood uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={13} className="text-sage-dark" /> Rincian Pembayaran
                </span>
                <p className="text-stone-700">
                  Total Tagihan:{' '}
                  <strong className="text-stone-900 text-sm">
                    {formatRupiah(selectedReservation.totalPrice)}
                  </strong>
                </p>
                <p className="text-stone-700">
                  Status Bayar:{' '}
                  <strong className="text-stone-900">
                    {selectedReservation.payment?.status || 'Pending'}
                  </strong>{' '}
                  {selectedReservation.payment?.paymentType
                    ? `(${selectedReservation.payment.paymentType.replace(/_/g, ' ').toUpperCase()})`
                    : ''}
                </p>
              </div>
            </div>

            {/* BR-10 / BR-11 Eligibility Status Box */}
            {selectedReservation.eligibility && (
              <div
                className={`rounded-2xl p-4 border text-xs ${
                  selectedReservation.eligibility.canCheckIn
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : selectedReservation.eligibility.canCheckOut
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}
              >
                <p className="font-bold mb-1">
                  Status Verifikasi Operasional (BR-10 / BR-11):
                </p>
                <p>
                  {selectedReservation.eligibility.canCheckIn
                    ? 'Reservasi memenuhi syarat untuk Check-in hari ini (Confirmed, Pembayaran Settlement, dan Tanggal Check-in sesuai hari ini).'
                    : selectedReservation.eligibility.reason}
                </p>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-100">
              <div className="flex flex-wrap items-center gap-2">
                {selectedReservation.payment?.status === 'Settlement' && (
                  <button
                    type="button"
                    disabled={downloadingId === selectedReservation.id}
                    onClick={() => handleDownloadInvoice(selectedReservation)}
                    className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-50"
                  >
                    <FileDown size={15} />
                    {downloadingId === selectedReservation.id
                      ? 'Mengunduh...'
                      : 'Unduh Invoice PDF'}
                  </button>
                )}

                {selectedReservation.bookingCode && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/admin/checkin?code=${encodeURIComponent(
                          selectedReservation.bookingCode!
                        )}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 bg-cream hover:bg-sage/20 text-wood border border-stone-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition"
                  >
                    <UserCheck size={15} /> Buka di Meja Check-in
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedReservation.eligibility?.canCheckIn && (
                  <button
                    type="button"
                    disabled={processingId === selectedReservation.id}
                    onClick={() => handleQuickCheckIn(selectedReservation)}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-50"
                  >
                    <UserCheck size={15} /> Konfirmasi Check-in
                  </button>
                )}

                {selectedReservation.eligibility?.canCheckOut && (
                  <button
                    type="button"
                    disabled={processingId === selectedReservation.id}
                    onClick={() => handleQuickCheckOut(selectedReservation)}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-50"
                  >
                    <LogOut size={15} /> Proses Check-out
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedReservation(null)}
                  className="bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold px-4 py-2.5 rounded-xl transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminReservations;
