import apiService from './api.service';
import { Room } from './room.service';

export interface PaymentInfo {
  id: string;
  reservationId: string;
  transactionId: string | null;
  paymentType: string | null;
  amount: number;
  status: 'Pending' | 'Settlement' | 'Expire' | 'Cancel';
  createdAt: string;
  updatedAt: string;
}

export interface Reservation {
  id: string;
  bookingCode: string;
  userId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guestCount: number;
  totalPrice: number;
  status: 'Pending' | 'Confirmed' | 'Checked-in' | 'Completed' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  room?: Room;
  payment?: PaymentInfo | null;
}

export interface CreateReservationPayload {
  room_id: string | number;
  check_in_date: string;
  check_out_date: string;
  guest_count: number;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const reservationService = {
  createReservation: async (payload: CreateReservationPayload): Promise<Reservation> => {
    const res = await apiService.post<ApiResponse<Reservation>>('/reservations', payload);
    return res.data;
  },

  getMyReservations: async (): Promise<Reservation[]> => {
    const res = await apiService.get<ApiResponse<Reservation[]>>('/reservations/me');
    return res.data;
  },

  getReservationById: async (id: string): Promise<Reservation> => {
    const res = await apiService.get<ApiResponse<Reservation>>(`/reservations/${id}`);
    return res.data;
  },
};
