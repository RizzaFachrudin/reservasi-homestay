import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Wifi,
  Wind,
  Tv,
  Bath,
  Coffee,
  Car,
  Waves,
  Droplets,
  Utensils,
  Snowflake,
  Refrigerator,
} from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import { facilityService, Facility } from '../../services/facility.service';

const POPULAR_ICONS = [
  { name: 'wifi', label: 'WiFi', icon: Wifi },
  { name: 'snowflake', label: 'AC / Pendingin', icon: Snowflake },
  { name: 'wind', label: 'Ventilasi / Kipas', icon: Wind },
  { name: 'tv', label: 'Televisi', icon: Tv },
  { name: 'bath', label: 'Kamar Mandi', icon: Bath },
  { name: 'coffee', label: 'Sarapan / Kopi', icon: Coffee },
  { name: 'car', label: 'Tempat Parkir', icon: Car },
  { name: 'waves', label: 'Kolam Renang', icon: Waves },
  { name: 'droplets', label: 'Air Panas', icon: Droplets },
  { name: 'utensils', label: 'Dapur / Makanan', icon: Utensils },
  { name: 'refrigerator', label: 'Kulkas', icon: Refrigerator },
  { name: 'sparkles', label: 'Fasilitas Lain', icon: Sparkles },
];

export const getFacilityIcon = (iconName?: string | null, size: number = 18) => {
  const found = POPULAR_ICONS.find((i) => i.name.toLowerCase() === iconName?.toLowerCase());
  if (found) {
    const IconComp = found.icon;
    return <IconComp size={size} />;
  }
  return <Sparkles size={size} />;
};

const Facilities: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('wifi');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete State
  const [deletingFacility, setDeletingFacility] = useState<Facility | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const data = await facilityService.getAllFacilities();
      setFacilities(data);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data fasilitas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  const openCreateModal = () => {
    setEditingFacility(null);
    setFormName('');
    setFormIcon('wifi');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (f: Facility) => {
    setEditingFacility(f);
    setFormName(f.name);
    setFormIcon(f.icon || 'sparkles');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (editingFacility) {
        await facilityService.updateFacility(editingFacility.id, {
          name: formName.trim(),
          icon: formIcon,
        });
        setSuccessMsg(`Fasilitas "${formName}" berhasil diperbarui.`);
      } else {
        await facilityService.createFacility({
          name: formName.trim(),
          icon: formIcon,
        });
        setSuccessMsg(`Fasilitas "${formName}" berhasil ditambahkan.`);
      }
      setIsModalOpen(false);
      fetchFacilities();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message || err?.message || 'Terjadi kesalahan saat menyimpan data.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFacility) return;
    setIsDeleting(true);

    try {
      await facilityService.deleteFacility(deletingFacility.id);
      setSuccessMsg(`Fasilitas "${deletingFacility.name}" berhasil dihapus.`);
      setDeletingFacility(null);
      fetchFacilities();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Gagal menghapus fasilitas.'
      );
      setDeletingFacility(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminLayout title="Kelola Fasilitas" subtitle="Daftar fasilitas master homestay">
      {/* Notifications */}
      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl flex items-center gap-3 text-sm">
          <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-3 text-sm">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">Master Fasilitas</h2>
          <p className="text-xs text-stone-500">
            Total {facilities.length} fasilitas terdaftar yang dapat dikaitkan dengan kamar
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-sage-dark hover:bg-wood text-white font-medium text-sm rounded-xl transition shadow-sm"
        >
          <Plus size={16} /> Tambah Fasilitas
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-stone-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-dark mx-auto mb-3" />
            <p className="text-sm">Memuat data fasilitas...</p>
          </div>
        ) : facilities.length === 0 ? (
          <div className="py-16 text-center text-stone-400">
            <Sparkles size={36} className="mx-auto mb-2 text-stone-300" />
            <p className="text-sm font-medium text-stone-600">Belum ada fasilitas</p>
            <p className="text-xs text-stone-400 mt-1">
              Klik tombol "Tambah Fasilitas" untuk membuat fasilitas baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-50 border-b border-stone-100 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-16">Icon</th>
                  <th className="px-6 py-4">Nama Fasilitas</th>
                  <th className="px-6 py-4">Kode Icon</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {facilities.map((f) => (
                  <tr key={f.id} className="hover:bg-stone-50/70 transition">
                    <td className="px-6 py-4">
                      <div className="w-10 h-10 rounded-xl bg-sage/10 text-sage-dark flex items-center justify-center">
                        {getFacilityIcon(f.icon)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-stone-900">{f.name}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-lg">
                        {f.icon || 'default'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(f)}
                        className="p-2 text-stone-500 hover:text-wood hover:bg-stone-100 rounded-lg transition"
                        title="Edit Fasilitas"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingFacility(f)}
                        className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Hapus Fasilitas"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-6">
              <h3 className="font-serif text-xl font-bold text-stone-900">
                {editingFacility ? 'Ubah Fasilitas' : 'Tambah Fasilitas Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                  Nama Fasilitas *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Misal: WiFi 5G, Smart TV, Kolam Renang"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                  Pilih Ikon Fasilitas
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border border-stone-100 rounded-xl">
                  {POPULAR_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = formIcon === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setFormIcon(item.name)}
                        className={`p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition text-xs ${
                          isSelected
                            ? 'bg-sage-dark text-white shadow-sm'
                            : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <IconComp size={20} />
                        <span className="text-[10px] truncate max-w-full">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl text-sm font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-sage-dark hover:bg-wood text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : editingFacility ? 'Simpan Perubahan' : 'Tambah Fasilitas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingFacility && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="font-serif text-lg font-bold text-stone-900 mb-2">Hapus Fasilitas?</h3>
            <p className="text-xs text-stone-500 mb-6 leading-relaxed">
              Apakah Anda yakin ingin menghapus fasilitas <span className="font-semibold text-stone-800">"{deletingFacility.name}"</span>? Relasi fasilitas ini pada kamar yang menggunakannya akan ikut dilepas.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingFacility(null)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Facilities;
