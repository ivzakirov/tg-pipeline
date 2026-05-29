import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { authStore } from '../auth/auth-store';
import TelegramAuthWidget from './TelegramAuthWidget';

function initTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
  const theme = saved ?? 'light';
  document.documentElement.classList.toggle('dark', theme === 'dark');
  return theme;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `font-medium text-[15px] no-underline ${isActive ? 'text-tg-blue' : 'text-white hover:text-white/80'}`;

export default function Layout() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'light' | 'dark'>(initTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
    window.dispatchEvent(new CustomEvent('theme-change', { detail: theme }));
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const handleLogout = () => {
    authStore.clearToken();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen">
      <nav className="flex items-center gap-6 px-6 h-14 bg-tg-nav dark:bg-tg-nav-dark flex-shrink-0">
        <span className="text-white font-bold text-lg mr-auto">TG Pipeline</span>
        <div className="flex gap-6">
          <NavLink to="/" className={navLinkClass} end>Messages</NavLink>
          <NavLink to="/pipelines" className={navLinkClass}>Pipelines</NavLink>
        </div>
        <TelegramAuthWidget />
        <button
          className="bg-transparent border border-[#555] text-[#ccc] px-3 py-1 rounded-md cursor-pointer text-xs tracking-wide"
          onClick={toggleTheme}
          title="Toggle theme"
        >
          {theme === 'dark' ? '◑ Light' : '◐ Dark'}
        </button>
        <button
          className="bg-transparent border border-[#555] text-[#aaa] px-3.5 py-1.5 rounded-md cursor-pointer text-sm"
          onClick={handleLogout}
        >
          Logout
        </button>
      </nav>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
