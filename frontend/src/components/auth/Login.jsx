import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Btn, Banner, inputCls } from '../ui.jsx';
import { IconMail, IconLock, IconEye, IconEyeOff, IconShield } from '../Icon.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh paper-bg flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] animate-fade-in-up">
        {/* Brand lockup */}
        <div className="flex flex-col items-center text-center mb-7">
          <span className="w-14 h-14 rounded-2xl bg-navy text-gold-light flex items-center justify-center font-serif text-[22px] shadow-pop mb-4">
            CP
          </span>
          <div className="flex items-center gap-2 mb-2">
            <span className="gold-rule !w-5" />
            <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-gold">
              Centre Point Hospitality
            </span>
            <span className="gold-rule !w-5" />
          </div>
          <h1 className="font-serif text-[22px] text-navy leading-tight">Asset Handover Register</h1>
        </div>

        {/* Card */}
        <div className="bg-paper border border-line rounded-2xl shadow-card p-7 sm:p-8">
          <h2 className="font-serif text-[24px] text-navy">Welcome back</h2>
          <p className="text-muted text-[13.5px] mt-1 mb-6">Sign in to your handover account to continue.</p>

          <form onSubmit={submit} noValidate>
            {error && (
              <Banner tone="error" role="alert">
                {error}
              </Banner>
            )}

            <label htmlFor="login-email" className="block text-[12.5px] font-semibold text-navy mb-1">
              Email
            </label>
            <div className="relative mb-4">
              <IconMail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                aria-invalid={!!error}
                className={`${inputCls} !pl-9`}
                placeholder="you@centrepoint.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <label htmlFor="login-password" className="block text-[12.5px] font-semibold text-navy mb-1">
              Password
            </label>
            <div className="relative">
              <IconLock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                id="login-password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={!!error}
                className={`${inputCls} !pl-9 !pr-11`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                aria-pressed={show}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-navy rounded-md
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light transition-colors"
              >
                {show ? <IconEyeOff size={17} /> : <IconEye size={17} />}
              </button>
            </div>

            <Btn type="submit" variant="primary" block loading={busy} className="mt-6">
              {busy ? 'Signing in…' : 'Sign in'}
            </Btn>
          </form>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-2xs text-muted mt-6">
          <IconShield size={13} className="text-good flex-none" />
          Secured access · Authorised personnel only
        </p>
      </div>
    </div>
  );
}
