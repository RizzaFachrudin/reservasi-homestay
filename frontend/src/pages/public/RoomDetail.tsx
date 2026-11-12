import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  BedDouble,
  ShieldCheck,
  Sparkles,
  LogIn,
} from 'lucide-react';
import GuestLayout from '../../layouts/GuestLayout';
import { roomService, Room } from '../../services/room.service';
import { getFacilityIcon } from '../admin/Facilities';
import { useAuth } from '../../context/AuthContext';

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const toDateString = (year: number, monthZeroIndexed: number, day: number): string => {
  const m = String(monthZeroIndexed + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

const addDays = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split('T')[0];
};

const getDatesBetween = (startStr: string, endStr: string): string[] => {
  const dates: string[] = [];
  if (!startStr || !endStr || endStr <= startStr) return dates;
  let curr = startStr;
  let safety = 0;
  while (curr < endStr && safety < 366) {
    dates.push(curr);
    curr = addDays(curr, 1);
    safety++;
  }
  return dates;
};

const RoomDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const initialCheckIn = searchParams.get('check_in') || searchParams.get('checkIn') || '';
  const initialCheckOut = searchParams.get('check_out') || searchParams.get('checkOut') || '';
  const initialGuests = Math.max(1, parseInt(searchParams.get('guests') || '1', 10) || 1);

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState<string>('');

  // Booking form state
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);
  const [bookingError, setBookingError] = useState('');

  // Calendar state
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const [viewYear, setViewYear] = useState<number>(() => {
    if (initialCheckIn) {
      const y = parseInt(initialCheckIn.split('-')[0], 10);
      if (!Number.isNaN(y)) return y;
    }
    return now.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (initialCheckIn) {
      const m = parseInt(initialCheckIn.split('-')[1], 10);
      if (!Number.isNaN(m) && m >= 1 && m <= 12) return m - 1;
    }
    return now.getMonth();
  });
  const [bookedDatesMap, setBookedDatesMap] = useState<Record<string, boolean>>({});
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Fetch room detail
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);

    roomService
      .getPublicRoomById(id)
      .then((data) => {
        setRoom(data);
        const fallbackImg = `/images/room-${((Number(data.id) || 1) % 3) + 1}.jpg`;
        setActiveImage(data.primaryImage || data.images?.[0]?.imagePath || fallbackImg);
        if (guests > data.capacity) {
          setGuests(data.capacity);
        }
      })
      .catch(() => {
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Fetch room availability for current viewMonth AND next month (to handle cross-month selections smoothly)
  useEffect(() => {
    if (!id || notFound) return;

    const currentMonthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    const nextMonthKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    setLoadingCalendar(true);
    Promise.all([
      roomService.getRoomAvailability(id, currentMonthKey),
      roomService.getRoomAvailability(id, nextMonthKey),
    ])
      .then(([currRes, nextRes]) => {
        setBookedDatesMap((prev) => {
          const updated = { ...prev };
          currRes.bookedDates.forEach((d) => {
            updated[d] = true;
          });
          nextRes.bookedDates.forEach((d) => {
            updated[d] = true;
          });
          return updated;
        });
      })
      .catch((err) => {
        console.error('Failed to load room availability calendar:', err);
      })
      .finally(() => {
        setLoadingCalendar(false);
      });
  }, [id, viewYear, viewMonth, notFound]);

  const galleryImages = useMemo(() => {
    if (!room) return [];
    if (room.images && room.images.length > 0) {
      return room.images.map((img) => img.imagePath);
    }
    const fallbackImg = `/images/room-${((Number(room.id) || 1) % 3) + 1}.jpg`;
    return [fallbackImg];
  }, [room]);

  // Calculate nights & overlap check
  const stayNights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const inTime = new Date(`${checkIn}T00:00:00Z`).getTime();
    const outTime = new Date(`${checkOut}T00:00:00Z`).getTime();
    const diff = Math.round((outTime - inTime) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const stayDates = useMemo(() => getDatesBetween(checkIn, checkOut), [checkIn, checkOut]);

  const hasOverlapWithBooked = useMemo(() => {
    return stayDates.some((d) => bookedDatesMap[d]);
  }, [stayDates, bookedDatesMap]);

  const estimatedTotal = useMemo(() => {
    if (!room || stayNights <= 0) return 0;
    return room.pricePerNight * stayNights;
  }, [room, stayNights]);

  // Calendar navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Interactive date click on calendar
  const handleCalendarDayClick = (dateStr: string) => {
    setBookingError('');
    if (dateStr < todayStr) return;

    // Starting new selection or resetting existing range
    if (!checkIn || (checkIn && checkOut)) {
      if (bookedDatesMap[dateStr]) {
        setBookingError('Tanggal yang dipilih sudah terisi untuk menginap (check-in).');
        return;
      }
      setCheckIn(dateStr);
      setCheckOut('');
      return;
    }

    // Selecting check-out after check-in
    if (dateStr <= checkIn) {
      if (bookedDatesMap[dateStr]) {
        setBookingError('Tanggal yang dipilih sudah terisi.');
        return;
      }
      setCheckIn(dateStr);
      setCheckOut('');
      return;
    }

    // Verify no booked nights in [checkIn, dateStr)
    const range = getDatesBetween(checkIn, dateStr);
    if (range.some((d) => bookedDatesMap[d])) {
      setBookingError(
        'Rentang tanggal yang dipilih melewati malam yang sudah dipesan. Silakan pilih tanggal lain.'
      );
      return;
    }

    setCheckOut(dateStr);
  };

  // Calendar grid generation
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }
    return cells;
  }, [viewYear, viewMonth]);

  const handleProceedBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');

    if (!room) return;
    if (!checkIn || !checkOut) {
      setBookingError('Silakan pilih tanggal check-in dan check-out terlebih dahulu.');
      return;
    }
    if (checkIn < todayStr) {
      setBookingError('Tanggal check-in tidak boleh di masa lalu.');
      return;
    }
    if (stayNights <= 0) {
      setBookingError('Tanggal check-out harus setelah tanggal check-in (minimal 1 malam).');
      return;
    }
    if (hasOverlapWithBooked) {
      setBookingError('Maaf, terdapat tanggal yang sudah terisi dalam rentang pilihan Anda.');
      return;
    }
    if (!guests || guests < 1 || guests > room.capacity) {
      setBookingError(`Jumlah tamu harus antara 1 hingga maksimal ${room.capacity} orang.`);
      return;
    }

    const query = new URLSearchParams({
      check_in: checkIn,
      check_out: checkOut,
      guests: String(guests),
    });
    const bookingPath = `/booking/${room.id}?${query.toString()}`;

    // BR-19 Login Gate: Redirect unauthenticated user to /login?redirect=...
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(bookingPath)}`);
      return;
    }

    navigate(bookingPath);
  };

  if (loading) {
    return (
      <GuestLayout>
        <div className="py-24 text-center bg-white rounded-3xl border border-stone-100">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sage-dark mx-auto mb-3" />
          <p className="text-sm text-stone-500 font-medium">Memuat detail kamar...</p>
        </div>
      </GuestLayout>
    );
  }

  if (notFound || !room) {
    return (
      <GuestLayout>
        <div className="py-20 px-6 text-center bg-white rounded-3xl border border-stone-200/70 max-w-xl mx-auto my-8">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <BedDouble size={32} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-wood mb-2">
            Kamar Tidak Tersedia
          </h1>
          <p className="text-sm text-ink/70 mb-6">
            Maaf, kamar yang Anda cari tidak ditemukan, sedang dalam pemeliharaan (maintenance), atau sudah tidak tersedia.
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

  return (
    <GuestLayout>
      {/* Back navigation */}
      <div className="mb-6">
        <Link
          to={
            checkIn && checkOut
              ? `/rooms?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}`
              : '/rooms'
          }
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-wood hover:text-sage-dark transition"
        >
          <ArrowLeft size={16} /> Kembali ke Daftar Kamar
        </Link>
      </div>

      {/* Main Grid: Left (Gallery, Details, Calendar) & Right (Sticky Booking Box) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          {/* Photo Gallery */}
          <div className="bg-white rounded-3xl p-3 sm:p-4 shadow-sm border border-stone-100">
            <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden bg-sage/15 relative">
              <img
                src={activeImage}
                alt={room.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-sage-dark flex items-center gap-1 shadow-sm">
                <Sparkles size={13} /> Tersedia untuk Dipesan
              </div>
            </div>

            {galleryImages.length > 1 && (
              <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1">
                {galleryImages.map((imgUrl, index) => (
                  <button
                    key={imgUrl + index}
                    type="button"
                    onClick={() => setActiveImage(imgUrl)}
                    className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                      activeImage === imgUrl
                        ? 'border-sage-dark ring-2 ring-sage-dark/30'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${room.name} - foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Room Description & Facilities */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-100 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-6">
              <div>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-wood">
                  {room.name}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-ink/75">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Users size={16} className="text-sage-dark" /> Kapasitas Maksimal:{' '}
                    <strong className="text-ink">{room.capacity} Tamu</strong>
                  </span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="block text-xs text-ink/60">Harga per malam</span>
                <span className="text-2xl font-bold text-wood">
                  {formatRupiah(room.pricePerNight)}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="font-serif text-xl font-bold text-ink mb-2">
                Deskripsi Kamar
              </h2>
              <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-line">
                {room.description ||
                  'Kamar nyaman dengan pencahayaan alami dan sirkulasi udara yang segar, dirancang untuk memberikan ketenangan selama Anda menginap di homestay kami.'}
              </p>
            </div>

            {/* Facilities */}
            <div>
              <h2 className="font-serif text-xl font-bold text-ink mb-3">
                Fasilitas Kamar
              </h2>
              {room.facilities && room.facilities.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {room.facilities.map((fac) => (
                    <div
                      key={fac.id}
                      className="flex items-center gap-2.5 bg-cream/70 border border-stone-200/60 rounded-2xl px-3.5 py-2.5"
                    >
                      <span className="w-8 h-8 rounded-xl bg-sage/20 text-sage-dark flex items-center justify-center shrink-0">
                        {getFacilityIcon(fac.icon, 16)}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-ink">
                        {fac.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-400">
                  Fasilitas standar homestay tersedia.
                </p>
              )}
            </div>
          </div>

          {/* Interactive Availability Calendar (SF-4 & BR-18) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
                  <CalendarIcon size={20} className="text-sage-dark" />
                  Kalender Ketersediaan Kamar
                </h2>
                <p className="text-xs text-ink/65 mt-0.5">
                  Klik tanggal tersedia untuk memilih Check-in dan Check-out. Tanggal bertanda merah sudah dipesan.
                </p>
              </div>
              {checkIn && (
                <button
                  type="button"
                  onClick={() => {
                    setCheckIn('');
                    setCheckOut('');
                    setBookingError('');
                  }}
                  className="text-xs font-semibold text-sage-dark hover:underline self-start sm:self-auto"
                >
                  Reset Pilihan Tanggal
                </button>
              )}
            </div>

            {/* Month Header */}
            <div className="flex items-center justify-between bg-cream rounded-2xl px-4 py-3 mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-white text-wood transition"
                title="Bulan sebelumnya"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <span className="font-serif text-lg font-bold text-wood">
                  {MONTH_NAMES_ID[viewMonth]} {viewYear}
                </span>
                {loadingCalendar && (
                  <span className="block text-[10px] text-stone-400">
                    Memperbarui jadwal...
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-white text-wood transition"
                title="Bulan berikutnya"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
              {DAY_NAMES_ID.map((dayName) => (
                <div
                  key={dayName}
                  className="text-xs font-semibold text-stone-400 py-1"
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="h-11" />;
                }

                const dateStr = toDateString(viewYear, viewMonth, day);
                const isPast = dateStr < todayStr;
                const isBooked = Boolean(bookedDatesMap[dateStr]);
                const isCheckIn = dateStr === checkIn;
                const isCheckOut = dateStr === checkOut;
                const isInSelectedRange =
                  Boolean(checkIn && checkOut) && dateStr > checkIn && dateStr < checkOut;

                // Note per BR-04: A booked date cannot be Check-in or an intermediate stay night,
                // EXCEPT if the user already selected a valid checkIn before a booked date, that booked date can serve as checkOut morning!
                const canBeCheckOutOnly =
                  Boolean(checkIn && !checkOut) &&
                  dateStr > checkIn &&
                  isBooked &&
                  !getDatesBetween(checkIn, dateStr).some((d) => bookedDatesMap[d]);

                const isDisabled = isPast || (isBooked && !canBeCheckOutOnly);

                let cellStyle =
                  'bg-stone-50/70 text-ink hover:bg-sage/20 border-stone-200/60';
                if (isPast) {
                  cellStyle =
                    'bg-stone-100/60 text-stone-300 border-transparent cursor-not-allowed';
                } else if (isCheckIn || isCheckOut) {
                  cellStyle =
                    'bg-sage-dark text-white font-bold border-sage-dark shadow-sm';
                } else if (isInSelectedRange) {
                  cellStyle =
                    'bg-sage/30 text-wood font-semibold border-sage/40';
                } else if (isBooked) {
                  cellStyle = canBeCheckOutOnly
                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                    : 'bg-red-50 text-red-400 line-through border-red-100 cursor-not-allowed';
                }

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleCalendarDayClick(dateStr)}
                    className={`h-11 rounded-xl border text-xs sm:text-sm flex flex-col items-center justify-center transition relative ${cellStyle}`}
                    title={
                      isPast
                        ? 'Tanggal sudah lewat'
                        : isBooked && !canBeCheckOutOnly
                        ? 'Sudah dipesan (Terisi)'
                        : canBeCheckOutOnly
                        ? 'Tersedia hanya untuk Check-out pagi'
                        : 'Tersedia'
                    }
                  >
                    <span>{day}</span>
                    {(isCheckIn || isCheckOut) && (
                      <span className="text-[9px] leading-none font-normal opacity-90">
                        {isCheckIn ? 'In' : 'Out'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-stone-100 text-xs text-ink/70">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-stone-50 border border-stone-300 inline-block" />
                <span>Tersedia</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-sage-dark inline-block" />
                <span>Tanggal Dipilih (Check-in / Check-out)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-red-100 border border-red-300 inline-block" />
                <span>Terisi / Dipesan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Booking Card */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24">
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-stone-200/80">
            <div className="flex items-baseline justify-between border-b border-stone-100 pb-4 mb-5">
              <div>
                <span className="text-2xl font-bold text-wood">
                  {formatRupiah(room.pricePerNight)}
                </span>
                <span className="text-xs text-ink/60"> / malam</span>
              </div>
              <span className="text-xs font-semibold text-sage-dark bg-sage/15 px-2.5 py-1 rounded-full">
                Maks. {room.capacity} Tamu
              </span>
            </div>

            <form onSubmit={handleProceedBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="bg-cream rounded-2xl px-3.5 py-2.5 block border border-transparent focus-within:border-sage-dark">
                  <span className="block text-[11px] text-wood font-semibold mb-0.5">
                    Check-in
                  </span>
                  <input
                    type="date"
                    value={checkIn}
                    min={todayStr}
                    required
                    onChange={(e) => {
                      setCheckIn(e.target.value);
                      setBookingError('');
                    }}
                    className="w-full bg-transparent text-ink text-xs sm:text-sm font-medium focus:outline-none"
                  />
                </label>

                <label className="bg-cream rounded-2xl px-3.5 py-2.5 block border border-transparent focus-within:border-sage-dark">
                  <span className="block text-[11px] text-wood font-semibold mb-0.5">
                    Check-out
                  </span>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn ? addDays(checkIn, 1) : addDays(todayStr, 1)}
                    required
                    onChange={(e) => {
                      setCheckOut(e.target.value);
                      setBookingError('');
                    }}
                    className="w-full bg-transparent text-ink text-xs sm:text-sm font-medium focus:outline-none"
                  />
                </label>
              </div>

              <label className="bg-cream rounded-2xl px-4 py-2.5 block border border-transparent focus-within:border-sage-dark">
                <span className="block text-[11px] text-wood font-semibold mb-0.5">
                  Jumlah Tamu (Maks. {room.capacity} orang)
                </span>
                <input
                  type="number"
                  min={1}
                  max={room.capacity}
                  value={Number.isNaN(guests) ? '' : guests}
                  required
                  onChange={(e) => {
                    setGuests(parseInt(e.target.value, 10));
                    setBookingError('');
                  }}
                  className="w-full bg-transparent text-ink text-sm font-medium focus:outline-none"
                />
              </label>

              {/* Price Breakdown & Availability Status */}
              {stayNights > 0 && !hasOverlapWithBooked && (
                <div className="bg-cream/60 rounded-2xl p-4 space-y-2.5 border border-stone-200/70">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sage-dark">
                    <CheckCircle2 size={15} />
                    <span>Kamar tersedia pada tanggal ini</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-ink/75 pt-1">
                    <span>
                      {formatRupiah(room.pricePerNight)} × {stayNights} malam
                    </span>
                    <span className="font-medium text-ink">
                      {formatRupiah(estimatedTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold text-wood pt-2 border-t border-stone-200/80">
                    <span>Estimasi Total Harga</span>
                    <span className="text-base">{formatRupiah(estimatedTotal)}</span>
                  </div>
                </div>
              )}

              {hasOverlapWithBooked && (
                <div className="flex items-start gap-2 bg-red-50 text-red-600 text-xs font-medium p-3.5 rounded-2xl">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>
                    Maaf, satu atau lebih malam pada rentang tanggal yang Anda pilih sudah dipesan. Silakan pilih tanggal lain di kalender.
                  </span>
                </div>
              )}

              {bookingError && (
                <div className="flex items-start gap-2 bg-red-50 text-red-600 text-xs font-medium p-3.5 rounded-2xl">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{bookingError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={hasOverlapWithBooked}
                className="w-full flex items-center justify-center gap-2 bg-sage-dark hover:bg-wood disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-2xl transition shadow-md"
              >
                {isAuthenticated ? (
                  <span>Pesan Kamar Sekarang</span>
                ) : (
                  <>
                    <LogIn size={17} />
                    <span>Pesan Kamar (Login Diperlukan)</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink/60 pt-1">
                <ShieldCheck size={14} className="text-sage-dark" />
                <span>Harga transparan, konfirmasi instan via pembayaran online</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
};

export default RoomDetail;
