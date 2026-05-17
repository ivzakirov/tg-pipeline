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

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>TG Pipeline</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p style={styles.footer}>
          Already have an account? <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
  card: { background: '#fff', padding: '40px', borderRadius: '12px', width: '360px', boxShadow: '0 4px 24px rgba(0,0,0,.08)' },
  title: { fontSize: '24px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', outline: 'none' },
  button: { padding: '12px', borderRadius: '8px', background: '#2AABEE', color: '#fff', border: 'none', fontSize: '15px', fontWeight: 600, cursor: 'pointer' },
  error: { color: '#e53935', fontSize: '13px' },
  footer: { marginTop: '16px', textAlign: 'center', fontSize: '14px', color: '#666' },
  link: { color: '#2AABEE', textDecoration: 'none' },
};
