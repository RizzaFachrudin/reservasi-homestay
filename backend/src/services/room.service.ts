import fs from 'fs';
import path from 'path';
import { Prisma, RoomStatus } from '@prisma/client';
import prisma from '../config/database';

export interface CreateRoomInput {
  name: string;
  description?: string;
  pricePerNight: number;
  capacity: number;
  status?: RoomStatus;
  facilityIds?: (string | number)[];
}

export interface UpdateRoomInput {
  name?: string;
  description?: string;
  pricePerNight?: number;
  capacity?: number;
  status?: RoomStatus;
  facilityIds?: (string | number)[];
}

export class RoomService {
  /**
   * Helper format room data to JSON-safe structure (BigInt/Decimal to string/number)
   */
  private formatRoom(room: any) {
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
    };
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

    return rooms.map(this.formatRoom);
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

    return this.formatRoom(room);
  }

  /**
   * Public search for available rooms by date range and guest count (SF-4, BR-03, BR-04, BR-05)
   */
  async getAvailableRooms(checkInStr: string, checkOutStr: string, guests: number) {
    const checkInDate = new Date(`${checkInStr}T00:00:00.000Z`);
    const checkOutDate = new Date(`${checkOutStr}T00:00:00.000Z`);

    const nights = Math.round(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const rooms = await prisma.room.findMany({
      where: {
        deletedAt: null,
        status: RoomStatus.Available,
        capacity: {
          gte: guests,
        },
        reservations: {
          none: {
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
        },
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

    return rooms.map((room) => {
      const formatted = this.formatRoom(room);
      return {
        ...formatted,
        nights,
        totalPrice: formatted.pricePerNight * nights,
      };
    });
  }

  /**
   * Public room availability calendar per month (SF-4, SF-5, BR-04, BR-18)
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

    const reservations = await prisma.reservation.findMany({
      where: {
        roomId: BigInt(id),
        status: {
          in: ['Pending', 'Confirmed', 'Checked_in'],
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
      },
      orderBy: { checkInDate: 'asc' },
    });

    const bookedDatesSet = new Set<string>();

    for (const res of reservations) {
      const start = new Date(
        Math.max(res.checkInDate.getTime(), monthStart.getTime())
      );
      const end = new Date(
        Math.min(res.checkOutDate.getTime(), monthEnd.getTime())
      );

      const cursor = new Date(start);
      while (cursor < end) {
        bookedDatesSet.add(cursor.toISOString().split('T')[0]);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    return {
      roomId: id,
      month: monthStr,
      bookedDates: Array.from(bookedDatesSet).sort(),
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return rooms.map(this.formatRoom);
  }

  /**
   * Admin detail of a room
   */
  async getAdminRoomById(id: string) {
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
      },
    });

    if (!room) {
      throw new Error('ROOM_NOT_FOUND');
    }

    return this.formatRoom(room);
  }

  /**
   * Admin create room
   */
  async createRoom(data: CreateRoomInput) {
    return prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          name: data.name.trim(),
          description: data.description?.trim() || null,
          pricePerNight: new Prisma.Decimal(data.pricePerNight),
          capacity: data.capacity,
          status: data.status || RoomStatus.Available,
        },
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
        },
      });

      return this.formatRoom(created);
    });
  }

  /**
   * Admin update room
   */
  async updateRoom(id: string, data: UpdateRoomInput) {
    return prisma.$transaction(async (tx) => {
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

      const updated = await tx.room.findUnique({
        where: { id: BigInt(id) },
        include: {
          images: { orderBy: { isPrimary: 'desc' } },
          facilities: { include: { facility: true } },
        },
      });

      return this.formatRoom(updated);
    });
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
