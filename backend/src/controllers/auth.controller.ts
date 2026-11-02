import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { z } from 'zod';
import { formatSuccessResponse, formatErrorResponse } from '../utils/response.util';
import { validateRequest } from '../utils/validation.util';

const authService = new AuthService();

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(1, 'Nama tidak boleh kosong'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  phone: z.string().regex(/^[\d+]+$/, 'Format nomor telepon tidak valid')
});

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password tidak boleh kosong')
});

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const validation = validateRequest(registerSchema, req.body);
      if (!validation.success) {
        res.status(422).json(
          formatErrorResponse('Validasi gagal', validation.errors)
        );
        return;
      }

      // Register user
      const result = await authService.register(validation.data);

      res.status(201).json(
        formatSuccessResponse(result, 'Registrasi berhasil')
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'EMAIL_EXISTS') {
          res.status(409).json(
            formatErrorResponse('Email sudah terdaftar')
          );
          return;
        }
      }

      res.status(500).json(
        formatErrorResponse('Terjadi kesalahan saat registrasi')
      );
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const validation = validateRequest(loginSchema, req.body);
      if (!validation.success) {
        res.status(422).json(
          formatErrorResponse('Validasi gagal', validation.errors)
        );
        return;
      }

      // Login user
      const result = await authService.login(validation.data);

      res.status(200).json(
        formatSuccessResponse(result, 'Login berhasil')
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'INVALID_CREDENTIALS') {
          res.status(401).json(
            formatErrorResponse('Email atau password salah')
          );
          return;
        }
      }

      res.status(500).json(
        formatErrorResponse('Terjadi kesalahan saat login')
      );
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json(
          formatErrorResponse('Autentikasi diperlukan')
        );
        return;
      }

      const profile = await authService.getProfile(userId);

      res.status(200).json(
        formatSuccessResponse(profile, 'Profil berhasil diambil')
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'USER_NOT_FOUND') {
          res.status(404).json(
            formatErrorResponse('Pengguna tidak ditemukan')
          );
          return;
        }
      }

      res.status(500).json(
        formatErrorResponse('Terjadi kesalahan saat mengambil profil')
      );
    }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    // Logout is handled client-side by removing the token
    // This endpoint is optional and can be used for logging purposes
    res.status(200).json(
      formatSuccessResponse(null, 'Logout berhasil')
    );
  }
}
