import apiService from './api.service';

export interface Facility {
  id: string;
  name: string;
  icon?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FacilityPayload {
  name: string;
  icon?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const facilityService = {
  // Public
  getPublicFacilities: async (): Promise<Facility[]> => {
    const res = await apiService.get<ApiResponse<Facility[]>>('/facilities');
    return res.data;
  },

  // Admin
  getAllFacilities: async (): Promise<Facility[]> => {
    const res = await apiService.get<ApiResponse<Facility[]>>('/admin/facilities');
    return res.data;
  },

  getFacilityById: async (id: string): Promise<Facility> => {
    const res = await apiService.get<ApiResponse<Facility>>(`/admin/facilities/${id}`);
    return res.data;
  },

  createFacility: async (payload: FacilityPayload): Promise<Facility> => {
    const res = await apiService.post<ApiResponse<Facility>>('/admin/facilities', payload);
    return res.data;
  },

  updateFacility: async (id: string, payload: FacilityPayload): Promise<Facility> => {
    const res = await apiService.put<ApiResponse<Facility>>(`/admin/facilities/${id}`, payload);
    return res.data;
  },

  deleteFacility: async (id: string): Promise<void> => {
    await apiService.delete<ApiResponse<null>>(`/admin/facilities/${id}`);
  },
};
