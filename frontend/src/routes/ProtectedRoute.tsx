import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

/**
 * ProtectedRoute: Wraps components that require authentication.
 * If roles are provided, it also checks the user's role.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login with the current location for redirection after login
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    // Role not authorized, redirect to home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
