import cron from 'node-cron';
import prisma from '../config/database';

/**
 * Expire Pending reservations that have exceeded PAYMENT_EXPIRY_MINUTES (default: 60 minutes)
 * Implements BR-08: Reservations Pending -> Cancelled, Payments -> Expire
 */
export const expireOverdueReservations = async (): Promise<number> => {
  const expiryMinutes = Number(process.env.PAYMENT_EXPIRY_MINUTES) || 60;
  const cutoffDate = new Date(Date.now() - expiryMinutes * 60 * 1000);

  const overdueList = await prisma.reservation.findMany({
    where: {
      status: 'Pending',
      createdAt: {
        lte: cutoffDate,
      },
    },
    select: {
      id: true,
      bookingCode: true,
      totalPrice: true,
      payment: {
        select: { id: true },
      },
    },
  });

  if (overdueList.length === 0) {
    return 0;
  }

  let expiredCount = 0;

  for (const item of overdueList) {
    try {
      await prisma.$transaction(async (tx) => {
        const fresh = await tx.reservation.findUnique({
          where: { id: item.id },
          select: { status: true },
        });

        if (!fresh || fresh.status !== 'Pending') {
          return;
        }

        await tx.reservation.update({
          where: { id: item.id },
          data: { status: 'Cancelled' },
        });

        if (item.payment) {
          await tx.payment.update({
            where: { id: item.payment.id },
            data: { status: 'Expire' },
          });
        } else {
          await tx.payment.create({
            data: {
              reservationId: item.id,
              amount: item.totalPrice,
              status: 'Expire',
            },
          });
        }

        expiredCount++;
      });
    } catch (err) {
      console.error(`Failed to auto-expire reservation ${item.bookingCode}:`, err);
    }
  }

  if (expiredCount > 0) {
    console.log(
      `⏰ [Auto-Expire Job] Expired ${expiredCount} overdue Pending reservation(s) (> ${expiryMinutes} mins)`
    );
  }

  return expiredCount;
};

/**
 * Start the cron job running every 1 minute (* * * * *)
 */
export const startExpireReservationsJob = (): void => {
  const expiryMinutes = Number(process.env.PAYMENT_EXPIRY_MINUTES) || 60;
  console.log(
    `⏱️  Scheduled Auto-Expire Job initialized (runs every 1 minute, threshold: ${expiryMinutes} minutes)`
  );

  // Run once on startup to clean any overdue reservations immediately
  expireOverdueReservations().catch((err) =>
    console.error('Error running initial expireOverdueReservations:', err)
  );

  cron.schedule('* * * * *', async () => {
    try {
      await expireOverdueReservations();
    } catch (err) {
      console.error('Error in expireOverdueReservations cron job:', err);
    }
  });
};
