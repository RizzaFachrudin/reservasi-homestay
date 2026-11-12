import React from 'react';
import { DoorOpen } from 'lucide-react';
import { Room } from '../services/room.service';

interface Props {
  room: Pick<Room, 'availableUnits' | 'totalUnits' | 'activeUnits'>;
  className?: string;
}

/**
 * Real-time stock badge for a room type (remaining units / total units).
 */
const RoomStockBadge: React.FC<Props> = ({ room, className = '' }) => {
  const available = room.availableUnits;
  const total = room.totalUnits;
  if (available === undefined || total === undefined) return null;

  let tone = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let label = `Tersedia ${available} dari ${total} Kamar`;

  if (available <= 0) {
    tone = 'bg-red-50 text-red-700 border-red-200';
    label = 'Penuh / Habis';
  } else if (available === 1) {
    tone = 'bg-amber-50 text-amber-800 border-amber-200';
    label = 'Sisa 1 Kamar Lagi!';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${tone} ${className}`}
    >
      <DoorOpen size={12} />
      {label}
    </span>
  );
};

export default RoomStockBadge;
