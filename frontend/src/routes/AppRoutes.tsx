import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Home from '../pages/public/Home';
import Rooms from '../pages/public/Rooms';
import RoomDetail from '../pages/public/RoomDetail';
import Booking from '../pages/guest/Booking';
import { ProtectedRoute } from './ProtectedRoute';
import AdminDashboard from '../pages/admin/Dashboard';
import AdminRooms from '../pages/admin/Rooms';
import AdminRoomGallery from '../pages/admin/RoomGallery';
import AdminFacilities from '../pages/admin/Facilities';

// Placeholder for future protected pages
const GuestReservations = () => <h1>Guest Reservations (Protected)</h1>;

export const AppRoutes = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/search" element={<Rooms />} />
        <Route path="/rooms/:id" element={<RoomDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Guest Routes */}
        <Route path="/booking/:roomId" element={
          <ProtectedRoute roles={['Guest', 'Admin']}>
            <Booking />
          </ProtectedRoute>
        } />
        <Route path="/reservations" element={
          <ProtectedRoute roles={['Guest', 'Admin']}>
            <GuestReservations />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['Admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/rooms" element={
          <ProtectedRoute roles={['Admin']}>
            <AdminRooms />
          </ProtectedRoute>
        } />
        <Route path="/admin/rooms/:id/gallery" element={
          <ProtectedRoute roles={['Admin']}>
            <AdminRoomGallery />
          </ProtectedRoute>
        } />
        <Route path="/admin/facilities" element={
          <ProtectedRoute roles={['Admin']}>
            <AdminFacilities />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
};
