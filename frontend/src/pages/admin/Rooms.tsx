import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble,
  Plus,
  Pencil,
  Trash2,
  Images,
  AlertCircle,
  CheckCircle2,
  X,
  Users,
  Layers,
  Wrench,
} from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import { roomService, Room } from '../../services/room.service';
import { facilityService, Facility } from '../../services/facility.service';
import { getFacilityIcon } from './Facilities';

const Rooms: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Available' | 'Maintenance'>('All');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState<number | string>(350000);
  const [formCapacity, setFormCapacity] = useState<number | string>(2);
  const [formStatus, setFormStatus] = useState<'Available' | 'Maintenance'>('Available');
  const [formFacilityIds, setFormFacilityIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete State (BR-12)
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Unit management state (multi-unit stock per room type)
  const [formTotalUnits, setFormTotalUnits] = useState<number | string>(1);
  const [managingRoomId, setManagingRoomId] = useState<string | null>(null);
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [unitBusyId, setUnitBusyId] = useState<string | null>(null);
  const [unitError, setUnitError] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingUnitNumber, setEditingUnitNumber] = useState('');

  const managingRoom = rooms.find((r) => r.id === managingRoomId) || null;

  const applyUpdatedRoom = (updated: Room) => {
    setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const openUnitsModal = (room: Room) => {
    setManagingRoomId(room.id);
    setNewUnitNumber('');
    setUnitError('');
    setEditingUnitId(null);
  };

  const handleAddUnit = async () => {
    if (!managingRoom || !newUnitNumber.trim()) return;
    setUnitBusyId('new');
    setUnitError('');
    try {
      applyUpdatedRoom(await roomService.addUnit(managingRoom.id, newUnitNumber.trim()));
      setNewUnitNumber('');
    } catch (err: any) {
      setUnitError(err?.response?.data?.message || err?.message || 'Gagal menambah unit.');
    } finally {
      setUnitBusyId(null);
    }
  };

  const handleToggleUnitStatus = async (unit: NonNullable<Room['units']>[number]) => {
    if (!managingRoom) return;
    setUnitBusyId(unit.id);
    setUnitError('');
    try {
      applyUpdatedRoom(
        await roomService.updateUnit(managingRoom.id, unit.id, {
          status: unit.status === 'Available' ? 'Maintenance' : 'Available',
        })
      );
    } catch (err: any) {
      setUnitError(err?.response?.data?.message || err?.message || 'Gagal mengubah status unit.');
    } finally {
      setUnitBusyId(null);
    }
  };

  const handleRenameUnit = async (unitId: string) => {
    if (!managingRoom || !editingUnitNumber.trim()) return;
    setUnitBusyId(unitId);
    setUnitError('');
    try {
      applyUpdatedRoom(
        await roomService.updateUnit(managingRoom.id, unitId, { unitNumber: editingUnitNumber.trim() })
      );
      setEditingUnitId(null);
    } catch (err: any) {
      setUnitError(err?.response?.data?.message || err?.message || 'Gagal mengubah nomor unit.');
    } finally {
      setUnitBusyId(null);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!managingRoom) return;
    setUnitBusyId(unitId);
    setUnitError('');
    try {
      applyUpdatedRoom(await roomService.deleteUnit(managingRoom.id, unitId));
    } catch (err: any) {
      setUnitError(err?.response?.data?.message || err?.message || 'Gagal menghapus unit.');
    } finally {
      setUnitBusyId(null);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsData, facilitiesData] = await Promise.all([
        roomService.getAdminRooms(),
        facilityService.getAllFacilities(),
      ]);
      setRooms(roomsData);
      setFacilities(facilitiesData);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data kamar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingRoom(null);
    setFormName('');
    setFormDesc('');
    setFormPrice(350000);
    setFormCapacity(2);
    setFormStatus('Available');
    setFormFacilityIds([]);
    setFormTotalUnits(1);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setFormName(room.name);
    setFormDesc(room.description || '');
    setFormPrice(room.pricePerNight);
    setFormCapacity(room.capacity);
    setFormStatus(room.status);
    setFormFacilityIds(room.facilities.map((f) => f.id));
    setFormError('');
    setIsModalOpen(true);
  };

  const toggleFacility = (facilityId: string) => {
    if (formFacilityIds.includes(facilityId)) {
      setFormFacilityIds(formFacilityIds.filter((id) => id !== facilityId));
    } else {
      setFormFacilityIds([...formFacilityIds, facilityId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    const price = Number(formPrice);
    const capacity = Number(formCapacity);

    if (isNaN(price) || price <= 0) {
      setFormError('Harga per malam harus berupa angka positif.');
      setIsSubmitting(false);
      return;
    }

    if (isNaN(capacity) || capacity < 1) {
      setFormError('Kapasitas minimal 1 orang.');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: any = {
        name: formName.trim(),
        description: formDesc.trim() || null,
        pricePerNight: price,
        capacity,
        status: formStatus,
        facilityIds: formFacilityIds,
      };

      if (editingRoom) {
        await roomService.updateRoom(editingRoom.id, payload);
        setSuccessMsg(`Tipe kamar "${formName}" berhasil diperbarui.`);
      } else {
        const totalUnits = Number(formTotalUnits);
        if (isNaN(totalUnits) || totalUnits < 1 || totalUnits > 100) {
          setFormError('Jumlah kamar harus antara 1 sampai 100.');
          setIsSubmitting(false);
          return;
        }
        payload.totalUnits = totalUnits;
        await roomService.createRoom(payload);
        setSuccessMsg(`Tipe kamar "${formName}" berhasil dibuat dengan ${totalUnits} unit kamar.`);
      }

      setIsModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message || err?.message || 'Terjadi kesalahan saat menyimpan kamar.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRoom) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      await roomService.deleteRoom(deletingRoom.id);
      setSuccessMsg(`Kamar "${deletingRoom.name}" berhasil dihapus.`);
      setDeletingRoom(null);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Gagal menghapus kamar.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    if (filterStatus === 'All') return true;
    return r.status === filterStatus;
  });

  return (
    <AdminLayout title="Kelola Kamar" subtitle="Master data kamar, harga, dan fasilitas">
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

      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-2xl">
          <button
            onClick={() => setFilterStatus('All')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'All'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Semua ({rooms.length})
          </button>
          <button
            onClick={() => setFilterStatus('Available')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'Available'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Tersedia ({rooms.filter((r) => r.status === 'Available').length})
          </button>
          <button
            onClick={() => setFilterStatus('Maintenance')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'Maintenance'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Perbaikan ({rooms.filter((r) => r.status === 'Maintenance').length})
          </button>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-sage-dark hover:bg-wood text-white font-medium text-sm rounded-xl transition shadow-sm"
        >
          <Plus size={16} /> Tambah Kamar
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-stone-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-dark mx-auto mb-3" />
            <p className="text-sm">Memuat data kamar...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="py-16 text-center text-stone-400">
            <BedDouble size={36} className="mx-auto mb-2 text-stone-300" />
            <p className="text-sm font-medium text-stone-600">Tidak ada data kamar</p>
            <p className="text-xs text-stone-400 mt-1">
              {filterStatus !== 'All'
                ? 'Coba ubah filter status di atas.'
                : 'Klik tombol "Tambah Kamar" untuk menambahkan kamar baru.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-50 border-b border-stone-100 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-24">Foto</th>
                  <th className="px-6 py-4">Nama Kamar</th>
                  <th className="px-6 py-4">Kapasitas</th>
                  <th className="px-6 py-4">Unit Kamar</th>
                  <th className="px-6 py-4">Harga / Malam</th>
                  <th className="px-6 py-4">Fasilitas</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-stone-50/70 transition">
                    <td className="px-6 py-4">
                      <div className="w-16 h-12 rounded-xl bg-stone-100 overflow-hidden border border-stone-200 flex items-center justify-center">
                        {room.primaryImage ? (
                          <img
                            src={room.primaryImage}
                            alt={room.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BedDouble size={20} className="text-stone-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-stone-900">{room.name}</p>
                      {room.description && (
                        <p className="text-xs text-stone-400 line-clamp-1 max-w-xs mt-0.5">
                          {room.description}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-stone-700 font-medium bg-stone-100 px-2.5 py-1 rounded-lg">
                        <Users size={14} /> {room.capacity} orang
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-stone-900">
                        {room.totalUnits ?? 0} Unit Total
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5 whitespace-nowrap">
                        <span className="text-green-700 font-semibold">{room.activeUnits ?? 0} Available</span>
                        {' • '}
                        <span className="text-amber-700 font-semibold">{room.maintenanceUnits ?? 0} Maintenance</span>
                      </p>
                    </td>
                    <td className="px-6 py-4 font-bold text-stone-900">
                      Rp {room.pricePerNight.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {room.facilities.length > 0 ? (
                          room.facilities.map((f) => (
                            <span
                              key={f.id}
                              className="text-[11px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md"
                            >
                              {f.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-stone-400 italic">Tidak ada</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          room.status === 'Available'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {room.status === 'Available' ? 'Tersedia' : 'Perbaikan'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => openUnitsModal(room)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sage-dark bg-sage-dark/10 hover:bg-sage-dark/20 rounded-lg transition"
                        title="Kelola Unit Kamar"
                      >
                        <Layers size={14} /> Kelola Unit
                      </button>                      <Link
                        to={`/admin/rooms/${room.id}/gallery`}
                        className="inline-flex items-center p-2 text-stone-500 hover:text-sage-dark hover:bg-stone-100 rounded-lg transition"
                        title="Kelola Galeri Foto"
                      >
                        <Images size={16} />
                      </Link>
                      <button
                        onClick={() => openEditModal(room)}
                        className="p-2 text-stone-500 hover:text-wood hover:bg-stone-100 rounded-lg transition"
                        title="Edit Kamar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingRoom(room);
                          setDeleteError('');
                        }}
                        className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Hapus Kamar"
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
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-6">
              <h3 className="font-serif text-xl font-bold text-stone-900">
                {editingRoom ? 'Ubah Kamar' : 'Tambah Kamar Baru'}
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

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                  Nama Kamar *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Misal: Kamar Suite Garden View"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                  Deskripsi
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  placeholder="Ceritakan keistimewaan kamar ini..."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-sage resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                    Harga / Malam (Rp) *
                  </label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    min={1000}
                    step={1000}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                    Kapasitas Tamu *
                  </label>
                  <input
                    type="number"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    min={1}
                    max={20}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                  />
                </div>
              </div>

              {!editingRoom && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                    Jumlah Unit Kamar *
                  </label>
                  <input
                    type="number"
                    value={formTotalUnits}
                    onChange={(e) => setFormTotalUnits(e.target.value)}
                    min={1}
                    max={100}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                  />
                  <p className="text-[11px] text-stone-400 mt-1.5">
                    Unit kamar dibuat otomatis (contoh: 101, 102, dst.). Nomor dan status tiap unit bisa diubah lewat tombol "Kelola Unit".
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                  Status Tipe Kamar
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormStatus('Available')}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-semibold transition ${
                      formStatus === 'Available'
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    Tersedia (Available)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('Maintenance')}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-semibold transition ${
                      formStatus === 'Maintenance'
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    Perbaikan (Maintenance)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                  Fasilitas Kamar
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-stone-100 rounded-xl">
                  {facilities.map((f) => {
                    const isChecked = formFacilityIds.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFacility(f.id)}
                        className={`p-2.5 rounded-xl text-left border flex items-center gap-2 transition text-xs ${
                          isChecked
                            ? 'bg-sage-dark/10 border-sage-dark text-sage-dark font-semibold'
                            : 'bg-stone-50 border-transparent text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <div className="flex-shrink-0">{getFacilityIcon(f.icon)}</div>
                        <span className="truncate">{f.name}</span>
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
                  {isSubmitting ? 'Menyimpan...' : editingRoom ? 'Simpan Perubahan' : 'Buat Kamar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Units Modal */}
      {managingRoom && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-stone-100 mb-5">
              <div>
                <h3 className="font-serif text-xl font-bold text-stone-900">Kelola Unit Kamar</h3>
                <p className="text-xs text-stone-500 mt-1">
                  {managingRoom.name} • {managingRoom.totalUnits ?? 0} unit ({managingRoom.activeUnits ?? 0} Available,{' '}
                  {managingRoom.maintenanceUnits ?? 0} Maintenance)
                </p>
              </div>
              <button
                onClick={() => setManagingRoomId(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {unitError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{unitError}</span>
              </div>
            )}

            <div className="space-y-2">
              {(managingRoom.units || []).map((unit) => {
                const busy = unitBusyId === unit.id;
                const isAvailable = unit.status === 'Available';
                return (
                  <div
                    key={unit.id}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-stone-100 bg-stone-50/60"
                  >
                    <div className="flex-1 min-w-0">
                      {editingUnitId === unit.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingUnitNumber}
                            onChange={(e) => setEditingUnitNumber(e.target.value)}
                            maxLength={30}
                            className="w-full px-3 py-1.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                          />
                          <button
                            disabled={busy}
                            onClick={() => handleRenameUnit(unit.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-sage-dark text-white rounded-lg disabled:opacity-50"
                          >
                            Simpan
                          </button>
                          <button
                            onClick={() => setEditingUnitId(null)}
                            className="px-2 py-1.5 text-xs text-stone-500 hover:bg-stone-100 rounded-lg"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono text-sm font-bold text-stone-900">{unit.unitNumber}</span>
                      )}
                    </div>

                    <button
                      disabled={busy}
                      onClick={() => handleToggleUnitStatus(unit)}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full transition disabled:opacity-50 ${
                        isAvailable
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                      title="Klik untuk mengubah status"
                    >
                      {isAvailable ? <CheckCircle2 size={13} /> : <Wrench size={13} />}
                      {isAvailable ? 'Available' : 'Maintenance'}
                    </button>

                    <button
                      onClick={() => {
                        setEditingUnitId(unit.id);
                        setEditingUnitNumber(unit.unitNumber);
                      }}
                      className="p-1.5 text-stone-400 hover:text-wood hover:bg-stone-100 rounded-lg"
                      title="Ubah nomor unit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => handleDeleteUnit(unit.id)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      title="Hapus unit"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
              {(managingRoom.units || []).length === 0 && (
                <p className="text-xs text-stone-400 text-center py-4">Belum ada unit untuk tipe kamar ini.</p>
              )}
            </div>

            <div className="mt-5 pt-5 border-t border-stone-100">
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                Tambah Unit Baru
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newUnitNumber}
                  onChange={(e) => setNewUnitNumber(e.target.value)}
                  maxLength={30}
                  placeholder="Contoh: 303"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
                />
                <button
                  disabled={unitBusyId === 'new' || !newUnitNumber.trim()}
                  onClick={handleAddUnit}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-sage-dark hover:bg-wood text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
                >
                  <Plus size={15} /> Tambah
                </button>
              </div>
              <p className="text-[11px] text-stone-400 mt-2">
                Unit yang pernah dipakai reservasi tidak dapat dihapus; ubah statusnya menjadi Maintenance agar tidak bisa dipesan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (BR-12 Soft Delete) */}
      {deletingRoom && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-2">Hapus Kamar?</h3>
            <p className="text-xs text-stone-500 mb-4 leading-relaxed">
              Kamar <span className="font-semibold text-stone-800">"{deletingRoom.name}"</span> akan dihapus dari katalog pencarian publik dan daftar admin. Riwayat reservasi lampau akan tetap terjaga (Soft Delete).
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 text-left">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingRoom(null)}
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

export default Rooms;
