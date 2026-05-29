import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { authStore } from '../auth/auth-store';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/register', { email, password });
      authStore.setToken(data.accessToken);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'px-3.5 py-2.5 rounded-lg border border-tg-border-input dark:border-tg-border-input-dark text-[15px] outline-none bg-tg-input dark:bg-tg-input-dark text-tg-text dark:text-tg-text-dark w-full';

  return (
    <div className="flex items-center justify-center min-h-screen bg-tg-bg dark:bg-tg-bg-dark">
      <div className="bg-tg-surface dark:bg-tg-surface-dark p-10 rounded-xl w-[360px] shadow-card dark:shadow-card-dark">
        <h1 className="text-2xl font-bold mb-6 text-center text-tg-text dark:text-tg-text-dark">TG Pipeline</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            className={inputClass}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={inputClass}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <p className="text-[#e53935] text-sm">{error}</p>}
          <button
            className="py-3 rounded-lg bg-tg-blue text-white border-none text-[15px] font-semibold cursor-pointer disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-tg-text-sub dark:text-tg-text-sub-dark">
          Already have an account?{' '}
          <Link to="/login" className="text-tg-blue no-underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
