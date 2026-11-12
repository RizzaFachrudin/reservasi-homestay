import fs from 'fs';
import path from 'path';
import { Prisma, ReservationStatus, RoomStatus } from '@prisma/client';
import prisma from '../config/database';

/** Reservation statuses that hold a room unit (BR-04) */
const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = ['Pending', 'Confirmed', 'Checked_in'];

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CreateRoomInput {
  name: string;
  description?: string;
  pricePerNight: number;
  capacity: number;
  status?: RoomStatus;
  facilityIds?: (string | number)[];
  totalUnits?: number;
  unitPrefix?: string;
}

export interface UpdateRoomInput {
  name?: string;
  description?: string;
  pricePerNight?: number;
  capacity?: number;
  status?: RoomStatus;
  facilityIds?: (string | number)[];
}

export interface UnitStats {
  totalUnits: number;
  activeUnits: number;
  availableUnits: number;
}

const EMPTY_STATS: UnitStats = { totalUnits: 0, activeUnits: 0, availableUnits: 0 };

export class RoomService {
  /**
   * Helper format room data to JSON-safe structure (BigInt/Decimal to string/number)
   */
  private formatRoom(room: any, stats?: UnitStats, includeUnits = false) {
    const s = stats || EMPTY_STATS;
    return {
      id: room.id.toString(),
      name: room.name,
      description: room.description,
      pricePerNight: Number(room.pricePerNight),
      capacity: room.capacity,
      status: room.status,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      deletedAt: room.deletedAt,
      totalUnits: s.totalUnits,
      activeUnits: s.activeUnits,
      availableUnits: s.availableUnits,
      maintenanceUnits: s.totalUnits - s.activeUnits,
      images: room.images
        ? room.images.map((img: any) => ({
            id: img.id.toString(),
            imagePath: img.imagePath,
            isPrimary: Boolean(img.isPrimary),
          }))
        : [],
      primaryImage: room.images?.find((img: any) => img.isPrimary)?.imagePath || room.images?.[0]?.imagePath || null,
      facilities: room.facilities
        ? room.facilities.map((fr: any) => ({
            id: fr.facility.id.toString(),
            name: fr.facility.name,
            icon: fr.facility.icon,
          }))
        : [],
      ...(includeUnits && room.units
        ? {
            units: [...room.units]
              .sort((a: any, b: any) =>
                String(a.unitNumber).localeCompare(String(b.unitNumber), undefined, { numeric: true })
              )
              .map((u: any) => ({
                id: u.id.toString(),
                roomId: u.roomId.toString(),
                unitNumber: u.unitNumber,
                status: u.status,
              })),
          }
        : {}),
    };
  }

  private todayUtc(): Date {
    const iso = new Date().toISOString().split('T')[0];
    return new Date(`${iso}T00:00:00.000Z`);
  }

  /**
   * Unit statistics per room type for a date range (defaults to tonight).
   * availableUnits = units with status Available that are not held by an active reservation overlapping the range.
   */
  private async getUnitStats(
    roomIds: bigint[],
    rangeStart?: Date,
    rangeEnd?: Date
  ): Promise<Map<string, UnitStats>> {
    const result = new Map<string, UnitStats>();
    if (roomIds.length === 0) return result;

    const start = rangeStart || this.todayUtc();
    const end = rangeEnd || new Date(start.getTime() + DAY_MS);

    const units = await prisma.roomUnit.findMany({
      where: { roomId: { in: roomIds } },
      select: { id: true, roomId: true, status: true },
    });

    const busy = await prisma.reservationUnit.findMany({
      where: {
        unit: { roomId: { in: roomIds } },
        reservation: {
          status: { in: ACTIVE_RESERVATION_STATUSES },
          checkInDate: { lt: end },
          checkOutDate: { gt: start },
        },
      },
      select: { unitId: true },
    });
    const busyIds = new Set(busy.map((b) => b.unitId.toString()));

    for (const roomId of roomIds) {
      result.set(roomId.toString(), { totalUnits: 0, activeUnits: 0, availableUnits: 0 });
    }

    for (const u of units) {
      const s = result.get(u.roomId.toString())!;
      s.totalUnits += 1;
      if (u.status === 'Available') {
        s.activeUnits += 1;
        if (!busyIds.has(u.id.toString())) {
          s.availableUnits += 1;
        }
      }
    }

    return result;
  }

  /**
   * Public list of available rooms (catalog & featured)
   */
  async getPublicRooms(featured?: boolean) {
    const rooms = await prisma.room.findMany({
      where: {
        deletedAt: null,
        status: RoomStatus.Available,
      },
      include: {
        images: {
          orderBy: { isPrimary: 'desc' },
        },
        facilities: {
          include: { facility: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: featured ? 6 : undefined,
    });

    const stats = await this.getUnitStats(rooms.map((r) => r.id));
    return rooms.map((r) => this.formatRoom(r, stats.get(r.id.toString())));
  }

  /**
   * Public detail of a room
   */
  async getPublicRoomById(id: string) {
    if (!/^\d+$/.test(id)) {
      throw new Error('ROOM_NOT_FOUND_OR_UNAVAILABLE');
    }

    const room = await prisma.room.findFirst({
      where: {
        id: BigInt(id),
        deletedAt: null,
        status: RoomStatus.Available,
      },
      include: {
        images: {
          orderBy: { isPrimary: 'desc' },
        },
        facilities: {
          include: { facility: true },
        },
      },
    });

    if (!room) {
      throw new Error('ROOM_NOT_FOUND_OR_UNAVAILABLE');
    }

    const stats = await this.getUnitStats([room.id]);
    return this.formatRoom(room, stats.get(room.id.toString()));
  }

  /**
   * Public search for available room types by date range, guest count and room count
   * (SF-4, BR-03, BR-04, BR-05). A type is returned when it has >= roomCount free units
   * and capacity * roomCount >= guests.
   */
  async getAvailableRooms(checkInStr: string, checkOutStr: string, guests: number, roomCount = 1) {
    const checkInDate = new Date(`${checkInStr}T00:00:00.000Z`);
    const checkOutDate = new Date(`${checkOutStr}T00:00:00.000Z`);

    const nights = Math.round(
      (checkOutDate.getTime() - checkInDate.getTime()) / DAY_MS
    );

    const rooms = await prisma.room.findMany({
      where: {
        deletedAt: null,
        status: RoomStatus.Available,
      },
      include: {
        images: {
          orderBy: { isPrimary: 'desc' },
        },
        facilities: {
          include: { facility: true },
        },
      },
      orderBy: { pricePerNight: 'asc' },
    });

    const stats = await this.getUnitStats(rooms.map((r) => r.id), checkInDate, checkOutDate);

    return rooms
      .filter((room) => {
        const s = stats.get(room.id.toString()) || EMPTY_STATS;
        return s.availableUnits >= roomCount && room.capacity * roomCount >= guests;
      })
      .map((room) => {
        const formatted = this.formatRoom(room, stats.get(room.id.toString()));
        return {
          ...formatted,
          nights,
          roomCount,
          totalPrice: formatted.pricePerNight * nights * roomCount,
        };
      });
  }

  /**
   * Public room availability calendar per month (SF-4, SF-5, BR-04, BR-18)
   * Each day reports how many units are still free; a day is "booked" only when 0 units remain.
   */
  async getRoomAvailabilityByMonth(id: string, monthStr: string) {
    if (!/^\d+$/.test(id)) {
      throw new Error('ROOM_NOT_FOUND_OR_UNAVAILABLE');
    }

    const room = await prisma.room.findFirst({
      where: {
        id: BigInt(id),
        deletedAt: null,
        status: RoomStatus.Available,
      },
      select: { id: true },
    });

    if (!room) {
      throw new Error('ROOM_NOT_FOUND_OR_UNAVAILABLE');
    }

    const [yearStr, monStr] = monthStr.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monStr) - 1; // 0-indexed

    const monthStart = new Date(Date.UTC(year, monthIndex, 1));
    const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 1));

    const units = await prisma.roomUnit.findMany({
      where: { roomId: BigInt(id) },
      select: { id: true, status: true },
    });
    const activeUnitIds = units.filter((u) => u.status === 'Available').map((u) => u.id.toString());

    const reservations = await prisma.reservation.findMany({
      where: {
        roomId: BigInt(id),
        status: {
          in: ACTIVE_RESERVATION_STATUSES,
        },
        checkInDate: {
          lt: monthEnd,
        },
        checkOutDate: {
          gt: monthStart,
        },
      },
      select: {
        checkInDate: true,
        checkOutDate: true,
        units: { select: { unitId: true } },
      },
      orderBy: { checkInDate: 'asc' },
    });

    // date -> set of busy unit ids
    const busyByDate = new Map<string, Set<string>>();
    for (const res of reservations) {
      const start = new Date(Math.max(res.checkInDate.getTime(), monthStart.getTime()));
      const end = new Date(Math.min(res.checkOutDate.getTime(), monthEnd.getTime()));

      const cursor = new Date(start);
      while (cursor < end) {
        const key = cursor.toISOString().split('T')[0];
        if (!busyByDate.has(key)) busyByDate.set(key, new Set<string>());
        const set = busyByDate.get(key)!;
        for (const ru of res.units) set.add(ru.unitId.toString());
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    const bookedDates: string[] = [];
    const availableUnitsByDate: Record<string, number> = {};
    const daysInMonth = Math.round((monthEnd.getTime() - monthStart.getTime()) / DAY_MS);
    for (let d = 0; d < daysInMonth; d++) {
      const date = new Date(monthStart.getTime() + d * DAY_MS).toISOString().split('T')[0];
      const busy = busyByDate.get(date);
      const free = activeUnitIds.filter((uid) => !busy || !busy.has(uid)).length;
      availableUnitsByDate[date] = free;
      if (free === 0) bookedDates.push(date);
    }

    return {
      roomId: id,
      month: monthStr,
      totalUnits: units.length,
      activeUnits: activeUnitIds.length,
      bookedDates: bookedDates.sort(),
      availableUnitsByDate,
      reservations: reservations.map((r) => ({
        checkInDate: r.checkInDate.toISOString().split('T')[0],
        checkOutDate: r.checkOutDate.toISOString().split('T')[0],
      })),
    };
  }

  /**
   * Admin list of rooms (all rooms that are not soft-deleted)
   */
  async getAdminRooms() {
    const rooms = await prisma.room.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        images: {
          orderBy: { isPrimary: 'desc' },
        },
        facilities: {
          include: { facility: true },
        },
        units: {
          orderBy: { unitNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = await this.getUnitStats(rooms.map((r) => r.id));
    return rooms.map((r) => this.formatRoom(r, stats.get(r.id.toString()), true));
  }

  /**
   * Admin detail of a room
   */
  async getAdminRoomById(id: string) {
    if (!/^\d+$/.test(id)) {
      throw new Error('ROOM_NOT_FOUND');
    }

    const room = await prisma.room.findFirst({
      where: {
        id: BigInt(id),
        deletedAt: null,
      },
      include: {
        images: {
          orderBy: { isPrimary: 'desc' },
        },
        facilities: {
          include: { facility: true },
        },
        units: {
          orderBy: { unitNumber: 'asc' },
        },
      },
    });

    if (!room) {
      throw new Error('ROOM_NOT_FOUND');
    }

    const stats = await this.getUnitStats([room.id]);
    return this.formatRoom(room, stats.get(room.id.toString()), true);
  }

  /**
   * Admin create room type (+ auto-generate its physical units e.g. 101, 102 or 401, 402)
   */
  async createRoom(data: CreateRoomInput) {
    const totalUnits = Math.max(1, Math.min(data.totalUnits ?? 1, 100));

    return prisma.$transaction(async (tx) => {
      const existingActiveCount = await tx.room.count({
        where: { deletedAt: null },
      });

      const room = await tx.room.create({
        data: {
          name: data.name.trim(),
          description: data.description?.trim() || null,
          pricePerNight: new Prisma.Decimal(data.pricePerNight),
          capacity: data.capacity,
          status: data.status || RoomStatus.Available,
        },
      });

      const baseSeries = (existingActiveCount + 1) * 100;

      await tx.roomUnit.createMany({
        data: Array.from({ length: totalUnits }, (_, i) => ({
          roomId: room.id,
          unitNumber: String(baseSeries + i + 1),
        })),
      });

      if (data.facilityIds && data.facilityIds.length > 0) {
        await tx.facilityRoom.createMany({
          data: data.facilityIds.map((fId) => ({
            roomId: room.id,
            facilityId: BigInt(fId),
          })),
        });
      }

      const created = await tx.room.findUnique({
        where: { id: room.id },
        include: {
          images: true,
          facilities: { include: { facility: true } },
          units: { orderBy: { unitNumber: 'asc' } },
        },
      });

      return this.formatRoom(
        created,
        { totalUnits, activeUnits: totalUnits, availableUnits: totalUnits },
        true
      );
    });
  }

  /**
   * Admin update room type
   */
  async updateRoom(id: string, data: UpdateRoomInput) {
    if (!/^\d+$/.test(id)) {
      throw new Error('ROOM_NOT_FOUND');
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.room.findFirst({
        where: { id: BigInt(id), deletedAt: null },
      });

      if (!existing) {
        throw new Error('ROOM_NOT_FOUND');
      }

      await tx.room.update({
        where: { id: BigInt(id) },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description ? data.description.trim() : null }),
          ...(data.pricePerNight !== undefined && { pricePerNight: new Prisma.Decimal(data.pricePerNight) }),
          ...(data.capacity !== undefined && { capacity: data.capacity }),
          ...(data.status && { status: data.status }),
        },
      });

      if (data.facilityIds !== undefined) {
        // Delete existing facility relations
        await tx.facilityRoom.deleteMany({
          where: { roomId: BigInt(id) },
        });

        // Re-create new facility relations
        if (data.facilityIds.length > 0) {
          await tx.facilityRoom.createMany({
            data: data.facilityIds.map((fId) => ({
              roomId: BigInt(id),
              facilityId: BigInt(fId),
            })),
          });
        }
      }
    });

    return this.getAdminRoomById(id);
  }

  /**
   * Lock the room-type row so unit changes never race with a booking transaction (BR-07)
   */
  private async lockRoomRow(tx: Prisma.TransactionClient, roomId: bigint) {
    const rows = await tx.$queryRaw<{ id: bigint; deleted_at: Date | null }[]>`
      SELECT id, deleted_at FROM rooms WHERE id = ${roomId} FOR UPDATE
    `;
    if (!rows || rows.length === 0 || rows[0].deleted_at !== null) {
      throw new Error('ROOM_NOT_FOUND');
    }
  }

  /**
   * Admin add a physical unit to a room type
   */
  async addUnit(roomId: string, unitNumber: string) {
    if (!/^\d+$/.test(roomId)) {
      throw new Error('ROOM_NOT_FOUND');
    }
    const number = unitNumber.trim();

    await prisma.$transaction(async (tx) => {
      await this.lockRoomRow(tx, BigInt(roomId));

      const dup = await tx.roomUnit.findFirst({
        where: { roomId: BigInt(roomId), unitNumber: number },
        select: { id: true },
      });
      if (dup) {
        throw new Error('UNIT_NUMBER_EXISTS');
      }

      await tx.roomUnit.create({
        data: { roomId: BigInt(roomId), unitNumber: number },
      });
    });

    return this.getAdminRoomById(roomId);
  }

  /**
   * Admin update a unit (number and/or status Available <-> Maintenance)
   */
  async updateUnit(
    roomId: string,
    unitId: string,
    data: { unitNumber?: string; status?: RoomStatus }
  ) {
    if (!/^\d+$/.test(roomId) || !/^\d+$/.test(unitId)) {
      throw new Error('UNIT_NOT_FOUND');
    }

    await prisma.$transaction(async (tx) => {
      await this.lockRoomRow(tx, BigInt(roomId));

      const unit = await tx.roomUnit.findFirst({
        where: { id: BigInt(unitId), roomId: BigInt(roomId) },
      });
      if (!unit) {
        throw new Error('UNIT_NOT_FOUND');
      }

      if (data.unitNumber !== undefined) {
        const number = data.unitNumber.trim();
        const dup = await tx.roomUnit.findFirst({
          where: { roomId: BigInt(roomId), unitNumber: number, NOT: { id: unit.id } },
          select: { id: true },
        });
        if (dup) {
          throw new Error('UNIT_NUMBER_EXISTS');
        }
      }

      await tx.roomUnit.update({
        where: { id: unit.id },
        data: {
          ...(data.unitNumber !== undefined && { unitNumber: data.unitNumber.trim() }),
          ...(data.status && { status: data.status }),
        },
      });
    });

    return this.getAdminRoomById(roomId);
  }

  /**
   * Admin delete a unit. Units that were ever attached to a reservation cannot be deleted
   * (keeps invoice / history intact) - set them to Maintenance instead.
   */
  async deleteUnit(roomId: string, unitId: string) {
    if (!/^\d+$/.test(roomId) || !/^\d+$/.test(unitId)) {
      throw new Error('UNIT_NOT_FOUND');
    }

    await prisma.$transaction(async (tx) => {
      await this.lockRoomRow(tx, BigInt(roomId));

      const unit = await tx.roomUnit.findFirst({
        where: { id: BigInt(unitId), roomId: BigInt(roomId) },
      });
      if (!unit) {
        throw new Error('UNIT_NOT_FOUND');
      }

      const active = await tx.reservationUnit.count({
        where: {
          unitId: unit.id,
          reservation: { status: { in: ACTIVE_RESERVATION_STATUSES } },
        },
      });
      if (active > 0) {
        throw new Error('UNIT_HAS_ACTIVE_RESERVATIONS');
      }

      const history = await tx.reservationUnit.count({ where: { unitId: unit.id } });
      if (history > 0) {
        throw new Error('UNIT_HAS_HISTORY');
      }

      await tx.roomUnit.delete({ where: { id: unit.id } });
    });

    return this.getAdminRoomById(roomId);
  }

  /**
   * Admin soft-delete room (BR-12)
   */
  async deleteRoom(id: string) {
    const existing = await prisma.room.findFirst({
      where: { id: BigInt(id), deletedAt: null },
    });

    if (!existing) {
      throw new Error('ROOM_NOT_FOUND');
    }

    // Check if room has active reservations
    const activeReservationsCount = await prisma.reservation.count({
      where: {
        roomId: BigInt(id),
        status: {
          in: ['Pending', 'Confirmed', 'Checked_in'],
        },
      },
    });

    if (activeReservationsCount > 0) {
      throw new Error('ROOM_HAS_ACTIVE_RESERVATIONS');
    }

    // Soft delete: populate deletedAt
    await prisma.room.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  /**
   * Admin upload images to a room (SF-14 & BR-14)
   */
  async addImages(roomId: string, files: Express.Multer.File[]) {
    const room = await prisma.room.findFirst({
      where: { id: BigInt(roomId), deletedAt: null },
      include: { images: true },
    });

    if (!room) {
      throw new Error('ROOM_NOT_FOUND');
    }

    const hasPrimary = room.images.some((img) => img.isPrimary);

    const createdImages = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // File path for web access e.g. /uploads/rooms/filename.jpg
      const webPath = `/uploads/rooms/${file.filename}`;
      const isPrimary = !hasPrimary && i === 0;

      const img = await prisma.roomImage.create({
        data: {
          roomId: room.id,
          imagePath: webPath,
          isPrimary,
        },
      });

      createdImages.push({
        id: img.id.toString(),
        imagePath: img.imagePath,
        isPrimary: img.isPrimary,
      });
    }

    return createdImages;
  }

  /**
   * Admin set an image as primary (BR-14)
   */
  async setPrimaryImage(imageId: string) {
    const targetImage = await prisma.roomImage.findUnique({
      where: { id: BigInt(imageId) },
    });

    if (!targetImage) {
      throw new Error('IMAGE_NOT_FOUND');
    }

    await prisma.$transaction([
      prisma.roomImage.updateMany({
        where: { roomId: targetImage.roomId },
        data: { isPrimary: false },
      }),
      prisma.roomImage.update({
        where: { id: targetImage.id },
        data: { isPrimary: true },
      }),
    ]);

    return { success: true };
  }

  /**
   * Admin delete an image
   */
  async deleteImage(imageId: string) {
    const targetImage = await prisma.roomImage.findUnique({
      where: { id: BigInt(imageId) },
    });

    if (!targetImage) {
      throw new Error('IMAGE_NOT_FOUND');
    }

    // Try to remove file from disk
    try {
      const diskPath = path.join(process.cwd(), targetImage.imagePath);
      if (fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath);
      }
    } catch (e) {
      console.warn('Could not delete image file from disk:', e);
    }

    // Delete record
    await prisma.roomImage.delete({
      where: { id: targetImage.id },
    });

    // If it was primary, promote another image if available
    if (targetImage.isPrimary) {
      const remaining = await prisma.roomImage.findFirst({
        where: { roomId: targetImage.roomId },
        orderBy: { createdAt: 'asc' },
      });

      if (remaining) {
        await prisma.roomImage.update({
          where: { id: remaining.id },
          data: { isPrimary: true },
        });
      }
    }

    return { success: true };
  }
}
