import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Home from '../pages/public/Home';
import Rooms from '../pages/public/Rooms';
import { ProtectedRoute } from './ProtectedRoute';

// Placeholder for future protected pages
const GuestReservations = () => <h1>Guest Reservations (Protected)</h1>;
const AdminDashboard = () => <h1>Admin Dashboard (Protected - Admin Only)</h1>;

export const AppRoutes = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Guest Routes */}
        <Route path="/reservations" element={
          <ProtectedRoute roles={['Guest', 'Admin']}>
            <GuestReservations />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin/*" element={
          <ProtectedRoute roles={['Admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
};
