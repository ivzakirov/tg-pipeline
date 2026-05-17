import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { authStore } from '../auth/auth-store';
import api from '../api/axios';

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    authStore.clearToken();
    navigate('/login');
  };

  return (
    <div style={styles.root}>
      <nav style={styles.nav}>
        <span style={styles.logo}>TG Pipeline</span>
        <div style={styles.links}>
          <NavLink to="/" style={navStyle} end>Messages</NavLink>
          <NavLink to="/pipelines" style={navStyle}>Pipelines</NavLink>
        </div>
        <button style={styles.logout} onClick={handleLogout}>Logout</button>
      </nav>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

function navStyle({ isActive }: { isActive: boolean }): React.CSSProperties {
  return { color: isActive ? '#2AABEE' : '#fff', textDecoration: 'none', fontWeight: 500, fontSize: '15px' };
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh' },
  nav: { display: 'flex', alignItems: 'center', gap: '24px', padding: '0 24px', height: '56px', background: '#1c2733' },
  logo: { color: '#fff', fontWeight: 700, fontSize: '18px', marginRight: 'auto' },
  links: { display: 'flex', gap: '24px' },
  logout: { background: 'none', border: '1px solid #555', color: '#aaa', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  main: { flex: 1, overflow: 'hidden' },
};
