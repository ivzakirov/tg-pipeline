import React, { useEffect, useRef, useState } from 'react';
import api from '../api/axios';

type Step = 'idle' | 'phone' | 'code' | '2fa';
type Status = 'loading' | 'connected' | 'disconnected';

export default function TelegramAuthWidget() {
  const [status, setStatus] = useState<Status>('loading');
  const [phone, setPhone] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('idle');
  const [phoneInput, setPhoneInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/telegram-auth/status').then(({ data }) => {
      if (data.connected) {
        setStatus('connected');
        setPhone(data.phone ?? null);
      } else {
        setStatus('disconnected');
      }
    }).catch(() => setStatus('disconnected'));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setStep('idle'); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const reset = () => { setStep('idle'); setPhoneInput(''); setCodeInput(''); setPasswordInput(''); setPhoneCodeHash(''); setError(''); };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/telegram-auth/send-code', { phone: phoneInput });
      setPhoneCodeHash(data.phoneCodeHash);
      setStep('code');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to send code');
    } finally { setBusy(false); }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/telegram-auth/verify-code', { phone: phoneInput, code: codeInput, phoneCodeHash });
      setStatus('connected'); setPhone(phoneInput); reset();
    } catch (err: any) {
      const msg = err.response?.data?.message ?? '';
      if (msg.includes('2FA') || msg.includes('password')) {
        setStep('2fa');
      } else {
        setError(msg || 'Invalid code');
      }
    } finally { setBusy(false); }
  };

  const verify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/telegram-auth/verify-2fa', { password: passwordInput });
      setStatus('connected'); setPhone(phoneInput); reset();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Wrong password');
    } finally { setBusy(false); }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect Telegram account?')) return;
    setBusy(true);
    try {
      await api.delete('/telegram-auth');
      setStatus('disconnected'); setPhone(null);
    } finally { setBusy(false); }
  };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      {status === 'loading' && (
        <span style={styles.badge('gray')}>Telegram…</span>
      )}
      {status === 'connected' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={styles.badge('green')}>✓ {phone ?? 'Telegram'}</span>
          <button style={styles.btnSmall} onClick={disconnect} disabled={busy}>Disconnect</button>
        </div>
      )}
      {status === 'disconnected' && step === 'idle' && (
        <button style={styles.btnConnect} onClick={() => setStep('phone')}>Connect Telegram</button>
      )}

      {step !== 'idle' && (
        <div style={styles.panel}>
          <button style={styles.close} onClick={reset}>×</button>

          {step === 'phone' && (
            <form onSubmit={sendCode} style={styles.form}>
              <div style={styles.title}>Connect Telegram</div>
              <div style={styles.hint}>Enter your phone number with country code</div>
              <input
                style={styles.input}
                placeholder="+79001234567"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                autoFocus
                required
              />
              {error && <div style={styles.error}>{error}</div>}
              <button style={styles.btnPrimary} type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send code'}
              </button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={verifyCode} style={styles.form}>
              <div style={styles.title}>Enter code</div>
              <div style={styles.hint}>Code sent to {phoneInput}</div>
              <input
                style={styles.input}
                placeholder="12345"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                autoFocus
                required
              />
              {error && <div style={styles.error}>{error}</div>}
              <button style={styles.btnPrimary} type="submit" disabled={busy}>
                {busy ? 'Verifying…' : 'Confirm'}
              </button>
              <button type="button" style={styles.btnBack} onClick={() => setStep('phone')}>← Back</button>
            </form>
          )}

          {step === '2fa' && (
            <form onSubmit={verify2fa} style={styles.form}>
              <div style={styles.title}>Two-step verification</div>
              <div style={styles.hint}>Enter your cloud password</div>
              <input
                style={styles.input}
                type="password"
                placeholder="Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                required
              />
              {error && <div style={styles.error}>{error}</div>}
              <button style={styles.btnPrimary} type="submit" disabled={busy}>
                {busy ? 'Verifying…' : 'Confirm'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  badge: (color: 'green' | 'gray'): React.CSSProperties => ({
    fontSize: '12px',
    padding: '3px 10px',
    borderRadius: '12px',
    background: color === 'green' ? '#1a3a1a' : '#333',
    color: color === 'green' ? '#4caf50' : '#888',
    whiteSpace: 'nowrap',
  }),
  btnConnect: {
    padding: '6px 14px', borderRadius: '6px', background: '#2AABEE',
    color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
  } as React.CSSProperties,
  btnSmall: {
    padding: '3px 10px', borderRadius: '6px', background: 'none',
    border: '1px solid #555', color: '#aaa', cursor: 'pointer', fontSize: '12px',
  } as React.CSSProperties,
  panel: {
    position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 1000,
    background: '#fff', borderRadius: '10px', padding: '20px',
    boxShadow: '0 8px 32px rgba(0,0,0,.18)', width: '280px',
  } as React.CSSProperties,
  close: {
    position: 'absolute', top: '10px', right: '12px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '18px', color: '#aaa', lineHeight: 1,
  } as React.CSSProperties,
  form: { display: 'flex', flexDirection: 'column', gap: '10px' } as React.CSSProperties,
  title: { fontWeight: 700, fontSize: '15px', color: '#1c2733' },
  hint: { fontSize: '12px', color: '#888', marginTop: '-4px' },
  input: {
    padding: '9px 12px', borderRadius: '7px', border: '1px solid #ddd',
    fontSize: '14px', outline: 'none',
  } as React.CSSProperties,
  btnPrimary: {
    padding: '10px', borderRadius: '7px', background: '#2AABEE',
    color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
  } as React.CSSProperties,
  btnBack: {
    background: 'none', border: 'none', color: '#888', cursor: 'pointer',
    fontSize: '13px', textAlign: 'center',
  } as React.CSSProperties,
  error: { color: '#e53935', fontSize: '12px' },
};
