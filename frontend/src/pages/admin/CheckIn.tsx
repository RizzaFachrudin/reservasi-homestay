import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  UserCheck,
  Search,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Clock,
  DoorOpen,
  BedDouble,
  Users,
  CalendarDays,
  CreditCard,
  RefreshCw,
  ArrowRight,
  KeyRound,
  ShieldCheck,
  X,
} from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import {
  reservationService,
  Reservation,
  CheckInLookupResponse,
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
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const AdminCheckIn: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  // Lookup states
  const [bookingCodeInput, setBookingCodeInput] = useState<string>(initialCode);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<CheckInLookupResponse | null>(
    null
  );

  // Operational lists states
  const [activeTab, setActiveTab] = useState<'checked-in' | 'arriving-today'>(
    'checked-in'
  );
  const [checkedInList, setCheckedInList] = useState<Reservation[]>([]);
  const [arrivingTodayList, setArrivingTodayList] = useState<Reservation[]>([]);
  const [todayWib, setTodayWib] = useState<string>('');
  const [listsLoading, setListsLoading] = useState<boolean>(true);

  // Action feedback states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  const fetchOperationalLists = useCallback(async () => {
    setListsLoading(true);
    try {
      const [checkedInRes, confirmedRes] = await Promise.all([
        reservationService.getAdminReservations({
          status: 'Checked-in',
          limit: 50,
        }),
        reservationService.getAdminReservations({
          status: 'Confirmed',
          limit: 50,
        }),
      ]);

      const currentToday =
        checkedInRes.todayWib || confirmedRes.todayWib || '';
      setTodayWib(currentToday);
      setCheckedInList(checkedInRes.items);
      setArrivingTodayList(
        confirmedRes.items.filter((item) => item.checkInDate === currentToday)
      );
    } catch (err) {
      console.error('Gagal memuat daftar operasional check-in/out:', err);
    } finally {
      setListsLoading(false);
    }
  }, []);

  const performLookup = useCallback(async (codeToSearch: string) => {
    const clean = codeToSearch.trim().toUpperCase();
    if (!clean) {
      setLookupError('Silakan masukkan kode booking terlebih dahulu.');
      return;
    }

    setLookupLoading(true);
    setLookupError('');
    setActionError('');
    try {
      const res = await reservationService.lookupCheckIn(clean);
      setLookupResult(res);
    } catch (err: any) {
      setLookupResult(null);
      setLookupError(
        err?.response?.data?.message ||
          'Reservasi dengan kode booking tersebut tidak ditemukan.'
      );
    } finally {
      setLookupLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperationalLists();
  }, [fetchOperationalLists]);

  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setBookingCodeInput(urlCode.toUpperCase());
      performLookup(urlCode);
    }
  }, [searchParams, performLookup]);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = bookingCodeInput.trim().toUpperCase();
    if (clean) {
      setSearchParams({ code: clean });
    } else {
      performLookup('');
    }
  };

  const handleConfirmCheckIn = async (res: Reservation) => {
    setProcessingId(res.id);
    setActionError('');
    setActionSuccess('');
    try {
      const updated = await reservationService.checkInReservation(res.id);
      const unitsText =
        updated.reservation.units && updated.reservation.units.length > 0
          ? ` (Unit ${updated.reservation.units.map((u) => u.unitNumber).join(', ')})`
          : '';
      setActionSuccess(
        `Check-in berhasil dikonfirmasi untuk ${
          updated.reservation.user?.name || 'Tamu'
        } — Kode ${updated.reservation.bookingCode}${unitsText}. Status kini Checked-in.`
      );
      if (lookupResult?.reservation.id === res.id) {
        setLookupResult(updated);
      }
      await fetchOperationalLists();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || 'Gagal memproses Check-in tamu.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmCheckOut = async (res: Reservation) => {
    setProcessingId(res.id);
    setActionError('');
    setActionSuccess('');
    try {
      const updated = await reservationService.checkOutReservation(res.id);
      const unitsText =
        updated.reservation.units && updated.reservation.units.length > 0
          ? ` (Unit ${updated.reservation.units.map((u) => u.unitNumber).join(', ')})`
          : '';
      setActionSuccess(
        `Check-out berhasil diproses untuk ${
          updated.reservation.user?.name || 'Tamu'
        } — Kode ${updated.reservation.bookingCode}${unitsText}. Status reservasi kini Completed.`
      );
      if (lookupResult?.reservation.id === res.id) {
        setLookupResult(updated);
      }
      await fetchOperationalLists();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || 'Gagal memproses Check-out tamu.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const lookedUpRes = lookupResult?.reservation;
  const eligibility = lookupResult?.eligibility;

  return (
    <AdminLayout
      title="Check-in & Check-out Tamu"
      subtitle="Verifikasi kode tiket reservasi, serah terima kunci unit kamar, dan penyelesaian masa menginap (SF-16)"
    >
      {/* Operational Hours Banner */}
      <div className="bg-gradient-to-r from-sage-dark via-wood to-wood rounded-3xl p-5 sm:p-6 text-white shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full">
            <Clock size={13} /> Ketentuan Waktu Operasional (PRD BR-10 & BR-11)
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold">
            Meja Resepsionis Check-in & Check-out
          </h2>
          <p className="text-xs sm:text-sm text-white/90">
            Jadwal Check-in mulai pukul <strong>13:00 WIB</strong> (wajib sesuai tanggal Check-in){' '}
            • Jadwal Check-out pukul <strong>11:00 – 12:00 WIB</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/admin/reservations"
            className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-2xl transition"
          >
            <CalendarDays size={16} /> Semua Reservasi Masuk
          </Link>
        </div>
      </div>

      {/* Global Action Alerts */}
      {actionSuccess && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3.5 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
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

      {actionError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3.5 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={20} className="text-red-600 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="text-red-600 hover:text-red-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Booking Code Verification Card (SF-16) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm mb-8">
        <div className="max-w-2xl">
          <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
            <KeyRound size={20} className="text-sage-dark" />
            Verifikasi Kode Booking Tiket Tamu
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Masukkan kode booking dari tiket digital atau invoice PDF tamu (contoh:{' '}
            <code className="font-mono font-semibold text-wood">HSR-20261112-XXXX</code>)
            untuk memvalidasi kelayakan Check-in atau memproses Check-out.
          </p>

          <form
            onSubmit={handleLookupSubmit}
            className="mt-4 flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                value={bookingCodeInput}
                onChange={(e) => setBookingCodeInput(e.target.value.toUpperCase())}
                placeholder="Ketik Kode Booking (misal: HSR-20261112-AB12)"
                className="w-full pl-11 pr-4 py-3 font-mono text-sm font-bold uppercase tracking-wider bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:border-sage-dark focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={lookupLoading}
              className="inline-flex items-center justify-center gap-2 bg-wood hover:bg-sage-dark text-white font-semibold text-sm px-6 py-3 rounded-2xl transition shadow-sm disabled:opacity-60 shrink-0"
            >
              <ShieldCheck size={18} />
              {lookupLoading ? 'Memverifikasi...' : 'Verifikasi Kode'}
            </button>
            {lookupResult && (
              <button
                type="button"
                onClick={() => {
                  setLookupResult(null);
                  setBookingCodeInput('');
                  setLookupError('');
                  setSearchParams({});
                }}
                className="inline-flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs px-4 py-3 rounded-2xl transition"
              >
                Bersihkan
              </button>
            )}
          </form>

          {lookupError && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle size={17} className="shrink-0 text-red-600" />
              <span>{lookupError}</span>
            </div>
          )}
        </div>

        {/* Lookup Result Detail Card */}
        {lookedUpRes && eligibility && (
          <div className="mt-6 pt-6 border-t border-stone-200">
            <div className="rounded-3xl border border-stone-200 overflow-hidden bg-stone-50/60">
              {/* Top Result Header */}
              <div
                className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white ${
                  eligibility.canCheckIn
                    ? 'bg-emerald-700'
                    : eligibility.canCheckOut
                    ? 'bg-blue-700'
                    : 'bg-stone-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                    {eligibility.canCheckIn || eligibility.canCheckOut ? (
                      <CheckCircle2 size={22} />
                    ) : (
                      <AlertCircle size={22} />
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest opacity-85 block">
                      Hasil Verifikasi Kode Booking • {lookedUpRes.bookingCode}
                    </span>
                    <h4 className="font-serif text-lg sm:text-xl font-bold">
                      {eligibility.canCheckIn
                        ? 'Memenuhi Syarat Check-in Hari Ini (BR-10)'
                        : eligibility.canCheckOut
                        ? 'Tamu Sedang Menginap — Siap untuk Check-out (BR-11)'
                        : 'Tidak Dapat Diproses Check-in Saat Ini'}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase">
                    Status: {lookedUpRes.status}
                  </span>
                </div>
              </div>

              {/* Result Body */}
              <div className="p-6 space-y-5">
                {/* Eligibility Reason Alert if Ineligible or Active */}
                {eligibility.reason && (
                  <div
                    className={`rounded-2xl p-4 border text-xs sm:text-sm flex items-start gap-3 ${
                      eligibility.canCheckOut
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Keterangan Validasi Sistem:</p>
                      <p className="mt-0.5">{eligibility.reason}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Guest Box */}
                  <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-1.5 text-xs">
                    <span className="font-bold text-wood uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={14} className="text-sage-dark" /> Data Tamu
                    </span>
                    <p className="text-sm font-bold text-stone-900">
                      {lookedUpRes.user?.name || '-'}
                    </p>
                    <p className="text-stone-600 break-all">
                      {lookedUpRes.user?.email || '-'}
                    </p>
                    <p className="text-stone-600">{lookedUpRes.user?.phone || '-'}</p>
                  </div>

                  {/* Room & Allocated Units Box */}
                  <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-1.5 text-xs">
                    <span className="font-bold text-wood uppercase tracking-wider flex items-center gap-1.5">
                      <BedDouble size={14} className="text-sage-dark" /> Kamar & Nomor Unit
                    </span>
                    <p className="text-sm font-bold text-stone-900">
                      {lookedUpRes.room?.name || `Kamar #${lookedUpRes.roomId}`}
                    </p>
                    <p className="text-stone-600">
                      {lookedUpRes.roomCount} Kamar • {lookedUpRes.guestCount} Tamu •{' '}
                      {lookedUpRes.nights} Malam
                    </p>
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {lookedUpRes.units && lookedUpRes.units.length > 0 ? (
                        lookedUpRes.units.map((u) => (
                          <span
                            key={u.id}
                            className="inline-flex items-center gap-1 font-mono text-xs font-bold bg-cream text-wood border border-stone-300 px-2.5 py-1 rounded-lg"
                          >
                            <DoorOpen size={13} className="text-sage-dark" />
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

                  {/* Stay Schedule & Payment Box */}
                  <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-1.5 text-xs">
                    <span className="font-bold text-wood uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard size={14} className="text-sage-dark" /> Jadwal & Tagihan
                    </span>
                    <p className="text-stone-700">
                      Check-in:{' '}
                      <strong className="text-stone-900">
                        {formatDateID(lookedUpRes.checkInDate)}
                      </strong>{' '}
                      <span className="text-stone-500">(13:00 WIB)</span>
                    </p>
                    <p className="text-stone-700">
                      Check-out:{' '}
                      <strong className="text-stone-900">
                        {formatDateID(lookedUpRes.checkOutDate)}
                      </strong>{' '}
                      <span className="text-stone-500">(11:00–12:00 WIB)</span>
                    </p>
                    <p className="text-stone-700 pt-0.5">
                      Total:{' '}
                      <strong className="text-stone-900">
                        {formatRupiah(lookedUpRes.totalPrice)}
                      </strong>{' '}
                      <span
                        className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lookedUpRes.payment?.status === 'Settlement'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {lookedUpRes.payment?.status || 'Pending'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Action Button Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-stone-500">
                    Tanggal operasional server hari ini (WIB):{' '}
                    <strong className="text-stone-800">
                      {formatDateID(eligibility.todayWib)}
                    </strong>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {eligibility.canCheckIn && (
                      <button
                        type="button"
                        disabled={processingId === lookedUpRes.id}
                        onClick={() => handleConfirmCheckIn(lookedUpRes)}
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-6 py-3 rounded-2xl transition shadow-sm disabled:opacity-50"
                      >
                        <UserCheck size={18} />
                        {processingId === lookedUpRes.id
                          ? 'Memproses Check-in...'
                          : 'Konfirmasi Check-in & Serahkan Kunci'}
                      </button>
                    )}

                    {eligibility.canCheckOut && (
                      <button
                        type="button"
                        disabled={processingId === lookedUpRes.id}
                        onClick={() => handleConfirmCheckOut(lookedUpRes)}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-3 rounded-2xl transition shadow-sm disabled:opacity-50"
                      >
                        <LogOut size={18} />
                        {processingId === lookedUpRes.id
                          ? 'Memproses Check-out...'
                          : 'Proses Check-out & Selesaikan Menginap'}
                      </button>
                    )}

                    {!eligibility.canCheckIn && !eligibility.canCheckOut && (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-2 bg-stone-200 text-stone-500 font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-2xl cursor-not-allowed"
                      >
                        Check-in Tidak Tersedia
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Operational Lists Section: Checked-in Guests & Arriving Today */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('checked-in')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                activeTab === 'checked-in'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <DoorOpen size={16} />
              <span>Tamu Sedang Menginap (Checked-in)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'checked-in'
                    ? 'bg-white/20 text-white'
                    : 'bg-white text-stone-700'
                }`}
              >
                {checkedInList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('arriving-today')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                activeTab === 'arriving-today'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <UserCheck size={16} />
              <span>Jadwal Kedatangan Hari Ini ({todayWib || 'WIB'})</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'arriving-today'
                    ? 'bg-white/20 text-white'
                    : 'bg-white text-stone-700'
                }`}
              >
                {arrivingTodayList.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchOperationalLists}
            disabled={listsLoading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-wood bg-stone-100 hover:bg-stone-200 px-3.5 py-2 rounded-xl transition self-start sm:self-auto"
          >
            <RefreshCw size={14} className={listsLoading ? 'animate-spin' : ''} />
            <span>Segarkan Daftar</span>
          </button>
        </div>

        {listsLoading ? (
          <div className="p-10 text-center text-stone-500 text-sm">
            Memuat daftar operasional tamu...
          </div>
        ) : activeTab === 'checked-in' ? (
          checkedInList.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <DoorOpen size={36} className="mx-auto text-stone-300" />
              <p className="text-sm font-semibold text-stone-700">
                Belum ada tamu yang sedang menginap (Checked-in) saat ini
              </p>
              <p className="text-xs text-stone-500">
                Gunakan kolom verifikasi kode booking di atas atau tab Jadwal Kedatangan Hari Ini untuk memproses Check-in tamu.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Kode Booking</th>
                    <th className="py-3.5 px-4">Tamu Menginap</th>
                    <th className="py-3.5 px-4">Kamar & Nomor Unit</th>
                    <th className="py-3.5 px-4">Jadwal Check-out</th>
                    <th className="py-3.5 px-4 text-right">Aksi Check-out (BR-11)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs sm:text-sm">
                  {checkedInList.map((res) => (
                    <tr key={res.id} className="hover:bg-stone-50/80 transition">
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-stone-900 block">
                          {res.bookingCode}
                        </span>
                        <span className="inline-block mt-1 text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          Checked-in
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-stone-900">
                          {res.user?.name || '-'}
                        </p>
                        <p className="text-xs text-stone-500">
                          {res.user?.phone || res.user?.email || '-'}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-wood">
                          {res.room?.name || `Kamar #${res.roomId}`}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {res.units?.map((u) => (
                            <span
                              key={u.id}
                              className="inline-flex items-center gap-1 font-mono text-[11px] font-bold bg-cream text-wood border border-stone-200 px-2 py-0.5 rounded-lg"
                            >
                              <DoorOpen size={11} className="text-sage-dark" />
                              Unit {u.unitNumber}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="font-semibold text-stone-900">
                          {formatDateID(res.checkOutDate)}
                        </p>
                        <span className="text-[11px] text-stone-500">
                          Pukul 11:00 – 12:00 WIB ({res.nights} malam)
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={processingId === res.id}
                          onClick={() => handleConfirmCheckOut(res)}
                          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm disabled:opacity-50"
                        >
                          <LogOut size={14} />
                          {processingId === res.id
                            ? 'Memproses...'
                            : 'Proses Check-out'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : arrivingTodayList.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <UserCheck size={36} className="mx-auto text-stone-300" />
            <p className="text-sm font-semibold text-stone-700">
              Tidak ada jadwal kedatangan tamu (Confirmed) untuk hari ini ({todayWib})
            </p>
            <p className="text-xs text-stone-500">
              Semua tamu hari ini mungkin sudah melakukan Check-in atau belum ada jadwal Check-in pada tanggal ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Kode Booking</th>
                  <th className="py-3.5 px-4">Data Tamu</th>
                  <th className="py-3.5 px-4">Kamar & Nomor Unit</th>
                  <th className="py-3.5 px-4">Jadwal Menginap</th>
                  <th className="py-3.5 px-4 text-right">Aksi Check-in (BR-10)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs sm:text-sm">
                {arrivingTodayList.map((res) => (
                  <tr key={res.id} className="hover:bg-stone-50/80 transition">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-stone-900 block">
                        {res.bookingCode}
                      </span>
                      <span className="inline-block mt-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Confirmed • Lunas
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-stone-900">
                        {res.user?.name || '-'}
                      </p>
                      <p className="text-xs text-stone-500">
                        {res.user?.phone || res.user?.email || '-'}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-wood">
                        {res.room?.name || `Kamar #${res.roomId}`}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {res.units?.map((u) => (
                          <span
                            key={u.id}
                            className="inline-flex items-center gap-1 font-mono text-[11px] font-bold bg-cream text-wood border border-stone-200 px-2 py-0.5 rounded-lg"
                          >
                            <DoorOpen size={11} className="text-sage-dark" />
                            Unit {u.unitNumber}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <p className="font-semibold text-stone-900">
                        {formatDateID(res.checkInDate)} → {formatDateID(res.checkOutDate)}
                      </p>
                      <span className="text-[11px] text-stone-500">
                        Check-in mulai 13:00 WIB ({res.nights} malam)
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (res.bookingCode) {
                              setBookingCodeInput(res.bookingCode);
                              setSearchParams({ code: res.bookingCode });
                            }
                          }}
                          className="inline-flex items-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold px-3 py-2 rounded-xl transition"
                        >
                          Pilih <ArrowRight size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={processingId === res.id}
                          onClick={() => handleConfirmCheckIn(res)}
                          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm disabled:opacity-50"
                        >
                          <UserCheck size={14} />
                          {processingId === res.id
                            ? 'Memproses...'
                            : 'Konfirmasi Check-in'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCheckIn;
