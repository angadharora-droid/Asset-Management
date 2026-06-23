import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Btn, Banner, inputCls } from '../ui.jsx';
import {
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconShield,
  IconClipboardList,
  IconCheckCircle,
  IconMapPin,
} from '../Icon.jsx';

const FEATURES = [
  {
    Icon: IconClipboardList,
    title: 'Every asset, logged',
    text: 'Hariganga inventory tracked item-by-item into CPH.',
  },
  {
    Icon: IconCheckCircle,
    title: 'Condition verified',
    text: 'Status and condition confirmed on handover.',
  },
  {
    Icon: IconShield,
    title: 'Signed & sealed',
    text: 'Formal sign-off with printable PDF records.',
  },
];

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
    <div className="min-h-dvh grid lg:grid-cols-2">
      {/* Brand panel (desktop) */}
      <div className="hidden lg:flex ink-panel text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Oversized monogram watermark */}
        <span
          aria-hidden="true"
          className="pointer-events-none select-none absolute -right-12 -bottom-20 font-serif text-[280px] leading-none text-white/[0.04]"
        >
          CP
        </span>

        <div className="relative animate-fade-in-up">
          <div className="flex items-center gap-3.5 mb-11">
            <span className="w-12 h-12 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center font-serif text-[19px] text-gold-light flex-none">
              CP
            </span>
            <div className="flex items-center gap-2.5">
              <span className="gold-rule" />
              <span className="text-2xs font-bold uppercase tracking-[0.18em] text-gold-light">
                Centre Point Hospitality
              </span>
            </div>
          </div>

          <h1 className="font-serif text-[38px] leading-[1.08]">
            Asset Handover<br />Register
          </h1>
          <p className="text-white/55 mt-4 max-w-sm text-[14px] leading-relaxed">
            Hariganga → CPH · Centre Point Amravati. Secure access for the handover team.
          </p>

          <ul className="mt-11 space-y-4 max-w-sm">
            {FEATURES.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-3.5">
                <span className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center flex-none text-gold-light">
                  <Icon size={17} />
                </span>
                <div>
                  <div className="text-[13.5px] font-semibold text-white">{title}</div>
                  <div className="text-[12.5px] text-white/50 leading-snug">{text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-1.5 text-white/40 text-2xs uppercase tracking-wider">
          <IconMapPin size={13} className="flex-none" />
          Centre Point, Amravati · Authorised personnel only
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 paper-bg">
        <form onSubmit={submit} noValidate className="w-full max-w-[380px] animate-fade-in-up">
          {/* Brand lockup (mobile) */}
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-navy text-gold-light flex items-center justify-center font-serif text-[17px] flex-none">
              CP
            </span>
            <div>
              <span className="block text-[9.5px] font-bold uppercase tracking-[0.16em] text-gold">
                Centre Point Hospitality
              </span>
              <h1 className="font-serif text-[18px] text-navy leading-tight">Asset Handover Register</h1>
            </div>
          </div>

          <h2 className="font-serif text-[27px] text-navy">Welcome back</h2>
          <p className="text-muted text-[13.5px] mt-1 mb-6">Sign in to your handover account to continue.</p>

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

          <p className="flex items-center justify-center gap-1.5 text-center text-2xs text-muted mt-6">
            <IconShield size={13} className="text-good flex-none" />
            Secured handover access
          </p>
        </form>
      </div>
    </div>
  );
}
