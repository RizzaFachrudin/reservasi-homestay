import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, CalendarCheck, CreditCard, KeyRound,
  Users, ArrowRight, Star, BedDouble,
} from 'lucide-react';
import GuestLayout from '../../layouts/GuestLayout';
import { roomService, Room } from '../../services/room.service';
import { facilityService, Facility } from '../../services/facility.service';
import { getFacilityIcon } from '../admin/Facilities';

const steps = [
  { icon: Search, title: 'Cari Kamar', desc: 'Pilih tanggal dan jumlah tamu, lihat kamar yang tersedia.' },
  { icon: CalendarCheck, title: 'Pesan', desc: 'Pilih kamar favorit lalu konfirmasi pemesanan Anda.' },
  { icon: CreditCard, title: 'Bayar Online', desc: 'Bayar aman lewat payment gateway, status otomatis.' },
  { icon: KeyRound, title: 'Check-in', desc: 'Tunjukkan kode reservasi saat tiba di lokasi.' },
];

const gallery = [
  '/images/gallery-1.jpg',
  '/images/gallery-2.jpg',
  '/images/gallery-3.jpg',
  '/images/gallery-4.jpg',
];

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const Home: React.FC = () => {
  const navigate = useNavigate();

  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [error, setError] = useState('');

  // Dynamic API state
  const [featuredRooms, setFeaturedRooms] = useState<Room[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [rooms, facs] = await Promise.all([
          roomService.getPublicRooms(true),
          facilityService.getPublicFacilities(),
        ]);
        setFeaturedRooms(rooms);
        setFacilities(facs);
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadHomeData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!checkInDate || !checkOutDate) {
      setError('Tanggal check-in dan check-out harus diisi');
      return;
    }
    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      setError('Tanggal check-out harus setelah check-in');
      return;
    }
    if (!guestCount || guestCount < 1) {
      setError('Jumlah tamu minimal 1 orang');
      return;
    }

    const params = new URLSearchParams({
      check_in: checkInDate,
      check_out: checkOutDate,
      guests: guestCount.toString(),
    });
    navigate(`/rooms?${params.toString()}`);
  };

  const inputClass =
    'w-full bg-transparent text-ink text-sm font-medium focus:outline-none';

  return (
    <GuestLayout fullWidth>
      {/* Hero */}
      <section className="relative">
        <div
          className="h-[560px] md:h-[640px] bg-cover bg-center bg-wood"
          style={{ backgroundImage: "url('/images/hero.jpg')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/30 to-ink/70" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center pb-24">
            <span className="inline-flex items-center gap-1 self-start bg-white/15 backdrop-blur text-white text-xs font-medium px-3 py-1 rounded-full mb-5">
              <Star size={14} className="text-yellow-300" /> Penginapan hangat bernuansa lokal
            </span>
            <h1 className="font-serif text-4xl md:text-6xl font-bold text-white max-w-2xl leading-tight">
              Menginap nyaman, seperti pulang ke rumah
            </h1>
            <p className="mt-4 text-white/85 max-w-xl md:text-lg">
              Temukan kamar terbaik di homestay kami, pesan dalam hitungan menit, dan nikmati suasana asri yang menenangkan.
            </p>
          </div>
        </div>

        {/* Floating search card */}
        <div className="relative max-w-5xl mx-auto px-4 -mt-16 md:-mt-14 z-10">
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-3xl shadow-xl p-4 md:p-5 grid grid-cols-1 md:grid-cols-[1fr_1fr_0.7fr_auto] gap-3 items-stretch"
          >
            <label className="bg-cream rounded-2xl px-4 py-3 block cursor-pointer">
              <span className="block text-xs text-wood font-semibold mb-1">Check-in</span>
              <input type="date" value={checkInDate} min={today} required
                onChange={(e) => setCheckInDate(e.target.value)} className={inputClass} />
            </label>
            <label className="bg-cream rounded-2xl px-4 py-3 block cursor-pointer">
              <span className="block text-xs text-wood font-semibold mb-1">Check-out</span>
              <input type="date" value={checkOutDate} min={checkInDate || today} required
                onChange={(e) => setCheckOutDate(e.target.value)} className={inputClass} />
            </label>
            <label className="bg-cream rounded-2xl px-4 py-3 block cursor-pointer">
              <span className="block text-xs text-wood font-semibold mb-1">Jumlah Tamu</span>
              <input type="number" value={Number.isNaN(guestCount) ? '' : guestCount} min={1} max={10} required
                onChange={(e) => setGuestCount(parseInt(e.target.value))} className={inputClass} />
            </label>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-sage-dark hover:bg-wood text-white font-semibold rounded-2xl px-8 py-4 transition"
            >
              <Search size={18} /> Cari
            </button>
            {error && (
              <p className="md:col-span-4 text-sm text-red-600 px-2">{error}</p>
            )}
          </form>
        </div>
      </section>

      {/* Kamar unggulan */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sage-dark text-sm font-semibold uppercase tracking-wider">Pilihan kami</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-wood mt-1">Kamar Unggulan</h2>
          </div>
          <Link to="/rooms" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-wood hover:text-sage-dark transition">
            Lihat semua <ArrowRight size={16} />
          </Link>
        </div>

        {loadingData ? (
          <div className="py-12 text-center text-stone-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-dark mx-auto mb-2" />
            <p className="text-xs">Memuat kamar unggulan...</p>
          </div>
        ) : featuredRooms.length === 0 ? (
          <div className="py-12 text-center text-stone-400 bg-white rounded-3xl border border-stone-100">
            <BedDouble size={36} className="mx-auto mb-2 text-stone-300" />
            <p className="text-sm font-medium text-stone-600">Belum ada kamar unggulan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredRooms.map((room, idx) => {
              // Fallback image if room has no uploaded images yet
              const roomImage = room.primaryImage || `/images/room-${(idx % 3) + 1}.jpg`;
              return (
                <Link
                  key={room.id}
                  to="/rooms"
                  className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-sage/20">
                    <img
                      src={roomImage}
                      alt={room.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif text-xl font-semibold text-ink">{room.name}</h3>
                    <p className="flex items-center gap-1 text-sm text-ink/60 mt-1">
                      <Users size={15} /> Maks. {room.capacity} tamu
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <p>
                        <span className="text-lg font-bold text-wood">{formatRupiah(room.pricePerNight)}</span>
                        <span className="text-xs text-ink/60"> / malam</span>
                      </p>
                      <span className="text-sm font-semibold text-sage-dark group-hover:underline">Detail</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Fasilitas */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="text-center mb-8">
          <p className="text-sage-dark text-sm font-semibold uppercase tracking-wider">Kenyamanan</p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-wood mt-1">Fasilitas Lengkap</h2>
        </div>
        {loadingData ? (
          <div className="py-8 text-center text-stone-400">
            <p className="text-xs">Memuat fasilitas...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {facilities.map((f) => (
              <div key={f.id} className="bg-white rounded-2xl p-5 text-center shadow-sm">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-sage/20 flex items-center justify-center text-sage-dark">
                  {getFacilityIcon(f.icon)}
                </div>
                <p className="text-sm font-medium text-ink truncate">{f.name}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cara memesan */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="bg-wood rounded-[2rem] px-6 md:px-12 py-12 text-white">
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl md:text-4xl font-bold">Cara Memesan</h2>
            <p className="text-white/75 mt-2">Empat langkah mudah tanpa ribet</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                  <Icon size={26} />
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-sage text-ink text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-sm text-white/75 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Galeri */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-8">
          <p className="text-sage-dark text-sm font-semibold uppercase tracking-wider">Galeri</p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-wood mt-1">Suasana Homestay</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {gallery.map((src, i) => (
            <div
              key={src}
              className={`overflow-hidden rounded-2xl bg-sage/20 ${i === 0 ? 'md:row-span-2' : ''} aspect-square md:aspect-auto md:h-full min-h-[180px]`}
            >
              <img src={src} alt={`Suasana homestay ${i + 1}`} loading="lazy"
                className="w-full h-full object-cover hover:scale-105 transition duration-500" />
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link
            to="/rooms"
            className="inline-flex items-center gap-2 bg-sage-dark hover:bg-wood text-white font-semibold px-8 py-4 rounded-full transition shadow-md"
          >
            Pesan Kamar Sekarang <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </GuestLayout>
  );
};

export default Home;
