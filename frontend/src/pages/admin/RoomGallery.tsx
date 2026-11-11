import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Star,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import { roomService, Room } from '../../services/room.service';

const RoomGallery: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRoom = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await roomService.getAdminRoomById(id);
      setRoom(data);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat galeri kamar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoom();
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length > 10) {
        setError('Maksimal 10 foto dalam sekali unggah.');
        setSelectedFiles(filesArray.slice(0, 10));
      } else {
        setSelectedFiles(filesArray);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || selectedFiles.length === 0) return;

    setError('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('images', file);
      });

      await roomService.uploadRoomImages(id, formData);
      setSuccessMsg(`Berhasil mengunggah ${selectedFiles.length} foto.`);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchRoom();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Gagal mengunggah foto kamar.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await roomService.setPrimaryImage(imageId);
      setSuccessMsg('Foto utama berhasil diperbarui.');
      fetchRoom();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Gagal mengubah foto utama.'
      );
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus foto ini?')) return;
    try {
      await roomService.deleteImage(imageId);
      setSuccessMsg('Foto berhasil dihapus.');
      fetchRoom();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Gagal menghapus foto.'
      );
    }
  };

  return (
    <AdminLayout
      title={room ? `Galeri: ${room.name}` : 'Galeri Foto Kamar'}
      subtitle="Kelola dan unggah galeri foto untuk kamar ini"
    >
      {/* Back button */}
      <div className="mb-6">
        <Link
          to="/admin/rooms"
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-stone-900 transition"
        >
          <ArrowLeft size={16} /> Kembali ke Kelola Kamar
        </Link>
      </div>

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

      {loading ? (
        <div className="py-24 text-center text-stone-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-dark mx-auto mb-3" />
          <p className="text-sm">Memuat galeri kamar...</p>
        </div>
      ) : !room ? (
        <div className="py-24 text-center text-stone-400">
          <p className="text-sm font-semibold text-stone-700">Kamar tidak ditemukan</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upload Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-stone-900 mb-1">
              Unggah Foto Baru
            </h3>
            <p className="text-xs text-stone-500 mb-6">
              Maksimal 10 foto per unggahan. Format: JPG, PNG, atau WEBP (Maks 5MB per file).
            </p>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="border-2 border-dashed border-stone-200 hover:border-sage-dark/60 rounded-2xl p-8 text-center transition cursor-pointer bg-stone-50/50">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  id="gallery-file-input"
                />
                <label htmlFor="gallery-file-input" className="cursor-pointer block">
                  <Upload size={36} className="mx-auto mb-2 text-stone-400" />
                  <p className="text-sm font-semibold text-stone-700">
                    Klik untuk memilih foto atau seret foto ke sini
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    {selectedFiles.length > 0
                      ? `${selectedFiles.length} foto dipilih`
                      : 'Pilih hingga 10 file foto kamar'}
                  </p>
                </label>
              </div>

              {selectedFiles.length > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <div className="flex flex-wrap gap-2 text-xs text-stone-600">
                    {selectedFiles.map((f, i) => (
                      <span key={i} className="px-2.5 py-1 bg-stone-100 rounded-lg">
                        {f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-sage-dark hover:bg-wood text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                  >
                    {isUploading ? 'Mengunggah...' : 'Unggah Sekarang'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Photos Grid */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900">
                  Daftar Foto ({room.images.length})
                </h3>
                <p className="text-xs text-stone-500">
                  Foto dengan tanda bintang adalah foto utama yang ditampilkan di katalog.
                </p>
              </div>
            </div>

            {room.images.length === 0 ? (
              <div className="py-16 text-center text-stone-400 border border-dashed border-stone-100 rounded-2xl">
                <ImageIcon size={40} className="mx-auto mb-2 text-stone-300" />
                <p className="text-sm font-medium text-stone-600">Belum ada foto</p>
                <p className="text-xs text-stone-400 mt-1">
                  Gunakan formulir di atas untuk mengunggah foto kamar ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {room.images.map((img) => (
                  <div
                    key={img.id}
                    className="group relative rounded-2xl overflow-hidden border border-stone-200 aspect-[4/3] bg-stone-100"
                  >
                    <img
                      src={img.imagePath}
                      alt="Kamar"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />

                    {/* Badge Foto Utama */}
                    {img.isPrimary && (
                      <div className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                        <Star size={12} fill="currentColor" /> Foto Utama
                      </div>
                    )}

                    {/* Overlay Action Buttons */}
                    <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      {!img.isPrimary && (
                        <button
                          onClick={() => handleSetPrimary(img.id)}
                          className="px-3 py-1.5 bg-white text-stone-800 rounded-xl text-xs font-semibold hover:bg-sage hover:text-white transition shadow-sm flex items-center gap-1"
                          title="Jadikan Foto Utama"
                        >
                          <Star size={13} /> Jadikan Utama
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="p-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition shadow-sm"
                        title="Hapus Foto"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default RoomGallery;
