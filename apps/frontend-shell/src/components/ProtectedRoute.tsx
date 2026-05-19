import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authStore } from '../auth/auth-store';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'no'>(() =>
    authStore.isAuthenticated() ? 'ok' : 'loading',
  );

  useEffect(() => {
    if (status !== 'loading') return;
    authStore.tryRestore().then((ok) => setStatus(ok ? 'ok' : 'no'));
  }, []);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#aaa', fontSize: '15px' }}>
        Loading...
      </div>
    );
  }

  if (status === 'no') return <Navigate to="/login" replace />;
  return <>{children}</>;
}
