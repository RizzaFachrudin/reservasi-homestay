import prisma from '../config/database';

export interface CreateFacilityInput {
  name: string;
  icon?: string;
}

export interface UpdateFacilityInput {
  name?: string;
  icon?: string;
}

export class FacilityService {
  async getAll() {
    const facilities = await prisma.facility.findMany({
      orderBy: { name: 'asc' },
    });

    return facilities.map((f) => ({
      id: f.id.toString(),
      name: f.name,
      icon: f.icon,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));
  }

  async getById(id: string) {
    const facility = await prisma.facility.findUnique({
      where: { id: BigInt(id) },
    });

    if (!facility) {
      throw new Error('FACILITY_NOT_FOUND');
    }

    return {
      id: facility.id.toString(),
      name: facility.name,
      icon: facility.icon,
      createdAt: facility.createdAt,
      updatedAt: facility.updatedAt,
    };
  }

  async create(data: CreateFacilityInput) {
    const existing = await prisma.facility.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new Error('FACILITY_EXISTS');
    }

    const facility = await prisma.facility.create({
      data: {
        name: data.name.trim(),
        icon: data.icon?.trim() || null,
      },
    });

    return {
      id: facility.id.toString(),
      name: facility.name,
      icon: facility.icon,
      createdAt: facility.createdAt,
      updatedAt: facility.updatedAt,
    };
  }

  async update(id: string, data: UpdateFacilityInput) {
    const existing = await prisma.facility.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      throw new Error('FACILITY_NOT_FOUND');
    }

    if (data.name && data.name.trim() !== existing.name) {
      const duplicate = await prisma.facility.findUnique({
        where: { name: data.name.trim() },
      });
      if (duplicate) {
        throw new Error('FACILITY_EXISTS');
      }
    }

    const updated = await prisma.facility.update({
      where: { id: BigInt(id) },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.icon !== undefined && { icon: data.icon ? data.icon.trim() : null }),
      },
    });

    return {
      id: updated.id.toString(),
      name: updated.name,
      icon: updated.icon,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async delete(id: string) {
    const existing = await prisma.facility.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      throw new Error('FACILITY_NOT_FOUND');
    }

    // Cascade relation will automatically delete facility_room records
    await prisma.facility.delete({
      where: { id: BigInt(id) },
    });

    return { success: true };
  }
}
