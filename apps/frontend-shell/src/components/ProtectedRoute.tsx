import React from 'react';
import { Navigate } from 'react-router-dom';
import { authStore } from '../auth/auth-store';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!authStore.isAuthenticated()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
