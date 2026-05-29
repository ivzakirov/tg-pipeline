import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export type TelegramAuthStep = 'idle' | 'phone' | 'code' | '2fa';
export type TelegramAuthStatus = 'loading' | 'connected' | 'disconnected';

export interface TelegramAuthState {
  status: TelegramAuthStatus;
  phone: string | null;
  step: TelegramAuthStep;
  phoneInput: string;
  codeInput: string;
  passwordInput: string;
  error: string;
  busy: boolean;
  setPhoneInput: (v: string) => void;
  setCodeInput: (v: string) => void;
  setPasswordInput: (v: string) => void;
  setStep: (s: TelegramAuthStep) => void;
  reset: () => void;
  sendCode: (e: React.FormEvent) => Promise<void>;
  verifyCode: (e: React.FormEvent) => Promise<void>;
  verify2fa: (e: React.FormEvent) => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useTelegramAuth(): TelegramAuthState {
  const [status, setStatus] = useState<TelegramAuthStatus>('loading');
  const [phone, setPhone] = useState<string | null>(null);
  const [step, setStep] = useState<TelegramAuthStep>('idle');
  const [phoneInput, setPhoneInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/telegram-auth/status')
      .then(({ data }) => {
        if (data.connected) { setStatus('connected'); setPhone(data.phone ?? null); }
        else setStatus('disconnected');
      })
      .catch(() => setStatus('disconnected'));
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

  return {
    status, phone, step, phoneInput, codeInput, passwordInput, error, busy,
    setPhoneInput, setCodeInput, setPasswordInput, setStep, reset,
    sendCode, verifyCode, verify2fa, disconnect,
  };
}
