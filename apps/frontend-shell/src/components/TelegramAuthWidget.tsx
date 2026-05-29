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
      if (data.connected) { setStatus('connected'); setPhone(data.phone ?? null); }
      else setStatus('disconnected');
    }).catch(() => setStatus('disconnected'));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setStep('idle'); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const reset = () => {
    setStep('idle'); setPhoneInput(''); setCodeInput('');
    setPasswordInput(''); setPhoneCodeHash(''); setError('');
  };

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
      if (msg.includes('2FA') || msg.includes('password')) setStep('2fa');
      else setError(msg || 'Invalid code');
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

  const inputClass = 'px-3 py-2 rounded-lg border border-[#ddd] text-sm outline-none w-full';
  const btnPrimaryClass = 'w-full py-2.5 rounded-lg bg-tg-blue text-white border-none cursor-pointer font-semibold text-sm disabled:opacity-60';

  return (
    <div className="relative" ref={panelRef}>
      {status === 'loading' && (
        <span className="text-xs px-2.5 py-1 rounded-xl bg-[#333] text-[#888] whitespace-nowrap">Telegram…</span>
      )}
      {status === 'connected' && (
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-xl bg-[#1a3a1a] text-[#4caf50] whitespace-nowrap">✓ {phone ?? 'Telegram'}</span>
          <button
            className="text-xs px-2.5 py-1 rounded-lg bg-transparent border border-[#555] text-[#aaa] cursor-pointer"
            onClick={disconnect}
            disabled={busy}
          >
            Disconnect
          </button>
        </div>
      )}
      {status === 'disconnected' && step === 'idle' && (
        <button
          className="px-3.5 py-1.5 rounded-md bg-tg-blue text-white border-none cursor-pointer text-sm font-semibold"
          onClick={() => setStep('phone')}
        >
          Connect Telegram
        </button>
      )}

      {step !== 'idle' && (
        <div className="absolute top-[calc(100%+10px)] right-0 z-[1000] bg-white rounded-xl p-5 shadow-overlay w-[280px]">
          <button
            className="absolute top-2.5 right-3 bg-transparent border-none cursor-pointer text-[18px] text-[#aaa] leading-none"
            onClick={reset}
          >×</button>

          {step === 'phone' && (
            <form onSubmit={sendCode} className="flex flex-col gap-2.5">
              <div className="font-bold text-[15px] text-[#1c2733]">Connect Telegram</div>
              <div className="text-xs text-[#888]">Enter your phone number with country code</div>
              <input
                className={inputClass}
                placeholder="+79001234567"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                autoFocus
                required
              />
              {error && <div className="text-[#e53935] text-xs">{error}</div>}
              <button className={btnPrimaryClass} type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send code'}
              </button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={verifyCode} className="flex flex-col gap-2.5">
              <div className="font-bold text-[15px] text-[#1c2733]">Enter code</div>
              <div className="text-xs text-[#888]">Code sent to {phoneInput}</div>
              <input
                className={inputClass}
                placeholder="12345"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                autoFocus
                required
              />
              {error && <div className="text-[#e53935] text-xs">{error}</div>}
              <button className={btnPrimaryClass} type="submit" disabled={busy}>
                {busy ? 'Verifying…' : 'Confirm'}
              </button>
              <button
                type="button"
                className="bg-transparent border-none text-[#888] cursor-pointer text-sm text-center"
                onClick={() => setStep('phone')}
              >
                ← Back
              </button>
            </form>
          )}

          {step === '2fa' && (
            <form onSubmit={verify2fa} className="flex flex-col gap-2.5">
              <div className="font-bold text-[15px] text-[#1c2733]">Two-step verification</div>
              <div className="text-xs text-[#888]">Enter your cloud password</div>
              <input
                className={inputClass}
                type="password"
                placeholder="Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                required
              />
              {error && <div className="text-[#e53935] text-xs">{error}</div>}
              <button className={btnPrimaryClass} type="submit" disabled={busy}>
                {busy ? 'Verifying…' : 'Confirm'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
