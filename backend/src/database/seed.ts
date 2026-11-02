import { PrismaClient, Role, RoomStatus, PaymentStatus, ReservationStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  await prisma.payment.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.roomImage.deleteMany();
  await prisma.facilityRoom.deleteMany();
  await prisma.room.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.user.deleteMany();

  // Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Homestay',
      email: 'admin@homestay.com',
      phoneNumber: '+6281234567890',
      password: hashedPassword,
      role: Role.Admin,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create Sample Guest
  const guestPassword = await bcrypt.hash('guest123', 10);
  const guest = await prisma.user.create({
    data: {
      name: 'Budi Santoso',
      email: 'guest@example.com',
      phoneNumber: '+6289876543210',
      password: guestPassword,
      role: Role.Guest,
    },
  });
  console.log('✅ Created guest user:', guest.email);

  // Create Facilities
  const facilities = await Promise.all([
    prisma.facility.create({
      data: { name: 'AC', icon: 'snowflake' },
    }),
    prisma.facility.create({
      data: { name: 'WiFi', icon: 'wifi' },
    }),
    prisma.facility.create({
      data: { name: 'TV', icon: 'tv' },
    }),
    prisma.facility.create({
      data: { name: 'Kamar Mandi Dalam', icon: 'bath' },
    }),
    prisma.facility.create({
      data: { name: 'Air Panas', icon: 'droplet' },
    }),
    prisma.facility.create({
      data: { name: 'Kulkas', icon: 'thermometer' },
    }),
  ]);
  console.log('✅ Created', facilities.length, 'facilities');

  // Create Rooms
  const rooms = await Promise.all([
    prisma.room.create({
      data: {
        name: 'Kamar Deluxe',
        description: 'Kamar nyaman dengan pemandangan taman, cocok untuk pasangan atau traveler solo.',
        pricePerNight: 350000,
        capacity: 2,
        status: RoomStatus.Available,
        facilities: {
          create: [
            { facilityId: facilities[0].id }, // AC
            { facilityId: facilities[1].id }, // WiFi
            { facilityId: facilities[2].id }, // TV
            { facilityId: facilities[3].id }, // Kamar Mandi Dalam
          ],
        },
      },
    }),
    prisma.room.create({
      data: {
        name: 'Kamar Family',
        description: 'Kamar luas untuk keluarga, dilengkapi 2 tempat tidur dan area duduk.',
        pricePerNight: 500000,
        capacity: 4,
        status: RoomStatus.Available,
        facilities: {
          create: [
            { facilityId: facilities[0].id }, // AC
            { facilityId: facilities[1].id }, // WiFi
            { facilityId: facilities[2].id }, // TV
            { facilityId: facilities[3].id }, // Kamar Mandi Dalam
            { facilityId: facilities[4].id }, // Air Panas
          ],
        },
      },
    }),
    prisma.room.create({
      data: {
        name: 'Suite Executive',
        description: 'Suite mewah dengan ruang tamu terpisah, balkon pribadi, dan fasilitas premium.',
        pricePerNight: 850000,
        capacity: 2,
        status: RoomStatus.Available,
        facilities: {
          create: [
            { facilityId: facilities[0].id }, // AC
            { facilityId: facilities[1].id }, // WiFi
            { facilityId: facilities[2].id }, // TV
            { facilityId: facilities[3].id }, // Kamar Mandi Dalam
            { facilityId: facilities[4].id }, // Air Panas
            { facilityId: facilities[5].id }, // Kulkas
          ],
        },
      },
    }),
  ]);
  console.log('✅ Created', rooms.length, 'rooms');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📝 Test Accounts:');
  console.log('   Admin: admin@homestay.com / admin123');
  console.log('   Guest: guest@example.com / guest123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
