import { Request, Response } from 'express';
import reservationService from '../services/reservation.service';
import { sendSuccess, sendError } from '../utils/response.util';

export class ReservationController {
  /**
   * POST /api/reservations
   * Create a new reservation with row-level lock (SF-6, BR-02..BR-07)
   */
  async createReservation(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Autentikasi diperlukan untuk melakukan pemesanan', 401);
        return;
      }

      const rawRoomId = req.body.room_id ?? req.body.roomId;
      const rawCheckIn =
        req.body.check_in_date ?? req.body.checkInDate ?? req.body.check_in;
      const rawCheckOut =
        req.body.check_out_date ?? req.body.checkOutDate ?? req.body.check_out;
      const rawGuests =
        req.body.guest_count ?? req.body.guestCount ?? req.body.guests ?? 1;

      const errors: Record<string, string> = {};

      if (rawRoomId === undefined || rawRoomId === null || String(rawRoomId).trim() === '') {
        errors.room_id = 'ID kamar wajib diisi';
      } else if (!/^\d+$/.test(String(rawRoomId).trim())) {
        errors.room_id = 'ID kamar harus berupa angka yang valid';
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const checkInStr = String(rawCheckIn || '').trim();
      const checkOutStr = String(rawCheckOut || '').trim();

      if (!checkInStr || !dateRegex.test(checkInStr)) {
        errors.check_in_date = 'Format tanggal check-in harus YYYY-MM-DD';
      }
      if (!checkOutStr || !dateRegex.test(checkOutStr)) {
        errors.check_out_date = 'Format tanggal check-out harus YYYY-MM-DD';
      }

      const guestCount = Number(rawGuests);
      if (Number.isNaN(guestCount) || !Number.isInteger(guestCount) || guestCount < 1) {
        errors.guest_count = 'Jumlah tamu minimal 1 orang';
      }

      if (Object.keys(errors).length > 0) {
        sendError(res, 'Data pemesanan tidak valid', 400, errors);
        return;
      }

      // BR-02: Validate dates (check_in >= today and check_out > check_in)
      const checkInDate = new Date(`${checkInStr}T00:00:00.000Z`);
      const checkOutDate = new Date(`${checkOutStr}T00:00:00.000Z`);

      if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
        sendError(res, 'Tanggal check-in atau check-out tidak valid', 400);
        return;
      }

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`;

      if (checkInStr < todayStr) {
        sendError(res, 'Tanggal check-in tidak boleh di masa lampau', 400, {
          check_in_date: 'Tanggal check-in tidak boleh di masa lampau',
        });
        return;
      }

      if (checkOutDate <= checkInDate) {
        sendError(res, 'Tanggal check-out harus setelah tanggal check-in', 400, {
          check_out_date: 'Tanggal check-out harus setelah tanggal check-in',
        });
        return;
      }

      const reservation = await reservationService.createReservation({
        userId: req.user.userId,
        roomId: String(rawRoomId).trim(),
        checkInStr,
        checkOutStr,
        guestCount,
      });

      sendSuccess(
        res,
        'Reservasi berhasil dibuat. Silakan lanjutkan pembayaran.',
        reservation,
        201
      );
    } catch (error: any) {
      const msg = error?.message || '';

      if (msg === 'ROOM_NOT_FOUND' || msg === 'ROOM_NOT_AVAILABLE') {
        sendError(res, 'Kamar tidak tersedia atau tidak ditemukan', 404);
        return;
      }

      if (msg.startsWith('CAPACITY_EXCEEDED:')) {
        const maxCap = msg.split(':')[1] || '';
        sendError(
          res,
          `Jumlah tamu melebihi kapasitas maksimal kamar (${maxCap} orang)`,
          400,
          { guest_count: `Maksimal ${maxCap} tamu untuk kamar ini` }
        );
        return;
      }

      if (msg === 'ROOM_ALREADY_BOOKED') {
        sendError(
          res,
          'Maaf, kamar tidak lagi tersedia pada tanggal yang dipilih karena baru saja dipesan oleh tamu lain.',
          409
        );
        return;
      }

      if (msg === 'INVALID_DATE_RANGE') {
        sendError(res, 'Rentang tanggal menginap minimal 1 malam', 400);
        return;
      }

      console.error('Error creating reservation:', error);
      sendError(res, 'Gagal membuat reservasi kamar', 500);
    }
  }

  /**
   * GET /api/reservations/me
   * Get reservations belonging to the current user (SF-8)
   */
  async getMyReservations(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Autentikasi diperlukan', 401);
        return;
      }

      const reservations = await reservationService.getMyReservations(req.user.userId);
      sendSuccess(res, 'Daftar riwayat reservasi berhasil diambil', reservations);
    } catch (error) {
      console.error('Error fetching user reservations:', error);
      sendError(res, 'Gagal mengambil riwayat reservasi', 500);
    }
  }

  /**
   * GET /api/reservations/:id
   * Get reservation detail by ID or booking code (SF-6, SF-8, BR-15)
   */
  async getReservationById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Autentikasi diperlukan', 401);
        return;
      }

      const { id } = req.params;
      const reservation = await reservationService.getReservationById(
        id,
        req.user.userId,
        req.user.role
      );

      sendSuccess(res, 'Detail reservasi berhasil diambil', reservation);
    } catch (error: any) {
      const msg = error?.message || '';

      if (msg === 'RESERVATION_NOT_FOUND') {
        sendError(res, 'Data reservasi tidak ditemukan', 404);
        return;
      }

      if (msg === 'FORBIDDEN_RESERVATION_ACCESS') {
        sendError(
          res,
          'Anda tidak memiliki akses untuk melihat reservasi milik pengguna lain',
          403
        );
        return;
      }

      console.error('Error fetching reservation detail:', error);
      sendError(res, 'Gagal mengambil detail reservasi', 500);
    }
  }
}

export default new ReservationController();
