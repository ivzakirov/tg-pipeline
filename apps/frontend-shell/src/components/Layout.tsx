import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { authStore } from '../auth/auth-store';

function initTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
  const theme = saved ?? 'light';
  document.documentElement.classList.toggle('dark', theme === 'dark');
  return theme;
}

export default function Layout() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'light' | 'dark'>(initTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
    window.dispatchEvent(new CustomEvent('theme-change', { detail: theme }));
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const handleLogout = async () => {
    authStore.clearToken();
    navigate('/login');
  };

  return (
    <div style={styles.root}>
      <nav style={{ ...styles.nav, background: 'var(--bg-nav)' }}>
        <span style={styles.logo}>TG Pipeline</span>
        <div style={styles.links}>
          <NavLink to="/" style={navStyle} end>Messages</NavLink>
          <NavLink to="/pipelines" style={navStyle}>Pipelines</NavLink>
        </div>
        <button style={styles.themeBtn} onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? '◑ Light' : '◐ Dark'}
        </button>
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
  nav: { display: 'flex', alignItems: 'center', gap: '24px', padding: '0 24px', height: '56px' },
  logo: { color: '#fff', fontWeight: 700, fontSize: '18px', marginRight: 'auto' },
  links: { display: 'flex', gap: '24px' },
  themeBtn: { background: 'none', border: '1px solid #555', color: '#ccc', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', letterSpacing: '0.3px' },
  logout: { background: 'none', border: '1px solid #555', color: '#aaa', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  main: { flex: 1, overflow: 'hidden' },
};
