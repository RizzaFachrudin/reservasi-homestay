import apiService from './api.service';
import { Facility } from './facility.service';

export interface RoomImage {
  id: string;
  imagePath: string;
  isPrimary: boolean;
}

export interface Room {
  id: string;
  name: string;
  description?: string | null;
  pricePerNight: number;
  capacity: number;
  status: 'Available' | 'Maintenance';
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  images: RoomImage[];
  primaryImage: string | null;
  facilities: Facility[];
  nights?: number;
  totalPrice?: number;
}

export interface RoomAvailabilityResponse {
  roomId: string;
  month: string;
  bookedDates: string[];
  reservations: {
    checkInDate: string;
    checkOutDate: string;
  }[];
}

export interface RoomPayload {
  name: string;
  description?: string | null;
  pricePerNight: number;
  capacity: number;
  status?: 'Available' | 'Maintenance';
  facilityIds?: (string | number)[];
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const roomService = {
  // Public
  getPublicRooms: async (featured?: boolean): Promise<Room[]> => {
    const url = featured ? '/rooms?featured=true' : '/rooms';
    const res = await apiService.get<ApiResponse<Room[]>>(url);
    return res.data;
  },

  getPublicRoomById: async (id: string): Promise<Room> => {
    const res = await apiService.get<ApiResponse<Room>>(`/rooms/${id}`);
    return res.data;
  },

  getAvailableRooms: async (params: {
    check_in: string;
    check_out: string;
    guests?: number | string;
  }): Promise<Room[]> => {
    const query = new URLSearchParams({
      check_in: params.check_in,
      check_out: params.check_out,
      ...(params.guests ? { guests: String(params.guests) } : {}),
    });
    const res = await apiService.get<ApiResponse<Room[]>>(`/rooms/available?${query.toString()}`);
    return res.data;
  },

  getRoomAvailability: async (id: string, month?: string): Promise<RoomAvailabilityResponse> => {
    const url = month
      ? `/rooms/${id}/availability?month=${encodeURIComponent(month)}`
      : `/rooms/${id}/availability`;
    const res = await apiService.get<ApiResponse<RoomAvailabilityResponse>>(url);
    return res.data;
  },

  // Admin
  getAdminRooms: async (): Promise<Room[]> => {
    const res = await apiService.get<ApiResponse<Room[]>>('/admin/rooms');
    return res.data;
  },

  getAdminRoomById: async (id: string): Promise<Room> => {
    const res = await apiService.get<ApiResponse<Room>>(`/admin/rooms/${id}`);
    return res.data;
  },

  createRoom: async (payload: RoomPayload): Promise<Room> => {
    const res = await apiService.post<ApiResponse<Room>>('/admin/rooms', payload);
    return res.data;
  },

  updateRoom: async (id: string, payload: RoomPayload): Promise<Room> => {
    const res = await apiService.put<ApiResponse<Room>>(`/admin/rooms/${id}`, payload);
    return res.data;
  },

  deleteRoom: async (id: string): Promise<void> => {
    await apiService.delete<ApiResponse<null>>(`/admin/rooms/${id}`);
  },

  uploadRoomImages: async (id: string, formData: FormData): Promise<RoomImage[]> => {
    const res = await apiService.post<ApiResponse<RoomImage[]>>(
      `/admin/rooms/${id}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },

  setPrimaryImage: async (imageId: string): Promise<void> => {
    await apiService.patch<ApiResponse<null>>(`/admin/images/${imageId}/primary`);
  },

  deleteImage: async (imageId: string): Promise<void> => {
    await apiService.delete<ApiResponse<null>>(`/admin/images/${imageId}`);
  },
};
