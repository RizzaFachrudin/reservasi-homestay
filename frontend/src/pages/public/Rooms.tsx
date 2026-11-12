import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Users,
  BedDouble,
  Calendar,
  ArrowRight,
  SlidersHorizontal,
  X,
  AlertCircle,
  RefreshCw,
  Check,
} from 'lucide-react';
import GuestLayout from '../../layouts/GuestLayout';
import { roomService, Room } from '../../services/room.service';
import { facilityService, Facility } from '../../services/facility.service';
import { getFacilityIcon } from '../admin/Facilities';
import RoomStockBadge from '../../components/RoomStockBadge';

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const formatDateID = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

type SortOption = 'default' | 'price_asc' | 'price_desc' | 'capacity_desc';

const Rooms: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlCheckIn = searchParams.get('check_in') || searchParams.get('checkIn') || '';
  const urlCheckOut = searchParams.get('check_out') || searchParams.get('checkOut') || '';
  const urlGuests = searchParams.get('guests') || '1';
  const urlRooms = searchParams.get('rooms') || '1';

  // Form input states
  const [checkIn, setCheckIn] = useState(urlCheckIn);
  const [checkOut, setCheckOut] = useState(urlCheckOut);
  const [guests, setGuests] = useState<number>(Math.max(1, parseInt(urlGuests, 10) || 1));
  const [roomCount, setRoomCount] = useState<number>(Math.max(1, parseInt(urlRooms, 10) || 1));
  const [formError, setFormError] = useState('');

  // Data states
  const [rooms, setRooms] = useState<Room[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  // Client-side filter & sort states
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('default');

  const today = new Date().toISOString().split('T')[0];
  const isSearchMode = Boolean(urlCheckIn && urlCheckOut);

  // Sync form state when URL searchParams change
  useEffect(() => {
    setCheckIn(urlCheckIn);
    setCheckOut(urlCheckOut);
    setGuests(Math.max(1, parseInt(urlGuests, 10) || 1));
    setRoomCount(Math.max(1, parseInt(urlRooms, 10) || 1));
  }, [urlCheckIn, urlCheckOut, urlGuests, urlRooms]);

  // Load facilities once
  useEffect(() => {
    facilityService
      .getPublicFacilities()
      .then(setFacilities)
      .catch((err) => console.error('Failed to load facilities:', err));
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    setApiError('');
    setFormError('');

    try {
      if (urlCheckIn && urlCheckOut) {
        if (new Date(urlCheckOut) <= new Date(urlCheckIn)) {
          setFormError('Tanggal check-out harus setelah tanggal check-in');
          setRooms([]);
          setLoading(false);
          return;
        }
        const data = await roomService.getAvailableRooms({
          check_in: urlCheckIn,
          check_out: urlCheckOut,
          guests: Math.max(1, parseInt(urlGuests, 10) || 1),
          rooms: Math.max(1, parseInt(urlRooms, 10) || 1),
        });
        setRooms(data);
      } else {
        const data = await roomService.getPublicRooms();
        const guestNum = parseInt(urlGuests, 10);
        const roomsNum = Math.max(1, parseInt(urlRooms, 10) || 1);
        if (!Number.isNaN(guestNum) && guestNum > 1) {
          setRooms(data.filter((r) => r.capacity * roomsNum >= guestNum));
        } else {
          setRooms(data);
        }
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Gagal memuat daftar kamar. Silakan coba lagi.';
      setApiError(msg);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [urlCheckIn, urlCheckOut, urlGuests, urlRooms]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!checkIn || !checkOut) {
      setFormError('Tanggal check-in dan check-out wajib diisi untuk mencari ketersediaan');
      return;
    }
    if (checkIn < today) {
      setFormError('Tanggal check-in tidak boleh di masa lalu');
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setFormError('Tanggal check-out harus setelah tanggal check-in');
      return;
    }
    if (!guests || guests < 1) {
      setFormError('Jumlah tamu minimal 1 orang');
      return;
    }
    if (!roomCount || roomCount < 1) {
      setFormError('Jumlah kamar minimal 1');
      return;
    }

    setSearchParams({
      check_in: checkIn,
      check_out: checkOut,
      guests: String(guests),
      rooms: String(roomCount),
    });
  };

  const handleResetDates = () => {
    setCheckIn('');
    setCheckOut('');
    setGuests(1);
    setRoomCount(1);
    setFormError('');
    setSearchParams({});
  };

  const toggleFacility = (id: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredAndSortedRooms = useMemo(() => {
    let result = [...rooms];

    // Filter by selected facilities (must contain all selected facilities)
    if (selectedFacilities.length > 0) {
      result = result.filter((room) => {
        const roomFacIds = room.facilities.map((f) => String(f.id));
        return selectedFacilities.every((selId) => roomFacIds.includes(selId));
      });
    }

    // Sort
    if (sortBy === 'price_asc') {
      result.sort((a, b) => a.pricePerNight - b.pricePerNight);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.pricePerNight - a.pricePerNight);
    } else if (sortBy === 'capacity_desc') {
      result.sort((a, b) => b.capacity - a.capacity);
    }

    return result;
  }, [rooms, selectedFacilities, sortBy]);

  const buildDetailUrl = (roomId: string) => {
    if (urlCheckIn && urlCheckOut) {
      const q = new URLSearchParams({
        check_in: urlCheckIn,
        check_out: urlCheckOut,
        guests: urlGuests || '1',
        rooms: urlRooms || '1',
      });
      return `/rooms/${roomId}?${q.toString()}`;
    }
    return `/rooms/${roomId}`;
  };

  return (
    <GuestLayout>
      {/* Header Banner */}
      <div className="mb-8">
        <p className="text-sage-dark text-xs font-semibold uppercase tracking-wider">
          {isSearchMode ? 'Hasil Pencarian Ketersediaan' : 'Katalog Penginapan'}
        </p>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-wood mt-1">
          {isSearchMode ? 'Kamar yang Tersedia' : 'Pilihan Kamar Homestay'}
        </h1>
        <p className="text-sm text-ink/70 mt-1">
          {isSearchMode
            ? `Menampilkan kamar yang tersedia untuk ${formatDateID(urlCheckIn)} – ${formatDateID(urlCheckOut)} (${urlGuests} tamu, ${urlRooms} kamar).`
            : 'Pilih tanggal menginap untuk memeriksa ketersediaan dan estimasi total harga.'}
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-200/80 p-4 md:p-5 mb-8">
        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-1 md:grid-cols-[1fr_1fr_0.6fr_0.6fr_auto] gap-3 items-stretch"
        >
          <label className="bg-cream rounded-2xl px-4 py-2.5 block cursor-pointer border border-transparent focus-within:border-sage-dark">
            <span className="block text-xs text-wood font-semibold mb-0.5">Check-in</span>
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full bg-transparent text-ink text-sm font-medium focus:outline-none"
            />
          </label>

          <label className="bg-cream rounded-2xl px-4 py-2.5 block cursor-pointer border border-transparent focus-within:border-sage-dark">
            <span className="block text-xs text-wood font-semibold mb-0.5">Check-out</span>
            <input
              type="date"
              value={checkOut}
              min={checkIn || today}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full bg-transparent text-ink text-sm font-medium focus:outline-none"
            />
          </label>

          <label className="bg-cream rounded-2xl px-4 py-2.5 block cursor-pointer border border-transparent focus-within:border-sage-dark">
            <span className="block text-xs text-wood font-semibold mb-0.5">Jumlah Tamu</span>
            <input
              type="number"
              min={1}
              max={10}
              value={Number.isNaN(guests) ? '' : guests}
              onChange={(e) => setGuests(parseInt(e.target.value, 10))}
              className="w-full bg-transparent text-ink text-sm font-medium focus:outline-none"
            />
          </label>

          <label className="bg-cream rounded-2xl px-4 py-2.5 block cursor-pointer border border-transparent focus-within:border-sage-dark">
            <span className="block text-xs text-wood font-semibold mb-0.5">Jumlah Kamar</span>
            <input
              type="number"
              min={1}
              max={20}
              value={Number.isNaN(roomCount) ? '' : roomCount}
              onChange={(e) => setRoomCount(parseInt(e.target.value, 10))}
              className="w-full bg-transparent text-ink text-sm font-medium focus:outline-none"
            />
          </label>

          <div className="flex items-stretch gap-2">
            <button
              type="submit"
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-sage-dark hover:bg-wood text-white font-semibold rounded-2xl px-6 py-3 transition text-sm"
            >
              <Search size={17} /> Cek Ketersediaan
            </button>
            {isSearchMode && (
              <button
                type="button"
                onClick={handleResetDates}
                title="Reset pencarian tanggal"
                className="flex items-center justify-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-2xl px-4 py-3 transition text-sm"
              >
                <X size={16} /> Reset
              </button>
            )}
          </div>
        </form>

        {formError && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-xs font-medium bg-red-50 px-3.5 py-2.5 rounded-xl">
            <AlertCircle size={15} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}
      </div>

      {/* Filter & Sort Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        {/* Facility Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 mr-1">
            <SlidersHorizontal size={14} /> Filter Fasilitas:
          </span>
          {facilities.map((fac) => {
            const active = selectedFacilities.includes(String(fac.id));
            return (
              <button
                key={fac.id}
                type="button"
                onClick={() => toggleFacility(String(fac.id))}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                  active
                    ? 'bg-sage-dark text-white border-sage-dark shadow-sm'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-sage-dark/50'
                }`}
              >
                {active ? <Check size={12} /> : getFacilityIcon(fac.icon, 13)}
                <span>{fac.name}</span>
              </button>
            );
          })}
          {selectedFacilities.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFacilities([])}
              className="text-xs text-red-600 hover:underline font-medium ml-1"
            >
              Hapus filter ({selectedFacilities.length})
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
          <label htmlFor="sort-rooms" className="text-xs font-semibold text-stone-500">
            Urutkan:
          </label>
          <select
            id="sort-rooms"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-sage-dark"
          >
            <option value="default">Rekomendasi</option>
            <option value="price_asc">Harga: Termurah ke Termahal</option>
            <option value="price_desc">Harga: Termahal ke Termurah</option>
            <option value="capacity_desc">Kapasitas Terbesar</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-stone-100">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sage-dark mx-auto mb-3" />
          <p className="text-sm text-stone-500 font-medium">
            {isSearchMode ? 'Memeriksa ketersediaan kamar...' : 'Memuat daftar kamar...'}
          </p>
        </div>
      ) : apiError ? (
        <div className="py-16 px-6 text-center bg-white rounded-3xl border border-red-100">
          <AlertCircle size={40} className="mx-auto mb-3 text-red-500" />
          <h2 className="text-lg font-semibold text-ink mb-1">Gagal Memuat Data</h2>
          <p className="text-sm text-stone-600 mb-5 max-w-md mx-auto">{apiError}</p>
          <button
            onClick={fetchRooms}
            className="inline-flex items-center gap-2 bg-sage-dark hover:bg-wood text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
          >
            <RefreshCw size={15} /> Muat Ulang
          </button>
        </div>
      ) : filteredAndSortedRooms.length === 0 ? (
        <div className="py-16 px-6 text-center bg-white rounded-3xl border border-stone-200/70">
          <div className="w-16 h-16 rounded-full bg-sage/15 text-sage-dark flex items-center justify-center mx-auto mb-4">
            <BedDouble size={30} />
          </div>
          <h2 className="font-serif text-2xl font-bold text-wood mb-2">
            Kamar Tidak Tersedia
          </h2>
          <p className="text-sm text-ink/70 max-w-md mx-auto mb-6">
            {isSearchMode
              ? 'Maaf, tidak ada kamar yang tersedia untuk rentang tanggal atau jumlah tamu yang Anda pilih. Silakan coba tanggal lain.'
              : 'Tidak ada kamar yang sesuai dengan filter fasilitas yang dipilih.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {selectedFacilities.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedFacilities([])}
                className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-semibold px-5 py-2.5 rounded-xl transition"
              >
                Reset Filter Fasilitas
              </button>
            )}
            {isSearchMode && (
              <button
                type="button"
                onClick={handleResetDates}
                className="bg-sage-dark hover:bg-wood text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
              >
                Lihat Semua Katalog Kamar
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedRooms.map((room, idx) => {
            const roomImage = room.primaryImage || `/images/room-${(idx % 3) + 1}.jpg`;
            const detailUrl = buildDetailUrl(room.id);

            return (
              <div
                key={room.id}
                className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-stone-100 transition flex flex-col"
              >
                {/* Room Image */}
                <Link to={detailUrl} className="relative aspect-[4/3] overflow-hidden bg-sage/20 block">
                  <img
                    src={roomImage}
                    alt={room.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-ink flex items-center gap-1 shadow-sm">
                    <Users size={13} className="text-sage-dark" /> Maks. {room.capacity} Tamu
                  </div>
                  {isSearchMode && (
                    <div className="absolute bottom-3 left-3 bg-sage-dark/95 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm">
                      <Calendar size={12} /> Tersedia
                    </div>
                  )}
                </Link>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col">
                  <Link to={detailUrl}>
                    <h3 className="font-serif text-xl font-bold text-ink group-hover:text-wood transition">
                      {room.name}
                    </h3>
                  </Link>

                  {/* Stock badge */}
                  <div className="mt-2">
                    <RoomStockBadge room={room} />
                  </div>

                  {room.description && (
                    <p className="text-xs text-ink/70 mt-1.5 line-clamp-2">
                      {room.description}
                    </p>
                  )}

                  {/* Facilities Preview */}
                  {room.facilities && room.facilities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {room.facilities.slice(0, 5).map((f) => (
                        <span
                          key={f.id}
                          className="inline-flex items-center gap-1 bg-cream text-ink/80 text-[11px] font-medium px-2.5 py-1 rounded-lg"
                        >
                          <span className="text-sage-dark">{getFacilityIcon(f.icon, 12)}</span>
                          {f.name}
                        </span>
                      ))}
                      {room.facilities.length > 5 && (
                        <span className="inline-flex items-center bg-stone-100 text-stone-600 text-[11px] font-medium px-2 py-1 rounded-lg">
                          +{room.facilities.length - 5} lainnya
                        </span>
                      )}
                    </div>
                  )}

                  {/* Spacer */}
                  <div className="mt-auto pt-5">
                    {/* Total price banner when searching by dates (BR-05) */}
                    {room.nights && room.totalPrice ? (
                      <div className="bg-sage/15 rounded-2xl p-3 mb-4 flex items-center justify-between">
                        <div>
                          <span className="block text-[11px] text-ink/70 font-medium">
                            Total {room.nights} malam{room.roomCount && room.roomCount > 1 ? ` • ${room.roomCount} kamar` : ''}
                          </span>
                          <span className="text-base font-bold text-wood">
                            {formatRupiah(room.totalPrice)}
                          </span>
                        </div>
                        <span className="text-[11px] text-ink/60">
                          {formatRupiah(room.pricePerNight)} / malam
                        </span>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <span className="text-xl font-bold text-wood">
                          {formatRupiah(room.pricePerNight)}
                        </span>
                        <span className="text-xs text-ink/60"> / malam</span>
                      </div>
                    )}

                    <Link
                      to={detailUrl}
                      className="w-full inline-flex items-center justify-center gap-2 bg-wood hover:bg-sage-dark text-white text-sm font-semibold py-3 px-4 rounded-2xl transition"
                    >
                      <span>{isSearchMode ? 'Pilih & Pesan Kamar' : 'Lihat Detail & Kalender'}</span>
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GuestLayout>
  );
};

export default Rooms;
