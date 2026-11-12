import { Request, Response } from 'express';
import paymentService from '../services/payment.service';
import { sendSuccess, sendError } from '../utils/response.util';

export class PaymentController {
  /**
   * POST /api/reservations/:id/pay
   * Create or reuse Midtrans Snap transaction (SF-7)
   */
  async createOrGetPayment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Autentikasi diperlukan', 401);
        return;
      }

      const { id } = req.params;
      const result = await paymentService.createOrGetSnapTransaction(
        id,
        req.user.userId,
        req.user.role
      );

      sendSuccess(
        res,
        result.reused
          ? 'Melanjutkan sesi pembayaran yang masih aktif'
          : 'Transaksi pembayaran berhasil dibuat',
        result
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
          'Anda tidak memiliki akses untuk membayar reservasi milik pengguna lain',
          403
        );
        return;
      }

      if (msg.startsWith('RESERVATION_NOT_PENDING:')) {
        const currentStatus = msg.split(':')[1] || '';
        sendError(
          res,
          `Reservasi ini tidak dapat dibayar karena berstatus ${currentStatus}`,
          400
        );
        return;
      }

      if (msg === 'RESERVATION_EXPIRED') {
        sendError(
          res,
          'Batas waktu pembayaran (60 menit) telah habis. Reservasi ini telah dibatalkan otomatis.',
          400
        );
        return;
      }

      console.error('Error creating Midtrans Snap transaction:', error);
      sendError(
        res,
        error?.ApiResponse?.error_messages?.[0] ||
          'Gagal menghubungi layanan Payment Gateway Midtrans',
        500
      );
    }
  }

  /**
   * POST /api/reservations/:id/sync
   * Actively sync payment status with Midtrans Core API v2 (for localhost polling & immediate popup callback)
   */
  async syncPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Autentikasi diperlukan', 401);
        return;
      }

      const { id } = req.params;
      const updatedReservation = await paymentService.syncPaymentStatusFromMidtrans(
        id,
        req.user.userId,
        req.user.role
      );

      sendSuccess(res, 'Status pembayaran berhasil diperbarui', updatedReservation);
    } catch (error: any) {
      const msg = error?.message || '';

      if (msg === 'RESERVATION_NOT_FOUND') {
        sendError(res, 'Data reservasi tidak ditemukan', 404);
        return;
      }

      if (msg === 'FORBIDDEN_RESERVATION_ACCESS') {
        sendError(res, 'Anda tidak memiliki akses ke reservasi ini', 403);
        return;
      }

      console.error('Error syncing payment status:', error);
      sendError(res, 'Gagal menyinkronkan status pembayaran', 500);
    }
  }

  /**
   * POST /api/payments/webhook
   * Midtrans HTTP Notification Webhook endpoint (SF-7, BR-09, PRD §10.2)
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const result = await paymentService.handleMidtransWebhook(req.body || {});
      sendSuccess(res, 'Webhook notification processed successfully', result, 200);
    } catch (error: any) {
      const msg = error?.message || '';

      if (msg === 'INVALID_WEBHOOK_SIGNATURE') {
        sendError(res, 'Signature key tidak valid (Unauthorized webhook)', 401);
        return;
      }

      if (msg === 'RESERVATION_NOT_FOUND') {
        sendError(res, 'Reservasi dengan order_id tersebut tidak ditemukan', 404);
        return;
      }

      if (msg === 'AMOUNT_MISMATCH') {
        sendError(res, 'Jumlah pembayaran (gross_amount) tidak sesuai dengan tagihan', 400);
        return;
      }

      console.error('Error processing Midtrans webhook:', error);
      sendError(res, 'Gagal memproses notifikasi webhook', 500);
    }
  }
}

export default new PaymentController();
