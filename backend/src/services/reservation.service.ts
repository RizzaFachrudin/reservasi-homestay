import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { generateBookingCode } from '../utils/booking-code.util';

export interface CreateReservationInput {
  userId: string;
  roomId: string;
  checkInStr: string;
  checkOutStr: string;
  guestCount: number;
  roomCount?: number;
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
   * Current date string (YYYY-MM-DD) in WIB (Asia/Jakarta, UTC+7)
   */
  private getTodayWib(): string {
    const wibMs = Date.now() + 7 * 60 * 60 * 1000;
    return new Date(wibMs).toISOString().split('T')[0];
  }

  /**
   * Evaluate BR-10 check-in & BR-11 check-out eligibility for a reservation
   */
  private evaluateCheckInEligibility(res: any) {
    const todayWib = this.getTodayWib();
    const checkInStr =
      res.checkInDate instanceof Date
        ? res.checkInDate.toISOString().split('T')[0]
        : String(res.checkInDate);
    const checkOutStr =
      res.checkOutDate instanceof Date
        ? res.checkOutDate.toISOString().split('T')[0]
        : String(res.checkOutDate);

    const status = res.status === 'Checked_in' ? 'Checked-in' : res.status;
    const paymentStatus = res.payment?.status || 'Pending';

    if (status === 'Checked-in') {
      return {
        canCheckIn: false,
        canCheckOut: true,
        code: 'ALREADY_CHECKED_IN',
        reason:
          'Tamu sudah melakukan Check-in dan saat ini sedang menginap. Gunakan tombol Check-out saat tamu mengembalikan kunci kamar (11:00–12:00 WIB).',
        todayWib,
      };
    }

    if (status === 'Completed') {
      return {
        canCheckIn: false,
        canCheckOut: false,
        code: 'ALREADY_COMPLETED',
        reason: 'Reservasi ini sudah selesai (Completed / tamu sudah Check-out).',
        todayWib,
      };
    }

    if (status === 'Cancelled') {
      return {
        canCheckIn: false,
        canCheckOut: false,
        code: 'RESERVATION_CANCELLED',
        reason: 'Reservasi ini telah dibatalkan (Cancelled) dan tidak berlaku untuk Check-in.',
        todayWib,
      };
    }

    if (status !== 'Confirmed' || paymentStatus !== 'Settlement') {
      return {
        canCheckIn: false,
        canCheckOut: false,
        code: 'PAYMENT_NOT_SETTLED',
        reason: `Pembayaran belum lunas (Status Reservasi: ${status}, Status Pembayaran: ${paymentStatus}). Check-in hanya dapat dilakukan setelah pembayaran Settlement.`,
        todayWib,
      };
    }

    // BR-10: Check-in only when today (WIB) == check_in_date
    if (todayWib < checkInStr) {
      return {
        canCheckIn: false,
        canCheckOut: false,
        code: 'CHECKIN_DATE_TOO_EARLY',
        reason: `Belum memasuki jadwal Check-in. Tanggal Check-in reservasi ini adalah ${checkInStr} (mulai pukul 13:00 WIB), sedangkan hari ini adalah ${todayWib}.`,
        todayWib,
      };
    }

    if (todayWib > checkInStr) {
      return {
        canCheckIn: false,
        canCheckOut: false,
        code: 'CHECKIN_DATE_PASSED',
        reason: `Tanggal Check-in reservasi ini (${checkInStr}, Check-out ${checkOutStr}) tidak sesuai dengan tanggal hari ini (${todayWib}). Sesuai aturan BR-10, Check-in wajib dilakukan pada tanggal Check-in.`,
        todayWib,
      };
    }

    return {
      canCheckIn: true,
      canCheckOut: false,
      code: 'ELIGIBLE',
      reason: null,
      todayWib,
    };
  }

  /**
   * Format Reservation record for safe JSON serialization
   */
  private formatReservation(res: any, revealAllForAdmin = false) {
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

    // Only reveal check-in bookingCode to Guest once payment is Settlement / reservation is Confirmed+
    // Admin always sees bookingCode and allocated units for operational monitoring.
    const isBookingCodeRevealed =
      revealAllForAdmin ||
      res.status === 'Confirmed' ||
      res.status === 'Checked_in' ||
      res.status === 'Checked-in' ||
      res.status === 'Completed' ||
      res.payment?.status === 'Settlement';

    return {
      id: res.id.toString(),
      bookingCode: isBookingCodeRevealed ? res.bookingCode : null,
      userId: res.userId.toString(),
      roomId: res.roomId.toString(),
      checkInDate: checkInStr,
      checkOutDate: checkOutStr,
      nights,
      guestCount: res.guestCount,
      roomCount: res.roomCount ?? 1,
      units: isBookingCodeRevealed
        ? (res.units || [])
            .map((ru: any) => ({
              id: ru.unit.id.toString(),
              unitNumber: ru.unit.unitNumber,
            }))
            .sort((a: any, b: any) =>
              String(a.unitNumber).localeCompare(String(b.unitNumber), undefined, { numeric: true })
            )
        : [],
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
    const roomCount = input.roomCount && input.roomCount > 0 ? input.roomCount : 1;

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

        // 3. BR-03: Validate guest count against total capacity (capacity per room x rooms booked)
        const totalCapacity = Number(roomRow.capacity) * roomCount;
        if (guestCount > totalCapacity) {
          throw new Error(`CAPACITY_EXCEEDED:${totalCapacity}`);
        }

        // 4. BR-04 & BR-07: Pick free physical units inside the locked transaction.
        // A unit is free when it is Available and no active reservation overlapping the dates holds it.
        // Overlap formula: existing.check_in_date < new.check_out_date AND existing.check_out_date > new.check_in_date
        const freeUnits = await tx.roomUnit.findMany({
          where: {
            roomId: BigInt(roomId),
            status: 'Available',
            reservations: {
              none: {
                reservation: {
                  status: { in: ['Pending', 'Confirmed', 'Checked_in'] },
                  checkInDate: { lt: checkOutDate },
                  checkOutDate: { gt: checkInDate },
                },
              },
            },
          },
          orderBy: { unitNumber: 'asc' },
          select: { id: true },
        });

        if (freeUnits.length === 0) {
          throw new Error('ROOM_ALREADY_BOOKED');
        }
        if (freeUnits.length < roomCount) {
          throw new Error(`INSUFFICIENT_UNITS:${freeUnits.length}`);
        }
        const assignedUnits = freeUnits.slice(0, roomCount);

        // 5. BR-05: Calculate total_price on the server (price_per_night * nights * rooms)
        const pricePerNight = Number(roomRow.price_per_night);
        const totalPrice = pricePerNight * nights * roomCount;

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
            roomCount,
            totalPrice,
            status: 'Pending',
            units: {
              create: assignedUnits.map((u) => ({ unitId: u.id })),
            },
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
            units: { include: { unit: true } },
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
        units: { include: { unit: true } },
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
        units: { include: { unit: true } },
      },
    });

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    // Data-level authorization (BR-15 & PRD §10.4): Guest can only access their own reservation
    if (requesterRole !== 'Admin' && reservation.userId.toString() !== requesterUserId) {
      throw new Error('FORBIDDEN_RESERVATION_ACCESS');
    }

    return this.formatReservation(reservation, requesterRole === 'Admin');
  }

  /**
   * Manually cancel a Pending reservation by the guest/owner
   * Releases the room immediately and sets reservation -> Cancelled, payment -> Cancel
   */
  async cancelReservation(
    id: string,
    requesterUserId: string,
    requesterRole: string
  ) {
    if (!/^\d+$/.test(id)) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: BigInt(id) },
      include: {
        payment: true,
        units: { include: { unit: true } },
      },
    });

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    if (requesterRole !== 'Admin' && reservation.userId.toString() !== requesterUserId) {
      throw new Error('FORBIDDEN_RESERVATION_ACCESS');
    }

    if (reservation.status !== 'Pending') {
      throw new Error(`CANNOT_CANCEL_NON_PENDING:${reservation.status}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const fresh = await tx.reservation.findUnique({
        where: { id: reservation.id },
        include: { payment: true },
      });

      if (!fresh || fresh.status !== 'Pending') {
        throw new Error(`CANNOT_CANCEL_NON_PENDING:${fresh?.status || 'Unknown'}`);
      }

      if (fresh.payment) {
        await tx.payment.update({
          where: { id: fresh.payment.id },
          data: { status: 'Cancel' },
        });
      }

      return tx.reservation.update({
        where: { id: reservation.id },
        data: { status: 'Cancelled' },
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
          units: { include: { unit: true } },
        },
      });
    });

    return this.formatReservation(updated);
  }

  /**
   * GET /api/admin/reservations (SF-15)
   * Paginated list of all reservations with filter by status, check-in date range, and search
   */
  async getAdminReservations(params: {
    status?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ReservationWhereInput = {};

    if (params.status && params.status !== 'All' && params.status !== 'ALL') {
      const normalized =
        params.status === 'Checked-in' || params.status === 'Checked_in'
          ? 'Checked_in'
          : params.status;

      if (
        ['Pending', 'Confirmed', 'Checked_in', 'Completed', 'Cancelled'].includes(
          normalized
        )
      ) {
        where.status = normalized as any;
      }
    } else {
      // Default view ("Semua Reservasi Masuk") hides Cancelled reservations
      where.status = { not: 'Cancelled' };
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (params.from && dateRegex.test(params.from)) {
      where.checkInDate = {
        ...(where.checkInDate as Prisma.DateTimeFilter),
        gte: new Date(`${params.from}T00:00:00.000Z`),
      };
    }
    if (params.to && dateRegex.test(params.to)) {
      where.checkInDate = {
        ...(where.checkInDate as Prisma.DateTimeFilter),
        lte: new Date(`${params.to}T00:00:00.000Z`),
      };
    }

    if (params.search && params.search.trim() !== '') {
      const q = params.search.trim();
      where.OR = [
        { bookingCode: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } },
        { room: { name: { contains: q } } },
      ];
    }

    const todayWib = this.getTodayWib();
    const todayDate = new Date(`${todayWib}T00:00:00.000Z`);

    const [
      items,
      totalFiltered,
      statusGroups,
      arrivingTodayCount,
    ] = await Promise.all([
      prisma.reservation.findMany({
        where,
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
          units: { include: { unit: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.reservation.count({ where }),
      prisma.reservation.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.reservation.count({
        where: {
          status: 'Confirmed',
          checkInDate: todayDate,
        },
      }),
    ]);

    const countsMap: Record<string, number> = {
      Pending: 0,
      Confirmed: 0,
      Checked_in: 0,
      Completed: 0,
      Cancelled: 0,
    };

    for (const grp of statusGroups) {
      countsMap[grp.status] = grp._count._all;
    }

    const totalActiveAndCompleted =
      countsMap.Pending +
      countsMap.Confirmed +
      countsMap.Checked_in +
      countsMap.Completed;

    return {
      items: items.map((r) => ({
        ...this.formatReservation(r, true),
        eligibility: this.evaluateCheckInEligibility(r),
      })),
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.max(1, Math.ceil(totalFiltered / limit)),
      },
      summary: {
        total: totalActiveAndCompleted,
        pending: countsMap.Pending,
        confirmed: countsMap.Confirmed,
        checkedIn: countsMap.Checked_in,
        completed: countsMap.Completed,
        cancelled: countsMap.Cancelled,
        arrivingToday: arrivingTodayCount,
      },
      todayWib,
    };
  }

  /**
   * GET /api/admin/reservations/:id (SF-15)
   * Admin detail view for any reservation
   */
  async getAdminReservationById(idOrCode: string) {
    const isNumericId = /^\d+$/.test(idOrCode);

    const reservation = await prisma.reservation.findFirst({
      where: isNumericId
        ? { id: BigInt(idOrCode) }
        : { bookingCode: idOrCode.trim().toUpperCase() },
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
        units: { include: { unit: true } },
      },
    });

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    return {
      ...this.formatReservation(reservation, true),
      eligibility: this.evaluateCheckInEligibility(reservation),
    };
  }

  /**
   * GET /api/admin/checkin/lookup?code= (SF-16, BR-10)
   * Lookup reservation by booking code for Check-in / Check-out verification
   */
  async lookupCheckInByCode(code: string) {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('BOOKING_CODE_REQUIRED');
    }

    const reservation = await prisma.reservation.findFirst({
      where: { bookingCode: cleanCode },
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
        units: { include: { unit: true } },
      },
    });

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    return {
      reservation: this.formatReservation(reservation, true),
      eligibility: this.evaluateCheckInEligibility(reservation),
    };
  }

  /**
   * POST /api/admin/reservations/:id/check-in (SF-16, BR-10)
   * Process guest check-in: transitions Confirmed -> Checked-in
   */
  async checkInReservation(id: string) {
    if (!/^\d+$/.test(id)) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: BigInt(id) },
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
        units: { include: { unit: true } },
      },
    });

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    const eligibility = this.evaluateCheckInEligibility(reservation);
    if (!eligibility.canCheckIn) {
      throw new Error(
        `CHECKIN_NOT_ELIGIBLE:${eligibility.code}:${eligibility.reason}`
      );
    }

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: 'Checked_in' },
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
        units: { include: { unit: true } },
      },
    });

    return {
      reservation: this.formatReservation(updated, true),
      eligibility: this.evaluateCheckInEligibility(updated),
    };
  }

  /**
   * POST /api/admin/reservations/:id/check-out (SF-16, BR-11)
   * Process guest check-out: transitions Checked-in -> Completed without changing room/unit status
   */
  async checkOutReservation(id: string) {
    if (!/^\d+$/.test(id)) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: BigInt(id) },
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
        units: { include: { unit: true } },
      },
    });

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    if (reservation.status !== 'Checked_in') {
      throw new Error(
        `CHECKOUT_NOT_ELIGIBLE:Check-out hanya dapat dilakukan untuk tamu yang sedang menginap / berstatus Checked-in (Status saat ini: ${reservation.status}).`
      );
    }

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: 'Completed' },
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
        units: { include: { unit: true } },
      },
    });

    return {
      reservation: this.formatReservation(updated, true),
      eligibility: this.evaluateCheckInEligibility(updated),
    };
  }
}

export default new ReservationService();
