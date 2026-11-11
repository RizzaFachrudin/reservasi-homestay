import { Request, Response } from 'express';
import { z } from 'zod';
import { RoomService } from '../services/room.service';
import { validateRequest } from '../utils/validation.util';
import { formatSuccessResponse, formatErrorResponse } from '../utils/response.util';

const roomService = new RoomService();

const createRoomSchema = z.object({
  name: z.string().min(1, 'Nama kamar wajib diisi').max(100, 'Nama kamar maksimal 100 karakter'),
  description: z.string().optional(),
  pricePerNight: z.coerce.number().positive('Harga per malam harus lebih dari 0'),
  capacity: z.coerce.number().int().min(1, 'Kapasitas minimal 1 orang'),
  status: z.enum(['Available', 'Maintenance']).optional(),
  facilityIds: z.array(z.union([z.string(), z.number()])).optional(),
});

const updateRoomSchema = z.object({
  name: z.string().min(1, 'Nama kamar wajib diisi').max(100, 'Nama kamar maksimal 100 karakter').optional(),
  description: z.string().optional().nullable(),
  pricePerNight: z.coerce.number().positive('Harga per malam harus lebih dari 0').optional(),
  capacity: z.coerce.number().int().min(1, 'Kapasitas minimal 1 orang').optional(),
  status: z.enum(['Available', 'Maintenance']).optional(),
  facilityIds: z.array(z.union([z.string(), z.number()])).optional(),
});

export class RoomController {
  // Public: Get rooms (featured / all available)
  async getPublicRooms(req: Request, res: Response): Promise<void> {
    try {
      const featured = req.query.featured === 'true';
      const rooms = await roomService.getPublicRooms(featured);
      res.status(200).json(formatSuccessResponse(rooms, 'Daftar kamar berhasil diambil'));
    } catch (error) {
      res.status(500).json(formatErrorResponse('Gagal mengambil daftar kamar'));
    }
  }

  // Public: Get room detail
  async getPublicRoomById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const room = await roomService.getPublicRoomById(id);
      res.status(200).json(formatSuccessResponse(room, 'Detail kamar berhasil diambil'));
    } catch (error) {
      if (error instanceof Error && error.message === 'ROOM_NOT_FOUND_OR_UNAVAILABLE') {
        res.status(404).json(formatErrorResponse('Kamar tidak tersedia atau tidak ditemukan'));
        return;
      }
      res.status(500).json(formatErrorResponse('Gagal mengambil detail kamar'));
    }
  }

  // Admin: Get all rooms
  async getAdminRooms(_req: Request, res: Response): Promise<void> {
    try {
      const rooms = await roomService.getAdminRooms();
      res.status(200).json(formatSuccessResponse(rooms, 'Daftar kamar admin berhasil diambil'));
    } catch (error) {
      res.status(500).json(formatErrorResponse('Gagal mengambil daftar kamar'));
    }
  }

  // Admin: Get room detail
  async getAdminRoomById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const room = await roomService.getAdminRoomById(id);
      res.status(200).json(formatSuccessResponse(room, 'Detail kamar admin berhasil diambil'));
    } catch (error) {
      if (error instanceof Error && error.message === 'ROOM_NOT_FOUND') {
        res.status(404).json(formatErrorResponse('Kamar tidak ditemukan'));
        return;
      }
      res.status(500).json(formatErrorResponse('Gagal mengambil detail kamar'));
    }
  }

  // Admin: Create room
  async create(req: Request, res: Response): Promise<void> {
    try {
      const validation = validateRequest(createRoomSchema, req.body);
      if (!validation.success) {
        res.status(422).json(formatErrorResponse('Validasi gagal', validation.errors));
        return;
      }

      const result = await roomService.createRoom(validation.data as any);
      res.status(201).json(formatSuccessResponse(result, 'Kamar berhasil dibuat'));
    } catch (error) {
      console.error('Error creating room:', error);
      res.status(500).json(formatErrorResponse('Gagal membuat kamar'));
    }
  }

  // Admin: Update room
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validation = validateRequest(updateRoomSchema, req.body);
      if (!validation.success) {
        res.status(422).json(formatErrorResponse('Validasi gagal', validation.errors));
        return;
      }

      const result = await roomService.updateRoom(id, validation.data as any);
      res.status(200).json(formatSuccessResponse(result, 'Kamar berhasil diperbarui'));
    } catch (error) {
      if (error instanceof Error && error.message === 'ROOM_NOT_FOUND') {
        res.status(404).json(formatErrorResponse('Kamar tidak ditemukan'));
        return;
      }
      res.status(500).json(formatErrorResponse('Gagal memperbarui kamar'));
    }
  }

  // Admin: Soft delete room (BR-12)
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await roomService.deleteRoom(id);
      res.status(200).json(formatSuccessResponse(null, 'Kamar berhasil dihapus'));
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'ROOM_NOT_FOUND') {
          res.status(404).json(formatErrorResponse('Kamar tidak ditemukan'));
          return;
        }
        if (error.message === 'ROOM_HAS_ACTIVE_RESERVATIONS') {
          res.status(409).json(
            formatErrorResponse('Kamar tidak dapat dihapus karena masih memiliki reservasi aktif')
          );
          return;
        }
      }
      res.status(500).json(formatErrorResponse('Gagal menghapus kamar'));
    }
  }

  // Admin: Upload multiple room images (SF-14 & BR-14)
  async uploadImages(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json(formatErrorResponse('Tidak ada file foto yang diunggah'));
        return;
      }

      const images = await roomService.addImages(id, files);
      res.status(201).json(formatSuccessResponse(images, 'Foto kamar berhasil diunggah'));
    } catch (error) {
      if (error instanceof Error && error.message === 'ROOM_NOT_FOUND') {
        res.status(404).json(formatErrorResponse('Kamar tidak ditemukan'));
        return;
      }
      res.status(500).json(formatErrorResponse('Gagal mengunggah foto kamar'));
    }
  }

  // Admin: Set image as primary (BR-14)
  async setPrimaryImage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params; // imageId
      await roomService.setPrimaryImage(id);
      res.status(200).json(formatSuccessResponse(null, 'Foto utama berhasil diperbarui'));
    } catch (error) {
      if (error instanceof Error && error.message === 'IMAGE_NOT_FOUND') {
        res.status(404).json(formatErrorResponse('Foto tidak ditemukan'));
        return;
      }
      res.status(500).json(formatErrorResponse('Gagal memperbarui foto utama'));
    }
  }

  // Admin: Delete image
  async deleteImage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params; // imageId
      await roomService.deleteImage(id);
      res.status(200).json(formatSuccessResponse(null, 'Foto berhasil dihapus'));
    } catch (error) {
      if (error instanceof Error && error.message === 'IMAGE_NOT_FOUND') {
        res.status(404).json(formatErrorResponse('Foto tidak ditemukan'));
        return;
      }
      res.status(500).json(formatErrorResponse('Gagal menghapus foto'));
    }
  }
}
