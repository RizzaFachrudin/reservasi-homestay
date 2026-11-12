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

export interface SnapPaymentResponse {
  snapToken: string;
  redirectUrl: string;
  clientKey: string;
  bookingCode: string;
  amount: number;
  reused: boolean;
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

  getReservationById: async (id: string, sync: boolean = false): Promise<Reservation> => {
    const url = sync ? `/reservations/${id}?sync=true` : `/reservations/${id}`;
    const res = await apiService.get<ApiResponse<Reservation>>(url);
    return res.data;
  },

  initiatePayment: async (id: string): Promise<SnapPaymentResponse> => {
    const res = await apiService.post<ApiResponse<SnapPaymentResponse>>(
      `/reservations/${id}/pay`
    );
    return res.data;
  },

  syncPaymentStatus: async (id: string): Promise<Reservation> => {
    const res = await apiService.post<ApiResponse<Reservation>>(
      `/reservations/${id}/sync`
    );
    return res.data;
  },

  downloadInvoice: async (id: string, bookingCode?: string): Promise<void> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/reservations/${id}/invoice`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      let errMsg = 'Gagal mengunduh invoice PDF';
      try {
        const errJson = await response.json();
        if (errJson?.message) errMsg = errJson.message;
      } catch {
        // ignore JSON parse error
      }
      throw new Error(errMsg);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Invoice-${bookingCode || id}.pdf`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
