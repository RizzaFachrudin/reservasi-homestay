import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, Sparkles, ArrowRight, PlusCircle, CheckCircle2 } from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import { roomService, Room } from '../../services/room.service';
import { facilityService, Facility } from '../../services/facility.service';

const Dashboard: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsData, facilitiesData] = await Promise.all([
          roomService.getAdminRooms(),
          facilityService.getAllFacilities(),
        ]);
        setRooms(roomsData);
        setFacilities(facilitiesData);
      } catch (err) {
        console.error('Gagal mengambil data dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const availableRoomsCount = rooms.filter((r) => r.status === 'Available').length;
  const maintenanceRoomsCount = rooms.filter((r) => r.status === 'Maintenance').length;

  return (
    <AdminLayout title="Dashboard" subtitle="Ringkasan dan manajemen homestay">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-sage/20 via-cream to-wood/10 rounded-3xl p-6 sm:p-8 border border-sage/20 mb-8">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-wood mb-2">
          Selamat Datang di Admin Panel Homestay Kita
        </h2>
        <p className="text-stone-600 text-sm max-w-2xl leading-relaxed">
          Kelola master data kamar, fasilitas, dan pantau ketersediaan penginapan Anda dengan mudah melalui dasbor ini.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Total Kamar
            </span>
            <div className="w-10 h-10 rounded-xl bg-sage/10 text-sage-dark flex items-center justify-center">
              <BedDouble size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-stone-900">{loading ? '...' : rooms.length}</p>
          <p className="text-xs text-stone-500 mt-1">
            {availableRoomsCount} aktif, {maintenanceRoomsCount} perbaikan
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Master Fasilitas
            </span>
            <div className="w-10 h-10 rounded-xl bg-wood/10 text-wood flex items-center justify-center">
              <Sparkles size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-stone-900">{loading ? '...' : facilities.length}</p>
          <p className="text-xs text-stone-500 mt-1">Fasilitas terdaftar di sistem</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Kamar Siap Huni
            </span>
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-stone-900">{loading ? '...' : availableRoomsCount}</p>
          <p className="text-xs text-green-600 mt-1">Tersedia untuk reservasi publik</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Aksi Cepat
            </span>
            <p className="text-xs text-stone-600 mt-1">Tambah kamar atau fasilitas baru</p>
          </div>
          <div className="flex gap-2 mt-4">
            <Link
              to="/admin/rooms"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-sage-dark text-white rounded-xl text-xs font-medium hover:bg-wood transition"
            >
              <PlusCircle size={14} /> Kamar
            </Link>
            <Link
              to="/admin/facilities"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-stone-100 text-stone-700 rounded-xl text-xs font-medium hover:bg-stone-200 transition"
            >
              <PlusCircle size={14} /> Fasilitas
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Rooms */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-serif text-lg font-bold text-stone-900">Daftar Kamar Terbaru</h3>
            <Link
              to="/admin/rooms"
              className="text-xs font-semibold text-sage-dark hover:text-wood flex items-center gap-1 transition"
            >
              Lihat Semua <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <p className="text-xs text-stone-400 py-4 text-center">Memuat data kamar...</p>
          ) : rooms.length === 0 ? (
            <p className="text-xs text-stone-400 py-4 text-center">Belum ada kamar yang dibuat.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {rooms.slice(0, 4).map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{r.name}</p>
                    <p className="text-xs text-stone-500">
                      Rp {r.pricePerNight.toLocaleString('id-ID')} / malam • Kapasitas {r.capacity} orang
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      r.status === 'Available'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {r.status === 'Available' ? 'Tersedia' : 'Perbaikan'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Facilities Preview */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-serif text-lg font-bold text-stone-900">Fasilitas Homestay</h3>
            <Link
              to="/admin/facilities"
              className="text-xs font-semibold text-sage-dark hover:text-wood flex items-center gap-1 transition"
            >
              Kelola Fasilitas <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <p className="text-xs text-stone-400 py-4 text-center">Memuat fasilitas...</p>
          ) : facilities.length === 0 ? (
            <p className="text-xs text-stone-400 py-4 text-center">Belum ada fasilitas.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {facilities.map((f) => (
                <div
                  key={f.id}
                  className="p-3 bg-stone-50 rounded-2xl border border-stone-100 flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-sage-dark" />
                  <span className="text-xs font-medium text-stone-700 truncate">{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
