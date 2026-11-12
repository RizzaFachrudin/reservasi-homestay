import crypto from 'crypto';
import midtransClient from 'midtrans-client';
import prisma from '../config/database';
import reservationService from './reservation.service';

export interface MidtransWebhookPayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
}

export class PaymentService {
  private getSnapClient() {
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    const clientKey = process.env.MIDTRANS_CLIENT_KEY || '';

    return new midtransClient.Snap({
      isProduction,
      serverKey,
      clientKey,
    });
  }

  private getSnapRedirectBaseUrl() {
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    return isProduction
      ? 'https://app.midtrans.com/snap/v4/vtweb'
      : 'https://app.sandbox.midtrans.com/snap/v4/vtweb';
  }

  private getCoreApiBaseUrl() {
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    return isProduction
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com';
  }

  /**
   * Verify Midtrans SHA-512 signature_key (BR-09 & PRD §10.2)
   * Supports both MIDTRANS_SERVER_KEY and MIDTRANS_SIGNATURE_KEY
   */
  verifyWebhookSignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signatureKey: string
  ): boolean {
    if (!orderId || !statusCode || !grossAmount || !signatureKey) {
      return false;
    }

    const candidateKeys = [
      process.env.MIDTRANS_SERVER_KEY,
      process.env.MIDTRANS_SIGNATURE_KEY,
    ].filter((k): k is string => Boolean(k && k.trim().length > 0));

    for (const secret of candidateKeys) {
      const raw = `${orderId}${statusCode}${grossAmount}${secret.trim()}`;
      const expectedHash = crypto.createHash('sha512').update(raw).digest('hex');
      if (expectedHash.toLowerCase() === signatureKey.trim().toLowerCase()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Map Midtrans transaction_status & fraud_status to internal PaymentStatus and ReservationStatus (PRD §6.3)
   */
  private mapMidtransStatus(
    transactionStatus: string,
    fraudStatus?: string
  ): {
    paymentStatus: 'Pending' | 'Settlement' | 'Expire' | 'Cancel';
    reservationStatus: 'Pending' | 'Confirmed' | 'Cancelled';
  } | null {
    const txStatus = (transactionStatus || '').toLowerCase();
    const fraud = (fraudStatus || '').toLowerCase();

    if (txStatus === 'capture') {
      if (fraud === 'accept' || !fraud) {
        return { paymentStatus: 'Settlement', reservationStatus: 'Confirmed' };
      }
      if (fraud === 'challenge') {
        return { paymentStatus: 'Pending', reservationStatus: 'Pending' };
      }
      return { paymentStatus: 'Cancel', reservationStatus: 'Cancelled' };
    }

    if (txStatus === 'settlement') {
      return { paymentStatus: 'Settlement', reservationStatus: 'Confirmed' };
    }

    if (txStatus === 'pending') {
      return { paymentStatus: 'Pending', reservationStatus: 'Pending' };
    }

    if (txStatus === 'expire') {
      return { paymentStatus: 'Expire', reservationStatus: 'Cancelled' };
    }

    // PRD §6.3: cancel, deny, or failure -> Cancel & Cancelled
    if (txStatus === 'cancel' || txStatus === 'deny' || txStatus === 'failure') {
      return { paymentStatus: 'Cancel', reservationStatus: 'Cancelled' };
    }

    return null;
  }

  /**
   * Apply status transition in a single database transaction (idempotent per PRD §6.3 & §10.2)
   */
  private async applyPaymentStatusTransition(params: {
    reservationId: bigint;
    paymentStatus: 'Pending' | 'Settlement' | 'Expire' | 'Cancel';
    reservationStatus: 'Pending' | 'Confirmed' | 'Cancelled';
    transactionId?: string;
    paymentType?: string;
    grossAmount: number;
  }) {
    const {
      reservationId,
      paymentStatus,
      reservationStatus,
      transactionId,
      paymentType,
      grossAmount,
    } = params;

    await prisma.$transaction(async (tx) => {
      const currentRes = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { payment: true },
      });

      if (!currentRes) return;

      // PRD §6.3 & §10.2 Step 5: Idempotent - never alter reservations that are already Checked-in or Completed
      if (currentRes.status === 'Checked_in' || currentRes.status === 'Completed') {
        return;
      }

      // Also do not downgrade a Confirmed/Settlement reservation back to Pending if a late pending notification arrives
      if (currentRes.status === 'Confirmed' && reservationStatus === 'Pending') {
        return;
      }

      // Update reservation status
      if (currentRes.status !== reservationStatus) {
        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: reservationStatus },
        });
      }

      // Upsert payment record
      const existingTxId = currentRes.payment?.transactionId;
      const finalTxId =
        transactionId ||
        (existingTxId && !existingTxId.startsWith('SNAP:') ? existingTxId : undefined);

      if (currentRes.payment) {
        await tx.payment.update({
          where: { id: currentRes.payment.id },
          data: {
            status: paymentStatus,
            ...(finalTxId ? { transactionId: finalTxId } : {}),
            ...(paymentType ? { paymentType } : {}),
          },
        });
      } else {
        await tx.payment.create({
          data: {
            reservationId,
            amount: grossAmount,
            status: paymentStatus,
            transactionId: finalTxId || null,
            paymentType: paymentType || null,
          },
        });
      }
    });
  }

  /**
   * POST /api/reservations/:id/pay
   * Create or reuse Midtrans Snap transaction for a Pending reservation (SF-7)
   */
  async createOrGetSnapTransaction(
    reservationId: string,
    requesterUserId: string,
    requesterRole: string
  ) {
    if (!/^\d+$/.test(reservationId)) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: BigInt(reservationId) },
      include: {
        user: true,
        room: true,
        payment: true,
      },
    });

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    // Ownership check (BR-15 & §10.4)
    if (requesterRole !== 'Admin' && reservation.userId.toString() !== requesterUserId) {
      throw new Error('FORBIDDEN_RESERVATION_ACCESS');
    }

    if (reservation.status !== 'Pending') {
      throw new Error(`RESERVATION_NOT_PENDING:${reservation.status}`);
    }

    // Check if reservation has passed the 60-minute expiry window (BR-08)
    const expiryMinutes = Number(process.env.PAYMENT_EXPIRY_MINUTES) || 60;
    const expiresAt = new Date(
      reservation.createdAt.getTime() + expiryMinutes * 60 * 1000
    );

    if (Date.now() >= expiresAt.getTime()) {
      await this.applyPaymentStatusTransition({
        reservationId: reservation.id,
        paymentStatus: 'Expire',
        reservationStatus: 'Cancelled',
        grossAmount: Number(reservation.totalPrice),
      });
      throw new Error('RESERVATION_EXPIRED');
    }

    const clientKey = process.env.MIDTRANS_CLIENT_KEY || '';
    const grossAmount = Math.round(Number(reservation.totalPrice));

    // SF-7: Reuse existing Snap token if already created for this Pending reservation
    if (
      reservation.payment &&
      reservation.payment.status === 'Pending' &&
      reservation.payment.transactionId &&
      reservation.payment.transactionId.startsWith('SNAP:')
    ) {
      const savedToken = reservation.payment.transactionId.replace('SNAP:', '');
      return {
        snapToken: savedToken,
        redirectUrl: `${this.getSnapRedirectBaseUrl()}/${savedToken}`,
        clientKey,
        bookingCode: reservation.bookingCode,
        amount: grossAmount,
        reused: true,
      };
    }

    const checkInStr = reservation.checkInDate.toISOString().split('T')[0];
    const checkOutStr = reservation.checkOutDate.toISOString().split('T')[0];
    const nights = Math.max(
      1,
      Math.round(
        (new Date(`${checkOutStr}T00:00:00.000Z`).getTime() -
          new Date(`${checkInStr}T00:00:00.000Z`).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    const pricePerNight = Math.round(Number(reservation.room.pricePerNight));
    const roomCount = Math.max(1, reservation.roomCount || 1);

    const snap = this.getSnapClient();
    const parameter = {
      transaction_details: {
        order_id: reservation.bookingCode,
        gross_amount: grossAmount,
      },
      item_details: [
        {
          id: `ROOM-${reservation.roomId.toString()}`,
          price: pricePerNight,
          quantity: nights * roomCount,
          name: `${reservation.room.name} (${roomCount} Kamar x ${nights} Malam)`.substring(0, 50),
        },
      ],
      customer_details: {
        first_name: reservation.user.name,
        email: reservation.user.email,
        phone: reservation.user.phoneNumber,
      },
      expiry: {
        unit: 'minutes',
        duration: expiryMinutes,
      },
    };

    const snapResponse = await snap.createTransaction(parameter);
    const snapToken: string = snapResponse.token;
    const redirectUrl: string = snapResponse.redirect_url;

    // Store SNAP:<token> on the Pending payment record so subsequent clicks reuse the same Snap transaction
    if (reservation.payment) {
      await prisma.payment.update({
        where: { id: reservation.payment.id },
        data: {
          transactionId: `SNAP:${snapToken}`,
          status: 'Pending',
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          reservationId: reservation.id,
          amount: grossAmount,
          status: 'Pending',
          transactionId: `SNAP:${snapToken}`,
        },
      });
    }

    return {
      snapToken,
      redirectUrl,
      clientKey,
      bookingCode: reservation.bookingCode,
      amount: grossAmount,
      reused: false,
    };
  }

  /**
   * POST /api/payments/webhook
   * Handle notification webhook from Midtrans (SF-7, BR-09, PRD §10.2)
   */
  async handleMidtransWebhook(payload: MidtransWebhookPayload) {
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      transaction_id,
      payment_type,
    } = payload;

    // 1. Verify signature_key (BR-09)
    const isValidSig = this.verifyWebhookSignature(
      order_id,
      status_code,
      gross_amount,
      signature_key
    );

    if (!isValidSig) {
      throw new Error('INVALID_WEBHOOK_SIGNATURE');
    }

    // 2. Find reservation by bookingCode = order_id
    const reservation = await prisma.reservation.findUnique({
      where: { bookingCode: order_id },
      include: { payment: true },
    });

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    // 3. Verify gross_amount matches reservation totalPrice (PRD §10.2 step 3)
    const expectedAmount = Math.round(Number(reservation.totalPrice));
    const receivedAmount = Math.round(Number(gross_amount));
    if (expectedAmount !== receivedAmount) {
      throw new Error('AMOUNT_MISMATCH');
    }

    // 4. Map status and update in DB transaction (PRD §6.3 & §10.2 step 4-5)
    const mapped = this.mapMidtransStatus(transaction_status, fraud_status);
    if (!mapped) {
      return { status: 'ignored', reason: `Unmapped status: ${transaction_status}` };
    }

    await this.applyPaymentStatusTransition({
      reservationId: reservation.id,
      paymentStatus: mapped.paymentStatus,
      reservationStatus: mapped.reservationStatus,
      transactionId: transaction_id,
      paymentType: payment_type,
      grossAmount: expectedAmount,
    });

    return {
      bookingCode: reservation.bookingCode,
      reservationStatus: mapped.reservationStatus,
      paymentStatus: mapped.paymentStatus,
    };
  }

  /**
   * Sync payment status directly from Midtrans Core API v2
   * Useful for local development without ngrok when polling after Snap popup completion
   */
  async syncPaymentStatusFromMidtrans(
    reservationId: string,
    requesterUserId: string,
    requesterRole: string
  ) {
    if (!/^\d+$/.test(reservationId)) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: BigInt(reservationId) },
      include: { payment: true },
    });

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    if (requesterRole !== 'Admin' && reservation.userId.toString() !== requesterUserId) {
      throw new Error('FORBIDDEN_RESERVATION_ACCESS');
    }

    // Only need to query Midtrans if reservation is still Pending
    if (reservation.status === 'Pending') {
      const serverKey = (process.env.MIDTRANS_SERVER_KEY || '').trim();
      if (serverKey && !serverKey.includes('YOUR_KEY')) {
        try {
          const authHeader = Buffer.from(`${serverKey}:`).toString('base64');
          const url = `${this.getCoreApiBaseUrl()}/v2/${encodeURIComponent(
            reservation.bookingCode
          )}/status`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: `Basic ${authHeader}`,
            },
          });

          if (response.ok) {
            const data: any = await response.json();
            // Midtrans returns status_code '404' inside 200 JSON if user hasn't chosen a payment method yet
            if (data && data.transaction_status && data.status_code !== '404') {
              const mapped = this.mapMidtransStatus(
                data.transaction_status,
                data.fraud_status
              );
              if (mapped) {
                await this.applyPaymentStatusTransition({
                  reservationId: reservation.id,
                  paymentStatus: mapped.paymentStatus,
                  reservationStatus: mapped.reservationStatus,
                  transactionId: data.transaction_id,
                  paymentType: data.payment_type,
                  grossAmount: Math.round(Number(reservation.totalPrice)),
                });
              }
            }
          }
        } catch (err) {
          console.warn('Midtrans status sync warning:', err);
        }
      }
    }

    return reservationService.getReservationById(
      reservationId,
      requesterUserId,
      requesterRole
    );
  }
}

export default new PaymentService();
