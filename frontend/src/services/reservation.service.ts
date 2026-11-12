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
  bookingCode: string | null;
  userId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guestCount: number;
  roomCount: number;
  units?: { id: string; unitNumber: string }[];
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
  eligibility?: CheckInEligibility;
}

export interface CheckInEligibility {
  canCheckIn: boolean;
  canCheckOut: boolean;
  code:
    | 'ELIGIBLE'
    | 'ALREADY_CHECKED_IN'
    | 'ALREADY_COMPLETED'
    | 'RESERVATION_CANCELLED'
    | 'PAYMENT_NOT_SETTLED'
    | 'CHECKIN_DATE_TOO_EARLY'
    | 'CHECKIN_DATE_PASSED'
    | string;
  reason: string | null;
  todayWib: string;
}

export interface AdminReservationsResponse {
  items: Reservation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total: number;
    pending: number;
    confirmed: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
    arrivingToday: number;
  };
  todayWib: string;
}

export interface CheckInLookupResponse {
  reservation: Reservation;
  eligibility: CheckInEligibility;
}

export interface CreateReservationPayload {
  room_id: string | number;
  check_in_date: string;
  check_out_date: string;
  guest_count: number;
  room_count?: number;
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

  cancelReservation: async (id: string): Promise<Reservation> => {
    const res = await apiService.post<ApiResponse<Reservation>>(
      `/reservations/${id}/cancel`
    );
    return res.data;
  },

  downloadInvoice: async (id: string, bookingCode?: string | null): Promise<void> => {
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

  // --- Admin M7 Endpoints (SF-15, SF-16, BR-10, BR-11) ---

  getAdminReservations: async (params?: {
    status?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminReservationsResponse> => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'All') query.set('status', params.status);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const res = await apiService.get<ApiResponse<AdminReservationsResponse>>(
      `/admin/reservations${qs ? `?${qs}` : ''}`
    );
    return res.data;
  },

  getAdminReservationById: async (id: string): Promise<Reservation> => {
    const res = await apiService.get<ApiResponse<Reservation>>(
      `/admin/reservations/${id}`
    );
    return res.data;
  },

  lookupCheckIn: async (code: string): Promise<CheckInLookupResponse> => {
    const res = await apiService.get<ApiResponse<CheckInLookupResponse>>(
      `/admin/checkin/lookup?code=${encodeURIComponent(code.trim())}`
    );
    return res.data;
  },

  checkInReservation: async (id: string): Promise<CheckInLookupResponse> => {
    const res = await apiService.post<ApiResponse<CheckInLookupResponse>>(
      `/admin/reservations/${id}/check-in`
    );
    return res.data;
  },

  checkOutReservation: async (id: string): Promise<CheckInLookupResponse> => {
    const res = await apiService.post<ApiResponse<CheckInLookupResponse>>(
      `/admin/reservations/${id}/check-out`
    );
    return res.data;
  },
};
