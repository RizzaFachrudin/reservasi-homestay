import { Request, Response } from 'express';
import reservationService from '../services/reservation.service';
import paymentService from '../services/payment.service';
import invoiceService from '../services/invoice.service';
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

      const rawRoomCount = req.body.room_count ?? req.body.roomCount ?? req.body.rooms ?? 1;
      const roomCount = Number(rawRoomCount);
      if (Number.isNaN(roomCount) || !Number.isInteger(roomCount) || roomCount < 1 || roomCount > 100) {
        errors.room_count = 'Jumlah kamar harus angka bulat minimal 1';
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
        roomCount,
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
          `Jumlah tamu melebihi kapasitas maksimal untuk jumlah kamar yang dipilih (${maxCap} orang)`,
          400,
          { guest_count: `Maksimal ${maxCap} tamu untuk pilihan kamar ini` }
        );
        return;
      }

      if (msg.startsWith('INSUFFICIENT_UNITS:')) {
        const left = msg.split(':')[1] || '0';
        sendError(
          res,
          `Maaf, sisa kamar pada tanggal yang dipilih hanya ${left} unit. Kurangi jumlah kamar atau pilih tanggal lain.`,
          409,
          { room_count: `Sisa kamar tersedia: ${left}` }
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
      const shouldSync = req.query.sync === 'true';

      const reservation = shouldSync
        ? await paymentService.syncPaymentStatusFromMidtrans(
            id,
            req.user.userId,
            req.user.role
          )
        : await reservationService.getReservationById(
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

  /**
   * GET /api/reservations/:id/invoice
   * Download PDF invoice for a settled reservation (SF-9, BR-12, BR-15)
   */
  async downloadInvoice(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Autentikasi diperlukan', 401);
        return;
      }

      const { id } = req.params;
      const { buffer, filename } = await invoiceService.generateInvoicePdf(
        id,
        req.user.userId,
        req.user.role
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.status(200).send(buffer);
    } catch (error: any) {
      const msg = error?.message || '';

      if (msg === 'RESERVATION_NOT_FOUND') {
        sendError(res, 'Data reservasi tidak ditemukan', 404);
        return;
      }

      if (msg === 'FORBIDDEN_RESERVATION_ACCESS') {
        sendError(
          res,
          'Anda tidak memiliki akses untuk mengunduh invoice milik pengguna lain',
          403
        );
        return;
      }

      if (msg === 'INVOICE_NOT_AVAILABLE') {
        sendError(
          res,
          'Invoice belum tersedia karena pembayaran belum lunas (Settlement)',
          400
        );
        return;
      }

      console.error('Error generating PDF invoice:', error);
      sendError(res, 'Gagal membuat dokumen invoice PDF', 500);
    }
  }

  /**
   * POST /api/reservations/:id/cancel
   * Manually cancel a Pending reservation by the guest/owner
   */
  async cancelReservation(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Autentikasi diperlukan', 401);
        return;
      }

      const { id } = req.params;
      const updated = await reservationService.cancelReservation(
        id,
        req.user.userId,
        req.user.role
      );

      sendSuccess(
        res,
        'Pesanan berhasil dibatalkan dan kuota kamar telah dilepas kembali.',
        updated
      );
    } catch (error: any) {
      const msg = error?.message || '';

      if (msg === 'RESERVATION_NOT_FOUND') {
        sendError(res, 'Data reservasi tidak ditemukan', 404);
        return;
      }

      if (msg === 'FORBIDDEN_RESERVATION_ACCESS') {
        sendError(
          res,
          'Anda tidak memiliki akses untuk membatalkan reservasi milik pengguna lain',
          403
        );
        return;
      }

      if (msg.startsWith('CANNOT_CANCEL_NON_PENDING:')) {
        const currentStatus = msg.split(':')[1] || '';
        sendError(
          res,
          `Hanya pesanan yang masih Menunggu Pembayaran (Pending) yang dapat dibatalkan secara manual (status saat ini: ${currentStatus})`,
          400
        );
        return;
      }

      console.error('Error cancelling reservation:', error);
      sendError(res, 'Gagal membatalkan pesanan', 500);
    }
  }

  /**
   * GET /api/admin/reservations (SF-15)
   * Admin monitoring of all reservations with filter & pagination
   */
  async getAdminReservations(req: Request, res: Response): Promise<void> {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      const result = await reservationService.getAdminReservations({
        status,
        from,
        to,
        search,
        page,
        limit,
      });

      sendSuccess(res, 'Daftar seluruh reservasi berhasil diambil', result);
    } catch (error) {
      console.error('Error fetching admin reservations:', error);
      sendError(res, 'Gagal mengambil daftar reservasi', 500);
    }
  }

  /**
   * GET /api/admin/reservations/:id (SF-15)
   * Admin reservation detail
   */
  async getAdminReservationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await reservationService.getAdminReservationById(id);
      sendSuccess(res, 'Detail reservasi berhasil diambil', result);
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg === 'RESERVATION_NOT_FOUND') {
        sendError(res, 'Data reservasi tidak ditemukan', 404);
        return;
      }
      console.error('Error fetching admin reservation detail:', error);
      sendError(res, 'Gagal mengambil detail reservasi', 500);
    }
  }

  /**
   * GET /api/admin/checkin/lookup?code= (SF-16, BR-10)
   * Lookup reservation by booking code for Check-in / Check-out verification
   */
  async lookupCheckIn(req: Request, res: Response): Promise<void> {
    try {
      const code = typeof req.query.code === 'string' ? req.query.code.trim() : '';
      if (!code) {
        sendError(res, 'Kode booking wajib diisi untuk verifikasi Check-in', 400, {
          code: 'Kode booking wajib diisi (contoh: HSR-20261112-XXXX)',
        });
        return;
      }

      const result = await reservationService.lookupCheckInByCode(code);
      sendSuccess(res, 'Data reservasi ditemukan', result);
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg === 'BOOKING_CODE_REQUIRED') {
        sendError(res, 'Kode booking wajib diisi', 400);
        return;
      }
      if (msg === 'RESERVATION_NOT_FOUND') {
        sendError(
          res,
          'Reservasi dengan kode booking tersebut tidak ditemukan. Pastikan kode tiket sesuai.',
          404
        );
        return;
      }
      console.error('Error looking up check-in:', error);
      sendError(res, 'Gagal memverifikasi kode booking', 500);
    }
  }

  /**
   * POST /api/admin/reservations/:id/check-in (SF-16, BR-10)
   * Process guest Check-in (Confirmed -> Checked-in)
   */
  async checkInReservation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await reservationService.checkInReservation(id);
      sendSuccess(
        res,
        `Check-in berhasil dikonfirmasi untuk kode booking ${result.reservation.bookingCode}. Tamu kini berstatus Checked-in.`,
        result
      );
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg === 'RESERVATION_NOT_FOUND') {
        sendError(res, 'Data reservasi tidak ditemukan', 404);
        return;
      }
      if (msg.startsWith('CHECKIN_NOT_ELIGIBLE:')) {
        const parts = msg.split(':');
        const code = parts[1] || 'INELIGIBLE';
        const reason = parts.slice(2).join(':') || 'Reservasi tidak memenuhi syarat Check-in (BR-10)';
        sendError(res, reason, 400, { code, reason });
        return;
      }
      console.error('Error processing check-in:', error);
      sendError(res, 'Gagal memproses Check-in tamu', 500);
    }
  }

  /**
   * POST /api/admin/reservations/:id/check-out (SF-16, BR-11)
   * Process guest Check-out (Checked-in -> Completed)
   */
  async checkOutReservation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await reservationService.checkOutReservation(id);
      sendSuccess(
        res,
        `Check-out berhasil diproses untuk kode booking ${result.reservation.bookingCode}. Reservasi kini berstatus Completed.`,
        result
      );
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg === 'RESERVATION_NOT_FOUND') {
        sendError(res, 'Data reservasi tidak ditemukan', 404);
        return;
      }
      if (msg.startsWith('CHECKOUT_NOT_ELIGIBLE:')) {
        const reason = msg.replace('CHECKOUT_NOT_ELIGIBLE:', '');
        sendError(res, reason, 400, { reason });
        return;
      }
      console.error('Error processing check-out:', error);
      sendError(res, 'Gagal memproses Check-out tamu', 500);
    }
  }
}

export default new ReservationController();
