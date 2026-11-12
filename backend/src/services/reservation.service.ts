import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { generateBookingCode } from '../utils/booking-code.util';

export interface CreateReservationInput {
  userId: string;
  roomId: string;
  checkInStr: string;
  checkOutStr: string;
  guestCount: number;
}

interface LockedRoomRow {
  id: bigint;
  name: string;
  price_per_night: Prisma.Decimal | number | string;
  capacity: number;
  status: string;
  deleted_at: Date | null;
}

export class ReservationService {
  /**
   * Format Reservation record for safe JSON serialization
   */
  private formatReservation(res: any) {
    const checkInStr =
      res.checkInDate instanceof Date
        ? res.checkInDate.toISOString().split('T')[0]
        : String(res.checkInDate);
    const checkOutStr =
      res.checkOutDate instanceof Date
        ? res.checkOutDate.toISOString().split('T')[0]
        : String(res.checkOutDate);

    const inTime = new Date(`${checkInStr}T00:00:00.000Z`).getTime();
    const outTime = new Date(`${checkOutStr}T00:00:00.000Z`).getTime();
    const nights = Math.max(1, Math.round((outTime - inTime) / (1000 * 60 * 60 * 24)));

    const expiryMinutes = Number(process.env.PAYMENT_EXPIRY_MINUTES) || 60;
    const createdAtDate = res.createdAt instanceof Date ? res.createdAt : new Date(res.createdAt);
    const expiresAt = new Date(createdAtDate.getTime() + expiryMinutes * 60 * 1000).toISOString();

    const primaryImg =
      res.room?.images?.find((img: any) => img.isPrimary)?.imagePath ||
      res.room?.images?.[0]?.imagePath ||
      null;

    return {
      id: res.id.toString(),
      bookingCode: res.bookingCode,
      userId: res.userId.toString(),
      roomId: res.roomId.toString(),
      checkInDate: checkInStr,
      checkOutDate: checkOutStr,
      nights,
      guestCount: res.guestCount,
      totalPrice: Number(res.totalPrice),
      status: res.status === 'Checked_in' ? 'Checked-in' : res.status,
      createdAt: createdAtDate.toISOString(),
      updatedAt: res.updatedAt instanceof Date ? res.updatedAt.toISOString() : res.updatedAt,
      expiresAt,
      user: res.user
        ? {
            id: res.user.id.toString(),
            name: res.user.name,
            email: res.user.email,
            phone: res.user.phoneNumber,
          }
        : undefined,
      room: res.room
        ? {
            id: res.room.id.toString(),
            name: res.room.name,
            description: res.room.description,
            pricePerNight: Number(res.room.pricePerNight),
            capacity: res.room.capacity,
            status: res.room.status,
            primaryImage: primaryImg,
            images: (res.room.images || []).map((img: any) => ({
              id: img.id.toString(),
              imagePath: img.imagePath,
              isPrimary: Boolean(img.isPrimary),
            })),
            facilities: (res.room.facilities || []).map((rf: any) => ({
              id: rf.facility.id.toString(),
              name: rf.facility.name,
              icon: rf.facility.icon,
            })),
          }
        : undefined,
      payment: res.payment
        ? {
            id: res.payment.id.toString(),
            reservationId: res.payment.reservationId.toString(),
            transactionId: res.payment.transactionId,
            paymentType: res.payment.paymentType,
            amount: Number(res.payment.amount),
            status: res.payment.status,
            createdAt:
              res.payment.createdAt instanceof Date
                ? res.payment.createdAt.toISOString()
                : res.payment.createdAt,
            updatedAt:
              res.payment.updatedAt instanceof Date
                ? res.payment.updatedAt.toISOString()
                : res.payment.updatedAt,
          }
        : null,
    };
  }

  /**
   * Create a new reservation with row-level lock (SELECT ... FOR UPDATE)
   * Implements SF-6, BR-02, BR-03, BR-04, BR-05, BR-06, BR-07 & PRD §10.3
   */
  async createReservation(input: CreateReservationInput) {
    const { userId, roomId, checkInStr, checkOutStr, guestCount } = input;

    if (!/^\d+$/.test(roomId)) {
      throw new Error('ROOM_NOT_FOUND');
    }

    const checkInDate = new Date(`${checkInStr}T00:00:00.000Z`);
    const checkOutDate = new Date(`${checkOutStr}T00:00:00.000Z`);

    const nights = Math.round(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (nights < 1) {
      throw new Error('INVALID_DATE_RANGE');
    }

    const createdReservation = await prisma.$transaction(
      async (tx) => {
        // 1. BR-07: Lock the target room row using SELECT ... FOR UPDATE to prevent race conditions / double booking
        const lockedRooms = await tx.$queryRaw<LockedRoomRow[]>`
          SELECT id, name, price_per_night, capacity, status, deleted_at
          FROM rooms
          WHERE id = ${BigInt(roomId)}
          FOR UPDATE
        `;

        if (!lockedRooms || lockedRooms.length === 0) {
          throw new Error('ROOM_NOT_FOUND');
        }

        const roomRow = lockedRooms[0];

        // 2. BR-03, BR-12, BR-13: Check room is Available and not soft-deleted
        if (roomRow.deleted_at !== null || roomRow.status !== 'Available') {
          throw new Error('ROOM_NOT_AVAILABLE');
        }

        // 3. BR-03: Validate guest count against room capacity
        if (guestCount > Number(roomRow.capacity)) {
          throw new Error(`CAPACITY_EXCEEDED:${roomRow.capacity}`);
        }

        // 4. BR-04 & BR-07: Re-check overlapping active reservations inside the locked transaction
        // Overlap formula: existing.check_in_date < new.check_out_date AND existing.check_out_date > new.check_in_date
        const overlapping = await tx.reservation.findFirst({
          where: {
            roomId: BigInt(roomId),
            status: {
              in: ['Pending', 'Confirmed', 'Checked_in'],
            },
            checkInDate: {
              lt: checkOutDate,
            },
            checkOutDate: {
              gt: checkInDate,
            },
          },
          select: { id: true, bookingCode: true },
        });

        if (overlapping) {
          throw new Error('ROOM_ALREADY_BOOKED');
        }

        // 5. BR-05: Calculate total_price on the server (price_per_night * nights)
        const pricePerNight = Number(roomRow.price_per_night);
        const totalPrice = pricePerNight * nights;

        // 6. BR-06: Generate unique booking code (HSR-YYYYMMDD-XXXX)
        let bookingCode = generateBookingCode();
        for (let attempt = 0; attempt < 5; attempt++) {
          const existingCode = await tx.reservation.findUnique({
            where: { bookingCode },
            select: { id: true },
          });
          if (!existingCode) break;
          bookingCode = generateBookingCode();
        }

        // 7. PRD §10.3: Insert reservation (Pending) + payment (Pending) in the same transaction
        const reservation = await tx.reservation.create({
          data: {
            bookingCode,
            userId: BigInt(userId),
            roomId: BigInt(roomId),
            checkInDate,
            checkOutDate,
            guestCount,
            totalPrice,
            status: 'Pending',
            payment: {
              create: {
                amount: totalPrice,
                status: 'Pending',
              },
            },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
              },
            },
            room: {
              include: {
                images: {
                  orderBy: { isPrimary: 'desc' },
                },
                facilities: {
                  include: { facility: true },
                },
              },
            },
            payment: true,
          },
        });

        return reservation;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      }
    );

    return this.formatReservation(createdReservation);
  }

  /**
   * Get reservations belonging to the logged-in user (SF-8)
   */
  async getMyReservations(userId: string) {
    const reservations = await prisma.reservation.findMany({
      where: {
        userId: BigInt(userId),
      },
      include: {
        room: {
          include: {
            images: {
              orderBy: { isPrimary: 'desc' },
            },
            facilities: {
              include: { facility: true },
            },
          },
        },
        payment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reservations.map((r) => this.formatReservation(r));
  }

  /**
   * Get reservation detail by ID or bookingCode with ownership check (BR-15 & §10.4)
   */
  async getReservationById(idOrCode: string, requesterUserId: string, requesterRole: string) {
    const isNumericId = /^\d+$/.test(idOrCode);

    const reservation = await prisma.reservation.findFirst({
      where: isNumericId
        ? { id: BigInt(idOrCode) }
        : { bookingCode: idOrCode.toUpperCase() },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        room: {
          include: {
            images: {
              orderBy: { isPrimary: 'desc' },
            },
            facilities: {
              include: { facility: true },
            },
          },
        },
        payment: true,
      },
    });

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    // Data-level authorization (BR-15 & PRD §10.4): Guest can only access their own reservation
    if (requesterRole !== 'Admin' && reservation.userId.toString() !== requesterUserId) {
      throw new Error('FORBIDDEN_RESERVATION_ACCESS');
    }

    return this.formatReservation(reservation);
  }
}

export default new ReservationService();
