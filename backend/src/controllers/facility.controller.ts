import { Request, Response } from 'express';
import { z } from 'zod';
import { FacilityService } from '../services/facility.service';
import { validateRequest } from '../utils/validation.util';
import { formatSuccessResponse, formatErrorResponse } from '../utils/response.util';

const facilityService = new FacilityService();

const createFacilitySchema = z.object({
  name: z.string().min(1, 'Nama fasilitas wajib diisi').max(100, 'Nama fasilitas maksimal 100 karakter'),
  icon: z.string().max(100, 'Nama icon maksimal 100 karakter').optional(),
});

const updateFacilitySchema = z.object({
  name: z.string().min(1, 'Nama fasilitas wajib diisi').max(100, 'Nama fasilitas maksimal 100 karakter').optional(),
  icon: z.string().max(100, 'Nama icon maksimal 100 karakter').optional().nullable(),
});

export class FacilityController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const facilities = await facilityService.getAll();
      res.status(200).json(formatSuccessResponse(facilities, 'Daftar fasilitas berhasil diambil'));
    } catch (error) {
      res.status(500).json(formatErrorResponse('Gagal mengambil daftar fasilitas'));
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const facility = await facilityService.getById(id);
      res.status(200).json(formatSuccessResponse(facility, 'Detail fasilitas berhasil diambil'));
    } catch (error) {
      if (error instanceof Error && error.message === 'FACILITY_NOT_FOUND') {
        res.status(404).json(formatErrorResponse('Fasilitas tidak ditemukan'));
        return;
      }
      res.status(500).json(formatErrorResponse('Gagal mengambil data fasilitas'));
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const validation = validateRequest(createFacilitySchema, req.body);
      if (!validation.success) {
        res.status(422).json(formatErrorResponse('Validasi gagal', validation.errors));
        return;
      }

      const result = await facilityService.create(validation.data);
      res.status(201).json(formatSuccessResponse(result, 'Fasilitas berhasil ditambahkan'));
    } catch (error) {
      if (error instanceof Error && error.message === 'FACILITY_EXISTS') {
        res.status(409).json(formatErrorResponse('Fasilitas dengan nama tersebut sudah ada'));
        return;
      }
      res.status(500).json(formatErrorResponse('Gagal menambahkan fasilitas'));
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validation = validateRequest(updateFacilitySchema, req.body);
      if (!validation.success) {
        res.status(422).json(formatErrorResponse('Validasi gagal', validation.errors));
        return;
      }

      const result = await facilityService.update(id, validation.data);
      res.status(200).json(formatSuccessResponse(result, 'Fasilitas berhasil diperbarui'));
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'FACILITY_NOT_FOUND') {
          res.status(404).json(formatErrorResponse('Fasilitas tidak ditemukan'));
          return;
        }
        if (error.message === 'FACILITY_EXISTS') {
          res.status(409).json(formatErrorResponse('Fasilitas dengan nama tersebut sudah ada'));
          return;
        }
      }
      res.status(500).json(formatErrorResponse('Gagal memperbarui fasilitas'));
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await facilityService.delete(id);
      res.status(200).json(formatSuccessResponse(null, 'Fasilitas berhasil dihapus'));
    } catch (error) {
      if (error instanceof Error && error.message === 'FACILITY_NOT_FOUND') {
        res.status(404).json(formatErrorResponse('Fasilitas tidak ditemukan'));
        return;
      }
      res.status(500).json(formatErrorResponse('Gagal menghapus fasilitas'));
    }
  }
}
