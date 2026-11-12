import PDFDocument from 'pdfkit';
import prisma from '../config/database';

const formatRupiah = (n: number): string => {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
};

const formatDateID = (d: Date): string => {
  const dateStr = d.toISOString().split('T')[0];
  const [y, m, day] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatDateTimeID = (d: Date): string => {
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export class InvoiceService {
  /**
   * Generate PDF Invoice for a settled reservation (SF-9, BR-12, BR-15)
   */
  async generateInvoicePdf(
    idOrCode: string,
    requesterUserId: string,
    requesterRole: string
  ): Promise<{ buffer: Buffer; filename: string; bookingCode: string }> {
    const isNumericId = /^\d+$/.test(idOrCode);

    const reservation = await prisma.reservation.findFirst({
      where: isNumericId
        ? { id: BigInt(idOrCode) }
        : { bookingCode: idOrCode.toUpperCase() },
      include: {
        user: true,
        room: true, // BR-12: Soft-deleted rooms are still fetched via FK relation so room.name is preserved
        payment: true,
        units: { include: { unit: true } },
      },
    });

    if (!reservation) {
      throw new Error('RESERVATION_NOT_FOUND');
    }

    // BR-15 & PRD §10.4: Only the reservation owner (or Admin) can download the invoice
    if (requesterRole !== 'Admin' && reservation.userId.toString() !== requesterUserId) {
      throw new Error('FORBIDDEN_RESERVATION_ACCESS');
    }

    // BR-15 & SF-9: Invoice is ONLY available when payment status is Settlement
    if (!reservation.payment || reservation.payment.status !== 'Settlement') {
      throw new Error('INVOICE_NOT_AVAILABLE');
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

    const pricePerNight = Number(reservation.room.pricePerNight);
    const totalPrice = Number(reservation.totalPrice);
    const roomCount = Math.max(1, reservation.roomCount || 1);
    const unitNumbers = reservation.units
      .map((ru) => ru.unit.unitNumber)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const invoiceNumber = `INV/${reservation.bookingCode.replace('HSR-', '')}`;
    const filename = `Invoice-${reservation.bookingCode}.pdf`;

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        // --- Header Banner ---
        doc
          .fillColor('#5C4033')
          .font('Helvetica-Bold')
          .fontSize(22)
          .text('HOMESTAY KITA', 50, 50);

        doc
          .fillColor('#556B2F')
          .font('Helvetica')
          .fontSize(10)
          .text('Penginapan Hangat Bernuansa Lokal • Bukti Pembayaran Resmi', 50, 76);

        // Paid Stamp Box on top right
        doc
          .roundedRect(400, 48, 145, 38, 6)
          .fillAndStroke('#ECFDF5', '#10B981');
        doc
          .fillColor('#047857')
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('LUNAS (SETTLEMENT)', 400, 62, { width: 145, align: 'center' });

        // Divider Line
        doc
          .moveTo(50, 105)
          .lineTo(545, 105)
          .strokeColor('#E5E0D8')
          .lineWidth(1.5)
          .stroke();

        // --- Invoice & Booking Metadata ---
        const metaTop = 122;
        doc.fillColor('#6B7280').font('Helvetica').fontSize(9);
        doc.text('NOMOR INVOICE', 50, metaTop);
        doc.text('KODE BOOKING (TIKET CHECK-IN)', 210, metaTop);
        doc.text('TANGGAL PEMBAYARAN', 400, metaTop);

        doc.fillColor('#1F2937').font('Helvetica-Bold').fontSize(11);
        doc.text(invoiceNumber, 50, metaTop + 14);
        doc.fillColor('#556B2F').text(reservation.bookingCode, 210, metaTop + 14);
        doc
          .fillColor('#1F2937')
          .font('Helvetica')
          .fontSize(10)
          .text(formatDateTimeID(reservation.payment!.updatedAt), 400, metaTop + 14);

        // --- Guest & Payment Info Two-Column Box ---
        const infoTop = 170;
        doc
          .roundedRect(50, infoTop, 235, 95, 8)
          .fillAndStroke('#FAF7F2', '#E5E0D8');
        doc
          .roundedRect(310, infoTop, 235, 95, 8)
          .fillAndStroke('#FAF7F2', '#E5E0D8');

        // Left Box: Data Tamu
        doc
          .fillColor('#5C4033')
          .font('Helvetica-Bold')
          .fontSize(10)
          .text('DATA TAMU PEMESAN', 64, infoTop + 14);
        doc.fillColor('#374151').font('Helvetica').fontSize(9.5);
        doc.text(`Nama   : ${reservation.user.name}`, 64, infoTop + 34);
        doc.text(`Email  : ${reservation.user.email}`, 64, infoTop + 50);
        doc.text(`Telepon: ${reservation.user.phoneNumber}`, 64, infoTop + 66);

        // Right Box: Detail Transaksi
        const paymentMethod = (reservation.payment!.paymentType || 'Online Payment')
          .replace(/_/g, ' ')
          .toUpperCase();
        const txId = reservation.payment!.transactionId || '-';

        doc
          .fillColor('#5C4033')
          .font('Helvetica-Bold')
          .fontSize(10)
          .text('DETAIL TRANSAKSI PEMBAYARAN', 324, infoTop + 14);
        doc.fillColor('#374151').font('Helvetica').fontSize(9.5);
        doc.text(`Metode Bayar   : ${paymentMethod}`, 324, infoTop + 34);
        doc.text(`Status Reservasi: ${reservation.status.replace('_', '-')}`, 324, infoTop + 50);
        doc.text(`ID Transaksi   : ${txId.substring(0, 26)}`, 324, infoTop + 66);

        // --- Stay Schedule Section ---
        const stayTop = 285;
        doc
          .fillColor('#5C4033')
          .font('Helvetica-Bold')
          .fontSize(11)
          .text('RINCIAN JADWAL MENGINAP', 50, stayTop);

        doc
          .roundedRect(50, stayTop + 18, 495, 68, 8)
          .fillAndStroke('#FFFFFF', '#E5E0D8');

        doc.fillColor('#6B7280').font('Helvetica').fontSize(9);
        doc.text('CHECK-IN (MULAI 14:00 WIB)', 66, stayTop + 30);
        doc.text('CHECK-OUT (MAKS. 12:00 WIB)', 245, stayTop + 30);
        doc.text('DURASI & TAMU', 425, stayTop + 30);

        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10);
        doc.text(formatDateID(reservation.checkInDate), 66, stayTop + 46, { width: 165 });
        doc.text(formatDateID(reservation.checkOutDate), 245, stayTop + 46, { width: 165 });
        doc.text(`${nights} Malam (${reservation.guestCount} Tamu)`, 425, stayTop + 46);

        // --- Itemized Pricing Table ---
        const tableTop = 395;
        doc
          .roundedRect(50, tableTop, 495, 28, 6)
          .fill('#5C4033');

        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9.5);
        doc.text('DESKRIPSI KAMAR', 66, tableTop + 9);
        doc.text('HARGA / MALAM', 265, tableTop + 9, { width: 90, align: 'right' });
        doc.text('MALAM x KAMAR', 360, tableTop + 9, { width: 75, align: 'center' });
        doc.text('SUBTOTAL', 440, tableTop + 9, { width: 90, align: 'right' });

        // Table Row
        const rowTop = tableTop + 38;
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10.5);
        doc.text(`${reservation.room.name} - ${roomCount} Kamar`, 66, rowTop, { width: 190 });
        doc
          .fillColor('#6B7280')
          .font('Helvetica')
          .fontSize(8.5)
          .text(
            `Unit: ${unitNumbers.length > 0 ? unitNumbers.join(', ') : '-'} | Kapasitas ${reservation.room.capacity} Tamu/kamar`,
            66,
            rowTop + 15,
            { width: 190 }
          );

        doc.fillColor('#111827').font('Helvetica').fontSize(10);
        doc.text(formatRupiah(pricePerNight), 265, rowTop + 4, { width: 90, align: 'right' });
        doc.text(`${nights} x ${roomCount}`, 360, rowTop + 4, { width: 75, align: 'center' });
        doc
          .font('Helvetica-Bold')
          .text(formatRupiah(totalPrice), 440, rowTop + 4, { width: 90, align: 'right' });

        doc
          .moveTo(50, rowTop + 38)
          .lineTo(545, rowTop + 38)
          .strokeColor('#E5E0D8')
          .lineWidth(1)
          .stroke();

        // Total Box
        const totalBoxTop = rowTop + 50;
        doc
          .roundedRect(310, totalBoxTop, 235, 42, 8)
          .fillAndStroke('#F3F6EE', '#556B2F');

        doc
          .fillColor('#5C4033')
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .text('TOTAL DIBAYARKAN', 324, totalBoxTop + 15);

        doc
          .fillColor('#556B2F')
          .font('Helvetica-Bold')
          .fontSize(13)
          .text(formatRupiah(totalPrice), 415, totalBoxTop + 14, {
            width: 115,
            align: 'right',
          });

        // --- Check-in Instructions Footer ---
        const footerTop = totalBoxTop + 70;
        doc
          .roundedRect(50, footerTop, 495, 58, 8)
          .fillAndStroke('#FAF7F2', '#E5E0D8');

        doc
          .fillColor('#5C4033')
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .text('INFORMASI PENTING SAAT CHECK-IN:', 66, footerTop + 12);

        doc
          .fillColor('#4B5563')
          .font('Helvetica')
          .fontSize(9)
          .text(
            `1. Tunjukkan Kode Booking (${reservation.bookingCode}) atau dokumen Invoice ini kepada petugas resepsionis saat tiba.\n2. Waktu Check-in dimulai pukul 14:00 WIB pada tanggal check-in yang tertera.`,
            66,
            footerTop + 26,
            { lineGap: 3 }
          );

        doc
          .fillColor('#9CA3AF')
          .font('Helvetica')
          .fontSize(8.5)
          .text(
            'Dokumen ini diterbitkan secara elektronik oleh Sistem Informasi Reservasi Homestay Kita dan sah tanpa tanda tangan basah.',
            50,
            footerTop + 80,
            { width: 495, align: 'center' }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    return {
      buffer,
      filename,
      bookingCode: reservation.bookingCode,
    };
  }
}

export default new InvoiceService();
